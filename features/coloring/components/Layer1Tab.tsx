
import React, { useEffect } from 'react';
import { FractalState, FractalActions } from '../../../types';
import ToggleSwitch from '../../../components/ToggleSwitch';
import { useFractalStore } from '../../../store/fractalStore';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';

export const Layer1Tab = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
    const setHistogramLayer = useFractalStore(s => s.setHistogramLayer);
    
    // Connect to features
    const texturing = (state as any).texturing;
    const coloring = (state as any).coloring;
    
    const setTexturing = (actions as any).setTexturing;

    useEffect(() => {
        setHistogramLayer(0);
    }, [setHistogramLayer]);

    if (!texturing || !coloring) return null;

    return (
        <>
            {/* Source Toggle */}
            <div className="p-2 bg-gray-900/50 border-b border-white/5">
                <ToggleSwitch 
                    value={texturing.active}
                    onChange={(v) => setTexturing({ active: v })}
                    options={[
                        { label: 'Gradient', value: false },
                        { label: 'Image Texture', value: true }
                    ]}
                />
            </div>

            {!texturing.active ? (
                <div className="flex flex-col">
                    {/* 1. Gradient Strip */}
                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_grad" />
                    
                    {/* 2. Mode Selection */}
                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_top" />

                    {/* 3. Histogram + Repeats/Phase (Now handled by Custom UI in Coloring Feature) */}
                    <div className="mb-2">
                         <AutoFeaturePanel featureId="coloring" groupFilter="layer1_hist" />
                    </div>

                    {/* 4. Extras (Twist, Escape) */}
                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_bottom" />
                </div>
            ) : (
                <div className="p-1 space-y-2" data-help-id="grad.texture">
                    <div className="p-1">
                        <AutoFeaturePanel featureId="texturing" groupFilter="main" />
                    </div>
                    <div className="bg-gray-900/20 px-1 py-2 rounded">
                        <AutoFeaturePanel featureId="texturing" groupFilter="mapping" />
                    </div>
                    <div className="px-1 pb-2">
                        <AutoFeaturePanel featureId="texturing" groupFilter="transform" />
                    </div>
                    
                    {/* Inject Escape Radius slider here (it lives in coloring.layer1_bottom) */}
                    {/* We exclude 'twist' because texture mode handles twists via UV transform or not at all */}
                    <AutoFeaturePanel 
                        featureId="coloring" 
                        groupFilter="layer1_bottom" 
                        excludeParams={['twist']} 
                    />
                </div>
            )}
        </>
    );
};
