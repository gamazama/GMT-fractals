/**
 * @engine/utils/glHelpers — the shared leaf WebGL2 scaffolding the fullscreen GL surfaces all
 * grew their own copy of: shader compile / program link, the point-sampled dither blue-noise
 * tile, and webglcontextlost/restored recovery wiring.
 *
 * Extracted from the four near-identical copies in `FullscreenCompositor`, `LiquifyRenderer`,
 * `FractalColorRenderer`, and `ParallaxRenderer` (one source, no fork). Pure leaf — no React /
 * store / THREE; takes a raw `WebGL2RenderingContext` and a canvas, nothing else.
 *
 * @see engine/utils/createBlueNoiseWebGL2 (the underlying tile loader `createDitherNoise` wraps)
 */

import { createBlueNoiseWebGL2, type BlueNoiseTexture } from './createBlueNoiseWebGL2';

/** Compile a GLSL shader or throw with a labelled message (deletes the shader object on failure
 *  so a failed compile leaks nothing). `label` only colours the error string — it never affects
 *  a successful compile. */
export const compileShader = (
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  label = 'gl',
): WebGLShader => {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || '';
    gl.deleteShader(sh);
    throw new Error(`[${label}] shader compile error: ${log}`);
  }
  return sh;
};

export interface LinkOptions {
  /** Attribute locations to bind BEFORE linking (e.g. `{ aPos: 0 }`). Modes whose vertex
   *  shaders declare `layout(location=…)` omit this. */
  attribs?: Record<string, number>;
  /** Uniform names to resolve into the returned `uniforms` map (unresolved → null). */
  uniforms?: readonly string[];
  /** Prefix for compile/link error messages. */
  label?: string;
}

export interface LinkedProgram {
  prog: WebGLProgram;
  /** Resolved locations for the requested `uniforms` (empty when none requested). */
  uniforms: Record<string, WebGLUniformLocation | null>;
}

/** Compile a vertex+fragment pair, (optionally) bind attribute locations, link, resolve the
 *  requested uniforms, and free the shader objects. Throws on compile/link failure (deleting the
 *  program on a link error). The resulting program is identical to the hand-rolled per-renderer
 *  versions — only the error path differs. */
export const linkProgram = (
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string,
  opts: LinkOptions = {},
): LinkedProgram => {
  const label = opts.label ?? 'gl';
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc, label);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc, label);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  if (opts.attribs) {
    for (const name in opts.attribs) gl.bindAttribLocation(prog, opts.attribs[name], name);
  }
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`[${label}] program link error: ${log}`);
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  if (opts.uniforms) {
    for (const n of opts.uniforms) uniforms[n] = gl.getUniformLocation(prog, n);
  }
  return { prog, uniforms };
};

/** Create the dither blue-noise tile and point-sample it (NEAREST) so the static dither stays
 *  crisp. The fullscreen dither tail sums independent RGBA channels for a true TPDF, so the
 *  RGBA tile (`/blueNoiseRGBA.png`) is the one to use here — a grayscale tile would degrade to a
 *  uniform PDF. `onLoad` fires once the async tile lands (until then a neutral 1×1 fallback is
 *  bound → no dither, harmless). */
export const createDitherNoise = (
  gl: WebGL2RenderingContext,
  onLoad?: () => void,
): BlueNoiseTexture => {
  const bn = createBlueNoiseWebGL2(gl, '/blueNoiseRGBA.png', onLoad);
  gl.bindTexture(gl.TEXTURE_2D, bn.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return bn;
};

/** Wire WebGL context-loss recovery on a canvas. A GPU/driver context loss invalidates every GL
 *  object; without this the canvas stays black until the surface is torn down. `onLost` MUST call
 *  `e.preventDefault()` for the browser to ever fire `restored` — this helper does it for you, then
 *  invokes the callbacks so the owner can pause drawing (`onLost`) and rebuild its GL state
 *  (`onRestored`, on the SAME, now-healthy context — do NOT re-acquire it). Returns a disposer that
 *  removes both listeners. */
export const wireContextLoss = (
  canvas: HTMLCanvasElement,
  handlers: { onLost?: () => void; onRestored: () => void },
): (() => void) => {
  const onLost = (e: Event): void => {
    e.preventDefault();
    handlers.onLost?.();
  };
  const onRestored = (): void => {
    handlers.onRestored();
  };
  canvas.addEventListener('webglcontextlost', onLost as EventListener, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);
  return () => {
    canvas.removeEventListener('webglcontextlost', onLost as EventListener, false);
    canvas.removeEventListener('webglcontextrestored', onRestored, false);
  };
};
