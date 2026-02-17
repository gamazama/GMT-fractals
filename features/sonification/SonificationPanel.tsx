
import React from 'react';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { sonificationEngine } from './SonificationEngine';
import Button from '../../components/Button';
import { useFractalStore } from '../../store/fractalStore';
import { SonificationState } from './types';

const FINE_STRUCTURE_ALPHA = 0.007297;

// Pure Log Ratios found in nature
const PURE_RATIOS = [
    { label: 'ln3/ln2', val: Math.log(3)/Math.log(2) }, // ~1.585
    { label: 'ln4/ln3', val: Math.log(4)/Math.log(3) }, // ~1.262
    { label: 'ln5/ln3', val: Math.log(5)/Math.log(3) }, // ~1.465
    { label: 'Golden', val: 1.61803 },
    { label: 'Sqrt(2)', val: 1.41421 },
    { label: 'ln(2π)', val: Math.log(2*Math.PI) }
];

export const SonificationPanel: React.FC<FeatureComponentProps> = ({ sliceState }) => {
    const state = sliceState as SonificationState;
    const D = state.lastDimension || 0;

    // Initializer
    React.useEffect(() => {
        if (!sonificationEngine.isInitialized) {
            sonificationEngine.init();
        }
    }, []);
    
    // Mute/Unmute handler
    const toggleActive = () => {
        const setSonification = (useFractalStore.getState() as any).setSonification;
        setSonification({ active: !state.active });
        
        if (!state.active) {
            sonificationEngine.resume();
        }
    };

    // Coherence Logic
    let isCoherent = false;
    let matchLabel = "";
    let minDelta = Infinity;

    PURE_RATIOS.forEach(r => {
        const delta = Math.abs(D - r.val);
        if (delta < minDelta) minDelta = delta;
        if (delta < FINE_STRUCTURE_ALPHA) {
            isCoherent = true;
            matchLabel = r.label;
        }
    });

    return (
        <div className="-m-3 flex flex-col h-full" data-help-id="panel.sonification">
            <div className="p-3 bg-black/40 border-b border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_5px_purple]" />
                    <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">FHBT Audio</h3>
                </div>
                
                <Button 
                    onClick={toggleActive}
                    variant={state.active ? "success" : "danger"}
                    label={state.active ? "AUDIO ACTIVE" : "MUTED"}
                    className="mb-2"
                />
                
                {/* Coherence Monitor */}
                <div className={`mt-2 p-2 rounded border transition-all duration-300 ${isCoherent ? 'bg-green-900/30 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-black/40 border-white/10'}`}>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Dimension D</span>
                        <span className={`font-mono font-bold text-xs ${isCoherent ? 'text-green-400' : 'text-cyan-400'}`}>
                            {D.toFixed(4)}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center h-4">
                        {isCoherent ? (
                            <span className="text-[9px] font-black text-green-300 uppercase tracking-wider animate-pulse">
                                LOCK: {matchLabel}
                            </span>
                        ) : (
                            <div className="w-full flex items-center gap-1">
                                <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-cyan-600 transition-all duration-200" 
                                        style={{ width: `${Math.max(0, 1.0 - (minDelta / 0.1)) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[8px] text-gray-600 font-mono">{minDelta.toFixed(3)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="p-1">
                <AutoFeaturePanel featureId="sonification" groupFilter="controls" />
            </div>
            
            <div className="p-3 text-[9px] text-gray-500 leading-relaxed italic border-t border-white/5 mt-auto">
                Transforms fractal complexity into polyrhythms (9:19:15) using logarithmic spiral sampling.
            </div>
        </div>
    );
};
