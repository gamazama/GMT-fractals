/**
 * parallaxMode — the PARALLAX fullscreen mode: the gradient as a deep, touchable field of light.
 *
 * The gradient's colours become thousands of glowing points in pseudo-3D depth: near points are
 * big, crisp and vivid; far points are pin-pricks dissolved in haze; every point also casts a
 * soft halo, and the halos fuse into a continuous nebula of the gradient (no black void). The
 * default colour mapping is SPATIAL ('flow': the ramp runs left→right) so the field reads as
 * THE USER'S GRADIENT at a glance — depth layers it, never hides it. The scene is PERFECTLY
 * STILL until touched (the no-idle-wiggle contract) — then:
 *   • MOVING the pointer peeks the camera around the field (near layers glide more than far —
 *     the classic parallax depth cue), easing back to centre when the pointer leaves;
 *   • DRAGGING stirs the points — they take your velocity (with a little swirl), flare brighter,
 *     and spring back home with one soft overshoot. The field always self-heals: forgiving by
 *     construction, a child cannot break it;
 *   • CLICKING fires a radial pulse — a bloom of colour from under your finger.
 *
 * An `ownCanvas` mode on the generic `mount()` seam: it owns a GL canvas (sprites → float FBO →
 * tonemap + shared dither tail) + a 2D ring-cursor overlay (kept OFF the GL canvas so it never
 * bakes into PNG export), its RAF, pointer handling, and a mode-local `parallaxStore`.
 *
 * @see ParallaxField.ts (CPU sim) · ParallaxRenderer.ts (GL) · parallaxStore.ts (UI state)
 * @see gradient-explorer/fullscreen/modeRegistry.ts (the ownCanvas mount face)
 */

import React from 'react';
import type { FullscreenMode, OwnCanvasHost, OwnCanvasHandle } from '../modeRegistry';
import { ParallaxField, MARGIN, type StirInput } from './parallax/ParallaxField';
import { ParallaxRenderer, WASH_FOR } from './parallax/ParallaxRenderer';
import {
  PARALLAX_N,
  getParallaxState,
  subscribeParallax,
  useParallaxState,
  setParallaxDepth,
  setParallaxStir,
  setParallaxColorBy,
  setParallaxDensity,
  shuffleParallax,
  type ParallaxColorBy,
  type ParallaxDensity,
} from './parallax/parallaxStore';

/** Max parallax camera shift of the NEAREST layer, as a fraction of the short canvas side
 *  (at Depth = 1). DERIVED from the field's home MARGIN so peeking can never bare an edge. */
const CAM_SHIFT_FRAC = 0.85 * MARGIN;
/** Camera smoothing rate (s⁻¹) — the peek glides, it doesn't snap. */
const CAM_RATE = 5;

const mountParallax = (host: OwnCanvasHost): OwnCanvasHandle => {
  const container = host.container;
  const glCanvas = document.createElement('canvas');
  glCanvas.className = 'absolute inset-0 w-full h-full';
  const overlay = document.createElement('canvas');
  overlay.className = 'absolute inset-0 w-full h-full touch-none cursor-crosshair';
  container.appendChild(glCanvas);
  container.appendChild(overlay);
  const octx = overlay.getContext('2d');

  const st0 = getParallaxState();
  let field = new ParallaxField(PARALLAX_N[st0.density], st0.seed, st0.colorBy);
  let dyn = new Float32Array(field.n * 3);
  let renderer: ParallaxRenderer;
  try {
    renderer = new ParallaxRenderer(glCanvas);
  } catch (e) {
    host.onError(e);
    return { dispose: () => { glCanvas.remove(); overlay.remove(); } };
  }
  renderer.setField(field.staticAttribs());
  renderer.washMode = WASH_FOR[st0.colorBy];
  const ctx0 = host.getContext();
  if (ctx0.lut.length) renderer.setLut(ctx0.lut);

  let raf = 0;
  let lastT = 0;
  let first = true;
  let disposed = false;
  // Idle power saving: once the field has settled, the cursor is gone and the camera is home,
  // the frame is pixel-identical — skip sim + upload + draw until something wakes us.
  let needsFrame = true;
  let fieldSettled = false;
  const wake = (): void => { needsFrame = true; };

  // ── hand state (canvas-local CSS px) ──
  let cursor: { x: number; y: number } | null = null;
  let prevCursor: { x: number; y: number } | null = null;
  let dragging = false;
  let pulse = 0;
  const cam = { x: 0, y: 0 };

  // ── sizing (GL backing at DPR; ring overlay at CSS px) ──
  const resize = (): void => {
    const cw = container.clientWidth, ch = container.clientHeight;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch, Math.min(window.devicePixelRatio || 1, 2));
    overlay.width = cw;
    overlay.height = ch;
    wake();
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : undefined;
  ro?.observe(container);
  resize();

  // ── pointer (on the top overlay canvas) ──
  const toLocal = (e: PointerEvent): { x: number; y: number } => {
    const r = overlay.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: PointerEvent): void => {
    overlay.setPointerCapture(e.pointerId);
    cursor = toLocal(e);
    dragging = true;
    pulse = 1; // press = a bloom of colour from under the finger
    wake();
  };
  const onMove = (e: PointerEvent): void => { cursor = toLocal(e); wake(); };
  const onUp = (e: PointerEvent): void => {
    if (overlay.hasPointerCapture(e.pointerId)) overlay.releasePointerCapture(e.pointerId);
    dragging = false;
    wake();
  };
  const onLeave = (): void => { cursor = null; prevCursor = null; wake(); };
  overlay.addEventListener('pointerdown', onDown);
  overlay.addEventListener('pointermove', onMove);
  overlay.addEventListener('pointerup', onUp);
  overlay.addEventListener('pointercancel', onUp);
  overlay.addEventListener('pointerleave', onLeave);

  // ── store subscription (rebuild on density / recolour on mapping / re-scatter on shuffle) ──
  let prevDensity = st0.density;
  let prevColorBy = st0.colorBy;
  let prevSeed = st0.seed;
  const unsub = subscribeParallax(() => {
    const st = getParallaxState();
    wake(); // any knob change (incl. Depth/Stir, which only the loop reads) must repaint
    if (st.density !== prevDensity) {
      prevDensity = st.density;
      field = new ParallaxField(PARALLAX_N[st.density], st.seed, st.colorBy);
      dyn = new Float32Array(field.n * 3);
      renderer.setField(field.staticAttribs());
    }
    if (st.colorBy !== prevColorBy) {
      prevColorBy = st.colorBy;
      field.setColorBy(st.colorBy);
      renderer.updateStatic(field.staticAttribs());
      renderer.washMode = WASH_FOR[st.colorBy];
    }
    if (st.seed !== prevSeed) {
      prevSeed = st.seed;
      field.regenerate(st.seed, st.colorBy);
      renderer.updateStatic(field.staticAttribs());
    }
  });

  // ── static signifier: the stir ring at the cursor (a 2D overlay — never in the export) ──
  const drawRing = (stirRadius: number): void => {
    if (!octx) return;
    octx.clearRect(0, 0, overlay.width, overlay.height);
    if (!cursor) return;
    octx.beginPath();
    octx.arc(cursor.x, cursor.y, stirRadius, 0, Math.PI * 2);
    octx.strokeStyle = dragging ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
    octx.lineWidth = 1.5;
    octx.stroke();
    octx.beginPath();
    octx.arc(cursor.x, cursor.y, 2, 0, Math.PI * 2);
    octx.fillStyle = 'rgba(255,255,255,0.7)';
    octx.fill();
  };

  // ── RAF loop ──
  const loop = (now: number): void => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    // Floor dt: equal RAF timestamps would make the sim's `input.dx / dt` blow up to Infinity.
    const dt = lastT ? Math.min(Math.max((now - lastT) / 1000, 1e-4), 1 / 30) : 1 / 60;
    lastT = now;
    const st = getParallaxState();
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    const minDim = Math.min(w, h);

    // Camera: peek around the field — pointer right looks right, so near layers glide left
    // (true look-around). Eases back to the exact home composition when the pointer leaves.
    const maxShift = st.depth * CAM_SHIFT_FRAC * minDim;
    const tx = cursor ? -((cursor.x / w) - 0.5) * 2 * maxShift : 0;
    const ty = cursor ? -((cursor.y / h) - 0.5) * 2 * maxShift : 0;

    // Fully at rest with nothing pending → the frame is pixel-identical; skip the work.
    const camSettled = Math.abs(tx - cam.x) < 0.05 && Math.abs(ty - cam.y) < 0.05;
    if (!needsFrame && !cursor && fieldSettled && camSettled) return;
    needsFrame = false;

    const k = 1 - Math.exp(-CAM_RATE * dt);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;

    let input: StirInput | null = null;
    if (cursor) {
      input = {
        x: cursor.x,
        y: cursor.y,
        dx: prevCursor ? cursor.x - prevCursor.x : 0,
        dy: prevCursor ? cursor.y - prevCursor.y : 0,
        dragging,
        pulse,
      };
      prevCursor = { x: cursor.x, y: cursor.y };
    }
    pulse = 0;

    const stirRadius = st.stir * minDim;
    fieldSettled = field.step(dt, input, w, h, stirRadius, cam.x, cam.y);
    field.writeDynamic(dyn, w, h);
    renderer.draw(dyn, cam.x, cam.y);
    drawRing(stirRadius);
    if (first) { first = false; host.onReady(); }
  };
  raf = requestAnimationFrame(loop);

  return {
    onContext: (ctx) => { if (ctx.lut.length) renderer.setLut(ctx.lut); wake(); },
    setDither: (on) => { renderer.dither = on; wake(); },
    exportCanvas: () => { renderer.draw(dyn, cam.x, cam.y); return glCanvas; },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      unsub();
      overlay.removeEventListener('pointerdown', onDown);
      overlay.removeEventListener('pointermove', onMove);
      overlay.removeEventListener('pointerup', onUp);
      overlay.removeEventListener('pointercancel', onUp);
      overlay.removeEventListener('pointerleave', onLeave);
      renderer.dispose();
      glCanvas.remove();
      overlay.remove();
    },
  };
};

// ── Controls (toolbar) ───────────────────────────────────────────────────────────────────────

const COLOR_MODES: ReadonlyArray<{ id: ParallaxColorBy; label: string; title: string }> = [
  { id: 'flow', label: 'Flow', title: 'The gradient flows left to right across the field' },
  { id: 'bloom', label: 'Bloom', title: 'The gradient blooms outward — first colour at the centre, last at the edges' },
  { id: 'depth', label: 'Depth', title: 'Colour follows depth — the gradient runs from the far haze to the near glow' },
  { id: 'mix', label: 'Scatter', title: 'Every colour at every depth — the gradient sprinkled through the field' },
];

const DENSITIES: ReadonlyArray<{ id: ParallaxDensity; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'med', label: 'Med' },
  { id: 'high', label: 'High' },
];

const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; title?: string;
}> = ({ label, value, min, max, step, onChange, title }) => (
  <label className="flex items-center gap-1.5 text-[11px] text-gray-400" title={title}>
    {label}
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-20 accent-cyan-400"
      aria-label={label}
    />
    <span className="tabular-nums w-6 text-right text-gray-500">{Math.round(((value - min) / (max - min)) * 100)}</span>
  </label>
);

const ParallaxControls: React.FC = () => {
  const st = useParallaxState();
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Slider label="Depth" value={st.depth} min={0} max={1} step={0.01} onChange={setParallaxDepth}
        title="How far the view peeks around the field as you move" />
      <Slider label="Stir" value={st.stir} min={0.05} max={0.4} step={0.01} onChange={setParallaxStir}
        title="Size of the stir brush" />

      <div className="flex items-center rounded-md border border-white/10 overflow-hidden divide-x divide-white/10">
        {COLOR_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setParallaxColorBy(m.id)}
            title={m.title}
            aria-pressed={st.colorBy === m.id}
            className={`px-2 py-1.5 text-[11px] transition-colors ${
              st.colorBy === m.id ? 'bg-cyan-500/25 text-cyan-100' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center rounded-md border border-white/10 overflow-hidden divide-x divide-white/10">
        {DENSITIES.map((d) => (
          <button
            key={d.id}
            onClick={() => setParallaxDensity(d.id)}
            title={`Point density: ${d.label}`}
            aria-pressed={st.density === d.id}
            className={`px-2 py-1.5 text-[11px] transition-colors ${
              st.density === d.id ? 'bg-cyan-500/25 text-cyan-100' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <button
        onClick={shuffleParallax}
        title="Re-scatter the field into a fresh composition"
        className="px-2.5 py-1 text-[12px] rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        🎲 Shuffle
      </button>
    </div>
  );
};

/** PARALLAX — the depth-layered gradient point field (ownCanvas). */
export const PARALLAX_MODE: FullscreenMode = {
  id: 'parallax',
  label: 'Parallax',
  kind: 'ownCanvas',
  hint: 'Esc to close · move to peek around · drag to stir · click to pulse',
  mount: mountParallax,
  Controls: ParallaxControls,
};
