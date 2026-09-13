/**
 * numberDragRate — how far a DRAGGED NUMBER FIELD moves per pixel, relative to the slider track
 * it sits beside.
 *
 * The two gestures on one slider used to share nothing: the track moves `span / trackPx` (a full
 * sweep of the track is the full range), the number moved `step × 0.5` (an absolute rate that
 * ignores the range). They agreed only by coincidence. Measured 2026-09-13 over 706 controls: 31 %
 * of number drags outran their track (a count of 1..8 crossed its range in 14 px), and ~20 log
 * params needed millions of pixels to cross theirs. See plans/pre-release-ui-pass.md §2.1.
 *
 * The rule (owner, 2026-09-13): **the number field is the PRECISION control, so it is always
 * slower than the track — at least `minSlowdown` times, at most `maxSlowdown` times.** Inside that
 * band the step still decides (a fine step sits near the slow end, a coarse one at the fast end).
 * The ceiling is the app's call, not the control's: a fractal studio wants 10× for its 1e-6
 * params, Gradient Explorer 2.5× — supplied through `NumberDragFeelProvider` (./dragFeel.tsx).
 *
 * A number with no track beside it (vector cells, bare numbers) has nothing to disagree with and
 * keeps the step rate — unless a mapping makes the step the wrong unit (a log param's raw step is
 * not a display-space rate), in which case a virtual track of `VIRTUAL_TRACK_PX` stands in.
 *
 * @invariant With a track, the returned rate lies in [trackRate / maxSlowdown, trackRate / minSlowdown]
 *   for every step, sensitivity and span — proven by: npm run test:number-drag-rate ("never faster
 *   than the track / 1.x" and "never slower than maxSlowdown").
 */

export interface NumberDragFeel {
    /** The number drag is at least this many times slower than the track. */
    minSlowdown: number;
    /** …and at most this many times slower. */
    maxSlowdown: number;
}

/** GMT's feel — its 1e-6 params want the deep end (owner, 2026-09-13). */
export const DEFAULT_NUMBER_DRAG_FEEL: NumberDragFeel = { minSlowdown: 2, maxSlowdown: 10 };

/** Stands in for a track when a MAPPED param has bounds but no track is drawn. */
export const VIRTUAL_TRACK_PX = 200;

export interface NumberDragRateInput {
    /** Raw step (the quantum the track also snaps to). */
    step: number;
    /** A caller's multiplier on the step rate (default 1). */
    sensitivity?: number;
    /** Display-space span of the track, |dMax − dMin|; undefined when unbounded. */
    span?: number;
    /** Measured width of the track in px; undefined when no track is drawn. */
    trackPx?: number;
    /** A mapping is active (log / pow / pi) — the raw step is then not a display rate. */
    mapped?: boolean;
    feel?: NumberDragFeel;
}

/** Display units per pixel, before the Shift / Alt precision multiplier. */
export function numberDragRate(input: NumberDragRateInput): number {
    const { step, sensitivity = 1, span, mapped = false, feel = DEFAULT_NUMBER_DRAG_FEEL } = input;
    const stepRate = step * 0.5 * sensitivity;
    const bounded = span !== undefined && Number.isFinite(span) && span > 0;
    if (!bounded) return stepRate;

    const trackPx = input.trackPx !== undefined && input.trackPx > 0
        ? input.trackPx
        : mapped ? VIRTUAL_TRACK_PX : undefined;
    if (trackPx === undefined) return stepRate;

    const trackRate = span / trackPx;
    const fastest = trackRate / Math.max(1, feel.minSlowdown);
    const slowest = trackRate / Math.max(feel.minSlowdown, feel.maxSlowdown, 1);
    return Math.min(fastest, Math.max(slowest, stepRate));
}
