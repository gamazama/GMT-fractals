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

for (const mode of BUILTIN_MODES) registerFullscreenMode(mode);

// Parallel mode streams: register here (or import their self-registering module), e.g.
//   import './splineMode';     // glQuad — gradient flows along an editable spline path
//   import './liquifyMode';    // ownCanvas — deformable LUT-mesh (MLS + XPBD + Taubin)
//   import './parallaxMode';   // ownCanvas — depth-layered parallax dot field
