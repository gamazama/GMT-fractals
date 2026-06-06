/**
 * FullscreenGradientOverlay — the W11 fullscreen gradient-config gallery (S6).
 *
 * A DISPLAY-ONLY takeover that paints the active gradient's 256-ramp through one of
 * the pure `palette/core/rampGeometry` mappings (Linear / Radial / Conic / Arched /
 * S-curve / Randomized). A small selector cycles geometries; the stochastic field
 * gets a re-roll button + an amount (strength) slider. The chosen config exports to
 * PNG (the canvas snapshot IS the active geometry). It never mutates gradient data —
 * the previewed config is a snapshot handed in via `openFullscreen`.
 *
 * Two open paths (per the W11 mandate):
 *  1. Non-drag: a result-hero "Fullscreen" button calls `openFullscreen(config)`.
 *  2. Drag: a "Fullscreen" drop-well registered into the engine W4 kernel
 *     (`registerDropWell`) opens it from a dropped gradient payload. Today only
 *     Favients swatches carry the gradient MIME; result-hero drag SOURCES are P2.
 *
 * All view state (geometry / seed / amount / open) is transient + shell-scoped in
 * `fullscreenStore` (not DDFS, not persisted). The mappings are pure; this component
 * owns only the canvas paint + the controls.
 *
 * @see palette/core/rampGeometry.ts (the pure mappings)
 * @see store/dropWellRegistry.ts (the W4 drop-well kernel — interface (b))
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { renderStopsToRamp } from '../palette/core/gmtGradient';
import {
  GEOMETRIES,
  RANDOM_MAX_DIM,
  isStochastic,
  renderGeometry,
} from '../palette/core/rampGeometry';
import {
  closeFullscreen,
  openFullscreen,
  rerollFullscreen,
  setFullscreenAmount,
  setFullscreenGeom,
  useFullscreenState,
} from '../palette/store/fullscreenStore';
import { FAVIENT_DND_MIME, readFavientDrag } from '../palette/core/favientDnd';
import { registerDropWell } from '../store/dropWellRegistry';
import { canvasToPngBlob, downloadBlob } from '../utils/SceneFormat';
import { Z } from '../components/ui/zIndex';

/** Continuous geometries render up to this long edge (CSS stretches to fill). */
const CONTINUOUS_MAX_DIM = 1440;

export const FullscreenGradientOverlay: React.FC = () => {
  const fs = useFullscreenState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Register the "Fullscreen" drop-well ONCE (drag open path). It accepts the
  // gradient MIME and opens the gallery on the dropped config. Result-hero drag
  // sources are P2; today the Favients shelf is the only source carrying this MIME.
  useEffect(
    () =>
      registerDropWell({
        id: 'fullscreen',
        label: 'Fullscreen',
        accepts: (types) => types.includes(FAVIENT_DND_MIME),
        onDrop: (dt) => {
          const p = readFavientDrag(dt);
          if (p) openFullscreen(p.config, p.name);
        },
      }),
    [],
  );

  // Esc dismissal — a direct capture-phase listener so it works regardless of whether
  // the host installed the shortcut registry (the Explorer shell may not have).
  useEffect(() => {
    if (!fs.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeFullscreen();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [fs.open]);

  const ramp = useMemo(
    () =>
      fs.config
        ? renderStopsToRamp(fs.config.stops, fs.config.blendSpace, fs.config.colorSpace)
        : null,
    [fs.config],
  );

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || !ramp) return;
    const cap = isStochastic(fs.geom) ? RANDOM_MAX_DIM : CONTINUOUS_MAX_DIM;
    const cw = stage.clientWidth;
    const ch = stage.clientHeight;
    const scale = Math.min(1, cap / Math.max(cw, ch, 1));
    const w = Math.max(1, Math.round(cw * scale));
    const h = Math.max(1, Math.round(ch * scale));
    // Only resize the backing store when the dimensions actually change — assigning
    // width/height clears the canvas and is wasteful on same-size repaints (the common
    // case for an Amount-slider drag or a re-roll, where only pixel content changes).
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const buf = renderGeometry(ramp, fs.geom, { amount: fs.amount, seed: fs.seed }, w, h);
    const img = ctx.createImageData(w, h);
    img.data.set(buf);
    ctx.putImageData(img, 0, 0);
  }, [ramp, fs.geom, fs.amount, fs.seed]);

  // Repaint on open + whenever the geometry / seed / amount / ramp change.
  useEffect(() => {
    if (fs.open) paint();
  }, [fs.open, paint]);

  // Repaint whenever the stage itself resizes — covers window resize, the toolbar
  // wrapping when the stochastic controls appear, AND a late first measure (the
  // observer fires on observe, so a 0-size first paint self-corrects). The latest
  // `paint` is read through a ref so the observer is created ONCE per open, not
  // re-subscribed on every slider tick.
  const paintRef = useRef(paint);
  paintRef.current = paint;
  useEffect(() => {
    if (!fs.open) return;
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => paintRef.current());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [fs.open]);

  const exportPng = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToPngBlob(canvas);
    if (!blob) return;
    const stem = (fs.name || 'gradient').trim().replace(/\s+/g, '-').toLowerCase() || 'gradient';
    downloadBlob(blob, `${stem}-${fs.geom}.png`);
  }, [fs.name, fs.geom]);

  if (!fs.open || !fs.config) return null;

  const stochastic = isStochastic(fs.geom);

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col bg-black/95 backdrop-blur-sm select-none"
      style={{ zIndex: Z.overlay }}
      data-testid="fullscreen-gradient-overlay"
    >
      {/* Toolbar: geometry selector + (random) controls + export + close. */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-zinc-950/80">
        <div className="text-sm font-medium text-zinc-200 mr-1 truncate max-w-[28ch]">{fs.name}</div>

        <div className="flex items-center rounded-md border border-white/10 overflow-hidden">
          {GEOMETRIES.map((g) => (
            <button
              key={g.id}
              onClick={() => setFullscreenGeom(g.id)}
              className={`px-2.5 py-1 text-[12px] transition-colors ${
                fs.geom === g.id
                  ? 'bg-cyan-500/25 text-cyan-100'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {stochastic && (
          <div className="flex items-center gap-2">
            <button
              onClick={rerollFullscreen}
              title="Re-roll the point field (new seed)"
              className="px-2.5 py-1 text-[12px] rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              ⟳ Re-roll
            </button>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
              Amount
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={fs.amount}
                onChange={(e) => setFullscreenAmount(parseFloat(e.target.value))}
                className="w-28 accent-cyan-400"
                aria-label="Randomization amount"
              />
              <span className="tabular-nums w-7 text-right text-gray-500">
                {Math.round(fs.amount * 100)}
              </span>
            </label>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={exportPng}
            className="px-3 py-1 text-[12px] rounded-md border border-cyan-500/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 transition-colors"
          >
            Export PNG
          </button>
          <button
            onClick={closeFullscreen}
            title="Close (Esc)"
            aria-label="Close fullscreen preview"
            className="px-2.5 py-1 text-[14px] leading-none rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Stage — the canvas fills it; the buffer is sized to this element (capped). */}
      <div ref={stageRef} className="flex-1 min-h-0 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute bottom-2 right-3 text-[10px] text-gray-500/80 pointer-events-none">
          Esc to close · display-only preview
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FullscreenGradientOverlay;
