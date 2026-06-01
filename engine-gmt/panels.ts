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

/**
 * @invariant `order` is logical (10/20/30…) with deliberate gaps so
 *   inserts don't renumber. Dock sorts by order within a dock; ties
 *   at the same order resolve in undefined registration sequence.
 * @invariant `items: [...]` is used everywhere — GMT does not use the
 *   `features:` shorthand because every panel needs at least one of
 *   groupFilter / whitelistParams / compilable / accordion / conditional.
 *   Sibling apps (fluid-toy, fractal-toy) DO use the shorthand.
 * @invariant Camera Manager: `id: 'Camera Manager'` is the canonical
 *   PanelId used by cameraSlice; `label: 'View Manager'` is the
 *   user-visible string. The two diverge intentionally.
 */
export const GmtPanels: PanelManifest = [
    // Graph (Modular-only) lives on the left dock — same pattern as the
    // Engine Config panel (revealed via system menu's togglePanel call).
    // The picker surfaces this dock + focuses Graph when Modular is picked.
    // `component` path — FlowEditor owns its layout, no feature stacking.
    {
        id: 'Graph',
        dock: 'left',
        order: 1,
        component: 'panel-graph',
        showIf: (s) => (s as { formula?: string }).formula === 'Modular',
    },

    // Formula — manifest-driven. Each formula-related capability gets its
    // own section in the user's mental order. Geometry is one DDFS feature
    // exposed as multiple panel surfaces (julia / local rotation / burning /
    // hybrid box) so each user-visible concept has a dedicated section
    // header without splitting the underlying feature module.
    {
        id: 'Formula',
        dock: 'right',
        order: 10,
        active: true,
        helpId: 'panel.formula',
        items: [
            { type: 'widget', id: 'formula-params' },
            { type: 'separator' },

            // Julia / Offset — pure runtime (no compile gate). Visible only
            // when the active formula (or interlace partner) declares a
            // julia type. Self-contained julia formulas honor c internally
            // (per-formula decision via juliaType), so this section shows
            // for all formulas where juliaType !== 'none'. Label resolves
            // dynamically from the formula's juliaType.
            {
                type: 'runtime-section',
                id: 'geometry',
                runtimeToggleParam: 'juliaMode',
                runtimeGroup: 'julia',
                label: 'Julia / Offset',
                helpId: 'julia.mode',
                showIf: (s: any) => {
                    if (registry.get(s.formula)?.juliaType !== 'none') return true;
                    const il = s.interlace;
                    if (il?.interlaceCompiled && registry.get(il.interlaceFormula)?.juliaType !== 'none') return true;
                    return false;
                },
                labelFn: (s: any) => {
                    const primary = registry.get(s.formula);
                    if (primary?.juliaType === 'julia') return 'Julia';
                    if (primary?.juliaType === 'offset') return 'Offset';
                    const il = s.interlace;
                    if (il?.interlaceCompiled) {
                        const sec = registry.get(il.interlaceFormula);
                        if (sec?.juliaType === 'julia') return 'Julia';
                        if (sec?.juliaType === 'offset') return 'Offset';
                    }
                    return undefined;
                },
            },

            // Local Rotation — pre/post-iteration rotation matrices, compile-
            // gated (preRotMaster compiles the rotation logic), runtime toggle
            // (preRotEnabled hides the sliders without recompile).
            // Section-level reject: self-contained formulas own the full loop
            // and re-derive z each iteration, so pre/post rotation outside
            // their loop has no compounding effect. (World rotation handled
            // elsewhere remains applicable.)
            {
                type: 'compilable',
                id: 'geometry',
                compileParam: 'preRotMaster',
                runtimeToggleParam: 'preRotEnabled',
                runtimeGroup: 'transform',
                label: 'Local Rotation',
                requires: { rejects: { primary: ['shape:self-contained'] } },
            },

            // Burning Mode — compile-gated abs() line, with a runtime
            // mix slider so the effect can be faded in/out without
            // recompiling once it's been compiled in. Section toggle is
            // instant runtime on/off via `burningRuntime`; unload icon
            // removes burning from the shader entirely.
            // No reject: user-confirmed to work on self-contained
            // formulas (MandelTerrain composes the burning mix into its
            // pre-loop z), and engine injects unconditionally for non-
            // self-contained primaries including Modular.
            {
                type: 'compilable',
                id: 'geometry',
                compileParam: 'burningEnabled',
                runtimeToggleParam: 'burningRuntime',
                runtimeGroup: 'burning',
                label: 'Burning Mode',
            },

            // Hybrid Box — uses geometry's feature panelConfig (hybridCompiled
            // compile gate, hybridMode runtime toggle, fold-type compile
            // settings, hybrid group runtime params). Explicit label so the
            // section reads "Hybrid Box" rather than falling back to the
            // feature's name ("Geometry").
            // Section-level reject: self-contained formulas skip hybrid
            // wiring (geometry/index.ts:474). Modular composes fine.
            {
                type: 'compilable',
                id: 'geometry',
                label: 'Hybrid Box',
                helpId: 'hybrid.mode',
                requires: { rejects: { primary: ['shape:self-contained'] } },
            },

            // Formula Interlace — uses interlace's feature panelConfig.
            { type: 'compilable', id: 'interlace' },

            // Distance Estimator + Metric + Escape Radius — one block. Estimator
            // (compile-flagged) + Metric render as the dropdown row; runtimeGroup
            // 'metric' renders the remaining runtime metric params (Escape today,
            // plus any added later) inline directly below — no per-param entry.
            {
                type: 'compile-dropdown',
                id: 'quality',
                compileSettingsParams: ['estimator', 'distanceMetric'],
                runtimeGroup: 'metric',
                label: 'Distance Estimator',
                helpId: 'quality.estimator',
            },

            // No separator before lfo-list — every section above ends with
            // a built-in SectionDivider, so an explicit separator here would
            // double-divider.
            { type: 'widget', id: 'lfo-list' },

            // Footer reminder of the global 'H' hints toggle (shown only while
            // hints are on). Mirrors the pre-extraction FormulaPanel footer.
            { type: 'widget', id: 'hints-footer' },
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

            // Shadows — compile gate (shadowsCompile compiles the shadow
            // raymarching loop), runtime toggle (shadows hides at runtime
            // without recompile), compile-settings for algorithm and
            // stochastic-jitter (both compile-flagged). Section renders its
            // own divider, so no explicit separator needed after it.
            {
                type: 'compilable',
                id: 'lighting',
                compileParam: 'shadowsCompile',
                runtimeToggleParam: 'shadows',
                compileSettingsParams: ['shadowAlgorithm', 'ptStochasticShadows'],
                runtimeGroup: 'shadows',
                label: 'Shadows',
                helpId: 'shadows',
            },

            // Light Spheres — single compile-flagged boolean. Compilable
            // surface so toggling goes through the CompileBar instead of
            // routing to the Engine panel.
            {
                type: 'compilable',
                id: 'lightSpheres',
                compileParam: 'lightSpheres',
                label: 'Light Spheres',
            },
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

            // Geometric Orbit Trap — own compilable section so the
            // trapEnabled compile toggle goes through the CompileBar
            // instead of the Engine panel. Renamed from "Orbit Trap" so it
            // doesn't collide with the regular Orbit Trap mapping mode.
            // Pulled out of the gradient accordion because accordion
            // sections have no compile machinery and stacking a
            // CompilableFeatureSection inside would double-header.
            {
                type: 'compilable',
                id: 'coloring',
                compileParam: 'trapEnabled',
                runtimeGroup: 'trap_geom',
                label: 'Geometric Orbit Trap',
                helpId: 'grad.orbit-trap',
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

            // Shadows section moved to the Light panel (compilable surface).
            // The legacy `shadow_quality` groupFilter entry here matched no
            // params (group never existed in the feature def).

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

            // Distance Estimator + Metric live in the Formula tab (compile-
            // dropdown section). They're algorithm/metric choices about the
            // formula, not runtime quality knobs, so the Formula tab is the
            // right home.
        ],
    },

    // Audio — visible only while audio reactivity is on. Uses the
    // bespoke panel-audio component (AudioPanel) which contains the
    // full GMT modulation UI: dual decks with playback, spectrum canvas
    // with draggable frequency-band rules, per-rule LinkControls editor,
    // and the collapsible ModulationList of all active bindings.
    {
        id: 'Audio',
        dock: 'left',
        order: 30,
        component: 'panel-audio',
        showIf: 'audio.isEnabled',
        helpId: 'panel.audio',
    },

    // Drawing — visible only while drawing mode is on.
    {
        id: 'Drawing',
        dock: 'left',
        order: 40,
        component: 'panel-drawing',
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

    // Feedback — opened on demand from the Help menu (openFeedback). Defaults
    // to floating so it doesn't occupy a dock tab until the user drags it into
    // a dock; isCore:false gives it a close button. No showIf — visibility is
    // driven by isOpen (floating) / explicit docking.
    {
        id: 'Feedback',
        dock: 'float',
        order: 100,
        component: 'panel-feedback',
        isCore: false,
    },

    // View Manager — saved-view library + cardinal/preset toolbar +
    // composition guides. Lives in the (hidden-by-default) left dock
    // so the right dock stays focused on authoring tabs. Opens via
    // the topbar Camera menu's "View Manager" entry; the dock surfaces
    // when activated (see Dock.tsx).
    {
        id: 'Camera Manager',
        label: 'View Camera Manager',
        dock: 'left',
        order: 20,
        component: 'panel-cameramanager',
    },
];
