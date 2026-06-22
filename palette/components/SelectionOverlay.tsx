/**
 * SelectionOverlay — the carve preview drawn over the Picker wall while a selection tool
 * is active. It is a sibling of the scroll container (NOT a child), so it stays pinned to
 * the viewport and never scrolls; all geometry is in the wall's LOCAL coordinate space.
 *
 *   • drawing  → just the dashed outline of the shape being dragged.
 *   • chosen   → outline + a dim scrim over the half that WOULD BE DELETED. `dimInside`
 *                flips with the cursor: hovering inside → keep inside (isolate) → the
 *                OUTSIDE is dimmed; hovering outside → cut the inside → the INSIDE dims.
 *
 * pointer-events:none throughout — the keep-click is handled by the scroll container's
 * pointer handler underneath, which re-derives inside/outside itself.
 */

import React from 'react';
import type { SelShape } from '../core/selectionGeometry';

export interface SelectionOverlayState {
  shape: SelShape;
  phase: 'drawing' | 'chosen';
  /** chosen phase: true = the INSIDE region will be deleted (cursor is outside → cut). */
  dimInside: boolean;
}

const STROKE = 'rgb(var(--accent-400))';
const MASK_ID = 'gx-sel-dim-mask';

const shapeNodes = (shape: SelShape, fill: string, stroke?: string): React.ReactNode => {
  const sw = stroke ? 1.5 : 0;
  const dash = stroke ? '5 4' : undefined;
  if (shape.kind === 'rect') {
    const b = shape.box;
    return <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />;
  }
  if (shape.kind === 'lasso') {
    return <polygon points={shape.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />;
  }
  return (
    <g fill={fill} stroke={stroke} strokeWidth={stroke ? 1 : 0}>
      {shape.rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />
      ))}
    </g>
  );
};

export const SelectionOverlay: React.FC<{ overlay: SelectionOverlayState }> = ({ overlay }) => {
  const { shape, phase, dimInside } = overlay;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
      {phase === 'chosen' && (
        <>
          <defs>
            <mask id={MASK_ID}>
              <rect x="0" y="0" width="100%" height="100%" fill={dimInside ? 'black' : 'white'} />
              {shapeNodes(shape, dimInside ? 'white' : 'black')}
            </mask>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="black" opacity={0.55} mask={`url(#${MASK_ID})`} />
        </>
      )}
      {/* the painted swatches read better with a faint fill under the outline */}
      {shape.kind === 'paint' && shapeNodes(shape, 'rgb(var(--accent-400)/0.18)')}
      {shapeNodes(shape, 'none', STROKE)}
    </svg>
  );
};

export default SelectionOverlay;
