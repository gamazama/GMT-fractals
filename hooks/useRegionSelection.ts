import React, { useState, useRef, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';

type DragMode = 'draw' | 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

export const useRegionSelection = (containerRef: React.RefObject<HTMLElement>) => {
    const { isSelectingRegion, setIsSelectingRegion, setRenderRegion, renderRegion } = useFractalStore();
    
    const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
    const [currentPos, setCurrentPos] = useState<{x: number, y: number} | null>(null);
    const [visualRegion, setVisualRegion] = useState<{minX: number, minY: number, maxX: number, maxY: number} | null>(null);
    
    const dragMode = useRef<DragMode>(null);
    const initialRegion = useRef<{minX: number, minY: number, maxX: number, maxY: number} | null>(null);
    const currentDragRegion = useRef<{minX: number, minY: number, maxX: number, maxY: number} | null>(null);

    const getNormPos = (e: MouseEvent, rect: DOMRect) => ({
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    });

    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;

        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const rect = el.getBoundingClientRect();
            const norm = getNormPos(e, rect);

            // 1. Handle Existing Region Drag/Resize
            if (renderRegion && !isSelectingRegion) {
                const handle = target.dataset.handle;
                if (handle || target.closest('.region-box')) {
                    e.stopPropagation();
                    dragMode.current = (handle as DragMode) || 'move';
                    setStartPos({ x: norm.x, y: norm.y });
                    initialRegion.current = { ...renderRegion };
                    setVisualRegion({ ...renderRegion });
                    currentDragRegion.current = { ...renderRegion };
                    return;
                }
            }

            // 2. Handle New Selection
            if (isSelectingRegion) {
                e.stopPropagation();
                dragMode.current = 'draw';
                const pxX = e.clientX - rect.left;
                const pxY = e.clientY - rect.top;
                setStartPos({ x: pxX, y: pxY });
                setCurrentPos({ x: pxX, y: pxY });
            }
        };

        const onMove = (e: MouseEvent) => {
            if (!dragMode.current) return;
            e.stopPropagation(); 
            e.preventDefault();
            
            const rect = el.getBoundingClientRect();

            if (dragMode.current === 'draw') {
                const pxX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                const pxY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                setCurrentPos({ x: pxX, y: pxY });
            } else if (initialRegion.current && startPos) {
                const norm = getNormPos(e, rect);
                const dx = norm.x - startPos.x;
                const dy = (1 - norm.y) - (1 - startPos.y); 
                let newR = { ...initialRegion.current };
                const mode = dragMode.current;

                if (mode === 'move') {
                    const width = newR.maxX - newR.minX;
                    const height = newR.maxY - newR.minY;
                    newR.minX += dx; newR.maxX += dx; newR.minY += dy; newR.maxY += dy;
                    if (newR.minX < 0) { newR.minX = 0; newR.maxX = width; }
                    if (newR.maxX > 1) { newR.maxX = 1; newR.minX = 1 - width; }
                    if (newR.minY < 0) { newR.minY = 0; newR.maxY = height; }
                    if (newR.maxY > 1) { newR.maxY = 1; newR.minY = 1 - height; }
                } else {
                    if (mode?.includes('e')) newR.maxX = Math.min(1, initialRegion.current.maxX + dx);
                    if (mode?.includes('w')) newR.minX = Math.max(0, initialRegion.current.minX + dx);
                    if (mode?.includes('n')) newR.maxY = Math.min(1, initialRegion.current.maxY + dy);
                    if (mode?.includes('s')) newR.minY = Math.max(0, initialRegion.current.minY + dy);
                }
                
                const finalR = { minX: Math.min(newR.minX, newR.maxX), maxX: Math.max(newR.minX, newR.maxX), minY: Math.min(newR.minY, newR.maxY), maxY: Math.max(newR.minY, newR.maxY) };
                if (finalR.maxX - finalR.minX < 0.01) finalR.maxX = finalR.minX + 0.01;
                if (finalR.maxY - finalR.minY < 0.01) finalR.maxY = finalR.minY + 0.01;
                setVisualRegion(finalR); 
                currentDragRegion.current = finalR;
            }
        };

        const onUp = (e: MouseEvent) => {
            if (!dragMode.current) return;
            e.stopPropagation();
            
            if (dragMode.current === 'draw' && startPos && currentPos) {
                const rect = el.getBoundingClientRect();
                const x1 = Math.min(startPos.x, currentPos.x); const x2 = Math.max(startPos.x, currentPos.x);
                const y1 = Math.min(startPos.y, currentPos.y); const y2 = Math.max(startPos.y, currentPos.y);
                const w = x2 - x1; const h = y2 - y1;
                if (w > 10 && h > 10) {
                     const normMinX = x1 / rect.width; const normMaxX = x2 / rect.width;
                     const normMinY = 1.0 - (y2 / rect.height); const normMaxY = 1.0 - (y1 / rect.height);
                     setRenderRegion({ minX: normMinX, minY: normMinY, maxX: normMaxX, maxY: normMaxY });
                }
                setIsSelectingRegion(false);
            } else if (currentDragRegion.current) {
                setRenderRegion(currentDragRegion.current);
            }
            
            dragMode.current = null; 
            setStartPos(null); 
            setCurrentPos(null); 
            initialRegion.current = null; 
            setVisualRegion(null); 
            currentDragRegion.current = null;
        };

        el.addEventListener('mousedown', onDown); 
        window.addEventListener('mousemove', onMove); 
        window.addEventListener('mouseup', onUp);
        return () => { 
            el.removeEventListener('mousedown', onDown); 
            window.removeEventListener('mousemove', onMove); 
            window.removeEventListener('mouseup', onUp); 
        };
    }, [isSelectingRegion, renderRegion, startPos, currentPos, setIsSelectingRegion, setRenderRegion, containerRef]);

    return {
        visualRegion,
        isGhostDragging: !!visualRegion,
        renderRegion,
        isSelectingRegion
    };
};