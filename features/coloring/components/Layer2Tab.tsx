
import React, { useEffect } from 'react';
import { FractalState, FractalActions } from '../../../types';
import { useFractalStore } from '../../../store/fractalStore';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';

export const Layer2Tab = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
    const setHistogramLayer = useFractalStore(s => s.setHistogramLayer);
    
    const coloring = (state as any).coloring;
    const mode2 = coloring?.mode2;

    useEffect(() => {
        setHistogramLayer(1);
    }, [setHistogramLayer]);
    
    if (!coloring) return null;

    return (
        <div className="flex flex-col" data-help-id="grad.layer2">
             <AutoFeaturePanel featureId="coloring" groupFilter="layer2_top" />
             <AutoFeaturePanel featureId="coloring" groupFilter="layer2_grad" />
             <AutoFeaturePanel featureId="coloring" groupFilter="layer2_hist" />

             {/* Escape Radius — only relevant for certain Layer 2 modes */}
             {(mode2 === 6.0 || mode2 === 8.0) && (
                 <AutoFeaturePanel featureId="coloring" whitelistParams={['escape']} />
             )}

            <AutoFeaturePanel featureId="coloring" groupFilter="layer2_bottom" />
        </div>
    );
};
