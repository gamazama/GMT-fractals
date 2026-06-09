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
import { FRACTAL_MODE } from './fractalMode';
import { LIQUIFY_MODE } from './liquifyMode';

for (const mode of BUILTIN_MODES) registerFullscreenMode(mode);

// ownCanvas modes (each owns its canvas/renderer/RAF via the generic `mount()` face).
registerFullscreenMode(FRACTAL_MODE);   // live Mandelbrot coloured by the ramp
registerFullscreenMode(LIQUIFY_MODE);   // deformable LUT-mesh (MLS warp + XPBD + Taubin)

// Parallel mode streams: register here (or import their self-registering module), e.g.
//   import './splineMode';     // glQuad — gradient flows along an editable spline path
//   import './parallaxMode';   // ownCanvas — depth-layered parallax dot field
