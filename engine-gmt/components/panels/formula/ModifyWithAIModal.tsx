/**
 * ModifyWithAIModal — the in-app "Modify with AI" formula kit.
 *
 * Two halves, one focused modal:
 *
 *  1. COPY-OUT. Reads the CURRENT formula (`registry.get(formula)`), builds a
 *     minimal GMF via {@link buildFormulaBrief} and a paste-ready LLM prompt via
 *     {@link buildModifyPrompt}, and shows the prompt read-only. The user copies
 *     it (clipboard) or saves it as a `.md` file, pastes it into Claude / Gemini /
 *     any LLM, and asks for a change.
 *
 *  2. PASTE-BACK. A textarea + "Load" button. The pasted reply is run through
 *     {@link sanitizeGMF} (tolerant — strips fences / prose / BOM) → if null we
 *     show a friendly error instead of mis-routing prose into `JSON.parse`. On a
 *     clean GMF we MIRROR the file-import handler in FormulaSelect.tsx
 *     (`loadGMFScene` → `registry.register` if new → `REGISTER_FORMULA` →
 *     `loadScene`) so the formula registers in both registries and recompiles.
 *
 * ERROR FEEDBACK LOOP (spec User refinement 1). On a post-boot shader
 * compile/link failure, WorkerProxy re-emits the worker's ERROR as a main-bus
 * `COMPILE_FAILED` carrying the GLSL log (see WorkerProxy `case 'ERROR'`). We arm
 * a watch when we trigger a load: `COMPILE_FAILED` gives us the exact log to show
 * + copy; as a fallback (no log forwarded), a cycle that closes with
 * `IS_COMPILING:false` but no `COMPILE_TIME` is treated as a failure and we walk
 * the user to the console (F12). Either way the modal shows an actionable banner
 * with a "Copy error for LLM" button, plus a toast.
 *
 * @see plans/ai-formula-kit-spec.md (User refinements 2026-06-24)
 * @see engine-gmt/utils/formulaBrief.ts (the 3 helpers this modal drives)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../../components/ui';
import { showToast } from '../../../../engine/store/toastStore';
import { useClipboardCopy } from '../../../../hooks/useClipboardCopy';
import { useEngineStore } from '../../../../store/engineStore';
import { registry } from '../../../engine/FractalRegistry';
import { loadGMFScene } from '../../../utils/FormulaFormat';
import { buildFormulaBrief, buildModifyPrompt, buildConvertPrompt, sanitizeGMF, ensureUniqueFormulaId, backfillCoreMathDefaults } from '../../../utils/formulaBrief';
import { FractalEvents, FRACTAL_EVENTS } from '../../../engine/FractalEvents';
import type { FormulaType } from '../../../../types';
import type { FractalDefinition } from '../../../types/fractal';

type ImportMappings = NonNullable<FractalDefinition['importSource']>['mappings'];

/** LLM-facing guidance copied (with the GLSL log appended when available) when a
 *  loaded formula fails to compile. */
const COMPILE_ERROR_GUIDANCE =
    'The fractal formula you produced has a GLSL shader compile error. ' +
    'Fix the formula so it compiles, then return the corrected, complete .gmf — ' +
    'all blocks, no markdown fences, no prose. Common causes: a typo in a uniform ' +
    'name, a mismatched function signature between <Shader_Function> and ' +
    '<Shader_Loop>, a missing semicolon, or a const initialised with a built-in ' +
    'function (use a non-const global instead).';

/** Render `def.importSource.mappings` as the human-readable uniform→slot lines
 *  the convert prompt expects: one "originalName (type) -> uParamA" per mapping,
 *  with "= fixedValue" appended when a uniform was inlined rather than slotted.
 *  Returns the sentinel when no mappings were recorded (V4 imports / reloads). */
function formatMappings(mappings: ImportMappings | undefined): string {
    if (!mappings || mappings.length === 0) return '(no parameter mappings recorded)';
    return mappings
        .map((m) => {
            const slot = m.mappedSlot?.trim();
            const head = `${m.name} (${m.type})`;
            return slot
                ? `${head} -> ${slot}`
                : `${head} = ${m.fixedValue} (fixed literal — substitute directly)`;
        })
        .join('\n');
}

export interface ModifyWithAIModalProps {
    open: boolean;
    onClose: () => void;
}

export const ModifyWithAIModal: React.FC<ModifyWithAIModalProps> = ({ open, onClose }) => {
    const formula = useEngineStore(s => s.formula);
    const copyBtn = useClipboardCopy(1600);

    const [pasteText, setPasteText] = useState('');
    // 'error' = sanitize/parse rejected the paste; 'compile' = it loaded but the
    // shader failed to compile (the actionable F12 loop).
    const [loadError, setLoadError] = useState<null | { kind: 'error' | 'compile'; message: string; log?: string }>(null);
    // 'convert' rewrites an imported self-contained formula into a native
    // per-iteration one (re-enables interlace/hybrid/burning-ship); 'modify' is
    // the original "change this formula" path. Only self-contained formulas get
    // the toggle; everything else is Modify-only.
    const [mode, setMode] = useState<'modify' | 'convert'>('modify');

    // ── Is the current formula in the limited self-contained shape? ───────────
    // This is the set of formulas that LOSE interlace/hybrid/burning-ship and so
    // benefit from a convert-to-native pass. Gate on the legacy flag OR the modern
    // capability token (kept in sync; see import-capabilities.ts). Modular is
    // excluded — buildFormulaBrief throws for it (its GLSL lives in the node graph).
    const selectedDef = registry.get(formula);
    const formulaName = selectedDef?.name ?? formula;
    const isSelfContained =
        formula !== 'Modular' &&
        (!!selectedDef?.shader.selfContainedSDE ||
            !!selectedDef?.shader.capabilities?.has('shape:self-contained'));

    // follow-up: converting the LIVE, unsaved Workshop editor buffer would need
    // FormulaWorkshop to expose its `source`/`mappings` state (currently local to
    // that component, not store- or window-readable). We gate purely on the
    // CURRENTLY REGISTERED formula's def here — importSource reflects the last
    // V3 import only and isn't serialised into GMF, so a reloaded-from-file
    // imported formula falls back to decomposing its current self-contained GMF.

    // Default to Convert for self-contained formulas (the valuable path); reset
    // when the formula or the modal-open state changes.
    useEffect(() => {
        setMode(isSelfContained ? 'convert' : 'modify');
    }, [formula, isSelfContained, open]);

    // The effective mode never lands on 'convert' for a non-self-contained
    // formula (no toggle is shown), so coerce it for the prompt build.
    const activeMode: 'modify' | 'convert' = isSelfContained ? mode : 'modify';

    // ── Build the prompt for the current formula + active mode ────────────────
    const { prompt, briefError } = useMemo(() => {
        const def = registry.get(formula);
        if (!def) return { prompt: '', briefError: 'No formula is selected.' };
        try {
            if (activeMode === 'convert') {
                // Prefer the ORIGINAL .frag (importSource.glsl) as the math source;
                // when absent (V4 import, or any save→reload — importSource isn't
                // serialised) fall back to the current self-contained GMF and let
                // the prompt's decompose recipe re-derive the per-iteration step.
                const origFrag = def.importSource?.glsl?.trim();
                const currentGmf = buildFormulaBrief(def);
                const fragSource = origFrag || currentGmf;
                const mappings = formatMappings(def.importSource?.mappings);
                const convertPrompt = buildConvertPrompt(fragSource, def.name, {
                    mappings,
                    // Only inline the current GMF as a secondary reference when the
                    // primary source is the original .frag (avoid duplicating it).
                    currentGmf: origFrag ? currentGmf : undefined,
                });
                return { prompt: convertPrompt, briefError: null as string | null };
            }
            const brief = buildFormulaBrief(def);
            return { prompt: buildModifyPrompt(brief, def.name), briefError: null as string | null };
        } catch (e) {
            // buildFormulaBrief throws for Modular — the menu item is disabled in
            // that case, but guard the render path too.
            return { prompt: '', briefError: e instanceof Error ? e.message : 'Could not export this formula.' };
        }
    }, [formula, activeMode]);

    // True when the convert prompt is fed the ORIGINAL .frag (vs decomposing the
    // already-wrapped self-contained shader) — drives the one-line source note.
    const hasOriginalFrag = !!selectedDef?.importSource?.glsl?.trim();

    // ── Compile-error watch (see file header) ─────────────────────────────────
    // Armed when we trigger a load. A COMPILE_FAILED while armed = a shader
    // error; the cycle ending with no COMPILE_FAILED = success.
    const watchingRef = useRef(false);

    useEffect(() => {
        if (!open) return;
        // The ONLY reliable error signal is COMPILE_FAILED, forwarded from the
        // worker post-boot (see WorkerProxy case 'ERROR'). We deliberately do NOT
        // infer failure from a missing COMPILE_TIME — that event only fires for
        // compiles slower than 0.1s, so a fast/cached SUCCESS would otherwise be
        // misreported as an error (the old false-positive). A cycle that ends with
        // no COMPILE_FAILED simply compiled cleanly.
        const offCompileFailed = FractalEvents.on(FRACTAL_EVENTS.COMPILE_FAILED, ({ reason }) => {
            if (!watchingRef.current) return;
            watchingRef.current = false;
            setLoadError({
                kind: 'compile',
                message: 'This formula has a shader compile error (shown below). Click "Copy error for LLM" and paste it back to your model.',
                log: (reason || '').trim() || undefined,
            });
            showToast('This formula has a shader error — copy it back to your LLM to fix.', 'error', 6000);
        });
        // COMPILE_FAILED (if any) arrives just BEFORE this on the main thread, so a
        // cycle that ends while we're still armed = success: disarm quietly.
        const offCompiling = FractalEvents.on(FRACTAL_EVENTS.IS_COMPILING, (status) => {
            if (status === false && watchingRef.current) watchingRef.current = false;
        });
        return () => {
            offCompileFailed();
            offCompiling();
            watchingRef.current = false;
        };
    }, [open]);

    // Reset transient UI when the modal closes.
    useEffect(() => {
        if (!open) {
            setPasteText('');
            setLoadError(null);
            watchingRef.current = false;
        }
    }, [open]);

    // ── Load-back: mirror FormulaSelect.handleImport's tolerant load path ──────
    const loadFromText = (raw: string) => {
        setLoadError(null);
        const clean = sanitizeGMF(raw);
        if (!clean) {
            setLoadError({
                kind: 'error',
                message:
                    "Couldn't find a formula in what you pasted. Paste your LLM's full reply — it must contain a complete .gmf (a <Metadata> block and a <Shader_Function> block).",
            });
            return;
        }
        try {
            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, 'Compiling Formula...');
            // Arm the compile-error watch for the recompile this triggers.
            watchingRef.current = true;

            const { def: loadedDef, preset } = loadGMFScene(clean);
            if (loadedDef) {
                // Uniquify the id (+ its GLSL function name) when it's already
                // taken, so re-pasting an iteration doesn't collide with / silently
                // fail to replace the existing formula. Then register in BOTH
                // registries (main + worker) — loadScene() does neither.
                const def = ensureUniqueFormulaId(loadedDef, (id) => !!registry.get(id));
                // Seed coreMath from the formula's own parameters[].default for any
                // value the model didn't set: the engine reads a param's INITIAL
                // value from coreMath, NOT from parameters[].default, so an AI
                // formula with good slider defaults but an empty coreMath would load
                // every slider at 0 (and a 0 scale/power renders black).
                const loadPreset = backfillCoreMathDefaults(preset, def.parameters);
                loadPreset.formula = def.id;
                registry.register(def);
                FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, {
                    id: def.id,
                    shader: def.shader,
                });
                useEngineStore.getState().loadScene({ def, preset: loadPreset });
            } else {
                // Legacy JSON — just switch formula.
                watchingRef.current = false;
                useEngineStore.getState().setFormula(preset.formula as FormulaType);
            }
            showToast('Formula loaded — compiling…', 'success');
        } catch (err) {
            watchingRef.current = false;
            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            console.error('[ModifyWithAI] Failed to load formula:', err);
            setLoadError({
                kind: 'error',
                message:
                    "Couldn't read that formula. Check the <Metadata> block is valid JSON (double-quoted keys, no trailing commas) and that you copied the whole .gmf.",
            });
            showToast("Couldn't read that formula — check it's a complete .gmf block.", 'error', 4500);
        }
    };

    const handleLoadClick = () => {
        if (!pasteText.trim()) {
            showToast('Paste your LLM\'s reply into the box first.', 'warning', 4000);
            return;
        }
        loadFromText(pasteText);
    };

    const handleReadClipboard = async () => {
        let text = '';
        try {
            text = await navigator.clipboard.readText();
        } catch {
            showToast('Clipboard read was blocked — paste into the box below instead.', 'warning', 4500);
            return;
        }
        if (!text.trim()) {
            showToast("Clipboard didn't contain a formula. Paste the AI's full reply and try again.", 'warning', 4500);
            return;
        }
        setPasteText(text);
        loadFromText(text);
    };

    const handleSaveMd = () => {
        if (!prompt) return;
        const blob = new Blob([prompt], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formula}-ai-prompt.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        if (!prompt) return;
        void copyBtn.copy(prompt);
        showToast('Prompt + formula copied — paste it into Claude, Gemini, or any LLM.', 'success');
    };

    // Copy the LLM-facing fix instruction with the exact GLSL log appended (when
    // we captured one) so the user can hand the model everything in one paste.
    const copyErrorForLLM = () => {
        const payload = loadError?.log
            ? `${COMPILE_ERROR_GUIDANCE}\n\nThe exact GLSL compiler error was:\n${loadError.log}`
            : COMPILE_ERROR_GUIDANCE;
        void navigator.clipboard.writeText(payload).then(
            () => showToast('Error + fix instructions copied — paste them to your LLM.', 'success'),
            () => showToast('Copy failed — select the text above manually.', 'warning', 4000),
        );
    };

    if (!open) return null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissOnBackdrop={false}
            labelledBy="modify-ai-title"
        >
            <div className="bg-surface-raised border border-line/10 rounded-xl w-[660px] max-w-[94vw] max-h-[88vh] flex flex-col shadow-2xl text-fg">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-line/10">
                    <div className="flex items-center gap-2">
                        <h2 id="modify-ai-title" className="text-sm font-bold">
                            {activeMode === 'convert' ? 'Convert' : 'Modify'}{' '}
                            <span className="text-fg-muted font-medium">·</span>{' '}
                            <span className="text-accent-300">{formulaName}</span> with AI
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-fg-muted hover:text-fg text-lg leading-none px-1 transition-colors"
                        title="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Body (scrolls) */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {briefError ? (
                        <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                            <span>{briefError}</span>
                        </div>
                    ) : (
                        <>
                            {/* Mode toggle (self-contained imports only — text-only, no icons) */}
                            {isSelfContained && (
                                <div className="flex items-center gap-2 text-[11px]">
                                    <span className="font-bold uppercase tracking-wide text-fg-tertiary">Mode</span>
                                    <div className="inline-flex rounded-lg border border-line/15 overflow-hidden">
                                        <button
                                            onClick={() => setMode('convert')}
                                            className={`px-3 py-1 font-bold transition-colors ${
                                                activeMode === 'convert'
                                                    ? 'bg-accent-600 text-white'
                                                    : 'bg-transparent text-fg-muted hover:text-fg hover:bg-line/[0.06]'
                                            }`}
                                            title="Rewrite this imported formula as a native per-iteration formula (re-enables interlace, hybrid, and burning-ship)"
                                        >
                                            Convert to native
                                        </button>
                                        <button
                                            onClick={() => setMode('modify')}
                                            className={`px-3 py-1 font-bold border-l border-line/15 transition-colors ${
                                                activeMode === 'modify'
                                                    ? 'bg-accent-600 text-white'
                                                    : 'bg-transparent text-fg-muted hover:text-fg hover:bg-line/[0.06]'
                                            }`}
                                            title="Ask the AI to change this formula"
                                        >
                                            Modify
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Instruction line (mode-aware) */}
                            {activeMode === 'convert' ? (
                                <p className="text-xs text-fg-muted leading-relaxed">
                                    <span className="text-accent-300">{formulaName}</span> is an{' '}
                                    <strong className="text-fg">imported (self-contained)</strong> formula — that disables
                                    interlace, hybrid, and burning-ship. Copy the prompt below into{' '}
                                    <strong className="text-fg">Claude</strong>, <strong className="text-fg">Gemini</strong>,
                                    or any LLM to rewrite it as a <strong className="text-fg">native per-iteration</strong>{' '}
                                    formula (which re-enables all three), then paste the reply back below. The full guide is
                                    at{' '}
                                    <a
                                        href="https://gmt-fractals.com/learn/create-formula"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-accent-400 underline hover:text-accent-300"
                                    >
                                        gmt-fractals.com/learn/create-formula
                                    </a>
                                    .
                                </p>
                            ) : (
                                <p className="text-xs text-fg-muted leading-relaxed">
                                    Copy the prompt below into <strong className="text-fg">Claude</strong>,{' '}
                                    <strong className="text-fg">Gemini</strong>, or any LLM, add one line describing the
                                    change you want, then paste the model's reply back below. The prompt includes the
                                    current formula (<span className="text-accent-300">{formulaName}</span>) as a worked
                                    example for the AI to build on. The full guide is at{' '}
                                    <a
                                        href="https://gmt-fractals.com/learn/create-formula"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-accent-400 underline hover:text-accent-300"
                                    >
                                        gmt-fractals.com/learn/create-formula
                                    </a>
                                    .
                                </p>
                            )}

                            {/* Convert-mode source note: which source the prompt is built from */}
                            {activeMode === 'convert' && (
                                <p className="text-[11px] text-fg-tertiary leading-relaxed">
                                    {hasOriginalFrag
                                        ? 'Using the original imported .frag source as the basis for conversion.'
                                        : 'No original source recorded — working from the current converted shader (decomposing it back into per-iteration steps).'}
                                </p>
                            )}

                            {/* Prompt preview (read-only) */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-fg-tertiary">
                                        Prompt to paste into your LLM
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={handleCopy}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded border transition-colors ${
                                                copyBtn.state === 'copied'
                                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                                    : copyBtn.state === 'failed'
                                                        ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                                        : 'bg-accent-900/30 border-accent-500/30 text-accent-300 hover:bg-accent-900/50 hover:border-accent-500/50'
                                            }`}
                                            title="Copy the prompt + formula to the clipboard"
                                        >
                                            {copyBtn.state === 'copied' ? 'Copied' : copyBtn.state === 'failed' ? 'Failed' : 'Copy'}
                                        </button>
                                        <button
                                            onClick={handleSaveMd}
                                            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-line/25 transition-colors"
                                            title="Download the prompt as a .md file"
                                        >
                                            Save .md
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    readOnly
                                    value={prompt}
                                    onFocus={(e) => e.currentTarget.select()}
                                    className="w-full h-44 resize-y rounded-lg bg-surface-sunken border border-line/10 px-3 py-2 text-[11px] leading-relaxed font-mono text-fg-muted outline-none focus:border-accent-500/40"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Paste-back */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-fg-tertiary">
                                        Paste the LLM's reply here
                                    </span>
                                    <button
                                        onClick={handleReadClipboard}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-line/25 transition-colors"
                                        title="Read the clipboard and load it"
                                    >
                                        Paste from clipboard
                                    </button>
                                </div>
                                <textarea
                                    value={pasteText}
                                    onChange={(e) => {
                                        setPasteText(e.target.value);
                                        if (loadError) setLoadError(null);
                                    }}
                                    placeholder="Paste the whole reply — code fences and surrounding prose are stripped automatically."
                                    className="w-full h-32 resize-y rounded-lg bg-surface-sunken border border-line/10 px-3 py-2 text-[11px] leading-relaxed font-mono text-fg outline-none focus:border-accent-500/40 placeholder:text-fg-tertiary"
                                    spellCheck={false}
                                />

                                {loadError && (
                                    <div className="mt-2 flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-200">
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <p className="leading-relaxed">{loadError.message}</p>
                                            {loadError.log && (
                                                <pre className="max-h-28 overflow-auto rounded bg-black/30 px-2 py-1 text-[10px] leading-snug font-mono text-red-200/90 whitespace-pre-wrap break-words">
                                                    {loadError.log}
                                                </pre>
                                            )}
                                            {loadError.kind === 'compile' && (
                                                <button
                                                    onClick={copyErrorForLLM}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded border bg-red-500/15 border-red-500/40 text-red-200 hover:bg-red-500/25 transition-colors"
                                                >
                                                    Copy error for LLM
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line/10">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-line/[0.04] border border-line/10 text-fg-muted hover:text-fg hover:border-line/20 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleLoadClick}
                        disabled={!!briefError}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-accent-600 hover:bg-accent-500 text-white border border-accent-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Load formula
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ModifyWithAIModal;
