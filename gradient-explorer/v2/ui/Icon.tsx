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
  | 'star';

const PATHS: Record<Exclude<IconName, 'star'>, React.ReactNode> = {
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
};

const STAR_PATH = 'M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.5l4-.6z';

export const Icon: React.FC<{ name: IconName; className?: string; title?: string; size?: number }> = ({ name, className = '', title, size = 16 }) => {
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
      {PATHS[name]}
    </svg>
  );
};

export default Icon;
