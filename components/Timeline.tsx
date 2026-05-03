
import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { useEngineStore } from '../store/engineStore';
import { useShortcutScope } from '../engine/plugins/Shortcuts';
import GraphEditor from './GraphEditor';
import { TimelineToolbar } from './timeline/TimelineToolbar';
import { KeyframeInspector } from './timeline/KeyframeInspector';
import { DopeSheet } from './timeline/DopeSheet';
import { BenchProfiler } from '../engine-gmt/utils/BenchProfiler';
import { getKeyframeMenuItems } from './timeline/KeyframeContextMenu'; 
import { TIMELINE_SIDEBAR_WIDTH } from '../data/constants';
import { Track } from '../types';
import { ContextMenuItem } from '../types/help';

interface TimelineProps {
    onClose: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ onClose }) => {
    // Narrow per-field subscriptions instead of `useAnimationStore()` (full
    // store sub). The animationStore receives ~60 no-op `set()` calls per
    // second; with the destructured full sub Timeline.tsx re-rendered every
    // RAF (241 commits per 240 RAFs idle) and DopeSheet/GraphEditor inherited
    // the work — bench-perf-timeline showed 15ms/commit dope-idle = 3.7s of
    // React work per 4s scenario, dropping wkrFps from 60 → 50. With narrow
    // selectors the per-RAF noise no longer reaches this tree.
    //
    // Action fns are stable slice-init refs — read lazily via `getState()`
    // at call time to avoid re-binding handlers on every render.
    const isPlaying           = useAnimationStore((s) => s.isPlaying);
    const currentFrame        = useAnimationStore((s) => s.currentFrame);
    const durationFrames      = useAnimationStore((s) => s.durationFrames);
    const sequence            = useAnimationStore((s) => s.sequence);
    const selectedTrackIds    = useAnimationStore((s) => s.selectedTrackIds);
    const selectedKeyframeIds = useAnimationStore((s) => s.selectedKeyframeIds);
    const clipboard           = useAnimationStore((s) => s.clipboard);
    // Actions — stable refs, no subscription needed.
    const updateKeyframes        = (...a: Parameters<ReturnType<typeof useAnimationStore.getState>['updateKeyframes']>) =>
        useAnimationStore.getState().updateKeyframes(...a);
    const setTangents            = (m: 'Auto' | 'Split' | 'Unified' | 'Aligned' | 'Ease') =>
        useAnimationStore.getState().setTangents(m);
    const deleteSelectedKeyframes = () => useAnimationStore.getState().deleteSelectedKeyframes();
    const snapshot               = () => useAnimationStore.getState().snapshot();
    const copySelectedKeyframes  = () => useAnimationStore.getState().copySelectedKeyframes();
    const pasteKeyframes         = (frame: number) => useAnimationStore.getState().pasteKeyframes(frame);
    const duplicateSelection     = () => useAnimationStore.getState().duplicateSelection();
    const loopSelection          = (times: number) => useAnimationStore.getState().loopSelection(times);
    const setIsScrubbing         = (v: boolean) => useAnimationStore.getState().setIsScrubbing(v);

    const openGlobalMenu = useEngineStore(s => s.openContextMenu);
    const setIsTimelineHovered = useEngineStore(s => s.setIsTimelineHovered);
    const isTimelineHovered = useEngineStore(s => s.isTimelineHovered);

    // Push the 'timeline-hover' shortcut scope while the cursor is over
    // the timeline. The Undo plugin registers Mod+Z / Mod+Y under this
    // scope at priority 10, so when active they shadow the global undo
    // and route to undo('animation') instead — independent stack from
    // param/scene undos.
    useShortcutScope('timeline-hover', isTimelineHovered);

    // Reset hover/scrub flags on unmount so they can't get stuck if the timeline
    // closes while the mouse is inside it or while a drag is in progress.
    useEffect(() => {
        return () => {
            setIsTimelineHovered(false);
            setIsScrubbing(false);
        };
    }, []);

    const [mode, setMode] = useState<'DopeSheet' | 'Graph'>('DopeSheet');
    // Expose setMode + a heavy-state seed hook so debug/bench-perf-timeline.mts
    // can drive Dope/Graph switching and inject a pre-seeded sequence
    // without simulating 20 s of mouse-record. Stable refs across renders;
    // teardown clears the globals so they don't leak between mounts.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        (window as any).__timelineSetMode = setMode;
        return () => { delete (window as any).__timelineSetMode; };
    }, []);
    const [panelHeight, setPanelHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(false);
    const [frameWidth, setFrameWidth] = useState(8); 
    
    const [scrollLeft, setScrollLeft] = useState(0);
    const [viewportWidth, setViewportWidth] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Decoupled Visibility State for Graph
    const [visibleGraphTracks, setVisibleGraphTracks] = useState<string[]>([]);
    
    // Always visible to allow global actions
    const isInspectorVisible = true;

    // Logic: When switching to Graph Mode, if nothing is "Visible", populate based on selection or all.
    useEffect(() => {
        if (mode === 'Graph') {
            // If we have a selection, make those the visible set. 
            // If no selection, show EVERYTHING (Context).
            // Only do this if the set is currently empty to avoid wiping manual config.
            if (visibleGraphTracks.length === 0) {
                if (selectedTrackIds.length > 0) {
                    setVisibleGraphTracks([...selectedTrackIds]);
                } else {
                    // Show all non-hidden tracks
                    const allIds = (Object.values(sequence.tracks) as Track[])
                        .filter(t => !t.hidden)
                        .map(t => t.id);
                    setVisibleGraphTracks(allIds);
                }
            }
        }
    }, [mode, selectedTrackIds.length, sequence.tracks]); // Depend on length change to not thrash

    // Sync scroll state when switching modes
    useEffect(() => {
        if (mode === 'DopeSheet' && scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollLeft;
        }
    }, [mode, scrollLeft]);

    // Auto-scroll logic — read scrollLeft via ref to avoid re-trigger cycle
    const scrollLeftRef = useRef(scrollLeft);
    scrollLeftRef.current = scrollLeft;

    useEffect(() => {
        if (!isPlaying || !scrollContainerRef.current) return;

        const containerWidth = scrollContainerRef.current.clientWidth;
        const playheadPos = TIMELINE_SIDEBAR_WIDTH + currentFrame * frameWidth;
        const currentScroll = scrollLeftRef.current;

        const visibleStart = currentScroll + TIMELINE_SIDEBAR_WIDTH;
        const visibleEnd = currentScroll + containerWidth;

        const isOffscreenRight = playheadPos > visibleEnd;
        const isOffscreenLeft = playheadPos < visibleStart;

        if (isOffscreenRight || isOffscreenLeft) {
             const newScroll = playheadPos - (containerWidth / 2);

             if (mode === 'DopeSheet') {
                scrollContainerRef.current.scrollLeft = Math.max(0, newScroll);
             } else {
                setScrollLeft(Math.max(0, newScroll));
             }
        }
    }, [currentFrame, isPlaying, mode, frameWidth]);

    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setViewportWidth(entry.contentRect.width);
            }
        });
        observer.observe(scrollContainerRef.current);
        setViewportWidth(scrollContainerRef.current.clientWidth);
        return () => observer.disconnect();
    }, []); 

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (mode === 'DopeSheet') {
            setScrollLeft(e.currentTarget.scrollLeft);
        }
    };

    const handleNavigatorZoom = (val: number, type: 'factor' | 'absolute' = 'factor') => {
        let newWidth = frameWidth;
        if (type === 'factor') newWidth = frameWidth * val;
        else newWidth = val;
        
        newWidth = Math.max(1, Math.min(200, newWidth));
        setFrameWidth(newWidth);
    };

    // --- CONTEXT MENUS ---

    const handleKeyContextMenu = (e: React.MouseEvent, trackId: string, keyId: string, interp: string, broken?: boolean, auto?: boolean) => {
        e.preventDefault();
        
        const actions = {
            updateInterp: (newInterp: 'Linear' | 'Step' | 'Bezier') => {
                snapshot();
                const targetIds = selectedKeyframeIds.length > 0 ? selectedKeyframeIds : [`${trackId}::${keyId}`];
                const updates = targetIds.map(id => {
                    const [tid, kid] = id.split('::');
                    return { trackId: tid, keyId: kid, patch: { interpolation: newInterp } };
                });
                updateKeyframes(updates);
            },
            setTangents: (mode: 'Auto' | 'Split' | 'Unified' | 'Aligned' | 'Ease') => setTangents(mode),
            deleteKeys: deleteSelectedKeyframes,
            copyKeys: copySelectedKeyframes,
            pasteKeys: () => pasteKeyframes(currentFrame), // Paste at current playhead position
            duplicateKeys: duplicateSelection,
            loopKeys: (times: number) => loopSelection(times)
        };

        const items = getKeyframeMenuItems(interp, broken, auto, actions, selectedKeyframeIds.length, !!clipboard);
        openGlobalMenu(e.clientX, e.clientY, items, ['ui.timeline']);
    };

    const handleDopeSheetCanvasMenu = (e: React.MouseEvent, frame: number) => {
        e.preventDefault();
        const items: ContextMenuItem[] = [
            { label: 'Timeline Actions', action: () => {}, isHeader: true },
            { 
                label: `Copy Selected (${selectedKeyframeIds.length})`, 
                action: copySelectedKeyframes, 
                disabled: selectedKeyframeIds.length === 0 
            },
            { 
                label: 'Paste Keys Here', 
                action: () => pasteKeyframes(frame), 
                disabled: !clipboard 
            },
            {
                label: 'Duplicate Selection Here',
                action: () => {
                    copySelectedKeyframes();
                    pasteKeyframes(frame);
                },
                disabled: selectedKeyframeIds.length === 0
            },
            { label: 'View', action: () => {}, isHeader: true },
            {
                label: 'Fit View (Duration)',
                action: () => {
                    // Calculate frame width to fit duration in viewport
                    const availWidth = viewportWidth - TIMELINE_SIDEBAR_WIDTH;
                    const newFrameWidth = availWidth / (durationFrames + 10); // +10 padding
                    handleNavigatorZoom(newFrameWidth, 'absolute');
                    setScrollLeft(0);
                    if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
                }
            },
            {
                label: 'Reset Zoom (8px)',
                action: () => {
                    handleNavigatorZoom(8, 'absolute');
                }
            }
        ];
        openGlobalMenu(e.clientX, e.clientY, items, ['ui.timeline']);
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (isResizing) {
                const newHeight = window.innerHeight - e.clientY;
                setPanelHeight(Math.max(150, Math.min(window.innerHeight * 0.8, newHeight)));
            }
        };
        const onUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isResizing]);

    const timelineAreaWidth = (durationFrames + 20) * frameWidth;
    const totalContentWidth = TIMELINE_SIDEBAR_WIDTH + timelineAreaWidth;

    return (
        <div 
            className="flex-shrink-0 bg-black/95 border-t border-white/10 flex flex-col z-40 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.5)] relative backdrop-blur-md"
            style={{ height: panelHeight }}
            data-help-id="ui.timeline"
            onMouseEnter={() => setIsTimelineHovered(true)}
            onMouseLeave={() => setIsTimelineHovered(false)}
        >
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div 
                className="absolute top-[-4px] left-0 right-0 h-3 cursor-row-resize z-[100] group flex items-center justify-center"
                onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); document.body.style.cursor = 'row-resize'; }}
            >
                <div className="w-full h-px bg-cyan-500/0 group-hover:bg-cyan-500/50 transition-colors" />
                <div className="absolute w-16 h-1 bg-gray-600 rounded-full group-hover:bg-cyan-400 opacity-50 group-hover:opacity-100 transition-all" />
            </div>

            <div className="flex flex-col flex-1 overflow-hidden h-full">
                
                <TimelineToolbar 
                    mode={mode} 
                    setMode={setMode} 
                    totalContentWidth={totalContentWidth} 
                    viewportWidth={viewportWidth} 
                    scrollLeft={scrollLeft} 
                    onScroll={(px) => { 
                        setScrollLeft(px);
                        if(scrollContainerRef.current && mode === 'DopeSheet') {
                            scrollContainerRef.current.scrollLeft = px; 
                        }
                    }} 
                    onZoom={handleNavigatorZoom}
                    onClose={onClose}
                    containerRef={mode === 'DopeSheet' ? scrollContainerRef : undefined}
                    frameWidth={frameWidth}
                    durationFrames={durationFrames}
                    inspectorVisible={isInspectorVisible}
                />

                <div className="flex flex-1 overflow-hidden">
                    {/* Changed bg-transparent to bg-[#080808] */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[#080808] relative">
                        {mode === 'DopeSheet' ? (
                            <BenchProfiler id="Timeline:DopeSheet">
                                <div
                                    ref={scrollContainerRef}
                                    onScroll={handleScroll}
                                    className="flex-1 overflow-auto bg-transparent no-scrollbar relative"
                                >
                                    <DopeSheet
                                        frameWidth={frameWidth}
                                        totalContentWidth={totalContentWidth}
                                        scrollContainerRef={scrollContainerRef}
                                        onContextMenu={handleKeyContextMenu}
                                        onCanvasContextMenu={handleDopeSheetCanvasMenu}
                                        scrollLeft={scrollLeft}
                                        visibleWidth={viewportWidth}
                                        visibleGraphTracks={visibleGraphTracks}
                                        setVisibleGraphTracks={setVisibleGraphTracks}
                                    />
                                </div>
                            </BenchProfiler>
                        ) : (
                            <BenchProfiler id="Timeline:Graph">
                                <div ref={scrollContainerRef} className="flex-1 bg-transparent relative overflow-hidden">
                                    <GraphEditor
                                        // Graph now receives the decoupled VISIBLE tracks list
                                        trackIds={visibleGraphTracks}
                                        setVisibleTracks={setVisibleGraphTracks}
                                        width={viewportWidth}
                                        height={panelHeight - 32}
                                        scrollLeft={scrollLeft}
                                        frameWidth={frameWidth}
                                        sidebarWidth={TIMELINE_SIDEBAR_WIDTH}
                                        onSetScroll={setScrollLeft}
                                        onSetFrameWidth={setFrameWidth}
                                        onContextMenu={(e, tid, kid, interp) => {
                                            const track = sequence.tracks[tid];
                                            const k = track?.keyframes.find(kf => kf.id === kid);
                                            handleKeyContextMenu(e, tid, kid, interp, k?.brokenTangents, k?.autoTangent);
                                        }}
                                    />
                                </div>
                            </BenchProfiler>
                        )}
                    </div>
                    
                    <KeyframeInspector />
                </div>
            </div>
        </div>
    );
};

export default Timeline;
