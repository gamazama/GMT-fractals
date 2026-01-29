
import React from 'react';
import { useFractalStore } from '../../../store/fractalStore';
import Slider from '../../../components/Slider';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';

const ShadowSettingsPopup = () => {
    const state = useFractalStore();
    const lighting = state.lighting;

    if (!lighting) return null;

    return (
        <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-52 bg-black border border-white/20 rounded-xl p-2 shadow-2xl z-[70] animate-fade-in origin-top">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black border-t border-l border-white/20 transform rotate-45" />
            
            <div className="relative space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shadows</span>
                    <button 
                        onClick={() => {
                            state.handleInteractionStart('param');
                            state.setLighting({ shadows: !lighting.shadows });
                            state.handleInteractionEnd();
                        }}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${lighting.shadows ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 'bg-gray-800 text-gray-500 border-gray-600'}`}
                    >
                        {lighting.shadows ? 'ENABLED' : 'DISABLED'}
                    </button>
                </div>

                {lighting.shadows && (
                    <div className="space-y-1">
                        <AutoFeaturePanel featureId="lighting" groupFilter="shadows" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShadowSettingsPopup;
