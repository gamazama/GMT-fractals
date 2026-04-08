
import React, { useState, useEffect, useMemo } from 'react';
import { FractalState, FractalActions } from '../../../types';
import { useFractalStore } from '../../../store/fractalStore';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';
import ToggleSwitch from '../../../components/ToggleSwitch';
import { SectionDivider } from '../../../components/SectionLabel';
import { getGradientCssString } from '../../../utils/colorUtils';

/** Thin gradient strip preview for section headers */
const GradientPreview: React.FC<{ stops: any }> = ({ stops }) => {
    const bg = useMemo(() => {
        if (!stops) return 'linear-gradient(to right, #000, #fff)';
        return getGradientCssString(stops);
    }, [stops]);

    return (
        <div
            className="flex-1 h-2.5 rounded-sm overflow-hidden opacity-80"
            style={{ backgroundImage: bg, backgroundSize: '100% 100%' }}
        />
    );
};

export const ColoringPanel = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
    const coloring = (state as any).coloring;
    const texturing = (state as any).texturing;
    const setTexturing = (actions as any).setTexturing;
    const setHistogramLayer = useFractalStore(s => s.setHistogramLayer);

    const [activeLayer, setActiveLayer] = useState<'layer1' | 'layer2'>('layer1');
    const [noiseOpen, setNoiseOpen] = useState(() => (coloring?.layer3Strength ?? 0) > 0);

    const layer1Open = activeLayer === 'layer1';
    const layer2Open = activeLayer === 'layer2';

    // Track which section is expanded for histogram data
    useEffect(() => {
        setHistogramLayer(layer2Open ? 1 : 0);
    }, [layer2Open, setHistogramLayer]);

    const layer2Active = (coloring?.blendOpacity ?? 0) > 0;

    if (!coloring) return null;

    return (
        <div className="animate-fade-in -mx-4 -mt-4 flex flex-col" data-help-id="panel.gradient">

            {/* === LAYER 1 === */}
            <div className="flex flex-col">
                {/* Header */}
                <div
                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                        layer1Open ? 'bg-neutral-800' : 'bg-neutral-800/50 hover:bg-white/5'
                    }`}
                    onClick={() => setActiveLayer('layer1')}
                >
                    <span className={`text-[10px] font-bold text-gray-300`}>
                        Layer 1
                    </span>
                    <GradientPreview stops={coloring.gradient} />
                    <svg className={`w-3 h-3 text-gray-500 transition-transform ${layer1Open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>

                {/* Content */}
                {layer1Open && (
                    <div className="flex flex-col animate-fade-in">
                        {texturing && (
                            <ToggleSwitch
                                value={texturing.active}
                                onChange={(v) => setTexturing({ active: v })}
                                options={[
                                    { label: 'Gradient', value: false },
                                    { label: 'Image Texture', value: true }
                                ]}
                            />
                        )}

                        {texturing && !texturing.active ? (
                            <div className="flex flex-col">
                                <div data-help-id="grad.mapping">
                                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_top" />
                                </div>
                                <AutoFeaturePanel featureId="coloring" groupFilter="layer1_grad" />
                                <AutoFeaturePanel featureId="coloring" groupFilter="layer1_hist" />
                                <div data-help-id="grad.escape">
                                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_bottom" />
                                </div>
                            </div>
                        ) : texturing?.active ? (
                            <div className="flex flex-col" data-help-id="grad.texture">
                                <AutoFeaturePanel featureId="texturing" groupFilter="main" />
                                <AutoFeaturePanel featureId="texturing" groupFilter="mapping" />
                                <AutoFeaturePanel featureId="texturing" groupFilter="transform" />
                                <AutoFeaturePanel
                                    featureId="coloring"
                                    groupFilter="layer1_bottom"
                                    excludeParams={['twist']}
                                />
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            <SectionDivider />

            {/* === LAYER 2 === */}
            <div className="flex flex-col">
                {/* Header */}
                <div
                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                        layer2Open ? 'bg-neutral-800' : 'bg-neutral-800/50 hover:bg-white/5'
                    }`}
                    onClick={() => setActiveLayer(layer2Open ? 'layer1' : 'layer2')}
                >
                    <span className={`text-[10px] font-bold ${layer2Active ? 'text-gray-300' : 'text-gray-600'}`}>
                        Layer 2
                    </span>
                    {!layer2Open && !layer2Active && <span className="text-[8px] text-gray-600">off</span>}
                    <GradientPreview stops={coloring.gradient2} />
                    <svg className={`w-3 h-3 text-gray-500 transition-transform ${layer2Open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>

                {/* Content */}
                {layer2Open && (
                    <div className="flex flex-col animate-fade-in" data-help-id="grad.layer2">
                        <AutoFeaturePanel featureId="coloring" groupFilter="layer2_top" />
                        <AutoFeaturePanel featureId="coloring" groupFilter="layer2_grad" />
                        <AutoFeaturePanel featureId="coloring" groupFilter="layer2_hist" />

                        {(coloring.mode2 === 6.0 || coloring.mode2 === 8.0) && (
                            <AutoFeaturePanel featureId="coloring" whitelistParams={['escape']} />
                        )}

                        <AutoFeaturePanel featureId="coloring" groupFilter="layer2_bottom" />
                    </div>
                )}
            </div>

            <SectionDivider />

            {/* === NOISE (LAYER 3) === */}
            <div className="flex flex-col">
                {/* Header */}
                <div
                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                        noiseOpen ? 'bg-neutral-800' : 'bg-neutral-800/50 hover:bg-white/5'
                    }`}
                    onClick={() => setNoiseOpen(!noiseOpen)}
                >
                    <span className={`text-[10px] font-bold ${(coloring.layer3Strength ?? 0) > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                        Noise
                    </span>
                    {!noiseOpen && (coloring.layer3Strength ?? 0) === 0 && <span className="text-[8px] text-gray-600">off</span>}
                    <div className="flex-1" />
                    <svg className={`w-3 h-3 text-gray-500 transition-transform ${noiseOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>

                {/* Content */}
                {noiseOpen && (
                    <div className="flex flex-col animate-fade-in" data-help-id="grad.noise">
                        <AutoFeaturePanel featureId="coloring" groupFilter="noise" />
                    </div>
                )}
            </div>
        </div>
    );
};
