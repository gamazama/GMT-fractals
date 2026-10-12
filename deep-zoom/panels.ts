/**
 * deep-zoom/panels.ts - the dock tabs, as a manifest.
 *
 * Left dock = where am I and where am I going; right dock = how it looks. A tab appears in the
 * stage that gives it a working row: Formula, Light, Colour, Quality (stage 2); Locations
 * (stage 3); Route (the camera move on the timeline: one widget, `dz-route`). No
 * `component: 'panel-X'` of our own: a panel is features, sections and registered widgets.
 *
 * Formula also holds the Julia switch (`dzFormula.juliaMode`), under it the Constant row
 * (`juliaConstant`: the Julia constant's three coordinates, there while the mode is on) and the
 * `dz-julia-here` button (features/formula.ts, JULIA MODE and THE CONSTANT'S ROW).
 *
 * Diagnostics (2026-10-12) is the last tab of the right dock and is there in ADVANCED MODE ONLY
 * (`showIf: 'advancedMode'`, the engine's own switch: this app's Settings row and the backtick
 * key). One widget, `dz-diagnostics`: the renderer's developer levers, which are no params and are
 * saved nowhere (components/Diagnostics.tsx). The dock draws its tabs when the app's tree renders,
 * and the tree does not render for that switch by itself: DeepZoomApp.tsx selects it for this tab.
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
        { type: 'feature', id: 'dzFormula', whitelistParams: ['kind', 'power', 'phaseTheta', 'phasePhi', 'burning', 'burningMix', 'boxScale', 'boxMinRadius', 'boxFold', 'boxFixedRadius', 'boxRotation'] },
        // Julia mode, for either formula: the switch, the constant's three numbers while it is on, and the button
        // that takes the constant from the place looked at.
        { type: 'section', label: 'Julia' },
        { type: 'feature', id: 'dzFormula', whitelistParams: ['juliaMode', 'juliaConstant'] },
        { type: 'widget', id: 'dz-julia-here' },
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
    // Advanced mode only. Order 80: after the three look tabs, before My Gradients (90, setup.ts).
    { id: 'Diagnostics', dock: 'right', order: 80, showIf: 'advancedMode', items: [
        { type: 'widget', id: 'dz-diagnostics' },
    ] },
];
