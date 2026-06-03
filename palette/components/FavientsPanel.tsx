/**
 * FavientsPanel — the persistent gradient-favourites shelf. Registered as the
 * `panel-favients` component and dropped into a host's panel manifest (the Palette
 * Studio floats it by default). Minimal but full: an "Applying to ▾" target dropdown
 * decides where a click lands, each swatch is click-to-apply / drag-to-apply /
 * ×-to-remove, and the whole collection persists across sessions + apps (favientsStore).
 *
 * Host-agnostic: reads its own stores (favientsStore + favientTargets) and ignores the
 * PanelRouter props.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GenericDropdown } from '../../components/GenericDropdown';
import { useFavientsStore, type Favient } from '../store/favientsStore';
import { getFavientTargets, getFavientTarget, subscribeFavientTargets } from '../core/favientTargets';
import { setFavientDrag, readFavientDrag, FAVIENT_DND_MIME } from '../core/favientDnd';
import { renderStopsToRamp } from '../core/gmtGradient';
import { GradientHoverPreview, type GradientHover } from './GradientHoverPreview';
import type { RGB } from '../core/oklab';

/** Re-render when hosts (re)register apply targets. */
const useFavientTargets = () => {
  const [, force] = useState(0);
  useEffect(() => subscribeFavientTargets(() => force((n) => n + 1)), []);
  return getFavientTargets();
};

// Dense, label-less swatches in the picker-wall idiom (small + tightly packed).
const SWATCH_W = 46;
const SWATCH_H = 22;

/** A 256×1 canvas of an RGB ramp — the source the swatch + hover zoom both blit from. */
const ramp256Canvas = (ramp: RGB[]): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = Math.round(ramp[i].r);
      img.data[i * 4 + 1] = Math.round(ramp[i].g);
      img.data[i * 4 + 2] = Math.round(ramp[i].b);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  return c;
};

const FavientSwatch: React.FC<{
  fav: Favient;
  onApply: (fav: Favient) => void;
  onRemove: (id: string) => void;
  onHover: (h: GradientHover | null) => void;
}> = ({ fav, onApply, onRemove, onHover }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  // Render the swatch in DISPLAY sRGB (always) — the picker wall does too. The stored
  // colorSpace describes how the gradient bakes for the SHADER (often 'linear'); honouring
  // it here would show linear values raw and look dull. blendSpace stays as authored.
  const ramp = useMemo(() => renderStopsToRamp(fav.config.stops, fav.config.blendSpace ?? 'oklab', 'srgb'), [fav.config]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(SWATCH_W * dpr);
    cv.height = Math.round(SWATCH_H * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(ramp256Canvas(ramp), 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [ramp]);

  // Grow + name on hover (shared GradientHoverPreview, like the picker wall).
  const showHover = () => {
    const cv = ref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const ew = SWATCH_W * 3,
      eh = SWATCH_H * 2;
    onHover({
      ex: r.left + r.width / 2 - ew / 2,
      ey: r.top + r.height / 2 - eh / 2,
      ew,
      eh,
      paint: (ctx, w, h) => {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(ramp256Canvas(ramp), 0, 0, 256, 1, 0, 0, w, h);
      },
      name: fav.name,
      sub: fav.source ? `· ${fav.source}` : undefined,
    });
  };

  return (
    <div
      className="group relative shrink-0"
      draggable
      onDragStart={(e) => {
        onHover(null);
        setFavientDrag(e.dataTransfer, { config: fav.config, name: fav.name, source: fav.source });
      }}
      onMouseEnter={showHover}
      onMouseLeave={() => onHover(null)}
      title={`${fav.name}${fav.source ? ` · ${fav.source}` : ''}\nClick to apply · drag onto a target`}
    >
      <button
        onClick={() => onApply(fav)}
        className="block rounded-[2px] ring-1 ring-white/10 hover:ring-amber-300/80 transition cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <canvas ref={ref} style={{ width: SWATCH_W, height: SWATCH_H }} className="block" />
      </button>
      <button
        onClick={() => onRemove(fav.id)}
        title="Remove"
        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/85 text-gray-300 text-[9px] leading-none opacity-0 group-hover:opacity-100 hover:bg-red-500/80 hover:text-white transition flex items-center justify-center z-20"
      >
        ×
      </button>
    </div>
  );
};

export const FavientsPanel: React.FC = () => {
  const favients = useFavientsStore((s) => s.favients);
  const remove = useFavientsStore((s) => s.remove);
  const add = useFavientsStore((s) => s.add);
  const isFav = useFavientsStore((s) => s.isFav);
  const selectedTargetId = useFavientsStore((s) => s.selectedTargetId);
  const setSelectedTarget = useFavientsStore((s) => s.setSelectedTarget);
  const targets = useFavientTargets();
  const [dropActive, setDropActive] = useState(false);
  const [hover, setHover] = useState<GradientHover | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1300);
  };

  // Resolve the active target (fall back to the first registered one).
  const activeTarget = getFavientTarget(selectedTargetId) ?? targets[0];

  const onApply = (fav: Favient) => {
    if (!activeTarget) {
      flash('No apply target available here');
      return;
    }
    activeTarget.apply(fav.config, fav.name);
    flash(`${fav.name} → ${activeTarget.label}`);
  };

  // Drop a gradient (dragged from the Picker wall or another surface) here to favourite it.
  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dropActive) setDropActive(true);
  };
  const onDrop = (e: React.DragEvent) => {
    const p = readFavientDrag(e.dataTransfer);
    setDropActive(false);
    if (!p) return;
    e.preventDefault();
    if (isFav(p.config)) {
      flash('Already in Favients');
      return;
    }
    add(p.config, p.name, p.source ?? 'Saved');
    flash(`Added ${p.name}`);
  };

  return (
    <div
      className={`flex flex-col h-full min-h-0 bg-zinc-900/95 text-gray-200 ${dropActive ? 'ring-2 ring-amber-300/70 ring-inset' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={() => setDropActive(false)}
      onDrop={onDrop}
    >
      <div className="px-2.5 py-2 border-b border-white/10 shrink-0 flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 shrink-0">Applying to</span>
        {targets.length ? (
          <GenericDropdown
            value={activeTarget?.id ?? ''}
            options={targets.map((t) => ({ label: t.label, value: t.id }))}
            onChange={(v) => setSelectedTarget(v as string)}
            fullWidth
          />
        ) : (
          <span className="text-[10px] text-gray-600 italic">no targets in this app</span>
        )}
        <span className="ml-1 text-[10px] text-gray-500 tabular-nums shrink-0">{favients.length}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {favients.length ? (
          <div className="flex flex-wrap gap-[3px] content-start">
            {favients.map((f) => (
              <FavientSwatch key={f.id} fav={f} onApply={onApply} onRemove={remove} onHover={setHover} />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center px-4">
            <div className="text-[11px] text-gray-500 leading-relaxed">
              <div className="text-2xl mb-2 opacity-60">★</div>
              Star a gradient in the Generator or Image, or drag one in from the Picker.
              <div className="mt-1 text-gray-600">Click a swatch to apply · drag it onto a slot.</div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/85 text-gray-100 text-[11px] px-3 py-1.5 rounded-full border border-white/10 shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      <GradientHoverPreview hover={hover} />
    </div>
  );
};

export default FavientsPanel;
