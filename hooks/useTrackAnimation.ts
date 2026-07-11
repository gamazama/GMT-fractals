
import { useAnimationStore } from '../store/animationStore';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { KeyStatus } from '../components/Icons';
import { evaluateTrackValue, isRotationTrack } from '../utils/timelineUtils';

export const useTrackAnimation = (trackId: string | undefined, currentValue: number, label: string) => {
    // Narrow per-field subscriptions instead of destructuring useAnimationStore()
    // (full-store sub). The animationStore receives many no-op `set()` calls per
    // RAF (e.g. AnimationEngine.tick / scrub-style writes that pass equal values),
    // and a full subscription forces every <Slider> in every panel to re-render
    // each time. With narrow selectors Zustand only fires when the chosen field
    // actually changed — verified via debug/probe-fpw.mts: 240 no-op notifs/4s
    // → 0 re-renders here.
    //
    // Action selectors via `useAnimationStore((s) => s.fn)` — Zustand returns
    // the stable slice-init ref and bails on Object.is, so consumers using
    // these in useCallback/useEffect deps get a stable identity across
    // renders. (The earlier wrapper-closure form returned a NEW function each
    // render, which broke drag handlers that pinned listeners via deps.)
    const sequence       = useAnimationStore((s) => s.sequence);
    const currentFrame   = useAnimationStore((s) => s.currentFrame);
    const isRecording    = useAnimationStore((s) => s.isRecording);
    const addTrack       = useAnimationStore((s) => s.addTrack);
    const addKeyframe    = useAnimationStore((s) => s.addKeyframe);
    const removeKeyframe = useAnimationStore((s) => s.removeKeyframe);
    const removeTrack    = useAnimationStore((s) => s.removeTrack);
    const snapshot       = useAnimationStore((s) => s.snapshot);

    // 1. Status Calculation
    const status: KeyStatus = (() => {
        if (!trackId || !sequence.tracks[trackId]) return 'none';
        const track = sequence.tracks[trackId];
        const key = track.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);

        if (key) {
             // Exact key exists
            if (Math.abs(key.value - currentValue) > 0.0001) return 'keyed-dirty';
            return 'keyed';
        } else {
            // No key at this exact frame. Check interpolation.
            const interpolated = evaluateTrackValue(track.keyframes, currentFrame, isRotationTrack(trackId));
            
            // If the user's current value differs significantly from the timeline's interpolated value,
            // show as dirty (indicating a manual override or tweak).
            if (Math.abs(interpolated - currentValue) > 0.001) return 'dirty';
            
            return 'partial';
        }
    })();

    // 2. Explicit actions — click sets, Ctrl+click deletes the key,
    //    Ctrl+Shift+click deletes the whole track. KeyframeButton owns the
    //    modifier/context-menu routing; the hook owns the per-track effects.

    // Add or overwrite the key at the current frame. No-op when the frame is
    // already keyed to the current value (avoids an empty undo step).
    const setKey = () => {
        if (!trackId) return;
        if (status === 'keyed') return;
        snapshot();
        if (!sequence.tracks[trackId]) addTrack(trackId, label);
        addKeyframe(trackId, currentFrame, currentValue);
        FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackId);
    };

    // Remove the key sitting on the current frame, if any.
    const deleteKey = () => {
        if (!trackId) return;
        const track = sequence.tracks[trackId];
        if (!track) return;
        const k = track.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);
        if (!k) return;
        snapshot();
        removeKeyframe(trackId, k.id);
    };

    // Remove the entire track (removeTrack snapshots internally).
    const deleteTrack = () => {
        if (!trackId || !sequence.tracks[trackId]) return;
        removeTrack(trackId);
    };

    // 3. Auto-Recording Helpers
    const autoKeyOnChange = (newValue: number) => {
        if (trackId && isRecording) {
            const hasTrack = !!sequence.tracks[trackId];
            if (!hasTrack) addTrack(trackId, label);
            addKeyframe(trackId, currentFrame, newValue);
        }
    };

    const autoKeyOnDragStart = () => {
        if (trackId && isRecording) {
            snapshot();
            FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackId);
        }
    };

    return { status, setKey, deleteKey, deleteTrack, autoKeyOnChange, autoKeyOnDragStart };
};
