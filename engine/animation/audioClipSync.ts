import { audioAnalysisEngine } from '../features/audioMod/AudioAnalysisEngine';
import { AudioClip } from '../../store/animation/types';

/** Tolerance (seconds) before we re-seek the underlying `<audio>` element to
 *  match the timeline. Keeping this loose lets the deck free-run between
 *  corrections so we don't fight its native playback rate. */
const SYNC_TOLERANCE = 0.06;

/** Play/pause/seek each loaded audio deck so that its underlying audio
 *  position matches the timeline frame. Called once per ANIMATE tick. */
export function syncAudioClips(
    clips: (AudioClip | null)[],
    currentFrame: number,
    fps: number,
    isPlaying: boolean,
): void {
    if (!clips || clips.length === 0) return;
    const safeFps = Math.max(1, fps);

    clips.forEach(clip => {
        if (!clip) return;
        const deckIndex = clip.deckIndex;

        // Audio offset for the current timeline frame, expressed in source-file
        // seconds. Negative or past-end values mean the playhead is outside
        // the clip's active range.
        const t = ((currentFrame - clip.startFrame) / safeFps) + clip.trimStartSec;
        const inRange = t >= clip.trimStartSec - 1e-6 && t <= clip.trimEndSec + 1e-6;

        const info = audioAnalysisEngine.getTrackInfo(deckIndex);
        if (!info.hasTrack) return;

        if (!isPlaying || !inRange) {
            if (info.isPlaying) audioAnalysisEngine.pause(deckIndex);
            // While scrubbing in-range, keep the deck at the right offset so
            // releasing play resumes from the right place.
            if (inRange && Math.abs(info.currentTime - t) > SYNC_TOLERANCE) {
                audioAnalysisEngine.seek(deckIndex, t);
            }
            return;
        }

        if (Math.abs(info.currentTime - t) > SYNC_TOLERANCE) {
            audioAnalysisEngine.seek(deckIndex, t);
        }
        if (!info.isPlaying) audioAnalysisEngine.play(deckIndex);
    });
}
