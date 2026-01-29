
import { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import * as THREE from 'three';
import { AnimationStore, SequenceSliceState, SequenceSliceActions, HistoryItem, CopiedKeyframe } from './types';
import { Track, Keyframe, AnimationSequence } from '../../types';
import { engine } from '../../engine/FractalEngine';
import { CameraUtils } from '../../utils/CameraUtils';
import { simplifyTrack } from '../../utils/CurveFitting';
import { AnimationMath } from '../../engine/math/AnimationMath';
import { TrackUtils } from '../../engine/algorithms/TrackUtils';

const DEFAULT_SEQUENCE: AnimationSequence = {
    durationFrames: 300,
    fps: 30,
    tracks: {}
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
        const { undoStack, redoStack, sequence } = get();
        if (undoStack.length === 0) return false;

        const item = undoStack[undoStack.length - 1];
        const newUndo = undoStack.slice(0, -1);
        
        const currentClone = JSON.parse(JSON.stringify(sequence));
        const redoItem: HistoryItem = { type: 'SEQUENCE', data: currentClone };
        
        set({ sequence: item.data, undoStack: newUndo, redoStack: [redoItem, ...redoStack] });
        return true;
    },

    redo: () => {
        const { undoStack, redoStack, sequence } = get();
        if (redoStack.length === 0) return false;

        const item = redoStack[0];
        const newRedo = redoStack.slice(1);
        
        const currentClone = JSON.parse(JSON.stringify(sequence));
        const undoItem: HistoryItem = { type: 'SEQUENCE', data: currentClone };
        
        set({ sequence: item.data, undoStack: [...undoStack, undoItem], redoStack: newRedo });
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

    addKeyframe: (trackId, frame, value, explicitInterpolation) => {
        set(state => {
            const track = state.sequence.tracks[trackId];
            if (!track) return state;
            
            let interpolation: 'Linear' | 'Step' | 'Bezier' = explicitInterpolation || 'Bezier';
            if (!explicitInterpolation) {
                // Determine best interpolation based on history
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
                const { l, r } = AnimationMath.calculateTangents(tempKey, prev, next, 'Auto');
                tempKey.leftTangent = l; 
                tempKey.rightTangent = r;
            }

            TrackUtils.updateNeighbors(sorted, idx);
            
            return { 
                sequence: { 
                    ...state.sequence, 
                    tracks: { ...state.sequence.tracks, [trackId]: { ...track, keyframes: sorted } } 
                } 
            };
        });
    },

    // Optimized batch operation for modulation recording to prevent UI jitter
    // Uses O(1) append strategy for forward recording instead of O(N log N) sorting
    batchAddKeyframes: (frame, updates, explicitInterpolation) => {
        set(state => {
            // Shallow clone tracks object
            const newTracks = { ...state.sequence.tracks };
            let hasChanges = false;
            
            updates.forEach(({ trackId, value }) => {
                // Auto-create track if missing
                if (!newTracks[trackId]) {
                    newTracks[trackId] = { id: trackId, type: 'float', label: trackId, keyframes: [] };
                    hasChanges = true;
                }
                
                const track = newTracks[trackId];
                
                // Deep clone keyframes only for affected tracks
                const newKeyframes = [...track.keyframes];

                // Optimization: Check the LAST keyframe.
                // If we are recording forward, we just need to append or overwrite the last key.
                const lastKey = newKeyframes.length > 0 ? newKeyframes[newKeyframes.length - 1] : null;

                const newKey: Keyframe = { 
                    id: nanoid(), 
                    frame, 
                    value, 
                    interpolation: explicitInterpolation || 'Linear', 
                    autoTangent: explicitInterpolation === 'Bezier', 
                    brokenTangents: false 
                };

                if (lastKey) {
                    if (frame > lastKey.frame) {
                        // Append (Fastest)
                        newKeyframes.push(newKey);
                    } else if (Math.abs(frame - lastKey.frame) < 0.001) {
                        // Overwrite last key (Fast)
                        // Use existing ID to prevent React list thrashing
                        newKey.id = lastKey.id;
                        newKeyframes[newKeyframes.length - 1] = newKey;
                    } else {
                        // Insert in middle (Slow - Standard Sort)
                        // Filter out existing key at this frame
                        const filtered = newKeyframes.filter(k => Math.abs(k.frame - frame) > 0.001);
                        filtered.push(newKey);
                        filtered.sort((a,b) => a.frame - b.frame);
                        
                        // Replace array
                        track.keyframes = filtered;
                        hasChanges = true;
                        return; // Done with this update
                    }
                } else {
                    // First key
                    newKeyframes.push(newKey);
                }

                track.keyframes = newKeyframes;
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
            // Ensure proper sort after bulk update
            Object.keys(newTracks).forEach(tid => {
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
            state.selectedKeyframeIds.forEach(cid => {
                const [tid, kid] = cid.split('::');
                const track = newTracks[tid];
                if (track) {
                    const idx = track.keyframes.findIndex(k => k.id === kid);
                    if (idx === -1) return;
                    const k = track.keyframes[idx];
                    
                    if (mode === 'Split') {
                        track.keyframes[idx] = { ...k, brokenTangents: true, autoTangent: false };
                    } else if (mode === 'Unified') {
                        let rt = k.rightTangent!;
                        let lt = k.leftTangent!;
                        if (rt && lt) {
                            const len = Math.sqrt(rt.x*rt.x + rt.y*rt.y);
                            const normL = Math.sqrt(lt.x*lt.x + lt.y*lt.y);
                            // Project right to match left
                            rt = { x: -lt.x * (len/Math.max(0.001, normL)), y: -lt.y * (len/Math.max(0.001, normL)) };
                        }
                        track.keyframes[idx] = { ...k, rightTangent: rt, brokenTangents: false, autoTangent: false };
                    } else if (mode === 'Auto' || mode === 'Ease') {
                        const prev = track.keyframes[idx - 1];
                        const next = track.keyframes[idx + 1];
                        const { l, r } = AnimationMath.calculateTangents(k, prev, next, mode);
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
            Object.keys(newTracks).forEach(tid => {
                const track = newTracks[tid];
                if (track.keyframes.length === 0) return;
                
                track.keyframes.forEach((k, i) => {
                    k.interpolation = type;
                    if (type === 'Bezier' && tangentMode) {
                        const prev = track.keyframes[i-1];
                        const next = track.keyframes[i+1];
                        const { l, r } = AnimationMath.calculateTangents(k, prev, next, tangentMode);
                        k.leftTangent = l;
                        k.rightTangent = r;
                        k.autoTangent = (tangentMode === 'Auto');
                        k.brokenTangents = false;
                    }
                });
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
            
            // Explicit cast to Track to ensure TS knows about keyframes property
            Object.values(newTracks).forEach(t => (t as Track).keyframes.sort((a,b) => a.frame - b.frame));
            return { sequence: { ...s.sequence, tracks: newTracks } };
        });
    },

    // --- COMPLEX OPS ---
    captureCameraFrame: (frame, skipSnapshot = false, interpolation) => {
        if (!engine.activeCamera) return;
        if (!skipSnapshot) get().snapshot();
        
        // Use Unified Coordinate Utility
        const unified = CameraUtils.getUnifiedFromEngine();
        
        // Get Rotation as Euler (Radians for storage)
        const q = engine.activeCamera.quaternion;
        const euler = new THREE.Euler().setFromQuaternion(q);
        
        const cameraTracks = [
            { id: 'camera.unified.x', val: unified.x, label: 'Position X' },
            { id: 'camera.unified.y', val: unified.y, label: 'Position Y' },
            { id: 'camera.unified.z', val: unified.z, label: 'Position Z' },
            { id: 'camera.rotation.x', val: euler.x, label: 'Rotation X' },
            { id: 'camera.rotation.y', val: euler.y, label: 'Rotation Y' },
            { id: 'camera.rotation.z', val: euler.z, label: 'Rotation Z' }
        ];

        set(state => {
            const newTracks = { ...state.sequence.tracks };
            
            const xTrack = newTracks['camera.unified.x'];
            const isFirstCamKey = !xTrack || xTrack.keyframes.length === 0;
            const smartInterp = interpolation || (isFirstCamKey ? 'Linear' : 'Bezier');
            
            cameraTracks.forEach(t => {
                let track = newTracks[t.id];
                if (!track) {
                    track = { id: t.id, type: 'float', label: t.label, keyframes: [], hidden: false };
                    newTracks[t.id] = track;
                }
                
                const newKey: Keyframe = { 
                    id: nanoid(), 
                    frame, 
                    value: t.val, 
                    interpolation: smartInterp, 
                    autoTangent: smartInterp === 'Bezier', 
                    brokenTangents: false 
                };
                
                const others = track.keyframes.filter(k => Math.abs(k.frame - frame) > 0.001);
                const sorted = [...others, newKey].sort((a,b) => a.frame - b.frame);
                const idx = sorted.findIndex(k => k.id === newKey.id);
                
                if (smartInterp === 'Bezier') {
                    const prev = idx > 0 ? sorted[idx-1] : undefined;
                    const next = idx < sorted.length-1 ? sorted[idx+1] : undefined;
                    const { l, r } = AnimationMath.calculateTangents(newKey, prev, next, 'Auto');
                    newKey.leftTangent = l; 
                    newKey.rightTangent = r;
                }
                
                TrackUtils.updateNeighbors(sorted, idx);
                track.keyframes = sorted;
            });
            
            return { sequence: { ...state.sequence, tracks: newTracks } };
        });
    },

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
