
import React from 'react';
import { useFractalStore } from '../../../store/fractalStore';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';
import { SectionLabel } from '../../../components/SectionLabel';
import { Popover } from '../../../components/Popover';

const ShadowSettingsPopup = () => {
    const shadows = useFractalStore(s => s.lighting?.shadows);
    const setLighting = useFractalStore(s => s.setLighting);
    const handleInteractionStart = useFractalStore(s => s.handleInteractionStart);
    const handleInteractionEnd = useFractalStore(s => s.handleInteractionEnd);

    return (
        <Popover width="w-52">
            <div className="relative space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
                    <SectionLabel>Shadows</SectionLabel>
                    <button
                        onClick={() => {
                            handleInteractionStart('param');
                            setLighting({ shadows: !shadows });
                            handleInteractionEnd();
                        }}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${shadows ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 'bg-gray-800 text-gray-500 border-gray-600'}`}
                    >
                        {shadows ? 'Enabled' : 'Disabled'}
                    </button>
                </div>

                {shadows && (
                    <div className="space-y-1">
                        <AutoFeaturePanel featureId="lighting" groupFilter="shadows" />
                    </div>
                )}
            </div>
        </Popover>
    );
};

export default ShadowSettingsPopup;
