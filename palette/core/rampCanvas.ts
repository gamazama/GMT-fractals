/**
 * rampCanvas — paint a packed 256-pixel RGBA ramp into a canvas. The ramp is a `Uint8Array`
 * of 256×4 bytes (RGBA, one row), the form `renderStopsToBuffer` and the baked catalog use.
 *
 * Shared by everything that shows a ramp via raw `putImageData` (the drag avatars + landing /
 * cancel one-shots, and the source-picker swatch) — as opposed to `GradientStrip` /
 * `GradientHoverPreview`, which take an `RGB[]` or a paint callback. DOM-only.
 */

/**
 * Paint `ramp` into `cv` as a 256×1 bitmap (sets the canvas backing store to 256×1). Callers
 * either render the canvas at 256×1 scaled to fit (the cursor-following avatars) or
 * `drawImage`-upscale it onto a display canvas (the source-picker swatch). No-op without a 2D
 * context.
 */
export const paintRampToCanvas = (cv: HTMLCanvasElement, ramp: Uint8Array): void => {
  cv.width = 256;
  cv.height = 1;
  const ctx = cv.getContext('2d');
  if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(ramp), 256, 1), 0, 0);
};
