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
import { ingestPixels, INGEST_MAX_EDGE, autoPath, type Img2GradMode } from '../core/img2grad';
import { GradientStrip } from './GradientStrip';
import { useGeneratorStore } from '../store/generatorStore';
import { useEngineStore } from '../../store/engineStore';
import { FavStar } from './FavStar';
import { fitRampToStops } from '../core/stopFit';

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

  // --- image loading: decode → downsample to ≤160px → ingest ---
  const loadImage = useCallback(
    (src: string) => {
      setLoading(true);
      const im = new Image();
      im.onload = () =>
        requestAnimationFrame(() => {
          const scale = Math.min(1, INGEST_MAX_EDGE / Math.max(im.width, im.height));
          const w = Math.max(1, Math.round(im.width * scale));
          const h = Math.max(1, Math.round(im.height * scale));
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const cx = c.getContext('2d', { willReadFrequently: true });
          if (!cx) return setLoading(false);
          cx.drawImage(im, 0, 0, w, h);
          const data = cx.getImageData(0, 0, w, h).data;
          const m = ingestPixels(data, w, h);

          // thumbnail (≤300×150)
          const t = document.createElement('canvas');
          let tw = 300, th = Math.round((300 * h) / w);
          if (th > 150) { th = 150; tw = Math.round((150 * w) / h); }
          t.width = tw; t.height = th;
          t.getContext('2d')?.drawImage(im, 0, 0, tw, th);

          setModel(m, t);
          if (mode === 'trace') setPath(autoPath(m));
        });
      im.onerror = () => { setLoading(false); flash('could not load image'); };
      im.src = src;
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
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
      window.clearTimeout(dragT);
      dragT = window.setTimeout(() => setOver(false), 130);
    };
    const onDrop = (e: DragEvent) => {
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
  const yawRef = useRef(-0.6);
  const pitchRef = useRef(0.5);
  const drawCloud = useCallback(() => {
    const cv = cloudRef.current;
    if (!cv || !model) return;
    const x = cv.getContext('2d');
    if (!x) return;
    const W = cv.width, H = cv.height, yaw = yawRef.current, pitch = pitchRef.current;
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
      const r = (2 + Math.min(4, Math.sqrt(q.p.cnt / model.maxcnt) * 9)) * (0.7 + 0.55 * nz);
      x.beginPath();
      x.globalAlpha = 0.4 + 0.5 * nz;
      x.fillStyle = `rgb(${q.p.r},${q.p.g},${q.p.bl})`;
      x.arc(q.sx, q.sy, r, 0, 7);
      x.fill();
    }
    x.globalAlpha = 1;
    const ribbon = derived?.ribbon, ramp = derived?.ramp;
    if (ribbon && ramp) {
      x.lineWidth = 4;
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
      [e0, e1].forEach((e) => { x.beginPath(); x.arc(e[0], e[1], 3, 0, 7); x.fill(); });
    }
  }, [model, derived]);

  useEffect(() => { drawCloud(); }, [drawCloud]);

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
    x.imageSmoothingEnabled = true;
    x.drawImage(thumb, R.ox, R.oy, R.w, R.h);
    if (mode === 'trace') {
      const ax = R.ox + path.x0 * R.w, ay = R.oy + path.y0 * R.h, bx = R.ox + path.x1 * R.w, by = R.oy + path.y1 * R.h;
      x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 5; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      ([[ax, ay, '#6cf'], [bx, by, '#fc6']] as [number, number, string][]).forEach((p) => {
        x.fillStyle = p[2]; x.strokeStyle = '#000'; x.lineWidth = 2;
        x.beginPath(); x.arc(p[0], p[1], 7, 0, 7); x.fill(); x.stroke();
      });
    }
  }, [thumb, model, mode, path, paneRect]);
  useEffect(() => { drawPane(); }, [drawPane]);

  // Live refs so the pointer listeners can stay attached for the whole drag. If the
  // effect depended on `path`, the first `setPath` would tear down + re-attach the
  // listeners mid-drag (grab reset to null, pointer-capture orphaned) and the handle
  // would stop following the cursor after one move.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const pathRef = useRef(path);
  pathRef.current = path;

  // trace handle drag (attached once per image load; reads live mode/path via refs)
  const hasModel = !!model;
  useEffect(() => {
    const cv = paneRef.current;
    if (!cv) return;
    let grab: number | null = null;
    const loc = (e: PointerEvent): [number, number] => {
      const r = cv.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height];
    };
    const down = (e: PointerEvent) => {
      if (modeRef.current !== 'trace') return;
      const p = pathRef.current;
      const [mx, my] = loc(e), R = paneRect();
      const ax = R.ox + p.x0 * R.w, ay = R.oy + p.y0 * R.h, bx = R.ox + p.x1 * R.w, by = R.oy + p.y1 * R.h;
      const da = Math.hypot(mx - ax, my - ay), db = Math.hypot(mx - bx, my - by);
      grab = da < db ? 0 : 1;
      // Generous hit radius (handles are 7px; scale by the canvas→CSS ratio so the
      // grab zone matches what the user sees even when the pane is scaled down).
      const r = cv.getBoundingClientRect();
      const scale = cv.width / Math.max(1, r.width);
      if (Math.min(da, db) > 28 * scale) grab = null;
      else {
        cv.setPointerCapture(e.pointerId);
        cv.classList.add('cursor-grabbing');
        e.preventDefault();
      }
    };
    const move = (e: PointerEvent) => {
      if (grab === null || modeRef.current !== 'trace') return;
      const p = pathRef.current;
      const [mx, my] = loc(e), R = paneRect();
      const nx = Math.max(0, Math.min(1, (mx - R.ox) / R.w)), ny = Math.max(0, Math.min(1, (my - R.oy) / R.h));
      setPath(grab === 0 ? { ...p, x0: nx, y0: ny } : { ...p, x1: nx, y1: ny });
    };
    const up = () => { grab = null; cv.classList.remove('cursor-grabbing'); };
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
    if (id === 'trace' && model) setPath(autoPath(model));
  };

  // --- send to generator ---
  const sendRampToSlot = useGeneratorStore((s) => s.sendRampToSlot);
  const togglePanel = useEngineStore((s) => s.togglePanel);
  const send = (which: 'A' | 'B') => {
    if (!derived) { flash('load an image first'); return; }
    sendRampToSlot(which, derived.ramp, `Image · ${mode}`);
    flash(`Sent to Generator ${which}`);
    togglePanel('Generator', true);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-zinc-950 relative overflow-hidden">
      {over && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/85 border-[3px] border-dashed border-cyan-400 text-cyan-100 text-lg pointer-events-none">
          Drop image to load
        </div>
      )}

      {!model ? (
        <div className="flex-1 flex items-center justify-center p-8">
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

          {/* Result gradient */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-400">Gradient <span className="ml-1 text-gray-600">{mode}</span></div>
                {favConfig && <FavStar config={favConfig} name={`Image · ${mode}`} source="Image" />}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => send('A')} className="text-[11px] px-2 py-1 rounded-sm bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30">
                  Send to Generator A
                </button>
                <button onClick={() => send('B')} className="text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-200 hover:bg-white/10">
                  B
                </button>
              </div>
            </div>
            <div className="rounded-md border border-white/15 bg-black/30 p-2 shadow-lg">
              {derived ? <GradientStrip ramp={derived.ramp} height={96} /> : <div className="h-24" />}
            </div>
          </div>

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
                {mode === 'trace' ? 'Trace path — drag the handles' : 'Source'}
              </div>
              <canvas ref={paneRef} width={640} height={340} className={`w-full rounded-md border border-zinc-800 bg-[#08080c] touch-none block ${mode === 'trace' ? 'cursor-grab' : ''}`} style={{ aspectRatio: '640/340' }} />
              {mode === 'trace' && (
                <button
                  onClick={() => model && setPath(autoPath(model))}
                  className="mt-1.5 text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-200 hover:bg-white/10"
                >
                  ✨ Auto-find best path
                </button>
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
