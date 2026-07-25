/**
 * FormulaParamsWidget — per-formula parameters section for the Formula panel.
 *
 * Renders: compile-duration readout, Iterations slider, and the formula's
 * own scalar/vec2/vec3/vec4 parameters (driven by FractalRegistry.parameters).
 *
 * Registered as 'formula-params' in componentRegistry and slotted at the top
 * of the Formula panel via widgets.before in the panel manifest.
 *
 * This is intentionally kept as a widget (not manifest items) because the
 * parameter list is dynamically determined by the active formula at runtime —
 * it cannot be expressed as static manifest items.
 */

import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import type { FeatureComponentProps } from '../../../../components/registry/ComponentRegistry';
import type { LfoTarget } from '../../../../types';
import Slider from '../../../../components/Slider';
import { piUnitMapping, formatDisplay, type ValueMapping } from '../../../../components/inputs';
import { mappingForScale } from '../../../../engine/features/modulation/paramMapping';
import Dropdown from '../../../../components/Dropdown';
import ToggleSwitch from '../../../../components/ToggleSwitch';
import { Vector2Input, Vector3Input, Vector4Input } from '../../../../components/vector-input';
import { readLiveVec } from '../../../../engine/animation/trackBinding';
import { useEngineStore } from '../../../../store/engineStore';
import { registry } from '../../../engine/FractalRegistry';
import { nodeRegistry } from '../../../engine/NodeRegistry';
import { FractalEvents } from '../../../engine/FractalEvents';
import { tutorAnchors } from '../../../../engine/plugins/Tutorial';
import { getProxy } from '../../../engine/worker/WorkerProxy';
import { SectionLabel } from '../../../../components/SectionLabel';
import { text as themeText, border as themeBorder, surface } from '../../../../data/theme';
import { FormulaSelect } from './FormulaSelect';
import { slotWriteValue } from '../../../utils/uniformSlots';
import type { FormulaType } from '../../../../types';
import { rotationFromMode } from '../../../../engine/rotationDescriptor';
import type { RotationDescriptor } from '../../../../engine/rotationDescriptor';
import { useRotationGizmoStore } from '../../../store/rotationGizmoStore';

// Iterations slider: cubic display feel over [1, 500] — fine control at low
// counts. Resolved from the param's own `scale: 'cube'` rather than built here,
// so the modulation compose path sees the same curve the slider draws.
const ITERATIONS_MAPPING = mappingForScale('cube', 1, 500);

// "degrees" scale: the param value is in degrees, shown as a count of π (180° = π).
// Distinct from piUnitMapping (which is radian-valued) — single use, kept local.
const DEG_D2PI = 1 / 180;
const DEGREES_PI_MAPPING: ValueMapping = {
    toDisplay: (v) => v * DEG_D2PI,
    fromDisplay: (v) => v / DEG_D2PI,
    format: formatDisplay,
    parseInput: (s) => { const n = parseFloat(s); return isNaN(n) ? null : n; },
};

const engine = getProxy();

interface FormulaParam {
    label: string;
    val: number | { x: number; y: number } | { x: number; y: number; z: number } | { x: number; y: number; z: number; w: number };
    set: (v: any) => void;
    min: number;
    max: number;
    step: number;
    def: number | { x: number; y: number } | { x: number; y: number; z: number } | { x: number; y: number; z: number; w: number };
    id: LfoTarget;
    trackId: string;
    scale?: 'linear' | 'log' | 'pi' | 'degrees';
    options?: { label: string; value: number }[];
    type?: 'float' | 'vec2' | 'vec3' | 'vec4';
    mode?: 'rotation' | 'direction' | 'axes' | 'toggle' | 'mixed' | 'normal';
    linkable?: boolean;
    /** Explicit rotation semantics — see engine/rotationDescriptor. units:'deg'
     *  (MB3D imports) must keep the param's own bounds, not the radian ±2π override. */
    rotation?: RotationDescriptor;
    /** Section divider: consecutive params sharing a group render under one
     *  header (fused weaves stamp each slot's formula name). */
    group?: string;
}

export const FormulaParamsWidget: React.FC<FeatureComponentProps> = () => {
    const store = useEngineStore();
    const state = store as any;
    const actions = store as any;
    const [loadTime, setLoadTime] = useState<string | null>(null);
    // Open canvas rotation gizmos — lights the per-param header toggle.
    const openGizmos = useRotationGizmoStore((s) => s.gizmos);

    useEffect(() => {
        const unsub = FractalEvents.on('compile_time', (sec: number) => {
            setLoadTime(`Loaded in ${sec.toFixed(2)}s`);
            setTimeout(() => setLoadTime(null), 5000);
        });
        if (engine.lastCompileDuration > 0) {
            setLoadTime(`Loaded in ${engine.lastCompileDuration.toFixed(2)}s`);
            setTimeout(() => setLoadTime(null), 3000);
        }
        return unsub;
    }, []);

    const coreMath = state.coreMath;
    if (!coreMath || !state.formula) return null;

    // Live vector for a vec widget — the counterpart to `trackKeys`, without
    // which the param modulates but the widget shows no indicator. The scalar
    // branches below already pass `liveValue`; the vec branches did not, which
    // is why a linked formula scalar showed a purple marker and a linked vec
    // axis (`…_x`) did not.
    //
    // The PURE `readLiveVec`, not the `useLiveVec` hook: renderParam runs once
    // per param inside a map, so a hook here would be a conditional call.
    const liveVecFor = (
        trackKeys: string[],
        base: { x: number; y: number; z?: number; w?: number },
    ) => readLiveVec(state.liveModulations ?? {}, { trackKeys }, base);

    const switchFormula = (f: FormulaType) => { actions.setFormula(f); };

    const getParams = (): (FormulaParam | null)[] => {
        if (state.formula === 'Modular') {
            const boundParams = ['ParamA', 'ParamB', 'ParamC', 'ParamD', 'ParamE', 'ParamF'];
            const mappings: Record<string, { labels: string[], min: number, max: number }> = {};
            ((state.pipeline) ?? []).forEach((node: any) => {
                if (!node.enabled || !node.bindings) return;
                const def = nodeRegistry.get(node.type);
                Object.entries(node.bindings).forEach(([paramKey, targetKey]) => {
                    const tk = targetKey as string;
                    if (tk && boundParams.includes(tk)) {
                        if (!mappings[tk]) mappings[tk] = { labels: [], min: -5, max: 5 };
                        const inputDef = def?.inputs.find((i: any) => i.id === paramKey);
                        if (inputDef) mappings[tk].labels.push(`${node.type}: ${inputDef.label}`);
                        else mappings[tk].labels.push(`${node.type}: ${paramKey}`);
                    }
                });
            });
            return boundParams.map(key => {
                const map = mappings[key];
                const id = key.charAt(0).toLowerCase() + key.slice(1) as LfoTarget;
                if (!map) return null;
                const label = map.labels.length > 1 ? `${key} (Mixed)` : (map.labels[0] || key);
                const val = (coreMath as any)[id] as number;
                const set = (v: number) => actions.setCoreMath({ [id]: v });
                return { label, val, set, min: -5.0, max: 5.0, step: 0.01, def: 0.0, id, trackId: `coreMath.${id}`, scale: 'linear' as const };
            });
        }

        const def = registry.get(state.formula);
        if (def) {
            // Params address coreMath slots by id (paramA..F / vec2A..C / vec3A..C /
            // vec4A..C — the uniformSlots vocabulary). A vec3 param whose id is a vec4
            // base is the vec4-held-vec3 case (MB3D vec3 overflow, Workshop vec4.xyz
            // mapping): it renders as a 3-axis control and slotWriteValue pins .w to 0.
            //
            // A param may declare `feature: 'weave'` (ADR-0090) — a NATIVE formula's
            // per-slot BANK id (`ws<k>ParamA`). Then reads/writes/trackId route to the
            // `weave` feature (store.weave / setWeave / weave.<id>) instead of coreMath;
            // the id is already a real vec so slotWriteValue is a no-op (no vec4-held-vec3).
            return def.parameters.map((p: any) => {
                if (!p) return null;
                const feat: string | undefined = p.feature;
                const sliceState = feat ? (state as any)[feat] : coreMath;
                const val = sliceState?.[p.id];
                if (val === undefined) return null; // id outside the feature's state — nothing to bind
                const setter = feat ? (actions as any)[`set${feat.charAt(0).toUpperCase()}${feat.slice(1)}`] : actions.setCoreMath;
                const set = (v: any) => setter({ [p.id]: slotWriteValue(p.id, p.type, v) });
                const trackId = `${feat ?? 'coreMath'}.${p.id}`;
                return { label: p.label, val, set, min: p.min, max: p.max, step: p.step, def: p.default, id: p.id, trackId, type: p.type, mode: p.mode, linkable: p.linkable, scale: p.scale, options: p.options, group: p.group, rotation: p.rotation };
            });
        }

        return [{ label: 'Power (N)', val: coreMath.paramA, set: (v) => actions.setCoreMath({ paramA: v }), min: 2.0, max: 16.0, step: 0.001, def: 8.0, id: 'paramA' as LfoTarget, trackId: 'coreMath.paramA' }];
    };

    const renderControl = (p: FormulaParam | null) => {
        if (!p) return null;

        if (p.type === 'vec3') {
            const v3 = p.val as { x: number; y: number; z: number };
            const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`, `${p.trackId}_z`];
            const liveVec3 = liveVecFor(trackKeys, v3);
            const trackLabels = [`${p.label} X`, `${p.label} Y`, `${p.label} Z`];
            const vecMode = p.mode || 'normal';
            const rotation = p.rotation ?? rotationFromMode(p.mode) ?? undefined;
            // The ±2π bound override is a RADIANS convention — a degrees-native
            // param (MB3D, rotation.units:'deg') keeps its own ±180 bounds.
            const isAngleMode = (vecMode === 'rotation' || vecMode === 'direction' || vecMode === 'axes')
                && rotation?.units !== 'deg';
            const rotTrackLabels: Record<string, string[]> = {
                rotation: ['Azimuth', 'Pitch', 'Angle'],
                direction: ['Azimuth', 'Pitch', 'Length'],
                axes: trackLabels,
            };
            // Canvas gizmo toggle — any rotation-kind vec3 (Euler / Rodrigues /
            // direction) can spawn a viewport gizmo bound to this param. The key
            // doubles as the store route (feature.paramId), so the overlay reads
            // and writes through the exact same path this widget does.
            const gizmoCapable = rotation && rotation.kind !== 'twist';
            const gizmoToggle = gizmoCapable ? () => useRotationGizmoStore.getState().toggle({
                key: p.trackId,
                feature: p.trackId.split('.')[0],
                paramId: p.id,
                label: p.label,
                rotation,
                paramType: 'vec3',
            }) : undefined;
            return (
                <div key={p.id} ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Vector3Input label={p.label} value={new THREE.Vector3(v3.x, v3.y, v3.z)}
                        min={isAngleMode ? -Math.PI * 2 : p.min} max={isAngleMode ? Math.PI * 2 : p.max}
                        step={p.step} onChange={p.set} trackKeys={trackKeys}
                        liveValue={liveVec3}
                        trackLabels={isAngleMode ? (rotTrackLabels[vecMode] || trackLabels) : trackLabels}
                        mode={vecMode === 'axes' ? 'normal' : vecMode as any}
                        defaultValue={p.def ? new THREE.Vector3((p.def as any).x ?? 0, (p.def as any).y ?? 0, (p.def as any).z ?? 0) : undefined}
                        linkable={p.linkable} scale={p.scale} rotation={rotation}
                        onGizmoToggle={gizmoToggle} gizmoActive={!!openGizmos[p.trackId]} />
                </div>
            );
        }

        if (p.type === 'vec4') {
            const v4 = p.val as { x: number; y: number; z: number; w: number };
            const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`, `${p.trackId}_z`, `${p.trackId}_w`];
            const liveVec4 = liveVecFor(trackKeys, v4);
            const trackLabels = [`${p.label} X`, `${p.label} Y`, `${p.label} Z`, `${p.label} W`];
            return (
                <div key={p.id} ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Vector4Input label={p.label} value={new THREE.Vector4(v4.x, v4.y, v4.z, v4.w)}
                        min={p.min} max={p.max} step={p.step} onChange={p.set}
                        trackKeys={trackKeys} trackLabels={trackLabels} liveValue={liveVec4}
                        defaultValue={p.def ? new THREE.Vector4((p.def as any).x ?? 0, (p.def as any).y ?? 0, (p.def as any).z ?? 0, (p.def as any).w ?? 0) : undefined}
                        linkable={p.linkable} scale={p.scale} />
                </div>
            );
        }

        if (p.type === 'vec2') {
            const v2 = p.val as { x: number; y: number };
            const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`];
            const liveVec2 = liveVecFor(trackKeys, v2);
            const trackLabels = [`${p.label} X`, `${p.label} Y`];
            return (
                <div key={p.id} ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Vector2Input label={p.label} value={new THREE.Vector2(v2.x, v2.y)}
                        min={p.min} max={p.max} step={p.step}
                        onChange={(v) => p.set({ x: v.x, y: v.y })}
                        trackKeys={trackKeys} trackLabels={trackLabels} liveValue={liveVec2}
                        defaultValue={p.def ? new THREE.Vector2((p.def as any).x ?? 0, (p.def as any).y ?? 0) : undefined}
                        linkable={p.linkable} mode={p.mode} scale={p.scale} />
                </div>
            );
        }

        const val = p.val as number;

        // Boolean scalar lane (packer mode 'toggle') — a segmented Off/On switch
        // instead of a 0..1 slider. Still a float uniform underneath (0.0/1.0),
        // so keyframing/undo behave like any other param.
        if (p.mode === 'toggle') {
            return (
                <div key={p.id} ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <ToggleSwitch label={p.label} value={val >= 0.5 ? 1 : 0}
                        options={[{ label: 'Off', value: 0 }, { label: 'On', value: 1 }]}
                        onChange={(v: number) => p.set(v)} />
                </div>
            );
        }

        if (p.options) {
            return (
                <div key={p.id}>
                    <Dropdown label={p.label} value={val} options={p.options} onChange={(v) => p.set(v as number)} fullWidth />
                </div>
            );
        }

        const liveVal = state.liveModulations?.[p.trackId] ?? state.liveModulations?.[p.id];
        const hasLfo = state.animations?.some((a: any) => a.enabled && (a.target === p.trackId || a.target === p.id));

        if (p.scale === 'pi') {
            return (
                <div key={p.id} ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Slider label={p.label} value={val} min={p.min} max={p.max} step={0.01}
                        onChange={p.set} defaultValue={p.def as number}
                        highlight={hasLfo || (p.id === 'paramA' && !hasLfo)}
                        trackId={p.trackId} liveValue={liveVal}
                        mapping={piUnitMapping}
                        mapTextInput overrideInputText={`${(val / Math.PI).toFixed(2)}π`} />
                </div>
            );
        }
        if (p.scale === 'degrees') {
            return (
                <div key={p.id} ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Slider label={p.label} value={val} min={p.min} max={p.max} step={p.step}
                        onChange={p.set} defaultValue={p.def as number}
                        highlight={hasLfo || (p.id === 'paramA' && !hasLfo)}
                        trackId={p.trackId} liveValue={liveVal}
                        mapping={DEGREES_PI_MAPPING}
                        mapTextInput overrideInputText={`${(val * DEG_D2PI).toFixed(2)}π`} />
                </div>
            );
        }

        return (
            <div key={p.id} ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                <Slider label={p.label} value={val} min={p.min} max={p.max} step={p.step}
                    onChange={p.set} defaultValue={p.def as number}
                    highlight={hasLfo || (p.id === 'paramA' && !hasLfo)}
                    trackId={p.trackId} liveValue={liveVal} />
            </div>
        );
    };

    const params = getParams();

    return (
        <>
            <div className={`${surface.panelHeader} border-b ${themeBorder.subtle} p-4 pb-3`} data-help-id="formula.active">
                <div className="flex justify-between items-baseline mb-1">
                    <SectionLabel color={themeText.dimLabel}>Active Formula</SectionLabel>
                    {loadTime && <span className={`text-[9px] ${themeText.dimLabel} animate-fade-in`}>{loadTime}</span>}
                </div>
                <FormulaSelect value={state.formula} onChange={switchFormula} />
            </div>

            <div className="flex flex-col" data-help-id={`panel.formula formula.${state.formula?.toLowerCase() || 'mandelbulb'}`}>
                <div ref={(el) => { if (el) tutorAnchors.register('param:iterations', el); }}>
                    <Slider label="Iterations" value={coreMath.iterations} min={1} max={500} step={1}
                        onChange={(v) => actions.setCoreMath({ iterations: Math.round(v) })}
                        highlight defaultValue={32}
                        mapping={ITERATIONS_MAPPING}
                        mapTextInput={false} trackId="coreMath.iterations"
                        liveValue={state.liveModulations?.['coreMath.iterations']} />
                </div>
                {(() => {
                    // Group dividers: a header line whenever a param opens a new
                    // group (fused weaves stamp each slot's "Formula N: <name>").
                    // Suppressed when only ONE group is present (a single-formula
                    // weave needs no redundant header).
                    const groupN = new Set(params.map((p) => p?.group).filter(Boolean)).size;
                    let lastGroup: string | undefined;
                    return params.map((p, i) => {
                        const ctrl = renderControl(p);
                        if (!ctrl) return ctrl;
                        const g = p?.group;
                        const divider = groupN > 1 && g && g !== lastGroup ? (
                            <div className="flex items-center gap-2 px-2 pt-2 pb-0.5">
                                <SectionLabel color={themeText.dimLabel}>{g}</SectionLabel>
                                <div className={`flex-1 border-t ${themeBorder.subtle}`} />
                            </div>
                        ) : null;
                        lastGroup = g;
                        return <React.Fragment key={`${p!.id}-${i}`}>{divider}{ctrl}</React.Fragment>;
                    });
                })()}
            </div>
        </>
    );
};
