import React from 'react';

/**
 * Icons2 — overflow home for shared icons (components/Icons.tsx is full).
 *
 * Parametric chevrons: ONE consistent stroke style (rounded caps/joins, strokeWidth 2),
 * with size varying per call site. These replace the ad-hoc inline `<svg><polyline>`
 * chevrons that had drifted across the app to mismatched stroke weights (2 vs 2.5) — the
 * Menu dropdown affordance, the Bucket-render collapse caret, the MobileScrollIntro bounce
 * cue, and the Formula Workshop source toggle. Size is the only thing that legitimately
 * varies (10px affordance vs 32px scroll cue), so it's the prop; everything else is fixed
 * for a consistent look.
 *
 * @invariant Engine-core tier (components/) — must not import app or engine-gmt code.
 *   Direction is fine the other way: engine/, engine-gmt/, and apps may import this.
 */

export interface ChevronProps {
  /** Width = height in px. Default 12. */
  size?: number;
  /** Extra classes for rotation / opacity / colour / transitions. */
  className?: string;
  /** Stroke weight. Default 2 — the unified value; override only with reason. */
  strokeWidth?: number;
}

const chevron =
  (points: string): React.FC<ChevronProps> =>
  ({ size = 12, className, strokeWidth = 2 }) =>
    (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <polyline points={points} />
      </svg>
    );

export const ChevronDown = chevron('6 9 12 15 18 9');
export const ChevronUp = chevron('18 15 12 9 6 15');
export const ChevronRight = chevron('9 18 15 12 9 6');
export const ChevronLeft = chevron('15 18 9 12 15 6');

/**
 * Filled disclosure caret — a solid right-pointing triangle, the panel/section
 * collapse glyph (distinct from the OUTLINE {@link ChevronRight}). Shared by
 * CollapsibleSection, DynamicList, and the Gradient Explorer section headers,
 * which previously each inlined the identical `viewBox="0 0 6 10"` triangle.
 * Size, colour, and the rotate-90-on-open all come from `className` (callers
 * pass e.g. `w-2 h-2 transition-transform rotate-90`).
 */
export const CaretRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 6 10" fill="currentColor">
    <path d="M0 0l6 5-6 5z" />
  </svg>
);
