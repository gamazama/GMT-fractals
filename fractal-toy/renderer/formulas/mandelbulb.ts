/**
 * Mandelbulb — verbatim port of GMT's `formulas/Mandelbulb.ts`.
 *
 * The classic 3D Mandelbrot extension by Daniel White / Paul Nylander,
 * with Tom Beddard's Radiolaria mutation.
 *
 * GMT's version uses generic param names (uParamA, uVec2A, …) so the same
 * uniforms can fit 40+ formulas without collision. Here we rename them to
 * feature-owned names (uPower, uPhaseTheta, …) because fractal-toy only
 * needs two formulas and the DDFS feature slice already namespaces them
 * under `state.mandelbulb`.
 */

import type { FormulaDefinition } from '../formulaRegistry';

const MANDELBULB_GLSL = `
void formula_Mandelbulb(inout vec4 z, inout float dr, vec4 c) {
    vec3 z3 = z.xyz;
    float r = length(z3);

    // Standard derivative — reuse pow(r, power-1) for both dr and zr.
    float power = uPower;
    float rp1 = pow(r, power - 1.0);
    dr = rp1 * power * dr + 1.0;

    // Spherical exponentiation.
    float theta = acos(clamp(z3.z / r, -1.0, 1.0));
    float phi   = atan(z3.y, z3.x);

    theta = theta * power + uPhaseTheta;
    phi   = phi   * power + uPhasePhi;

    float zr = rp1 * r;
    z3 = zr * vec3(sin(theta) * cos(phi),
                   sin(phi)   * sin(theta),
                   cos(theta));

    // Optional Z-twist.
    if (abs(uTwist) > 0.001) {
        float t = z3.z * uTwist;
        float s = sin(t);
        float cc = cos(t);
        z3.xy = mat2(cc, -s, s, cc) * z3.xy;
    }

    z3 += c.xyz;

    // Radiolaria mutation (Tom Beddard) — applied after iteration step.
    if (uRadiolariaEnabled > 0.5) {
        z3.y = min(z3.y, uRadiolariaLimit);
    }

    z.xyz = z3;
}
`;

export const MandelbulbFormula: FormulaDefinition = {
    id: 'Mandelbulb',
    name: 'Mandelbulb',
    description: 'The classic 3D extension of the Mandelbrot set. Power controls plus the Radiolaria mutation for skeletal/hollow effects.',
    glsl: MANDELBULB_GLSL,
    call: 'formula_Mandelbulb(z, dr, c);',
    uniforms: [
        { name: 'uIterations',        type: 'int'   },
        { name: 'uPower',             type: 'float' },
        { name: 'uPhaseTheta',        type: 'float' },
        { name: 'uPhasePhi',          type: 'float' },
        { name: 'uTwist',             type: 'float' },
        { name: 'uRadiolariaEnabled', type: 'float' },
        { name: 'uRadiolariaLimit',   type: 'float' },
    ],
    params: {
        iterations:        { type: 'int',     default: 16,  min: 4,     max: 32,   step: 1,    label: 'Iterations' },
        power:             { type: 'float',   default: 8.0, min: 2.0,   max: 16.0, step: 0.01, label: 'Power' },
        phaseTheta:        { type: 'float',   default: 0.0, min: -6.28, max: 6.28, step: 0.01, label: 'Phase θ' },
        phasePhi:          { type: 'float',   default: 0.0, min: -6.28, max: 6.28, step: 0.01, label: 'Phase φ' },
        twist:             { type: 'float',   default: 0.0, min: -2.0,  max: 2.0,  step: 0.01, label: 'Z Twist' },
        radiolariaEnabled: { type: 'boolean', default: false,                                  label: 'Radiolaria' },
        radiolariaLimit:   { type: 'float',   default: 0.5, min: -2.0,  max: 2.0,  step: 0.01, label: 'Radiolaria Limit' },
    },
    pushUniforms: (u, s) => {
        u.setI('uIterations',        s.iterations ?? 16);
        u.setF('uPower',             s.power ?? 8.0);
        u.setF('uPhaseTheta',        s.phaseTheta ?? 0.0);
        u.setF('uPhasePhi',          s.phasePhi ?? 0.0);
        u.setF('uTwist',             s.twist ?? 0.0);
        u.setF('uRadiolariaEnabled', s.radiolariaEnabled ? 1.0 : 0.0);
        u.setF('uRadiolariaLimit',   s.radiolariaLimit ?? 0.5);
    },
};
