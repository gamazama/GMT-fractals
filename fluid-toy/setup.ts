/**
 * Post-mount setup for Fluid Toy.
 *
 * Applies the app's panel manifest — the engine reads PanelRouter and
 * Dock from the registered manifest at render time.
 */

import { applyPanelManifest } from '../engine/PanelManifest';
import { FluidToyPanels } from './panels';

export const setupFluidToy = () => applyPanelManifest(FluidToyPanels);
