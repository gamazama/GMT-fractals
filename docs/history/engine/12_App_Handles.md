# 12 — App Handles

Pattern for app-scoped state that needs to be reachable from BOTH React components AND non-React code (RAF loops, pointer handlers, plugin customUI components) when context plumbing won't work.

## The problem

A DDFS `customUI` component mounts inside `AutoFeaturePanel`, which lives in a different React subtree from the app's canvas. React context doesn't reach across that gap. Two prior workarounds were unsatisfying:

- Module-scope `let` variables — untyped, scattered, no discovery.
- A single grab-bag object (`engineHandles = { current, gradientLut, brushRuntime, cursor, ... }`) — typed but a god-object that silently grows forever.

`defineAppHandles<T>()` is the replacement.

## API

```ts
import { defineAppHandles } from '@engine/appHandles';

interface BrushHandles {
    runtime: BrushRuntime;
    cursor: CursorState;
    gradientLut: Uint8Array | null;
}

export const brushHandles = defineAppHandles<BrushHandles>('fluid-toy.brush', {
    runtime: createBrushRuntime(),
    cursor: { dragging: false, uv: null, velUv: null },
    gradientLut: null,
});
```

Returns an `AppHandles<T>`:

| Field | Type | Use |
|---|---|---|
| `name` | `string` | Identifier for devtools / smoke tests. |
| `ref` | `{ current: T }` | Mutable ref. Read/write from anywhere. |
| `useSnapshot()` | `() => T` | React hook. Re-renders on `notify()`. |
| `subscribe(fn)` | `(fn) => unsub` | Imperative subscription. |
| `notify()` | `() => void` | Bump subscribers (call after write that needs React re-render). |
| `reset()` | `() => void` | Restore to the initial value. |

## When to use it vs alternatives

| Situation | Use |
|---|---|
| State owned by a single React subtree, child reads parent | `useState` + prop drilling or context |
| Cross-subtree state, both React + non-React readers | **`defineAppHandles`** |
| User-visible, preset-round-tripped data | DDFS feature slice (not this) |
| Transient per-frame data (no React) | Plain module-level `let` |

## Usage patterns

### React read

```tsx
const MyWidget: React.FC = () => {
    const { runtime, gradientLut } = brushHandles.useSnapshot();
    return <div>particles: {runtime.particles.length}, lut: {gradientLut ? 'ready' : 'loading'}</div>;
};
```

The hook returns the current `ref.current` and subscribes the component to changes. Writes via `ref.current.x = …` **do not** re-render unless the writer calls `.notify()`.

### Imperative write

```ts
// From a pointer handler:
brushHandles.ref.current.cursor.dragging = true;

// If any React component should re-render to reflect this, call:
brushHandles.notify();
```

For high-frequency writes (mouse-move, RAF ticks), skip `notify()` — the consumers usually read `ref.current` fresh every frame anyway.

### Smoke-test access

Dev bundles expose every handle on `globalThis.__appHandles[name]`:

```ts
const particles = (globalThis as any).__appHandles?.['fluid-toy.brush']?.ref?.current?.runtime?.particles;
```

Production bundles skip the global — no accidental API surface.

## Multiple handles vs one big handle

Prefer one handle per logical concern rather than one flat container:

```ts
// ✅ DO — purpose-bound
export const engineRef    = defineAppHandles<FluidEngine | null>('fluid-toy.engine', null);
export const brushHandles = defineAppHandles<BrushHandles>('fluid-toy.brush', { ... });
export const cursorHandles = defineAppHandles<CursorState>('fluid-toy.cursor', { ... });

// ❌ DON'T — grab-bag
export const handles = defineAppHandles<Everything>('fluid-toy', { engine: null, brush: {}, cursor: {}, ... });
```

**Why:** smaller types narrow the TypeScript surface; changing `brushHandles` doesn't ripple through consumers that only touch `cursorHandles`; the names document the coupling boundary.

## Decisions

### 2026-04-23 — Prefer module-level handle over React context
**Decision:** handles expose `.ref.current` as a plain module-scope accessor.
**Why:** customUI components mount in sibling subtrees to the app root; a context provider at the app root can't reach them without rewiring where the panels render. The module-level access is slightly less React-idiomatic but works uniformly from any code path.

### 2026-04-23 — Dev-only `globalThis.__appHandles`
**Decision:** populate a global bucket in dev, skip in prod.
**Why:** Playwright smoke tests need to probe live state. Hiding in prod avoids leaking an accidentally-usable API surface once the app ships.

## Cross-refs

- Plugin authoring: [11_Plugin_Authoring.md](11_Plugin_Authoring.md)
- Typed slices (DDFS state access): [engine/typedSlices.ts](../engine/typedSlices.ts)
