/**
 * V4 Stage 1 — Ingest dispatcher.
 *
 * Format detection priority:
 *   1. Fragmentarium .frag — if any frag-only marker is present (#include,
 *      #preset, #buffershader, #donotrun, #vertex, #define providesColor,
 *      uniform-slider syntax, or .frag filename). This comes FIRST so that
 *      rejection markers like #donotrun and #buffershader are honoured even
 *      when a DE signature is also present.
 *   2. DEC — if detectDECFormat() fires with confidence ≥ 0.4. DEC files are
 *      standalone DE functions with no Fragmentarium metadata.
 *   3. Plain GLSL — fallback.
 */

import type { RawSource } from '../types';
import { ingestFrag } from './frag';
import { ingestDec, isDecSource } from './dec';
import { ingestPlainGlsl } from './plain-glsl';

/** Does the source contain any Fragmentarium-format markers? */
function looksLikeFrag(source: string, filename: string): boolean {
    if (filename.toLowerCase().endsWith('.frag')) return true;
    // Directives that only exist in Fragmentarium format
    if (/^\s*#(include|preset|info|camera|group|buffershader|donotrun|vertex|endvertex|replace|TexParameter|buffer)\b/m.test(source)) return true;
    // Fragmentarium-specific #define markers
    if (/^\s*#define\s+(provides|dontclearonchange|iterationsbetweenredraws|subframemax)/m.test(source)) return true;
    // Slider/color/checkbox/file annotations
    if (/uniform\s+\w+\s+\w+\s*;\s*(slider|checkbox|color|file)\[/.test(source)) return true;
    return false;
}

/**
 * Classify raw source text and dispatch to the appropriate format adapter.
 */
export function ingest(source: string, filename: string): RawSource {
    if (looksLikeFrag(source, filename)) {
        return ingestFrag(source, filename);
    }

    if (isDecSource(source)) {
        return ingestDec(source, filename);
    }

    return ingestPlainGlsl(source, filename);
}

export { ingestFrag, ingestDec, ingestPlainGlsl };
