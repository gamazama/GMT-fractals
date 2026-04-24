/**
 * V4 Stage 1 — Plain GLSL ingest.
 *
 * Covers the case where a user pastes raw GLSL with a DE function but no
 * Fragmentarium metadata. Lightweight: we just check for a DE signature
 * and pass through. Downstream stages handle parameter discovery.
 */

import type { RawSource } from '../types';

export function ingestPlainGlsl(source: string, filename: string): RawSource {
    const hasDE = /\b(?:float|vec2|vec4)\s+(?:DE|de|sdf|map|sd|distance)\s*\(\s*vec3\b/.test(source);
    if (!hasDE) {
        return {
            format: 'glsl', source, filename,
            renderModel: 'unsupported',
            rejectReason: {
                kind: 'no_de_function',
                message: `${filename}: plain GLSL without a distance-estimator function (float DE(vec3) or similar).`,
                hint: 'V4 needs a DE function signature to import a formula.',
            },
        };
    }

    return { format: 'glsl', source, filename, renderModel: 'de3d' };
}
