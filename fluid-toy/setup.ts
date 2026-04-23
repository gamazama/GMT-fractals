/**
 * Post-mount setup for Fluid Toy.
 *
 * Delegates to the engine's applyDefaultPanelLayout helper — panels are
 * auto-placed via each feature's tabConfig.dock, same pattern as
 * fractal-toy. No setup boilerplate needed per new feature.
 */

import { applyDefaultPanelLayout } from '../engine/applyDefaultPanelLayout';

export const setupFluidToy = applyDefaultPanelLayout;
