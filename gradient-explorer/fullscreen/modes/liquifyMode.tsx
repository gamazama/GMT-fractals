/**
 * liquifyMode — the LIQUIFY fullscreen mode: the gradient as a deformable colour field you sculpt.
 *
 * The gradient is a dense grid mesh whose vertices carry a LUT coord; you push / twirl / grab the
 * mesh and the colours flow with it. An OPTIONAL physics layer (XPBD soft body, OFF by default)
 * makes the field springy and lets you pin regions; smoothing (Taubin λ|μ) de-noises a sculpt.
 *
 * ── The art-direction contract (the crux) ──────────────────────────────────────────────────
 * The user's deformation is AUTHORITATIVE. Physics is optional, dampened, and relaxes toward the
 * SCULPTED rest shape — never toward flat, never overriding the artist. Toggling physics off leaves
 * exactly what was sculpted. (All enforced in {@link LiquifyMesh}: `sculpt` is the rest target;
 * `pos` springs to it; physics-off ⇒ `pos === sculpt`.)
 *
 * ── UX (child-simple, static signifiers, NO idle wiggle) ───────────────────────────────────
 *   • Direct grab-drag is the primary verb. The toolbar is always visible (no hidden modes).
 *   • Signifiers are static: a brush-ring cursor, visible handle dots (grab = cyan, pin = amber),
 *     a faint mesh-boundary frame. Nothing animates to "teach" — the affordances are just shown.
 *
 * An `ownCanvas` mode on the generic `mount()` seam: it owns a GL mesh canvas + a 2D signifier
 * overlay, its RAF, pointer handling, and a `liquifyStore` subscription; the overlay forwards the
 * colour source, the dither toggle, and PNG export.
 *
 * @see LiquifyMesh.ts (the soft body) · LiquifyRenderer.ts (the GL surface) · liquifyStore.ts (UI)
 * @see gradient-explorer/fullscreen/modeRegistry.ts (the ownCanvas mount face)
 */

import React from 'react';
import type { FullscreenMode, OwnCanvasHost, OwnCanvasHandle } from '../modeRegistry';
import { LiquifyMesh, type BrushType } from './liquify/LiquifyMesh';
import { LiquifyRenderer, screenToMesh, meshToScreen } from './liquify/LiquifyRenderer';
import {
  DENSITY_N,
  getLiquifyState,
  subscribeLiquify,
  useLiquifyState,
  setLiquifyBrush,
  setLiquifyRadius,
  setLiquifyStrength,
  setLiquifyPhysics,
  setLiquifyStiffness,
  setLiquifyDamping,
  setLiquifySmooth,
  setLiquifyDensity,
  type LiquifyDensity,
} from './liquify/liquifyStore';

/** Pixel pick radius (mesh units) for grabbing an existing handle dot. */
const GRAB_PICK = 0.04;

/** The single live Liquify instance's control surface (one overlay → one mode). `mount()` publishes
 *  it so the toolbar `Controls` can drive Reset on the mesh it created (mirrors fractalMode). */
let activeControl: { reset: () => void } | null = null;

const mountLiquify = (host: OwnCanvasHost): OwnCanvasHandle => {
  const container = host.container;
  const glCanvas = document.createElement('canvas');
  glCanvas.className = 'absolute inset-0 w-full h-full';
  const overlay = document.createElement('canvas');
  overlay.className = 'absolute inset-0 w-full h-full touch-none cursor-crosshair';
  container.appendChild(glCanvas);
  container.appendChild(overlay);
  const octx = overlay.getContext('2d');

  let mesh = new LiquifyMesh(DENSITY_N[getLiquifyState().density]);
  let renderer: LiquifyRenderer;
  try {
    renderer = new LiquifyRenderer(glCanvas, mesh.indices, mesh.t, () => {/* tile loaded → next frame dithers */});
  } catch (e) {
    host.onError(e);
    return { dispose: () => { glCanvas.remove(); overlay.remove(); } };
  }
  const ctx0 = host.getContext();
  if (ctx0.lut.length) renderer.setLut(ctx0.lut);

  let raf = 0;
  let lastT = 0;
  let first = true;
  let unsub: (() => void) | undefined;
  let disposed = false;

  // Cursor state for the brush-ring signifier (CSS px within the overlay; null when outside).
  let cursor: { x: number; y: number } | null = null;
  let dragHandle: number | null = null;
  let dragHandleIsNew = false; // a fresh grab handle — discarded if released without a drag
  let dragMoved = false;
  let painting = false;
  let lastPt: [number, number] = [0, 0];

  // ── sizing (GL backing at DPR for a crisp gradient; overlay at CSS px for the signifiers) ──
  const resize = (): void => {
    const cw = container.clientWidth, ch = container.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setSize(Math.round(cw * dpr), Math.round(ch * dpr));
    overlay.width = cw; overlay.height = ch;
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : undefined;
  ro?.observe(container);
  resize();

  // ── rebuild on a density change (new vert count ⇒ new buffers) ──
  const rebuild = (n: number): void => {
    renderer.dispose();
    mesh = new LiquifyMesh(n);
    renderer = new LiquifyRenderer(glCanvas, mesh.indices, mesh.t);
    const ctx = host.getContext();
    if (ctx.lut.length) renderer.setLut(ctx.lut);
    resize();
  };

  // ── pointer interaction (on the top overlay canvas) ──
  const toMesh = (e: PointerEvent): [number, number] => {
    const r = overlay.getBoundingClientRect();
    return screenToMesh(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
  };
  const onDown = (e: PointerEvent): void => {
    const st = getLiquifyState();
    const [mx, my] = toMesh(e);
    overlay.setPointerCapture(e.pointerId);
    if (st.brush === 'grab') {
      const i = mesh.nearestHandle(mx, my, GRAB_PICK);
      dragHandleIsNew = i < 0;
      dragMoved = false;
      dragHandle = i >= 0 ? i : mesh.addHandle(mx, my, false);
    } else if (st.brush === 'pin') {
      const i = mesh.nearestHandle(mx, my, GRAB_PICK);
      if (i >= 0 && mesh.handles[i].fixed) mesh.removeHandle(i); // toggle an existing pin off
      else mesh.addHandle(mx, my, true);
    } else {
      painting = true;
      lastPt = [mx, my];
      // A single dab on press so click-without-drag still does something for radial brushes.
      mesh.applyBrush(st.brush, mx, my, st.radius, st.strength, 0, 0, st.physics);
    }
  };
  const onMove = (e: PointerEvent): void => {
    const r = overlay.getBoundingClientRect();
    cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
    const [mx, my] = screenToMesh(cursor.x, cursor.y, r.width, r.height);
    if (dragHandle != null) {
      dragMoved = true;
      mesh.moveHandle(dragHandle, mx, my);
    } else if (painting) {
      const st = getLiquifyState();
      mesh.applyBrush(st.brush, mx, my, st.radius, st.strength, mx - lastPt[0], my - lastPt[1], st.physics);
      lastPt = [mx, my];
    }
  };
  const onUp = (e: PointerEvent): void => {
    if (overlay.hasPointerCapture(e.pointerId)) overlay.releasePointerCapture(e.pointerId);
    // A grab that placed a fresh handle but never dragged it leaves no deformation → discard the
    // stray dot (so a stray click doesn't litter handles).
    if (dragHandle != null && dragHandleIsNew && !dragMoved) mesh.removeHandle(dragHandle);
    dragHandle = null;
    dragHandleIsNew = false;
    painting = false;
  };
  const onLeave = (): void => { cursor = null; };
  const onDbl = (e: PointerEvent): void => {
    const st = getLiquifyState();
    if (st.brush !== 'grab' && st.brush !== 'pin') return;
    const [mx, my] = toMesh(e);
    const i = mesh.nearestHandle(mx, my, GRAB_PICK);
    if (i >= 0) mesh.removeHandle(i);
  };
  overlay.addEventListener('pointerdown', onDown);
  overlay.addEventListener('pointermove', onMove);
  overlay.addEventListener('pointerup', onUp);
  overlay.addEventListener('pointercancel', onUp);
  overlay.addEventListener('pointerleave', onLeave);
  overlay.addEventListener('dblclick', onDbl as EventListener);

  // ── store subscription (drive the soft body from the UI) ──
  let prevDensity = getLiquifyState().density;
  let prevPhysics = getLiquifyState().physics;
  unsub = subscribeLiquify(() => {
    const st = getLiquifyState();
    if (st.density !== prevDensity) { prevDensity = st.density; rebuild(DENSITY_N[st.density]); }
    if (st.physics !== prevPhysics) {
      prevPhysics = st.physics;
      if (!st.physics) mesh.syncToSculpt(); // toggling off snaps the live mesh back to the sculpt
      else mesh.disturb();
    }
  });

  // ── signifiers (static — brush ring, handle dots, mesh frame) ──
  const drawSignifiers = (): void => {
    if (!octx) return;
    const w = overlay.width, h = overlay.height;
    octx.clearRect(0, 0, w, h);
    const side = Math.min(w, h);
    // faint mesh-boundary frame (the sculptable square)
    const [x0, y0] = meshToScreen(0, 0, w, h);
    const [x1, y1] = meshToScreen(1, 1, w, h);
    octx.strokeStyle = 'rgba(255,255,255,0.08)';
    octx.lineWidth = 1;
    octx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // handle dots (skip the 4 fixed corners)
    for (let i = 4; i < mesh.handles.length; i++) {
      const hnd = mesh.handles[i];
      const [px, py] = meshToScreen(hnd.cur[0], hnd.cur[1], w, h);
      octx.beginPath();
      octx.arc(px, py, hnd.fixed ? 6 : 7, 0, Math.PI * 2);
      octx.fillStyle = hnd.fixed ? 'rgba(251,191,36,0.95)' : 'rgba(34,211,238,0.95)'; // pin amber / grab cyan
      octx.fill();
      octx.lineWidth = 2;
      octx.strokeStyle = 'rgba(0,0,0,0.5)';
      octx.stroke();
    }
    // brush-ring cursor (warp + grab tools)
    const st = getLiquifyState();
    if (cursor && st.brush !== 'pin') {
      const rpx = st.radius * side;
      octx.beginPath();
      octx.arc(cursor.x, cursor.y, st.brush === 'grab' ? GRAB_PICK * side : rpx, 0, Math.PI * 2);
      octx.strokeStyle = 'rgba(255,255,255,0.6)';
      octx.lineWidth = 1.5;
      octx.stroke();
    }
  };

  // ── RAF loop ──
  const loop = (now: number): void => {
    if (disposed) return;
    const dt = lastT ? Math.min((now - lastT) / 1000, 1 / 20) : 1 / 60;
    lastT = now;
    const st = getLiquifyState();
    if (st.smooth > 0) mesh.smoothAll(st.smooth);
    // Physics ON → simulate (relax toward sculpt). OFF → the live mesh simply IS the sculpt, so any
    // sculpt change (a grab handle move, a brush, a smooth pass) shows immediately.
    if (st.physics) mesh.step(dt, st.stiffness, st.damping);
    else mesh.syncToSculpt();
    renderer.draw(mesh.pos);
    drawSignifiers();
    if (first) { first = false; host.onReady(); }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  activeControl = { reset: () => mesh.reset() };

  return {
    onContext: (ctx) => { if (ctx.lut.length) renderer.setLut(ctx.lut); },
    setDither: (on) => { renderer.dither = on; },
    exportCanvas: () => { renderer.draw(mesh.pos); return glCanvas; },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      unsub?.();
      overlay.removeEventListener('pointerdown', onDown);
      overlay.removeEventListener('pointermove', onMove);
      overlay.removeEventListener('pointerup', onUp);
      overlay.removeEventListener('pointercancel', onUp);
      overlay.removeEventListener('pointerleave', onLeave);
      overlay.removeEventListener('dblclick', onDbl as EventListener);
      renderer.dispose();
      activeControl = null;
      glCanvas.remove();
      overlay.remove();
    },
  };
};

// ── Controls (toolbar) ───────────────────────────────────────────────────────────────────────

const BRUSHES: ReadonlyArray<{ id: BrushType; icon: string; label: string }> = [
  { id: 'grab', icon: '✋', label: 'Grab — drag handle dots to move the colour field' },
  { id: 'push', icon: '👉', label: 'Push — smear the colours in the drag direction' },
  { id: 'twirl', icon: '🌀', label: 'Twirl — swirl the colours around the cursor' },
  { id: 'bloat', icon: '⊕', label: 'Bloat — push the colours outward' },
  { id: 'pucker', icon: '⊖', label: 'Pucker — pull the colours inward' },
  { id: 'pull', icon: '✪', label: 'Pull — gather the colours toward the cursor' },
  { id: 'smooth', icon: '〰', label: 'Smooth — soften the deformation under the cursor' },
  { id: 'restore', icon: '↺', label: 'Restore — relax the deformation back toward flat' },
  { id: 'pin', icon: '📌', label: 'Pin — freeze a region (click again to unpin)' },
];

const DENSITIES: ReadonlyArray<{ id: LiquifyDensity; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'med', label: 'Med' },
  { id: 'high', label: 'High' },
];

const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}> = ({ label, value, min, max, step, onChange, fmt }) => (
  <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
    {label}
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-20 accent-cyan-400"
      aria-label={label}
    />
    <span className="tabular-nums w-6 text-right text-gray-500">{(fmt ?? ((v) => String(Math.round(v * 100))))(value)}</span>
  </label>
);

const LiquifyControls: React.FC = () => {
  const st = useLiquifyState();
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* brush palette — always visible, no hidden modes */}
      <div className="flex items-center rounded-md border border-white/10 overflow-hidden divide-x divide-white/10">
        {BRUSHES.map((b) => (
          <button
            key={b.id}
            onClick={() => setLiquifyBrush(b.id)}
            title={b.label}
            aria-pressed={st.brush === b.id}
            className={`px-2 py-1.5 text-[13px] leading-none transition-colors ${
              st.brush === b.id ? 'bg-cyan-500/25 text-cyan-100' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
            }`}
          >
            {b.icon}
          </button>
        ))}
      </div>

      <Slider label="Size" value={st.radius} min={0.02} max={0.5} step={0.01} onChange={setLiquifyRadius}
        fmt={(v) => String(Math.round(v * 100))} />
      <Slider label="Strength" value={st.strength} min={0} max={1} step={0.01} onChange={setLiquifyStrength} />
      <Slider label="Smooth" value={st.smooth} min={0} max={1} step={0.01} onChange={setLiquifySmooth} />

      {/* physics — OFF by default (the sculpt is authoritative) */}
      <button
        onClick={() => setLiquifyPhysics(!st.physics)}
        title="Jiggle physics — the sculpt stays authoritative; physics springs toward it (off leaves the sculpt intact)"
        aria-pressed={st.physics}
        className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
          st.physics ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-100' : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        {st.physics ? '❚❚ Jiggle' : '▶ Jiggle'}
      </button>
      {st.physics && (
        <>
          <Slider label="Stiffness" value={st.stiffness} min={0} max={1} step={0.01} onChange={setLiquifyStiffness} />
          <Slider label="Damping" value={st.damping} min={0} max={1} step={0.01} onChange={setLiquifyDamping} />
        </>
      )}

      <div className="flex items-center rounded-md border border-white/10 overflow-hidden divide-x divide-white/10">
        {DENSITIES.map((d) => (
          <button
            key={d.id}
            onClick={() => setLiquifyDensity(d.id)}
            title={`Mesh density: ${d.label}`}
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
        onClick={() => activeControl?.reset()}
        title="Reset the deformation back to a flat gradient"
        className="px-2.5 py-1 text-[12px] rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        ⌖ Reset
      </button>
    </div>
  );
};

/** LIQUIFY — the deformable colour-field mode (ownCanvas). */
export const LIQUIFY_MODE: FullscreenMode = {
  id: 'liquify',
  label: 'Liquify',
  kind: 'ownCanvas',
  hint: 'Esc to close · grab & drag to sculpt the colour · pin to freeze · ▶ Jiggle for physics',
  mount: mountLiquify,
  Controls: LiquifyControls,
};
