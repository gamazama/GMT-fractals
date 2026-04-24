
import React from 'react';
import { nanoid } from 'nanoid';
import type { AnimationParams } from '../../../../types';
import type { EngineStoreState as FractalState, EngineActions as FractalActions } from '../../../../types';
import Slider from '../../../../components/Slider';
import { WaveformPreview } from './WaveformPreview';
import ToggleSwitch from '../../../../components/ToggleSwitch';
import { DynamicList, DynamicListItem } from '../../../../components/DynamicList';
import { ParameterSelector } from '../../../../components/ParameterSelector';

export const LfoList = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {

    const addAnimation = () => {
        if (state.animations.length >= 3) return;
        const newLfo: AnimationParams = {
            id: nanoid(),
            enabled: true,
            target: 'coreMath.paramA',
            shape: 'Sine',
            period: 5.0,
            amplitude: 1.0,
            baseValue: state.coreMath.paramA,
            phase: 0.0,
            smoothing: 0.5
        };
        actions.setAnimations([...state.animations, newLfo]);
    };

    const removeAnimation = (id: string) => {
        actions.setAnimations(state.animations.filter(a => a.id !== id));
    };

    const updateAnimation = (id: string, updates: Partial<AnimationParams>) => {
        actions.setAnimations(state.animations.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const hasActive = state.animations.some(a => a.enabled);

    return (
        <DynamicList
            label="LFO Modulators"
            accent="purple"
            isActive={hasActive}
            onAdd={addAnimation}
            addDisabled={state.animations.length >= 3}
            addTitle="Add LFO (Max 3)"
            data-help-id="lfo.system"
        >
            {state.animations.map((anim, idx) => (
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
                            <WaveformPreview {...anim} />

                            <div className="grid grid-cols-2 gap-1 mb-1">
                                <div>
                                    <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Target</label>
                                    <ParameterSelector
                                        value={anim.target}
                                        onChange={(val) => {
                                            let baseVal = 0;
                                            if (val.includes('.')) {
                                                const [fid, pid] = val.split('.');
                                                const slice = (state as any)[fid];
                                                const vectorMatch = pid.match(/^(vec[23][ABC])_(x|y|z)$/);
                                                if (vectorMatch && slice) {
                                                    const vectorName = vectorMatch[1];
                                                    const axis = vectorMatch[2];
                                                    const vector = slice[vectorName];
                                                    if (vector && typeof vector === 'object') {
                                                        baseVal = (vector as any)[axis] || 0;
                                                    }
                                                } else if (slice && slice[pid] !== undefined) {
                                                    baseVal = slice[pid];
                                                }
                                            }
                                            updateAnimation(anim.id, { target: val, baseValue: baseVal });
                                        }}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Shape</label>
                                    <select
                                        value={anim.shape}
                                        onChange={(e) => updateAnimation(anim.id, { shape: e.target.value as any })}
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
                                    min={0.1} max={30.0} step={0.1}
                                    hardMin={0.01}
                                    onChange={(v) => updateAnimation(anim.id, { period: v })}
                                />
                                <Slider
                                    label="Strength"
                                    value={anim.amplitude}
                                    min={0.001} max={10.0} step={0.001}
                                    onChange={(v) => updateAnimation(anim.id, { amplitude: v })}
                                    customMapping={{
                                        min: 0, max: 100,
                                        toSlider: (val) => ((Math.log10(Math.max(0.001, val)) + 3) / 4) * 100,
                                        fromSlider: (val) => Math.pow(10, (val / 100 * 4) - 3)
                                    }}
                                    overrideInputText={anim.amplitude < 0.1 ? anim.amplitude.toFixed(3) : anim.amplitude.toFixed(2)}
                                />
                                {state.advancedMode && (
                                    <Slider
                                        label="Phase Offset" value={anim.phase}
                                        min={0.0} max={1.0} step={0.01}
                                        onChange={(v) => updateAnimation(anim.id, { phase: v })}
                                        customMapping={{ min: 0, max: 360, toSlider: v => v * 360, fromSlider: v => v / 360 }}
                                        mapTextInput={true}
                                        overrideInputText={`${(anim.phase * 360).toFixed(0)}\u00B0`}
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
