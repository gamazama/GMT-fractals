# 05 — Shared UI 🚧

UI primitives are engine-level, pure, and shared across apps. A primitive takes props, emits callbacks, renders. Nothing more. Any capability beyond that (animation keyframe buttons, undo integration, context menus, shortcut hints) is **opt-in via React context**.

**Rule:** a primitive must not import the store. If it needs store state, it gets it via a context provider.
**Why:** toy-fluid proved the pattern — it uses GMT's `AdvancedGradientEditor` today only because that component accepts a store-callbacks context adapter. Generalizing this to every primitive is the way to make the UI library truly portable.

## Catalog

### Primitives (pure)
| Component | Purpose | Contexts it consults |
|---|---|---|
| `<Slider>` | float/int scalar input with drag-to-scrub | `AnimationContext`, `UndoContext` |
| `<Knob>` | rotary alternative to slider | same as Slider |
| `<ToggleSwitch>` | boolean | `UndoContext` |
| `<Dropdown>` | enum selection | `UndoContext` |
| `<TabBar>` | panel-level tab switcher | — |
| `<VectorInput>` | vec2 / vec3 / vec4 | `AnimationContext`, `UndoContext` |
| `<ColorPicker>` | color with OKLab interpolation | `AnimationContext`, `UndoContext` |
| `<AdvancedGradientEditor>` | full gradient editor with stops, color space, blend | `AnimationContext`, `UndoContext`, `ContextMenuContext` |
| `<CollapsibleSection>` | labeled collapsible wrapper | — |
| `<Popover>` | anchored floating panel | — |
| `<CompilableFeatureSection>` | compile-vs-runtime param split UI | `FeatureCompileContext` |
| `<DraggableWindow>` | floating window frame | — |
| `<Histogram>` | read-only histogram display | — |
| `<ContextMenu>` | right-click menu | `ContextMenuContext` |

### Composite components
| Component | Composition |
|---|---|
| `<AutoFeaturePanel>` | Iterates a feature's `params`, renders the appropriate primitive per type |
| `<KeyframeButton>` | Shown by primitives when `AnimationContext` is present |
| `<ParameterSelector>` | Dropdown of all registered animatable tracks |
| `<PanelRouter>` | Routes a panel id to its registered component |
| `<DopeSheet>` | Timeline keyframe grid |
| `<KeyframeInspector>` | Selected-keyframe detail panel |
| `<GraphEditor>` | Keyframe curve editor |

## The opt-in context pattern

Each capability has a dedicated context. Providers wrap a subtree; consumers use a hook. When the context is absent, the capability gracefully disappears.

### `AnimationContext`

```tsx
<AnimationProvider binder={animationBinder}>
  <AutoFeaturePanel featureId="dye" />
</AnimationProvider>
```

Inside the provider:
- `<Slider paramPath="dye.dissipation" ...>` shows a keyframe dot to the left of the label.
- Clicking the dot calls `binder.toggleKeyframe(paramPath, currentValue)`.
- A filled dot means a keyframe exists at the current time.

Outside the provider: slider is a plain slider. **No imports from `@engine/animation` in the primitive itself.**

### `UndoContext`

```tsx
<UndoProvider api={undoAPI}>
  <App />
</UndoProvider>
```

Inside:
- Each primitive's `onChange` is automatically bracketed with `undo.begin/commit` using an interaction-end debounce.
- Ctrl+Z / Ctrl+Y are wired (when `@engine/shortcuts` is also installed).

Outside: changes are direct; no undo/redo.

### `ContextMenuContext`

```tsx
<ContextMenuProvider>
  <App />
</ContextMenuProvider>
```

Lets any component call `useContextMenu()` to open a menu. Primitives that have native right-click semantics (e.g. `<AdvancedGradientEditor>` stop → duplicate/delete/copy) consume this.

### `ShortcutContext`

Surfaces shortcut hints. `<Slider hintKey="Ctrl+Shift+D">` shows the hint tooltip when hovering. Outside the provider, the hint is dropped silently.

### `FeatureCompileContext`

For shader apps: declares whether a param is compile-time (rebuilds shader) or runtime (uniform). `<CompilableFeatureSection>` uses this to split its UI.

## AdvancedGradientEditor — the litmus test

GMT's `AdvancedGradientEditor` is the most feature-rich primitive and the clearest test of the pure-primitive rule.

**Current (GMT) state:** already mostly pure — takes `value` + `onChange` + `onContextMenu`, uses `StoreCallbacksContext` for library integration. Toy-fluid consumes it via a context adapter.

**Engine target state:**
- Takes `value: GradientConfig`, `onChange(next)`.
- Opt-in contexts: `AnimationContext` (keyframe per stop? see [08_Animation.md § gradient-tracks](08_Animation.md#gradient-tracks)), `UndoContext`, `ContextMenuContext`, `PaletteLibraryContext` (list of preset palettes — both GMT's and toy-fluid's register here).
- No direct store imports. No hardcoded palette list.

**Rule:** if AdvancedGradientEditor works without any engine-specific setup in a blank React app with just `value` + `onChange`, every other primitive must clear the same bar.

## Color handling

**Rule:** color interpolation uses OKLab for perceptual uniformity, not RGB linear.
**Why:** RGB lerp passes through muddy grays; OKLab keeps hue. GMT's session retrospective flagged this — fractal color transitions were "washing out" until OKLab was adopted.

**Implementation:** `utils/colorUtils.ts` exports `lerpColor(a, b, t)` that goes via OKLab. Interpolators in [08_Animation.md § interpolators](08_Animation.md#interpolators) use this.

**User-visible toggle:** AdvancedGradientEditor supports color-space selection (RGB / OKLab / HSL) as a per-gradient setting; OKLab is the default.

## Panel registration

Features reference UI via `componentId`, which resolves through `componentRegistry`.

```ts
// In a feature definition:
ui: { panel: 'auto' }                            // default: use AutoFeaturePanel
ui: { panel: 'custom', componentId: 'my-panel' } // resolve via componentRegistry
```

```ts
// At boot, in registerFeatures.ts:
componentRegistry.register('my-panel', MyPanelComponent);
```

**Rule:** a feature's referenced `componentId` must exist in the registry, or the panel slot renders nothing silently (warns once in dev).
**Why:** typo-catching. The alternative (throwing) would crash apps when a plugin is partially loaded; warning is sufficient signal.

## Viewport overlays

Features can register DOM overlays that render on top of the viewport canvas:

```ts
viewportConfig: { componentId: 'overlay-brush-cursor', type: 'dom' }
```

Rendered by `<ViewportArea>` in document order, above the canvas. Handles pointer events. Apps that need z-ordering use the overlay's registration order.

**Non-DOM overlays (e.g. GPU gizmos drawn into the canvas):** are the app's concern, not the engine's. The engine doesn't own the canvas.

## The `useFeatureParam` hook

**Rule:** primitives that bind to a feature param use `useFeatureParam(featureId, paramId)`, not `useEngineStore(s => s[featureId][paramId])`.

```tsx
const dissipation = useFeatureParam('dye', 'dissipation');
// returns { value, setValue, meta: ParamMeta }
```

**Why:**
- Subscribes to only that leaf → fewer rerenders.
- Wraps `setValue` with undo integration, interaction-end debounce.
- Surfaces param metadata (min, max, step, label) for the primitive to consume.

This hook is the canonical bridge between primitives and feature state. It lives in `@engine/core`.

## Styling

- Tailwind utility classes are used throughout primitives today.
- Primitives expose `className` prop for per-instance overrides.
- Theme tokens (colors, spacing) live in `tailwind.config.js`; apps can override at the config level.

**Rule:** no CSS-in-JS, no styled-components. Keeps primitives cheap and predictable.

**Long term:** replacing Tailwind with CSS variables is on the table but not scheduled.

## Testing primitives

- Primitives are snapshot-tested via the engine's `npm run smoke:screenshot` harness when they render in the demo feature.
- Interaction tests use Playwright via `smoke:interact` — but only for integrated flows, not per-primitive.
- Per-primitive unit tests are not currently required; the integrated smoke tests cover the canonical usages.

## Decisions

### 2026-04-22 — All primitives are pure; capabilities via context
**Decision:** every primitive works in a blank React app with just `value` + `onChange`. Extra capability is context opt-in.
**Alternative:** primitives import from `@engine/animation` etc. Rejected — creates circular dependency and prevents using primitives in non-engine contexts.

### 2026-04-22 — AdvancedGradientEditor is shared, full-featured
**Decision:** promote to engine-level primitive. Apps register palette libraries via `PaletteLibraryContext`.
**Alternative:** each app reimplements gradient editing. Rejected — already identified as the third most-duplicated component after Slider and Dropdown.

### 2026-04-22 — OKLab default for color interpolation
**Decision:** default color lerp is OKLab; RGB and HSL are opt-in per param or per gradient.
**Rationale:** perceptual uniformity; GMT feedback memory confirms OKLab is the right default.

### 2026-04-22 — `useFeatureParam` as canonical binding hook
**Decision:** primitives that bind to feature state use `useFeatureParam` not `useEngineStore`.
**Rationale:** per-leaf subscriptions + wrapped undo/animation integration are too important to leave to each call site.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md). None specific to UI primitives; the pattern is sound. Main risk is **audit-compliance** — one primitive that slips and imports the store pollutes the guarantee.

**Audit gate:** before 1.0, grep every primitive for `useEngineStore` / `useFractalStore` imports. Any hit is a violation.

## Cross-refs

- Param types rendered by primitives: [02_Feature_Registry.md § param-types](02_Feature_Registry.md#param-types-and-interpolators)
- How primitives integrate with animation: [08_Animation.md](08_Animation.md)
- How primitives integrate with undo: [06_Undo_Transactions.md](06_Undo_Transactions.md)
