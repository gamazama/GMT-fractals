/**
 * Post-mount setup for Fractal Toy.
 *
 * Uses the engine's zero-boilerplate panel auto-layout: every feature
 * with a `dock` field in its tabConfig is placed into the corresponding
 * dock, with `defaultActive: true` selecting the landing tab. Fractal
 * toy's three features (Mandelbulb / Camera / Lighting) all declare
 * `dock: 'right'` so this helper is all that's needed.
 *
 * Apps that want custom layouts or conditionally-shown panels mix this
 * helper with explicit `movePanel()` calls — it only touches features
 * with an explicit dock declaration. See docs/03_Plugin_Contract.md.
 */

import { applyDefaultPanelLayout } from '../engine/applyDefaultPanelLayout';

export const setupFractalToy = applyDefaultPanelLayout;
