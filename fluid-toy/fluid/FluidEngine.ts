import {
  VERT_FULLSCREEN,
  FRAG_JULIA,
  FRAG_MOTION,
  FRAG_ADDFORCE,
  FRAG_INJECT_DYE,
  FRAG_ADVECT,
  FRAG_DIVERGENCE,
  FRAG_CURL,
  FRAG_VORTICITY,
  FRAG_PRESSURE,
  FRAG_GRADSUB,
  FRAG_SPLAT,
  FRAG_DISPLAY,
  FRAG_CLEAR,
  FRAG_REPROJECT,
  FRAG_BLOOM_EXTRACT,
  FRAG_BLOOM_DOWN,
  FRAG_BLOOM_UP,
  FRAG_MASK,
} from './shaders';
import { BLOOM_SOFT_KNEE, GRADIENT_LUT_WIDTH, SPLAT_RADIUS_UV } from '../constants';

export type ForceMode = 'gradient' | 'curl' | 'iterate' | 'c-track' | 'hue';
export type ShowMode = 'composite' | 'julia' | 'dye' | 'velocity';
export type FractalKind = 'julia' | 'mandelbrot';

/** How new dye blends into the existing dye field each frame. */
export type DyeBlend = 'add' | 'screen' | 'max' | 'over';

/** Colour space used when dye decays each frame — controls whether fading dye stays vivid or goes grey. */
export type DyeDecayMode = 'linear' | 'perceptual' | 'vivid';

export const DYE_DECAY_MODES: Array<{ id: DyeDecayMode; label: string; hint: string }> = [
  { id: 'linear',     label: 'Linear',     hint: 'Classic RGB multiply. Fades to black but mixing goes through muddy greys.' },
  { id: 'perceptual', label: 'Perceptual', hint: 'OKLab: decay only the L-channel. Hue + chroma preserved — dye fades hue-stable to black.' },
  { id: 'vivid',      label: 'Vivid',      hint: 'OKLab with chroma boost as lightness drops. Dye stays punchy all the way to near-black.' },
];

export function dyeDecayModeToIndex(m: DyeDecayMode): number {
  switch (m) {
    case 'linear': return 0;
    case 'perceptual': return 1;
    case 'vivid': return 2;
  }
}

/** How the final colour gets compressed before display. */
export type ToneMapping = 'none' | 'reinhard' | 'agx' | 'filmic';

export const TONE_MAPPINGS: Array<{ id: ToneMapping; label: string; hint: string }> = [
  { id: 'none',     label: 'None',     hint: 'No compression. Vivid colours, will clip if exposure is too high.' },
  { id: 'reinhard', label: 'Reinhard', hint: 'Classic c/(1+c). Smooth but desaturates highlights.' },
  { id: 'agx',      label: 'AgX',      hint: 'Sobotka 2023. Hue-stable, vibrant highlights — best for rich colours.' },
  { id: 'filmic',   label: 'Filmic',   hint: 'Hable/Uncharted filmic. Cinematic contrast with gentle roll-off.' },
];

export function toneMappingToIndex(m: ToneMapping): number {
  switch (m) {
    case 'none': return 0;
    case 'reinhard': return 1;
    case 'agx': return 2;
    case 'filmic': return 3;
  }
}

/** Visual style families — each pre-populates a handful of post-process knobs. */
export type FluidStyle = 'plain' | 'electric' | 'liquid';

export const FLUID_STYLES: Array<{ id: FluidStyle; label: string; hint: string }> = [
  { id: 'plain',    label: 'Plain',    hint: 'No post-processing — pure fluid+fractal composite.' },
  { id: 'electric', label: 'Electric', hint: 'Bloom + velocity-keyed chromatic aberration — plasma and lightning energy.' },
  { id: 'liquid',   label: 'Liquid',   hint: 'Dye-gradient refraction + laplacian caustics — water over glass.' },
];

export const DYE_BLENDS: Array<{ id: DyeBlend; label: string; hint: string }> = [
  { id: 'add',    label: 'Add',    hint: 'Linear accumulate — bright strokes build up, classic fluid look.' },
  { id: 'screen', label: 'Screen', hint: '1−(1−d)(1−i) — overlapping dye glows brighter, never clips to full white.' },
  { id: 'max',    label: 'Max',    hint: 'Per-channel max — keeps the brightest layer, leaves darker alone.' },
  { id: 'over',   label: 'Over',   hint: 'Alpha compositing — uses the gradient\'s α to fade / mask dye onto existing.' },
];

export function dyeBlendToIndex(b: DyeBlend): number {
  switch (b) {
    case 'add': return 0;
    case 'screen': return 1;
    case 'max': return 2;
    case 'over': return 3;
  }
}

/** What quantity from the fractal drives gradient lookup. */
export type ColorMapping =
  | 'iterations'      // smooth iter count (classic)
  | 'angle'           // arg(z_final)
  | 'magnitude'       // |z_final|
  | 'decomposition'  // sign(imag(z_final))
  | 'bands'           // floor(smoothI) — hard banding
  | 'orbit-point'     // orbit trap vs a point
  | 'orbit-circle'    // orbit trap vs a circle
  | 'orbit-cross'     // orbit trap vs the cross (axes)
  | 'orbit-line'      // orbit trap vs a line
  | 'stripe'          // stripe average (Härkönen)
  | 'distance'        // distance-estimate coloring (DE)
  | 'derivative'      // log|dz/dc|
  | 'potential'       // continuous potential / Böttcher approx
  | 'trap-iter';      // iteration at which minT occurred (trap iteration)

export const COLOR_MAPPINGS: Array<{ id: ColorMapping; label: string; hint: string }> = [
  { id: 'iterations',   label: 'Iterations',    hint: 'Smooth iteration count. Classic escape-time coloring.' },
  { id: 'angle',        label: 'Angle',         hint: 'arg(z_final). Gradient wraps around the set.' },
  { id: 'magnitude',    label: 'Magnitude',     hint: '|z_final|. Brighter at faster escape.' },
  { id: 'decomposition',label: 'Decomp',        hint: 'Binary by sign(imag z). Reveals the Julia domains.' },
  { id: 'bands',        label: 'Bands',         hint: 'Hard bands per integer iter — maximum banding.' },
  { id: 'orbit-point',  label: 'Trap·point',    hint: 'Orbit trap: min distance from the iteration to a point.' },
  { id: 'orbit-circle', label: 'Trap·circle',   hint: 'Orbit trap: min distance to a ring of given radius.' },
  { id: 'orbit-cross',  label: 'Trap·cross',    hint: 'Orbit trap: min approach to the X/Y axes.' },
  { id: 'orbit-line',   label: 'Trap·line',     hint: 'Orbit trap: min distance to an arbitrary line.' },
  { id: 'stripe',       label: 'Stripe',        hint: 'Härkönen stripe-average — ⟨½+½·sin(k·arg z)⟩.' },
  { id: 'distance',     label: 'DE',            hint: 'Distance-estimate to the set. Crisp boundary glow.' },
  { id: 'derivative',   label: 'Derivative',    hint: 'log|dz/dc| — how fast orbits stretch around c.' },
  { id: 'potential',    label: 'Potential',     hint: 'log²|z| / 2ⁿ — continuous Böttcher potential.' },
  { id: 'trap-iter',    label: 'Trap iter',     hint: 'Iteration at which the trap minimum was reached.' },
];

export function colorMappingToIndex(m: ColorMapping): number {
  switch (m) {
    case 'iterations': return 0;
    case 'angle': return 1;
    case 'magnitude': return 2;
    case 'decomposition': return 3;
    case 'bands': return 4;
    case 'orbit-point': return 5;
    case 'orbit-circle': return 6;
    case 'orbit-cross': return 7;
    case 'orbit-line': return 8;
    case 'stripe': return 9;
    case 'distance': return 10;
    case 'derivative': return 11;
    case 'potential': return 12;
    case 'trap-iter': return 13;
  }
}

/** Which orbit-trap shape the Julia shader should use (derived from colorMapping). */
export function colorMappingTrapShape(m: ColorMapping): number {
  switch (m) {
    case 'orbit-point':  return 0;
    case 'orbit-circle': return 1;
    case 'orbit-cross':  return 2;
    case 'orbit-line':   return 3;
    case 'trap-iter':    return 0;   // trap-iter uses whatever shape — default to point
    default:             return 0;   // doesn't matter; aux.r is just unused
  }
}

export interface FluidParams {
  juliaC: [number, number];
  center: [number, number];
  zoom: number;               // world-units per screen-height / 2
  maxIter: number;
  escapeR: number;
  power: number;
  kind: FractalKind;
  forceMode: ForceMode;
  forceGain: number;
  interiorDamp: number;       // 0..1
  dt: number;                 // timestep for fluid
  dissipation: number;        // velocity dissipation /s
  dyeDissipation: number;     // dye fade /s
  dyeInject: number;          // fractal color → dye injection rate
  vorticity: number;
  pressureIters: number;
  show: ShowMode;
  juliaMix: number;
  dyeMix: number;
  velocityViz: number;
  /** How many times to tile the gradient across the mapped axis. 1 = once, 2 = twice (banding), etc. */
  gradientRepeat: number;
  /** Phase shift of the gradient along the mapped axis (0..1 wraps). */
  gradientPhase: number;
  /** What fractal quantity drives the gradient lookup. */
  colorMapping: ColorMapping;
  /** Iterations used for coloring accumulators (orbit-trap, stripe, DE, etc). ≤ maxIter. */
  colorIter: number;
  /** Orbit-trap center (for point / circle shapes). */
  trapCenter: [number, number];
  /** Orbit-trap circle radius. */
  trapRadius: number;
  /** Orbit-trap line normal (unit). */
  trapNormal: [number, number];
  /** Orbit-trap line offset: dot(z, normal) = offset. */
  trapOffset: number;
  /** Stripe-average frequency: k in sin(k·arg z). */
  stripeFreq: number;
  /** How new dye blends onto the existing dye field. */
  dyeBlend: DyeBlend;
  /** Colour-space used when dye decays each frame. `linear` = classic RGB, `perceptual` = OKLab L-decay. */
  dyeDecayMode: DyeDecayMode;
  /** Per-second decay rate for chroma (OKLab a/b) when mode is perceptual/vivid.
   *  Lower than dyeDissipation → colour stays saturated longer than it stays bright. */
  dyeChromaDecayHz: number;
  /** Per-frame chroma multiplier applied after decay. 1 = neutral, <1 washes out, >1 punches up. */
  dyeSaturationBoost: number;
  /** Vorticity-confinement spatial scale (in sim texels). 1 = tight pixel-scale swirls, 4 = wider regional vortices. */
  vorticityScale: number;
  /** Final tone-mapping stage. `none` is vivid & may clip; `agx` is best for rich colours. */
  toneMapping: ToneMapping;
  /** Pre-tone-map exposure gain (multiplier on final colour). */
  exposure: number;
  /** Post-tone-map vibrance boost (chroma-aware saturation, 0..1). */
  vibrance: number;
  /** Style family bundle — the individual knobs below are independent too. */
  fluidStyle: FluidStyle;
  /** Strength of bloom glow, 0..3. */
  bloomAmount: number;
  /** Luminance threshold before anything contributes to bloom. */
  bloomThreshold: number;
  /** Velocity-keyed chromatic-aberration strength. */
  aberration: number;
  /** Dye-gradient refraction distortion (samples fractal at offset uv). */
  refraction: number;
  /** Stencil width (in dye-texels) for the refraction gradient. Higher = smoother distortion,
   *  less pixel jitter, at the cost of detail. 1 = raw single-pixel gradient. */
  refractSmooth: number;
  /** Laplacian-of-dye caustic highlight scale (liquid look). */
  caustics: number;
  interiorColor: [number, number, number];
  edgeMargin: number;         // 0..0.25 — fade force/dye injection + advection near borders (fixes "gushing from edges")
  forceCap: number;           // per-pixel magnitude cap on force vector (prevents c-track blowup)
  /** When true, a separate B&W collision gradient paints solid obstacles the fluid bounces off. */
  collisionEnabled: boolean;
  /** When true, the display overlays the collision mask so walls are visible. */
  collisionPreview: boolean;
  paused: boolean;
  simResolution: number;      // target sim grid height (cells) — may be adaptively reduced
  autoQuality: boolean;       // if true, adaptive-scaler may reduce simResolution when FPS is low
}

interface FBO {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texel: [number, number];
}

/** Framebuffer with two RGBA16F color attachments (for the Julia MRT pass). */
interface MrtFbo {
  texMain: WebGLTexture;
  texAux: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texel: [number, number];
}

interface DoubleFBO {
  read: FBO;
  write: FBO;
  swap: () => void;
  width: number;
  height: number;
  texel: [number, number];
}

interface Program {
  prog: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

// Boot defaults: a Mandelbrot-kind, inward-pulling (negative forceGain) gradient-mode
// scene with a rich Inferno-like palette. Lively from first frame.
export const DEFAULT_PARAMS: FluidParams = {
  juliaC: [-0.36303304426511473, 0.16845183018751916],
  center: [-0.8139175130270945, -0.054649908357858296],
  zoom: 1.2904749020480561,
  maxIter: 310,
  escapeR: 32,
  power: 2,
  kind: 'mandelbrot',
  forceMode: 'gradient',
  forceGain: -1200,
  interiorDamp: 0.59,
  dt: 0.016,
  dissipation: 0.17,
  dyeDissipation: 1.03,
  dyeInject: 8,
  vorticity: 22.1,
  pressureIters: 50,
  show: 'composite',
  juliaMix: 0.4,
  dyeMix: 2,
  velocityViz: 0.02,
  gradientRepeat: 1,
  gradientPhase: 0,
  colorMapping: 'iterations',
  colorIter: 310,
  trapCenter: [0, 0],
  trapRadius: 1,
  trapNormal: [1, 0],
  trapOffset: 0,
  stripeFreq: 4,
  dyeBlend: 'max',
  dyeDecayMode: 'linear',
  dyeChromaDecayHz: 1.03,
  dyeSaturationBoost: 1.0,
  vorticityScale: 1,
  toneMapping: 'none',
  exposure: 1,
  vibrance: 1.645,
  fluidStyle: 'plain',
  bloomAmount: 0,
  bloomThreshold: 1,
  aberration: 0.27,
  refraction: 0.037,
  refractSmooth: 3,
  caustics: 1,
  interiorColor: [0.02, 0.02, 0.04],
  edgeMargin: 0.04,
  forceCap: 40,
  collisionEnabled: false,
  collisionPreview: false,
  paused: false,
  simResolution: 1344,
  autoQuality: true,
};

export class FluidEngine {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private quadVbo: WebGLBuffer;

  private progJulia!: Program;
  private progMotion!: Program;
  private progAddForce!: Program;
  private progInjectDye!: Program;
  private progAdvect!: Program;
  private progDivergence!: Program;
  private progCurl!: Program;
  private progVorticity!: Program;
  private progPressure!: Program;
  private progGradSub!: Program;
  private progSplat!: Program;
  private progDisplay!: Program;
  private progClear!: Program;
  private progReproject!: Program;
  private progBloomExtract!: Program;
  private progBloomDown!: Program;
  private progBloomUp!: Program;
  private progMask!: Program;

  /** Bloom scratch textures. Allocated to the DISPLAY canvas size / 2, /4, /8. */
  private bloomA!: FBO;   // half-res — extraction target + final upsample target
  private bloomB!: FBO;   // quarter-res
  private bloomC!: FBO;   // eighth-res
  /** Set to true when the canvas size changes so bloom FBOs get reallocated. */
  private bloomDirty = true;

  /** Last camera we rendered with — used to detect pan/zoom between frames and reproject dye. */
  private lastCenter: [number, number] = [0, 0];
  private lastZoom = 1.5;
  private firstFrame = true;

  private simW = 0;
  private simH = 0;

  private juliaCur!: MrtFbo;
  private juliaPrev!: MrtFbo;
  private forceTex!: FBO;
  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private divergence!: FBO;
  private pressure!: DoubleFBO;
  private curl!: FBO;
  /** Collision mask — r > 0.5 means that sim cell is a solid wall. Recomputed each frame. */
  private maskTex!: FBO;

  /** 256x1 RGBA8 gradient LUT — the main colour gradient. */
  private gradientTex: WebGLTexture | null = null;
  /** 256x1 RGBA8 B&W LUT used by the collision-mask pass. */
  private collisionGradientTex: WebGLTexture | null = null;

  params: FluidParams = { ...DEFAULT_PARAMS };

  private lastTimeMs = 0;
  private framebufferFormat!: { internal: number; format: number; type: number };

  /** Called after each frame's draw. Use to report a frame tick to
   *  @engine/viewport's adaptive loop without coupling this class to
   *  plugin imports. Mirror of fractal-toy/FractalEngine.ts pattern. */
  public onFrameEnd?: () => void;

  constructor(canvas: HTMLCanvasElement, options: { onFrameEnd?: () => void } = {}) {
    this.canvas = canvas;
    this.onFrameEnd = options.onFrameEnd;
    // preserveDrawingBuffer MUST be true so that canvas.toBlob() (used by Save PNG)
    // captures the last rendered frame. With it false, the browser can clear/swap the
    // drawing buffer between rAFs, and toBlob returns a transparent/empty image.
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 required — your browser does not support it.');
    this.gl = gl;

    // Enable float render targets
    const colorBufExt = gl.getExtension('EXT_color_buffer_float');
    const halfFloatExt = gl.getExtension('EXT_color_buffer_half_float');
    if (!colorBufExt && !halfFloatExt) {
      throw new Error('Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.');
    }
    // Prefer RGBA16F when possible; gracefully fall back to RGBA8 for the engine to still run.
    // We test by trying to attach an RGBA16F texture.
    this.framebufferFormat = this.detectFormat();

    // fullscreen quad
    this.quadVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.compileAll();
    this.allocateTextures(this.params.simResolution);
  }

  private detectFormat() {
    const gl = this.gl;
    const fmts: Array<{ internal: number; format: number; type: number; name: string }> = [
      { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, name: 'RGBA16F half_float' },
      { internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, name: 'RGBA32F float' },
      { internal: gl.RGBA8,   format: gl.RGBA, type: gl.UNSIGNED_BYTE, name: 'RGBA8 fallback' },
    ];
    for (const f of fmts) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, 4, 4, 0, f.format, f.type, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
      if (status === gl.FRAMEBUFFER_COMPLETE) {
        console.info(`[FluidEngine] Using ${f.name} render targets.`);
        return f;
      }
    }
    throw new Error('No renderable texture format supported (not even RGBA8).');
  }

  // ---------------------------- Compilation ----------------------------

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh) || '';
      const lines = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}: ${l}`).join('\n');
      console.error(`Shader compile error:\n${log}\n${lines}`);
      throw new Error(`Shader compile error: ${log}`);
    }
    return sh;
  }

  private linkProgram(vsSrc: string, fsSrc: string, uniformNames: string[]): Program {
    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${gl.getProgramInfoLog(prog)}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const n of uniformNames) uniforms[n] = gl.getUniformLocation(prog, n);
    return { prog, uniforms };
  }

  private compileAll() {
    this.progJulia = this.linkProgram(VERT_FULLSCREEN, FRAG_JULIA,
      ['uTexel', 'uKind', 'uJuliaC', 'uCenter', 'uScale', 'uAspect', 'uMaxIter', 'uEscapeR2', 'uPower',
       'uColorIter', 'uTrapMode', 'uTrapCenter', 'uTrapRadius', 'uTrapNormal', 'uTrapOffset', 'uStripeFreq']);
    this.progMotion = this.linkProgram(VERT_FULLSCREEN, FRAG_MOTION,
      ['uTexel', 'uJulia', 'uJuliaPrev', 'uJuliaAux', 'uGradient', 'uMask', 'uMode', 'uGain', 'uDt',
       'uInteriorDamp', 'uDyeGain',
       'uColorMapping', 'uGradientRepeat', 'uGradientPhase', 'uEdgeMargin', 'uForceCap']);
    this.progAddForce = this.linkProgram(VERT_FULLSCREEN, FRAG_ADDFORCE,
      ['uTexel', 'uVelocity', 'uForce', 'uMask', 'uDt']);
    this.progInjectDye = this.linkProgram(VERT_FULLSCREEN, FRAG_INJECT_DYE,
      ['uTexel', 'uDye', 'uJulia', 'uJuliaAux', 'uGradient', 'uMask',
       'uDyeGain', 'uDyeFadeHz', 'uDt',
       'uColorMapping', 'uGradientRepeat', 'uGradientPhase', 'uEdgeMargin', 'uDyeBlend',
       'uDyeDecayMode', 'uDyeChromaFadeHz', 'uDyeSatBoost']);
    this.progAdvect = this.linkProgram(VERT_FULLSCREEN, FRAG_ADVECT,
      ['uTexel', 'uVelocity', 'uSource', 'uMask', 'uDt', 'uDissipation', 'uEdgeMargin']);
    this.progDivergence = this.linkProgram(VERT_FULLSCREEN, FRAG_DIVERGENCE,
      ['uTexel', 'uVelocity']);
    this.progCurl = this.linkProgram(VERT_FULLSCREEN, FRAG_CURL,
      ['uTexel', 'uVelocity']);
    this.progVorticity = this.linkProgram(VERT_FULLSCREEN, FRAG_VORTICITY,
      ['uTexel', 'uVelocity', 'uCurl', 'uStrength', 'uScale', 'uDt']);
    this.progPressure = this.linkProgram(VERT_FULLSCREEN, FRAG_PRESSURE,
      ['uTexel', 'uPressure', 'uDivergence']);
    this.progGradSub = this.linkProgram(VERT_FULLSCREEN, FRAG_GRADSUB,
      ['uTexel', 'uPressure', 'uVelocity', 'uMask']);
    this.progSplat = this.linkProgram(VERT_FULLSCREEN, FRAG_SPLAT,
      ['uTexel', 'uTarget', 'uPoint', 'uValue', 'uRadius', 'uAspect']);
    this.progDisplay = this.linkProgram(VERT_FULLSCREEN, FRAG_DISPLAY,
      ['uTexel', 'uTexelDisplay', 'uTexelDye', 'uJulia', 'uJuliaAux', 'uDye', 'uVelocity', 'uGradient', 'uBloom', 'uMask',
       'uShowMode', 'uJuliaMix', 'uDyeMix', 'uVelocityViz',
       'uColorMapping', 'uGradientRepeat', 'uGradientPhase', 'uInteriorColor',
       'uToneMapping', 'uExposure', 'uVibrance', 'uBloomAmount', 'uAberration', 'uRefraction', 'uRefractSmooth', 'uCaustics',
       'uCollisionPreview']);
    this.progClear = this.linkProgram(VERT_FULLSCREEN, FRAG_CLEAR, ['uValue']);
    this.progReproject = this.linkProgram(VERT_FULLSCREEN, FRAG_REPROJECT,
      ['uTexel', 'uSource', 'uNewCenter', 'uOldCenter', 'uNewZoom', 'uOldZoom', 'uAspect']);
    this.progBloomExtract = this.linkProgram(VERT_FULLSCREEN, FRAG_BLOOM_EXTRACT,
      ['uTexel', 'uSource', 'uThreshold', 'uSoftKnee']);
    this.progBloomDown = this.linkProgram(VERT_FULLSCREEN, FRAG_BLOOM_DOWN,
      ['uTexel', 'uSource']);
    this.progBloomUp = this.linkProgram(VERT_FULLSCREEN, FRAG_BLOOM_UP,
      ['uTexel', 'uSource', 'uPrev', 'uIntensity']);
    this.progMask = this.linkProgram(VERT_FULLSCREEN, FRAG_MASK,
      ['uTexel', 'uJulia', 'uJuliaAux', 'uGradient', 'uCollisionGradient',
       'uColorMapping', 'uGradientRepeat', 'uGradientPhase']);
  }

  // ---------------------------- Textures & FBOs ----------------------------

  private createFBO(w: number, h: number): FBO {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.framebufferFormat.internal,
                  w, h, 0, this.framebufferFormat.format, this.framebufferFormat.type, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, width: w, height: h, texel: [1 / w, 1 / h] };
  }

  private createMrtFbo(w: number, h: number): MrtFbo {
    const gl = this.gl;
    const mkTex = (): WebGLTexture => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, this.framebufferFormat.internal,
                    w, h, 0, this.framebufferFormat.format, this.framebufferFormat.type, null);
      return tex;
    };
    const texMain = mkTex();
    const texAux  = mkTex();
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texMain, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, texAux, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texMain, texAux, fbo, width: w, height: h, texel: [1 / w, 1 / h] };
  }

  private deleteMrtFbo(m: MrtFbo | null | undefined) {
    if (!m) return;
    const gl = this.gl;
    gl.deleteTexture(m.texMain);
    gl.deleteTexture(m.texAux);
    gl.deleteFramebuffer(m.fbo);
  }

  private createDoubleFBO(w: number, h: number): DoubleFBO {
    let a = this.createFBO(w, h);
    let b = this.createFBO(w, h);
    const self = {
      width: w, height: h, texel: [1 / w, 1 / h] as [number, number],
      get read() { return a; },
      get write() { return b; },
      swap() { const t = a; a = b; b = t; },
    };
    return self as DoubleFBO;
  }

  private deleteFBO(fbo: FBO | null | undefined) {
    if (!fbo) return;
    const gl = this.gl;
    gl.deleteTexture(fbo.tex);
    gl.deleteFramebuffer(fbo.fbo);
  }

  private deleteDoubleFBO(d: DoubleFBO | null | undefined) {
    if (!d) return;
    this.deleteFBO(d.read);
    this.deleteFBO(d.write);
  }

  private allocateTextures(simHeight: number) {
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    const h = Math.max(32, simHeight | 0);
    const w = Math.max(32, Math.round(h * aspect));
    if (w === this.simW && h === this.simH && this.juliaCur) return;

    // Clean old
    this.deleteMrtFbo(this.juliaCur);
    this.deleteMrtFbo(this.juliaPrev);
    this.deleteFBO(this.forceTex);
    this.deleteDoubleFBO(this.velocity);
    this.deleteDoubleFBO(this.dye);
    this.deleteFBO(this.divergence);
    this.deleteDoubleFBO(this.pressure);
    this.deleteFBO(this.curl);
    this.deleteFBO(this.maskTex);

    this.simW = w;
    this.simH = h;

    this.juliaCur  = this.createMrtFbo(w, h);
    this.juliaPrev = this.createMrtFbo(w, h);
    this.forceTex  = this.createFBO(w, h);
    this.velocity  = this.createDoubleFBO(w, h);
    this.dye       = this.createDoubleFBO(w, h);
    this.divergence = this.createFBO(w, h);
    this.pressure  = this.createDoubleFBO(w, h);
    this.curl      = this.createFBO(w, h);
    this.maskTex   = this.createFBO(w, h);
    // New textures are zero — don't try to reproject from the previous (smaller/larger) grid.
    this.firstFrame = true;
  }

  // ---------------------------- Drawing primitives ----------------------------

  private bindFBO(fbo: FBO) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo);
    gl.viewport(0, 0, fbo.width, fbo.height);
  }

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

  private setTexel(p: Program, w: number, h: number) {
    const gl = this.gl;
    const u = p.uniforms['uTexel'];
    if (u) gl.uniform2f(u, 1 / w, 1 / h);
  }

  private bindTex(unit: number, tex: WebGLTexture, uLoc: WebGLUniformLocation | null) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (uLoc) gl.uniform1i(uLoc, unit);
  }

  // ---------------------------- Public API ----------------------------

  setParams(p: Partial<FluidParams>) {
    this.params = { ...this.params, ...p };
    if (p.simResolution && p.simResolution !== this.simH) {
      this.allocateTextures(p.simResolution);
    }
  }

  /**
   * Upload a baked LUT (`GRADIENT_LUT_WIDTH × 1 RGBA`, length = 4×width).
   * Shared helper: both the main colour gradient and the collision B&W gradient
   * use the same upload path, differing only in the sampling site.
   */
  private uploadLut(slot: 'main' | 'collision', buf: Uint8Array) {
    const gl = this.gl;
    const expected = GRADIENT_LUT_WIDTH * 4;
    if (buf.length !== expected) {
      console.warn(`[FluidEngine] ${slot} gradient buffer unexpected length ${buf.length} (want ${expected})`);
    }
    let tex = slot === 'main' ? this.gradientTex : this.collisionGradientTex;
    if (!tex) {
      tex = gl.createTexture()!;
      if (slot === 'main') this.gradientTex = tex;
      else this.collisionGradientTex = tex;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GRADIENT_LUT_WIDTH, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  }

  /** Upload the main colour gradient LUT. Call whenever the user edits the gradient. */
  setGradientBuffer(buf: Uint8Array) { this.uploadLut('main', buf); }

  /** Upload the collision gradient LUT (black = fluid, white = wall). */
  setCollisionGradientBuffer(buf: Uint8Array) { this.uploadLut('collision', buf); }

  private ensureGradient() {
    if (this.gradientTex) return;
    // Fallback grey ramp — used only until the app pushes a real gradient on boot.
    const w = GRADIENT_LUT_WIDTH;
    const buf = new Uint8Array(w * 4);
    for (let i = 0; i < w; ++i) {
      buf[i * 4 + 0] = i;
      buf[i * 4 + 1] = i;
      buf[i * 4 + 2] = i;
      buf[i * 4 + 3] = 255;
    }
    this.setGradientBuffer(buf);
  }

  private ensureCollisionGradient() {
    if (this.collisionGradientTex) return;
    // Fallback = all black → no walls anywhere. Harmless until the app uploads one.
    const w = GRADIENT_LUT_WIDTH;
    const buf = new Uint8Array(w * 4);
    for (let i = 0; i < w; ++i) {
      buf[i * 4 + 0] = 0;
      buf[i * 4 + 1] = 0;
      buf[i * 4 + 2] = 0;
      buf[i * 4 + 3] = 255;
    }
    this.setCollisionGradientBuffer(buf);
  }

  /** Resize the drawing buffer to match container. */
  resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
      this.allocateTextures(this.params.simResolution);
      this.bloomDirty = true;
    }
  }

  /** (Re)allocate the half/quarter/eighth bloom FBOs at the current canvas size. */
  private ensureBloomFbos() {
    if (!this.bloomDirty && this.bloomA) return;
    this.deleteFBO(this.bloomA);
    this.deleteFBO(this.bloomB);
    this.deleteFBO(this.bloomC);
    const W = this.canvas.width, H = this.canvas.height;
    const w2 = Math.max(4, (W >> 1) & ~1);
    const h2 = Math.max(4, (H >> 1) & ~1);
    const w4 = Math.max(2, (W >> 2) & ~1);
    const h4 = Math.max(2, (H >> 2) & ~1);
    const w8 = Math.max(2, (W >> 3) & ~1);
    const h8 = Math.max(2, (H >> 3) & ~1);
    this.bloomA = this.createFBO(w2, h2);
    this.bloomB = this.createFBO(w4, h4);
    this.bloomC = this.createFBO(w8, h8);
    this.bloomDirty = false;
  }

  /** Clear dye and velocity back to zero. Also resets the camera-lock baseline. */
  private markFirstFrame() { this.firstFrame = true; }

  /** Clear dye and velocity back to zero. */
  resetFluid() {
    const gl = this.gl;
    for (const d of [this.velocity, this.dye, this.pressure]) {
      for (const f of [d.read, d.write]) {
        this.bindFBO(f);
        this.useProgram(this.progClear);
        gl.uniform4f(this.progClear.uniforms['uValue'], 0, 0, 0, 1);
        this.drawQuad();
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // After a reset, the camera "before" has no dye to reproject — skip one frame.
    this.markFirstFrame();
  }

  /**
   * Inject a single gaussian splat into a ping-pong field and advance the swap.
   * Called twice from splatForce (once for velocity, once for dye).
   */
  private splat(target: DoubleFBO, u: number, v: number, value: [number, number, number]) {
    const gl = this.gl;
    this.bindFBO(target.write);
    this.useProgram(this.progSplat);
    this.bindTex(0, target.read.tex, this.progSplat.uniforms['uTarget']);
    gl.uniform2f(this.progSplat.uniforms['uPoint'], u, v);
    gl.uniform3f(this.progSplat.uniforms['uValue'], value[0], value[1], value[2]);
    gl.uniform1f(this.progSplat.uniforms['uRadius'], SPLAT_RADIUS_UV);
    gl.uniform1f(this.progSplat.uniforms['uAspect'], this.simW / this.simH);
    this.drawQuad();
    target.swap();
  }

  /** Inject a splat of force and dye at a UV location. */
  splatForce(u: number, v: number, dx: number, dy: number, strength: number, color: [number, number, number]) {
    // Clamp UV — pointer capture can fire move events from outside the canvas.
    u = Math.max(0, Math.min(1, u));
    v = Math.max(0, Math.min(1, v));
    this.splat(this.velocity, u, v, [dx * strength, dy * strength, 0]);
    this.splat(this.dye, u, v, color);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  // ---------------------------- Per-frame passes ----------------------------

  private renderJulia() {
    const gl = this.gl;
    // Swap: current becomes previous
    const t = this.juliaCur;
    this.juliaCur = this.juliaPrev;
    this.juliaPrev = t;

    // Bind MRT framebuffer (has both color attachments; drawBuffers set at creation)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.juliaCur.fbo);
    gl.viewport(0, 0, this.juliaCur.width, this.juliaCur.height);
    this.useProgram(this.progJulia);
    this.setTexel(this.progJulia, this.simW, this.simH);
    gl.uniform1i(this.progJulia.uniforms['uKind'], this.params.kind === 'julia' ? 0 : 1);
    gl.uniform2f(this.progJulia.uniforms['uJuliaC'], this.params.juliaC[0], this.params.juliaC[1]);
    gl.uniform2f(this.progJulia.uniforms['uCenter'], this.params.center[0], this.params.center[1]);
    gl.uniform1f(this.progJulia.uniforms['uScale'], this.params.zoom);
    gl.uniform1f(this.progJulia.uniforms['uAspect'], this.simW / this.simH);
    const maxIt = Math.max(4, this.params.maxIter | 0);
    gl.uniform1i(this.progJulia.uniforms['uMaxIter'], maxIt);
    gl.uniform1i(this.progJulia.uniforms['uColorIter'], Math.max(1, Math.min(maxIt, this.params.colorIter | 0)));
    gl.uniform1f(this.progJulia.uniforms['uEscapeR2'], this.params.escapeR * this.params.escapeR);
    gl.uniform1f(this.progJulia.uniforms['uPower'], this.params.power);
    gl.uniform1i(this.progJulia.uniforms['uTrapMode'], colorMappingTrapShape(this.params.colorMapping));
    gl.uniform2f(this.progJulia.uniforms['uTrapCenter'], this.params.trapCenter[0], this.params.trapCenter[1]);
    gl.uniform1f(this.progJulia.uniforms['uTrapRadius'], this.params.trapRadius);
    gl.uniform2f(this.progJulia.uniforms['uTrapNormal'], this.params.trapNormal[0], this.params.trapNormal[1]);
    gl.uniform1f(this.progJulia.uniforms['uTrapOffset'], this.params.trapOffset);
    gl.uniform1f(this.progJulia.uniforms['uStripeFreq'], this.params.stripeFreq);
    this.drawQuad();
  }

  /**
   * Build the per-frame collision mask from the current color-mapping + gradient.
   * Written to `maskTex.tex`; every fluid pass reads it. When collision is off
   * we still render but clear the mask to zero, so the shaders that read it
   * keep a single fast path.
   */
  private computeMask() {
    const gl = this.gl;
    this.ensureGradient();
    this.ensureCollisionGradient();
    this.bindFBO(this.maskTex);
    if (!this.params.collisionEnabled) {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    this.useProgram(this.progMask);
    this.setTexel(this.progMask, this.simW, this.simH);
    this.bindTex(0, this.juliaCur.texMain, this.progMask.uniforms['uJulia']);
    this.bindTex(1, this.juliaCur.texAux, this.progMask.uniforms['uJuliaAux']);
    this.bindTex(2, this.gradientTex!, this.progMask.uniforms['uGradient']);
    this.bindTex(3, this.collisionGradientTex!, this.progMask.uniforms['uCollisionGradient']);
    gl.uniform1i(this.progMask.uniforms['uColorMapping'], colorMappingToIndex(this.params.colorMapping));
    gl.uniform1f(this.progMask.uniforms['uGradientRepeat'], this.params.gradientRepeat);
    gl.uniform1f(this.progMask.uniforms['uGradientPhase'], this.params.gradientPhase);
    this.drawQuad();
  }

  private computeForce() {
    const gl = this.gl;
    this.ensureGradient();
    this.bindFBO(this.forceTex);
    this.useProgram(this.progMotion);
    this.setTexel(this.progMotion, this.simW, this.simH);
    this.bindTex(0, this.juliaCur.texMain, this.progMotion.uniforms['uJulia']);
    this.bindTex(1, this.juliaPrev.texMain, this.progMotion.uniforms['uJuliaPrev']);
    this.bindTex(4, this.juliaCur.texAux, this.progMotion.uniforms['uJuliaAux']);
    this.bindTex(2, this.gradientTex!, this.progMotion.uniforms['uGradient']);
    this.bindTex(5, this.maskTex.tex, this.progMotion.uniforms['uMask']);
    gl.uniform1i(this.progMotion.uniforms['uMode'], modeToIndex(this.params.forceMode));
    gl.uniform1f(this.progMotion.uniforms['uGain'], this.params.forceGain);
    gl.uniform1f(this.progMotion.uniforms['uDt'], this.params.dt);
    gl.uniform1f(this.progMotion.uniforms['uInteriorDamp'], this.params.interiorDamp);
    gl.uniform1f(this.progMotion.uniforms['uDyeGain'], this.params.dyeInject);
    gl.uniform1i(this.progMotion.uniforms['uColorMapping'], colorMappingToIndex(this.params.colorMapping));
    gl.uniform1f(this.progMotion.uniforms['uGradientRepeat'], this.params.gradientRepeat);
    gl.uniform1f(this.progMotion.uniforms['uGradientPhase'], this.params.gradientPhase);
    gl.uniform1f(this.progMotion.uniforms['uEdgeMargin'], this.params.edgeMargin);
    gl.uniform1f(this.progMotion.uniforms['uForceCap'], this.params.forceCap);
    this.drawQuad();
  }

  private addForceToVelocity() {
    const gl = this.gl;
    this.bindFBO(this.velocity.write);
    this.useProgram(this.progAddForce);
    this.setTexel(this.progAddForce, this.simW, this.simH);
    this.bindTex(0, this.velocity.read.tex, this.progAddForce.uniforms['uVelocity']);
    this.bindTex(1, this.forceTex.tex, this.progAddForce.uniforms['uForce']);
    this.bindTex(2, this.maskTex.tex, this.progAddForce.uniforms['uMask']);
    gl.uniform1f(this.progAddForce.uniforms['uDt'], this.params.dt);
    this.drawQuad();
    this.velocity.swap();
  }

  private injectDye() {
    const gl = this.gl;
    this.ensureGradient();
    this.bindFBO(this.dye.write);
    this.useProgram(this.progInjectDye);
    this.setTexel(this.progInjectDye, this.simW, this.simH);
    this.bindTex(0, this.dye.read.tex, this.progInjectDye.uniforms['uDye']);
    this.bindTex(1, this.juliaCur.texMain, this.progInjectDye.uniforms['uJulia']);
    this.bindTex(2, this.gradientTex!, this.progInjectDye.uniforms['uGradient']);
    this.bindTex(4, this.juliaCur.texAux, this.progInjectDye.uniforms['uJuliaAux']);
    this.bindTex(5, this.maskTex.tex, this.progInjectDye.uniforms['uMask']);
    gl.uniform1f(this.progInjectDye.uniforms['uDyeGain'], this.params.dyeInject);
    gl.uniform1f(this.progInjectDye.uniforms['uDyeFadeHz'], this.params.dyeDissipation);
    gl.uniform1f(this.progInjectDye.uniforms['uDt'], this.params.dt);
    gl.uniform1i(this.progInjectDye.uniforms['uColorMapping'], colorMappingToIndex(this.params.colorMapping));
    gl.uniform1f(this.progInjectDye.uniforms['uGradientRepeat'], this.params.gradientRepeat);
    gl.uniform1f(this.progInjectDye.uniforms['uGradientPhase'], this.params.gradientPhase);
    gl.uniform1f(this.progInjectDye.uniforms['uEdgeMargin'], this.params.edgeMargin);
    gl.uniform1i(this.progInjectDye.uniforms['uDyeBlend'], dyeBlendToIndex(this.params.dyeBlend));
    gl.uniform1i(this.progInjectDye.uniforms['uDyeDecayMode'], dyeDecayModeToIndex(this.params.dyeDecayMode));
    gl.uniform1f(this.progInjectDye.uniforms['uDyeChromaFadeHz'], this.params.dyeChromaDecayHz);
    gl.uniform1f(this.progInjectDye.uniforms['uDyeSatBoost'], this.params.dyeSaturationBoost);
    this.drawQuad();
    this.dye.swap();
  }

  private computeCurl() {
    this.bindFBO(this.curl);
    this.useProgram(this.progCurl);
    this.setTexel(this.progCurl, this.simW, this.simH);
    this.bindTex(0, this.velocity.read.tex, this.progCurl.uniforms['uVelocity']);
    this.drawQuad();
  }

  private applyVorticity() {
    const gl = this.gl;
    this.bindFBO(this.velocity.write);
    this.useProgram(this.progVorticity);
    this.setTexel(this.progVorticity, this.simW, this.simH);
    this.bindTex(0, this.velocity.read.tex, this.progVorticity.uniforms['uVelocity']);
    this.bindTex(1, this.curl.tex, this.progVorticity.uniforms['uCurl']);
    gl.uniform1f(this.progVorticity.uniforms['uStrength'], this.params.vorticity);
    gl.uniform1f(this.progVorticity.uniforms['uScale'], this.params.vorticityScale);
    gl.uniform1f(this.progVorticity.uniforms['uDt'], this.params.dt);
    this.drawQuad();
    this.velocity.swap();
  }

  private computeDivergence() {
    this.bindFBO(this.divergence);
    this.useProgram(this.progDivergence);
    this.setTexel(this.progDivergence, this.simW, this.simH);
    this.bindTex(0, this.velocity.read.tex, this.progDivergence.uniforms['uVelocity']);
    this.drawQuad();
  }

  private solvePressure() {
    const gl = this.gl;
    // clear pressure to 0
    this.bindFBO(this.pressure.read);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Jacobi iterations
    for (let i = 0; i < this.params.pressureIters; ++i) {
      this.bindFBO(this.pressure.write);
      this.useProgram(this.progPressure);
      this.setTexel(this.progPressure, this.simW, this.simH);
      this.bindTex(0, this.pressure.read.tex, this.progPressure.uniforms['uPressure']);
      this.bindTex(1, this.divergence.tex, this.progPressure.uniforms['uDivergence']);
      this.drawQuad();
      this.pressure.swap();
    }
  }

  private subtractPressureGradient() {
    this.bindFBO(this.velocity.write);
    this.useProgram(this.progGradSub);
    this.setTexel(this.progGradSub, this.simW, this.simH);
    this.bindTex(0, this.pressure.read.tex, this.progGradSub.uniforms['uPressure']);
    this.bindTex(1, this.velocity.read.tex, this.progGradSub.uniforms['uVelocity']);
    this.bindTex(2, this.maskTex.tex, this.progGradSub.uniforms['uMask']);
    this.drawQuad();
    this.velocity.swap();
  }

  /**
   * Semi-Lagrangian advect of `source` by the current velocity field.
   * Used for both velocity (advecting itself) and dye (carried by velocity).
   */
  private advect(source: DoubleFBO, dissipationHz: number) {
    const gl = this.gl;
    this.bindFBO(source.write);
    this.useProgram(this.progAdvect);
    this.setTexel(this.progAdvect, this.simW, this.simH);
    this.bindTex(0, this.velocity.read.tex, this.progAdvect.uniforms['uVelocity']);
    this.bindTex(1, source.read.tex, this.progAdvect.uniforms['uSource']);
    this.bindTex(2, this.maskTex.tex, this.progAdvect.uniforms['uMask']);
    gl.uniform1f(this.progAdvect.uniforms['uDt'], this.params.dt);
    gl.uniform1f(this.progAdvect.uniforms['uDissipation'], dissipationHz);
    gl.uniform1f(this.progAdvect.uniforms['uEdgeMargin'], this.params.edgeMargin);
    this.drawQuad();
    source.swap();
  }

  /**
   * Resample `srcDouble` from the previous camera (oldCenter, oldZoom) into the
   * current camera (this.params.center, this.params.zoom). Runs a single pass
   * writing from read → write, then swaps.
   */
  private reprojectTexture(srcDouble: DoubleFBO, oldCenter: [number, number], oldZoom: number) {
    const gl = this.gl;
    this.bindFBO(srcDouble.write);
    this.useProgram(this.progReproject);
    this.setTexel(this.progReproject, this.simW, this.simH);
    this.bindTex(0, srcDouble.read.tex, this.progReproject.uniforms['uSource']);
    gl.uniform2f(this.progReproject.uniforms['uNewCenter'], this.params.center[0], this.params.center[1]);
    gl.uniform2f(this.progReproject.uniforms['uOldCenter'], oldCenter[0], oldCenter[1]);
    gl.uniform1f(this.progReproject.uniforms['uNewZoom'], this.params.zoom);
    gl.uniform1f(this.progReproject.uniforms['uOldZoom'], oldZoom);
    gl.uniform1f(this.progReproject.uniforms['uAspect'], this.simW / this.simH);
    this.drawQuad();
    srcDouble.swap();
  }

  /** If the camera has moved since last frame, reproject dye + velocity so world-space is preserved. */
  private maybeReprojectForCamera() {
    if (this.firstFrame) {
      this.firstFrame = false;
      this.lastCenter = [this.params.center[0], this.params.center[1]];
      this.lastZoom = this.params.zoom;
      return;
    }
    const dx = this.params.center[0] - this.lastCenter[0];
    const dy = this.params.center[1] - this.lastCenter[1];
    const dz = this.params.zoom - this.lastZoom;
    if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7 && Math.abs(dz) < 1e-7) return;
    const oldCenter: [number, number] = [this.lastCenter[0], this.lastCenter[1]];
    const oldZoom = this.lastZoom;
    this.reprojectTexture(this.dye, oldCenter, oldZoom);
    this.reprojectTexture(this.velocity, oldCenter, oldZoom);
    this.lastCenter = [this.params.center[0], this.params.center[1]];
    this.lastZoom = this.params.zoom;
  }

  private displayToScreen() {
    const gl = this.gl;
    this.ensureGradient();

    // Bloom chain (Jimenez dual-filter style, 2-level).
    //   composite → bloomA,  extract → bloomB,  downsample → bloomC,
    //   copy bloomB → bloomA (so we can read it without a render-to-self),
    //   upsample bloomC + bloomA → bloomB.  Final: bloomB is the glow layer.
    const wantBloom = this.params.bloomAmount > 0.001;
    if (wantBloom) {
      this.ensureBloomFbos();

      this.bindFBO(this.bloomA);
      this.setDisplayUniforms(/*bloomTex*/null, /*skipPost*/true);
      this.drawQuad();

      this.bindFBO(this.bloomB);
      this.useProgram(this.progBloomExtract);
      gl.uniform2f(this.progBloomExtract.uniforms['uTexel'], this.bloomB.texel[0], this.bloomB.texel[1]);
      this.bindTex(0, this.bloomA.tex, this.progBloomExtract.uniforms['uSource']);
      gl.uniform1f(this.progBloomExtract.uniforms['uThreshold'], this.params.bloomThreshold);
      gl.uniform1f(this.progBloomExtract.uniforms['uSoftKnee'], BLOOM_SOFT_KNEE);
      this.drawQuad();

      this.bindFBO(this.bloomC);
      this.useProgram(this.progBloomDown);
      gl.uniform2f(this.progBloomDown.uniforms['uTexel'], this.bloomB.texel[0], this.bloomB.texel[1]);
      this.bindTex(0, this.bloomB.tex, this.progBloomDown.uniforms['uSource']);
      this.drawQuad();

      // Copy bloomB → bloomA as the stand-in "previous" for the final upsample
      // (avoids reading bloomB while also writing to it).
      this.bindFBO(this.bloomA);
      this.useProgram(this.progBloomDown);
      gl.uniform2f(this.progBloomDown.uniforms['uTexel'], this.bloomB.texel[0], this.bloomB.texel[1]);
      this.bindTex(0, this.bloomB.tex, this.progBloomDown.uniforms['uSource']);
      this.drawQuad();

      this.bindFBO(this.bloomB);
      this.useProgram(this.progBloomUp);
      gl.uniform2f(this.progBloomUp.uniforms['uTexel'], this.bloomC.texel[0], this.bloomC.texel[1]);
      this.bindTex(0, this.bloomC.tex, this.progBloomUp.uniforms['uSource']);
      this.bindTex(1, this.bloomA.tex, this.progBloomUp.uniforms['uPrev']);
      gl.uniform1f(this.progBloomUp.uniforms['uIntensity'], 1.0);
      this.drawQuad();
    }

    // Final pass: to screen, with bloomB as the glow layer (or null if disabled).
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.setDisplayUniforms(wantBloom ? this.bloomB : null, /*skipPost*/false);
    this.drawQuad();
  }

  /**
   * Binds textures + uniforms for FRAG_DISPLAY.
   * @param bloomTex  If null, the bloom sampler gets a dummy texture + bloomAmount=0.
   * @param skipPost  When true (used during the bloom-source pre-pass), disables all
   *                  post-processing so the bloom extract sees a CLEAN composite —
   *                  otherwise bloom would feed back on tone-mapped output.
   */
  private setDisplayUniforms(bloomTex: FBO | null, skipPost: boolean = false) {
    const gl = this.gl;
    this.useProgram(this.progDisplay);
    gl.uniform2f(this.progDisplay.uniforms['uTexelDisplay'], 1 / this.canvas.width, 1 / this.canvas.height);
    gl.uniform2f(this.progDisplay.uniforms['uTexelDye'], 1 / this.simW, 1 / this.simH);
    this.bindTex(0, this.juliaCur.texMain, this.progDisplay.uniforms['uJulia']);
    this.bindTex(4, this.juliaCur.texAux, this.progDisplay.uniforms['uJuliaAux']);
    this.bindTex(1, this.dye.read.tex, this.progDisplay.uniforms['uDye']);
    this.bindTex(2, this.velocity.read.tex, this.progDisplay.uniforms['uVelocity']);
    this.bindTex(3, this.gradientTex!, this.progDisplay.uniforms['uGradient']);
    this.bindTex(5, bloomTex?.tex ?? this.gradientTex!, this.progDisplay.uniforms['uBloom']);
    this.bindTex(6, this.maskTex.tex, this.progDisplay.uniforms['uMask']);
    gl.uniform1i(this.progDisplay.uniforms['uShowMode'], showToIndex(this.params.show));
    gl.uniform1f(this.progDisplay.uniforms['uJuliaMix'], this.params.juliaMix);
    gl.uniform1f(this.progDisplay.uniforms['uDyeMix'], this.params.dyeMix);
    gl.uniform1f(this.progDisplay.uniforms['uVelocityViz'], this.params.velocityViz);
    gl.uniform1i(this.progDisplay.uniforms['uColorMapping'], colorMappingToIndex(this.params.colorMapping));
    gl.uniform1f(this.progDisplay.uniforms['uGradientRepeat'], this.params.gradientRepeat);
    gl.uniform1f(this.progDisplay.uniforms['uGradientPhase'], this.params.gradientPhase);
    gl.uniform3f(this.progDisplay.uniforms['uInteriorColor'],
      this.params.interiorColor[0], this.params.interiorColor[1], this.params.interiorColor[2]);
    // Post-processing knobs — zeroed when rendering the bloom source.
    if (skipPost) {
      gl.uniform1i(this.progDisplay.uniforms['uToneMapping'], 0);
      gl.uniform1f(this.progDisplay.uniforms['uExposure'], 1.0);
      gl.uniform1f(this.progDisplay.uniforms['uVibrance'], 0.0);
      gl.uniform1f(this.progDisplay.uniforms['uBloomAmount'], 0.0);
      gl.uniform1f(this.progDisplay.uniforms['uAberration'], 0.0);
      gl.uniform1f(this.progDisplay.uniforms['uRefraction'], 0.0);
      gl.uniform1f(this.progDisplay.uniforms['uRefractSmooth'], 1.0);
      gl.uniform1f(this.progDisplay.uniforms['uCaustics'], 0.0);
      gl.uniform1i(this.progDisplay.uniforms['uCollisionPreview'], 0);
    } else {
      gl.uniform1i(this.progDisplay.uniforms['uToneMapping'], toneMappingToIndex(this.params.toneMapping));
      gl.uniform1f(this.progDisplay.uniforms['uExposure'], this.params.exposure);
      gl.uniform1f(this.progDisplay.uniforms['uVibrance'], this.params.vibrance);
      gl.uniform1f(this.progDisplay.uniforms['uBloomAmount'], bloomTex ? this.params.bloomAmount : 0);
      gl.uniform1f(this.progDisplay.uniforms['uAberration'], this.params.aberration);
      gl.uniform1f(this.progDisplay.uniforms['uRefraction'], this.params.refraction);
      gl.uniform1f(this.progDisplay.uniforms['uRefractSmooth'], this.params.refractSmooth);
      gl.uniform1f(this.progDisplay.uniforms['uCaustics'], this.params.caustics);
      gl.uniform1i(this.progDisplay.uniforms['uCollisionPreview'], this.params.collisionPreview ? 1 : 0);
    }
  }

  frame(timeMs: number) {
    const gl = this.gl;
    const dt = this.lastTimeMs === 0 ? 0.016 : Math.min(0.05, (timeMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = timeMs;
    this.params.dt = dt;

    // 1. Julia pass
    this.renderJulia();
    // 1a. Collision mask (always — emits zeros when disabled so downstream
    // shaders have a single fast path through texture(uMask, ...)).
    this.computeMask();

    if (!this.params.paused) {
      // 1b. Camera-locked dye/velocity — if the user panned or zoomed since the last
      // frame, resample dye + velocity so they stay locked to world-space.
      this.maybeReprojectForCamera();

      // 2. Motion vector pass
      this.computeForce();
      // 3. Add force to velocity
      this.addForceToVelocity();
      // 4. Vorticity confinement (optional)
      if (this.params.vorticity > 0) {
        this.computeCurl();
        this.applyVorticity();
      }
      // 5. Divergence + pressure projection
      this.computeDivergence();
      this.solvePressure();
      this.subtractPressureGradient();
      // 6. Advect velocity (carries itself)
      this.advect(this.velocity, this.params.dissipation);
      // 7. Inject fractal dye + advect dye (carried by velocity)
      this.injectDye();
      this.advect(this.dye, this.params.dyeDissipation);
    }

    // 8. Display
    this.displayToScreen();

    // unbind
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);

    if (this.onFrameEnd) this.onFrameEnd();
  }

  dispose() {
    const gl = this.gl;
    this.deleteMrtFbo(this.juliaCur);
    this.deleteMrtFbo(this.juliaPrev);
    this.deleteFBO(this.forceTex);
    this.deleteDoubleFBO(this.velocity);
    this.deleteDoubleFBO(this.dye);
    this.deleteFBO(this.divergence);
    this.deleteDoubleFBO(this.pressure);
    this.deleteFBO(this.curl);
    this.deleteFBO(this.maskTex);
    if (this.gradientTex) { gl.deleteTexture(this.gradientTex); this.gradientTex = null; }
    if (this.collisionGradientTex) { gl.deleteTexture(this.collisionGradientTex); this.collisionGradientTex = null; }
    this.deleteFBO(this.bloomA); this.deleteFBO(this.bloomB); this.deleteFBO(this.bloomC);
    gl.deleteBuffer(this.quadVbo);
    for (const p of [
      this.progJulia, this.progMotion, this.progAddForce, this.progInjectDye,
      this.progAdvect, this.progDivergence, this.progCurl, this.progVorticity,
      this.progPressure, this.progGradSub, this.progSplat, this.progDisplay, this.progClear,
      this.progReproject, this.progMask,
      this.progBloomExtract, this.progBloomDown, this.progBloomUp,
    ]) {
      if (p?.prog) gl.deleteProgram(p.prog);
    }
  }

  /** Map canvas pixel coords to fractal coords (for c-picking). */
  canvasToFractal(xPx: number, yPx: number): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const u = (xPx - rect.left) / rect.width;
    const v = 1 - (yPx - rect.top) / rect.height;
    const aspect = this.canvas.width / this.canvas.height;
    const fx = (u * 2 - 1) * aspect * this.params.zoom + this.params.center[0];
    const fy = (v * 2 - 1) * this.params.zoom + this.params.center[1];
    return [fx, fy];
  }

  /** Canvas-relative UV (0..1 with origin at bottom-left) for splat injection. */
  canvasToUv(xPx: number, yPx: number): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    return [(xPx - rect.left) / rect.width, 1 - (yPx - rect.top) / rect.height];
  }
}

function modeToIndex(m: ForceMode): number {
  switch (m) {
    case 'gradient': return 0;
    case 'curl': return 1;
    case 'iterate': return 2;
    case 'c-track': return 3;
    case 'hue': return 4;
  }
}

function showToIndex(s: ShowMode): number {
  switch (s) {
    case 'composite': return 0;
    case 'julia': return 1;
    case 'dye': return 2;
    case 'velocity': return 3;
  }
}
