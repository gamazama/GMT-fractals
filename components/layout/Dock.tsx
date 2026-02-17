
import React, { useRef, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { PanelRouter } from '../PanelRouter';
import { PanelId, DockZone, PanelState } from '../../types';
import { DragHandleIcon, UndockIcon, ChevronLeft, ChevronRight } from '../Icons';
import { collectHelpIds } from '../../utils/helpUtils';
import { AudioState, DrawingState, SonificationState } from '../../features/types';

interface DockProps {
    side: 'left' | 'right';
}

export const Dock: React.FC<DockProps> = ({ side }) => {
    const { 
        panels, 
        activeLeftTab, activeRightTab, 
        togglePanel, movePanel, reorderPanel,
        startPanelDrag, endPanelDrag, draggingPanelId,
        setDockSize, 
        isLeftDockCollapsed, isRightDockCollapsed, setDockCollapsed,
        openContextMenu,
        leftDockSize, rightDockSize,
        formula,
        advancedMode
    } = useFractalStore();
    
    // Access Feature States for Visibility Logic
    const audioState = (useFractalStore.getState() as any).audio as AudioState;
    const drawingState = (useFractalStore.getState() as any).drawing as DrawingState;
    const sonificationState = (useFractalStore.getState() as any).sonification as SonificationState;
    const engineSettings = (useFractalStore.getState() as any).engineSettings;

    const activeTabId = side === 'left' ? activeLeftTab : activeRightTab;
    const isCollapsed = side === 'left' ? isLeftDockCollapsed : isRightDockCollapsed;
    const width = side === 'left' ? leftDockSize : rightDockSize;

    // Filter panels for this dock, sorted by order
    const dockPanels = (Object.values(panels) as PanelState[])
        .filter((p) => {
            if (p.location !== side) return false;
            
            // Conditional Visibility Logic
            if (p.id === 'Graph' && formula !== 'Modular') return false;
            if (p.id === 'Light' && !advancedMode) return false;
            
            // Feature Switches
            if (p.id === 'Audio' && !audioState?.isEnabled) return false;
            if (p.id === 'Drawing' && !drawingState?.enabled) return false;
            if (p.id === 'Engine' && !engineSettings?.showEngineTab) return false;
            if (p.id === 'Sonification' && !sonificationState?.isEnabled) return false;
            
            return true;
        })
        .sort((a, b) => a.order - b.order);

    const resizeRef = useRef<{ startX: number, startW: number } | null>(null);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        resizeRef.current = { startX: e.clientX, startW: width };
        window.addEventListener('mousemove', handleResizeMove);
        window.addEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = 'ew-resize';
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = e.clientX - resizeRef.current.startX;
        const delta = side === 'left' ? dx : -dx;
        const newWidth = Math.max(200, Math.min(800, resizeRef.current.startW + delta));
        setDockSize(side, newWidth);
    };

    const handleResizeEnd = () => {
        resizeRef.current = null;
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
    };
    
    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        const ids = collectHelpIds(e.currentTarget);
        openContextMenu(e.clientX, e.clientY, [], ids);
    };
    
    if (dockPanels.length === 0) return null;

    if (isCollapsed) {
        return (
            <div className={`flex flex-col w-8 bg-black border-${side === 'left' ? 'r' : 'l'} border-white/10 z-40 shrink-0`}>
                 <button 
                    onClick={() => setDockCollapsed(side, false)}
                    className="h-10 flex items-center justify-center text-gray-500 hover:text-white"
                 >
                     {side === 'left' ? <ChevronRight /> : <ChevronLeft />}
                 </button>
                 <div className="flex-1 flex flex-col items-center py-2 gap-2">
                     {dockPanels.map(p => (
                         <div 
                             key={p.id}
                             onClick={() => togglePanel(p.id, true)}
                             className={`w-6 h-6 flex items-center justify-center rounded cursor-pointer ${p.id === activeTabId ? 'bg-cyan-900 text-cyan-400' : 'text-gray-600 hover:bg-white/10'}`}
                             title={p.id}
                         >
                             <span className="text-[10px] font-bold">{p.id.charAt(0)}</span>
                         </div>
                     ))}
                 </div>
            </div>
        );
    }

    return (
        <div 
            className={`flex flex-col bg-[#080808] border-${side === 'left' ? 'r' : 'l'} border-white/10 z-40 shrink-0 transition-all duration-75 relative`}
            style={{ width }}
        >
            {/* Header Tabs - Tighter Layout with reduced gap */}
            <div className="flex flex-wrap gap-0.5 px-0.5 pt-1 bg-black/40 border-b border-white/10 shrink-0 relative items-end">
                {dockPanels.map(p => {
                    const isActive = p.id === activeTabId;
                    return (
                        <button
                            key={p.id}
                            onClick={() => togglePanel(p.id, true)}
                            onContextMenu={(e) => handleContextMenu(e, p.id)}
                            onMouseEnter={() => {
                                // LIVE PREVIEW: Update order while dragging over target
                                if (draggingPanelId && draggingPanelId !== p.id) {
                                    // Check if dragging source is in this same dock to allow reordering
                                    const sourcePanel = panels[draggingPanelId];
                                    if (sourcePanel && sourcePanel.location === side) {
                                        reorderPanel(draggingPanelId, p.id);
                                    }
                                }
                            }}
                            onMouseUp={(e) => {
                                // COMMIT: Just end the drag, the state is already updated live
                                if (draggingPanelId) {
                                    e.stopPropagation();
                                    endPanelDrag();
                                }
                            }}
                            className={`flex items-center gap-0.5 px-1 py-1 text-[9px] font-bold uppercase tracking-normal transition-colors group relative rounded-t-sm
                                ${isActive 
                                    ? 'bg-[#080808] text-cyan-400 border-x border-t border-white/10 z-10 -mb-px pb-2' 
                                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300 border border-transparent'
                                }`
                            }
                        >
                            <div 
                                className={`cursor-move ${isActive ? 'text-gray-600 group-hover:text-cyan-600' : 'text-gray-700 group-hover:text-white'} transition-colors`}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    startPanelDrag(p.id);
                                }}
                            >
                                <div className="transform scale-75 origin-center">
                                    <DragHandleIcon />
                                </div>
                            </div>
                            <span className="truncate max-w-[80px]">{p.id}</span>
                        </button>
                    );
                })}
            </div>

            <button 
                onClick={() => setDockCollapsed(side, true)}
                className="absolute top-1 right-1 p-1 text-gray-600 hover:text-white z-20"
            >
                {side === 'left' ? <ChevronLeft /> : <ChevronRight />}
            </button>

            <div className="flex-1 overflow-y-auto custom-scroll p-4 relative">
                {activeTabId ? (
                     <PanelRouter activeTab={activeTabId} state={useFractalStore.getState()} actions={useFractalStore.getState() as any} onSwitchTab={togglePanel as any} />
                ) : (
                    <div className="flex h-full items-center justify-center text-gray-700 text-xs italic">
                        Select a panel
                    </div>
                )}
            </div>

            <div 
                className={`absolute top-0 bottom-0 w-1 cursor-ew-resize hover:bg-cyan-500/50 transition-colors z-50 ${side === 'left' ? 'right-[-2px]' : 'left-[-2px]'}`}
                onMouseDown={handleResizeStart}
            />
        </div>
    );
};
