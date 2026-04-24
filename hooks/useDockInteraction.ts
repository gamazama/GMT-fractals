
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EngineActions } from '../types';

interface DockInteractionProps {
    isDocked: boolean;
    isMinimized: boolean;
    actions: EngineActions;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export const useDockInteraction = ({ isDocked, isMinimized, actions, onDragStart, onDragEnd }: DockInteractionProps) => {
    const [dockPos, setDockPos] = useState<{x: number, y: number} | null>(null);
    const [dockHeight, setDockHeight] = useState<number>(window.innerHeight - 100);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number, hasMoved: boolean } | null>(null);
    const resizeRef = useRef<{ startY: number, startH: number } | null>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (isDocked) {
            if ((e.target as HTMLElement).closest('button')) return;
            return;
        }

        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if ((e.target as HTMLElement).closest('button')) return;

        const dock = (e.currentTarget as HTMLElement).parentElement;
        if (!dock) return;
        
        const rect = dock.getBoundingClientRect();
        const initialX = rect.left;
        const initialY = rect.top;
        
        setDockPos({ x: initialX, y: initialY });
        setIsDragging(true);
        if (onDragStart) onDragStart();
        
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX,
            initialY,
            hasMoved: false
        };
        
        const onMove = (ev: PointerEvent) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.hasMoved = true;
            setDockPos({ 
                x: dragRef.current.initialX + dx, 
                y: dragRef.current.initialY + dy 
            });
        };
        
        const onUp = () => {
            setIsDragging(false);
            if (onDragEnd) onDragEnd();
            
            dragRef.current = null;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [isDocked, actions, onDragStart, onDragEnd]);

    const handleResizeDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation();
        setIsResizing(true);
        resizeRef.current = { startY: e.clientY, startH: dockHeight };
        
        const move = (ev: PointerEvent) => {
            if(!resizeRef.current) return;
            setDockHeight(Math.max(200, resizeRef.current.startH + (ev.clientY - resizeRef.current.startY)));
        };
        
        const up = () => {
            setIsResizing(false);
            resizeRef.current = null;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }, [dockHeight]);
    
    // Explicit setter for when re-docking
    const resetPosition = useCallback(() => {
        setDockPos(null);
    }, []);

    return {
        dockPos,
        dockHeight,
        isDragging,
        isResizing,
        handlePointerDown,
        handleResizeDown,
        resetPosition
    };
};