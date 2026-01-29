
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, ResizeHandleIcon, DockIcon } from './Icons'; // Ensure DockIcon is imported

interface DraggableWindowProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    initialPos?: { x: number; y: number };
    initialSize?: { width: number; height: number };
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    onPositionChange?: (pos: { x: number; y: number }) => void;
    onSizeChange?: (size: { width: number; height: number }) => void;
    disableClose?: boolean;
    zIndex?: number;
    actionType?: 'close' | 'dock'; // New prop
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({ 
    title, 
    children, 
    onClose, 
    initialPos = { x: 100, y: 100 },
    initialSize = { width: 320, height: 400 },
    position,
    size,
    onPositionChange,
    onSizeChange,
    disableClose = false,
    zIndex = 100,
    actionType = 'close'
}) => {
    const [internalPos, setInternalPos] = useState(initialPos);
    const [internalSize, setInternalSize] = useState(initialSize);
    
    const effectivePos = position || internalPos;
    const effectiveSize = size || internalSize;

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    
    const dragStartRef = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
    const resizeStartRef = useRef({ x: 0, y: 0, winW: 0, winH: 0 });
    
    useEffect(() => {
        if (!isDragging) return;
        const onPointerMove = (e: PointerEvent) => {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            const newPos = { 
                x: dragStartRef.current.winX + dx, 
                y: dragStartRef.current.winY + dy 
            };
            if (onPositionChange) onPositionChange(newPos);
            else setInternalPos(newPos);
        };
        const onPointerUp = () => setIsDragging(false);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [isDragging, onPositionChange]);

    useEffect(() => {
        if (!isResizing) return;
        const onPointerMove = (e: PointerEvent) => {
            const dx = e.clientX - resizeStartRef.current.x;
            const dy = e.clientY - resizeStartRef.current.y;
            const newSize = { 
                width: Math.max(200, resizeStartRef.current.winW + dx), 
                height: Math.max(150, resizeStartRef.current.winH + dy) 
            };
            if (onSizeChange) onSizeChange(newSize);
            else setInternalSize(newSize);
        };
        const onPointerUp = () => setIsResizing(false);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [isResizing, onSizeChange]);

    return createPortal(
        <div 
            className="fixed glass-panel flex flex-col overflow-hidden animate-pop-in transition-[height] duration-300 ease-out"
            style={{ 
                left: effectivePos.x, 
                top: effectivePos.y, 
                width: effectiveSize.width, 
                height: effectiveSize.height,
                maxHeight: '90vh',
                touchAction: 'none',
                zIndex: zIndex
            }}
        >
            <div 
                onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    setIsDragging(true);
                    dragStartRef.current = { x: e.clientX, y: e.clientY, winX: effectivePos.x, winY: effectivePos.y };
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                className="panel-header cursor-move"
            >
                <span className="t-label flex items-center gap-1.5 text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_cyan]"></span>
                    {title}
                </span>
                <button 
                    onClick={(e) => {
                        if (disableClose) return;
                        e.stopPropagation();
                        onClose();
                    }} 
                    disabled={disableClose}
                    className={`icon-btn ${disableClose ? 'text-gray-700 cursor-not-allowed hover:bg-transparent hover:text-gray-700' : ''}`}
                    title={actionType === 'dock' ? "Dock Panel" : "Close"}
                >
                    {actionType === 'dock' ? <DockIcon /> : <CloseIcon />}
                </button>
            </div>
            
            <div className="p-3 overflow-y-auto overflow-x-hidden custom-scroll flex-1" style={{ touchAction: 'pan-y' }}>
                {children}
            </div>

            <div 
                onPointerDown={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    setIsResizing(true);
                    resizeStartRef.current = { x: e.clientX, y: e.clientY, winW: effectiveSize.width, winH: effectiveSize.height };
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 touch-none text-gray-500"
            >
                <ResizeHandleIcon />
            </div>
        </div>,
        document.body
    );
};

export default DraggableWindow;
