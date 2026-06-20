
import React from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import { AutoFeaturePanel } from '../../../../components/AutoFeaturePanel';
import { SectionLabel } from '../../../../components/SectionLabel';
import { Popover } from '../../../../components/Popover';
import { useTutorAnchor } from '../../../../engine/plugins/Tutorial';

const ShadowSettingsPopup = () => {
    const shadows = useEngineStore(s => s.lighting?.shadows);
    // Jitter is available whenever the shadow march is compiled — the jitter ALU
    // is now always compiled with shadows (no separate compile gate), so the
    // button is present whenever shadows can cast. (Was gated on the now-deprecated
    // ptStochasticShadows, which got stuck false across formula switches.)
    const jitterAvailable = useEngineStore(s => s.lighting?.shadowsCompile !== false);
    const areaLights = useEngineStore(s => s.lighting?.areaLights);
    const setLighting = useEngineStore(s => s.setLighting);
    const handleInteractionStart = useEngineStore(s => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore(s => s.handleInteractionEnd);
    const areaAnchor = useTutorAnchor('shadow-area-btn');

    return (
        <Popover width="w-52" tutAnchor="shadow-panel" padding="none">
            <div className="relative space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 px-3">
                    <SectionLabel>Shadows</SectionLabel>
                    <div className="flex items-center gap-1.5">
                        {jitterAvailable && (
                            <button
                                ref={areaAnchor}
                                onClick={() => {
                                    handleInteractionStart('param');
                                    setLighting({ areaLights: !areaLights });
                                    handleInteractionEnd();
                                }}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${areaLights ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'bg-gray-800 text-gray-500 border-gray-600'}`}
                                title="Stochastic shadow jitter — softens Point-light shadows via accumulation. For physical area lights, use a Sphere light type instead."
                            >
                                Jitter
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
