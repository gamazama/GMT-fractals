// gpu-pipeline.ts — WebGL2 GPU pipeline: SDF sampling, Newton projection, vertex coloring
// Converted from public/mesh-export/gpu-pipeline.js
// All globals replaced with imports and callback parameters.

import type { FractalDefinition } from '../../engine-gmt/types/fractal';
import type { SparseSDFGrid } from '../algorithms/sparse-grid';
import type { VDBTree } from '../algorithms/vdb-writer';
import type { DCMeshResult } from '../algorithms/dc-core';

import {
  MESH_SDF_VERT,
  MESH_FORMULA_UNIFORMS,
  buildMeshEscapeShader,
  buildMeshNewtonShader,
  buildMeshColorShader,
} from '../../engine-gmt/engine/SDFShaderBuilder';
import type { MeshInterlaceConfig } from '../../engine-gmt/engine/SDFShaderBuilder';

import { ShaderFactory } from '../../engine-gmt/engine/ShaderFactory';
import type { ShaderConfig } from '../../engine-gmt/engine/ShaderFactory';
import { registry } from '../../engine-gmt/engine/FractalRegistry';

import { forEachBandBlock } from '../algorithms/sparse-grid';
import { createTree, addLeafBlock, optimizeTree, serializeVDB, serializeMultiGridVDB, createVec3Tree, addVec3LeafBlock, optimizeVec3Tree } from '../algorithms/vdb-writer';
import type { Vec3VDBTree } from '../algorithms/vdb-writer';

// ============================================================================
// Mesh Shader Config Builder
// ============================================================================

/** Build a minimal ShaderConfig for mesh SDF generation from a FractalDefinition + optional interlace.
 *  Only formula ID and interlace compile-time flags matter — all param values are runtime uniforms. */
function buildMeshShaderConfig(
  definition: FractalDefinition,
  interlace?: MeshInterlaceConfig,
  quality?: { estimator?: number; distanceMetric?: number }
): ShaderConfig {
  return {
    formula: definition.id,
    pipelineRevision: 0,
    quality: quality ? { estimator: quality.estimator ?? 0, distanceMetric: quality.distanceMetric ?? 0 } : undefined,
    interlace: interlace ? {
      interlaceCompiled: true,           // CRITICAL: must be true or Interlace.inject() silently skips
      interlaceFormula: interlace.definition.id,
      interlaceEnabled: interlace.enabled,
      interlaceInterval: interlace.interval,
      interlaceStartIter: interlace.startIter,
      // Secondary formula params: all runtime uniforms — default values unused for shader generation
      interlaceParamA: 0, interlaceParamB: 0, interlaceParamC: 0,
      interlaceParamD: 0, interlaceParamE: 0, interlaceParamF: 0,
      interlaceVec2A: { x: 0, y: 0 }, interlaceVec2B: { x: 0, y: 0 }, interlaceVec2C: { x: 0, y: 0 },
      interlaceVec3A: { x: 0, y: 0, z: 0 }, interlaceVec3B: { x: 0, y: 0, z: 0 }, interlaceVec3C: { x: 0, y: 0, z: 0 },
    } : undefined,
  };
}

// ============================================================================
// Types
// ============================================================================

export interface GPUPipelineCallbacks {
  log: (msg: string, type?: string) => void;
  setStatus: (msg: string) => void;
  setProgress: (pct: number) => void;
  setPhase: (name: string, pct: number) => void;
  tick: () => Promise<void>;
  onSlicePreview?: (imageData: ImageData, width: number, height: number) => void;
  memAlloc?: (id: string, label: string, mb: number, color: string) => void;
  memFree?: (id: string) => void;
}

export interface SDFPipeline {
  prog: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null>;
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
}

export interface CoarsePrePassResult {
  zSliceMin: number;
  zSliceMax: number;
}

export interface GenerateVDBResult {
  blob: Blob;
  voxelCount: number;
  leafCount: number;
  promoted: { promotedLeaves: number; promotedN4s: number };
  zRange: [number, number];
  skippedSlices: number;
}

export interface EscapeTestResult {
  escapeMap: Map<number, Uint8Array>;
  solidCount: number;
}

// ============================================================================
// Formula Uniform Helper
// ============================================================================

function setFormulaUniforms(
  gl: WebGL2RenderingContext,
  loc: Record<string, WebGLUniformLocation | null>,
  params: Record<string, any>
): void {
  const p = params || {};

  // Float params A-F
  if (loc.uParamA) gl.uniform1f(loc.uParamA, p.paramA ?? 8);
  if (loc.uParamB) gl.uniform1f(loc.uParamB, p.paramB ?? 0);
  if (loc.uParamC) gl.uniform1f(loc.uParamC, p.paramC ?? 0);
  if (loc.uParamD) gl.uniform1f(loc.uParamD, p.paramD ?? 0);
  if (loc.uParamE) gl.uniform1f(loc.uParamE, p.paramE ?? 0);
  if (loc.uParamF) gl.uniform1f(loc.uParamF, p.paramF ?? 0);

  // Vec2/3/4 params — handle both {x,y,z,w} objects and [x,y,z,w] arrays
  const rv2 = (v: any): [number, number] =>
    v ? [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0] : [0, 0];
  const rv3 = (v: any): [number, number, number] =>
    v ? [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0, v.z ?? v[2] ?? 0] : [0, 0, 0];
  const rv4 = (v: any): [number, number, number, number] =>
    v ? [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0, v.z ?? v[2] ?? 0, v.w ?? v[3] ?? 0] : [0, 0, 0, 0];

  // Vec2 A-C
  const v2a = rv2(p.vec2A); if (loc.uVec2A) gl.uniform2f(loc.uVec2A, v2a[0], v2a[1]);
  const v2b = rv2(p.vec2B); if (loc.uVec2B) gl.uniform2f(loc.uVec2B, v2b[0], v2b[1]);
  const v2c = rv2(p.vec2C); if (loc.uVec2C) gl.uniform2f(loc.uVec2C, v2c[0], v2c[1]);

  // Vec3 A-C
  const v3a = rv3(p.vec3A); if (loc.uVec3A) gl.uniform3f(loc.uVec3A, v3a[0], v3a[1], v3a[2]);
  const v3b = rv3(p.vec3B); if (loc.uVec3B) gl.uniform3f(loc.uVec3B, v3b[0], v3b[1], v3b[2]);
  const v3c = rv3(p.vec3C); if (loc.uVec3C) gl.uniform3f(loc.uVec3C, v3c[0], v3c[1], v3c[2]);

  // Vec4 A-C
  const v4a = rv4(p.vec4A); if (loc.uVec4A) gl.uniform4f(loc.uVec4A, v4a[0], v4a[1], v4a[2], v4a[3]);
  const v4b = rv4(p.vec4B); if (loc.uVec4B) gl.uniform4f(loc.uVec4B, v4b[0], v4b[1], v4b[2], v4b[3]);
  const v4c = rv4(p.vec4C); if (loc.uVec4C) gl.uniform4f(loc.uVec4C, v4c[0], v4c[1], v4c[2], v4c[3]);

  // Julia — handle both array [x,y,z] and object {x,y,z} formats
  if (loc.uJulia) {
    const j = p.julia;
    if (Array.isArray(j)) gl.uniform3f(loc.uJulia, j[0] ?? 0, j[1] ?? 0, j[2] ?? 0);
    else if (j && typeof j === 'object') gl.uniform3f(loc.uJulia, j.x ?? 0, j.y ?? 0, j.z ?? 0);
    else gl.uniform3f(loc.uJulia, 0, 0, 0);
  }
  if (loc.uJuliaMode) gl.uniform1f(loc.uJuliaMode, p.juliaMode ? 1.0 : 0.0);

  // Escape threshold & distance metric
  if (loc.uEscapeThresh) gl.uniform1f(loc.uEscapeThresh, p.escapeThresh ?? 10.0);
  if (loc.uDistanceMetric) gl.uniform1f(loc.uDistanceMetric, p.distanceMetric ?? 0);
}

/** Set interlace uniforms on a GL program */
function setInterlaceUniforms(
  gl: WebGL2RenderingContext,
  loc: Record<string, WebGLUniformLocation | null>,
  interlace: MeshInterlaceConfig | undefined
): void {
  if (!interlace) {
    // Ensure interlace is disabled
    if (loc.uInterlaceEnabled) gl.uniform1f(loc.uInterlaceEnabled, 0.0);
    return;
  }

  if (loc.uInterlaceEnabled) gl.uniform1f(loc.uInterlaceEnabled, interlace.enabled ? 1.0 : 0.0);
  if (loc.uInterlaceInterval) gl.uniform1f(loc.uInterlaceInterval, interlace.interval ?? 2);
  if (loc.uInterlaceStartIter) gl.uniform1f(loc.uInterlaceStartIter, interlace.startIter ?? 0);

  const p = interlace.params || {};

  // Helper to read x/y/z from either {x,y,z} object or [x,y,z] array
  const v2 = (v: any): [number, number] =>
    v ? [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0] : [0, 0];
  const v3 = (v: any): [number, number, number] =>
    v ? [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0, v.z ?? v[2] ?? 0] : [0, 0, 0];
  const v4 = (v: any): [number, number, number, number] =>
    v ? [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0, v.z ?? v[2] ?? 0, v.w ?? v[3] ?? 0] : [0, 0, 0, 0];

  // Float params A-F
  if (loc.uInterlaceParamA) gl.uniform1f(loc.uInterlaceParamA, p.paramA ?? 0);
  if (loc.uInterlaceParamB) gl.uniform1f(loc.uInterlaceParamB, p.paramB ?? 0);
  if (loc.uInterlaceParamC) gl.uniform1f(loc.uInterlaceParamC, p.paramC ?? 0);
  if (loc.uInterlaceParamD) gl.uniform1f(loc.uInterlaceParamD, p.paramD ?? 0);
  if (loc.uInterlaceParamE) gl.uniform1f(loc.uInterlaceParamE, p.paramE ?? 0);
  if (loc.uInterlaceParamF) gl.uniform1f(loc.uInterlaceParamF, p.paramF ?? 0);

  // Vec2 A-C
  const v2a = v2(p.vec2A); if (loc.uInterlaceVec2A) gl.uniform2f(loc.uInterlaceVec2A, v2a[0], v2a[1]);
  const v2b = v2(p.vec2B); if (loc.uInterlaceVec2B) gl.uniform2f(loc.uInterlaceVec2B, v2b[0], v2b[1]);
  const v2c = v2(p.vec2C); if (loc.uInterlaceVec2C) gl.uniform2f(loc.uInterlaceVec2C, v2c[0], v2c[1]);

  // Vec3 A-C
  const v3a = v3(p.vec3A); if (loc.uInterlaceVec3A) gl.uniform3f(loc.uInterlaceVec3A, v3a[0], v3a[1], v3a[2]);
  const v3b = v3(p.vec3B); if (loc.uInterlaceVec3B) gl.uniform3f(loc.uInterlaceVec3B, v3b[0], v3b[1], v3b[2]);
  const v3c = v3(p.vec3C); if (loc.uInterlaceVec3C) gl.uniform3f(loc.uInterlaceVec3C, v3c[0], v3c[1], v3c[2]);

  // Vec4 A-C
  const v4a = v4(p.vec4A); if (loc.uInterlaceVec4A) gl.uniform4f(loc.uInterlaceVec4A, v4a[0], v4a[1], v4a[2], v4a[3]);
  const v4b = v4(p.vec4B); if (loc.uInterlaceVec4B) gl.uniform4f(loc.uInterlaceVec4B, v4b[0], v4b[1], v4b[2], v4b[3]);
  const v4c = v4(p.vec4C); if (loc.uInterlaceVec4C) gl.uniform4f(loc.uInterlaceVec4C, v4c[0], v4c[1], v4c[2], v4c[3]);
}

// ============================================================================
// WebGL Helpers
// ============================================================================

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  log: (msg: string, type?: string) => void
): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error('Failed to create shader');
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const infoLog = gl.getShaderInfoLog(s) || '';
    const typeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    log('Shader compile error (' + typeName + '): ' + infoLog, 'error');
    // Log problematic lines from the shader source
    const lines = src.split('\n');
    const errorLines = infoLog.match(/\d+:\d+/g) || [];
    for (let eli = 0; eli < Math.min(errorLines.length, 5); eli++) {
      const lineNum = parseInt(errorLines[eli].split(':')[1]) - 1;
      if (lineNum >= 0 && lineNum < lines.length) {
        log('  Line ' + (lineNum + 1) + ': ' + lines[lineNum].trim(), 'error');
      }
    }
    throw new Error('Shader compile: ' + infoLog.split('\n')[0]);
  }
  return s;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vs: string,
  fs: string,
  log: (msg: string, type?: string) => void
): WebGLProgram {
  const p = gl.createProgram();
  if (!p) throw new Error('Failed to create program');
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vs, log));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fs, log));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const linkLog = gl.getProgramInfoLog(p) || '';
    log('Program link error: ' + linkLog, 'error');
    throw new Error('Program link: ' + linkLog);
  }
  return p;
}

/** Create a WebGL2 context on an offscreen canvas */
export function initWebGL(): WebGL2RenderingContext {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const gl = canvas.getContext('webgl2', { antialias: false }) as WebGL2RenderingContext | null;
  if (!gl) throw new Error('WebGL2 not supported');
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');
  return gl;
}

// ============================================================================
// SDF Pipeline Setup
// ============================================================================

/** Helper: locate formula uniforms on a GL program */
export function locateFormulaUniforms(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram
): Record<string, WebGLUniformLocation | null> {
  const loc: Record<string, WebGLUniformLocation | null> = {};
  for (let i = 0; i < MESH_FORMULA_UNIFORMS.length; i++) {
    loc[MESH_FORMULA_UNIFORMS[i]] = gl.getUniformLocation(prog, MESH_FORMULA_UNIFORMS[i]);
  }
  return loc;
}

export function setupSDFPipeline(
  gl: WebGL2RenderingContext,
  tileSize: number,
  config: FractalDefinition,
  deSamples: number,
  log: (msg: string, type?: string) => void,
  interlace?: MeshInterlaceConfig,
  quality?: { estimator?: number; distanceMetric?: number }
): SDFPipeline {
  // Pre-register formulas in the shared registry so CoreMath.inject() can look them up.
  // GMF-loaded definitions may not be in the registry from startup; this ensures they are.
  registry.register(config);
  if (interlace) registry.register(interlace.definition);

  // Generate the SDF library via the unified DDFS injection pipeline (ShaderFactory + ShaderBuilder).
  // The library contains uniforms + helpers + formula functions + map/mapDist + formulaDE(pos).
  const sdfLibrary = ShaderFactory.generateMeshSDFLibrary(buildMeshShaderConfig(config, interlace, quality));

  // Wrap the library with the SDF pass preamble (#version, pass uniforms) and void main.
  // formulaDE(pos) signature — no power/iters args; mapDist() reads uIters via #define uIterations uIters.
  const SS = deSamples;
  const sdfFrag = `#version 300 es
precision highp float;
uniform float uZ;
uniform float uPower;
uniform int   uIters;
uniform float uInvRes;
uniform vec2  uTileOffset;
uniform vec3  uBoundsMin;
uniform float uBoundsRange;
uniform float uSurfaceThreshold;
out vec4 fragColor;

${sdfLibrary}

void main() {
  float voxelSize = uBoundsRange * uInvRes;
  vec3 center = vec3(
    (gl_FragCoord.x + uTileOffset.x) * uInvRes * uBoundsRange + uBoundsMin.x,
    (gl_FragCoord.y + uTileOffset.y) * uInvRes * uBoundsRange + uBoundsMin.y,
    uZ * uBoundsRange + uBoundsMin.z
  );

  const int SS = ${SS};
  const int TOTAL = SS * SS * SS;
  float step = 1.0 / float(SS);
  float halfStep = step * 0.5;
  float h = voxelSize * 0.5;

  float sumDist = 0.0;
  int insideCount = 0;
  int outsideCount = 0;
  float minOutsideDist = 1e10;
  float thresh = uSurfaceThreshold;

  float jx = fract(sin(dot(center.xy, vec2(12.9898, 78.233))) * 43758.5453);
  float jy = fract(sin(dot(center.yz, vec2(93.989, 67.345))) * 23421.6312);
  float jz = fract(sin(dot(center.xz, vec2(45.164, 38.927))) * 61532.2847);
  float jitter = h * step * 0.3;

  for (int sz = 0; sz < ${SS}; sz++) {
    for (int sy = 0; sy < ${SS}; sy++) {
      for (int sx = 0; sx < ${SS}; sx++) {
        vec3 p = center + h * vec3(
          (float(sx) * step + halfStep) * 2.0 - 1.0,
          (float(sy) * step + halfStep) * 2.0 - 1.0,
          (float(sz) * step + halfStep) * 2.0 - 1.0
        );
        p += vec3(jx - 0.5, jy - 0.5, jz - 0.5) * jitter;

        float d = formulaDE(p);
        if (d < thresh) {
          insideCount++;
        } else {
          outsideCount++;
          minOutsideDist = min(minOutsideDist, d - thresh);
          sumDist += d - thresh;
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

  const sdfProg = createProgram(gl, MESH_SDF_VERT, sdfFrag, log);
  gl.useProgram(sdfProg);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, tileSize, tileSize);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.viewport(0, 0, tileSize, tileSize);
  gl.bindVertexArray(gl.createVertexArray());

  // Locate all uniforms
  const ALL_UNIFORMS = [
    'uZ', 'uPower', 'uIters', 'uInvRes', 'uTileOffset', 'uBoundsMin', 'uBoundsRange',
    ...MESH_FORMULA_UNIFORMS,
  ];
  const loc: Record<string, WebGLUniformLocation | null> = {};
  for (let i = 0; i < ALL_UNIFORMS.length; i++) {
    loc[ALL_UNIFORMS[i]] = gl.getUniformLocation(sdfProg, ALL_UNIFORMS[i]);
  }

  return { prog: sdfProg, loc, fbo, tex };
}

/** Bind common SDF pipeline uniforms (shared by dense, sparse, VDB sampling).
 *  gridMin is a 3-element array [minX, minY, minZ]. */
export function bindPipelineUniforms(
  gl: WebGL2RenderingContext,
  pipeline: SDFPipeline,
  N: number,
  power: number,
  iters: number,
  gridMin: [number, number, number],
  boundsRange: number,
  formulaParams: Record<string, any>,
  interlace?: MeshInterlaceConfig,
  surfaceThreshold?: number
): void {
  gl.useProgram(pipeline.prog);
  gl.uniform1f(pipeline.loc.uPower, power);
  gl.uniform1i(pipeline.loc.uIters, iters);
  gl.uniform1f(pipeline.loc.uInvRes, 1.0 / N);
  gl.uniform3f(pipeline.loc.uBoundsMin, gridMin[0], gridMin[1], gridMin[2]);
  gl.uniform1f(pipeline.loc.uBoundsRange, boundsRange);
  if (pipeline.loc.uSurfaceThreshold) gl.uniform1f(pipeline.loc.uSurfaceThreshold, surfaceThreshold ?? 0.0);
  setFormulaUniforms(gl, pipeline.loc, formulaParams);
  setInterlaceUniforms(gl, pipeline.loc, interlace);
  gl.bindFramebuffer(gl.FRAMEBUFFER, pipeline.fbo);
}

// ============================================================================
// Coarse Pre-Pass
// ============================================================================

/**
 * Coarse pre-pass: sample a low-res 128^3 grid to find the Z range that
 * actually contains fractal data. Skips empty slices in the fine pass.
 * At 2048^3 this can skip 30-50% of slices, saving minutes.
 * Shared by both VDB and dense mesh pipelines.
 */
export async function coarsePrePass(
  gl: WebGL2RenderingContext,
  config: FractalDefinition,
  formulaParams: Record<string, any>,
  N: number,
  power: number,
  iters: number,
  gridMin: [number, number, number],
  gridMax: [number, number, number],
  voxelSize: number,
  callbacks: GPUPipelineCallbacks,
  interlace?: MeshInterlaceConfig,
  quality?: { estimator?: number; distanceMetric?: number },
  surfaceThreshold?: number,
): Promise<CoarsePrePassResult> {
  const { log, setPhase, setStatus, tick } = callbacks;
  const coarseN = 128;
  const boundsRange = gridMax[0] - gridMin[0];
  let zSliceMin = 0;
  let zSliceMax = N - 1;

  if (N > coarseN) {
    log('Coarse pre-pass: sampling ' + coarseN + '\u00B3 to detect Z range...', 'info');
    setPhase('Coarse Pre-pass', 0);
    setStatus('Coarse pre-pass (' + coarseN + '\u00B3)...');
    await tick();

    const coarsePipeline = setupSDFPipeline(gl, coarseN, config, 1, log, interlace, quality);
    bindPipelineUniforms(gl, coarsePipeline, coarseN, power, iters, gridMin, boundsRange, formulaParams, interlace, surfaceThreshold);
    gl.viewport(0, 0, coarseN, coarseN);

    const coarsePixF = new Float32Array(coarseN * coarseN * 4);
    let coarseZMin = coarseN;
    let coarseZMax = -1;

    for (let cz = 0; cz < coarseN; cz++) {
      gl.uniform1f(coarsePipeline.loc.uZ, (cz + 0.5) / coarseN);
      gl.uniform2f(coarsePipeline.loc.uTileOffset!, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, coarseN, coarseN, gl.RGBA, gl.FLOAT, coarsePixF);

      let hasData = false;
      for (let ci = 0; ci < coarseN * coarseN; ci++) {
        if (coarsePixF[ci * 4] < voxelSize * 3) { hasData = true; break; }
      }
      if (hasData) {
        if (cz < coarseZMin) coarseZMin = cz;
        coarseZMax = cz;
      }
    }

    gl.deleteTexture(coarsePipeline.tex);
    gl.deleteFramebuffer(coarsePipeline.fbo);
    gl.deleteProgram(coarsePipeline.prog);

    if (coarseZMax >= coarseZMin) {
      const margin = 2;
      const ratio = N / coarseN;
      zSliceMin = Math.max(0, Math.floor((coarseZMin - margin) * ratio));
      zSliceMax = Math.min(N - 1, Math.ceil((coarseZMax + margin + 1) * ratio));
      // Align to block boundaries (multiples of 8)
      zSliceMin = (zSliceMin & ~7);
      zSliceMax = Math.min(N - 1, (zSliceMax | 7));
      const skippedPct = (100 * (1 - (zSliceMax - zSliceMin + 1) / N)).toFixed(0);
      log('Coarse pre-pass: data in Z [' + coarseZMin + ',' + coarseZMax + '] of ' + coarseN +
        ' \u2192 fine Z [' + zSliceMin + ',' + zSliceMax + '] of ' + N +
        ' (skipping ' + skippedPct + '% of slices)', 'data');
    } else {
      log('Coarse pre-pass: no data found \u2014 sampling all slices', 'warn');
    }
    setPhase('Coarse Pre-pass', 100);
  }

  return { zSliceMin, zSliceMax };
}

// ============================================================================
// Slice Sampling Helper
// ============================================================================

/**
 * Sample one Z-slice into a slab buffer with optional Z sub-slice averaging.
 * Handles tiling for N > tileSize. Shared by dense mesh and VDB pipelines.
 * When zSubSlices <= 1: single sample at (gz + 0.5) / N.
 * When zSubSlices > 1: average zSubSlices positions within [gz, gz+1).
 */
export function sampleSliceWithSubZ(
  gl: WebGL2RenderingContext,
  pipeline: SDFPipeline,
  N: number,
  tileSize: number,
  pixF: Float32Array,
  destSlab: Float32Array,
  gz: number,
  zSubSlices: number,
  subSliceBuf: Float32Array | null
): void {
  function sampleOneZ(zNorm: number, dest: Float32Array): void {
    gl.useProgram(pipeline.prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, pipeline.fbo);
    gl.uniform1f(pipeline.loc.uZ, zNorm);
    if (N <= tileSize) {
      gl.uniform2f(pipeline.loc.uTileOffset!, 0, 0);
      gl.viewport(0, 0, N, N);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, pixF);
      for (let j = 0; j < N * N; j++) dest[j] = pixF[j * 4];
    } else {
      for (let tileY = 0; tileY < N; tileY += tileSize) {
        for (let tileX = 0; tileX < N; tileX += tileSize) {
          const tw = Math.min(tileSize, N - tileX);
          const th = Math.min(tileSize, N - tileY);
          gl.uniform2f(pipeline.loc.uTileOffset!, tileX, tileY);
          gl.viewport(0, 0, tw, th);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.readPixels(0, 0, tw, th, gl.RGBA, gl.FLOAT, pixF);
          for (let py = 0; py < th; py++) {
            for (let px = 0; px < tw; px++) {
              dest[(tileY + py) * N + (tileX + px)] = pixF[(py * tw + px) * 4];
            }
          }
        }
      }
    }
  }

  if (!zSubSlices || zSubSlices <= 1) {
    sampleOneZ((gz + 0.5) / N, destSlab);
  } else {
    destSlab.fill(0);
    const invSS = 1.0 / zSubSlices;
    for (let ss = 0; ss < zSubSlices; ss++) {
      const subZ = (gz + (ss + 0.5) * invSS) / N;
      sampleOneZ(subZ, subSliceBuf!);
      for (let j = 0; j < N * N; j++) destSlab[j] += subSliceBuf![j];
    }
    for (let j = 0; j < N * N; j++) destSlab[j] *= invSS;
  }
}

// ============================================================================
// Dense SDF Sampling (GPU)
// ============================================================================

/**
 * Build slice preview ImageData from a slab of SDF values.
 * Used for live preview during sampling passes.
 */
function buildSlicePreviewImageData(
  slab: Float32Array,
  N: number,
  voxelSize: number,
  prevSize: number
): ImageData {
  const prevScale = N / prevSize;
  const imageData = new ImageData(prevSize, prevSize);
  for (let py = 0; py < prevSize; py++) {
    const srcY = Math.min(Math.round(py * prevScale), N - 1);
    for (let px = 0; px < prevSize; px++) {
      const srcX = Math.min(Math.round(px * prevScale), N - 1);
      const sVal = slab[srcY * N + srcX];
      const absDist = Math.abs(sVal);
      const contour = absDist < voxelSize * 2 ? Math.round(255 * (1 - absDist / (voxelSize * 2))) : 0;
      const interior = sVal < 0 ? 50 : 0;
      const pj = (py * prevSize + px) * 4;
      imageData.data[pj] = contour + interior;
      imageData.data[pj + 1] = sVal < 0 ? 30 : contour;
      imageData.data[pj + 2] = contour;
      imageData.data[pj + 3] = 255;
    }
  }
  return imageData;
}

/**
 * Sample a full dense SDF grid via GPU.
 * Updates the SDF preview via onSlicePreview callback every slice.
 */
export async function sampleDenseGrid(
  gl: WebGL2RenderingContext,
  pipeline: SDFPipeline,
  N: number,
  power: number,
  iters: number,
  formulaParams: Record<string, any>,
  gridMin: [number, number, number],
  gridMax: [number, number, number],
  progressBase: number,
  progressRange: number,
  zSubSlices: number,
  zSliceMin: number | null,
  zSliceMax: number | null,
  callbacks: GPUPipelineCallbacks,
  interlace?: MeshInterlaceConfig,
  surfaceThreshold?: number,
): Promise<Float32Array> {
  const { setProgress, setPhase, setStatus, tick, log, onSlicePreview } = callbacks;
  const tileSize = Math.min(N, 2048);
  const boundsRange = gridMax[0] - gridMin[0];
  if (!zSubSlices || zSubSlices < 1) zSubSlices = 1;
  if (zSliceMin == null) zSliceMin = 0;
  if (zSliceMax == null) zSliceMax = N - 1;
  bindPipelineUniforms(gl, pipeline, N, power, iters, gridMin, boundsRange, formulaParams, interlace, surfaceThreshold);
  gl.viewport(0, 0, tileSize, tileSize);

  const pixF = new Float32Array(tileSize * tileSize * 4);
  const sdfGrid = new Float32Array(N * N * N);
  const voxelSize = boundsRange / N;
  const slab = new Float32Array(N * N);
  const subSliceBuf = zSubSlices > 1 ? new Float32Array(N * N) : null;

  const prevSize = Math.min(N, 512);

  // Fill skipped slices with +1.0 (far outside surface)
  if (zSliceMin > 0 || zSliceMax < N - 1) {
    sdfGrid.fill(1.0);
  }
  if (zSubSlices > 1) {
    log('Z sub-slicing: ' + zSubSlices + ' sub-samples per voxel layer (smooths Z-axis banding)', 'info');
  }

  const activeSlices = zSliceMax - zSliceMin + 1;
  let slicesDone = 0;

  for (let z = zSliceMin; z <= zSliceMax; z++) {
    sampleSliceWithSubZ(gl, pipeline, N, tileSize, pixF, slab, z, zSubSlices, subSliceBuf);
    sdfGrid.set(slab, z * N * N);

    // Live preview — every slice
    if (onSlicePreview) {
      const imageData = buildSlicePreviewImageData(slab, N, voxelSize, prevSize);
      onSlicePreview(imageData, prevSize, prevSize);
    }

    slicesDone++;
    setProgress(progressBase + Math.round(slicesDone / activeSlices * progressRange));
    setPhase('SDF Sampling', Math.round(slicesDone / activeSlices * 100));
    if ((slicesDone & 3) === 0) {
      setStatus('Sampling SDF... slice ' + slicesDone + '/' + activeSlices);
      await tick();
    }
  }

  return sdfGrid;
}

// ============================================================================
// Sparse SDF Sampling (GPU, narrow-band)
// ============================================================================

/**
 * Build sparse slice preview ImageData from region pixel data.
 */
function buildSparseSlicePreviewImageData(
  regionPixels: Float32Array,
  regionMinX: number,
  regionMinY: number,
  regionMaxX: number,
  regionMaxY: number,
  regionW: number,
  N: number,
  voxelSize: number,
  prevSize: number
): ImageData {
  const prevRatio = N / prevSize;
  const imageData = new ImageData(prevSize, prevSize);
  for (let py = 0; py < prevSize; py++) {
    const srcY = Math.round(py * prevRatio);
    for (let px = 0; px < prevSize; px++) {
      const srcX = Math.round(px * prevRatio);
      const pj = (py * prevSize + px) * 4;
      if (srcX >= regionMinX && srcX < regionMaxX && srcY >= regionMinY && srcY < regionMaxY) {
        const sPixIdx = ((srcY - regionMinY) * regionW + (srcX - regionMinX)) * 4;
        const sVal = regionPixels[sPixIdx];
        const absDist = Math.abs(sVal);
        const contour = absDist < voxelSize * 2 ? Math.round(255 * (1 - absDist / (voxelSize * 2))) : 0;
        const interior = sVal < 0 ? 50 : 0;
        imageData.data[pj] = contour + interior;
        imageData.data[pj + 1] = sVal < 0 ? 30 : contour;
        imageData.data[pj + 2] = contour;
      } else {
        imageData.data[pj] = 15;
        imageData.data[pj + 1] = 15;
        imageData.data[pj + 2] = 20;
      }
      imageData.data[pj + 3] = 255;
    }
  }
  return imageData;
}

/**
 * Sample SDF into a sparse grid — only fills allocated blocks.
 * Pre-allocates a single readback buffer at max region size
 * instead of allocating per-slice.
 */
export async function sampleSparseGrid(
  gl: WebGL2RenderingContext,
  pipeline: SDFPipeline,
  sparseGrid: SparseSDFGrid,
  power: number,
  iters: number,
  formulaParams: Record<string, any>,
  gridMin: [number, number, number],
  gridMax: [number, number, number],
  progressBase: number,
  progressRange: number,
  callbacks: GPUPipelineCallbacks,
  interlace?: MeshInterlaceConfig,
  surfaceThreshold?: number,
): Promise<SparseSDFGrid> {
  const { setProgress, setPhase, setStatus, tick, onSlicePreview } = callbacks;
  const N = sparseGrid.N;
  const bs = sparseGrid.blockSize;
  const tileSize = Math.min(N, 2048);
  const boundsRange = gridMax[0] - gridMin[0];
  bindPipelineUniforms(gl, pipeline, N, power, iters, gridMin, boundsRange, formulaParams, interlace, surfaceThreshold);
  gl.viewport(0, 0, tileSize, tileSize);

  // Collect unique Z slices that have allocated blocks, with XY bounding box
  const blockSlices = new Map<number, {
    entries: Array<{ startX: number; startY: number }>;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }>();

  forEachBandBlock(sparseGrid, (bx: number, by: number, bz: number, startX: number, startY: number, startZ: number) => {
    for (let lz = 0; lz < bs; lz++) {
      const gz = startZ + lz;
      if (gz >= N) continue;
      let info = blockSlices.get(gz);
      if (!info) {
        info = { entries: [], minX: startX, minY: startY, maxX: startX + bs, maxY: startY + bs };
        blockSlices.set(gz, info);
      }
      info.entries.push({ startX, startY });
      if (startX < info.minX) info.minX = startX;
      if (startY < info.minY) info.minY = startY;
      if (startX + bs > info.maxX) info.maxX = startX + bs;
      if (startY + bs > info.maxY) info.maxY = startY + bs;
    }
  });

  const zSlices = Array.from(blockSlices.keys()).sort((a, b) => a - b);

  // Pre-allocate readback buffer at maximum region size across all slices
  let maxRegionPixels = 0;
  for (let si = 0; si < zSlices.length; si++) {
    const sliceInfo = blockSlices.get(zSlices[si])!;
    const rW = Math.min(N, sliceInfo.maxX) - Math.max(0, sliceInfo.minX);
    const rH = Math.min(N, sliceInfo.maxY) - Math.max(0, sliceInfo.minY);
    const regionSize = rW * rH * 4;
    if (regionSize > maxRegionPixels) maxRegionPixels = regionSize;
  }
  const regionPixels = new Float32Array(maxRegionPixels);

  const prevSize = Math.min(N, 512);
  const voxelSize = boundsRange / N;

  let slicesDone = 0;

  for (let si = 0; si < zSlices.length; si++) {
    const z = zSlices[si];
    const sliceInfo = blockSlices.get(z)!;
    gl.uniform1f(pipeline.loc.uZ, (z + 0.5) / N);

    const regionMinX = Math.max(0, sliceInfo.minX);
    const regionMinY = Math.max(0, sliceInfo.minY);
    const regionMaxX = Math.min(N, sliceInfo.maxX);
    const regionMaxY = Math.min(N, sliceInfo.maxY);
    const regionW = regionMaxX - regionMinX;
    const regionH = regionMaxY - regionMinY;

    gl.uniform2f(pipeline.loc.uTileOffset!, regionMinX, regionMinY);
    gl.viewport(0, 0, regionW, regionH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Reuse pre-allocated buffer
    gl.readPixels(0, 0, regionW, regionH, gl.RGBA, gl.FLOAT, regionPixels);

    const entries = sliceInfo.entries;
    for (let ei = 0; ei < entries.length; ei++) {
      const e = entries[ei];
      for (let lx = 0; lx < bs; lx++) {
        const gx = e.startX + lx;
        if (gx < regionMinX || gx >= regionMaxX) continue;
        for (let ly = 0; ly < bs; ly++) {
          const gy = e.startY + ly;
          if (gy < regionMinY || gy >= regionMaxY) continue;
          const pixIdx = ((gy - regionMinY) * regionW + (gx - regionMinX)) * 4;
          sparseGrid.set(gx, gy, z, regionPixels[pixIdx]);
        }
      }
    }

    slicesDone++;
    if ((slicesDone & 7) === 0) {
      // Live preview — show narrow-band SDF cross-section
      if (onSlicePreview) {
        const imageData = buildSparseSlicePreviewImageData(
          regionPixels, regionMinX, regionMinY, regionMaxX, regionMaxY,
          regionW, N, voxelSize, prevSize
        );
        onSlicePreview(imageData, prevSize, prevSize);
      }

      setProgress(progressBase + Math.round(slicesDone / zSlices.length * progressRange));
      setPhase('Fine SDF Sampling', Math.round(slicesDone / zSlices.length * 100));
      setStatus('Sampling fine SDF... slice ' + slicesDone + '/' + zSlices.length + ' (narrow-band)');
      await tick();
    }
  }

  return sparseGrid;
}

// ============================================================================
// Standalone VDB Generation (GPU -> VDB tree, no sparse grid)
// ============================================================================

/**
 * Standalone VDB export: samples SDF via GPU slice-by-slice and builds VDB
 * tree blocks on-the-fly. Never allocates a full grid -- only one slice of
 * readback pixels lives in memory at a time.
 */
export async function generateVDB(
  gl: WebGL2RenderingContext,
  config: FractalDefinition,
  formulaParams: Record<string, any>,
  N: number,
  power: number,
  iters: number,
  gridMin: [number, number, number],
  gridMax: [number, number, number],
  mode: 'solid' | 'shell',
  deSamples: number,
  zSubSlices: number,
  callbacks: GPUPipelineCallbacks,
  interlace?: MeshInterlaceConfig,
  quality?: { estimator?: number; distanceMetric?: number },
  surfaceThreshold?: number,
  enableColor?: boolean,
): Promise<GenerateVDBResult> {
  const { log, setProgress, setPhase, setStatus, tick, onSlicePreview } = callbacks;
  const boundsRange = gridMax[0] - gridMin[0];
  const voxelSize = boundsRange / N;
  const bs = 8; // VDB leaf = 8^3, must match
  const bpa = (N / bs) | 0;
  const tileSize = Math.min(N, 2048);
  if (!zSubSlices || zSubSlices < 1) zSubSlices = 1;

  const zRange = await coarsePrePass(gl, config, formulaParams, N, power, iters, gridMin, gridMax, voxelSize, callbacks, interlace, quality, surfaceThreshold);
  const { zSliceMin, zSliceMax } = zRange;

  // ================================================================
  // Fine pass: sample SDF slice by slice with optional Z sub-slicing
  // ================================================================
  const pipeline = setupSDFPipeline(gl, tileSize, config, deSamples || 1, log, interlace, quality);
  bindPipelineUniforms(gl, pipeline, N, power, iters, gridMin, boundsRange, formulaParams, interlace, surfaceThreshold);

  const pixF = new Float32Array(tileSize * tileSize * 4);
  const tree = createTree();
  let totalVoxels = 0;

  // Buffer 8 slices of SDF (one block-layer deep) before building VDB blocks
  const slabBuf: Float32Array[] = new Array(bs);
  for (let i = 0; i < bs; i++) slabBuf[i] = new Float32Array(N * N);

  // Temp buffer for Z sub-slice accumulation (reused per slice)
  const subSliceBuf = zSubSlices > 1 ? new Float32Array(N * N) : null;

  // Live preview
  const prevSize = Math.min(N, 512);
  const prevScale = N / prevSize;

  const activeSlices = zSliceMax - zSliceMin + 1;
  let slicesDone = 0;

  if (zSubSlices > 1) {
    log('Z sub-slicing: ' + zSubSlices + ' sub-samples per voxel layer (smooths Z-axis banding)', 'info');
  }

  for (let gz = zSliceMin; gz <= zSliceMax; gz++) {
    const slab = slabBuf[gz % bs];
    sampleSliceWithSubZ(gl, pipeline, N, tileSize, pixF, slab, gz, zSubSlices, subSliceBuf);

    // Every 8 slices: build VDB blocks from the buffered slab
    if ((gz % bs) === bs - 1) {
      const bz = ((gz / bs) | 0);
      for (let by = 0; by < bpa; by++) {
        for (let bx = 0; bx < bpa; bx++) {
          const densityBytes = new Uint8Array(512);
          let hasAny = false;
          for (let lz = 0; lz < bs; lz++) {
            const slabData = slabBuf[lz];
            for (let ly = 0; ly < bs; ly++) {
              for (let lx = 0; lx < bs; lx++) {
                const gx = bx * bs + lx;
                const gy = by * bs + ly;
                const sdf = slabData[gy * N + gx];
                const vdbIdx = lz | (ly << 3) | (lx << 6);
                let density: number;
                if (sdf < 0) {
                  density = mode === 'shell' ? 0 : 255;
                } else {
                  density = Math.round(Math.max(0, Math.min(255, 255 * (1 - sdf / (voxelSize * 2.5)))));
                }
                densityBytes[vdbIdx] = density;
                if (density > 0) hasAny = true;
              }
            }
          }
          if (hasAny) {
            totalVoxels += addLeafBlock(tree, bx, by, bz, densityBytes);
          }
        }
      }
    }

    // Progress + preview every 8 slices
    slicesDone++;
    if ((slicesDone & 7) === 0) {
      const pct = Math.round(slicesDone / activeSlices * 80);
      setProgress(pct);
      setPhase('VDB Sampling', Math.round(slicesDone / activeSlices * 100));
      setStatus('VDB sampling slice ' + slicesDone + '/' + activeSlices +
        (zSliceMin > 0 || zSliceMax < N - 1 ? ' (Z ' + zSliceMin + '\u2013' + zSliceMax + ')' : ''));

      // Live preview
      if (onSlicePreview) {
        const imageData = buildSlicePreviewImageData(slabBuf[gz % bs], N, voxelSize, prevSize);
        onSlicePreview(imageData, prevSize, prevSize);
      }
      await tick();
    }
  }

  // Cleanup SDF pipeline resources
  gl.deleteTexture(pipeline.tex);
  gl.deleteFramebuffer(pipeline.fbo);
  gl.deleteProgram(pipeline.prog);

  // Track density tree memory
  if (callbacks.memAlloc) {
    let densityLeafCount = 0;
    tree.n4map.forEach((n4) => { densityLeafCount += n4.leafMap.size; });
    // Each leaf: mask(64B) + data(1KB) ≈ 1.1KB. Node4 overhead ~10KB each.
    const densityMB = Math.round((densityLeafCount * 1.1 + tree.n4map.size * 10) / 1024);
    callbacks.memAlloc('vdbDensity', 'VDB Density', densityMB, '#8c6');
  }

  // ================================================================
  // Optional: Color pass — sample orbit trap colors for active voxels
  // Builds a single vec3s "Cd" grid (standard OpenVDB color attribute)
  // ================================================================
  let colorTree: Vec3VDBTree | null = null;

  if (enableColor) {
    setPhase('VDB Color', 0);
    setStatus('Sampling voxel colors...');
    log('Color pass: sampling orbit-trap colors for active voxels', 'phase');

    // Count total active voxels first (cheap — just popcount the masks)
    let totalActiveVoxels = 0;
    tree.n4map.forEach((n4) => {
      n4.leafMap.forEach((leaf) => {
        for (let w = 0; w < 8; w++) {
          let bits = leaf.mask[w];
          // Brian Kernighan popcount
          while (bits !== 0n) { bits &= bits - 1n; totalActiveVoxels++; }
        }
      });
    });
    log('Color pass: ' + totalActiveVoxels.toLocaleString() + ' active voxels to colorize', 'data');

    if (totalActiveVoxels > 0) {
      const cdTree = createVec3Tree();

      // Batch color pass: process leaves in chunks that fit in a GPU texture.
      // Cap batch texture at 2048×2048 = ~4M voxels to limit GPU+CPU memory.
      const maxTexDim = Math.min(
        gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
        2048,
      );
      const maxBatchVoxels = maxTexDim * maxTexDim;

      // Compile color shader once, reuse across batches
      const colFrag = buildMeshColorShader({ definition: config, deType: 'auto', interlace });
      const colProg = createProgram(gl, MESH_SDF_VERT, colFrag, log);
      const colLoc = locateFormulaUniforms(gl, colProg);
      const colVao = gl.createVertexArray();
      const uPositions = gl.getUniformLocation(colProg, 'uPositions');
      const uPower = gl.getUniformLocation(colProg, 'uPower');
      const uIters = gl.getUniformLocation(colProg, 'uIters');
      const uWidth = gl.getUniformLocation(colProg, 'uWidth');
      const uJitterOffset = gl.getUniformLocation(colProg, 'uJitterOffset');

      // Collect leaf references as a flat list: [n5k, n4k, n5k, n4k, ...]
      // Each leaf has at most 512 voxels. This array is ~16 bytes per leaf vs ~100+ per voxel.
      const leafList: number[] = [];
      tree.n4map.forEach((n4, n5k) => {
        n4.leafMap.forEach((_leaf, n4k) => {
          leafList.push(n5k, n4k);
        });
      });
      const totalLeaves = leafList.length >> 1;

      // Pre-allocate reusable batch buffers (sized to upper bound, reused across batches)
      const maxTexW = Math.ceil(Math.sqrt(maxBatchVoxels));
      const maxTexH = Math.ceil(maxBatchVoxels / maxTexW);
      const maxTexPixels = maxTexW * maxTexH;
      const posData = new Float32Array(maxTexPixels * 4);
      const colPixels = new Uint8Array(maxTexPixels * 4);
      const batchVdbIdx = new Uint16Array(maxBatchVoxels);
      const batchLeafIdx = new Uint32Array(maxBatchVoxels);
      const rBytes = new Uint8Array(512);
      const gBytes = new Uint8Array(512);
      const bBytes = new Uint8Array(512);

      let voxelsProcessed = 0;
      let leafIdx = 0;

      while (leafIdx < totalLeaves) {
        // Pack positions directly — no counting pass needed.
        // Fill until we hit maxBatchVoxels or run out of leaves.
        let vi = 0;
        let batchEnd = leafIdx;
        while (batchEnd < totalLeaves && vi + 512 <= maxBatchVoxels) {
          const n5k = leafList[batchEnd * 2];
          const n4k = leafList[batchEnd * 2 + 1];
          const leaf = tree.n4map.get(n5k)!.leafMap.get(n4k)!;
          const n5x = ((n5k >> 10) & 31) << 7;
          const n5y = ((n5k >> 5) & 31) << 7;
          const n5z = (n5k & 31) << 7;
          const n4x = ((n4k >> 8) & 15) << 3;
          const n4y = ((n4k >> 4) & 15) << 3;
          const n4z = (n4k & 15) << 3;
          const blockX = n5x + n4x;
          const blockY = n5y + n4y;
          const blockZ = n5z + n4z;

          for (let vdbI = 0; vdbI < 512; vdbI++) {
            if ((leaf.mask[vdbI >> 6] & (1n << BigInt(vdbI & 63))) === 0n) continue;
            const lz = vdbI & 7;
            const ly = (vdbI >> 3) & 7;
            const lx = (vdbI >> 6) & 7;
            posData[vi * 4]     = gridMin[0] + (blockX + lx + 0.5) * voxelSize;
            posData[vi * 4 + 1] = gridMin[1] + (blockY + ly + 0.5) * voxelSize;
            posData[vi * 4 + 2] = gridMin[2] + (blockZ + lz + 0.5) * voxelSize;
            posData[vi * 4 + 3] = 1.0;
            batchVdbIdx[vi] = vdbI;
            batchLeafIdx[vi] = batchEnd;
            vi++;
          }
          batchEnd++;
        }
        const batchActiveCount = vi;

        if (batchActiveCount === 0) {
          leafIdx = batchEnd;
          continue;
        }

        // Compute texture dimensions from actual packed count
        const texW = Math.ceil(Math.sqrt(batchActiveCount));
        const texH = Math.ceil(batchActiveCount / texW);

        // GPU colorize this batch
        gl.useProgram(colProg);

        const posTex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, posTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texW, texH, 0, gl.RGBA, gl.FLOAT,
          posData.subarray(0, texW * texH * 4));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const colOutTex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, colOutTex);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, texW, texH);
        const colFbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, colFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colOutTex, 0);
        gl.viewport(0, 0, texW, texH);
        gl.bindVertexArray(colVao);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, posTex);
        gl.uniform1i(uPositions, 0);
        gl.uniform1f(uPower, power);
        gl.uniform1i(uIters, iters);
        gl.uniform1i(uWidth, texW);
        gl.uniform3f(uJitterOffset!, 0, 0, 0);
        setFormulaUniforms(gl, colLoc, formulaParams);
        setInterlaceUniforms(gl, colLoc, interlace);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.readPixels(0, 0, texW, texH, gl.RGBA, gl.UNSIGNED_BYTE, colPixels);

        gl.deleteTexture(posTex);
        gl.deleteTexture(colOutTex);
        gl.deleteFramebuffer(colFbo);

        // Scatter colors back into vec3 leaf blocks.
        // Process one leaf at a time: gather its voxel colors, insert block.
        let batchI = 0;
        for (let li = leafIdx; li < batchEnd; li++) {
          // Skip leaves with no active voxels in this range
          if (batchI >= batchActiveCount || batchLeafIdx[batchI] !== li) continue;

          const n5k = leafList[li * 2];
          const n4k = leafList[li * 2 + 1];
          const n5x = ((n5k >> 10) & 31) << 7;
          const n5y = ((n5k >> 5) & 31) << 7;
          const n5z = (n5k & 31) << 7;
          const n4x = ((n4k >> 8) & 15) << 3;
          const n4y = ((n4k >> 4) & 15) << 3;
          const n4z = (n4k & 15) << 3;
          const bx = (n5x + n4x) >> 3;
          const by = (n5y + n4y) >> 3;
          const bz = (n5z + n4z) >> 3;

          rBytes.fill(0);
          gBytes.fill(0);
          bBytes.fill(0);

          while (batchI < batchActiveCount && batchLeafIdx[batchI] === li) {
            const vdbI = batchVdbIdx[batchI];
            rBytes[vdbI] = colPixels[batchI * 4];
            gBytes[vdbI] = colPixels[batchI * 4 + 1];
            bBytes[vdbI] = colPixels[batchI * 4 + 2];
            batchI++;
          }

          addVec3LeafBlock(cdTree, bx, by, bz, rBytes, gBytes, bBytes);
        }

        voxelsProcessed += batchActiveCount;
        leafIdx = batchEnd;

        const pct = Math.round(voxelsProcessed / totalActiveVoxels * 100);
        setProgress(80 + Math.round(pct * 0.12)); // color pass: 80-92% of main bar
        setPhase('VDB Color', pct);
        setStatus('Color pass: ' + voxelsProcessed.toLocaleString() + '/' + totalActiveVoxels.toLocaleString() + ' voxels');
        await tick();
      }

      gl.deleteProgram(colProg);
      gl.deleteVertexArray(colVao);
      optimizeVec3Tree(cdTree);
      colorTree = cdTree;

      // Track color tree memory
      if (callbacks.memAlloc) {
        let colorLeafCount = 0;
        cdTree.n4map.forEach((n4) => { colorLeafCount += n4.leafMap.size; });
        // Each vec3 leaf: mask(64B) + data(6KB) ≈ 6.2KB. Node4 overhead ~60KB each.
        const colorMB = Math.round((colorLeafCount * 6.2 + cdTree.n4map.size * 60) / 1024);
        callbacks.memAlloc('vdbColor', 'VDB Color', colorMB, '#e6a');
      }

      log('Color pass complete: Cd vec3s grid built', 'success');
    }

    setPhase('VDB Color', 100);
    await tick();
  }

  // Optimize density tree
  setProgress(92);
  setPhase('VDB Optimize', 0);
  setStatus('Optimizing VDB tree...');
  const promoted = optimizeTree(tree);
  setProgress(95);
  setPhase('VDB Serialize', 50);
  setStatus('Serializing VDB...');
  await tick();

  // Serialize — density only, or density + Cd color
  // Note: serialization is destructive (frees leaf data to reduce peak memory)
  let leafCount = 0;
  tree.n4map.forEach((n4) => { leafCount += n4.leafMap.size; });

  let vdbBuf: Uint8Array;
  if (colorTree) {
    vdbBuf = serializeMultiGridVDB(tree, colorTree, N, gridMin, boundsRange);
  } else {
    vdbBuf = serializeVDB(tree, N, gridMin, boundsRange);
  }

  // Trees are now destructed (leaf data freed during serialization) — update memory display
  if (callbacks.memFree) {
    callbacks.memFree('vdbDensity');
    if (colorTree) callbacks.memFree('vdbColor');
  }
  if (callbacks.memAlloc) {
    const blobMB = Math.round(vdbBuf.byteLength / (1024 * 1024));
    callbacks.memAlloc('vdbBlob', 'VDB File', blobMB, '#5af');
  }

  setProgress(100);
  setPhase('VDB Complete', 100);

  return {
    blob: new Blob([vdbBuf.buffer.slice(vdbBuf.byteOffset, vdbBuf.byteOffset + vdbBuf.byteLength) as ArrayBuffer], { type: 'application/octet-stream' }),
    voxelCount: totalVoxels,
    leafCount,
    promoted,
    zRange: [zSliceMin, zSliceMax],
    skippedSlices: N - activeSlices,
  };
}

// ============================================================================
// GPU Escape-Test Sampling (for cavity fill)
// ============================================================================

/**
 * Sample escape test on allocated sparse grid blocks via GPU.
 * Returns a Map<blockKey, Uint8Array> bit field: 1 = interior (did not escape).
 * Used as an alternative to SDF-based cavity fill for IFS fractals.
 */
export async function sampleEscapeTest(
  gl: WebGL2RenderingContext,
  sparseGrid: SparseSDFGrid,
  config: FractalDefinition,
  power: number,
  iters: number,
  formulaParams: Record<string, any>,
  gridMin: [number, number, number],
  gridMax: [number, number, number],
  callbacks: GPUPipelineCallbacks,
  onProgress?: (pct: number) => void,
  interlace?: MeshInterlaceConfig
): Promise<EscapeTestResult> {
  const { log, tick } = callbacks;
  const N = sparseGrid.N;
  const bs = sparseGrid.blockSize;
  const bpa = sparseGrid.blocksPerAxis;
  const tileSize = Math.min(N, 2048);
  const boundsRange = gridMax[0] - gridMin[0];
  const bytesPerBlock = (sparseGrid.blockCellCount + 7) >> 3;

  // Build & compile escape shader
  const escapeFrag = buildMeshEscapeShader({ definition: config, deType: 'auto', interlace });
  const escapeProg = createProgram(gl, MESH_SDF_VERT, escapeFrag, log);
  gl.useProgram(escapeProg);

  const ALL_UNIFORMS = [
    'uZ', 'uPower', 'uIters', 'uInvRes', 'uTileOffset', 'uBoundsMin', 'uBoundsRange',
    ...MESH_FORMULA_UNIFORMS,
  ];
  const loc: Record<string, WebGLUniformLocation | null> = {};
  for (let i = 0; i < ALL_UNIFORMS.length; i++) {
    loc[ALL_UNIFORMS[i]] = gl.getUniformLocation(escapeProg, ALL_UNIFORMS[i]);
  }

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, tileSize, tileSize);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

  gl.uniform1f(loc.uPower, power);
  gl.uniform1i(loc.uIters, iters);
  gl.uniform1f(loc.uInvRes, 1.0 / N);
  gl.uniform3f(loc.uBoundsMin, gridMin[0], gridMin[1], gridMin[2]);
  gl.uniform1f(loc.uBoundsRange, boundsRange);
  setFormulaUniforms(gl, loc, formulaParams);
  setInterlaceUniforms(gl, loc, interlace);
  gl.bindVertexArray(gl.createVertexArray());

  // Collect Z slices from allocated blocks
  const blockSlices = new Map<number, {
    entries: Array<{ startX: number; startY: number }>;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }>();

  forEachBandBlock(sparseGrid, (bx: number, by: number, bz: number, startX: number, startY: number, startZ: number) => {
    for (let lz = 0; lz < bs; lz++) {
      const gz = startZ + lz;
      if (gz >= N) continue;
      let info = blockSlices.get(gz);
      if (!info) {
        info = { entries: [], minX: startX, minY: startY, maxX: startX + bs, maxY: startY + bs };
        blockSlices.set(gz, info);
      }
      info.entries.push({ startX, startY });
      if (startX < info.minX) info.minX = startX;
      if (startY < info.minY) info.minY = startY;
      if (startX + bs > info.maxX) info.maxX = startX + bs;
      if (startY + bs > info.maxY) info.maxY = startY + bs;
    }
  });

  const zSlices = Array.from(blockSlices.keys()).sort((a, b) => a - b);

  // Pre-allocate readback buffer
  let maxRegionPixels = 0;
  for (let si = 0; si < zSlices.length; si++) {
    const sliceInfo = blockSlices.get(zSlices[si])!;
    const rW = Math.min(N, sliceInfo.maxX) - Math.max(0, sliceInfo.minX);
    const rH = Math.min(N, sliceInfo.maxY) - Math.max(0, sliceInfo.minY);
    if (rW * rH * 4 > maxRegionPixels) maxRegionPixels = rW * rH * 4;
  }
  const regionPixels = new Float32Array(maxRegionPixels);

  // Output: 1 bit per cell per allocated block
  const escapeMap = new Map<number, Uint8Array>();
  sparseGrid.blocks.forEach((_block, key) => {
    escapeMap.set(key, new Uint8Array(bytesPerBlock));
  });

  let solidCount = 0;
  for (let si = 0; si < zSlices.length; si++) {
    const z = zSlices[si];
    const sliceInfo = blockSlices.get(z)!;
    gl.uniform1f(loc.uZ, (z + 0.5) / N);

    const regionMinX = Math.max(0, sliceInfo.minX);
    const regionMinY = Math.max(0, sliceInfo.minY);
    const regionMaxX = Math.min(N, sliceInfo.maxX);
    const regionMaxY = Math.min(N, sliceInfo.maxY);
    const regionW = regionMaxX - regionMinX;
    const regionH = regionMaxY - regionMinY;

    gl.uniform2f(loc.uTileOffset!, regionMinX, regionMinY);
    gl.viewport(0, 0, regionW, regionH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.readPixels(0, 0, regionW, regionH, gl.RGBA, gl.FLOAT, regionPixels);

    const entries = sliceInfo.entries;
    for (let ei = 0; ei < entries.length; ei++) {
      const e = entries[ei];
      const ebx = (e.startX / bs) | 0;
      const eby = (e.startY / bs) | 0;
      const ebz = (z / bs) | 0;
      const bk = (ebz * bpa + eby) * bpa + ebx;
      const bits = escapeMap.get(bk);
      if (!bits) continue;
      const lz = z - ebz * bs;
      for (let lx = 0; lx < bs; lx++) {
        const gx = e.startX + lx;
        if (gx < regionMinX || gx >= regionMaxX) continue;
        for (let ly = 0; ly < bs; ly++) {
          const gy = e.startY + ly;
          if (gy < regionMinY || gy >= regionMaxY) continue;
          const pixIdx = ((gy - regionMinY) * regionW + (gx - regionMinX)) * 4;
          if (regionPixels[pixIdx] > 0.5) {
            const li = (lz * bs + ly) * bs + lx;
            bits[li >> 3] |= (1 << (li & 7));
            solidCount++;
          }
        }
      }
    }

    if ((si & 7) === 0 && onProgress) {
      onProgress(Math.round(si / zSlices.length * 100));
      await tick();
    }
  }

  // Cleanup
  gl.deleteTexture(tex);
  gl.deleteFramebuffer(fbo);
  gl.deleteProgram(escapeProg);

  return { escapeMap, solidCount };
}

// ============================================================================
// GPU Newton Projection
// ============================================================================

/**
 * GPU Newton projection: project mesh vertices onto the isosurface.
 * Uses the same formula GLSL as the SDF shader.
 * Reuses the existing WebGL context instead of creating a new one.
 */
export function gpuNewtonProject(
  gl: WebGL2RenderingContext,
  mesh: DCMeshResult,
  config: FractalDefinition,
  formulaParams: Record<string, any>,
  power: number,
  iters: number,
  voxelSize: number,
  newtonSteps: number,
  log: (msg: string, type?: string) => void,
  interlace?: MeshInterlaceConfig
): DCMeshResult {
  if (!newtonSteps) newtonSteps = 6;
  const vertexCount = mesh.vertexCount;

  // Pack positions into RGBA32F texture
  const texW = Math.ceil(Math.sqrt(vertexCount));
  const texH = Math.ceil(vertexCount / texW);
  const posData = new Float32Array(texW * texH * 4);
  for (let i = 0; i < vertexCount; i++) {
    posData[i * 4] = mesh.positions[i * 3];
    posData[i * 4 + 1] = mesh.positions[i * 3 + 1];
    posData[i * 4 + 2] = mesh.positions[i * 3 + 2];
    posData[i * 4 + 3] = 1.0; // valid flag
  }

  // Create input texture
  const posTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, posTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texW, texH, 0, gl.RGBA, gl.FLOAT, posData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create output textures (MRT: position + normal)
  const outPosTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, outPosTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, texW, texH);

  const outNrmTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, outNrmTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, texW, texH);

  // Create FBO with MRT
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outPosTex, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, outNrmTex, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

  // Compile Newton shader
  const newtonFrag = buildMeshNewtonShader({ definition: config, deType: 'auto', interlace });
  const newtonProg = createProgram(gl, MESH_SDF_VERT, newtonFrag, log);
  gl.useProgram(newtonProg);
  gl.viewport(0, 0, texW, texH);
  gl.bindVertexArray(gl.createVertexArray());

  // Bind input texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, posTex);
  gl.uniform1i(gl.getUniformLocation(newtonProg, 'uPositions'), 0);

  // Set uniforms
  gl.uniform1f(gl.getUniformLocation(newtonProg, 'uPower'), power);
  gl.uniform1i(gl.getUniformLocation(newtonProg, 'uIters'), iters);
  gl.uniform1f(gl.getUniformLocation(newtonProg, 'uVoxelSize'), voxelSize);
  gl.uniform1i(gl.getUniformLocation(newtonProg, 'uNewtonSteps'), newtonSteps);

  // Set formula uniforms
  const formulaLoc = locateFormulaUniforms(gl, newtonProg);
  setFormulaUniforms(gl, formulaLoc, formulaParams);
  setInterlaceUniforms(gl, formulaLoc, interlace);

  // Render
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Read back positions
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  const outPosData = new Float32Array(texW * texH * 4);
  gl.readPixels(0, 0, texW, texH, gl.RGBA, gl.FLOAT, outPosData);

  // Read back normals
  gl.readBuffer(gl.COLOR_ATTACHMENT1);
  const outNrmData = new Float32Array(texW * texH * 4);
  gl.readPixels(0, 0, texW, texH, gl.RGBA, gl.FLOAT, outNrmData);

  // Copy results back to mesh
  for (let i = 0; i < vertexCount; i++) {
    mesh.positions[i * 3] = outPosData[i * 4];
    mesh.positions[i * 3 + 1] = outPosData[i * 4 + 1];
    mesh.positions[i * 3 + 2] = outPosData[i * 4 + 2];
    mesh.normals[i * 3] = outNrmData[i * 4];
    mesh.normals[i * 3 + 1] = outNrmData[i * 4 + 1];
    mesh.normals[i * 3 + 2] = outNrmData[i * 4 + 2];
  }

  // Clean up GPU resources (but don't destroy the context)
  gl.deleteTexture(posTex);
  gl.deleteTexture(outPosTex);
  gl.deleteTexture(outNrmTex);
  gl.deleteFramebuffer(fbo);
  gl.deleteProgram(newtonProg);

  return mesh;
}

// ============================================================================
// GPU Vertex Coloring
// ============================================================================

/**
 * Colorize mesh vertices on GPU using orbit trap values.
 * Supports spatial supersampling: renders N passes with jittered positions
 * and accumulates into a float FBO for smooth, noise-free colors.
 * @param colorSamples - number of jittered samples (1 = no SS)
 * @param jitterRadius - world-space radius for jitter (e.g. voxelSize * 0.5)
 * Returns Uint8Array of RGBA colors (0-255).
 */
export async function colorizeVerticesGPU(
  gl: WebGL2RenderingContext,
  mesh: DCMeshResult,
  config: FractalDefinition,
  formulaParams: Record<string, any>,
  power: number,
  iters: number,
  colorSamples: number,
  jitterRadius: number,
  callbacks: GPUPipelineCallbacks,
  interlace?: MeshInterlaceConfig
): Promise<Uint8Array> {
  const { log, setProgress, setPhase, setStatus, tick } = callbacks;
  if (!colorSamples || colorSamples < 1) colorSamples = 1;
  if (!jitterRadius) jitterRadius = 0;
  const vertexCount = mesh.vertexCount;
  const colTexW = Math.ceil(Math.sqrt(vertexCount));
  const colTexH = Math.ceil(vertexCount / colTexW);
  log('Color texture: ' + colTexW + 'x' + colTexH + ' (' + (colTexW * colTexH * 16 / (1024 * 1024)).toFixed(0) + ' MB position data)' +
    (colorSamples > 1 ? ' | ' + colorSamples + ' samples, radius=' + jitterRadius.toFixed(5) : ''), 'mem');

  // Pack positions into RGBA32F texture
  let posData: Float32Array | null = new Float32Array(colTexW * colTexH * 4);
  for (let i = 0; i < vertexCount; i++) {
    posData[i * 4] = mesh.positions[i * 3];
    posData[i * 4 + 1] = mesh.positions[i * 3 + 1];
    posData[i * 4 + 2] = mesh.positions[i * 3 + 2];
    posData[i * 4 + 3] = 1.0;
  }

  const colFrag = buildMeshColorShader({ definition: config, deType: 'auto', interlace });
  const colProg = createProgram(gl, MESH_SDF_VERT, colFrag, log);
  gl.useProgram(colProg);

  const posTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, posTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, colTexW, colTexH, 0, gl.RGBA, gl.FLOAT, posData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  posData = null; // free immediately

  // Use RGBA32F for accumulation when supersampling, RGBA8 for single-pass
  const useFloat = colorSamples > 1;
  const colOutTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, colOutTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, useFloat ? gl.RGBA32F : gl.RGBA8, colTexW, colTexH);
  const colFbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, colFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colOutTex, 0);
  gl.viewport(0, 0, colTexW, colTexH);
  gl.bindVertexArray(gl.createVertexArray());

  // Set uniforms
  const colLoc = locateFormulaUniforms(gl, colProg);
  const jitterLoc = gl.getUniformLocation(colProg, 'uJitterOffset');
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, posTex);
  gl.uniform1i(gl.getUniformLocation(colProg, 'uPositions'), 0);
  gl.uniform1f(gl.getUniformLocation(colProg, 'uPower'), power);
  gl.uniform1i(gl.getUniformLocation(colProg, 'uIters'), iters);
  gl.uniform1i(gl.getUniformLocation(colProg, 'uWidth'), colTexW);
  setFormulaUniforms(gl, colLoc, formulaParams);
  setInterlaceUniforms(gl, colLoc, interlace);

  if (colorSamples <= 1) {
    // Single pass -- no jitter, no blending
    gl.uniform3f(jitterLoc!, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  } else {
    // Multi-pass: clear to black, additive blend each jittered pass
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // Jitter offsets using Fibonacci sphere distribution (uniform coverage)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let si = 0; si < colorSamples; si++) {
      const phi = Math.acos(1 - 2 * (si + 0.5) / colorSamples);
      const theta = goldenAngle * si;
      // Vary radius per sample to fill the sphere volume, not just surface
      const r = jitterRadius * Math.cbrt((si + 0.5) / colorSamples);
      const jx = r * Math.sin(phi) * Math.cos(theta);
      const jy = r * Math.sin(phi) * Math.sin(theta);
      const jz = r * Math.cos(phi);
      gl.uniform3f(jitterLoc!, jx, jy, jz);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if ((si & 3) === 0 || si === colorSamples - 1) {
        const pct = Math.round((si + 1) / colorSamples * 100);
        setProgress(80 + Math.round((si + 1) / colorSamples * 10));
        setPhase('Phase 5: Vertex Coloring', pct);
        setStatus('Color sample ' + (si + 1) + '/' + colorSamples);
        await tick();
      }
    }

    gl.disable(gl.BLEND);
  }

  // Read back results
  const colors = new Uint8Array(vertexCount * 4);
  if (useFloat) {
    const colPixF = new Float32Array(colTexW * colTexH * 4);
    gl.readPixels(0, 0, colTexW, colTexH, gl.RGBA, gl.FLOAT, colPixF);
    const invN = 1.0 / colorSamples;
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 4]     = Math.min(255, Math.round(colPixF[i * 4]     * invN * 255));
      colors[i * 4 + 1] = Math.min(255, Math.round(colPixF[i * 4 + 1] * invN * 255));
      colors[i * 4 + 2] = Math.min(255, Math.round(colPixF[i * 4 + 2] * invN * 255));
      colors[i * 4 + 3] = 255;
    }
  } else {
    const colPix = new Uint8Array(colTexW * colTexH * 4);
    gl.readPixels(0, 0, colTexW, colTexH, gl.RGBA, gl.UNSIGNED_BYTE, colPix);
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 4]     = colPix[i * 4];
      colors[i * 4 + 1] = colPix[i * 4 + 1];
      colors[i * 4 + 2] = colPix[i * 4 + 2];
      colors[i * 4 + 3] = 255;
    }
  }

  // Clean up GPU resources (but don't destroy the context)
  gl.deleteTexture(posTex);
  gl.deleteTexture(colOutTex);
  gl.deleteFramebuffer(colFbo);
  gl.deleteProgram(colProg);

  return colors;
}

// ============================================================================
// Auto-Fit Bounds
// ============================================================================

/**
 * Sample a coarse 64³ SDF grid over a large search box to find the bounding box
 * of the fractal surface. Returns center + size with padding, or null if empty.
 */
export async function autoFitBounds(
  config: FractalDefinition,
  formulaParams: Record<string, any>,
  iters: number,
  power: number,
  interlace?: MeshInterlaceConfig,
  quality?: { estimator?: number; distanceMetric?: number },
  surfaceThreshold?: number,
): Promise<{ center: [number, number, number]; size: [number, number, number] } | null> {
  const gl = initWebGL();
  const fitN = 64;
  const searchSize = 6.0; // search [-3, 3]^3
  const searchMin: [number, number, number] = [-searchSize / 2, -searchSize / 2, -searchSize / 2];
  const boundsRange = searchSize;
  const voxelSize = boundsRange / fitN;
  const thresh = surfaceThreshold ?? 0.0;

  try {
    const pipeline = setupSDFPipeline(gl, fitN, config, 1, () => {}, interlace, quality);
    bindPipelineUniforms(gl, pipeline, fitN, power, iters, searchMin, boundsRange, formulaParams, interlace, thresh);
    gl.viewport(0, 0, fitN, fitN);

    const pixF = new Float32Array(fitN * fitN * 4);
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let found = false;

    for (let cz = 0; cz < fitN; cz++) {
      gl.uniform1f(pipeline.loc.uZ, (cz + 0.5) / fitN);
      gl.uniform2f(pipeline.loc.uTileOffset!, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, fitN, fitN, gl.RGBA, gl.FLOAT, pixF);

      const worldZ = searchMin[2] + (cz + 0.5) * voxelSize;

      for (let cy = 0; cy < fitN; cy++) {
        for (let cx = 0; cx < fitN; cx++) {
          const sdf = pixF[(cy * fitN + cx) * 4];
          if (sdf < voxelSize * 2) {
            const worldX = searchMin[0] + (cx + 0.5) * voxelSize;
            const worldY = searchMin[1] + (cy + 0.5) * voxelSize;
            if (worldX < minX) minX = worldX;
            if (worldX > maxX) maxX = worldX;
            if (worldY < minY) minY = worldY;
            if (worldY > maxY) maxY = worldY;
            if (worldZ < minZ) minZ = worldZ;
            if (worldZ > maxZ) maxZ = worldZ;
            found = true;
          }
        }
      }
    }

    gl.deleteTexture(pipeline.tex);
    gl.deleteFramebuffer(pipeline.fbo);
    gl.deleteProgram(pipeline.prog);

    if (!found) return null;

    // Add 15% padding
    const pad = 0.15;
    const sx = (maxX - minX) * (1 + pad);
    const sy = (maxY - minY) * (1 + pad);
    const sz = (maxZ - minZ) * (1 + pad);
    const size = Math.max(sx, sy, sz, 0.5); // minimum size 0.5

    return {
      center: [
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2,
      ],
      size: [size, size, size],
    };
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
