/**
 * modes/index — registers the builtin fullscreen modes at import time.
 *
 * Importing this module (the overlay does, once) populates the registry in selector order.
 * A parallel mode stream adds its mode by registering here too (or from its own module that
 * the overlay imports) — additively, without editing the overlay core.
 *
 * @see gradient-explorer/fullscreen/modeRegistry.ts
 */

import { registerFullscreenMode } from '../modeRegistry';
import { BUILTIN_MODES } from './geometryModes';
import { splineMode } from './splineMode';
import { FRACTAL_MODE } from './fractalMode';
import { LIQUIFY_MODE } from './liquifyMode';

for (const mode of BUILTIN_MODES) registerFullscreenMode(mode);

// Parallel mode streams register after the builtins (append to the selector).
registerFullscreenMode(splineMode);     // glQuad    — gradient flows along an editable Catmull-Rom path
registerFullscreenMode(FRACTAL_MODE);   // ownCanvas — live Mandelbrot coloured by the ramp
registerFullscreenMode(LIQUIFY_MODE);   // ownCanvas — deformable LUT-mesh (MLS + XPBD + Taubin)
//   import './parallaxMode';   // ownCanvas — depth-layered parallax dot field (next)
