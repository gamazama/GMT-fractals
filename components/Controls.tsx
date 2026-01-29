
import React, { useState, useMemo, useEffect } from 'react';
import { FractalState, FractalActions, Preset, PanelId } from '../types';
import DraggableWindow from './DraggableWindow';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';
import { PanelRouter } from './PanelRouter';
import { ChevronDown, ChevronUp, ChevronLeft, UndockIcon, DockIcon, FloatIcon } from './Icons';
import { useDockInteraction } from '../hooks/useDockInteraction';
import { featureRegistry, ParamCondition } from '../engine/FeatureSystem';

interface ControlsProps {
  state: FractalState;
  actions: FractalActions;
  presets: Preset[];
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Updated evaluator that checks Feature Slice if Root lookup fails
const checkTabVisibility = (condition: ParamCondition | ParamCondition[] | undefined, state: any, featureId?: string): boolean => {
    if (!condition) return true;
    const conds = Array.isArray(condition) ? condition : [condition];
    return conds.every(c => {
        // Recursive OR Check
        if (c.or) {
             return c.or.some(subC => checkTabVisibility(subC, state, featureId));
        }

        let val: any;
        
        if (c.param && c.param.startsWith('$')) {
            // Explicit Global lookup (e.g. $advancedMode)
            val = state[c.param.slice(1)]; 
        } else if (c.param) {
            // 1. Try Path Lookup (e.g. audio.isEnabled)
            if (c.param.includes('.')) {
                const parts = c.param.split('.');
                val = state;
                for(const p of parts) {
                    if (val && val[p] !== undefined) val = val[p];
                    else { val = undefined; break; }
                }
            } else {
                // 2. Try Root Lookup
                val = state[c.param];
                
                // 3. Fallback: Try Feature Slice Lookup (Context Aware)
                if (val === undefined && featureId && state[featureId]) {
                    val = state[featureId][c.param];
                }
            }
        }
        
        if (c.bool !== undefined) return !!val === c.bool;
        if (c.eq !== undefined) return val === c.eq;
        if (c.neq !== undefined) return val !== c.neq;
        return !!val; // Default truthy
    });
};

const Controls: React.FC<ControlsProps> = ({ state, actions }) => {
  const activeTab = useFractalStore(s => s.activeTab);
  const floatingTabs = useFractalStore(s => s.floatingTabs);
  const openGlobalMenu = useFractalStore(s => s.openContextMenu);
  
  const [isMobile, setIsMobile] = useState(false);
  const isMinimized = state.isControlsMinimized;
  const isDocked = state.isControlsDocked;
  const isCurrentlyMobile = state.debugMobileLayout || isMobile;
  const isFlyMobile = isCurrentlyMobile && state.cameraMode === 'Fly';

  const { 
      dockPos, dockHeight, isDragging, handlePointerDown, handleResizeDown, resetPosition 
  } = useDockInteraction({
      isDocked, isMinimized, actions,
      onDragStart: () => {}, onDragEnd: () => {}
  });

  useEffect(() => {
      const checkMobile = () => setIsMobile(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
      if (isCurrentlyMobile && floatingTabs.length > 0) {
          floatingTabs.forEach(t => actions.dockTab(t));
          actions.setIsControlsDocked(true);
      }
  }, [isCurrentlyMobile, floatingTabs, actions]);
  
  useEffect(() => {
      if (isFlyMobile && !isMinimized) actions.setIsControlsMinimized(true);
  }, [isFlyMobile, isMinimized, actions]);
  
  // DYNAMIC TAB GENERATION
  const visibleTabs = useMemo(() => {
      const tabs = featureRegistry.getTabs();
      const tabIds = tabs.map(t => t.label);

      // Add Graph special case
      if (state.formula === 'Modular' && !tabIds.includes('Graph')) {
          tabIds.splice(1, 0, 'Graph');
      }
      
      return tabIds.filter(id => {
          if (id === 'Graph' && state.formula !== 'Modular') return false;
          
          // Check standard registry condition (Includes Drawing and Audio)
          const feat = tabs.find(t => t.label === id);
          if (feat && feat.condition) {
              // Pass the feature ID to allow scoped lookup
              return checkTabVisibility(feat.condition, state, feat.id);
          }
          
          return true;
      }) as PanelId[];

  }, [state]); 

  const undockTab = (id: PanelId) => {
      if (isCurrentlyMobile) return;
      actions.floatTab(id);
      if (activeTab === id) {
          const available = visibleTabs.filter(t => !floatingTabs.includes(t) && t !== id);
          if (available.length > 0) actions.setActiveTab(available[0]);
      }
  };

  const dockTab = (id: PanelId) => {
      actions.dockTab(id);
      actions.setActiveTab(id);
  };

  const handleSwitchTab = (tab: PanelId) => {
      if (floatingTabs.includes(tab)) return;
      actions.setActiveTab(tab);
  };
  
  const availableTabs = visibleTabs.filter(t => !floatingTabs.includes(t));

  const handleContainerContextMenu = (e: React.MouseEvent) => {
      const ids = collectHelpIds(e.currentTarget);
      if (ids.length > 0) {
          e.preventDefault(); e.stopPropagation();
          openGlobalMenu(e.clientX, e.clientY, [], ids);
      }
  };

  const handleTabButtonContextMenu = (e: React.MouseEvent, tab: PanelId) => {
      e.preventDefault(); e.stopPropagation();
      const helpId = `panel.${tab.toLowerCase()}`;
      openGlobalMenu(e.clientX, e.clientY, [], [helpId, 'ui.controls']);
  };

  const dockedStyle: React.CSSProperties = {
      position: 'relative', height: '100%',
      width: activeTab === 'Graph' && !isMinimized ? 600 : 320,
      minWidth: isMinimized ? 40 : (activeTab === 'Graph' ? 600 : 320),
      flexShrink: 0, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 40
  };

  const floatingStyle: React.CSSProperties = isCurrentlyMobile ? {
      position: 'fixed', right: 0, top: 56, bottom: 0, width: 320,
      transform: isMinimized ? 'translateX(320px)' : 'translateX(0)',
      paddingBottom: 'env(safe-area-inset-bottom)'
  } : {
      position: 'fixed', ...(dockPos ? { left: dockPos.x, top: dockPos.y } : { right: 20, top: 70 }),
      width: activeTab === 'Graph' && !isMinimized ? 600 : 320,
      height: isMinimized ? 'auto' : dockHeight, maxHeight: 'calc(100vh - 80px)',
      zIndex: 50, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'
  };

  return (
    <>
      {(floatingTabs as PanelId[]).map((id, index) => (
          <DraggableWindow 
              key={id} 
              title={id} 
              onClose={() => dockTab(id)}
              initialPos={{ x: 100 + index * 30, y: 100 + index * 30 }}
              actionType="dock" 
          >
              <PanelRouter activeTab={id} state={state} actions={actions} onSwitchTab={handleSwitchTab} />
          </DraggableWindow>
      ))}

      {isCurrentlyMobile && isMinimized && !isFlyMobile && (
          <button onClick={() => actions.setIsControlsMinimized(false)} className="fixed right-0 top-1/2 -translate-y-1/2 z-[65] bg-black/80 border-l border-y border-white/20 p-2 rounded-l-xl text-cyan-400 animate-fade-in"><ChevronLeft /></button>
      )}

      {isDocked && isMinimized && !isCurrentlyMobile && (
          <div className="w-10 h-full border-l border-white/10 bg-black/90 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-white/5 transition-colors relative z-40" onClick={() => actions.setIsControlsMinimized(false)}>
              <div className="text-gray-500 hover:text-white transform rotate-90 mt-2"><ChevronUp /></div>
              <div className="flex-1 flex items-center justify-center"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap transform -rotate-90 origin-center select-none">Controls</span></div>
          </div>
      )}

      {(!isMinimized || !isDocked) && (
          <div 
             className={`flex flex-col bg-black/95 backdrop-blur-md text-white shadow-2xl ${isDragging ? 'cursor-grabbing' : ''} ${isCurrentlyMobile ? 'transition-transform duration-300' : ''}`} 
             style={isDocked ? dockedStyle : floatingStyle} 
             data-help-id="ui.controls"
             onPointerDown={(e) => e.stopPropagation()}
          >
            <div className={`h-8 flex items-center justify-between px-3 shrink-0 hover:bg-white/5 transition-colors group relative touch-none ${!isDocked ? 'cursor-move rounded-t-xl' : 'cursor-default'}`} onPointerDown={handlePointerDown}>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isDragging ? 'bg-cyan-300' : 'bg-cyan-500'}`} />
                    {!isCurrentlyMobile && (
                        <div className="flex items-center text-gray-500">
                            {isDocked ? (
                                <button onClick={(e) => { e.stopPropagation(); actions.setIsControlsDocked(false); }} className="p-1 hover:text-white rounded" title="Undock (Float)"><FloatIcon /></button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); actions.setIsControlsDocked(true); resetPosition(); }} className="p-1 hover:text-white rounded" title="Dock to Right"><DockIcon /></button>
                            )}
                        </div>
                    )}
                </div>
                <div className="text-gray-500 group-hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); actions.setIsControlsMinimized(!isMinimized); }}>
                    {isMinimized ? <ChevronDown /> : <ChevronUp />}
                </div>
            </div>

            {!isMinimized && (
                <>
                    <div className="p-1 bg-gray-900/50 flex flex-wrap gap-0.5 shrink-0 touch-none border-b border-white/5" onContextMenu={handleContainerContextMenu} data-help-id="ui.controls">
                        {availableTabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => actions.setActiveTab(tab)}
                            onContextMenu={(e) => handleTabButtonContextMenu(e, tab)}
                            className={`flex-grow flex items-center justify-between px-2 py-2 text-[9px] uppercase font-black tracking-tighter rounded-sm transition-all group ${activeTab === tab ? 'bg-white/10 text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-white border-b-2 border-transparent'}`}
                        >
                            <span>{tab}</span>
                            {!isCurrentlyMobile && activeTab === tab && (
                                <span onClick={(e) => { e.stopPropagation(); undockTab(tab); }} className="ml-1 text-gray-600 hover:text-cyan-400 p-0.5 rounded transition-colors"><UndockIcon /></span>
                            )}
                        </button>
                        ))}
                    </div>

                    <div className="p-4 overflow-y-auto custom-scroll flex-1 relative" style={{ touchAction: 'pan-y' }}>
                        {availableTabs.includes(activeTab) ? (
                            <PanelRouter activeTab={activeTab} state={state} actions={actions} onSwitchTab={handleSwitchTab} />
                        ) : <div className="flex h-full items-center justify-center text-gray-600 text-xs italic">Select a module</div>}
                    </div>
                    
                    {!isDocked && !isCurrentlyMobile && (
                        <div className="h-3 w-full flex items-center justify-center cursor-ns-resize hover:bg-white/10 transition-colors rounded-b-xl" onPointerDown={handleResizeDown}>
                            <div className="w-8 h-1 bg-gray-700 rounded-full" />
                        </div>
                    )}
                </>
            )}
          </div>
      )}
    </>
  );
};

export default Controls;
