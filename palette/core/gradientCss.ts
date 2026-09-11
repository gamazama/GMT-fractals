/**
 * gradientCss — a gradient as a CSS `linear-gradient(...)`, for the places that PAINT one
 * rather than render it.
 *
 * The canonical renderer is `renderStopsToRamp` and everything that must be faithful goes
 * through it (the hero's bar samples the stops once per display pixel; the wall draws a
 * sprite). This is for the other case: chrome that wants a gradient as a background —
 * the export window's subject segments, a set chip filling with the gradient being filed —
 * where a CSS string is the cheapest correct answer and the browser's own interpolation is
 * good enough because nothing is measured off it.
 *
 * It exists as ONE module because the second call site was about to be a copy of the first
 * (the repo's own rule: a config block that appears twice belongs in the engine). If a third
 * appears, it comes here too.
 *
 * NOT byte-exact with the texture renderer, and it does not try to be: it subsamples the
 * ramp and lets the browser interpolate in sRGB between the stops it is given. Never use it
 * to derive a colour — only to show one.
 *
 * @see docs/adr/0119-a-save-is-drawn-where-it-lands.md
 */
import { renderStopsToRamp } from './gmtGradient';
import type { RGB } from './oklab';
import type { GradientConfig } from '../../types';

/** `rgb(r g b)` from a 0–255 triple. */
export const cssRgb = (c: RGB): string => `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)})`;

/**
 * A continuous CSS gradient across a ramp, subsampled to `steps + 1` stops. 32 is smooth at
 * any width this is used at and keeps the style string short enough to sit in a `style` attr.
 */
export const rampToCss = (ramp: RGB[], steps = 32): string | undefined => {
    if (ramp.length < 2) return undefined;
    const out: string[] = [];
    for (let i = 0; i <= steps; i++) {
        const c = ramp[Math.round((i / steps) * (ramp.length - 1))];
        out.push(`${cssRgb(c)} ${((i / steps) * 100).toFixed(2)}%`);
    }
    return `linear-gradient(to right, ${out.join(', ')})`;
};

/** The same colours as HARD STOPS — a palette rather than a ramp. */
export const swatchesToCss = (colors: RGB[]): string | undefined => {
    if (colors.length === 0) return undefined;
    const w = 100 / colors.length;
    return `linear-gradient(to right, ${colors
        .map((c, i) => `${cssRgb(c)} ${(i * w).toFixed(3)}% ${((i + 1) * w).toFixed(3)}%`)
        .join(', ')})`;
};

/** A whole config, rendered through the canonical sampler and then subsampled to CSS. */
export const configToCss = (config: GradientConfig, steps = 32): string | undefined =>
    rampToCss(renderStopsToRamp(config.stops, config.blendSpace, 'srgb'), steps);
