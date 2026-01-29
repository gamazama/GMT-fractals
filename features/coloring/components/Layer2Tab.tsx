
import React, { useEffect } from 'react';
import { FractalState, FractalActions } from '../../../types';
import { useFractalStore } from '../../../store/fractalStore';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';

export const Layer2Tab = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
    const setHistogramLayer = useFractalStore(s => s.setHistogramLayer);
    
    const coloring = (state as any).coloring;

    useEffect(() => {
        setHistogramLayer(1);
    }, [setHistogramLayer]);
    
    if (!coloring) return null;

    return (
        <div className="flex flex-col" data-help-id="grad.layer2">
             {/* 1. Gradient */}
             <AutoFeaturePanel featureId="coloring" groupFilter="layer2_grad" />
            
             {/* 2. Mode */}
             <AutoFeaturePanel featureId="coloring" groupFilter="layer2_top" />

             {/* 3. Histogram + Sliders (Custom UI) */}
             <div className="mb-2">
                 <AutoFeaturePanel featureId="coloring" groupFilter="layer2_hist" />
             </div>
            
            {/* 4. Controls (Twist, Blend Mode) */}
            <AutoFeaturePanel featureId="coloring" groupFilter="layer2_bottom" />
        </div>
    );
};
