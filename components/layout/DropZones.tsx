
import React, { useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';

export const DropZones: React.FC = () => {
    const { 
        draggingPanelId, movePanel, endPanelDrag, cancelPanelDrag, panels,
        leftDockSize, rightDockSize, isLeftDockCollapsed, isRightDockCollapsed
    } = useFractalStore();

    // Global Cancel Handler (catches drops outside the browser or valid zones)
    useEffect(() => {
        if (!draggingPanelId) return;

        const handleGlobalUp = () => {
            // If mouse up hits window (not stopped by DropZone or Tab), it's a cancel.
            // We revert any live-preview changes made during the drag.
            cancelPanelDrag();
        };

        window.addEventListener('mouseup', handleGlobalUp);
        return () => window.removeEventListener('mouseup', handleGlobalUp);
    }, [draggingPanelId, cancelPanelDrag]);

    if (!draggingPanelId) return null;
    
    const panel = panels[draggingPanelId];
    const sourceLocation = panel ? panel.location : null;

    const handleDrop = (e: React.MouseEvent, zone: 'left' | 'right' | 'float') => {
        e.stopPropagation(); 
        movePanel(draggingPanelId, zone);
        endPanelDrag(); // Commit the move
    };

    // Calculate exact geometry of the side zones to match the docks underneath
    const leftW = isLeftDockCollapsed ? 32 : leftDockSize;
    const rightW = isRightDockCollapsed ? 32 : rightDockSize;

    return (
        <div className="fixed inset-0 z-[1000] flex pointer-events-none">
            {/* Left Zone */}
            <div 
                style={{ width: leftW }}
                className={`h-full flex items-center justify-center transition-all duration-200 border-r-2
                    ${sourceLocation !== 'left' 
                        ? 'bg-cyan-900/40 border-cyan-500/50 pointer-events-auto cursor-copy' 
                        : 'border-transparent pointer-events-none' /* Passthrough to dock for reordering */
                    }`}
                onMouseUp={(e) => { if(sourceLocation !== 'left') handleDrop(e, 'left'); }}
            >
                {sourceLocation !== 'left' && (
                    <div className="bg-black/80 px-4 py-2 rounded border border-cyan-500/50 text-cyan-200 font-bold uppercase tracking-widest text-sm shadow-xl backdrop-blur-md">
                        Dock Left
                    </div>
                )}
            </div>
            
            {/* Float Zone (Center) */}
            <div 
                className={`flex-1 h-full flex items-center justify-center transition-all duration-200
                    ${sourceLocation !== 'float' 
                        ? 'bg-purple-900/20 hover:bg-purple-900/30 border-x-2 border-purple-500/30 pointer-events-auto cursor-copy' 
                        : 'pointer-events-none'
                    }`}
                onMouseUp={(e) => { if(sourceLocation !== 'float') handleDrop(e, 'float'); }}
            >
                {sourceLocation !== 'float' && (
                    <div className="bg-black/80 px-4 py-2 rounded border border-purple-500/50 text-purple-200 font-bold uppercase tracking-widest text-sm shadow-xl backdrop-blur-md">
                        Float Window
                    </div>
                )}
            </div>

            {/* Right Zone */}
            <div 
                style={{ width: rightW }}
                className={`h-full flex items-center justify-center transition-all duration-200 border-l-2
                    ${sourceLocation !== 'right' 
                        ? 'bg-cyan-900/40 border-cyan-500/50 pointer-events-auto cursor-copy' 
                        : 'border-transparent pointer-events-none' /* Passthrough to dock */
                    }`}
                onMouseUp={(e) => { if(sourceLocation !== 'right') handleDrop(e, 'right'); }}
            >
                {sourceLocation !== 'right' && (
                    <div className="bg-black/80 px-4 py-2 rounded border border-cyan-500/50 text-cyan-200 font-bold uppercase tracking-widest text-sm shadow-xl backdrop-blur-md">
                        Dock Right
                    </div>
                )}
            </div>
        </div>
    );
};
