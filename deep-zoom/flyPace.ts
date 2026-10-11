/**
 * deep-zoom/flyPace.ts - the pace: the distance the fly speed is multiplied by, and how fast it
 * may change.
 *
 * PURPOSE
 *   Flying covers `speed x pace` a second. Until 2026-10-09 the pace was the renderer's distance
 *   estimate at the camera, eased as GMT eases it. That number is the nearest surface in ANY
 *   direction, and it reads the true fractal rather than the solid that is drawn. Both were
 *   measured to fail at depth (the study: H:/tmp/dz-nav-study): at the owner's power-4 place the
 *   nearest surface is behind the camera, 22 decades nearer than anything in the picture, so the
 *   speed stayed a million times too slow for the scene after 30 s of flying towards it; at his
 *   power-2 place the estimate read 20 times the free distance and W put the camera inside the
 *   solid in 4 s.
 *   Now the pace is THE NEARER OF WHAT IS LOOKED AT AND WHAT LIES AHEAD OF THE MOVE, each read by
 *   rays from the camera to the drawn solid (`host.sense`). This file is that rule and nothing
 *   else: no host, no DOM, no clock. `deep-zoom/DeepZoomNavigation.tsx` hands it the readings and
 *   the frame's seconds, so it runs in a node check.
 *
 * THE RULE
 *   target  the nearer of the two readings; the one there is when the other was not read; and when
 *           neither was, the pace stands as it is.
 *   fall    at once. The pace is never above its target.
 *   rise    by at most `rise` decades a second, four times that with Shift (the fly integrator's
 *           own boost). This is what makes a wrong far reading harmless: three bad frames at 4
 *           decades a second raise the speed 1.6 times. GMT's ease (and this shell's until now)
 *           works on the distance, not its logarithm: a reading 1000 times too far raised the
 *           speed about 20 times in ONE frame.
 *   reset   after a jump the next reading is taken as it is - no ten-second climb out of the deep
 *           place the camera just left.
 *   The pace is not what keeps the camera out of the surface. That is the one-frame limit:
 *   `DZ_NAV_STRIDE_SHARE` of the nearest ray ahead of the move, applied in `deep-zoom/flyCamera.ts`.
 *
 * A READING (`paceReading`) is A THIRD (`DZ_PACE_SHARE`) of the second nearest of the renderer's
 * seven rays about an axis - the second nearest, so one stray ray, or a hole one ray wide, cannot
 * set it; a third, so a speed setting means what it meant under the old rule (see the constant).
 * Rays that only ran out of steps give a lower bound, which is a fair pace to fly at. With nothing
 * that way at all (every ray left the scene) the caller's fallback stands in, unscaled: the
 * nearest surface in any direction, the old rule.
 *
 * PITFALLS
 *   - `rise` is a feel number the owner sets in flight (Settings > Interface > Camera). At 4 the
 *     22-decade case latches in 5.4 s, 1.3 s with Shift (simulated; not flown when this was written).
 *   - A step's `delta` is cut to `DZ_PACE_MAX_DELTA`: one long frame must not be a second of rise.
 *   - A pace of 0 (the camera inside the solid) is left behind by the first reading above 0, at
 *     once: a slow rise from zero would never start.
 *
 * @invariant The pace takes a nearer target at once, rises towards a farther one by no more than
 *   `rise` decades a second (four times with Shift) however far the target, keeps standing when
 *   nothing was read, and after `reset()` takes the next reading as it is; a reading is a third of
 *   the second nearest ray, 0 inside the solid, and the caller's fallback when nothing lies that
 *   way - proven by: npm run check:deep-zoom-fly-camera ("pace: ...", "reading: ..." lines).
 *   Falsified 2026-10-09: see the check's header.
 */
import type { DzSense } from './host/DeepZoomHost';
import { DZ_SENSE_FAR } from './host/current';

/** Decades a second the pace may rise by, before Shift. The owner's to set in flight. */
export const DZ_PACE_RISE_DEFAULT = 4;
export const DZ_PACE_RISE_RANGE: readonly [number, number] = [0.5, 16];
/** Shift's factor on the rise: the fly integrator's boost (grep `boost ? 4.0` in
 *  engine/plugins/navigation/FlyIntegrator.ts). */
export const DZ_PACE_BOOST = 4;
/** The longest step the rise is counted over, in seconds. */
export const DZ_PACE_MAX_DELTA = 0.125;
/** The most one frame may move, as a share of the nearest ray ahead of the move. */
export const DZ_NAV_STRIDE_SHARE = 0.5;
/**
 * A pace is this share of the free distance a bundle reads. The first build flew at the whole of
 * it; the owner, having flown that (2026-10-09): "fly mode is working pretty great ... i think maybe
 * its 3x too fast overall". That is the measurement too: along his recorded flight the estimate at
 * the camera, which the speed followed until then, read 0.24 to 0.51 of the distance to the middle
 * of the picture (the study's nav-signals.log). At a third the same speed setting flies an ordinary
 * dive as it always did, the wheel's range keeps its meaning, and the two rules could be compared in
 * flight at one setting (while there was a switch between them: until 2026-10-11). His to change;
 * it is a feel number.
 */
export const DZ_PACE_SHARE = 1 / 3;

/**
 * What a bundle of rays says the speed may follow. `fallback`: what stands in when nothing lies
 * that way at all.
 */
export function paceReading(s: DzSense, fallback: number): number {
    if (s.inside) return 0;
    if (s.hits === 0 && s.near > DZ_SENSE_FAR) return fallback;
    return s.second * DZ_PACE_SHARE;
}

/** The distance to what is looked at, for a readout: 0 when fewer than two rays met a surface (the
 *  second nearest is then not a distance to anything), while a ray is still unfinished (the second
 *  nearest may be a lower bound), or with the camera inside the solid. */
export function lookDistance(s: DzSense): number {
    return s.inside || s.open > 0 || s.hits < 2 ? 0 : s.second;
}

export interface PaceFrame {
    /** Seconds since the last step. */
    delta: number;
    /** What is looked at; NaN when it was not read this frame. */
    look: number;
    /** What lies ahead of the move; NaN when nothing is moving. */
    ahead: number;
    /** Decades a second the pace may rise by. */
    rise: number;
    /** Shift is held. */
    boost: boolean;
}

export interface Pace {
    /** One frame. Returns the pace (NaN before the first reading). */
    step(frame: PaceFrame): number;
    /** The next reading is taken as it is (a jump). */
    reset(): void;
    value(): number;
}

export function createPace(): Pace {
    let pace = NaN;
    return {
        step(f) {
            const look = f.look >= 0 ? f.look : NaN, ahead = f.ahead >= 0 ? f.ahead : NaN;
            const target = Number.isNaN(look) ? ahead : Number.isNaN(ahead) ? look : Math.min(look, ahead);
            if (Number.isNaN(target)) return pace;
            if (!(pace > 0)) {
                pace = target;                                   // the first reading, or the first one out of the solid
            } else {
                const seconds = Math.min(Math.max(0, f.delta), DZ_PACE_MAX_DELTA);
                // never above the target (so it falls at once), never more than the rise above itself
                pace = Math.min(target, pace * Math.pow(10, f.rise * (f.boost ? DZ_PACE_BOOST : 1) * seconds));
            }
            return pace;
        },
        reset() { pace = NaN; },
        value: () => pace,
    };
}
