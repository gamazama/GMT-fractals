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

export const FluidToyPanels: PanelManifest = [
    // ── LEFT DOCK — authoring ────────────────────────────────────────
    // The View panel is the navigation surface — saved views + the live
    // camera (center / zoom). Fractal-shape params (kind, juliaC, power,
    // maxIter) live on the hidden Fractal panel below; presets, GMF
    // saves, and the modulation system still reach them via julia.*
    // targets, but the tab itself is omitted from the dock.
    {
        // Pure navigation surface — saved views + the cardinal preset
        // buttons (RESET / HOME / 1:1 / WIDE / MAND / JULIA) inside the
        // panel-views widget. No DDFS sliders here; pan / zoom / juliaC
        // happen on the canvas (drag to pan, wheel to zoom, ctrl-click
        // to pick c). Fine-grained adjustments live on the hidden
        // Fractal panel.
        id: 'View', dock: 'left', order: 0, active: true,
        items: [
            { type: 'widget', id: 'panel-views' },
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
    { id: 'Deep Zoom',  dock: 'left', order: 2, features: ['deepZoom'] },
    {
        id: 'Palette', dock: 'left', order: 3,
        items: [
            { type: 'section', label: 'Mode + LUT' },
            { type: 'feature', id: 'palette', whitelistParams: ['colorMapping', 'gradient', 'interiorColor'] },
            { type: 'section', label: 'Tiling' },
            { type: 'feature', id: 'palette', whitelistParams: ['gradientRepeat', 'gradientPhase'] },
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
        id: 'Coupling', dock: 'right', order: 0, active: true,
        items: [
            { type: 'section', label: 'Driver' },
            { type: 'feature', id: 'coupling', whitelistParams: ['forceMode', 'forceSource'] },
            { type: 'section', label: 'Intensity' },
            { type: 'feature', id: 'coupling', whitelistParams: ['forceGain', 'forceCap', 'interiorDamp', 'edgeMargin'] },
        ],
    },
    {
        id: 'Fluid', dock: 'right', order: 1,
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
    { id: 'Collision',  dock: 'right', order: 2, features: ['collision'] },
    {
        id: 'Brush', dock: 'right', order: 3,
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
            { type: 'section', label: 'Glass' },
            { type: 'feature', id: 'postFx', whitelistParams: ['refraction', 'refractSmooth', 'refractRoughness', 'caustics'] },
            { type: 'section', label: 'Velocity' },
            { type: 'feature', id: 'postFx', whitelistParams: ['aberration'] },
        ],
    },
    {
        id: 'Composite', dock: 'right', order: 5,
        items: [
            { type: 'section', label: 'Show' },
            { type: 'feature', id: 'composite', whitelistParams: ['show'] },
            { type: 'section', label: 'Mix' },
            { type: 'feature', id: 'composite', whitelistParams: ['juliaMix', 'dyeMix', 'velocityViz'] },
        ],
    },

];
