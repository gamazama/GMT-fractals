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
import Dropdown from '../../../../components/Dropdown';
import { Vector2Input, Vector3Input, Vector4Input } from '../../../../components/vector-input';
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
}

export const FormulaParamsWidget: React.FC<FeatureComponentProps> = () => {
    const store = useEngineStore();
    const state = store as any;
    const actions = store as any;
    const [loadTime, setLoadTime] = useState<string | null>(null);

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
            return def.parameters.map((p: any) => {
                if (!p) return null;
                const val = (coreMath as any)[p.id];
                if (val === undefined) return null; // id outside the slot vocabulary — nothing to bind
                const set = (v: any) => actions.setCoreMath({ [p.id]: slotWriteValue(p.id, p.type, v) });
                return { label: p.label, val, set, min: p.min, max: p.max, step: p.step, def: p.default, id: p.id, trackId: `coreMath.${p.id}`, type: p.type, mode: p.mode, linkable: p.linkable, scale: p.scale, options: p.options };
            });
        }

        return [{ label: 'Power (N)', val: coreMath.paramA, set: (v) => actions.setCoreMath({ paramA: v }), min: 2.0, max: 16.0, step: 0.001, def: 8.0, id: 'paramA' as LfoTarget, trackId: 'coreMath.paramA' }];
    };

    const renderControl = (p: FormulaParam | null) => {
        if (!p) return null;

        if (p.type === 'vec3') {
            const v3 = p.val as { x: number; y: number; z: number };
            const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`, `${p.trackId}_z`];
            const trackLabels = [`${p.label} X`, `${p.label} Y`, `${p.label} Z`];
            const vecMode = p.mode || 'normal';
            const isAngleMode = vecMode === 'rotation' || vecMode === 'direction' || vecMode === 'axes';
            const rotTrackLabels: Record<string, string[]> = {
                rotation: ['Azimuth', 'Pitch', 'Angle'],
                direction: ['Azimuth', 'Pitch', 'Length'],
                axes: trackLabels,
            };
            return (
                <div key={p.id} className="mb-px" ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Vector3Input label={p.label} value={new THREE.Vector3(v3.x, v3.y, v3.z)}
                        min={isAngleMode ? -Math.PI * 2 : p.min} max={isAngleMode ? Math.PI * 2 : p.max}
                        step={p.step} onChange={p.set} trackKeys={trackKeys}
                        trackLabels={isAngleMode ? (rotTrackLabels[vecMode] || trackLabels) : trackLabels}
                        mode={vecMode === 'axes' ? 'normal' : vecMode as any}
                        defaultValue={p.def ? new THREE.Vector3((p.def as any).x ?? 0, (p.def as any).y ?? 0, (p.def as any).z ?? 0) : undefined}
                        linkable={p.linkable} scale={p.scale} />
                </div>
            );
        }

        if (p.type === 'vec4') {
            const v4 = p.val as { x: number; y: number; z: number; w: number };
            const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`, `${p.trackId}_z`, `${p.trackId}_w`];
            const trackLabels = [`${p.label} X`, `${p.label} Y`, `${p.label} Z`, `${p.label} W`];
            return (
                <div key={p.id} className="mb-px" ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Vector4Input label={p.label} value={new THREE.Vector4(v4.x, v4.y, v4.z, v4.w)}
                        min={p.min} max={p.max} step={p.step} onChange={p.set}
                        trackKeys={trackKeys} trackLabels={trackLabels}
                        defaultValue={p.def ? new THREE.Vector4((p.def as any).x ?? 0, (p.def as any).y ?? 0, (p.def as any).z ?? 0, (p.def as any).w ?? 0) : undefined}
                        linkable={p.linkable} scale={p.scale} />
                </div>
            );
        }

        if (p.type === 'vec2') {
            const v2 = p.val as { x: number; y: number };
            const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`];
            const trackLabels = [`${p.label} X`, `${p.label} Y`];
            return (
                <div key={p.id} className="mb-px" ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Vector2Input label={p.label} value={new THREE.Vector2(v2.x, v2.y)}
                        min={p.min} max={p.max} step={p.step}
                        onChange={(v) => p.set({ x: v.x, y: v.y })}
                        trackKeys={trackKeys} trackLabels={trackLabels}
                        defaultValue={p.def ? new THREE.Vector2((p.def as any).x ?? 0, (p.def as any).y ?? 0) : undefined}
                        linkable={p.linkable} mode={p.mode} scale={p.scale} />
                </div>
            );
        }

        const val = p.val as number;

        if (p.options) {
            return (
                <div key={p.id} className="mb-px">
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
                        customMapping={{ min: p.min / Math.PI, max: p.max / Math.PI, toSlider: (v) => v / Math.PI, fromSlider: (v) => v * Math.PI }}
                        mapTextInput overrideInputText={`${(val / Math.PI).toFixed(2)}π`} />
                </div>
            );
        }
        if (p.scale === 'degrees') {
            const D2PI = 1 / 180;
            return (
                <div key={p.id} ref={(el) => { if (el) tutorAnchors.register(`param:${p.id}`, el); }}>
                    <Slider label={p.label} value={val} min={p.min} max={p.max} step={p.step}
                        onChange={p.set} defaultValue={p.def as number}
                        highlight={hasLfo || (p.id === 'paramA' && !hasLfo)}
                        trackId={p.trackId} liveValue={liveVal}
                        customMapping={{ min: p.min * D2PI, max: p.max * D2PI, toSlider: (v) => v * D2PI, fromSlider: (v) => v / D2PI }}
                        mapTextInput overrideInputText={`${(val * D2PI).toFixed(2)}π`} />
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
                        customMapping={{ min: 0, max: 100, toSlider: (val) => 100 * Math.pow((val - 1) / 499, 1/3), fromSlider: (val) => 1 + 499 * Math.pow(val / 100, 3) }}
                        mapTextInput={false} trackId="coreMath.iterations"
                        liveValue={state.liveModulations?.['coreMath.iterations']} />
                </div>
                {params.map((p) => renderControl(p))}
            </div>
        </>
    );
};
