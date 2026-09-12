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
 *   • dim — the image is loaded but no longer what you see (a new pick, a stop edit, a dial
 *     in another face — NOT merely leaving the face, which bakes it unchanged): the picture
 *     greys and shrinks to an 84 px thumbnail, animated over 300 ms; clicking it makes the
 *     image the source again (owner, 2026-09-07).
 *   • active — the Image source is the working input: a 2 px accent outline (V3, accent
 *     means "this one"). Phase C turns the click into a tray toggle instead of a tab.
 *
 * Radius 8 (V2: something you press), hairline `line/20` (V8) — `gradientBarClass` is not
 * used here because the slot is a picture, not a gradient bar; it borrows its rules.
 *
 * PHONE (Phase F, 2026-09-10). A 390 px card has no column to spare, so the slot splits in
 * two and the two halves are never mounted at once:
 *   • `compact` — the DOOR, a 26 px button in the hero's header row alongside the use
 *     icons. The photo glyph while empty, the stored thumbnail once an image is in. It
 *     mounts NO `ImageStage`: it is a button, and the pane it used to carry has moved.
 *   • `width` — the PICTURE at a given pixel width, which on a phone is the tray's Image
 *     face (the shell hands it to `ExtractStage`'s `slot`). Everything the picture does —
 *     the Path handles, the cloud ↔ pixel hover link, Replace — happens there, where there
 *     is room for it, and the door is what opens it.
 * So on a phone the slot DOES unmount when the Image face closes. The rule it breaks was
 * about the slot never moving on a card wide enough to hold it; the model, the thumbnail
 * and the path all live in `imageStore`, so nothing is lost by the pane going away.
 *
 * @see docs/adr/0115-the-shell-on-a-phone.md
 */

import React, { useMemo } from 'react';
import { useImageStore } from '../../palette/store/imageStore';
import { ImageStage, type ImageStageFaceProps } from '../../palette/components/ImageStage';
import { Icon } from './ui/Icon';

interface Props extends ImageStageFaceProps {
  /** The Image source is the working input. */
  active: boolean;
  /** The image is loaded but no longer what you see (another gradient, an edit): the picture
   *  greys and shrinks to a thumbnail — animated, and only on that change (owner). */
  dim?: boolean;
  /** Skip the 300 ms grow/ungrey. Set while the eyedropper is open: it samples what is
   *  PAINTED, so a picture still animating out of its dimmed state hands back a colour part
   *  way between grey and the photo (§8b item 8). */
  instant?: boolean;
  /** The full picture's height (px): the panel's height minus the column's padding. The
   *  slot never sizes the card; the panel does. */
  bigH: number;
  /** PHONE: the DOOR instead of the picture — a 26 px button in the hero's header row.
   *  Mounts no `ImageStage`; the pane lives in the tray's Image face there. */
  compact?: boolean;
  /** PHONE: draw the picture at this pixel WIDTH (its height follows the aspect, capped by
   *  `PHONE_MAX_H`) instead of at `bigH`. The face is the one wide thing on a phone, so
   *  width is what is known and height is what follows — the reverse of the card. */
  width?: number;
  onClick: () => void;
}

/** The widest the full picture may go, as a MULTIPLE OF ITS OWN HEIGHT (owner, 2026-09-12:
 *  "loading a wide image is taking too much of the screen"). A flat pixel cap was wrong at
 *  both ends — it let a panorama eat the panel at a tall `bigH` and clipped a merely-wide
 *  photo at a short one. Tying it to the height the card already chose keeps the picture in
 *  proportion to the room it was given: past 1.2:1 the image is letterboxed by its own width
 *  cap, which is what a 3:1 panorama should look like in a slot this shape. */
const MAX_W_PER_H = 1.2;
/** The dimmed thumbnail: as tall as the empty slot, at the image's aspect, capped. */
const SMALL_H = 84;
const SMALL_MAX_W = 150;
/** Phone, in the face: a portrait photo must still leave room for the methods under it. */
const PHONE_MAX_H = 220;
/** The door: the same 26 px square as every icon `Act` in the header row it joins. */
const DOOR = 26;

export const ImageSlot: React.FC<Props> = ({ active, dim = false, instant = false, bigH, compact = false, width, onClick, cloudHost, toolsHost, handles = false }) => {
  const model = useImageStore((s) => s.model);
  const thumb = useImageStore((s) => s.thumb);
  const ring = active ? 'outline outline-2 outline-accent-400 outline-offset-2' : '';
  // The door's picture. `thumb` is a canvas the store already keeps; one `toDataURL` per
  // image (memoised on the canvas identity) is cheaper than mounting a second stage, and a
  // 26 px button has nothing to gain from a live one.
  const thumbUrl = useMemo(() => {
    if (!compact || !thumb) return null;
    try { return thumb.toDataURL(); } catch { return null; }
  }, [compact, thumb]);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={model ? 'The image this gradient comes from — tap for the Image face' : 'Drop an image anywhere, or tap to choose one'}
        aria-label={model ? 'Open the Image face' : 'Choose an image'}
        data-gx-image-slot={model ? 'door' : 'door-empty'}
        style={{ width: DOOR, height: DOOR, backgroundImage: thumbUrl ? `url(${thumbUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
        className={`shrink-0 rounded-lg flex items-center justify-center overflow-hidden border transition-colors ${
          model ? 'border-line/25' : 'border-dashed border-line/40 text-fg-muted hover:border-accent-400 hover:text-accent-300'
        } ${ring}`}
      >
        {!model && <Icon name="photo" size={15} />}
      </button>
    );
  }

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

  const ar = model.w / Math.max(1, model.h);
  const wide = width != null;
  // The full picture on a desk: the width cap is what bites on a panorama, and the height
  // then FOLLOWS it. Capping the width alone would letterbox the picture inside its own
  // bordered box (ImageStage centres at the source aspect — `paneRect`), leaving dead bands
  // top and bottom; shrinking the box instead keeps it hugging the picture.
  const bigW = Math.min(Math.round(bigH * MAX_W_PER_H), Math.round(bigH * ar));
  const h = wide ? Math.min(PHONE_MAX_H, Math.round(width! / Math.max(0.05, ar))) : dim ? SMALL_H : Math.min(bigH, Math.round(bigW / Math.max(0.05, ar)));
  const w = wide ? Math.min(width!, Math.round(h * ar)) : dim ? Math.min(SMALL_MAX_W, Math.round(SMALL_H * ar)) : bigW;

  // The picture at its own aspect, hosting the image pane. With the face closed a
  // transparent button over it opens the face (the pane is not interactive then); with it
  // open the pane takes the pointer for the Path handles.
  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-line/20 bg-surface-viewport ${ring}`}
      style={{
        width: w,
        height: h,
        filter: dim ? 'grayscale(1)' : 'none',
        opacity: dim ? 0.55 : 1,
        transition: instant ? 'none' : 'width 300ms ease, height 300ms ease, filter 300ms ease, opacity 300ms ease',
      }}
      title={handles ? undefined : dim ? 'The image this gradient came from — click to work from it again' : 'The image this gradient comes from — click for the Image face'}
      data-gx-image-slot={dim ? 'dim' : 'live'}
    >
      <ImageStage chrome="face" cloudHost={cloudHost} toolsHost={toolsHost} handles={handles} />
      {!handles && <button type="button" className="absolute inset-0" onClick={onClick} aria-label="Open the Image face" />}
    </div>
  );
};

export default ImageSlot;
