/**
 * lensBand — where the wall's viewport is drawn, in pixels, on a vertical axis with 1 at
 * the top.
 *
 * Two things draw that band and they must agree exactly: the LENS across the pad
 * (`palette/components/HueLightnessPad.tsx`) and the THUMB on the scrollbar standing beside
 * it (`gradient-explorer/v2/ui/MapScrollbar.tsx`). They are one instrument — the owner reads
 * the lens's edges as pointing at the thumb — so a pixel of disagreement between them reads
 * as the map being wrong.
 *
 * They used to agree by both containing the same three lines of arithmetic, which is not
 * agreement, it is a coincidence maintained by hand: the scrollbar clamped its band into the
 * track and the pad did not, so a range reaching outside 0..1 drew them in different places.
 * One function now, called by both.
 *
 * @invariant the lens and the thumb occupy the same pixels for the same range and height —
 *   proven by: npx tsx debug/test-palette-lensband.mts ("pad and scrollbar agree")
 */

/** The band's top edge and height in px, ready for `style`. */
export interface LensBand {
  top: number;
  height: number;
}

/**
 * The thumb is drawn at the range's EXACT size — a 10 px minimum made it overshoot a band's
 * ~6 px range (owner, 2026-09-08) — so this only keeps it from vanishing. A press anywhere
 * on the track seeks, so it never has to be a grabbable size.
 */
export const MIN_BAND = 3;

/**
 * Where a value on the axis (1 at the top) falls, in px down from the track's top. The one
 * place the axis is turned into pixels, so everything drawn on the track — the lens, the
 * thumb, the scrollbar's reachable extent — lands on the same grid.
 */
export const axisToPx = (v: number, height: number): number => Math.round((1 - v) * height);

/**
 * `range` is [lo, hi] on the axis (1 at the top), in either order. Both edges are clamped
 * into 0..`height`, so a range reaching past the ends draws AT the end rather than through
 * it — which is what makes the two consumers agree at the extremes. Clamping the top alone
 * is not enough: a range like [-2, 3] then keeps its full 280 px height on a 56 px track.
 */
export const lensBand = (range: [number, number], height: number): LensBand => {
  const y0 = Math.max(0, Math.min(height, axisToPx(Math.max(range[0], range[1]), height)));
  const y1 = Math.max(0, Math.min(height, axisToPx(Math.min(range[0], range[1]), height)));
  const h = Math.min(height, Math.max(MIN_BAND, y1 - y0));
  return { top: Math.max(0, Math.min(height - h, y0)), height: h };
};
