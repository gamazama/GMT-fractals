/**
 * dccExport — Gradient Explorer → Cinema 4D / Blender, as a generated Python script.
 *
 * There is no gradient interchange file for either app: neither imports .grd, .ggr, CSS,
 * SVG stops or JSON as a gradient, and C4D's own .lib4d preset is a binary only C4D
 * writes. Both DO run Python from a plain text file with nothing installed — C4D via
 * Extensions ▸ Script Manager, Blender via the Scripting workspace or `--python` — so the
 * export is a script that rebuilds the ramp with the host's own API.
 *
 * The two templates in `./dcc/*.py` are the owner's, written and tested against Cinema 4D
 * 2026.2 (live, Redshift present) and Blender 5.0.1; the measurements behind them are in
 * H:\GMT\assets\GXN\3d import\GRADIENT_EXPORT_SPEC.md. They stay runnable Python rather
 * than being retyped into TS string literals; `npm run gen:dcc` transcribes them into
 * ./dcc/templates.generated.ts and `npm run check:dcc` fails when the two drift apart.
 * Edit the behaviour in the .py, never in the generated file, and never here.
 *
 * (Vite's `?raw` would be the obvious way to load them, and it is the wrong one: this
 * module is reached from exportFormats.ts, which the node-run guards import, and node
 * cannot resolve a `?raw` specifier - it took test:palette's 28 harnesses down.)
 *
 * Three things decide whether the render matches the browser:
 *
 * 1. RESAMPLE, never ship the authored stops. GMT interpolates in OKLab/OKLCh; both DCCs
 *    interpolate in linear RGB, so the same two stops land on a different curve. The ramp
 *    handed to `build` is already 256 samples of GMT's curve, and reducing THAT is what
 *    keeps the shape.
 * 2. Reduce with `reduceStopIndices` (Douglas-Peucker), not by even spacing. The spec
 *    recommends even spacing; measured against the app's own renderer it is much worse,
 *    because a gamut-mapped OKLCh ramp is not smooth. blue→yellow at 32 stops: even
 *    spacing 49.9/255 of max per-channel error, D-P 1.5. The error sits at i=1, where the
 *    gamut mapper turns a step off saturated blue into a 60-unit jump — D-P puts a stop on
 *    it, even spacing steps over it. magenta→green at 32: 13.0 vs 1.8.
 *    D-P does NOT win everywhere: on a ramp with no kink it stops early and can sit a
 *    fraction behind even spacing (deep purple → cream, 0.8 vs 0.2, on 9 stops not 32).
 *    That is fine — the budget is what matters, and the hard ramps are where a gradient
 *    tool's output actually goes wrong.
 *    @invariant D-P holds every measured pair inside 4/255 of the app's own ramp, and
 *      where even spacing misses that budget D-P does not — proven by:
 *      `npm run check:dcc` ("D-P holds every pair inside 4/255")
 * 3. Every emitted stop says LINEAR. C4D's per-knot default is smooth, which overshoots
 *    between dense resampled knots and puts back the error the resampling removed.
 *
 * Colour stays raw sRGB hex in the payload and is converted inside the script, where the
 * host's own colour management can be asked: C4D converts sRGB → render space (ACEScg in
 * an OCIO document), Blender applies the sRGB EOTF to reach scene-linear. Writing
 * unconverted hex into either is the classic "why is it washed out" bug.
 *
 * @see palette/core/exportFormats.ts for the registry entries and the stop budget.
 */

import { C4D_IMPORT_PY as c4dTemplate, BLENDER_IMPORT_PY as blenderTemplate } from './dcc/templates.generated';
import type { RGB } from './oklab';

/**
 * The stop ceiling for both scripts. Blender's ColorRamp is a HARD 32 — element 33 throws
 * `Unable to add element to colorband (limit 32)`. C4D has no ceiling worth naming (20,000
 * knots inserted without complaint) but a ramp with hundreds of knots is unusable in its
 * UI, and 32 is under 2/255 of error anyway, so both share the number.
 */
export const DCC_MAX_STOPS = 32;

const BEGIN = '# >>> PAYLOAD';
const END = '# <<< PAYLOAD <<<';

const hex = (c: RGB) => {
  const b = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${b(c.r)}${b(c.g)}${b(c.b)}`;
};

/** A Python string literal for the name. JSON.stringify is exactly right: the two
 *  languages agree on double quotes and on every escape it emits, newlines included. */
const pyStr = (s: string) => JSON.stringify(s);

/** Swap the template's sample payload for this gradient's, between the markers. */
const withPayload = (template: string, payload: string): string => {
  const a = template.indexOf(BEGIN);
  const b = template.indexOf(END);
  // The markers are written into the .py by us; if an edit drops one, say so rather than
  // shipping a script that silently imports the sample gradient.
  if (a < 0 || b < 0) throw new Error('dccExport: payload markers missing from the template');
  return template.slice(0, a) + payload.trimEnd() + '\n' + template.slice(b + END.length + 1);
};

const stopLines = (ramp: RGB[], idx: number[], interp: string) =>
  idx
    .map((i) => `        {"pos": ${(i / 255).toFixed(4)}, "color": "${hex(ramp[i])}"${interp}},`)
    .join('\n');

/** Cinema 4D: per-knot interpolation, so each stop carries its own `linearknot`. */
export const buildC4dScript = (ramp: RGB[], name: string, idx: number[]): string =>
  withPayload(
    c4dTemplate,
    `GRADIENT = {
    "name": ${pyStr(name)},
    "color_space": "srgb",
    "stops": [
${stopLines(ramp, idx, ', "interp": "linearknot"')}
    ],
}`,
  );

/** Blender: interpolation is ramp-wide, so it is stated once and the stops stay bare. */
export const buildBlenderScript = (ramp: RGB[], name: string, idx: number[]): string =>
  withPayload(
    blenderTemplate,
    `GRADIENT = {
    "name": ${pyStr(name)},
    "color_space": "srgb",
    "interpolation": "LINEAR",
    "stops": [
${stopLines(ramp, idx, '')}
    ],
}`,
  );
