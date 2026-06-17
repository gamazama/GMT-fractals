/**
 * MandelbrotPicker — bottom-right preview canvas for picking the Julia
 * constant `c` by clicking points on the Mandelbrot set.
 *
 * Ported from `toy-fluid/components/MandelbrotPicker.tsx` with the
 * color-mapping enum stripped (the engine-port's fluid display doesn't
 * have GMT's full ColorMapping variants yet). Picker always renders
 * with smooth iterations; the actual fluid display uses the user's
 * gradient + phase + repeat from the Dye panel.
 *
 * Caching — the CPU raster is memoized at module scope keyed on the
 * full set of inputs that influence it, so it survives the component
 * mount/unmount cycle (e.g. when the picker hides/shows via its
 * customUI condition) and is shared across any future caller. Each
 * entry is ~220×220×4 = ~190 KB; we cap the cache at 16 entries.
 */

import React, { useEffect, useRef, useCallback } from 'react';

interface Props {
  cx: number;
  cy: number;
  onChange: (cx: number, cy: number) => void;
  /** Half-extent of the view (world units) — default 1.6 centers the interesting region. */
  halfExtent?: number;
  /** Center of the Mandelbrot view (default −0.5 real). */
  centerX?: number;
  centerY?: number;
  size?: number;
  /** 256×4 RGBA gradient LUT matching the main display. */
  gradientLut?: Uint8Array;
  gradientRepeat?: number;
  gradientPhase?: number;
  /** Interior colour for in-set points, [r,g,b] in 0..1. */
  interiorColor?: [number, number, number];
  /** Iteration power used by z → z^power + c. Default 2. */
  power?: number;
}

const MAX_ITER = 96;

const sampleLut = (lut: Uint8Array, t: number): [number, number, number] => {
  // Wrap t in [0,1), linearly interpolate (matches shader LINEAR filter).
  const w = t - Math.floor(t);
  const f = w * 256;
  const i0 = Math.floor(f) % 256;
  const i1 = (i0 + 1) % 256;
  const frac = f - Math.floor(f);
  const r = lut[i0 * 4 + 0] * (1 - frac) + lut[i1 * 4 + 0] * frac;
  const g = lut[i0 * 4 + 1] * (1 - frac) + lut[i1 * 4 + 1] * frac;
  const b = lut[i0 * 4 + 2] * (1 - frac) + lut[i1 * 4 + 2] * frac;
  return [r, g, b];
};

// LRU-ish module-level raster cache. Key includes every input that
// changes pixel output — `cx/cy` for the crosshair are NOT here because
// the crosshair is stroked on top in a separate overlay pass, not
// rasterized into the cached ImageData. Survives component unmount,
// so toggling the picker's visibility via its customUI condition
// doesn't force a re-raster. Cap = 16 entries × ~190 KB each = ~3 MB.
const RASTER_CACHE_MAX = 16;
const rasterCache = new Map<string, ImageData>();
const lutKeyCache = new WeakMap<Uint8Array, string>();
let lutKeyCounter = 0;

const stableLutKey = (lut: Uint8Array): string => {
    const cached = lutKeyCache.get(lut);
    if (cached !== undefined) return cached;
    const k = `lut${lutKeyCounter++}`;
    lutKeyCache.set(lut, k);
    return k;
};

const cacheKey = (
    size: number,
    centerX: number,
    centerY: number,
    halfExt: number,
    lut: Uint8Array,
    repeat: number,
    phase: number,
    interior: [number, number, number],
    power: number,
): string => (
    `${size}|${centerX}|${centerY}|${halfExt}|${stableLutKey(lut)}|${repeat}|${phase}|` +
    `${interior[0]},${interior[1]},${interior[2]}|${power}`
);

const rasterMandelbrot = (
    size: number,
    centerX: number,
    centerY: number,
    halfExt: number,
    lut: Uint8Array,
    repeat: number,
    phase: number,
    interiorRgb: [number, number, number],
    power: number,
): ImageData => {
    const img = new ImageData(size, size);
    const data = img.data;
    const interiorR = Math.round(interiorRgb[0] * 255);
    const interiorG = Math.round(interiorRgb[1] * 255);
    const interiorB = Math.round(interiorRgb[2] * 255);
    const pInt = Math.round(power);
    const isInt = Math.abs(power - pInt) < 0.01 && pInt >= 2 && pInt <= 8;
    for (let j = 0; j < size; j++) {
        const yy = centerY + ((j / size) * 2 - 1) * halfExt;
        for (let i = 0; i < size; i++) {
            const xx = centerX + ((i / size) * 2 - 1) * halfExt;
            let zx = 0, zy = 0;
            let iter = 0;
            for (; iter < MAX_ITER; iter++) {
                const x2 = zx * zx;
                const y2 = zy * zy;
                if (x2 + y2 > 16) break;
                let pzx: number, pzy: number;
                if (isInt) {
                    let rx = zx, ry = zy;
                    for (let k = 1; k < pInt; k++) {
                        const nrx = rx * zx - ry * zy;
                        ry = rx * zy + ry * zx;
                        rx = nrx;
                    }
                    pzx = rx; pzy = ry;
                } else {
                    const mag = Math.sqrt(x2 + y2);
                    const ang = Math.atan2(zy, zx);
                    const rm = Math.pow(mag, power);
                    const ra = ang * power;
                    pzx = rm * Math.cos(ra);
                    pzy = rm * Math.sin(ra);
                }
                zx = pzx + xx;
                zy = pzy + yy;
            }
            const idx = ((size - 1 - j) * size + i) * 4;
            if (iter >= MAX_ITER) {
                data[idx + 0] = interiorR;
                data[idx + 1] = interiorG;
                data[idx + 2] = interiorB;
            } else {
                // Smooth iteration count — standard escape-time fixup:
                // i + 1 - log2(log2(|z|²) / 2).
                const smoothI = iter + 1 - Math.log2(Math.max(1e-6, 0.5 * Math.log2(zx * zx + zy * zy)));
                const t0 = smoothI * 0.05;
                const t = t0 * repeat + phase;
                const [r, g, b] = sampleLut(lut, t);
                data[idx + 0] = Math.round(r);
                data[idx + 1] = Math.round(g);
                data[idx + 2] = Math.round(b);
            }
            data[idx + 3] = 255;
        }
    }
    return img;
};

/**
 * Cached entry point. Identical-input calls return the same ImageData
 * without re-rasterizing. Re-orders the LRU so the most-recently-touched
 * entry survives eviction longest.
 */
const renderMandelbrot = (
    size: number,
    centerX: number,
    centerY: number,
    halfExt: number,
    lut: Uint8Array,
    repeat: number,
    phase: number,
    interiorRgb: [number, number, number],
    power: number,
): ImageData => {
    const key = cacheKey(size, centerX, centerY, halfExt, lut, repeat, phase, interiorRgb, power);
    const hit = rasterCache.get(key);
    if (hit) {
        // Touch: delete + re-insert to move to the "most recent" end.
        rasterCache.delete(key);
        rasterCache.set(key, hit);
        return hit;
    }
    const img = rasterMandelbrot(size, centerX, centerY, halfExt, lut, repeat, phase, interiorRgb, power);
    rasterCache.set(key, img);
    while (rasterCache.size > RASTER_CACHE_MAX) {
        const oldest = rasterCache.keys().next().value;
        if (oldest === undefined) break;
        rasterCache.delete(oldest);
    }
    return img;
};

// Grey fallback so the component can render before a gradient is wired.
const FALLBACK_LUT = (() => {
  const b = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) { b[i * 4] = b[i * 4 + 1] = b[i * 4 + 2] = i; b[i * 4 + 3] = 255; }
  return b;
})();

export const MandelbrotPicker: React.FC<Props> = ({
  cx, cy, onChange,
  halfExtent = 1.6,
  centerX = -0.5,
  centerY = 0.0,
  size = 220,
  gradientLut,
  gradientRepeat = 1.0,
  gradientPhase = 0.0,
  interiorColor = [0.04, 0.04, 0.06],
  power = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<ImageData | null>(null);
  const draggingRef = useRef(false);

  // Re-render the Mandelbrot image when anything other than cx/cy changes.
  // The crosshair overlay is a separate pass so moving c doesn't re-raster.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    cv.width = size;
    cv.height = size;
    const lut = gradientLut ?? FALLBACK_LUT;
    const img = renderMandelbrot(size, centerX, centerY, halfExtent, lut, gradientRepeat, gradientPhase, interiorColor, power);
    imageRef.current = img;
    ctx.putImageData(img, 0, 0);
    drawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, centerX, centerY, halfExtent, gradientLut, gradientRepeat, gradientPhase, interiorColor[0], interiorColor[1], interiorColor[2], power]);

  const drawOverlay = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !imageRef.current) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageRef.current, 0, 0);
    const u = (cx - centerX) / halfExtent * 0.5 + 0.5;
    const v = (cy - centerY) / halfExtent * 0.5 + 0.5;
    const px = u * size;
    const py = (1 - v) * size;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - 8, py); ctx.lineTo(px - 2, py);
    ctx.moveTo(px + 2, py); ctx.lineTo(px + 8, py);
    ctx.moveTo(px, py - 8); ctx.lineTo(px, py - 2);
    ctx.moveTo(px, py + 2); ctx.lineTo(px, py + 8);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,255,200,0.9)';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 2 * Math.PI);
    ctx.stroke();
  }, [cx, cy, centerX, centerY, halfExtent, size]);

  useEffect(() => { drawOverlay(); }, [drawOverlay]);

  const pickFromEvent = (e: React.PointerEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = 1 - (e.clientY - rect.top) / rect.height;
    const fx = centerX + (u * 2 - 1) * halfExtent;
    const fy = centerY + (v * 2 - 1) * halfExtent;
    onChange(fx, fy);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">Pick Julia c</div>
      <canvas
        ref={canvasRef}
        className="rounded border border-white/10 cursor-crosshair"
        style={{ width: size, height: size, imageRendering: 'pixelated' }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          pickFromEvent(e);
        }}
        onPointerMove={(e) => { if (draggingRef.current) pickFromEvent(e); }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {
            /* pointer capture may have been lost on re-render */
          }
        }}
      />
      <div className="text-[10px] font-mono text-gray-500">
        c = ({cx.toFixed(4)}, {cy.toFixed(4)})
      </div>
    </div>
  );
};
