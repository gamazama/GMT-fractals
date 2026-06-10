/**
 * ParallaxRenderer — the WebGL2 surface that draws the Parallax depth field.
 *
 * Passes:
 *   1. SPRITES ×2 — the same instanced particle set drawn TWICE, ADDITIVELY blended into an
 *      offscreen float (RGBA16F) framebuffer (additive = order-independent, no depth sort):
 *      first as big, very soft, faint HALOS — they fuse into a continuous glowing colour field
 *      (the gradient as a nebula, no black void) — then as crisp CORES (the sparkle on top).
 *      Per instance: a dynamic (x, y, energy) triple from the CPU sim and a static (depth, lutT)
 *      pair. The vertex shader applies the parallax camera shift (× the depth weight — near
 *      moves more) and the depth→size curve; the fragment shader samples the gradient LUT and
 *      applies the atmospheric haze (far = softer, desaturated, dimmer) and the stir flare.
 *   2. PRESENT — a fullscreen quad: soft-knee tonemap (`1 - exp(-x·exposure)`, so dense additive
 *      overlaps glow toward white instead of clipping), a dim wash of the SAME gradient as the
 *      backdrop — oriented to MATCH the active colour mapping (horizontal for flow, radial for
 *      bloom, diagonal otherwise) so even the empty space reads as the user's gradient — then
 *      the SHARED dither tail before the 8-bit write — identical grain to every other
 *      fullscreen mode, baked into PNG export (`preserveDrawingBuffer`).
 *
 * Colour comes ONLY from the gradient LUT — both passes sample `uLut`; nothing invents colour.
 *
 * @see ParallaxField.ts (the CPU sim producing the dynamic buffer)
 * @see engine/fractal/shaders/ditherTail.ts (DITHER_TAIL_GLSL — the shared tail)
 */

import { createBlueNoiseWebGL2, type BlueNoiseTexture } from '../../../../engine/utils/createBlueNoiseWebGL2';
import { DITHER_TAIL_GLSL, VERT_QUAD } from '../../ditherTail';
import { PAR_FAR } from './ParallaxField';
import type { ParallaxColorBy } from './parallaxStore';

/** Reference particle count for brightness normalization — `uIntensity` scales by
 *  `sqrt(REF_N / n)` so switching density keeps the overall exposure steady. */
const REF_N = 6000;
// Tuned against the 11–26px sprite range: per-pixel brightness scales with total sprite AREA
// over screen area, so bigger sprites need a lower per-sprite intensity for the same exposure.
const BASE_INTENSITY = 0.45;
const EXPOSURE = 1.15;
/** Halo pass shape: size multiplier + intensity fraction of the core pass. */
const HALO_SIZE = 4.2;
const HALO_GAIN = 0.22;

/** Background-wash orientation — matches the active colour mapping (set by the mode). */
export type WashMode = 0 | 1 | 2; // 0 horizontal · 1 radial · 2 diagonal

/** Wash orientation per colour mapping — co-located with the wash GLSL it describes, so the
 *  backdrop and the particle colours always tell the same spatial story. */
export const WASH_FOR: Record<ParallaxColorBy, WashMode> = { flow: 0, bloom: 1, depth: 2, mix: 2 };

const SPRITE_VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;  // quad corner in [-1,1]
layout(location=1) in vec3 aPosE;    // x, y (CSS px, top-left origin), stir energy
layout(location=2) in vec2 aDT;      // depth (0 far .. 1 near), LUT coord
uniform vec2 uResolution;            // CSS px
uniform vec2 uCam;                   // parallax camera shift, CSS px
uniform float uSizeScale;
uniform float uHalo;                 // 0 = crisp core pass, 1 = soft nebula-halo pass
out vec2 vCorner;
out vec3 vData;                      // depth, lutT, energy
void main() {
  float z = aDT.x;
  // Depth→parallax weight — PAR_FAR injected from ParallaxField (one source with the sim).
  vec2 p = aPosE.xy + uCam * mix(${PAR_FAR.toFixed(3)}, 1.0, z);
  // Near = big, far = smaller but still substantial (the field fills the screen, no pin-prick
  // void); a stirred particle swells slightly while it flares.
  float size = mix(11.0, 26.0, pow(z, 1.35)) * uSizeScale * (1.0 + 0.35 * aPosE.z)
             * mix(1.0, ${HALO_SIZE.toFixed(2)}, uHalo);
  vec2 c = (p + aCorner * size) / uResolution;
  gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
  vCorner = aCorner;
  vData = vec3(z, aDT.y, aPosE.z);
}`;

const SPRITE_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vCorner;
in vec3 vData;
uniform sampler2D uLut;
uniform float uIntensity;
uniform float uHalo;                 // 0 = crisp core pass, 1 = soft nebula-halo pass
out vec4 fragColor;
void main() {
  float d2 = dot(vCorner, vCorner);
  float z = vData.x;
  // Gaussian core with a hard zero at the quad edge; near = crisp, far = soft bokeh blob.
  // The halo pass is uniformly soft + faint — overlapping halos fuse into the nebula field.
  float sharp = mix(mix(2.0, 4.5, z), 1.3, uHalo);
  float a = exp(-d2 * sharp) * max(1.0 - d2, 0.0) * mix(1.0, ${HALO_GAIN.toFixed(2)}, uHalo);
  vec3 c = texture(uLut, vec2(vData.y, 0.5)).rgb;
  // Atmospheric haze: far layers desaturate toward their luma and dim.
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(luma), c, mix(0.55, 1.0, z)) * mix(0.4, 1.0, z);
  // Stir flare — touched colours sing, then settle as energy decays.
  c *= 1.0 + 1.8 * vData.z;
  fragColor = vec4(c * (a * uIntensity), 1.0);
}`;

const PRESENT_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uField;
uniform sampler2D uLut;
uniform sampler2D uBlueNoise;
uniform vec2 uBlueNoiseRes;
uniform bool uDither;
uniform float uExposure;
uniform int uWashMode;               // 0 horizontal · 1 radial · 2 diagonal
vec3 sampleLut(float t) { return texture(uLut, vec2(clamp(t, 0.0, 1.0), 0.5)).rgb; }
${DITHER_TAIL_GLSL}
void main() {
  // Soft-knee tonemap: additive pile-ups roll off into glow instead of clipping.
  vec3 spr = 1.0 - exp(-texture(uField, vUv).rgb * uExposure);
  // Dim wash of the gradient as the backdrop, oriented like the particle colour mapping so
  // the dots read as the BRIGHT layer of the same ramp; vignetted toward the corners.
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 q = uv - 0.5;
  float tbg = uWashMode == 0 ? uv.x
            : uWashMode == 1 ? length(q) / 0.72
            : (uv.x + uv.y) * 0.5;
  vec3 bg = sampleLut(mix(0.03, 0.97, clamp(tbg, 0.0, 1.0)));
  bg *= 0.13 * max(1.0 - 1.4 * dot(q, q), 0.0);
  fragColor = vec4(ditherTail(bg + spr, gl_FragCoord.xy), 1.0);
}`;

export class ParallaxRenderer {
  private gl: WebGL2RenderingContext;
  private spriteProg: WebGLProgram;
  private presentProg: WebGLProgram;
  private spriteVao: WebGLVertexArrayObject;
  private presentVao: WebGLVertexArrayObject;
  private cornerVbo: WebGLBuffer;
  private dynVbo: WebGLBuffer;
  private statVbo: WebGLBuffer;
  private lutTex: WebGLTexture;
  private fieldTex: WebGLTexture;
  private fbo: WebGLFramebuffer;
  private blueNoise: BlueNoiseTexture;
  private sLoc: Record<string, WebGLUniformLocation | null> = {};
  private pLoc: Record<string, WebGLUniformLocation | null> = {};
  /** RGBA16F when float render targets are supported (the usual case), else RGBA8 (slightly
   *  clipped highlights, still correct). */
  private fieldInternal: number;
  private fieldType: number;
  private n = 0;
  private cssW = 1;
  private cssH = 1;
  dither = true;
  /** Background-wash orientation — the mode keeps it matched to the colour mapping. */
  washMode: WashMode = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('[ParallaxRenderer] WebGL2 unavailable');
    this.gl = gl;

    const floatOk =
      !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    this.fieldInternal = floatOk ? gl.RGBA16F : gl.RGBA8;
    this.fieldType = floatOk ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

    this.spriteProg = this.link(SPRITE_VERT, SPRITE_FRAG);
    this.presentProg = this.link(VERT_QUAD, PRESENT_FRAG);
    for (const u of ['uResolution', 'uCam', 'uSizeScale', 'uLut', 'uIntensity', 'uHalo']) {
      this.sLoc[u] = gl.getUniformLocation(this.spriteProg, u);
    }
    for (const u of ['uField', 'uLut', 'uBlueNoise', 'uBlueNoiseRes', 'uDither', 'uExposure', 'uWashMode']) {
      this.pLoc[u] = gl.getUniformLocation(this.presentProg, u);
    }

    // One corner VBO serves both passes: sprite quad corners (divisor 0) + the present quad.
    this.cornerVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.spriteVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.spriteVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.dynVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynVbo);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    this.statVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.statVbo);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);

    this.presentVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.presentVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.lutTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.fieldTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fbo = gl.createFramebuffer()!;

    // Independent-channel RGBA blue noise → a true TPDF in the shared tail (matches the compositor).
    this.blueNoise = createBlueNoiseWebGL2(gl, '/blueNoiseRGBA.png');
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
        throw new Error(`[ParallaxRenderer] shader compile: ${log}`);
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vsrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsrc);
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(`[ParallaxRenderer] program link: ${log}`);
    }
    return p;
  }

  setLut(rgba1024: Uint8Array): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba1024);
  }

  /** (Re)allocate the per-instance buffers for a new particle count (derived from the attribs —
   *  2 floats per instance) + upload the static attribs. */
  setField(staticAttribs: Float32Array): void {
    const gl = this.gl;
    this.n = staticAttribs.length / 2;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.n * 3 * 4, gl.DYNAMIC_DRAW);
    this.updateStatic(staticAttribs);
  }

  /** Re-upload the static (depth, lutT) attribs — e.g. after a colour-mapping change. */
  updateStatic(staticAttribs: Float32Array): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.statVbo);
    gl.bufferData(gl.ARRAY_BUFFER, staticAttribs, gl.STATIC_DRAW);
  }

  /** Resize the backing store + the float field buffer (device px), remembering the CSS size
   *  the sim works in. */
  setSize(cssW: number, cssH: number, dpr: number): void {
    const gl = this.gl;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    if (gl.canvas.width === w && gl.canvas.height === h) return;
    gl.canvas.width = w;
    gl.canvas.height = h;
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.fieldInternal, w, h, 0, gl.RGBA, this.fieldType, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fieldTex, 0);
    // A driver lacking renderable 16F despite the extension query → fall back to RGBA8.
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && this.fieldInternal !== gl.RGBA8) {
      this.fieldInternal = gl.RGBA8;
      this.fieldType = gl.UNSIGNED_BYTE;
      gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, this.fieldInternal, w, h, 0, gl.RGBA, this.fieldType, null);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Draw one frame: the particle set twice (soft halos, then crisp cores) additively into the
   *  float field, then tonemap + wash + dither to the canvas. `dyn` is the (x, y, energy)
   *  per-instance buffer; `camX/camY` the parallax camera shift in CSS px. */
  draw(dyn: Float32Array, camX: number, camY: number): void {
    const gl = this.gl;
    const W = gl.canvas.width;
    const H = gl.canvas.height;

    // Pass 1 — additive sprites into the field buffer: halos (the fused nebula), then cores.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.spriteProg);
    gl.bindVertexArray(this.spriteVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dyn);
    gl.uniform2f(this.sLoc['uResolution'], this.cssW, this.cssH);
    gl.uniform2f(this.sLoc['uCam'], camX, camY);
    gl.uniform1f(this.sLoc['uSizeScale'], Math.min(Math.max(Math.min(this.cssW, this.cssH) / 950, 0.75), 1.5));
    gl.uniform1f(this.sLoc['uIntensity'], BASE_INTENSITY * Math.sqrt(REF_N / Math.max(this.n, 1)));
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(this.sLoc['uLut'], 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(this.sLoc['uHalo'], 1);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    gl.uniform1f(this.sLoc['uHalo'], 0);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    gl.disable(gl.BLEND);

    // Pass 2 — tonemap + gradient wash + shared dither tail to the canvas.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.presentProg);
    gl.bindVertexArray(this.presentVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.uniform1i(this.pLoc['uField'], 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(this.pLoc['uLut'], 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.blueNoise.texture);
    gl.uniform1i(this.pLoc['uBlueNoise'], 2);
    const [bw, bh] = this.blueNoise.getResolution();
    gl.uniform2f(this.pLoc['uBlueNoiseRes'], bw, bh);
    gl.uniform1i(this.pLoc['uDither'], this.dither ? 1 : 0);
    gl.uniform1f(this.pLoc['uExposure'], EXPOSURE);
    gl.uniform1i(this.pLoc['uWashMode'], this.washMode);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.spriteProg);
    gl.deleteProgram(this.presentProg);
    gl.deleteBuffer(this.cornerVbo);
    gl.deleteBuffer(this.dynVbo);
    gl.deleteBuffer(this.statVbo);
    gl.deleteVertexArray(this.spriteVao);
    gl.deleteVertexArray(this.presentVao);
    gl.deleteTexture(this.lutTex);
    gl.deleteTexture(this.fieldTex);
    gl.deleteTexture(this.blueNoise.texture);
    gl.deleteFramebuffer(this.fbo);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
