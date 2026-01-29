
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { getLiveValue } from '../../utils/timelineUtils';
import { TRACK_COLORS } from '../../utils/GraphRenderer';
import { EyeIcon, FolderIcon, SelectAllIcon, TrashIcon } from '../Icons';
import { Track } from '../../types';

interface GraphSidebarProps {
    visibleTrackIds: string[];
    setVisibleTracks: (ids: string[]) => void;
}

// Helper for Live Values
const LiveValueDisplay = ({ tid }: { tid: string }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const animStore = useAnimationStore;
    useEffect(() => {
        let rafId: number;
        const update = () => {
            if (!ref.current) return;
            const state = animStore.getState();
            const val = getLiveValue(tid, state.isPlaying, state.currentFrame, state.sequence);
            ref.current.innerText = val.toFixed(2);
            rafId = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(rafId);
    }, [tid]);
    return <span ref={ref} className="text-[9px] font-mono text-gray-400">--</span>;
};

export const GraphSidebar: React.FC<GraphSidebarProps> = ({ visibleTrackIds, setVisibleTracks }) => {
    const { sequence, selectedTrackIds, selectTrack, selectKeyframes, removeTrack } = useAnimationStore();
    
    // Grouping State
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['Formula', 'Optics', 'Lighting', 'Shading']));
    const lastSelectedTrackId = useRef<string | null>(null);

    // Organize tracks into groups (Copied logic from DopeSheet for consistency)
    const organizedTracks = useMemo<{ groups: Record<string, string[]>, standalone: string[] }>(() => {
        const groups: Record<string, string[]> = {};
        const standalone: string[] = [];
        
        groups['Camera'] = [];
        groups['Formula'] = [];
        groups['Optics'] = [];
        groups['Lighting'] = [];
        groups['Shading'] = [];

        if (sequence) {
            (Object.values(sequence.tracks) as Track[]).forEach(t => {
                if (t.hidden) return;
                
                if (t.id.startsWith('camera.')) {
                    groups['Camera'].push(t.id);
                } else if (t.id.startsWith('lights.') || t.id.startsWith('lighting.')) {
                    groups['Lighting'].push(t.id);
                } else if (t.id.startsWith('coreMath.') || t.id.startsWith('geometry.') || t.id.startsWith('param') || t.id.startsWith('julia.') || t.id.startsWith('hybridParams.') || t.id === 'iterations') {
                    groups['Formula'].push(t.id);
                } else if (t.id === 'camFov' || t.id.startsWith('optics.') || t.id.startsWith('dof') || t.id.startsWith('fog') || t.id.startsWith('atmosphere.')) {
                    if (t.id.startsWith('fog') || t.id.startsWith('atmosphere.')) groups['Shading'].push(t.id);
                    else groups['Optics'].push(t.id);
                } else {
                    groups['Shading'].push(t.id);
                }
            });
        }
        
        // Cleanup empty groups
        Object.keys(groups).forEach(k => {
            if (groups[k].length === 0) delete groups[k];
        });

        return { groups, standalone };
    }, [sequence]);

    // Flatten visible tracks for range selection logic
    const visibleInListOrder = useMemo(() => {
        let order: string[] = [];
        Object.entries(organizedTracks.groups).forEach(([name, ids]) => {
            if (!collapsedGroups.has(name)) {
                order = order.concat(ids as string[]);
            }
        });
        order = order.concat(organizedTracks.standalone);
        return order;
    }, [organizedTracks, collapsedGroups]);

    // --- VISIBILITY TOGGLE (Eye) ---
    const toggleVisibility = (tid: string) => {
        if (visibleTrackIds.includes(tid)) {
            setVisibleTracks(visibleTrackIds.filter(id => id !== tid));
        } else {
            setVisibleTracks([...visibleTrackIds, tid]);
        }
    };
    
    // --- GROUP VISIBILITY ---
    const toggleGroupVisibility = (ids: string[]) => {
        const allVisible = ids.every(id => visibleTrackIds.includes(id));
        if (allVisible) {
            // Hide all in group
            const toRemove = new Set(ids);
            setVisibleTracks(visibleTrackIds.filter(id => !toRemove.has(id)));
        } else {
            // Show all in group (additive)
            const newSet = new Set(visibleTrackIds);
            ids.forEach(id => newSet.add(id));
            setVisibleTracks(Array.from(newSet));
        }
    };

    // --- SELECTION (Row Click) ---
    // Updates global store for editing context, but does NOT remove unselected tracks from graph view.
    const handleSelect = (e: React.MouseEvent, tid: string) => {
        const multi = e.ctrlKey || e.metaKey;
        
        if (e.shiftKey && lastSelectedTrackId.current) {
            // Range Select
            const startIdx = visibleInListOrder.indexOf(lastSelectedTrackId.current);
            const endIdx = visibleInListOrder.indexOf(tid);
            
            if (startIdx !== -1 && endIdx !== -1) {
                const minIdx = Math.min(startIdx, endIdx);
                const maxIdx = Math.max(startIdx, endIdx);
                const rangeTracks = visibleInListOrder.slice(minIdx, maxIdx + 1);
                
                rangeTracks.forEach(t => {
                    if (!selectedTrackIds.includes(t)) selectTrack(t, true);
                    // UX Polish: If I range select, ensure they are visible in graph too
                    if (!visibleTrackIds.includes(t)) {
                        setVisibleTracks([...visibleTrackIds, t]); 
                    }
                });
                // Batch visibility update for range
                const newVis = new Set(visibleTrackIds);
                rangeTracks.forEach(t => newVis.add(t));
                setVisibleTracks(Array.from(newVis));
            }
        } else {
            // Standard Select - DOES NOT SELECT KEYS (Refined Spec)
            selectTrack(tid, multi);
            
            // UX Polish: Selecting a track ensures it is visible
            if (!visibleTrackIds.includes(tid)) {
                setVisibleTracks([...visibleTrackIds, tid]);
            }
        }
        
        lastSelectedTrackId.current = tid;
    };
    
    // --- SELECT ALL KEYS (Button Handler) ---
    const selectAllKeysInTracks = (e: React.MouseEvent, trackIds: string[]) => {
        e.stopPropagation();
        const isMulti = e.shiftKey || e.ctrlKey;
        const keysToSelect: string[] = [];
        
        trackIds.forEach(tid => {
            const track = sequence.tracks[tid];
            if (track) {
                track.keyframes.forEach(k => keysToSelect.push(`${tid}::${k.id}`));
            }
            // Ensure track is selected too
            if (!selectedTrackIds.includes(tid)) selectTrack(tid, true);
            // Ensure visible
            if (!visibleTrackIds.includes(tid)) toggleVisibility(tid); 
        });
        
        selectKeyframes(keysToSelect, isMulti);
    };

    const toggleGroupCollapse = (groupName: string, isAlt: boolean) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (isAlt) {
                next.clear();
                Object.keys(organizedTracks.groups).forEach(g => { if (g !== groupName) next.add(g); });
                next.delete(groupName);
            } else {
                if (next.has(groupName)) next.delete(groupName);
                else next.add(groupName);
            }
            return next;
        });
    };

    const renderRow = (tid: string) => {
        const track = sequence.tracks[tid];
        if (!track) return null;
        
        const isVisible = visibleTrackIds.includes(tid);
        const isSelected = selectedTrackIds.includes(tid);
        
        // Color depends on index in visible array to match GraphRenderer
        const visIdx = visibleTrackIds.indexOf(tid);
        const color = visIdx !== -1 ? TRACK_COLORS[visIdx % TRACK_COLORS.length] : '#555';
        
        return (
            <div 
                key={tid}
                className={`flex items-center justify-between px-3 py-1.5 cursor-pointer border-b border-white/5 transition-colors group ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={(e) => handleSelect(e, tid)}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: color }} />
                    <span className={`text-[10px] truncate ${isSelected ? 'text-white font-bold' : (isVisible ? 'text-gray-300' : 'text-gray-500')}`} title={track.label}>
                        {track.label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Select All Keys */}
                    <button 
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 text-gray-500 hover:text-cyan-400 transition-all"
                        onClick={(e) => selectAllKeysInTracks(e, [tid])}
                        title="Select All Keys"
                    >
                        <SelectAllIcon />
                    </button>
                    
                    {isVisible && <LiveValueDisplay tid={tid} />}
                    
                    {/* Trash Icon */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); removeTrack(tid); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 text-red-500 hover:text-red-400 transition-all"
                        title="Delete Track"
                    >
                        <TrashIcon />
                    </button>

                    {/* Visibility Eye */}
                    <div 
                        className="p-1 rounded hover:bg-white/20 text-gray-500 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(tid); }}
                    >
                        <EyeIcon active={isVisible} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-[220px] bg-black/80 backdrop-blur-sm border-r border-white/10 flex flex-col shrink-0 overflow-y-auto custom-scroll">
            <div className="h-6 flex items-center justify-between px-2 border-b border-white/5 text-[9px] text-gray-500 font-bold uppercase tracking-widest bg-black sticky top-0 z-10">
                <span>Curves</span>
                <div className="flex gap-2">
                     <button 
                        onClick={() => setVisibleTracks([])}
                        className="hover:text-white text-gray-600 px-1"
                        title="Hide All"
                     >
                         None
                     </button>
                     <button 
                        onClick={() => {
                            const all = (Object.values(sequence.tracks) as Track[]).filter(t => !t.hidden).map(t => t.id);
                            setVisibleTracks(all);
                        }}
                        className="hover:text-white text-gray-600 px-1"
                        title="Show All"
                     >
                         All
                     </button>
                </div>
            </div>
            
            {/* Groups */}
            {Object.entries(organizedTracks.groups).map(([groupName, rawIds]) => {
                const ids = rawIds as string[];
                const isAllVisible = ids.every(id => visibleTrackIds.includes(id)) && ids.length > 0;
                const isPartiallyVisible = ids.some(id => visibleTrackIds.includes(id)) && !isAllVisible;
                
                return (
                    <div key={groupName}>
                         <div 
                            className={`flex items-center justify-between px-2 py-1.5 border-b border-white/10 cursor-pointer select-none group bg-[#1a1a1a] hover:bg-gray-700`}
                        >
                            <div className="flex items-center gap-2 flex-1" onClick={(e) => toggleGroupCollapse(groupName, e.altKey)}>
                                <span className="text-gray-500 w-4"><FolderIcon open={!collapsedGroups.has(groupName)} /></span>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{groupName}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <button 
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 text-gray-500 hover:text-cyan-400 transition-all mr-1"
                                    onClick={(e) => selectAllKeysInTracks(e, ids)}
                                    title="Select All Keys in Group"
                                >
                                    <SelectAllIcon />
                                </button>
                                
                                <div 
                                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white"
                                    onClick={(e) => toggleGroupVisibility(ids)}
                                >
                                    <EyeIcon active={isAllVisible || isPartiallyVisible} />
                                </div>
                            </div>
                        </div>
                        {!collapsedGroups.has(groupName) && ids.map(tid => renderRow(tid))}
                    </div>
                );
            })}
            
            {/* Standalone Tracks */}
            {organizedTracks.standalone.map(tid => renderRow(tid))}
            
            {(!sequence || Object.keys(sequence.tracks).length === 0) && (
                <div className="p-4 text-xs text-gray-600 text-center italic">No tracks yet</div>
            )}
            
            <div className="h-10" />
        </div>
    );
};
