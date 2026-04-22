
import { GraphViewTransform, frameToPixel, valueToPixel, pixelToFrame, pixelToValue, getGridStep, getTimeGridSteps, THEME } from './GraphUtils';
import { AnimationSequence, Track, Keyframe } from '../types';
import { calculateSoftFalloff, evaluateTrackValue } from './timelineUtils';
import { GRAPH_LEFT_GUTTER_WIDTH, GRAPH_RULER_HEIGHT } from '../data/constants';

export const TRACK_COLORS = [
    '#22d3ee', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'
];

export const LEFT_GUTTER_WIDTH = GRAPH_LEFT_GUTTER_WIDTH;
export const RULER_HEIGHT = GRAPH_RULER_HEIGHT;

interface GraphRenderProps {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    view: GraphViewTransform;
    sequence: AnimationSequence;
    trackIds: string[];
    currentFrame: number;
    durationFrames: number;
    selectedKeyframeIds: string[];
    selectionBox: { x: number, y: number, w: number, h: number } | null;
    normalized: boolean;
    trackRanges: Record<string, { min: number, max: number, span: number }>;
    softSelectionEnabled: boolean;
    softSelectionRadius: number;
    softSelectionType: any; 
    softInteraction: { isAdjusting: boolean, anchorKey: string | null };
    highlightedTracks: Set<string>;
}

let _limitPattern: CanvasPattern | null = null;

const getLimitPattern = (ctx: CanvasRenderingContext2D) => {
    if (_limitPattern) return _limitPattern;
    
    const size = 20;
    const pCanvas = document.createElement('canvas');
    pCanvas.width = size;
    pCanvas.height = size;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
        pCtx.strokeStyle = "rgba(0,0,0,0.3)";
        pCtx.lineWidth = 10;
        pCtx.lineCap = 'butt';
        
        pCtx.beginPath();
        pCtx.moveTo(-10, 10);
        pCtx.lineTo(10, -10);
        pCtx.moveTo(0, 20);
        pCtx.lineTo(20, 0);
        pCtx.moveTo(10, 30);
        pCtx.lineTo(30, 10);
        pCtx.stroke();
    }
    
    _limitPattern = ctx.createPattern(pCanvas, 'repeat');
    return _limitPattern;
};

const getSoftWeight = (targetKeyId: string, targetFrame: number, trackId: string, props: GraphRenderProps) => {
    if (!props.softSelectionEnabled || props.softSelectionRadius <= 0) return 0;
    
    let maxWeight = 0;
    
    props.selectedKeyframeIds.forEach(id => {
        const [tid, kid] = id.split('::');
        if (tid !== trackId) return;
        
        const track = props.sequence.tracks[tid];
        const sourceKey = track?.keyframes.find(k => k.id === kid);
        
        if (sourceKey) {
            const dist = Math.abs(targetFrame - sourceKey.frame);
            if (dist < props.softSelectionRadius) {
                const weight = calculateSoftFalloff(dist, props.softSelectionRadius, props.softSelectionType);
                if (weight > maxWeight) maxWeight = weight;
            }
        }
    });
    
    return maxWeight;
};

const drawPostBehavior = (
    ctx: CanvasRenderingContext2D,
    view: GraphViewTransform,
    track: Track,
    firstKey: Keyframe,
    lastKey: Keyframe,
    width: number,
    v2p: (val: number) => number, // Pre-bound value mapper
    frameToPx: (f: number) => number,
    pxToFrame: (px: number) => number
) => {
    const behavior = track.postBehavior || 'Hold';
    const startPx = frameToPx(lastKey.frame);
    
    // Optimization: If curve is off-screen left, don't draw
    if (startPx > width) return;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.5;
    ctx.moveTo(Math.max(LEFT_GUTTER_WIDTH, startPx), v2p(lastKey.value));

    // Case 1: Simple Lines (Hold / Continue)
    if (behavior === 'Hold') {
        const endY = v2p(lastKey.value);
        ctx.lineTo(width, endY);
    } 
    else if (behavior === 'Continue') {
        // Calculate Slope
        let slope = 0;
        const keys = track.keyframes;
        if (keys.length > 1) {
            const prev = keys[keys.length - 2];
            
            if (lastKey.interpolation === 'Linear') {
                slope = (lastKey.value - prev.value) / (lastKey.frame - prev.frame);
            } else if (lastKey.interpolation === 'Bezier') {
                // Use left tangent (incoming) to project outgoing if right tangent doesn't exist or is default
                // In AnimationEngine we prioritized Left Tangent slope for "Continue" to imply momentum
                if (lastKey.leftTangent && Math.abs(lastKey.leftTangent.x) > 0.001) {
                    slope = lastKey.leftTangent.y / lastKey.leftTangent.x;
                } else {
                    slope = (lastKey.value - prev.value) / (lastKey.frame - prev.frame);
                }
            }
        }

        const endFrame = pxToFrame(width);
        const endVal = lastKey.value + slope * (endFrame - lastKey.frame);
        ctx.lineTo(width, v2p(endVal));
    }
    // Case 2: Sampling (Loop / PingPong / OffsetLoop)
    else {
        const duration = lastKey.frame - firstKey.frame;
        if (duration > 0.001) {
            const stepPx = 5; // Pixel step for sampling
            const isRotation = track.id.startsWith('camera.rotation');
            
            // Start from the visible edge or the key, whichever is later
            const drawStartPx = Math.max(startPx, LEFT_GUTTER_WIDTH);
            
            ctx.moveTo(drawStartPx, v2p(lastKey.value)); // Ensure path starts correctly if clipped
            
            for (let px = drawStartPx; px < width + stepPx; px += stepPx) {
                const frame = pxToFrame(px);
                
                // Math replicated from AnimationEngine.ts
                const timeSinceEnd = frame - lastKey.frame;
                const cycleCount = Math.floor(timeSinceEnd / duration) + 1;
                const localFrameOffset = timeSinceEnd % duration;
                
                let val = 0;

                if (behavior === 'Loop' || behavior === 'OffsetLoop') {
                     const localFrame = firstKey.frame + localFrameOffset;
                     val = evaluateTrackValue(track.keyframes, localFrame, isRotation);
                     
                     if (behavior === 'OffsetLoop') {
                         const diff = lastKey.value - firstKey.value;
                         val += diff * cycleCount;
                     }
                }
                else if (behavior === 'PingPong') {
                     const isReversed = cycleCount % 2 === 1;
                     if (isReversed) {
                         const reversedFrame = lastKey.frame - localFrameOffset;
                         val = evaluateTrackValue(track.keyframes, reversedFrame, isRotation);
                     } else {
                         const localFrame = firstKey.frame + localFrameOffset;
                         val = evaluateTrackValue(track.keyframes, localFrame, isRotation);
                     }
                }
                
                ctx.lineTo(px, v2p(val));
            }
        } else {
             // Fallback for 0 duration loops
             const endY = v2p(lastKey.value);
             ctx.lineTo(width, endY);
        }
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
};

export const drawGraph = (props: GraphRenderProps) => {
    const { 
        ctx, width, height, view, sequence, trackIds, currentFrame, durationFrames,
        selectedKeyframeIds, selectionBox, normalized, trackRanges,
        softSelectionEnabled, softSelectionRadius, softInteraction, highlightedTracks 
    } = props;

    const frameToCanvasPixel = (f: number) => frameToPixel(f, view) + LEFT_GUTTER_WIDTH;
    const canvasPixelToFrame = (px: number) => pixelToFrame(px - LEFT_GUTTER_WIDTH, view);
    
    const getLocalY = (val: number, tid: string) => {
        if (!normalized) return val;
        const r = trackRanges[tid];
        if (!r) return 0.5;
        return (val - r.min) / r.span; 
    };

    const v2p = (val: number, tid: string) => {
        if (normalized) {
            const norm = getLocalY(val, tid);
            return valueToPixel(norm, view);
        }
        return valueToPixel(val, view);
    };

    ctx.fillStyle = THEME.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 1;
    const graphTop = RULER_HEIGHT;
    const startFrame = Math.floor(view.panX);
    const endFrame = Math.ceil(pixelToFrame(width - LEFT_GUTTER_WIDTH, view)); 
    
    ctx.textAlign = "left";
    
    const { textStep, lineStep } = getTimeGridSteps(view.scaleX);
    const firstGridFrame = Math.floor(startFrame / lineStep) * lineStep;
    
    for (let f = firstGridFrame; f <= endFrame; f += lineStep) {
        const x = frameToCanvasPixel(f);
        if (x < LEFT_GUTTER_WIDTH) continue;
        
        ctx.beginPath();
        ctx.strokeStyle = f === 0 ? THEME.zeroLineColor : THEME.gridColor;
        ctx.globalAlpha = (f % textStep === 0) ? 0.3 : 0.1;
        ctx.moveTo(x, graphTop);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    if (normalized) {
        const y0 = valueToPixel(0, view);
        const y1 = valueToPixel(1, view);
        ctx.strokeStyle = '#444';
        ctx.beginPath(); ctx.moveTo(LEFT_GUTTER_WIDTH, y0); ctx.lineTo(width, y0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(LEFT_GUTTER_WIDTH, y1); ctx.lineTo(width, y1); ctx.stroke();
    } else {
        const valStep = getGridStep(view.scaleY, 40);
        const minVal = pixelToValue(height, view); 
        const maxVal = pixelToValue(0, view); 
        const firstVal = Math.floor(minVal / valStep) * valStep;
        
        for (let v = firstVal; v <= maxVal; v += valStep) {
            const y = valueToPixel(v, view);
            if (y < graphTop) continue; 
            ctx.beginPath();
            ctx.strokeStyle = Math.abs(v) < 0.000001 ? THEME.zeroLineColor : THEME.gridColor;
            ctx.moveTo(LEFT_GUTTER_WIDTH, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            if (y > graphTop + 10 && y < height - 10) {
                 ctx.fillText(v.toString(), LEFT_GUTTER_WIDTH - 4, y + 3);
            }
        }
    }
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(LEFT_GUTTER_WIDTH, graphTop, width - LEFT_GUTTER_WIDTH, height - graphTop);
    ctx.clip();

    trackIds.forEach((tid, idx) => {
        const track = sequence.tracks[tid];
        if (!track || track.type !== 'float') return;
        
        const color = TRACK_COLORS[idx % TRACK_COLORS.length];
        const keys = track.keyframes;
        const isHighlighted = highlightedTracks.has(tid);
        
        if (keys.length > 0) {
            ctx.strokeStyle = color;
            ctx.lineWidth = isHighlighted ? 3 : 1.5;
            // Curves dimmed if not highlighted
            ctx.globalAlpha = isHighlighted || highlightedTracks.size === 0 ? 1.0 : 0.4;
            
            ctx.beginPath();
            const startX = frameToCanvasPixel(keys[0].frame);
            const startY = v2p(keys[0].value, tid);
            ctx.moveTo(Math.min(startX, LEFT_GUTTER_WIDTH), startY); 
            ctx.lineTo(startX, startY);

            for (let i = 0; i < keys.length - 1; i++) {
                const k1 = keys[i];
                const k2 = keys[i + 1];
                const x1 = frameToCanvasPixel(k1.frame);
                const y1 = v2p(k1.value, tid);
                const x2 = frameToCanvasPixel(k2.frame);
                const y2 = v2p(k2.value, tid);

                if (k1.interpolation === 'Step') {
                    ctx.lineTo(x2, y1); ctx.lineTo(x2, y2);
                } else if (k1.interpolation === 'Linear') {
                    ctx.lineTo(x2, y2);
                } else {
                    let h1x = k1.rightTangent ? k1.rightTangent.x : (k2.frame - k1.frame) * 0.33;
                    let h1y = k1.rightTangent ? k1.rightTangent.y : 0;
                    let h2x = k2.leftTangent ? k2.leftTangent.x : -(k2.frame - k1.frame) * 0.33;
                    let h2y = k2.leftTangent ? k2.leftTangent.y : 0;
                    
                    if (normalized) {
                        const range = trackRanges[tid];
                        if (range) {
                            h1y = h1y / range.span;
                            h2y = h2y / range.span;
                        }
                    }

                    const cp1x = frameToCanvasPixel(k1.frame + h1x);
                    const cp1y = y1 - (h1y * view.scaleY); 
                    
                    const cp2x = frameToCanvasPixel(k2.frame + h2x);
                    const cp2y = y2 - (h2y * view.scaleY);
                    
                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
                }
            }
            const lastK = keys[keys.length - 1];
            ctx.lineTo(frameToCanvasPixel(lastK.frame), v2p(lastK.value, tid));
            ctx.stroke();
            
            // Draw Post Behavior (Extrapolation)
            const firstK = keys[0];
            
            // Only draw behavior if explicitly set to something interesting, OR if it's the default Hold
            // but we want to show it. The spec requested visualising post behavior.
            // Even 'Hold' is a behavior.
            if (track.postBehavior && track.postBehavior !== 'Hold') {
                 // Use a bound v2p function to avoid passing tid everywhere
                 drawPostBehavior(
                     ctx, view, track, firstK, lastK, width, 
                     (val) => v2p(val, tid), 
                     frameToCanvasPixel, canvasPixelToFrame
                 );
            } else if (!track.postBehavior || track.postBehavior === 'Hold') {
                 // Optional: Draw 'Hold' line. It's useful to see where the value stays.
                 drawPostBehavior(
                     ctx, view, track, firstK, lastK, width, 
                     (val) => v2p(val, tid), 
                     frameToCanvasPixel, canvasPixelToFrame
                 );
            }

            // Restore Alpha for Keyframes based on Selection Logic
            ctx.globalAlpha = 1.0;

            keys.forEach(k => {
                const kx = frameToCanvasPixel(k.frame);
                const ky = v2p(k.value, tid);
                const compositeId = `${tid}::${k.id}`;
                const isSelected = selectedKeyframeIds.includes(compositeId);
                const weight = getSoftWeight(k.id, k.frame, tid, props);
                
                if (ky < graphTop - 10 || ky > height + 10 || kx < LEFT_GUTTER_WIDTH - 5) return; 

                // KEY DIMMING LOGIC
                if (isSelected) {
                     ctx.globalAlpha = 1.0; // Selected Keys always full bright
                } else if (isHighlighted) {
                     ctx.globalAlpha = 1.0; // Unselected but on Selected Track = Full
                } else if (highlightedTracks.size === 0) {
                     ctx.globalAlpha = 1.0; // Nothing selected = Everything Context
                } else {
                     ctx.globalAlpha = 0.4; // Unselected Track = Dim
                }

                if (isSelected && k.interpolation === 'Bezier') {
                    ctx.strokeStyle = THEME.handleLineColor;
                    ctx.lineWidth = 1;
                    const range = normalized ? trackRanges[tid] : null;
                    
                    if (k.rightTangent) {
                        const hxVal = k.frame + k.rightTangent.x;
                        const hyVal = normalized && range ? getLocalY(k.value + k.rightTangent.y, tid) : k.value + k.rightTangent.y;
                        const hx = frameToCanvasPixel(hxVal);
                        const hy = valueToPixel(hyVal, view);
                        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(hx, hy); ctx.stroke();
                        ctx.fillStyle = THEME.handleColor; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
                    }
                    if (k.leftTangent) {
                        const hxVal = k.frame + k.leftTangent.x;
                        const hyVal = normalized && range ? getLocalY(k.value + k.leftTangent.y, tid) : k.value + k.leftTangent.y;
                        const hx = frameToCanvasPixel(hxVal);
                        const hy = valueToPixel(hyVal, view);
                        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(hx, hy); ctx.stroke();
                        ctx.fillStyle = THEME.handleColor; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
                    }
                }

                if (isSelected) {
                    ctx.fillStyle = THEME.keySelectedColor;
                } else if (weight > 0) {
                    ctx.fillStyle = `color-mix(in srgb, ${THEME.keyColor} ${Math.round(weight * 100)}%, ${color})`;
                } else {
                    ctx.fillStyle = color;
                }

                if (k.interpolation === 'Step') ctx.fillRect(kx - 4, ky - 4, 8, 8);
                else if (k.interpolation === 'Bezier') {
                    ctx.beginPath(); ctx.arc(kx, ky, 4, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.save(); ctx.translate(kx, ky); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
                }
                
                if (isSelected) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(kx, ky, 6, 0, Math.PI*2); ctx.stroke();
                }
                
                if (softSelectionEnabled && softInteraction.isAdjusting && softInteraction.anchorKey === compositeId) {
                    ctx.globalAlpha = 1.0; // Ensure overlay is visible
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    const rPx = Math.abs(softSelectionRadius) * view.scaleX;
                    ctx.arc(kx, ky, rPx, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    ctx.fillStyle = softSelectionRadius > 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 100, 100, 0.1)';
                    ctx.fill();
                }
            });
            // Reset for next track
            ctx.globalAlpha = 1.0;
        }
    });
    
    ctx.restore();
    
    ctx.fillStyle = '#080808'; 
    ctx.fillRect(LEFT_GUTTER_WIDTH, 0, width, graphTop);
    ctx.beginPath(); ctx.strokeStyle='#444'; ctx.moveTo(LEFT_GUTTER_WIDTH, graphTop); ctx.lineTo(width, graphTop); ctx.stroke();
    
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = '#888';
    
    for (let f = firstGridFrame; f <= endFrame; f += textStep) {
        const x = frameToCanvasPixel(f);
        if (x < LEFT_GUTTER_WIDTH) continue;
        ctx.fillRect(x, graphTop - 8, 1, 8);
        ctx.fillText(f.toString(), x + 4, 2);
    }
    
    ctx.fillStyle = '#080808'; 
    ctx.fillRect(0, 0, LEFT_GUTTER_WIDTH, height);
    ctx.fillStyle = '#374151'; 
    ctx.fillRect(LEFT_GUTTER_WIDTH - 1, 0, 1, height);
    
    ctx.textAlign = "right";
    ctx.font = "9px monospace";
    ctx.fillStyle = "#9ca3af";
    
    if (normalized) {
        const y0 = valueToPixel(0, view);
        const y1 = valueToPixel(1, view);
        ctx.fillText("1.0", LEFT_GUTTER_WIDTH - 4, y1 + 3);
        ctx.fillText("0.0", LEFT_GUTTER_WIDTH - 4, y0 + 3);
    } else {
        const valStep = getGridStep(view.scaleY, 40);
        const minVal = pixelToValue(height, view); 
        const maxVal = pixelToValue(0, view); 
        const firstVal = Math.floor(minVal / valStep) * valStep;
        
        for (let v = firstVal; v <= maxVal; v += valStep) {
            const y = valueToPixel(v, view);
            if (y < graphTop) continue; 
            ctx.beginPath();
            ctx.strokeStyle = Math.abs(v) < 0.000001 ? THEME.zeroLineColor : THEME.gridColor;
            ctx.moveTo(LEFT_GUTTER_WIDTH, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            if (y > graphTop + 10 && y < height - 10) {
                 ctx.fillText(v.toString(), LEFT_GUTTER_WIDTH - 4, y + 3);
            }
        }
    }

    const limitX = frameToCanvasPixel(durationFrames);
    if (limitX < width) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(limitX, 0, width - limitX, height);
        
        const pattern = getLimitPattern(ctx);
        if (pattern) {
            ctx.save();
            ctx.translate(limitX, 0); 
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, width - limitX, height);
            ctx.restore();
        }
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(limitX, 0); ctx.lineTo(limitX, height); ctx.stroke();
    }
    
    if (selectionBox) {
        ctx.fillStyle = 'rgba(0, 200, 255, 0.1)';
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
        ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
    }
    
    const phX = frameToCanvasPixel(currentFrame);
    
    if (phX < LEFT_GUTTER_WIDTH) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(LEFT_GUTTER_WIDTH + 8, height / 2 - 6);
        ctx.lineTo(LEFT_GUTTER_WIDTH + 2, height / 2);
        ctx.lineTo(LEFT_GUTTER_WIDTH + 8, height / 2 + 6);
        ctx.fill();
    } else if (phX > width) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(width - 8, height / 2 - 6);
        ctx.lineTo(width - 2, height / 2);
        ctx.lineTo(width - 8, height / 2 + 6);
        ctx.fill();
    } else {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath(); 
        ctx.moveTo(phX, 0); 
        ctx.lineTo(phX, height); 
        ctx.stroke();
        
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); 
        ctx.moveTo(phX, 0); 
        ctx.lineTo(phX + 5, 0); 
        ctx.lineTo(phX + 5, 12); 
        ctx.lineTo(phX, 18); 
        ctx.lineTo(phX - 5, 12); 
        ctx.lineTo(phX - 5, 0); 
        ctx.fill();
    }
};
