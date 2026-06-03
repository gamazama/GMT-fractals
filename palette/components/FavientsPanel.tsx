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
import { setFavientDrag } from '../core/favientDnd';
import { renderStopsToRamp } from '../core/gmtGradient';

/** Re-render when hosts (re)register apply targets. */
const useFavientTargets = () => {
  const [, force] = useState(0);
  useEffect(() => subscribeFavientTargets(() => force((n) => n + 1)), []);
  return getFavientTargets();
};

const FavientSwatch: React.FC<{
  fav: Favient;
  onApply: (fav: Favient) => void;
  onRemove: (id: string) => void;
}> = ({ fav, onApply, onRemove }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const ramp = useMemo(() => renderStopsToRamp(fav.config.stops, fav.config.blendSpace, fav.config.colorSpace), [fav.config]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const src = document.createElement('canvas');
    src.width = 256;
    src.height = 1;
    const sc = src.getContext('2d');
    if (!sc) return;
    const img = sc.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = Math.round(ramp[i].r);
      img.data[i * 4 + 1] = Math.round(ramp[i].g);
      img.data[i * 4 + 2] = Math.round(ramp[i].b);
      img.data[i * 4 + 3] = 255;
    }
    sc.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(src, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
  }, [ramp]);

  return (
    <div
      className="group relative shrink-0"
      draggable
      onDragStart={(e) => setFavientDrag(e.dataTransfer, { config: fav.config, name: fav.name })}
      title={`${fav.name}${fav.source ? ` · ${fav.source}` : ''}\nClick to apply · drag onto a target`}
    >
      <button
        onClick={() => onApply(fav)}
        className="block w-[76px] rounded-md ring-1 ring-white/10 hover:ring-amber-300/60 transition cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <canvas ref={ref} width={152} height={36} className="block w-full h-7" />
      </button>
      <div className="mt-0.5 w-[76px] truncate text-[9px] text-gray-500 leading-tight px-0.5">{fav.name}</div>
      <button
        onClick={() => onRemove(fav.id)}
        title="Remove"
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black/80 text-gray-300 text-[10px] leading-none opacity-0 group-hover:opacity-100 hover:bg-red-500/80 hover:text-white transition flex items-center justify-center"
      >
        ×
      </button>
    </div>
  );
};

export const FavientsPanel: React.FC = () => {
  const favients = useFavientsStore((s) => s.favients);
  const remove = useFavientsStore((s) => s.remove);
  const selectedTargetId = useFavientsStore((s) => s.selectedTargetId);
  const setSelectedTarget = useFavientsStore((s) => s.setSelectedTarget);
  const targets = useFavientTargets();

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

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-900/95 text-gray-200">
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

      <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
        {favients.length ? (
          <div className="flex flex-wrap gap-2.5">
            {favients.map((f) => (
              <FavientSwatch key={f.id} fav={f} onApply={onApply} onRemove={remove} />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center px-4">
            <div className="text-[11px] text-gray-500 leading-relaxed">
              <div className="text-2xl mb-2 opacity-60">★</div>
              Star a gradient in the Generator, Image, or Picker to keep it here.
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
    </div>
  );
};

export default FavientsPanel;
