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

## Composition paths

PanelRouter resolves a panel's content in this order (richest first):

1. **`component: '…'`** — bespoke escape hatch. Renders that componentRegistry entry verbatim. Use only when `items` genuinely can't express the layout (e.g. ReactFlow node graph). Other content fields are ignored.

2. **`items: [...]`** — ordered list of render units. The richest layout the manifest can produce. Each item is one of:

   ```ts
   type PanelItem =
     | { type: 'feature',  id, groupFilter?, whitelistParams?, excludeParams?, className?, showIf? }
     | { type: 'widget',   id, props?, showIf? }
     | { type: 'section',  label, showIf? }
     | { type: 'separator', showIf? }
     | { type: 'collapsible', label, items, defaultOpen?, showIf? };
   ```

   - **`feature`** renders `<AutoFeaturePanel>` for that feature. `groupFilter` shows only params with that DDFS group; `whitelistParams` shows only the listed keys; `excludeParams` skips them.
   - **`widget`** renders a componentRegistry entry. `props` are forwarded; the standard `{state, actions, onSwitchTab}` are always passed.
   - **`section`** is a section-label header (`<SectionLabel>`).
   - **`separator`** is a thin divider line.
   - **`collapsible`** is a roll-up group with a clickable label; nested `items` can be any PanelItem (including more collapsibles).
   - **`showIf`** on any item is re-evaluated each render — same predicate model as panel-level `showIf`.

3. **`features: [...]` + `widgets: {…}`** — shorthand. Compiles internally to an equivalent `items` list (`widgets.before` → leading widgets, each feature → a `feature` item, `widgets.between[id]` → widgets right after that feature, `widgets.after` → trailing widgets). Convenient for trivial panels.

4. **Empty fallback** — "Select a module" placeholder. Shown when neither path produced any content, or the active tab isn't in the manifest at all.

## When to use `items` vs `features:` shorthand

Use the `features:` shorthand when:

- The panel renders one or more features back-to-back with no headers between them.
- Custom widgets fit cleanly in `before` / `after` / `between` positions.
- All params of each feature should appear (no group filtering, no advanced-only sub-blocks).

Use `items: [...]` when **any** of these apply:

- Section headers separate logical groups (e.g. "Optics" / "Camera & Navigation" / "Atmosphere").
- A feature appears more than once in the same panel with different `groupFilter` values (GMT's optics panel has a "DoF" block and a "Projection" block, both backed by the same feature).
- Advanced-only sub-blocks need `showIf: 'advancedMode'` (or any other predicate) on individual items rather than the whole panel.
- A roll-up section folds extra controls behind a clickable header (`type: 'collapsible'`).
- A widget needs props supplied at the manifest level rather than reading from the global store.

The two are not mutually exclusive in practice — most apps will use `features:` for simple panels and `items:` for the few that need richer layouts.

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
