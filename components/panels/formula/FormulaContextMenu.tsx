
import React from 'react';
import { registry } from '../../../engine/FractalRegistry';
import { useFractalStore } from '../../../store/fractalStore';
import { ContextMenuItem } from '../../../types/help';
import { DiceIcon, ShuffleIcon } from '../../Icons';

// --- Log-scale mini slider for context menu ---
// Maps 0..1 linear position to 1..100% via log curve for fine control at low values
// Range 0.01..100, log scale: left side gives fine 0.01–1% control, right side 1–100%
const LOG_MIN = 0.01;
const LOG_MAX = 100;
const LOG_RANGE = Math.log(LOG_MAX / LOG_MIN);
const logToLinear = (pct: number) => Math.log(pct / LOG_MIN) / LOG_RANGE;  // pct [0.01..100] -> [0..1]
const linearToLog = (t: number) => LOG_MIN * Math.exp(t * LOG_RANGE);      // [0..1] -> pct [0.01..100]

const MiniSlider = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const dragging = React.useRef(false);
    const fillPct = logToLinear(value) * 100;

    const updateFromPointer = (clientX: number) => {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const raw = linearToLog(t);
        const pct = Math.round(raw * 100) / 100; // 2 decimal places
        onChange(Math.max(LOG_MIN, Math.min(LOG_MAX, pct)));
    };

    const onPointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updateFromPointer(e.clientX);
    };
    const onPointerMove = (e: React.PointerEvent) => { if (dragging.current) updateFromPointer(e.clientX); };
    const onPointerUp = () => { dragging.current = false; };

    return (
        <div
            ref={trackRef}
            className="relative h-[22px] cursor-pointer overflow-hidden"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <div className="absolute inset-0 bg-white/[0.12]" />
            <div className="absolute top-0 bottom-0 left-0 bg-cyan-500/20 transition-[width] duration-75 ease-out" style={{ width: `${fillPct}%` }} />
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                <span className="text-[10px] text-gray-400 font-medium">Random Strength</span>
                <span className="text-[10px] text-gray-300 tabular-nums">{value >= 10 ? Math.round(value) : value.toFixed(2)}%</span>
            </div>
        </div>
    );
};

// --- Randomize section element for context menu (shared slider + buttons) ---
const RandomizeSection = ({ onRandomizeParams, onRandomizeFull }: {
    onRandomizeParams: (pct: number) => void,
    onRandomizeFull: (pct: number) => void
}) => {
    const [pct, setPct] = React.useState(100);
    return (
        <div className="py-0.5">
            <div className="px-3 py-0.5">
                <MiniSlider value={pct} onChange={setPct} />
            </div>
            <button onClick={() => onRandomizeParams(pct / 100)}
                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                <DiceIcon /> Parameters
            </button>
            <button onClick={() => onRandomizeFull(pct / 100)}
                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                <ShuffleIcon /> Full (inc. Box/Julia)
            </button>
        </div>
    );
};

// --- Unified context menu builder for formula dropdown + heading ---
export function buildFormulaContextMenu(): ContextMenuItem[] {
    const state = useFractalStore.getState();
    const def = registry.get(state.formula);
    const preset = def?.defaultPreset;

    const randomizeParams = (pct: number) => {
        const s = useFractalStore.getState(); // fresh state each click
        const curDef = registry.get(s.formula);
        s.handleInteractionStart('param');
        const updates: Record<string, number | { x: number; y: number; z?: number }> = {};

        if (s.formula === 'Modular') {
            const cur = s.coreMath;
            const genericRand = (v: number) => v + (Math.random() * 4 - 2) * pct;
            updates.paramA = genericRand(cur.paramA); updates.paramB = genericRand(cur.paramB);
            updates.paramC = genericRand(cur.paramC); updates.paramD = genericRand(cur.paramD);
            updates.paramE = genericRand(cur.paramE); updates.paramF = genericRand(cur.paramF);
            s.setCoreMath(updates);
            s.handleInteractionEnd();
            return;
        }

        if (!curDef) { s.handleInteractionEnd(); return; }
        const cur = s.coreMath;
        curDef.parameters.forEach((p) => {
            if (!p) return;
            const range = p.max - p.min;
            if (p.type === 'vec3') {
                const cv = (cur as unknown as Record<string, unknown>)[p.id] as { x: number; y: number; z: number } || { x: 0, y: 0, z: 0 };
                updates[p.id] = {
                    x: Math.max(p.min, Math.min(p.max, cv.x + (Math.random() * 2 - 1) * range * pct)),
                    y: Math.max(p.min, Math.min(p.max, cv.y + (Math.random() * 2 - 1) * range * pct)),
                    z: Math.max(p.min, Math.min(p.max, cv.z + (Math.random() * 2 - 1) * range * pct)),
                };
            } else if (p.type === 'vec2') {
                const cv = (cur as unknown as Record<string, unknown>)[p.id] as { x: number; y: number } || { x: 0, y: 0 };
                updates[p.id] = {
                    x: Math.max(p.min, Math.min(p.max, cv.x + (Math.random() * 2 - 1) * range * pct)),
                    y: Math.max(p.min, Math.min(p.max, cv.y + (Math.random() * 2 - 1) * range * pct)),
                };
            } else {
                if (pct >= 1) {
                    const r = Math.random() * range + p.min;
                    updates[p.id] = p.step > 0 ? Math.round(r / p.step) * p.step : r;
                } else {
                    const cv = ((cur as unknown as Record<string, unknown>)[p.id] as number) ?? ((p.min + p.max) / 2);
                    const r = cv + (Math.random() * 2 - 1) * range * pct;
                    const clamped = Math.max(p.min, Math.min(p.max, r));
                    updates[p.id] = p.step > 0 ? Math.round(clamped / p.step) * p.step : clamped;
                }
            }
        });
        s.setCoreMath(updates);
        s.handleInteractionEnd();
    };

    const randomizeFull = (pct: number) => {
        randomizeParams(pct);

        const s = useFractalStore.getState(); // fresh state after params changed
        const geo = s.geometry;
        const geoUpdates: Record<string, number> = {};
        if (geo.hybridMode) {
            geoUpdates.hybridScale = pct >= 1 ? 1.5 + Math.random() * 1.5 : Math.max(1, Math.min(3, geo.hybridScale + (Math.random() * 2 - 1) * 2 * pct));
            geoUpdates.hybridMinR = pct >= 1 ? Math.random() * 1.0 : Math.max(0, Math.min(1.5, geo.hybridMinR + (Math.random() * 2 - 1) * 1.5 * pct));
            geoUpdates.hybridFixedR = pct >= 1 ? 0.5 + Math.random() * 1.5 : Math.max(0.1, Math.min(3, geo.hybridFixedR + (Math.random() * 2 - 1) * 2.9 * pct));
            geoUpdates.hybridFoldLimit = pct >= 1 ? 0.5 + Math.random() * 1.5 : Math.max(0.1, Math.min(2, geo.hybridFoldLimit + (Math.random() * 2 - 1) * 1.9 * pct));
        }
        if (geo.juliaMode) {
            geoUpdates.juliaX = pct >= 1 ? (Math.random() * 4 - 2) : Math.max(-2, Math.min(2, geo.juliaX + (Math.random() * 2 - 1) * 4 * pct));
            geoUpdates.juliaY = pct >= 1 ? (Math.random() * 4 - 2) : Math.max(-2, Math.min(2, geo.juliaY + (Math.random() * 2 - 1) * 4 * pct));
            geoUpdates.juliaZ = pct >= 1 ? (Math.random() * 4 - 2) : Math.max(-2, Math.min(2, geo.juliaZ + (Math.random() * 2 - 1) * 4 * pct));
        }
        if (geo.preRotEnabled) {
            geoUpdates.preRotX = pct >= 1 ? (Math.random() * 2 - 1) * Math.PI : Math.max(-Math.PI, Math.min(Math.PI, geo.preRotX + (Math.random() * 2 - 1) * Math.PI * 2 * pct));
            geoUpdates.preRotY = pct >= 1 ? (Math.random() * 2 - 1) * Math.PI : Math.max(-Math.PI, Math.min(Math.PI, geo.preRotY + (Math.random() * 2 - 1) * Math.PI * 2 * pct));
            geoUpdates.preRotZ = pct >= 1 ? (Math.random() * 2 - 1) * Math.PI : Math.max(-Math.PI, Math.min(Math.PI, geo.preRotZ + (Math.random() * 2 - 1) * Math.PI * 2 * pct));
        }
        if (Object.keys(geoUpdates).length > 0) s.setGeometry(geoUpdates);
    };

    const items: ContextMenuItem[] = [
        { label: 'Formula Loading', action: () => {}, isHeader: true },
        { label: 'Lock Scene Settings', checked: state.lockSceneOnSwitch, action: () => state.setLockSceneOnSwitch(!state.lockSceneOnSwitch) },
        { label: 'Randomize', action: () => {}, isHeader: true },
        { element: React.createElement(RandomizeSection, { onRandomizeParams: randomizeParams, onRandomizeFull: randomizeFull }), keepOpen: true, action: () => {} },
        { label: 'Formula Parameters', action: () => {}, isHeader: true },
        {
            label: 'Reset to Default',
            action: () => {
                const current = state.getPreset();
                state.handleInteractionStart('param');
                state.loadPreset({
                    ...current,
                    paramA: 0, paramB: 0, paramC: 0, paramD: 0, paramE: 0, paramF: 0,
                    vec2A: [0,0], vec2B: [0,0], vec2C: [0,0],
                    vec3A: [0,0,0], vec3B: [0,0,0], vec3C: [0,0,0],
                    features: {
                        ...current.features,
                        coreMath: preset?.features?.coreMath || current.features?.coreMath,
                        geometry: preset?.features?.geometry || current.features?.geometry,
                    }
                } as any);
                state.handleInteractionEnd();
            }
        },
        {
            label: 'Reset to Formula Preset',
            action: () => {
                if (!preset) return;
                const current = state.getPreset();
                state.handleInteractionStart('param');
                state.loadPreset({
                    ...preset,
                    cameraPos: current.cameraPos, cameraRot: current.cameraRot,
                    sceneOffset: current.sceneOffset, targetDistance: current.targetDistance,
                    cameraMode: current.cameraMode, lights: current.lights,
                    features: {
                        ...(preset.features || {}),
                        atmosphere: current.features?.atmosphere,
                        lighting: current.features?.lighting,
                        optics: current.features?.optics,
                        materials: current.features?.materials,
                        coreMath: preset.features?.coreMath,
                        geometry: preset.features?.geometry,
                        coloring: preset.features?.coloring,
                        texturing: preset.features?.texturing,
                        quality: preset.features?.quality,
                    }
                } as any);
                state.handleInteractionEnd();
            },
            disabled: !preset
        },
        { label: 'Scene Parameters', action: () => {}, isHeader: true },
        {
            label: 'Reset to Default',
            action: () => {
                const current = state.getPreset();
                state.handleInteractionStart('camera');
                state.resetCamera();
                const baseDef = registry.get('Mandelbulb')?.defaultPreset;
                if (baseDef) {
                    state.loadPreset({
                        ...current,
                        cameraPos: baseDef.cameraPos, cameraRot: baseDef.cameraRot,
                        sceneOffset: baseDef.sceneOffset, targetDistance: baseDef.targetDistance,
                        features: {
                            ...current.features,
                            atmosphere: baseDef.features?.atmosphere,
                            lighting: baseDef.features?.lighting,
                            optics: baseDef.features?.optics,
                            materials: baseDef.features?.materials,
                        }
                    } as any);
                }
                state.handleInteractionEnd();
            }
        },
        {
            label: 'Reset to Formula Preset',
            action: () => {
                if (!preset) return;
                const current = state.getPreset();
                state.handleInteractionStart('camera');
                state.loadPreset({
                    ...current,
                    cameraPos: preset.cameraPos, cameraRot: preset.cameraRot,
                    sceneOffset: preset.sceneOffset, targetDistance: preset.targetDistance,
                    cameraMode: preset.cameraMode,
                    lights: preset.lights,
                    features: {
                        ...current.features,
                        atmosphere: preset.features?.atmosphere,
                        lighting: preset.features?.lighting,
                        optics: preset.features?.optics,
                        materials: preset.features?.materials,
                    }
                } as any);
                state.handleInteractionEnd();
            },
            disabled: !preset
        },
    ];

    return items;
}
