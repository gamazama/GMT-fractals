/**
 * deep-zoom/host/dive.ts - the dive: fly straight ahead until the surface is about a given
 * distance away. It is what `DeepZoomHost.diveTo(depth)` runs.
 *
 * PURPOSE
 *   The loop is last week's prototype loop (`diveTo` in `deep-zoom-prototype/bridge.ts`), not the
 *   module's own `api.dz.diveTo`. The module's version catches up with its schedule by moving 40 to
 *   70 % of the distance estimate in one frame; in deep mode that estimate comes from a reference
 *   orbit with a bailout of 2 and can be well over the true distance, so a dive from a starter view
 *   overshot by two decades or ran through the surface (depth reads 0). Here every frame moves a
 *   small share (at most a fifth) of the CURRENT estimate, so the approach is exponential and
 *   cannot jump.
 *
 * THE SEAM
 *   - Made once per host by `deep-zoom/host/moduleHost.ts` (`createDive(deps)`), which hands it
 *     three functions over the module (`depth`, `look`, `moveAlong`) and the key target. This file
 *     loads nothing: not the renderer, not the DOM, no clock of its own.
 *   - THE CLOCK IS THE HOST'S `step`. `advance(now)` is called by `moduleHost.ts` once after every
 *     frame the renderer actually ran, with that frame's timestamp. There is no
 *     requestAnimationFrame in here, on purpose: the module refreshes its distance inside its own
 *     frame, for the camera position that frame started with (grep `distance probe` in
 *     `deep-zoom/renderer/core.js`), and with `autoStart: false` that frame runs only from
 *     `host.step`. A loop on the browser's animation frames would keep moving on a distance
 *     nobody refreshed whenever the engine loop is stopped or a render owns the context (the frame
 *     returns early: grep `if (exporting)` in `function frame`), and every such move is measured
 *     somewhere the camera no longer is. Advancing after a frame that ran makes "one move per
 *     fresh distance" hold by construction.
 *   - It ends, and the promise resolves, on: arrival (`depth <= target`, which also covers a
 *     camera that got inside, where the depth reads 0); `cancel()`; a newer `start()`; a fly key
 *     or Escape on the key target; `DZ_DIVE_TIME_LIMIT_MS` of flight. It does not say which.
 *
 * PITFALLS
 *   - Call `advance` only after a frame that ran. A second call for the same frame moves again on
 *     the same distance; that is the overshoot this file exists to avoid.
 *   - With the engine loop stopped nothing advances and nothing times out: the promise stays
 *     pending until the loop runs again, `cancel()`, or the host is disposed (which cancels).
 *   - The time limit counts flight, not the wall clock: the gap between two advances counts for at
 *     most a second, so a tab left in the background does not use the dive up.
 *   - The target is never below `DZ_DIVE_MIN_DEPTH` (1e-77): the camera is 256-bit fixed point,
 *     about 77 digits, and a move smaller than one step of it is no move.
 *   - The direction is read every frame, so the mouse can steer during a dive. The formula must
 *     stay the module's (grep `function basis` in core.js).
 *   - The first advance after `start` moves nothing: it only takes the timestamp.
 *
 * @invariant A head-on dive lands between 0.95 x target and target, takes at most a fifth of the
 *   distance per frame, stops moving on `cancel()`, ends on a fly key and after 45 s of flight (a
 *   gap between two advances counting for a second at most), and never aims below 1e-77 - proven
 *   by: npx tsx debug/deep-zoom-checks/module-host.mts ("dive: six head-on dives each land ...",
 *   "dive: no move is more than a fifth ...", "dive: cancel() resolves it ...", "dive: a fly key
 *   ends it ...", "dive: a dive that never arrives ...", "dive: a ten-minute gap ...", "dive: a
 *   target below 1e-77 ..."). Falsified 2026-10-08: the "dive" group in the check's header.
 * @assumption A fifth of the module's distance estimate per frame cannot pass the surface. True for
 *   a distance estimate that is a lower bound; the module's deep estimate is not always one (see
 *   PURPOSE). The prototype flew this loop on a real GPU last week; this port has not been flown.
 */

/** The deepest target a dive accepts. */
export const DZ_DIVE_MIN_DEPTH = 1e-77;
/** A dive gives up after this much flight; the caller compares the depth and may dive again. */
export const DZ_DIVE_TIME_LIMIT_MS = 45_000;
/** The largest share of the distance one frame may fly once within a decade of the target. */
export const DZ_DIVE_NEAR_SHARE = 0.05;
/** How many frames in a row must read at or under the target before the dive has arrived. */
export const DZ_DIVE_ARRIVAL_FRAMES = 3;

/** The longest gap between two advances that counts toward the time limit. */
const MAX_COUNTED_GAP_MS = 1000;
/** The keys that take the camera back: the module's fly keys (grep `function isFlying` in core.js)
 *  and Escape. */
const CANCEL_KEYS: ReadonlySet<string> = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Escape']);

/** Where the fly keys arrive: the module's key target (`#dz-frame`). */
export type DiveKeyTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export interface DiveDeps {
    /** The surface distance at the camera, as of the frame that just ran (telemetry depth). */
    depth(): number;
    /** The look angles now, in radians. */
    look(): { yaw: number; pitch: number };
    /** An exact move of `distance` world units along the unit vector `dir`. */
    moveAlong(dir: [number, number, number], distance: number): void;
    /** null or absent: no key ends a dive. */
    keyTarget?: DiveKeyTarget | null;
}

export interface Dive {
    /** Begin a dive; one already in flight ends first. Resolves at once when already that deep. */
    start(depth: number): Promise<void>;
    /** One step. Call once after each frame the renderer ran; `now` is that frame's timestamp in ms. */
    advance(now: number): void;
    /** End the dive in flight (its promise resolves). Nothing to end is fine. */
    cancel(): void;
    readonly active: boolean;
}

/** The unit look direction, exactly as the module builds it (grep `function basis` in core.js). */
function forward(yaw: number, pitch: number): [number, number, number] {
    const cp = Math.cos(pitch);
    return [cp * Math.cos(yaw), Math.sin(pitch), cp * Math.sin(yaw)];
}

export function createDive(deps: DiveDeps): Dive {
    interface Run {
        target: number;
        /** e-folds of distance per second. */
        rate: number;
        flownMs: number;
        /** The timestamp of the previous advance; null until the first one. */
        prev: number | null;
        /** Frames in a row whose distance was at or under the target. */
        arrived: number;
        resolve(): void;
    }
    let run: Run | null = null;

    function finish(): void {
        const r = run;
        if (!r) return;
        run = null;
        deps.keyTarget?.removeEventListener('keydown', onKey);
        r.resolve();
    }

    function onKey(e: Event): void {
        if (CANCEL_KEYS.has((e as KeyboardEvent).code)) finish();
    }

    return {
        get active() { return run !== null; },

        start(depth) {
            finish();
            const target = Math.max(DZ_DIVE_MIN_DEPTH, +depth || 1e-6);
            const d0 = deps.depth();
            if (!Number.isFinite(d0) || d0 <= target) return Promise.resolve();
            // The pace: the whole way in 0.6 s a decade, no less than 3 s and no more than 40 s.
            const decades = Math.max(1, Math.log10(d0 / target));
            const rate = (Math.LN10 * decades) / Math.min(40, Math.max(3, decades * 0.6));
            return new Promise<void>((resolve) => {
                run = { target, rate, flownMs: 0, prev: null, arrived: 0, resolve };
                deps.keyTarget?.addEventListener('keydown', onKey);
            });
        },

        advance(now) {
            const r = run;
            if (!r) return;
            const gapMs = r.prev === null ? 0 : Math.max(0, now - r.prev);
            r.prev = now;
            r.flownMs += Math.min(gapMs, MAX_COUNTED_GAP_MS);
            const d = deps.depth();
            // A distance of 0 means the camera is inside the surface: that ends it at once.
            if (!Number.isFinite(d) || d <= 0 || r.flownMs > DZ_DIVE_TIME_LIMIT_MS) { finish(); return; }
            // One frame at or under the target is not arrival: where the module switches between its
            // f32 and deep paths (near 1e-4) the distance can read hundreds of times too small for a
            // single frame (measured 2026-10-08: 3.35e-7 for one frame at a true 2.5e-4).
            if (d <= r.target) {
                if (++r.arrived >= DZ_DIVE_ARRIVAL_FRAMES) finish();
                return;
            }
            r.arrived = 0;
            const dt = Math.min(0.1, gapMs / 1000);
            // Within a decade of the target the steps are small. The module's distance does not
            // fall evenly at depth: it over-reads and then collapses, usually as its iteration count
            // steps up. Traced 2026-10-08 on a dive from 1.1e-17 to 1e-30: 2.4e-24 -> 4.8e-26 and,
            // at the end, 2.3e-29 -> 1.8e-34 across ONE step of 5 %. So a dive can end decades under
            // its target. Small last steps keep that down; only a truer distance in the module
            // (the ray's own hit distance, not the estimate at the camera) can remove it.
            const near = d < r.target * 10;
            const share = Math.min(near ? DZ_DIVE_NEAR_SHARE : 0.2, 1 - Math.exp(-r.rate * dt));
            // Never past 0.95 x target: the last move lands just inside the target instead of on it,
            // so the arrival test above is met by the next frame's distance.
            const want = Math.min(d * share, d - r.target * 0.95);
            if (want > 0) {
                const { yaw, pitch } = deps.look();
                deps.moveAlong(forward(yaw, pitch), want);
            }
        },

        cancel: finish,
    };
}
