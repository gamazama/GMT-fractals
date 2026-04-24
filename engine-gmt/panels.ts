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

    // Formula — core iteration math. coreMath = the formula kernel
    // params; geometry = folds/hybrids; interlace = per-iter alternation.
    // FormulaSelect widget slots above the feature stack — click the
    // dropdown to switch between the 42 formulas (fires setFormula →
    // CompileGate → worker recompile).
    {
        id: 'Formula',
        dock: 'right',
        order: 10,
        active: true,
        features: ['coreMath', 'geometry', 'interlace'],
        widgets: {
            before: ['formula-select'],
        },
    },

    // Scene — camera optics, navigation tuning, colour grading.
    {
        id: 'Scene',
        dock: 'right',
        order: 20,
        features: ['optics', 'navigation', 'colorGrading'],
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

    // Audio — visible only while audio reactivity is on. When hidden,
    // it still exists in state.panels, just omitted from the tab bar.
    {
        id: 'Audio',
        dock: 'right',
        order: 70,
        features: ['audio'],
        showIf: 'audio.isEnabled',
    },

    // Drawing — visible only while drawing mode is on.
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
    // + compile-estimate row).
    {
        id: 'Engine',
        dock: 'right',
        order: 90,
        component: 'panel-engine',
        showIf: 'engineSettings.showEngineTab',
    },

    // Camera Manager — panel is registered in componentRegistry
    // (engine-gmt/features/ui.tsx) but NOT in the manifest: the panel
    // reads `state.savedCameras / addCamera / deleteCamera / ...` which
    // come from GMT's cameraSlice, not yet ported into the engine-gmt
    // store surface. Re-add this manifest entry after cameraSlice is
    // ported. Until then the Camera menu's "Camera Manager" item logs
    // a stub message instead of opening the panel.
];
