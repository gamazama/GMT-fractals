
import { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import { AnimationStore, SequenceSliceState, SequenceSliceActions, HistoryItem, CopiedKeyframe } from './types';
import { Track, Keyframe, AnimationSequence } from '../../types';
import { simplifyTrack } from '../../utils/CurveFitting';
import { AnimationMath } from '../../engine/math/AnimationMath';
import { TrackUtils } from '../../engine/algorithms/TrackUtils';
import { splitCubicBezier, solveCubicBezierT } from '../../engine/BezierMath';
import { isLogTrack } from '../../engine/animation/logTrackRegistry';

const DEFAULT_SEQUENCE: AnimationSequence = {
    durationFrames: 300,
    tracks: {}
};

// Build a HistoryItem of the same shape as `item` from the current store —
// used by undo/redo to capture the state we're about to overwrite so it
// can be pushed onto the opposite stack.
const captureInverse = (state: AnimationStore, item: HistoryItem): HistoryItem => {
    if (item.type === 'FPS') {
        return {
            type: 'FPS',
            data: {
                sequence: JSON.parse(JSON.stringify(state.sequence)),
                fps: state.fps,
                durationFrames: state.durationFrames,
                currentFrame: state.currentFrame,
            },
        };
    }
    return { type: 'SEQUENCE', data: JSON.parse(JSON.stringify(state.sequence)) };
};

const applyHistory = (set: (partial: Partial<AnimationStore>) => void, item: HistoryItem) => {
    if (item.type === 'FPS') {
        set({
            sequence: item.data.sequence,
            fps: item.data.fps,
            durationFrames: item.data.durationFrames,
            currentFrame: item.data.currentFrame,
        });
    } else {
        set({ sequence: item.data });
    }
};

export const createSequenceSlice: StateCreator<AnimationStore, [["zustand/subscribeWithSelector", never]], [], SequenceSliceState & SequenceSliceActions> = (set, get) => ({
    sequence: DEFAULT_SEQUENCE,
    clipboard: null,
    undoStack: [],
    redoStack: [],

    // --- HISTORY ---
    snapshot: () => {
        const currentSeq = get().sequence;
        const clone = JSON.parse(JSON.stringify(currentSeq));
        
        set(state => {
            const newUndo: HistoryItem[] = [...state.undoStack, { type: 'SEQUENCE', data: clone }];
            return { undoStack: newUndo.length > 50 ? newUndo.slice(1) : newUndo, redoStack: [] };
        });
    },

    undo: () => {
        const { undoStack, redoStack } = get();
        if (undoStack.length === 0) return false;
        const item = undoStack[undoStack.length - 1];
        const inverse = captureInverse(get(), item);
        applyHistory(set, item);
        set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, inverse] });
        return true;
    },

    redo: () => {
        const { undoStack, redoStack } = get();
        if (redoStack.length === 0) return false;
        const item = redoStack[redoStack.length - 1];
        const inverse = captureInverse(get(), item);
        applyHistory(set, item);
        set({ undoStack: [...undoStack, inverse], redoStack: redoStack.slice(0, -1) });
        return true;
    },

    // --- BASIC CRUD ---
    setSequence: (seq) => { 
        get().snapshot(); 
        set({ sequence: seq }); 
    },

    addTrack: (id, label) => { 
        get().snapshot(); 
        set(state => {
            if (state.sequence.tracks[id]) return state;
            return { 
                sequence: { 
                    ...state.sequence, 
                    tracks: { ...state.sequence.tracks, [id]: { id, type: 'float', label, keyframes: [] } } 
                } 
            };
        }); 
    },

    removeTrack: (id) => { 
        get().snapshot(); 
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            delete newTracks[id];
            return { 
                sequence: { ...state.sequence, tracks: newTracks }, 
                selectedTrackIds: state.selectedTrackIds.filter(tid => tid !== id) 
            };
        });
    },

    setTrackBehavior: (trackId, behavior) => {
        get().snapshot();
        set(state => {
            const track = state.sequence.tracks[trackId];
            if (!track) return state;
            return {
                sequence: {
                    ...state.sequence,
                    tracks: { ...state.sequence.tracks, [trackId]: { ...track, postBehavior: behavior } }
                }
            };
        });
    },

    addKeyframe: (trackId, frame, value, explicitInterpolation) => {
        set(state => {
            const track = state.sequence.tracks[trackId];
            if (!track) return state;

            let interpolation: 'Linear' | 'Step' | 'Bezier' = explicitInterpolation || 'Bezier';
            if (!explicitInterpolation) {
                interpolation = TrackUtils.inferInterpolation(track.keyframes, frame);
            }

            const autoTangent = interpolation === 'Bezier';
            const tempKey: Keyframe = { id: nanoid(), frame, value, interpolation, autoTangent, brokenTangents: false };
            const others = track.keyframes.filter(k => Math.abs(k.frame - frame) > 0.001);
            const sorted = [...others, tempKey].sort((a,b) => a.frame - b.frame);
            const idx = sorted.findIndex(k => k.id === tempKey.id);

            if (interpolation === 'Bezier') {
                const prev = idx > 0 ? sorted[idx - 1] : undefined;
                const next = idx < sorted.length - 1 ? sorted[idx + 1] : undefined;

                // De Casteljau split: when inserting between two Bezier keys, preserve
                // the existing curve shape exactly. The new key adopts curve-derived
                // tangents and the neighbours' adjacent handles are rewritten so the
                // visual segment is unchanged. Falls back to Auto tangents at endpoints.
                const canSplit = prev && next && prev.interpolation === 'Bezier' && next.interpolation === 'Bezier';
                if (canSplit) {
                    const k1HandleX = prev.rightTangent ? prev.rightTangent.x : (next.frame - prev.frame) / 3;
                    const k1HandleY = prev.rightTangent ? prev.rightTangent.y : 0;
                    const k2HandleX = next.leftTangent ? next.leftTangent.x : -(next.frame - prev.frame) / 3;
                    const k2HandleY = next.leftTangent ? next.leftTangent.y : 0;

                    const p0x = prev.frame,                p0y = prev.value;
                    const p1x = prev.frame + k1HandleX,    p1y = prev.value + k1HandleY;
                    const p2x = next.frame + k2HandleX,    p2y = next.value + k2HandleY;
                    const p3x = next.frame,                p3y = next.value;

                    const t = solveCubicBezierT(frame, p0x, p1x, p2x, p3x);
                    const split = splitCubicBezier(t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y);

                    // Replace prev/next with curve-preserving handles. Mark all three
                    // user-shaped so updateNeighbors won't clobber them downstream.
                    const updatedPrev: Keyframe = {
                        ...prev,
                        autoTangent: false,
                        rightTangent: { x: split.leftP1x - p0x, y: split.leftP1y - p0y },
                    };
                    const updatedNext: Keyframe = {
                        ...next,
                        autoTangent: false,
                        leftTangent: { x: split.rightP2x - p3x, y: split.rightP2y - p3y },
                    };
                    tempKey.value = split.sy;
                    tempKey.autoTangent = false;
                    tempKey.leftTangent  = { x: split.leftP2x  - split.sx, y: split.leftP2y  - split.sy };
                    tempKey.rightTangent = { x: split.rightP1x - split.sx, y: split.rightP1y - split.sy };

                    sorted[idx - 1] = updatedPrev;
                    sorted[idx + 1] = updatedNext;
                } else {
                    const trackIsLog = isLogTrack(trackId);
                    const { l, r } = AnimationMath.calculateTangents(tempKey, prev, next, 'Auto', trackIsLog);
                    tempKey.leftTangent = l;
                    tempKey.rightTangent = r;
                    TrackUtils.updateNeighbors(sorted, idx, trackIsLog);
                }
            } else {
                TrackUtils.updateNeighbors(sorted, idx, isLogTrack(trackId));
            }

            return {
                sequence: {
                    ...state.sequence,
                    tracks: { ...state.sequence.tracks, [trackId]: { ...track, keyframes: sorted } }
                }
            };
        });
    },

    // Optimized batch operation for modulation recording to prevent UI jitter.
    // Uses O(1) append strategy for forward recording instead of O(N log N) sorting.
    // Intentionally diverges from `addKeyframe`: defaults to Linear, skips tangent
    // calculation and neighbour updates because dense recorded keys don't want smart
    // Auto tangents. Don't merge these two without preserving both behaviours.
    batchAddKeyframes: (frame, updates, explicitInterpolation) => {
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            let hasChanges = false;

            updates.forEach(({ trackId, value }) => {
                if (!newTracks[trackId]) {
                    newTracks[trackId] = { id: trackId, type: 'float', label: trackId, keyframes: [] };
                    hasChanges = true;
                }

                const track = newTracks[trackId];
                const newKeyframes = [...track.keyframes];
                const lastKey = newKeyframes.length > 0 ? newKeyframes[newKeyframes.length - 1] : null;

                const newKey: Keyframe = {
                    id: nanoid(),
                    frame,
                    value,
                    interpolation: explicitInterpolation || 'Linear',
                    autoTangent: explicitInterpolation === 'Bezier',
                    brokenTangents: false,
                };

                let updated = newKeyframes;
                if (lastKey) {
                    if (frame > lastKey.frame) {
                        newKeyframes.push(newKey);
                    } else if (Math.abs(frame - lastKey.frame) < 0.001) {
                        // Overwrite last key (use existing ID to prevent React list thrashing).
                        newKey.id = lastKey.id;
                        newKeyframes[newKeyframes.length - 1] = newKey;
                    } else {
                        // Insert in middle (cold path).
                        updated = newKeyframes.filter(k => Math.abs(k.frame - frame) > 0.001);
                        updated.push(newKey);
                        updated.sort((a, b) => a.frame - b.frame);
                    }
                } else {
                    newKeyframes.push(newKey);
                }

                // Clone the track object so per-track ref subscriptions can
                // detect a change. The previous code mutated `track.keyframes`
                // in place, which made `state.sequence.tracks[tid] === prev`
                // hold even after a write — silently breaking any
                // narrow-selector subscription.
                newTracks[trackId] = { ...track, keyframes: updated };
                hasChanges = true;
            });

            return hasChanges ? { sequence: { ...state.sequence, tracks: newTracks } } : state;
        });
    },

    batchAddKeyframesRange: (startFrame, endFrame, updates, explicitInterpolation) => {
        if (endFrame < startFrame || updates.length === 0) return;
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            let hasChanges = false;
            const interp = explicitInterpolation || 'Linear';
            const isAuto = explicitInterpolation === 'Bezier';

            updates.forEach(({ trackId, value }) => {
                if (!newTracks[trackId]) {
                    newTracks[trackId] = { id: trackId, type: 'float', label: trackId, keyframes: [] };
                    hasChanges = true;
                }
                const track = newTracks[trackId];
                const keys = [...track.keyframes];

                for (let f = startFrame; f <= endFrame; f++) {
                    const lastKey = keys.length > 0 ? keys[keys.length - 1] : null;
                    const newKey: Keyframe = {
                        id: nanoid(), frame: f, value, interpolation: interp,
                        autoTangent: isAuto, brokenTangents: false,
                    };
                    if (!lastKey || f > lastKey.frame) {
                        keys.push(newKey);
                    } else if (Math.abs(f - lastKey.frame) < 0.001) {
                        newKey.id = lastKey.id;
                        keys[keys.length - 1] = newKey;
                    } else {
                        // Cold path
                        const filtered = keys.filter(k => Math.abs(k.frame - f) > 0.001);
                        filtered.push(newKey);
                        filtered.sort((a, b) => a.frame - b.frame);
                        keys.length = 0;
                        keys.push(...filtered);
                    }
                }

                newTracks[trackId] = { ...track, keyframes: keys };
                hasChanges = true;
            });

            return hasChanges ? { sequence: { ...state.sequence, tracks: newTracks } } : state;
        });
    },

    batchAddKeyframesMultiRange: (entries, explicitInterpolation) => {
        if (entries.length === 0) return;
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            let hasChanges = false;
            const interp = explicitInterpolation || 'Linear';
            const isAuto = explicitInterpolation === 'Bezier';

            // Group writes by track so each track is cloned + extended once.
            const trackOps = new Map<string, { frame: number, value: number }[]>();
            for (const entry of entries) {
                for (const { trackId, value } of entry.updates) {
                    let ops = trackOps.get(trackId);
                    if (!ops) { ops = []; trackOps.set(trackId, ops); }
                    for (let f = entry.startFrame; f <= entry.endFrame; f++) {
                        ops.push({ frame: f, value });
                    }
                }
            }

            trackOps.forEach((ops, trackId) => {
                if (!newTracks[trackId]) {
                    newTracks[trackId] = { id: trackId, type: 'float', label: trackId, keyframes: [] };
                    hasChanges = true;
                }
                const track = newTracks[trackId];
                const keys = [...track.keyframes];

                for (const { frame, value } of ops) {
                    const lastKey = keys.length > 0 ? keys[keys.length - 1] : null;
                    const newKey: Keyframe = {
                        id: nanoid(), frame, value, interpolation: interp,
                        autoTangent: isAuto, brokenTangents: false,
                    };
                    if (!lastKey || frame > lastKey.frame) {
                        keys.push(newKey);
                    } else if (Math.abs(frame - lastKey.frame) < 0.001) {
                        newKey.id = lastKey.id;
                        keys[keys.length - 1] = newKey;
                    } else {
                        // Cold path — recording shouldn't hit this.
                        const filtered = keys.filter(k => Math.abs(k.frame - frame) > 0.001);
                        filtered.push(newKey);
                        filtered.sort((a, b) => a.frame - b.frame);
                        keys.length = 0;
                        keys.push(...filtered);
                    }
                }

                // Clone the track object too (not just its keyframes array) so
                // per-track subscriptions can detect a change by ref equality.
                newTracks[trackId] = { ...track, keyframes: keys };
                hasChanges = true;
            });

            return hasChanges ? { sequence: { ...state.sequence, tracks: newTracks } } : state;
        });
    },

    removeKeyframe: (trackId, keyframeId) => {
        get().snapshot();
        set(state => {
            const track = state.sequence.tracks[trackId];
            if (!track) return state;
            return { 
                sequence: { 
                    ...state.sequence, 
                    tracks: { 
                        ...state.sequence.tracks, 
                        [trackId]: { ...track, keyframes: track.keyframes.filter(k => k.id !== keyframeId) } 
                    } 
                } 
            };
        });
    },

    updateKeyframe: (trackId, keyframeId, updates) => {
        set(state => {
            const track = state.sequence.tracks[trackId];
            if (!track) return state;
            const newKeys = track.keyframes.map(k => k.id === keyframeId ? { ...k, ...updates } : k).sort((a, b) => a.frame - b.frame);
            return { 
                sequence: { 
                    ...state.sequence, 
                    tracks: { ...state.sequence.tracks, [trackId]: { ...track, keyframes: newKeys } } 
                } 
            };
        });
    },

    updateKeyframes: (updates) => {
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            // First pass: clone touched tracks + their keyframes arrays so memoising
            // consumers (e.g. GraphRenderer's polyline cache, keyed by keyframes
            // array referential equality) invalidate correctly. Without this,
            // dragging a key or a bezier handle mutates the array in place and
            // the cached canvas goes stale until the array ref happens to change
            // for some other reason.
            const touchedTracks = new Set<string>();
            updates.forEach(({ trackId }) => {
                if (!touchedTracks.has(trackId) && newTracks[trackId]) {
                    touchedTracks.add(trackId);
                    newTracks[trackId] = {
                        ...newTracks[trackId],
                        keyframes: [...newTracks[trackId].keyframes],
                    };
                }
            });
            // Second pass: apply patches into the cloned arrays.
            updates.forEach(({ trackId, keyId, patch }) => {
                const track = newTracks[trackId];
                if (track) {
                    const idx = track.keyframes.findIndex(k => k.id === keyId);
                    if (idx !== -1) {
                         const currentKey = track.keyframes[idx];
                         if (patch.interpolation === 'Bezier' && currentKey.interpolation !== 'Bezier') {
                             patch.autoTangent = true;
                         }
                         track.keyframes[idx] = { ...currentKey, ...patch };
                    }
                }
            });
            // Sort touched tracks only (the cloned arrays). Untouched tracks keep
            // their original references so other cache consumers don't invalidate.
            touchedTracks.forEach(tid => {
                newTracks[tid].keyframes.sort((a, b) => a.frame - b.frame);
            });
            return { sequence: { ...state.sequence, tracks: newTracks } };
        });
    },

    // --- BULK OPERATIONS ---
    deleteSelectedKeyframes: () => {
        get().snapshot();
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            const selected = new Set(state.selectedKeyframeIds);
            
            Object.keys(newTracks).forEach(tid => {
                newTracks[tid] = { 
                    ...newTracks[tid], 
                    keyframes: newTracks[tid].keyframes.filter(k => !selected.has(`${tid}::${k.id}`)) 
                };
            });
            return { sequence: { ...state.sequence, tracks: newTracks }, selectedKeyframeIds: [] };
        });
    },

    deleteAllKeys: () => {
        get().snapshot();
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            Object.keys(newTracks).forEach(tid => {
                newTracks[tid] = { ...newTracks[tid], keyframes: [] };
            });
            return { sequence: { ...state.sequence, tracks: newTracks }, selectedKeyframeIds: [] };
        });
    },

    deleteAllTracks: () => {
        get().snapshot();
        set({ 
            sequence: { ...get().sequence, tracks: {} }, 
            selectedTrackIds: [], 
            selectedKeyframeIds: [] 
        });
    },

    setTangents: (mode) => {
        get().snapshot();
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            // Clone touched tracks + their keyframes arrays so memoising consumers
            // (e.g. GraphRenderer's polyline cache) invalidate correctly via array
            // referential equality. Same fix pattern as updateKeyframes.
            const touchedTracks = new Set<string>();
            state.selectedKeyframeIds.forEach(cid => {
                const [tid] = cid.split('::');
                if (!touchedTracks.has(tid) && newTracks[tid]) {
                    touchedTracks.add(tid);
                    newTracks[tid] = {
                        ...newTracks[tid],
                        keyframes: [...newTracks[tid].keyframes],
                    };
                }
            });
            state.selectedKeyframeIds.forEach(cid => {
                const [tid, kid] = cid.split('::');
                const track = newTracks[tid];
                if (track) {
                    const idx = track.keyframes.findIndex(k => k.id === kid);
                    if (idx === -1) return;
                    const k = track.keyframes[idx];

                    if (mode === 'Split') {
                        track.keyframes[idx] = { ...k, brokenTangents: true, autoTangent: false, tangentMode: undefined };
                    } else if (mode === 'Unified' || mode === 'Aligned') {
                        // Lock both handles to a shared through-direction (average of current
                        // left/right) so the result is order-independent — neither side "wins".
                        // Unified shares magnitude across both handles; Aligned keeps each side's
                        // own length, only locking the angle.
                        const rt = k.rightTangent;
                        const lt = k.leftTangent;
                        let newLt = lt;
                        let newRt = rt;
                        if (rt && lt) {
                            // Through-vector points from left handle tip to right handle tip
                            const tx = rt.x - lt.x;
                            const ty = rt.y - lt.y;
                            const tlen = Math.hypot(tx, ty);
                            if (tlen > 1e-6) {
                                const ux = tx / tlen;
                                const uy = ty / tlen;
                                const lLen = Math.hypot(lt.x, lt.y);
                                const rLen = Math.hypot(rt.x, rt.y);
                                const sharedLen = (lLen + rLen) * 0.5;
                                const useL = mode === 'Unified' ? sharedLen : lLen;
                                const useR = mode === 'Unified' ? sharedLen : rLen;
                                newLt = { x: -ux * useL, y: -uy * useL };
                                newRt = { x:  ux * useR, y:  uy * useR };
                            }
                        }
                        track.keyframes[idx] = {
                            ...k,
                            leftTangent: newLt,
                            rightTangent: newRt,
                            brokenTangents: false,
                            autoTangent: false,
                            // Aligned is the default; only flag explicit Unified.
                            tangentMode: mode === 'Unified' ? 'Unified' : undefined,
                        };
                    } else if (mode === 'Auto' || mode === 'Ease') {
                        const prev = track.keyframes[idx - 1];
                        const next = track.keyframes[idx + 1];
                        const { l, r } = AnimationMath.calculateTangents(k, prev, next, mode, isLogTrack(tid));
                        track.keyframes[idx] = {
                            ...k,
                            autoTangent: mode === 'Auto',
                            brokenTangents: false,
                            leftTangent: l,
                            rightTangent: r
                        };
                    }
                }
            });
            return { sequence: { ...state.sequence, tracks: newTracks } };
        });
    },

    setGlobalInterpolation: (type, tangentMode) => {
        get().snapshot();
        set(state => {
            const newTracks = { ...state.sequence.tracks };
            // Clone every track that has keyframes, clone its keyframes array, and
            // replace each keyframe object with a fresh spread. The original
            // implementation mutated keyframe.interpolation / leftTangent / rightTangent
            // on the same objects held by memoising consumers (GraphRenderer's
            // polyline cache) — stale curve renders until the user moves a key.
            Object.keys(newTracks).forEach(tid => {
                const track = newTracks[tid];
                if (track.keyframes.length === 0) return;

                const trackIsLog = isLogTrack(tid);
                const clonedKeys = track.keyframes.map(k => ({ ...k, interpolation: type }));
                if (type === 'Bezier' && tangentMode) {
                    clonedKeys.forEach((k, i) => {
                        const prev = clonedKeys[i - 1];
                        const next = clonedKeys[i + 1];
                        const { l, r } = AnimationMath.calculateTangents(k, prev, next, tangentMode, trackIsLog);
                        k.leftTangent = l;
                        k.rightTangent = r;
                        k.autoTangent = (tangentMode === 'Auto');
                        k.brokenTangents = false;
                    });
                }
                newTracks[tid] = { ...track, keyframes: clonedKeys };
            });
            return { sequence: { ...state.sequence, tracks: newTracks } };
        });
    },

    // --- CLIPBOARD ---
    copySelectedKeyframes: () => {
        const { sequence, selectedKeyframeIds } = get();
        if (selectedKeyframeIds.length === 0) return;
        
        let minF = Infinity;
        selectedKeyframeIds.forEach(id => { 
            const [tid, kid] = id.split('::'); 
            const f = sequence.tracks[tid]?.keyframes.find(k => k.id === kid)?.frame; 
            if (f !== undefined && f < minF) minF = f; 
        });
        
        const clip: CopiedKeyframe[] = [];
        selectedKeyframeIds.forEach(id => {
            const [tid, kid] = id.split('::'); 
            const k = sequence.tracks[tid]?.keyframes.find(kf => kf.id === kid);
            if (k) {
                clip.push({ 
                    relativeFrame: k.frame - minF, 
                    value: k.value, 
                    interpolation: k.interpolation, 
                    leftTangent: k.leftTangent, 
                    rightTangent: k.rightTangent, 
                    originalTrackId: tid 
                });
            }
        });
        
        if (clip.length > 0) set({ clipboard: clip });
    },

    pasteKeyframes: (atFrame) => {
        const { clipboard, currentFrame } = get();
        if (!clipboard) return;
        get().snapshot();

        set(state => {
            const newTracks = { ...state.sequence.tracks };
            const targetStart = atFrame !== undefined ? atFrame : currentFrame;

            // Clone the tracks we'll modify (one clone per unique target track) so
            // GraphRenderer's polyline cache invalidates by track-ref equality.
            // Previously `track.keyframes = [...]` mutated the original track in
            // place, which the cache happened to see via the new array ref — fragile.
            const touchedTracks = new Set<string>();
            clipboard.forEach(c => {
                if (!touchedTracks.has(c.originalTrackId) && newTracks[c.originalTrackId]) {
                    touchedTracks.add(c.originalTrackId);
                    newTracks[c.originalTrackId] = {
                        ...newTracks[c.originalTrackId],
                        keyframes: [...newTracks[c.originalTrackId].keyframes],
                    };
                }
            });

            clipboard.forEach(c => {
                const track = newTracks[c.originalTrackId];
                if (track) {
                    const f = targetStart + c.relativeFrame;
                    const newKey: Keyframe = {
                        id: nanoid(),
                        frame: f,
                        value: c.value,
                        interpolation: c.interpolation,
                        leftTangent: c.leftTangent,
                        rightTangent: c.rightTangent,
                        autoTangent: false,
                        brokenTangents: false
                    };
                    track.keyframes = [...track.keyframes.filter(k => Math.abs(k.frame - f) > 0.001), newKey].sort((a,b)=>a.frame-b.frame);
                }
            });
            return { sequence: { ...state.sequence, tracks: newTracks } };
        });
    },

    duplicateSelection: () => {
        get().copySelectedKeyframes();
        get().pasteKeyframes(get().currentFrame);
    },

    loopSelection: (times) => {
        const state = get();
        if (state.selectedKeyframeIds.length < 1) return;
        
        state.snapshot();

        // 1. Identify bounds
        let minF = Infinity;
        let maxF = -Infinity;
        
        state.selectedKeyframeIds.forEach(id => { 
            const [tid, kid] = id.split('::'); 
            const track = state.sequence.tracks[tid];
            const k = track?.keyframes.find(kf => kf.id === kid);
            if (k) {
                if (k.frame < minF) minF = k.frame;
                if (k.frame > maxF) maxF = k.frame;
            }
        });
        
        if (minF === Infinity || maxF === -Infinity) return;
        const span = Math.max(1, maxF - minF);

        set(s => {
            const newTracks = { ...s.sequence.tracks };

            // Clone tracks we'll modify (one clone per unique tid in the selection)
            // so memoising consumers see a fresh track ref + fresh keyframes array.
            const touchedTracks = new Set<string>();
            s.selectedKeyframeIds.forEach(id => {
                const [tid] = id.split('::');
                if (!touchedTracks.has(tid) && newTracks[tid]) {
                    touchedTracks.add(tid);
                    newTracks[tid] = {
                        ...newTracks[tid],
                        keyframes: [...newTracks[tid].keyframes],
                    };
                }
            });

            for(let i = 1; i <= times; i++) {
                const offset = span * i;

                s.selectedKeyframeIds.forEach(id => {
                    const [tid, kid] = id.split('::');
                    const track = newTracks[tid];
                    if (!track) return;

                    const originalKey = track.keyframes.find(k => k.id === kid);
                    if (originalKey) {
                        const newFrame = originalKey.frame + offset;
                        const newKey: Keyframe = {
                            ...originalKey,
                            id: nanoid(),
                            frame: newFrame
                        };
                        track.keyframes = [...track.keyframes.filter(k => Math.abs(k.frame - newFrame) > 0.001), newKey];
                    }
                });
            }

            // Sort touched tracks only (cloned arrays). Untouched tracks keep their
            // original references — cache stays warm where it can.
            touchedTracks.forEach(tid => {
                newTracks[tid].keyframes.sort((a, b) => a.frame - b.frame);
            });
            return { sequence: { ...s.sequence, tracks: newTracks } };
        });
    },

    // captureCameraFrame removed — was a GMT-shaped action stuck on the
    // engine-core animation store, with a stub CameraUtils that always
    // returned (0,0,0) for non-GMT apps. All call sites now go through
    // engine/animation/cameraKeyRegistry.captureCameraKeyFrame which is
    // the single host-pluggable entry point. See F5 in
    // docs/engine/20_Fragility_Audit.md.

    simplifySelectedKeys: (tolerance = 0.01) => {
        get().snapshot();
        set((state) => {
            const s = state as AnimationStore;
            const newTracks = { ...s.sequence.tracks };
            const selectedSet = new Set(s.selectedKeyframeIds);
            
            const keysByTrack: Record<string, Keyframe[]> = {};
            s.selectedKeyframeIds.forEach(id => {
                const [tid, kid] = id.split('::');
                if (!keysByTrack[tid]) keysByTrack[tid] = [];
                const track = s.sequence.tracks[tid];
                const key = track?.keyframes.find(k => k.id === kid);
                if (key) keysByTrack[tid].push(key);
            });

            const newSelectionIds: string[] = [];

            Object.entries(keysByTrack).forEach(([tid, selectedKeys]) => {
                const originalTrack = newTracks[tid];
                if (!originalTrack) return;
                
                // Clone track to avoid mutation
                const track = { ...originalTrack };
                newTracks[tid] = track;

                if (selectedKeys.length < 3) return;

                const sortedSelection = selectedKeys.sort((a,b) => a.frame - b.frame);
                
                // Remove existing selected keys
                track.keyframes = track.keyframes.filter(k => !selectedSet.has(`${tid}::${k.id}`));
                
                // Calculate simplified curve
                const simplified = simplifyTrack(sortedSelection, tolerance);
                
                // Merge back
                track.keyframes = [...track.keyframes, ...simplified].sort((a,b) => a.frame - b.frame);
                
                simplified.forEach(k => newSelectionIds.push(`${tid}::${k.id}`));
            });

            return { 
                sequence: { ...s.sequence, tracks: newTracks },
                selectedKeyframeIds: newSelectionIds
            };
        });
    }
});
