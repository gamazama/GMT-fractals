
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { GraphViewTransform, frameToPixel, valueToPixel, pixelToFrame, valueToPixel as v2pH, pixelToValue } from '../utils/GraphUtils';
import { calculateViewBounds } from '../utils/GraphAlgorithms';
import { useFractalStore } from '../store/fractalStore';
import { useGraphInteraction } from '../hooks/useGraphInteraction';
import { useGraphTools } from '../hooks/useGraphTools';
import { GraphSidebar } from './graph/GraphSidebar';
import { GraphToolbar } from './graph/GraphToolbar';
import { GraphCanvas } from './graph/GraphCanvas';
import { WaveIcon, BakeIcon, MagicIcon } from './Icons';
import { GRAPH_LEFT_GUTTER_WIDTH, GRAPH_RULER_HEIGHT } from '../data/constants';
import { ContextMenuItem } from '../types/help';

interface GraphEditorProps {
    trackIds: string[]; // These are VISIBLE tracks
    setVisibleTracks: (ids: string[]) => void;
    width: number;
    height: number;
    normalized?: boolean;
    onContextMenu?: (e: React.MouseEvent, trackId: string, keyId: string, interpolation: string) => void;
    scrollLeft: number;
    frameWidth: number;
    sidebarWidth: number;
    onSetScroll: (px: number) => void;
    onSetFrameWidth: (px: number) => void;
}

const GraphEditor: React.FC<GraphEditorProps> = ({ 
    trackIds, setVisibleTracks, width, height, normalized: propNormalized = false, onContextMenu,
    scrollLeft, frameWidth, sidebarWidth, onSetScroll, onSetFrameWidth
}) => {
    // Container ref for resizing
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Interaction ref (Div wrapper around canvas)
    // We use a Div to capture pointer events reliably even if canvas is re-rendering
    const interactionRef = useRef<HTMLDivElement>(null);

    const { 
        sequence, currentFrame, durationFrames,
        selectedKeyframeIds, selectedTrackIds, selectKeyframe, selectTracks,
        softSelectionEnabled, softSelectionRadius, softSelectionType,
        copySelectedKeyframes, pasteKeyframes, deleteSelectedKeyframes
    } = useAnimationStore();
    
    const { openContextMenu: openGlobalContextMenu } = useFractalStore();
    
    const [viewY, setViewY] = useState({ pan: 0, scale: 50 });
    const [normalized, setNormalized] = useState(propNormalized); 
    
    const canvasWidth = Math.max(10, width - sidebarWidth);
    
    // --- VIEW CALCULATIONS ---
    const view: GraphViewTransform = useMemo(() => {
        const panX = scrollLeft / frameWidth;
        return {
            panX,
            panY: viewY.pan,
            scaleX: frameWidth,
            scaleY: viewY.scale,
            width: canvasWidth, 
            height
        };
    }, [scrollLeft, frameWidth, viewY, canvasWidth, height]);

    const trackRanges = useMemo(() => {
        const ranges: Record<string, { min: number, max: number, span: number }> = {};
        trackIds.forEach(tid => {
            const track = sequence.tracks[tid];
            if (!track || track.keyframes.length === 0) {
                ranges[tid] = { min: 0, max: 1, span: 1 };
                return;
            }
            let min = Infinity, max = -Infinity;
            track.keyframes.forEach(k => {
                if (k.value < min) min = k.value;
                if (k.value > max) max = k.value;
            });
            const span = max - min;
            if (span < 0.00001) { min -= 0.5; max += 0.5; }
            ranges[tid] = { min, max, span: max - min };
        });
        return ranges;
    }, [trackIds, sequence, normalized]);

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
    
    const frameToCanvasPixel = (f: number) => frameToPixel(f, view) + GRAPH_LEFT_GUTTER_WIDTH;
    const canvasPixelToFrame = (px: number) => pixelToFrame(px - GRAPH_LEFT_GUTTER_WIDTH, view);

    // --- INTERACTION HOOK ---
    // Now passing the DIV ref instead of canvas ref
    const { 
        handleMouseDown: onGraphMouseDown, 
        getHit, 
        selectionBox, 
        softInteraction,
        shouldSuppressContextMenu
    } = useGraphInteraction(
        interactionRef, view, trackIds, normalized, trackRanges, v2p, onSetScroll, onSetFrameWidth, setViewY,
        frameToCanvasPixel, canvasPixelToFrame, GRAPH_LEFT_GUTTER_WIDTH
    );

    // --- TOOLS CONTROLLER HOOK ---
    const tools = useGraphTools({
        sequence, trackIds, selectedTrackIds, selectedKeyframeIds, frameWidth,
        view, normalized, trackRanges, v2p, canvasPixelToFrame
    });

    // --- VIEW MANIPULATION (Fit/Normalize) ---
    const applyFit = (bounds: { minV: number, maxV: number, minF: number, maxF: number } | null) => {
        if (!bounds) {
             setViewY({ pan: 0, scale: 50 });
             return;
        }
        
        if (normalized) {
             const availableHeight = height - GRAPH_RULER_HEIGHT - 30;
             const newScaleY = availableHeight / 1.0; 
             setViewY({ pan: 0.5, scale: newScaleY });
        } else {
             const rangeV = Math.max(bounds.maxV - bounds.minV, 0.1);
             const verticalPadding = 40;
             const safeHeight = Math.max(50, height - GRAPH_RULER_HEIGHT - verticalPadding);
             const newScaleY = safeHeight / (rangeV * 1.1);
             
             setViewY({
                 scale: newScaleY,
                 pan: (bounds.minV + bounds.maxV) / 2
             });
        }
        
        const availableWidth = canvasWidth - GRAPH_LEFT_GUTTER_WIDTH;
        
        let rangeF = bounds.maxF - bounds.minF;
        let targetPanX = 0;
        let newScaleX = 1;

        if (rangeF <= 1.0) {
             rangeF = Math.max(durationFrames, 10);
             const padF = rangeF * 0.05; 
             newScaleX = availableWidth / (rangeF + padF * 2);
             targetPanX = -padF;
        } else {
             rangeF = Math.max(rangeF, 10);
             const padF = rangeF * 0.1;
             newScaleX = availableWidth / (rangeF + padF * 2);
             targetPanX = bounds.minF - padF;
        }
        
        onSetFrameWidth(newScaleX);
        onSetScroll(targetPanX * newScaleX);
    };

    const fitView = () => applyFit(calculateViewBounds(trackIds, sequence));

    const fitSelection = () => {
        if (selectedKeyframeIds.length > 0) {
            applyFit(calculateViewBounds(trackIds, sequence, selectedKeyframeIds));
            return;
        }
        const activeSelectedTracks = selectedTrackIds.filter(id => trackIds.includes(id));
        if (activeSelectedTracks.length > 0) {
            applyFit(calculateViewBounds(activeSelectedTracks, sequence));
            return;
        }
        fitView();
    };

    const toggleNormalize = () => {
        if (normalized) {
            const bounds = calculateViewBounds(trackIds, sequence);
            if (bounds) {
                 const rangeV = Math.max(bounds.maxV - bounds.minV, 0.1);
                 const padV = rangeV * 0.2;
                 const newScaleY = (height - GRAPH_RULER_HEIGHT) / (rangeV + padV * 2); 
                 setViewY({ scale: newScaleY, pan: (bounds.minV + bounds.maxV) / 2 });
            }
            setNormalized(false);
        } else {
            const availableHeight = height - GRAPH_RULER_HEIGHT;
            const newScaleY = availableHeight / 1.2; 
            setViewY({ pan: 0.5, scale: newScaleY });
            setNormalized(true);
        }
    };
    
    // Auto-Fit on Load
    const hasFitted = useRef(false);
    useEffect(() => { hasFitted.current = false; }, [trackIds]);
    useEffect(() => {
        if (trackIds.length > 0 && width > 100 && !hasFitted.current) {
             const timer = setTimeout(() => { fitView(); hasFitted.current = true; }, 50);
             return () => clearTimeout(timer);
        }
    }, [trackIds, width]); 
    
    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c') { e.preventDefault(); copySelectedKeyframes(); }
                else if (e.key === 'v') { e.preventDefault(); pasteKeyframes(); }
            } else {
                if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelectedKeyframes(); }
                if (e.key === 'f') { e.preventDefault(); fitSelection(); }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [copySelectedKeyframes, pasteKeyframes, deleteSelectedKeyframes, fitSelection]);

    // --- EVENT HANDLERS ---
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // Ctrl + Click on empty space = Create Keyframe
        if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
             const rect = interactionRef.current?.getBoundingClientRect();
             if (rect) {
                 const mx = e.clientX - rect.left;
                 const my = e.clientY - rect.top;
                 if (!getHit(mx, my)) {
                     tools.createKeyAtMouse(e, rect);
                     return;
                 }
             }
        }
        onGraphMouseDown(e);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        // Prevent default context menu
        e.preventDefault();

        // Check if drag occurred
        if (shouldSuppressContextMenu()) return;

        const rect = interactionRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        const hit = getHit(mx, my);
        
        if (hit && hit.type === 'key' && onContextMenu) {
            // Key Context Menu
            const composite = `${hit.trackId}::${hit.key.id}`;
            if (!selectedKeyframeIds.includes(composite)) {
                selectKeyframe(hit.trackId, hit.key.id, false);
                useAnimationStore.getState().selectTracks([hit.trackId], false);
            }
            onContextMenu(e, hit.trackId, hit.key.id, hit.key.interpolation);
        } else {
            // Canvas Context Menu (Background)
            const mouseFrame = canvasPixelToFrame(mx);
            const safeFrame = Math.max(0, Math.round(mouseFrame));

            const items: ContextMenuItem[] = [
                { label: 'Graph Actions', action: () => {}, isHeader: true },
                {
                    label: 'Create Keyframe Here',
                    action: () => tools.createKeyAtMouse(e, rect)
                },
                {
                    label: 'Paste Keys',
                    action: () => pasteKeyframes(safeFrame),
                    disabled: !useAnimationStore.getState().clipboard
                },
                { label: 'View', action: () => {}, isHeader: true },
                {
                    label: 'Fit View',
                    action: fitView
                },
                {
                    label: 'Reset Zoom',
                    action: () => {
                         setViewY({ pan: 0, scale: 50 });
                         onSetFrameWidth(8);
                    }
                }
            ];
            
            // Removed 'ui.graph' to prevent showing Modular Node Graph help in Timeline Curve Editor
            openGlobalContextMenu(e.clientX, e.clientY, items, ['anim.graph']);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        const rect = interactionRef.current?.getBoundingClientRect();
        if (rect) tools.createKeyAtMouse(e, rect);
    };
    
    // Calculate Highlighted Tracks (Visible AND Selected)
    const highlightedTracks = useMemo(() => {
        const s = new Set<string>();
        selectedTrackIds.forEach(id => {
            if (trackIds.includes(id)) s.add(id);
        });
        return s;
    }, [selectedKeyframeIds, selectedTrackIds, trackIds]);

    return (
        <div className="flex w-full h-full bg-transparent select-none" data-help-id="anim.graph">
            <GraphSidebar 
                visibleTrackIds={trackIds}
                setVisibleTracks={setVisibleTracks}
            />

            <div className="flex-1 relative group overflow-hidden" data-help-id="anim.graph" ref={containerRef}>
                {/* CANVAS VIEW */}
                <div ref={interactionRef}> 
                    <GraphCanvas 
                        width={canvasWidth}
                        height={height}
                        view={view}
                        sequence={sequence}
                        trackIds={trackIds}
                        currentFrame={currentFrame}
                        durationFrames={durationFrames}
                        selectedKeyframeIds={selectedKeyframeIds}
                        selectionBox={selectionBox}
                        normalized={normalized}
                        trackRanges={trackRanges}
                        softSelectionEnabled={softSelectionEnabled}
                        softSelectionRadius={softSelectionRadius}
                        softSelectionType={softSelectionType}
                        softInteraction={softInteraction}
                        highlightedTracks={highlightedTracks}
                        onMouseDown={handleCanvasMouseDown}
                        onContextMenu={handleContextMenu}
                        onDoubleClick={handleDoubleClick}
                    />
                </div>
                
                {/* TOOL FEEDBACK OVERLAYS */}
                {tools.isSmoothing && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-cyan-300 px-3 py-1.5 rounded-full border border-cyan-500/50 text-xs font-bold shadow-xl animate-fade-in z-50 pointer-events-none flex items-center gap-2">
                        <WaveIcon active={true} />
                        <span>{tools.smoothingRadius > 0 ? `Constrained Smooth: ${tools.smoothingRadius.toFixed(1)}` : `Bounce: ${Math.abs(tools.smoothingRadius).toFixed(1)}`}</span>
                    </div>
                )}
                {tools.isBaking && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-purple-300 px-3 py-1.5 rounded-full border border-purple-500/50 text-xs font-bold shadow-xl animate-fade-in z-50 pointer-events-none flex items-center gap-2">
                        <BakeIcon active={true} />
                        <span>Bake Interval: {tools.bakeStep} frames</span>
                    </div>
                )}
                {tools.isSimplifying && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-amber-300 px-3 py-1.5 rounded-full border border-amber-500/50 text-xs font-bold shadow-xl animate-fade-in z-50 pointer-events-none flex items-center gap-2">
                        <MagicIcon active={true} />
                        <span>Fit Strength: {(tools.simplifyStrength * 100).toFixed(0)}%</span>
                    </div>
                )}
                
                {/* TOOLBAR CONTROLLER */}
                <GraphToolbar 
                    normalized={normalized}
                    onToggleNormalize={toggleNormalize}
                    onFitView={fitView}
                    onFitSelection={fitSelection}
                    onApplyEuler={tools.applyEulerFilter}
                    needsEulerFix={tools.checkEulerNeeded()}
                    isBaking={tools.isBaking}
                    onBakeDown={tools.handleBakeDown}
                    isSmoothing={tools.isSmoothing}
                    onSmoothDown={tools.handleSmoothDown}
                    isSimplifying={tools.isSimplifying}
                    onSimplifyDown={tools.handleSimplifyDown}
                />
            </div>
        </div>
    );
};

export default GraphEditor;
