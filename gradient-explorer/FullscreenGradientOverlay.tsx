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
 * Opened via `openFullscreen(config, name)` — the receive path of the "Fullscreen"
 * send-target registered in `gradient-explorer/gradientTargets.ts` (a bottom-row well
 * in the P2-A "select → reveal → place" dock). Click the well or drop a gradient on it.
 *
 * All view state (geometry / seed / amount / open) is transient + shell-scoped in
 * `fullscreenStore` (not DDFS, not persisted). The mappings are pure; this component
 * owns only the canvas paint + the controls.
 *
 * @see palette/core/rampGeometry.ts (the pure mappings)
 * @see store/dropWellRegistry.ts (the W4 drop-well kernel — interface (b))
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScalarInput } from '../components/inputs/ScalarInput';
import { createLogMapping } from '../components/inputs/primitives/FormatUtils';
import { renderStopsToRamp, renderStopsToBuffer } from '../palette/core/gmtGradient';
import {
  RANDOM_MAX_DIM,
  DEFAULT_BACKGROUND,
  isStochastic,
  isFractal,
} from '../palette/core/rampGeometry';
import {
  closeFullscreen,
  setFullscreenGeom,
  setFullscreenSplit,
  setFullscreenSplitY,
  setFullscreenDither,
  setFractalPhase,
  setFractalRepeats,
  setFractalMapping,
  setFractalAnimate,
  setFractalIterMul,
  useFullscreenState,
} from '../palette/store/fullscreenStore';
import { useActiveHeroSelection } from '../palette/store/heroSelection';
import { usePaletteEditorStore } from '../palette/store/paletteEditorStore';
import { useGeneratorDerived } from '../palette/store/generatorStore';
import type { GradientConfig } from '../types';
import { FullscreenCompositor } from './fullscreen/FullscreenCompositor';
import { getFullscreenMode, listFullscreenModes } from './fullscreen/modeRegistry';
import './fullscreen/modes'; // registers the builtin modes at import time
import { canvasToPngBlob, downloadBlob } from '../utils/SceneFormat';
import { Z } from '../components/ui/zIndex';
// Type-only — the engine (perturbation + LA + shaders) is a heavy chunk, lazy-
// loaded via dynamic import() when fractal mode opens so it stays out of the main
// bundle and the loading overlay paints first. @see the creation effect below.
import type { FractalColorRenderer } from '../engine/fractal';

/** Continuous geometries render up to this long edge (CSS stretches to fill). */
const CONTINUOUS_MAX_DIM = 1440;

/** The colormap-mapping modes the fractal mode offers (kernel `uColorMapping`
 *  indices) — a curated, visually-distinct subset of the 14 kernel modes. */
const FRACTAL_MAPPINGS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: 'Iterations' },
  { value: 4, label: 'Bands' },
  { value: 1, label: 'Angle' },
  { value: 2, label: 'Magnitude' },
  { value: 12, label: 'Potential' },
  { value: 9, label: 'Stripe' },
  { value: 10, label: 'Distance' },
];

/** Per-frame phase advance when auto-cycling (≈ one full cycle / 8s @ 60fps). */
const PHASE_ANIM_STEP = 1 / 480;
// Repeats spans ~5 decades and the useful value shifts by colour-mapping mode
// and zoom depth — a linear track crams everything into the high end. A log
// mapping makes each drag a RATIO so dialling 0.05 vs 50 is the same gesture.
const REPEATS_MAPPING = createLogMapping(0.01, 1024);

/** Resolves the live "working" gradient for split layout and reports it upward. Mounted ONLY
 *  while split is on, so the (heavy) generator derivation never runs otherwise. For the
 *  editable surfaces (Stops / Generator) it reads the live store so edits reflect without
 *  re-selecting the hero; otherwise it follows the active hero's selected payload. */
const SplitLiveSource: React.FC<{
  onResolve: (r: { config: GradientConfig; name: string } | null) => void;
}> = ({ onResolve }) => {
  const hero = useActiveHeroSelection();
  const stopsConfig = usePaletteEditorStore((s) => s.config);
  const generatorConfig = useGeneratorDerived().config;
  let config: GradientConfig | null = hero?.payload.config ?? null;
  let name = hero?.payload.name ?? 'Gradient';
  if (hero?.mode === 'stops') { config = stopsConfig; name = 'Stops'; }
  else if (hero?.mode === 'generator') { config = generatorConfig; name = hero.payload.name || 'Generator'; }
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
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<FractalColorRenderer | null>(null);
  const compositorRef = useRef<FullscreenCompositor | null>(null);
  // False until the first fractal frame has painted — gates a loading overlay
  // over the (synchronous, blocking) WebGL shader compile + first render.
  const [fractalReady, setFractalReady] = useState(false);
  // Set when the GL renderer can't be created (no WebGL2) — shows an error
  // instead of an infinite spinner.
  const [fractalError, setFractalError] = useState(false);
  // Brief "copied!" feedback on the coords button.
  const [coordsCopied, setCoordsCopied] = useState(false);

  const fractal = isFractal(fs.geom);

  // The colour SOURCE: normally the open-time snapshot; in split layout the preview
  // live-follows the gradient you're editing (resolved by the split-only <SplitLiveSource>
  // child below, which reads the live Stops/Generator stores so edits reflect immediately).
  // All modes read colour from this resolved source — never the store directly.
  const [liveSplit, setLiveSplit] = useState<{ config: GradientConfig; name: string } | null>(null);
  const sourceConfig = fs.split && liveSplit ? liveSplit.config : fs.config;
  const sourceName = fs.split && liveSplit ? liveSplit.name : fs.name;

  // The "Fullscreen" target is registered in `gradientTargets.ts` (the one target list)
  // at boot — not inline here — so the dock has a single source of truth.
  // `openFullscreen` (below) is the receive path that target calls.

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
      sourceConfig
        ? renderStopsToRamp(sourceConfig.stops, sourceConfig.blendSpace, sourceConfig.colorSpace)
        : null,
    [sourceConfig],
  );
  // The 256×4 RGBA8 LUT (for glQuad modes' `uLut` upload) — same colours as `ramp`.
  const lut = useMemo(
    () =>
      sourceConfig
        ? renderStopsToBuffer(sourceConfig.stops, sourceConfig.blendSpace, sourceConfig.colorSpace)
        : null,
    [sourceConfig],
  );

  // Paint a compositor mode (cpuRaster / glQuad) through the shared dither tail. `ownCanvas`
  // modes (fractal) drive their own canvas and are skipped here.
  const paint = useCallback(() => {
    const comp = compositorRef.current;
    const stage = stageRef.current;
    if (!comp || !stage || !ramp || !lut || isFractal(fs.geom)) return;
    const mode = getFullscreenMode(fs.geom);
    if (!mode || mode.kind === 'ownCanvas') return;
    const cap = isStochastic(fs.geom) ? RANDOM_MAX_DIM : CONTINUOUS_MAX_DIM;
    const cw = stage.clientWidth;
    const ch = stage.clientHeight;
    const scale = Math.min(1, cap / Math.max(cw, ch, 1));
    const w = Math.max(1, Math.round(cw * scale));
    const h = Math.max(1, Math.round(ch * scale));
    comp.setSize(w, h);
    comp.dither = fs.dither;
    comp.uploadLut(lut); // cheap (1024 bytes); the field + glQuad paths sample uLut
    const modeCtx = { ramp, lut, params: { amount: fs.amount, seed: fs.seed }, width: w, height: h };
    if (mode.kind === 'glQuad') comp.presentMode(mode, modeCtx);
    else if (mode.kind === 'cpuField') comp.presentField(mode.field!(modeCtx), w, h, DEFAULT_BACKGROUND, ramp);
    else comp.presentRaster(mode.raster!(modeCtx), w, h);
  }, [ramp, lut, fs.geom, fs.amount, fs.seed, fs.dither]);

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

  // ── Shared compositor (cpuRaster + glQuad modes) ─────────────────────────
  // One WebGL2 surface on `canvasRef` that presents every non-fractal mode through the
  // shared dither tail (and bakes it into the PNG export — preserveDrawingBuffer). Created
  // when a compositor mode is active, disposed on close / switch to the fractal (ownCanvas)
  // mode. The blue-noise tile loads async; its onReady repaints so the dither appears once
  // the tile lands. Mode switches among compositor modes keep the same context (deps don't
  // change); switching to/from fractal swaps canvases (distinct React keys) → fresh context.
  useEffect(() => {
    if (!fs.open || fractal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const comp = new FullscreenCompositor(canvas, () => paintRef.current());
    compositorRef.current = comp;
    paintRef.current();
    return () => {
      comp.dispose();
      compositorRef.current = null;
    };
  }, [fs.open, fractal]);

  // ── Live-fractal mode (geom === 'fractal') ───────────────────────────────
  // A scoped, opt-in WebGL canvas that renders a live Mandelbrot coloured by
  // the FROZEN gradient snapshot. Mounted only while fractal mode is active and
  // disposed on close / geometry switch (never a shell viewport). The renderer
  // owns view center/zoom (gesture-driven, no React re-render); the store owns
  // the live phase/repeats/mapping knobs.

  // Latest store snapshot, read inside the RAF loop / creation without making
  // them effect deps (which would dispose+recreate the GL context).
  const liveRef = useRef(fs);
  liveRef.current = fs;

  // Lifecycle: create the renderer when fractal mode opens; dispose on exit.
  // Creation is deferred one animation frame so the "Rendering…" overlay paints
  // BEFORE the synchronous, blocking WebGL shader compile janks the main thread.
  useEffect(() => {
    if (!fs.open || !fractal) return;
    const canvas = glCanvasRef.current;
    if (!canvas) return;

    setFractalReady(false);
    setFractalError(false);
    let renderer: FractalColorRenderer | null = null;
    let raf = 0;
    let startRaf = 0;
    let ro: ResizeObserver | undefined;
    let cancelled = false;

    // Lazy-load the heavy fractal engine chunk (perturbation + LA + shaders) so
    // it's kept out of the main bundle and the "Rendering…" overlay (already
    // showing while !fractalReady) paints FIRST — instead of a static import's
    // module parse + WebGL shader compile blocking the initial frame (the "black
    // screen" before loading). One extra RAF defers the blocking compile until
    // after the overlay is on screen.
    void import('../engine/fractal').then(({ FractalColorRenderer }) => {
      if (cancelled) return;
      startRaf = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          renderer = new FractalColorRenderer(canvas);
        } catch (e) {
          console.error('[fullscreen-fractal] WebGL2 unavailable:', e);
          setFractalError(true);
          return;
        }
        rendererRef.current = renderer;
      // Dev-only debug/test handle (mirrors window.__store / __gmtProxy) — lets a
      // smoke drive the renderer directly (deep-zoom verification, etc.). Stripped
      // from production builds so no GL-context-holding global leaks to users.
      if (import.meta.env.DEV) {
        (window as unknown as { __fractalRenderer?: FractalColorRenderer }).__fractalRenderer = renderer;
      }

      const stage = stageRef.current;
      if (stage) renderer.setRenderSize(stage.clientWidth, stage.clientHeight);
      const snap = liveRef.current;
      if (snap.config) {
        renderer.setColormap(
          renderStopsToBuffer(snap.config.stops, snap.config.blendSpace, snap.config.colorSpace),
        );
      }
      renderer.setParams({
        gradientPhase: snap.fractalPhase,
        gradientRepeat: snap.fractalRepeats,
        colorMapping: snap.fractalMapping,
        iterMul: snap.fractalIterMul,
      });
      if (snap.fractalDeepZoom) renderer.setDeepZoomEnabled(true);
      renderer.setDither(snap.dither);

      // RAF loop. When auto-cycling, advance the phase directly on the renderer
      // (no store write → no per-frame React render); the slider is hidden while
      // animating, so there's no desync to reconcile.
      let animPhase = snap.fractalPhase;
      let wasAnimating = snap.fractalAnimate;
      let first = true;
      const r = renderer;
      const loop = () => {
        const animating = liveRef.current.fractalAnimate;
        if (animating) {
          animPhase = (animPhase + PHASE_ANIM_STEP) % 1;
          r.setParams({ gradientPhase: animPhase });
        } else if (wasAnimating) {
          // Cycle just stopped: commit the drifted phase to the store so the
          // Phase slider reflects where it landed. Without this the slider snaps
          // back to its old value while the render stays at animPhase — the two
          // disagree until the user nudges the slider. The store write re-fires
          // the live-knob effect, which forwards the same phase (a no-op confirm).
          setFractalPhase(animPhase);
        }
        wasAnimating = animating;
        r.render();
        if (first) { first = false; setFractalReady(true); }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      // Resize the GL buffer to the stage (separate from the 2D ResizeObserver).
      if (stage && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          const s = stageRef.current;
          if (s) r.setRenderSize(s.clientWidth, s.clientHeight);
        });
        ro.observe(stage);
      }
      });
    }).catch((e) => {
      if (cancelled) return;
      console.error('[fullscreen-fractal] failed to load fractal engine:', e);
      setFractalError(true);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(startRaf);
      cancelAnimationFrame(raf);
      ro?.disconnect();
      renderer?.dispose();
      rendererRef.current = null;
      delete (window as unknown as { __fractalRenderer?: FractalColorRenderer }).__fractalRenderer;
    };
  }, [fs.open, fractal]);

  // Re-upload the colormap when the colour source changes — a replaced snapshot, or (in
  // split layout) the last-modified hero the preview live-follows.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !sourceConfig) return;
    r.setColormap(renderStopsToBuffer(sourceConfig.stops, sourceConfig.blendSpace, sourceConfig.colorSpace));
  }, [sourceConfig]);

  // Push the live knobs to the renderer. While animating, the RAF loop owns
  // (overwrites) gradientPhase next frame, so forwarding the manual phase here
  // too is harmless — no need to special-case who owns phase.
  useEffect(() => {
    rendererRef.current?.setParams({
      gradientPhase: fs.fractalPhase,
      gradientRepeat: fs.fractalRepeats,
      colorMapping: fs.fractalMapping,
      iterMul: fs.fractalIterMul,
    });
  }, [fs.fractalPhase, fs.fractalRepeats, fs.fractalMapping, fs.fractalIterMul]);

  // Toggle the deep-zoom path (builds/clears the reference orbit). Enabling
  // lifts the zoom floor so you can dive far past the f32 quantization point.
  useEffect(() => {
    rendererRef.current?.setDeepZoomEnabled(fs.fractalDeepZoom);
  }, [fs.fractalDeepZoom]);

  // The Dither toggle applies to the fractal display pass too (it's an ownCanvas mode).
  useEffect(() => {
    rendererRef.current?.setDither(fs.dither);
    rendererRef.current?.render();
  }, [fs.dither]);

  // At deep zoom, iterMul scales the reference-orbit BUILD length (a longer
  // reference, not a reference reused past its end), so changing it must rebuild
  // the orbit. (Shallow path reads iterMul live via the setParams effect above.)
  // Only rebuild on an ACTUAL iterMul change: the deep-zoom ENABLE path already
  // rebuilds inside setDeepZoomEnabled, so without this guard toggling deep zoom
  // on fires a second, immediately-discarded off-thread build.
  const prevIterMul = useRef(fs.fractalIterMul);
  useEffect(() => {
    const r = rendererRef.current;
    const iterMulChanged = prevIterMul.current !== fs.fractalIterMul;
    prevIterMul.current = fs.fractalIterMul;
    if (r && fs.fractalDeepZoom && iterMulChanged) void r.rebuildDeepZoom();
  }, [fs.fractalIterMul, fs.fractalDeepZoom]);

  // Pan (pointer drag) + zoom (wheel) — mutate the renderer directly; the RAF
  // loop reflects it next frame. No store writes (matches fluid-toy's gesture
  // bypass) so dragging never triggers a React render cascade.
  const dragging = useRef(false);
  const lastPt = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!rendererRef.current) return;
    dragging.current = true;
    lastPt.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const r = rendererRef.current;
    if (!r || !dragging.current) return;
    r.pan(e.clientX - lastPt.current.x, e.clientY - lastPt.current.y);
    lastPt.current = { x: e.clientX, y: e.clientY };
  }, []);
  // Rebuild the deep-zoom reference orbit once a gesture settles (matches
  // fluid-toy: commit on gesture-end, not per-frame). Cheap no-op when deep off.
  const rebuildTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleDeepRebuild = useCallback((delayMs: number) => {
    if (!liveRef.current.fractalDeepZoom) return;
    if (rebuildTimer.current) clearTimeout(rebuildTimer.current);
    rebuildTimer.current = setTimeout(() => {
      rebuildTimer.current = null;
      void rendererRef.current?.rebuildDeepZoom();
    }, delayMs);
  }, []);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    scheduleDeepRebuild(0); // pan ended → rebuild orbit at the new centre
  }, [scheduleDeepRebuild]);
  const onWheel = useCallback((e: React.WheelEvent) => {
    const r = rendererRef.current;
    if (!r) return;
    // Normalize wheel delta across deltaMode (Firefox/Linux report line- or
    // page-mode deltas, not pixels) so zoom feels the same everywhere.
    const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    // px > 0 (scroll down) → zoom out (factor > 1).
    r.zoomAt(e.clientX, e.clientY, Math.exp(px * 0.0015));
    scheduleDeepRebuild(300); // debounce: rebuild once the user stops scrolling
  }, [scheduleDeepRebuild]);
  const resetView = useCallback(() => {
    rendererRef.current?.setParams({ center: [-0.5, 0], centerLow: [0, 0], zoom: 1.4 });
    scheduleDeepRebuild(0);
  }, [scheduleDeepRebuild]);

  // Copy the exact view state (centre as double-double, zoom, mapping, etc.) to
  // the clipboard so a specific render artifact can be reproduced verbatim.
  const copyCoords = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const p = r.getParams();
    const payload = {
      center: p.center,
      centerLow: p.centerLow,
      zoom: p.zoom,
      colorMapping: p.colorMapping,
      iterMul: p.iterMul,
      deepZoom: p.deepZoomEnabled,
      gradientRepeat: p.gradientRepeat,
      gradientPhase: p.gradientPhase,
      deepStats: r.lastDeepStats,
    };
    const json = JSON.stringify(payload);
    // Always log (devtools fallback if the clipboard API is blocked/unavailable).
    console.log('[fractal coords]', json);
    const done = () => { setCoordsCopied(true); setTimeout(() => setCoordsCopied(false), 1500); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).then(done).catch(done);
    } else {
      done();
    }
  }, []);
  // Clear any pending orbit rebuild on unmount (the renderer is gone by then).
  useEffect(() => () => { if (rebuildTimer.current) clearTimeout(rebuildTimer.current); }, []);

  const exportPng = useCallback(async () => {
    const useGl = isFractal(liveRef.current.geom);
    const canvas = useGl ? glCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    // Force a fresh render right before capture so toBlob reads current pixels
    // (belt-and-suspenders alongside preserveDrawingBuffer): the fractal renderer for the
    // GL canvas, or a compositor re-present for cpuField/cpuRaster/glQuad modes.
    if (useGl) rendererRef.current?.render();
    else paintRef.current();
    const blob = await canvasToPngBlob(canvas);
    if (!blob) return;
    const stem = (sourceName || 'gradient').trim().replace(/\s+/g, '-').toLowerCase() || 'gradient';
    // Split exports the live preview pane (the app DOM above can't be rasterised); the
    // `-split` suffix marks it as captured in the live-follow split layout.
    downloadBlob(blob, `${stem}-${fs.split ? 'split' : fs.geom}.png`);
  }, [sourceName, fs.geom, fs.split]);

  if (!fs.open || !fs.config) return null;

  const activeMode = getFullscreenMode(fs.geom);
  const ActiveControls = activeMode?.Controls;
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
      {/* Live source for split — resolves the gradient being edited (Stops/Generator live). */}
      {fs.split && <SplitLiveSource onResolve={setLiveSplit} />}

      {/* Split divider — drag (or arrow keys) to resize the app/preview split. WAI-ARIA
          slider semantics; an oversized hit-strip straddles the top edge for easy grabbing;
          pointer capture lets the drag continue across the whole window. */}
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

      {/* Toolbar: mode selector + mode controls + split/dither/export/close. */}
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

        {/* The active mode's own self-contained controls (e.g. Randomized's amount/re-roll). */}
        {ActiveControls && <ActiveControls />}

        {fractal && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
              Mapping
              <select
                value={fs.fractalMapping}
                onChange={(e) => setFractalMapping(parseInt(e.target.value, 10))}
                className="bg-zinc-900 border border-white/10 rounded px-1.5 py-1 text-[11px] text-gray-200"
                aria-label="Colormap mapping mode"
              >
                {FRACTAL_MAPPINGS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <div className="w-32">
              <ScalarInput
                value={fs.fractalRepeats}
                onChange={setFractalRepeats}
                min={0.01}
                max={1024}
                hardMin={0.0001}
                hardMax={1024}
                step={0.0001}
                mapping={REPEATS_MAPPING}
                defaultValue={1}
                label="Repeats"
                trackHeight={14}
              />
            </div>
            <div className="w-32">
              <ScalarInput
                value={fs.fractalIterMul}
                onChange={setFractalIterMul}
                min={0.5}
                max={8}
                hardMin={0.25}
                hardMax={32}
                step={0.25}
                defaultValue={1}
                label="Iterations"
                labelSuffix="×"
                trackHeight={14}
              />
            </div>
            {!fs.fractalAnimate && (
              <div className="w-32">
                <ScalarInput
                  value={fs.fractalPhase}
                  onChange={setFractalPhase}
                  min={0}
                  max={1}
                  step={0.005}
                  defaultValue={0}
                  label="Phase"
                  trackHeight={14}
                />
              </div>
            )}
            <button
              onClick={() => setFractalAnimate(!fs.fractalAnimate)}
              title="Auto-cycle the colormap phase (palette cycling)"
              className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
                fs.fractalAnimate
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-100'
                  : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {fs.fractalAnimate ? '❚❚ Cycling' : '▶ Cycle'}
            </button>
            <button
              onClick={copyCoords}
              title="Copy the exact view coordinates (for reporting a render artifact)"
              className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
                coordsCopied
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100'
                  : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {coordsCopied ? '✓ Copied' : '⧉ Copy coords'}
            </button>
            <button
              onClick={resetView}
              title="Reset pan / zoom to the full set"
              className="px-2.5 py-1 text-[12px] rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              ⌖ Reset view
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setFullscreenSplit(!fs.split)}
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

      {/* Stage — the canvas fills it; the buffer is sized to this element (capped).
          2D modes paint the `canvasRef`; the live-fractal mode mounts a scoped
          WebGL canvas (the first + only GL surface in the app, disposed on exit). */}
      <div ref={stageRef} className="flex-1 min-h-0 relative">
        {fractal ? (
          // Distinct `key` from the 2D canvas so React never reuses the same
          // DOM node across the 2D↔fractal swap — the GL canvas mounts fresh
          // (new context) and fully unmounts on exit (its context is freed by
          // dispose()'s loseContext, with no node reuse to brick).
          <canvas
            key="fractal-gl"
            ref={glCanvasRef}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          />
        ) : (
          <canvas key="geom-2d" ref={canvasRef} className="absolute inset-0 w-full h-full" />
        )}
        {fractal && fractalError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 text-center px-6">
            <div className="text-[13px] text-gray-200">Couldn’t start the fractal renderer</div>
            <div className="text-[11px] text-gray-400">Live fractal mode needs a WebGL2-capable GPU.</div>
          </div>
        ) : fractal && !fractalReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 pointer-events-none">
            <div className="h-7 w-7 rounded-full border-2 border-white/15 border-t-cyan-400 animate-spin" />
            <div className="text-[12px] text-gray-300">Rendering fractal…</div>
          </div>
        ) : null}
        <div className="absolute bottom-2 right-3 text-[10px] text-gray-500/80 pointer-events-none">
          {fs.split
            ? 'Live — follows the gradient you last edited · drag the divider to resize'
            : fractal
              ? 'Esc to close · drag to pan · scroll to zoom'
              : 'Esc to close · display-only preview'}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FullscreenGradientOverlay;
