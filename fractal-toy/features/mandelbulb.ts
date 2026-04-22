/**
 * MandelbulbFeature — the raymarched 3D Mandelbulb formula as a DDFS feature.
 *
 * Exercises ShaderBuilder.addSection() as the engine's plugin escape hatch.
 * The feature's inject() registers GLSL under two named sections:
 *   'formulaFunction' — the formula_Mandelbulb GLSL function definition
 *   'formulaCall'     — the one-line call from within the iteration loop
 *
 * fractal-toy/shaderAssembler.ts reads these sections to build the full
 * raymarching fragment shader. The engine itself never interprets the
 * section names — they're a private vocabulary between this feature
 * and the assembler.
 *
 * Based on GMT's formulas/Mandelbulb.ts (the classic 3D Mandelbrot
 * extension by Daniel White / Paul Nylander / Tom Beddard's Radiolaria).
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

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

export const MandelbulbFeature: FeatureDefinition = {
    id: 'mandelbulb',
    name: 'Mandelbulb',
    category: 'Fractal',

    tabConfig: {
        label: 'Mandelbulb',
        componentId: 'auto-feature-panel',
        order: 0,
        dock: 'right',
        defaultActive: true,
    },

    params: {
        iterations:        { type: 'int',     default: 16,  min: 4,     max: 32,   step: 1,    label: 'Iterations' },
        power:             { type: 'float',   default: 8.0, min: 2.0,   max: 16.0, step: 0.01, label: 'Power' },
        phaseTheta:        { type: 'float',   default: 0.0, min: -6.28, max: 6.28, step: 0.01, label: 'Phase θ' },
        phasePhi:          { type: 'float',   default: 0.0, min: -6.28, max: 6.28, step: 0.01, label: 'Phase φ' },
        twist:             { type: 'float',   default: 0.0, min: -2.0,  max: 2.0,  step: 0.01, label: 'Z Twist' },
        radiolariaEnabled: { type: 'boolean', default: false,                                   label: 'Radiolaria' },
        radiolariaLimit:   { type: 'float',   default: 0.5, min: -2.0,  max: 2.0,  step: 0.01, label: 'Radiolaria Limit' },
    },

    inject: (builder) => {
        // Uniforms — feature-owned, set per-frame by FractalToyApp.
        builder.addUniform('uIterations', 'int');
        builder.addUniform('uPower', 'float');
        builder.addUniform('uPhaseTheta', 'float');
        builder.addUniform('uPhasePhi', 'float');
        builder.addUniform('uTwist', 'float');
        builder.addUniform('uRadiolariaEnabled', 'float');
        builder.addUniform('uRadiolariaLimit', 'float');

        // Sections consumed by fractal-toy/shaderAssembler.ts.
        builder.addSection('formulaFunction', MANDELBULB_GLSL);
        builder.addSection('formulaCall', `formula_Mandelbulb(z, dr, c);`);
    },
};
