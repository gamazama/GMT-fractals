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
import { buildFormulaBrief, buildModifyPrompt, sanitizeGMF, ensureUniqueFormulaId } from '../../../utils/formulaBrief';
import { FractalEvents, FRACTAL_EVENTS } from '../../../engine/FractalEvents';
import type { FormulaType } from '../../../../types';

/** LLM-facing guidance copied (with the GLSL log appended when available) when a
 *  loaded formula fails to compile. */
const COMPILE_ERROR_GUIDANCE =
    'The fractal formula you produced has a GLSL shader compile error. ' +
    'Fix the formula so it compiles, then return the corrected, complete .gmf — ' +
    'all blocks, no markdown fences, no prose. Common causes: a typo in a uniform ' +
    'name, a mismatched function signature between <Shader_Function> and ' +
    '<Shader_Loop>, a missing semicolon, or a const initialised with a built-in ' +
    'function (use a non-const global instead).';

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

    // ── Build the prompt for the current formula (memoised on formula id) ──────
    const { prompt, briefError } = useMemo(() => {
        const def = registry.get(formula);
        if (!def) return { prompt: '', briefError: 'No formula is selected.' };
        try {
            const brief = buildFormulaBrief(def);
            return { prompt: buildModifyPrompt(brief, def.name), briefError: null as string | null };
        } catch (e) {
            // buildFormulaBrief throws for Modular — the menu item is disabled in
            // that case, but guard the render path too.
            return { prompt: '', briefError: e instanceof Error ? e.message : 'Could not export this formula.' };
        }
    }, [formula]);

    const selectedDef = registry.get(formula);
    const formulaName = selectedDef?.name ?? formula;

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
                preset.formula = def.id;
                registry.register(def);
                FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, {
                    id: def.id,
                    shader: def.shader,
                });
                useEngineStore.getState().loadScene({ def, preset });
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
                            Modify <span className="text-fg-muted font-medium">·</span>{' '}
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
                            {/* Instruction line */}
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
