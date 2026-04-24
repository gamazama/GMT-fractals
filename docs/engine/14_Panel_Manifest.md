# Panel Manifest

The engine's dock panels are declared by the **app**, not by individual features. An app provides a **`PanelManifest`** — an array of `PanelDefinition` objects — and `PanelRouter` + `Dock` read from it as the single source of truth.

## Why not per-feature tabs?

The earlier system had each DDFS feature declare its own tab via `tabConfig`. That works at toy scale (fluid-toy had 9 features → 9 panels, 1:1). It breaks down at GMT scale: GMT has ~26 features but only ~10 panels, and each of GMT's panels compose multiple features plus bespoke widgets (histograms, pickers, formula switchers). The tabConfig path assumed one-feature-per-tab, and the migration from GMT to the engine stalled when it tried to fit 26-feature composition through that door.

Panels are a UX concern; features are a state/params/shader concern. The manifest separates them.

## Type

```ts
// engine/PanelManifest.ts
export interface PanelDefinition {
    id: string;                       // unique id, also the tab label unless `label` overrides
    label?: string;
    dock: 'left' | 'right' | 'float';
    order: number;                    // lower renders first within a dock
    active?: boolean;                 // default-active for its dock
    showIf?: ShowIfPredicate;         // visibility gate (string path or function)

    // content path — pick one:
    features?: string[];              // stack these AutoFeaturePanels
    component?: string;               // render this componentRegistry entry verbatim

    widgets?: {
        before?: string[];
        after?: string[];
        between?: Record<string, string[]>;  // keyed by feature id to insert after
    };

    isCore?: boolean;                 // preserves the "core" flag on PanelState (default true)
}

export type PanelManifest = PanelDefinition[];
```

`ShowIfPredicate` is either a **dotted-path string** (walks `state.foo.bar` and returns its truthiness) or a **function** `(state) => boolean`. String form covers 90% of real cases (`'advancedMode'`, `'audio.isEnabled'`).

## Runtime

```ts
import { applyPanelManifest, addPanel } from '@engine/PanelManifest';

// Once at app boot, after features + components registered:
applyPanelManifest(MyAppPanels);

// Later, for dynamically-discovered panels (e.g. plugin-loaded formulas):
addPanel({ id: 'Mandelbulb', dock: 'right', order: 0, active: true, features: ['mandelbulb'] });
```

- **Merge semantics:** `applyPanelManifest` is additive. Entries previously added via `addPanel` survive, and vice-versa. Call order doesn't matter.
- **Active tab resolution:** lowest-order panel with `active: true` wins; else the current active stays (if still in the manifest); else the lowest-order panel in the dock.
- **Dock visibility:** handled by `Dock.tsx` via `evalShowIf(def.showIf, state)`. Panels with a false predicate are omitted from the tab bar but remain in `state.panels`.

## Three render paths in `PanelRouter`

1. **Bespoke component** — `def.component: 'panel-graph'` renders `componentRegistry.get('panel-graph')` verbatim. Widgets are NOT wrapped around it. Use for panels that don't map to features: FlowEditor, CameraManager, bespoke layouts.

2. **Feature stack** — `def.features: ['materials', 'atmosphere', 'ao']` renders `<AutoFeaturePanel featureId={...} />` for each, in order. `widgets.before` / `widgets.after` / `widgets.between[featureId]` slot in registered components (histograms, pickers). Per-param positioning still lives on the feature definition's `customUI` field.

3. **Empty fallback** — "Select a module" placeholder. Also shown when the active tab isn't in the manifest.

## Example — GMT's 10 panels (abridged)

```ts
// engine-gmt/panels.ts
export const GmtPanels: PanelManifest = [
    { id: 'Graph',    dock: 'right', order: 1,  component: 'panel-graph',
      showIf: (s) => s.formula === 'Modular' },

    { id: 'Formula',  dock: 'right', order: 10, active: true,
      features: ['coreMath', 'geometry', 'interlace'] },

    { id: 'Scene',    dock: 'right', order: 20,
      features: ['optics', 'navigation', 'colorGrading'] },

    { id: 'Light',    dock: 'right', order: 30, showIf: 'advancedMode',
      features: ['lighting', 'lightSpheres'] },

    { id: 'Shader',   dock: 'right', order: 40,
      features: ['materials', 'atmosphere', 'ao', 'reflections',
                 'volumetric', 'texturing', 'waterPlane',
                 'postEffects', 'droste'] },

    { id: 'Gradient', dock: 'right', order: 50, features: ['coloring'] },
    { id: 'Quality',  dock: 'right', order: 60, features: ['quality'] },

    { id: 'Audio',    dock: 'right', order: 70, features: ['audio'],
      showIf: 'audio.isEnabled' },
    { id: 'Drawing',  dock: 'right', order: 80, features: ['drawing'],
      showIf: 'drawing.enabled' },
    { id: 'Engine',   dock: 'right', order: 90, features: ['engineSettings'],
      showIf: 'engineSettings.showEngineTab' },
];
```

One feature can appear in multiple panels; one panel can compose any number of features. The manifest is the only place grouping decisions live.

## When to extend the manifest

The manifest's four composition primitives — `features`, `component`, `widgets`, `showIf` — cover every GMT panel pattern. Before adding a new field, check whether the need can be expressed as:

- A widget registered in `componentRegistry` → slot via `widgets.before / after / between`.
- A predicate → express as `showIf`.
- A bespoke layout → wrap as a single component, reference via `def.component`.

New fields are warranted only when a GMT (or future app) quirk genuinely isn't any of those. Keep the manifest small; apps do the composition.

## Migration notes (from the pre-manifest system)

- `FeatureTabConfig.dock / order / componentId / defaultActive / aggregatesFrom` — removed. Panels are now the sole owner of dock placement and composition.
- `engine/applyDefaultPanelLayout.ts` — deleted. Replaced by `applyPanelManifest`.
- `featureRegistry.getTabs()` — removed. No consumers.
- `PanelRouter` hardcoded special-cases for Graph / CameraManager / Engine — removed. These become manifest entries with `component: '...'`.
- `Dock.tsx` hardcoded per-id visibility (Graph if Modular, Light if advanced, Audio if enabled, Drawing if enabled) — removed. These are manifest `showIf` predicates now.
