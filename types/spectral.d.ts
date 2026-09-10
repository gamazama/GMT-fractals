/**
 * Ambient types for spectral.js 3.0.0 (MIT, Ronald van Wijnen) — Kubelka–Munk pigment
 * mixing, used by the `spectral` blend space in utils/colorUtils.ts.
 *
 * The package ships no .d.ts. Only the surface we actually call is declared here, and
 * deliberately so: a fuller guess at its API would be a claim nothing checks. `mix` and
 * `Color` are pinned by `npm run test:palette-blendspaces`; `palette`/`gradient` exist
 * on the module but we do not use them (our own sampler owns stop positions and easing),
 * so they are omitted rather than typed from the README.
 */
declare module 'spectral.js' {
  /** A colour with a lazily-derived 38-band reflectance spectrum. Building one is the
   *  expensive part of a mix, which is why callers memoise them. */
  export class Color {
    constructor(input: string | number[]);
    /** Defaults to `{ format: 'hex', method: 'map' }` — 'map' runs spectral's own gamut
     *  mapping, 'clip' clamps per channel (and shifts hue, so we don't use it). */
    toString(opts?: { format?: 'hex' | 'rgb'; method?: 'map' | 'clip' }): string;
  }

  /** Weighted Kubelka–Munk mix. Each entry is [colour, weight]; weights need not sum to 1. */
  export function mix(...colors: [Color, number][]): Color;
}
