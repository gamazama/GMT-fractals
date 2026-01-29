
import { StateCreator } from 'zustand';
import { AnimationStore, PlaybackSliceState, PlaybackSliceActions } from './types';

export const createPlaybackSlice: StateCreator<AnimationStore, [["zustand/subscribeWithSelector", never]], [], PlaybackSliceState & PlaybackSliceActions> = (set, get) => ({
    isPlaying: false,
    isRecording: false,
    isScrubbing: false,
    recordCamera: true,
    isCameraInteracting: false,
    currentFrame: 0,
    fps: 30,
    durationFrames: 300,
    zoomLevel: 1.0,
    loopMode: 'Loop',
    isArmingModulation: false,
    isRecordingModulation: false,
    recordingSnapshot: null,

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
    setFps: (fps) => { set({ fps }); },
});
