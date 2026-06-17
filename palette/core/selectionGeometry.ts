/**
 * selectionGeometry — pure, host-agnostic helpers for the Picker wall's spatial
 * selection (Lasso / Rect / Paint). No DOM: callers pass screen-or-local coordinates
 * already resolved via getBoundingClientRect, so this stays unit-testable.
 *
 * A `SelShape` is the carve region in the wall's LOCAL coordinate space (relative to the
 * scroll-container viewport top-left). Rect/Lasso decide membership geometrically from a
 * swatch's centre; Paint carries its swatch rects only for the overlay — membership for
 * paint is an explicit id-set the caller accumulates while brushing.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SelShape =
  | { kind: 'rect'; box: Box }
  | { kind: 'lasso'; pts: Pt[] }
  | { kind: 'paint'; rects: Box[] };

/** A rendered swatch's centre (local coords) tagged with its stable catalog id. */
export interface SwatchCenter {
  id: string;
  cx: number;
  cy: number;
}

/** Normalise two drag corners into an origin+size box (handles any drag direction). */
export const rectFromDrag = (x0: number, y0: number, x1: number, y1: number): Box => ({
  x: Math.min(x0, x1),
  y: Math.min(y0, y1),
  w: Math.abs(x1 - x0),
  h: Math.abs(y1 - y0),
});

export const pointInBox = (p: Pt, b: Box): boolean =>
  p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

/** Even-odd ray cast — true if p is inside the (implicitly closed) polygon. */
export const pointInPolygon = (p: Pt, pts: Pt[]): boolean => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * The ids of swatches whose centre lies inside a rect/lasso shape. Paint shapes carry no
 * geometric membership here (the caller tracks the brushed id-set), so they return empty.
 */
export const swatchesInShape = (shape: SelShape, centers: SwatchCenter[]): Set<string> => {
  const out = new Set<string>();
  if (shape.kind === 'rect') {
    for (const c of centers) if (pointInBox({ x: c.cx, y: c.cy }, shape.box)) out.add(c.id);
  } else if (shape.kind === 'lasso') {
    for (const c of centers) if (pointInPolygon({ x: c.cx, y: c.cy }, shape.pts)) out.add(c.id);
  }
  return out;
};
