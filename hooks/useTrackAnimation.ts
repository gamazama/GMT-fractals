
import { useAnimationStore } from '../store/animationStore';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { KeyStatus } from '../components/Icons';
import { evaluateTrackValue } from '../utils/timelineUtils';

export const useTrackAnimation = (trackId: string | undefined, currentValue: number, label: string) => {
    const { sequence, currentFrame, addTrack, addKeyframe, removeKeyframe, isRecording, snapshot } = useAnimationStore();

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
            const isRotation = /rotation|rot|phase|twist/i.test(trackId) || /param[C-F]/i.test(trackId);
            const interpolated = evaluateTrackValue(track.keyframes, currentFrame, isRotation);
            
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
