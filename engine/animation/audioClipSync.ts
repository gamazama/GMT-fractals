import { audioAnalysisEngine } from '../features/audioMod/AudioAnalysisEngine';
import { AudioClip } from '../../store/animation/types';

/** Tolerance for "the audio drifted enough that we should re-seek". 250ms is
 *  past the threshold of conscious perception for most material — below that
 *  we let the deck free-run so its native playback isn't constantly chopped
 *  by seek calls (which produce audible clicks). */
const LARGE_DRIFT_SEC = 0.25;

/** Decks the timeline has actively engaged. We only ever pause / seek a deck
 *  we've previously started — otherwise the AudioPanel's manual play controls
 *  (or any other free-running deck use) get killed every animate tick. */
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
 *  Smoothness: while the timeline is playing we DO NOT continuously re-seek
 *  the deck — it free-runs at its native rate, which keeps it in sync with
 *  the timeline (both advance in real wall-clock time). We only seek on
 *  detectable user events:
 *  - just resumed (paused → playing)
 *  - just scrubbed (currentFrame jumped while playing or paused)
 *  - large drift (>250ms) caught by an out-of-band correction
 *
 *  Decks the timeline never owned (i.e. user is driving via AudioPanel) are
 *  left untouched. */
export function syncAudioClips(
    clips: (AudioClip | null)[],
    currentFrame: number,
    fps: number,
    isPlaying: boolean,
): void {
    if (!clips || clips.length === 0) return;
    const safeFps = Math.max(1, fps);

    const wasPlaying   = prevPlaying;
    const lastFrame    = prevFrame;
    const justResumed  = wasPlaying === false && isPlaying;
    const justPaused   = wasPlaying === true  && !isPlaying;
    // A "scrub" is a frame jump bigger than what one tick would produce
    // organically. At ~60Hz RAF and project fps in the 12-120 range, organic
    // advances are < ~5 frames per tick; anything beyond that came from the
    // user dragging the playhead.
    const frameDelta   = lastFrame === null ? 0 : (currentFrame - lastFrame);
    const justScrubbed = lastFrame !== null && Math.abs(frameDelta) > 5;
    prevFrame   = currentFrame;
    prevPlaying = isPlaying;

    clips.forEach(clip => {
        if (!clip) return;
        const deckIndex = clip.deckIndex;
        const info = audioAnalysisEngine.getTrackInfo(deckIndex);
        if (!info.hasTrack) return;

        const t = ((currentFrame - clip.startFrame) / safeFps) + clip.trimStartSec;
        const inRange = t >= clip.trimStartSec - 1e-6 && t <= clip.trimEndSec + 1e-6;
        const drift = Math.abs(info.currentTime - t);

        if (isPlaying) {
            if (!inRange) {
                if (ownedDecks.has(deckIndex) && info.isPlaying) {
                    audioAnalysisEngine.pause(deckIndex);
                }
                return;
            }
            // Seek only on real events; let the deck free-run otherwise.
            const shouldSeek = justResumed || justScrubbed || drift > LARGE_DRIFT_SEC;
            if (shouldSeek) audioAnalysisEngine.seek(deckIndex, t);
            if (!info.isPlaying) audioAnalysisEngine.play(deckIndex);
            ownedDecks.add(deckIndex);
            return;
        }

        // Timeline paused.
        if (justPaused && ownedDecks.has(deckIndex)) {
            if (info.isPlaying) audioAnalysisEngine.pause(deckIndex);
            ownedDecks.delete(deckIndex);
            return;
        }
        if (justScrubbed && ownedDecks.has(deckIndex) && inRange) {
            audioAnalysisEngine.seek(deckIndex, t);
        }
        // Else: timeline isn't driving this deck — leave it alone.
    });
}
