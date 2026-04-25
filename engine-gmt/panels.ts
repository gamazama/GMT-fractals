/**
 * GMT panel manifest — dock layout for app-gmt.
 *
 * Mirrors pre-extraction GMT's 9-panel right dock: Formula, Graph, Scene,
 * Shader, Gradient, Quality, Light (advanced), Audio, Drawing. Panels
 * compose their content from the 26 registered DDFS features; one feature
 * can appear in multiple panels, and panels are free to group features in
 * ways the features themselves don't declare.
 *
 * Custom widgets (histograms, gizmo buttons, scene-histogram, etc.) are
 * not wired here yet — they'll slot into `widgets.before / after` as they
 * get ported (see engine-gmt/features/ui.tsx, a future mirror of GMT's
 * original `features/ui.tsx` registration file).
 */

import type { PanelManifest } from '../engine/PanelManifest';

export const GmtPanels: PanelManifest = [
    // Graph (Modular-only) sits at order 1 so it slots between Formula
    // and Scene when visible. `component` path — FlowEditor owns its
    // layout, no feature stacking.
    {
        id: 'Graph',
        dock: 'right',
        order: 1,
        component: 'panel-graph',
        showIf: (s) => (s as { formula?: string }).formula === 'Modular',
    },

    // Formula — bespoke GMT FormulaPanel. Uses the current formula's
    // `parameters` array from FractalRegistry to emit per-param sliders
    // with the formula-authored labels ("Power", "Fold Limit", "Phase
    // (θ, φ)", …) instead of the generic coreMath ones. Also stacks
    // FormulaSelect + geometry + interlace + LfoList + Modular graph
    // entry-point inside its own layout — AutoFeaturePanel can't
    // express the per-formula label overrides or the vec3 mode-specific
    // controls (rotation / direction / axes).
    {
        id: 'Formula',
        dock: 'right',
        order: 10,
        active: true,
        component: 'panel-formula',
    },

    // Scene — camera optics, atmosphere, water, color grading + an
    // Effects roll-up. Mirrors GMT's hand-written ScenePanel layout
    // via the manifest's `items` model (sections, group-filtered
    // feature blocks, conditional sub-blocks, collapsible). No
    // bespoke component required.
    {
        id: 'Scene',
        dock: 'right',
        order: 20,
        items: [
            // --- Optics: depth-of-field + projection ---
            { type: 'feature', id: 'optics', groupFilter: 'dof' },
            { type: 'feature', id: 'optics', groupFilter: 'projection' },

            // --- Navigation (advanced-only) ---
            { type: 'section', label: 'Camera & Navigation', showIf: 'advancedMode' },
            { type: 'feature', id: 'navigation', groupFilter: 'controls', showIf: 'advancedMode' },

            { type: 'separator' },

            // --- Atmosphere (fog) ---
            { type: 'feature', id: 'atmosphere', groupFilter: 'fog' },

            // --- Volumetric scatter (compile-toggle is in the feature itself) ---
            { type: 'feature', id: 'volumetric' },

            { type: 'separator' },

            // --- Water plane (only when enabled) ---
            { type: 'section', label: 'Water Plane', showIf: 'waterPlane.waterEnabled' },
            { type: 'feature', id: 'waterPlane', groupFilter: 'main',     showIf: 'waterPlane.waterEnabled' },
            { type: 'feature', id: 'waterPlane', groupFilter: 'geometry', showIf: 'waterPlane.waterEnabled' },
            { type: 'feature', id: 'waterPlane', groupFilter: 'material', showIf: 'waterPlane.waterEnabled' },
            { type: 'feature', id: 'waterPlane', groupFilter: 'waves',    showIf: 'waterPlane.waterEnabled' },

            // --- Color grading ---
            { type: 'feature', id: 'colorGrading', groupFilter: 'grading' },

            { type: 'separator' },

            // --- Effects roll-up ---
            {
                type: 'collapsible',
                label: 'Effects',
                items: [
                    { type: 'feature', id: 'postEffects', groupFilter: 'bloom' },
                    { type: 'feature', id: 'postEffects', groupFilter: 'lens' },
                    { type: 'feature', id: 'droste',      groupFilter: 'main' },
                    { type: 'feature', id: 'droste',      groupFilter: 'geometry',  showIf: 'droste.active' },
                    { type: 'feature', id: 'droste',      groupFilter: 'structure', showIf: 'droste.active' },
                    { type: 'feature', id: 'droste',      groupFilter: 'transform', showIf: 'droste.active' },
                ],
            },
        ],
    },

    // Light — advanced-only tab for per-light controls + gizmos.
    // Will gain LightGizmo / LightPanel widgets once those are ported.
    {
        id: 'Light',
        dock: 'right',
        order: 30,
        features: ['lighting', 'lightSpheres'],
        showIf: 'advancedMode',
    },

    // Shader — surface + atmosphere + ambient-occlusion + reflections +
    // volumetric + texturing + water + post-effects + droste.
    {
        id: 'Shader',
        dock: 'right',
        order: 40,
        features: [
            'materials',
            'atmosphere',
            'ao',
            'reflections',
            'volumetric',
            'texturing',
            'waterPlane',
            'postEffects',
            'droste',
        ],
    },

    // Gradient — colour-map authoring. Gets the ColoringHistogram widget
    // once ported (widgets.before: ['coloring-histogram']).
    {
        id: 'Gradient',
        dock: 'right',
        order: 50,
        features: ['coloring'],
    },

    // Quality — precision / step / performance knobs.
    {
        id: 'Quality',
        dock: 'right',
        order: 60,
        features: ['quality'],
    },

    // Audio — visible only while audio reactivity is on. Uses the
    // bespoke panel-audio component (AudioPanel) which contains the
    // full GMT modulation UI: dual decks with playback, spectrum canvas
    // with draggable frequency-band rules, per-rule LinkControls editor,
    // and the collapsible ModulationList of all active bindings.
    {
        id: 'Audio',
        dock: 'right',
        order: 70,
        component: 'panel-audio',
        showIf: 'audio.isEnabled',
    },

    // Drawing — visible only while drawing mode is on. Uses
    // AutoFeaturePanel for now; the bespoke DrawingPanel expects
    // `removeDrawnShape / clearDrawnShapes / updateDrawnShape`
    // actions that need a dedicated drawing slice port (same pattern
    // as cameraSlice / modularSlice). Deferred to a follow-up pass.
    {
        id: 'Drawing',
        dock: 'right',
        order: 80,
        features: ['drawing'],
        showIf: 'drawing.enabled',
    },

    // Engine — dev-only tab, hidden unless explicitly enabled. Mirrors
    // GMT's engineSettings.showEngineTab param-flag. Custom bespoke
    // component (EnginePanel) instead of AutoFeaturePanel stacking —
    // the panel has its own layout (per-feature rows with ON/OFF toggles
    // + compile-estimate row). Lives on the LEFT dock to match GMT's
    // original (keeps the right dock tidy; Engine is a dev surface).
    {
        id: 'Engine',
        dock: 'left',
        order: 10,
        component: 'panel-engine',
        showIf: 'engineSettings.showEngineTab',
    },

    // Camera Manager — bespoke saved-camera library UI. Opens as a
    // floating panel on demand via the Camera menu → "Camera Manager"
    // item (see engine-gmt/topbar.tsx).
    //
    // `dock: 'float'` + `isCore: false` = hidden from dock tab bars;
    // only appears when the topbar action calls `togglePanel(..., true)`.
    {
        id: 'Camera Manager',
        dock: 'float',
        order: 200,
        component: 'panel-cameramanager',
        isCore: false,
    },
];
