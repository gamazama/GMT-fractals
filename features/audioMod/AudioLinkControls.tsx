
import React from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { Knob } from '../../components/Knob';
import { ParameterSelector } from '../../components/ParameterSelector';
import { TrashIcon } from '../../components/Icons';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { collectHelpIds } from '../../utils/helpUtils';
import { ModulationRule } from '../modulation/index';

export const AudioLinkControls: React.FC<Partial<FeatureComponentProps>> = () => {
    const store = useFractalStore();
    const { modulation, removeModulation, addModulation, openContextMenu } = store;
    
    // Wrapper for DDFS action
    const updateRule = (id: string, update: Partial<ModulationRule>) => {
        // @ts-ignore
        store.updateModulation({ id, update });
    };

    const selectedId = modulation.selectedRuleId;
    const rule = modulation.rules.find(r => r.id === selectedId);

    const handleAdd = () => {
        addModulation({ target: 'coreMath.paramA', source: 'audio' });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };

    if (!rule) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-gray-500 gap-3 border-t border-white/5">
                <span className="text-xs italic">Select a box to edit params</span>
                <button onClick={handleAdd} className="px-4 py-2 bg-cyan-900/50 border border-cyan-500/30 rounded text-xs font-bold text-cyan-300 hover:bg-cyan-900 transition-colors">
                    + ADD NEW LINK
                </button>
            </div>
        );
    }
    
    // If user selected a non-audio rule, hide frequency controls or show simplified UI
    const isAudio = rule.source === 'audio';

    const setBand = (start: number, end: number) => {
        updateRule(rule.id, { freqStart: start, freqEnd: end });
    };

    return (
        <div 
            className="flex flex-col gap-3 border-t border-white/5 pt-3 animate-fade-in-up" 
            data-help-id="audio.links"
            onContextMenu={handleContextMenu}
        >
            {/* Header: Target & Delete */}
            <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                <div className="flex-1 mr-2">
                    <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Target Parameter</label>
                    <ParameterSelector 
                        value={rule.target}
                        onChange={(v) => updateRule(rule.id, { target: v })}
                        className="w-full"
                    />
                </div>
                <div className="flex flex-col items-end gap-1">
                     <button 
                        onClick={() => removeModulation(rule.id)} 
                        className="p-2 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/50 transition-colors"
                        title="Remove Rule"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
            
            {/* Source Selector (Generic Mixer Logic) */}
            <div className="flex gap-2 items-center">
                 <label className="text-[9px] text-gray-500 font-bold uppercase">Source:</label>
                 <select 
                    value={rule.source}
                    onChange={(e) => updateRule(rule.id, { source: e.target.value as any })}
                    className="bg-black border border-white/10 text-[9px] text-cyan-300 rounded px-2 py-1"
                 >
                     <option value="audio">Audio Spectrum</option>
                     <option value="lfo-1">LFO 1</option>
                     <option value="lfo-2">LFO 2</option>
                     <option value="lfo-3">LFO 3</option>
                 </select>
            </div>
            
            {isAudio && (
                <div>
                    <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Quick Frequency Bands</label>
                    <div className="flex gap-1">
                        <button onClick={() => setBand(0, 0.1)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] uppercase font-bold text-gray-400 rounded border border-white/5">Bass</button>
                        <button onClick={() => setBand(0.1, 0.5)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] uppercase font-bold text-gray-400 rounded border border-white/5">Mids</button>
                        <button onClick={() => setBand(0.5, 1.0)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] uppercase font-bold text-gray-400 rounded border border-white/5">Treble</button>
                        <button onClick={() => setBand(0, 1.0)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] uppercase font-bold text-gray-400 rounded border border-white/5">Full</button>
                    </div>
                </div>
            )}

            {/* Knobs Grid - Updated to 5 Cols to fit Smoothing */}
            <div className="bg-black/30 rounded border border-white/10 p-3">
                 <div className="grid grid-cols-5 gap-1">
                    <div className="flex flex-col items-center">
                        <Knob 
                            label="Attack" value={rule.attack} min={0.01} max={0.99} 
                            onChange={(v) => updateRule(rule.id, { attack: v })} 
                            size={40} color="#fbbf24"
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <Knob 
                            label="Decay" value={rule.decay} min={0.01} max={0.99} 
                            onChange={(v) => updateRule(rule.id, { decay: v })} 
                            size={40} color="#fbbf24"
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <Knob 
                            label="Smooth" value={rule.smoothing ?? 0} min={0.0} max={0.99} 
                            onChange={(v) => updateRule(rule.id, { smoothing: v })} 
                            size={40} color="#a855f7"
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <Knob 
                            label="Gain" value={rule.gain} min={0} max={10} 
                            onChange={(v) => updateRule(rule.id, { gain: v })} 
                            size={40} color="#22d3ee"
                            unconstrained={true}
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <Knob 
                            label="Offset" value={rule.offset} min={-5} max={5} 
                            onChange={(v) => updateRule(rule.id, { offset: v })} 
                            size={40} color="#22d3ee"
                            unconstrained={true}
                        />
                    </div>
                 </div>
                 <div className="grid grid-cols-5 text-[8px] text-gray-500 text-center mt-1 uppercase font-bold">
                     <div>Rise</div>
                     <div>Fall</div>
                     <div>Lerp</div>
                     <div>Mult</div>
                     <div>Add</div>
                 </div>
            </div>
            
            {/* Info Footer */}
            {isAudio && (
                <div className="flex justify-between text-[9px] text-gray-600 px-1">
                     <span>Freq: {Math.round(rule.freqStart*100)}% - {Math.round(rule.freqEnd*100)}%</span>
                     <span>Threshold: {Math.round(rule.thresholdMin*100)}% - {Math.round(rule.thresholdMax*100)}%</span>
                </div>
            )}
        </div>
    );
};
