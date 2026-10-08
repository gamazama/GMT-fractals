/**
 * deep-zoom/panels.ts - the dock tabs, as a manifest.
 *
 * Left dock = where am I and where am I going; right dock = how it looks. A tab appears in the
 * stage that gives it a working row: Formula, Light, Colour, Quality here (stage 2); Locations in
 * stage 3; Flight in stage 6a. No `component: 'panel-X'` of our own: a panel is features, sections
 * and registered widgets.
 *
 * Rows deliberately absent:
 *   - `dzQuality.actualPixels`: the renderer has no setter for its 1:1 view yet (host/paramMap.ts).
 * The `dz-mode-notice` widget heads the two tabs whose controls act in deep mode only.
 */
import type { PanelManifest } from '../engine/PanelManifest';

export const DeepZoomPanels: PanelManifest = [
    { id: 'Formula', dock: 'left', order: 1, active: true, items: [
        { type: 'feature', id: 'dzFormula', whitelistParams: ['power', 'phaseTheta', 'phasePhi'] },
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
