# 03 — Plugin Contract 🚧

How an add-on (an app or a feature bundle) plugs into the engine. The contract is three files with specific import ordering.

**Rule:** the three files must execute in the order registration → store-creation → panel setup. Getting this wrong silently breaks late-registered features.

## The three files

```
my-addon/
├── registerFeatures.ts   ← side-effect module: featureRegistry.register(…)
├── MyFeature.ts          ← the feature definition(s)
└── setup.ts              ← runs after store exists; seeds panels, wires DOM hooks
```

### Step 1 — `registerFeatures.ts`

```ts
// my-addon/registerFeatures.ts
import { featureRegistry, componentRegistry } from '@engine/core';
import { MyFeature } from './MyFeature';
import { MyOverlay } from './MyOverlay';

featureRegistry.register(MyFeature);
componentRegistry.register('overlay-my-thing', MyOverlay);
```

**Rule:** this file is a **side-effect module**. Importing it runs the registrations. Do not wrap in a function; there's no later hook to call.
**Why:** features must land in the registry before the store is constructed. See [02_Feature_Registry.md § freeze](02_Feature_Registry.md#the-registrys-frozen-state).

### Step 2 — Store creation

The app's entry (`index.tsx`) imports `registerFeatures.ts` BEFORE any module that reads `useEngineStore` / `useFractalStore`. Typical pattern:

```tsx
// index.tsx

// STEP 1: all registrations — side-effect imports, ordered
import './my-addon/registerFeatures';
import './features/ui';            // engine-bundled UI components

// STEP 2: core plugins the app uses
import { installShortcuts, installUndo, installTopBar, installRenderLoop } from '@engine/core-plugins';

// STEP 3: only now import anything that reads the store
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { setupMyAddon } from './my-addon/setup';

installShortcuts();
installUndo();
installTopBar();
installRenderLoop();

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
setupMyAddon();  // step 3 below
```

**Rule:** the order within step 1 matters when features declare `dependsOn` on each other. A dependent feature must register AFTER its dependency.
**Why:** cycle detection runs at freeze; but declaration order lets the registry build a consistent snapshot.

### Step 3 — `setup.ts`

```ts
// my-addon/setup.ts
import { useEngineStore } from '@engine/core';

export const setupMyAddon = () => {
  const store = useEngineStore.getState();
  store.movePanel('MyThing', 'right', 0);
  store.togglePanel('MyThing', true);
};
```

**Rule:** `setup.ts` runs AFTER React mounts and the store exists. It's where you seed initial panel positions, attach non-React event handlers, or kick off one-shot boot logic.
**Why:** it can't run at module load (store not constructed); can't run in a component `useEffect` easily (timing across multiple add-ons gets racy). A dedicated post-mount call is the simplest contract.

## Boot timeline

```
t=0   Module evaluation begins
      ├─ import './addon-a/registerFeatures'  → featureRegistry.register(A)
      ├─ import './addon-b/registerFeatures'  → featureRegistry.register(B)
      └─ import './features/ui'               → componentRegistry.register(…)

t=1   installShortcuts(), installUndo(), … called
      Core plugins attach to registry, register their components/shortcuts

t=2   createEngineStore() is called (typically inside useEngineStore's first import)
      ├─ featureRegistry.freeze()
      ├─ createFeatureSlice() snapshots registry → builds state + setters
      └─ Registered bridges + binders take effect

t=3   ReactDOM.createRoot().render(<App />)
      Components mount; useEngineStore returns live state

t=4   setupMyAddon(), setupOtherAddon() called
      Panel positions seeded, one-shot wiring done

t=∞   Stable runtime. featureRegistry throws on register().
```

**Rule:** nothing after t=2 may register features or components. The engine asserts this in dev.
**Why:** the store is built by snapshotting the registry; late arrivals are invisible to the store.

## Failure modes and how each fails

| What you do | What happens (dev) | What happens (prod) |
|---|---|---|
| Register a feature after store creation | Throws `FeatureRegistryFrozenError` | Warns, returns silently |
| Register duplicate feature ID | Throws `DuplicateFeatureError` at registration | Throws in prod too (data loss risk) |
| Register a feature with unknown param type | Throws `UnknownParamTypeError` at registration | Throws |
| Read another feature's state without declaring `dependsOn` | Throws `FeatureIsolationError` | Warns, returns value |
| Import `useEngineStore` before `registerFeatures` has run | Store built with missing features; setters undefined | Same, silent |
| Cycle in `dependsOn` graph | Throws `FeatureCycleError` at freeze (boot) | Throws (can't be safely resolved) |
| Forget to install `@engine/render-loop` and don't call `runTicks` yourself | Dev warning after 3 seconds of no ticks | No warning; animations silently don't play |
| `componentId` referenced by a feature is not in `componentRegistry` | Dev warning once per missing ID | Component slot renders nothing |

**Rule:** failures that can cause data loss (duplicate ID) throw in both dev and prod. Failures that degrade gracefully (isolation, missing component) warn in prod.
**Why:** shipping an app shouldn't crash because of a missing non-critical overlay, but silently losing a registered feature to overwrite would surprise users.

## Installing core plugins

Each plugin exports an `install*()` function. Conventions:

```ts
installShortcuts({
  // options — all optional, sensible defaults
  domRoot: window,
  captureMode: 'capture',
  ignoreOn: ['input', 'textarea', '[contenteditable]'],
});

installUndo({
  maxEntries: 50,
  defaultDebounceMs: 1500,
});

installTopBar({
  slots: ['left', 'center', 'right'],
});
```

**Rule:** `install*()` is idempotent — calling twice is a no-op. Plugins are singletons.
**Why:** when two different sub-packages both want shortcuts, they both call `installShortcuts()`; the second call shouldn't wipe the first.

## Apps that DON'T install a given plugin

All core plugins are opt-out. A headless test harness or a highly minimal prototype can skip any or all:

- **No `@engine/shortcuts`** → no global keyboard. Apps that want keys must attach listeners themselves.
- **No `@engine/undo`** → setters still work; no undo/redo.
- **No `@engine/animation`** → keyframe buttons don't appear in `<Slider>`; tracks can't play.
- **No `@engine/topbar`** → no top chrome. Apps render their own or none.
- **No `@engine/render-loop`** → app must `tickRegistry.runTicks(dt)` every frame.

**Rule:** features must not assume a specific plugin is installed. Use `if (engineCapabilities.hasAnimation)` to gate animation-dependent UI.

## Reference implementations

- **`demo/`** — minimal add-on. No core plugins other than what the engine entry installs.
- **`toy-fluid/`** (when ported) — full-featured add-on with all core plugins, domain features, custom canvas.
- **GMT** (when ported onto engine) — apex reference; formula library + raymarching + lighting + video export.

## Decisions

### 2026-04-22 — Three-file contract (not one-function registration)
**Decision:** addons split registration (side-effect) from setup (post-mount call).
**Alternative:** a single `installMyAddon()` that does everything. Rejected — timing of registration vs. store creation must happen BEFORE React mounts; a single call can't satisfy both.

### 2026-04-22 — Freeze errors in dev, warn in prod (for isolation); throw in both (for duplicates)
**Decision:** differentiate "data loss risk" (throw both) from "graceful degrade" (dev-only throw).
**Rationale:** reduces shipping-app crash surface while keeping dev loud.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md):
- **F1** — late registration (this doc's main concern).
- **F2** — duplicate IDs.

## Cross-refs

- Feature definition: [02_Feature_Registry.md](02_Feature_Registry.md)
- Core plugin surfaces: [04_Core_Plugins.md](04_Core_Plugins.md)
- Render-loop contract: [01_Architecture.md § render-loop](01_Architecture.md#the-render-loop-contract)
