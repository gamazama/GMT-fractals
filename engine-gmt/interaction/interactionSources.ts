/**
 * Canonical InteractionSession source tokens for GMT (ADR-0061).
 *
 * The engine-core machine + slice keep `InteractionSource = string` —
 * domain-agnostic, mirroring ADR-0059's open-token pattern (a new input type
 * adds a token, never edits core). GMT declares its canonical set HERE, at the
 * app level, exactly as the ADR specifies.
 *
 * Why a single table instead of bare string literals at each call site: a
 * typo'd token ('camara') doesn't error — it silently opens a *separate*
 * session. The overlay would show it, but no consumer filter would match it
 * (e.g. HUD-fade's `isInteracting({ only: ['camera', 'scrub'] })` in P4), and a
 * begin without the matching end would strand under a name nothing watches.
 * Importing one frozen constant removes that whole failure class across the
 * ~10 P3a producer sites and the ~90 P3b slider/knob/vector sites.
 *
 *   P3a wires: camera, gizmo, picker.
 *   P3b wires: slider, drawing, scrub.
 *
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 * @see store/slices/createInteractionSlice.ts
 */

export const INTERACTION_SOURCES = {
    /** Camera/nav gesture — drei OrbitControls (rotate/dolly/pan incl. all
     *  touch) + the custom cursor-anchored orbit/middle-drag/wheel paths.
     *  Ref-counted under this one token so overlapping paths are safe. */
    camera: 'camera',
    /** Light-gizmo drag (move/axis/plane). Single-source with the legacy dual
     *  `engine.isGizmoInteracting` + `isGizmoDragging` flags (ADR mitigation #4). */
    gizmo: 'gizmo',
    /** Focus / Julia pick-drags (useInteractionManager). */
    picker: 'picker',
    /** Slider / knob / vector param drags — anchored to the existing
     *  begin/endParamTransaction lifecycle in P3b. */
    slider: 'slider',
    /** Freehand drawing / region paint (DrawingOverlay) — P3b. */
    drawing: 'drawing',
    /** Timeline scrub (user dragging the playhead) — P3b. A gesture, unlike
     *  autonomous playback, which is the separate `isSceneAnimating` axis. */
    scrub: 'scrub',
} as const;

export type CanonicalInteractionSource =
    typeof INTERACTION_SOURCES[keyof typeof INTERACTION_SOURCES];
