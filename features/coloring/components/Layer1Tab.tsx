
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
            <ToggleSwitch
                value={texturing.active}
                onChange={(v) => setTexturing({ active: v })}
                options={[
                    { label: 'Gradient', value: false },
                    { label: 'Image Texture', value: true }
                ]}
            />

            {!texturing.active ? (
                <div className="flex flex-col">
                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_top" />
                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_grad" />
                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_hist" />
                    <AutoFeaturePanel featureId="coloring" groupFilter="layer1_bottom" />
                </div>
            ) : (
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
            )}
        </>
    );
};
