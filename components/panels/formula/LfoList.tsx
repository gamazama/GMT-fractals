
import React from 'react';
import { nanoid } from 'nanoid';
import { FractalState, FractalActions, AnimationParams } from '../../../types';
import Slider from '../../Slider';
import { WaveformPreview } from './WaveformPreview';
import ToggleSwitch from '../../ToggleSwitch';
import { PlusIcon, TrashIcon } from '../../Icons';
import { ParameterSelector } from '../../ParameterSelector';

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

    return (
        <div className="flex flex-col border-t border-white/5 bg-purple-900/10" data-help-id="lfo.system">
            <div className="flex items-center justify-between px-3 py-2 border-b border-purple-500/20">
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">LFO Modulators</label>
                <button 
                    onClick={addAnimation}
                    disabled={state.animations.length >= 3}
                    className={`w-5 h-5 flex items-center justify-center rounded bg-purple-500/20 border border-purple-500/50 text-purple-300 hover:bg-purple-500 hover:text-white disabled:opacity-30 transition-all`}
                    title="Add LFO (Max 3)"
                >
                    <PlusIcon />
                </button>
            </div>
            
            <div className="space-y-1 p-2">
                {state.animations.map((anim, idx) => (
                    <div key={anim.id} className={`bg-black/40 rounded border border-purple-500/10 animate-fade-in relative transition-all ${anim.enabled ? 'p-2' : 'p-2'}`}>
                        <div className="flex items-center justify-between mb-2 min-h-[26px]">
                            <span className="text-[9px] font-black text-purple-400/50 uppercase tracking-[0.2em]">LFO {idx + 1}</span>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => removeAnimation(anim.id)}
                                    className="text-red-500 hover:text-white transition-colors opacity-50 hover:opacity-100"
                                    title="Delete LFO"
                                >
                                    <TrashIcon />
                                </button>
                                <div className="w-[60px]">
                                    <ToggleSwitch 
                                        value={anim.enabled}
                                        onChange={(v) => updateAnimation(anim.id, { enabled: v })}
                                        color="bg-purple-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {anim.enabled && (
                            <div className="animate-fade-in">
                                <WaveformPreview {...anim} />
                                
                                <div className="grid grid-cols-2 gap-1 mb-1">
                                    <div>
                                        <label className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">Target</label>
                                        <ParameterSelector 
                                            value={anim.target}
                                            onChange={(val) => {
                                                let baseVal = 0;
                                                if (val.includes('.')) {
                                                    const [fid, pid] = val.split('.');
                                                    const slice = (state as any)[fid];
                                                    if (slice && slice[pid] !== undefined) baseVal = slice[pid];
                                                }
                                                updateAnimation(anim.id, { target: val, baseValue: baseVal });
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">Shape</label>
                                        <select 
                                            value={anim.shape}
                                            onChange={(e) => updateAnimation(anim.id, { shape: e.target.value as any })}
                                            className="w-full bg-gray-900 border border-gray-700 text-[9px] text-white rounded p-1 outline-none focus:border-purple-500"
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
                                            overrideInputText={`${(anim.phase * 360).toFixed(0)}°`} 
                                        />
                                    )}
                                    <Slider label="Smoothing" value={anim.smoothing} min={0.0} max={1.0} step={0.01} onChange={(v) => updateAnimation(anim.id, { smoothing: v })} />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
