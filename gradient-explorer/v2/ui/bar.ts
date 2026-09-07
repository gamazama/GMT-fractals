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
 * **Radius (owner, 2026-09-07, amending V8's "radius 4"): gradients and swatches always
 * carry LARGE rounding — it is what separates them from each other.** 10 px for every
 * size that has the height for it (swatch, ramp, tile, item, slot); the thin source
 * bands (14–18 px tall, SourceBands) take 6 px so they stay bars and not pills. This is
 * the only thing `size` branches on; ring/outline are identical everywhere. The wall's
 * tiles are canvas-drawn (PickerWall) and the shelf's items are FavientsPanel's own — both
 * outside this helper; see plans/ge-v2-figma/hero-spec.md §7c.
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
  const radius = opts.size === 'band' ? 'rounded-md' : 'rounded-[10px]';
  const base = `${radius} ring-1 ring-line/20 transition-[outline-color]`;
  if (armed) return `${base} outline outline-2 outline-dashed outline-gx-armed`;
  if (selected) return `${base} outline outline-2 outline-accent-400`;
  return `${base} hover:outline hover:outline-2 hover:outline-fg`;
};

export default gradientBarClass;
