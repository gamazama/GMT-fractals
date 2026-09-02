/**
 * renderInteractionState — single source of truth for the interaction-related
 * booleans GmtRendererTickDriver puts into the per-frame `renderState` and the
 * worker reads back via FractalEngine.setRenderState (ADR-0061 worker bridge).
 *
 * Why a module (and not two inline expressions in the tick driver): the failure
 * mode this guards is a SILENT key typo. A producer writing `interacting` while
 * a consumer reads `interactng` would just read `undefined` → falsy, and
 * adaptive would never engage with no error anywhere. Centralizing the key
 * names and pinning the return type to `EngineRenderState` (via `Pick`) means a
 * rename on either side fails typecheck; debug/test-interaction-wiring.mts
 * round-trips a known-true value through here to catch it at test time too.
 *
 * SCOPE (ADR-0061): `interacting` is gesture activity ONLY (session.isInteracting()).
 * `isSceneAnimating` is the SEPARATE autonomous-animation axis (playback /
 * active LFO) — playback is NOT a gesture, and adaptive composes the two
 * (`isInteracting() || isSceneAnimating`) rather than the session absorbing
 * playback. Both are SENT BUT UNUSED in P2; P4 wires the consumers.
 *
 * Pure module: no THREE / React / store. `EngineRenderState` is a TYPE-ONLY
 * import (erased at build), so a node test can import this without booting the
 * engine.
 *
 * @see engine-gmt/renderer/GmtRendererTickDriver.tsx
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 */

import type { EngineRenderState } from '../engine/FractalEngine';

export interface RenderInteractionInputs {
    /** session.isInteracting() — gesture activity incl. the debounce tail. */
    sessionInteracting: boolean;
    /** session.isInteracting({ only: ['camera','gizmo','scrub'] }) — the subset
     *  the accumulation HOLD consumer wants (P4). Filtered so slider/picker/
     *  drawing gestures (which need fresh frames) don't freeze the buffer. */
    sessionHoldActive: boolean;
    /** Animation playback running (animationStore.isPlaying). */
    isPlaying: boolean;
    /** A live LFO / modulation is driving the scene this frame. */
    hasActiveModulation: boolean;
}

/** The slices `hasLiveModulationSource` reads. Structural (not the store type)
 *  so this module stays store-free and node-testable. */
export interface ModulationSourceState {
    lfosEnabled?: boolean;
    animations?: { enabled?: boolean }[];
    audio?: { isEnabled?: boolean };
    modulation?: { rules?: { enabled?: boolean; source?: string }[] };
}

/**
 * Is ANY modulation source actually driving params this frame?
 *
 * @assumption Must mirror ModulationEngine's two master gates exactly. That
 *   engine skips LFO work when `!lfosEnabled` (updateOscillators' early
 *   return) and skips a rule when `rule.source === 'audio' && !audioEnabled`
 *   — and per-entry when `!anim.enabled` / `!rule.enabled`. A predicate that
 *   is too LOOSE (e.g. `animations.length > 0`, counting disabled entries)
 *   pins `isSceneAnimating` true forever → adaptive stuck at low res,
 *   accumulation never converges. Too TIGHT (the pre-2026-07-25 version,
 *   which omitted audio entirely) leaves an audio-reactive scene reporting
 *   "static" while it invalidates the frame every tick → progressive banding
 *   stays engaged and restarts at pass 0 each frame, so only the centre band
 *   repaints, and adaptive never downscales.
 *
 * LFO-sourced RULES need no clause of their own: they read `lfoValues`, which
 * only refresh while the LFO clause below is already true.
 */
export function hasLiveModulationSource(s: ModulationSourceState): boolean {
    const lfoLive = !!s.lfosEnabled && !!s.animations?.some(a => a.enabled);
    const audioLive = !!s.audio?.isEnabled
        && !!s.modulation?.rules?.some(r => r.enabled && r.source === 'audio');
    return lfoLive || audioLive;
}

/** Gesture-activity boolean that crosses to the worker. UNUSED downstream in
 *  P2 — sent so the transport + read path exist; P4 wires adaptive to it. */
export function deriveInteracting(i: RenderInteractionInputs): boolean {
    return i.sessionInteracting;
}

/** Autonomous scene animation (NOT a gesture). The separate axis adaptive
 *  composes with gesture activity. UNUSED downstream in P2. */
export function deriveIsSceneAnimating(i: RenderInteractionInputs): boolean {
    return i.isPlaying || i.hasActiveModulation;
}

/** The interaction sub-block of renderState. The return type is pinned to the
 *  real `EngineRenderState` keys, so a rename on either side fails typecheck. */
export function buildRenderInteractionState(
    i: RenderInteractionInputs,
): Pick<EngineRenderState, 'interacting' | 'isSceneAnimating' | 'sessionHoldActive'> {
    return {
        interacting: deriveInteracting(i),
        isSceneAnimating: deriveIsSceneAnimating(i),
        sessionHoldActive: i.sessionHoldActive,
    };
}
