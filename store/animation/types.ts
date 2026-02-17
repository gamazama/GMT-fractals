
import { AnimationSequence, Track, Keyframe, SoftSelectionType, LoopMode, TrackBehavior } from '../../types';

export interface CopiedKeyframe {
    relativeFrame: number;
    value: number;
    interpolation: 'Linear' | 'Step' | 'Bezier';
    leftTangent?: any;
    rightTangent?: any;
    originalTrackId: string;
}

export type HistoryItem = 
    | { type: 'SEQUENCE', data: AnimationSequence };

// --- SLICE INTERFACES ---

export interface PlaybackSliceState {
    isPlaying: boolean;
    isRecording: boolean;
    isScrubbing: boolean;
    recordCamera: boolean;
    isCameraInteracting: boolean;
    currentFrame: number;
    fps: number;
    durationFrames: number;
    zoomLevel: number;
    loopMode: LoopMode;
    isArmingModulation: boolean;
    isRecordingModulation: boolean;
    recordingSnapshot: AnimationSequence | null; // Holds the clean sequence before baking
}

export interface PlaybackSliceActions {
    play: () => void;
    pause: () => void;
    stop: () => void;
    toggleRecording: () => void;
    toggleRecordCamera: () => void;
    toggleArmModulation: () => void;
    setLoopMode: (mode: LoopMode) => void;
    setIsScrubbing: (v: boolean) => void;
    setIsCameraInteracting: (v: boolean) => void;
    seek: (frame: number) => void;
    setDuration: (frames: number) => void;
    setFps: (fps: number) => void;
    stopModulationRecording: () => void; // Internal helper
}

export interface SelectionSliceState {
    selectedTrackIds: string[];
    selectedKeyframeIds: string[];
    softSelectionRadius: number;
    softSelectionEnabled: boolean;
    softSelectionType: SoftSelectionType;
    bounceTension: number;
    bounceFriction: number;
}

export interface SelectionSliceActions {
    selectTrack: (id: string, multi: boolean) => void;
    selectTracks: (ids: string[], select: boolean) => void;
    selectKeyframe: (trackId: string, keyId: string, multi: boolean) => void;
    selectKeyframes: (ids: string[], multi: boolean) => void;
    deselectAll: () => void;
    deselectAllKeys: () => void;
    setSoftSelection: (radius: number, enabled: boolean) => void;
    setSoftSelectionType: (type: SoftSelectionType) => void;
    setBouncePhysics: (tension: number, friction: number) => void;
}

export interface SequenceSliceState {
    sequence: AnimationSequence;
    clipboard: CopiedKeyframe[] | null;
    undoStack: HistoryItem[];
    redoStack: HistoryItem[];
}

export interface SequenceSliceActions {
    setSequence: (seq: AnimationSequence) => void;
    addTrack: (id: string, label: string) => void;
    removeTrack: (id: string) => void;
    setTrackBehavior: (trackId: string, behavior: TrackBehavior) => void;
    
    addKeyframe: (trackId: string, frame: number, value: number, interpolation?: 'Linear' | 'Step' | 'Bezier') => void;
    batchAddKeyframes: (frame: number, updates: { trackId: string, value: number }[], interpolation?: 'Linear' | 'Step' | 'Bezier') => void;
    removeKeyframe: (trackId: string, keyframeId: string) => void;
    updateKeyframe: (trackId: string, keyframeId: string, updates: Partial<Keyframe>) => void;
    updateKeyframes: (updates: { trackId: string, keyId: string, patch: Partial<Keyframe> }[]) => void;
    
    deleteSelectedKeyframes: () => void;
    deleteAllKeys: () => void;
    deleteAllTracks: () => void;
    
    setTangents: (mode: 'Auto' | 'Split' | 'Unified' | 'Ease') => void;
    setGlobalInterpolation: (type: 'Linear' | 'Step' | 'Bezier', tangentMode?: 'Auto' | 'Ease') => void;
    
    copySelectedKeyframes: () => void;
    pasteKeyframes: (atFrame?: number) => void;
    duplicateSelection: () => void;
    loopSelection: (times: number) => void;
    
    captureCameraFrame: (frame: number, skipSnapshot?: boolean, interpolation?: 'Linear' | 'Step' | 'Bezier') => void;
    simplifySelectedKeys: (tolerance?: number) => void;

    snapshot: () => void;
    undo: () => boolean;
    redo: () => boolean;
}

// --- COMPOSITE STORE TYPE ---
export type AnimationStoreState = PlaybackSliceState & SelectionSliceState & SequenceSliceState;
export type AnimationStoreActions = PlaybackSliceActions & SelectionSliceActions & SequenceSliceActions;
export type AnimationStore = AnimationStoreState & AnimationStoreActions;
