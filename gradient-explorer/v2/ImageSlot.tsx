/**
 * ImageSlot — the hero's SOURCE column (plans/ge-v2-unified-shell-plan.md §4 Phase B, L3:
 * "the image is a fixed slot on the hero's left"; reshaped to the owner's Figma frame
 * "Hero v3 (agreed)" on 2026-09-07 — plans/ge-v2-figma/hero-spec.md §7a).
 *
 * Three states, one place — the slot never moves and never unmounts:
 *   • empty  — a SLIM optional input: 45 × 84, dashed hairline, a photo glyph and no
 *     words (owner: "it reads well as an optional input"; less text on screen). Dropping
 *     an image ANYWHERE in the shell fills it (the root-mounted `useImageDrop` in
 *     GradientExplorerV2App routes to Extract); clicking it switches to the Image
 *     source, where the stage's own drop / file-pick path lives.
 *   • filled — the ingested image's thumbnail (`imageStore.thumb`, an HTMLCanvasElement
 *     the img2grad ingest sets alongside the model; drawn as a data URL so it survives
 *     React's re-renders without re-parenting a live canvas node). The slot GROWS to the
 *     largest square the card's height allows (`h-full aspect-square`) — the card's grid
 *     column is `auto`, so the gradient panel gives way.
 *   • active — the Image source is the working input: a 2 px accent outline (V3, accent
 *     means "this one"). Phase C turns the click into a tray toggle instead of a tab.
 *
 * Radius 8 (V2: something you press), hairline `line/20` (V8) — `gradientBarClass` is not
 * used here because the slot is a picture, not a gradient bar; it borrows its rules.
 */

import React, { useEffect, useState } from 'react';
import { useImageStore } from '../../palette/store/imageStore';
import { Icon } from './ui/Icon';

interface Props {
  /** The Image source is the working input. */
  active: boolean;
  onClick: () => void;
}

export const ImageSlot: React.FC<Props> = ({ active, onClick }) => {
  const thumb = useImageStore((s) => s.thumb);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!thumb) return setSrc(null);
    try {
      setSrc(thumb.toDataURL('image/png'));
    } catch {
      setSrc(null); // a tainted canvas (cross-origin source) — the slot stays a placeholder
    }
  }, [thumb]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={src ? 'The image this gradient can be extracted from — click for the Image source' : 'Drop an image anywhere, or click to open the Image source'}
      style={src ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      className={[
        'rounded-lg flex items-center justify-center transition-colors overflow-hidden',
        src
          ? 'h-full aspect-square border border-line/20'
          : 'w-[45px] h-[84px] border border-dashed border-line/40 text-fg-muted hover:border-accent-400 hover:text-accent-300',
        active ? 'outline outline-2 outline-accent-400 outline-offset-2' : '',
      ].join(' ')}
    >
      {!src && <Icon name="photo" size={18} />}
    </button>
  );
};

export default ImageSlot;
