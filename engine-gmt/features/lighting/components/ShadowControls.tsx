
import React from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import { AutoFeaturePanel } from '../../../../components/AutoFeaturePanel';
import { SectionLabel } from '../../../../components/SectionLabel';
import { Popover } from '../../../../components/Popover';

const ShadowSettingsPopup = () => {
    const shadows = useEngineStore(s => s.lighting?.shadows);
    const areaLightsCompiled = useEngineStore(s => s.lighting?.ptStochasticShadows);
    const areaLights = useEngineStore(s => s.lighting?.areaLights);
    const setLighting = useEngineStore(s => s.setLighting);
    const handleInteractionStart = useEngineStore(s => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore(s => s.handleInteractionEnd);

    return (
        <Popover width="w-52" dataTut="shadow-panel">
            <div className="relative space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
                    <SectionLabel>Shadows</SectionLabel>
                    <div className="flex items-center gap-1.5">
                        {areaLightsCompiled && (
                            <button
                                data-tut="shadow-area-btn"
                                onClick={() => {
                                    handleInteractionStart('param');
                                    setLighting({ areaLights: !areaLights });
                                    handleInteractionEnd();
                                }}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${areaLights ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'bg-gray-800 text-gray-500 border-gray-600'}`}
                                title="Toggle stochastic area light shadows"
                            >
                                Area
                            </button>
                        )}
                        <button
                            onClick={() => {
                                handleInteractionStart('param');
                                setLighting({ shadows: !shadows });
                                handleInteractionEnd();
                            }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${shadows ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 'bg-gray-800 text-gray-500 border-gray-600'}`}
                        >
                            {shadows ? 'ON' : 'OFF'}
                        </button>
                    </div>
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
