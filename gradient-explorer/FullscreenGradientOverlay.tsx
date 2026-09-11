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
 * TWO export paths, both live here (S4 Wallpaper, 2026-09-03):
 *   • the toolbar's **Export PNG** — the original: a snapshot of the ON-SCREEN canvas at
 *     window size × DPR. Still the only path that embeds a fractal scene in the PNG, so it
 *     stays the coordinate carrier for the fluid-toy handoff.
 *   • the bottom bar's **Export panel** — pick a size (Phone / Square / 1080p / 4K / custom,
 *     either orientation, optional ×2 supersample on the CPU kinds) and the frame is rendered
 *     OFFSCREEN at exactly that size: a second `FullscreenCompositor` for cpuField/cpuRaster/
 *     glQuad, the handle's `renderAt(w, h)` for ownCanvas modes. Capped at 4K, no tiling.
 *     The visible canvas is never resized by either path.
 *
 * Opened via `openFullscreen(config, name)` — the receive path of the "Fullscreen" send-target
 * registered in `gradient-explorer/gradientTargets.ts` (a bottom-row well in the P2-A dock).
 *
 * All view state (mode / geomParams / open / split / dither) is transient + shell-scoped in
 * `fullscreenStore` (not DDFS, not persisted). The geometry mappings are pure; this component owns
 * the canvas paint + the chrome, and dispatches mode lifecycle to the registry.
 *
 * PHONE (2026-09-11). This overlay is portalled to `document.body`, i.e. OUTSIDE the app's
 * `MobileViewportShell` — nothing above it supplies safe-area padding or a `touch-action`, and
 * the host page (`gradient-explorer-next.html`) scopes its `html, body { overflow: hidden }` to
 * `(hover: hover) and (pointer: fine)`, so on a phone the body is still scrollable under this
 * fixed layer. That is the owner's "fullscreen controls are problematic because the page is
 * scrolling with them". Three answers, all here:
 *   • the root declares `touchAction: 'none'` + `overscrollBehavior: 'none'` — a touch the
 *     overlay does not consume now goes nowhere instead of scrolling the document beneath it
 *     (the geometry handles are SVG, and WebKit does not honour `touch-action` on SVG nodes,
 *     so the guard has to sit on an HTML ancestor);
 *   • an effect pins `overflow: hidden` on documentElement + body for as long as the overlay is
 *     open, remembering and restoring the previous values on close;
 *   • on a phone the root pads by `env(safe-area-inset-top/bottom)` (the page sets
 *     `viewport-fit=cover`, so the insets are real on an iPhone).
 * A region inside that legitimately scrolls re-declares its own axis: the mode selector is a
 * horizontally scrolling run (`gx-rail-scroll`, `touchAction: 'pan-x'`) so all seven modes stay
 * reachable in a 390 px row, the right cluster wraps, Handles/Dither shrink to their glyphs
 * (their `title` already carries the word) and every toolbar control is ≥ 36 px tall.
 * Guarded by `npm run smoke:ge-phone` step [8].
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
  setFullscreenResolved,
  rampToLut,
  useFullscreenState,
  getFullscreenLiveSource,
  type FullscreenState,
  type LiveGradientSourceHook,
} from '../palette/store/fullscreenStore';
import { useActiveHeroSelection } from '../palette/store/heroSelection';
import { useGeneratorDerived } from '../palette/store/generatorStore';
import { useImageStore } from '../palette/store/imageStore';
import { showToast } from '../engine/store/toastStore';
import type { GradientConfig } from '../types';
import type { RGB } from '../palette/core/oklab';
import { FullscreenCompositor } from './fullscreen/FullscreenCompositor';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { GeometryHandleLayer, hasGeometryHandles } from './fullscreen/GeometryHandleLayer';
import { getFullscreenMode, listFullscreenModes } from './fullscreen/modeRegistry';
import type { FullscreenModeContext, OwnCanvasHandle } from './fullscreen/modeRegistry';
import './fullscreen/modes'; // registers the builtin modes at import time
import { ExportPanel } from './fullscreen/ExportPanel';
import { exportFileName, type ExportSizePlan } from './fullscreen/exportSize';
import { pngSizeOf, renderModeToBlob } from './fullscreen/exportRender';
import { canvasToPngBlob, downloadBlob, embedScenePng } from '../utils/SceneFormat';
import { getActiveFractalCoords } from './fullscreen/modes/fractalMode';
import { buildFluidToyScene, openInFluidToy } from './fractalHandoff';
import { InputSkinProvider } from '../components/inputs';
import { Z } from '../components/ui/zIndex';

/** Continuous geometries render up to this long edge. Higher than the old 1440 so the preview
 *  renders at (near-)native device pixels: error-diffusion dither must be at display resolution,
 *  or the browser's bilinear upscale stretches the step-runs and re-introduces banding. */
const CONTINUOUS_MAX_DIM = 2560;

/** Long-edge cap while a handle drag is in flight: the full-res CPU field + error diffusion
 *  costs ~100ms+ at 2560 on big displays — far too slow for pointer-rate repaints. A drag
 *  renders at this cap (slightly soft, fast) and snaps back to full resolution on release. */
const INTERACT_MAX_DIM = 1280;

/** Idle time after the last change before a geometry mode re-renders its still image through
 *  the CPU error-diffusion path. Long enough to coalesce a stream of edits into one expensive
 *  render, short enough that the settle is not read as lag. */
const SETTLE_MS = 180;

/** The ctx params handed to modes: the handle-driven shape params. An unset key resolves to
 *  its GEOM_DEFAULT inside the pure mappers — byte-identical to the pre-handles render. ONE
 *  definition so the live-paint and ownCanvas-context paths can't drift. */
const buildParams = (fs: FullscreenState) => fs.geomParams;

type LiveSource = { config: GradientConfig; name: string; ramp?: RGB[] };
type ResolveFn = (r: LiveSource | null) => void;

/** A cheap content hash of a rendered ramp — FNV over its 768 bytes. The live source is watched
 *  by VALUE, and when the host hands over a ramp the ramp is the value that matters: a Curves or
 *  Adjust move can leave the stop refit byte-identical while the ramp itself moves. */
const rampSignature = (ramp: RGB[]): string => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < ramp.length; i++) {
    const c = ramp[i];
    h = Math.imul(h ^ (c.r & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ (c.g & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ (c.b & 0xff), 16777619) >>> 0;
  }
  return `r${h.toString(36)}:${ramp.length}`;
};

/** Push a resolved source upward only when its colour CONTENT changes — a value signature (not
 *  object identity), so an unstable store ref can't drive a render loop. Shared by both
 *  resolvers below so they cannot drift in when they report. */
const usePushResolved = (
  config: GradientConfig | null,
  name: string,
  onResolve: ResolveFn,
  ramp?: RGB[],
): void => {
  // Watch the RAMP when there is one — it is what gets rendered, and it changes when the stop
  // refit does not. Fall back to the stops for a host that only has a document.
  const sig = !config
    ? ''
    : ramp && ramp.length
      ? `${rampSignature(ramp)}:${name}`
      : config.stops.map((s) => `${s.color}@${s.position}`).join('|') + `:${config.blendSpace}:${config.colorSpace}:${name}`;
  const lastSig = useRef<string | null>(null);
  useEffect(() => {
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    onResolve(config ? { config, name, ramp } : null);
  }, [sig, name, config, ramp, onResolve]);
  // Clear on unmount (the overlay closing) so the snapshot source resumes cleanly.
  useEffect(() => () => { lastSig.current = null; onResolve(null); }, [onResolve]);
};

/** The OLD shell's live source: the last-modified hero. For the editable surfaces (Stops /
 *  Generator) it reads the live store so edits reflect without re-selecting the hero; otherwise
 *  it follows the active hero's selected payload, and reports null (→ the open-time snapshot)
 *  when nothing is selected. The (heavy) Generator derivation runs while the overlay is up —
 *  acceptable there since that shell's fullscreen has no edit UI, and it is why the v2 shell
 *  registers its own hook instead of paying for a pipeline it never reads. */
const HeroLiveSource: React.FC<{ onResolve: ResolveFn }> = ({ onResolve }) => {
  const hero = useActiveHeroSelection();
  // Generator covers Stops too now (its Stops sub-mode resolves to the stops gradient via
  // useGeneratorDerived().config), so there's no separate 'stops' hero mode to special-case.
  const generatorConfig = useGeneratorDerived().config;
  let config: GradientConfig | null = hero?.payload.config ?? null;
  let name = hero?.payload.name ?? 'Gradient';
  if (hero?.mode === 'generator') { config = generatorConfig; name = hero.payload.name || 'Generator'; }
  usePushResolved(config, name, onResolve);
  return null;
};

/** The host-registered live source (`setFullscreenLiveSource`) — the v2 shell's Working
 *  pipeline, and whatever a future host registers. Resolved at module level, never
 *  conditionally inside a component, so the hook the host supplied is called unconditionally
 *  for this component's whole life. */
const RegisteredLiveSource: React.FC<{ onResolve: ResolveFn; hook: LiveGradientSourceHook }> = ({
  onResolve,
  hook,
}) => {
  const live = hook();
  usePushResolved(live?.config ?? null, live?.name ?? 'Gradient', onResolve, live?.ramp);
  return null;
};

/** Resolves the gradient the wallpaper follows and reports it upward. Mounted whenever the
 *  overlay is open (split AND plain fullscreen share this one live path). WHICH resolver runs
 *  is decided by whether the host registered a hook — a value that is set at boot and does not
 *  change, so the two are distinct component types with their own stable hook order. */
const SplitLiveSource: React.FC<{ onResolve: ResolveFn }> = ({ onResolve }) => {
  const hook = getFullscreenLiveSource();
  return hook
    ? <RegisteredLiveSource onResolve={onResolve} hook={hook} />
    : <HeroLiveSource onResolve={onResolve} />;
};

export const FullscreenGradientOverlay: React.FC = () => {
  const fs = useFullscreenState();
  // PHONE: no Split layout (owner, 2026-09-11) — the app-on-top / preview-below stack has no
  // room on a phone screen and the preview is the whole point of opening Wallpaper there.
  // The button is hidden AND the state is forced off, so a split left on by a desktop
  // session (the store is session-only, but a resize past 768 mid-session is not) cannot
  // strand the phone in it.
  const { isDeviceMobile: phone } = useMobileLayout();
  useEffect(() => { if (phone && fs.split) setFullscreenSplit(false); }, [phone, fs.split]);
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
  // True while an at-size export is running (a 4K CPU field is a visible pause) — disables the
  // panel's button so a second click can't start a parallel render.
  const [exporting, setExporting] = useState(false);
  // The Extract image's display thumbnail. The overlay does not draw it — the `gradientMap`
  // cpuRaster mode reads it from `imageStore` inside its own `raster` — but the overlay is the
  // only thing that can NOTICE it changed and repaint. Subscribed here so dropping an image
  // while the split preview is up refreshes the map instead of leaving a stale frame.
  const imageThumb = useImageStore((s) => s.thumb);

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
  const [liveSplit, setLiveSplit] = useState<LiveSource | null>(null);
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

  // PIN THE DOCUMENT while the overlay is open. `position: fixed` does not stop the page
  // underneath from scrolling, and on a coarse-pointer device this page's body IS scrollable
  // (its `html, body { overflow: hidden }` is inside a `(hover: hover) and (pointer: fine)`
  // media query), so every touch the overlay did not consume dragged the document under it —
  // the owner's "the page is scrolling with them", 2026-09-11. Unconditional, not phone-gated:
  // pinning a document that is already pinned is a no-op, and the previous values are restored
  // verbatim on close, so a host that manages its own overflow is left exactly as it was found.
  useEffect(() => {
    if (!fs.open) return;
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.overflow;
    const prevBody = body.style.overflow;
    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prevRoot;
      body.style.overflow = prevBody;
    };
  }, [fs.open]);

  // The host's own rendered ramp wins over re-deriving one from the stops: a pipeline's stop
  // refit is an approximation of what it is actually showing, and the wallpaper is supposed to
  // show what the hero shows.
  const liveRamp = liveSplit?.ramp ?? null;
  const ramp = useMemo(
    () =>
      liveRamp && liveRamp.length
        ? liveRamp
        : sourceConfig
          ? renderStopsToRamp(sourceConfig.stops, sourceConfig.blendSpace, sourceConfig.colorSpace)
          : null,
    [liveRamp, sourceConfig],
  );
  // The 256×4 RGBA8 LUT (for glQuad modes' `uLut` upload + ownCanvas modes' colormap) — same
  // colours as `ramp`.
  const lut = useMemo(
    () =>
      liveRamp && liveRamp.length
        ? rampToLut(liveRamp)
        : sourceConfig
          ? renderStopsToBuffer(sourceConfig.stops, sourceConfig.blendSpace, sourceConfig.colorSpace)
          : null,
    [liveRamp, sourceConfig],
  );

  // Publish what we resolved, so a mode that paints the gradient on its OWN compositor (the
  // spline's editable path) draws the same colours as the stage under it instead of resolving
  // a second time from a store this shell does not use.
  useEffect(() => {
    setFullscreenResolved(
      sourceConfig ? { config: sourceConfig, name: sourceName, ramp: ramp ?? undefined } : null,
    );
  }, [sourceConfig, sourceName, ramp]);

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
  /** The Extract image the last cpuRaster present used — part of the same idempotence key. */
  const lastImageRef = useRef<unknown>(null);

  // Has the picture stopped changing? A geometry mode renders on the GPU until this flips, then
  // once more through the CPU error-diffusion path for the still image the user actually looks
  // at (and exports). Held in state — not a ref — because flipping it must re-run `paint`.
  const [settled, setSettled] = useState(false);

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
    // A cpuField mode with a GLSL fast path renders on the GPU for LIVE frames and only pays
    // for the CPU field + error diffusion once things settle (see `settle` below). The frames
    // this replaces were never error-diffused anyway — the overlay drops the dither while
    // `interacting` — so the still image is unchanged and the moving one is both faster and
    // better dithered (it now gets the blue-noise tail instead of nothing).
    const glFast = mode.kind === 'cpuField' && !!mode.fragBody && !settled;
    if (mode.kind === 'glQuad' || glFast) {
      comp.uploadLut(lut); // glQuad modes sample uLut; so does the geometry fast path
      comp.presentMode(mode, ctx);
      // The GPU path leaves no CPU field behind, so the settle pass must not be skipped by the
      // idempotence key below — clear it.
      if (glFast) lastFieldKeyRef.current = null;
    } else {
      // Idempotent: an unrelated re-render (or a no-op upstream emit) with the SAME geom/params/
      // dither/size/ramp/image re-runs nothing — the field stays as last rendered. Resize and the
      // interacting→idle settle change `key`, so they still repaint. Both CPU kinds are gated
      // this way: cpuField costs a full error-diffusion pass, cpuRaster (gradientMap) an 8 MPx
      // resample — neither is something to repeat on an unrelated render.
      const key = `${fs.geom}|${comp.dither ? 1 : 0}|${w}x${h}|${JSON.stringify(fs.geomParams)}`;
      if (
        lastFieldKeyRef.current === key &&
        lastFieldRampRef.current === ramp &&
        lastImageRef.current === imageThumb
      ) return;
      lastFieldKeyRef.current = key;
      lastFieldRampRef.current = ramp;
      lastImageRef.current = imageThumb;
      if (mode.kind === 'cpuField') comp.presentField(mode.field!(ctx), w, h, DEFAULT_BACKGROUND, ramp);
      else comp.presentRaster(mode.raster!(ctx), w, h);
    }
  }, [ramp, lut, fs.geom, fs.geomParams, fs.dither, fs.interacting, imageThumb, settled]);

  // Repaint on open + whenever the geometry / params / ramp change — COALESCED to one paint
  // per animation frame: a handle drag emits store updates at pointer rate, and each re-created
  // `paint` cancels the previous pending frame, so a fast drag costs one full-field CPU render
  // per displayed frame instead of one per pointermove.
  useEffect(() => {
    if (!fs.open) return;
    const id = requestAnimationFrame(() => paint());
    return () => cancelAnimationFrame(id);
  }, [fs.open, paint]);

  // The SETTLE. Anything that changes the picture drops `settled` (so the next paint takes the
  // GPU fast path) and re-arms a timer; when the changes stop, `settled` flips and one final
  // paint runs the CPU field + error diffusion. SETTLE_MS is short enough not to be noticed as
  // a delay and long enough that a stream of edits — a drag, a slider, a gradient being
  // rewritten stop by stop in split — coalesces into ONE expensive render at the end instead of
  // one per change. A mode with no GPU fast path (cpuRaster, glQuad) is unaffected: `settled`
  // gates nothing for them.
  useEffect(() => {
    if (!fs.open) return;
    setSettled(false);
    const t = window.setTimeout(() => setSettled(true), SETTLE_MS);
    return () => window.clearTimeout(t);
    // `settled` is deliberately NOT a dependency — it is what this effect sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs.open, fs.geom, fs.geomParams, fs.dither, fs.interacting, ramp, imageThumb]);

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
    let blob = await canvasToPngBlob(canvas);
    if (!blob) return;
    // Fractal mode: embed the exact view + gradient as a fluid-toy scene in the PNG's SceneData
    // chunk, so the exported image doubles as a coordinate carrier — drop it on fluid-toy and it
    // opens at this fractal. Other modes export a plain (metadata-free) image.
    if (activeMode?.id === 'fractal') {
      const coords = getActiveFractalCoords();
      if (coords) blob = await embedScenePng(blob, buildFluidToyScene(coords, sourceConfig, sourceName));
    }
    const stem = (sourceName || 'gradient').trim().replace(/\s+/g, '-').toLowerCase() || 'gradient';
    // Split exports the live preview pane (the app DOM above can't be rasterised); the `-split`
    // suffix marks it as captured in the live-follow split layout.
    downloadBlob(blob, `${stem}-${fs.split ? 'split' : fs.geom}.png`);
  }, [sourceName, sourceConfig, fs.geom, fs.split, isOwnCanvas, activeMode]);

  /**
   * Export at a chosen size — the second, deliberate export path (the toolbar's Export PNG
   * above stays exactly as it was). Nothing here touches the visible canvas:
   *   • compositor modes render through a throwaway offscreen {@link FullscreenCompositor};
   *   • ownCanvas modes go through their handle's `renderAt(w, h)`, and a mode that has not
   *     implemented it yet falls back to the on-screen snapshot with a toast saying so.
   *
   * The file is named from the PNG's REAL pixel size, read back off its header — a mode may
   * legitimately cap itself below the request (the Fractal renderer stops at 1600 px on the
   * long edge), and a wallpaper named 3840×2160 that is really 1600×900 would be a lie.
   *
   * The at-size path deliberately does NOT embed the fractal scene in the PNG. That belongs to
   * the on-screen Export PNG button, which stays the coordinate-carrier path; duplicating it
   * here would make every 4K fractal export also a scene file with no way to opt out.
   */
  const exportAtSize = useCallback(async (plan: ExportSizePlan) => {
    const mode = getFullscreenMode(fs.geom);
    if (!mode || !ramp || !lut) return;
    setExporting(true);
    try {
      let blob: Blob | null = null;
      if (mode.kind === 'ownCanvas') {
        const renderAt = ownHandleRef.current?.renderAt;
        if (!renderAt) {
          showToast(`${mode.label} exports at screen size — no at-size render yet`, 'warning', 4000);
          await exportPng();
          return;
        }
        blob = await renderAt(plan.renderWidth, plan.renderHeight);
      } else {
        blob = await renderModeToBlob(
          mode,
          { ramp, lut, params: buildParams(fs) },
          plan,
          fs.dither,
        );
      }
      if (!blob) {
        showToast('Export failed — the renderer produced no image', 'error', 4000);
        return;
      }
      const real = (await pngSizeOf(blob)) ?? { width: plan.width, height: plan.height };
      downloadBlob(blob, exportFileName(sourceName, mode.id, real.width, real.height));
      const short =
        real.width !== plan.width || real.height !== plan.height
          ? ` (${mode.label} caps its own render)`
          : '';
      showToast(`Exported ${real.width}×${real.height}${short}`, short ? 'warning' : 'success', short ? 4000 : 2600);
    } catch (e) {
      console.error('[fullscreen export] at-size export failed:', e);
      showToast('Export failed', 'error', 4000);
    } finally {
      setExporting(false);
    }
  }, [fs, ramp, lut, sourceName, exportPng]);

  if (!fs.open || !fs.config) return null;

  const ActiveControls = activeMode?.Controls;
  const ActiveStage = activeMode?.Stage;
  // A compositor mode always renders at any size (a second compositor on an offscreen canvas);
  // an ownCanvas mode only if it implements the optional `renderAt` face. Read through the ref
  // during render — `ownReady` re-renders once the mode has mounted, so this settles correctly.
  const canRenderAtSize = !isOwnCanvas || !!ownHandleRef.current?.renderAt;
  // The bottom-right stage hint — split / per-mode / generic display-only.
  const hint = fs.split
    ? 'Live — follows the gradient you last edited · drag the divider to resize'
    : activeMode?.hint ?? 'Esc to close · display-only preview';
  // App fraction (0..1) the divider sits at, as a percentage for ARIA + drag math.
  const appPct = Math.round(fs.splitY * 100);
  // PHONE: every toolbar control gets a ≥36 px tap target. 36 rather than the 44 the platform
  // guidelines ask for because the toolbar already costs two rows on a 390 px screen and the
  // stage — the thing the user opened Wallpaper to look at — pays for every pixel of chrome.
  const tapY = phone ? 'py-2 min-h-[36px]' : 'py-1';

  return createPortal(
    <div
      className={`fixed flex flex-col select-none ${
        fs.split
          ? 'bg-surface-dock/95 border-t border-line/15 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]'
          : 'inset-0 bg-surface backdrop-blur-sm'
      }`}
      style={{
        zIndex: Z.overlay,
        // Consume every touch that lands on the overlay itself. Without this the handle layer's
        // SVG `touchAction: 'none'` is not enough (WebKit ignores touch-action on SVG nodes) and
        // a handle drag scrolls the page instead of moving the handle. Scrolling regions inside
        // re-declare their own axis — see the mode selector's `pan-x` below.
        touchAction: 'none',
        overscrollBehavior: 'none',
        // Portalled to document.body ⇒ outside MobileViewportShell ⇒ nothing above supplies the
        // safe area. The page carries `viewport-fit=cover`, so these insets are real on an iPhone.
        ...(phone ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : null),
        ...(fs.split ? { top: `${fs.splitY * 100}%`, left: 0, right: 0, bottom: 0 } : null),
      }}
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
          <div className="h-1 w-16 rounded-full bg-line/25 group-hover:bg-accent-400/70 group-focus:bg-accent-400/70 transition-colors" />
        </div>
      )}

      {/* Toolbar: mode selector + the active mode's own controls + split/dither/export/close. */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-line/10 bg-surface-dock/80">
        {/* The name gives up its 28ch reservation on a phone — `min-w-0` lets it shrink so the
            truncation is what yields the row, not an overflow. */}
        <div className={`text-sm font-medium text-fg-secondary mr-1 truncate flex items-center gap-1.5 ${phone ? 'min-w-0' : 'max-w-[28ch]'}`}>
          {fs.split && !phone && <span className="text-[9px] font-semibold tracking-wide px-1 py-0.5 rounded bg-accent-500/25 text-accent-300">LIVE</span>}
          {sourceName}
        </div>
        {/* PHONE: the close lives in the NAME ROW (owner, 2026-09-11: "the X can go in the
            header"), and the right cluster below is not rendered at all — Export PNG is in
            the export panel already, and Handles / Dither / Fluid Toy are not for a phone. */}
        {phone && (
          <button
            onClick={closeFullscreen}
            title="Close"
            aria-label="Close fullscreen preview"
            className="ml-auto px-3 min-h-[36px] text-[16px] leading-none rounded-md border border-line/10 text-fg-tertiary"
          >
            ✕
          </button>
        )}

        {/* Seven mode chips are ~500 px of non-wrapping run. On a 390 px screen that used to
            overflow to the right and get CLIPPED by the page's `overflow-x: clip` — the last
            modes were literally unreachable. On a phone the run takes its own line and scrolls
            horizontally instead (`gx-rail-scroll` hides the bar, `pan-x` is the one touch axis
            this overlay hands back to the browser). */}
        <div
          data-gx-fs-modes
          className={`flex items-center rounded-md border border-line/10 divide-x divide-line/10 ${
            phone ? 'basis-full w-full min-w-0 overflow-x-auto gx-rail-scroll' : 'overflow-hidden'
          }`}
          style={phone ? { touchAction: 'pan-x' } : undefined}
        >
          {listFullscreenModes().map((m) => (
            <button
              key={m.id}
              onClick={() => setFullscreenGeom(m.id)}
              className={`shrink-0 whitespace-nowrap px-3 ${phone ? 'py-2 min-h-[36px]' : 'py-1.5'} text-[12px] transition-colors ${
                fs.geom === m.id
                  ? 'bg-accent-500/25 text-accent-300 font-medium'
                  : 'text-fg-muted hover:text-fg-secondary hover:bg-line/[0.05]'
              }`}
            >
              {m.label}
              {m.wip && (
                <span
                  className="ml-1.5 align-middle text-[9px] uppercase tracking-wide text-warn/90"
                  title="Under construction — this mode is unfinished"
                >
                  wip
                </span>
              )}
            </button>
          ))}
        </div>

        {/* The active mode's own self-contained controls (the fractal's mapping/repeats/phase/
            cycle, Liquify's brushes/physics, …). The geometry modes drive their shape via the
            on-screen handle layer, so they declare no toolbar controls.

            Skinned SOFT, the same as the v2 hero, the tray and the Browse filters (owner,
            2026-09-08: "look at the hero gradient as an example of finished ui"). Every mode's
            sliders are the shared ScalarInput, so one provider here paints all of them without
            any mode knowing about it — which is the whole point of the skin being a context and
            not a second component.

            A phone bounds them: `basis-full min-w-0` gives the block its own line and a real
            width to wrap inside, so a mode with a dozen controls (the fractal's) can never make
            the toolbar row wider than the screen. Desktop keeps the exact previous layout —
            `contents` makes the wrapper disappear from the flex formatting context. */}
        {ActiveControls && (
          <div className={phone ? 'basis-full w-full min-w-0 max-w-full' : 'contents'}>
            <InputSkinProvider skin="soft">
              <ActiveControls />
            </InputSkinProvider>
          </div>
        )}

        <div className={`flex items-center gap-2 ml-auto ${phone ? 'hidden' : ''}`}>
          <button
            onClick={() => {
              // Leaving split: promote the live gradient we're viewing into the snapshot so the
              // fullscreen view keeps it instead of snapping back to the open-time gradient.
              if (fs.split && liveSplit) setFullscreenConfig(liveSplit.config, liveSplit.name);
              setFullscreenSplit(!fs.split);
            }}
            title="Split: keep the app on top, dock this preview on the bottom — it live-follows the gradient you last edited"
            aria-pressed={fs.split}
            className={`${phone ? 'hidden ' : ''}px-2.5 ${tapY} text-[12px] rounded-md border transition-colors ${
              fs.split
                ? 'border-accent-500/40 bg-accent-500/20 text-accent-300'
                : 'border-line/10 text-fg-tertiary hover:text-fg hover:bg-line/[0.06]'
            }`}
          >
            ⇅ Split
          </button>
          {hasGeometryHandles(fs.geom) && (
            <button
              onClick={() => setFullscreenHandles(!fs.handles)}
              title="On-screen shape handles — drag them on the image to reshape the gradient (they fade when idle and never export)"
              aria-pressed={fs.handles}
              className={`px-2.5 ${tapY} text-[12px] rounded-md border transition-colors ${
                fs.handles
                  ? 'border-accent-500/40 bg-accent-500/20 text-accent-300'
                  : 'border-line/10 text-fg-tertiary hover:text-fg hover:bg-line/[0.06]'
              }`}
            >
              {/* Glyph-only on a phone — the `title` above already carries the word, and the
                  row has to fit Export PNG and ✕ unabbreviated. */}
              {phone ? '◉' : '◉ Handles'}
            </button>
          )}
          <button
            onClick={() => setFullscreenDither(!fs.dither)}
            title="Blue-noise dither — smooths 8-bit banding on the ramp (bakes into the PNG)"
            aria-pressed={fs.dither}
            className={`px-2.5 ${tapY} text-[12px] rounded-md border transition-colors ${
              fs.dither
                ? 'border-accent-500/40 bg-accent-500/20 text-accent-300'
                : 'border-line/10 text-fg-tertiary hover:text-fg hover:bg-line/[0.06]'
            }`}
          >
            {phone ? '▦' : '▦ Dither'}
          </button>
          {activeMode?.id === 'fractal' && (
            <button
              onClick={() => {
                const coords = getActiveFractalCoords();
                if (coords) openInFluidToy(coords, sourceConfig, sourceName);
              }}
              title="Open this fractal view (and its gradient) in the Fluid Toy"
              className={`px-3 ${tapY} text-[12px] rounded-md border border-secondary/30 bg-secondary/15 text-secondary hover:bg-secondary/25 transition-colors`}
            >
              {phone ? '≈ Fluid Toy' : '≈ Open in Fluid Toy'}
            </button>
          )}
          <button
            onClick={exportPng}
            className={`px-3 ${tapY} text-[12px] rounded-md border border-accent-500/30 bg-accent-500/15 text-accent-300 hover:bg-accent-500/25 transition-colors`}
          >
            Export PNG
          </button>
          <button
            onClick={closeFullscreen}
            title="Close (Esc)"
            aria-label="Close fullscreen preview"
            className={`px-2.5 ${tapY} text-[14px] leading-none rounded-md border border-line/10 text-fg-tertiary hover:text-fg hover:bg-line/[0.06] transition-colors`}
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
        {/* The active mode's own stage layer (empty states / annotation). DOM, above the
            canvas, so — like the handles — it can never appear in an exported PNG. */}
        {ActiveStage && <ActiveStage />}
        {/* An unfinished mode says so on the stage as well as in the selector — quiet, in a
            corner, out of the picture's way. DOM, so it cannot bake into an export either. */}
        {activeMode?.wip && (
          <div
            data-testid="fullscreen-wip-banner"
            className="absolute left-3 bottom-3 pointer-events-none select-none flex items-center gap-1.5
                       rounded-md border border-warn/40 bg-warn/10 px-2 py-1 text-[11px] text-warn"
          >
            <span aria-hidden>⚠</span>
            {activeMode.label} is under construction
          </div>
        )}
        {isOwnCanvas && ownError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 text-center px-6">
            <div className="text-[13px] text-fg-secondary">Couldn’t start {activeMode!.label}</div>
            <div className="text-[11px] text-fg-muted">This mode needs a WebGL2-capable GPU.</div>
          </div>
        ) : isOwnCanvas && !ownReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 pointer-events-none">
            <div className="h-7 w-7 rounded-full border-2 border-line/15 border-t-accent animate-spin" />
            <div className="text-[12px] text-fg-tertiary">Rendering {activeMode!.label}…</div>
          </div>
        ) : null}
        <div className="absolute bottom-2 right-3 text-[10px] text-fg-dim/80 pointer-events-none">
          {hint}
        </div>
      </div>

      {/* Bottom bar — export at a chosen size. Additive: the toolbar's Export PNG above still
          snapshots the on-screen canvas (and is still the only path that embeds a fractal
          scene in the file). On a phone it arrives COLLAPSED — six wrapped rows of size
          controls cost ~200 px of a 844 px screen and the stage is what Wallpaper is for
          (owner, 2026-09-11: "fullscreen mode needs the export section collapsed"). */}
      <ExportPanel
        phone={phone}
        kind={activeMode?.kind ?? 'cpuField'}
        modeLabel={activeMode?.label ?? 'This mode'}
        canRenderAtSize={canRenderAtSize}
        dither={fs.dither}
        onDitherChange={setFullscreenDither}
        onExport={(plan) => { void exportAtSize(plan); }}
        busy={exporting}
      />
    </div>,
    document.body,
  );
};

export default FullscreenGradientOverlay;
