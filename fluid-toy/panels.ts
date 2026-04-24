/**
 * Fluid-toy panel manifest — dock layout for the Julia ↔ fluid playground.
 *
 * Simple 1:1 panels per feature (toy is small enough that each DDFS
 * feature gets its own tab). Preserves the tab ordering the features
 * used to express via `tabConfig.order` before the manifest migration.
 */

import type { PanelManifest } from '../engine/PanelManifest';

export const FluidToyPanels: PanelManifest = [
    { id: 'Fractal',   dock: 'right', order: 0, active: true, features: ['julia'] },
    { id: 'Coupling',  dock: 'right', order: 1,               features: ['coupling'] },
    { id: 'Fluid',     dock: 'right', order: 2,               features: ['fluidSim'] },
    { id: 'Brush',     dock: 'right', order: 3,               features: ['brush'] },
    { id: 'Palette',   dock: 'right', order: 4,               features: ['palette'] },
    { id: 'Post-FX',   dock: 'right', order: 5,               features: ['postFx'] },
    { id: 'Collision', dock: 'right', order: 6,               features: ['collision'] },
    { id: 'Composite', dock: 'right', order: 7,               features: ['composite'] },
    { id: 'Presets',   dock: 'right', order: 8,               features: ['presets'] },
];
