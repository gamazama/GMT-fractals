/**
 * Flat-track classifier shared between the canvas DopeSheet renderer and the
 * (legacy) TrackRow component. Lives outside any React component so the
 * renderer can import it without pulling in React + JSX.
 */

/** True when every keyframe shares the same value (within epsilon) — i.e. the
 *  track has no animation. Used to dim flat tracks in the timeline. Empty and
 *  single-key tracks count as flat. */
export const isFlatTrack = (keyframes: { value: number }[]): boolean => {
    if (keyframes.length < 2) return true;
    const v0 = keyframes[0].value;
    for (let i = 1; i < keyframes.length; i++) {
        if (Math.abs(keyframes[i].value - v0) > 1e-6) return false;
    }
    return true;
};
