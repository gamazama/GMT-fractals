
import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { useFractalStore } from '../store/fractalStore';
import GraphEditor from './GraphEditor';
import { TimelineToolbar } from './timeline/TimelineToolbar';
import { KeyframeInspector } from './timeline/KeyframeInspector';
import { DopeSheet } from './timeline/DopeSheet';
import { getKeyframeMenuItems } from './timeline/KeyframeContextMenu'; 
import { TIMELINE_SIDEBAR_WIDTH } from '../data/constants';
import { Track } from '../types';

interface TimelineProps {
    onClose: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ onClose }) => {
    const { 
        isPlaying, currentFrame, durationFrames, sequence,
        selectedTrackIds, updateKeyframes, setTangents, deleteSelectedKeyframes, snapshot,
        selectedKeyframeIds, clipboard, copySelectedKeyframes, pasteKeyframes, duplicateSelection, loopSelection
    } = useAnimationStore();
    
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    const setIsTimelineHovered = useFractalStore(s => s.setIsTimelineHovered);
    
    const [mode, setMode] = useState<'DopeSheet' | 'Graph'>('DopeSheet');
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

    // Auto-scroll logic
    useEffect(() => {
        if (!isPlaying || !scrollContainerRef.current) return;
        
        const containerWidth = scrollContainerRef.current.clientWidth;
        const playheadPos = TIMELINE_SIDEBAR_WIDTH + currentFrame * frameWidth;
        
        const visibleStart = scrollLeft + TIMELINE_SIDEBAR_WIDTH;
        const visibleEnd = scrollLeft + containerWidth;
        
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
    }, [currentFrame, isPlaying, mode, scrollLeft, frameWidth]);

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

    const handleContextMenu = (e: React.MouseEvent, trackId: string, keyId: string, interp: string, broken?: boolean, auto?: boolean) => {
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
            setTangents: (mode: 'Auto' | 'Split' | 'Unified' | 'Ease') => setTangents(mode),
            deleteKeys: deleteSelectedKeyframes,
            copyKeys: copySelectedKeyframes,
            pasteKeys: () => pasteKeyframes(currentFrame), // Paste at current playhead position
            duplicateKeys: duplicateSelection,
            loopKeys: (times: number) => loopSelection(times)
        };

        const items = getKeyframeMenuItems(interp, broken, auto, actions, selectedKeyframeIds.length, !!clipboard);
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
                            <div 
                                ref={scrollContainerRef}
                                onScroll={handleScroll}
                                className="flex-1 overflow-auto bg-transparent no-scrollbar relative"
                            >
                                <DopeSheet 
                                    frameWidth={frameWidth}
                                    totalContentWidth={totalContentWidth}
                                    scrollContainerRef={scrollContainerRef}
                                    onContextMenu={handleContextMenu}
                                    scrollLeft={scrollLeft}
                                    visibleWidth={viewportWidth}
                                />
                            </div>
                        ) : (
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
                                        handleContextMenu(e, tid, kid, interp, k?.brokenTangents, k?.autoTangent);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    
                    <KeyframeInspector />
                </div>
            </div>
        </div>
    );
};

export default Timeline;
