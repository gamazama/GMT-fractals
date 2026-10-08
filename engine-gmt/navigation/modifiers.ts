// Camera input sensitivity modifiers driven by Shift / Alt.
//
// The values live in the engine since 2026-10-08, beside the fly integrator that reads them
// (engine/plugins/navigation/modifiers.ts). This file re-exports them so GMT's importers
// (Navigation.tsx, useInputController.ts) are unchanged.
// @see docs/adr/0133-navigation-emits-displacements.md

export {
    CAMERA_BOOST_MULT,
    CAMERA_PRECISE_MULT,
    getCameraModifier,
    getCameraModifierFromEvent,
} from '../../engine/plugins/navigation/modifiers';
