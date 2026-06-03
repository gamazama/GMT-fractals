/**
 * GradientStrip — paints a 256-step RGB ramp to a canvas, scaled to fit.
 * Shared by the Generator stage (result hero + A/B source strips).
 */

import React, { useRef, useEffect } from 'react';
import type { RGB } from '../core/oklab';

interface GradientStripProps {
  ramp: RGB[];
  height?: number;
  className?: string;
  rounded?: boolean;
}

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
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [ramp]);

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
