/**
 * V4 Stage 4 — Emission orchestrator.
 *
 * Two emission paths exist in code:
 *   1. per-iteration (tryEmitPerIteration) — composes with engine features
 *      (interlace, hybrid fold, burning ship, pre/post rotation).
 *   2. self-contained SDE (emitSelfContained) — always works, no feature
 *      composition.
 *
 * Status 2026-04-17: the per-iter dispatcher is DISABLED by default. Measured
 * coverage (394 self-contained vs 330 with per-iter dispatched first) showed
 * a net regression — per-iter's webglCompile failures outweighed its engine-
 * compat gains. The per-iter emitter is kept in tree behind an opt-in flag
 * (`globalThis.V4_ENABLE_PER_ITER`) as foundation for future work. The
 * agreed forward direction (see docs/26 §0.1 "Strategy I") is to fix the
 * engine's feature injection to work on self-contained formulas directly,
 * rather than force every import through a regex-based loop-extraction path.
 *
 * Self-contained shape (emitSelfContained below):
 *   preamble:     helper functions + const/uninitialized globals + mutable global decls
 *   preambleVars: names of mutable globals (for future interlace compat; harmless today)
 *   loopInit:     renamed init() body + resets for mutable globals
 *   function:     renamed DE function + formula_X wrapper
 *   loopBody:     formula_X(z, dr, trap, c); break;
 *   getDist:      return vec2(r, dr);  (Style A — see emit/wrapper.ts)
 *   selfContainedSDE: true
 */

import { parse } from '@shaderfrog/glsl-parser';
import type { FractalDefinition } from '../../../../types/fractal';
import type { FormulaAnalysis, GeneratedFormula, Result } from '../types';
import { assignSlots } from './slots';
import { buildRenameMap, applyRenames } from './rename';
import { buildWrapper, sanitizeId } from './wrapper';
import { tryEmitPerIteration } from './per-iteration';
// Re-use V3's preset builder — it produces the `defaultPreset` shape
// (lights, features.coloring gradient, features.atmosphere, etc.) that the
// Workshop's applyFormulaDefaults + store.loadPreset expect. V4 emitting
// only features.coreMath was wiping the coloring gradient → panel went blank.
import { buildFractalParams } from '../../workshop/param-builder';
import type { WorkshopParam } from '../../types';

/**
 * Emit a FractalDefinition from a FormulaAnalysis.
 *
 * Dispatches to per-iteration when the formula's DE is structurally eligible;
 * falls back to self-contained SDE otherwise. Self-contained always succeeds
 * for any analysis that made it past stages 1-3.
 */
export function emit(
    analysis: FormulaAnalysis,
    formulaId: string,
    formulaName: string,
): Result<GeneratedFormula> {
    // Per-iter dispatcher is opt-in. Default: always self-contained.
    // Set `globalThis.V4_ENABLE_PER_ITER = true` in dev to experiment with
    // the per-iter path. See module-level comment for rationale.
    if ((globalThis as any).V4_ENABLE_PER_ITER) {
        const perIter = tryEmitPerIteration(analysis, formulaId, formulaName);
        if (perIter && perIter.ok && perIterParses(perIter.value)) return perIter;
    }

    return emitSelfContained(analysis, formulaId, formulaName);
}

/**
 * Parse the per-iter emission as a sanity check. Many per-iter transformations
 * produce subtly-broken GLSL (undeclared identifiers after rename, misplaced
 * declarations, unbalanced braces) that self-contained wouldn't hit. We catch
 * those here at emit time rather than waiting for the browser WebGL compiler.
 * A parse failure here means: fall back to self-contained, log, move on.
 */
function perIterParses(gen: GeneratedFormula): boolean {
    const shader = gen.definition.shader;
    // Build a minimal compilable chunk: preamble + function + getDist-body +
    // loopInit-body. We don't need the engine scaffold — we just want the
    // parser to agree the formula's contribution is well-formed GLSL.
    //
    // Wrap getDist and loopInit in throwaway function bodies so parse sees
    // statement context. `r`, `dr`, `iter`, `trap`, `z`, `c` are the engine's
    // ambient names — declared as inputs so unresolved uses don't false-fail.
    const probe = `#version 300 es
precision highp float;
// Engine-provided ambient names
vec4 g_orbitTrap = vec4(1e10);
uniform float uIterations, uParamA, uParamB, uParamC, uParamD, uParamE, uParamF;
uniform vec2 uVec2A, uVec2B, uVec2C;
uniform vec3 uVec3A, uVec3B, uVec3C;
uniform vec4 uVec4A, uVec4B, uVec4C;
uniform vec3 uJulia; uniform float uJuliaMode, uTime;
${shader.preamble ?? ''}
${shader.function ?? ''}
void _probe_loopInit(vec4 z, float dr, float trap, vec4 c) {
    ${shader.loopInit ?? ''}
}
vec2 _probe_getDist(float r, float dr, float iter, vec4 z) {
    ${shader.getDist ?? 'return vec2(r, dr);'}
}
`;
    try {
        parse(probe, { quiet: true });
        return true;
    } catch {
        return false;
    }
}

/**
 * Self-contained SDE emission — runs the user's DE verbatim inside a wrapper
 * that packs the result into z.xyzw. Engine's outer loop runs exactly once
 * via `loopBody: 'formula_X(...); break;'`. See wrapper.ts for the coloring
 * pack convention (Style A).
 */
export function emitSelfContained(
    analysis: FormulaAnalysis,
    formulaId: string,
    formulaName: string,
): Result<GeneratedFormula> {
    const warnings: string[] = [...analysis.preprocessed.warnings];

    // 1. Slot assignment
    const slots = assignSlots(analysis.parameters);
    warnings.push(...slots.warnings);

    // 2. Rename map (params + engine-colliding function names).
    // Include the selected DE so collisions like `DE` / `getDist` (both
    // reserved by the engine) trigger renaming of the user's DE body too.
    const allFunctionNames = [
        analysis.selectedDE.name,
        ...analysis.helperFunctions.map(h => h.name),
    ];
    const rename = buildRenameMap(analysis.parameters, slots, allFunctionNames);

    // 3. Assemble preamble: helpers + globals
    const preambleParts: string[] = [];

    // Ambient-define injection: if the selected DE body or helpers reference
    // Fragmentarium-standard symbols (time, M_PI, Phi, TWO_PI, iGlobalTime),
    // synthesize defines in the preamble. These were previously prepended to
    // the preprocessed source but analysis discards non-function content, so
    // they never reached ShaderFactory.
    const combinedDeSource =
        analysis.selectedDE.body + '\n'
        + analysis.helperFunctions.map(h => h.body).join('\n')
        + (analysis.initBody ?? '');
    const ambientDefines: string[] = [];
    if (/\btime\b/.test(combinedDeSource) && !/\b(?:uniform|float|int)\s+time\b/.test(combinedDeSource)) {
        ambientDefines.push('#define time uTime');
    }
    if (/\biGlobalTime\b/.test(combinedDeSource)) {
        ambientDefines.push('#define iGlobalTime uTime');
    }
    if (/\bM_PI\b/.test(combinedDeSource)) {
        ambientDefines.push('#define M_PI 3.14159265358979');
    }
    if (/\bPhi\b/.test(combinedDeSource) && !analysis.preprocessed.glsl.includes('#define Phi')) {
        ambientDefines.push('#define Phi 1.61803398874989');
    }
    if (/\bTWO_PI\b/.test(combinedDeSource) && !analysis.preprocessed.glsl.includes('#define TWO_PI')) {
        ambientDefines.push('#define TWO_PI 6.28318530717959');
    }
    for (const d of ambientDefines) preambleParts.push(d);

    // V4-owned orbit-trap global. All rename-rewritten `_v4_orbitTrap`
    // references in helpers + DE body need this in scope. The wrapper's end
    // will copy into the engine's g_orbitTrap so coloring modes see the value.
    preambleParts.push('vec4 _v4_orbitTrap = vec4(1e10);');

    // Const globals → declare as-is
    for (const g of analysis.constGlobals) {
        if (g.expression !== undefined) {
            preambleParts.push(`${g.type} ${g.name} = ${g.expression};`);
        } else {
            preambleParts.push(`${g.type} ${g.name};`);
        }
    }

    // Uninitialized globals → declare without init
    for (const g of analysis.uninitializedGlobals) {
        preambleParts.push(`${g.type} ${g.name};`);
    }

    // Mutable globals → declare without init (loopInit will reset)
    for (const g of analysis.mutableGlobals) {
        preambleParts.push(`${g.type} ${g.name};`);
    }

    // Ignored parameters (slot pressure overflow) → bake as const so their
    // references in the DE body compile. Uses the annotation's defaultValue
    // or a sensible zero for its type.
    for (const p of analysis.parameters) {
        if (slots.byName[p.name] !== 'ignore') continue;
        const glslType = paramGlslType(p.type);
        const constLiteral = paramDefaultLiteral(p);
        preambleParts.push(`const ${glslType} ${p.name} = ${constLiteral};`);
    }

    // Helper functions (including alternate DE candidates) — renamed, verbatim
    for (const h of analysis.helperFunctions) {
        const renamedBody = applyRenames(h.body, rename);
        preambleParts.push(renamedBody);
    }

    const preamble = preambleParts.join('\n\n');
    const preambleVars = analysis.mutableGlobals.map(g => g.name);

    // 4. loopInit: init() body + reset mutable globals to sensible values
    const loopInitParts: string[] = [];

    // Reset mutable globals so each pixel starts clean.
    // The initializer expression may reference renamed params (e.g.
    // `float MxMnR2 = MaxR2/MinR2;` needs MaxR2 → uParamA, MinR2 → uParamB).
    for (const g of analysis.mutableGlobals) {
        if (g.expression !== undefined) {
            const renamedExpr = applyRenames(g.expression, rename);
            loopInitParts.push(`${g.name} = ${renamedExpr};`);
        } else {
            loopInitParts.push(`${g.name} = ${defaultValueFor(g.type)};`);
        }
    }

    if (analysis.initBody) {
        loopInitParts.push(applyRenames(analysis.initBody, rename));
    }

    const loopInit = loopInitParts.join('\n').trim() || undefined;

    // 5. DE function + wrapper
    // If the user's DE name collides with an engine function (e.g. DE, map,
    // getDist), it was added to rename.functions → renamed in the body.
    // The wrapper must call the renamed name.
    const renamedDE = applyRenames(analysis.selectedDE.body, rename);
    const callName = rename.functions[analysis.selectedDE.name] ?? analysis.selectedDE.name;
    const wrapper = buildWrapper({ ...analysis.selectedDE, name: callName }, formulaId);
    const functionGlsl = `${renamedDE}\n\n${wrapper.wrapperGlsl}`;

    // 6. Build FractalParameter[] + defaultPreset via V3's buildFractalParams.
    //    We convert V4's ParamAnnotations into WorkshopParam shape. V3's
    //    builder then produces both `uiParams` (FractalParameter[]) and
    //    `defaultPreset` (full shape: formula, lights, features.coloring
    //    gradient, features.atmosphere, features.quality, features.coreMath).
    const workshopMappings: WorkshopParam[] = analysis.parameters.map(p => {
        const slot = slots.byName[p.name] ?? 'ignore';
        let uiDefault: number | number[];
        if (Array.isArray(p.defaultValue)) uiDefault = p.defaultValue;
        else if (typeof p.defaultValue === 'boolean') uiDefault = p.defaultValue ? 1 : 0;
        else uiDefault = (p.defaultValue as number) ?? 0;

        // Derive uiMin/uiMax from annotation range (collapse vec ranges to scalars)
        const rangeMin = p.range ? p.range[0] : 0;
        const rangeMax = p.range ? p.range[2] : 1;
        const uiMin = Array.isArray(rangeMin) ? Math.min(...(rangeMin as number[])) : (rangeMin as number);
        const uiMax = Array.isArray(rangeMax) ? Math.max(...(rangeMax as number[])) : (rangeMax as number);

        return {
            name: p.name,
            type: p.type === 'color3' ? 'vec3' : p.type === 'color4' ? 'vec4' : p.type as any,
            mappedSlot: slot,
            fixedValue: String(typeof p.defaultValue === 'number' ? p.defaultValue : 0),
            uiMin, uiMax,
            uiStep: p.type === 'int' ? 1 : ((uiMax - uiMin) / 200 || 0.01),
            uiDefault,
            isDegrees: p.isDegrees,
        };
    });
    const { uiParams: fracParams, defaultPreset } = buildFractalParams(workshopMappings, sanitizeId(formulaId));

    // Override iteration default with the formula's actual slider default.
    // V3's buildFractalParams hardcodes `features.coreMath.iterations: 15`;
    // if the formula has an Iterations-like param, use its authored default
    // instead (so e.g. Mandelbox keeps 16, QuaternionJulia keeps 20).
    const iterParam = analysis.parameters.find(
        p => (p.type === 'int' || p.type === 'float') && slots.byName[p.name] === 'builtin'
    );
    if (iterParam && typeof iterParam.defaultValue === 'number') {
        defaultPreset.features = defaultPreset.features || {};
        defaultPreset.features.coreMath = defaultPreset.features.coreMath || {};
        defaultPreset.features.coreMath.iterations = iterParam.defaultValue;
    }

    // 7. Assemble FractalDefinition
    const safeId = sanitizeId(formulaId);
    const definition: FractalDefinition = {
        id: safeId as any,
        name: formulaName,
        description: analysis.preprocessed.info,
        shader: {
            preamble,
            preambleVars: preambleVars.length > 0 ? preambleVars : undefined,
            loopInit,
            function: functionGlsl,
            loopBody: wrapper.loopBody,
            getDist: wrapper.getDist,
            selfContainedSDE: true,
        },
        parameters: fracParams,
        defaultPreset,
    };

    return {
        ok: true,
        value: {
            definition,
            slotAssignments: slots.byName,
            warnings,
        },
    };
}

function defaultValueFor(type: string): string {
    if (type === 'float' || type === 'int') return '0.0';
    if (type === 'bool') return 'false';
    if (type === 'vec2') return 'vec2(0.0)';
    if (type === 'vec3') return 'vec3(0.0)';
    if (type === 'vec4') return 'vec4(0.0)';
    if (type === 'mat2') return 'mat2(1.0)';
    if (type === 'mat3') return 'mat3(1.0)';
    if (type === 'mat4') return 'mat4(1.0)';
    return `${type}(0)`;
}

/** Map V4 ParamAnnotation type to a GLSL type string for declarations. */
function paramGlslType(t: string): string {
    if (t === 'float' || t === 'int' || t === 'bool') return t;
    if (t === 'vec2' || t === 'vec3' || t === 'vec4') return t;
    if (t === 'color3') return 'vec3';
    if (t === 'color4') return 'vec4';
    if (t === 'sampler2D') return 'sampler2D';  // can't const — but should not hit this path
    return 'float';
}

/** GLSL literal expression for a param's default (for const inlining of ignored params). */
function paramDefaultLiteral(p: import('../types').ParamAnnotation): string {
    const def = p.defaultValue;
    const typeStr = paramGlslType(p.type);

    if (p.type === 'bool') {
        return def === true ? 'true' : 'false';
    }
    if (p.type === 'int') {
        const n = typeof def === 'number' ? def : 0;
        return `${n}`;
    }
    if (p.type === 'float') {
        const n = typeof def === 'number' ? def : 0;
        return Number.isInteger(n) ? `${n}.0` : `${n}`;
    }
    if (Array.isArray(def)) {
        const vals = def.map(v => Number.isInteger(v) ? `${v}.0` : `${v}`);
        return `${typeStr}(${vals.join(', ')})`;
    }
    return `${typeStr}(0.0)`;
}
