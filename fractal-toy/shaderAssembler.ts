/**
 * shaderAssembler — composes a raymarching fragment shader by reading
 * back sections that features registered on a ShaderBuilder.
 *
 * This is the first real use of ShaderBuilder.addSection(name, code) as
 * the plugin escape hatch described in docs/01_Architecture.md. The
 * engine has no idea what "formulaFunction" or "rayMarchBody" mean —
 * that vocabulary is owned by this assembler, which both the features
 * and the assembler itself cooperate on.
 *
 * Sections this assembler consumes:
 *   'formulaFunction' — GLSL function defs for the fractal iteration formula
 *   'formulaCall'     — the one-line body that runs the iteration
 *                       (e.g. `formula_Mandelbulb(z, dr, trap, c);`)
 *
 * For 1b there are no features registered yet, so both sections are empty
 * and the shader falls back to a gradient output that proves the GL path
 * is alive. 1c adds the mandelbulb feature which populates these sections.
 *
 * Standard uniforms the assembler always declares (set by FractalEngine
 * per-frame, not through ShaderBuilder):
 *   uTime       — seconds since engine start
 *   uResolution — canvas dimensions in pixels
 *   uFrame      — integer frame counter
 */

import type { ShaderBuilder } from '../engine/ShaderBuilder';

export const assembleRayMarchShader = (builder: ShaderBuilder): string => {
    const defines   = builder.buildDefinesBlock();
    const uniforms  = builder.buildUniformsBlock();
    const headers   = builder.getHeaders().join('\n');
    const preambles = builder.getPreambles().join('\n');
    const functions = builder.getFunctions().join('\n');

    const formulaFns  = builder.getSections('formulaFunction').join('\n');
    const formulaCall = builder.getSections('formulaCall').join('\n');

    const hasFormula = builder.getSections('formulaCall').length > 0;
    const mainBody = hasFormula ? RAYMARCH_BODY(formulaCall) : GRADIENT_BODY;

    return `#version 300 es
precision highp float;

${defines}

${headers}

// --- Built-in uniforms (set by FractalEngine each frame) ---
uniform float uTime;
uniform vec2  uResolution;
uniform int   uFrame;

// --- Feature-declared uniforms ---
${uniforms}

${preambles}

${functions}

// --- Feature-declared formula functions ---
${formulaFns}

in vec2 vUv;
out vec4 fragColor;

void main() {
${mainBody}
}
`;
};

// Gradient test pattern — confirms the GL path without any formula.
// vUv is [0,1]^2. Adds a subtle time pulse so you can see it's live.
const GRADIENT_BODY = `
    vec3 col = vec3(vUv, 0.5 + 0.4 * sin(uTime));
    // Subtle diagonal ripple to distinguish this from a still gradient.
    col += 0.05 * sin(20.0 * (vUv.x + vUv.y) - uTime * 2.0);
    fragColor = vec4(col, 1.0);
`;

// Raymarching template. Wraps the feature-registered formulaCall inside
// an iteration loop and a distance-estimator / normal-estimate flow.
// Lands in 1c with the mandelbulb feature. For now the gradient body
// runs because no formula is registered.
const RAYMARCH_BODY = (formulaCall: string): string => `
    // Placeholder raymarching body — fleshed out in 1c/1d/1e.
    // When the mandelbulb feature is present, this will run the
    // iteration loop and distance estimator. For now just a hint.
    ${formulaCall}
    fragColor = vec4(vUv, 0.5, 1.0);
`;
