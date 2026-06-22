
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
    // Soft-shadow quality is a RUNTIME uniform now (shadowAlgorithm: <0.5 = HQ
    // Robust IQ penumbra, else Lite). HQ + Lite compile identically, so this
    // toggle never recompiles — flip it to compare the penumbra quality live.
    const shadowHQ = useEngineStore(s => (s.lighting?.shadowAlgorithm ?? 0.0) < 0.5);
    const setLighting = useEngineStore(s => s.setLighting);
    const handleInteractionStart = useEngineStore(s => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore(s => s.handleInteractionEnd);
    const areaAnchor = useTutorAnchor('shadow-area-btn');

    return (
        <Popover width="w-52" tutAnchor="shadow-panel" padding="none">
            <div className="relative space-y-2">
                <div className="flex items-center justify-between border-b border-line/10 pb-2 px-3">
                    <SectionLabel>Shadows</SectionLabel>
                    <div className="flex items-center gap-1.5">
                        {jitterAvailable && (
                            <button
                                onClick={() => {
                                    handleInteractionStart('param');
                                    setLighting({ shadowAlgorithm: shadowHQ ? 1.0 : 0.0 });
                                    handleInteractionEnd();
                                }}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${shadowHQ ? 'bg-accent-500/20 text-accent-300 border-accent-500/50' : 'bg-surface-header text-fg-dim border-line/20'}`}
                                title="HQ soft shadows — accurate IQ penumbra. Off = Lite (faster, simpler penumbra). Runtime toggle, no recompile."
                            >
                                HQ
                            </button>
                        )}
                        {jitterAvailable && (
                            <button
                                ref={areaAnchor}
                                onClick={() => {
                                    handleInteractionStart('param');
                                    setLighting({ areaLights: !areaLights });
                                    handleInteractionEnd();
                                }}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${areaLights ? 'bg-secondary/20 text-secondary border-secondary/50' : 'bg-surface-header text-fg-dim border-line/20'}`}
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
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${shadows ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 'bg-surface-header text-fg-dim border-line/20'}`}
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
