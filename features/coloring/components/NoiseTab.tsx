
import React from 'react';
import { FractalState, FractalActions } from '../../../types';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';

export const NoiseTab = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
    return (
        <div className="flex flex-col" data-help-id="grad.noise">
            <AutoFeaturePanel featureId="coloring" groupFilter="noise" />
        </div>
    );
};
