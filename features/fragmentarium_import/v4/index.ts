/**
 * V4 Frag/DEC Importer — public entry point.
 *
 * Canonical plan: docs/26_Formula_Workshop_V4_Plan.md §12
 *
 * Usage:
 *   const result = await processFormula(fragSource, 'MyFormula.frag');
 *   if (result.ok) {
 *       registry.register(result.value.definition);
 *       FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, {
 *           id: result.value.definition.id,
 *           shader: result.value.definition.shader,
 *       });
 *   } else {
 *       console.error(result.error.message);
 *   }
 */

import type { Result, GeneratedFormula } from './types';
import { ingest } from './ingest';
import { preprocess } from './preprocess';
import { analyze } from './analyze';
import { emit } from './emit';

/**
 * Import a .frag / .dec / bare-GLSL formula as a GMT FractalDefinition.
 *
 * Pipeline:
 *   ingest/     → RawSource             (format + render-model classification)
 *   preprocess/ → PreprocessedSource    (#include resolve, annotations, presets)
 *   analyze/    → FormulaAnalysis       (DE detection, helpers, globals, init)
 *   emit/       → GeneratedFormula      (FractalDefinition with selfContainedSDE: true)
 *
 * @param source     Raw source text (.frag / .dec / plain GLSL)
 * @param filename   Filename or identifier for error messages
 * @param formulaId  Optional explicit ID (defaults to filename stem)
 * @param formulaName Optional display name (defaults to filename stem)
 */
export function processFormula(
    source: string,
    filename: string,
    formulaId?: string,
    formulaName?: string,
): Result<GeneratedFormula> {
    // Derive default IDs from filename
    const stem = filename.replace(/\.[^.]*$/, '').replace(/.*[\\/]/, '');
    const id = formulaId ?? stem;
    const name = formulaName ?? stem;

    // 1. Ingest
    const raw = ingest(source, filename);
    if (raw.renderModel === 'unsupported') {
        return { ok: false, error: raw.rejectReason! };
    }

    // 2. Preprocess
    const pre = preprocess(raw);
    if (!pre.ok) return pre;

    // 3. Analyze
    const ana = analyze(pre.value);
    if (!ana.ok) return ana;

    // 4. Emit
    return emit(ana.value, id, name);
}

export * from './types';
