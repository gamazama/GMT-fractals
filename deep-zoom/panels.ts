/**
 * deep-zoom/panels.ts - the dock tabs, as a manifest.
 *
 * Left dock = where am I and where am I going; right dock = how it looks. The right dock is folded
 * to its icon strip on a first visit and remembered as the user leaves it (setup.ts). No
 * `component: 'panel-X'` of our own: a panel is features, sections, folds and registered widgets.
 *
 * THE ORDER OF ROWS IS THE MANIFEST'S (STREAMLINE.md stage 5, 2026-10-17). A `whitelistParams` item
 * draws its rows in the feature's declaration order, so where a section wants another order it has
 * one item per row (Light's Ambient: Sky before Light tint). Rows that are for fine work live in a
 * closed `collapsible`: Light's "More", Quality's "Accuracy" and "Inspect". The Light and Quality
 * features themselves did not change for this (their ids, defaults and files are as they were).
 *
 * Places (id `Locations`, its label `Places`: the id is what stored panel state, `togglePanel` and
 * the smokes key on). Its cards are all jumps (components/StarterDives.tsx, F6); My places is the
 * state library's list; its foot is Paste link or place, Copy link and File... (LocationText.tsx).
 *
 * Formula also holds the Julia switch (`dzFormula.juliaMode`), under it the Constant row
 * (`juliaConstant`: the Julia constant's three coordinates, there while the mode is on) and the
 * `dz-julia-here` button (features/formula.ts, JULIA MODE and THE CONSTANT'S ROW).
 *
 * TWO LIVE READINGS SIT ON THEIR ROWS (`labelSuffixes`, components/Readouts.tsx): "in use 70" on
 * Iterations, "drawn 624 x 640" on Frame size. Each was a row of its own until 2026-10-17.
 *
 * Diagnostics (2026-10-12) is the last tab of the right dock and is there in ADVANCED MODE ONLY
 * (`showIf: 'advancedMode'`, the engine's own switch: this app's Settings row and the backtick
 * key). One widget, `dz-diagnostics`: the renderer's developer levers, which are no params and are
 * saved nowhere (components/Diagnostics.tsx), and the readings the top bar's chip had. The dock
 * draws its tabs when the app's tree renders, and the tree does not render for that switch by
 * itself: DeepZoomApp.tsx selects it for this tab.
 *
 * Rows deliberately absent:
 *   - `dzQuality.actualPixels`: the renderer has no setter for its 1:1 view yet (host/paramMap.ts);
 *     no whitelist below names it.
 * The `dz-mode-notice` widget heads the two tabs whose controls act in deep mode only.
 */
import type { PanelManifest } from '../engine/PanelManifest';
import type { EngineStoreState } from '../types/store';
import { SHADING_NEW_INDEX } from './features/light';

/** Light's sections below the first hold New-shading rows only: under Classic their headings go too. */
const newShading = (s: EngineStoreState): boolean => s.dzLight?.shading === SHADING_NEW_INDEX;

export const DeepZoomPanels: PanelManifest = [
    { id: 'Locations', label: 'Places', dock: 'left', order: 0, active: true, items: [
        { type: 'section', label: 'Mandelbulb' },
        { type: 'widget', id: 'dz-starters' },
        { type: 'section', label: 'Mandelbox' },
        { type: 'widget', id: 'dz-box-starters' },
        { type: 'section', label: 'KaliBox' },
        { type: 'widget', id: 'dz-kali-starters' },
        { type: 'section', label: 'Kept places' },
        { type: 'widget', id: 'dz-places' },
        { type: 'section', label: 'My places' },
        { type: 'widget', id: 'dz-locations' },
        { type: 'separator' },
        { type: 'widget', id: 'dz-location-text' },
    ] },
    { id: 'Route', dock: 'left', order: 1, items: [
        { type: 'widget', id: 'dz-route' },
    ] },
    { id: 'Formula', dock: 'left', order: 2, items: [
        // One formula's rows at a time: each row carries its own condition on `kind` (features/formula.ts).
        // The box's four rows and Pre-Rotation carry the iteration schedule's button after their labels, as the Julia
        // Constant row does below while the Mandelbox is drawn (components/ScheduleTool.tsx).
        { type: 'feature', id: 'dzFormula', whitelistParams: ['kind', 'power', 'phaseTheta', 'phasePhi', 'burning', 'burningMix', 'boxScale', 'boxMinRadius', 'boxFold', 'boxFixedRadius', 'boxRotation', 'kaliScale', 'kaliMinRad2', 'kaliTranslation', 'kaliRot'],
            labelSuffixes: { boxScale: 'dz-schedule-button', boxMinRadius: 'dz-schedule-button', boxFold: 'dz-schedule-button', boxFixedRadius: 'dz-schedule-button', boxRotation: 'dz-schedule-button' } },
        // Julia mode, for either formula: the switch, the constant's three numbers while it is on, and the button
        // that takes the constant from the place looked at.
        { type: 'section', label: 'Julia' },
        { type: 'feature', id: 'dzFormula', whitelistParams: ['juliaMode', 'juliaConstant'], labelSuffixes: { juliaConstant: 'dz-schedule-button' } },
        { type: 'widget', id: 'dz-julia-here' },
        // "Iterations 56 · in use 70": the floor and the count in force, one row.
        { type: 'section', label: 'Iterations' },
        { type: 'feature', id: 'dzFormula', whitelistParams: ['iterations', 'autoIterations'], labelSuffixes: { iterations: 'dz-iteration-readout' } },
        // The schedule tool's window, while one of the box's rows has it open (it draws nothing in the panel).
        { type: 'widget', id: 'dz-schedule-tool' },
    ] },
    // Eleven rows in four sections and a closed fold (the owner's mock, round-3/m3-light-today-vs-proposed.jpg).
    // The lamp's three rows come under Light type for Lamp or Both (their own conditions hide them under Direct).
    { id: 'Light', dock: 'right', order: 0, active: true, items: [
        { type: 'widget', id: 'dz-mode-notice' },
        { type: 'section', label: 'Lights' },
        { type: 'feature', id: 'dzLight', whitelistParams: ['lightType', 'lampFalloff', 'lampShadows', 'lampOffset', 'keyElevation', 'keyTurn', 'fill', 'kicker'] },
        { type: 'section', label: 'Ambient', showIf: newShading },
        { type: 'feature', id: 'dzLight', whitelistParams: ['sky'] },
        { type: 'feature', id: 'dzLight', whitelistParams: ['lightTint'] },
        { type: 'section', label: 'Shadow', showIf: newShading },
        { type: 'feature', id: 'dzLight', whitelistParams: ['shadows', 'occlusion'] },
        { type: 'section', label: 'Surface and air', showIf: newShading },
        { type: 'feature', id: 'dzLight', whitelistParams: ['roughness', 'haze'] },
        { type: 'collapsible', label: 'More: Bounce, occlusion accuracy, Shading', defaultOpen: false, items: [
            { type: 'feature', id: 'dzLight', whitelistParams: ['bounce'] },
            { type: 'feature', id: 'dzLight', whitelistParams: ['occlusionRadius', 'occlusionSamples'] },
            { type: 'feature', id: 'dzLight', whitelistParams: ['shading'] },
        ] },
    ] },
    { id: 'Colour', dock: 'right', order: 1, items: [
        { type: 'widget', id: 'dz-mode-notice' },
        { type: 'feature', id: 'dzColour' },
    ] },
    // Frame size (with the size drawn on its row), Detail, Step size (Mandelbox and KaliBox), Accumulate, and
    // Resolution cap in Advanced mode; then the accuracy rows, folded. Hit landing stays (the owner: "looks better on").
    { id: 'Quality', dock: 'right', order: 2, items: [
        { type: 'feature', id: 'dzQuality', whitelistParams: ['frameSize', 'detail', 'stepSize', 'accumulate', 'resolutionCap'], labelSuffixes: { frameSize: 'dz-frame-readout' } },
        { type: 'collapsible', label: 'Accuracy', defaultOpen: false, items: [
            { type: 'feature', id: 'dzQuality', whitelistParams: ['normalDetail', 'reach', 'normals', 'depthNormalRadius', 'hitLanding', 'hitRefine'] },
        ] },
        { type: 'collapsible', label: 'Inspect', defaultOpen: false, items: [
            { type: 'feature', id: 'dzInspect' },
        ] },
    ] },
    // Advanced mode only. Order 80: after the three look tabs, before My Gradients (90, setup.ts).
    { id: 'Diagnostics', dock: 'right', order: 80, showIf: 'advancedMode', items: [
        { type: 'widget', id: 'dz-diagnostics' },
    ] },
];
