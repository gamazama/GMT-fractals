/**
 * FullscreenGradientOverlay — the W11 fullscreen gradient-config gallery (S6).
 *
 * A DISPLAY-ONLY takeover that shows the active gradient full-bleed through one of the
 * registered fullscreen MODES (the six pure `palette/core/rampGeometry` geometries, plus the
 * canvas-owning modes — live Fractal, Liquify, …). It is mode-AGNOSTIC: it dispatches purely on
 * `gradient-explorer/fullscreen/modeRegistry`, never hard-coding a mode. Two render hosts:
 *   • a shared {@link FullscreenCompositor} (one WebGL2 surface) for cpuField / cpuRaster / glQuad
 *     modes — every one passes through the shared blue-noise dither tail;
 *   • a generic `ownCanvas` host — an empty container a mode `mount()`s its own canvas/renderer/RAF
 *     into (the escape hatch). The overlay forwards the colour source, the dither toggle, and PNG
 *     export through the returned `OwnCanvasHandle`; the mode owns everything else.
 *
 * The chosen mode exports to PNG (the canvas snapshot IS the active mode). It never mutates
 * gradient data — the previewed config is a snapshot handed in via `openFullscreen`.
 *
 * Opened via `openFullscreen(config, name)` — the receive path of the "Fullscreen" send-target
 * registered in `gradient-explorer/gradientTargets.ts` (a bottom-row well in the P2-A dock).
 *
 * All view state (mode / geomParams / open / split / dither) is transient + shell-scoped in
 * `fullscreenStore` (not DDFS, not persisted). The geometry mappings are pure; this component owns
 * the canvas paint + the chrome, and dispatches mode lifecycle to the registry.
 *
 * @see palette/core/rampGeometry.ts (the pure mappings)
 * @see gradient-explorer/fullscreen/modeRegistry.ts (the mode plug-in seam + ownCanvas mount face)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderStopsToRamp, renderStopsToBuffer } from '../palette/core/gmtGradient';
import { DEFAULT_BACKGROUND } from '../palette/core/rampGeometry';
import {
  closeFullscreen,
  setFullscreenConfig,
  setFullscreenGeom,
  setFullscreenSplit,
  setFullscreenSplitY,
  setFullscreenDither,
  setFullscreenHandles,
  useFullscreenState,
  type FullscreenState,
} from '../palette/store/fullscreenStore';
import { useActiveHeroSelection } from '../palette/store/heroSelection';
import { useGeneratorDerived } from '../palette/store/generatorStore';
import type { GradientConfig } from '../types';
import { FullscreenCompositor } from './fullscreen/FullscreenCompositor';
import { GeometryHandleLayer, hasGeometryHandles } from './fullscreen/GeometryHandleLayer';
import { getFullscreenMode, listFullscreenModes } from './fullscreen/modeRegistry';
import type { FullscreenModeContext, OwnCanvasHandle } from './fullscreen/modeRegistry';
import './fullscreen/modes'; // registers the builtin modes at import time
import { canvasToPngBlob, downloadBlob } from '../utils/SceneFormat';
import { Z } from '../components/ui/zIndex';

/** Continuous geometries render up to this long edge. Higher than the old 1440 so the preview
 *  renders at (near-)native device pixels: error-diffusion dither must be at display resolution,
 *  or the browser's bilinear upscale stretches the step-runs and re-introduces banding. */
const CONTINUOUS_MAX_DIM = 2560;

/** Long-edge cap while a handle drag is in flight: the full-res CPU field + error diffusion
 *  costs ~100ms+ at 2560 on big displays — far too slow for pointer-rate repaints. A drag
 *  renders at this cap (slightly soft, fast) and snaps back to full resolution on release. */
const INTERACT_MAX_DIM = 1280;

/** The ctx params handed to modes: the handle-driven shape params. An unset key resolves to
 *  its GEOM_DEFAULT inside the pure mappers — byte-identical to the pre-handles render. ONE
 *  definition so the live-paint and ownCanvas-context paths can't drift. */
const buildParams = (fs: FullscreenState) => fs.geomParams;

/** Resolves the live "working" gradient (the last-modified hero) and reports it upward. Mounted
 *  whenever the overlay is open (split AND plain fullscreen now share this one live path), so the
 *  (heavy) generator derivation runs while the overlay is up — acceptable since fullscreen has no
 *  edit UI. For the editable surfaces (Stops / Generator) it reads the live store so edits reflect
 *  without re-selecting the hero; otherwise it follows the active hero's selected payload, and
 *  reports null (→ the open-time snapshot) when nothing is selected. */
const SplitLiveSource: React.FC<{
  onResolve: (r: { config: GradientConfig; name: string } | null) => void;
}> = ({ onResolve }) => {
  const hero = useActiveHeroSelection();
  // Generator covers Stops too now (its Stops sub-mode resolves to the stops gradient via
  // useGeneratorDerived().config), so there's no separate 'stops' hero mode to special-case.
  const generatorConfig = useGeneratorDerived().config;
  let config: GradientConfig | null = hero?.payload.config ?? null;
  let name = hero?.payload.name ?? 'Gradient';
  if (hero?.mode === 'generator') { config = generatorConfig; name = hero.payload.name || 'Generator'; }
  // Push only when the colour CONTENT changes — a value signature (not object identity) so an
  // unstable store ref can't drive a render loop.
  const sig = config
    ? config.stops.map((s) => `${s.color}@${s.position}`).join('|') + `:${config.blendSpace}:${config.colorSpace}:${name}`
    : '';
  const lastSig = useRef<string | null>(null);
  useEffect(() => {
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    onResolve(config ? { config, name } : null);
  }, [sig, name, config, onResolve]);
  // Clear on unmount (split toggled off) so the snapshot source resumes cleanly.
  useEffect(() => () => { lastSig.current = null; onResolve(null); }, [onResolve]);
  return null;
};

export const FullscreenGradientOverlay: React.FC = () => {
  const fs = useFullscreenState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const compositorRef = useRef<FullscreenCompositor | null>(null);
  // The generic ownCanvas host — an empty div a mode mounts its own canvas into.
  const ownHostRef = useRef<HTMLDivElement>(null);
  const ownHandleRef = useRef<OwnCanvasHandle | null>(null);
  // False until the active ownCanvas mode reports its first frame — gates a loading spinner over
  // the (synchronous, blocking) renderer creation / shader compile.
  const [ownReady, setOwnReady] = useState(false);
  // Set when an ownCanvas mode fails to mount (e.g. no WebGL2) — shows an error instead of a
  // forever-spinner.
  const [ownError, setOwnError] = useState(false);

  // The active mode + whether it owns its canvas (vs flowing through the compositor). Modes are
  // registered at module import (above), so the registry is populated by first render.
  const activeMode = getFullscreenMode(fs.geom);
  const isOwnCanvas = activeMode?.kind === 'ownCanvas';

  // The colour SOURCE: the fullscreen preview ALWAYS live-follows the last-modified hero (the same
  // resolution split uses — one code path), falling back to the open-time snapshot when nothing live
  // resolves. Resolved by the <SplitLiveSource> child below (mounted whenever the overlay is open),
  // which reads the live Stops/Generator stores so edits reflect immediately. All modes read colour
  // from this resolved source — never the store directly. Fullscreen hides the app UI so there's no
  // edit path while open ⇒ live ≡ pinned in practice (no toggle; user-ratified 2026-06-10).
  const [liveSplit, setLiveSplit] = useState<{ config: GradientConfig; name: string } | null>(null);
  const sourceConfig = liveSplit ? liveSplit.config : fs.config;
  const sourceName = liveSplit ? liveSplit.name : fs.name;

  // The "Fullscreen" target is registered in `gradientTargets.ts` at boot (not inline here), so
  // the dock has a single source of truth. `openFullscreen` is the receive path that target calls.

  // Esc dismissal — a direct capture-phase listener so it works regardless of whether the host
  // installed the shortcut registry (the Explorer shell may not have).
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
      sourceConfig
        ? renderStopsToRamp(sourceConfig.stops, sourceConfig.blendSpace, sourceConfig.colorSpace)
        : null,
    [sourceConfig],
  );
  // The 256×4 RGBA8 LUT (for glQuad modes' `uLut` upload + ownCanvas modes' colormap) — same
  // colours as `ramp`.
  const lut = useMemo(
    () =>
      sourceConfig
        ? renderStopsToBuffer(sourceConfig.stops, sourceConfig.blendSpace, sourceConfig.colorSpace)
        : null,
    [sourceConfig],
  );

  // The render context handed to modes (compositor paint + ownCanvas getContext). Kept in a ref so
  // an ownCanvas mode can pull the latest colour lazily inside its RAF loop. The fractal stage
  // size is self-measured by the mode (it observes its container), so width/height here are 0.
  const modeCtx = useMemo<FullscreenModeContext>(
    () => ({
      ramp: ramp ?? [],
      lut: lut ?? new Uint8Array(1024),
      params: buildParams(fs),
      width: 0,
      height: 0,
    }),
    [ramp, lut, fs.geomParams],
  );
  const ctxRef = useRef(modeCtx);
  ctxRef.current = modeCtx;

  // Dirty key of the last cpuField present (geom/params/dither/size/ramp). A re-render that
  // doesn't change any of these skips the expensive CPU field+dither — so once a frame is
  // rendered it stays rendered (no continuous re-dithering on idle / unrelated re-renders).
  // Reset to null whenever the compositor is (re)created so a fresh surface always paints.
  const lastFieldKeyRef = useRef<string | null>(null);
  const lastFieldRampRef = useRef<unknown>(null);

  // Paint a compositor mode (cpuField / cpuRaster / glQuad) through the shared dither tail.
  // `ownCanvas` modes drive their own canvas and are skipped here.
  const paint = useCallback(() => {
    const comp = compositorRef.current;
    const stage = stageRef.current;
    if (!comp || !stage || !ramp || !lut) return;
    const mode = getFullscreenMode(fs.geom);
    if (!mode || mode.kind === 'ownCanvas') return;
    const fullCap = CONTINUOUS_MAX_DIM;
    // A handle drag in flight renders at a reduced cap (pointer-rate repaints must be cheap);
    // releasing the drag flips `interacting` off, which re-creates `paint` → full-res repaint.
    const cap = fs.interacting ? Math.min(fullCap, INTERACT_MAX_DIM) : fullCap;
    const cw = stage.clientWidth;
    const ch = stage.clientHeight;
    // Render at native device pixels (×DPR, capped at 2) so the dither lands on real display
    // pixels — but never exceed `cap` on the long edge (bounds the CPU error-diffusion cost).
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, cap / Math.max(cw, ch, 1));
    const w = Math.max(1, Math.round(cw * scale));
    const h = Math.max(1, Math.round(ch * scale));
    comp.setSize(w, h);
    // Skip the (CPU error-diffusion) dither WHILE a handle drag is in flight — it's the
    // dominant per-frame cost and the brief banding is invisible mid-motion. Releasing the drag
    // flips `interacting` off → one final full-res DITHERED settle render, then idle.
    comp.dither = fs.dither && !fs.interacting;
    // Shape params (linear angle/bias, radial centre/scale/bias, conic centre/rotation/mirror,
    // arch r/w/pos/span/curvature) come from the store's `geomParams` — written by the on-screen
    // handle layer, threaded here from OUTSIDE the pure mappers.
    const ctx = { ramp, lut, params: buildParams(fs), width: w, height: h };
    if (mode.kind === 'glQuad') {
      comp.uploadLut(lut); // only glQuad modes sample uLut; cpuField bakes colour on the CPU
      comp.presentMode(mode, ctx);
    } else if (mode.kind === 'cpuField') {
      // Idempotent: an unrelated re-render (or a no-op upstream emit) with the SAME geom/params/
      // dither/size/ramp re-runs nothing — the field stays as last rendered. Resize and the
      // interacting→idle settle change `key`, so they still repaint.
      const key = `${fs.geom}|${comp.dither ? 1 : 0}|${w}x${h}|${JSON.stringify(fs.geomParams)}`;
      if (lastFieldKeyRef.current === key && lastFieldRampRef.current === ramp) return;
      lastFieldKeyRef.current = key;
      lastFieldRampRef.current = ramp;
      comp.presentField(mode.field!(ctx), w, h, DEFAULT_BACKGROUND, ramp);
    } else {
      comp.presentRaster(mode.raster!(ctx), w, h);
    }
  }, [ramp, lut, fs.geom, fs.geomParams, fs.dither, fs.interacting]);

  // Repaint on open + whenever the geometry / params / ramp change — COALESCED to one paint
  // per animation frame: a handle drag emits store updates at pointer rate, and each re-created
  // `paint` cancels the previous pending frame, so a fast drag costs one full-field CPU render
  // per displayed frame instead of one per pointermove.
  useEffect(() => {
    if (!fs.open) return;
    const id = requestAnimationFrame(() => paint());
    return () => cancelAnimationFrame(id);
  }, [fs.open, paint]);

  // Repaint whenever the stage itself resizes — window resize, the toolbar wrapping when controls
  // appear, AND a late first measure. The latest `paint` is read through a ref so the observer is
  // created ONCE per open, not re-subscribed on every slider tick.
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

  // ── Shared compositor (cpuField / cpuRaster / glQuad modes) ─────────────────────────────
  // One WebGL2 surface on `canvasRef` that presents every non-ownCanvas mode through the shared
  // dither tail (and bakes it into the PNG export — preserveDrawingBuffer). Created when a
  // compositor mode is active, disposed on close / switch to an ownCanvas mode. The blue-noise
  // tile loads async; its onReady repaints so the dither appears once the tile lands.
  useEffect(() => {
    if (!fs.open || isOwnCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const comp = new FullscreenCompositor(canvas, () => paintRef.current());
    compositorRef.current = comp;
    lastFieldKeyRef.current = null; // fresh surface → the forced paint below must not be skipped
    paintRef.current();
    return () => {
      comp.dispose();
      compositorRef.current = null;
    };
  }, [fs.open, isOwnCanvas]);

  // ── Generic ownCanvas host (live Fractal / Liquify / …) ─────────────────────────────────
  // When an ownCanvas mode is active, hand it the empty host container + a context getter +
  // ready/error callbacks. The mode mounts + drives its own canvas/renderer/RAF; we dispose on
  // close / mode switch. The host div is keyed by mode id so switching between two ownCanvas modes
  // gives the new one a fresh, empty container (no leftover canvas to reconcile).
  useEffect(() => {
    if (!fs.open || !isOwnCanvas || !activeMode?.mount) return;
    const container = ownHostRef.current;
    if (!container) return;
    setOwnReady(false);
    setOwnError(false);
    const handle = activeMode.mount({
      container,
      getContext: () => ctxRef.current,
      onReady: () => setOwnReady(true),
      onError: (e) => { console.error('[fullscreen ownCanvas] mount failed:', e); setOwnError(true); },
    });
    ownHandleRef.current = handle;
    return () => {
      handle.dispose();
      ownHandleRef.current = null;
    };
  }, [fs.open, isOwnCanvas, activeMode]);

  // Forward the colour source to the active ownCanvas mode — a replaced snapshot, or (in split) the
  // last-modified hero the preview live-follows. (Compositor modes pick it up via `paint`/`modeCtx`.)
  useEffect(() => {
    ownHandleRef.current?.onContext?.(modeCtx);
  }, [modeCtx]);

  // Forward the Dither toggle to the active ownCanvas mode (compositor modes read `fs.dither`
  // directly in `paint`).
  useEffect(() => {
    ownHandleRef.current?.setDither?.(fs.dither);
  }, [fs.dither]);

  const exportPng = useCallback(async () => {
    // ownCanvas modes return their own canvas (after rendering a fresh frame); compositor modes
    // re-present into `canvasRef`.
    let canvas: HTMLCanvasElement | null;
    if (isOwnCanvas) {
      canvas = ownHandleRef.current?.exportCanvas?.() ?? null;
    } else {
      paintRef.current();
      canvas = canvasRef.current;
    }
    if (!canvas) return;
    const blob = await canvasToPngBlob(canvas);
    if (!blob) return;
    const stem = (sourceName || 'gradient').trim().replace(/\s+/g, '-').toLowerCase() || 'gradient';
    // Split exports the live preview pane (the app DOM above can't be rasterised); the `-split`
    // suffix marks it as captured in the live-follow split layout.
    downloadBlob(blob, `${stem}-${fs.split ? 'split' : fs.geom}.png`);
  }, [sourceName, fs.geom, fs.split, isOwnCanvas]);

  if (!fs.open || !fs.config) return null;

  const ActiveControls = activeMode?.Controls;
  // The bottom-right stage hint — split / per-mode / generic display-only.
  const hint = fs.split
    ? 'Live — follows the gradient you last edited · drag the divider to resize'
    : activeMode?.hint ?? 'Esc to close · display-only preview';
  // App fraction (0..1) the divider sits at, as a percentage for ARIA + drag math.
  const appPct = Math.round(fs.splitY * 100);

  return createPortal(
    <div
      className={`fixed flex flex-col select-none ${
        fs.split
          ? 'bg-zinc-950/95 border-t border-white/15 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]'
          : 'inset-0 bg-black/95 backdrop-blur-sm'
      }`}
      style={fs.split ? { zIndex: Z.overlay, top: `${fs.splitY * 100}%`, left: 0, right: 0, bottom: 0 } : { zIndex: Z.overlay }}
      data-testid="fullscreen-gradient-overlay"
    >
      {/* Live source — resolves the last-modified hero (Stops/Generator live) for BOTH split and
          plain fullscreen (always-live, one code path). Only mounts while the overlay is open. */}
      <SplitLiveSource onResolve={setLiveSplit} />

      {/* Split divider — drag (or arrow keys) to resize the app/preview split. WAI-ARIA slider
          semantics; an oversized hit-strip straddles the top edge for easy grabbing; pointer
          capture lets the drag continue across the whole window. */}
      {fs.split && (
        <div
          role="slider"
          tabIndex={0}
          aria-label="Resize split — app on top, preview below"
          aria-orientation="vertical"
          aria-valuemin={20}
          aria-valuemax={85}
          aria-valuenow={appPct}
          aria-valuetext={`App ${appPct}%, preview ${100 - appPct}%`}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            setFullscreenSplitY(e.clientY / Math.max(1, window.innerHeight));
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); setFullscreenSplitY(fs.splitY - 0.02); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setFullscreenSplitY(fs.splitY + 0.02); }
          }}
          className="absolute left-0 right-0 -top-3 h-6 z-10 flex items-center justify-center cursor-row-resize group focus:outline-none touch-none"
        >
          <div className="h-1 w-16 rounded-full bg-white/25 group-hover:bg-cyan-400/70 group-focus:bg-cyan-400/70 transition-colors" />
        </div>
      )}

      {/* Toolbar: mode selector + the active mode's own controls + split/dither/export/close. */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-zinc-950/80">
        <div className="text-sm font-medium text-zinc-200 mr-1 truncate max-w-[28ch] flex items-center gap-1.5">
          {fs.split && <span className="text-[9px] font-semibold tracking-wide px-1 py-0.5 rounded bg-cyan-500/25 text-cyan-200">LIVE</span>}
          {sourceName}
        </div>

        <div className="flex items-center rounded-md border border-white/10 overflow-hidden divide-x divide-white/10">
          {listFullscreenModes().map((m) => (
            <button
              key={m.id}
              onClick={() => setFullscreenGeom(m.id)}
              className={`px-3 py-1.5 text-[12px] transition-colors ${
                fs.geom === m.id
                  ? 'bg-cyan-500/25 text-cyan-100 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* The active mode's own self-contained controls (the fractal's mapping/repeats/phase/
            cycle, Liquify's brushes/physics, …). The geometry modes drive their shape via the
            on-screen handle layer, so they declare no toolbar controls. */}
        {ActiveControls && <ActiveControls />}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              // Leaving split: promote the live gradient we're viewing into the snapshot so the
              // fullscreen view keeps it instead of snapping back to the open-time gradient.
              if (fs.split && liveSplit) setFullscreenConfig(liveSplit.config, liveSplit.name);
              setFullscreenSplit(!fs.split);
            }}
            title="Split: keep the app on top, dock this preview on the bottom — it live-follows the gradient you last edited"
            aria-pressed={fs.split}
            className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
              fs.split
                ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            ⇅ Split
          </button>
          {hasGeometryHandles(fs.geom) && (
            <button
              onClick={() => setFullscreenHandles(!fs.handles)}
              title="On-screen shape handles — drag them on the image to reshape the gradient (they fade when idle and never export)"
              aria-pressed={fs.handles}
              className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
                fs.handles
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-100'
                  : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              ◉ Handles
            </button>
          )}
          <button
            onClick={() => setFullscreenDither(!fs.dither)}
            title="Blue-noise dither — smooths 8-bit banding on the ramp (bakes into the PNG)"
            aria-pressed={fs.dither}
            className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
              fs.dither
                ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            ▦ Dither
          </button>
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

      {/* Stage — the canvas fills it; the buffer is sized to this element (capped). Compositor
          modes paint the `canvasRef`; an ownCanvas mode mounts its own canvas into the host div. */}
      <div ref={stageRef} className="flex-1 min-h-0 relative">
        {isOwnCanvas ? (
          // Keyed by mode id so switching between two ownCanvas modes gives the new one a fresh,
          // empty container (React fully remounts it — no leftover canvas to reconcile).
          <div key={activeMode!.id} ref={ownHostRef} className="absolute inset-0" />
        ) : (
          <canvas key="geom-2d" ref={canvasRef} className="absolute inset-0 w-full h-full" />
        )}
        {/* On-screen geometry handles — a DOM/SVG layer ABOVE the canvas (so PNG export, which
            reads the canvas back, can never contain it). The layer itself decides whether the
            active geometry has handles, fades on idle, and honours the toolbar toggle. */}
        {!isOwnCanvas && <GeometryHandleLayer />}
        {isOwnCanvas && ownError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 text-center px-6">
            <div className="text-[13px] text-gray-200">Couldn’t start {activeMode!.label}</div>
            <div className="text-[11px] text-gray-400">This mode needs a WebGL2-capable GPU.</div>
          </div>
        ) : isOwnCanvas && !ownReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 pointer-events-none">
            <div className="h-7 w-7 rounded-full border-2 border-white/15 border-t-cyan-400 animate-spin" />
            <div className="text-[12px] text-gray-300">Rendering {activeMode!.label}…</div>
          </div>
        ) : null}
        <div className="absolute bottom-2 right-3 text-[10px] text-gray-500/80 pointer-events-none">
          {hint}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FullscreenGradientOverlay;
