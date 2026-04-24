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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CategoryPickerMenu } from '../../../components/CategoryPickerMenu';
import type { PickerCategory, PickerItem } from '../../../components/CategoryPickerMenu';
import type { FractalDefinition } from '../../types';
import { registry } from '../../engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { useEngineStore } from '../../../store/engineStore';
import { GlslEditor } from '../../../components/inputs/GlslEditor';
import type { EditorHighlight } from '../../../components/inputs/GlslEditor';
import type { WorkshopDetection, WorkshopParam, TransformedFormulaV2 } from './types';
import { detectVariables, promoteVariable } from './workshop/variable-detector';
import type { DetectedVariable } from './workshop/variable-detector';
import { detectFormulaV3, transformFormulaV3 } from './v3/compat';
import { buildFractalParams, filterDeadParams, slotLabel, componentSlotBase, groupedSlotOptions, buildOccupancyMap, isSlotConflict, getSlotOccupancy } from './workshop/param-builder';
import { processFormula as v4ProcessFormula } from './v4';

const PREVIEW_ID = 'frag_workshop_preview';
import {
    loadLibrary, isLibraryLoaded,
    getCategories, getFormulasByCategory,
    getFolders, getFormulasByFolder,
    getFormulasBySource, searchFormulas, pickRandom,
    loadFragSource, loadDECSource,
    getRecommendedPipeline, getFormulaCompat,
} from './formula-library';
import type { FormulaEntry, RecommendedPipeline } from './formula-library';

// ─── Slot Picker ────────────────────────────────────────────────────────────
// Uses the same CategoryPickerMenu as ParameterSelector (LFO/audio modulation targets).

interface SlotPickerProps {
    value: string;
    paramType: string;
    groups: import('./workshop/param-builder').SlotGroup[];
    occupancyMap: Map<string, Set<string>>;
    scalarUsed: Set<string>;
    onChange: (slot: string) => void;
}

function SlotPicker({ value, paramType, groups, occupancyMap, scalarUsed, onChange }: SlotPickerProps) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0, right: 0 });

    const handleClick = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({ x: rect.left, y: rect.bottom + 4, right: rect.right });
            setOpen(true);
        }
    };

    const topOptions = groups.filter(g => g.label === null).flatMap(g => g.options);
    const subGroups = groups.filter(g => g.label !== null);

    const categories: PickerCategory[] = [
        ...(topOptions.length > 0 ? [{ id: '__top__', name: 'General' }] : []),
        ...subGroups.map(g => ({
            id: g.label!,
            name: g.label!,
            highlight: g.options.includes(value),
        })),
    ];

    const getItems = (catId: string): PickerItem[] => {
        const options = catId === '__top__'
            ? topOptions
            : subGroups.find(g => g.label === catId)?.options ?? [];

        return options.map(opt => {
            const taken = catId !== '__top__' && isSlotConflict(opt, paramType, value, occupancyMap, scalarUsed);
            return {
                key: opt,
                label: slotLabel(opt),
                selected: opt === value,
                disabled: taken,
                disabledSuffix: taken ? '✓' : undefined,
            };
        });
    };

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                type="button"
                onClick={handleClick}
                className="t-select text-white w-28 text-left truncate"
            >
                {slotLabel(value)}
            </button>
            {open && (
                <CategoryPickerMenu
                    x={coords.x} y={coords.y}
                    anchorRight={coords.right}
                    categories={categories}
                    getItems={getItems}
                    onSelect={onChange}
                    onClose={() => setOpen(false)}
                    categoryWidth={100}
                    itemWidth={140}
                />
            )}
        </div>
    );
}

// ─── Default Script ─────────────────────────────────────────────────────────

const DEFAULT_SCRIPT = `// GMT Formula Workshop
// Paste a GLSL distance estimator or load a .frag file.
// Accepts: float DE(vec3 p), dist(), de(), sdf(), map()
//          Any float(vec3) function is auto-detected.
//
// ── UNIFORM SYNTAX ──────────────────────────────────────────
//   uniform float Scale;  slider[min, default, max]
//   uniform vec3  Offset; slider[(-5,-5,-5),(0,0,0),(5,5,5)]
//   uniform vec2  Seed;   slider[(-2,-2),(0,0),(2,2)]
//   uniform int   Mode;   slider[0, 0, 3]
//   uniform bool  Julia;  checkbox[false]
//
// ── SLOTS (mapped in Step 3) ────────────────────────────────
//   Scalars: paramA..paramF | Vec3: vec3A..vec3C | Vec2: vec2A..vec2C
//   Special: uIterations, uJulia/uJuliaMode
//
// ── ENGINE SCOPE ────────────────────────────────────────────
//   z.xyz = position | dr = derivative | trap = orbit trap
//   c.xyz = constant (initial pos or Julia seed)
//   getDist returns vec2(distance, iteration_count)
//
// ── HELPERS (always available) ──────────────────────────────
//   sphereFold, boxFold, applyPreRotation, applyPostRotation
//   rotationMatrix3, sdBox, sdSphere, cPow, cMul
//
// ════════════════════════════════════════════════════════════
//  Example: Mandelbox — all param types demonstrated
// ════════════════════════════════════════════════════════════

uniform float Scale;    slider[-3.0, 2.0, 4.0]
uniform float MinRad2;  slider[0.01, 0.25, 1.0]
uniform vec3  Offset;   slider[(-2,-2,-2),(0,0,0),(2,2,2)]
uniform vec2  Warp;     slider[(-1,-1),(0,0),(1,1)]
uniform int   Folds;    slider[1, 6, 12]
uniform bool  Julia;    checkbox[false]

float DE(vec3 pos) {
    float minRad2 = clamp(MinRad2, 1.0e-9, 1.0);
    vec4 scale = vec4(Scale) / minRad2;
    float absScaleM1 = abs(Scale - 1.0);
    float absScale = abs(Scale);

    vec4 p = vec4(pos, 1.0), p0 = p;

    for (int i = 0; i < 12; i++) {
        p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;
        p.xy += Warp;
        float r2 = dot(p.xyz, p.xyz);
        p *= clamp(max(minRad2 / r2, minRad2), 0.0, 1.0);
        p = p * scale + p0;
        if (i < Folds) p.xyz += Offset;
    }

    return (length(p.xyz) - absScaleM1) / p.w - pow(absScale, float(1 - 12));
}
`;

// ─── Formula Loading ────────────────────────────────────────────────────────

/** Load a formula entry's source code (frag via fetch, DEC from cached JSON). */
async function loadFormulaSource(entry: FormulaEntry): Promise<{ label: string; content: string }> {
    if (entry.source === 'frag') {
        const content = await loadFragSource(entry.id);
        const label = entry.id.split('/').pop()?.replace('.frag', '') ?? 'unknown';
        return { label, content };
    } else {
        const dec = loadDECSource(entry.id);
        if (!dec) throw new Error(`DEC formula not found: ${entry.id}`);
        return { label: entry.id, content: dec.code };
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return a name that doesn't collide with any existing formula in the registry. */
function uniqueName(base: string): string {
    if (!base) return '';
    if (!registry.get(base)) return base;
    for (let i = 2; i < 100; i++) {
        const candidate = `${base}_${i}`;
        if (!registry.get(candidate)) return candidate;
    }
    return base;
}

/** Run V3 transform pipeline. */
function runTransform(
    detected: WorkshopDetection,
    selectedFunction: string,
    loopMode: 'loop' | 'single',
    formulaName: string,
    mappings: WorkshopParam[],
): TransformedFormulaV2 | null {
    return transformFormulaV3(detected, selectedFunction, loopMode, formulaName, mappings);
}

function banner(label: string, sublabel: string): string {
    return `// ${'─'.repeat(58)}\n// ${label}\n// ${sublabel}\n// ${'─'.repeat(58)}`;
}

function formatAnnotatedOutput(r: TransformedFormulaV2): string {
    const sections: string[] = [];
    if (r.uniforms?.trim()) sections.push(banner('① UNIFORMS', 'injected at shader top — uniform declarations'), r.uniforms.trim());
    if (r.function?.trim()) sections.push(banner('② FUNCTION', 'injected at shader top — formula_X() + helpers'), r.function.trim());
    if (r.loopInit?.trim()) sections.push(banner('③ LOOP INIT', 'injected inside map() — before the iteration for-loop'), r.loopInit.trim());
    if (r.loopBody?.trim()) sections.push(banner('④ LOOP BODY', 'injected inside the for-loop — called every iteration'), r.loopBody.trim());
    if (r.getDist?.trim()) sections.push(banner('⑤ GET DIST', 'injected as the distance estimation function'), r.getDist.trim());
    return sections.join('\n\n');
}

/** Concatenate all generated code sections for dead-param filtering. */
function allGeneratedCode(r: TransformedFormulaV2): string {
    return [r.function, r.loopBody, r.getDist, r.loopInit].filter(Boolean).join('\n');
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const XIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CodeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const CheckCircleIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const ChevronDownIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const ChevronRightIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkshopProps {
    onClose: () => void;
    /** Pre-populate the Workshop from a previously imported formula for re-editing. */
    editFormula?: string;
}

// ─── Parameter Table ────────────────────────────────────────────────────────
// Extracted from the main component to keep the render method readable.
// Receives pre-computed grouping data via props to avoid inline computation.

interface ParamTableProps {
    mappings: WorkshopParam[];
    onMappingChange: (index: number, field: keyof WorkshopParam, value: string | number) => void;
}

function ParamTable({ mappings, onMappingChange }: ParamTableProps) {
    // Compute grouping data (bools sharing slots, floats sharing vec bases)
    const { boolsPerSlot, bitIndex, floatsPerBase, compIndex, occupancyMap, scalarUsed } = useMemo(() => {
        const boolsPerSlot = new Map<string, number[]>();
        mappings.forEach((m, i) => {
            if (m.type !== 'bool' || m.mappedSlot === 'ignore' || m.mappedSlot === 'fixed' || m.mappedSlot === 'uJuliaMode') return;
            if (!boolsPerSlot.has(m.mappedSlot)) boolsPerSlot.set(m.mappedSlot, []);
            boolsPerSlot.get(m.mappedSlot)!.push(i);
        });
        const bitIndex = new Map<number, number>();
        for (const indices of boolsPerSlot.values()) {
            indices.forEach((idx, bit) => bitIndex.set(idx, bit));
        }
        const floatsPerBase = new Map<string, number[]>();
        mappings.forEach((m, i) => {
            const base = componentSlotBase(m.mappedSlot);
            if (!base) return;
            if (!floatsPerBase.has(base)) floatsPerBase.set(base, []);
            floatsPerBase.get(base)!.push(i);
        });
        const compIndex = new Map<number, { base: string; comp: string }>();
        for (const [base] of floatsPerBase) {
            (floatsPerBase.get(base) ?? []).forEach(idx => {
                compIndex.set(idx, { base, comp: mappings[idx].mappedSlot.split('.')[1] ?? '' });
            });
        }
        const occupancyMap = buildOccupancyMap(mappings);
        const scalarUsed = new Set<string>();
        mappings.forEach(m => {
            if (m.mappedSlot !== 'ignore' && m.mappedSlot !== 'fixed' && m.mappedSlot !== 'builtin') {
                if (!getSlotOccupancy(m.mappedSlot, m.type)) scalarUsed.add(m.mappedSlot);
            }
        });
        return { boolsPerSlot, bitIndex, floatsPerBase, compIndex, occupancyMap, scalarUsed };
    }, [mappings]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
                <thead>
                    <tr className="text-gray-600 border-b border-white/10">
                        <th className="text-left pb-1 pr-2 font-semibold">Variable</th>
                        <th className="text-left pb-1 pr-2 font-semibold">Type</th>
                        <th className="text-left pb-1 pr-2 font-semibold">→ Slot</th>
                        <th className="text-left pb-1 pr-2 font-semibold">Default</th>
                        <th className="text-left pb-1 pr-1 font-semibold">Min</th>
                        <th className="text-left pb-1 pr-1 font-semibold">Max</th>
                        <th className="text-left pb-1 font-semibold">Step / Flags</th>
                    </tr>
                </thead>
                <tbody>
                    {mappings.map((m, i) => {
                        const isBoolInGroup = m.type === 'bool' && bitIndex.has(i);
                        const groupSize = isBoolInGroup ? (boolsPerSlot.get(m.mappedSlot)?.length ?? 1) : 0;
                        const bit = bitIndex.get(i) ?? 0;
                        const isFirstInGroup = isBoolInGroup && bit === 0;

                        const compInfo = compIndex.get(i);
                        const isInVecGroup = !!compInfo && (floatsPerBase.get(compInfo.base)?.length ?? 0) > 1;
                        const vecGroupIndices = compInfo ? (floatsPerBase.get(compInfo.base) ?? []) : [];
                        const isFirstVecIndex = vecGroupIndices[0] === i;

                        const showRange = !isBoolInGroup && !isInVecGroup && m.mappedSlot !== 'ignore' && m.mappedSlot !== 'builtin' && m.mappedSlot !== 'uJulia' && m.mappedSlot !== 'uJuliaMode' && m.mappedSlot !== 'fixed';
                        const showFixed = m.mappedSlot === 'fixed';
                        const defaultVal = Array.isArray(m.uiDefault)
                            ? m.uiDefault.map(v => (v as number).toPrecision(3)).join(', ')
                            : (m.uiDefault as number).toPrecision(3);

                        return (
                            <React.Fragment key={m.name}>
                                {isFirstInGroup && groupSize > 1 && (
                                    <tr className="border-t border-amber-500/20">
                                        <td colSpan={7} className="pt-1.5 pb-0.5 px-1">
                                            <span className="text-amber-400/70 text-[9px] font-semibold">
                                                ⚑ Flags · {groupSize} bits packed into {m.mappedSlot} · slider 0–{Math.pow(2, groupSize) - 1}
                                            </span>
                                            <span className="text-gray-600 text-[9px] ml-2 normal-case">assign bools to the same slot to group them</span>
                                        </td>
                                    </tr>
                                )}
                                {isInVecGroup && isFirstVecIndex && (
                                    <tr className="border-t border-sky-500/20">
                                        <td colSpan={7} className="pt-1.5 pb-0.5 px-1">
                                            <span className="text-sky-400/70 text-[9px] font-semibold">
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
                                        <SlotPicker
                                            value={m.mappedSlot}
                                            paramType={m.type}
                                            groups={groupedSlotOptions(m.type)}
                                            occupancyMap={occupancyMap}
                                            scalarUsed={scalarUsed}
                                            onChange={v => onMappingChange(i, 'mappedSlot', v)}
                                        />
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
                                                onChange={e => onMappingChange(i, 'fixedValue', e.target.value)}
                                                className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] font-mono text-white focus:outline-none focus:border-white/30 w-20"
                                                placeholder="1.0"
                                            />
                                        </td>
                                    ) : showRange ? (
                                        <>
                                            <td className="py-1 pr-1"><input type="number" value={m.uiMin} onChange={e => onMappingChange(i, 'uiMin', parseFloat(e.target.value) || 0)} className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none w-12" /></td>
                                            <td className="py-1 pr-1"><input type="number" value={m.uiMax} onChange={e => onMappingChange(i, 'uiMax', parseFloat(e.target.value) || 0)} className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none w-12" /></td>
                                            <td className="py-1"><input type="number" value={m.uiStep} onChange={e => onMappingChange(i, 'uiStep', parseFloat(e.target.value) || 0.001)} className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none w-12" /></td>
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
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const FormulaWorkshop: React.FC<WorkshopProps> = ({ onClose, editFormula }) => {
    // ── State ──
    const [source, setSource]                             = useState(editFormula ? '' : DEFAULT_SCRIPT);
    const [sourceCollapsed, setSourceCollapsed]           = useState(false);
    const [sourceHeight, setSourceHeight]                 = useState(300);
    const [detected, setDetected]                         = useState<WorkshopDetection | null>(null);
    const [selectedFunctionName, setSelectedFunctionName] = useState('');
    const [loopMode, setLoopMode]                         = useState<'loop' | 'single'>('loop');
    const [mappings, setMappings]                         = useState<WorkshopParam[]>([]);
    const [formulaName, setFormulaName]                   = useState('');
    const [transformedCode, setTransformedCode]           = useState('');
    const [error, setError]                               = useState<string | null>(null);
    const [success, setSuccess]                           = useState(false);
    const [browseFragOpen, setBrowseFragOpen]               = useState(false);
    const [browseDECOpen, setBrowseDECOpen]               = useState(false);
    const [browseMode, setBrowseMode]                     = useState<'category' | 'folder'>('folder');
    const [libraryReady, setLibraryReady]                 = useState(isLibraryLoaded());
    const [searchQuery, setSearchQuery]                   = useState('');
    const [searchResults, setSearchResults]               = useState<FormulaEntry[] | null>(null);
    const [detectVarsActive, setDetectVarsActive]         = useState(false);
    const [detectedVars, setDetectedVars]                 = useState<DetectedVariable[]>([]);
    /** Pipeline selector:
     *    'auto' — per-formula catalog recommendation (V3 when V3 passes for
     *             engine-feature compat; else V4 if V4 passes; else V4 default).
     *    'v3'   — force V3 pipeline (per-iteration extraction; composes with
     *             interlace / hybrid fold / burning ship).
     *    'v4'   — force V4 processFormula (self-contained SDE; simpler but no
     *             engine-feature composition).
     *  See docs/26_Formula_Workshop_V4_Plan.md §0.1 + docs/research/hybrid-formula-architecture-comparison.md */
    const [pipelineMode, setPipelineMode]                 = useState<'auto' | 'v3' | 'v4'>('auto');
    /** ID of the formula loaded from the library, used for auto-pick lookup.
     *  null when the user pasted custom source. */
    const [currentEntryId, setCurrentEntryId]             = useState<string | null>(null);
    /** Toggle: when true, include formulas where neither pipeline renders.
     *  Default false — most users don't want to see 170+ broken entries. */
    const [showIncompatible, setShowIncompatible]         = useState(false);

    // ── Refs ──
    const fileRef            = useRef<HTMLInputElement>(null);
    const browseFragRef      = useRef<HTMLButtonElement>(null);
    const browseDECRef       = useRef<HTMLButtonElement>(null);
    const previousFormulaRef = useRef('');
    const sourceHeightRef    = useRef(sourceHeight);
    sourceHeightRef.current  = sourceHeight;

    // ── Load formula library on mount ──
    useEffect(() => {
        loadLibrary().then(() => setLibraryReady(true)).catch(e => console.warn('[Workshop] Library load failed:', e));
    }, []);

    // ── Effective pipeline (auto = catalog recommendation) ──
    // Resolved per-render so catalog-aware changes (loading a new library entry)
    // flip the pipeline instantly without another state set.
    const effectivePipeline: 'v3' | 'v4' = useMemo(() => {
        if (pipelineMode === 'v3' || pipelineMode === 'v4') return pipelineMode;
        // Auto: consult the catalog. Default to v4 when formula is unknown
        // (custom-pasted GLSL) or catalog hasn't loaded yet.
        const rec: RecommendedPipeline = currentEntryId
            ? getRecommendedPipeline(currentEntryId)
            : 'v4';
        return rec === 'v3' ? 'v3' : 'v4';  // 'none' also routes through V4 (it'll surface its own error)
    }, [pipelineMode, currentEntryId]);
    const useV4Pipeline = effectivePipeline === 'v4';  // preserves existing handler shape

    // ── Store ──
    const setFormula = useEngineStore(s => s.setFormula);
    const store      = useEngineStore();

    const applyFormulaDefaults = useCallback((preset: any) => {
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
    }, [store]);

    // ── Capture previous formula for restore on close ──
    useEffect(() => {
        previousFormulaRef.current = (store as any).formula || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Detection ──
    // V3's detect pre-populates the slot-mapping UI so users can route params
    // to engine uniform slots. V4 doesn't need detect (its processFormula does
    // its own analysis), so when V4 is the effective pipeline we still run
    // detect — if it succeeds the user sees the V3 UI as a bonus, if it fails
    // they can still preview/import via V4. We no longer block on detect
    // parse errors because V3's preprocessor now handles the quirks (`;;`,
    // `#vertex` blocks, etc.) that previously caused crashes.
    const runDetect = useCallback((src: string, fileBaseName?: string, entryId?: string | null) => {
        setError(null);
        setDetected(null);
        setTransformedCode('');
        if (!src.trim()) return;

        const willUseV4 = pipelineMode === 'v4'
            || (pipelineMode === 'auto' && entryId != null
                && getRecommendedPipeline(entryId) === 'v4');

        const result = detectFormulaV3(src, fileBaseName);
        if ('error' in result) {
            // If V4 is going to handle this formula, don't block on V3 detect
            // failure — just pre-fill the name and let the user Preview/Import.
            // If V3 is the target, surface the error so they can investigate.
            if (willUseV4) {
                setFormulaName(uniqueName(fileBaseName || 'imported'));
                setSourceCollapsed(true);
            } else {
                setError(result.error);
            }
            return;
        }

        setDetected(result);
        setSelectedFunctionName(result.selectedFunction);
        setLoopMode(result.loopMode);
        setMappings(result.params);
        setFormulaName(uniqueName(result.suggestedName || fileBaseName || 'imported'));
        setSourceCollapsed(true);
    }, [pipelineMode]);

    // ── Re-edit: pre-populate from a previously imported formula ──
    useEffect(() => {
        if (!editFormula) return;
        const def = registry.get(editFormula);
        if (!def?.importSource) return;
        const { glsl, selectedFunction, loopMode: lm, mappings: m } = def.importSource;
        setSource(glsl);
        setSelectedFunctionName(selectedFunction);
        setLoopMode(lm);
        setMappings(m as WorkshopParam[]);
        runDetect(glsl, editFormula);
        // Re-set name AFTER runDetect so it wins the React batch
        // (runDetect derives a fresh name which would overwrite editFormula)
        setFormulaName(editFormula);
    }, [editFormula, runDetect]);

    // ── Auto-generate annotated transformed output ──
    useEffect(() => {
        if (!detected || !selectedFunctionName) { setTransformedCode(''); return; }
        try {
            const result = runTransform(detected, selectedFunctionName, loopMode, formulaName || 'Preview', mappings);
            if (result) setTransformedCode(formatAnnotatedOutput(result));
        } catch (e) { console.warn('[Workshop] Transform preview failed:', e); }
    }, [detected, selectedFunctionName, loopMode, mappings, formulaName]);

    // Dice predicate: only pick formulas at least one pipeline can render,
    // unless the user has opted into "show broken". When the catalog isn't
    // loaded (offline dev build), compat is undefined → predicate passes.
    const dicePredicate = useCallback((entry: FormulaEntry): boolean => {
        if (showIncompatible) return true;
        const compat = getFormulaCompat(entry.id);
        return !compat || compat.recommended !== 'none';
    }, [showIncompatible]);

    // ── File Loading ──
    const handleRandomDEC = useCallback(async () => {
        if (!libraryReady) return;
        try {
            // Predicate filters out "neither renders" entries; if the filter
            // produces an empty pool (shouldn't happen with real catalog),
            // fall back to the unfiltered pool so the dice never hangs.
            const entry = pickRandom('dec', dicePredicate) ?? pickRandom('dec');
            if (!entry) { setError('No DEC formulas in library.'); return; }
            const { label, content } = await loadFormulaSource(entry);
            setSource(content);
            setCurrentEntryId(entry.id);
            runDetect(content, label, entry.id);
        } catch (e) {
            setError('Failed to load formula: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, [runDetect, libraryReady, dicePredicate]);

    const handleRandomFrag = useCallback(async () => {
        if (!libraryReady) return;
        try {
            const entry = pickRandom('frag', dicePredicate) ?? pickRandom('frag');
            if (!entry) { setError('No frag formulas in library.'); return; }
            const { label, content } = await loadFormulaSource(entry);
            setSource(content);
            setCurrentEntryId(entry.id);
            runDetect(content, label, entry.id);
        } catch (e) {
            setError('Failed to load formula: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, [runDetect, libraryReady, dicePredicate]);

    const handleLoadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fileBaseName = file.name.replace(/\.(frag|glsl|txt)$/i, '').replace(/[^a-zA-Z0-9_]/g, '');
        const reader = new FileReader();
        reader.onload = ev => {
            const content = ev.target?.result as string;
            if (content) {
                setSource(content);
                // User-supplied file — not a library entry, so no catalog lookup possible.
                setCurrentEntryId(null);
                runDetect(content, fileBaseName || undefined);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [runDetect]);

    // ── Browse Frag Library ──
    const fragBrowseCategories: PickerCategory[] = useMemo(() => {
        if (!libraryReady) return [];
        if (browseMode === 'folder') {
            return getFolders().map(f => ({ id: f.id, name: `${f.name} (${f.formulaCount})` }));
        }
        return getCategories('frag').map(c => ({ id: c.id, name: `${c.name} (${c.formulaCount})` }));
    }, [libraryReady, browseMode]);

    /** Build a PickerItem badge from the catalog verdict.
     *  Green "Iteration" = per-iteration formula, composes with engine features
     *    like interlace, hybrid fold, burning ship (what V3 emits).
     *  Cyan "Standalone"  = self-contained DE, renders solo (what V4 emits). */
    const compatBadge = useCallback((id: string): PickerItem['badge'] | undefined => {
        const c = getFormulaCompat(id);
        if (!c || c.recommended === 'none') return undefined;
        if (c.recommended === 'v3') {
            return { text: 'Iteration', className: 'bg-emerald-900/50 text-emerald-300 border border-emerald-600/30' };
        }
        return { text: 'Standalone', className: 'bg-cyan-900/40 text-cyan-300 border border-cyan-600/30' };
    }, []);

    const isUnrenderable = useCallback((id: string): boolean => {
        return getFormulaCompat(id)?.recommended === 'none';
    }, []);

    const entryToPickerItem = useCallback((entry: FormulaEntry, prefix: 'frag' | 'dec'): PickerItem | null => {
        const badRender = isUnrenderable(entry.id);
        if (badRender && !showIncompatible) return null;
        // When the user has opted into "show broken", let them click entries
        // the catalog flagged as unrenderable. The harness gates that mark a
        // formula "broken" (sampleNonConstant / renderNonDegenerate) are
        // unreliable — the formula may well render in the live engine, and
        // the user is asking to try.
        return {
            key: `${prefix}:${entry.id}`,
            label: entry.name,
            description: entry.artist !== 'unknown' ? entry.artist : undefined,
            badge: compatBadge(entry.id),
        };
    }, [isUnrenderable, showIncompatible, compatBadge]);

    const getFragBrowseItems = useCallback((categoryId: string): PickerItem[] => {
        if (!libraryReady) return [];
        const entries = browseMode === 'folder'
            ? getFormulasByFolder(categoryId)
            : getFormulasByCategory(categoryId, 'frag');
        return entries.map(e => entryToPickerItem(e, 'frag')).filter((i): i is PickerItem => i !== null);
    }, [libraryReady, browseMode, entryToPickerItem]);

    // ── Browse DEC Library ──
    const decBrowseCategories: PickerCategory[] = useMemo(() => {
        if (!libraryReady) return [];
        return getCategories('dec').map(c => ({ id: c.id, name: `${c.name} (${c.formulaCount})` }));
    }, [libraryReady]);

    const getDECBrowseItems = useCallback((categoryId: string): PickerItem[] => {
        if (!libraryReady) return [];
        return getFormulasByCategory(categoryId, 'dec')
            .map(e => entryToPickerItem(e, 'dec'))
            .filter((i): i is PickerItem => i !== null);
    }, [libraryReady, entryToPickerItem]);

    const handleBrowseSelect = useCallback(async (key: string) => {
        const [src, ...rest] = key.split(':');
        const id = rest.join(':');
        try {
            const entry: FormulaEntry = { id, name: '', source: src as any, artist: '', category: '', tags: [] };
            const { label, content } = await loadFormulaSource(entry);
            setSource(content);
            setCurrentEntryId(id);
            runDetect(content, label, id);
        } catch (e) {
            setError('Failed to load formula: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, [runDetect]);

    // ── Search ──
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (!libraryReady || !query.trim()) { setSearchResults(null); return; }
        setSearchResults(searchFormulas(query));
    }, [libraryReady]);

    const handleSearchSelect = useCallback(async (entry: FormulaEntry) => {
        try {
            const { label, content } = await loadFormulaSource(entry);
            setSource(content);
            setCurrentEntryId(entry.id);
            runDetect(content, label, entry.id);
            setSearchQuery('');
            setSearchResults(null);
        } catch (e) {
            setError('Failed to load formula: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, [runDetect]);

    // ── Variable detection (highlight mode) ──
    useEffect(() => {
        if (detectVarsActive && source.trim()) {
            setDetectedVars(detectVariables(source));
        } else {
            setDetectedVars([]);
        }
    }, [detectVarsActive, source]);

    // Convert detected variables to editor highlights
    const editorHighlights: EditorHighlight[] | undefined = useMemo(() => {
        if (!detectVarsActive || detectedVars.length === 0) return undefined;
        const highlights: EditorHighlight[] = [];
        for (const v of detectedVars) {
            for (const occ of v.occurrences) {
                highlights.push({
                    from: occ.from,
                    to: occ.to,
                    id: v.id,
                    colorClass: v.colorClass,
                    tooltip: `${v.context} → click to promote to uniform "${v.name}"`,
                });
            }
        }
        return highlights;
    }, [detectVarsActive, detectedVars]);

    // Click-to-promote handler
    const handleHighlightClick = useCallback((id: string) => {
        const variable = detectedVars.find(v => v.id === id);
        if (!variable) return;
        const newSource = promoteVariable(source, variable);
        setSource(newSource);
        // Re-detection happens automatically via the useEffect above
    }, [detectedVars, source]);

    // ── Source resize (uses ref to avoid recreating on every height change) ──
    const handleSourceResizeStart = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = sourceHeightRef.current;
        const onMove = (ev: PointerEvent) => {
            setSourceHeight(Math.max(100, Math.min(800, startH + (ev.clientY - startY))));
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, []);

    // ── Function Selection ──
    const handleSelectFunction = useCallback((name: string) => {
        setSelectedFunctionName(name);
        const c = detected?.candidates.find(c => c.name === name);
        setLoopMode(c?.loopInfo !== null ? 'loop' : 'single');
    }, [detected]);

    // ── Mapping Changes ──
    const handleMappingChange = useCallback((index: number, field: keyof WorkshopParam, value: string | number) => {
        setMappings(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            if (field === 'mappedSlot' && value !== 'ignore' && value !== 'fixed' && value !== 'builtin') {
                const isAssigningBool = next[index].type === 'bool';
                const newSlot = value as string;
                const newInfo = getSlotOccupancy(newSlot, next[index].type);
                for (let i = 0; i < next.length; i++) {
                    if (i === index) continue;
                    const existing = next[i].mappedSlot;
                    if (existing === 'ignore' || existing === 'fixed' || existing === 'builtin') continue;

                    if (existing === newSlot) {
                        if (isAssigningBool && next[i].type === 'bool') continue;
                        next[i] = { ...next[i], mappedSlot: 'ignore' };
                        continue;
                    }

                    if (newInfo) {
                        const existingInfo = getSlotOccupancy(existing, next[i].type);
                        if (existingInfo && existingInfo.base === newInfo.base) {
                            const overlap = newInfo.components.some(c => existingInfo.components.includes(c));
                            if (overlap) next[i] = { ...next[i], mappedSlot: 'ignore' };
                        }
                    }
                }
            }
            return next;
        });
    }, []);

    // ── Build & register a formula definition ──
    const buildAndRegister = useCallback((
        id: string,
        name: string,
        result: TransformedFormulaV2,
        liveMappings: WorkshopParam[],
        importSource?: FractalDefinition['importSource'],
    ) => {
        const { uiParams, defaultPreset } = buildFractalParams(liveMappings, id);
        const def: FractalDefinition = {
            id: id as any,
            name,
            description: importSource ? 'Imported formula' : undefined,
            shader: {
                function: (result.uniforms ? result.uniforms + '\n\n' : '') + result.function,
                loopBody: result.loopBody,
                getDist: result.getDist,
                loopInit: result.loopInit,
            },
            parameters: uiParams,
            defaultPreset,
            importSource,
        };
        registry.register(def);
        FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
        return { def, defaultPreset };
    }, []);

    // ── V4 pipeline: build + register a formula via the new processFormula ──
    // Bypasses V3's detect/transform entirely. Logs the registered def so
    // triage is possible when something downstream misrenders.
    const buildAndRegisterV4 = useCallback((
        id: string,
        name: string,
        sourceText: string,
    ): { ok: true; def: FractalDefinition; defaultPreset: any } | { ok: false; error: string } => {
        const r = v4ProcessFormula(sourceText, name, id, name);
        if (!r.ok) return { ok: false, error: `${r.error.kind}: ${r.error.message}` };
        const def = r.value.definition;
        registry.register(def);
        FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
        console.log('[V4] registered', def.id, def);
        return { ok: true, def, defaultPreset: def.defaultPreset };
    }, []);

    // ── Preview ──
    const handlePreview = useCallback(() => {
        if (!detected || !selectedFunctionName) return;
        setError(null);
        try {
            // V4 path: bypass the V3 transform chain entirely.
            if (useV4Pipeline) {
                const r = buildAndRegisterV4(PREVIEW_ID, 'Workshop Preview', source);
                if (!r.ok) { setError('V4 preview failed: ' + r.error); return; }
                setFormula(PREVIEW_ID as any);
                applyFormulaDefaults(r.defaultPreset);
                return;
            }

            const result = runTransform(detected, selectedFunctionName, loopMode, PREVIEW_ID, mappings);
            if (!result) { setError('Could not analyze the selected function.'); return; }

            const liveMappings = filterDeadParams(mappings, allGeneratedCode(result));
            const { defaultPreset } = buildAndRegister(PREVIEW_ID, 'Workshop Preview', result, liveMappings);
            setFormula(PREVIEW_ID as any);
            applyFormulaDefaults(defaultPreset);
        } catch (e) {
            setError('Preview failed: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, [detected, selectedFunctionName, loopMode, mappings, source, useV4Pipeline, buildAndRegister, buildAndRegisterV4, setFormula, applyFormulaDefaults]);

    // ── Close: restore previous formula if showing preview ──
    const handleClose = useCallback(() => {
        if ((store as any).formula === PREVIEW_ID) {
            setFormula(previousFormulaRef.current as any);
        }
        onClose();
    }, [store, setFormula, onClose]);

    // ── Import ──
    const handleImport = useCallback(() => {
        if (!detected || !selectedFunctionName || !formulaName.trim()) return;
        setError(null);

        // V4 path: processFormula handles slot assignment internally — no
        // per-param mapping UI needed. Skips V3 validation entirely.
        if (useV4Pipeline) {
            try {
                const r = buildAndRegisterV4(formulaName, formulaName, source);
                if (!r.ok) { setError('V4 import failed: ' + r.error); return; }
                setSuccess(true);
                setTimeout(() => { setFormula(formulaName as any); applyFormulaDefaults(r.defaultPreset); onClose(); }, 1000);
            } catch (e) {
                setError('V4 import failed: ' + (e instanceof Error ? e.message : String(e)));
            }
            return;
        }

        try {
            // Validate slot uniqueness
            const valOccupancy = new Map<string, Set<string>>();
            for (const m of mappings) {
                if (m.mappedSlot === 'ignore' || m.mappedSlot === 'fixed' || m.mappedSlot === 'builtin') continue;
                const info = getSlotOccupancy(m.mappedSlot, m.type);
                if (info) {
                    if (!valOccupancy.has(info.base)) valOccupancy.set(info.base, new Set());
                    const occ = valOccupancy.get(info.base)!;
                    for (const c of info.components) {
                        if (occ.has(c)) { setError(`Component "${info.base}.${c}" is assigned to multiple parameters.`); return; }
                        occ.add(c);
                    }
                } else {
                    const dup = mappings.filter(o => o !== m && o.mappedSlot === m.mappedSlot
                        && o.mappedSlot !== 'ignore' && o.mappedSlot !== 'fixed' && o.mappedSlot !== 'builtin');
                    if (dup.length > 0 && !(m.type === 'bool' && dup.every(d => d.type === 'bool'))) {
                        setError(`Slot "${m.mappedSlot}" is assigned to multiple parameters.`);
                        return;
                    }
                }
            }

            const result = runTransform(detected, selectedFunctionName, loopMode, formulaName, mappings);
            if (!result) { setError('Could not analyze the selected function. Try selecting a different one.'); return; }

            if (result.warnings.length > 0) {
                setDetected(d => d ? { ...d, warnings: [...d.warnings, ...result.warnings] } : d);
            }

            const liveMappings = filterDeadParams(mappings, allGeneratedCode(result));
            const { defaultPreset } = buildAndRegister(formulaName, formulaName, result, liveMappings, {
                glsl: source,
                selectedFunction: selectedFunctionName,
                loopMode,
                mappings,
            });

            setSuccess(true);
            setTimeout(() => { setFormula(formulaName as any); applyFormulaDefaults(defaultPreset); onClose(); }, 1000);
        } catch (e) {
            setError('Import failed: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, [detected, selectedFunctionName, formulaName, loopMode, mappings, source, useV4Pipeline, buildAndRegister, buildAndRegisterV4, setFormula, applyFormulaDefaults, onClose]);

    const selectedCandidate = detected?.candidates.find(c => c.name === selectedFunctionName) ?? null;
    const canImport = !!detected && !!selectedFunctionName && formulaName.trim().length > 0;

    // ── Render ──
    return (
        <div
            className="relative z-[60] w-1/2 max-w-[640px] bg-[#0d0d0d] border-r border-white/10 flex flex-col overflow-hidden shrink-0"
            data-help-id="panel.workshop"
        >

            {/* Success overlay */}
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
                    <h2 className="text-[12px] font-semibold text-white leading-tight">Formula Workshop</h2>
                </div>
                <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-500 hover:text-white">
                    <XIcon />
                </button>
            </div>

            {/* Formula loading toolbar */}
            <div className="flex flex-col border-b border-white/10 bg-black/20 shrink-0">
                {/* Row 1: Frag browse + DEC browse + Load */}
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                    {/* Frag section */}
                    <button
                        ref={browseFragRef}
                        onClick={() => { setBrowseFragOpen(v => !v); setBrowseDECOpen(false); }}
                        className="text-[10px] px-2.5 py-1 rounded border border-white/10 hover:border-cyan-500/40 text-gray-400 hover:text-cyan-300 transition-colors"
                        disabled={!libraryReady}
                    >
                        {browseMode === 'folder' ? 'Frag Examples' : 'Frag Categories'}
                    </button>
                    <button
                        onClick={() => setBrowseMode(m => m === 'category' ? 'folder' : 'category')}
                        className="text-[10px] px-1.5 py-1 rounded border border-white/5 hover:border-white/20 text-gray-500 hover:text-gray-300 transition-colors"
                        title={`Switch to ${browseMode === 'category' ? 'folder' : 'category'} view`}
                    >
                        {browseMode === 'folder' ? '📁' : '🏷️'}
                    </button>
                    <button
                        onClick={handleRandomFrag}
                        className="text-[10px] px-1.5 py-1 rounded border border-white/10 hover:border-amber-500/40 text-gray-400 hover:text-amber-300 transition-colors"
                        disabled={!libraryReady}
                        title="Random Fragmentarium formula"
                    >
                        🎲
                    </button>
                    {browseFragOpen && browseFragRef.current && (() => {
                        const r = browseFragRef.current!.getBoundingClientRect();
                        return (
                            <CategoryPickerMenu
                                x={r.left}
                                y={r.bottom + 4}
                                anchorRight={r.right}
                                categories={fragBrowseCategories}
                                getItems={getFragBrowseItems}
                                onSelect={handleBrowseSelect}
                                onClose={() => setBrowseFragOpen(false)}
                                categoryWidth={180}
                                itemWidth={260}
                            />
                        );
                    })()}

                    <span className="w-px h-4 bg-white/10" />

                    {/* DEC section */}
                    <button
                        ref={browseDECRef}
                        onClick={() => { setBrowseDECOpen(v => !v); setBrowseFragOpen(false); }}
                        className="text-[10px] px-2.5 py-1 rounded border border-white/10 hover:border-amber-500/40 text-gray-400 hover:text-amber-300 transition-colors"
                        disabled={!libraryReady}
                    >
                        DEC Formulas
                    </button>
                    <button
                        onClick={handleRandomDEC}
                        className="text-[10px] px-1.5 py-1 rounded border border-white/10 hover:border-amber-500/40 text-gray-400 hover:text-amber-300 transition-colors"
                        disabled={!libraryReady}
                        title="Random DEC formula"
                    >
                        🎲
                    </button>
                    {browseDECOpen && browseDECRef.current && (() => {
                        const r = browseDECRef.current!.getBoundingClientRect();
                        return (
                            <CategoryPickerMenu
                                x={r.left}
                                y={r.bottom + 4}
                                anchorRight={r.right}
                                categories={decBrowseCategories}
                                getItems={getDECBrowseItems}
                                onSelect={handleBrowseSelect}
                                onClose={() => setBrowseDECOpen(false)}
                                categoryWidth={180}
                                itemWidth={240}
                            />
                        );
                    })()}

                    <div className="flex-1" />

                    {/* Load + external links */}
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="text-[10px] px-2.5 py-1 rounded border border-white/10 hover:border-white/30 text-gray-400 hover:text-white transition-colors"
                    >
                        Load File
                    </button>
                    <a
                        href="https://github.com/3Dickulus/Fragmentarium_Examples_Folder"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-1.5 py-1 rounded border border-white/5 hover:border-cyan-500/30 text-gray-600 hover:text-cyan-400 transition-colors"
                        title="Fragmentarium Examples (GitHub)"
                    >
                        Frag ↗
                    </a>
                    <a
                        href="https://jbaker.graphics/writings/DEC.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-1.5 py-1 rounded border border-white/5 hover:border-amber-500/30 text-gray-600 hover:text-amber-400 transition-colors"
                        title="Distance Estimator Compendium"
                    >
                        DEC ↗
                    </a>
                    <input ref={fileRef} type="file" accept=".frag,.glsl,.txt" className="hidden" onChange={handleLoadFile} />
                </div>
                {/* Row 2: Search */}
                <div className="relative px-3 pb-1.5 flex items-center gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder={libraryReady ? 'Search formulas...' : 'Loading library...'}
                        disabled={!libraryReady}
                        onBlur={() => setTimeout(() => setSearchResults(null), 150)}
                        onFocus={() => { if (searchQuery.trim()) handleSearch(searchQuery); }}
                        className="flex-1 text-[10px] px-2.5 py-1 rounded border border-white/10 bg-black/30 text-gray-300 placeholder-gray-600 focus:border-cyan-500/40 focus:outline-none transition-colors"
                    />
                    <label
                        title="Show formulas that neither Iteration nor Standalone mode can render (for debugging). Off by default."
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer select-none shrink-0"
                    >
                        <input
                            type="checkbox"
                            checked={showIncompatible}
                            onChange={e => setShowIncompatible(e.target.checked)}
                            className="w-3 h-3 accent-cyan-500"
                        />
                        show broken
                    </label>
                    {searchResults && searchResults.length > 0 && (() => {
                        // Filter out neither-pipeline-renders formulas unless user opts in.
                        const visible = showIncompatible ? searchResults : searchResults.filter(e => !isUnrenderable(e.id));
                        return (
                            <div className="absolute left-3 right-3 top-full z-50 max-h-[240px] overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded shadow-xl">
                                {visible.slice(0, 30).map(entry => {
                                    const badge = compatBadge(entry.id);
                                    return (
                                        <button
                                            key={`${entry.source}:${entry.id}`}
                                            onClick={() => handleSearchSelect(entry)}
                                            className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-white/5 transition-colors flex items-center gap-2"
                                        >
                                            <span className={`shrink-0 text-[8px] px-1 py-0.5 rounded ${entry.source === 'frag' ? 'bg-cyan-900/40 text-cyan-400' : 'bg-amber-900/40 text-amber-400'}`}>
                                                {entry.source === 'frag' ? 'FRAG' : 'DEC'}
                                            </span>
                                            {badge && (
                                                <span className={`shrink-0 text-[8px] px-1 py-0.5 rounded font-semibold ${badge.className}`}>
                                                    {badge.text}
                                                </span>
                                            )}
                                            <span className="text-white truncate">{entry.name}</span>
                                            {entry.artist !== 'unknown' && (
                                                <span className="text-gray-500 truncate ml-auto">{entry.artist}</span>
                                            )}
                                        </button>
                                    );
                                })}
                                {visible.length > 30 && (
                                    <div className="px-2.5 py-1 text-[9px] text-gray-500 text-center">
                                        +{visible.length - 30} more results
                                    </div>
                                )}
                                {visible.length === 0 && (
                                    <div className="px-2.5 py-1.5 text-[10px] text-gray-500 text-center">
                                        All matches are in the "neither mode renders" bucket. Enable "show broken" to see them.
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    {searchResults && searchResults.length === 0 && searchQuery.trim() && (
                        <div className="absolute left-3 right-3 top-full z-50 bg-[#1a1a1a] border border-white/10 rounded shadow-xl px-2.5 py-2 text-[10px] text-gray-500">
                            No formulas found
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scroll p-3 min-h-0 flex flex-col gap-3">

                {/* Section 1: Source Code (collapsible, resizable) */}
                <section className="space-y-2 shrink-0">
                    <button
                        onClick={() => setSourceCollapsed(v => !v)}
                        className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 hover:text-gray-300 transition-colors"
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
                        <>
                            <div style={{ height: sourceHeight }} className="flex flex-col min-h-0">
                                <GlslEditor
                                    value={source}
                                    onChange={val => setSource(val)}
                                    height="100%"
                                    placeholder="Paste GLSL here — distance estimator functions, Fragmentarium .frag files, or Shadertoy snippets."
                                    highlights={editorHighlights}
                                    onHighlightClick={handleHighlightClick}
                                />
                            </div>
                            <div
                                onPointerDown={handleSourceResizeStart}
                                className="h-1.5 cursor-row-resize flex items-center justify-center group -my-0.5"
                                title="Drag to resize"
                            >
                                <div className="w-8 h-0.5 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors" />
                            </div>

                            {/* Detect Variables toggle + legend */}
                            {detectVarsActive && detectedVars.length > 0 && (
                                <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[9px] text-gray-500">
                                    {detectedVars.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => handleHighlightClick(v.id)}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors cm-${v.colorClass}`}
                                            title={`Promote "${v.originalText}" → uniform ${v.name}`}
                                            style={{
                                                borderBottom: 'none',
                                            }}
                                        >
                                            <span className="font-mono text-white/80">{v.name}</span>
                                            <span className="text-gray-600">= {Array.isArray(v.defaultValue) ? `(${(v.defaultValue as number[]).join(', ')})` : v.defaultValue}</span>
                                            <span className="text-gray-700">({v.occurrences.length}x)</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between shrink-0">
                                {/* Detect Variables toggle */}
                                <label className="flex items-center gap-2 cursor-pointer select-none group" title="Highlight magic numbers, #defines, and vec constructors — click highlights to promote to uniforms">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={detectVarsActive}
                                            onChange={e => setDetectVarsActive(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-7 h-4 bg-white/10 peer-checked:bg-amber-600/60 rounded-full transition-colors" />
                                        <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-gray-400 peer-checked:bg-amber-300 rounded-full transition-all peer-checked:translate-x-3" />
                                    </div>
                                    <span className={`text-[10px] font-semibold transition-colors ${detectVarsActive ? 'text-amber-300' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                        Detect Variables
                                    </span>
                                    {detectVarsActive && detectedVars.length > 0 && (
                                        <span className="text-[9px] text-amber-400/60">
                                            {detectedVars.length} found — click to promote
                                        </span>
                                    )}
                                </label>

                                <button
                                    onClick={() => runDetect(source)}
                                    disabled={!source.trim()}
                                    className="px-4 py-1.5 bg-cyan-900/60 hover:bg-cyan-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-semibold text-cyan-300 transition-colors border border-cyan-700/30"
                                >
                                    Detect Functions ▶
                                </button>
                            </div>
                        </>
                    )}
                </section>

                {/* Section 2: Function Selection */}
                {detected && (
                    <section className="space-y-2 border border-white/10 rounded-lg p-2.5 bg-white/[0.02]">
                        <h3 className="text-[10px] font-semibold text-gray-500">2 · Iteration Function</h3>

                        <div className="flex items-center gap-2">
                            <label className="text-[11px] text-gray-400 shrink-0 w-16">Function:</label>
                            <select
                                value={selectedFunctionName}
                                onChange={e => handleSelectFunction(e.target.value)}
                                className="flex-1 t-select font-mono text-white"
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
                                        className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${loopMode === 'loop' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'}`}
                                    >
                                        Extract loop body
                                    </button>
                                    <button
                                        onClick={() => setLoopMode('single')}
                                        className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${loopMode === 'single' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'}`}
                                    >
                                        Whole function
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Section 3: Parameters & Mapping */}
                {detected && selectedFunctionName && (
                    <section className="space-y-2 border border-white/10 rounded-lg p-2.5 bg-white/[0.02]">
                        <h3 className="text-[10px] font-semibold text-gray-500">3 · Parameters</h3>

                        <div className="flex items-center gap-2">
                            <label className="text-[11px] text-gray-400 shrink-0 w-24">Formula name:</label>
                            <input
                                value={formulaName}
                                onChange={e => setFormulaName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-white/30"
                                placeholder="MyFormula"
                            />
                        </div>

                        {mappings.length > 0 ? (
                            <ParamTable mappings={mappings} onMappingChange={handleMappingChange} />
                        ) : (
                            <p className="text-[10px] text-gray-600 italic">No uniforms detected — formula has no user parameters.</p>
                        )}
                    </section>
                )}

                {/* Section 4: Transformed Output */}
                {detected && selectedFunctionName && (
                    <section className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-semibold text-gray-500">4 · Transformed Output</h3>
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

                {/* Warnings */}
                {detected && detected.warnings.length > 0 && (
                    <div className="space-y-1 p-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                        {detected.warnings.map((w, i) => (
                            <p key={i} className="text-[10px] text-yellow-400/80">⚠ {w}</p>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-2 rounded-lg border border-red-500/30 bg-red-500/10">
                        <p className="text-[11px] text-red-400 font-mono">{error}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-black/30 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleClose}
                        className="px-3 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <div
                        className="flex items-center gap-1 text-[11px] text-gray-400 select-none"
                        title={
                            pipelineMode === 'auto'
                                ? `Auto-picks per formula: Iteration when possible (engine-feature compat — interlace, hybrid fold, burning ship); else Standalone. Current: ${effectivePipeline === 'v3' ? 'Iteration' : 'Standalone'}.`
                                : pipelineMode === 'v3'
                                    ? 'Force Iteration mode (per-iteration formulas that compose with interlace, hybrid fold, burning ship).'
                                    : 'Force Standalone mode (self-contained DE; simpler but no engine-feature composition).'
                        }
                    >
                        <span className="text-gray-500 mr-1">mode:</span>
                        {(['auto', 'v3', 'v4'] as const).map(mode => {
                            const label = mode === 'auto'
                                ? `Auto (${effectivePipeline === 'v3' ? 'Iter' : 'Solo'})`
                                : mode === 'v3' ? 'Iteration' : 'Standalone';
                            return (
                                <button
                                    key={mode}
                                    onClick={() => setPipelineMode(mode)}
                                    className={
                                        'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors '
                                        + (pipelineMode === mode
                                            ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-500/40'
                                            : 'text-gray-500 hover:text-gray-300 border border-transparent')
                                    }
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePreview}
                        disabled={!canImport && !useV4Pipeline}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-white/10"
                    >
                        Preview
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={(!canImport && !useV4Pipeline) || !formulaName.trim()}
                        className="px-4 py-1.5 bg-cyan-900/50 hover:bg-cyan-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-semibold text-cyan-300 transition-colors border border-cyan-500/30"
                    >
                        Import Formula
                    </button>
                </div>
            </div>
        </div>
    );
};
