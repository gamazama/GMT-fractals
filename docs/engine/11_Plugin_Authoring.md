# 11 — Plugin Authoring

How to build a new core engine plugin. Target audience: someone adding `@engine/my-thing` and wanting it to behave consistently with the shipped plugins (topbar, menu, hud, help, shortcuts, undo, scene-io, camera).

Using a shipped plugin is covered in [04_Core_Plugins.md](04_Core_Plugins.md). This doc is the authoring recipe.

## The one-sentence contract

A plugin is a module that owns a module-scope registry, exposes `plugin.register/unregister/list/clear` + an idempotent `installPlugin()`, optionally ships a `<PluginHost />` component, and must never import the engine store at module load.

## Anatomy of a plugin

Every shipped plugin follows the same four-part shape. If you depart from it, have a specific reason.

```ts
// engine/plugins/MyThing.tsx

// 1. TYPES — what callers register
export interface MyThingItem {
    id: string;
    slot?: string;
    order?: number;
    component: React.FC;
    when?: () => boolean;
}

// 2. REGISTRY — module-scope mutable state + subscribers
const _items = new Map<string, MyThingItem>();
const _subscribers = new Set<() => void>();
let _rev = 0;
const _notify = () => { _rev++; _subscribers.forEach((fn) => fn()); };

const subscribe = (fn: () => void) => {
    _subscribers.add(fn);
    return () => { _subscribers.delete(fn); };
};

// 3. PUBLIC API — the singleton every caller imports
export const myThing = {
    register(item: MyThingItem) { _items.set(item.id, item); _notify(); },
    unregister(id: string)      { if (_items.delete(id)) _notify(); },
    list()                      { return Array.from(_items.values()); },
    clear()                     { _items.clear(); _notify(); },
};

// 4. INSTALL + HOST
let _installed = false;
export const installMyThing = () => {
    if (_installed) return;   // idempotent
    _installed = true;
    // Side effects: default registrations, subscriptions, etc.
};
export const uninstallMyThing = () => { myThing.clear(); _installed = false; };

export const MyThingHost: React.FC = () => {
    // useSyncExternalStore subscribes the component to _notify().
    // Returning a primitive (the monotonic revision) keeps the snapshot
    // cheap and stable.
    useSyncExternalStore(subscribe, () => _rev, () => _rev);
    // … render from _items.values(), honoring item.when() ...
};
```

That's it. Reference implementations: [engine/plugins/TopBar.tsx](../engine/plugins/TopBar.tsx), [engine/plugins/Menu.tsx](../engine/plugins/Menu.tsx), [engine/plugins/Hud.tsx](../engine/plugins/Hud.tsx).

## Rules

### R1 — Registry lives at module scope, not inside a component

```ts
// ✅ DO — module scope, single source of truth
const _items = new Map<string, Item>();

// ❌ DON'T — per-component state; two <Hosts/> would diverge
const Host = () => {
    const [items, setItems] = useState(new Map<string, Item>());
};
```

**Why:** anyone outside React can register into the plugin (another plugin, a boot script, a DDFS feature's `onSet`). State can only be reached by all of them if it's module-scope.

### R2 — Never import the engine store at module scope

```ts
// ❌ DON'T — freezes featureRegistry before registerFeatures.ts finishes
import { useFractalStore } from '../../store/fractalStore';

// ✅ DO — defer the reference to call time
const getStore = () => (globalThis as any).__store;
```

**Why:** importing `useFractalStore` triggers `createEngineStore()` which freezes `featureRegistry`. If your plugin is imported from `registerFeatures.ts` (directly or transitively), you'll cause features registered after that import to throw `FeatureRegistryFrozenError`. The HUD / help plugins both avoided this by either not touching the store at all OR reaching through `globalThis.__store` at call time.

See [20_Fragility_Audit.md F1](20_Fragility_Audit.md) for the wider trap.

### R3 — `install*()` is idempotent

```ts
let _installed = false;
export const installMyThing = () => {
    if (_installed) return;
    _installed = true;
    // ...
};
```

**Why:** two independent bundles in the same app will both call `installMyThing()`. The second must be a no-op. This is enforced by convention, not by the engine.

### R4 — Ship an `uninstall*()` for HMR and tests

```ts
export const uninstallMyThing = () => {
    myThing.clear();
    _installed = false;
};
```

**Why:** tests that mount/unmount the engine between runs need a clean slate. Vite HMR benefits too.

### R5 — Use `useSyncExternalStore` in the Host, not Zustand / Redux

```tsx
export const MyThingHost: React.FC = () => {
    useSyncExternalStore(subscribe, () => _rev, () => _rev);
    // ...
};
```

**Why:** the plugin is a standalone module, not a store slice. `useSyncExternalStore` is React's canonical primitive for "subscribe to external mutable state." Takes three args: `subscribe`, `getSnapshot`, `getServerSnapshot`. The snapshot must be referentially stable — returning a `_rev` counter works; returning `_items` directly works because we only mutate via `_notify()` which bumps rev and re-runs `getSnapshot`.

### R6 — Gate items with `when: () => boolean`, not conditional registration

```ts
// ✅ DO
myThing.register({ id: 'debug', component: DebugPanel, when: () => window.__dev });

// ❌ DON'T — freezes the condition at registration time
if (window.__dev) myThing.register({ id: 'debug', component: DebugPanel });
```

**Why:** the predicate is re-evaluated every render, so visibility stays live. Conditional registration freezes the state at boot and needs `unregister` + `register` to flip, which fights HMR.

### R7 — Expose on `window` for smoke tests (dev-only)

```ts
if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).__myThing = myThing;
}
```

**Why:** Playwright smoke tests need to probe plugin state. Baking a window hook keeps the test code simple. Guard on `DEV` so production bundles don't ship the global.

## The `install + Host` split

Why two surfaces instead of `<InstalledMyThingHost />`?

- **Install is imperative.** Apps call it once at boot, before React mounts. It's where default items get registered, subscriptions attach, shortcuts are bound.
- **Host is declarative.** Apps mount it in their tree where the widgets should render. It just subscribes and renders.

An app can install without mounting a Host (headless tests). An app can mount the Host before installing (unusual, but harmless — it renders an empty slot until install runs).

## Cross-plugin composition

When your plugin needs another plugin (e.g. `@engine/help` registers items into `@engine/menu`):

```ts
// ✅ DO — import the peer's API singleton
import { menu } from './Menu';

export const installHelp = () => {
    menu.register({ id: 'help.anchor', component: HelpAnchor, slot: 'right' });
};
```

**Rule:** peer plugins register via their public API only. Don't reach into `_items`, don't subscribe to the peer's `_subscribers` set. Those are private.

**Why:** the boundary keeps upgrade paths clean. A peer's registry representation can change without breaking consumers.

## Handles for non-React runtime state

If your plugin needs shared mutable state that both React components and non-React code (RAF loops, event handlers) read and write, use `defineAppHandles<T>()` rather than a module-scope `let`.

```ts
import { defineAppHandles } from '@engine/appHandles';

export const myHandles = defineAppHandles<{ cursor: { x: number; y: number } | null }>(
    { cursor: null },
);

// React:
const { cursor } = myHandles.useSnapshot();
// Imperative:
myHandles.ref.current.cursor = { x: e.clientX, y: e.clientY };
```

See [12_App_Handles.md](12_App_Handles.md) for the full pattern.

## Testing checklist

A plugin is ready to ship when:

- [ ] `install*()` called twice in the same process is a no-op.
- [ ] `uninstall*()` restores the registry to empty and lets `install*()` run again.
- [ ] `MyThingHost` re-renders when a new item is registered post-mount (use the `when` predicate or live `register` call to verify).
- [ ] A smoke test can probe the registry via `window.__myThing` (dev only).
- [ ] No top-level `import { useFractalStore }` in the plugin module or its transitive imports — grep the boot chain.
- [ ] Type-check (`tsc --noEmit`) clean.

## Reference implementations

| Plugin | File | Notable |
|---|---|---|
| `@engine/topbar` | [TopBar.tsx](../engine/plugins/TopBar.tsx) | Original slot-based pattern; three slots. |
| `@engine/menu`   | [Menu.tsx](../engine/plugins/Menu.tsx)     | Topbar dropdown menus; per-menu item registry. |
| `@engine/hud`    | [Hud.tsx](../engine/plugins/Hud.tsx)       | 7 slots, purely descriptive (no engine-owned widgets). |
| `@engine/help`   | [Help.tsx](../engine/plugins/Help.tsx)     | Composes with menu + hud; shows cross-plugin pattern. |
| `@engine/shortcuts` | [Shortcuts.ts](../engine/plugins/Shortcuts.ts) | Non-React plugin (no Host); same registry shape. |

## Decisions

### 2026-04-23 — Module-scope registry over `createContext`
**Decision:** plugin state lives on a module singleton, not a React context.
**Why:** non-React code (boot scripts, RAF loops, peer plugins in `install*()`) needs to call `register()` before React mounts. Context requires a provider in the tree; that rules out pre-mount registration.

### 2026-04-23 — Monotonic revision counter as `useSyncExternalStore` snapshot
**Decision:** `getSnapshot: () => _rev` where `_rev` increments on every `_notify()`.
**Alternative:** return `_items` directly. Works, but every call allocates a new iteration view even when items are unchanged. A counter is cheap and stable.

## Cross-refs

- Using a plugin (API shape from the caller side): [04_Core_Plugins.md](04_Core_Plugins.md)
- Feature registration (how DDFS features register, different lifecycle): [03_Plugin_Contract.md](03_Plugin_Contract.md)
- App-level handles pattern: [12_App_Handles.md](12_App_Handles.md) (to be written next to this doc)
