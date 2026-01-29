
import React, { useRef, useEffect } from 'react';

interface TimeNavigatorProps {
    totalWidth: number;
    viewportWidth: number;
    scrollLeft: number;
    onScroll: (px: number) => void;
    onZoom: (val: number, type: 'factor' | 'absolute') => void;
    containerRef?: React.RefObject<HTMLDivElement>;
    frameWidth: number;
    durationFrames: number;
}

const SIDEBAR_WIDTH = 220;

export const TimeNavigator: React.FC<TimeNavigatorProps> = ({ 
    totalWidth, 
    viewportWidth, 
    scrollLeft, 
    onScroll,
    onZoom,
    containerRef,
    frameWidth,
    durationFrames
}) => {
    const navRef = useRef<HTMLDivElement>(null);
    const dragData = useRef<{ 
        type: 'scroll' | 'resizeLeft' | 'resizeRight', 
        startX: number, 
        startThumbLeft: number, 
        startThumbWidth: number, 
        navWidth: number,
        startScrollLeft: number 
    } | null>(null);
    
    // Safety
    const safeTotal = Math.max(totalWidth, 1);
    
    // Raw percentages (can be OOB)
    const rawViewPct = (viewportWidth / safeTotal) * 100;
    const rawOffsetPct = (scrollLeft / safeTotal) * 100;
    
    // Clamped visuals
    const viewPct = Math.min(100, Math.max(5, rawViewPct));
    const offsetPct = Math.max(0, Math.min(100 - viewPct, rawOffsetPct));

    // Handle Wheel Zoom on Minimap
    useEffect(() => {
        const el = navRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const sensitivity = 0.001;
            const factor = 1 + (e.deltaY * sensitivity);
            onZoom(factor, 'factor');
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [onZoom]);

    const handleMouseDown = (e: React.MouseEvent, type: 'scroll' | 'resizeLeft' | 'resizeRight') => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!navRef.current) return;
        const navRect = navRef.current.getBoundingClientRect();
        
        // Calculate visual thumb props from current state
        const currentThumbWidth = (viewPct / 100) * navRect.width;
        const currentThumbLeft = (offsetPct / 100) * navRect.width;

        dragData.current = { 
            type, 
            startX: e.clientX,
            startThumbLeft: currentThumbLeft,
            startThumbWidth: currentThumbWidth,
            navWidth: navRect.width,
            startScrollLeft: scrollLeft
        };
        
        if (type === 'scroll') {
            updateScroll(e.clientX);
        }
        
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    };

    const handleGlobalMove = (e: MouseEvent) => {
        if (!dragData.current || !navRef.current) return;
        
        const { type, startX, startThumbWidth, navWidth, startThumbLeft } = dragData.current;
        const dx = e.clientX - startX;
        
        if (type === 'scroll') {
            updateScroll(e.clientX);
        } 
        else if (type === 'resizeRight' || type === 'resizeLeft') {
            // 1. Calculate Target Visual Geometry
            let targetThumbWidth = startThumbWidth;
            let targetThumbLeft = startThumbLeft;

            if (type === 'resizeRight') {
                targetThumbWidth += dx;
            } else {
                targetThumbWidth -= dx;
                targetThumbLeft += dx;
            }
            
            // Clamp min visual width (approx 20px)
            const minW = 20;
            if (targetThumbWidth < minW) {
                const diff = minW - targetThumbWidth;
                targetThumbWidth = minW;
                if (type === 'resizeLeft') targetThumbLeft -= diff; // Correct left shift if clamped
            }
            // Clamp max (full width)
            if (targetThumbWidth > navWidth) targetThumbWidth = navWidth;
            if (targetThumbLeft < 0) targetThumbLeft = 0;

            // 2. Derive Fractal Params (Frame Width & Scroll) from Geometry
            // Logic: ThumbWidth / NavWidth = ViewportWidth / TotalContentWidth
            // TotalContentWidth = (ViewportWidth * NavWidth) / ThumbWidth
            
            const targetTotalWidth = (viewportWidth * navWidth) / targetThumbWidth;
            
            // TotalWidth = SIDEBAR + (Duration + 20) * FrameWidth
            // FrameWidth = (TotalWidth - SIDEBAR) / (Duration + 20)
            const timelineArea = Math.max(100, targetTotalWidth - SIDEBAR_WIDTH);
            const targetFrameWidth = timelineArea / (durationFrames + 20);
            
            // Apply Zoom
            onZoom(targetFrameWidth, 'absolute');
            
            // 3. Apply Scroll (if needed)
            // ThumbLeft / NavWidth = ScrollLeft / TotalContentWidth
            // ScrollLeft = (ThumbLeft / NavWidth) * TotalContentWidth
            if (type === 'resizeLeft') {
                const ratio = targetThumbLeft / navWidth;
                const targetScroll = ratio * targetTotalWidth;
                
                if (containerRef && containerRef.current) {
                    containerRef.current.scrollLeft = targetScroll;
                } else {
                    onScroll(targetScroll);
                }
            }
        }
    };

    const handleGlobalUp = () => {
        dragData.current = null;
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    };

    const updateScroll = (clientX: number) => {
        if (!navRef.current) return;
        const rect = navRef.current.getBoundingClientRect();
        const relX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        
        // Center-based scrolling
        const thumbHalfWidth = (viewportWidth / safeTotal) * rect.width / 2;
        const thumbLeftPx = relX - thumbHalfWidth;
        const ratio = thumbLeftPx / rect.width;
        
        const targetScroll = ratio * safeTotal;
        
        if (containerRef && containerRef.current) {
            containerRef.current.scrollLeft = Math.max(0, targetScroll);
        } else {
            onScroll(Math.max(0, targetScroll));
        }
    };

    return (
        <div 
            ref={navRef}
            className="flex-1 h-3 bg-black border border-gray-700 rounded mx-4 relative select-none group cursor-pointer"
            onMouseDown={(e) => handleMouseDown(e, 'scroll')}
            title="Drag bar to Scroll, Drag handles or Wheel to Zoom"
        >
            <div className="absolute inset-0 bg-gray-800/30 rounded" />
            
            {/* The Thumb */}
            <div 
                className="absolute top-0 bottom-0 bg-gray-600 border border-gray-500 rounded-sm opacity-80 group-hover:bg-cyan-600 group-hover:border-cyan-400 transition-colors cursor-grab active:cursor-grabbing"
                style={{ 
                    left: `${offsetPct}%`, 
                    width: `${viewPct}%` 
                }}
                onMouseDown={(e) => handleMouseDown(e, 'scroll')}
            >
                {/* Left Resize Handle */}
                <div 
                    className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-ew-resize hover:bg-white/50 z-10"
                    onMouseDown={(e) => handleMouseDown(e, 'resizeLeft')}
                />
                
                {/* Right Resize Handle */}
                <div 
                    className="absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-ew-resize hover:bg-white/50 z-10"
                    onMouseDown={(e) => handleMouseDown(e, 'resizeRight')}
                />
            </div>
        </div>
    );
};
