import React, { useEffect, useRef, useCallback } from 'react';
import type { ColorMapping } from '../fluid/FluidEngine';

interface Props {
  cx: number;
  cy: number;
  onChange: (cx: number, cy: number) => void;
  /** Half-extent of the view (world units) — default 1.6 centers the interesting region. */
  halfExtent?: number;
  /** Center of the Mandelbrot view (default 0.5-ish real). */
  centerX?: number;
  centerY?: number;
  size?: number;
  /** 256*4 RGBA gradient LUT matching the main display. */
  gradientLut?: Uint8Array;
  /** How many times to tile the gradient (same as shader uGradientRepeat). */
  gradientRepeat?: number;
  /** Phase shift along the gradient (same as shader uGradientPhase). */
  gradientPhase?: number;
  /** What fractal quantity maps to t. */
  colorMapping?: ColorMapping;
  /** Interior color for points inside the set, as [r,g,b] in 0..1. */
  interiorColor?: [number, number, number];
  /** Iteration power used by z → z^power + c. Default 2 (classic Mandelbrot). */
  power?: number;
}

const MAX_ITER = 96;

function sampleLut(lut: Uint8Array, t: number): [number, number, number] {
  // Wrap t in [0,1), linearly interpolate like the shader's LINEAR filter would.
  const w = t - Math.floor(t);
  const f = w * 256;
  const i0 = Math.floor(f) % 256;
  const i1 = (i0 + 1) % 256;
  const frac = f - Math.floor(f);
  const r = lut[i0 * 4 + 0] * (1 - frac) + lut[i1 * 4 + 0] * frac;
  const g = lut[i0 * 4 + 1] * (1 - frac) + lut[i1 * 4 + 1] * frac;
  const b = lut[i0 * 4 + 2] * (1 - frac) + lut[i1 * 4 + 2] * frac;
  return [r, g, b];
}

/** Mirror the GLSL `colorMappingT` function for modes that don't need per-iteration
 *  accumulators. Orbit traps, stripe, DE, derivative, and trap-iter fall back to
 *  plain smooth iterations here — the picker is a c-selection helper, not a full
 *  fidelity preview. */
function colorMappingT(smoothI: number, zRe: number, zIm: number, mapping: ColorMapping): number {
  switch (mapping) {
    case 'angle':         return Math.atan2(zIm, zRe) * 0.15915494 + 0.5;
    case 'magnitude':     return Math.max(0, Math.min(1, Math.hypot(zRe, zIm) * 0.08));
    case 'decomposition': return (zIm >= 0 ? 0.5 : 0) + 0.25;
    case 'bands':         return Math.floor(smoothI) * 0.0625;
    case 'potential': {
      const r2 = Math.max(zRe * zRe + zIm * zIm, 1.0001);
      return (Math.log2(Math.log2(r2)) * 0.5) % 1;
    }
    // Accumulator-based modes — picker falls back to smooth iterations for the crosshair preview.
    case 'orbit-point':
    case 'orbit-circle':
    case 'orbit-cross':
    case 'orbit-line':
    case 'stripe':
    case 'distance':
    case 'derivative':
    case 'trap-iter':
    case 'iterations':
    default: return smoothI * 0.05;
  }
}

function renderMandelbrot(
  size: number,
  cx: number,
  cy: number,
  halfExt: number,
  lut: Uint8Array,
  repeat: number,
  phase: number,
  mapping: ColorMapping,
  interiorRgb: [number, number, number],
  power: number,
): ImageData {
  const img = new ImageData(size, size);
  const data = img.data;
  const interiorR = Math.round(interiorRgb[0] * 255);
  const interiorG = Math.round(interiorRgb[1] * 255);
  const interiorB = Math.round(interiorRgb[2] * 255);
  // Lift the integer-power check out of the hot loop — it's constant per render.
  const pInt = Math.round(power);
  const isInt = Math.abs(power - pInt) < 0.01 && pInt >= 2 && pInt <= 8;
  for (let j = 0; j < size; j++) {
    const yy = cy + ((j / size) * 2 - 1) * halfExt;
    for (let i = 0; i < size; i++) {
      const xx = cx + ((i / size) * 2 - 1) * halfExt;
      let zx = 0, zy = 0;
      let iter = 0;
      for (; iter < MAX_ITER; iter++) {
        const x2 = zx * zx;
        const y2 = zy * zy;
        if (x2 + y2 > 16) break;

        // z → z^power + c, matching the shader's cpow exactly.
        let pzx: number, pzy: number;
        if (isInt) {
          // Integer fast path: repeated complex multiplication. For p=2 this
          // reduces to one multiply, matching the original hardcoded form.
          let rx = zx, ry = zy;
          for (let k = 1; k < pInt; k++) {
            const nrx = rx * zx - ry * zy;
            ry = rx * zy + ry * zx;
            rx = nrx;
          }
          pzx = rx; pzy = ry;
        } else {
          // Fractional power: polar.
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
        const smoothI = iter + 1 - Math.log2(Math.max(1e-6, 0.5 * Math.log2(zx * zx + zy * zy)));
        const t0 = colorMappingT(smoothI, zx, zy, mapping);
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
}

// Fallback grey LUT so the component can render if no gradient is provided yet.
const FALLBACK_LUT = (() => {
  const b = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) { b[i*4] = b[i*4+1] = b[i*4+2] = i; b[i*4+3] = 255; }
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
  colorMapping = 'iterations',
  interiorColor = [0.04, 0.04, 0.06],
  power = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<ImageData | null>(null);
  const draggingRef = useRef(false);

  // Re-render when view OR gradient OR power changes.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    cv.width = size;
    cv.height = size;
    const lut = gradientLut ?? FALLBACK_LUT;
    const img = renderMandelbrot(size, centerX, centerY, halfExtent, lut, gradientRepeat, gradientPhase, colorMapping, interiorColor, power);
    imageRef.current = img;
    ctx.putImageData(img, 0, 0);
    drawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, centerX, centerY, halfExtent, gradientLut, gradientRepeat, gradientPhase, colorMapping, interiorColor[0], interiorColor[1], interiorColor[2], power]);

  const drawOverlay = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !imageRef.current) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageRef.current, 0, 0);
    // compute crosshair position
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
          try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
        }}
      />
      <div className="text-[10px] font-mono text-gray-500">
        c = ({cx.toFixed(4)}, {cy.toFixed(4)})
      </div>
    </div>
  );
};
