/**
 * Post-mount setup for Fractal Toy.
 *
 * Applies the static manifest (Camera + Lighting tabs). Formula tabs are
 * added dynamically by formulaRegistry when each formula registers.
 */

import { applyPanelManifest } from '../engine/PanelManifest';
import { FractalToyPanels } from './panels';

export const setupFractalToy = () => applyPanelManifest(FractalToyPanels);
