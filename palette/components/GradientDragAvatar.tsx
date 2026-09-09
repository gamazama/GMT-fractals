/**
 * GradientDragAvatar — the small ramp that follows the cursor while a gradient is being
 * dragged. Mount it once at a shell's root; it renders nothing until a drag starts.
 *
 * WHY IT HAS TO EXIST. Every gradient drag in the suite goes through
 * `beginCustomAvatarDrag` (`palette/core/favientDnd.ts`), which sets a 1×1 transparent GIF
 * as the drag image — deliberately, on the promise that a custom avatar stands in for it.
 * GE v2 mounts no `GradientDropLayer`, so nothing kept that promise: in the v2 shell a
 * drag showed NOTHING at all between press and drop, which reads as "you cannot drag
 * gradients" rather than "the feedback is missing" (owner, testing the live shell,
 * 2026-09-09). The 2026-09-08 migration audit did not catch it because it asked whether
 * the drag WORKED, not whether it could be seen.
 *
 * DELIBERATELY SIMPLER than the old shell's (owner: "it is a useful feature — even though
 * it can be much simpler now that our UI is more streamlined"). The old `DragAvatar` inside
 * `gradient-explorer/GradientDropLayer.tsx` springs the whole box out of the grabbed
 * swatch's rect on a rAF loop, and comes wrapped in 440 lines of reveal-path, landing and
 * cancel machinery that v2 scrapped (the audit's S1). This is the chip alone: a fixed-size
 * ramp at the cursor, no morph, no spring, no landing. The old one stays where it is for
 * the old shell — this is not a fork of it, it is the part v2 needs.
 *
 * It reads `useDragPayload()` (set by `setFavientDrag`, the one call every gradient drag
 * makes) rather than the hero SELECTION, so that dragging never doubles as a pick, and so
 * a source with no hero of its own — the working hero's own header — gets an avatar too.
 *
 * @see palette/store/dragVisual.ts (the payload slot and the in-flight signal)
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNativeDragging, useDragPayload } from '../store/dragVisual';
import { renderStopsToBuffer } from '../core/gmtGradient';
import { z } from '../../components/ui/zIndex';
import type { GradientConfig } from '../../types';

/** The chip's size — a gradient bar small enough not to cover what you are aiming at. */
const W = 120;
const H = 24;
/** Offset from the cursor: down-right, clear of the pointer itself. */
const DX = 14;
const DY = -12;

export const GradientDragAvatar: React.FC = () => {
  const dragging = useNativeDragging();
  const payload = useDragPayload();
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // `dragover` is the only event that carries coordinates during a drag (pointermove and
  // mousemove are suppressed by the browser while one is in flight). Capture phase, so a
  // target that stops propagation cannot freeze the avatar mid-flight.
  useEffect(() => {
    if (!dragging) {
      setAt(null);
      return;
    }
    const onOver = (e: DragEvent) => setAt({ x: e.clientX, y: e.clientY });
    window.addEventListener('dragover', onOver, true);
    return () => window.removeEventListener('dragover', onOver, true);
  }, [dragging]);

  const config = payload?.config as GradientConfig | undefined;
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !config?.stops) return;
    // DISPLAY sRGB — the stored colorSpace is a bake-for-shader concern (often 'linear',
    // which renders dull). Every swatch in the suite shows sRGB, so the avatar must match.
    const buf = renderStopsToBuffer(config.stops, config.blendSpace, 'srgb');
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    const src = document.createElement('canvas');
    src.width = 256;
    src.height = 1;
    const sctx = src.getContext('2d');
    if (!sctx) return;
    const img = sctx.createImageData(256, 1);
    img.data.set(buf.subarray(0, 256 * 4));
    sctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [config, at !== null]);

  if (!dragging || !config?.stops || !at) return null;

  return createPortal(
    <div
      className="fixed pointer-events-none overflow-hidden rounded-lg border border-line/25"
      data-gx-drag-avatar=""
      style={{
        left: at.x + DX,
        top: at.y + DY,
        width: W,
        height: H,
        zIndex: z('dragGhost'),
        boxShadow: '0 8px 20px -6px rgba(0,0,0,0.55), 0 0 0 1px rgb(var(--accent-400)/0.35)',
        background: 'rgb(var(--surface-dock))',
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>,
    document.body,
  );
};

export default GradientDragAvatar;
