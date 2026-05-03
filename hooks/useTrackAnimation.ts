
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
    // Action functions (addTrack/addKeyframe/removeKeyframe/snapshot) are stable
    // refs from slice init, read lazily via getState() at call time.
    const sequence = useAnimationStore((s) => s.sequence);
    const currentFrame = useAnimationStore((s) => s.currentFrame);
    const isRecording = useAnimationStore((s) => s.isRecording);
    const addTrack = (id: string, lbl: string) => useAnimationStore.getState().addTrack(id, lbl);
    const addKeyframe = (id: string, frame: number, value: number) =>
        useAnimationStore.getState().addKeyframe(id, frame, value);
    const removeKeyframe = (id: string, kfId: string) =>
        useAnimationStore.getState().removeKeyframe(id, kfId);
    const snapshot = () => useAnimationStore.getState().snapshot();

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

    // 2. Click Handler (Toggle)
    const toggleKey = () => {
        if (!trackId) return;
        snapshot();

        if (status === 'keyed') {
            const k = sequence.tracks[trackId].keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);
            if (k) removeKeyframe(trackId, k.id);
        } else {
            if (!sequence.tracks[trackId]) addTrack(trackId, label);
            // In keyed-dirty, dirty, partial, or none states, we add/overwrite key
            addKeyframe(trackId, currentFrame, currentValue);
        }
        FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackId);
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

    return { status, toggleKey, autoKeyOnChange, autoKeyOnDragStart };
};
