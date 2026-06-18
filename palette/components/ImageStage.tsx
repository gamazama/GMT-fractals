/**
 * ImageStage — the Image mode's CANVAS (centre stage).
 *
 * Drop / paste / click an image (whole-window drop target + overlay), pick a mode
 * (Distill / Tone / Trace — bound to the paletteImage slice, shared with the dock
 * dropdown), and see the extracted gradient, the rotatable 3D OKLab colour-cloud
 * (canvas-2D manual projection, ported as-is — Three.js later), and the source image
 * (Trace adds draggable endpoint handles).
 *
 * The dials live in the Image dock tab (DDFS params); this surface is visuals +
 * direct manipulation. Heavy state (the ImageModel, the trace path) is in imageStore.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useImageStore, useImageDerived, useImageMode, useImageParam } from '../store/imageStore';
import { decodeAndIngest, autoPath, tracePolyline, type Img2GradMode } from '../core/img2grad';
import type { Pt, TracePath } from '../core/img2grad/common';
import { CanonicalHero } from './CanonicalHero';
import { HeroSlot } from './HeroSlot';
import { fitRampToStops } from '../core/stopFit';
import { clamp01 } from '../../utils/stopOps';

const MODES: { id: Img2GradMode; label: string }[] = [
  { id: 'distill', label: 'Distill' },
  { id: 'tone', label: 'Tone' },
  { id: 'trace', label: 'Trace' },
];

// --- 3D cloud projection (verbatim from the standalone proj()) ---
const proj = (L: number, a: number, b: number, W: number, H: number, yaw: number, pitch: number): [number, number, number] => {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const X = a, Y = L - 0.5, Z = b;
  const x1 = X * cy - Z * sy, z1 = X * sy + Z * cy;
  const y1 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;
  const sc = Math.min(W, H) * 0.62;
  return [W / 2 + x1 * sc, H / 2 - y1 * sc * 1.05, z2];
};


/** Keep x0/y0/x1/y1 synced to the first/last freehand point (the 2-handle fallback). */
const syncEnds = (p: TracePath): TracePath => {
  if (!p.points || p.points.length < 2) return p;
  const f = p.points[0], l = p.points[p.points.length - 1];
  return { ...p, x0: f.x, y0: f.y, x1: l.x, y1: l.y };
};

/** The path's control points (freehand polyline, or the two endpoint handles). */
const pathControls = (p: TracePath): Pt[] =>
  p.points && p.points.length >= 2 ? p.points : [{ x: p.x0, y: p.y0 }, { x: p.x1, y: p.y1 }];

/**
 * Size a canvas's backing store to its displayed CSS box × devicePixelRatio (capped
 * at 2) so 2-D drawing stays crisp instead of being upscaled from a fixed 640px
 * buffer. Returns a generation counter that bumps whenever the backing is resized —
 * callers add it to their draw effect deps (setting canvas.width clears the bitmap,
 * so a redraw is required after each resize). A ResizeObserver tracks layout changes
 * (responsive docks, window resize) with nothing to re-attach.
 */
const useHiDPICanvas = (ref: React.RefObject<HTMLCanvasElement>, active = true): number => {
  const [gen, setGen] = useState(0);
  // `active` re-runs the effect when the canvas mounts (these canvases only exist once
  // an image is loaded) so the observer attaches and the first fit runs post-mount.
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = cv.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
        setGen((g) => g + 1);
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [ref, active]);
  return gen;
};

export const ImageStage: React.FC = () => {
  const model = useImageStore((s) => s.model);
  const thumb = useImageStore((s) => s.thumb);
  const loading = useImageStore((s) => s.loading);
  const path = useImageStore((s) => s.path);
  const setModel = useImageStore((s) => s.setModel);
  const setPath = useImageStore((s) => s.setPath);
  const setLoading = useImageStore((s) => s.setLoading);

  const mode = useImageMode();
  const [, setModeIdx] = useImageParam<number>('mode');
  const [catmull] = useImageParam<boolean>('catmullRom');
  const [drawing, setDrawing] = useState(false);
  const derived = useImageDerived();
  // Image extraction is ramp-only; fit to GMT stops once so it can be favourited as a
  // GradientConfig (the shelf's interchange representation).
  const favConfig = useMemo(
    () => (derived ? fitRampToStops(derived.ramp, { targetDE: 0.02, maxStops: 32 }) : null),
    [derived],
  );

  const [over, setOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1400);
  }, []);

  // --- image loading: decode → downsample to ≤160px → ingest (shared with the scene
  // document round-trip via decodeAndIngest) ---
  const loadImage = useCallback(
    (src: string) => {
      setLoading(true);
      decodeAndIngest(src)
        .then(({ model, thumb }) => {
          setModel(model, thumb);
          if (mode === 'trace') setPath(autoPath(model));
        })
        .catch(() => {
          setLoading(false);
          flash('could not load image');
        });
    },
    [mode, setModel, setPath, setLoading, flash],
  );

  const fileToImg = useCallback(
    (f: File | null | undefined): boolean => {
      if (f && f.type.startsWith('image')) {
        const r = new FileReader();
        r.onload = () => loadImage(r.result as string);
        r.readAsDataURL(f);
        return true;
      }
      return false;
    },
    [loadImage],
  );

  // whole-window drop target + paste (active while the Image stage is mounted)
  useEffect(() => {
    let dragT: number | undefined;
    // Coexistence with in-app drags: a gradient-swatch / favient drag carries a custom
    // MIME and belongs to a send target (DropTargetLayer), not the image-file importer —
    // it never carries 'Files'. So ImageStage proceeds ONLY for genuine OS file drops;
    // any drag without a 'Files' type is an internal drag we stand down for (no overlay
    // flash over it).
    const isWellDrag = (e: DragEvent): boolean =>
      !e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files');
    const onDragOver = (e: DragEvent) => {
      if (isWellDrag(e)) return;
      e.preventDefault();
      setOver(true);
      window.clearTimeout(dragT);
      dragT = window.setTimeout(() => setOver(false), 130);
    };
    const onDrop = (e: DragEvent) => {
      if (isWellDrag(e)) return;
      e.preventDefault();
      setOver(false);
      window.clearTimeout(dragT);
      if (!fileToImg(e.dataTransfer?.files[0])) flash('not an image');
    };
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) for (const it of items) if (it.type.startsWith('image')) { fileToImg(it.getAsFile()); return; }
      flash('no image in clipboard');
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
      window.clearTimeout(dragT);
    };
  }, [fileToImg, flash]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- cloud ---
  const cloudRef = useRef<HTMLCanvasElement>(null);
  const cloudGen = useHiDPICanvas(cloudRef, !!model);
  const yawRef = useRef(-0.6);
  const pitchRef = useRef(0.5);
  const drawCloud = useCallback(() => {
    const cv = cloudRef.current;
    if (!cv || !model) return;
    const x = cv.getContext('2d');
    if (!x) return;
    const W = cv.width, H = cv.height, yaw = yawRef.current, pitch = pitchRef.current;
    // backing-px per CSS-px, so dot/line sizes stay visually constant across DPR
    const dpr = W / Math.max(1, cv.getBoundingClientRect().width);
    x.clearRect(0, 0, W, H);
    x.fillStyle = '#08080c';
    x.fillRect(0, 0, W, H);
    const pts = model.cloud
      .map((p) => { const pr = proj(p.L, p.a, p.b, W, H, yaw, pitch); return { sx: pr[0], sy: pr[1], z: pr[2], p }; })
      .sort((u, v) => u.z - v.z);
    const zmn = pts.length ? pts[0].z : 0;
    const zr = (pts.length ? pts[pts.length - 1].z - zmn : 1) || 1;
    for (const q of pts) {
      const nz = (q.z - zmn) / zr;
      const r = (2 + Math.min(4, Math.sqrt(q.p.cnt / model.maxcnt) * 9)) * (0.7 + 0.55 * nz) * dpr;
      x.beginPath();
      x.globalAlpha = 0.4 + 0.5 * nz;
      x.fillStyle = `rgb(${q.p.r},${q.p.g},${q.p.bl})`;
      x.arc(q.sx, q.sy, r, 0, 7);
      x.fill();
    }
    x.globalAlpha = 1;
    const ribbon = derived?.ribbon, ramp = derived?.ramp;
    if (ribbon && ramp) {
      x.lineWidth = 4 * dpr;
      x.lineCap = 'round';
      for (let i = 1; i < 256; i++) {
        const a = proj(ribbon[i - 1].L, ribbon[i - 1].a, ribbon[i - 1].b, W, H, yaw, pitch);
        const b = proj(ribbon[i].L, ribbon[i].a, ribbon[i].b, W, H, yaw, pitch);
        x.strokeStyle = `rgb(${Math.round(ramp[i].r)},${Math.round(ramp[i].g)},${Math.round(ramp[i].b)})`;
        x.beginPath();
        x.moveTo(a[0], a[1]);
        x.lineTo(b[0], b[1]);
        x.stroke();
      }
      const e0 = proj(ribbon[0].L, ribbon[0].a, ribbon[0].b, W, H, yaw, pitch);
      const e1 = proj(ribbon[255].L, ribbon[255].a, ribbon[255].b, W, H, yaw, pitch);
      x.fillStyle = '#fff';
      [e0, e1].forEach((e) => { x.beginPath(); x.arc(e[0], e[1], 3 * dpr, 0, 7); x.fill(); });
    }
  }, [model, derived]);

  useEffect(() => { drawCloud(); }, [drawCloud, cloudGen]);

  // cloud drag → rotate
  useEffect(() => {
    const cv = cloudRef.current;
    if (!cv) return;
    let dr = false, lx = 0, ly = 0, raf = 0;
    const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; drawCloud(); }); };
    const down = (e: PointerEvent) => { dr = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); cv.classList.add('cursor-grabbing'); };
    const move = (e: PointerEvent) => {
      if (!dr) return;
      yawRef.current += (e.clientX - lx) * 0.01;
      pitchRef.current = Math.max(-1.4, Math.min(1.4, pitchRef.current + (e.clientY - ly) * 0.01));
      lx = e.clientX; ly = e.clientY;
      schedule();
    };
    const up = () => { dr = false; cv.classList.remove('cursor-grabbing'); };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    return () => {
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [drawCloud]);

  // --- image pane (source / trace path) ---
  const paneRef = useRef<HTMLCanvasElement>(null);
  const paneGen = useHiDPICanvas(paneRef, !!model);
  const paneRect = useCallback(() => {
    const cv = paneRef.current!;
    const ar = model ? model.w / model.h : 16 / 9;
    let w = cv.width, h = cv.height;
    if (w / h > ar) w = h * ar; else h = w / ar;
    return { ox: (cv.width - w) / 2, oy: (cv.height - h) / 2, w, h };
  }, [model]);
  const drawPane = useCallback(() => {
    const cv = paneRef.current;
    if (!cv) return;
    const x = cv.getContext('2d');
    if (!x) return;
    x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = '#08080c';
    x.fillRect(0, 0, cv.width, cv.height);
    if (!thumb || !model) return;
    const R = paneRect();
    // backing-px per CSS-px, so the overlay strokes/handles keep a constant visual
    // size while the photo itself draws at the full backing resolution.
    const dpr = cv.width / Math.max(1, cv.getBoundingClientRect().width);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(thumb, R.ox, R.oy, R.w, R.h);
    if (mode === 'trace') {
      // Dense curve in image px (same geometry the sampler walks) → pane coords.
      const poly = tracePolyline(path, model.w, model.h, catmull);
      const toPane = (p: Pt): [number, number] => [R.ox + (p.x / (model.w - 1)) * R.w, R.oy + (p.y / (model.h - 1)) * R.h];
      const line = () => { x.beginPath(); poly.forEach((p, i) => { const [X, Y] = toPane(p); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); };
      x.lineJoin = 'round'; x.lineCap = 'round';
      x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 5 * dpr; line(); x.stroke();
      x.strokeStyle = '#fff'; x.lineWidth = 2 * dpr; line(); x.stroke();
      // Control-point handles: first cyan, last amber, interior white.
      const ctrl = pathControls(path);
      ctrl.forEach((c, i) => {
        const cx = R.ox + c.x * R.w, cy = R.oy + c.y * R.h;
        x.fillStyle = i === 0 ? '#6cf' : i === ctrl.length - 1 ? '#fc6' : '#fff';
        x.strokeStyle = '#000'; x.lineWidth = 2 * dpr;
        const r = (i === 0 || i === ctrl.length - 1 ? 7 : 4.5) * dpr;
        x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.stroke();
      });
    }
  }, [thumb, model, mode, path, catmull, paneRect]);
  useEffect(() => { drawPane(); }, [drawPane, paneGen]);

  // Live refs so the pointer listeners can stay attached for the whole drag. If the
  // effect depended on `path`, the first `setPath` would tear down + re-attach the
  // listeners mid-drag (grab reset to null, pointer-capture orphaned) and the handle
  // would stop following the cursor after one move.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const pathRef = useRef(path);
  pathRef.current = path;
  const drawingRef = useRef(drawing);
  drawingRef.current = drawing;
  // Freehand recording buffer (non-null while a draw stroke is in progress).
  const recordRef = useRef<Pt[] | null>(null);

  // trace handle drag / freehand draw (attached once per image load; reads live mode /
  // path / draw-mode via refs so listeners never tear down mid-interaction)
  const hasModel = !!model;
  useEffect(() => {
    const cv = paneRef.current;
    if (!cv) return;
    let grab: number | null = null;
    const loc = (e: PointerEvent): [number, number] => {
      const r = cv.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height];
    };
    // canvas→CSS scale, so hit radii / point spacing match what the user sees.
    const scaleOf = (): number => cv.width / Math.max(1, cv.getBoundingClientRect().width);
    const norm = (mx: number, my: number, R: ReturnType<typeof paneRect>): Pt => ({
      x: clamp01((mx - R.ox) / R.w),
      y: clamp01((my - R.oy) / R.h),
    });

    const down = (e: PointerEvent) => {
      if (modeRef.current !== 'trace') return;
      const [mx, my] = loc(e), R = paneRect();
      // Draw mode: begin a fresh freehand stroke.
      if (drawingRef.current) {
        recordRef.current = [norm(mx, my, R)];
        cv.setPointerCapture(e.pointerId);
        cv.classList.add('cursor-crosshair');
        e.preventDefault();
        return;
      }
      // Otherwise grab the nearest control point.
      const p = pathRef.current;
      const ctrl = pathControls(p);
      let best = -1, bestD = Infinity;
      ctrl.forEach((c, i) => {
        const d = Math.hypot(mx - (R.ox + c.x * R.w), my - (R.oy + c.y * R.h));
        if (d < bestD) { bestD = d; best = i; }
      });
      grab = bestD <= 28 * scaleOf() ? best : null;
      if (grab !== null) {
        cv.setPointerCapture(e.pointerId);
        cv.classList.add('cursor-grabbing');
        e.preventDefault();
      }
    };

    const move = (e: PointerEvent) => {
      if (modeRef.current !== 'trace') return;
      const [mx, my] = loc(e), R = paneRect();
      // Recording a freehand stroke: append points spaced ~8 CSS-px apart.
      if (recordRef.current) {
        const buf = recordRef.current;
        const last = buf[buf.length - 1];
        if (Math.hypot(mx - (R.ox + last.x * R.w), my - (R.oy + last.y * R.h)) >= 8 * scaleOf()) {
          buf.push(norm(mx, my, R));
          setPath(syncEnds({ x0: 0, y0: 0, x1: 0, y1: 0, points: buf.slice() }));
        }
        return;
      }
      if (grab === null) return;
      const p = pathRef.current;
      const np = norm(mx, my, R);
      if (p.points && p.points.length >= 2) {
        const pts = p.points.slice();
        pts[grab] = np;
        setPath(syncEnds({ ...p, points: pts }));
      } else {
        setPath(grab === 0 ? { ...p, x0: np.x, y0: np.y } : { ...p, x1: np.x, y1: np.y });
      }
    };

    const up = () => {
      if (recordRef.current) {
        const buf = recordRef.current;
        recordRef.current = null;
        cv.classList.remove('cursor-crosshair');
        // Need ≥2 points for a path; a tap leaves the previous path untouched.
        if (buf.length >= 2) setPath(syncEnds({ x0: 0, y0: 0, x1: 0, y1: 0, points: buf }));
        setDrawing(false);
        return;
      }
      grab = null;
      cv.classList.remove('cursor-grabbing');
    };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    return () => {
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    };
    // hasModel: re-attach when the pane canvas (re)mounts on image load; paneRect
    // changes only with the model, so it never churns mid-drag.
  }, [hasModel, paneRect, setPath]);

  const switchMode = (id: Img2GradMode, idx: number) => {
    setModeIdx(idx);
    setDrawing(false);
    if (id === 'trace' && model) setPath(autoPath(model));
  };

  // Send-to-Generator is now the Generator · A / Generator · B bins in the dock
  // (select the result or drag it onto a bin) — no hardcoded buttons here.

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-zinc-950 relative overflow-hidden">
      {over && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/85 border-[3px] border-dashed border-cyan-400 text-cyan-100 text-lg pointer-events-none">
          Drop image to load
        </div>
      )}

      {!model ? (
        <div className="flex-1 flex items-center justify-center p-8">
          {/* Keep the always-visible mobile hero rail from showing a bare band before any
              image exists — rail-only, so desktop's no-image screen is unchanged. */}
          <HeroSlot railOnly>
            <div className="text-[11px] text-gray-500 flex items-center h-full">
              The image’s gradient appears here once you load one.
            </div>
          </HeroSlot>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="max-w-md text-center border border-dashed border-zinc-700 hover:border-cyan-500/60 rounded-xl px-10 py-12 transition-colors"
          >
            <div className="text-3xl mb-3">🖼️</div>
            <div className="text-base text-zinc-200 mb-1">Drop, paste, or click an image</div>
            <div className="text-xs text-zinc-500">Pull out its soul as a 256-step gradient · OKLab-perceptual, never muddy</div>
            {loading && <div className="mt-3 text-xs text-cyan-300">reading image…</div>}
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Mode tabs */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-md bg-white/[0.04] p-0.5">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => switchMode(m.id, i)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    mode === m.id ? 'bg-cyan-500/25 text-cyan-100' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="ml-auto text-[11px] text-gray-400 hover:text-gray-200 px-2 py-1 rounded-sm bg-white/[0.04]"
            >
              Replace image
            </button>
          </div>

          {/* Result gradient — the shared select/drag hero (drag it onto a bin, or
              click to select then pick a destination: Generator · A/B, ColorBox, …).
              HeroSlot: inline on desktop; portals into the mobile hero rail. */}
          <HeroSlot>
            {favConfig && derived ? (
              <CanonicalHero
                config={favConfig}
                ramp={derived.ramp}
                name={`Image · ${mode}`}
                autoName
                source="Image"
                mode="image"
              />
            ) : (
              <div>
                <div className="text-xs text-gray-400 mb-1.5">
                  Result <span className="ml-1 text-gray-500 capitalize">{mode}</span>
                </div>
                <div className="rounded-md border border-white/15 bg-black/30 p-2 shadow-lg">
                  <div className="h-24" />
                </div>
              </div>
            )}
          </HeroSlot>

          {/* Cloud + image pane */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                Colour cloud (OKLab) — drag to rotate · line = your gradient
              </div>
              <canvas ref={cloudRef} width={640} height={340} className="w-full rounded-md border border-zinc-800 bg-[#08080c] cursor-grab touch-none block" style={{ aspectRatio: '640/340' }} />
            </div>
            <div className="flex-1 min-w-[280px]">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                {mode === 'trace'
                  ? drawing
                    ? 'Draw path — drag across the image'
                    : 'Trace path — drag the points'
                  : 'Source image'}
              </div>
              <canvas ref={paneRef} width={640} height={340} className={`w-full rounded-md border border-zinc-800 bg-[#08080c] touch-none block ${mode === 'trace' ? (drawing ? 'cursor-crosshair' : 'cursor-grab') : ''}`} style={{ aspectRatio: '640/340' }} />
              {mode === 'trace' && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setDrawing((d) => !d)}
                    className={`text-[11px] px-2 py-1 rounded-sm ${
                      drawing ? 'bg-cyan-500/30 text-cyan-100' : 'bg-white/[0.06] text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    {drawing ? 'Drawing…' : 'Draw path'}
                  </button>
                  <button
                    onClick={() => model && (setDrawing(false), setPath(autoPath(model)))}
                    className="text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    Auto path
                  </button>
                  <button
                    onClick={() => setPath({ x0: path.x0, y0: path.y0, x1: path.x1, y1: path.y1 })}
                    disabled={!path.points}
                    title="Reset to a straight line between the endpoints"
                    className="text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-200 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.06]"
                  >
                    Straight
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0] && !fileToImg(e.target.files[0])) flash('not an image'); e.target.value = ''; }}
      />

      {toast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/85 text-gray-100 text-xs px-3 py-1.5 rounded-full border border-white/10 shadow-xl z-40">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ImageStage;
