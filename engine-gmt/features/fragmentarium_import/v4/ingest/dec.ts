/**
 * V4 Stage 1 — DEC (Distance Estimator Compendium) ingest.
 *
 * Thin wrapper: if the source is DEC-shaped, run it through the existing
 * dec-preprocessor to produce Fragmentarium-compatible source, then hand
 * off to ingestFrag for the standard frag classification.
 *
 * DEC sources are raw `float de(vec3 p)` functions with #defined constants.
 * They have no #include directives, so renderModel is always 'de3d' if a
 * DE function is present.
 */

import type { RawSource } from '../types';
import { detectDECFormat } from '../../parsers/dec-detector';
import { preprocessDEC } from '../../parsers/dec-preprocessor';

/** Minimum confidence to treat a source as DEC. Matches existing threshold. */
export const DEC_CONFIDENCE_MIN = 0.4;

/** Returns true if the source looks like DEC (ready to be ingestDec()'d). */
export function isDecSource(source: string): boolean {
    const det = detectDECFormat(source);
    return det.isDEC && det.confidence >= DEC_CONFIDENCE_MIN;
}

export function ingestDec(source: string, filename: string): RawSource {
    let preprocessedGLSL: string;
    try {
        preprocessedGLSL = preprocessDEC(source).fragmentariumSource;
    } catch (e: any) {
        return {
            format: 'dec', source, filename,
            renderModel: 'unsupported',
            rejectReason: {
                kind: 'internal_error',
                message: `${filename}: DEC preprocess failed: ${e?.message?.slice(0, 120) ?? e}`,
            },
        };
    }

    // DEC sources don't have render-model signalling; if a DE function
    // exists in the preprocessed output, accept it.
    const hasDE = /\b(?:float|vec2|vec4)\s+(?:DE|de|sdf|map|sd|distance)\s*\(\s*vec3\b/.test(preprocessedGLSL);
    if (!hasDE) {
        return {
            format: 'dec', source, filename,
            renderModel: 'unsupported',
            rejectReason: {
                kind: 'no_de_function',
                message: `${filename}: DEC preprocess succeeded but no DE function signature found.`,
            },
        };
    }

    return {
        format: 'dec',
        source: preprocessedGLSL,      // downstream stages see preprocessed GLSL
        filename,
        renderModel: 'de3d',
    };
}
