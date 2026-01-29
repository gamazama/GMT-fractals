
import React, { useRef, useEffect } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { animationEngine } from '../../engine/AnimationEngine';
import { getTimeGridSteps } from '../../utils/GraphUtils';
import { TIMELINE_SIDEBAR_WIDTH, TIMELINE_RULER_HEIGHT } from '../../data/constants';

interface TimelineRulerProps {
    FRAME_WIDTH: number;
    durationFrames: number;
    scrollLeft: number;
    visibleWidth: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({ FRAME_WIDTH, durationFrames, scrollLeft, visibleWidth }) => {
    const rulerRef = useRef<HTMLCanvasElement>(null);
    const { currentFrame, seek, setIsScrubbing } = useAnimationStore();

    // The canvas should fill the visible timeline area (viewport - sidebar)
    // We add a small buffer to prevent flickering at edges
    const canvasWidth = Math.max(1, visibleWidth - TIMELINE_SIDEBAR_WIDTH);

    useEffect(() => {
        const canvas = rulerRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasWidth * dpr;
        canvas.height = 24 * dpr;
        
        // Reset transform to ensure clean state
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        ctx.fillStyle = '#080808'; 
        ctx.fillRect(0, 0, canvasWidth, 24);
        
        ctx.save();
        // Translate context to match the scroll position
        // Since we counter-translate the DOM element by +scrollLeft to keep it in view,
        // we must translate the drawing context by -scrollLeft to align the time grid.
        ctx.translate(-scrollLeft, 0);

        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const { textStep, lineStep } = getTimeGridSteps(FRAME_WIDTH);
        
        // Calculate render range based on scroll position
        const startFrame = Math.max(0, Math.floor(scrollLeft / FRAME_WIDTH));
        const endFrame = Math.ceil((scrollLeft + canvasWidth) / FRAME_WIDTH);
        
        // Snap to grid for consistent rendering
        const renderStart = Math.floor(startFrame / lineStep) * lineStep;
        
        for (let i = renderStart; i <= endFrame; i += lineStep) {
            const x = i * FRAME_WIDTH;
            
            if (i % textStep === 0) {
                ctx.fillStyle = '#9ca3af'; // gray-400
                ctx.fillRect(x, 0, 1, 12);
                ctx.fillText(i.toString(), x + 4, 2);
            } else {
                ctx.fillStyle = '#374151'; // gray-700
                ctx.fillRect(x, 16, 1, 8);
            }
        }
        
        // Draw bottom border
        ctx.fillStyle = '#374151';
        ctx.fillRect(scrollLeft, 23, canvasWidth, 1);
        
        // Draw End of Sequence marker
        const limitPx = durationFrames * FRAME_WIDTH;
        if (limitPx < (scrollLeft + canvasWidth)) {
            const widthToFill = (scrollLeft + canvasWidth) - limitPx + 500;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(limitPx, 0, widthToFill, 24);

            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = 10;
            patternCanvas.height = 10;
            const pCtx = patternCanvas.getContext('2d');
            if (pCtx) {
                pCtx.strokeStyle = 'rgba(255,255,255,0.1)';
                pCtx.lineWidth = 1;
                pCtx.beginPath();
                pCtx.moveTo(0, 10); pCtx.lineTo(10, 0);
                pCtx.stroke();
                const pattern = ctx.createPattern(patternCanvas, 'repeat');
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(limitPx, 0, widthToFill, 24); 
                }
            }
            
            ctx.fillStyle = '#666';
            ctx.fillRect(limitPx, 0, 1, 24);
        }

        // Playhead (Ruler portion)
        const playheadX = currentFrame * FRAME_WIDTH;
        // Only draw if within current view buffer (expanded slightly)
        if (playheadX >= scrollLeft - 10 && playheadX <= scrollLeft + canvasWidth + 10) {
             ctx.fillStyle = '#ef4444';
             ctx.beginPath();
             ctx.moveTo(playheadX - 6, 0);
             ctx.lineTo(playheadX + 6, 0);
             ctx.lineTo(playheadX, 8);
             ctx.fill();
        }

        ctx.restore();

    }, [durationFrames, FRAME_WIDTH, canvasWidth, scrollLeft, currentFrame]);

    const handleScrubStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isMiddleClick = e.button === 1;
        setIsScrubbing(true); 
        
        const rect = e.currentTarget.getBoundingClientRect();
        
        const update = (clientX: number) => {
            const localX = clientX - rect.left;
            const absoluteX = localX + scrollLeft;
            
            const f = Math.max(0, Math.round(absoluteX / FRAME_WIDTH));
            
            seek(f);
            if (!isMiddleClick) {
                animationEngine.scrub(f);
            }
        };

        update(e.clientX);

        const move = (ev: MouseEvent) => update(ev.clientX);
        const up = () => {
            setIsScrubbing(false);
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    return (
        <div 
            className="flex bg-black/20 border-b border-white/10 z-30 sticky top-0"
            style={{ height: TIMELINE_RULER_HEIGHT }}
        >
            {/* Fixed Sidebar Header */}
            <div 
                className="sticky left-0 z-30 w-[220px] bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center px-2 text-[9px] text-gray-500 font-bold uppercase tracking-widest"
                style={{ width: TIMELINE_SIDEBAR_WIDTH }}
            >
                Tracks
            </div>
            
            {/* 
               The canvas container is physically moved by `scrollLeft` to stay in the viewport
               while the parent container scrolls. This creates a "fixed" effect without
               using position: fixed or sticky, which can be jittery in some browsers.
            */}
            <div 
                className="relative cursor-ew-resize overflow-hidden z-20" 
                style={{ 
                    transform: `translateX(${scrollLeft}px)`,
                    width: canvasWidth 
                }}
                onMouseDown={handleScrubStart}
            >
                <canvas 
                    ref={rulerRef} 
                    style={{ width: canvasWidth, height: 24, display: 'block' }} 
                />
            </div>
        </div>
    );
};
