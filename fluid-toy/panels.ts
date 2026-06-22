/**
 * Fluid-toy panel manifest — dock layout for the Julia ↔ fluid playground.
 *
 * Layout split:
 *   Left dock  → authoring (View, Deep Zoom, Palette, Modulation, Presets)
 *   Right dock → sim / look (Coupling, Fluid, Collision, Brush, Post-FX, Composite)
 *
 * Sectioning is done via the manifest's `items` array — one
 * `{ type: 'feature', whitelistParams: [...] }` per visual subgroup, with
 * `{ type: 'section', label }` headers between. This keeps the params
 * declared on a single feature (so DDFS, modulation, undo, presets all
 * reach them by `featureId.paramName`) while letting the panel render
 * them in user-facing groups.
 *
 * The legacy "Fractal" panel is intentionally absent — the View panel
 * surfaces the same julia.* params under camera / fractal / iteration
 * sections. Saved presets / GMF files round-trip fine; the slice is
 * still in the store, only the dock tab is gone.
 */

import type { PanelManifest } from '../engine/PanelManifest';
import { favientsPanelEntry } from '../palette/installFavients';

// Fluid is "on" when the sim isn't paused. The fluid-specific panels
// (Coupling / Fluid / Collision / Brush / Composite) only make sense while
// the sim runs, so they hide when the Fluid toggle is off — the toy then
// presents purely as a fractal explorer (left dock + Post-FX stay visible).
// Post-FX is intentionally NOT gated: its Tone / Bloom / Velocity sections
// colour the fractal too; only its Glass section (refraction/caustics) is
// fluid-specific and hides via a per-section showIf below.
const fluidOn = (s: unknown): boolean =>
    !(s as { fluidSim?: { paused?: boolean } }).fluidSim?.paused;

export const FluidToyPanels: PanelManifest = [
    // ── LEFT DOCK — authoring ────────────────────────────────────────
    // The View panel is the navigation surface — saved views + the live
    // camera (center / zoom). Fractal-shape params (kind, juliaC, power,
    // maxIter) live on the hidden Fractal panel below; presets, GMF
    // saves, and the modulation system still reach them via julia.*
    // targets, but the tab itself is omitted from the dock.
    {
        // Navigation + iterations surface. Saved views + the cardinal preset
        // buttons (RESET / HOME / 1:1 / WIDE / MAND / JULIA) live in the
        // panel-views widget; pan / zoom / juliaC happen on the canvas (drag
        // to pan, wheel to zoom, ctrl-click to pick c).
        //
        // The Iterations section is the single home for the display-iteration
        // story (previously scattered: the manual cap was on a HIDDEN panel,
        // the auto toggle + multiplier were buried in Deep Zoom). The readout
        // shows the resolved count so the active control is never a mystery,
        // and each knob self-hides when it isn't the one in effect:
        //   • Auto iterations ON  → "Iteration ×" multiplier (maxIter hidden)
        //   • Auto iterations OFF → "Iterations (cap)" manual cap
        id: 'View', dock: 'left', order: 0, active: true,
        items: [
            { type: 'widget', id: 'panel-views' },
            { type: 'section', label: 'Iterations' },
            { type: 'widget', id: 'iteration-readout' },
            // autoIter (always) + iterMul (self-gates on autoIter). Both live on
            // the deepZoom slice but govern the standard render too, so they
            // belong in this general Iterations section, not just Deep Zoom.
            { type: 'feature', id: 'deepZoom', whitelistParams: ['autoIter', 'iterMul'] },
            // Manual cap — self-hides unless Auto iterations is off (cross-feature
            // condition `$deepZoom.autoIter` on the param).
            { type: 'feature', id: 'julia', whitelistParams: ['maxIter'] },
        ],
    },
    {
        // Hidden — not in the tab bar. Kept in the manifest so the
        // params still resolve via PanelRouter for any tooling that
        // looks them up by panel id.
        id: 'Fractal', dock: 'left', order: 1,
        showIf: () => false,
        items: [
            { type: 'section', label: 'Shape' },
            { type: 'feature', id: 'julia', whitelistParams: ['kind', 'juliaC', 'power'] },
            { type: 'section', label: 'Iteration' },
            { type: 'feature', id: 'julia', whitelistParams: ['maxIter'] },
        ],
    },
    {
        // Deep-zoom-specific knobs only. The general iteration controls
        // (autoIter / iterMul) moved to View ▸ Iterations — they govern the
        // shallow render too, so they don't belong behind a deep-zoom tab.
        // The manual deep caps self-hide unless Auto iterations is off.
        id: 'Deep Zoom', dock: 'left', order: 2,
        items: [
            { type: 'feature', id: 'deepZoom', whitelistParams: [
                'enabled', 'useLA', 'useAT', 'maxRefIter', 'deepMaxIter', 'showStats', 'disableFluid',
            ] },
        ],
    },
    {
        id: 'Palette', dock: 'left', order: 3,
        items: [
            { type: 'section', label: 'Mode + LUT' },
            { type: 'feature', id: 'palette', whitelistParams: ['colorMapping', 'colorNormV2', 'gradient', 'interiorColor'] },
            { type: 'section', label: 'Tiling' },
            // iterRate (Rate) + deLogBands (Distance rings) self-gate on colorNormV2 + mode.
            { type: 'feature', id: 'palette', whitelistParams: ['gradientRepeat', 'gradientPhase', 'iterRate', 'deLogBands'] },
            // Iterations Fit-to-view — anchors the gradient on the visible iteration range
            // (only meaningful for Iterations mode, which uses the iterOffset/iterScale anchor).
            { type: 'widget', id: 'palette-fit', showIf: (s) => {
                const p = (s as { palette?: { colorNormV2?: boolean; colorMapping?: number } }).palette;
                return !!p?.colorNormV2 && p?.colorMapping === 0;
            } },
            // Slope-lighting group — only meaningful under depth-normalized colour.
            { type: 'section', label: 'Lighting', showIf: (s) => !!(s as { palette?: { colorNormV2?: boolean } }).palette?.colorNormV2 },
            { type: 'feature', id: 'palette', whitelistParams: ['lightEnabled', 'lightAngle', 'lightHeight', 'lightStrength', 'ambient'] },
            { type: 'section', label: 'Trap shape' },
            { type: 'feature', id: 'palette', whitelistParams: ['trapCenter', 'trapRadius', 'trapNormal', 'trapOffset'] },
            { type: 'section', label: 'Stripe' },
            { type: 'feature', id: 'palette', whitelistParams: ['stripeFreq'] },
            { type: 'section', label: 'Iteration' },
            { type: 'feature', id: 'palette', whitelistParams: ['colorIter', 'escapeR'] },
        ],
    },
    {
        id: 'Modulation', dock: 'left', order: 4,
        items: [{ type: 'widget', id: 'lfo-list' }],
    },
    { id: 'Presets',    dock: 'left', order: 5, features: ['presets'] },

    // ── RIGHT DOCK — sim / look ─────────────────────────────────────
    {
        id: 'Coupling', dock: 'right', order: 0, active: true, showIf: fluidOn,
        items: [
            { type: 'section', label: 'Driver' },
            { type: 'feature', id: 'coupling', whitelistParams: ['forceMode', 'forceSource'] },
            { type: 'section', label: 'Intensity' },
            { type: 'feature', id: 'coupling', whitelistParams: ['forceGain', 'forceCap', 'interiorDamp', 'edgeMargin'] },
        ],
    },
    {
        id: 'Fluid', dock: 'right', order: 1, showIf: fluidOn,
        items: [
            { type: 'section', label: 'Sim' },
            { type: 'feature', id: 'fluidSim', whitelistParams: ['vorticity', 'vorticityScale', 'dissipation', 'pressureIters'] },
            { type: 'section', label: 'Time' },
            { type: 'feature', id: 'fluidSim', whitelistParams: ['paused', 'timeScale'] },
            { type: 'section', label: 'Dye injection' },
            { type: 'feature', id: 'fluidSim', whitelistParams: ['dyeInject', 'dyeBlend'] },
            { type: 'section', label: 'Dye decay' },
            { type: 'feature', id: 'fluidSim', whitelistParams: ['dyeDecayMode', 'dyeDissipation', 'dyeChromaDecayHz', 'dyeSaturationBoost'] },
        ],
    },
    { id: 'Collision',  dock: 'right', order: 2, features: ['collision'], showIf: fluidOn },
    {
        id: 'Brush', dock: 'right', order: 3, showIf: fluidOn,
        items: [
            { type: 'section', label: 'Stamp' },
            { type: 'feature', id: 'brush', whitelistParams: ['mode', 'colorMode', 'solidColor', 'size', 'hardness', 'strength'] },
            { type: 'section', label: 'Stroke' },
            { type: 'feature', id: 'brush', whitelistParams: ['flow', 'spacing', 'jitter'] },
            { type: 'section', label: 'Particle emitter' },
            { type: 'feature', id: 'brush', whitelistParams: ['particleEmitter', 'particleRate', 'particleVelocity', 'particleSpread', 'particleGravity', 'particleDrag', 'particleLifetime', 'particleSizeScale'] },
        ],
    },
    {
        id: 'Post-FX', dock: 'right', order: 4,
        items: [
            { type: 'section', label: 'Tone' },
            { type: 'feature', id: 'postFx', whitelistParams: ['toneMapping', 'exposure', 'vibrance'] },
            { type: 'section', label: 'Bloom' },
            { type: 'feature', id: 'postFx', whitelistParams: ['bloomAmount', 'bloomThreshold'] },
            // Glass (refraction/caustics) reads the dye height field, and the
            // velocity-driven aberration reads the velocity field — both are
            // fluid-only, so they hide when the sim is off (Tone + Bloom stay,
            // they colour the fractal too).
            { type: 'section', label: 'Glass', showIf: fluidOn },
            { type: 'feature', id: 'postFx', whitelistParams: ['refraction', 'refractSmooth', 'refractRoughness', 'caustics'], showIf: fluidOn },
            { type: 'section', label: 'Velocity', showIf: fluidOn },
            { type: 'feature', id: 'postFx', whitelistParams: ['aberration'], showIf: fluidOn },
        ],
    },
    {
        id: 'Composite', dock: 'right', order: 5, showIf: fluidOn,
        items: [
            { type: 'section', label: 'Show' },
            { type: 'feature', id: 'composite', whitelistParams: ['show'] },
            { type: 'section', label: 'Mix' },
            { type: 'feature', id: 'composite', whitelistParams: ['juliaMix', 'dyeMix', 'velocityViz'] },
        ],
    },

    // ── Favients shelf ───────────────────────────────────────────────
    // The persistent gradient-favourites bar. Registered with a dock so the
    // manifest accepts it, but main.tsx floats it via mountFavientsPanel()
    // (it lives as a floating window, not a docked tab). The `panel-favients`
    // component is registered by registerPaletteUI().
    favientsPanelEntry({ dock: 'right', order: 90 }),

];
