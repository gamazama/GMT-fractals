/**
 * stopOps — pure `GradientStop[] → GradientStop[]` transforms for the Stops editor.
 *
 * These are the operations that were inline lambdas inside
 * `components/AdvancedGradientEditor.tsx` (context-menu actions ~:528-558 and the
 * pointer-drag math ~:286-350). Extracting them here makes them deterministic +
 * unit-testable and lets BOTH editor hosts (app-gmt's DDFS gradient param and the
 * palette `EditorStage`) share one implementation. Engine-core, pure: no DOM, no
 * React, no store, no `Math.random` / `Date.now` (ids are derived deterministically).
 *
 * Selection model: ops that act on a subset take the stops' `id`s (the editor holds
 * a `Set<string>` selection); `setBias` takes the index of the segment's left stop
 * (bias lives on the outgoing segment). Callers pass a position-sorted array for the
 * adjacency-sensitive ops (`setBias`, `distribute`).
 *
 * @invariant Every op returns a NEW array and never mutates its input; ids of
 * untouched stops are preserved so the host's selection/keying survives a transform.
 */

import type { GradientStop } from '../types';

/** Clamp to [0,1]. Shared generic math helper (lives here as the pure, engine-core
 *  module palette + gradient-explorer already import; folds several local copies). */
export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
/** Clamp to an arbitrary [a,b]. Shared with clamp01 above. */
export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
/** Shift-snap to 1/20 (0.05), matching the editor's `Math.round(x * 20) / 20`. */
const snap20 = (x: number): number => Math.round(x * 20) / 20;

/** Invert: mirror every position about 0.5 and reverse order. */
export const invert = <T extends GradientStop>(stops: T[]): T[] =>
  stops.map((s) => ({ ...s, position: 1 - s.position })).reverse();

/** Double: compress the gradient into [0,0.5] then duplicate it into [0.5,1]. */
export const double = (stops: GradientStop[]): GradientStop[] => {
  const used = new Set(stops.map((s) => s.id));
  const uniqueId = (base: string): string => {
    let id = `${base}-dup`;
    let n = 2;
    while (used.has(id)) id = `${base}-dup${n++}`; // deterministic + collision-proof (handles re-doubling)
    used.add(id);
    return id;
  };
  return [
    ...stops.map((s) => ({ ...s, position: s.position * 0.5 })),
    ...stops.map((s) => ({ ...s, id: uniqueId(s.id), position: 0.5 + s.position * 0.5 })),
  ];
};

/** Distribute: evenly space the selected stops between their own min/max position. */
export const distribute = <T extends GradientStop>(stops: T[], ids: string[]): T[] => {
  const idset = new Set(ids);
  const sel = stops
    .map((s, i) => ({ s, i }))
    .filter((x) => idset.has(x.s.id))
    .sort((a, b) => a.s.position - b.s.position);
  if (sel.length < 2) return stops;
  const lo = sel[0].s.position;
  const hi = sel[sel.length - 1].s.position;
  const step = (hi - lo) / (sel.length - 1);
  const nextPos = new Map<string, number>();
  sel.forEach((x, k) => nextPos.set(x.s.id, lo + step * k));
  return stops.map((s) => (nextPos.has(s.id) ? { ...s, position: nextPos.get(s.id)! } : s));
};

/** Delete the selected stops. Caller enforces any minimum-count rule. */
export const deleteStops = <T extends GradientStop>(stops: T[], ids: string[]): T[] => {
  const rm = new Set(ids);
  return stops.filter((s) => !rm.has(s.id));
};

/** The reset-to-default two-stop ramp (black → white, linear). */
export const defaultStops = (): GradientStop[] => [
  { id: '1', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
  { id: '2', position: 1, color: '#FFFFFF', bias: 0.5, interpolation: 'linear' },
];

/**
 * Move the selected stops by `dt` (a 0–1 position delta). `snap` rounds to 1/20.
 * Positions clamp to [0,1]. (Drag math from the `knot`/`bracket_move` gesture.)
 */
export const move = <T extends GradientStop>(stops: T[], ids: string[], dt: number, snap = false): T[] => {
  const sel = new Set(ids);
  return stops.map((s) => {
    if (!sel.has(s.id)) return s;
    let p = clamp01(s.position + dt);
    if (snap) p = snap20(p);
    return { ...s, position: p };
  });
};

/**
 * Signed scale of the selected stops about a pivot edge. `side: 'left'` anchors the
 * selection's max position and drags its min by `dt` (and vice-versa). The scale is
 * signed, so dragging the moving edge past the pivot INVERTS the selection — matching
 * the editor's `bracket_scale_left/right` gesture. Needs ≥2 selected with span > 0.001.
 */
export const scaleAboutPivot = <T extends GradientStop>(
  stops: T[],
  ids: string[],
  dt: number,
  side: 'left' | 'right',
): T[] => {
  const idset = new Set(ids);
  const positions = stops.filter((s) => idset.has(s.id)).map((s) => s.position);
  if (positions.length < 2) return stops;
  const initMin = Math.min(...positions);
  const initMax = Math.max(...positions);
  if (initMax - initMin < 0.001) return stops;
  const pivot = side === 'left' ? initMax : initMin;
  const movingEdge = side === 'left' ? initMin : initMax;
  const scale = (movingEdge + dt - pivot) / (movingEdge - pivot);
  return stops.map((s) =>
    idset.has(s.id) ? { ...s, position: clamp01(pivot + (s.position - pivot) * scale) } : s,
  );
};

/**
 * Adjust the bias of the segment whose LEFT stop is at `index` by `dt` (a 0–1 pointer
 * delta, divided by the segment width — the editor's feel). `snap` rounds to 1/20.
 * No-op if `index` is the last stop or the segment is degenerate.
 */
export const setBias = <T extends GradientStop>(stops: T[], index: number, dt: number, snap = false): T[] => {
  if (index < 0 || index >= stops.length - 1) return stops;
  const segW = stops[index + 1].position - stops[index].position;
  if (segW <= 0.001) return stops;
  let b = clamp01((stops[index].bias ?? 0.5) + dt / segW);
  if (snap) b = snap20(b);
  return stops.map((s, i) => (i === index ? { ...s, bias: b } : s));
};

/**
 * Validate + normalise pasted/imported stop data (parsed JSON — a `GradientStop[]`
 * or a `{ stops }` wrapper). Drops malformed entries, clamps positions/bias to [0,1],
 * upper-cases hex, fills missing ids. Returns `null` when nothing usable survives.
 */
export const normalizePaste = (raw: unknown): GradientStop[] | null => {
  let arr: unknown = raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray((raw as { stops?: unknown }).stops)) {
    arr = (raw as { stops: unknown[] }).stops;
  }
  if (!Array.isArray(arr)) return null;
  // Match hexToRgb's tolerance (optional '#', and 3-digit shorthand) so we never
  // drop a colour the sampler would happily render; normalise to #RRGGBB.
  const normHex = (raw: string): string | null => {
    let h = raw.trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toUpperCase()}` : null;
  };
  const out: GradientStop[] = [];
  arr.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const rec = item as Record<string, unknown>;
    const pos = Number(rec.position);
    const color = typeof rec.color === 'string' ? normHex(rec.color) : null;
    if (!Number.isFinite(pos) || color === null) return;
    const stop: GradientStop = {
      id: typeof rec.id === 'string' && rec.id ? rec.id : `p${idx}`,
      position: clamp01(pos),
      color,
    };
    const bias = Number(rec.bias);
    if (Number.isFinite(bias)) stop.bias = clamp01(bias);
    const interp = rec.interpolation;
    if (interp === 'linear' || interp === 'step' || interp === 'smooth' || interp === 'cubic') {
      stop.interpolation = interp;
    }
    out.push(stop);
  });
  return out.length ? out : null;
};

/**
 * The op bundle the editor consumes — `stopOps.invert(...)`, `stopOps.delete(...)`,
 * `stopOps.default()`, etc. (`delete`/`default` are reserved words so they map to the
 * `deleteStops`/`defaultStops` named exports.)
 */
export const stopOps = {
  invert,
  double,
  distribute,
  delete: deleteStops,
  default: defaultStops,
  normalizePaste,
  move,
  scaleAboutPivot,
  setBias,
};
