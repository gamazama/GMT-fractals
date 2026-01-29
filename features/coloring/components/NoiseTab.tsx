
import React from 'react';
import { FractalState, FractalActions } from '../../../types';
import { useFractalStore } from '../../../store/fractalStore';
import { collectHelpIds } from '../../../utils/helpUtils';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';

export const NoiseTab = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);

    const handleHeaderContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    return (
        <div className="flex flex-col" data-help-id="grad.noise">
            <div className="t-section-header" onContextMenu={handleHeaderContextMenu}>
                <div>
                    <label className="text-[10px] text-green-400 font-bold uppercase tracking-widest block mb-1">Procedural 3d noise</label>
                    <p className="text-[9px] text-gray-500 font-normal normal-case tracking-normal">Adds texture and surface detail.</p>
                </div>
            </div>
            
            <div className="p-1">
                <AutoFeaturePanel featureId="coloring" groupFilter="noise" />
            </div>
        </div>
    );
};
