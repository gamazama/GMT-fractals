/**
 * FullscreenCompositor — the ONE shared WebGL2 surface every non-`ownCanvas` fullscreen
 * mode renders through, and the single point where the dither tail bakes into the 8-bit
 * output (screen AND PNG export, since the canvas uses `preserveDrawingBuffer`).
 *
 * It owns: a fullscreen-quad VBO, the blue-noise tile (reused via `createBlueNoiseWebGL2`),
 * a source texture (cpuRaster uploads), the gradient LUT texture (glQuad modes), and a
 * per-mode compiled program cache. Two present paths, both ending in the shared dither tail:
 *   • {@link presentRaster} — upload an RGBA buffer + blit (the geometry modes).
 *   • {@link presentMode}   — render a glQuad mode's wrapped fragment shader.
 *
 * Graceful degradation: if WebGL2 is unavailable it falls back to a Canvas-2D `putImageData`
 * for cpuRaster (NO dither — the GL tail is the only dither path) and skips glQuad modes.
 *
 * @see gradient-explorer/fullscreen/ditherTail.ts   (the wrapper + dither chunk)
 * @see gradient-explorer/fullscreen/modeRegistry.ts (the mode contract)
 */

import { createBlueNoiseWebGL2, type BlueNoiseTexture } from '../../engine/utils/createBlueNoiseWebGL2';
import { VERT_QUAD, BLIT_MODE_BODY, RESERVED_UNIFORMS, wrapModeFragment } from './ditherTail';
import { renderFieldDithered } from '../../palette/core/rampGeometry';
import type { RGB } from '../../palette/core/oklab';
import type { FullscreenMode, FullscreenModeContext, GeometryField } from './modeRegistry';

interface CompiledProgram {
  prog: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null>;
}

/** Reserved id for the built-in blit program in the program cache. */
const BLIT_ID = '__blit__';

export class FullscreenCompositor {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private quadVbo: WebGLBuffer | null = null;
  private srcTex: WebGLTexture | null = null;
  private lutTex: WebGLTexture | null = null;
  private blueNoise: BlueNoiseTexture | null = null;
  private programs = new Map<string, CompiledProgram>();
  /** Dither on by default; the overlay can toggle (e.g. an A/B "show banding" check). */
  dither = true;

  /** @param onReady fired once the blue-noise tile finishes loading, so the host repaints
   *   (until then the dither samples a neutral tile → no dither, which is harmless). */
  constructor(canvas: HTMLCanvasElement, onReady?: () => void) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true, // so canvas.toBlob reads the dithered last frame
    });
    if (!gl) {
      this.ctx2d = canvas.getContext('2d');
      return;
    }
    this.gl = gl;

    this.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.srcTex = this.makeTex(gl.NEAREST);
    this.lutTex = this.makeTex(gl.LINEAR); // for glQuad modes that sample uLut
    // Independent-channel RGBA blue-noise (Christoph Peters free set) — the dither tail sums
    // two independent channels for a true TPDF; a grayscale tile would degrade to uniform-PDF.
    this.blueNoise = createBlueNoiseWebGL2(gl, '/blueNoiseRGBA.png', () => onReady?.());
    // Point-sample the tile so the static dither stays crisp (the loader defaults to LINEAR).
    gl.bindTexture(gl.TEXTURE_2D, this.blueNoise.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  /** True when the GL path is live (dither + glQuad available). */
  get isWebGL(): boolean { return this.gl !== null; }

  private makeTex(filter: number): WebGLTexture {
    const gl = this.gl!;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /** Resize the backing store. Returns true when it changed (host can avoid redundant work). */
  setSize(w: number, h: number): boolean {
    if (this.canvas.width === w && this.canvas.height === h) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    return true;
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl!;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh) || '';
      gl.deleteShader(sh);
      throw new Error(`[FullscreenCompositor] shader compile error: ${log}`);
    }
    return sh;
  }

  /** Compile + cache a program from a wrapped fragment shader, resolving the reserved
   *  preamble uniforms plus any extra `names` the mode declares. */
  private buildProgram(id: string, fragSrc: string, names: readonly string[]): CompiledProgram {
    const gl = this.gl!;
    const vs = this.compileShader(gl.VERTEX_SHADER, VERT_QUAD);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`[FullscreenCompositor] program link error: ${log}`);
    }
    const loc: Record<string, WebGLUniformLocation | null> = {};
    for (const n of [...RESERVED_UNIFORMS, ...names]) loc[n] = gl.getUniformLocation(prog, n);
    const compiled = { prog, loc };
    this.programs.set(id, compiled);
    return compiled;
  }

  private getProgram(mode: FullscreenMode): CompiledProgram {
    const cached = this.programs.get(mode.id);
    if (cached) return cached;
    return this.buildProgram(
      mode.id,
      wrapModeFragment(mode.fragBody ?? BLIT_MODE_BODY, mode.fragUniforms ?? ''),
      mode.uniformNames ?? [],
    );
  }

  private blitProgram(): CompiledProgram {
    return this.programs.get(BLIT_ID) ?? this.buildProgram(BLIT_ID, wrapModeFragment(BLIT_MODE_BODY), []);
  }

  /** Upload the active gradient LUT (256×4 RGBA8) for glQuad modes' `uLut`. */
  uploadLut(rgba1024: Uint8Array): void {
    const gl = this.gl;
    if (!gl || !this.lutTex) return;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba1024);
  }

  /** Bind the quad, the reserved preamble uniforms (resolution, blue-noise, dither, LUT),
   *  and issue the draw. `dither` overrides the GL tail per-call (the field path pre-dithers on
   *  the CPU via error diffusion, so it presents with the GL tail OFF). */
  private drawQuad(p: CompiledProgram, dither: boolean): void {
    const gl = this.gl!;
    gl.useProgram(p.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(p.loc['uResolution'], this.canvas.width, this.canvas.height);
    gl.uniform1i(p.loc['uDither'], dither ? 1 : 0);
    // Blue-noise tile on unit 2.
    if (this.blueNoise) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.blueNoise.texture);
      gl.uniform1i(p.loc['uBlueNoise'], 2);
      const [bw, bh] = this.blueNoise.getResolution();
      gl.uniform2f(p.loc['uBlueNoiseRes'], bw, bh);
    }
    // LUT on unit 1 (glQuad modes sample it; blit ignores it).
    if (this.lutTex) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
      gl.uniform1i(p.loc['uLut'], 1);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /** Blit a pre-computed RGBA buffer (w×h, matching the backing store) to the canvas. `dither`
   *  applies the GL tail; pass false for buffers already dithered on the CPU. Falls back to
   *  Canvas-2D `putImageData` (no dither) when WebGL2 is unavailable. */
  private blit(buf: Uint8ClampedArray, w: number, h: number, dither: boolean): void {
    const gl = this.gl;
    if (!gl || !this.srcTex) {
      if (this.ctx2d) {
        const img = this.ctx2d.createImageData(w, h);
        img.data.set(buf);
        this.ctx2d.putImageData(img, 0, 0);
      }
      return;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const p = this.blitProgram();
    gl.useProgram(p.prog);
    gl.uniform1i(p.loc['uSrc'], 0);
    this.drawQuad(p, dither);
  }

  /** Present a cpuRaster RGBA buffer through the blue-noise GL tail (the buffer is raw pixels). */
  presentRaster(buf: Uint8ClampedArray, w: number, h: number): void {
    this.blit(buf, w, h, this.dither);
  }

  /** Present a cpuField mode: LINEAR-sample the ramp at the float position on the CPU and apply
   *  serpentine Floyd–Steinberg ERROR DIFFUSION (when dither is on) — the smoothest still-image
   *  result (column-average tracks the gradient exactly; far less banding than a per-pixel noise
   *  tail, and self-limiting on flats). Then blit with the GL tail OFF (already dithered). */
  presentField(field: GeometryField, w: number, h: number, bg: RGB, ramp: RGB[]): void {
    const rgba = renderFieldDithered({ width: w, height: h, pos: field.pos, cov: field.cov }, ramp, this.dither, bg);
    this.blit(rgba, w, h, false);
  }

  /** Present a glQuad mode: render its wrapped fragment shader (sampling `uLut`) through the
   *  blue-noise dither tail. No-op (blank) under the 2D fallback. */
  presentMode(mode: FullscreenMode, ctx: FullscreenModeContext): void {
    const gl = this.gl;
    if (!gl) return;
    const p = this.getProgram(mode);
    gl.useProgram(p.prog);
    mode.setUniforms?.(gl, (name) => p.loc[name] ?? null, ctx);
    this.drawQuad(p, this.dither);
  }

  dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    for (const { prog } of this.programs.values()) gl.deleteProgram(prog);
    this.programs.clear();
    if (this.quadVbo) gl.deleteBuffer(this.quadVbo);
    if (this.srcTex) gl.deleteTexture(this.srcTex);
    if (this.lutTex) gl.deleteTexture(this.lutTex);
    if (this.blueNoise) gl.deleteTexture(this.blueNoise.texture);
    // Free the context promptly — open/close cycles otherwise exhaust the ~16-context cap.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
  }
}
