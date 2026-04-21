import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FluidEngine, FluidParams, DEFAULT_PARAMS } from './fluid/FluidEngine';
import { ControlPanel } from './components/ControlPanel';
import { CanvasContextMenu, MenuItem } from './components/CanvasContextMenu';
import { DEFAULT_GRADIENT, OrbitState, PRESETS, Preset } from './presets';
import type { GradientConfig } from '../types';
import { generateGradientTextureBuffer } from '../utils/colorUtils';
import { buildSavedState, downloadJson, downloadPng, downloadScreenshot, readSavedStateFromFile } from './savedState';
import { TopBar } from './components/TopBar';
import { SubmitPresetModal } from './components/SubmitPresetModal';
import { StoreCallbacksProvider, StoreCallbacks } from '../components/contexts/StoreCallbacksContext';
import type { ContextMenuItem } from '../types/help';
import {
  ADAPTIVE_CHANGE_COOLDOWN_MS,
  ADAPTIVE_HIGH_FPS,
  ADAPTIVE_HIGH_FPS_STREAK_SEC,
  ADAPTIVE_LOW_FPS,
  ADAPTIVE_LOW_FPS_STREAK_SEC,
  ADAPTIVE_MIN_SIM_RES,
  ADAPTIVE_STEP,
  DEFAULT_ORBIT,
  MAX_ZOOM,
  MIDDLE_DRAG_ZOOM_SENSITIVITY,
  MIN_ZOOM,
  PAN_DRAG_THRESHOLD_PX,
  PRECISION_ALT_MULT,
  PRECISION_SHIFT_MULT,
  WHEEL_ZOOM_SENSITIVITY,
} from './constants';

export const ToyFluidApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FluidEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const [params, setParams] = useState<FluidParams>(DEFAULT_PARAMS);
  const [orbit, setOrbit] = useState<OrbitState>(DEFAULT_ORBIT);
  const [gradient, setGradient] = useState<GradientConfig>(DEFAULT_GRADIENT);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [showHotkeys, setShowHotkeys] = useState(true);
  /** Global "hide all hints" toggle (H key). Also hides the hotkey overlay. */
  const [hideHints, setHideHints] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  // Bake the gradient to a 256×1 RGBA Uint8Array whenever the config changes.
  // Memoized so the buffer identity is stable across renders → avoids thrash in consumers.
  const gradientLut = useMemo(() => generateGradientTextureBuffer(gradient), [gradient]);

  // Push the baked gradient into the engine every time it changes.
  useEffect(() => {
    engineRef.current?.setGradientBuffer(gradientLut);
  }, [gradientLut]);

  // Latest-value refs so the rAF callback doesn't re-subscribe.
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const orbitRef = useRef(orbit);
  orbitRef.current = orbit;

  // Modifier state captured globally (keydown/keyup listeners on window)
  const mods = useRef({ c: false, shift: false, alt: false });

  // Adaptive-quality scratch state (read by the rAF loop)
  const effectiveSimResRef = useRef<number>(DEFAULT_PARAMS.simResolution);
  const [effectiveSimRes, setEffectiveSimRes] = useState<number>(DEFAULT_PARAMS.simResolution);

  // Center-of-orbit (anchor to which c returns / orbits around)
  const orbitAnchor = useRef<[number, number]>(params.juliaC);
  useEffect(() => { orbitAnchor.current = params.juliaC; }, [params.juliaC]);

  // Pointer drag state — differentiates c-pick and pan drags from force splats.
  // 'pan-pending' means right-button is down but no drag yet. It upgrades to
  // 'pan' once the cursor moves more than a few pixels. If released without
  // upgrading, the contextmenu fires normally and opens the right-click menu.
  const pointerState = useRef({
    down: false,
    mode: 'splat' as 'splat' | 'pick-c' | 'pan' | 'pan-pending' | 'zoom',
    startX: 0, startY: 0,
    startCx: 0, startCy: 0,
    startCenterX: 0, startCenterY: 0,
    startZoom: 1.5,
    /** World-space coord to anchor zoom at (middle-drag pivots around this point). */
    zoomAnchor: [0, 0] as [number, number],
    /** UV (0..1) of the middle-drag start on the canvas — used by the anchor math. */
    zoomAnchorUv: [0.5, 0.5] as [number, number],
    lastX: 0, lastY: 0,
    lastT: 0,
    /** Set to true when a right-click drag actually moved past the threshold.
     *  The subsequent contextmenu event reads this to decide whether to open the
     *  menu. Reset on the next pointerdown. */
    rightDragged: false,
  });

  // Boot engine once.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    try {
      const engine = new FluidEngine(cv);
      engineRef.current = engine;
      engine.setParams(paramsRef.current);
      // Seed initial gradient (bypass the dependency effect so first frame isn't grey).
      engine.setGradientBuffer(gradientLut);
      const rect = cv.getBoundingClientRect();
      engine.resize(rect.width, rect.height);
    } catch (e) {
      setError((e as Error).message || String(e));
      return;
    }

    let fpsFrames = 0;
    let fpsSampleT = performance.now();
    let orbitPhase = 0;
    let lastLoopT = performance.now();
    let fpsSmoothed = 60;

    // Adaptive-quality scratch.
    //   - Slider moves ⇒ effective snaps to target immediately.
    //   - Sustained low FPS ⇒ step DOWN by ADAPTIVE_STEP cells.
    //   - Sustained high FPS while below target ⇒ single jump BACK to target.
    let effectiveSimRes = paramsRef.current.simResolution;
    effectiveSimResRef.current = effectiveSimRes;
    let lastUserTarget = paramsRef.current.simResolution;
    let lowFpsStreakSec = 0;
    let highFpsStreakSec = 0;
    let lastQualityChangeT = performance.now();
    let lastEffectiveResReported = effectiveSimRes;

    const loop = (t: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const dtSec = Math.min(0.25, (t - lastLoopT) / 1000);

      // Adaptive sim-resolution.
      const target = paramsRef.current.simResolution;
      const autoOn = paramsRef.current.autoQuality;

      // Slider changes snap effective to target so there's no stair-step of
      // reallocations — the slider is explicit intent, honour it in one jump.
      if (target !== lastUserTarget) {
        effectiveSimRes = target;
        lastUserTarget = target;
        lowFpsStreakSec = 0;
        highFpsStreakSec = 0;
        lastQualityChangeT = t;
      }

      if (!autoOn) {
        effectiveSimRes = target;
      } else if ((t - lastQualityChangeT) > ADAPTIVE_CHANGE_COOLDOWN_MS) {
        if (fpsSmoothed < ADAPTIVE_LOW_FPS && effectiveSimRes > ADAPTIVE_MIN_SIM_RES) {
          lowFpsStreakSec += dtSec;
          highFpsStreakSec = 0;
          if (lowFpsStreakSec > ADAPTIVE_LOW_FPS_STREAK_SEC) {
            effectiveSimRes = Math.max(ADAPTIVE_MIN_SIM_RES, effectiveSimRes - ADAPTIVE_STEP);
            lowFpsStreakSec = 0;
            lastQualityChangeT = t;
          }
        } else if (fpsSmoothed > ADAPTIVE_HIGH_FPS && effectiveSimRes < target) {
          highFpsStreakSec += dtSec;
          lowFpsStreakSec = 0;
          if (highFpsStreakSec > ADAPTIVE_HIGH_FPS_STREAK_SEC) {
            // Single jump back to target, not a gradual climb — one reallocation.
            effectiveSimRes = target;
            highFpsStreakSec = 0;
            lastQualityChangeT = t;
          }
        } else {
          lowFpsStreakSec *= 0.9;
          highFpsStreakSec *= 0.9;
        }
      }

      if (effectiveSimRes > target) effectiveSimRes = target;
      effectiveSimResRef.current = effectiveSimRes;

      // Auto-orbit c — drive the c-track motion hands-free.
      const o = orbitRef.current;
      if (o.enabled && o.radius > 0 && o.speed > 0) {
        orbitPhase += dtSec * o.speed;
        const [ax, ay] = orbitAnchor.current;
        const cx = ax + Math.cos(orbitPhase * 6.2831853) * o.radius;
        const cy = ay + Math.sin(orbitPhase * 6.2831853) * o.radius;
        engine.setParams({ ...paramsRef.current, juliaC: [cx, cy], simResolution: effectiveSimRes });
      } else {
        engine.setParams({ ...paramsRef.current, simResolution: effectiveSimRes });
      }
      lastLoopT = t;

      engine.frame(t);

      // FPS — keep both instantaneous (for display) and smoothed (for adaptive).
      fpsFrames++;
      if (t - fpsSampleT > 500) {
        const measured = Math.round((fpsFrames * 1000) / (t - fpsSampleT));
        setFps(measured);
        // Exponential smoothing — responsive but not jumpy.
        fpsSmoothed = fpsSmoothed * 0.5 + measured * 0.5;
        fpsFrames = 0;
        fpsSampleT = t;
      }

      // Push effective-res changes to React state for the status bar (gated so we only
      // re-render when it actually changes — otherwise 60 setState/sec is wasteful).
      if (effectiveSimRes !== lastEffectiveResReported) {
        setEffectiveSimRes(effectiveSimRes);
        lastEffectiveResReported = effectiveSimRes;
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      const e = engineRef.current;
      if (!e || !cv) return;
      const r = cv.getBoundingClientRect();
      e.resize(r.width, r.height);
    });
    ro.observe(cv);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // ----- Keyboard shortcuts (window-level) -----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'c' || e.key === 'C') mods.current.c = true;
      mods.current.shift = e.shiftKey;
      mods.current.alt = e.altKey;

      if (e.code === 'Space') {
        e.preventDefault();
        setParams(prev => ({ ...prev, paused: !prev.paused }));
      } else if (e.key === 'r' || e.key === 'R') {
        engineRef.current?.resetFluid();
      } else if (e.key === 'h' || e.key === 'H') {
        // Single toggle for EVERYTHING hint-related (per-control hints + the
        // hotkey cheatsheet). Mostly useful for screenshots / focused demo.
        setHideHints(prev => !prev);
      } else if (e.key === 'o' || e.key === 'O') {
        setOrbit(prev => ({ ...prev, enabled: !prev.enabled }));
      } else if (e.key === 'Home') {
        // Recenter (home the view)
        setParams(prev => ({ ...prev, center: [0, 0], zoom: 1.5 }));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') mods.current.c = false;
      mods.current.shift = e.shiftKey;
      mods.current.alt = e.altKey;
    };
    const onBlur = () => {
      mods.current.c = false;
      mods.current.shift = false; mods.current.alt = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const mergeParams = useCallback((p: Partial<FluidParams>) => {
    setParams(prev => ({ ...prev, ...p }));
  }, []);

  const mergeOrbit = useCallback((o: Partial<OrbitState>) => {
    setOrbit(prev => ({ ...prev, ...o }));
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.resetFluid();
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Always suppress the browser's native menu.
    e.preventDefault();
    // If the right-click was actually a drag (pan), don't open the menu either.
    if (pointerState.current.rightDragged) {
      pointerState.current.rightDragged = false;
      return;
    }
    const items = buildCanvasMenuItems({
      copyCurrentC,
      onReset: () => engineRef.current?.resetFluid(),
      onRecenter: () => setParams(prev => ({ ...prev, center: [0, 0], zoom: 1.5 })),
      onToggleOrbit: () => setOrbit(prev => ({ ...prev, enabled: !prev.enabled })),
      orbitOn: orbitRef.current.enabled,
      onTogglePaused: () => setParams(prev => ({ ...prev, paused: !prev.paused })),
      paused: paramsRef.current.paused,
      onApplyPreset: (p) => handlePresetApply(p),
    });
    setContextMenu({ x: e.clientX, y: e.clientY, items });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Adapter for AdvancedGradientEditor (and any other GMT component that asks for
   * a context menu via StoreCallbacksContext). Converts GMT's ContextMenuItem[]
   * into our MenuItem[] and opens the same CanvasContextMenu component.
   */
  const storeCallbacks = useMemo<StoreCallbacks>(() => ({
    handleInteractionStart: () => {},
    handleInteractionEnd: () => {},
    openContextMenu: (x, y, items) => {
      const adapted: MenuItem[] = items
        .filter(it => !it.isHeader)  // Skip headers — we render a simple flat menu
        .map(it => ({
          label: it.label ?? '',
          onClick: () => { it.action?.(); },
          danger: !!it.danger,
        }))
        .filter(m => m.label);        // Drop unlabeled (slider/element) items
      if (adapted.length === 0) return;
      setContextMenu({ x, y, items: adapted });
    },
  }), []);

  const copyCurrentC = useCallback(async () => {
    const [cx, cy] = paramsRef.current.juliaC;
    const txt = `${cx.toFixed(6)}, ${cy.toFixed(6)}`;
    try { await navigator.clipboard.writeText(txt); } catch { /* clipboard unavailable is fine */ }
  }, []);

  const handlePresetApply = useCallback((preset: Preset) => {
    // Reset to defaults FIRST, then apply this preset's signature. That way every knob
    // starts from a known state — no leftover values from whatever the user was doing.
    setParams({ ...DEFAULT_PARAMS, ...preset.params });
    if (preset.gradient) setGradient(preset.gradient);
    // Orbit is an independent piece of state — reset to the preset's desired orbit,
    // or to "off" if the preset doesn't care.
    setOrbit(preset.orbit ?? DEFAULT_ORBIT);
    // Clear any accumulated fluid (velocity + dye + pressure) so the preset starts fresh.
    engineRef.current?.resetFluid();
  }, []);

  // ----- Save / Load -----
  const handleSaveJson = useCallback(() => {
    const state = buildSavedState(paramsRef.current, gradient, orbitRef.current);
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    downloadJson(state, `toy-fluid-${ts}.json`);
  }, [gradient]);

  const handleSavePng = useCallback(async () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const state = buildSavedState(paramsRef.current, gradient, orbitRef.current);
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    try {
      await downloadPng(cv, state, `toy-fluid-${ts}.png`);
    } catch (e) {
      console.error('[toy-fluid] Save PNG failed:', e);
    }
  }, [gradient]);

  const handleScreenshot = useCallback(async () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    try {
      await downloadScreenshot(cv, `toy-fluid-${ts}.png`);
    } catch (e) {
      console.error('[toy-fluid] Screenshot failed:', e);
    }
  }, []);

  const handleLoadFile = useCallback(async (file: File) => {
    try {
      const saved = await readSavedStateFromFile(file);
      // Reuse the preset-apply path so the fluid is reset and orbit/gradient sync.
      handlePresetApply({
        id: 'loaded',
        name: saved.name ?? file.name,
        desc: `Loaded from ${file.name}`,
        params: saved.params,
        gradient: saved.gradient,
        orbit: saved.orbit,
      });
    } catch (e) {
      console.error('[toy-fluid] Load failed:', e);
      alert(`Couldn't load "${file.name}":\n${(e as Error).message}`);
    }
  }, [handlePresetApply]);

  // ----- Pointer handling -----

  const precisionMultiplier = (shift: boolean, alt: boolean): number => {
    if (shift && alt) return 1.0;
    if (shift) return PRECISION_SHIFT_MULT;
    if (alt) return PRECISION_ALT_MULT;
    return 1.0;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const ps = pointerState.current;
    ps.down = true;
    ps.startX = e.clientX;
    ps.startY = e.clientY;
    ps.lastX = e.clientX;
    ps.lastY = e.clientY;
    ps.lastT = performance.now();
    ps.rightDragged = false;   // reset for this press

    if (e.button === 2) {
      // Right button — pan if the user drags, show menu if they just click.
      ps.mode = 'pan-pending';
      ps.startCenterX = paramsRef.current.center[0];
      ps.startCenterY = paramsRef.current.center[1];
    } else if (e.button === 1) {
      // Middle button — smooth zoom on vertical drag, anchored to press position.
      e.preventDefault();  // suppress Chromium's middle-click autoscroll
      ps.mode = 'zoom';
      ps.startZoom = paramsRef.current.zoom;
      // Remember the world-space point under the cursor at press — we'll pin it
      // there for the whole drag so zoom pivots around where the user clicked.
      const rect = canvasRef.current!.getBoundingClientRect();
      const u = (e.clientX - rect.left) / rect.width;
      const v = 1 - (e.clientY - rect.top) / rect.height;
      const aspect = rect.width / rect.height;
      const cx = paramsRef.current.center[0] + (u * 2 - 1) * aspect * paramsRef.current.zoom;
      const cy = paramsRef.current.center[1] + (v * 2 - 1) * paramsRef.current.zoom;
      ps.zoomAnchor = [cx, cy];
      ps.zoomAnchorUv = [u, v];
    } else if (mods.current.c) {
      ps.mode = 'pick-c';
      ps.startCx = paramsRef.current.juliaC[0];
      ps.startCy = paramsRef.current.juliaC[1];
    } else {
      ps.mode = 'splat';
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    const ps = pointerState.current;
    if (!ps.down) return;

    // keep mods fresh (in case user held shift after pressing down)
    mods.current.shift = e.shiftKey;
    mods.current.alt = e.altKey;

    const now = performance.now();

    if (ps.mode === 'pick-c') {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mul = precisionMultiplier(mods.current.shift, mods.current.alt);
      // Pixel delta from drag start → fractal delta at the CURRENT zoom.
      const zoom = paramsRef.current.zoom;
      const aspect = rect.width / rect.height;
      const dxPx = e.clientX - ps.startX;
      const dyPx = e.clientY - ps.startY;
      const dfx = (dxPx / rect.width) * 2 * aspect * zoom * mul;
      const dfy = -(dyPx / rect.height) * 2 * zoom * mul;
      mergeParams({ juliaC: [ps.startCx + dfx, ps.startCy + dfy] });
      // Also update orbit anchor so auto-orbit (if enabled) circles the new c.
      orbitAnchor.current = [ps.startCx + dfx, ps.startCy + dfy];
      ps.lastX = e.clientX; ps.lastY = e.clientY; ps.lastT = now;
      return;
    }

    // Right-click pan: upgrade pan-pending → pan once cursor travel exceeds threshold.
    if (ps.mode === 'pan-pending') {
      const dx = e.clientX - ps.startX;
      const dy = e.clientY - ps.startY;
      if (dx * dx + dy * dy > PAN_DRAG_THRESHOLD_PX * PAN_DRAG_THRESHOLD_PX) {
        ps.mode = 'pan';
        ps.rightDragged = true;
      } else {
        return;
      }
    }

    // Middle-click vertical drag = smooth zoom, anchored to the click-point.
    // Drag up → zoom in. Exponential so the feel is uniform across scales.
    if (ps.mode === 'zoom') {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mul = precisionMultiplier(mods.current.shift, mods.current.alt);
      const dyPx = e.clientY - ps.startY;
      const zoomFactor = Math.exp(dyPx * MIDDLE_DRAG_ZOOM_SENSITIVITY * mul);
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ps.startZoom * zoomFactor));
      const aspect = rect.width / rect.height;
      const [u, v] = ps.zoomAnchorUv;
      const newCenter: [number, number] = [
        ps.zoomAnchor[0] - (u * 2 - 1) * aspect * newZoom,
        ps.zoomAnchor[1] - (v * 2 - 1) * newZoom,
      ];
      mergeParams({ zoom: newZoom, center: newCenter });
      return;
    }

    if (ps.mode === 'pan') {
      // Grab-and-drag: the fractal point under the cursor at drag-start stays under
      // the cursor as you drag. That means center moves opposite to the pixel delta,
      // scaled by the current zoom and the aspect ratio.
      const rect = canvasRef.current!.getBoundingClientRect();
      const mul = precisionMultiplier(mods.current.shift, mods.current.alt);
      const zoom = paramsRef.current.zoom;
      const aspect = rect.width / rect.height;
      const dxPx = e.clientX - ps.startX;
      const dyPx = e.clientY - ps.startY;
      const dcx = -(dxPx / rect.width) * 2 * aspect * zoom * mul;
      const dcy = (dyPx / rect.height) * 2 * zoom * mul;
      mergeParams({ center: [ps.startCenterX + dcx, ps.startCenterY + dcy] });
      ps.lastX = e.clientX; ps.lastY = e.clientY; ps.lastT = now;
      return;
    }

    // Splat mode
    const dt = Math.max(1, now - ps.lastT) / 1000;
    const dxPx = e.clientX - ps.lastX;
    const dyPx = e.clientY - ps.lastY;
    ps.lastX = e.clientX;
    ps.lastY = e.clientY;
    ps.lastT = now;

    const rect = canvasRef.current!.getBoundingClientRect();
    const [u, v] = engine.canvasToUv(e.clientX, e.clientY);
    const mul = precisionMultiplier(mods.current.shift, mods.current.alt);
    const vx = (dxPx / rect.width) / dt * 5 * mul;
    const vy = -(dyPx / rect.height) / dt * 5 * mul;
    const strength = Math.min(50, Math.hypot(vx, vy));
    const h = (now * 0.001) % 1;
    const r = 0.5 + 0.5 * Math.cos(6.28 * h);
    const g = 0.5 + 0.5 * Math.cos(6.28 * (h + 0.33));
    const b = 0.5 + 0.5 * Math.cos(6.28 * (h + 0.67));
    engine.splatForce(u, v, vx, vy, strength, [r, g, b]);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointerState.current.down = false;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // Scroll zoom on the canvas, centered on cursor.
  const onWheel = (e: React.WheelEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    e.preventDefault();
    const mul = precisionMultiplier(e.shiftKey, e.altKey);
    const zoomFactor = Math.pow(0.9, -e.deltaY * WHEEL_ZOOM_SENSITIVITY * mul);
    const rect = canvasRef.current!.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = 1 - (e.clientY - rect.top) / rect.height;
    const aspect = rect.width / rect.height;
    const p = paramsRef.current;
    const fx = p.center[0] + (u * 2 - 1) * aspect * p.zoom;
    const fy = p.center[1] + (v * 2 - 1) * p.zoom;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, p.zoom * zoomFactor));
    // Keep the world-space point under the cursor fixed across the zoom.
    const newCenter: [number, number] = [
      fx - (u * 2 - 1) * aspect * newZoom,
      fy - (v * 2 - 1) * newZoom,
    ];
    mergeParams({ zoom: newZoom, center: newCenter });
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-gray-200 p-6">
        <div className="max-w-md">
          <div className="text-lg font-semibold mb-2">This toy needs WebGL2 with float render targets.</div>
          <div className="text-xs text-gray-400 whitespace-pre-wrap">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <StoreCallbacksProvider value={storeCallbacks}>
    <div className="w-full h-screen flex flex-col bg-black text-white">
      <TopBar
        kind={params.kind}
        forceMode={params.forceMode}
        juliaC={params.juliaC}
        zoom={params.zoom}
        simResolution={params.simResolution}
        effectiveSimRes={effectiveSimRes}
        fps={fps}
        orbitOn={orbit.enabled}
        paused={params.paused}
        onSavePng={handleSavePng}
        onScreenshot={handleScreenshot}
        onLoadFile={handleLoadFile}
        onSubmit={() => setSubmitOpen(true)}
      />
      <div className="flex-1 flex min-h-0">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{
            touchAction: 'none',
            cursor:
              pointerState.current.mode === 'pick-c' ? 'crosshair' :
              pointerState.current.mode === 'pan'    ? 'grabbing'  :
              pointerState.current.mode === 'zoom'   ? 'ns-resize' :
                                                      'default'
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onContextMenu={onContextMenu}
        />

        {/* Status is now shown in the TopBar above — overlay removed. */}

        {/* Hotkeys cheatsheet — H also hides this alongside the panel hints. */}
        {showHotkeys && !hideHints ? (
          <div className="absolute bottom-2 left-2 px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[320px]">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase text-cyan-300 tracking-wide">Hotkeys</div>
              <button
                onClick={() => setShowHotkeys(false)}
                className="text-gray-500 hover:text-gray-200 text-[10px] px-1 leading-none"
                title="Hide (press ? to reopen)"
              >×</button>
            </div>
            <ul className="space-y-0.5 leading-snug">
              <li><Key>Drag</Key> inject force + dye into the fluid</li>
              <li><Key>C</Key>+<Key>Drag</Key> pick Julia c directly on the canvas</li>
              <li><Key>Right-click</Key>+<Key>Drag</Key> pan the fractal view</li>
              <li><Key>Right-click</Key> (tap) canvas for quick actions menu</li>
              <li><Key>Shift</Key>/<Key>Alt</Key> precision modifiers (5× / 0.2×) for any drag</li>
              <li><Key>Wheel</Key> zoom · <Key>Middle</Key>+<Key>Drag</Key> smooth zoom · <Key>Home</Key> recenter</li>
              <li><Key>Space</Key> pause sim · <Key>R</Key> clear fluid · <Key>O</Key> toggle c-orbit · <Key>H</Key> hide hints</li>
            </ul>
          </div>
        ) : (!hideHints && (
          <button
            onClick={() => setShowHotkeys(true)}
            className="absolute bottom-2 left-2 px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70"
            title="Show hotkeys"
          >? hotkeys</button>
        ))}
      </div>

      <div className="w-[320px] h-full border-l border-white/5 bg-[#0b0b0d] flex flex-col min-h-0">
        <ControlPanel
          params={params}
          setParams={mergeParams}
          onReset={handleReset}
          orbit={orbit}
          setOrbit={mergeOrbit}
          gradient={gradient}
          setGradient={setGradient}
          gradientLut={gradientLut}
          onPresetApply={handlePresetApply}
          onSaveJson={handleSaveJson}
          onSavePng={handleSavePng}
          onLoadFile={handleLoadFile}
          hideHints={hideHints}
        />
      </div>

      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onDismiss={() => setContextMenu(null)}
        />
      )}
      <SubmitPresetModal
        open={submitOpen}
        canvas={canvasRef.current}
        state={submitOpen ? buildSavedState(paramsRef.current, gradient, orbitRef.current) : null}
        onClose={() => setSubmitOpen(false)}
      />
      </div>
    </div>
    </StoreCallbacksProvider>
  );
};

function buildCanvasMenuItems(ops: {
  copyCurrentC: () => void;
  onReset: () => void;
  onRecenter: () => void;
  onToggleOrbit: () => void;
  orbitOn: boolean;
  onTogglePaused: () => void;
  paused: boolean;
  onApplyPreset: (p: Preset) => void;
}): MenuItem[] {
  return [
    { label: 'Copy c to clipboard',           hint: 'Re, Im as decimal',              onClick: ops.copyCurrentC },
    { label: 'Recenter view',                 hint: 'center=(0,0), zoom=1.5',         onClick: ops.onRecenter },
    { label: ops.paused ? 'Resume sim' : 'Pause sim', onClick: ops.onTogglePaused },
    { label: ops.orbitOn ? 'Stop c-orbit' : 'Start c-orbit', onClick: ops.onToggleOrbit },
    { label: 'Clear fluid',                   hint: 'zero velocity + dye',            onClick: ops.onReset, danger: true, separatorAbove: true },
    // Preset quick-pick block
    ...PRESETS.map((p, i): MenuItem => ({
      label: `Preset: ${p.name}`,
      hint: p.desc,
      onClick: () => ops.onApplyPreset(p),
      separatorAbove: i === 0,
    })),
  ];
}

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-1 py-[1px] rounded bg-white/[0.08] border border-white/15 text-[9px] font-mono text-gray-100">{children}</kbd>
);
