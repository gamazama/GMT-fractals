/**
 * gradientBarClass — the ONE gradient-bar spec (plans/ge-v2-unified-shell-plan.md §1 V8:
 * "The gradient bar is one spec at every size. Radius 4, hairline `line/20`, hover = 2px
 * `fg` outline, selected = 2px accent outline, armed target = 2px dashed violet, kept =
 * a star in the corner"). One shared className helper so PickerWall tiles, FavientsPanel
 * items, PaletteRow swatches, GeneratorSourceRow slots, SourceBands bands and the hero
 * ramp wrapper stop drifting into their own bar look.
 *
 * `kept` (the star overlay) is deliberately NOT drawn here — V8 says "kept = a star in
 * the corner", which is a positioned `<Icon name="star">` the caller renders, not a class.
 *
 * `size` only changes which callers use this (documented for grep, not for CSS): the
 * radius/ring/outline spec is identical at every size, so nothing here branches on it.
 */

export type GradientBarSize = 'tile' | 'item' | 'swatch' | 'slot' | 'band' | 'ramp';

export interface GradientBarOpts {
  size?: GradientBarSize;
  selected?: boolean;
  armed?: boolean;
  /** Caller still owns rendering the ★ overlay; this only says whether one is due,
   *  so `gradientBarClass({ kept: true }).ring` style callers stay honest about intent. */
  kept?: boolean;
}

/**
 * Returns the V8 classes. Hover uses `hover:outline hover:outline-2 hover:outline-fg`
 * (not `ring-2`) so it never shifts layout against the `ring-1` hairline underneath.
 */
export const gradientBarClass = (opts: GradientBarOpts = {}): string => {
  const { selected = false, armed = false } = opts;
  const base = 'rounded ring-1 ring-line/20 transition-[outline-color]';
  if (armed) return `${base} outline outline-2 outline-dashed outline-gx-armed`;
  if (selected) return `${base} outline outline-2 outline-accent-400`;
  return `${base} hover:outline hover:outline-2 hover:outline-fg`;
};

export default gradientBarClass;
