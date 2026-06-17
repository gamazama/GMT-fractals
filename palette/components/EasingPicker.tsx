/**
 * EasingPicker — a visual grid for choosing an easing curve. The raw names
 * ("inOutQuint") mean nothing to users, so each option is shown as a little graph of
 * the curve (easingThumb), with the name as a caption. Hovering a tile shows an
 * enlarged preview via the shared GradientHoverPreview primitive (the same overlay the
 * gradient swatches use), so the small-thumbnail + big-centre-preview pattern matches
 * the app-gmt FormulaPicker.
 *
 * Centred modal (like GradientSourcePicker) so it is never clipped by the generator
 * canvas's scroll container. Value/onChange speak EASING INDEX (into EASING_NAMES) —
 * the same int the cb*Easing DDFS param stores.
 */

import React, { useEffect, useState } from 'react';
import { EASING_NAMES, getEasing } from '../core/easings';
import { easingThumb, drawEasingCurve } from './easingThumb';
import { GradientHoverPreview, type GradientHover } from './GradientHoverPreview';

const TILE_W = 56;
const TILE_H = 40;
const PREVIEW = 180;

export const EasingPicker: React.FC<{
  value: number;
  onChange: (index: number) => void;
  onClose: () => void;
}> = ({ value, onChange, onClose }) => {
  const [hover, setHover] = useState<GradientHover | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const showPreview = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const fn = getEasing(EASING_NAMES[i]);
    setHover({
      ex: r.left + r.width / 2 - PREVIEW / 2,
      ey: r.top - PREVIEW - 10,
      ew: PREVIEW,
      eh: PREVIEW,
      paint: (ctx, w, h) => drawEasingCurve(ctx, w, h, fn, { bg: '#0b0b0d', lineWidth: 2 }),
      name: EASING_NAMES[i],
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[min(420px,92vw)] max-h-[72vh] flex flex-col bg-zinc-900 border border-white/15 rounded-md shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10">
          <span className="text-[11px] font-semibold text-gray-300">Easing curve</span>
          <span className="text-[10px] text-gray-500">hover to enlarge · click to choose</span>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-200 text-sm leading-none px-1">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-2 grid grid-cols-4 gap-1.5" onMouseLeave={() => setHover(null)}>
          {EASING_NAMES.map((name, i) => {
            const selected = i === value;
            const src = easingThumb(name, TILE_W, TILE_H);
            return (
              <button
                key={name}
                onClick={() => {
                  onChange(i);
                  onClose();
                }}
                onMouseEnter={(e) => showPreview(i, e.currentTarget)}
                title={name}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1 rounded-sm p-1.5 transition-colors ${
                  selected ? 'bg-cyan-500/20 ring-1 ring-cyan-400/60' : 'hover:bg-white/[0.06]'
                }`}
              >
                {src ? (
                  <img src={src} width={TILE_W} height={TILE_H} alt={name} className="rounded-[2px]" />
                ) : (
                  <div style={{ width: TILE_W, height: TILE_H }} className="rounded-[2px] bg-black/40" />
                )}
                <span className={`text-[9px] leading-tight truncate w-full text-center ${selected ? 'text-cyan-200' : 'text-gray-400'}`}>
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <GradientHoverPreview hover={hover} />
    </div>
  );
};

export default EasingPicker;
