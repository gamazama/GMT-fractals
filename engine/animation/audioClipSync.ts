import { audioAnalysisEngine } from '../features/audioMod/AudioAnalysisEngine';
import { AudioClip } from '../../store/animation/types';

/** A frame-jump bigger than this fraction of a timeline-second is treated as a
 *  user scrub. Slow renders advance the timeline in chunks too — at 25Hz RAF
 *  that's 40ms per tick, well under 0.5s — so naturally-paced ticks never
 *  trip this even when the GPU is struggling.
 *
 *  @invariant 0.5s threshold is calibrated against a 25Hz RAF (~40ms/tick).
 *    If ANIMATE ticks slower than ~2Hz, false scrub-seeks will appear. */
const SCRUB_JUMP_SEC = 0.5;

const ownedDecks = new Set<number>();

let prevFrame: number | null   = null;
let prevPlaying: boolean | null = null;

/** Reset between sessions / tests. */
export function _resetAudioClipSync() {
    ownedDecks.clear();
    prevFrame   = null;
    prevPlaying = null;
}

/** Play / pause / seek each loaded audio deck so its position matches the
 *  timeline. Called once per ANIMATE tick.
 *
 *  Smoothness rule: NEVER seek during steady-state play. Each seek call is an
 *  audible click on the `<audio>` element, and the deck's native clock is
 *  already accurate (real-time playback against a real-time timeline). The
 *  only times we touch the deck while playing are real events:
 *  - just resumed (paused → playing) → seek to the right offset, play.
 *  - just scrubbed (frame jump > 0.5s timeline time) → seek to the new offset.
 *  - playhead crosses out of the clip's range → pause.
 *
 *  Brief render stalls produce 5-frame jumps — that's about 0.2s at 25fps,
 *  well under the scrub threshold, so they don't trigger seeks. Deck free-runs
 *  through them, timeline catches up on the next render. */
/**
 * @invariant Module globals (`prevFrame`, `prevPlaying`, `ownedDecks`)
 *   persist across HMR. Tests must call `_resetAudioClipSync()` between
 *   cases.
 * @invariant Out-of-range during play only pauses an owned deck
 *   (`ownedDecks.has(deckIndex)`) — prevents pausing decks the timeline
 *   never claimed from the AudioMod UI.
 * @invariant Out-of-range during pause clears deck ownership — future
 *   plays from the AudioMod UI are not reclaimed.
 */
export function syncAudioClips(
    clips: (AudioClip | null)[],
    currentFrame: number,
    fps: number,
    isPlaying: boolean,
): void {
    if (!clips || clips.length === 0) return;
    const safeFps = Math.max(1, fps);

    const wasPlaying  = prevPlaying;
    const lastFrame   = prevFrame;
    const justResumed = wasPlaying === false && isPlaying;
    const justPaused  = wasPlaying === true  && !isPlaying;
    const frameDelta  = lastFrame === null ? 0 : (currentFrame - lastFrame);
    const justScrubbed = lastFrame !== null && Math.abs(frameDelta) / safeFps > SCRUB_JUMP_SEC;
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
            if (!inRange) {
                if (ownedDecks.has(deckIndex) && info.isPlaying) {
                    audioAnalysisEngine.pause(deckIndex);
                }
                return;
            }
            if (justResumed || justScrubbed) audioAnalysisEngine.seek(deckIndex, t);
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
