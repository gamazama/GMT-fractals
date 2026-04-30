
import { StateCreator } from 'zustand';
import { AnimationStore, PlaybackSliceState, PlaybackSliceActions, HistoryItem } from './types';
import { Keyframe, Track } from '../../types';

// Coalesce FPS history entries pushed in rapid succession (e.g. while
// dragging the FPS DraggableNumber, which fires onChange every pixel).
// Without this, a single drag from 30→60 would push 30 undo entries and
// blow out the 50-entry stack. With this, the drag pushes ONE entry —
// the pre-drag state — and undo restores it cleanly.
let lastFpsHistoryAt = 0;
const FPS_COALESCE_MS = 400;

export const createPlaybackSlice: StateCreator<AnimationStore, [["zustand/subscribeWithSelector", never]], [], PlaybackSliceState & PlaybackSliceActions> = (set, get) => ({
    isPlaying: false,
    isRecording: false,
    isScrubbing: false,
    recordCamera: true,
    isCameraInteracting: false,
    currentFrame: 0,
    fps: 30,
    durationFrames: 300,
    loopMode: 'Loop',
    isArmingModulation: false,
    isRecordingModulation: false,
    recordingSnapshot: null,
    deterministicPlayback: false,

    play: () => {
        const s = get();
        
        // Auto-Reset: If at end of timeline, jump to start
        if (s.currentFrame >= s.durationFrames - 0.1) {
             set({ currentFrame: 0 });
        }
        
        // If Armed, transition to Recording Mode immediately and start playback
        if (s.isArmingModulation) {
            // Snapshot before mass recording to prevent feedback loops
            s.snapshot();
            // Capture a DEEP clone of the sequence as the reference "Clean Track"
            // We will read from this snapshot to calculate offsets, ignoring the dirty live track
            const sequenceSnapshot = JSON.parse(JSON.stringify(s.sequence));
            
            set({ 
                isRecordingModulation: true, 
                isArmingModulation: false, 
                recordingSnapshot: sequenceSnapshot,
                isPlaying: true,
                currentFrame: 0 // Always start from beginning for modulation record pass
            });
        } else {
            set({ isPlaying: true });
        }
    },
    pause: () => set({ isPlaying: false, isRecordingModulation: false, recordingSnapshot: null }),
    stop: () => set({ isPlaying: false, currentFrame: 0, isRecordingModulation: false, recordingSnapshot: null }),
    
    toggleRecording: () => set(state => ({ isRecording: !state.isRecording })),
    toggleRecordCamera: () => set(state => ({ recordCamera: !state.recordCamera })),
    
    toggleArmModulation: () => set(state => ({ 
        isArmingModulation: !state.isArmingModulation,
        // Disable manual key recording if we are doing mod recording to avoid conflicts
        isRecording: false 
    })),
    
    stopModulationRecording: () => set({ isRecordingModulation: false, isPlaying: false, recordingSnapshot: null }),
    
    setLoopMode: (mode) => set({ loopMode: mode }),
    
    setIsScrubbing: (v) => set({ isScrubbing: v }),
    setIsCameraInteracting: (v) => set({ isCameraInteracting: v }),
    seek: (frame) => set({ currentFrame: Math.max(0, Math.min(get().durationFrames, frame)) }),
    setDuration: (frames) => { set({ durationFrames: frames }); },
    setFps: (newFps, mode = 'keep') => {
        const state = get();
        const oldFps = state.fps;
        if (newFps < 1 || newFps === oldFps) return;

        // Push one undo entry per drag (not per onChange tick). A continuous
        // drag fires onChange every pixel; without coalescing, one drag from
        // 30→60 would push 30 entries and blow out the stack. The first call
        // captures the pre-drag state; subsequent calls within COALESCE_MS
        // skip pushing — undo still restores the original pre-drag value.
        const now = Date.now();
        const topUndo = state.undoStack[state.undoStack.length - 1];
        const recentFpsEntry = topUndo?.type === 'FPS' && (now - lastFpsHistoryAt) < FPS_COALESCE_MS;
        if (!recentFpsEntry) {
            const undoItem: HistoryItem = {
                type: 'FPS',
                data: {
                    sequence: JSON.parse(JSON.stringify(state.sequence)),
                    fps: state.fps,
                    durationFrames: state.durationFrames,
                    currentFrame: state.currentFrame,
                },
            };
            const newUndo = [...state.undoStack, undoItem];
            set({ undoStack: newUndo.length > 50 ? newUndo.slice(1) : newUndo, redoStack: [] });
        }
        lastFpsHistoryAt = now;

        if (mode === 'keep') {
            set({ fps: newFps });
            return;
        }

        // 'match' — preserve wall-clock time by remapping every frame index
        // by `newFps / oldFps`. Tangent x is in frame units so it scales too;
        // y is value space, untouched. Collisions resolve last-writer-wins.
        const r = newFps / oldFps;
        const remap = (f: number) => Math.max(0, Math.round(f * r));

        set(s => {
            const newTracks: Record<string, Track> = {};
            for (const [tid, t] of Object.entries(s.sequence.tracks)) {
                const seen = new Map<number, Keyframe>();
                for (const k of t.keyframes) {
                    const nf = remap(k.frame);
                    seen.set(nf, {
                        ...k,
                        frame: nf,
                        leftTangent:  k.leftTangent  ? { x: k.leftTangent.x  * r, y: k.leftTangent.y  } : undefined,
                        rightTangent: k.rightTangent ? { x: k.rightTangent.x * r, y: k.rightTangent.y } : undefined,
                    });
                }
                newTracks[tid] = { ...t, keyframes: [...seen.values()].sort((a, b) => a.frame - b.frame) };
            }
            return {
                fps: newFps,
                durationFrames: Math.max(1, remap(s.durationFrames)),
                currentFrame: remap(s.currentFrame),
                sequence: {
                    ...s.sequence,
                    durationFrames: Math.max(1, remap(s.sequence.durationFrames)),
                    tracks: newTracks,
                },
            };
        });
    },
    setDeterministicPlayback: (v) => { set({ deterministicPlayback: v }); },
});
