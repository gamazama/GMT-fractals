/**
 * GradientStrip — paints a 256-step RGB ramp to a canvas, scaled to fit.
 * Shared by the Generator stage (result hero + A/B source strips), the v2 hero's source
 * half and the shelf.
 *
 * Scaling (owner, 2026-09-07): a BANDED ramp (most adjacent texels identical) is drawn
 * nearest-neighbour + `image-rendering: pixelated`, so its hard edges stay hard at any
 * width — a bilinear scale-up softened every step into a little gradient. A SMOOTH ramp
 * keeps the bilinear scale-up: nearest at 4× would show every texel as a 4 px band.
 */

import React, { useRef, useEffect } from 'react';
import type { RGB } from '../core/oklab';

interface GradientStripProps {
  ramp: RGB[];
  height?: number;
  className?: string;
  rounded?: boolean;
}

/** Most adjacent texels identical → bands. The same 60 % rule the stop fitter uses to call
 *  a ramp banded (palette/core/stopFit.ts, `seedPlateaus`). */
export const isBanded = (ramp: RGB[]): boolean => {
  let same = 0;
  for (let i = 1; i < ramp.length; i++) {
    const a = ramp[i - 1], b = ramp[i];
    if (Math.round(a.r) === Math.round(b.r) && Math.round(a.g) === Math.round(b.g) && Math.round(a.b) === Math.round(b.b)) same++;
  }
  return same >= 0.6 * (ramp.length - 1);
};

export const GradientStrip: React.FC<GradientStripProps> = ({ ramp, height = 40, className = '', rounded = true }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!ramp || ramp.length !== 256) return;
    const tmp = document.createElement('canvas');
    tmp.width = 256;
    tmp.height = 1;
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    const img = tctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = ramp[i].r;
      img.data[i * 4 + 1] = ramp[i].g;
      img.data[i * 4 + 2] = ramp[i].b;
      img.data[i * 4 + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    const banded = isBanded(ramp);
    ctx.imageSmoothingEnabled = !banded;
    cv.style.imageRendering = banded ? 'pixelated' : 'auto';
    ctx.drawImage(tmp, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
    // `height` is a dep: changing the canvas height attribute (e.g. the result
    // "enlarge" toggle) resets the bitmap to blank, so we must repaint — without
    // this the gradient disappears until the ramp next changes.
  }, [ramp, height]);

  return (
    <canvas
      ref={ref}
      width={512}
      height={height}
      className={`block w-full ${rounded ? 'rounded-sm' : ''} ${className}`}
      style={{ height }}
    />
  );
};

export default GradientStrip;
