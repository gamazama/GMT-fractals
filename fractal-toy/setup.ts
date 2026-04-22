/**
 * Post-mount setup for Fractal Toy — runs once after React has mounted.
 *
 * Intentionally empty through phase 1. Fractal-toy renders its feature
 * panels directly in FractalToyApp.tsx (a right-column stack of
 * AutoFeaturePanel components) rather than via the engine's Dock /
 * PanelRouter system, so there's no engine panel state to seed.
 *
 * A future commit could migrate the panels onto the engine's Dock so
 * they become dockable / floatable / dismissible — at which point this
 * function starts calling movePanel(...) to place them. For 1f we
 * keep the simpler right-column layout.
 *
 * Kept as an explicit hook so the boot-time three-step contract
 * (registerFeatures → store construction → setup) stays visible, even
 * when the setup step is currently a no-op.
 */

export const setupFractalToy = () => {
    // No-op in phase 1 — see file comment.
};
