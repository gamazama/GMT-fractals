
import React from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { Knob } from '../../../components/Knob';
import { ParameterSelector } from '../../../components/ParameterSelector';
import { TrashIcon } from '../../../components/Icons';
import { DotToggle } from '../../../components/DotToggle';
import { FeatureComponentProps } from '../../../components/registry/ComponentRegistry';
import { collectHelpIds } from '../../../utils/helpUtils';
import { ModulationRule } from '../modulation/index';
import { audioAnalysisEngine } from './AudioAnalysisEngine';
import { QUICK_BANDS, formatBand } from './freqScale';

export const AudioLinkControls: React.FC<Partial<FeatureComponentProps>> = () => {
    const store = useEngineStore();
    const { modulation, removeModulation, addModulation, openContextMenu } = store;
    const sampleRate = audioAnalysisEngine.sampleRate;
    
    // Wrapper for DDFS action
    const updateRule = (id: string, update: Partial<ModulationRule>) => {
        (store as any).updateModulation({ id, update });
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
            <div className="flex flex-col items-center justify-center py-6 text-fg-dim gap-3 border-t border-line/5">
                <span className="text-xs italic">Select a box to edit params</span>
                <button onClick={handleAdd} className="px-4 py-2 bg-accent-900/50 border border-accent-500/30 rounded text-xs font-bold text-accent-300 hover:bg-accent-900 transition-colors">
                    + Add New Link
                </button>
            </div>
        );
    }
    
    // If user selected a non-audio rule, hide frequency controls or show simplified UI
    const isAudio = rule.source === 'audio';

    const setBand = (lowHz: number, highHz: number) => {
        updateRule(rule.id, { lowHz, highHz });
    };

    return (
        <div 
            className="flex flex-col gap-3 border-t border-line/5 pt-3 animate-fade-in-up" 
            data-help-id="audio.links"
            onContextMenu={handleContextMenu}
        >
            {/* Header: Target & Delete */}
            <div className="flex justify-between items-center bg-line/5 p-2 rounded border border-line/5">
                <div className="flex-1 mr-2">
                    <label className="text-[9px] text-fg-dim font-bold block mb-1">Target Parameter</label>
                    <ParameterSelector 
                        value={rule.target}
                        onChange={(v) => updateRule(rule.id, { target: v })}
                        className="w-full"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <DotToggle
                        value={rule.enabled}
                        onChange={(v) => updateRule(rule.id, { enabled: v })}
                        accent="cyan"
                        title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    />
                    <button
                        onClick={() => removeModulation(rule.id)}
                        className="p-2 text-danger hover:text-danger hover:bg-danger/10 rounded border border-transparent hover:border-danger/50 transition-colors"
                        title="Remove Rule"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
            
            {/* Source Selector (Generic Mixer Logic) */}
            <div className="flex gap-2 items-center">
                 <label className="text-[9px] text-fg-dim font-bold">Source:</label>
                 <select 
                    value={rule.source}
                    onChange={(e) => updateRule(rule.id, { source: e.target.value as any })}
                    className="t-select text-accent-300"
                 >
                     <option value="audio">Audio Spectrum</option>
                     <option value="lfo-1">LFO 1</option>
                     <option value="lfo-2">LFO 2</option>
                     <option value="lfo-3">LFO 3</option>
                 </select>
            </div>
            
            {/* Response mode. Level follows loudness (param sits high while the
                sound lasts); Transient fires on the attack and falls back, which
                is what makes a param punch ON the beat rather than lagging it. */}
            {isAudio && (
                <div>
                    <label className="text-[9px] text-fg-dim font-bold block mb-1">Response</label>
                    <div className="flex gap-1">
                        <button
                            onClick={() => updateRule(rule.id, { mode: 'level' })}
                            title="Follow the band's loudness — rises and falls with the sound"
                            className={`flex-1 py-1.5 text-[9px] font-bold rounded border transition-colors ${
                                (rule.mode ?? 'level') === 'level'
                                    ? 'bg-accent-900/50 border-accent-500/30 text-accent-300'
                                    : 'bg-line/5 hover:bg-line/10 border-line/5 text-fg-muted'
                            }`}
                        >
                            Level
                        </button>
                        <button
                            onClick={() => updateRule(rule.id, { mode: 'transient' })}
                            title="Fire on the attack only — punches on each hit and falls back between them. Use a low Attack and a longer Decay."
                            className={`flex-1 py-1.5 text-[9px] font-bold rounded border transition-colors ${
                                rule.mode === 'transient'
                                    ? 'bg-accent-900/50 border-accent-500/30 text-accent-300'
                                    : 'bg-line/5 hover:bg-line/10 border-line/5 text-fg-muted'
                            }`}
                        >
                            Transient
                        </button>
                    </div>
                    {rule.mode === 'transient' && (
                        <p className="text-[8px] text-fg-faint mt-1 leading-snug">
                            Fires on attacks. Lower <b>FFT Smooth</b> if hits feel soft — heavy smoothing flattens the very transients this reads.
                        </p>
                    )}
                </div>
            )}

            {isAudio && (
                <div>
                    <label className="text-[9px] text-fg-dim font-bold block mb-1">Quick Frequency Bands</label>
                    <div className="flex gap-1">
                        {QUICK_BANDS.map((b) => {
                            // Presets are already in Hz — no conversion left.
                            return (
                                <button
                                    key={b.label}
                                    onClick={() => setBand(b.lowHz, b.highHz)}
                                    title={b.title}
                                    className="flex-1 py-1.5 bg-line/5 hover:bg-line/10 text-[9px] font-bold text-fg-muted rounded border border-line/5"
                                >
                                    {b.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Knobs Grid - Updated to 5 Cols to fit Smoothing */}
            <div className={`bg-surface-section rounded border border-line/10 p-3 transition-opacity ${rule.enabled ? '' : 'opacity-50'}`}>
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
                            size={40} color="rgb(var(--accent-400))"
                            unconstrained={true}
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <Knob 
                            label="Offset" value={rule.offset} min={-5} max={5} 
                            onChange={(v) => updateRule(rule.id, { offset: v })} 
                            size={40} color="rgb(var(--accent-400))"
                            unconstrained={true}
                        />
                    </div>
                 </div>
                 <div className="grid grid-cols-5 text-[8px] text-fg-dim text-center mt-1 font-bold">
                     <div>Rise</div>
                     <div>Fall</div>
                     <div>Lerp</div>
                     <div>Mult</div>
                     <div>Add</div>
                 </div>
            </div>
            
            {/* Info Footer — real Hz, not a percentage of the FFT axis. See
                freqScale.ts: a kick sits below 0.5% of that axis, so the old
                percentage readout could not distinguish a kick band from a
                whole-bass band. */}
            {isAudio && (
                <div className="flex justify-between text-[9px] text-fg-faint px-1">
                     <span>Band: {formatBand(rule.lowHz, rule.highHz)}</span>
                     <span>Threshold: {Math.round(rule.thresholdMin*100)}% - {Math.round(rule.thresholdMax*100)}%</span>
                </div>
            )}
        </div>
    );
};
