/**
 * fluid-toy/brush — all brush + particle-emitter logic in one place.
 *
 * Split by concern:
 *   color.ts    — colour resolver (paintFromGradient / solid / rainbow
 *                 / sampleGradient + hue jitter). Pure functions on
 *                 brush params + stroke state. No store, no engine.
 *   particles.ts — Particle type + spawn/step. Pure. No engine calls.
 *   emitter.ts   — the runtime: per-frame tick (particle step + paint)
 *                  and per-move splat emitter. Calls engine.brush().
 *
 * Consumers: FluidPointerLayer (per-move emit), FluidToyApp (per-frame
 * tick), BrushFeature (DDFS params). No other code in the app reaches
 * into the brush internals.
 */

export {
    type BrushColorMode,
    type BrushColorArgs,
    hslToRgb,
    rgbToHsl,
    applyBrushJitter,
    sampleGradient,
    resolveBrushColor,
} from './color';

export {
    PARTICLE_HARD_CAP,
    type Particle,
    type ParticleSpawnArgs,
    type ParticleStepArgs,
    spawnParticle,
    stepParticles,
} from './particles';

export {
    type BrushRuntime,
    type BrushParams,
    type StepBrushArgs,
    type EmitSplatArgs,
    createBrushRuntime,
    stepBrush,
    emitStrokeSplat,
    emitPressSplat,
    beginStroke,
} from './emitter';

// IMPORTANT: do NOT re-export readBrushParams from the barrel — it
// imports useEngineStore. Several feature files (palette, …) reach the
// brush barrel via engineHandles for `brushHandles`, and DDFS feature
// registration runs BEFORE the store is constructed (the registries
// freeze on first store touch). Importing useEngineStore at that time
// would block registerFeatures.ts from completing.
//
// Consumers that need `readBrushParams` import it directly from
// '../brush/readParams' — the only callers are FluidPointerLayer's
// pointer handlers and the brush RAF tick in useFluidEngine, both of
// which run post-boot.
