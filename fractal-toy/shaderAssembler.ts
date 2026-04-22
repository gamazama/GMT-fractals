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
// an iteration loop with a standard Mandelbulb-style distance estimator,
// then traces a ray from a fixed camera (1c — camera becomes a feature
// in 1d) and shades with a single hardcoded directional light (1e makes
// that a feature too).
//
// The template requires these uniforms (declared by the feature's inject):
//   uIterations, uPower, uPhaseTheta, uPhasePhi, uTwist,
//   uRadiolariaEnabled, uRadiolariaLimit
//
// Escape bound (r > 2) and DE form (0.5 * log(r) * r / dr) match the
// canonical Mandelbulb distance estimator.
const RAYMARCH_BODY = (formulaCall: string): string => `
    // ── Screen → camera ray (pinhole, uCam* uniforms from camera feature) ──
    vec2 uv = vUv * 2.0 - 1.0;
    float aspect = uResolution.x / uResolution.y;

    // Orbit position from (θ, φ, distance) around uCamTarget.
    float cp = cos(uCamOrbitPhi);
    vec3 camOffset = vec3(
        sin(uCamOrbitTheta) * cp,
        sin(uCamOrbitPhi),
        cos(uCamOrbitTheta) * cp
    ) * uCamDistance;
    vec3 camPos = uCamTarget + camOffset;

    // Camera basis (right-handed, +Y-up).
    vec3 camForward = normalize(uCamTarget - camPos);
    vec3 camRight   = normalize(cross(camForward, vec3(0.0, 1.0, 0.0)));
    vec3 camUp      = cross(camRight, camForward);

    float halfFov = tan(radians(uCamFov) * 0.5);
    vec3 rayDir = normalize(
        camForward
        + camRight * (uv.x * aspect * halfFov)
        + camUp    * (uv.y * halfFov)
    );

    // ── Ray march ──────────────────────────────────────────────
    float t = 0.0;
    float dist = 0.0;
    vec3 pos = camPos;
    bool hit = false;
    int stepsUsed = 0;
    const int MAX_STEPS = 200;
    const float MAX_DIST = 20.0;
    const float HIT_EPS = 0.001;

    for (int s = 0; s < MAX_STEPS; s++) {
        stepsUsed = s;
        pos = camPos + rayDir * t;

        // Inline distance-estimator loop. Runs the feature-registered
        // formula \`uIterations\` times or until escape.
        vec4 z = vec4(pos, 0.0);
        vec4 c = vec4(pos, 0.0);
        float dr = 1.0;
        float r = 0.0;
        for (int i = 0; i < 32; i++) {
            if (i >= uIterations) break;
            ${formulaCall}
            r = length(z.xyz);
            if (r > 2.0) break;
        }
        dist = 0.5 * log(max(r, 1e-8)) * r / dr;

        if (dist < HIT_EPS) { hit = true; break; }
        if (t > MAX_DIST) break;
        t += dist * 0.9;
    }

    // ── Shade ───────────────────────────────────────────────────
    vec3 col;
    if (hit) {
        // Approximate normal via finite differences of mapSDF. For 1c
        // we re-run the inner iteration loop per-sample — expensive but
        // clear. A split into a proper mapSDF function happens in 1d.
        const float hStep = 0.002;
        float dx, dy, dz;
        {
            vec3 pp = pos + vec3(hStep, 0.0, 0.0);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${formulaCall}
                r = length(z.xyz);
                if (r > 2.0) break;
            }
            dx = 0.5 * log(max(r, 1e-8)) * r / dr;
        }
        {
            vec3 pp = pos + vec3(0.0, hStep, 0.0);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${formulaCall}
                r = length(z.xyz);
                if (r > 2.0) break;
            }
            dy = 0.5 * log(max(r, 1e-8)) * r / dr;
        }
        {
            vec3 pp = pos + vec3(0.0, 0.0, hStep);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${formulaCall}
                r = length(z.xyz);
                if (r > 2.0) break;
            }
            dz = 0.5 * log(max(r, 1e-8)) * r / dr;
        }
        vec3 n = normalize(vec3(dx, dy, dz) - vec3(dist));

        // Directional light (1e makes this a feature).
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.5));
        float diff = max(0.0, dot(n, lightDir));
        vec3 albedo = vec3(0.85, 0.72, 0.55);
        col = albedo * (0.15 + 0.85 * diff);

        // Soft AO from step count.
        float ao = 1.0 - float(stepsUsed) / float(MAX_STEPS);
        col *= mix(0.6, 1.0, ao);
    } else {
        // Background gradient.
        col = mix(vec3(0.02, 0.02, 0.04), vec3(0.08, 0.08, 0.12), vUv.y);
    }

    // Gamma correction.
    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
`;
