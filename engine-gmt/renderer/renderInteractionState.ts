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
