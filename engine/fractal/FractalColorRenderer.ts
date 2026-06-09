/**
 * FractalColorRenderer — a host-agnostic, shallow-precision Mandelbrot/Julia
 * renderer that colours the fractal through a 256×1 RGBA8 colormap LUT.
 *
 * Carved out of fluid-toy's monolithic `FluidEngine` (the fractal + gradient
 * passes only — the fluid sim, dye, velocity, bloom, deep-zoom worker stack
 * all stay in fluid-toy). It shares the EXACT fractal kernel (FRAG_JULIA),
 * gradient sampler, TSAA blend, and `GradientLutManager` with FluidEngine —
 * one source, no fork — so "see your gradient colour a live Mandelbrot" uses
 * the same maths fluid-toy ships.
 *
 * SCOPE — shallow float32 only:
 *  - The deep-zoom path inside the kernel (`uDeepZoomEnabled`) is left OFF and
 *    its uniforms bound to inert defaults; the perturbation/LA/AT worker stack
 *    is NOT carried here. Zoom is clamped to {@link MANDEL_MIN_ZOOM} so the f32
 *    path never visibly quantises (10× above fluid-toy's proven shallow floor).
 *  - One MRT + TSAA accumulator (no sim ping-pong), one trivial display blit.
 *
 * API:  init via `new FractalColorRenderer(canvas)`, then
 *   `setRenderSize(w,h)` · `setColormap(rgba1024)` · `setParams(p)` ·
 *   `pan(dxPx,dyPx)` · `zoomAt(px,py,factor)` · `render()` · `dispose()`.
 *
 * The host owns the RAF loop (TSAA accumulates across frames; a fractal-
 * affecting change resets the accumulator via an internal param hash).
 *
 * @invariant Host-agnostic: no React / store / DDFS / fluid imports here.
 * @see engine/fractal/shaders/fractalKernel.ts (the shared kernel)
 * @see fluid-toy/fluid/FluidEngine.ts (the other consumer of the kernel)
 */

import { VERT_FULLSCREEN } from './shaders/gradientSample';
import { FRAG_JULIA } from './shaders/fractalKernel';
import { FRAG_TSAA_BLEND } from './shaders/tsaaBlend';
import { FRAG_FRACTAL_DISPLAY } from './shaders/fractalDisplay';
import { GradientLutManager } from './GradientLutManager';
import { DeepZoomController } from './DeepZoomController';
import { getDeepZoomRuntime } from './deepZoom/laRuntime';
import { ddAddF64 } from './deepZoom/dd';
import { createBlueNoiseWebGL2, type BlueNoiseTexture } from '../utils/createBlueNoiseWebGL2';

export type FractalKind = 'mandelbrot' | 'julia';

/** Deepest zoom (smallest world-units-per-half-height) before the float32
 *  iteration visibly quantises. 1e-4 is 10× above fluid-toy's proven shallow
 *  floor (MIN_ZOOM = 1e-5), so even weaker ANGLE/D3D11 GPUs stay clean. */
export const MANDEL_MIN_ZOOM = 1e-4;
/** Deepest zoom when deep-zoom is ON (perturbation + LA + AT + double-double
 *  pan handle precision past the f32 floor). 1e-100 is astronomically deep and
 *  well within the DD-pan / reference-orbit budget. */
export const MANDEL_DEEP_MIN_ZOOM = 1e-100;
/** Most zoomed-OUT (largest world span). */
export const MANDEL_MAX_ZOOM = 4;
/** Hard ceiling on the reference-orbit build length (= the per-pixel iteration
 *  cap). Bounds the worker build cost + orbit/LA texture memory when the user
 *  cranks iterMul at depth. 200k texels ≈ 3.2 MB RGBA32F. */
export const MANDEL_MAX_DEEP_ITER = 200_000;

/** The live + static parameters of a fractal-colouring view. All optional on
 *  {@link FractalColorRenderer.setParams}. */
export interface FractalColorParams {
  kind: FractalKind;
  /** Julia constant (ignored for Mandelbrot kind). */
  juliaC: [number, number];
  /** View centre in fractal coordinates (the hi word of a double-double). */
  center: [number, number];
  /** Sub-f64 residual paired with `center` (the lo word). Accumulated by the
   *  DD pan so deltas below f64's ulp survive at deep zoom; 0 in shallow use. */
  centerLow: [number, number];
  /** World-units per half-height (smaller = deeper zoom). */
  zoom: number;
  /** When true, render via the perturbation + LA + AT reference-orbit path
   *  (Mandelbrot power-2). Costs nothing when the orbit isn't built yet — the
   *  kernel falls back to f32 until {@link FractalColorRenderer.rebuildDeepZoom}
   *  uploads an orbit. */
  deepZoomEnabled: boolean;
  /** Use the Linear-Approximation merge tree (deep-zoom acceleration). */
  useLA: boolean;
  /** Auto-epsilon: calibrate the LA validity threshold per build (vs the fixed
   *  2^-24). A safety net against subtle LA inaccuracy, but it can over-tighten
   *  (finer LA table → slower frames) with no visible gain where reference
   *  quality already handles the view. Toggle off to A/B the render cost. */
  calibrateLA: boolean;
  /** Use Approximation-Terms front-loading (deep-zoom acceleration). */
  useAT: boolean;
  /** Use a minibrot-nucleus (periodic) reference when the view dives into an
   *  island: a short one-period orbit wrapped modulo its period — exact and
   *  cheap (ADR-0066). Off forces the non-periodic relocation/long-orbit
   *  fallback (the ADR-0065 path) for A/B. Default true. */
  useNucleus: boolean;
  /** Iteration ceiling. When `autoIter` is true this is computed from zoom. */
  maxIter: number;
  /** Auto-scale `maxIter` with zoom depth (more iterations as you dive). */
  autoIter: boolean;
  /** User multiplier on the per-pixel iteration cap (both paths). 1 = the auto
   *  value; raise it to resolve deeper interior detail (minibrots) at the cost
   *  of speed. The deep path lets uMaxIter exceed the orbit length (rebasing). */
  iterMul: number;
  escapeR: number;
  power: number;
  /** What fractal quantity drives the colormap lookup (kernel `uColorMapping`,
   *  0..13). The mandated live "mapping-mode" knob. */
  colorMapping: number;
  /** How many times the colormap tiles across the mapped axis (live knob). */
  gradientRepeat: number;
  /** Phase offset of the colormap along the mapped axis, 0..1 wraps (live knob). */
  gradientPhase: number;
  /** Colour for points inside the set. */
  interiorColor: [number, number, number];
  // Orbit-trap / stripe params — used only by the matching colorMapping modes.
  trapCenter: [number, number];
  trapRadius: number;
  trapNormal: [number, number];
  trapOffset: number;
  stripeFreq: number;
}

const DEFAULTS: FractalColorParams = {
  kind: 'mandelbrot',
  juliaC: [-0.8, 0.156],
  center: [-0.5, 0],
  centerLow: [0, 0],
  zoom: 1.4,
  deepZoomEnabled: false,
  useLA: true,
  calibrateLA: true,
  useAT: true,
  useNucleus: true,
  maxIter: 300,
  autoIter: true,
  iterMul: 1,
  escapeR: 32,
  power: 2,
  colorMapping: 0,
  gradientRepeat: 1,
  gradientPhase: 0,
  interiorColor: [0.02, 0.02, 0.04],
  trapCenter: [0, 0],
  trapRadius: 1,
  trapNormal: [1, 0],
  trapOffset: 0,
  stripeFreq: 4,
};

// colorMapping modes that need the per-iter trap/stripe accumulator (aux.r/g/a)
// or the dz/dc derivative tracker (aux.b). Mirrors FluidEngine's predicates so
// any mapping mode renders correctly here too.
const NEEDS_ACCUM = new Set([5, 6, 7, 8, 9, 13]);
const NEEDS_DERIV = new Set([10, 11]);
const trapShape = (m: number): number =>
  m === 6 ? 1 : m === 7 ? 2 : m === 8 ? 3 : 0;

// TSAA: deterministic 4×4 grid jitter, converge at 128. ONE sub-sample/frame —
// the convergence happens progressively across frames (not bursting K samples
// into one frame), so per-frame cost is minimal and interaction stays smooth.
// (Matches fluid-toy's interactive default; the full 16-cell grid still cycles.)
const TSAA_CAP = 128;
const TSAA_PER_FRAME = 1;
const TSAA_GRID = 16;
const TSAA_JITTER_AMOUNT = 1.0;

/** Cap the render buffer's long edge; CSS stretches to fill. Mandelbrot at high
 *  iteration is fragment-heavy, and TSAA refines the downscaled buffer. */
const MAX_RENDER_DIM = 1600;

interface Program {
  prog: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

interface MrtFbo {
  texMain: WebGLTexture;
  texFx: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
}

const JULIA_UNIFORMS = [
  'uTexel', 'uKind', 'uJuliaC', 'uCenter', 'uScale', 'uAspect', 'uMaxIter', 'uEscapeR2', 'uPower',
  'uColorIter', 'uTrapMode', 'uTrapCenter', 'uTrapRadius', 'uTrapNormal', 'uTrapOffset', 'uStripeFreq',
  'uJitterScale', 'uResolution', 'uBlueNoiseTexture', 'uBlueNoiseResolution', 'uFrameCount',
  'uPerFrameSamples', 'uJitterMode', 'uGridSize', 'uTsaaSampleIndex',
  'uImageTileOrigin', 'uImageTileSize', 'uRegionMin', 'uRegionMax',
  'uDeepZoomEnabled', 'uRefOrbit', 'uRefOrbitTexW', 'uRefOrbitLen', 'uRefPeriod', 'uDeepCenterOffset', 'uDeepScale',
  'uLATable', 'uLATexW', 'uLATotalCount', 'uLAEnabled', 'uLAStages[0]', 'uLAStageCount',
  'uATEnabled', 'uATStepLength', 'uATThresholdC', 'uATSqrEscapeRadius',
  'uATRefC', 'uATCCoeff', 'uATInvZCoeff',
  'uTrackAccum', 'uTrackDeriv',
  'uGradient', 'uColorMapping', 'uGradientRepeat', 'uGradientPhase', 'uInteriorColor',
  'uCollisionGradient', 'uCollisionRepeat', 'uCollisionPhase', 'uCollisionEnabled',
];

export class FractalColorRenderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private quadVbo: WebGLBuffer;

  private progJulia!: Program;
  private progTsaa!: Program;
  private progDisplay!: Program;

  private fmt!: { internal: number; format: number; type: number };
  private juliaCur!: MrtFbo;
  private juliaTsaa!: MrtFbo;
  private juliaTsaaPrev!: MrtFbo;

  private gradients: GradientLutManager;
  private blueNoise: BlueNoiseTexture | null = null;
  /** Owns the deep-zoom GPU state (reference orbit / LA table / AT payload).
   *  Binds inert OFF defaults until an orbit is uploaded, so the shallow path
   *  is unaffected. Shared with fluid-toy via engine/fractal/DeepZoomController. */
  private deepZoom: DeepZoomController;
  /** Bumped on every orbit-build request so a stale async result (the user
   *  panned/zoomed again before the worker returned) is discarded. */
  private buildSeq = 0;
  /** Stats from the most recent orbit build — for diagnostics/perf checks. */
  lastDeepStats: { orbitLen: number; laCount: number; laEnabled: boolean; atEnabled: boolean; gpuMaxIter: number; relocated: boolean; laUnsafe: boolean; period: number; laEpsilonLog2?: number; buildMs?: number; laBuildMs?: number } | null = null;
  /** GPU per-pixel iteration cap for the deep path = the ACTUAL reference-orbit
   *  length. The orbit escapes early on exterior-heavy views (→ cheap), and only
   *  runs to the full requested depth on interior-heavy ones (→ where the cost is
   *  warranted). Driving uMaxIter past the orbit length just wastes iterations
   *  rebasing a reference that no longer exists. */
  private deepGpuIter = 2000;

  /** Apply the shared adaptive-dither tail in the display pass (banding fix). On by default;
   *  the host toggles it in lock-step with the other fullscreen modes. */
  private ditherEnabled = true;

  private simW = 0;
  private simH = 0;
  private frameCount = 0;
  private tsaaSampleIndex = 0;
  private tsaaParamHash = '';

  params: FractalColorParams = { ...DEFAULTS };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // preserveDrawingBuffer so the overlay's PNG export (canvas.toBlob) reads
    // the last rendered frame even if a compositor swap intervenes.
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 required — your browser does not support it.');
    this.gl = gl;

    const floatExt = gl.getExtension('EXT_color_buffer_float');
    const halfExt = gl.getExtension('EXT_color_buffer_half_float');
    if (!floatExt && !halfExt) {
      throw new Error('Float render targets unavailable (EXT_color_buffer_float / _half_float).');
    }
    this.fmt = this.detectFormat();

    this.gradients = new GradientLutManager(gl);
    this.deepZoom = new DeepZoomController(gl);

    this.quadVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.compile();
    this.allocate(64, 64);
    this.blueNoise = createBlueNoiseWebGL2(gl);
    // Allocate both LUT slots up front so the lazy `ensure()` in the first
    // renderJulia doesn't bump `gradients.version` AFTER that frame's
    // updateHash() already sampled it — which would spuriously reset the TSAA
    // accumulator one frame in. The host overrides 'main' via setColormap.
    this.gradients.ensure('main');
    this.gradients.ensure('collision');
  }

  // ── Setup ──────────────────────────────────────────────────────────────
  // NOTE: detectFormat / compileShader / link / createMrt / drawQuad / bindTex
  // below are near-identical to FluidEngine's private GL plumbing. The dup is
  // intentional for now — this renderer must stand alone (no fluid-app import),
  // and FluidEngine already hands the same hook-bundle to BloomChain. A shared
  // host-agnostic `engine/utils` WebGL2 helper (consumed by BOTH) is the clean
  // follow-up, deliberately deferred out of this carve to keep its blast radius
  // off FluidEngine (the no-regression-of-fluid-toy gate is the priority).

  private detectFormat() {
    const gl = this.gl;
    const candidates = [
      { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT },
      { internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT },
      { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE },
    ];
    for (const f of candidates) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, 4, 4, 0, f.format, f.type, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
      if (ok) return f;
    }
    throw new Error('No renderable float texture format supported.');
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh) || '';
      throw new Error(`Fractal shader compile error: ${log}`);
    }
    return sh;
  }

  private link(vsSrc: string, fsSrc: string, names: string[]): Program {
    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`Fractal program link error: ${gl.getProgramInfoLog(prog)}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const n of names) uniforms[n] = gl.getUniformLocation(prog, n);
    return { prog, uniforms };
  }

  private compile() {
    this.progJulia = this.link(VERT_FULLSCREEN, FRAG_JULIA, JULIA_UNIFORMS);
    this.progTsaa = this.link(VERT_FULLSCREEN, FRAG_TSAA_BLEND,
      ['uCurrentMain', 'uCurrentFx', 'uHistoryMain', 'uHistoryFx', 'uSampleIndex']);
    this.progDisplay = this.link(VERT_FULLSCREEN, FRAG_FRACTAL_DISPLAY,
      ['uImage', 'uBlueNoise', 'uBlueNoiseRes', 'uDither']);
  }

  private createMrt(w: number, h: number): MrtFbo {
    const gl = this.gl;
    const mkTex = (): WebGLTexture => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, this.fmt.internal, w, h, 0, this.fmt.format, this.fmt.type, null);
      return t;
    };
    const texMain = mkTex();
    const texFx = mkTex();
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texMain, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, texFx, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texMain, texFx, fbo, width: w, height: h };
  }

  private deleteMrt(m: MrtFbo | undefined) {
    if (!m) return;
    const gl = this.gl;
    gl.deleteTexture(m.texMain);
    gl.deleteTexture(m.texFx);
    gl.deleteFramebuffer(m.fbo);
  }

  private allocate(w: number, h: number) {
    this.simW = w;
    this.simH = h;
    this.juliaCur = this.createMrt(w, h);
    this.juliaTsaa = this.createMrt(w, h);
    this.juliaTsaaPrev = this.createMrt(w, h);
    this.tsaaSampleIndex = 0;
  }

  // ── Drawing primitives ─────────────────────────────────────────────────

  private useProgram(p: Program) {
    const gl = this.gl;
    gl.useProgram(p.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  private drawQuad() {
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  private bindTex(unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (loc) gl.uniform1i(loc, unit);
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /** Upload the colormap LUT (256×1 RGBA8, 1024 bytes) — the GX ramp seam
   *  (`renderStopsToBuffer`) output goes straight in. Resets TSAA via the hash. */
  setColormap(rgba1024: Uint8Array): void {
    this.gradients.setBuffer('main', rgba1024);
  }

  /** Toggle the display-pass dither tail. Cheap (a display re-render reflects it). */
  setDither(on: boolean): void {
    this.ditherEnabled = on;
  }

  setParams(p: Partial<FractalColorParams>): void {
    this.params = { ...this.params, ...p };
    // A new absolute centre without an explicit lo word drops the stale DD
    // residual — otherwise the leftover lo from a prior deep pan would inject a
    // sub-ulp error into the reference-orbit centre offset.
    if (p.center !== undefined && p.centerLow === undefined) {
      this.params.centerLow = [0, 0];
    }
    if (p.zoom !== undefined) {
      this.params.zoom = Math.max(this.zoomFloor(), Math.min(MANDEL_MAX_ZOOM, this.params.zoom));
    }
  }

  /** Enable/disable the deep-zoom (perturbation) path. Enabling kicks off an
   *  async reference-orbit build (worker); the kernel keeps rendering the f32
   *  path until the orbit lands, then switches. Disabling clears the orbit. */
  setDeepZoomEnabled(on: boolean): void {
    if (on === this.params.deepZoomEnabled) return;
    this.params.deepZoomEnabled = on;
    if (on) {
      void this.rebuildDeepZoom();
    } else {
      this.buildSeq++; // cancel any in-flight build
      this.deepZoom.clearReferenceOrbit();
      this.deepZoom.clearLATable();
      this.deepZoom.setLAEnabled(false);
      this.deepZoom.clearAT();
      // Re-clamp zoom back under the shallow f32 floor — otherwise a view that
      // was dived past it stays quantised on the f32 path until the next manual
      // zoom re-clamps. (The clamp normally only fires on setParams({zoom}).)
      this.params.zoom = Math.max(MANDEL_MIN_ZOOM, Math.min(MANDEL_MAX_ZOOM, this.params.zoom));
    }
  }

  /** Build a fresh reference orbit (+ LA + AT) at the current view and upload it
   *  to the GPU. Async (off-thread worker). The host calls this when the camera
   *  settles (pan/zoom end) or deep-zoom is toggled on; rapid calls coalesce
   *  via `buildSeq` (a superseded result is discarded). No-op when deep is off. */
  async rebuildDeepZoom(): Promise<void> {
    if (!this.params.deepZoomEnabled) return;
    const seq = ++this.buildSeq;
    const p = this.params;
    // Snapshot the centre at request time — the user may pan/zoom while the
    // worker runs; the uploaded orbit is tagged with THIS centre so the kernel's
    // DD centre-offset stays correct.
    const builtCenter: [number, number] = [p.center[0], p.center[1]];
    const builtLow: [number, number] = [p.centerLow[0], p.centerLow[1]];
    const power = Math.max(2, Math.round(p.power));
    const isP2 = power === 2;
    const mandel = p.kind === 'mandelbrot';
    const aspect = this.simW / Math.max(1, this.simH);
    const screenSqrRadius = (aspect * aspect + 1) * p.zoom * p.zoom;
    try {
      const res = await getDeepZoomRuntime().computeReferenceOrbit({
        centerX: builtCenter[0], centerY: builtCenter[1],
        centerLowX: builtLow[0], centerLowY: builtLow[1],
        zoom: p.zoom,
        maxIter: this.deepBuildIter(),
        power,
        kind: p.kind,
        juliaCx: p.juliaC[0], juliaCy: p.juliaC[1],
        aspect,
        calibrateLA: p.calibrateLA,
        disableNucleus: !p.useNucleus,
        // LA / AT are Mandelbrot power-2 only (their Step rules are d=2-specific
        // and rebase assumes Z[0]=0). Higher powers / Julia fall back to PO.
        buildLA: p.useLA && isP2 && mandel,
        screenSqrRadius: p.useAT && isP2 && mandel ? screenSqrRadius : 0,
      });
      if (seq !== this.buildSeq) return; // superseded by a newer build
      const dz = this.deepZoom;
      // Per-pixel GPU iteration cap. For a PERIODIC (nucleus) reference the
      // orbit is only ONE period long but the kernel wraps it modulo the period
      // and stays valid for UNLIMITED iterations — so the cap is the full
      // zoom-depth budget (a deep minibrot view needs far more iters than the
      // short period to resolve its boundary; capping at the period would cut
      // every later-escaping pixel to interior — the iteration cliff). For a
      // NON-periodic reference the orbit length is the hard ceiling (iterating
      // past it only wastes cycles rebasing). @see docs/adr/0066
      this.deepGpuIter = res.period > 0
        ? this.deepBuildIter()
        : Math.max(200, res.length);
      // Use the reference centre the BUILDER chose — the auto-reference search
      // may have relocated it to a deeper (non-escaping) point than the view
      // centre. setReferenceOrbit must get the actual orbit centre so the
      // kernel's DD centre-offset stays aligned (the offset = view − ref).
      const refCenter: [number, number] = [res.refCenterX, res.refCenterY];
      const refLow: [number, number] = [res.refCenterLowX, res.refCenterLowY];
      dz.setReferenceOrbit(res.orbit, res.length, refCenter, refLow, res.period);
      if (res.laTable && res.laStages && res.laCount > 0) {
        dz.setLATable(res.laTable, res.laCount, res.laStages);
        dz.setLAEnabled(true);
      } else {
        dz.clearLATable();
        dz.setLAEnabled(false);
      }
      if (res.at) {
        dz.setAT({
          stepLength: res.at.stepLength,
          thresholdC: res.at.thresholdC,
          sqrEscapeRadius: res.at.sqrEscapeRadius,
          refC: [res.at.refCRe, res.at.refCIm],
          ccoeff: [res.at.ccoeffRe, res.at.ccoeffIm],
          invZCoeff: [res.at.invZCoeffRe, res.at.invZCoeffIm],
        });
      } else {
        dz.clearAT();
      }
      this.lastDeepStats = {
        orbitLen: res.length,
        laCount: res.laCount,
        laEnabled: !!(res.laTable && res.laStages && res.laCount > 0),
        atEnabled: !!res.at,
        gpuMaxIter: this.effectiveMaxIter(),
        relocated: res.relocated,
        laUnsafe: res.laUnsafe,
        period: res.period,
        laEpsilonLog2: res.laEpsilonLog2,
        buildMs: res.buildMs,
        laBuildMs: res.laBuildMs,
      };
      // The set* calls bump deepZoom.version → updateHash resets TSAA → the next
      // render switches to the deep path and re-accumulates.
    } catch (e) {
      if (seq === this.buildSeq) console.error('[fractal-deepzoom] orbit build failed:', e);
    }
  }

  getParams(): Readonly<FractalColorParams> {
    return this.params;
  }

  /** Set the render buffer + canvas dimensions (capped at MAX_RENDER_DIM). */
  setRenderSize(cssW: number, cssH: number): void {
    const scale = Math.min(1, MAX_RENDER_DIM / Math.max(cssW, cssH, 1));
    const w = Math.max(32, Math.round(cssW * scale));
    const h = Math.max(32, Math.round(cssH * scale));
    if (w === this.simW && h === this.simH && this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.deleteMrt(this.juliaCur);
    this.deleteMrt(this.juliaTsaa);
    this.deleteMrt(this.juliaTsaaPrev);
    this.allocate(w, h);
  }

  /** Map a canvas-relative pixel (origin top-left) to fractal coordinates. */
  canvasToFractal(xPx: number, yPx: number): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const u = (xPx - rect.left) / Math.max(1, rect.width);
    const v = 1 - (yPx - rect.top) / Math.max(1, rect.height);
    const aspect = this.canvas.width / this.canvas.height;
    const fx = (u * 2 - 1) * aspect * this.params.zoom + this.params.center[0];
    const fy = (v * 2 - 1) * this.params.zoom + this.params.center[1];
    return [fx, fy];
  }

  /** Pan by a screen-pixel delta (drag). Keeps world-space under the cursor.
   *  Accumulates into the double-double centre via Dekker two-sum so sub-f64
   *  pan deltas survive at deep zoom (identical math to fluid-toy's pan). */
  pan(dxPx: number, dyPx: number): void {
    const p = this.params;
    const worldPerPx = (2 * p.zoom) / Math.max(1, this.canvas.getBoundingClientRect().height);
    [p.center[0], p.centerLow[0]] = ddAddF64(p.center[0], p.centerLow[0], -dxPx * worldPerPx);
    [p.center[1], p.centerLow[1]] = ddAddF64(p.center[1], p.centerLow[1], dyPx * worldPerPx); // y-down → world y-up
  }

  /** Zoom by `factor` (>1 = zoom out, <1 = zoom in) about a cursor pixel,
   *  keeping the world point under the cursor fixed. The centre correction is
   *  DD-accumulated so the anchor stays put at depth.
   *
   *  The correction is computed in OFFSET space — `(u·2−1)·aspect·(zoomBefore −
   *  zoomAfter)` — NOT as the difference of two absolute fractal coords. The
   *  latter (the old `canvasToFractal(before) − canvasToFractal(after)`) adds the
   *  pixel offset to the centre (~0.7) and then subtracts two near-equal results:
   *  at deep zoom the offset (~1e-12) is far below the centre's f64 ulp, so the
   *  add-then-subtract cancels it to ~0 → zoom drifts toward the centre instead
   *  of the cursor. Working in offset space never touches the centre, so the
   *  anchor holds to the full f64 range of the zoom delta. */
  zoomAt(xPx: number, yPx: number, factor: number): void {
    const p = this.params;
    const rect = this.canvas.getBoundingClientRect();
    const u = (xPx - rect.left) / Math.max(1, rect.width);
    const v = 1 - (yPx - rect.top) / Math.max(1, rect.height);
    const aspect = this.canvas.width / this.canvas.height;
    const zoomBefore = p.zoom;
    p.zoom = Math.max(this.zoomFloor(), Math.min(MANDEL_MAX_ZOOM, p.zoom * factor));
    const dZoom = zoomBefore - p.zoom; // exact in f64 (the two zooms differ by ~10-20%)
    [p.center[0], p.centerLow[0]] = ddAddF64(p.center[0], p.centerLow[0], (u * 2 - 1) * aspect * dZoom);
    [p.center[1], p.centerLow[1]] = ddAddF64(p.center[1], p.centerLow[1], (v * 2 - 1) * dZoom);
  }

  /** Current TSAA accumulation depth (0 = just reset, == cap = converged). */
  getAccumulation(): number {
    return this.tsaaSampleIndex;
  }

  /** Zoom-depth iteration budget (base, before iterMul). Grows with depth so a
   *  deeper view has more orbit to iterate against. */
  private deepRefIter(): number {
    const depth = Math.log10(DEFAULTS.zoom / Math.max(this.params.zoom, MANDEL_DEEP_MIN_ZOOM));
    return Math.round(Math.min(20000, Math.max(2000, 1500 + 900 * Math.max(0, depth))));
  }

  /** Reference-orbit BUILD length = the zoom-depth budget scaled by the user's
   *  iterMul, capped. The orbit MUST be at least as long as the per-pixel cap:
   *  the kernel rebases to orbit[0] when the reference index runs off the end,
   *  which is only valid if the reference is periodic with period = orbitLen.
   *  Past a non-periodic end it produces garbage (the iterMul-10 "crazy
   *  artifacts"). So "more iterations" must mean a LONGER reference, not a short
   *  reference reused beyond its validity — we fold iterMul into the build length
   *  here rather than multiplying the GPU cap. @see docs/adr/0065 */
  private deepBuildIter(): number {
    const mul = Math.max(0.25, this.params.iterMul || 1);
    return Math.round(Math.min(MANDEL_MAX_DEEP_ITER, this.deepRefIter() * mul));
  }

  private effectiveMaxIter(): number {
    const p = this.params;
    const mul = Math.max(0.25, p.iterMul || 1);
    // Deep path: per-pixel cap = the ACTUAL orbit length. The orbit is now BUILT
    // to cover the full target (zoom depth × iterMul, see deepBuildIter) — it
    // escapes earlier on exterior views (→ cheaper, and the relocated deepest-
    // point reference outlasts every pixel) or runs to the target on interior
    // ones. We must NOT multiply by iterMul again here: that would push the cap
    // past the orbit end, forcing the kernel to rebase against a non-periodic
    // reference → the "crazy artifacts". iterMul lives in the build length now,
    // so a rebuild is required when it changes (the host wires that). Gating on
    // hasOrbit() avoids the f32 fallback running at huge iter counts during the
    // build window or on Julia/power>2 views — a GPU-stall cliff.
    if (p.deepZoomEnabled && this.deepZoom.hasOrbit()) {
      return Math.max(200, this.deepGpuIter);
    }
    if (!p.autoIter) return Math.max(4, Math.round((p.maxIter | 0) * mul));
    // More iterations as you dive so shallow views stay crisp, not blobby.
    const depth = Math.log10(DEFAULTS.zoom / Math.max(p.zoom, MANDEL_MIN_ZOOM));
    const base = Math.max(200, Math.min(2000, 200 + 220 * Math.max(0, depth)));
    return Math.round(base * mul);
  }

  private zoomFloor(): number {
    return this.params.deepZoomEnabled ? MANDEL_DEEP_MIN_ZOOM : MANDEL_MIN_ZOOM;
  }

  /** Render one frame: fractal pass → TSAA blend → display. The host calls
   *  this from a RAF loop; once converged it's a cheap re-display. */
  render(): void {
    const gl = this.gl;
    this.updateHash();
    this.frameCount++;

    const converged = this.tsaaSampleIndex >= TSAA_CAP;
    if (!converged) {
      this.renderJulia();
      this.runTsaaBlend();
    }
    this.displayToScreen();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private updateHash(): void {
    const p = this.params;
    const ic = p.interiorColor;
    const hash = `${p.kind}|${p.juliaC[0]},${p.juliaC[1]}|${p.center[0]},${p.center[1]}|`
      + `${p.centerLow[0]},${p.centerLow[1]}|${p.zoom}|`
      + `${p.power}|${this.effectiveMaxIter()}|${p.escapeR}|${p.colorMapping}|`
      + `${p.trapCenter[0]},${p.trapCenter[1]}|${p.trapRadius}|${p.trapNormal[0]},${p.trapNormal[1]}|`
      + `${p.trapOffset}|${p.stripeFreq}|gr:${p.gradientRepeat}|gp:${p.gradientPhase}|`
      + `ic:${ic[0]},${ic[1]},${ic[2]}|gV:${this.gradients.version}`
      + `|dz:${p.deepZoomEnabled ? 1 : 0}|dzV:${this.deepZoom.version}`;
    if (hash !== this.tsaaParamHash) {
      this.tsaaParamHash = hash;
      this.tsaaSampleIndex = 0;
    }
  }

  private renderJulia(): void {
    const gl = this.gl;
    const p = this.params;
    const u = this.progJulia.uniforms;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.juliaCur.fbo);
    gl.viewport(0, 0, this.simW, this.simH);
    this.useProgram(this.progJulia);

    gl.uniform2f(u['uTexel'], 1 / this.simW, 1 / this.simH);
    gl.uniform1i(u['uKind'], p.kind === 'julia' ? 0 : 1);
    gl.uniform2f(u['uJuliaC'], p.juliaC[0], p.juliaC[1]);
    gl.uniform2f(u['uCenter'], p.center[0], p.center[1]);
    gl.uniform1f(u['uScale'], p.zoom);
    gl.uniform1f(u['uAspect'], this.simW / this.simH);
    const maxIt = this.effectiveMaxIter();
    gl.uniform1i(u['uMaxIter'], maxIt);
    gl.uniform1i(u['uColorIter'], maxIt);
    gl.uniform1f(u['uEscapeR2'], p.escapeR * p.escapeR);
    gl.uniform1f(u['uPower'], p.power);

    const cm = p.colorMapping;
    gl.uniform1i(u['uTrapMode'], trapShape(cm));
    gl.uniform1i(u['uTrackAccum'], NEEDS_ACCUM.has(cm) ? 1 : 0);
    gl.uniform1i(u['uTrackDeriv'], NEEDS_DERIV.has(cm) ? 1 : 0);
    gl.uniform2f(u['uTrapCenter'], p.trapCenter[0], p.trapCenter[1]);
    gl.uniform1f(u['uTrapRadius'], p.trapRadius);
    gl.uniform2f(u['uTrapNormal'], p.trapNormal[0], p.trapNormal[1]);
    gl.uniform1f(u['uTrapOffset'], p.trapOffset);
    gl.uniform1f(u['uStripeFreq'], p.stripeFreq);

    // TSAA jitter scheduling.
    const jitterActive = this.tsaaSampleIndex < TSAA_CAP;
    gl.uniform1f(u['uJitterScale'], jitterActive ? TSAA_JITTER_AMOUNT : 0);
    gl.uniform2f(u['uResolution'], this.simW, this.simH);
    gl.uniform1i(u['uFrameCount'], this.frameCount);
    gl.uniform1i(u['uPerFrameSamples'], TSAA_PER_FRAME);
    gl.uniform1i(u['uJitterMode'], 1); // grid
    gl.uniform1i(u['uGridSize'], TSAA_GRID);
    gl.uniform1i(u['uTsaaSampleIndex'], this.tsaaSampleIndex);

    // Bucket-render uniforms — identity (no tiling, full region).
    gl.uniform2f(u['uImageTileOrigin'], 0, 0);
    gl.uniform2f(u['uImageTileSize'], 1, 1);
    gl.uniform2f(u['uRegionMin'], 0, 0);
    gl.uniform2f(u['uRegionMax'], 1, 1);

    if (this.blueNoise) {
      this.bindTex(5, this.blueNoise.texture, u['uBlueNoiseTexture']);
      const [bnw, bnh] = this.blueNoise.getResolution();
      gl.uniform2f(u['uBlueNoiseResolution'], bnw, bnh);
    }

    // Deep-zoom uniforms — the controller binds the active orbit/LA/AT, or inert
    // OFF defaults when no orbit is uploaded (shallow path). The kernel's deep
    // branch is `(uDeepZoomEnabled != 0) && (uRefOrbitLen > 1)`, so this is free
    // when off. blueNoise is the fallback texture for the orbit/LA samplers.
    this.deepZoom.bindUniforms(
      this.progJulia,
      { center: p.center, centerLow: p.centerLow, zoom: p.zoom, deepZoomEnabled: p.deepZoomEnabled },
      this.blueNoise?.texture ?? null,
    );

    // Colormap + mapping uniforms (the live phase/repeats/mapping knobs).
    this.gradients.ensure('main');
    this.gradients.ensure('collision');
    this.bindTex(8, this.gradients.getTexture('main')!, u['uGradient']);
    this.bindTex(9, this.gradients.getTexture('collision')!, u['uCollisionGradient']);
    gl.uniform1i(u['uColorMapping'], cm);
    gl.uniform1f(u['uGradientRepeat'], p.gradientRepeat);
    gl.uniform1f(u['uGradientPhase'], p.gradientPhase);
    gl.uniform3f(u['uInteriorColor'], p.interiorColor[0], p.interiorColor[1], p.interiorColor[2]);
    gl.uniform1i(u['uCollisionEnabled'], 0);
    gl.uniform1f(u['uCollisionRepeat'], 1);
    gl.uniform1f(u['uCollisionPhase'], 0);

    this.drawQuad();
  }

  private runTsaaBlend(): void {
    const gl = this.gl;
    this.tsaaSampleIndex = Math.min(this.tsaaSampleIndex + 1, TSAA_CAP);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.juliaTsaaPrev.fbo);
    gl.viewport(0, 0, this.simW, this.simH);
    this.useProgram(this.progTsaa);
    this.bindTex(0, this.juliaCur.texMain, this.progTsaa.uniforms['uCurrentMain']);
    this.bindTex(1, this.juliaCur.texFx, this.progTsaa.uniforms['uCurrentFx']);
    this.bindTex(2, this.juliaTsaa.texMain, this.progTsaa.uniforms['uHistoryMain']);
    this.bindTex(3, this.juliaTsaa.texFx, this.progTsaa.uniforms['uHistoryFx']);
    gl.uniform1i(this.progTsaa.uniforms['uSampleIndex'], this.tsaaSampleIndex);
    this.drawQuad();

    const t = this.juliaTsaa;
    this.juliaTsaa = this.juliaTsaaPrev;
    this.juliaTsaaPrev = t;
  }

  private displayToScreen(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.useProgram(this.progDisplay);
    this.bindTex(0, this.juliaTsaa.texFx, this.progDisplay.uniforms['uImage']);
    // Shared adaptive dither — static tile, so it doesn't shimmer over TSAA accumulation.
    if (this.blueNoise) {
      this.bindTex(1, this.blueNoise.texture, this.progDisplay.uniforms['uBlueNoise']);
      const [bw, bh] = this.blueNoise.getResolution();
      gl.uniform2f(this.progDisplay.uniforms['uBlueNoiseRes'], bw, bh);
    }
    gl.uniform1i(this.progDisplay.uniforms['uDither'], this.ditherEnabled ? 1 : 0);
    this.drawQuad();
  }

  dispose(): void {
    const gl = this.gl;
    this.buildSeq++; // drop any in-flight orbit build result
    this.deleteMrt(this.juliaCur);
    this.deleteMrt(this.juliaTsaa);
    this.deleteMrt(this.juliaTsaaPrev);
    this.gradients.dispose();
    this.deepZoom.dispose();
    gl.deleteBuffer(this.quadVbo);
    for (const p of [this.progJulia, this.progTsaa, this.progDisplay]) {
      if (p?.prog) gl.deleteProgram(p.prog);
    }
    if (this.blueNoise) { gl.deleteTexture(this.blueNoise.texture); this.blueNoise = null; }
    // Explicitly free the GL context so repeated open/close cycles don't leak
    // contexts until GC (browsers hard-cap live WebGL contexts at ~16; relying
    // on GC exhausts the budget and getContext() then returns null → the
    // renderer can't start). Safe here because the host gives the fractal canvas
    // a distinct React key, so the canvas DOM node is NEVER reused across a
    // dispose→recreate — losing this context can't brick a future renderer.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
