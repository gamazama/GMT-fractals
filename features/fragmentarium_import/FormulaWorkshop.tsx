/**
 * FormulaWorkshop — Formula Workshop
 *
 * A guided user-assisted tool for importing GLSL iteration formulas from any
 * source (Fragmentarium .frag, Shadertoy DE snippets, blog posts, hand-written GLSL).
 *
 * Layout: split-screen — Workshop panel on left (~50%), live viewport visible on right (~50%).
 * The fractal renders and updates in real-time; Preview button registers a temporary formula
 * that compiles immediately (using Fastest engine profile, auto-applied on Workshop open).
 */

import React, { useState, useRef, useEffect } from 'react';
import type { FractalDefinition } from '../../types';
import { registry } from '../../engine/FractalRegistry';
import { useFractalStore } from '../../store/fractalStore';
import { GlslEditor } from '../../components/inputs/GlslEditor';
import type { WorkshopDetection, WorkshopParam, TransformedFormulaV2 } from './types';
import { detectFormula } from './workshop/detection';
import { PREVIEW_ID, buildTransformResult } from './workshop/preview';
import { buildFractalParams, slotOptionsForType, slotLabel, componentSlotBase } from './workshop/param-builder';

// --- Icons ---
const XIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CodeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const CheckCircleIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const ChevronDownIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const ChevronRightIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const PlayIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;

// --- Types ---

interface WorkshopProps {
    onClose: () => void;
    /** Pre-populate the Workshop from a previously imported formula for re-editing. */
    editFormula?: string;
}

// --- Constants ---

// --- Annotated output builder ---

function banner(label: string, sublabel: string): string {
    return `// ${'─'.repeat(58)}\n// ${label}\n// ${sublabel}\n// ${'─'.repeat(58)}`;
}

function formatAnnotatedOutput(r: TransformedFormulaV2): string {
    const sections: string[] = [];

    if (r.uniforms?.trim()) {
        sections.push(
            banner('① UNIFORMS', 'injected at shader top — uniform declarations'),
            r.uniforms.trim(),
        );
    }

    if (r.function?.trim()) {
        sections.push(
            banner('② FUNCTION', 'injected at shader top — formula_X() + helpers'),
            r.function.trim(),
        );
    }

    if (r.loopInit?.trim()) {
        sections.push(
            banner('③ LOOP INIT', 'injected inside map() — before the iteration for-loop'),
            r.loopInit.trim(),
        );
    }

    if (r.loopBody?.trim()) {
        sections.push(
            banner('④ LOOP BODY', 'injected inside the for-loop — called every iteration'),
            r.loopBody.trim(),
        );
    }

    if (r.getDist?.trim()) {
        sections.push(
            banner('⑤ GET DIST', 'injected as the distance estimation function'),
            r.getDist.trim(),
        );
    }

    return sections.join('\n\n');
}

// --- Component ---

export const FormulaWorkshop: React.FC<WorkshopProps> = ({ onClose, editFormula }) => {
    const [source, setSource]                             = useState('');
    const [sourceCollapsed, setSourceCollapsed]           = useState(false);
    const [detected, setDetected]                         = useState<WorkshopDetection | null>(null);
    const [selectedFunctionName, setSelectedFunctionName] = useState('');
    const [loopMode, setLoopMode]                         = useState<'loop' | 'single'>('loop');
    const [mappings, setMappings]                         = useState<WorkshopParam[]>([]);
    const [formulaName, setFormulaName]                   = useState('');
    const [transformedCode, setTransformedCode]           = useState('');
    const [error, setError]                               = useState<string | null>(null);
    const [success, setSuccess]                           = useState(false);

    const fileRef            = useRef<HTMLInputElement>(null);
    const previousFormulaRef = useRef('');

    const setFormula = useFractalStore(s => s.setFormula);
    const store      = useFractalStore();

    // Apply formula-specific defaults (coreMath + geometry) while preserving
    // camera, lighting, and engine settings. Used after setFormula to ensure
    // defaults load even when the formula ID hasn't changed (same name re-import).
    const applyFormulaDefaults = (preset: any) => {
        const current = store.getPreset();
        store.loadPreset({
            ...preset,
            cameraPos: current.cameraPos, cameraRot: current.cameraRot,
            sceneOffset: current.sceneOffset, targetDistance: current.targetDistance,
            cameraMode: current.cameraMode, lights: current.lights,
            features: {
                ...(preset.features || {}),
                atmosphere: current.features?.atmosphere,
                lighting:   current.features?.lighting,
                optics:     current.features?.optics,
                materials:  current.features?.materials,
                coreMath:   preset.features?.coreMath,
                geometry:   preset.features?.geometry,
            },
        } as any);
    };

    // ---- Previous formula capture (needed for handleClose to restore after preview) ----
    useEffect(() => {
        previousFormulaRef.current = (store as any).formula || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- Re-edit: pre-populate from a previously imported formula ----
    useEffect(() => {
        if (!editFormula) return;
        const def = registry.get(editFormula);
        if (!def?.importSource) return;
        const { glsl, selectedFunction, loopMode: lm, mappings: m } = def.importSource;
        setSource(glsl);
        setFormulaName(editFormula);
        setSelectedFunctionName(selectedFunction);
        setLoopMode(lm);
        setMappings(m as WorkshopParam[]);
        runDetect(glsl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editFormula]);

    // ---- Auto-generate annotated transformed output ----
    useEffect(() => {
        if (!detected || !selectedFunctionName) { setTransformedCode(''); return; }
        try {
            const result = buildTransformResult(detected, selectedFunctionName, loopMode, formulaName || 'Preview', mappings);
            if (!result) return;
            setTransformedCode(formatAnnotatedOutput(result));
        } catch (_) {}
    }, [detected, selectedFunctionName, loopMode, mappings, formulaName]);

    // ---- Detection ----
    const runDetect = (src: string, fileBaseName?: string) => {
        setError(null);
        setDetected(null);
        setTransformedCode('');
        if (!src.trim()) return;

        const result = detectFormula(src, fileBaseName);

        if ('error' in result) {
            setError(result.error);
            return;
        }

        setDetected(result);
        setSelectedFunctionName(result.selectedFunction);
        setLoopMode(result.loopMode);
        setMappings(result.params);

        if (result.suggestedName && !formulaName) {
            setFormulaName(result.suggestedName);
        }

        setSourceCollapsed(true);
    };

    // ---- File Loading ----
    const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fileBaseName = file.name.replace(/\.(frag|glsl|txt)$/i, '').replace(/[^a-zA-Z0-9_]/g, '');
        const reader = new FileReader();
        reader.onload = ev => {
            const content = ev.target?.result as string;
            if (content) { setSource(content); runDetect(content, fileBaseName || undefined); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ---- Function Selection ----
    const handleSelectFunction = (name: string) => {
        setSelectedFunctionName(name);
        const c = detected?.candidates.find(c => c.name === name);
        setLoopMode(c?.loopInfo !== null ? 'loop' : 'single');
    };

    // ---- Mapping Changes ----
    const handleMappingChange = (index: number, field: keyof WorkshopParam, value: string | number) => {
        setMappings(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            if (field === 'mappedSlot' && value !== 'ignore' && value !== 'fixed' && value !== 'builtin') {
                const isAssigningBool = next[index].type === 'bool';
                const newSlot = value as string;
                for (let i = 0; i < next.length; i++) {
                    if (i !== index && next[i].mappedSlot === newSlot) {
                        // Multiple bools can share one scalar slot (bitfield flags) — don't evict
                        if (isAssigningBool && next[i].type === 'bool') continue;
                        next[i] = { ...next[i], mappedSlot: 'ignore' };
                    }
                    // Component slots: vec3A.x and vec3A.y share the same base but different
                    // components — that's fine. Only evict if the exact same slot is taken.
                    // (The identical-slot check above handles the exact conflict.)
                }
            }
            return next;
        });
    };

    // ---- Preview: register _workshop_preview and switch to it ----
    const handlePreview = () => {
        if (!detected || !selectedFunctionName) return;
        setError(null);
        try {
            const result = buildTransformResult(detected, selectedFunctionName, loopMode, PREVIEW_ID, mappings);
            if (!result) { setError('Could not analyze the selected function.'); return; }

            const { uiParams, defaultPreset } = buildFractalParams(mappings, PREVIEW_ID);
            const previewDef: FractalDefinition = {
                id: PREVIEW_ID as any,
                name: 'Workshop Preview',
                shader: {
                    function: (result.uniforms ? result.uniforms + '\n\n' : '') + result.function,
                    loopBody: result.loopBody,
                    getDist: result.getDist,
                    loopInit: result.loopInit,
                },
                parameters: uiParams,
                defaultPreset,
            };
            registry.register(previewDef);
            setFormula(PREVIEW_ID as any);
            applyFormulaDefaults(defaultPreset);
        } catch (e: any) {
            setError('Preview failed: ' + (e.message || String(e)));
        }
    };

    // ---- Close: restore previous formula if showing preview ----
    const handleClose = () => {
        if ((store as any).formula === PREVIEW_ID) {
            setFormula(previousFormulaRef.current as any);
        }
        onClose();
    };

    // ---- Import ----
    const handleImport = () => {
        if (!detected || !selectedFunctionName || !formulaName.trim()) return;
        setError(null);
        try {
            // Validate slot uniqueness:
            //   - bools may share a scalar slot (bitfield flags)
            //   - floats may share a vec base via different component slots (vec3A.x / vec3A.y / vec3A.z)
            //   - everything else must be unique
            const usedSlots = new Map<string, string>(); // exact slot → type
            for (const m of mappings) {
                if (m.mappedSlot === 'ignore' || m.mappedSlot === 'fixed' || m.mappedSlot === 'builtin') continue;
                if (usedSlots.has(m.mappedSlot)) {
                    const existingType = usedSlots.get(m.mappedSlot);
                    // Bools share scalar slots (flags)
                    if (m.type === 'bool' && existingType === 'bool') continue;
                    setError(`Slot "${m.mappedSlot}" is assigned to multiple parameters.`);
                    return;
                }
                usedSlots.set(m.mappedSlot, m.type);
            }

            const result = buildTransformResult(detected, selectedFunctionName, loopMode, formulaName, mappings);
            if (!result) {
                setError('Could not analyze the selected function. Try selecting a different one.');
                return;
            }

            if (result.warnings.length > 0) {
                setDetected(d => d ? { ...d, warnings: [...d.warnings, ...result.warnings] } : d);
            }

            const { uiParams, defaultPreset } = buildFractalParams(mappings, formulaName);
            const newDef: FractalDefinition = {
                id: formulaName as any,
                name: formulaName,
                description: 'Imported formula',
                shader: {
                    function: (result.uniforms ? result.uniforms + '\n\n' : '') + result.function,
                    loopBody: result.loopBody,
                    getDist: result.getDist,
                    loopInit: result.loopInit,
                },
                parameters: uiParams,
                defaultPreset,
                importSource: {
                    glsl: source,
                    selectedFunction: selectedFunctionName,
                    loopMode,
                    mappings,
                },
            };

            registry.register(newDef);
            setSuccess(true);
            setTimeout(() => { setFormula(formulaName as any); applyFormulaDefaults(defaultPreset); onClose(); }, 1000);
        } catch (e: any) {
            setError('Import failed: ' + (e.message || String(e)));
        }
    };

    const selectedCandidate = detected?.candidates.find(c => c.name === selectedFunctionName) ?? null;
    const canPreview = !!detected && !!selectedFunctionName;
    const canImport  = canPreview && formulaName.trim().length > 0;

    // ---- Render ----
    return (
        <div className="relative w-1/2 bg-[#0d0d0d] border-r border-white/10 flex flex-col overflow-hidden shrink-0">

            {/* ── Success overlay ── */}
            {success && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
                    <div className="flex flex-col items-center gap-4 text-green-400">
                        <CheckCircleIcon />
                        <p className="text-base font-semibold text-white">Formula imported!</p>
                        <p className="text-sm text-gray-400">Switching to {formulaName}…</p>
                    </div>
                </div>
            )}

                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-black/40 shrink-0">
                    <div className="flex items-center gap-2">
                        <CodeIcon />
                        <div>
                            <h2 className="text-[12px] font-semibold text-white leading-tight">Formula Workshop</h2>
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Live viewport on the right · Fastest engine active</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-500 hover:text-white">
                        <XIcon />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-3 min-h-0">

                    {/* ── Section 1: Source Code (collapsible) ── */}
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setSourceCollapsed(v => !v)}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {sourceCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                                <span>1 · Source Code</span>
                                {detected && sourceCollapsed && (
                                    <span className="ml-1.5 font-normal normal-case tracking-normal text-green-400/70">
                                        {detected.candidates.length} function{detected.candidates.length !== 1 ? 's' : ''} detected
                                    </span>
                                )}
                            </button>
                            {!sourceCollapsed && (
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="text-[10px] px-2 py-0.5 rounded border border-white/10 hover:border-white/30 text-gray-400 hover:text-white transition-colors"
                                >
                                    Load File
                                </button>
                            )}
                            <input ref={fileRef} type="file" accept=".frag,.glsl,.txt" className="hidden" onChange={handleLoadFile} />
                        </div>

                        {!sourceCollapsed && (
                            <>
                                <GlslEditor
                                    value={source}
                                    onChange={val => setSource(val)}
                                    height="160px"
                                    placeholder="Paste GLSL here — Fragmentarium .frag, Shadertoy DE snippet, blog post formula, or any GLSL iteration function."
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => runDetect(source)}
                                        disabled={!source.trim()}
                                        className="px-4 py-1.5 bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-black uppercase tracking-wider text-white transition-colors"
                                    >
                                        Detect Functions ▶
                                    </button>
                                </div>
                            </>
                        )}
                    </section>

                    {/* ── Section 2: Function Selection ── */}
                    {detected && (
                        <section className="space-y-2 border border-white/10 rounded-lg p-2.5 bg-white/[0.02]">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-500">2 · Iteration Function</h3>

                            <div className="flex items-center gap-2">
                                <label className="text-[11px] text-gray-400 shrink-0 w-16">Function:</label>
                                <select
                                    value={selectedFunctionName}
                                    onChange={e => handleSelectFunction(e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-white/30"
                                >
                                    {detected.candidates.map(c => (
                                        <option key={c.name} value={c.name}>
                                            {c.returnType} {c.name}({c.parameters.map(p => p.type).join(', ')})
                                            {c.isAutoDetectedDE ? '  ← suggested' : c.loopInfo ? '  [has loop]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedCandidate && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px]">
                                        {selectedCandidate.loopInfo
                                            ? <span className="text-green-500/80">
                                                Loop detected: <span className="font-mono">{selectedCandidate.loopInfo.type}(…)</span>
                                                {selectedCandidate.loopInfo.hasBreak && <span className="text-yellow-500/80"> — break will be removed</span>}
                                              </span>
                                            : <span className="text-yellow-500/80">No loop detected — treating as single-iteration</span>
                                        }
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setLoopMode('loop')}
                                            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${loopMode === 'loop' ? 'bg-blue-600/80 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            Extract loop body
                                        </button>
                                        <button
                                            onClick={() => setLoopMode('single')}
                                            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${loopMode === 'single' ? 'bg-blue-600/80 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            Whole function
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── Section 3: Parameters & Mapping ── */}
                    {detected && selectedFunctionName && (
                        <section className="space-y-2 border border-white/10 rounded-lg p-2.5 bg-white/[0.02]">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-500">3 · Parameters</h3>

                            <div className="flex items-center gap-2">
                                <label className="text-[11px] text-gray-400 shrink-0 w-24">Formula name:</label>
                                <input
                                    value={formulaName}
                                    onChange={e => setFormulaName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-white/30"
                                    placeholder="MyFormula"
                                />
                            </div>

                            {mappings.length > 0 ? (() => {
                                // Compute which bools share a scalar slot (flags groups)
                                const boolsPerSlot = new Map<string, number[]>(); // slot → [indices]
                                mappings.forEach((m, i) => {
                                    if (m.type !== 'bool' || m.mappedSlot === 'ignore' || m.mappedSlot === 'fixed' || m.mappedSlot === 'uJuliaMode') return;
                                    if (!boolsPerSlot.has(m.mappedSlot)) boolsPerSlot.set(m.mappedSlot, []);
                                    boolsPerSlot.get(m.mappedSlot)!.push(i);
                                });
                                // Bit index for each bool within its group
                                const bitIndex = new Map<number, number>();
                                for (const indices of boolsPerSlot.values()) {
                                    indices.forEach((idx, bit) => bitIndex.set(idx, bit));
                                }
                                // Compute which floats share a vec base via component slots
                                const floatsPerBase = new Map<string, number[]>(); // base → [indices]
                                mappings.forEach((m, i) => {
                                    const base = componentSlotBase(m.mappedSlot);
                                    if (!base) return;
                                    if (!floatsPerBase.has(base)) floatsPerBase.set(base, []);
                                    floatsPerBase.get(base)!.push(i);
                                });
                                // Index for each component within its vec group
                                const compIndex = new Map<number, { base: string; comp: string }>();
                                for (const [base, indices] of floatsPerBase) {
                                    indices.forEach(idx => {
                                        const comp = mappings[idx].mappedSlot.split('.')[1] ?? '';
                                        compIndex.set(idx, { base, comp });
                                    });
                                }
                                return (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[10px]">
                                        <thead>
                                            <tr className="text-gray-600 uppercase tracking-wider border-b border-white/10">
                                                <th className="text-left pb-1 pr-2 font-black">Variable</th>
                                                <th className="text-left pb-1 pr-2 font-black">Type</th>
                                                <th className="text-left pb-1 pr-2 font-black">→ Slot</th>
                                                <th className="text-left pb-1 pr-2 font-black">Default</th>
                                                <th className="text-left pb-1 pr-1 font-black">Min</th>
                                                <th className="text-left pb-1 pr-1 font-black">Max</th>
                                                <th className="text-left pb-1 font-black">Step / Flags</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mappings.map((m, i) => {
                                                const isBoolInGroup = m.type === 'bool' && bitIndex.has(i);
                                                const groupSize = isBoolInGroup ? (boolsPerSlot.get(m.mappedSlot)?.length ?? 1) : 0;
                                                const bit = bitIndex.get(i) ?? 0;
                                                const isFirstInGroup = isBoolInGroup && bit === 0;

                                                // Component packing group info
                                                const compInfo = compIndex.get(i);
                                                const isInVecGroup = !!compInfo && (floatsPerBase.get(compInfo.base)?.length ?? 0) > 1;
                                                const isFirstInVecGroup = isInVecGroup && compInfo!.comp === (floatsPerBase.get(compInfo!.base)![0] === i ? compInfo!.comp : '');
                                                const vecGroupIndices = compInfo ? (floatsPerBase.get(compInfo.base) ?? []) : [];
                                                const isFirstVecIndex = vecGroupIndices[0] === i;

                                                const showRange = !isBoolInGroup && !isInVecGroup && m.mappedSlot !== 'ignore' && m.mappedSlot !== 'builtin' && m.mappedSlot !== 'uJulia' && m.mappedSlot !== 'uJuliaMode' && m.mappedSlot !== 'fixed';
                                                const showFixed = m.mappedSlot === 'fixed';
                                                const defaultVal = Array.isArray(m.uiDefault)
                                                    ? m.uiDefault.map(v => (v as number).toPrecision(3)).join(', ')
                                                    : (m.uiDefault as number).toPrecision(3);
                                                return (
                                                    <React.Fragment key={m.name}>
                                                        {/* Flags group header — shown above the first bool in a group of 2+ */}
                                                        {isFirstInGroup && groupSize > 1 && (
                                                            <tr className="border-t border-amber-500/20">
                                                                <td colSpan={7} className="pt-1.5 pb-0.5 px-1">
                                                                    <span className="text-amber-400/70 text-[9px] font-black uppercase tracking-wider">
                                                                        ⚑ Flags · {groupSize} bits packed into {m.mappedSlot} · slider 0–{Math.pow(2, groupSize) - 1}
                                                                    </span>
                                                                    <span className="text-gray-600 text-[9px] ml-2 normal-case">assign bools to the same slot to group them</span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {/* Vec component group header — shown above the first float in a vec-packed group */}
                                                        {isInVecGroup && isFirstVecIndex && (
                                                            <tr className="border-t border-sky-500/20">
                                                                <td colSpan={7} className="pt-1.5 pb-0.5 px-1">
                                                                    <span className="text-sky-400/70 text-[9px] font-black uppercase tracking-wider">
                                                                        ⊞ Vec · {vecGroupIndices.length} floats packed into {compInfo!.base} · one vec{vecGroupIndices.length > 2 ? '3' : '2'} control
                                                                    </span>
                                                                    <span className="text-gray-600 text-[9px] ml-2 normal-case">assign floats to {compInfo!.base}.x / .y / .z to group them</span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr className={`border-b border-white/5 hover:bg-white/[0.02] ${isBoolInGroup && groupSize > 1 ? 'bg-amber-500/[0.03]' : isInVecGroup ? 'bg-sky-500/[0.03]' : ''}`}>
                                                            <td className="py-1 pr-2 font-mono text-gray-300">
                                                                {isBoolInGroup && groupSize > 1 && <span className="text-amber-400/50 mr-1">│</span>}
                                                                {isInVecGroup && <span className="text-sky-400/50 mr-1">│</span>}
                                                                {m.name}
                                                            </td>
                                                            <td className="py-1 pr-2 text-gray-500">{m.type}</td>
                                                            <td className="py-1 pr-2">
                                                                <select
                                                                    value={m.mappedSlot}
                                                                    onChange={e => handleMappingChange(i, 'mappedSlot', e.target.value)}
                                                                    className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none focus:border-white/30 w-24"
                                                                >
                                                                    {slotOptionsForType(m.type).map(opt => (
                                                                        <option key={opt} value={opt}>{slotLabel(opt)}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="py-1 pr-2 font-mono text-blue-300/80 text-[9px]">{defaultVal}</td>
                                                            {isBoolInGroup && groupSize > 1 ? (
                                                                <td colSpan={3} className="py-1 text-amber-400/60 font-mono text-[9px]">
                                                                    bit {bit} · val +{Math.pow(2, bit)}
                                                                </td>
                                                            ) : isInVecGroup ? (
                                                                <td colSpan={3} className="py-1 text-sky-400/60 font-mono text-[9px]">
                                                                    .{compInfo!.comp} component
                                                                </td>
                                                            ) : showFixed ? (
                                                                <td colSpan={3} className="py-1">
                                                                    <input
                                                                        type="text"
                                                                        value={m.fixedValue}
                                                                        onChange={e => handleMappingChange(i, 'fixedValue', e.target.value)}
                                                                        className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] font-mono text-white focus:outline-none focus:border-white/30 w-20"
                                                                        placeholder="1.0"
                                                                    />
                                                                </td>
                                                            ) : showRange ? (
                                                                <>
                                                                    <td className="py-1 pr-1"><input type="number" value={m.uiMin} onChange={e => handleMappingChange(i, 'uiMin', parseFloat(e.target.value) || 0)} className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none w-12" /></td>
                                                                    <td className="py-1 pr-1"><input type="number" value={m.uiMax} onChange={e => handleMappingChange(i, 'uiMax', parseFloat(e.target.value) || 0)} className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none w-12" /></td>
                                                                    <td className="py-1"><input type="number" value={m.uiStep} onChange={e => handleMappingChange(i, 'uiStep', parseFloat(e.target.value) || 0.001)} className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none w-12" /></td>
                                                                </>
                                                            ) : (
                                                                <td colSpan={3} className="py-1 text-gray-700 italic">—</td>
                                                            )}
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                );
                            })() : (
                                <p className="text-[10px] text-gray-600 italic">No uniforms detected — formula has no user parameters.</p>
                            )}
                        </section>
                    )}

                    {/* ── Section 4: Transformed Output ── */}
                    {detected && selectedFunctionName && (
                        <section className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-500">4 · Transformed Output</h3>
                                <span className="text-[9px] text-gray-600 italic">① uniforms · ② function · ③ loop init · ④ loop body · ⑤ getDist</span>
                            </div>
                            <GlslEditor
                                value={transformedCode}
                                onChange={() => {}}
                                readOnly={true}
                                height="320px"
                                placeholder="// Transformed formula will appear here after detection"
                            />
                        </section>
                    )}

                    {/* ── Warnings ── */}
                    {detected && detected.warnings.length > 0 && (
                        <div className="space-y-1 p-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                            {detected.warnings.map((w, i) => (
                                <p key={i} className="text-[10px] text-yellow-400/80">⚠ {w}</p>
                            ))}
                        </div>
                    )}

                    {/* ── Error ── */}
                    {error && (
                        <div className="p-2 rounded-lg border border-red-500/30 bg-red-500/10">
                            <p className="text-[11px] text-red-400 font-mono">{error}</p>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-black/30 shrink-0">
                    <button
                        onClick={handleClose}
                        className="px-3 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePreview}
                            disabled={!canPreview}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700/80 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-black uppercase tracking-wider text-white transition-colors"
                        >
                            <PlayIcon />
                            Preview
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!canImport}
                            className="px-4 py-1.5 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-black uppercase tracking-wider text-white transition-colors"
                        >
                            Import Formula
                        </button>
                    </div>
                </div>

        </div>
    );
};
