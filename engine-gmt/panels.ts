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
import { registry } from './engine/FractalRegistry';

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

    // Formula — manifest-driven. FormulaParamsWidget handles the dynamic
    // per-formula params (iterations + registry-driven scalar/vec controls);
    // everything else is expressed as items so the layout lives here, not JSX.
    {
        id: 'Formula',
        dock: 'right',
        order: 10,
        active: true,
        helpId: 'panel.formula',
        items: [
            // Per-formula params: iterations slider + registry-driven scalar/vec controls.
            // Kept as a widget because the param list is dynamically determined by the
            // active formula at runtime — not expressible as static manifest items.
            { type: 'widget', id: 'formula-params' },

            // Geometry modifiers: transform + burn groups (rotation, fold, scale).
            { type: 'feature', id: 'geometry', groupFilter: 'transform' },
            { type: 'feature', id: 'geometry', groupFilter: 'burning' },

            // Julia mode — hidden for formulas whose juliaType is 'none'.
            {
                type: 'feature',
                id: 'geometry',
                groupFilter: 'julia',
                helpId: 'julia.mode',
                showIf: (s: any) => registry.get(s.formula)?.juliaType !== 'none',
            },

            // Hybrid Box Fold — compile/runtime split driven by geometry.panelConfig.
            { type: 'compilable', id: 'geometry', helpId: 'hybrid.mode' },

            // Formula Interlace — compile/runtime split driven by interlace.panelConfig.
            { type: 'compilable', id: 'interlace' },

            // LFO / modulation list.
            { type: 'widget', id: 'lfo-list' },
        ],
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
        helpId: 'panel.scene',
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

            // --- Volumetric scatter (compile-toggle UI) ---
            // Renders via <CompilableFeatureSection> reading the
            // feature's panelConfig — same shape hybrid box and
            // interlace use. Plain `type: 'feature'` showed only the
            // runtime sliders without the compile toggle, leaving the
            // user dependent on the Engine panel to compile it on.
            { type: 'compilable', id: 'volumetric' },

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

    // Light — advanced-only tab. The bulk of the panel (per-light tab
    // strip, active-light editor, light-gizmo toggle) lives in the
    // bespoke 'light-panel-controls' widget — that block is a tightly
    // coupled tabbed editor that doesn't decompose cleanly into
    // separate manifest items today (active-light state is shared).
    // The Shadows global section migrates out: a feature item for the
    // shadows toggle, a conditional group-filtered feature item for
    // the inner shadow params. lightSpheres feature appended at the
    // bottom via AutoFeaturePanel.
    //
    // FUTURE: the per-light tab strip could become a generic
    // <TabStrip> primitive — when a second app needs it.
    {
        id: 'Light',
        dock: 'right',
        order: 30,
        showIf: 'advancedMode',
        helpId: 'panel.light',
        items: [
            { type: 'widget', id: 'light-panel-controls' },
            { type: 'separator' },
            { type: 'feature', id: 'lightSpheres' },
        ],
    },

    // Shader — material surface + environment + reflections + glow +
    // emission + ambient occlusion. Mirrors GMT's RenderPanel layout
    // exactly: a flat sequence of group-filtered features rather than
    // the whole feature stack. The features listed here are *only*
    // used for the groups they expose to this panel — other panels
    // (Light / Scene / Quality) own the rest of each feature.
    {
        id: 'Shader',
        dock: 'right',
        order: 40,
        helpId: 'panel.render',
        items: [
            { type: 'feature', id: 'materials',   groupFilter: 'surface'   },
            { type: 'feature', id: 'materials',   groupFilter: 'env'       },
            { type: 'feature', id: 'reflections', groupFilter: 'shading'   },
            { type: 'feature', id: 'atmosphere',  groupFilter: 'glow'      },
            { type: 'feature', id: 'materials',   groupFilter: 'emission'  },
            { type: 'feature', id: 'ao',          groupFilter: 'shading'   },
        ],
    },

    // Gradient — colour-map authoring. Mirrors GMT's ColoringPanel
    // accordion: Layer 1 + Layer 2 are mutually exclusive (Layer 1 is
    // the fallback), Noise is independent. Layer 1 has an internal
    // Gradient/Image-Texture switch that swaps the body content.
    //
    // Body layout uses the engine Accordion primitive. Headers carry a
    // bespoke gradient-strip preview (registered widgets) plus an "off"
    // badge when the layer's mix is 0. The histogram-layer marker
    // connector flips the histogram probe while a given layer is open.
    {
        id: 'Gradient',
        dock: 'right',
        order: 50,
        helpId: 'panel.gradient',
        items: [
            {
                type: 'accordion',
                sections: [
                    {
                        id: 'layer1',
                        label: 'Layer 1',
                        group: 'coloring-layers',
                        groupFallback: true,
                        headerWidget: 'gradient-preview-layer1',
                        helpId: 'panel.gradient',
                        items: [
                            { type: 'widget', id: 'coloring-histogram-layer-marker', props: { layer: 0 } },
                            { type: 'widget', id: 'texturing-source-toggle' },

                            // Gradient mode: full coloring stack.
                            { type: 'feature', id: 'coloring', groupFilter: 'layer1_top',
                              showIf: (s: any) => !s.texturing?.active },
                            { type: 'feature', id: 'coloring', groupFilter: 'layer1_grad',
                              showIf: (s: any) => !s.texturing?.active },
                            { type: 'feature', id: 'coloring', groupFilter: 'layer1_hist',
                              showIf: (s: any) => !s.texturing?.active },
                            { type: 'feature', id: 'coloring', groupFilter: 'layer1_bottom',
                              showIf: (s: any) => !s.texturing?.active },

                            // Image Texture mode: texturing groups + reduced layer1_bottom.
                            { type: 'feature', id: 'texturing', groupFilter: 'main',
                              showIf: 'texturing.active' },
                            { type: 'feature', id: 'texturing', groupFilter: 'mapping',
                              showIf: 'texturing.active' },
                            { type: 'feature', id: 'texturing', groupFilter: 'transform',
                              showIf: 'texturing.active' },
                            { type: 'feature', id: 'coloring', groupFilter: 'layer1_bottom',
                              excludeParams: ['twist'],
                              showIf: 'texturing.active' },
                        ],
                    },
                    {
                        id: 'layer2',
                        label: 'Layer 2',
                        group: 'coloring-layers',
                        headerWidget: 'gradient-preview-layer2',
                        activePredicate: (s: any) => (s.coloring?.blendOpacity ?? 0) > 0,
                        closedBadge: 'off',
                        helpId: 'panel.gradient',
                        items: [
                            { type: 'widget', id: 'coloring-histogram-layer-marker', props: { layer: 1 } },
                            { type: 'feature', id: 'coloring', groupFilter: 'layer2_top' },
                            { type: 'feature', id: 'coloring', groupFilter: 'layer2_grad' },
                            { type: 'feature', id: 'coloring', groupFilter: 'layer2_hist' },
                            // Escape radius — only relevant for layer 2 modes 6 / 8.
                            { type: 'feature', id: 'coloring', whitelistParams: ['escape'],
                              showIf: (s: any) => s.coloring?.mode2 === 6.0 || s.coloring?.mode2 === 8.0 },
                            { type: 'feature', id: 'coloring', groupFilter: 'layer2_bottom' },
                        ],
                    },
                    {
                        id: 'noise',
                        label: 'Noise',
                        activePredicate: (s: any) => (s.coloring?.layer3Strength ?? 0) > 0,
                        closedBadge: 'off',
                        defaultOpen: (s: any) => (s.coloring?.layer3Strength ?? 0) > 0,
                        helpId: 'grad.noise',
                        items: [
                            { type: 'feature', id: 'coloring', groupFilter: 'noise' },
                        ],
                    },
                ],
            },
        ],
    },

    // Quality — render-engine selector + resolution + AA + step
    // tuning + shadow quality. The bespoke header (render-mode tabs,
    // resolution preset, internal-scale buttons) lives in the
    // 'quality-render-controls' widget; the rest is per-group / per-
    // whitelisted-param feature blocks. Mirrors GMT's QualityPanel
    // top-to-bottom order.
    {
        id: 'Quality',
        dock: 'right',
        order: 60,
        helpId: 'panel.quality',
        items: [
            // Bespoke header: render mode + PT global + resolution + AA scale
            { type: 'widget', id: 'quality-render-controls' },

            { type: 'separator' },

            // Shadow quality — only when shadows are enabled at compile-time
            // AND turned on at runtime.
            {
                type: 'feature',
                id: 'lighting',
                groupFilter: 'shadow_quality',
                showIf: (s: any) => !!(s.lighting?.shadowsCompile && s.lighting?.shadows),
            },

            { type: 'separator' },

            // Raymarching: max steps
            { type: 'feature', id: 'quality', whitelistParams: ['maxSteps'] },

            // Step tuning
            {
                type: 'feature',
                id: 'quality',
                whitelistParams: ['fudgeFactor', 'stepRelaxation', 'stepJitter'],
            },

            { type: 'separator' },

            // Detail + threshold
            {
                type: 'feature',
                id: 'quality',
                whitelistParams: ['refinementSteps', 'detail', 'pixelThreshold', 'overstepTolerance'],
            },

            { type: 'separator' },

            // Distance metric + estimator
            {
                type: 'feature',
                id: 'quality',
                whitelistParams: ['distanceMetric', 'estimator'],
            },
        ],
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
        helpId: 'panel.audio',
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
        helpId: 'panel.drawing',
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
        helpId: 'panel.engine',
    },

    // Camera Manager — bespoke saved-camera library UI. Opens as a
    // floating panel on demand via the Camera menu → "Camera Manager"
    // item (see engine-gmt/topbar.tsx).
    //
    // `dock: 'float'` + `isCore: false` = hidden from dock tab bars;
    // only appears when the topbar action calls `togglePanel(..., true)`.
    // View Manager — saved-view library + cardinal/preset toolbar +
    // composition guides. Lives in the (hidden-by-default) left dock
    // so the right dock stays focused on authoring tabs. Opens via
    // the topbar Camera menu's "View Manager" entry; the dock surfaces
    // when activated (see Dock.tsx).
    {
        id: 'Camera Manager',
        label: 'View Manager',
        dock: 'left',
        order: 20,
        component: 'panel-cameramanager',
    },
];
