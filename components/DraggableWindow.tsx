
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, ResizeHandleIcon, DragHandleIcon } from './Icons';
import { useFractalStore } from '../store/fractalStore';

export interface DraggableWindowProps {
    id?: string;
    title?: string;
    children: React.ReactNode;
    
    // Standalone Props
    position?: { x: number, y: number };
    onPositionChange?: (pos: { x: number, y: number }) => void;
    size?: { width: number, height: number };
    onSizeChange?: (size: { width: number, height: number }) => void;
    onClose?: () => void;
    disableClose?: boolean;
    zIndex?: number;
    
    initialPos?: { x: number, y: number };
    initialSize?: { width: number, height: number };
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({ 
    id, title, children,
    position, onPositionChange,
    size, onSizeChange,
    onClose, disableClose, zIndex,
    initialPos, initialSize
}) => {
    const { panels, setFloatPosition, setFloatSize, togglePanel, startPanelDrag } = useFractalStore();
    
    // Determine mode
    const isManaged = !!id;
    const panel = id ? panels[id] : null;

    // Local state for standalone mode or temporary drag state
    const [internalPos, setInternalPos] = useState(initialPos || { x: 100, y: 100 });
    const [internalSize, setInternalSize] = useState(initialSize || { width: 300, height: 200 });

    // Computed effective values
    const effectivePos = isManaged 
        ? (panel?.floatPos || { x: 100, y: 100 })
        : (position || internalPos);
        
    const effectiveSize = isManaged
        ? (panel?.floatSize || { width: 320, height: 400 })
        : (size || internalSize);

    // Refs for drag logic
    const posRef = useRef(effectivePos);
    const sizeRef = useRef(effectiveSize);
    const dragStartRef = useRef<{ x: number, y: number, startX: number, startY: number } | null>(null);
    const resizeStartRef = useRef<{ x: number, y: number, startW: number, startH: number } | null>(null);

    // Sync refs
    useEffect(() => { posRef.current = effectivePos; }, [effectivePos.x, effectivePos.y]);
    useEffect(() => { sizeRef.current = effectiveSize; }, [effectiveSize.width, effectiveSize.height]);

    // Managed: Check visibility
    if (isManaged && (!panel || !panel.isOpen || panel.location !== 'float')) return null;
    
    const displayTitle = title || (panel ? panel.id : "Window");
    const displayZ = zIndex || (isManaged ? 100 : 200);

    const handleClose = () => {
        if (onClose) onClose();
        else if (isManaged && id) {
            // Special logic for Feature Panels: Closing them turns off the switch
            const state = useFractalStore.getState();
            const actions = state as any;
            if (id === 'Audio') actions.setAudio({ isEnabled: false });
            else if (id === 'Drawing') actions.setDrawing({ enabled: false });
            else if (id === 'Engine') actions.setEngineSettings({ showEngineTab: false });
            else if (id === 'Sonification') actions.setSonification({ isEnabled: false });
            togglePanel(id, false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        dragStartRef.current = { x: e.clientX, y: e.clientY, startX: posRef.current.x, startY: posRef.current.y };
        
        const onMove = (ev: MouseEvent) => {
            if (!dragStartRef.current) return;
            const dx = ev.clientX - dragStartRef.current.x;
            const dy = ev.clientY - dragStartRef.current.y;
            const newPos = { x: dragStartRef.current.startX + dx, y: dragStartRef.current.startY + dy };
            
            if (onPositionChange) onPositionChange(newPos);
            else if (isManaged && id) setFloatPosition(id, newPos.x, newPos.y);
            else setInternalPos(newPos);
            
            posRef.current = newPos;
        };
        
        const onUp = () => {
            dragStartRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleResizeDown = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        resizeStartRef.current = { x: e.clientX, y: e.clientY, startW: sizeRef.current.width, startH: sizeRef.current.height };
        
        const onMove = (ev: MouseEvent) => {
            if (!resizeStartRef.current) return;
            const dx = ev.clientX - resizeStartRef.current.x;
            const dy = ev.clientY - resizeStartRef.current.y;
            const newSize = { 
                width: Math.max(200, resizeStartRef.current.startW + dx), 
                height: Math.max(150, resizeStartRef.current.startH + dy) 
            };
            
            if (onSizeChange) onSizeChange(newSize);
            else if (isManaged && id) setFloatSize(id, newSize.width, newSize.height);
            else setInternalSize(newSize);
            
            sizeRef.current = newSize;
        };
        
        const onUp = () => {
            resizeStartRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return createPortal(
        <div 
            className="fixed glass-panel flex flex-col overflow-hidden animate-pop-in shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
            style={{ 
                left: effectivePos.x, 
                top: effectivePos.y, 
                width: effectiveSize.width, 
                height: effectiveSize.height,
                maxHeight: '90vh',
                zIndex: displayZ
            }}
        >
            <div 
                onMouseDown={handleMouseDown}
                className="panel-header cursor-move flex items-center justify-between px-2 py-1.5 bg-gray-800/90 border-b border-white/10"
            >
                <div className="flex items-center gap-2">
                     {isManaged && (
                         <div 
                            className="cursor-grab text-gray-500 hover:text-white"
                            onMouseDown={(e) => {
                                 e.stopPropagation();
                                 if (id) startPanelDrag(id);
                            }}
                         >
                             <DragHandleIcon />
                         </div>
                     )}
                     <span className="t-label text-gray-200">{displayTitle}</span>
                </div>
                
                {(!disableClose && (onClose || (isManaged && !panel?.isCore))) && (
                    <button onClick={handleClose} className="icon-btn" title="Close">
                        <CloseIcon />
                    </button>
                )}
            </div>
            
            <div className="p-3 overflow-y-auto overflow-x-hidden custom-scroll flex-1 relative bg-black/80 backdrop-blur-md">
                {children}
            </div>

            <div 
                onMouseDown={handleResizeDown}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 touch-none text-gray-500"
            >
                <ResizeHandleIcon />
            </div>
        </div>,
        document.body
    );
};
export default DraggableWindow;