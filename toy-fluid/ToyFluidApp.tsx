import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FluidEngine, FluidParams, DEFAULT_PARAMS } from './fluid/FluidEngine';
import { ControlPanel } from './components/ControlPanel';
import { CanvasContextMenu, MenuItem } from './components/CanvasContextMenu';
import { DEFAULT_COLLISION_GRADIENT, DEFAULT_GRADIENT, OrbitState, PRESETS, Preset } from './presets';
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
  PARTICLE_HARD_CAP,
  PRECISION_ALT_MULT,
  PRECISION_SHIFT_MULT,
  WHEEL_ZOOM_SENSITIVITY,
} from './constants';

/** Tiny HSL↔RGB helpers used by the brush colour pipeline. Both work in 0..1 space. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h * 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1)      { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else             { r = c; b = x; }
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

export const ToyFluidApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FluidEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const [params, setParams] = useState<FluidParams>(DEFAULT_PARAMS);
  const [orbit, setOrbit] = useState<OrbitState>(DEFAULT_ORBIT);
  const [gradient, setGradient] = useState<GradientConfig>(DEFAULT_GRADIENT);
  const [collisionGradient, setCollisionGradient] = useState<GradientConfig>(DEFAULT_COLLISION_GRADIENT);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [showHotkeys, setShowHotkeys] = useState(true);
  /** Global "hide all hints" toggle (H key). Also hides the hotkey overlay. */
  const [hideHints, setHideHints] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  // Bake both gradients to 256×1 RGBA Uint8Arrays. Memoised so identity is
  // stable across renders → no thrash in downstream consumers.
  const gradientLut = useMemo(() => generateGradientTextureBuffer(gradient), [gradient]);
  const collisionGradientLut = useMemo(() => generateGradientTextureBuffer(collisionGradient), [collisionGradient]);

  useEffect(() => {
    engineRef.current?.setGradientBuffer(gradientLut);
  }, [gradientLut]);
  useEffect(() => {
    engineRef.current?.setCollisionGradientBuffer(collisionGradientLut);
  }, [collisionGradientLut]);

  // Latest-value refs so the rAF callback doesn't re-subscribe.
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const orbitRef = useRef(orbit);
  orbitRef.current = orbit;

  // Modifier state captured globally (keydown/keyup listeners on window)
  const mods = useRef({ c: false, b: false, shift: false, alt: false });

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
    mode: 'splat' as 'splat' | 'pick-c' | 'pan' | 'pan-pending' | 'zoom' | 'resize-brush',
    startX: 0, startY: 0,
    startCx: 0, startCy: 0,
    startCenterX: 0, startCenterY: 0,
    startZoom: 1.5,
    /** Brush size at the start of a B+drag — set on pointerdown, used as the base for logarithmic resize. */
    startBrushSize: 0.1,
    /** World-space coord to anchor zoom at (middle-drag pivots around this point). */
    zoomAnchor: [0, 0] as [number, number],
    /** UV (0..1) of the middle-drag start on the canvas — used by the anchor math. */
    zoomAnchorUv: [0.5, 0.5] as [number, number],
    lastX: 0, lastY: 0,
    lastT: 0,
    /** Running UV arc-length since the last emitted splat — drives brushSpacing. */
    distSinceSplat: 0,
    /** UV of the last emitted splat (for spacing math). */
    lastSplatUv: [0, 0] as [number, number],
    /** Set to true when a right-click drag actually moved past the threshold.
     *  The subsequent contextmenu event reads this to decide whether to open the
     *  menu. Reset on the next pointerdown. */
    rightDragged: false,
  });

  /** Live cursor info for the brush-preview overlay (null = don't draw). */
  const [brushCursor, setBrushCursor] = useState<{ x: number; y: number } | null>(null);
  /** Running phase for rainbow colour mode, so brush hue cycles smoothly. */
  const brushHuePhase = useRef(0);

  /** CPU-side particle system. Lives independently of the fluid — each particle
   *  flies on its own ballistic trajectory (optionally with gravity + drag) and
   *  leaves a secondary-paint dye trail every frame it's alive. Decoupling the
   *  particles from the fluid means they make their own streaks instead of just
   *  getting immediately absorbed into whatever dye field already exists. */
  interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    life: number; lifeMax: number;
    r: number; g: number; b: number;
    size: number;
  }
  const particles = useRef<Particle[]>([]);
  /** Particle-emitter spawn accumulator — ticks up in seconds to honour
   *  particleRate without creating fractional particles. */
  const particleSpawnAcc = useRef(0);
  /** Latest pointer state the rAF emitter tick needs: position + velocity. */
  const pointerUv = useRef<{ u: number; v: number; vx: number; vy: number; down: boolean }>({
    u: 0.5, v: 0.5, vx: 0, vy: 0, down: false,
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
      engine.setCollisionGradientBuffer(collisionGradientLut);
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

      // Emitter tick: while the user holds the pointer down AND the emitter
      // is on AND the gesture mode is 'splat' (i.e. not pan/pick-c/zoom/etc.),
      // spawn particles at the current cursor at particleRate/sec.
      const pp = paramsRef.current;
      const ptr = pointerUv.current;
      if (pp.particleEmitter && ptr.down && pointerState.current.mode === 'splat') {
        particleSpawnAcc.current += dtSec * pp.particleRate;
        while (particleSpawnAcc.current >= 1 && particles.current.length < PARTICLE_HARD_CAP) {
          particleSpawnAcc.current -= 1;
          spawnParticle(ptr.u, ptr.v, ptr.vx, ptr.vy);
        }
        if (particles.current.length >= PARTICLE_HARD_CAP) particleSpawnAcc.current = 0;
      }

      // Step CPU particle system + paint with the current brushMode BEFORE the
      // fluid frame, so this tick's dye gets advected by this tick's velocity.
      stepParticles(engine, dtSec);

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
      if (e.key === 'b' || e.key === 'B') mods.current.b = true;
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
      if (e.key === 'b' || e.key === 'B') mods.current.b = false;
      mods.current.shift = e.shiftKey;
      mods.current.alt = e.altKey;
    };
    const onBlur = () => {
      mods.current.c = false; mods.current.b = false;
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
    // Older presets (pre-collision) have no collisionGradient; fall back to the default
    // so applying them doesn't leave stale walls from a previous preset.
    setCollisionGradient(preset.collisionGradient ?? DEFAULT_COLLISION_GRADIENT);
    setOrbit(preset.orbit ?? DEFAULT_ORBIT);
    engineRef.current?.resetFluid();
  }, []);

  // ----- Save / Load -----
  const handleSaveJson = useCallback(() => {
    const state = buildSavedState(paramsRef.current, gradient, orbitRef.current, collisionGradient);
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    downloadJson(state, `toy-fluid-${ts}.json`);
  }, [gradient, collisionGradient]);

  const handleSavePng = useCallback(async () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const state = buildSavedState(paramsRef.current, gradient, orbitRef.current, collisionGradient);
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    try {
      await downloadPng(cv, state, `toy-fluid-${ts}.png`);
    } catch (e) {
      console.error('[toy-fluid] Save PNG failed:', e);
    }
  }, [gradient, collisionGradient]);

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
        collisionGradient: saved.collisionGradient,
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
    } else if (mods.current.b) {
      ps.mode = 'resize-brush';
      ps.startBrushSize = paramsRef.current.brushSize;
    } else {
      ps.mode = 'splat';
      ps.distSinceSplat = 0;
      const [u0, v0] = engine.canvasToUv(e.clientX, e.clientY);
      ps.lastSplatUv = [u0, v0];
      pointerUv.current = { u: u0, v: v0, vx: 0, vy: 0, down: true };
      particleSpawnAcc.current = 0;
      // Drop one splat at press so a single click always leaves a mark, unless
      // the emitter is on — in that case the rAF loop handles continuous spawn.
      if (!paramsRef.current.particleEmitter) {
        emitBrushSplat(engine, u0, v0, 0, 0);
      }
    }
  };

  /** Emit a single brush splat for a stroke sample. Particles live on their
   *  own layer and are driven by the rAF loop — not this function. */
  function emitBrushSplat(engine: FluidEngine, u: number, v: number, vx: number, vy: number) {
    const p = paramsRef.current;
    const color = pickBrushColor(vx, vy, u, v);
    const jittered = applyBrushJitter(color, p.brushJitter);
    engine.brush(u, v, vx * p.brushFlow, vy * p.brushFlow, jittered, p.brushSize, p.brushHardness, p.brushStrength, p.brushMode);
  }

  /** Spawn one particle at (u,v) with a direction+speed derived from current
   *  pointer velocity + spread. Called from the rAF emitter tick. */
  function spawnParticle(u: number, v: number, pointerVx: number, pointerVy: number) {
    const p = paramsRef.current;
    if (particles.current.length >= PARTICLE_HARD_CAP) return;
    const hasDrag = Math.hypot(pointerVx, pointerVy) > 1e-4;
    const baseAng = hasDrag ? Math.atan2(pointerVy, pointerVx) : Math.random() * Math.PI * 2;
    const a = baseAng + (Math.random() - 0.5) * 2 * p.particleSpread * Math.PI;
    const speed = p.particleVelocity * (0.4 + Math.random() * 0.6);
    // Colour snapshot at spawn — the particle keeps this hue for its whole life.
    const base = pickBrushColor(pointerVx, pointerVy, u, v);
    const col = applyBrushJitter(base, p.brushJitter);
    const jr = p.brushSize * 0.35;
    particles.current.push({
      x: u + (Math.random() - 0.5) * jr,
      y: v + (Math.random() - 0.5) * jr,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: p.particleLifetime,
      lifeMax: p.particleLifetime,
      r: col[0], g: col[1], b: col[2],
      size: p.brushSize * p.particleSizeScale * (0.85 + Math.random() * 0.3),
    });
  }

  /** Step all live particles and let each one act as a tiny brush — painting
   *  with the currently-selected brushMode at its own position/velocity. Each
   *  particle fades to transparent as it ages so streaks dissolve naturally. */
  function stepParticles(engine: FluidEngine, dtSec: number) {
    const list = particles.current;
    if (list.length === 0) return;
    const p = paramsRef.current;
    const decay = Math.exp(-p.particleDrag * dtSec);
    let write = 0;
    for (let i = 0; i < list.length; i++) {
      const pt = list[i];
      pt.life -= dtSec;
      if (pt.life <= 0) continue;
      pt.vx *= decay;
      pt.vy *= decay;
      pt.vy += p.particleGravity * dtSec;
      pt.x += pt.vx * dtSec;
      pt.y += pt.vy * dtSec;
      // Cull particles off-canvas (generous margin so gravity arcs can return).
      if (pt.x < -0.1 || pt.x > 1.1 || pt.y < -0.1 || pt.y > 1.1) continue;
      // Life-weighted fade so particles dissolve instead of snapping out.
      const alpha = Math.max(0, pt.life / pt.lifeMax);
      const col: [number, number, number] = [pt.r * alpha, pt.g * alpha, pt.b * alpha];
      // Each particle acts as a mini brush — same mode the user has selected.
      engine.brush(pt.x, pt.y, pt.vx * p.brushFlow, pt.vy * p.brushFlow, col,
                   pt.size, p.brushHardness, p.brushStrength * alpha, p.brushMode);
      list[write++] = pt;
    }
    list.length = write;
  }

  /** Pick a colour for the next splat according to the active colour mode. */
  function pickBrushColor(vx: number, vy: number, u: number, v: number): [number, number, number] {
    const p = paramsRef.current;
    switch (p.brushColorMode) {
      case 'solid':
        return [p.brushColor[0], p.brushColor[1], p.brushColor[2]];
      case 'velocity': {
        const mag = Math.min(1, Math.hypot(vx, vy) * 0.2);
        const h = (Math.atan2(vy, vx) / (2 * Math.PI) + 1) % 1;
        return hslToRgb(h, 0.9, 0.35 + 0.3 * mag);
      }
      case 'gradient': {
        // Cheap heuristic: sample the palette LUT at (u+v)/2. A readback from
        // the Julia buffer would give exact iteration-based colour but isn't
        // worth the per-splat cost.
        const lut = gradientLut;
        if (!lut) return [1, 1, 1];
        const idx = Math.floor(((u + v) * 0.5) * (lut.length / 4 - 1));
        const i = idx * 4;
        return [lut[i] / 255, lut[i + 1] / 255, lut[i + 2] / 255];
      }
      case 'rainbow':
      default: {
        const h = brushHuePhase.current;
        return [0.5 + 0.5 * Math.cos(6.28318 * h),
                0.5 + 0.5 * Math.cos(6.28318 * (h + 0.33)),
                0.5 + 0.5 * Math.cos(6.28318 * (h + 0.67))];
      }
    }
  }

  /** Apply hue jitter around a base colour. 0 = passthrough, 1 = total hue randomise. */
  function applyBrushJitter(c: [number, number, number], amt: number): [number, number, number] {
    if (amt <= 0) return c;
    const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
    const jh = (h + (Math.random() - 0.5) * amt + 1) % 1;
    return hslToRgb(jh, s, l);
  }

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

    // B+drag to resize brush — horizontal drag scales logarithmically so feel
    // is uniform across the 0.005 → 0.3 size range.
    if (ps.mode === 'resize-brush') {
      const dxPx = e.clientX - ps.startX;
      const mul = precisionMultiplier(mods.current.shift, mods.current.alt);
      // ~2× per 200 px of drag at neutral precision
      const factor = Math.exp(dxPx / 200 * mul);
      const next = Math.max(0.003, Math.min(0.4, ps.startBrushSize * factor));
      mergeParams({ brushSize: next });
      setBrushCursor({ x: e.clientX, y: e.clientY });
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

    // Brush stroke mode
    const dt = Math.max(1, now - ps.lastT) / 1000;
    const dxPx = e.clientX - ps.lastX;
    const dyPx = e.clientY - ps.lastY;
    ps.lastX = e.clientX;
    ps.lastY = e.clientY;
    ps.lastT = now;

    const rect = canvasRef.current!.getBoundingClientRect();
    const [u, v] = engine.canvasToUv(e.clientX, e.clientY);
    const mul = precisionMultiplier(mods.current.shift, mods.current.alt);
    const vx = (dxPx / rect.width) / dt * mul;
    const vy = -(dyPx / rect.height) / dt * mul;

    // Advance rainbow phase — one loop per second of clock time, not per drag.
    brushHuePhase.current = (now * 0.001) % 1;

    // Feed the rAF-side emitter with the latest cursor UV + pointer velocity.
    pointerUv.current = { u, v, vx, vy, down: true };

    const p = paramsRef.current;

    // Particle emitter runs in the rAF loop based on pointer-down state — not
    // from move events — so emission rate stays consistent even if the user
    // pauses mid-drag. Move events just update the last-known cursor position.
    if (p.particleEmitter) return;

    // Spacing: accumulate arc-length (not chord from last splat) so winding
    // strokes still emit. Turns laggy streams into even strokes; at large
    // spacing gives a dotted / stamp look for free.
    const duStep = Math.abs(dxPx / rect.width);
    const dvStep = Math.abs(dyPx / rect.height);
    ps.distSinceSplat += Math.hypot(duStep, dvStep);
    if (ps.distSinceSplat < Math.max(1e-5, p.brushSpacing)) return;
    ps.distSinceSplat = 0;
    ps.lastSplatUv = [u, v];

    emitBrushSplat(engine, u, v, vx, vy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointerState.current.down = false;
    pointerUv.current.down = false;
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
              pointerState.current.mode === 'resize-brush' ? 'ew-resize' :
                                                      'none'  // hide OS cursor — brush ring replaces it
          }}
          onPointerDown={onPointerDown}
          onPointerMove={(e) => {
            onPointerMove(e);
            setBrushCursor({ x: e.clientX, y: e.clientY });
          }}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerEnter={(e) => setBrushCursor({ x: e.clientX, y: e.clientY })}
          onPointerLeave={() => setBrushCursor(null)}
          onWheel={onWheel}
          onContextMenu={onContextMenu}
        />

        {/* Brush preview ring — follows the pointer, size reflects brushSize in UV. */}
        {brushCursor && canvasRef.current ? (() => {
          const rect = canvasRef.current.getBoundingClientRect();
          const diamPx = params.brushSize * 2 * rect.width;
          return (
            <div
              className="pointer-events-none absolute rounded-full border"
              style={{
                left: brushCursor.x - rect.left - diamPx / 2,
                top:  brushCursor.y - rect.top  - diamPx / 2,
                width: diamPx,
                height: diamPx,
                borderColor: 'rgba(255,255,255,0.6)',
                borderStyle: params.brushHardness > 0.5 ? 'solid' : 'dashed',
                borderWidth: 1,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
              }}
            />
          );
        })() : null}

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
              <li><Key>B</Key>+<Key>Drag</Key> resize the brush live (horizontal = scale)</li>
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
          collisionGradient={collisionGradient}
          setCollisionGradient={setCollisionGradient}
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
        state={submitOpen ? buildSavedState(paramsRef.current, gradient, orbitRef.current, collisionGradient) : null}
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
