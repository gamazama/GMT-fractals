
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';

/**
 * Timeline keyboard shortcuts.
 *
 * Space — Play / Pause animation, with fly-mode conflict resolution:
 *   - Timeline open + hovering timeline → always play/pause
 *   - Timeline open + orbit mode        → play/pause
 *   - Timeline open + fly mode          → space reserved for fly-up (no play/pause)
 *   - Timeline closed + orbit + tracks  → play/pause
 *   - Timeline closed + fly mode        → space reserved for fly-up
 *
 * `showTimeline` must be passed in because it lives in React state (App.tsx).
 * Returns true if the event was consumed so the caller can early-return.
 * Registered via useKeyboardShortcuts (capture phase, after text-input guard).
 */
export function handleTimelineShortcut(e: KeyboardEvent, showTimeline: boolean): boolean {
    if (e.code !== 'Space') return false;

    const { cameraMode, isTimelineHovered } = useEngineStore.getState();
    const { sequence, isPlaying, play, pause } = useAnimationStore.getState();

    let shouldTogglePlay = false;

    if (showTimeline) {
        shouldTogglePlay = cameraMode !== 'Fly' || isTimelineHovered;
    } else {
        const hasTracks = Object.keys(sequence.tracks).length > 0;
        shouldTogglePlay = cameraMode !== 'Fly' && hasTracks;
    }

    if (shouldTogglePlay) {
        e.preventDefault();
        if (isPlaying) pause();
        else play();
        return true;
    }

    return false;
}
