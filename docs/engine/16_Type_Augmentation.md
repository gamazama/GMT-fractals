# Type Augmentation — DDFS slices and dynamic store keys

**Status:** Reference. Snippets here are battle-tested in `fluid-toy/storeTypes.ts` and `fluid-toy/viewLibrary.ts`.

The engine store is generic. DDFS slices and `installStateLibrary` keys are
patched onto it at runtime, with names the engine doesn't know in advance. To
get typed `useEngineStore.getState().setBrush(...)` instead of
`(getState() as any).setBrush(...)`, the app declares those names via TypeScript
declaration merging.

This doc is the canonical pattern. Skip it and you'll grow `as any` faster than
you can clean it up — fluid-toy carried 33 of them across 10 files before this
pattern was applied; engine-gmt carried 24 in `features/ui.tsx` alone.

---

## TL;DR — the two-target rule

DDFS slices have **two** consumer paths in the engine, each with its own
declaration target:

| Consumer | Target interface | Module to augment |
|---|---|---|
| `useSlice('brush')` | `AppFeatureSlices` | `engine/typedSlices` |
| `useEngineStore.getState().setBrush(...)` | `FeatureStateMap` | `engine/features/types` |

The second one is the load-bearing one — `EngineStoreState extends FeatureStateMap`,
and `EngineActions` auto-derives `set<Feature>(p: Partial<...>)` from
`FeatureStateMap`'s keys. Augment both in your app's `storeTypes.ts`.

---

## DDFS slices — the canonical pattern

`<app>/storeTypes.ts` (no runtime imports needed; type-only):

```ts
import type { SliceFromParams } from '../engine/typedSlices';
import type { JuliaFeature }   from './features/julia';
import type { BrushFeature }   from './features/brush';
// …one type-import per feature

export type JuliaSlice = SliceFromParams<typeof JuliaFeature['params']>;
export type BrushSlice = SliceFromParams<typeof BrushFeature['params']>;

declare module '../engine/typedSlices' {
    interface AppFeatureSlices {
        julia: JuliaSlice;
        brush: BrushSlice;
        // …
    }
}

declare module '../engine/features/types' {
    interface FeatureStateMap {
        julia: JuliaSlice;
        brush: BrushSlice;
        // …
    }
}
```

**Important:** the file must be in the project's tsconfig `include`. Vite
doesn't need a runtime import for the augmentation to apply; tsc walks every
included `.ts`/`.tsx` and merges the `declare module` blocks. The comment in
your `main.tsx` should still reference `./storeTypes` so a reader knows the
augmentation lives there.

The `SliceFromParams<typeof Foo.params>` helper reconstructs the slice shape
from the DDFS param record — no second source of truth to keep in sync. Add a
param to the FeatureDefinition and the slice type updates; remove a param and
TS catches every consumer that read it.

---

## Cross-app leakage

`fluid-toy/storeTypes.ts` augmenting `FeatureStateMap` means **app-gmt's**
typed store will also list `julia: JuliaSlice; brush: BrushSlice` etc.
That's harmless: those slices aren't registered at runtime in app-gmt, so
`state.brush` is `undefined` despite the type claiming it exists. The cost is a
slightly wider type; the alternative (per-app tsconfig include lists) is
strictly worse.

`engine-gmt/storeTypes.ts` is in `tsconfig.exclude`, so its augmentation only
takes effect when an app explicitly `import 'engine-gmt/storeTypes'` (which
`app-gmt/registerFeatures.ts` does). That's intentional — fractal-toy and demo
should not see GMT slices.

---

## State-library installs (savedViews / savedCameras / …)

`installStateLibrary` patches dynamic keys onto the store at runtime. The keys
are configurable strings (`arrayKey`, `activeIdKey`, plus the action-name
overrides), so the engine *cannot* type them generically — only the consumer
knows what names it picked.

Pattern: declare-merge into `EngineStoreState` and `EngineActions` next to
the `installStateLibrary` call, with the **same literal keys** baked into both
sides. One source of truth (the install call); the augmentation is a plain
mirror.

Reference: `fluid-toy/viewLibrary.ts`:

```ts
import type { StateSnapshot, StateLibrarySavedToast } from '../engine/store/createStateLibrarySlice';

export interface JuliaViewState {
    kind: number;
    juliaC: { x: number; y: number };
    // …
}

export type ViewSnapshot = StateSnapshot<JuliaViewState>;

declare module '../types/store' {
    interface EngineStoreState {
        savedViews: ViewSnapshot[];
        activeViewId: string | null;
        savedViews_savedToast: StateLibrarySavedToast | null;
        savedViews_notifyDot: boolean;
        _viewIsModified?: (s: JuliaViewState) => boolean;
    }
    interface EngineActions {
        addView: (label?: string) => Promise<string>;
        updateView: (id: string, patch?: Partial<ViewSnapshot>) => void;
        deleteView: (id: string) => void;
        duplicateView: (id: string) => void;
        selectView: (id: string | null) => void;
        reorderViews: (from: number, to: number) => void;
        saveViewToSlot: (slotIndex: number) => void;
        resetView: () => void;
    }
}

// Then the install call uses the same literal keys:
export const installFluidToyViewLibrary = () => {
    installStateLibrary<JuliaViewState>({
        arrayKey: 'savedViews',
        activeIdKey: 'activeViewId',
        actions: {
            add: 'addView',
            update: 'updateView',
            delete: 'deleteView',
            duplicate: 'duplicateView',
            select: 'selectView',
            reorder: 'reorderViews',
            saveToSlot: 'saveViewToSlot',
            reset: 'resetView',
        },
        // …rest of the install opts
    });
};
```

The two transient toast / dot fields (`<arrayKey>_savedToast`,
`<arrayKey>_notifyDot`) are written by `installStateLibrarySlice` for the
`<StateLibraryToast>` component to read. Include them in the augmentation if
you mount the toast next to your library — see `engine/store/createStateLibrarySlice.ts`
exports `toastFieldKey` / `dotFieldKey` for the suffix constants.

The optional `_viewIsModified` field is fluid-toy-specific — added to the store
via `set({ _viewIsModified: fn })` from the install side so panels can call it
without re-implementing the diff. Only include if your install does the same.

---

## Why no generic helper

A `declareStateLibrary<TName, T>(...)` helper was considered and rejected.
Declaration merging in TypeScript only works when the augmenting `declare module`
block names literal keys — `[K in `${TName}_savedToast`]: ...` would compile but
TS doesn't propagate the key through a generic helper into the augmentation
target. The two-source duplication (install opts + `declare module`) is
irreducible. The above snippet is the cleanest form.

---

## When NOT to augment

- Truly local store keys (e.g. an in-memory cache used by one component) —
  just `(getState() as any).myCache`. Augmenting `EngineStoreState` for a
  one-off is overkill.
- Engine-managed keys already typed in `types/store.ts` — `panels`,
  `contextMenu`, `liveModulations`, `animations`, etc. Don't re-declare.

---

## Cross-refs

- `engine/typedSlices.ts` — `AppFeatureSlices`, `useSlice`, `useLiveModulations`, `SliceFromParams`.
- `engine/features/types.ts` — `FeatureStateMap`, `FeatureCustomActions`.
- `engine/store/installStateLibrary.ts` + `createStateLibrarySlice.ts` — state-library factory.
- Reference implementations: `fluid-toy/storeTypes.ts`, `fluid-toy/viewLibrary.ts`, `engine-gmt/storeTypes.ts`.
