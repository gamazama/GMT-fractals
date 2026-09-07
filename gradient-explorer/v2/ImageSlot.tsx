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
 *   • filled — THE PICTURE (owner, 2026-09-07, C.6 second take: "the hero's own slot is
 *     the preview"): the image at its own aspect, as tall as the card allows minus 16 px
 *     above and below, at most 520 px wide, hosting `ImageStage chrome="face"` — the pane
 *     that draws the Path handles while the Image face is open (`handles`) and carries the
 *     Replace button; its tools and colour cloud portal into the tray's Image face
 *     (`toolsHost` / `cloudHost`). The card's grid column is `auto`, so the panel gives way.
 *   • active — the Image source is the working input: a 2 px accent outline (V3, accent
 *     means "this one"). Phase C turns the click into a tray toggle instead of a tab.
 *
 * Radius 8 (V2: something you press), hairline `line/20` (V8) — `gradientBarClass` is not
 * used here because the slot is a picture, not a gradient bar; it borrows its rules.
 */

import React from 'react';
import { useImageStore } from '../../palette/store/imageStore';
import { ImageStage, type ImageStageFaceProps } from '../../palette/components/ImageStage';
import { Icon } from './ui/Icon';

interface Props extends ImageStageFaceProps {
  /** The Image source is the working input. */
  active: boolean;
  onClick: () => void;
}

/** The widest the loaded picture may go (px) — a panorama must not eat the panel. */
const MAX_W = 520;

export const ImageSlot: React.FC<Props> = ({ active, onClick, cloudHost, toolsHost, handles = false }) => {
  const model = useImageStore((s) => s.model);
  const ring = active ? 'outline outline-2 outline-accent-400 outline-offset-2' : '';

  if (!model) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Drop an image anywhere, or click to choose one"
        className={`w-[45px] h-[84px] rounded-lg flex items-center justify-center border border-dashed border-line/40 text-fg-muted hover:border-accent-400 hover:text-accent-300 transition-colors ${ring}`}
      >
        <Icon name="photo" size={18} />
      </button>
    );
  }

  // The picture at its own aspect, as tall as the card allows, hosting the image pane. With
  // the face closed a transparent button over it opens the face (the pane is not
  // interactive then); with it open the pane takes the pointer for the Path handles.
  return (
    <div
      className={`relative h-full rounded-lg overflow-hidden border border-line/20 bg-surface-viewport ${ring}`}
      style={{ aspectRatio: `${model.w} / ${model.h}`, maxWidth: MAX_W }}
      title={handles ? undefined : 'The image this gradient comes from — click for the Image face'}
    >
      <ImageStage chrome="face" cloudHost={cloudHost} toolsHost={toolsHost} handles={handles} />
      {!handles && <button type="button" className="absolute inset-0" onClick={onClick} aria-label="Open the Image face" />}
    </div>
  );
};

export default ImageSlot;
