/**
 * LiquifyRenderer — the WebGL2 surface that draws the Liquify soft-body mesh.
 *
 * A triangle mesh (two tris per grid cell) whose per-vertex position (`aPos`, the deformed
 * geometry) is re-uploaded each frame and whose per-vertex LUT coord (`aT`, fixed) is uploaded
 * once. The fragment shader samples the gradient LUT at the interpolated `t` and runs the SHARED
 * dither tail (`DITHER_TAIL_GLSL`) before the 8-bit write — so the warped gradient stays
 * band-free, identical to every other fullscreen mode, and the dither bakes into PNG export
 * (`preserveDrawingBuffer`).
 *
 * `ownCanvas` modes bake their own dither (the compositor isn't in the loop), so this owns its own
 * blue-noise tile via `createBlueNoiseWebGL2` + the reserved dither uniforms.
 *
 * @see LiquifyMesh.ts (the CPU soft body producing `pos`)
 * @see engine/fractal/shaders/ditherTail.ts (DITHER_TAIL_GLSL — the shared tail)
 */

import { createBlueNoiseWebGL2, type BlueNoiseTexture } from '../../../../engine/utils/createBlueNoiseWebGL2';
import { DITHER_TAIL_GLSL } from '../../ditherTail';
import { DEFAULT_BACKGROUND } from '../../../../palette/core/rampGeometry';
import { renderSide, upsampleCatmullRom, buildRenderT, buildRenderIndices } from './catmullRom';

/** Target on-screen edge length (px) for a render sub-triangle — drives the adaptive subdivision. */
const TARGET_EDGE_PX = 12;
/** Max subdivision factor (bounds the per-frame upsample + upload cost). */
const MAX_SUBDIV = 4;

const VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos; // deformed mesh position in [0,1] (top-left origin)
layout(location=1) in float aT;  // fixed LUT coord carried by the vertex
uniform vec2 uFit;               // (min/w, min/h) — letterboxes the mesh into a centred square
out float vT;
void main() {
  vT = aT;
  // [0,1] (y-down) → centred isotropic square in clip (y-up), so brushes stay circular on any aspect.
  vec2 p = (aPos * 2.0 - 1.0) * uFit;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
}`;

/** The mesh is letterboxed into the largest centred square — `uFit` scales clip so a unit mesh
 *  stays isotropic (circular brushes) on any aspect. Shared with the mode's pointer mapping. */
export const computeFit = (w: number, h: number): [number, number] => {
  const m = Math.min(w, h);
  return [m / Math.max(w, 1), m / Math.max(h, 1)];
};

/** Screen px (CSS, origin top-left) → mesh [0,1]² (inverse of the vertex transform). */
export const screenToMesh = (px: number, py: number, w: number, h: number): [number, number] => {
  const [fx, fy] = computeFit(w, h);
  const mx = ((px / w * 2 - 1) / fx + 1) / 2;
  const my = (1 - (1 - py / h * 2) / fy) / 2;
  return [mx, my];
};

/** Mesh [0,1]² → screen px (CSS, origin top-left) — for drawing the signifier overlay. */
export const meshToScreen = (mx: number, my: number, w: number, h: number): [number, number] => {
  const [fx, fy] = computeFit(w, h);
  const px = ((mx * 2 - 1) * fx + 1) / 2 * w;
  const py = (1 + (my * 2 - 1) * fy) / 2 * h;
  return [px, py];
};

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in float vT;
out vec4 fragColor;
uniform sampler2D uLut;
uniform sampler2D uBlueNoise;
uniform vec2 uBlueNoiseRes;
uniform bool uDither;
vec3 sampleLut(float t) { return texture(uLut, vec2(clamp(t, 0.0, 1.0), 0.5)).rgb; }
${DITHER_TAIL_GLSL}
void main() {
  vec3 c = sampleLut(vT);
  fragColor = vec4(ditherTail(c, gl_FragCoord.xy), 1.0);
}`;

export class LiquifyRenderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private posVbo: WebGLBuffer;
  private tVbo: WebGLBuffer;
  private ibo: WebGLBuffer;
  private vao: WebGLVertexArrayObject;
  private lutTex: WebGLTexture;
  private blueNoise: BlueNoiseTexture;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private indexCount = 0;
  /** Sim grid side (the coarse control grid). */
  private simN: number;
  /** Current render subdivision factor (1 = draw the coarse grid directly = the flat A/B baseline). */
  private subdivLevel = 1;
  /** Whether adaptive smooth subdivision is allowed (the UI toggle); false pins `subdivLevel = 1`. */
  private subdiv = true;
  /** Reused render-grid position buffer (Catmull-Rom upsample target), resized on a level change. */
  private renderPos = new Float32Array(0);
  dither = true;

  constructor(canvas: HTMLCanvasElement, simN: number, onReady?: () => void) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('[LiquifyRenderer] WebGL2 unavailable');
    this.gl = gl;
    this.simN = simN;

    this.prog = this.link(VERT, FRAG);
    for (const u of ['uLut', 'uBlueNoise', 'uBlueNoiseRes', 'uDither', 'uFit']) {
      this.loc[u] = gl.getUniformLocation(this.prog, u);
    }

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.posVbo = gl.createBuffer()!; // dynamic render positions (re-uploaded each frame)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.tVbo = gl.createBuffer()!; // static render LUT-coords (rebuilt on a level change)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tVbo);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
    this.ibo = gl.createBuffer()!;
    gl.bindVertexArray(null);
    this.buildRenderBuffers(1); // start at the flat grid; draw() raises the level on stretch

    this.lutTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Independent-channel RGBA blue noise → a true TPDF in the shared tail (matches the compositor).
    this.blueNoise = createBlueNoiseWebGL2(gl, '/blueNoiseRGBA.png', () => onReady?.());
    gl.bindTexture(gl.TEXTURE_2D, this.blueNoise.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  private link(vsrc: string, fsrc: string): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, src: string): WebGLShader => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh) || '';
        gl.deleteShader(sh);
        throw new Error(`[LiquifyRenderer] shader compile: ${log}`);
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vsrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsrc);
    const p = gl.createProgram()!;
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(`[LiquifyRenderer] program link: ${log}`);
    }
    return p;
  }

  setLut(rgba1024: Uint8Array): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba1024);
  }

  setSize(w: number, h: number): void {
    if (this.gl.canvas.width === w && this.gl.canvas.height === h) return;
    this.gl.canvas.width = w;
    this.gl.canvas.height = h;
  }

  /** Toggle adaptive smooth subdivision. Off pins the render mesh to the coarse grid (`S = 1`),
   *  the flat-grid baseline for A/B comparison. */
  setSubdiv(on: boolean): void { this.subdiv = on; }

  /** Allocate the render-grid buffers for subdivision factor `S` and (re)upload the static LUT-coord
   *  + index buffers. The dynamic position buffer is sized; its data is filled per-frame in draw(). */
  private buildRenderBuffers(S: number): void {
    const gl = this.gl;
    this.subdivLevel = S;
    const RN = renderSide(this.simN, S);
    this.renderPos = new Float32Array(RN * RN * 2);
    const t = buildRenderT(this.simN, S);
    const idx = buildRenderIndices(this.simN, S);
    this.indexCount = idx.length;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.renderPos.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tVbo);
    gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  /** Pick the subdivision factor from the worst on-screen stretch of any coarse cell edge — a GLOBAL
   *  level (uniform fine grid → no T-junction cracks). `S = 1` when subdivision is off or the mesh
   *  is barely deformed; rises toward MAX_SUBDIV where the warp fans the triangles out. */
  private pickSubdiv(pos: Float32Array): number {
    if (!this.subdiv) return 1;
    const n = this.simN;
    const side = Math.min(this.gl.canvas.width, this.gl.canvas.height);
    let maxE = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const k = y * n + x;
        if (x < n - 1) {
          const dx = pos[2 * k] - pos[2 * (k + 1)], dy = pos[2 * k + 1] - pos[2 * (k + 1) + 1];
          const e = dx * dx + dy * dy; if (e > maxE) maxE = e;
        }
        if (y < n - 1) {
          const dx = pos[2 * k] - pos[2 * (k + n)], dy = pos[2 * k + 1] - pos[2 * (k + n) + 1];
          const e = dx * dx + dy * dy; if (e > maxE) maxE = e;
        }
      }
    }
    const maxPx = Math.sqrt(maxE) * side;
    const S = Math.round(maxPx / TARGET_EDGE_PX);
    return S < 1 ? 1 : S > MAX_SUBDIV ? MAX_SUBDIV : S;
  }

  /** Draw the soft body: pick a subdivision level from the stretch, Catmull-Rom upsample the coarse
   *  deformed grid into the render grid (smooth — no facets), then draw it. */
  draw(pos: Float32Array): void {
    const gl = this.gl;
    const S = this.pickSubdiv(pos);
    if (S !== this.subdivLevel) this.buildRenderBuffers(S);
    upsampleCatmullRom(pos, this.simN, S, this.renderPos);
    const bg = DEFAULT_BACKGROUND;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(bg.r / 255, bg.g / 255, bg.b / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.renderPos);
    const [fx, fy] = computeFit(gl.canvas.width, gl.canvas.height);
    gl.uniform2f(this.loc['uFit'], fx, fy);
    gl.uniform1i(this.loc['uDither'], this.dither ? 1 : 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(this.loc['uLut'], 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.blueNoise.texture);
    gl.uniform1i(this.loc['uBlueNoise'], 2);
    const [bw, bh] = this.blueNoise.getResolution();
    gl.uniform2f(this.loc['uBlueNoiseRes'], bw, bh);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.prog);
    gl.deleteBuffer(this.posVbo);
    gl.deleteBuffer(this.tVbo);
    gl.deleteBuffer(this.ibo);
    gl.deleteVertexArray(this.vao);
    gl.deleteTexture(this.lutTex);
    gl.deleteTexture(this.blueNoise.texture);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
