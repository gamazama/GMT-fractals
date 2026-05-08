import { audioAnalysisEngine } from '../features/audioMod/AudioAnalysisEngine';
import { AudioClip } from '../../store/animation/types';

/** Tolerance (seconds) before we re-seek the underlying `<audio>` element to
 *  match the timeline. Loose enough that the deck free-runs between
 *  corrections without us fighting its native playback rate. */
const SYNC_TOLERANCE = 0.06;

/** Decks the timeline has actively engaged. We only ever pause / seek a deck
 *  we've previously started — otherwise the AudioPanel's manual play
 *  controls (or any other free-running deck use) get killed every animate
 *  tick. Cleared when the timeline stops driving that deck. */
const ownedDecks = new Set<number>();

let prevFrame: number | null   = null;
let prevPlaying: boolean | null = null;

/** Reset between sessions / tests. Not exported in the typed API but useful
 *  when wiring fresh AudioContexts in dev. */
export function _resetAudioClipSync() {
    ownedDecks.clear();
    prevFrame   = null;
    prevPlaying = null;
}

/** Play / pause / seek each loaded audio deck so its position matches the
 *  timeline. Called once per ANIMATE tick.
 *
 *  Semantics — the timeline is master only while playing or just-scrubbed:
 *  - isPlaying + in-range → ensure deck plays at the right offset; mark owned.
 *  - isPlaying + out-of-range → pause owned deck; out-of-range deck stays paused.
 *  - just paused (was playing) → pause owned deck; release ownership.
 *  - paused + currentFrame changed (scrub) → seek owned deck so resume picks
 *    up at the right place; non-owned decks are left alone so the AudioPanel's
 *    manual controls keep working. */
export function syncAudioClips(
    clips: (AudioClip | null)[],
    currentFrame: number,
    fps: number,
    isPlaying: boolean,
): void {
    if (!clips || clips.length === 0) return;
    const safeFps = Math.max(1, fps);

    const wasPlaying   = prevPlaying;
    const frameChanged = prevFrame !== null && prevFrame !== currentFrame;
    const justPaused   = wasPlaying === true && !isPlaying;
    prevFrame   = currentFrame;
    prevPlaying = isPlaying;

    clips.forEach(clip => {
        if (!clip) return;
        const deckIndex = clip.deckIndex;
        const info = audioAnalysisEngine.getTrackInfo(deckIndex);
        if (!info.hasTrack) return;

        const t = ((currentFrame - clip.startFrame) / safeFps) + clip.trimStartSec;
        const inRange = t >= clip.trimStartSec - 1e-6 && t <= clip.trimEndSec + 1e-6;

        if (isPlaying) {
            if (inRange) {
                if (Math.abs(info.currentTime - t) > SYNC_TOLERANCE) {
                    audioAnalysisEngine.seek(deckIndex, t);
                }
                if (!info.isPlaying) audioAnalysisEngine.play(deckIndex);
                ownedDecks.add(deckIndex);
            } else if (ownedDecks.has(deckIndex) && info.isPlaying) {
                audioAnalysisEngine.pause(deckIndex);
            }
            return;
        }

        // Timeline paused.
        if (justPaused && ownedDecks.has(deckIndex)) {
            if (info.isPlaying) audioAnalysisEngine.pause(deckIndex);
            ownedDecks.delete(deckIndex);
            return;
        }
        if (frameChanged && ownedDecks.has(deckIndex) && inRange) {
            if (Math.abs(info.currentTime - t) > SYNC_TOLERANCE) {
                audioAnalysisEngine.seek(deckIndex, t);
            }
        }
        // Else: timeline isn't driving this deck right now — leave it alone.
    });
}
