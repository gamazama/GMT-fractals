/**
 * LfoList — generic LFO modulator UI.
 *
 * Lifted from engine-gmt during the modulation-UI extraction so any
 * engine-based app can drop in continuous-driver modulation with one
 * panel-manifest entry. The store/state plumbing is generic — a new
 * LFO is appended to `state.animations`, the canonical
 * `engine/animation/modulationTick` (installed via `installModulation`)
 * processes it into `state.liveModulations` each frame.
 *
 * GMT-specific defaults live in `lfoListConfig.ts` (default `target`
 * for a fresh LFO, `baseValue` resolution from the slice). Apps
 * override via `setLfoListConfig({...})` once at boot.
 *
 * Two ways to wire:
 *  1. `installModulationUI()` — registers `'lfo-list'` in the component
 *     registry; reference it via `{ type: 'widget', id: 'lfo-list' }`
 *     in your panel manifest. Recommended.
 *  2. Direct import — `<LfoList />` reads the engine store itself.
 */

import React from 'react';
import { nanoid } from 'nanoid';
import { useEngineStore } from '../../../store/engineStore';
import type { AnimationParams } from '../../../types';
import Slider from '../../../components/Slider';
import ToggleSwitch from '../../../components/ToggleSwitch';
import { DynamicList, DynamicListItem } from '../../../components/DynamicList';
import { ParameterSelector } from '../../../components/ParameterSelector';
import { WaveformPreview } from './WaveformPreview';
import { getLfoListConfig } from './lfoListConfig';

export const LfoList: React.FC = () => {
    const animations = useEngineStore((s) => s.animations);
    const setAnimations = useEngineStore((s) => s.setAnimations);
    const advancedMode = useEngineStore((s) => s.advancedMode);

    const cfg = getLfoListConfig();

    const addAnimation = () => {
        if (animations.length >= cfg.maxLfos) return;
        const target = cfg.defaultTarget ?? '';
        const baseValue = target ? cfg.seedBaseValue(target, useEngineStore.getState()) : 0;
        // Default min / max are RELATIVE strengths around baseValue
        // (output = baseValue + lerp(min, max, half-rectified rawWave)),
        // so −1 / +1 sweeps ± 1 around the param's authored value.
        // `amplitude` kept at 1 for back-compat with old reads.
        const newLfo: AnimationParams = {
            id: nanoid(),
            enabled: true,
            target,
            shape: 'Sine',
            period: 5.0,
            amplitude: 1.0,
            baseValue,
            min: -1,
            max: 1,
            phase: 0.0,
            smoothing: 0.5,
        };
        setAnimations([...animations, newLfo]);
    };

    // Effective relative-strength range. Legacy LFOs (no min/max) are
    // shown as symmetric ±amplitude strengths so they edit cleanly.
    const effectiveRange = (anim: AnimationParams): { min: number; max: number } => {
        if (typeof anim.min === 'number' && typeof anim.max === 'number') {
            return { min: anim.min, max: anim.max };
        }
        return { min: -anim.amplitude, max: anim.amplitude };
    };

    const removeAnimation = (id: string) => {
        setAnimations(animations.filter((a) => a.id !== id));
    };

    const updateAnimation = (id: string, updates: Partial<AnimationParams>) => {
        setAnimations(animations.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    };

    const hasActive = animations.some((a) => a.enabled);

    return (
        <DynamicList
            label="LFO Modulators"
            accent="purple"
            isActive={hasActive}
            onAdd={addAnimation}
            addDisabled={animations.length >= cfg.maxLfos}
            addTitle={`Add LFO (Max ${cfg.maxLfos})`}
            data-help-id="lfo.system"
        >
            {animations.map((anim, idx) => (
                <DynamicListItem
                    key={anim.id}
                    title={`LFO ${idx + 1}`}
                    titleColor="text-purple-400/50"
                    accent="purple"
                    onRemove={() => removeAnimation(anim.id)}
                    actions={
                        <div className="w-[60px]">
                            <ToggleSwitch
                                value={anim.enabled}
                                onChange={(v) => updateAnimation(anim.id, { enabled: v })}
                                color="bg-purple-600"
                            />
                        </div>
                    }
                >
                    {anim.enabled && (
                        <div className="animate-fade-in">
                            <WaveformPreview
                                shape={anim.shape}
                                period={anim.period}
                                phase={anim.phase}
                                amplitude={anim.amplitude}
                                enabled={anim.enabled}
                            />

                            <div className="grid grid-cols-2 gap-1 mb-1">
                                <div>
                                    <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Target</label>
                                    <ParameterSelector
                                        value={anim.target}
                                        onChange={(val) => {
                                            const baseValue = cfg.seedBaseValue(val, useEngineStore.getState());
                                            updateAnimation(anim.id, { target: val, baseValue });
                                        }}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Shape</label>
                                    <select
                                        value={anim.shape}
                                        onChange={(e) => updateAnimation(anim.id, { shape: e.target.value as AnimationParams['shape'] })}
                                        className="t-select text-white focus:border-purple-500"
                                    >
                                        <option value="Sine">Sine</option>
                                        <option value="Triangle">Triangle</option>
                                        <option value="Sawtooth">Sawtooth</option>
                                        <option value="Pulse">Pulse</option>
                                        <option value="Noise">Noise</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-0">
                                <Slider
                                    label="Period (Sec)" value={anim.period}
                                    min={0.1} max={30.0} step={0.01}
                                    hardMin={0.01}
                                    onChange={(v) => updateAnimation(anim.id, { period: v })}
                                    // Slightly-log feel via t² mapping: low periods get
                                    // more slider real estate (slider middle ≈ 7.6s
                                    // instead of linear 15s; 0.1–3s fills the lower half).
                                    customMapping={{
                                        min: 0, max: 100,
                                        toSlider: (val) => Math.sqrt((Math.max(0.1, Math.min(30, val)) - 0.1) / (30 - 0.1)) * 100,
                                        fromSlider: (val) => 0.1 + (30 - 0.1) * Math.pow(val / 100, 2),
                                    }}
                                />
                                {(() => {
                                    const { min, max } = effectiveRange(anim);
                                    // RELATIVE strengths around the param's
                                    // baseValue. Negative = downward push,
                                    // positive = upward. Symmetric ±10 reach
                                    // matches the legacy amplitude slider.
                                    return (
                                        <>
                                            <Slider
                                                label="Min strength" value={min}
                                                min={-10} max={10} step={0.001}
                                                onChange={(v) => updateAnimation(anim.id, { min: v, max: Math.max(v, max) })}
                                                overrideInputText={Math.abs(min) < 0.1 ? min.toFixed(3) : min.toFixed(2)}
                                            />
                                            <Slider
                                                label="Max strength" value={max}
                                                min={-10} max={10} step={0.001}
                                                onChange={(v) => updateAnimation(anim.id, { min: Math.min(v, min), max: v })}
                                                overrideInputText={Math.abs(max) < 0.1 ? max.toFixed(3) : max.toFixed(2)}
                                            />
                                        </>
                                    );
                                })()}
                                {advancedMode && (
                                    <Slider
                                        label="Phase Offset" value={anim.phase}
                                        min={0.0} max={1.0} step={0.01}
                                        onChange={(v) => updateAnimation(anim.id, { phase: v })}
                                        customMapping={{ min: 0, max: 360, toSlider: (v) => v * 360, fromSlider: (v) => v / 360 }}
                                        mapTextInput={true}
                                        overrideInputText={`${(anim.phase * 360).toFixed(0)}°`}
                                    />
                                )}
                                <Slider label="Smoothing" value={anim.smoothing} min={0.0} max={1.0} step={0.01} onChange={(v) => updateAnimation(anim.id, { smoothing: v })} />
                            </div>
                        </div>
                    )}
                </DynamicListItem>
            ))}
        </DynamicList>
    );
};
