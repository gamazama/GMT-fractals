/**
 * V4 Stage 2 — Preprocess orchestrator.
 *
 * Pipeline order (matches Fragmentarium's Preprocessor.cpp):
 *   1. Resolve #include → collect builtin GLSL to prepend (before stripping)
 *   2. Extract #preset blocks (removes them from source, collects values)
 *   3. Strip directives + apply #replace
 *   4. Parse uniform annotations (rewrites uniform lines to plain GLSL,
 *      captures structured ParamAnnotation records)
 *   5. Prepend builtin code → final glsl
 *
 * Input: RawSource from ingest (already filtered for rejections).
 * Output: PreprocessedSource with clean GLSL, structured params, presets.
 */

import type { RawSource, PreprocessedSource, Result } from '../types';
import { resolveIncludes, injectFragMathDefinesIfReferenced } from './includes';
import { extractPresets } from './presets';
import { stripAndReplace } from './strip';
import { parseAnnotations } from './annotations';

export function preprocess(raw: RawSource): Result<PreprocessedSource> {
    if (raw.renderModel === 'unsupported') {
        // Should have been caught by the caller; guard anyway.
        return { ok: false, error: raw.rejectReason ?? {
            kind: 'internal_error', message: 'preprocess called on unsupported raw source',
        } };
    }

    let source = raw.source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const warnings: string[] = [];

    // Step 1: Resolve includes → builtin GLSL (+ auto-inject math defines if referenced)
    const { builtinCode } = resolveIncludes(source);
    const extraDefines = injectFragMathDefinesIfReferenced(source);

    // Step 2: Extract presets
    const presetResult = extractPresets(source);
    source = presetResult.glsl;
    warnings.push(...presetResult.warnings);

    // Step 3: Strip directives, apply #replace
    const stripResult = stripAndReplace(source);
    source = stripResult.glsl;
    warnings.push(...stripResult.warnings);

    // Step 4: Parse annotations (rewrites uniform lines)
    const annotResult = parseAnnotations(source);
    source = annotResult.glsl;
    warnings.push(...annotResult.warnings);

    // Step 5: Merge preset Default values into parameter defaultValue
    // (preset values override annotation-based defaults)
    const defaultPreset = presetResult.presets.get('Default');
    if (defaultPreset) {
        for (const p of annotResult.parameters) {
            if (p.name in defaultPreset) {
                p.defaultValue = defaultPreset[p.name];
            }
        }
    }

    // Step 6: Prepend builtin code and any reference-based math defines
    const prelude = [extraDefines, builtinCode].filter(s => s).join('\n');
    const finalGlsl = prelude ? (prelude + '\n' + source) : source;

    return {
        ok: true,
        value: {
            glsl: finalGlsl,
            parameters: annotResult.parameters,
            presets: presetResult.presets,
            info: stripResult.info,
            warnings,
        },
    };
}
