/**
 * rotationGizmo — host feature for the canvas rotation-gizmo overlay.
 *
 * Carries NO params on purpose: which gizmos are open (and where their pucks
 * sit) is session UI state in the standalone rotationGizmoStore, never
 * serialized into presets. This feature exists only to mount the DOM overlay
 * through the standard viewportConfig path (DomOverlays → OverlayHost) — the
 * same seam LightGizmo and DrawingOverlay use. The per-frame display update
 * is a TICK_PHASE.OVERLAY tick registered in features/ui.tsx.
 *
 * Camera blocking during gizmo drags comes from the `gizmo` interaction
 * source (selectMovementLock), not interactionConfig — no flags here.
 */

import { FeatureDefinition } from '../../engine/FeatureSystem';

export const RotationGizmoFeature: FeatureDefinition = {
    id: 'rotationGizmo',
    shortId: 'rg',
    name: 'Rotation Gizmos',
    category: 'Tools',
    viewportConfig: {
        componentId: 'overlay-rotation-gizmo',
        type: 'dom',
    },
    params: {},
};
