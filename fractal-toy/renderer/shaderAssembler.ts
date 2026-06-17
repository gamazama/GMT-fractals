/**
 * shaderAssembler — composes a raymarching fragment shader around the
 * currently-active formula from `formulaRegistry`.
 *
 * Before Phase A: features shoved GLSL into 'formulaFunction' /
 * 'formulaCall' sections on ShaderBuilder, and the assembler concatenated
 * everything.
 *
 * Phase A: formulas are registered separately from DDFS features. The
 * assembler asks `formulaRegistry.resolve(state.formula)` for the active
 * formula and splices only THAT formula's GLSL into the shader. Non-
 * formula features (Camera, Lighting) still use the generic
 * inject(builder, …) path so their uniforms + helpers flow through
 * ShaderBuilder normally.
 *
 * Uniform de-dup: formulas can declare `uIterations` (and so could others);
 * ShaderBuilder.addUniform is idempotent on (name, type) so re-
 * declarations are a no-op.
 *
 * Standard uniforms the assembler always declares (set by FractalEngine
 * per-frame, not via ShaderBuilder):
 *   uTime       — seconds since engine start
 *   uResolution — canvas dimensions in pixels
 *   uFrame      — integer frame counter
 */

import type { ShaderBuilder } from '../../engine/ShaderBuilder';
import type { FormulaDefinition } from './formulaRegistry';

export interface AssembleOptions {
    /** The active formula's definition. If undefined, the shader falls
     *  back to a gradient test pattern — useful for proving the GL path
     *  works before any formulas are registered. */
    formula?: FormulaDefinition;
}

export const assembleRayMarchShader = (builder: ShaderBuilder, options: AssembleOptions = {}): string => {
    const { formula } = options;

    // Declare formula uniforms through the builder so the assembled
    // uniforms block stays the single source of truth.
    if (formula) {
        for (const u of formula.uniforms) {
            builder.addUniform(u.name, u.type);
        }
    }

    const defines   = builder.buildDefinesBlock();
    const uniforms  = builder.buildUniformsBlock();
    const headers   = builder.getHeaders().join('\n');
    const preambles = builder.getPreambles().join('\n');
    const functions = builder.getFunctions().join('\n');

    const DEFAULT_DE = '0.5 * log(max(r, 1e-8)) * r / dr';
    const DEFAULT_ESCAPE = 2.0;
    const mainBody = formula
        ? RAYMARCH_BODY(formula.call, formula.deExpr ?? DEFAULT_DE, formula.escapeRadius ?? DEFAULT_ESCAPE)
        : GRADIENT_BODY;

    return `#version 300 es
precision highp float;

${defines}

${headers}

// --- Built-in uniforms (set by FractalEngine each frame) ---
uniform float uTime;
uniform vec2  uResolution;
uniform int   uFrame;

// --- Feature-declared + formula-declared uniforms ---
${uniforms}

${preambles}

${functions}

// --- Active formula function ---
${formula ? formula.glsl : ''}

in vec2 vUv;
out vec4 fragColor;

void main() {
${mainBody}
}
`;
};

// Gradient test pattern — confirms the GL path without any formula.
const GRADIENT_BODY = `
    vec3 col = vec3(vUv, 0.5 + 0.4 * sin(uTime));
    col += 0.05 * sin(20.0 * (vUv.x + vUv.y) - uTime * 2.0);
    fragColor = vec4(col, 1.0);
`;

// Raymarching template. Wraps the active formula's one-line call inside
// an iteration loop with a standard distance estimator
// (0.5 * log(r) * r / dr), traces the primary ray from an orbit camera,
// and shades with a single directional light + soft AO.
//
// Requires uniforms declared by registered features/formulas:
//   from formula: uIterations (shared across formulas)
//   from Camera:  uCamOrbitTheta, uCamOrbitPhi, uCamDistance, uCamFov, uCamTarget
//   from Light:   uLightDir, uLightColor, uLightIntensity, uAmbient, uAoAmount, uAlbedo
const RAYMARCH_BODY = (formulaCall: string, deExpr: string, escapeRadius: number): string => `
    // ── Screen → camera ray (pinhole) ──
    vec2 uv = vUv * 2.0 - 1.0;
    float aspect = uResolution.x / uResolution.y;

    float cp = cos(uCamOrbitPhi);
    vec3 camOffset = vec3(
        sin(uCamOrbitTheta) * cp,
        sin(uCamOrbitPhi),
        cos(uCamOrbitTheta) * cp
    ) * uCamDistance;
    vec3 camPos = uCamTarget + camOffset;

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

        vec4 z = vec4(pos, 0.0);
        vec4 c = vec4(pos, 0.0);
        float dr = 1.0;
        float r = 0.0;
        for (int i = 0; i < 32; i++) {
            if (i >= uIterations) break;
            ${formulaCall}
            r = length(z.xyz);
            if (r > ${escapeRadius.toFixed(1)}) break;
        }
        dist = ${deExpr};

        if (dist < HIT_EPS) { hit = true; break; }
        if (t > MAX_DIST) break;
        t += dist * 0.9;
    }

    // ── Shade ───────────────────────────────────────────────────
    vec3 col;
    if (hit) {
        // Finite-difference normal — re-runs the inner loop three times.
        const float hStep = 0.002;
        float dx, dy, dz;
        {
            vec3 pp = pos + vec3(hStep, 0.0, 0.0);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${formulaCall}
                r = length(z.xyz);
                if (r > ${escapeRadius.toFixed(1)}) break;
            }
            dx = ${deExpr};
        }
        {
            vec3 pp = pos + vec3(0.0, hStep, 0.0);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${formulaCall}
                r = length(z.xyz);
                if (r > ${escapeRadius.toFixed(1)}) break;
            }
            dy = ${deExpr};
        }
        {
            vec3 pp = pos + vec3(0.0, 0.0, hStep);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${formulaCall}
                r = length(z.xyz);
                if (r > ${escapeRadius.toFixed(1)}) break;
            }
            dz = ${deExpr};
        }
        vec3 n = normalize(vec3(dx, dy, dz) - vec3(dist));

        vec3 lightDir = normalize(uLightDir);
        float diff = max(0.0, dot(n, lightDir));
        col = uAlbedo * uLightColor * uLightIntensity * (uAmbient + (1.0 - uAmbient) * diff);

        float aoRaw = 1.0 - float(stepsUsed) / float(MAX_STEPS);
        float ao = mix(1.0, aoRaw, uAoAmount);
        col *= ao;
    } else {
        col = mix(vec3(0.02, 0.02, 0.04), vec3(0.08, 0.08, 0.12), vUv.y);
    }

    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
`;
