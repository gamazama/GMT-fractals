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
  FRAG_COPY,
  FRAG_COPY_MRT,
  FRAG_REPROJECT,
  FRAG_BLOOM_EXTRACT,
  FRAG_BLOOM_DOWN,
  FRAG_BLOOM_UP,
  FRAG_MASK,
  FRAG_TSAA_BLEND,
} from './shaders';
import { BLOOM_SOFT_KNEE, GRADIENT_LUT_WIDTH } from '../constants';
import { createBlueNoiseWebGL2, type BlueNoiseTexture } from '../../engine/utils/createBlueNoiseWebGL2';
import { ddSub } from '../deepZoom/dd';

/** Pack a JS f64 as `[mantissa, exp]` for the shader's HDR uniforms.
 *  Mirrors `f64ToHDR` from `../deepZoom/HDRFloat.ts` but inlined as a
 *  tuple-returning helper to avoid the cross-module import in the
 *  engine layer. Zero maps to (0, 0). */
const f64ToHDRTuple = (v: number): [number, number] => {
    if (!Number.isFinite(v) || v === 0) return [0, 0];
    const e = Math.floor(Math.log2(Math.abs(v)));
    return [v / Math.pow(2, e), e];
};
// FractalEvents reset_accum subscription removed — see ctor comment.

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

/** Whether this colorMapping needs the trap/stripe accumulator block in
 *  the iteration loop. Modes that read aux.r (orbit traps), aux.g
 *  (stripe), or aux.a (trap iter) need it; the rest don't and can skip
 *  the per-iter atan + sin work. */
export function colorMappingNeedsAccum(m: ColorMapping): boolean {
  switch (m) {
    case 'orbit-point':
    case 'orbit-circle':
    case 'orbit-cross':
    case 'orbit-line':
    case 'stripe':
    case 'trap-iter':
      return true;
    default:
      return false;
  }
}

/** Whether this colorMapping needs the per-iter dz/dc derivative tracker.
 *  Distance estimate and derivative modes read aux.b (logDz). */
export function colorMappingNeedsDeriv(m: ColorMapping): boolean {
  return m === 'distance' || m === 'derivative';
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
  /** Sub-f64 residual paired with `center` for deep-zoom panning.
   *  Auto-managed by gesture handlers via Dekker two-sum. The engine
   *  packs (center + centerLow) − (refOrbitCenter + refOrbitCenterLow)
   *  into uDeepCenterOffset, recovering pan increments below f64's
   *  mantissa floor. Defaults to [0, 0] — old saves and standard
   *  (non-deep) views work unchanged. */
  centerLow: [number, number];
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
  /** Frosted-glass roughness for the refracted fractal sample. 0 = crisp single-tap
   *  refraction (default). 1 = ~5px Vogel-disc blur radius — light scatters across an
   *  8-tap kernel, matching how real rough surfaces refract into a cone of directions
   *  rather than one ray. Each tap is gradient-mapped individually before averaging,
   *  so boundary pixels stay coherent. The mask + wall edges blur in step with the
   *  fractal so glass refractions look consistent. */
  refractRoughness: number;
  /** Laplacian-of-dye caustic highlight scale (liquid look). */
  caustics: number;
  interiorColor: [number, number, number];
  edgeMargin: number;         // 0..0.25 — fade force/dye injection + advection near borders (fixes "gushing from edges")
  forceCap: number;           // per-pixel magnitude cap on force vector (prevents c-track blowup)
  /** When true, a separate B&W collision gradient paints solid obstacles the fluid bounces off. */
  collisionEnabled: boolean;
  /** When true, the display overlays the collision mask so walls are visible. */
  collisionPreview: boolean;
  /** Collision LUT tiling repeat — independent of the dye gradientRepeat. */
  collisionRepeat: number;
  /** Collision LUT phase shift — independent of the dye gradientPhase. */
  collisionPhase: number;
  paused: boolean;

  /** TSAA on/off for the background fractal. When true, the Julia pass
   *  jitters its sampling per frame and a blend pass averages the result
   *  into a persistent accumulator. Dye + fluid passes are unaffected. */
  tsaa: boolean;
  /** TSAA jitter amplitude in pixel fractions. 1.0 = ±0.5 px. */
  tsaaJitterAmount: number;
  /** Max accumulated samples before TSAA stops blending (saves GPU
   *  work once the image has converged). 0 = no cap (infinite
   *  accumulation; the engine never short-circuits the Julia pass). */
  tsaaSampleCap: number;
  /** K-sampling: number of jittered Julia evaluations per frame, raw-
   *  averaged before pushing to the TSAA accumulator. GLSL clamps
   *  to [1, 16]. With grid mode + tsaaGridSize, the cells visited
   *  cycle across frames so a full round of (gridSize / K) frames
   *  covers every cell exactly once. K=4 + gridSize=16 → 4 frames
   *  per round; after frame 4 the accumulator equals a single-frame
   *  K=16 grid. */
  tsaaPerFrameSamples?: number;
  /** Sub-pixel jitter pattern.
   *  - 'bluenoise': stochastic — fresh blue-noise tap per sub-sample,
   *    decorrelated across frames. Converges in expectation; the TSAA
   *    accumulator visibly shimmers en route.
   *  - 'grid' (default): deterministic √gridSize × √gridSize lattice.
   *    K cells visited per frame, cycled so a full round covers every
   *    cell once. Round 0 is centre-of-cell (matches a single-frame
   *    K=gridSize grid). Round 1+ pulls a deterministic blue-noise
   *    sub-cell offset (one tap per round, walked through the texture
   *    by R2 steps) — same offset for every pixel at a given round so
   *    the image jitters in unison without per-pixel shimmer. */
  tsaaJitterMode?: 'bluenoise' | 'grid';
  /** Grid-mode lattice cell count. Should be a perfect square (4, 9,
   *  16, 25). Default 16 = 4×4. Combined with tsaaPerFrameSamples
   *  this defines the round length in frames. */
  tsaaGridSize?: number;

  /** When true, the Julia kernel runs the perturbation path against the
   *  uploaded reference orbit (see `setReferenceOrbit`) instead of the
   *  standard f32 iteration. Mandelbrot kind + power 2 only — other
   *  configs silently fall back to the standard path. Costs nothing
   *  when off (the shader's deep branch is dead-stripped past its
   *  guard). Driven by the DeepZoomFeature DDFS slice. */
  deepZoomEnabled: boolean;
}

interface FBO {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texel: [number, number];
}

/** Framebuffer with two colour attachments for the Julia MRT pass.
 *  texMain holds raw iteration data (z, smoothIter, escaped) and
 *  texAux holds the colour-mapping accumulators (orbit-trap min,
 *  stripe avg, log|dz|, trap-iter-norm). Both are raw-averaged
 *  across the K sub-samples in the Julia shader's main(); the TSAA
 *  blend pass progressively averages them across frames. Downstream
 *  passes (display gradient, collision mask, dye inject) read either
 *  the live frame (juliaCur) or the accumulator (juliaTsaa) and
 *  apply their own gradient/mask logic. */
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
  centerLow: [0, 0],
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
  refractRoughness: 0.0,
  caustics: 1,
  interiorColor: [0.02, 0.02, 0.04],
  edgeMargin: 0.04,
  forceCap: 40,
  collisionEnabled: false,
  collisionPreview: false,
  collisionRepeat: 1.0,
  collisionPhase: 0.0,
  paused: false,
  tsaa: true,
  tsaaJitterAmount: 1.0,
  tsaaSampleCap: 64,
  // K=1 per frame: TSAA does ALL the convergence progressively across
  // frames instead of bursting K samples into one frame. Each frame
  // adds one jittered sample to the running average, so the image
  // refines visibly over ~256 frames (≈4s at 60fps). Per-frame cost
  // is 1/4 of K=4, which gives the user 4× the interactive frame rate
  // and a smoother visual ramp on idle convergence. The 4×4 grid +
  // blue-noise sub-offset jitter pattern still cycles through 16
  // cells × N rounds, yielding the same quality at sampleCap as a
  // K=N grid would.
  tsaaPerFrameSamples: 1,
  tsaaGridSize: 16,
  tsaaJitterMode: 'grid',
  deepZoomEnabled: false,
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
  private progCopy!: Program;
  private progCopyMrt!: Program;
  private progReproject!: Program;
  private progBloomExtract!: Program;
  private progBloomDown!: Program;
  private progBloomUp!: Program;
  private progMask!: Program;
  private progTsaaBlend!: Program;

  /** TSAA history ping-pong. juliaTsaa is the current accumulator; the
   *  blend pass reads it + juliaCur and writes juliaTsaaPrev (which we
   *  then swap). Composite reads juliaTsaa — the averaged image. */
  private juliaTsaa!: MrtFbo;
  private juliaTsaaPrev!: MrtFbo;
  /** 1-based sample index since last reset. When 1, the blend overwrites
   *  history with the current frame; when N, mixes 1/N current with
   *  (N-1)/N history. Clamped at params.tsaaSampleCap. */
  private tsaaSampleIndex = 0;
  /** Hash of every param that affects the Julia output. When it changes,
   *  tsaaSampleIndex resets. Compared stringified each step — cheap. */
  private tsaaParamHash = '';
  /** Blue-noise texture for sub-pixel jitter. Shared generic loader. */
  private blueNoise: BlueNoiseTexture | null = null;

  /** Reference-orbit texture for the deep-zoom path. Created lazily on
   *  first `setReferenceOrbit` call; reused across uploads (re-allocates
   *  only when the row count changes). RGBA32F, NEAREST filtering. */
  private refOrbitTex: WebGLTexture | null = null;
  private refOrbitTexW = 2048;
  private refOrbitTexH = 0;
  private refOrbitLen = 0;
  /** Centre the orbit was BUILT for. The shader receives
   *  `params.center − refOrbitCenter` so pan/zoom gestures that move
   *  `params.center` between rebuilds stay aligned (within validity). */
  private refOrbitCenter: [number, number] = [0, 0];
  /** Sub-f64 residual paired with refOrbitCenter — captured at orbit
   *  upload time. The shader's offset is computed as a double-double
   *  subtraction (paramCenter+paramLow) − (refCenter+refLow) so pan
   *  increments past f64's ~16-digit mantissa floor are preserved. */
  private refOrbitCenterLow: [number, number] = [0, 0];
  /** Bumped each upload — fed into the TSAA paramHash so an orbit swap
   *  resets the accumulator (the underlying iteration just changed). */
  private refOrbitVersion = 0;

  /** LA table textures + metadata. Each LA node packs into 3 RGBA32F
   *  texels (12 floats); see fluid/shaders.ts uLATable layout. */
  private laTableTex: WebGLTexture | null = null;
  private laTableTexW = 1024;  // multiple of 3 keeps node packing row-aligned... actually any width works
  private laTableTexH = 0;
  private laTotalCount = 0;
  private laStages: Float32Array = new Float32Array(0);  // pairs of [laIndex, macroItCount]
  private laStageCount = 0;
  private laEnabled = false;
  /** Forces all fluid sim passes (motion, advect, pressure, etc.) to
   *  skip — independent of `params.paused`. Used by the deep-zoom
   *  panel's "Disable fluid sim" toggle to A/B-test render perf with
   *  the fluid pipeline out of the picture. The fractal pass still
   *  runs so TSAA can converge. */
  private forceFluidPaused = false;

  /** AT (Approximation Terms) front-load — packed scalars + complex
   *  coefficients. Null when no usable AT is available for the current
   *  view (e.g. shallow zoom where dc exceeds every stage's threshold).
   *  Phase 7 + the f32 deep path. */
  private atPayload: {
    stepLength: number;
    thresholdC: number;
    sqrEscapeRadius: number;
    refC: [number, number];
    ccoeff: [number, number];
    invZCoeff: [number, number];
  } | null = null;
  /** Frame counter — advances every step. Feeds shader uFrameCount for
   *  blue-noise temporal animation. */
  private frameCount = 0;

  /** GPU timer-query state — measures actual Julia-pass GPU time.
   *  EXT_disjoint_timer_query_webgl2 is available on most desktop
   *  WebGL2 contexts; null when the extension isn't exposed (e.g.
   *  some mobile drivers, or when the privacy-conscious extension
   *  blocklist hides it). Async by design: a query issued this
   *  frame becomes readable a few frames later. */
  private timerExt: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null;
  /** Ring buffer of in-flight queries — a length-3 ring is enough to
   *  cover the typical 1-2 frame async result delay. */
  private juliaTimerQueries: (WebGLQuery | null)[] = [null, null, null];
  private juliaTimerInFlight: boolean[] = [false, false, false];
  private juliaTimerCursor = 0;
  /** Most recent completed measurement — milliseconds for one Julia
   *  pass. EWMA-smoothed so the diagnostics readout doesn't flicker. */
  private juliaMsEwma = 0;
  /** Set true when a timer query is open between begin/end. Avoids
   *  nested begins (which would trip a WebGL error). */
  private juliaTimerOpen = false;

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

  /** The sim/fractal grid AND the canvas drawing buffer share these
   *  dimensions — there is one render resolution. The app drives it via
   *  `setRenderSize(w, h)`, which is computed from window/fixed dims ×
   *  user `renderScale` × adaptive `qualityFraction`. Resolution changes
   *  bilinearly reproject `dye`, `velocity`, and `juliaTsaa` so dye and
   *  in-flight accumulation survive the resize. */
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

  // ── CPU-side copy of the collision mask ────────────────────────────
  // Downsample of maskTex into a small RGBA8 FBO, then readPixels
  // into a Uint8Array each frame. Exposed via sampleMask(u,v) so the
  // CPU brush / particle code can test for walls and bounce off them
  // without a GPU readback per particle. Size chosen to balance
  // spatial resolution vs readback cost (64K bytes/frame @ 128×128).
  private maskReadFBO: FBO | null = null;
  private maskCpuBuf = new Uint8Array(0);
  private readonly MASK_CPU_W = 128;
  private readonly MASK_CPU_H = 128;

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

    // GPU timer queries for the Julia pass. Optional — if the
    // extension isn't available, getJuliaMs() returns 0 and the
    // diagnostics overlay just hides the line.
    const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as
      | { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }
      | null;
    if (timerExt) {
      this.timerExt = timerExt;
      for (let i = 0; i < this.juliaTimerQueries.length; i++) {
        this.juliaTimerQueries[i] = gl.createQuery();
      }
    }

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
    // Boot at a tiny placeholder grid; the app pushes a real
    // setRenderSize() on its first ResizeObserver callback. The
    // placeholder still needs valid FBOs so any frame() that lands
    // before the first resize doesn't NPE on juliaCur/dye/etc.
    this.allocateAt(64, 64);

    // TSAA blue noise — shared loader (engine/utils/createBlueNoiseWebGL2).
    // Async, returns a 1×1 neutral fallback until PNG decodes.
    this.blueNoise = createBlueNoiseWebGL2(gl);

    // Note: we deliberately DO NOT subscribe to the generic RESET_ACCUM
    // event here. createFeatureSlice emits reset_accum on every param
    // setter (brush, fluidSim, postFx, …) — but only Julia-affecting
    // params should reset the Julia accumulator. The narrow check
    // lives in updateTsaaHash() which inspects the actual fractal
    // parameters; that's the sole authority for restarts here.
    // resize() resets directly when the FBO is rebuilt.
    // (renderControlSlice toggles like aaMode / accumulation that DO
    // legitimately affect the accumulator are reflected through
    // setParams({tsaa, tsaaSampleCap}) from FluidToyApp's render-
    // control useEffect — a tsaa-flag flip flows naturally through
    // the hash on the next frame.)
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
       'uColorIter', 'uTrapMode', 'uTrapCenter', 'uTrapRadius', 'uTrapNormal', 'uTrapOffset', 'uStripeFreq',
       'uJitterScale', 'uResolution', 'uBlueNoiseTexture', 'uBlueNoiseResolution', 'uFrameCount', 'uPerFrameSamples', 'uJitterMode', 'uGridSize', 'uTsaaSampleIndex',
       'uDeepZoomEnabled', 'uRefOrbit', 'uRefOrbitTexW', 'uRefOrbitLen', 'uDeepCenterOffset', 'uDeepScale',
       'uLATable', 'uLATexW', 'uLATotalCount', 'uLAEnabled', 'uLAStages[0]', 'uLAStageCount',
       'uATEnabled', 'uATStepLength', 'uATThresholdC', 'uATSqrEscapeRadius',
       'uATRefC', 'uATCCoeff', 'uATInvZCoeff',
       'uTrackAccum', 'uTrackDeriv']);
    this.progTsaaBlend = this.linkProgram(VERT_FULLSCREEN, FRAG_TSAA_BLEND,
      ['uCurrentMain', 'uCurrentAux', 'uHistoryMain', 'uHistoryAux', 'uSampleIndex']);
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
      ['uTexel', 'uTarget', 'uPoint', 'uValue', 'uRadius', 'uDiscR', 'uHardness', 'uAspect', 'uOp']);
    this.progDisplay = this.linkProgram(VERT_FULLSCREEN, FRAG_DISPLAY,
      ['uTexel', 'uTexelDisplay', 'uTexelDye', 'uJulia', 'uJuliaAux', 'uDye', 'uVelocity', 'uGradient', 'uBloom', 'uMask',
       'uShowMode', 'uJuliaMix', 'uDyeMix', 'uVelocityViz',
       'uColorMapping', 'uGradientRepeat', 'uGradientPhase', 'uInteriorColor',
       'uToneMapping', 'uExposure', 'uVibrance', 'uBloomAmount', 'uAberration', 'uRefraction', 'uRefractSmooth', 'uRefractRoughness', 'uCaustics',
       'uCollisionPreview']);
    this.progClear = this.linkProgram(VERT_FULLSCREEN, FRAG_CLEAR, ['uValue']);
    this.progCopy    = this.linkProgram(VERT_FULLSCREEN, FRAG_COPY,     ['uSource']);
    this.progCopyMrt = this.linkProgram(VERT_FULLSCREEN, FRAG_COPY_MRT, ['uSourceMain', 'uSourceAux']);
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
       'uCollisionRepeat', 'uCollisionPhase',
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

  /** First-time allocation of all FBOs at the given size. Used at boot
   *  before any resize has landed. Subsequent dim changes go through
   *  `setRenderSize` → `reallocateAt` which preserves dye + accumulation. */
  private allocateAt(w: number, h: number) {
    this.simW = w;
    this.simH = h;
    this.juliaCur     = this.createMrtFbo(w, h);
    this.juliaPrev    = this.createMrtFbo(w, h);
    this.juliaTsaa    = this.createMrtFbo(w, h);
    this.juliaTsaaPrev = this.createMrtFbo(w, h);
    this.tsaaSampleIndex = 0;
    this.forceTex   = this.createFBO(w, h);
    this.velocity   = this.createDoubleFBO(w, h);
    this.dye        = this.createDoubleFBO(w, h);
    this.divergence = this.createFBO(w, h);
    this.pressure   = this.createDoubleFBO(w, h);
    this.curl       = this.createFBO(w, h);
    this.maskTex    = this.createFBO(w, h);
    this.firstFrame = true;
  }

  /** Resolution change. Bilinear-blits the surviving content (dye,
   *  velocity, juliaTsaa) from the old FBOs into freshly-allocated FBOs
   *  at the new size, then frees the old. tsaaSampleIndex is preserved
   *  — the reprojected accumulator is approximately the right average,
   *  so accumulation can continue without a visible reset.
   *
   *  Ephemeral FBOs (juliaCur, juliaPrev, forceTex, divergence,
   *  pressure, curl, maskTex) are recomputed each frame, so we just
   *  reallocate them empty. */
  private reallocateAt(w: number, h: number) {
    if (w === this.simW && h === this.simH && this.juliaCur) return;

    const oldDyeRead = this.dye?.read;
    const oldVelRead = this.velocity?.read;
    const oldTsaa    = this.juliaTsaa;

    // Allocate new FBOs at the new size.
    const newDye      = this.createDoubleFBO(w, h);
    const newVel      = this.createDoubleFBO(w, h);
    const newTsaa     = this.createMrtFbo(w, h);
    const newTsaaPrev = this.createMrtFbo(w, h);

    // Bilinear-blit preserved content into the new FBOs' read targets.
    // The TSAA accumulator survives so partial accumulation continues
    // without a full reset on every render-scale step.
    if (oldDyeRead) this.blitInto(oldDyeRead, newDye.read);
    if (oldVelRead) this.blitInto(oldVelRead, newVel.read);
    if (oldTsaa)    this.blitMrtInto(oldTsaa, newTsaa);

    // Free old.
    this.deleteDoubleFBO(this.dye);
    this.deleteDoubleFBO(this.velocity);
    this.deleteMrtFbo(this.juliaTsaa);
    this.deleteMrtFbo(this.juliaTsaaPrev);
    this.deleteMrtFbo(this.juliaCur);
    this.deleteMrtFbo(this.juliaPrev);
    this.deleteFBO(this.forceTex);
    this.deleteFBO(this.divergence);
    this.deleteDoubleFBO(this.pressure);
    this.deleteFBO(this.curl);
    this.deleteFBO(this.maskTex);

    this.simW = w;
    this.simH = h;

    this.dye           = newDye;
    this.velocity      = newVel;
    this.juliaTsaa     = newTsaa;
    this.juliaTsaaPrev = newTsaaPrev;
    this.juliaCur      = this.createMrtFbo(w, h);
    this.juliaPrev     = this.createMrtFbo(w, h);
    this.forceTex      = this.createFBO(w, h);
    this.divergence    = this.createFBO(w, h);
    this.pressure      = this.createDoubleFBO(w, h);
    this.curl          = this.createFBO(w, h);
    this.maskTex       = this.createFBO(w, h);
    // The bilinear blits above already populated dye + velocity at the
    // new resolution, so there's no need to skip the camera-reproject
    // pass. Mark firstFrame anyway so the next frame doesn't try to
    // reproject from a now-stale lastCenter/lastZoom (those refer to the
    // pre-resize FBO).
    this.firstFrame = true;
  }

  /** Bilinear-blit `src` into `dst` (different sizes OK). Source min/mag
   *  filters are forced to LINEAR so the resampled buffer stays smooth. */
  private blitInto(src: FBO, dst: FBO) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.width, dst.height);
    this.useProgram(this.progCopy);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(this.progCopy.uniforms['uSource'], 0);
    this.drawQuad();
  }

  /** MRT variant — copies texMain + texAux of `src` into `dst` in
   *  lockstep. juliaTsaa stores both the colour accumulator and the
   *  iteration/aux data; both must follow the resize. */
  private blitMrtInto(src: MrtFbo, dst: MrtFbo) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.width, dst.height);
    this.useProgram(this.progCopyMrt);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texMain);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(this.progCopyMrt.uniforms['uSourceMain'], 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, src.texAux);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(this.progCopyMrt.uniforms['uSourceAux'], 1);
    this.drawQuad();
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
  }

  /** Current TSAA accumulation depth (0 = freshly reset, == tsaaSampleCap = converged).
   *  Surfaced so the app can report it back into the engine-core
   *  renderControlSlice (`reportAccumulation`) for the Pause popover readout. */
  getAccumulationCount(): number { return this.tsaaSampleIndex; }

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

  /** Set the render dimensions — sim/fractal grid AND canvas drawing
   *  buffer at the same size, no DPR multiplication or aspect drift.
   *  Resolution changes bilinearly reproject dye, velocity, and the
   *  TSAA accumulator so dye state and accumulation survive the resize.
   *  Bloom FBOs invalidate (they're canvas-sized).
   *
   *  The app computes (w, h) from `baseW × baseH × renderScale ×
   *  qualityFraction` where the base is window CSS in Full mode or
   *  `fixedResolution` in Fixed mode. */
  setRenderSize(w: number, h: number) {
    w = Math.max(32, Math.round(w));
    h = Math.max(32, Math.round(h));
    if (w === this.simW && h === this.simH && this.canvas.width === w && this.canvas.height === h) {
      return;
    }
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.bloomDirty = true;
    }
    this.reallocateAt(w, h);
  }

  /** Re-blit the existing `juliaTsaa` + sim state to the canvas without
   *  advancing the simulation. Use after a `setRenderSize` to repaint
   *  before the compositor reads the empty drawing buffer (suppresses
   *  the black flash). Cheaper than a full `frame()` — skips the fluid
   *  sim step + the mask GPU→CPU readback. */
  redraw() {
    this.displayToScreen();
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
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
   * Inject a gaussian/disc splat into a ping-pong field and advance the swap.
   * `sizeUv` is the visual radius of the brush in UV space.
   * `hardness` blends between soft gaussian (0) and hard disc (1).
   * `op` selects add / sub (eraser).
   *
   * Soft-mode needs sigma² ≈ (0.5·r)² so the 1-stddev ring lines up with
   * the user-visible brush ring.
   */
  private splat(
    target: DoubleFBO,
    u: number, v: number,
    value: [number, number, number],
    sizeUv: number,
    hardness: number,
    op: 'add' | 'sub',
  ) {
    const gl = this.gl;
    this.bindFBO(target.write);
    this.useProgram(this.progSplat);
    this.bindTex(0, target.read.tex, this.progSplat.uniforms['uTarget']);
    gl.uniform2f(this.progSplat.uniforms['uPoint'], u, v);
    gl.uniform3f(this.progSplat.uniforms['uValue'], value[0], value[1], value[2]);
    gl.uniform1f(this.progSplat.uniforms['uRadius'], Math.max(1e-6, (sizeUv * 0.5) * (sizeUv * 0.5)));
    gl.uniform1f(this.progSplat.uniforms['uDiscR'], Math.max(1e-6, sizeUv));
    gl.uniform1f(this.progSplat.uniforms['uHardness'], hardness);
    gl.uniform1f(this.progSplat.uniforms['uAspect'], this.simW / this.simH);
    gl.uniform1f(this.progSplat.uniforms['uOp'], op === 'sub' ? 1 : 0);
    this.drawQuad();
    target.swap();
  }

  /**
   * Artist brush — single atomic splat respecting the current brush mode.
   *   mode='paint'  → dye + drag-velocity
   *   mode='erase'  → subtract dye
   *   mode='stamp'  → dye only
   *   mode='smudge' → velocity only
   *
   * `color` is the already-resolved RGB (the caller's brush/color.ts
   * turns brushColorMode + gradient/solid/rainbow + hue jitter into RGB).
   * `strength` is the dye-amount multiplier (0 = dry brush, 3 = saturated).
   */
  brush(
    u: number, v: number,
    velX: number, velY: number,
    color: [number, number, number],
    sizeUv: number,
    hardness: number,
    strength: number,
    mode: 'paint' | 'erase' | 'stamp' | 'smudge',
  ) {
    u = Math.max(0, Math.min(1, u));
    v = Math.max(0, Math.min(1, v));
    const dye: [number, number, number] = [color[0] * strength, color[1] * strength, color[2] * strength];
    const vel: [number, number, number] = [velX, velY, 0];
    switch (mode) {
      case 'paint':
        this.splat(this.velocity, u, v, vel, sizeUv, hardness, 'add');
        this.splat(this.dye,      u, v, dye, sizeUv, hardness, 'add');
        break;
      case 'erase':
        this.splat(this.dye,      u, v, [strength, strength, strength], sizeUv, hardness, 'sub');
        break;
      case 'stamp':
        this.splat(this.dye,      u, v, dye, sizeUv, hardness, 'add');
        break;
      case 'smudge':
        this.splat(this.velocity, u, v, vel, sizeUv, hardness, 'add');
        break;
    }
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  // ---------------------------- Collision mask CPU readback ----------------
  //
  // `maskTex` lives on the GPU at sim resolution (RGBA16F). For particle
  // bounce we need per-particle wall lookups, which would be a pipeline
  // stall if read one pixel at a time. So each frame we:
  //   1. Blit maskTex → maskReadFBO (128×128, RGBA8) with LINEAR filtering
  //      — WebGL2 blitFramebuffer handles the format conversion.
  //   2. readPixels into `maskCpuBuf` — one round-trip, ~64 KB.
  // Then CPU callers hit sampleMask(u,v) without touching the GPU.

  private ensureMaskReadFBO() {
    if (this.maskReadFBO) return;
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.MASK_CPU_W, this.MASK_CPU_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.maskReadFBO = {
      tex, fbo,
      width: this.MASK_CPU_W, height: this.MASK_CPU_H,
      texel: [1 / this.MASK_CPU_W, 1 / this.MASK_CPU_H],
    };
    this.maskCpuBuf = new Uint8Array(this.MASK_CPU_W * this.MASK_CPU_H * 4);
  }

  /** Refresh the CPU-side copy of the mask. Call once per frame after
   *  computeMask has written fresh mask data. No-op when collision is
   *  disabled — sampleMask() guards independently so no CPU buffer
   *  allocation is needed until walls are actually on. */
  private readMaskToCPU() {
    // Fast path: collision off → skip entirely. Avoids allocating the
    // readback FBO and CPU buffer until the first time walls turn on,
    // which also means no readPixels stall on apps that never use
    // collision. readPixels every frame is expensive enough to trigger
    // Chromium's GPU-process watchdog on long WebGL sessions.
    if (!this.params.collisionEnabled) return;
    const gl = this.gl;
    this.ensureMaskReadFBO();
    // Blit maskTex (RGBA16F, simW×simH) → maskReadFBO (RGBA8, 128×128).
    // LINEAR sampling gives a sensible downsample (a bilinear average,
    // not nearest-neighbour holes).
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.maskTex.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.maskReadFBO!.fbo);
    gl.blitFramebuffer(
      0, 0, this.simW, this.simH,
      0, 0, this.MASK_CPU_W, this.MASK_CPU_H,
      gl.COLOR_BUFFER_BIT, gl.LINEAR,
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskReadFBO!.fbo);
    gl.readPixels(0, 0, this.MASK_CPU_W, this.MASK_CPU_H, gl.RGBA, gl.UNSIGNED_BYTE, this.maskCpuBuf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Public: sample the collision mask at UV (0..1) as 0..1 (1 = solid wall).
   * Uses nearest-neighbour on the 128×128 CPU copy — good enough for
   * particle-bounce queries, and cheap (one array index per call).
   *
   * Always returns 0 when collision is disabled, so callers can invoke
   * unconditionally without a collisionEnabled check.
   */
  sampleMask(u: number, v: number): number {
    if (!this.params.collisionEnabled) return 0;
    // Buffer hasn't been allocated yet — collision just turned on and
    // readMaskToCPU hasn't run yet. Return 0 (fluid) so particles
    // don't false-bounce on the first frame.
    if (this.maskCpuBuf.length === 0) return 0;
    const W = this.MASK_CPU_W;
    const H = this.MASK_CPU_H;
    if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const x = Math.min(W - 1, Math.max(0, Math.floor(u * W)));
    const y = Math.min(H - 1, Math.max(0, Math.floor(v * H)));
    return this.maskCpuBuf[(y * W + x) * 4] / 255;
  }

  // ---------------------------- Per-frame passes ----------------------------

  private renderJulia() {
    const gl = this.gl;

    // Short-circuit: when TSAA has converged AND no consumer needs a
    // fresh juliaCur this frame (sim is paused), skip the entire
    // Julia pass. The display reads juliaTsaa (already converged), so
    // re-running the kernel produces identical output and burns GPU
    // time for nothing. Active when the user has pause + accumulation
    // enabled — typical "settled deep-zoom view" mode.
    //
    // Fluid sim consumes juliaCur via the motion shader, so we only
    // skip when the sim isn't running (params.paused OR
    // forceFluidPaused). updateTsaaHash() resets tsaaSampleIndex on
    // any param change, which puts us back into "still rendering"
    // mode automatically.
    const tsaaCap = this.params.tsaaSampleCap;
    const fluidActive = !this.params.paused && !this.forceFluidPaused;
    if (
      this.params.tsaa &&
      tsaaCap > 0 &&
      this.tsaaSampleIndex >= tsaaCap &&
      !fluidActive
    ) {
      return;
    }

    // Swap: current becomes previous
    const t = this.juliaCur;
    this.juliaCur = this.juliaPrev;
    this.juliaPrev = t;

    // Begin a GPU timer query for this Julia pass. The query result
    // becomes available a few frames later (async); we poll
    // pollJuliaTimer() each frame to drain completed queries into
    // juliaMsEwma. Skip when extension is missing or when the previous
    // query at this slot hasn't completed yet (avoids overwriting
    // pending results).
    if (this.timerExt && !this.juliaTimerOpen) {
      const slot = this.juliaTimerQueries[this.juliaTimerCursor];
      if (slot && !this.juliaTimerInFlight[this.juliaTimerCursor]) {
        gl.beginQuery(this.timerExt.TIME_ELAPSED_EXT, slot);
        this.juliaTimerOpen = true;
        this.juliaTimerInFlight[this.juliaTimerCursor] = true;
      }
    }

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
    // Gate the per-iter trap/stripe accumulator + dz/dc tracker on
    // whether the active palette actually reads them. Saves ~35 ops
    // per iter for the common smoothI / iter-based modes.
    gl.uniform1i(this.progJulia.uniforms['uTrackAccum'], colorMappingNeedsAccum(this.params.colorMapping) ? 1 : 0);
    gl.uniform1i(this.progJulia.uniforms['uTrackDeriv'], colorMappingNeedsDeriv(this.params.colorMapping) ? 1 : 0);
    gl.uniform2f(this.progJulia.uniforms['uTrapCenter'], this.params.trapCenter[0], this.params.trapCenter[1]);
    gl.uniform1f(this.progJulia.uniforms['uTrapRadius'], this.params.trapRadius);
    gl.uniform2f(this.progJulia.uniforms['uTrapNormal'], this.params.trapNormal[0], this.params.trapNormal[1]);
    gl.uniform1f(this.progJulia.uniforms['uTrapOffset'], this.params.trapOffset);
    gl.uniform1f(this.progJulia.uniforms['uStripeFreq'], this.params.stripeFreq);

    // TSAA: push jitter scale + blue-noise texture. When tsaa is off or
    // jitter has converged to the sample cap, uJitterScale drops to 0 so
    // the iteration runs at exact pixel centers (no wobble).
    // tsaaSampleCap === 0 means infinite — never converged.
    const cap = this.params.tsaaSampleCap;
    const jitterActive = this.params.tsaa && (cap <= 0 || this.tsaaSampleIndex < cap);
    const jitterScale = jitterActive ? this.params.tsaaJitterAmount : 0.0;
    gl.uniform1f(this.progJulia.uniforms['uJitterScale'], jitterScale);
    gl.uniform2f(this.progJulia.uniforms['uResolution'], this.simW, this.simH);
    gl.uniform1i(this.progJulia.uniforms['uFrameCount'], this.frameCount);
    gl.uniform1i(this.progJulia.uniforms['uPerFrameSamples'], this.params.tsaaPerFrameSamples ?? 1);
    gl.uniform1i(this.progJulia.uniforms['uJitterMode'], this.params.tsaaJitterMode === 'grid' ? 1 : 0);
    gl.uniform1i(this.progJulia.uniforms['uGridSize'], this.params.tsaaGridSize ?? 16);
    // tsaaSampleIndex is the count of accumulator blends so far —
    // increments AFTER renderJulia in runTsaaBlend, so we send the
    // current value as "how many frames have already been accumulated"
    // = the new frame's index in the round (0-based).
    gl.uniform1i(this.progJulia.uniforms['uTsaaSampleIndex'], this.tsaaSampleIndex);
    if (this.blueNoise) {
        this.bindTex(5, this.blueNoise.texture, this.progJulia.uniforms['uBlueNoiseTexture']);
        const [bnw, bnh] = this.blueNoise.getResolution();
        gl.uniform2f(this.progJulia.uniforms['uBlueNoiseResolution'], bnw, bnh);
    }

    // Deep-zoom uniforms. Bind ANY valid texture to uRefOrbit even when
    // disabled — leaving sampler2D unbound trips Chrome/Firefox driver
    // warnings about incomplete textures. The shader gates on the
    // enabled flag and never samples when off, so it's a unit-6 stub.
    const deepActive = this.params.deepZoomEnabled && this.refOrbitTex !== null && this.refOrbitLen > 1;
    gl.uniform1i(this.progJulia.uniforms['uDeepZoomEnabled'], deepActive ? 1 : 0);
    gl.uniform1i(this.progJulia.uniforms['uRefOrbitTexW'], this.refOrbitTexW);
    gl.uniform1i(this.progJulia.uniforms['uRefOrbitLen'], this.refOrbitLen);
    // HDR-pack the deep-zoom uniforms. Plain f32 uniforms underflow
    // below ~1e-38; the shader's HDR path needs the exponent preserved.
    // Performed every frame (cheap: a few log2 calls) so gesture
    // updates to params.center / zoom are reflected without
    // re-uploading the orbit.
    //
    // The centre offset is a double-double subtraction:
    //   off = (paramCenter + paramLow) − (refCenter + refLow)
    // so pan increments below f64's mantissa floor (~1e-16 near a
    // value of magnitude ~1) survive the difference. Without this
    // step, pans at zoom <1e-15 quantise: each pixel move becomes
    // smaller than f64 can resolve relative to the centre value.
    const ddOffX = ddSub(
      this.params.center[0],    this.params.centerLow[0],
      this.refOrbitCenter[0],   this.refOrbitCenterLow[0],
    );
    const ddOffY = ddSub(
      this.params.center[1],    this.params.centerLow[1],
      this.refOrbitCenter[1],   this.refOrbitCenterLow[1],
    );
    // Collapse the DD pair to a single f64 by summing — the lo bits
    // only matter for the SUBTRACTION (cancellation removes hi bits,
    // exposing lo). Once collapsed the result is a regular f64 small
    // enough to fit, packed via HDR for shader use.
    const offX = ddOffX[0] + ddOffX[1];
    const offY = ddOffY[0] + ddOffY[1];
    const offXHdr = f64ToHDRTuple(offX);
    const offYHdr = f64ToHDRTuple(offY);
    gl.uniform4f(this.progJulia.uniforms['uDeepCenterOffset'],
        offXHdr[0], offXHdr[1], offYHdr[0], offYHdr[1]);
    const zoomHdr = f64ToHDRTuple(this.params.zoom);
    gl.uniform2f(this.progJulia.uniforms['uDeepScale'], zoomHdr[0], zoomHdr[1]);
    if (this.refOrbitTex) {
        this.bindTex(6, this.refOrbitTex, this.progJulia.uniforms['uRefOrbit']);
    } else if (this.blueNoise) {
        // Stub binding — shader never samples it (gate is off), but
        // keeping the unit populated avoids "no texture bound to active
        // sampler" warnings from the driver.
        this.bindTex(6, this.blueNoise.texture, this.progJulia.uniforms['uRefOrbit']);
    }

    // LA table: bound on unit 7. Same fallback-to-blueNoise stub when
    // unset to keep the sampler valid.
    const laActive = deepActive && this.laEnabled && this.laTableTex !== null && this.laTotalCount > 1;
    gl.uniform1i(this.progJulia.uniforms['uLAEnabled'], laActive ? 1 : 0);
    gl.uniform1i(this.progJulia.uniforms['uLATexW'], this.laTableTexW);
    gl.uniform1i(this.progJulia.uniforms['uLATotalCount'], this.laTotalCount);
    gl.uniform1i(this.progJulia.uniforms['uLAStageCount'], this.laStageCount);
    if (this.laStageCount > 0) {
        // Pack stages as vec4(laIndex, macroItCount, 0, 0). Stage cap
        // matches the shader's 64-slot uniform array.
        const cap = Math.min(this.laStageCount, 64);
        const stagePack = new Float32Array(cap * 4);
        for (let i = 0; i < cap; i++) {
            stagePack[i * 4 + 0] = this.laStages[i * 2 + 0];
            stagePack[i * 4 + 1] = this.laStages[i * 2 + 1];
        }
        gl.uniform4fv(this.progJulia.uniforms['uLAStages[0]'], stagePack);
    }
    if (this.laTableTex) {
        this.bindTex(7, this.laTableTex, this.progJulia.uniforms['uLATable']);
    } else if (this.blueNoise) {
        this.bindTex(7, this.blueNoise.texture, this.progJulia.uniforms['uLATable']);
    }

    // AT (Approximation Terms): plain-f32 fast-forward over the front
    // of the iteration. Active only when the worker found a usable
    // stage for the current view radius and deep zoom is on.
    const atActive = deepActive && this.atPayload !== null;
    gl.uniform1i(this.progJulia.uniforms['uATEnabled'], atActive ? 1 : 0);
    if (this.atPayload) {
        gl.uniform1i(this.progJulia.uniforms['uATStepLength'], this.atPayload.stepLength);
        gl.uniform1f(this.progJulia.uniforms['uATThresholdC'], this.atPayload.thresholdC);
        gl.uniform1f(this.progJulia.uniforms['uATSqrEscapeRadius'], this.atPayload.sqrEscapeRadius);
        gl.uniform2f(this.progJulia.uniforms['uATRefC'], this.atPayload.refC[0], this.atPayload.refC[1]);
        gl.uniform2f(this.progJulia.uniforms['uATCCoeff'], this.atPayload.ccoeff[0], this.atPayload.ccoeff[1]);
        gl.uniform2f(this.progJulia.uniforms['uATInvZCoeff'], this.atPayload.invZCoeff[0], this.atPayload.invZCoeff[1]);
    } else {
        // Inert default values — shader gates on uATEnabled and never
        // reads these, but keeping them stable avoids any chance of
        // NaN propagation on a stale shader state.
        gl.uniform1i(this.progJulia.uniforms['uATStepLength'], 1);
        gl.uniform1f(this.progJulia.uniforms['uATThresholdC'], 0);
        gl.uniform1f(this.progJulia.uniforms['uATSqrEscapeRadius'], 4);
        gl.uniform2f(this.progJulia.uniforms['uATRefC'], 0, 0);
        gl.uniform2f(this.progJulia.uniforms['uATCCoeff'], 1, 0);
        gl.uniform2f(this.progJulia.uniforms['uATInvZCoeff'], 1, 0);
    }

    this.drawQuad();

    // Close the timer query if we opened one above. The result is
    // polled separately via pollJuliaTimer() each frame.
    if (this.timerExt && this.juliaTimerOpen) {
      gl.endQuery(this.timerExt.TIME_ELAPSED_EXT);
      this.juliaTimerCursor = (this.juliaTimerCursor + 1) % this.juliaTimerQueries.length;
      this.juliaTimerOpen = false;
    }
  }

  /** Drain any completed Julia timer queries. Call once per frame
   *  (after rendering) to update juliaMsEwma. Cheap when no queries
   *  are ready — just polls QUERY_RESULT_AVAILABLE. */
  pollJuliaTimer(): void {
    if (!this.timerExt) return;
    const gl = this.gl;
    // GPU_DISJOINT_EXT signals a timing-disjoint event (e.g. GPU
    // throttled). Discard all in-flight queries when it fires.
    const disjoint = gl.getParameter(this.timerExt.GPU_DISJOINT_EXT);
    if (disjoint) {
      for (let i = 0; i < this.juliaTimerInFlight.length; i++) {
        this.juliaTimerInFlight[i] = false;
      }
      return;
    }
    for (let i = 0; i < this.juliaTimerQueries.length; i++) {
      if (!this.juliaTimerInFlight[i]) continue;
      const q = this.juliaTimerQueries[i];
      if (!q) continue;
      const ready = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) as boolean;
      if (!ready) continue;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      const ms = ns / 1e6;
      // EWMA with α = 0.2 — smooths but tracks a workload change in
      // ~10 frames. Initialise on first sample.
      this.juliaMsEwma = this.juliaMsEwma === 0 ? ms : (this.juliaMsEwma * 0.8 + ms * 0.2);
      this.juliaTimerInFlight[i] = false;
    }
  }

  /** Latest smoothed Julia-pass GPU time in ms (0 if timer extension
   *  unavailable or no measurement yet). Surfaced in the deep-zoom
   *  diagnostics overlay for A/B testing toggles. */
  getJuliaMs(): number {
    return this.juliaMsEwma;
  }

  /** True when the GPU timer extension is available. */
  hasGpuTimer(): boolean {
    return this.timerExt !== null;
  }

  setAT(payload: {
    stepLength: number;
    thresholdC: number;
    sqrEscapeRadius: number;
    refC: [number, number];
    ccoeff: [number, number];
    invZCoeff: [number, number];
  }): void {
    this.atPayload = payload;
    this.refOrbitVersion++;
  }

  clearAT(): void {
    if (this.atPayload !== null) {
      this.atPayload = null;
      this.refOrbitVersion++;
    }
  }

  /** Upload a packed LA table (3 RGBA32F texels per node, layout from
   *  packLATable in deepZoomWorker.ts) plus a stage-table buffer
   *  (pairs of [laIndex, macroItCount] floats). The shader walks the
   *  resulting texture during the deep-zoom inner loop to skip many
   *  reference iterations at once. */
  setLATable(laTable: Float32Array, totalCount: number, stages: Float32Array): void {
    const gl = this.gl;
    // Each node = 3 texels. Pad to full rows of `laTableTexW` texels.
    const totalTexels = totalCount * 3;
    const texW = this.laTableTexW;
    const texH = Math.max(1, Math.ceil(totalTexels / texW));
    const fullLen = texW * texH * 4;
    let upload: Float32Array;
    if (laTable.length >= fullLen) {
      upload = laTable.subarray(0, fullLen);
    } else {
      upload = new Float32Array(fullLen);
      upload.set(laTable);
    }

    if (!this.laTableTex) {
      this.laTableTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.laTableTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.laTableTexH = 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.laTableTex);
    if (texH !== this.laTableTexH) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texW, texH, 0, gl.RGBA, gl.FLOAT, upload);
      this.laTableTexH = texH;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, texW, texH, gl.RGBA, gl.FLOAT, upload);
    }

    this.laTotalCount = totalCount;
    this.laStages = stages;
    this.laStageCount = stages.length / 2;
    this.refOrbitVersion++;  // bump so TSAA accumulator resets
  }

  setLAEnabled(on: boolean): void {
    this.laEnabled = on;
  }

  setForceFluidPaused(on: boolean): void {
    this.forceFluidPaused = on;
  }

  clearLATable(): void {
    this.laTotalCount = 0;
    this.laStages = new Float32Array(0);
    this.laStageCount = 0;
    this.refOrbitVersion++;
  }

  /** Upload a reference orbit for the deep-zoom path. The data layout
   *  is RGBA32F texels packed as [Z.re, Z.im, |Z|², 0] per iteration —
   *  matches the worker's output from `referenceOrbit.ts`. The texture
   *  is sized as `texW × ceil(length / texW)` and zero-padded; only
   *  the first `length` texels are read by the shader.
   *
   *  Re-allocates only when the row count changes; same-row uploads
   *  reuse the existing texture via texSubImage2D for cheap swaps. */
  setReferenceOrbit(
    orbit: Float32Array,
    length: number,
    refCenter: [number, number],
    refCenterLow: [number, number] = [0, 0],
  ): void {
    this.refOrbitCenter = [refCenter[0], refCenter[1]];
    this.refOrbitCenterLow = [refCenterLow[0], refCenterLow[1]];
    const gl = this.gl;
    const texW = this.refOrbitTexW;
    const texH = Math.max(1, Math.ceil(length / texW));

    // Pad to full rows (texW * texH * 4 floats) so texImage/texSubImage
    // doesn't read past `orbit`. Zero-pad with the escape sentinel; the
    // shader bounds-clamps `ref` to `length-1` anyway.
    const fullLen = texW * texH * 4;
    let upload: Float32Array;
    if (orbit.length >= fullLen) {
      upload = orbit.subarray(0, fullLen);
    } else {
      upload = new Float32Array(fullLen);
      upload.set(orbit);
    }

    if (!this.refOrbitTex) {
      this.refOrbitTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.refOrbitTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.refOrbitTexH = 0;  // force allocate below
    }

    gl.bindTexture(gl.TEXTURE_2D, this.refOrbitTex);
    if (texH !== this.refOrbitTexH) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texW, texH, 0, gl.RGBA, gl.FLOAT, upload);
      this.refOrbitTexH = texH;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, texW, texH, gl.RGBA, gl.FLOAT, upload);
    }

    this.refOrbitLen = length;
    this.refOrbitVersion++;
  }

  clearReferenceOrbit(): void {
    this.refOrbitLen = 0;
    this.refOrbitVersion++;
  }

  /** TSAA blend pass. Reads juliaCur (current jittered frame) + juliaTsaa
   *  (history), writes the running average to juliaTsaaPrev, swaps.
   *  Samples past the cap are skipped — accumulator is already converged.
   *  tsaaSampleCap === 0 means infinite (no clamp, no early return). */
  private runTsaaBlend() {
    const cap = this.params.tsaaSampleCap;
    if (cap > 0 && this.tsaaSampleIndex >= cap) return;
    const gl = this.gl;

    // Increment first so frame 1 gets index=1 (overwrite history with current).
    this.tsaaSampleIndex = cap > 0
        ? Math.min(this.tsaaSampleIndex + 1, cap)
        : this.tsaaSampleIndex + 1;

    // Write to juliaTsaaPrev; we swap at the end so juliaTsaa is always "current history".
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.juliaTsaaPrev.fbo);
    gl.viewport(0, 0, this.juliaTsaaPrev.width, this.juliaTsaaPrev.height);
    this.useProgram(this.progTsaaBlend);
    this.bindTex(0, this.juliaCur.texMain,    this.progTsaaBlend.uniforms['uCurrentMain']);
    this.bindTex(1, this.juliaCur.texAux,     this.progTsaaBlend.uniforms['uCurrentAux']);
    this.bindTex(2, this.juliaTsaa.texMain,   this.progTsaaBlend.uniforms['uHistoryMain']);
    this.bindTex(3, this.juliaTsaa.texAux,    this.progTsaaBlend.uniforms['uHistoryAux']);
    gl.uniform1i(this.progTsaaBlend.uniforms['uSampleIndex'], this.tsaaSampleIndex);
    this.drawQuad();

    // Swap so juliaTsaa points at the freshly-written history.
    const t = this.juliaTsaa;
    this.juliaTsaa = this.juliaTsaaPrev;
    this.juliaTsaaPrev = t;
  }

  /** Returns the MRT fbo consumers (mask, motion, composite) should read
   *  to get the "visible" julia image. When TSAA is on, that's the
   *  averaged accumulator; when off, it's the current per-frame render. */
  private juliaReadFbo(): MrtFbo {
    return this.params.tsaa ? this.juliaTsaa : this.juliaCur;
  }

  /** Check whether any Julia-affecting parameter changed since the last
   *  step; if so, reset the TSAA accumulator. Called each step before
   *  renderJulia. Hashes to stringified key for a cheap equality test. */
  private updateTsaaHash() {
    const p = this.params;
    const hash = `${p.kind}|${p.juliaC[0]}|${p.juliaC[1]}|${p.center[0]}|${p.center[1]}|${p.zoom}|${p.power}|${p.maxIter}|${p.colorIter}|${p.escapeR}|${p.colorMapping}|${p.trapCenter[0]}|${p.trapCenter[1]}|${p.trapRadius}|${p.trapNormal[0]}|${p.trapNormal[1]}|${p.trapOffset}|${p.stripeFreq}|dz:${p.deepZoomEnabled ? 1 : 0}|dzV:${this.refOrbitVersion}`;
    if (hash !== this.tsaaParamHash) {
        this.tsaaParamHash = hash;
        this.tsaaSampleIndex = 0;
    }
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
    const juliaRead = this.juliaReadFbo();
    this.bindTex(0, juliaRead.texMain, this.progMask.uniforms['uJulia']);
    this.bindTex(1, juliaRead.texAux, this.progMask.uniforms['uJuliaAux']);
    this.bindTex(2, this.gradientTex!, this.progMask.uniforms['uGradient']);
    this.bindTex(3, this.collisionGradientTex!, this.progMask.uniforms['uCollisionGradient']);
    gl.uniform1i(this.progMask.uniforms['uColorMapping'], colorMappingToIndex(this.params.colorMapping));
    // Main gradient repeat/phase — the GRADIENT_SAMPLE_GLSL helper references
    // these even though the mask pass doesn't actually read from the main
    // gradient. Kept in sync with the dye panel.
    gl.uniform1f(this.progMask.uniforms['uGradientRepeat'], this.params.gradientRepeat);
    gl.uniform1f(this.progMask.uniforms['uGradientPhase'], this.params.gradientPhase);
    // Collision-specific repeat/phase — independent of the dye gradient.
    gl.uniform1f(this.progMask.uniforms['uCollisionRepeat'], this.params.collisionRepeat);
    gl.uniform1f(this.progMask.uniforms['uCollisionPhase'], this.params.collisionPhase);
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
    const juliaReadInject = this.juliaReadFbo();
    this.bindTex(0, this.dye.read.tex, this.progInjectDye.uniforms['uDye']);
    this.bindTex(1, juliaReadInject.texMain, this.progInjectDye.uniforms['uJulia']);
    this.bindTex(2, this.gradientTex!, this.progInjectDye.uniforms['uGradient']);
    this.bindTex(4, juliaReadInject.texAux, this.progInjectDye.uniforms['uJuliaAux']);
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
    const juliaReadDisplay = this.juliaReadFbo();
    this.bindTex(0, juliaReadDisplay.texMain, this.progDisplay.uniforms['uJulia']);
    this.bindTex(4, juliaReadDisplay.texAux, this.progDisplay.uniforms['uJuliaAux']);
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
      gl.uniform1f(this.progDisplay.uniforms['uRefractRoughness'], 0.0);
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
      gl.uniform1f(this.progDisplay.uniforms['uRefractRoughness'], this.params.refractRoughness);
      gl.uniform1f(this.progDisplay.uniforms['uCaustics'], this.params.caustics);
      gl.uniform1i(this.progDisplay.uniforms['uCollisionPreview'], this.params.collisionPreview ? 1 : 0);
    }
  }

  frame(timeMs: number) {
    const gl = this.gl;
    const dt = this.lastTimeMs === 0 ? 0.016 : Math.min(0.05, (timeMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = timeMs;
    this.params.dt = dt;

    // TSAA hash check — invalidate accumulator on any param change that
    // would alter the Julia output. Must happen BEFORE renderJulia so the
    // shader sees the current sample index for jitter scheduling.
    this.updateTsaaHash();
    this.frameCount++;

    // 1. Julia pass. Once TSAA has reached its cap the accumulator is
    // frozen — re-rendering would just blend into a stale history.
    // updateTsaaHash() resets the index on any Julia-affecting param
    // change, so scrubs / camera moves re-engage rendering on the next
    // frame. tsaaSampleCap === 0 disables the short-circuit (infinite
    // accumulation).
    const tsaaConverged = this.params.tsaa
        && this.params.tsaaSampleCap > 0
        && this.tsaaSampleIndex >= this.params.tsaaSampleCap;
    if (!tsaaConverged) {
      this.renderJulia();
      if (this.params.tsaa) this.runTsaaBlend();
    }
    // 1c. Collision mask (always — emits zeros when disabled so downstream
    // shaders have a single fast path through texture(uMask, ...)).
    this.computeMask();
    // 1a-ii. Downsample + readback the mask to CPU for particle-bounce
    // queries. Skips the actual GPU round-trip when collision is off.
    this.readMaskToCPU();

    if (!this.params.paused && !this.forceFluidPaused) {
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

    // Drain GPU timer query results. Issued in renderJulia, drained
    // here a few frames later (async by design).
    this.pollJuliaTimer();

    if (this.onFrameEnd) this.onFrameEnd();
  }

  dispose() {
    const gl = this.gl;
    this.deleteMrtFbo(this.juliaCur);
    this.deleteMrtFbo(this.juliaPrev);
    this.deleteMrtFbo(this.juliaTsaa);
    this.deleteMrtFbo(this.juliaTsaaPrev);
    this.deleteFBO(this.forceTex);
    this.deleteDoubleFBO(this.velocity);
    this.deleteDoubleFBO(this.dye);
    this.deleteFBO(this.divergence);
    this.deleteDoubleFBO(this.pressure);
    this.deleteFBO(this.curl);
    this.deleteFBO(this.maskTex);
    if (this.maskReadFBO) { this.deleteFBO(this.maskReadFBO); this.maskReadFBO = null; }
    if (this.gradientTex) { gl.deleteTexture(this.gradientTex); this.gradientTex = null; }
    if (this.collisionGradientTex) { gl.deleteTexture(this.collisionGradientTex); this.collisionGradientTex = null; }
    this.deleteFBO(this.bloomA); this.deleteFBO(this.bloomB); this.deleteFBO(this.bloomC);
    gl.deleteBuffer(this.quadVbo);
    for (const p of [
      this.progJulia, this.progMotion, this.progAddForce, this.progInjectDye,
      this.progAdvect, this.progDivergence, this.progCurl, this.progVorticity,
      this.progPressure, this.progGradSub, this.progSplat, this.progDisplay, this.progClear,
      this.progReproject, this.progMask, this.progTsaaBlend,
      this.progBloomExtract, this.progBloomDown, this.progBloomUp,
    ]) {
      if (p?.prog) gl.deleteProgram(p.prog);
    }
    if (this.blueNoise) { gl.deleteTexture(this.blueNoise.texture); this.blueNoise = null; }
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
