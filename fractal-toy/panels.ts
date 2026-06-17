/**
 * Fractal-toy panel manifest.
 *
 * Formula tabs (Mandelbulb, Mandelbox, …) are added at runtime by
 * `formulaRegistry.registerFormula` via `addPanel()` — they aren't known
 * at app boot. The static manifest only covers the app-wide tabs.
 */

import type { PanelManifest } from '../engine/PanelManifest';

export const FractalToyPanels: PanelManifest = [
    { id: 'Camera',   dock: 'right', order: 1, features: ['camera'] },
    { id: 'Lighting', dock: 'right', order: 2, features: ['lighting'] },
];
