/**
 * padAxes — which colour coordinates the wall's pad and strip show, derived from how the
 * wall is ARRANGED (GE v2 Phase D, owner 2026-09-08: "the minimap / sat strip should
 * change its output so it matches the selected filters for any combination that works").
 *
 * Of the Arrange axes only three are colour coordinates — hue · lightness · vividness
 * (chroma) — so those are the ones the pad can paint. The rule:
 *   • the pad's Y is the ROWS axis when that is a colour axis (the wall's bands run down
 *     the pad, so the lens and the scrollbar keep meaning something); else lightness;
 *   • the pad's X is the SORT axis when that is a colour axis other than Y; else hue, or
 *     lightness when Y is hue;
 *   • the strip is the remaining one of the three.
 * Rows by complexity / rainbow / warmth / none, or a sort by name, fall back to the default
 * hue × lightness pad with the chroma strip, and `rowsOnY` is false — no lens, since the
 * bands are not on any axis the pad shows.
 *
 * Pure; `debug/test-palette-groundsets.mts` [7] pins the table.
 */

export type ColourAxis = 'hue' | 'lightness' | 'chroma';

/** Arrange axes that are colour coordinates, and which. */
export const COLOUR_AXIS_OF: Record<string, ColourAxis | undefined> = {
  hue: 'hue',
  lightness: 'lightness',
  vividness: 'chroma',
};

/** The `paletteFilters` window param behind each colour axis. */
export const WINDOW_KEY: Record<ColourAxis, 'qHue' | 'qL' | 'qC'> = { hue: 'qHue', lightness: 'qL', chroma: 'qC' };

const ALL: readonly ColourAxis[] = ['hue', 'lightness', 'chroma'];

export interface PadAxes {
  x: ColourAxis;
  y: ColourAxis;
  strip: ColourAxis;
  /** The rows axis IS the pad's Y — the wall's bands map onto the pad, so the lens applies. */
  rowsOnY: boolean;
}

export const DEFAULT_PAD_AXES: PadAxes = { x: 'hue', y: 'lightness', strip: 'chroma', rowsOnY: true };

export const padAxesFor = (rowsAxis: string, sortAxis: string): PadAxes => {
  const rowsC = COLOUR_AXIS_OF[rowsAxis];
  const sortC = COLOUR_AXIS_OF[sortAxis];
  const y: ColourAxis = rowsC ?? 'lightness';
  const x: ColourAxis = sortC && sortC !== y ? sortC : y === 'hue' ? 'lightness' : 'hue';
  const strip = ALL.find((a) => a !== x && a !== y)!;
  return { x, y, strip, rowsOnY: !!rowsC };
};
