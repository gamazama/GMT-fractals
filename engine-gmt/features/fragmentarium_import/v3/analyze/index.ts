/**
 * V3 Analysis orchestrator.
 *
 * Linear pipeline: source → preprocess → parse → extract → classify → FormulaAnalysis
 *
 * DEC detection/preprocessing runs BEFORE this module (same as V2).
 * This module receives standard Fragmentarium-format GLSL.
 */

import type { FormulaAnalysis, Result } from '../types';
import { preprocess, extractIncludes } from './preprocess';
import { buildImportedParams, extractPresets } from './params';
import { extractGlobals } from './globals';
import { extractFunctions, extractInitFunction } from './functions';
import { analyzeInit } from './init';

/**
 * Analyze Fragmentarium source and produce a FormulaAnalysis.
 *
 * @param source    Raw .frag source (after DEC preprocessing if applicable)
 * @param fileName  Optional file name for suggested formula naming
 */
export function analyzeSource(source: string, _fileName?: string): Result<FormulaAnalysis> {
    if (!source.trim()) {
        return { ok: false, error: 'No source provided.', stage: 'input' };
    }

    // Step 1: Extract metadata from raw source (before stripping)
    const presets = extractPresets(source);

    // Step 2: Preprocess — resolve includes, strip Frag syntax, expand #define macros
    const { cleanedSource, globalsSource, includes, builtinCode } = preprocess(source);

    // Step 2b: Extract globals from the macro-expanded source BEFORE computed globals
    // are stripped. This preserves initializer expressions (e.g. `vec4 scale = vec4(Scale,...) / MinRad2`)
    // that would otherwise be lost when the preprocessor strips them for AST parsing.
    const globals = extractGlobals(globalsSource);

    // Step 3: Build ImportedParam[] with preset resolution
    const params = buildImportedParams(source, presets);
    const paramNames = new Set(params.map(p => p.name));

    // Step 4: Extract functions from AST
    let functions;
    try {
        functions = extractFunctions(cleanedSource, paramNames);
    } catch (e) {
        return {
            ok: false,
            error: `GLSL parse failed: ${e instanceof Error ? e.message : String(e)}`,
            stage: 'ast-parse',
        };
    }

    if (functions.length === 0) {
        return {
            ok: false,
            error: 'No GLSL functions found. Make sure the code contains at least one function definition.',
            stage: 'function-extraction',
        };
    }

    // Step 5: Extract and classify init() function
    const initRaw = extractInitFunction(cleanedSource);
    const init = analyzeInit(initRaw?.body ?? null, globals, paramNames);

    // Step 6: Build warnings
    const warnings: string[] = [];
    if (/\bprovidesColor\b/.test(source)) {
        warnings.push('This formula uses providesColor — color output is not supported by GMT. Only the distance estimator will be imported.');
    }
    if (includes.length > 0) {
        const unresolved = includes.filter(inc => {
            const lower = inc.toLowerCase();
            return !lower.includes('mathutils') &&
                   !lower.includes('de-raytracer') &&
                   !lower.includes('de_raytracer') &&
                   !lower.includes('mandelbox') &&
                   !lower.includes('complex');
        });
        if (unresolved.length > 0) {
            warnings.push(`Unresolved includes: ${unresolved.join(', ')} — inline the required helpers manually.`);
        }
    }

    return {
        ok: true,
        value: {
            params,
            presets,
            functions,
            init,
            globals,
            includes,
            warnings,
            source,
        },
    };
}
