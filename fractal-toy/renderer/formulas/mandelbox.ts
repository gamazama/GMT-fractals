/**
 * Mandelbox (Tglad / "AmazingBox") — folding fractal.
 *
 * The second formula in fractal-toy: a different DE, different uniform
 * set, so switching between Mandelbulb and Mandelbox exercises the
 * assembler's formula-swap path end-to-end (shader rebuild + uniform
 * re-binding via CompileGate).
 *
 * Box fold + sphere fold + scale. A compact inline version of GMT's
 * `AmazingBox.ts` with the two fold helpers folded into the formula
 * function body — no shared GLSL helpers needed, so the formula plugs
 * into the assembler with no extra wiring.
 */

import type { FormulaDefinition } from '../formulaRegistry';

const MANDELBOX_GLSL = `
void formula_Mandelbox(inout vec4 z, inout float dr, vec4 c) {
    vec3 z3 = z.xyz;

    // Box fold: reflect components outside [-foldLimit, +foldLimit].
    z3 = clamp(z3, -uFoldLimit, uFoldLimit) * 2.0 - z3;

    // Sphere fold: invert shell between minR and fixedR.
    float r2 = dot(z3, z3);
    float minR2   = uMinRadius   * uMinRadius;
    float fixedR2 = uFixedRadius * uFixedRadius;
    if (r2 < minR2) {
        float t = fixedR2 / minR2;
        z3 *= t;
        dr *= t;
    } else if (r2 < fixedR2) {
        float t = fixedR2 / r2;
        z3 *= t;
        dr *= t;
    }

    // Scale + offset.
    z3 = z3 * uScale + c.xyz;
    dr = dr * abs(uScale) + 1.0;

    z.xyz = z3;
}
`;

export const MandelboxFormula: FormulaDefinition = {
    id: 'Mandelbox',
    name: 'Mandelbox',
    description: 'Folding fractal discovered by Tglad. Creates architectural lattices through box + sphere folds followed by scaling.',
    glsl: MANDELBOX_GLSL,
    call: 'formula_Mandelbox(z, dr, c);',
    // Scale-folding fractal — linear DE + wide escape so dr has room to grow.
    deExpr: 'r / abs(dr)',
    escapeRadius: 1024.0,
    uniforms: [
        { name: 'uIterations',  type: 'int'   },
        { name: 'uScale',       type: 'float' },
        { name: 'uMinRadius',   type: 'float' },
        { name: 'uFoldLimit',   type: 'float' },
        { name: 'uFixedRadius', type: 'float' },
    ],
    params: {
        iterations:  { type: 'int',   default: 18,  min: 4,   max: 32,  step: 1,     label: 'Iterations' },
        scale:       { type: 'float', default: 2.0, min: -4,  max: 4,   step: 0.001, label: 'Scale' },
        minRadius:   { type: 'float', default: 0.5, min: 0,   max: 1.5, step: 0.001, label: 'Min Radius' },
        foldLimit:   { type: 'float', default: 1.0, min: 0.1, max: 2.0, step: 0.001, label: 'Fold Limit' },
        fixedRadius: { type: 'float', default: 1.0, min: 0.1, max: 3.0, step: 0.001, label: 'Fixed Radius' },
    },
    pushUniforms: (u, s) => {
        u.setI('uIterations',  s.iterations  ?? 18);
        u.setF('uScale',       s.scale       ?? 2.0);
        u.setF('uMinRadius',   s.minRadius   ?? 0.5);
        u.setF('uFoldLimit',   s.foldLimit   ?? 1.0);
        u.setF('uFixedRadius', s.fixedRadius ?? 1.0);
    },
};
