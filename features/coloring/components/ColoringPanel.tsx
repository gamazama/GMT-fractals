
import React, { useState } from 'react';
import { FractalState, FractalActions } from '../../../types';
import { useFractalStore } from '../../../store/fractalStore';
import { collectHelpIds } from '../../../utils/helpUtils';
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
        <div className="flex bg-black/40 border-b border-white/10 mb-0" onContextMenu={handleHeaderContextMenu}>
            {(['Layer 1', 'Layer 2', 'Noise'] as const).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                        activeTab === tab 
                        ? 'text-cyan-400 bg-white/5' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                >
                    {tab}
                    {activeTab === tab && (
                        <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    )}
                </button>
            ))}
        </div>

        <div className="flex flex-col">
            {activeTab === 'Layer 1' && <Layer1Tab state={state} actions={actions} />}
            {activeTab === 'Layer 2' && <Layer2Tab state={state} actions={actions} />}
            {activeTab === 'Noise' && <NoiseTab state={state} actions={actions} />}
        </div>
    </div>
  );
};
