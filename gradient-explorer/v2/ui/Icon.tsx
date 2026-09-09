/**
 * Icon — the v2 icon set (plans/ge-v2-unified-shell-plan.md §1 V6: "One icon set, one
 * weight. 16 px stroke glyphs in `currentColor`... star is the single filled glyph").
 * One inline-SVG per name, 16x16 viewBox, `fill:none; stroke:currentColor;
 * strokeWidth:1.5; round caps/joins` — except `star`, which is filled.
 *
 * Every emoji / unicode glyph in the v2 files this component covers (↶ ↷ ▾ ▴ ✕ ⚙ etc.)
 * is replaced with `<Icon name=… />` at its call site (V6: "No emoji, no unicode glyph
 * buttons").
 */

import React from 'react';

export type IconName =
  | 'search'
  | 'zoom'
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
  | 'pencil'
  | 'refresh'
  | 'trash'
  | 'list'
  | 'grid'
  | 'star'
  | 'heart'
  | 'share'
  | 'download'
  | 'photo'
  | 'fullscreen';

/**
 * The hero's USE glyphs — the owner's pick in Figma (GE v2 Hero, 2026-09-07): Material
 * Symbols "favorite" (heart), "share", "download", "photo", plus "fullscreen" in the same
 * family for Wallpaper. FILLED, 24-unit viewBox, drawn in `currentColor` — a second style
 * beside the 16 px stroke set, confined to the hero header and the image slot. `star`
 * still marks a KEPT gradient on tiles (V8); `heart` is the button that keeps it.
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

const PATHS: Record<Exclude<IconName, 'star' | keyof typeof FILLED>, React.ReactNode> = {
  search: <circle cx="7" cy="7" r="4.5" />,
  zoom: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M7 5v4M5 7h4" />
    </>
  ),
  box: <rect x="3" y="3" width="10" height="10" rx="1.5" />,
  lasso: <path d="M8 2.5c-3.6 0-6 2-6 4.6 0 1.9 1.6 3.4 3.8 3.9-.3.5-.5 1-.5 1.5 0 .9.9 1.6 2 1.6.7 0 1.3-.3 1.7-.8M8 2.5c3.6 0 6 2 6 4.6 0 2.3-2 4.2-4.7 4.6" />,
  brush: <path d="M3 13c0-2.5 1.5-4 3-4 1 0 1.5.7 1.5 1.5S6.8 12 6 12M11.5 2.5l2 2L7 11l-2.6.6.6-2.6 6.5-6.5z" />,
  undo: <path d="M4 4v3.5H7.5M4 7.5C5 5.5 7 4.2 9.3 4.2c3 0 5.3 2.3 5.3 5.1S12.3 14.5 9.3 14.5c-2 0-3.8-1.1-4.7-2.7" />,
  redo: <path d="M12 4v3.5H8.5M12 7.5C11 5.5 9 4.2 6.7 4.2c-3 0-5.3 2.3-5.3 5.1s2.3 5.2 5.3 5.2c2 0 3.8-1.1 4.7-2.7" />,
  chevronDown: <path d="M4 6l4 4 4-4" />,
  chevronRight: <path d="M6 4l4 4-4 4" />,
  chevronUp: <path d="M4 10l4-4 4 4" />,
  settings: (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 2.5v1.6M8 11.9v1.6M13.5 8h-1.6M4.1 8H2.5M11.7 4.3l-1.1 1.1M5.4 10.6l-1.1 1.1M11.7 11.7l-1.1-1.1M5.4 5.4L4.3 4.3" />
    </>
  ),
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  swap: <path d="M3 5.5h8M9 3l2 2.5-2 2.5M13 10.5H5M7 8l-2 2.5 2 2.5" />,
  pencil: <path d="M2.5 13.5l.7-2.8 7-7 2.1 2.1-7 7-2.8.7zM9.8 3.4l2.1 2.1" />,
  refresh: <path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.7M13.5 2.2v3.2h-3.2" />,
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
};

const STAR_PATH = 'M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.5l4-.6z';

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
  if (name === 'star') {
    return (
      <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
        {title && <title>{title}</title>}
        <path d={STAR_PATH} fill="currentColor" stroke="none" />
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
      strokeWidth={1.5}
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
