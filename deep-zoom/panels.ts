/**
 * Deep Zoom — panel manifest.
 *
 * Left dock = where am I and where am I going (Locations, Formula, Flight);
 * right dock = how it looks (Light, Colour, Quality). The target layout is
 * BLUEPRINT section 4 (plans/deep-zoom-shell/).
 *
 * EMPTY IN STAGE 1, ON PURPOSE. A tab appears in the stage that gives it a row
 * the renderer can honour: Formula, Light, Colour, Quality in stage 2,
 * Locations in stage 3, Flight in stage 6a. The five look features are
 * already registered (registerFeatures.ts) but nothing pushes their values to
 * the renderer yet, so a slider for one would be a control that does nothing.
 *
 * With no panel in a dock the engine's <Dock> renders no element at all (grep
 * `dockPanels.length === 0` in components/layout/Dock.tsx): in stage 1 the
 * picture runs edge to edge under the top bar.
 *
 * Every custom widget is `{ type: 'widget', id }` plus a
 * `componentRegistry.register(id, C)`. No `component: 'panel-X'` of our own.
 * The shared Feedback panel is spread in by setup.ts, so this file stays free
 * of engine-gmt imports.
 */

import type { PanelManifest } from '../engine/PanelManifest';

export const DeepZoomPanels: PanelManifest = [];
