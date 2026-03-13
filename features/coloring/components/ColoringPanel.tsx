
import React, { useState } from 'react';
import { FractalState, FractalActions } from '../../../types';
import { useFractalStore } from '../../../store/fractalStore';
import { collectHelpIds } from '../../../utils/helpUtils';
import { TabBar } from '../../../components/TabBar';
import { Layer1Tab } from './Layer1Tab';
import { Layer2Tab } from './Layer2Tab';
import { NoiseTab } from './NoiseTab';

export const ColoringPanel = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
  const [activeTab, setActiveTab] = useState<'Layer 1' | 'Layer 2' | 'Noise'>('Layer 1');
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
    <div className="animate-fade-in -mx-4 -mt-4" data-help-id="panel.gradient">
        {/* Tab Strip - Flush to edges */}
        <div onContextMenu={handleHeaderContextMenu}>
            <TabBar
                tabs={['Layer 1', 'Layer 2', 'Noise'] as const}
                active={activeTab}
                onChange={setActiveTab}
            />
        </div>

        <div className="flex flex-col">
            {activeTab === 'Layer 1' && <Layer1Tab state={state} actions={actions} />}
            {activeTab === 'Layer 2' && <Layer2Tab state={state} actions={actions} />}
            {activeTab === 'Noise' && <NoiseTab state={state} actions={actions} />}
        </div>
    </div>
  );
};
