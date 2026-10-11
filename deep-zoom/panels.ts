/**
 * deep-zoom/panels.ts - the dock tabs, as a manifest.
 *
 * Left dock = where am I and where am I going; right dock = how it looks. A tab appears in the
 * stage that gives it a working row: Formula, Light, Colour, Quality (stage 2); Locations
 * (stage 3); Route (the camera move on the timeline: one widget, `dz-route`). No
 * `component: 'panel-X'` of our own: a panel is features, sections and registered widgets.
 *
 * Rows deliberately absent:
 *   - `dzQuality.actualPixels`: the renderer has no setter for its 1:1 view yet (host/paramMap.ts).
 * The `dz-mode-notice` widget heads the two tabs whose controls act in deep mode only.
 */
import type { PanelManifest } from '../engine/PanelManifest';

export const DeepZoomPanels: PanelManifest = [
    { id: 'Locations', dock: 'left', order: 0, active: true, items: [
        { type: 'section', label: 'Starter dives' },
        { type: 'widget', id: 'dz-starters' },
        { type: 'section', label: 'Mandelbox' },
        { type: 'widget', id: 'dz-box-starters' },
        { type: 'section', label: 'Kept places' },
        { type: 'widget', id: 'dz-places' },
        { type: 'section', label: 'My locations' },
        { type: 'widget', id: 'dz-locations' },
        { type: 'separator' },
        { type: 'widget', id: 'dz-location-text' },
    ] },
    { id: 'Route', dock: 'left', order: 1, items: [
        { type: 'widget', id: 'dz-route' },
    ] },
    { id: 'Formula', dock: 'left', order: 2, items: [
        // One formula's rows at a time: each row carries its own condition on `kind` (features/formula.ts).
        { type: 'feature', id: 'dzFormula', whitelistParams: ['kind', 'power', 'phaseTheta', 'phasePhi', 'boxScale', 'boxMinRadius', 'boxFold', 'boxFixedRadius', 'boxRotation'] },
        { type: 'section', label: 'Iterations' },
        { type: 'widget', id: 'dz-iteration-readout' },
        { type: 'feature', id: 'dzFormula', whitelistParams: ['iterations', 'autoIterations'] },
    ] },
    { id: 'Light', dock: 'right', order: 0, active: true, items: [
        { type: 'widget', id: 'dz-mode-notice' },
        { type: 'feature', id: 'dzLight' },
    ] },
    { id: 'Colour', dock: 'right', order: 1, items: [
        { type: 'widget', id: 'dz-mode-notice' },
        { type: 'feature', id: 'dzColour' },
    ] },
    { id: 'Quality', dock: 'right', order: 2, items: [
        { type: 'widget', id: 'dz-frame-readout' },
        { type: 'feature', id: 'dzQuality', excludeParams: ['actualPixels'] },
        { type: 'collapsible', label: 'Inspect', defaultOpen: false, items: [
            { type: 'feature', id: 'dzInspect' },
        ] },
    ] },
];
