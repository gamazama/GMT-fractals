/**
 * wallLayout — pure layout math for the Picker wall's "squarish" reflow.
 *
 * Applied GLOBALLY to the whole wall's total swatch count (one column count for the wall,
 * not per block): the wall laid out at full width wraps to ⌈N/cols⌉ rows; when that's only
 * a few rows the wall is very wide and short (a couple of full-width "thin strips"). For
 * that case we reduce the column count so the overall layout is squarish — but ONLY when
 * it's genuinely few-row, so a content-heavy wall (many rows, including many small blocks
 * that each happen to be a couple of rows) keeps its full width. No React/DOM → unit-testable.
 */

/** A wall ≤ this many full-width rows is a candidate to square up. */
export const STRIP_ROWS_MAX = 3;
/** Target: a reflowed wall is at most ~this much wider than tall (px). */
export const MAX_BLOCK_ASPECT = 2.5;

/** Aspect-balanced column count for an N-swatch wall, never exceeding the full-width `maxCols`. */
export const squareCols = (
  n: number,
  cellW: number,
  cellH: number,
  maxCols: number,
  maxAspect: number = MAX_BLOCK_ASPECT,
): number => Math.max(1, Math.min(maxCols, Math.ceil(Math.sqrt((maxAspect * n * cellH) / cellW))));

/**
 * Whether an N-swatch wall should be squared up: it's few-row at full width AND its
 * full-width shape is wider than the target aspect (so squaring actually helps).
 */
export const shouldSquare = (
  total: number,
  cols: number,
  cellW: number,
  cellH: number,
  stripRowsMax: number = STRIP_ROWS_MAX,
  maxAspect: number = MAX_BLOCK_ASPECT,
): boolean => {
  if (total <= 0) return false;
  const naturalRows = Math.max(1, Math.ceil(total / cols));
  const naturalCols = Math.min(cols, total);
  return naturalRows <= stripRowsMax && naturalCols * cellW > maxAspect * naturalRows * cellH;
};
