/**
 * fractalMode — the live Mandelbrot mode, the reference `ownCanvas` consumer of the seam.
 *
 * This is the FIRST mode built on the generic `mount()` face (the overlay used to host the
 * fractal inline — canvas, RAF, gestures, knob effects, toolbar — all hard-coded). Lifting it
 * onto `mount()` makes the overlay mode-agnostic and unblocks the parallel ownCanvas streams
 * (Liquify / Parallax): a second canvas-owning mode now plugs in additively, no overlay edit.
 *
 * The mode owns EVERYTHING fractal:
 *  • `mount(host)` — lazily loads the heavy `engine/fractal` chunk, creates the renderer in the
 *    host's container, drives its own RAF loop (phase auto-cycle), pan/zoom gestures, a
 *    ResizeObserver, and a `fullscreenStore` subscription that pushes the live knobs
 *    (phase/repeats/mapping/iterMul/deepZoom/dither) to the renderer. Returns an `OwnCanvasHandle`
 *    so the overlay can forward colour-source changes, the dither toggle, and PNG export.
 *  • `Controls` — the toolbar block (Mapping / Repeats / Iterations / Phase / Cycle / Copy-coords /
 *    Reset-view), reading the store + calling the store setters. Reset/Copy reach the live renderer
 *    through a single module-scoped handle (there is exactly one overlay + one fractal instance).
 *
 * Behaviour is identical to the pre-seam inline implementation — this is a lift, not a rewrite.
 *
 * @see gradient-explorer/fullscreen/modeRegistry.ts (OwnCanvasHost/Handle + the mount face)
 * @see engine/fractal/FractalColorRenderer.ts (the renderer it drives)
 */

import React, { useCallback, useState } from 'react';
import { ScalarInput } from '../../../components/inputs/ScalarInput';
import { createLogMapping } from '../../../components/inputs/primitives/FormatUtils';
import { getFullscreenState } from '../../../palette/store/fullscreenStore';
import {
  getFractalState,
  subscribeFractal,
  setFractalPhase,
  setFractalRepeats,
  setFractalMapping,
  setFractalAnimate,
  setFractalIterMul,
  setFractalColorNormV2,
  setFractalIterRate,
  setFractalIterFit,
  resetFractalIterFit,
  useFractalState,
} from './fractal/fractalStore';
import type { FullscreenMode, OwnCanvasHost, OwnCanvasHandle } from '../modeRegistry';
// Type-only — the engine (perturbation + LA + shaders) is a heavy chunk, lazy-loaded via
// dynamic import() when the mode mounts so it stays out of the main bundle.
import type { FractalColorRenderer } from '../../../engine/fractal';

/** The colormap-mapping modes the fractal mode offers (kernel `uColorMapping` indices) — a
 *  curated, visually-distinct subset of the 14 kernel modes. */
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
// Density is a log control so each drag is a RATIO. Under depth-normalized colour (v2) every
// mode wants ≈1 so a ~3-decade track (0.1..100) centred on 1 is plenty; the hard bounds stay
// wide so legacy (v1) power-users can still type the old extreme tilings (e.g. Stripe ~500).
const REPEATS_MAPPING = createLogMapping(0.05, 100);
// Iterations 'Rate' (log-iteration gamma) — log track centred on 1, each drag a ratio.
const ITER_RATE_MAPPING = createLogMapping(0.25, 8);

/** The exact fractal view + colour-mapping a handoff carries to another app (fluid-toy).
 *  A flat, app-agnostic snapshot — the consumer maps it onto its own slices. */
export interface FractalHandoffCoords {
  center: [number, number];
  centerLow: [number, number];
  zoom: number;
  juliaC: [number, number];
  kind: 'mandelbrot' | 'julia';
  power: number;
  maxIter: number;
  colorMapping: number;
  gradientRepeat: number;
  gradientPhase: number;
  deepZoom: boolean;
}

/** The single live fractal instance's control surface (one overlay → one fractal at a time).
 *  `mount()` publishes it so the toolbar `Controls` (a separate React subtree) can drive
 *  Reset-view / Copy-coords on the renderer it created. Mirrors the existing single-instance
 *  `window.__fractalRenderer` debug handle. Cleared on dispose. */
let activeControl: {
  resetView: () => void;
  copyCoords: () => string | null;
  getCoords: () => FractalHandoffCoords | null;
  fitIterView: () => boolean;
} | null = null;

/** Read the live fractal's exact view + colour-mapping, or null when no fractal is mounted.
 *  Used by the fullscreen overlay's "Open in Fluid Toy" handoff + PNG coordinate embed. */
export const getActiveFractalCoords = (): FractalHandoffCoords | null =>
  activeControl?.getCoords() ?? null;

/**
 * Mount the live fractal: create + drive its own WebGL renderer in `host.container`. Ported
 * verbatim from the overlay's former inline lifecycle (creation deferred one RAF so the loading
 * spinner paints before the blocking shader compile; RAF phase-cycle; gesture pan/zoom; deep-zoom
 * rebuild on gesture settle; a store subscription pushing the live knobs).
 */
const mountFractal = (host: OwnCanvasHost): OwnCanvasHandle => {
  const container = host.container;
  const canvas = document.createElement('canvas');
  canvas.className = 'absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none';
  container.appendChild(canvas);

  let renderer: FractalColorRenderer | null = null;
  let raf = 0;
  let startRaf = 0;
  let ro: ResizeObserver | undefined;
  let unsubscribe: (() => void) | undefined;
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  // ── pan/zoom gestures (mutate the renderer directly — no React render) ──
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const onPointerDown = (e: PointerEvent): void => {
    if (!renderer) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (!renderer || !dragging) return;
    renderer.pan(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
  };
  // Rebuild the deep-zoom reference orbit once a gesture settles (commit on gesture-end, not
  // per-frame). Cheap no-op when deep zoom is off.
  const scheduleDeepRebuild = (delayMs: number): void => {
    if (!getFractalState().deepZoom) return;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      void renderer?.rebuildDeepZoom();
    }, delayMs);
  };
  const onPointerUp = (e: PointerEvent): void => {
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    scheduleDeepRebuild(0); // pan ended → rebuild orbit at the new centre
  };
  const onWheel = (e: WheelEvent): void => {
    if (!renderer) return;
    // Normalize wheel delta across deltaMode (Firefox/Linux report line/page deltas, not pixels).
    const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    // px > 0 (scroll down) → zoom out (factor > 1).
    renderer.zoomAt(e.clientX, e.clientY, Math.exp(px * 0.0015));
    scheduleDeepRebuild(300); // debounce: rebuild once the user stops scrolling
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel);

  // Lazy-load the heavy fractal engine chunk so the "Rendering…" spinner paints FIRST — instead
  // of a static import's module parse + WebGL shader compile blocking the initial frame. One extra
  // RAF defers the blocking compile until after the overlay is on screen.
  void import('../../../engine/fractal').then(({ FractalColorRenderer }) => {
    if (cancelled) return;
    startRaf = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        renderer = new FractalColorRenderer(canvas);
      } catch (e) {
        host.onError(e);
        return;
      }
      // Dev-only debug/test handle (mirrors window.__store) — lets a smoke drive the renderer
      // directly. Stripped from production so no GL-context-holding global leaks to users.
      if (import.meta.env.DEV) {
        (window as unknown as { __fractalRenderer?: FractalColorRenderer }).__fractalRenderer = renderer;
      }

      const r = renderer;
      // Apply the current state to the freshly-created renderer. Shared with the context-loss
      // recovery path (onRestored) so a rebuilt GL surface comes back configured identically.
      const configure = (): void => {
        r.setRenderSize(container.clientWidth, container.clientHeight);
        const ctx = host.getContext();
        if (ctx.lut.length) r.setColormap(ctx.lut);
        const f = getFractalState();
        r.setParams({
          gradientPhase: f.phase,
          gradientRepeat: f.repeats,
          colorMapping: f.mapping,
          colorNormV2: f.colorNormV2,
          iterRate: f.iterRate,
          iterOffset: f.iterOffset,
          iterScale: f.iterScale,
          iterMul: f.iterMul,
        });
        if (f.deepZoom) r.setDeepZoomEnabled(true);
        r.setDither(getFullscreenState().dither);
      };
      configure();
      // After a GPU context-loss recovery the renderer has rebuilt its GL objects (incl. fresh
      // gradient/deep-zoom controllers with no orbit) — re-apply state + rebuild the deep orbit.
      r.onRestored = () => {
        configure();
        if (getFractalState().deepZoom) void r.rebuildDeepZoom();
      };

      // ── live-knob subscription: push store changes to the renderer ──
      // Replaces the overlay's former per-knob effects. The RAF loop renders every frame, so a
      // knob push only needs to update renderer state before the next frame (no explicit render).
      // (Dither is forwarded by the overlay via the OwnCanvasHandle, not watched here.)
      const f0 = getFractalState();
      let prevPhase = f0.phase;
      let prevRepeats = f0.repeats;
      let prevMapping = f0.mapping;
      let prevIterMul = f0.iterMul;
      let prevDeep = f0.deepZoom;
      let prevColorNorm = f0.colorNormV2;
      let prevIterRate = f0.iterRate;
      let prevIterOffset = f0.iterOffset;
      let prevIterScale = f0.iterScale;
      unsubscribe = subscribeFractal(() => {
        const s = getFractalState();
        const iterMulChanged = s.iterMul !== prevIterMul;
        if (
          s.phase !== prevPhase ||
          s.repeats !== prevRepeats ||
          s.mapping !== prevMapping ||
          s.colorNormV2 !== prevColorNorm ||
          s.iterRate !== prevIterRate ||
          s.iterOffset !== prevIterOffset ||
          s.iterScale !== prevIterScale ||
          iterMulChanged
        ) {
          r.setParams({
            gradientPhase: s.phase,
            gradientRepeat: s.repeats,
            colorMapping: s.mapping,
            colorNormV2: s.colorNormV2,
            iterRate: s.iterRate,
            iterOffset: s.iterOffset,
            iterScale: s.iterScale,
            iterMul: s.iterMul,
          });
        }
        if (s.deepZoom !== prevDeep) r.setDeepZoomEnabled(s.deepZoom);
        // At deep zoom, iterMul scales the reference-orbit BUILD length, so an actual iterMul change
        // must rebuild. The deep-zoom ENABLE path already rebuilds inside setDeepZoomEnabled, so this
        // only fires on an iterMul change (never on the toggle, which leaves iterMul untouched).
        if (iterMulChanged && s.deepZoom) void r.rebuildDeepZoom();
        prevPhase = s.phase;
        prevRepeats = s.repeats;
        prevMapping = s.mapping;
        prevIterMul = s.iterMul;
        prevDeep = s.deepZoom;
        prevColorNorm = s.colorNormV2;
        prevIterRate = s.iterRate;
        prevIterOffset = s.iterOffset;
        prevIterScale = s.iterScale;
      });

      // ── RAF loop ──
      // When auto-cycling, advance the phase directly on the renderer (no store write → no per-frame
      // React render); the slider is hidden while animating, so there's no desync to reconcile.
      let animPhase = getFractalState().phase;
      let wasAnimating = getFractalState().animate;
      let first = true;
      const loop = (): void => {
        const animating = getFractalState().animate;
        if (animating) {
          animPhase = (animPhase + PHASE_ANIM_STEP) % 1;
          r.setParams({ gradientPhase: animPhase });
        } else if (wasAnimating) {
          // Cycle just stopped: commit the drifted phase to the store so the Phase slider reflects
          // where it landed (the store write re-fires the knob subscription — a no-op confirm).
          setFractalPhase(animPhase);
        }
        wasAnimating = animating;
        r.render();
        if (first) { first = false; host.onReady(); }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      // Resize the GL buffer to the container.
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => r.setRenderSize(container.clientWidth, container.clientHeight));
        ro.observe(container);
      }

      // Publish the control surface for the toolbar Controls (Reset / Copy / Fit).
      activeControl = {
        resetView: () => {
          r.setParams({ center: [-0.5, 0], centerLow: [0, 0], zoom: 1.4 });
          scheduleDeepRebuild(0);
        },
        // Re-anchor Iterations colour onto the current view's iteration range. Returns
        // false when nothing escaped (all-interior view) so the UI can flash "no range".
        fitIterView: () => {
          const fit = r.fitIterationRange();
          if (!fit) return false;
          setFractalIterFit(fit.offset, fit.scale);
          return true;
        },
        copyCoords: () => {
          const p = r.getParams();
          const json = JSON.stringify({
            center: p.center,
            centerLow: p.centerLow,
            zoom: p.zoom,
            colorMapping: p.colorMapping,
            iterMul: p.iterMul,
            deepZoom: p.deepZoomEnabled,
            gradientRepeat: p.gradientRepeat,
            gradientPhase: p.gradientPhase,
            deepStats: r.lastDeepStats,
          });
          console.log('[fractal coords]', json);
          return json;
        },
        getCoords: () => {
          const p = r.getParams();
          return {
            center: [p.center[0], p.center[1]],
            centerLow: [p.centerLow[0], p.centerLow[1]],
            zoom: p.zoom,
            juliaC: [p.juliaC[0], p.juliaC[1]],
            kind: p.kind,
            power: p.power,
            maxIter: p.maxIter,
            colorMapping: p.colorMapping,
            gradientRepeat: p.gradientRepeat,
            gradientPhase: p.gradientPhase,
            deepZoom: p.deepZoomEnabled,
          };
        },
      };
    });
  }).catch((e) => {
    if (cancelled) return;
    console.error('[fullscreen-fractal] failed to load fractal engine:', e);
    host.onError(e);
  });

  return {
    onContext: (ctx) => { if (ctx.lut.length) renderer?.setColormap(ctx.lut); },
    setDither: (on) => { renderer?.setDither(on); },
    exportCanvas: () => { renderer?.render(); return canvas; },
    dispose: () => {
      cancelled = true;
      cancelAnimationFrame(startRaf);
      cancelAnimationFrame(raf);
      if (rebuildTimer) clearTimeout(rebuildTimer);
      ro?.disconnect();
      unsubscribe?.();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      renderer?.dispose();
      renderer = null;
      activeControl = null;
      delete (window as unknown as { __fractalRenderer?: FractalColorRenderer }).__fractalRenderer;
      canvas.remove();
    },
  };
};

/** The fractal toolbar block — the mode's self-contained `Controls`. Reads the store + calls the
 *  store setters; Reset/Copy reach the live renderer through the module-scoped {@link activeControl}. */
const FractalControls: React.FC = () => {
  const fr = useFractalState();
  const [coordsCopied, setCoordsCopied] = useState(false);

  const copyCoords = useCallback(() => {
    const json = activeControl?.copyCoords();
    if (json == null) return;
    const done = (): void => { setCoordsCopied(true); setTimeout(() => setCoordsCopied(false), 1500); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(json).then(done).catch(done);
    else done();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
        Mapping
        <select
          value={fr.mapping}
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
          value={fr.repeats}
          onChange={setFractalRepeats}
          min={0.05}
          max={100}
          hardMin={0.0001}
          hardMax={1024}
          step={0.0001}
          mapping={REPEATS_MAPPING}
          defaultValue={1}
          label="Density"
          trackHeight={14}
        />
      </div>
      {fr.colorNormV2 && fr.mapping === 0 && (
        <>
          <div className="w-28">
            <ScalarInput
              value={fr.iterRate}
              onChange={setFractalIterRate}
              min={0.25}
              max={8}
              hardMin={0.01}
              hardMax={64}
              step={0.01}
              mapping={ITER_RATE_MAPPING}
              defaultValue={1}
              label="Rate"
              trackHeight={14}
            />
          </div>
          <button
            onClick={() => activeControl?.fitIterView()}
            title="Fit the gradient to this view's iteration range. Colours then hold until you re-fit or reset."
            className="px-2.5 py-1 text-[12px] rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            ⊞ Fit to view
          </button>
          {(fr.iterOffset !== 0 || fr.iterScale !== 1) && (
            <button
              onClick={resetFractalIterFit}
              title="Clear the Fit-to-view anchor (back to absolute log — full range, colours hold)"
              className="px-2 py-1 text-[12px] rounded-md border border-violet-500/30 text-violet-200 hover:bg-violet-500/10 transition-colors"
            >
              ↺ fit
            </button>
          )}
        </>
      )}
      <div className="w-32">
        <ScalarInput
          value={fr.iterMul}
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
      {!fr.animate && (
        <div className="w-32">
          <ScalarInput
            value={fr.phase}
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
        onClick={() => setFractalColorNormV2(!fr.colorNormV2)}
        title="Depth-normalized colour — every mode keeps a sane Density (~1) at any zoom. Off = the original look."
        className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
          fr.colorNormV2
            ? 'border-violet-500/40 bg-violet-500/20 text-violet-100'
            : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        {fr.colorNormV2 ? '✦ Norm v2' : '○ Norm v1'}
      </button>
      <button
        onClick={() => setFractalAnimate(!fr.animate)}
        title="Auto-cycle the colormap phase (palette cycling)"
        className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
          fr.animate
            ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-100'
            : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        {fr.animate ? '❚❚ Cycling' : '▶ Cycle'}
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
        onClick={() => activeControl?.resetView()}
        title="Reset pan / zoom to the full set"
        className="px-2.5 py-1 text-[12px] rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        ⌖ Reset view
      </button>
    </div>
  );
};

/** The live fractal mode — the reference `ownCanvas` consumer of the seam. */
export const FRACTAL_MODE: FullscreenMode = {
  id: 'fractal',
  label: 'Fractal',
  kind: 'ownCanvas',
  hint: 'Esc to close · drag to pan · scroll to zoom',
  mount: mountFractal,
  Controls: FractalControls,
};
