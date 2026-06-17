/**
 * fitIterationRange — shared "Fit to view" readback for the fractal renderers (GX's
 * FractalColorRenderer + fluid-toy's FluidEngine). Reads the converged julia MRT's main
 * attachment (texMain = vec4(DE, smoothPot, stripe, injectGate)); the normalized smooth
 * iteration smoothPot = smoothIter/maxIter lives in CHANNEL 1. Takes the 2nd/98th percentiles
 * over escaped pixels, recovers the raw count via the active cap, and returns the {offset, scale}
 * that map that log-iteration window onto the full gradient (the Iterations-mode v2 anchor).
 * Returns null if nothing escaped (all-interior view). One-shot, GPU-stalling readback — only
 * call it on a user action (the Fit button), never per frame.
 */

/** Decode an IEEE half-float (Uint16) → number. Fallback for HALF_FLOAT-only readback. */
const halfToFloat = (hbits: number): number => {
  const s = (hbits & 0x8000) >> 15;
  const e = (hbits & 0x7c00) >> 10;
  const f = hbits & 0x03ff;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 0x1f) return f ? NaN : (s ? -Infinity : Infinity);
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
};

/** Linear-interpolated percentile from a uniform histogram over [lo,hi]. */
const percentileFromHist = (hist: Int32Array, total: number, frac: number, lo: number, hi: number): number => {
  const target = total * frac;
  let cum = 0;
  for (let b = 0; b < hist.length; b++) {
    cum += hist[b];
    if (cum >= target) return lo + ((b + 0.5) * (hi - lo)) / hist.length;
  }
  return hi;
};

export function fitIterationRange(
  gl: WebGL2RenderingContext,
  fbo: WebGLFramebuffer,
  w: number,
  h: number,
  maxIter: number,
): { offset: number; scale: number } | null {
  const n = w * h;
  if (n <= 0) return null;

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  // RGBA16F is not universally FLOAT-readable; ask the driver what it actually supports.
  const readType = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) as number;
  let smoothPotOf: (i: number) => number;
  if (readType === gl.FLOAT) {
    const fbuf = new Float32Array(n * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, fbuf);
    smoothPotOf = (i) => fbuf[i * 4 + 1];
  } else {
    const hbuf = new Uint16Array(n * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.HALF_FLOAT, hbuf);
    smoothPotOf = (i) => halfToFloat(hbuf[i * 4 + 1]);
  }
  const glErr = gl.getError();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (glErr !== gl.NO_ERROR) {
    console.warn('[fitIterationRange] readPixels failed', glErr, 'readType', readType);
    return null;
  }

  const cap = Math.max(maxIter, 1);
  // Escaped pixels have smoothPot in (0,1); interior sits at ~1 (iters clamped to the cap).
  let lo = Infinity;
  let hi = -Infinity;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const sp = smoothPotOf(i);
    if (!Number.isFinite(sp) || sp <= 1e-4 || sp >= 0.999) continue;
    if (sp < lo) lo = sp;
    if (sp > hi) hi = sp;
    count++;
  }
  if (count === 0 || hi <= lo) {
    console.warn('[fitIterationRange] no escaped pixels in view to fit');
    return null;
  }

  const BINS = 256;
  const hist = new Int32Array(BINS);
  const inv = (BINS - 1) / (hi - lo);
  for (let i = 0; i < n; i++) {
    const sp = smoothPotOf(i);
    if (!Number.isFinite(sp) || sp <= 1e-4 || sp >= 0.999) continue;
    hist[Math.round((sp - lo) * inv)]++;
  }
  const spLo = percentileFromHist(hist, count, 0.02, lo, hi);
  const spHi = percentileFromHist(hist, count, 0.98, lo, hi);
  // Map percentile smoothPot → raw count → log-iteration window (the field's units).
  const lLo = Math.log(1 + Math.max(spLo * cap, 0));
  const lHi = Math.log(1 + Math.max(spHi * cap, 0));
  const span = Math.max(lHi - lLo, 1e-3);
  return { offset: lLo, scale: 1 / span };
}
