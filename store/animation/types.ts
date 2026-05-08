
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
    | { type: 'SEQUENCE', data: AnimationSequence }
    | { type: 'FPS', data: { sequence: AnimationSequence; fps: number; durationFrames: number; currentFrame: number } };

export type FpsChangeMode = 'keep' | 'match';

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
    loopMode: LoopMode;
    isArmingModulation: boolean;
    isRecordingModulation: boolean;
    recordingSnapshot: AnimationSequence | null; // Holds the clean sequence before baking
    /** When true, the timeline advances at exactly project fps (regardless
     *  of RAF rate) by accumulating wall-clock dt and stepping integer
     *  frames — so the live preview plays at the same speed as the export
     *  and reproduces the same per-frame state. Modulation oscillators are
     *  phased by `currentFrame / fps` instead of `performance.now()`. Apps
     *  with a controlled engine clock (e.g. fluid-toy's FluidEngine) should
     *  also feed it `currentFrame * 1000 / fps` while this is on. Off by
     *  default — preserves the historic wall-clock playback. */
    deterministicPlayback: boolean;
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
    /** Change the project framerate.
     *  - mode 'keep' (default): keyframes stay at their frame index, so wall-clock
     *    time of each key shifts. Equivalent to historic behaviour.
     *  - mode 'match': keyframes are remapped so their wall-clock time is
     *    preserved (frame * newFps / oldFps). Also rescales durationFrames,
     *    currentFrame, and Bezier handle x-deltas. Pushes an FPS undo entry. */
    setFps: (fps: number, mode?: FpsChangeMode) => void;
    setDeterministicPlayback: (v: boolean) => void;
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
    /** Replace track selection with a single id. */
    setTrackSelection: (id: string) => void;
    /** Toggle a single id in/out of the current track selection. */
    toggleTrackSelection: (id: string) => void;
    /** Add ids to the current track selection (idempotent). */
    addTracksToSelection: (ids: string[]) => void;
    /** Remove ids from the current track selection. */
    removeTracksFromSelection: (ids: string[]) => void;
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
    
    setTangents: (mode: 'Auto' | 'Split' | 'Unified' | 'Aligned' | 'Ease') => void;
    setGlobalInterpolation: (type: 'Linear' | 'Step' | 'Bezier', tangentMode?: 'Auto' | 'Ease') => void;
    
    copySelectedKeyframes: () => void;
    pasteKeyframes: (atFrame?: number) => void;
    duplicateSelection: () => void;
    loopSelection: (times: number) => void;
    
    simplifySelectedKeys: (tolerance?: number) => void;

    snapshot: () => void;
    undo: () => boolean;
    redo: () => boolean;
}

export interface UiSliceState {
    /** Group names currently collapsed in the timeline. Shared between DopeSheet
     *  and GraphSidebar so opening a group in one view persists across view
     *  switches. UI-only state — never saved into GMF, never undoable. */
    collapsedGroups: string[];
    /** Pixel width of the track-label sidebar shared by DopeSheet, GraphSidebar,
     *  TimelineRuler etc. Drag-handle-resizable; clamped by the slice action. */
    timelineSidebarWidth: number;
}

/** A single audio clip placed on the timeline. The `deckIndex` ties the clip
 *  to one of the two AudioAnalysisEngine decks (the deck owns the actual
 *  `<audio>` element + AudioContext source nodes for FFT analysis). The clip
 *  holds the timeline placement: where it starts in frame-time, and how much
 *  of the underlying audio file plays (trim range in seconds). */
export interface AudioClip {
    id: string;
    deckIndex: 0 | 1;
    fileName: string;
    /** Full audio file duration in seconds. */
    durationSeconds: number;
    /** Timeline frame where the clip's first played sample lands. */
    startFrame: number;
    /** Seconds of audio to skip at the start of the file. */
    trimStartSec: number;
    /** Seconds of audio at which playback stops (≤ durationSeconds). */
    trimEndSec: number;
    /** Pre-decoded waveform peaks for visualisation. Each entry is the max
     *  absolute sample amplitude (0..1) over a contiguous slice of the file
     *  (uniform bucket size). 0..2048 entries typically. Computed on load
     *  via decodeAudioData → AudioBuffer; not persisted. */
    peaks?: number[];
}

export interface AudioClipsSliceState {
    /** Indexed by deck: `audioClips[0]` is the deck-0 clip (or null), etc. */
    audioClips: (AudioClip | null)[];
}

export interface AudioClipsSliceActions {
    setAudioClip: (deckIndex: 0 | 1, clip: AudioClip | null) => void;
    updateAudioClip: (deckIndex: 0 | 1, patch: Partial<AudioClip>) => void;
}

export interface UiSliceActions {
    /** Toggle a group's collapsed state. When `isAlt` is true and `allGroupNames`
     *  is supplied, solos the group (collapses all others). */
    toggleCollapsedGroup: (name: string, isAlt?: boolean, allGroupNames?: string[]) => void;
    setCollapsedGroups: (groups: string[]) => void;
    setTimelineSidebarWidth: (w: number) => void;
}

// --- COMPOSITE STORE TYPE ---
export type AnimationStoreState = PlaybackSliceState & SelectionSliceState & SequenceSliceState & UiSliceState & AudioClipsSliceState;
export type AnimationStoreActions = PlaybackSliceActions & SelectionSliceActions & SequenceSliceActions & UiSliceActions & AudioClipsSliceActions;
export type AnimationStore = AnimationStoreState & AnimationStoreActions;
