/**
 * Icon — the v2 icon set (plans/ge-v2-unified-shell-plan.md §1 V6: "One icon set, one
 * weight. 16 px stroke glyphs in `currentColor`").
 * One inline-SVG per name, 16x16 viewBox, `fill:none; stroke:currentColor;
 * strokeWidth:1.5; round caps/joins` — except the two filled families below, `FILLED` (the
 * hero's use glyphs) and `SOLID` (the Paint face's brushes and toggles).
 *
 * Every emoji / unicode glyph in the v2 files this component covers (↶ ↷ ▾ ▴ ✕ ⚙ etc.)
 * is replaced with `<Icon name=… />` at its call site (V6: "No emoji, no unicode glyph
 * buttons").
 *
 * OWNER'S GLYPHS (H:\GMT\assets\GXN\someIcons2.svg, 2026-09-10) — undo, redo, zoom,
 * zoomOut, box, lasso, brush and settings are the owner's own drawings, the second sheet
 * after the picker's (see components/gradient/pickerIcons.tsx for the same house rules).
 * They are the authored geometry, refitted from the sheet's 8-unit tiles onto this 16-unit
 * grid with the ink filling 2.2 … 13.8 — NOT re-typed by hand, and NOT framed at the exact
 * bounding box, which is what clipped every stroke the first time the picker's sheet came
 * in (see commit b1361884). box and lasso are DASHED as drawn: they are the wall's carve
 * tools and a dashed outline is what a marquee means.
 *
 * DRAFTED FOR THE OWNER (2026-09-24 polish pass) — help, back, split, handles, dither, landscape,
 * portrait. The owner's sheets hold none of these, so they were drawn here, rasterised at 16 px
 * and magnified beside their real neighbours, and the owner picked one per need from that sheet.
 * Where they could, they reuse the owner's geometry: `back`'s head IS `undo`'s refit head on a
 * straight shaft, and `split`'s frame is `box`'s refit rounded square (radius 1.74), drawn solid.
 * `dither`'s dots sit on pixel centres at 16 px, 3 apart — 1.5 of ink, 1.5 of air — so they stay
 * dots instead of greying into a patch; its first column is solid so the glyph has enough ink to
 * read beside the toolbar's text. `landscape` / `portrait` carry a phone's home bar (a BAR, not a
 * dot: a 1.5 dot rasterised to a smudge), and their corner is 1.2 because at 1.74 the upright
 * frame read as a digit 0 beside the word Portrait. They replace the Wallpaper toolbar's ⇅ ◉ ▦,
 * the Export panel's ▭ ▯, the desk top bar's old-set `?` and the phone menu's empty Back slot.
 *
 * THE PAINT FACE'S BRUSHES ARE SOLID (owner, 2026-09-25: line drafts "not really a fan, I'd prefer
 * if they look more like the photoshop icons", with a sheet of Photoshop-style tool glyphs) —
 * `SOLID` below: paintBrush (with its ferrule), clone (a rubber stamp), smudge (a pointing hand),
 * tone (a half-filled disc), soften (a drop), sharpen (a spike), on a 24-unit box like the hero's
 * FILLED family, drawn here and refined with the owner over three rounds, each rendered at 16 px
 * and magnified. Restore kept its line glyph at the owner's word. The stroke TOGGLES beside them
 * (mirror, wrap, height) went solid the same day to match — see their notes in `SOLID`.
 *
 * WEIGHT. The set is one weight, 1.5 (V6). Two glyphs' worth of exception, `WEIGHT` below:
 * a glyph whose parts share the box needs air or it fills in at 16 px — the gear's teeth
 * fuse into a disc and the two dashed outlines clog into solid ones. Checked by rasterising
 * at 16 px and magnifying, not by eye at 64. Same hierarchy the picker's sheet carries.
 *
 * The one-weight rule, the density exception and "rasterise at 16 px to judge a glyph"
 * are the shell's visual language, recorded with the reasoning that produced them:
 * @see docs/adr/0114-the-unified-shell-visual-language.md
 */

import React from 'react';

export type IconName =
  | 'zoom'
  | 'zoomOut'
  | 'box'
  | 'lasso'
  | 'brush'
  | 'undo'
  | 'redo'
  | 'chevronDown'
  | 'chevronRight'
  | 'chevronUp'
  | 'settings'
  | 'close'
  | 'plus'
  | 'swap'
  | 'trash'
  | 'list'
  | 'grid'
  | 'heart'
  | 'share'
  | 'download'
  | 'photo'
  | 'fullscreen'
  | 'help'
  | 'back'
  | 'split'
  | 'handles'
  | 'dither'
  | 'landscape'
  | 'portrait'
  | 'paintBrush'
  | 'smudge'
  | 'soften'
  | 'sharpen'
  | 'tone'
  | 'clone'
  | 'restore'
  | 'mirror'
  | 'wrap'
  | 'height'
  | 'wallHide'
  | 'wallShow';

/**
 * The hero's USE glyphs — the owner's pick in Figma (GE v2 Hero, 2026-09-07): Material
 * Symbols "favorite" (heart), "share", "download", "photo", plus "fullscreen" in the same
 * family for Wallpaper. FILLED, 24-unit viewBox, drawn in `currentColor` — a second style
 * beside the 16 px stroke set, used by the hero header and the image slot, and `download` by
 * the Export window's rows and the set rail too. `heart` is the button that keeps a gradient.
 */
const FILLED: Record<'heart' | 'share' | 'download' | 'photo' | 'fullscreen', string> = {
  heart:
    'M12 21l-1.45-1.3C8.87 18.18 7.48 16.88 6.38 15.78 5.28 14.68 4.4 13.69 3.75 12.83 3.1 11.94 2.64 11.13 2.38 10.4 2.13 9.67 2 8.92 2 8.15c0-1.57.53-2.88 1.58-3.93S5.93 2.65 7.5 2.65c.87 0 1.69.18 2.48.55.78.37 1.45.88 2.02 1.55.57-.67 1.24-1.18 2.03-1.55.78-.37 1.6-.55 2.47-.55 1.57 0 2.88.53 3.93 1.58S22 6.58 22 8.15c0 .77-.13 1.52-.4 2.25-.25.73-.7 1.54-1.35 2.43-.65.86-1.53 1.85-2.63 2.95-1.1 1.1-2.49 2.4-4.17 3.92L12 21zm0-2.7c1.6-1.43 2.92-2.66 3.95-3.68 1.03-1.03 1.85-1.92 2.45-2.67.6-.77 1.02-1.44 1.25-2.03.23-.6.35-1.19.35-1.77 0-1-.33-1.83-1-2.5s-1.5-1-2.5-1c-.78 0-1.51.23-2.18.68-.67.43-1.12.99-1.37 1.67h-1.9c-.25-.68-.71-1.24-1.38-1.67C8.99 4.88 8.27 4.65 7.5 4.65c-1 0-1.83.33-2.5 1S4 7.15 4 8.15c0 .58.12 1.17.35 1.77.23.59.65 1.26 1.25 2.03.6.75 1.42 1.64 2.45 2.67 1.03 1.02 2.35 2.25 3.95 3.68z',
  share:
    'M17 22c-.83 0-1.54-.29-2.13-.88C14.29 20.54 14 19.83 14 19c0-.1.03-.33.08-.7l-7.03-4.1c-.27.25-.58.45-.93.59-.35.14-.72.21-1.12.21-.83 0-1.54-.29-2.13-.88C2.29 13.54 2 12.83 2 12s.29-1.54.88-2.13C3.46 9.29 4.17 9 5 9c.4 0 .78.07 1.13.21.35.14.66.34.92.59l7.03-4.1c-.03-.12-.05-.23-.06-.34S14 5.13 14 5c0-.83.29-1.54.88-2.13C15.46 2.29 16.17 2 17 2s1.54.29 2.13.88C19.71 3.46 20 4.17 20 5s-.29 1.54-.88 2.13C18.54 7.71 17.83 8 17 8c-.4 0-.78-.07-1.13-.21-.35-.14-.66-.34-.92-.59l-7.03 4.1c.03.12.05.23.06.34.01.11.02.23.02.36s-.01.25-.02.36c-.01.11-.03.22-.06.34l7.03 4.1c.27-.25.58-.45.93-.59.35-.14.72-.21 1.12-.21.83 0 1.54.29 2.13.88.58.58.87 1.29.87 2.12s-.29 1.54-.88 2.13c-.58.58-1.29.87-2.12.87z',
  download:
    'M12 16l-5-5 1.4-1.45 2.6 2.6V4h2v8.15l2.6-2.6L17 11l-5 5zm-6 4c-.55 0-1.02-.2-1.41-.59C4.2 19.02 4 18.55 4 18v-3h2v3h12v-3h2v3c0 .55-.2 1.02-.59 1.41-.39.39-.86.59-1.41.59H6z',
  photo:
    'M5 21c-.55 0-1.02-.19-1.43-.58C3.19 20.03 3 19.55 3 19V5c0-.55.19-1.02.58-1.4C3.97 3.2 4.45 3 5 3h14c.55 0 1.02.2 1.4.6.4.38.6.85.6 1.4v14c0 .55-.2 1.03-.6 1.43-.38.38-.85.57-1.4.57H5zm0-2h14V5H5v14zm1-2h12l-3.75-5-3 4L9 13l-3 4z',
  fullscreen: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
};

/**
 * The Paint face's brushes — SOLID glyphs on a 24-unit box, Photoshop's tool shapes (see the
 * header). A map of nodes rather than FILLED's single paths, because the hand is drawn upright
 * and turned (`rotate`), which a bare `d` cannot say.
 */
const SOLID: Record<'paintBrush' | 'clone' | 'smudge' | 'tone' | 'soften' | 'sharpen' | 'mirror' | 'wrap' | 'height', React.ReactNode> = {
  // Material's "brush" blob on a handle that TAPERS to its end (owner, 2026-09-25: "needs taper";
  // a separate ferrule band read as an extra segment)
  paintBrush: <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zM9 12.25 11.75 15l8.9-9.6a.95.95 0 0 0-1.35-1.35z" />,
  // knob, neck, pad and the line it stamps — the line a little narrower than the pad (owner)
  clone: <path d="M12 2.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 1 1 0-6.8zM10.3 9h3.4v3.4h-3.4zM5.2 14c0-.9.7-1.6 1.6-1.6h10.4c.9 0 1.6.7 1.6 1.6v3.1H5.2zM6.6 18.6h10.8V21H6.6z" />,
  // a pointing hand drawn upright (finger, the curled fingers' block with the thumb, the cuff) and
  // turned to point down-left, its fingertip SMEARING off to the left (owner, 2026-09-25: "the
  // finger should be smearing to the left slightly at the fingertip") — the smear starts on the
  // tip itself, so it reads as the finger's own mark rather than a line beside it
  smudge: (
    <>
      <g transform="rotate(225 12 12)">
        <path d="M9.2 3.6a1.6 1.6 0 0 1 3.2 0V10H9.2z" />
        <path d="M9.2 9.2h6.4a2.6 2.6 0 0 1 2.6 2.6v4.4a3.4 3.4 0 0 1-3.4 3.4h-3.6a3.4 3.4 0 0 1-3.4-3.4v-2.4l-1.3-1.5a1.3 1.3 0 0 1 1.9-1.8l.8.8z" />
        <path d="M9.6 20.4h6.6v2H9.6z" />
      </g>
      <path d="M7.4 17.1C5.6 17.8 3.6 18.9 1.4 20.2c2.2.3 4.3.4 6.3.2z" />
    </>
  ),
  // a ring (outer clockwise, inner counter-clockwise: a hole under nonzero) and half its disc
  tone: <path d="M12 3a9 9 0 1 1 0 18 9 9 0 1 1 0-18zm0 2a7 7 0 1 0 0 14 7 7 0 1 0 0-14zm4.95 2.05A7 7 0 0 1 7.05 16.95z" />,
  // a drop with a fine tip leaning a little to the left (owner: "a finer curve at the top of the
  // drop and a slight bias towards one side", then "inverted (L/R)") — drawn leaning right, mirrored
  soften: (
    <g transform="translate(24 0) scale(-1 1)">
      <path d="M13 1.8c-.3 3.1-7.9 7.5-7.9 13a6.9 6.9 0 0 0 13.8 0c0-4.6-4.9-8-5.9-13z" />
    </g>
  ),
  // a tall spike with curved-in sides, not an even triangle (owner: "sharpen is not normally a
  // perfect triangle")
  sharpen: <path d="M12 2.5C12.6 8 14.8 15 16.8 21H7.2C9.2 15 11.4 8 12 2.5z" />,
  // THE STROKE TOGGLES (2026-09-25, solid to match the brushes; the owner may swap any — the
  // alternatives drawn beside them were two triangles on an axis, and an up-arrow on a baseline).
  // Mirror: Photoshop's symmetry butterfly — one wing, the same wing mirrored, the axis between.
  mirror: (
    <>
      <path d="M11.2 7.6C9.6 4.3 6 3 4 4.1 2.1 5.2 2.6 8.5 5.3 10.4 3.4 11.6 3.1 14.4 4.9 15.7c1.9 1.4 4.8.2 6.3-3.3z" />
      <g transform="translate(24 0) scale(-1 1)"><path d="M11.2 7.6C9.6 4.3 6 3 4 4.1 2.1 5.2 2.6 8.5 5.3 10.4 3.4 11.6 3.1 14.4 4.9 15.7c1.9 1.4 4.8.2 6.3-3.3z" /></g>
      <rect x="11.5" y="4.5" width="1" height="15" rx=".5" />
    </>
  ),
  // Wrap: the gradient's bar, and an arrow that leaves one end and comes back in at the other.
  wrap: (
    <>
      <rect x="3" y="6" width="18" height="4.4" rx="2.2" />
      <path d="M19.2 12.6v1.6a3.2 3.2 0 0 1-3.2 3.2H8.2A3.2 3.2 0 0 1 5 14.2v-.4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M2 15.2 5 11.6l3 3.6z" />
    </>
  ),
  // Height = strength: levels rising — the higher on the gradient, the stronger the brush.
  height: (
    <>
      <rect x="3.5" y="14.5" width="4.4" height="6" rx="1.2" />
      <rect x="9.8" y="9.5" width="4.4" height="11" rx="1.2" />
      <rect x="16.1" y="3.5" width="4.4" height="17" rx="1.2" />
    </>
  ),
};

const PATHS: Record<Exclude<IconName, keyof typeof FILLED | keyof typeof SOLID>, React.ReactNode> = {
  zoom: <path d="M13.8 13.73L11.08 11.01M7.36 5.42L7.36 9.29M5.49 7.43L9.36 7.43M12.51 7.43C12.51 10.29 10.22 12.58 7.36 12.58 4.49 12.58 2.2 10.29 2.2 7.43 2.2 4.56 4.49 2.27 7.36 2.27 10.22 2.27 12.51 4.56 12.51 7.43Z" />,
  zoomOut: <path d="M13.8 13.73L11.08 11.01M5.49 7.43L9.36 7.43M12.51 7.43C12.51 10.29 10.22 12.58 7.36 12.58 4.49 12.58 2.2 10.29 2.2 7.43 2.2 4.56 4.49 2.27 7.36 2.27 10.22 2.27 12.51 4.56 12.51 7.43Z" />,
  box: <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.74" strokeDasharray="2.76" />,
  lasso: <path d="M5.38 4.81L8.83 3.02C9.8 3.02 13.8 9.37 13.8 9.37 13.8 10.33 12.97 11.02 12.14 11.02L7.86 10.2C6.9 10.2 2.2 13.79 2.2 12.82L3.72 6.47C3.72 5.5 4.55 4.81 5.38 4.81Z" strokeDasharray="2.49" />,
  brush: <path d="M6.3 7.44L8.49 9.63M5.71 13.15C4.83 14.02 3.37 13.73 2.2 13.73 2.79 12.56 2.05 10.95 2.79 10.22 3.66 9.34 4.98 9.34 5.71 10.22 6.59 11.1 6.59 12.41 5.71 13.15ZM8.05 10.22L13.47 4.36C13.91 3.78 13.91 3.05 13.47 2.61 13.03 2.17 12.15 2.02 11.71 2.61L5.86 8.02C5.57 8.32 5.42 8.46 5.27 8.61 5.13 8.9 4.98 9.34 5.27 9.78 5.27 9.93 5.57 10.07 5.86 10.37 6.15 10.66 6.3 10.8 6.44 10.95 6.88 11.1 7.32 11.1 7.62 10.95 7.76 10.95 7.91 10.66 8.2 10.37Z" />,
  undo: <path d="M2.2 5.1L9.45 5.1C11.92 5.1 13.8 6.99 13.8 9.45 13.8 11.91 11.92 13.8 9.45 13.8L8 13.8M2.2 5.1L5.1 2.2M2.2 5.1L5.1 8" />,
  redo: <path d="M8 13.8L6.55 13.8C4.09 13.8 2.2 11.91 2.2 9.45 2.2 6.99 4.09 5.1 6.55 5.1L13.8 5.1M10.9 2.2L13.8 5.1M10.9 8L13.8 5.1" />,
  chevronDown: <path d="M4 6l4 4 4-4" />,
  chevronRight: <path d="M6 4l4 4-4 4" />,
  chevronUp: <path d="M4 10l4-4 4 4" />,
  settings: (
    <>
      <path d="M8.32 9.61C9.29 9.61 9.93 8.97 9.93 8 9.93 7.03 9.29 6.39 8.32 6.39 7.36 6.39 6.71 7.03 6.71 8 6.71 8.97 7.36 9.61 8.32 9.61Z" />
      <path d="M12.19 9.61C12.19 9.77 12.19 9.93 12.19 10.09 12.19 10.26 12.19 10.42 12.35 10.58L12.35 10.58C12.35 10.58 12.51 10.9 12.51 10.9 12.51 10.9 12.51 11.22 12.51 11.38 12.51 11.54 12.51 11.71 12.51 11.87 12.51 11.87 12.51 12.19 12.35 12.19 12.35 12.19 12.19 12.35 12.03 12.35 12.03 12.35 11.71 12.35 11.54 12.35 11.38 12.35 11.22 12.35 11.06 12.35 11.06 12.35 10.74 12.35 10.74 12.19L10.74 12.19C10.74 12.19 10.42 12.03 10.26 11.87 10.09 11.71 9.93 11.87 9.77 11.87 9.77 11.87 9.45 12.03 9.45 12.19 9.45 12.19 9.45 12.51 9.45 12.67L9.45 12.67C9.45 12.99 9.45 13.32 9.13 13.48 8.97 13.64 8.64 13.8 8.32 13.8 8 13.8 7.84 13.8 7.52 13.48 7.36 13.32 7.19 12.99 7.19 12.67L7.19 12.67C7.19 12.51 7.19 12.35 7.03 12.19 7.03 12.19 6.71 11.87 6.55 11.87 6.39 11.87 6.23 11.87 6.07 11.87 5.91 11.87 5.74 11.87 5.58 12.03L5.58 12.03C5.58 12.03 5.42 12.19 5.26 12.35 5.26 12.35 4.94 12.35 4.78 12.35 4.62 12.35 4.46 12.35 4.29 12.35 4.29 12.35 3.97 12.35 3.97 12.19 3.97 12.19 3.81 12.03 3.81 11.87 3.81 11.71 3.81 11.54 3.81 11.38 3.81 11.22 3.81 11.06 3.81 10.9 3.81 10.74 3.81 10.58 3.97 10.58L3.97 10.58C3.97 10.58 4.13 10.26 4.13 10.09 4.13 9.93 4.13 9.77 4.13 9.61 4.13 9.61 3.97 9.29 3.81 9.29 3.81 9.29 3.49 9.29 3.33 9.29L3.33 9.29C3.01 9.29 2.84 9.29 2.52 8.97 2.36 8.81 2.2 8.48 2.2 8.16 2.2 7.84 2.2 7.68 2.52 7.36 2.68 7.19 3.01 7.03 3.33 7.03L3.33 7.03C3.49 7.03 3.65 7.03 3.81 6.87 3.81 6.87 4.13 6.55 4.13 6.39 4.13 6.23 4.13 6.07 4.13 5.91 4.13 5.74 4.13 5.58 3.97 5.42L3.97 5.42C3.97 5.42 3.81 5.1 3.81 5.1 3.81 5.1 3.81 4.78 3.81 4.62 3.81 4.46 3.81 4.29 3.81 4.13 3.81 4.13 3.81 3.81 3.97 3.81 3.97 3.81 4.13 3.65 4.29 3.65 4.29 3.65 4.62 3.65 4.78 3.65 4.94 3.65 5.1 3.65 5.26 3.65 5.26 3.65 5.58 3.65 5.58 3.81L5.58 3.81C5.58 3.81 5.91 3.97 6.07 4.13 6.23 4.13 6.39 4.13 6.55 4.13L6.55 4.13C6.55 4.13 6.87 3.97 6.87 3.81 6.87 3.81 6.87 3.49 6.87 3.33L6.87 3.33C6.87 3.01 6.87 2.68 7.19 2.52 7.36 2.36 7.68 2.2 8 2.2 8.32 2.2 8.48 2.2 8.81 2.52 8.97 2.68 9.13 3.01 9.13 3.33L9.13 3.33C9.13 3.49 9.13 3.65 9.13 3.81 9.13 3.81 9.29 4.13 9.45 4.13 9.61 4.13 9.77 4.13 9.93 4.13 10.09 4.13 10.26 4.13 10.42 3.97L10.42 3.97C10.42 3.97 10.58 3.81 10.74 3.65 10.74 3.65 11.06 3.65 11.22 3.65 11.38 3.65 11.54 3.65 11.71 3.65 11.71 3.65 12.03 3.65 12.03 3.81 12.03 3.81 12.19 3.97 12.19 4.13 12.19 4.13 12.19 4.46 12.19 4.62 12.19 4.78 12.19 4.94 12.19 5.1 12.19 5.1 12.19 5.42 12.03 5.42L12.03 5.42C12.03 5.42 11.87 5.74 11.87 5.91 11.87 6.07 11.87 6.23 11.87 6.39L11.87 6.39C11.87 6.55 12.03 6.71 12.19 6.87 12.19 6.87 12.51 6.87 12.67 6.87L12.67 6.87C12.99 6.87 13.16 6.87 13.48 7.19 13.64 7.36 13.8 7.68 13.8 8 13.8 8.32 13.8 8.48 13.48 8.81 13.32 8.97 12.99 9.13 12.67 9.13L12.67 9.13C12.51 9.13 12.35 9.13 12.19 9.13 12.19 9.13 11.87 9.29 11.87 9.45Z" />
    </>
  ),
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  swap: <path d="M3 5.5h8M9 3l2 2.5-2 2.5M13 10.5H5M7 8l-2 2.5 2 2.5" />,
  // The trash zone that appears while a favourite is in flight. Drawn, not 🗑 — no
  // emoji glyphs in this shell (V-rules), and the shelf panel's two trash zones were
  // waiting on exactly this icon (plan §10, Phase A).
  // Grid ⇄ list, the ground's view toggle. Each shows the layout you would switch TO,
  // which is the shelf panel's own convention (grep GridIcon / ListIcon there).
  list: <path d="M6 4h8M6 8h8M6 12h8M3 4h.01M3 8h.01M3 12h.01" />,
  grid: (
    <>
      <rect x="2.5" y="2.5" width="5" height="5" rx="1" />
      <rect x="8.5" y="2.5" width="5" height="5" rx="1" />
      <rect x="2.5" y="8.5" width="5" height="5" rx="1" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="1" />
    </>
  ),
  trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.2a1 1 0 0 0 1 .8h3.8a1 1 0 0 0 1-.8l.6-8.2M6.8 7v4M9.2 7v4" />,
  // The owner's 2026-09-24 picks (see the header). A bare `?`: hook, stem, and a dot drawn the
  // way `list` draws its dots. It sits at 20 px beside undo / redo / settings in the top bar.
  help: <path d="M4.9 5.3A3.1 3.1 0 1 1 9.99 7.67Q8 9.34 8 10.6M8 13.4h.01" />,
  // `undo`'s own head (2.9 × 2.9) on a straight shaft — the phone menu's Back to GMT.
  back: <path d="M13.8 8H2.2M2.2 8l2.9-2.9M2.2 8l2.9 2.9" />,
  // Wallpaper: the app above, the preview below.
  split: (
    <>
      <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.74" />
      <path d="M2.2 8h11.6" />
    </>
  ),
  // Two rings on a tether — the on-image handles' own language (GeometryHandleLayer).
  handles: (
    <>
      <circle cx="4.4" cy="11.6" r="2.2" />
      <circle cx="11.6" cy="4.4" r="2.2" />
      <path d="M5.96 10.04l4.08-4.08" />
    </>
  ),
  // A solid band breaking into dots — banding smoothed out.
  dither: <path d="M3.5 3.5v9M6.5 3.5h.01M6.5 6.5h.01M6.5 9.5h.01M6.5 12.5h.01M9.5 3.5h.01M9.5 9.5h.01M12.5 6.5h.01" />,
  // A phone on its side / upright: the frame plus its home bar.
  landscape: (
    <>
      <rect x="2.2" y="3.8" width="11.6" height="8.4" rx="1.2" />
      <path d="M11 6.9v2.2" />
    </>
  ),
  portrait: (
    <>
      <rect x="3.8" y="2.2" width="8.4" height="11.6" rx="1.2" />
      <path d="M6.9 11h2.2" />
    </>
  ),
  // Paint's Restore stays a line glyph (owner, 2026-09-25: "restore brush was fine before"): an
  // arrow turning back. Re-centred the same day ("the arrow is now slightly off the centre"): the
  // circle sits so the ink — ring and head — is centred on the box, and the head's corner is ON
  // the arc's end rather than beside it.
  restore: <path d="M3 8.7a5 5 0 1 0 1.46-3.54M4.46 2.3v2.86h2.86" />,
  // DRAFTED 2026-09-25 for the wall's toggle, beside the fold's bare chevron: the same chevron
  // going DOWN onto a floor line (the wall put away) and UP off it (the wall brought back). The
  // floor is what tells them from the fold at 16 px. The owner may swap either.
  wallHide: <path d="M4.5 4.5L8 8l3.5-3.5M3 12h10" />,
  wallShow: <path d="M4.5 8.5L8 5l3.5 3.5M3 12h10" />,
};

/**
 * Stroke weight per glyph, where the set's 1.5 fills the drawing in at 16 px. Only glyphs
 * whose parts share the box need it — the dashed carve outlines and the gear's teeth.
 * Everything absent from here is 1.5.
 */
const WEIGHT: Partial<Record<IconName, number>> = { box: 1.25, lasso: 1.25, settings: 1.25 };

export const Icon: React.FC<{ name: IconName; className?: string; title?: string; size?: number }> = ({ name, className: cls = '', title, size = 16 }) => {
  // `shrink-0`: a flex parent narrower than the glyph (an icon button whose padding won)
  // would otherwise squeeze the SVG to 0 wide and the glyph silently vanishes.
  const className = `shrink-0 ${cls}`;
  if (name in FILLED) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
        {title && <title>{title}</title>}
        <path d={FILLED[name as keyof typeof FILLED]} fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name in SOLID) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
        {title && <title>{title}</title>}
        <g fill="currentColor" stroke="none">{SOLID[name as keyof typeof SOLID]}</g>
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={WEIGHT[name] ?? 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name as keyof typeof PATHS]}
    </svg>
  );
};

export default Icon;
