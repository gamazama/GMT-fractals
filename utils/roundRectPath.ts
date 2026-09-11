/**
 * roundRectPath — trace a rounded rectangle onto a 2D context's current path, on every
 * browser the apps run on.
 *
 * `CanvasRenderingContext2D.roundRect` is young: Chrome 99 (2022-03), Safari 16 / iOS 16
 * (2022-09), Firefox 112 (2023-04). The picker wall called it directly for every tile it
 * drew, and on an iPhone on iOS 15 that was a TypeError inside the wall's draw effect —
 * the error boundary replaced the whole Gradient Explorer with its fallback page (owner,
 * 2026-09-11, the first real-phone test of the v2 shell). A phone that is a few years
 * old is exactly the device the Explorer's phone layout exists for.
 *
 * The fallback traces the same shape with four `arcTo` corners. Like `roundRect`, it
 * starts a new subpath and closes it, so a caller's `beginPath()` … `clip()` / `fill()` /
 * `stroke()` bracket is the same either way. Radius is clamped to half the short side,
 * which is what the native call does with a single radius.
 *
 * Feature-detected once per context type, not per call: the check is a property lookup,
 * but the fast path is the native call and the branch costs nothing worth measuring.
 *
 * Guard: `npm run smoke:ge-floor` boots the v2 shell in a phone context with
 * `roundRect` deleted from the prototype and asserts the wall still paints.
 */

const hasNative = typeof CanvasRenderingContext2D !== 'undefined'
  && typeof (CanvasRenderingContext2D.prototype as { roundRect?: unknown }).roundRect === 'function';

export const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  if (hasNative) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

export default roundRectPath;
