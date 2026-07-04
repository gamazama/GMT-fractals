/**
 * BoxFold formulas — geometry's Hybrid Box fold step as REGISTERED
 * FractalDefinitions, one per fold type (ADR-0089 P4.5; owner call 2026-07-04).
 *
 * Each def wraps the SAME fold GLSL geometry's Hybrid Box uses (FOLD_LIST is
 * the single source of truth — the GLSL is remapped, never copied by hand) in
 * the formula_Hybrid step shape: [rot-in] → shift → fold → unshift → [rot-out]
 * → sphereFold → scale(+vary) → optional +c. This is what makes Hybrid Box's
 * INTERLEAVED mode absorbable by the weave core: a legacy interleaved scene
 * migrates to a weave whose layer slot is the matching BoxFold formula
 * (utils/weaveMigration.ts), and the weave picker gains fold slots for free.
 *
 * Param slots (mirroring the legacy hybrid* params — BOXFOLD_LEGACY_KEYS is
 * the migration's value map):
 *   paramA = Scale · paramB = Scale Variation · paramC = Min Radius ·
 *   paramD = Fixed Radius · paramE = Add Constant (toggle) ·
 *   paramF = Center Z (menger only) · vec3A = Fold Limit · vec3B = Shift ·
 *   vec3C = Rotation · vec4A.xyz = fold-specific vec (folding value / kali
 *   constant / menger offset; w unused)
 *
 * The legacy hybridPermute c-swizzle is NOT carried (compile-time permute on a
 * runtime def) — the migration warns when a scene used a non-default permute.
 *
 * Rotation is a per-pixel precalc (mat3 global + loopInit — the KaliBox
 * B-precalc pattern), so the defs weave cleanly (globals get the ws<k>_ slot
 * prefix; identity pairs are safe).
 *
 * NOTE: registered via registerBoxFoldFormulas() from registerFeatures() — not
 * from formulas/index.ts (that aggregator carries local-only exclusions).
 */
import type { FractalDefinition } from '../types/fractal';
import type { Capability } from '../types/capabilities';
import { FOLD_LIST } from '../features/geometry/folds';
import type { FoldDefinition } from '../features/geometry/types';
import { registry } from '../engine/FractalRegistry';

/** Formula id for a fold index (`BoxFoldStandard`, `BoxFoldKali`, …). */
export function boxFoldFormulaId(foldIndex: number): string {
    const f = FOLD_LIST[foldIndex] ?? FOLD_LIST[0];
    return `BoxFold${f.id.charAt(0).toUpperCase()}${f.id.slice(1)}`;
}

/** Fold-specific extra vec3 (uniform name → the def's vec4A.xyz), per fold id. */
const EXTRA_VEC: Record<string, { uniform: string; label: string; legacyKey: string }> = {
    decoupled: { uniform: 'uHybridFoldingValue', label: 'Folding Value', legacyKey: 'hybridFoldingValue' },
    kali: { uniform: 'uHybridKaliConstant', label: 'Kali Constant', legacyKey: 'hybridKaliConstant' },
    menger: { uniform: 'uHybridMengerOffset', label: 'Offset', legacyKey: 'hybridMengerOffset' },
};

/** Legacy geometry-state key per declared slot id — the migration's value map.
 *  vec4A carries the fold-specific vec3 (see EXTRA_VEC). */
export const BOXFOLD_LEGACY_KEYS: Record<string, string> = {
    paramA: 'hybridScale',
    paramB: 'hybridScaleVary',
    paramC: 'hybridMinR',
    paramD: 'hybridFixedR',
    paramE: 'hybridAddC',
    paramF: 'hybridMengerCenterZ',
    vec3A: 'hybridFoldLimitVec',
    vec3B: 'hybridShift',
    vec3C: 'hybridRot',
};

/** Folds whose body actually reads the foldLimit argument. */
const USES_FOLD_LIMIT = new Set(['standard', 'mirror', 'half', 'decoupled']);

function buildDef(fold: FoldDefinition, index: number): FractalDefinition {
    const id = boxFoldFormulaId(index);
    const P = `bf${fold.id}_`;
    const wrap = (fold.rotMode ?? 'wrap') === 'wrap';
    const selfContained = !!fold.selfContained;
    const extra = EXTRA_VEC[fold.id];

    // The fold GLSL verbatim, renamed to a per-def helper (`bf<id>_fold(z, dr)`;
    // the fold body keeps its own `z` — a vec3 param, exactly geometry's
    // foldOperation signature) with its uniforms remapped onto the def's
    // generic slots: foldLimit (the arg) → uVec3A, the fold-specific uHybrid*
    // → this def's slots. FOLD_LIST stays the single source of truth.
    let foldFn = fold.glsl
        .replace(/\bfoldOperation\s*\(\s*inout\s+vec3\s+z\s*,\s*inout\s+float\s+dr\s*,\s*vec3\s+foldLimit\s*\)/, `${P}fold(inout vec3 z, inout float dr)`)
        .replace(/\bfoldLimit\b/g, 'uVec3A')
        .replace(/\buHybridScale\b/g, 'uParamA')
        .replace(/\buHybridMengerCenterZ\b/g, 'uParamF');
    if (extra) foldFn = foldFn.replace(new RegExp(`\\b${extra.uniform}\\b`, 'g'), 'uVec4A.xyz');
    if (!foldFn.includes(`${P}fold(`)) throw new Error(`[boxFolds] fold signature rename failed for "${fold.id}"`);

    const rotIn = wrap ? `    if (${P}hasRot) z3 = ${P}rotMat * z3;\n` : '';
    const rotOutFold = wrap ? `    if (${P}hasRot) z3 = transpose(${P}rotMat) * z3;\n` : '';
    const rotPostSphere = !wrap ? `    if (${P}hasRot) z3 = ${P}rotMat * z3;\n` : '';

    const scaleStep = selfContained
        ? '' // fold handles scaling + DR internally (menger)
        : `    sphereFold(z3, dr, uParamC, uParamD);
${rotPostSphere}    float s = uParamA + uParamB * (abs(uParamA) - 1.0);
    z3 *= s;
`;
    const drStep = selfContained ? '' : '    dr = dr * abs(s) + 1.0;\n';

    const fn = `${foldFn.trim()}

void formula_${id}(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 z3 = z.xyz;
${rotIn}    z3 += uVec3B;
    ${P}fold(z3, dr);
    z3 -= uVec3B;
${rotOutFold}${scaleStep}    if (uParamE > 0.5) z3 += c.xyz;
    z.xyz = z3;
${drStep}    trap = min(trap, getLength(z3));
}`;

    const preamble = `mat3 ${P}rotMat;
bool ${P}hasRot;
`;
    const loopInit = `${P}hasRot = (abs(uVec3C.x) + abs(uVec3C.y) + abs(uVec3C.z)) > 0.001;
${P}rotMat = mat3(1.0);
if (${P}hasRot) {
    float sx = sin(uVec3C.x), cx = cos(uVec3C.x);
    float sy = sin(uVec3C.y), cy = cos(uVec3C.y);
    float sz = sin(uVec3C.z), cz = cos(uVec3C.z);
    ${P}rotMat = mat3(
        cy*cz, -cy*sz, sy,
        sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy,
        -cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy
    );
}
`;

    const d = fold.defaults ?? {};
    const v3 = (v: any, dx = 0, dy = 0, dz = 0) => ({ x: v?.x ?? dx, y: v?.y ?? dy, z: v?.z ?? dz });
    const parameters: any[] = [
        { id: 'paramA', label: 'Scale', type: 'float', default: (d as any).hybridScale ?? 2.0, min: -3, max: 3, step: 0.01 },
    ];
    if (!selfContained) {
        parameters.push(
            { id: 'paramB', label: 'Scale Variation', type: 'float', default: 0, min: -1, max: 1, step: 0.01 },
            { id: 'paramC', label: 'Min Radius', type: 'float', default: (d as any).hybridMinR ?? 0.5, min: 0, max: 1.5, step: 0.01 },
            { id: 'paramD', label: 'Fixed Radius', type: 'float', default: (d as any).hybridFixedR ?? 1.0, min: 0.1, max: 3, step: 0.01 },
        );
    }
    parameters.push({ id: 'paramE', label: 'Add Constant', type: 'float', default: 0, min: 0, max: 1, step: 1, mode: 'toggle' });
    if (fold.id === 'menger') {
        parameters.push({ id: 'paramF', label: 'Center Z', type: 'float', default: 1, min: 0, max: 1, step: 1, mode: 'toggle' });
    }
    if (USES_FOLD_LIMIT.has(fold.id)) {
        parameters.push({ id: 'vec3A', label: 'Fold Limit', type: 'vec3', default: v3((d as any).hybridFoldLimitVec, 1, 1, 1), min: 0.1, max: 3, step: 0.01, linkable: true });
    }
    parameters.push(
        { id: 'vec3B', label: 'Shift', type: 'vec3', default: { x: 0, y: 0, z: 0 }, min: -2, max: 2, step: 0.01 },
        { id: 'vec3C', label: 'Rotation', type: 'vec3', default: { x: 0, y: 0, z: 0 }, min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', mode: 'rotation' },
    );
    if (extra) {
        const dv = v3((d as any)[extra.legacyKey], 1, 1, 1);
        parameters.push({ id: 'vec4A', label: `${extra.label} (xyz)`, type: 'vec4', default: { ...dv, w: 0 }, min: -3, max: 3, step: 0.01 });
    }

    const coreMath: Record<string, any> = { iterations: ((d as any).hybridIter ?? 3) * 4 };
    for (const p of parameters) coreMath[p.id] = p.default;

    return {
        id: id as any,
        name: `Box Fold · ${fold.label}`,
        shortDescription: `Hybrid Box "${fold.label}" fold as a standalone formula / weave slot.`,
        description: `Geometry's Hybrid Box fold step (${fold.label}) as a registered formula: fold → sphere fold → scale, the classic Mandelbox-family building block. Weave it with other formulas to reproduce (and go beyond) the legacy interleaved Hybrid Box.`,
        juliaType: 'offset',
        tags: ['boxfold', 'ifs'],
        shader: {
            function: fn,
            loopBody: `formula_${id}(z, dr, trap, c);`,
            loopInit,
            preamble,
            preambleVars: [`${P}rotMat`, `${P}hasRot`],
            capabilities: new Set<Capability>(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap']),
        } as any,
        parameters,
        defaultPreset: {
            formula: id as any,
            name: `Box Fold ${fold.label}`,
            features: {
                coreMath,
                quality: { estimator: 1.0, fudgeFactor: 0.45, distanceMetric: 0.0 },
            },
            cameraPos: { x: 0, y: 0, z: 6 },
            cameraRot: { x: 0, y: 0, z: 0, w: 1 },
            sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
            targetDistance: 6,
            cameraMode: 'Orbit',
        },
    };
}

let registered = false;

/** Build + register the nine BoxFold defs (idempotent). Called from
 *  registerFeatures() so every entry (app, harness, sweep) gets them; node
 *  test suites call it directly. */
export function registerBoxFoldFormulas(): void {
    if (registered) return;
    registered = true;
    FOLD_LIST.forEach((fold, i) => {
        registry.register(buildDef(fold, i));
    });
}
