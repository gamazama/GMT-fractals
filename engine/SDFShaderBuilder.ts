// SDFShaderBuilder.ts — Standalone SDF GLSL generation from FractalDefinition
// Shared between mesh export GPU pipeline and (eventually) the main app.
// Produces complete #version 300 es fragment shaders for:
//   - SDF sampling (multi-sample voxel density)
//   - Escape test (interior/exterior classification)
//   - Newton projection (refine vertex positions onto isosurface)
//   - Vertex colorization (orbit trap → false color)
//   - Raymarching preview (quick 3D preview from camera)

import type { FractalDefinition } from '../types/fractal';
import { MESH_GLSL_UNIFORMS, MESH_GLSL_HELPERS } from '../shaders/chunks/math';

// ============================================================================
// Types
// ============================================================================

export interface MeshShaderConfig {
  definition: FractalDefinition;
  deType: 'power' | 'ifs' | 'auto';
  deSamples?: number;
}

export type DEType = 'power' | 'ifs' | 'custom';

// ============================================================================
// DE Type Classification
// ============================================================================

/** Auto-detect DE type from formula GLSL source */
export function classifyDEType(def: FractalDefinition): DEType {
  if (def.shader.getDist) return 'custom';
  const body = def.shader.function + ' ' + def.shader.loopBody + ' ' + (def.shader.preamble || '');
  if (/boxFold|sphereFold/.test(body)) return 'ifs';
  // Sierpinski-type: linear DR accumulation without pow()
  if (/dr\s*=\s*dr\s*\*\s*\w/.test(body) && !/pow\s*\(/.test(body)) return 'ifs';
  // Fold-based: abs() on z combined with DR scaling, no pow()
  if (/abs\s*\(\s*z/.test(body) && /dr\s*[\*=]/.test(body) && !/pow\s*\(/.test(body)) return 'ifs';
  return 'power';
}

/** Resolve 'auto' to concrete DE type */
function resolveDE(config: MeshShaderConfig): DEType {
  if (config.deType !== 'auto') return config.deType;
  return classifyDEType(config.definition);
}

// ============================================================================
// Internal GLSL Building Blocks
// ============================================================================

/** Build the _getDistCustom wrapper if formula has getDist, else empty string */
function buildGetDistBlock(def: FractalDefinition): string {
  if (!def.shader.getDist) return '';
  return `
vec2 _getDistCustom(float r, float safeDr, float iter, vec4 z) {
  float dr = safeDr;
  ${def.shader.getDist}
}
`;
}

/** Build the DE return expression for formulaDE() */
function buildDEReturn(deType: DEType, hasCustomDist: boolean, thresholdExpr: string): string {
  if (hasCustomDist) {
    return deType === 'ifs'
      ? `return _getDistCustom(r, safeDr, iter, z).x - ${thresholdExpr};`
      : `return _getDistCustom(r, safeDr, iter, z).x;`;
  }
  if (deType === 'power') {
    return `// Power fractals: orbit must escape (r > 2) for valid DE.
    // Non-escaped = interior sentinel.
    if (r > 2.0) return 0.5 * log(r) * r / safeDr;
    return -1.0;`;
  }
  // IFS without custom getDist
  return `return (r - 1.0) / safeDr - ${thresholdExpr};`;
}

/** Build the common formula iteration block */
function buildIterationLoop(def: FractalDefinition, itersVar: string): string {
  return `  vec4 z = vec4(pos, 0.0);
  vec4 c = mix(z, vec4(uJulia, 0.0), step(0.5, uJuliaMode));
  float dr = 1.0;
  float trap = 1e10;
  float iter = 0.0;
  ${def.shader.loopInit || ''}

  for (int i = 0; i < 100; i++) {
    if (i >= ${itersVar}) break;
    float r2 = dot(z.xyz, z.xyz);
    if (r2 > 1e4) break;
    ${def.shader.loopBody}
    iter += 1.0;
  }`;
}

// ============================================================================
// Vertex Shader (shared by all passes)
// ============================================================================

/** Fullscreen quad vertex shader via gl_VertexID */
export const MESH_SDF_VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID & 1) * 2 - 1, (gl_VertexID >> 1) * 2 - 1);
  gl_Position = vec4(p, 0, 1);
}`;

// ============================================================================
// Shader Builders
// ============================================================================

/**
 * Build SDF fragment shader from FractalDefinition.
 * Assembles: uniforms + helpers + preamble + function + formulaDE wrapper + main
 * Outputs per-voxel SDF distance with multi-sample averaging.
 */
export function buildMeshSDFShader(config: MeshShaderConfig): string {
  const def = config.definition;
  const deType = resolveDE(config);
  const deSamples = config.deSamples || 2;

  const getDistBlock = buildGetDistBlock(def);
  const deReturn = buildDEReturn(deType, !!def.shader.getDist, 'uBoundsRange * uInvRes * 0.5');

  return `#version 300 es
precision highp float;
uniform float uZ;
uniform float uPower;
uniform int   uIters;
uniform float uInvRes;
uniform vec2  uTileOffset;
uniform vec3  uBoundsMin;
uniform float uBoundsRange;
${MESH_GLSL_UNIFORMS}
out vec4 fragColor;

${MESH_GLSL_HELPERS}

// --- Preamble (global variables / helpers) ---
${def.shader.preamble || ''}

// --- Formula function ---
${def.shader.function}

${getDistBlock}
float formulaDE(vec3 pos, float power, int iters) {
${buildIterationLoop(def, 'iters')}

  float r = length(z.xyz);
  float safeDr = max(abs(dr), 1e-10);
  ${deReturn}
}

void main() {
  float voxelSize = uBoundsRange * uInvRes;
  vec3 center = vec3(
    (gl_FragCoord.x + uTileOffset.x) * uInvRes * uBoundsRange + uBoundsMin.x,
    (gl_FragCoord.y + uTileOffset.y) * uInvRes * uBoundsRange + uBoundsMin.y,
    uZ * uBoundsRange + uBoundsMin.z
  );

  const int SS = ${deSamples};
  const int TOTAL = SS * SS * SS;
  float step = 1.0 / float(SS);
  float halfStep = step * 0.5;
  float h = voxelSize * 0.5;

  float sumDist = 0.0;
  int insideCount = 0;
  int outsideCount = 0;
  float minOutsideDist = 1e10;

  float jx = fract(sin(dot(center.xy, vec2(12.9898, 78.233))) * 43758.5453);
  float jy = fract(sin(dot(center.yz, vec2(93.989, 67.345))) * 23421.6312);
  float jz = fract(sin(dot(center.xz, vec2(45.164, 38.927))) * 61532.2847);
  float jitter = h * step * 0.3;

  for (int sz = 0; sz < SS; sz++) {
    for (int sy = 0; sy < SS; sy++) {
      for (int sx = 0; sx < SS; sx++) {
        vec3 p = center + h * vec3(
          (float(sx) * step + halfStep) * 2.0 - 1.0,
          (float(sy) * step + halfStep) * 2.0 - 1.0,
          (float(sz) * step + halfStep) * 2.0 - 1.0
        );
        p += vec3(jx - 0.5, jy - 0.5, jz - 0.5) * jitter;

        float d = formulaDE(p, uPower, uIters);
        if (d < 0.0) {
          insideCount++;
        } else {
          outsideCount++;
          minOutsideDist = min(minOutsideDist, d);
          sumDist += d;
        }
      }
    }
  }

  float sdf;
  if (insideCount == 0) {
    sdf = sumDist / float(TOTAL);
  } else if (outsideCount == 0) {
    sdf = -voxelSize * (1.0 + float(insideCount) / float(TOTAL) * 0.25);
  } else {
    float ratio = float(outsideCount) / float(TOTAL);
    sdf = mix(-minOutsideDist, minOutsideDist, ratio);
  }

  fragColor = vec4(sdf, 0.0, 0.0, 1.0);
}`;
}

/**
 * Build escape-test fragment shader.
 * Outputs 1.0 for interior (orbit didn't escape) or 0.0 for exterior.
 * Used for solid cavity fill on IFS fractals where SDF is unreliable.
 */
export function buildMeshEscapeShader(config: MeshShaderConfig): string {
  const def = config.definition;

  return `#version 300 es
precision highp float;
uniform float uZ;
uniform float uPower;
uniform int   uIters;
uniform float uInvRes;
uniform vec2  uTileOffset;
uniform vec3  uBoundsMin;
uniform float uBoundsRange;
${MESH_GLSL_UNIFORMS}
out vec4 fragColor;

${MESH_GLSL_HELPERS}

${def.shader.preamble || ''}

${def.shader.function}

void main() {
  vec3 pos = vec3(
    (gl_FragCoord.x + uTileOffset.x) * uInvRes * uBoundsRange + uBoundsMin.x,
    (gl_FragCoord.y + uTileOffset.y) * uInvRes * uBoundsRange + uBoundsMin.y,
    uZ * uBoundsRange + uBoundsMin.z
  );

${buildIterationLoop(def, 'uIters')}

  float r2 = dot(z.xyz, z.xyz);
  // 1.0 = interior (did not escape), 0.0 = exterior
  fragColor = vec4(r2 < 1e4 ? 1.0 : 0.0, 0.0, 0.0, 1.0);
}`;
}

/**
 * Build GPU Newton projection fragment shader.
 * Reads vertex positions from a texture, runs Newton steps to project
 * vertices onto the isosurface, outputs refined position + normal via MRT.
 */
export function buildMeshNewtonShader(config: MeshShaderConfig): string {
  const def = config.definition;
  const deType = resolveDE(config);
  const getDistBlock = buildGetDistBlock(def);
  const deReturn = buildDEReturn(deType, !!def.shader.getDist, 'uVoxelSize * 0.5');

  return `#version 300 es
precision highp float;
uniform sampler2D uPositions;
uniform float uPower;
uniform int   uIters;
uniform float uVoxelSize;
uniform int   uNewtonSteps;
${MESH_GLSL_UNIFORMS}

layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outNormal;

${MESH_GLSL_HELPERS}

${def.shader.preamble || ''}

// --- Formula function ---
${def.shader.function}

${getDistBlock}
float formulaDE(vec3 pos) {
${buildIterationLoop(def, 'uIters')}

  float r = length(z.xyz);
  float safeDr = max(abs(dr), 1e-10);
  ${deReturn}
}

vec3 sdfGradient(vec3 p) {
  float h = 1e-5;
  float gx = formulaDE(p + vec3(h,0,0)) - formulaDE(p - vec3(h,0,0));
  float gy = formulaDE(p + vec3(0,h,0)) - formulaDE(p - vec3(0,h,0));
  float gz = formulaDE(p + vec3(0,0,h)) - formulaDE(p - vec3(0,0,h));
  float len = length(vec3(gx, gy, gz));
  if (len < 1e-12) return vec3(0.0, 1.0, 0.0);
  return vec3(gx, gy, gz) / len;
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 pd = texelFetch(uPositions, coord, 0);
  vec3 pos = pd.xyz;

  if (pd.w < 0.5) {
    outPosition = vec4(pos, 0.0);
    outNormal = vec4(0.0, 1.0, 0.0, 0.0);
    return;
  }

  vec3 orig = pos;
  float prevAbsD = 1e10;
  float maxDist = uVoxelSize * 2.0;

  for (int i = 0; i < 8; i++) {
    if (i >= uNewtonSteps) break;
    float d = formulaDE(pos);
    float absD = abs(d);
    if (absD < 1e-7) break;
    if (absD > prevAbsD * 1.5) break;
    prevAbsD = absD;

    vec3 g = sdfGradient(pos);
    vec3 newPos = pos - d * g;
    if (length(newPos - orig) > maxDist) break;
    pos = newPos;
  }

  vec3 n = sdfGradient(pos);
  outPosition = vec4(pos, 1.0);
  outNormal = vec4(n, 0.0);
}`;
}

/**
 * Build vertex coloring fragment shader.
 * Runs formula iteration for orbit trap, maps to false color.
 */
export function buildMeshColorShader(config: MeshShaderConfig): string {
  const def = config.definition;

  return `#version 300 es
precision highp float;
uniform sampler2D uPositions;
uniform float uPower;
uniform int uIters;
uniform int uWidth;
uniform vec3 uJitterOffset;
${MESH_GLSL_UNIFORMS}
out vec4 fragColor;

${MESH_GLSL_HELPERS}

${def.shader.preamble || ''}

// --- Formula function ---
${def.shader.function}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 pd = texelFetch(uPositions, coord, 0);
  vec3 pos = pd.xyz + uJitterOffset;
  if (pd.w < 0.5) { fragColor = vec4(0.5, 0.5, 0.5, 1.0); return; }

${buildIterationLoop(def, 'uIters')}

  float t = log(max(1e-5, trap)) * -0.3;
  t = fract(t * 1.5 + 0.1);
  vec3 c1 = vec3(0.02, 0.01, 0.08);
  vec3 c2 = vec3(0.8, 0.2, 0.05);
  vec3 c3 = vec3(1.0, 0.85, 0.4);
  vec3 c4 = vec3(0.95, 0.95, 1.0);
  vec3 col;
  if (t < 0.33) col = mix(c1, c2, t / 0.33);
  else if (t < 0.66) col = mix(c2, c3, (t - 0.33) / 0.33);
  else col = mix(c3, c4, (t - 0.66) / 0.34);
  col = pow(col, vec3(0.8));
  fragColor = vec4(col, 1.0);
}`;
}

/**
 * Build a raymarching preview fragment shader.
 * Renders a quick 3D preview from a camera with basic shading + AO.
 */
export function buildMeshPreviewShader(config: MeshShaderConfig): string {
  const def = config.definition;
  const deType = resolveDE(config);
  const getDistBlock = buildGetDistBlock(def);
  const deReturn = buildDEReturn(deType, !!def.shader.getDist, '0.001');

  return `#version 300 es
precision highp float;
uniform float uPower;
uniform int   uIters;
uniform vec2  uResolution;
uniform vec3  uCamPos;
uniform vec3  uCamTarget;
uniform vec3  uCamRight;
uniform float uFov;
${MESH_GLSL_UNIFORMS}
out vec4 fragColor;

${MESH_GLSL_HELPERS}

${def.shader.preamble || ''}

${def.shader.function}

${getDistBlock}
float formulaDE(vec3 pos, float power, int iters) {
${buildIterationLoop(def, 'iters')}

  float r = length(z.xyz);
  float safeDr = max(abs(dr), 1e-10);
  ${deReturn}
}

float DE(vec3 p) { return formulaDE(p, uPower, uIters); }

vec3 calcNormal(vec3 p) {
  float h = 0.0005;
  return normalize(vec3(
    DE(p+vec3(h,0,0))-DE(p-vec3(h,0,0)),
    DE(p+vec3(0,h,0))-DE(p-vec3(0,h,0)),
    DE(p+vec3(0,0,h))-DE(p-vec3(0,0,h))
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec3 fwd = normalize(uCamTarget - uCamPos);
  vec3 right = uCamRight;
  vec3 up = cross(right, fwd);
  // Orthographic: parallel rays, offset origin
  vec3 ro = uCamPos + right * uv.x * uFov + up * uv.y * uFov;
  vec3 rd = fwd;

  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 128; i++) {
    float d = DE(ro + rd * t);
    if (abs(d) < 0.0002) { hit = true; break; }
    t += d * 0.8;
    if (t > 20.0) break;
  }

  if (!hit) {
    fragColor = vec4(0.06, 0.06, 0.06, 1.0);
    return;
  }

  vec3 p = ro + rd * t;
  vec3 n = calcNormal(p);
  vec3 light = normalize(vec3(0.6, 0.8, -0.5));
  float diff = max(dot(n, light), 0.0);
  float amb = 0.15;
  float ao = 1.0;
  for (int i = 1; i <= 5; i++) {
    float fi = float(i) * 0.04;
    ao -= (fi - DE(p + n * fi)) * (1.0 / pow(2.0, float(i)));
  }
  ao = clamp(ao, 0.0, 1.0);
  vec3 col = vec3(0.7, 0.75, 0.8) * (amb + diff * 0.85) * ao;
  col = pow(col, vec3(0.45));
  fragColor = vec4(col, 1.0);
}`;
}

// ============================================================================
// Formula Uniform Names (for WebGL uniform location lookup)
// ============================================================================

/** All formula-related uniform names used across mesh export shaders */
export const MESH_FORMULA_UNIFORMS = [
  'uParamA', 'uParamB', 'uParamC', 'uParamD', 'uParamE', 'uParamF',
  'uVec2A', 'uVec2B', 'uVec2C',
  'uVec3A', 'uVec3B', 'uVec3C',
  'uVec4A', 'uVec4B', 'uVec4C',
  'uJulia', 'uJuliaMode', 'uEscapeThresh', 'uDistanceMetric',
] as const;
