
import React, { useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { TimelineRuler } from './TimelineRuler';
import { TrackRow } from './TrackRow';
import { TrackGroup } from './TrackGroup';
import { AudioGroup } from './AudioStrip';
import { SelectionTransformBar } from './SelectionTransformBar';
import { useDopeSheetInteraction } from '../../hooks/useDopeSheetInteraction';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { TIMELINE_RULER_HEIGHT, TIMELINE_GROUP_HEIGHT, TIMELINE_TRACK_HEIGHT } from '../../data/constants';
import { getLiveValue } from '../../utils/timelineUtils';
import { groupTracks, classifyTrackId } from '../../utils/groupTracks';
import { DopeSheetCanvas } from './DopeSheetCanvas';
import type { DopeSheetRowLayout } from '../../utils/DopeSheetRenderer';
import type { PickResult, PickGroupResult } from '../../utils/DopeSheetRenderer';

interface DopeSheetProps {
    frameWidth: number;
    totalContentWidth: number;
    onContextMenu: (e: React.MouseEvent, tid: string, kid: string, interp: string, broken: boolean, auto: boolean) => void;
    onCanvasContextMenu: (e: React.MouseEvent, frame: number) => void;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    scrollLeft: number;
    visibleWidth: number;
    visibleGraphTracks: string[];
    setVisibleGraphTracks: (ids: string[]) => void;
}

/** Synthetic row id for the Root (Global) Summary aggregation row. Cyan-coloured;
 *  rendered via the same canvas-group pipeline as ordinary groups, with the colour
 *  overrides set in rowsLayout. */
const ROOT_SUMMARY_ROW_ID = '__rootSummary__';
const ROOT_SUMMARY_FILL = '#0891b2';   // cyan-600 — matches the previous DOM bg-accent-600.
const ROOT_SUMMARY_STROKE = '#67e8f9'; // cyan-300 — matches the previous DOM border-accent-300.

const PlayheadCursor = ({ frameWidth }: { frameWidth: number }) => {
    const currentFrame = useAnimationStore(s => s.currentFrame);
    const sidebarWidth = useAnimationStore(s => s.timelineSidebarWidth);
    return (
        <div
            className="absolute top-6 bottom-0 w-px bg-red-500/50 pointer-events-none z-10"
            style={{ left: `${sidebarWidth + (currentFrame * frameWidth)}px` }}
        />
    );
};

// React.memo: bail out when props are reference-equal. With 1500-keyframe
// sequences DopeSheet's render is ~135ms (it spits out ~9000 DOM diamonds);
// without memo, every parent re-render — including the per-frame currentFrame
// updates Timeline subscribes to during playback — would re-run the whole
// thing and stutter the app. Inner Zustand selectors still drive re-renders
// when keyframe data actually changes.
const DopeSheetInner: React.FC<DopeSheetProps> = ({
    frameWidth, totalContentWidth, onContextMenu, onCanvasContextMenu, scrollContainerRef, scrollLeft, visibleWidth,
    visibleGraphTracks, setVisibleGraphTracks
}) => {
    const toggleVisibility = (tid: string) => {
        if (visibleGraphTracks.includes(tid)) {
            setVisibleGraphTracks(visibleGraphTracks.filter(id => id !== tid));
        } else {
            setVisibleGraphTracks([...visibleGraphTracks, tid]);
        }
    };

    const selectAllKeysOnTrack = (tid: string, multi: boolean) => {
        const t = useAnimationStore.getState().sequence.tracks[tid];
        if (!t) return;
        const ids = t.keyframes.map(k => `${tid}::${k.id}`);
        useAnimationStore.getState().selectKeyframes(ids, multi);
    };

    const sequence = useAnimationStore(s => s.sequence);
    const selectedTrackIds = useAnimationStore(s => s.selectedTrackIds);
    const selectedKeyframeIds = useAnimationStore(s => s.selectedKeyframeIds);
    const durationFrames = useAnimationStore(s => s.durationFrames);
    
    // Actions are stable refs from slice init — read lazily via getState()
    // to avoid the full-store destructured subscription that was forcing
    // DopeSheet to re-render every RAF (~60Hz no-op set() calls flood the
    // animationStore; see useTrackAnimation.ts for the original analysis).
    const setTrackSelection       = useAnimationStore((s) => s.setTrackSelection);
    const toggleTrackSelection    = useAnimationStore((s) => s.toggleTrackSelection);
    const addTracksToSelection    = useAnimationStore((s) => s.addTracksToSelection);
    const selectKeyframe          = useAnimationStore((s) => s.selectKeyframe);
    const selectKeyframes         = useAnimationStore((s) => s.selectKeyframes);
    const removeTrack             = useAnimationStore((s) => s.removeTrack);
    const addKeyframe             = useAnimationStore((s) => s.addKeyframe);
    const snapshot                = useAnimationStore((s) => s.snapshot);
    const deleteSelectedKeyframes = useAnimationStore((s) => s.deleteSelectedKeyframes);
    const selectTrackBy = (id: string, multi: boolean) =>
        multi ? toggleTrackSelection(id) : setTrackSelection(id);

    const collapsedGroupsArr = useAnimationStore(s => s.collapsedGroups);
    const setCollapsedGroupsStore = useAnimationStore(s => s.setCollapsedGroups);
    const toggleCollapsedGroupStore = useAnimationStore(s => s.toggleCollapsedGroup);
    const sidebarWidth = useAnimationStore(s => s.timelineSidebarWidth);
    const collapsedGroups = useMemo(() => new Set(collapsedGroupsArr), [collapsedGroupsArr]);
    const contentRef = useRef<HTMLDivElement>(null);
    const rowsContainerRef = useRef<HTMLDivElement>(null);
    const globalSummaryRef = useRef<HTMLDivElement>(null);
    const lastSelectedTrackId = useRef<string | null>(null);

    // Enforce scroll position sync immediately on mount/render to fix alignment issues
    useLayoutEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollLeft;
        }
    }, [scrollLeft, scrollContainerRef]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteSelectedKeyframes();
            } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
                // Alt+A: deselect all keys (mirrors Graph Editor)
                e.preventDefault();
                useAnimationStore.getState().deselectAllKeys();
            } else if (e.key === 'a' || e.key === 'A') {
                // A: select every key on every visible (non-hidden) track
                e.preventDefault();
                const seq = useAnimationStore.getState().sequence;
                const all: string[] = [];
                Object.values(seq.tracks).forEach(t => {
                    if (t.hidden) return;
                    t.keyframes.forEach(k => all.push(`${t.id}::${k.id}`));
                });
                useAnimationStore.getState().selectKeyframes(all, false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelectedKeyframes]);
    
    useEffect(() => {
        const handleFocus = (trackId: string) => {
            if (!trackId) return;
            const targetGroup = classifyTrackId(String(trackId));
            const allGroups = ['Camera', 'Formula', 'Optics', 'Lighting', 'Shading'];
            setCollapsedGroupsStore(allGroups.filter(g => g !== targetGroup));
        };

        const unsub = FractalEvents.on(FRACTAL_EVENTS.TRACK_FOCUS, handleFocus);
        return unsub;
    }, [setCollapsedGroupsStore]);

    const toggleGroup = (groupName: string, isAlt: boolean) => {
        toggleCollapsedGroupStore(groupName, isAlt, Object.keys(organizedTracks.groups));
    };

    const organizedTracks = useMemo(() => groupTracks(sequence.tracks), [sequence.tracks]);

    const visibleTrackOrder = useMemo(() => {
        let order: string[] = [];
        Object.entries(organizedTracks.groups).forEach(([name, ids]) => {
            if (!collapsedGroups.has(name)) {
                order = order.concat(ids as string[]);
            }
        });
        order = order.concat(organizedTracks.standalone);
        return order;
    }, [organizedTracks, collapsedGroups]);

    // Row-stack layout for the DopeSheetCanvas overlay. First entry is the synthetic
    // Root Summary row (cyan diamonds across every visible track's keyframe frames —
    // see ROOT_SUMMARY_ROW_ID + cyan-* below). Then groups (header at GROUP_HEIGHT,
    // expanded child rows at TRACK_HEIGHT) and standalone tracks. Canvas paints diamonds
    // at (frame*frameWidth, row.y + row.height/2).
    const rowsLayout = useMemo<DopeSheetRowLayout[]>(() => {
        const rows: DopeSheetRowLayout[] = [];
        let y = 0;

        // Root Summary — synthetic group row aggregating every visible track. Used to
        // be a sticky DOM block with 9000 cyan diamonds; now paints through the same
        // canvas pipeline as the rest of the dope sheet.
        const visibleTrackIds: string[] = [];
        for (const t of Object.values(sequence.tracks)) {
            if (!t.hidden) visibleTrackIds.push(t.id);
        }
        rows.push({
            kind: 'group',
            id: ROOT_SUMMARY_ROW_ID,
            trackIds: visibleTrackIds,
            y,
            height: TIMELINE_GROUP_HEIGHT,
            fillColor: ROOT_SUMMARY_FILL,
            strokeColor: ROOT_SUMMARY_STROKE,
        });
        y += TIMELINE_GROUP_HEIGHT;

        for (const [groupName, ids] of Object.entries(organizedTracks.groups)) {
            rows.push({ kind: 'group', id: groupName, trackIds: ids as string[], y, height: TIMELINE_GROUP_HEIGHT });
            y += TIMELINE_GROUP_HEIGHT;
            if (!collapsedGroups.has(groupName)) {
                for (const tid of ids as string[]) {
                    rows.push({ kind: 'track', id: tid, trackIds: [], y, height: TIMELINE_TRACK_HEIGHT });
                    y += TIMELINE_TRACK_HEIGHT;
                }
            }
        }
        for (const tid of organizedTracks.standalone) {
            rows.push({ kind: 'track', id: tid, trackIds: [], y, height: TIMELINE_TRACK_HEIGHT });
            y += TIMELINE_TRACK_HEIGHT;
        }
        return rows;
    }, [organizedTracks, collapsedGroups, sequence.tracks]);

    const totalRowsHeight = useMemo(() => {
        if (rowsLayout.length === 0) return 0;
        const last = rowsLayout[rowsLayout.length - 1];
        return last.y + last.height;
    }, [rowsLayout]);

    const canvasKeyframeAreaWidth = Math.max(0, totalContentWidth - sidebarWidth);

    const selectionRange = useMemo(() => {
        if (selectedKeyframeIds.length < 2) return null;
        
        let minF = Infinity;
        let maxF = -Infinity;
        let found = false;

        selectedKeyframeIds.forEach(id => {
             const [tid, kid] = id.split('::');
             const track = sequence.tracks[tid];
             if (track) {
                 const key = track.keyframes.find(k => k.id === kid);
                 if (key) {
                     if (key.frame < minF) minF = key.frame;
                     if (key.frame > maxF) maxF = key.frame;
                     found = true;
                 }
             }
        });

        if (!found || minF === Infinity) return null;
        if (Math.abs(maxF - minF) < 0.001) return null;
        
        return { min: minF, max: maxF };
    }, [selectedKeyframeIds, sequence]);

    const { selectionBox, handleContentMouseDown, startDragKeys, startTransformSelection } = useDopeSheetInteraction({
        frameWidth,
        contentRef,
        scrollContainerRef,
        rowsContainerRef,
        globalSummaryRef,
        SIDEBAR_WIDTH: sidebarWidth,
        RULER_HEIGHT: TIMELINE_RULER_HEIGHT,
        GROUP_HEIGHT: TIMELINE_GROUP_HEIGHT,
        TRACK_HEIGHT: TIMELINE_TRACK_HEIGHT,
        organizedTracks,
        collapsedGroups,
        sequence,
        selectedTrackIds
    });

    const handleTrackSelect = (e: React.MouseEvent, tid: string) => {
        const multi = e.ctrlKey || e.metaKey || e.shiftKey;
        
        if (e.shiftKey && lastSelectedTrackId.current) {
            const startIdx = visibleTrackOrder.indexOf(lastSelectedTrackId.current);
            const endIdx = visibleTrackOrder.indexOf(tid);

            if (startIdx !== -1 && endIdx !== -1) {
                const minIdx = Math.min(startIdx, endIdx);
                const maxIdx = Math.max(startIdx, endIdx);
                const rangeTracks = visibleTrackOrder.slice(minIdx, maxIdx + 1);
                // addTracksToSelection adds without toggling — selectTrackBy(_, true)
                // calls toggleTrackSelection, which would deselect the anchor row that
                // was already part of the prior selection.
                addTracksToSelection(rangeTracks);
            }
        } else {
            // Track-header click selects the track only — keys are picked via marquee,
            // per-key click, or the row's "select all keys" affordance. This stops a
            // casual click from arming Delete to wipe the whole track.
            selectTrackBy(tid, multi);
        }
        
        lastSelectedTrackId.current = tid;
    };

    const handleKeyMouseDown = (e: React.MouseEvent, tid: string, kid: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (e.button === 2) {
            const composite = `${tid}::${kid}`;
            if (!selectedKeyframeIds.includes(composite)) {
                selectKeyframe(tid, kid, false);
                selectTrackBy(tid, false);
            }
            const track = sequence.tracks[tid];
            const k = track?.keyframes.find(kf => kf.id === kid);
            if (k) {
                onContextMenu(e, tid, kid, k.interpolation, !!k.brokenTangents, !!k.autoTangent);
            }
            return;
        }

        const composite = `${tid}::${kid}`;
        const isSelected = selectedKeyframeIds.includes(composite);
        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;

        if (isMulti) {
            selectKeyframe(tid, kid, true);
            if (!selectedTrackIds.includes(tid)) selectTrackBy(tid, true);
            snapshot();
            const keysToDrag = isSelected 
                ? selectedKeyframeIds 
                : [...selectedKeyframeIds, composite];
            startDragKeys(e.clientX, keysToDrag);
        }
        else if (!isSelected) {
            selectKeyframe(tid, kid, false);
            selectTrackBy(tid, false);
            snapshot();
            startDragKeys(e.clientX, [composite]);
        } else {
             snapshot();
             startDragKeys(e.clientX, selectedKeyframeIds);
        }
    };

    const handleGroupKeyMouseDown = (e: React.MouseEvent, groupTrackIds: string[], frame: number) => {
        e.stopPropagation();
        e.preventDefault();
        
        const keysInGroup: string[] = [];
        
        groupTrackIds.forEach(tid => {
            const t = sequence.tracks[tid];
            const k = t?.keyframes.find(key => Math.abs(key.frame - frame) < 0.001);
            if (k) {
                keysInGroup.push(`${tid}::${k.id}`);
            }
        });

        if (keysInGroup.length === 0) return;

        if (e.button === 2) {
            selectKeyframes(keysInGroup, false);
            const [firstTid, firstKid] = keysInGroup[0].split('::');
            const t = sequence.tracks[firstTid];
            const k = t?.keyframes.find(key => key.id === firstKid);
            if (k) {
                onContextMenu(e, firstTid, firstKid, k.interpolation, !!k.brokenTangents, !!k.autoTangent);
            }
            return;
        }

        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
        snapshot();
        
        if (isMulti) {
            selectKeyframes(keysInGroup, true);
            groupTrackIds.forEach(tid => {
                if(!selectedTrackIds.includes(tid)) selectTrackBy(tid, true);
            });
            // Merge existing and new
            const allKeys = Array.from(new Set([...selectedKeyframeIds, ...keysInGroup]));
            startDragKeys(e.clientX, allKeys);
        } else {
            selectKeyframes(keysInGroup, false);
            groupTrackIds.forEach((tid, idx) => {
                if (idx === 0) selectTrackBy(tid, false);
                else selectTrackBy(tid, true);
            });
            startDragKeys(e.clientX, keysInGroup);
        }
    };

    const wrapAddKey = (tid: string, frame: number) => {
        snapshot(); 
        const val = getLiveValue(tid, false, frame, sequence);
        addKeyframe(tid, frame, val);
    };
    
    const handleBackgroundContextMenu = (e: React.MouseEvent) => {
         // Stop immediate bubbling to parents, but allow internal logic
         e.preventDefault();
         
         const container = contentRef.current;
         if (!container) return;
         
         const rect = container.getBoundingClientRect();
         // Calculate X relative to the content area (scrolled)
         // Note: scrollLeft prop is passed down but we need current scroll state or calc
         // Better to use absolute clientX mapped to frame
         // Sidebar is fixed position visually, but content scrolls
         // Frame 0 starts at SIDEBAR_WIDTH
         
         const xRelativeToContainer = e.clientX - rect.left;
         // Since container moves with scroll, we need to add scroll offset
         // But the container is inside scrollContainerRef which has scrollLeft
         // Wait, DopeSheet content div has relative position.
         // Let's use the scrollContainerRef to get the scroll offset.
         
         const scrollOffset = scrollContainerRef.current?.scrollLeft || 0;
         const totalX = xRelativeToContainer + scrollOffset;
         
         // Remove Sidebar width
         const frameAreaX = totalX - sidebarWidth;
         const frame = Math.max(0, Math.round(frameAreaX / frameWidth));
         
         onCanvasContextMenu(e, frame);
    };

    const limitX = sidebarWidth + durationFrames * frameWidth;
    const limitWidth = Math.max(0, (scrollLeft + visibleWidth) - limitX + 500); 
    
    return (
        <div 
            ref={contentRef}
            className="relative min-h-full bg-surface" 
            style={{ minWidth: totalContentWidth }}
            onMouseDown={handleContentMouseDown}
            data-help-id="ui.timeline"
            onContextMenu={handleBackgroundContextMenu}
        >
            <div 
                className="absolute top-0 bottom-0 pointer-events-none z-0"
                style={{ 
                    left: limitX, 
                    width: limitWidth,
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 10px, transparent 10px, transparent 20px)',
                    backgroundColor: 'rgba(0,0,0,0.5)'
                }}
            />

            <TimelineRuler 
                FRAME_WIDTH={frameWidth} 
                durationFrames={durationFrames} 
                scrollLeft={scrollLeft}
                visibleWidth={visibleWidth}
            />
            
            <PlayheadCursor frameWidth={frameWidth} />

            {selectionBox && (
                <div 
                    className="absolute bg-accent-500/20 border border-accent-400/50 z-50 pointer-events-none"
                    style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.w, height: selectionBox.h }}
                />
            )}

            <AudioGroup frameWidth={frameWidth} sidebarWidth={sidebarWidth} />

            <div className="relative" ref={rowsContainerRef}>
                {/* Canvas overlay paints every track + group diamond field, including the
                    Root Summary synthetic row at y=0 (cyan). Sized to span the keyframe
                    area only — sidebars stay DOM and sit at higher z-index. */}
                <DopeSheetCanvas
                    sequence={sequence}
                    rows={rowsLayout}
                    frameWidth={frameWidth}
                    left={sidebarWidth}
                    width={canvasKeyframeAreaWidth}
                    height={totalRowsHeight}
                    selectedKeyframeIds={selectedKeyframeIds}
                    onPickTrackKey={(e, pick: PickResult) => handleKeyMouseDown(e, pick.trackId, pick.keyId)}
                    onPickGroupKey={(e, pick: PickGroupResult) => handleGroupKeyMouseDown(e, pick.trackIds, pick.frame)}
                    onCanvasMouseDown={handleContentMouseDown}
                    onCanvasDoubleClick={(_e, frame, rowTrackId) => { if (rowTrackId) wrapAddKey(rowTrackId, frame); }}
                    onCanvasContextMenu={(e, frame) => onCanvasContextMenu(e, frame)}
                />

                {/* Root Summary row chrome — sidebar label + global SelectionTransformBar.
                    Diamonds for this row are painted by the canvas above (cyan group row at
                    y=0 in rowsLayout). The ref still exists for marquee y-offset lookup.
                    NOTE: no `position` style here. Adding `relative` (or any positioning)
                    would lift the wrapper into the positioned-z=auto stacking step alongside
                    the canvas (absolute z:0), and tree order would put the wrapper on top —
                    its hit area would swallow clicks on the flex-1 diamond region. Keeping
                    it position:static lets the canvas (above in paint order) catch the click,
                    matching the existing TrackGroup chrome pattern. */}
                <div
                    ref={globalSummaryRef}
                    className="flex border-b border-line/5 bg-line/5"
                    style={{ height: TIMELINE_GROUP_HEIGHT }}
                >
                    <div
                        className="sticky left-0 z-30 bg-surface/80 backdrop-blur-sm border-r border-line/10 shrink-0 flex items-center px-2 select-none"
                        style={{ width: sidebarWidth }}
                    >
                        <span className="text-[10px] font-bold text-accent-400 pl-4">Global Summary</span>
                    </div>
                    <div className="flex-1 relative group/track" style={{ pointerEvents: 'none' }}>
                        {selectionRange && (
                            <SelectionTransformBar
                                minFrame={selectionRange.min}
                                maxFrame={selectionRange.max}
                                frameWidth={frameWidth}
                                onStart={startTransformSelection}
                            />
                        )}
                    </div>
                </div>

                {Object.entries(organizedTracks.groups).map(([groupName, ids]) => (
                    <TrackGroup
                        key={groupName}
                        groupName={groupName}
                        trackIds={ids}
                        collapsed={collapsedGroups.has(groupName)}
                        onToggle={(name, isAlt) => toggleGroup(name, isAlt)}
                        sequence={sequence}
                        frameWidth={frameWidth}
                        selectedTrackIds={selectedTrackIds}
                        selectedKeyframeIds={selectedKeyframeIds}
                        onTrackSelect={handleTrackSelect}
                        onRemoveTrack={removeTrack}
                        onStartTransform={startTransformSelection}
                        visibleGraphTracks={visibleGraphTracks}
                        onToggleVisibility={toggleVisibility}
                        onSelectAllKeys={selectAllKeysOnTrack}
                    />
                ))}

                {organizedTracks.standalone.map(tid => (
                    <TrackRow
                        key={tid} tid={tid} sequence={sequence}
                        isSelected={selectedTrackIds.includes(tid)}
                        isVisible={visibleGraphTracks.includes(tid)}
                        onSelect={handleTrackSelect}
                        onToggleVisibility={toggleVisibility}
                        onSelectAllKeys={selectAllKeysOnTrack}
                        onRemove={() => removeTrack(tid)}
                    />
                ))}
            </div>

            <div className="h-32" />
        </div>
    );
};

export const DopeSheet = React.memo(DopeSheetInner);
