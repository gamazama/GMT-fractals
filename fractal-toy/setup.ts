/**
 * Post-mount setup for Fractal Toy — runs once after React has mounted.
 *
 * Seeds panel state on the engine's right-dock for the three fractal-toy
 * features. Panel IDs match each feature's tabConfig.label:
 *   Mandelbulb (order 0) · Camera (order 1) · Lighting (order 2)
 *
 * Panels become dockable / floatable / tab-switchable through the
 * engine's standard Dock + PanelRouter system, the same way App.tsx
 * surfaces features — no bespoke layout inside fractal-toy.
 */

import { useFractalStore } from '../store/fractalStore';

export const setupFractalToy = () => {
    const s = useFractalStore.getState();
    s.movePanel('Mandelbulb', 'right', 0);
    s.movePanel('Camera',     'right', 1);
    s.movePanel('Lighting',   'right', 2);
    // movePanel sets the moved panel as active on its side, so after three
    // calls Lighting is active. Flip back to Mandelbulb — the default
    // landing tab for a fractal explorer.
    s.togglePanel('Mandelbulb', true);
};
