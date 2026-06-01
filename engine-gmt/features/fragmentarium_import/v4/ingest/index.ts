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
import { HAS_ANNOTATED_UNIFORM } from '../../parsers/uniform-annotation';

/** Definitive Fragmentarium markers — these never appear in a DEC source, so
 *  they always win the classification. */
function hasStrongFragMarkers(source: string, filename: string): boolean {
    if (filename.toLowerCase().endsWith('.frag')) return true;
    // Directives that only exist in Fragmentarium format
    if (/^\s*#(include|preset|info|camera|group|buffershader|donotrun|vertex|endvertex|replace|TexParameter|buffer)\b/m.test(source)) return true;
    // Fragmentarium-specific #define markers
    if (/^\s*#define\s+(provides|dontclearonchange|iterationsbetweenredraws|subframemax)/m.test(source)) return true;
    return false;
}

/** Slider/color/checkbox/file annotations on a uniform. NOT definitive on its
 *  own: the Workshop's variable promotion injects exactly these lines into an
 *  otherwise-DEC source, so this signal must yield to a positive DEC detection. */
function hasUniformAnnotations(source: string): boolean {
    return HAS_ANNOTATED_UNIFORM.test(source);
}

/**
 * Classify raw source text and dispatch to the appropriate format adapter.
 *
 * Priority:
 *   1. Strong frag markers (#include/#preset/… or .frag filename) → frag.
 *   2. DEC detection → dec. Runs BEFORE the weaker slider-annotation signal so
 *      that promoting a variable (which injects `uniform …; slider[…]`) doesn't
 *      misclassify a DEC formula as frag and lose its DE function.
 *   3. Uniform annotations (slider/…) without DEC shape → frag.
 *   4. Plain GLSL fallback.
 */
export function ingest(source: string, filename: string): RawSource {
    if (hasStrongFragMarkers(source, filename)) {
        return ingestFrag(source, filename);
    }

    if (isDecSource(source)) {
        return ingestDec(source, filename);
    }

    if (hasUniformAnnotations(source)) {
        return ingestFrag(source, filename);
    }

    return ingestPlainGlsl(source, filename);
}

export { ingestFrag, ingestDec, ingestPlainGlsl };
