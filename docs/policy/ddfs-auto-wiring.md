---
source: engine/FeatureSystem.ts
lines: 650
last_verified_sha: 5774b0830ecf55b891282969a56f991e903321c1
additional_sources:
  - utils/PresetLogic.ts
  - utils/PresetFieldRegistry.ts
  - engine/AnimationEngine.ts
  - store/slices/historySlice.ts
audited: 2026-05-20T15:30:00Z
audited_by: claude-opus-4-7
public_api:
  - featureRegistry
  - applyPresetState
  - presetFieldRegistry
  - applyAll
  - serializeAll
  - AnimationEngine
  - beginParamTransaction
  - endParamTransaction
depends_on: []
---

# DDFS auto-wiring — the four sites that must stay synchronised

The DDFS substrate (`featureRegistry`, engine/FeatureSystem.ts:363) is the single source of truth for which features exist and what params they expose. **Four downstream sites** iterate `featureRegistry.getAll()` (engine/FeatureSystem.ts:445) at runtime and derive everything else — auto-setter name, preset key, animation binder, undo snapshot — from string conventions over `feat.id` and `feat.params`. Adding a feature param is therefore free at every site; **changing the convention shape is not** — it requires synchronised edits at all four sites in one commit, because none of them imports the convention from a shared module (each re-implements the same string transform inline). This doc is the "change-once-change-all-four" reference; the string conventions themselves are owned by `ddfs-string-contract.md` (sibling cross-cut).

## The four sites (catalog)

| Site | File:line | Role | Reads from features |
|------|-----------|------|---------------------|
| 1. Preset load | utils/PresetLogic.ts:75-107 | `applyPresetState` iterates `featureRegistry.getAll()`, derives `set${FeatureId}`, looks it up in store actions, calls it with `preset.features[feat.id]` (sanitised) | `feat.id`, `feat.params` (for type-aware vec2/vec3/color sanitisation), `feat.state` |
| 2. Preset save (feature half) | store/engineStore.ts:370-376 | `getPreset` iterates `featureRegistry.getAll()` and copies each `s[feat.id]` slice through `sanitizeFeatureState` into `p.features[feat.id]` | `feat.id` |
| 2b. Preset save/load (non-feature half) | utils/PresetFieldRegistry.ts:93-112 | `presetFieldRegistry.applyAll` (load, called from utils/PresetLogic.ts:119) and `serializeAll` (save, called from store/engineStore.ts:365) iterate the **second** registry for top-level scene fields | n/a — second registry; sibling to featureRegistry |
| 3. Animation binder | engine/AnimationEngine.ts:146-210 | `getBinder` case 4 splits `trackId` on `.`, calls `featureRegistry.get(parent)`, derives `set${Parent}`, writes scalar or per-axis vec | `featureRegistry.get(parent)`, then derives `set${Parent}` from `parent` (which is `feat.id`) |
| 4. Undo snapshot | store/slices/historySlice.ts:96-107 | `beginParamTransaction` → `getParamSnapshot` iterates `featureRegistry.getAll()` and deep-clones `s[feat.id]` per slice; `endParamTransaction` diffs per-feature-id (store/slices/historySlice.ts:174-184) | `feat.id` |

(Site 2/2b counts as one "preset" obligation — they round-trip together; treat them as a single site for synchronised-change purposes, with the caveat that the save half lives in `store/engineStore.ts`, not in `utils/PresetLogic.ts`.)

## What auto-wiring does

Three load-bearing string conventions, all derived inline at each site from `feat.id` / `paramKey`:

- **Auto-setter name** — `` `set${id.charAt(0).toUpperCase() + id.slice(1)}` `` — produced once in `createFeatureSlice` (store/createFeatureSlice.ts:58) and re-derived independently at utils/PresetLogic.ts:76, engine/AnimationEngine.ts:155 (case 4) / engine/AnimationEngine.ts:214 (case 5 root fallback). HistorySlice's `applyStateRestore` also derives it for non-feature top-level keys (store/slices/historySlice.ts:123) when replaying a diff.
- **Track-id form** — scalar `` `${featureId}.${paramKey}` `` / vec axis `` `${featureId}.${paramKey}_<axis>` `` (UNDERSCORE) — produced by `deriveTrackBinding` (engine/animation/trackBinding.ts:63-84) and consumed by `AnimationEngine.getBinder` case 4 via the `child.match(/^(.+)_([xyzw])$/)` regex (engine/AnimationEngine.ts:181). The DOT form `param.axis` lives on as a legacy third-segment path inside case 4 (engine/AnimationEngine.ts:199-201).
- **Undo-diff key shape** — keys of the snapshot returned by `getParamSnapshot` are exactly `feat.id` (whole-slice clone, not per-param) — so the diff in `endParamTransaction` is at slice granularity, with redo capture replaying the same key set (store/slices/historySlice.ts:100-104, 177-184, 237-238).

For the canonical convention shapes, edge cases, and the AutoFeaturePanel writer side, see `ddfs-string-contract.md`.

## When you must change all four sites in sync

Examples — non-exhaustive but representative. Each row is a "synchronised commit" obligation:

| Change | Sites that must update | Failure mode if partial |
|--------|------------------------|------------------------|
| Auto-setter naming convention (e.g. `` `set${id}` `` → `` `set${id}Value` ``) | store/createFeatureSlice.ts:58 (writer), utils/PresetLogic.ts:76, engine/AnimationEngine.ts:155, engine/AnimationEngine.ts:214, store/slices/historySlice.ts:123 (replay) | Preset loads call missing setter → silent no-op (the utils/PresetLogic.ts:78 guard returns); animations fall through to no-op binder (engine/AnimationEngine.ts:89, with warn at engine/AnimationEngine.ts:207); undo replay skips the key (store/slices/historySlice.ts:124). All three fail silently — `typeof setter !== 'function'` is treated as "not registered, move on" at every site. |
| Track-id form (e.g. UNDERSCORE → DOT, or adding a new axis suffix) | engine/animation/trackBinding.ts:75-84 (writer), engine/AnimationEngine.ts:181-205 (reader, both UNDERSCORE and DOT branches) | New keyframes write the new form; old binder reads the old form → binder returns no-op (engine/AnimationEngine.ts:89). The cache at engine/AnimationEngine.ts:85-87 then locks the no-op in until the binder map is cleared. |
| Adding a new auto-derived per-feature property (e.g. `${id}.transform`, a per-feature lifecycle hook keyed by id) | Every site that iterates `featureRegistry.getAll()` and needs to read/write the new property — same four sites above, plus the writer at `store/createFeatureSlice.ts` | The property is dead at any site that doesn't consume it; if it has side effects the side effects are missing for that subsystem. |
| Removing a top-level Preset key (camera-style, non-feature) | utils/PresetFieldRegistry.ts (registration is removed; consumers automatically stop seeing the key); plus the store/engineStore.ts:365 `serializeAll` and utils/PresetLogic.ts:119 `applyAll` calls keep working — but legacy GMF files with the dropped key now silently lose that field on round-trip | Load-only / save-only asymmetry like `savedCameras` is intentional: `serialize: () => undefined` (see q-019) means `serializeAll` skips the key (utils/PresetFieldRegistry.ts:109). |
| Changing the undo snapshot granularity (e.g. per-param instead of whole-slice) | store/slices/historySlice.ts:96-107 (snapshot), store/slices/historySlice.ts:174-184 (diff), store/slices/historySlice.ts:237-238 (redo capture), and `applyStateRestore` (store/slices/historySlice.ts:117-127) which currently re-derives `set${k}` from each top-level key | Snapshot writes one key shape, diff reads another → diff is empty / always-different / partial. The redo path captures whatever keys the diff used, so they're already coupled within `historySlice`; the obligation is cross-site only if you also want preset save/load to round-trip the same granularity. |

Important: none of these sites imports the auto-setter convention from a shared helper — each re-derives `` `set${parent.charAt(0).toUpperCase() + parent.slice(1)}` `` inline. There is **no type-level enforcement** of the convention (`AppFeatureSlices` is empty by design; see feature-system.md). A search-and-replace across the four files is the only safe refactor.

## Invariants

- All four sites consume `featureRegistry.getAll()` (engine/FeatureSystem.ts:445) — a topologically-sorted (Kahn's algorithm, stable tie-break on registration index) cached list invalidated when `register()` mutates the registry. Sites MUST NOT iterate `features.values()` directly because the topo sort is what makes `dependsOn` semantically meaningful (engine/FeatureSystem.ts:444-448).
- The auto-setter convention `` `set${id with first letter capitalised}` `` is **load-bearing and not type-enforced**. All four sites independently derive it (utils/PresetLogic.ts:76, engine/AnimationEngine.ts:155, engine/AnimationEngine.ts:214, store/slices/historySlice.ts:123); a typo in one breaks one subsystem silently — the others continue working. The writer that creates it is store/createFeatureSlice.ts:58.
- All four sites silently no-op when the derived setter is missing. utils/PresetLogic.ts:78 `return`s, engine/AnimationEngine.ts:89 returns a no-op `() => {}` (or warns at engine/AnimationEngine.ts:207), store/slices/historySlice.ts:124 skips the key. **Missing setter never throws** — drift between writer and readers is invisible at runtime.
- The undo snapshot key set is exactly `featureRegistry.getAll()` ids plus `renderRegion` (store/slices/historySlice.ts:97-105). Adding a new auto-derived top-level scene key that should round-trip through undo requires either (a) adding it as a feature, (b) extending `getParamSnapshot` explicitly, or (c) routing it through `presetFieldRegistry` AND extending `getParamSnapshot` — undo does NOT iterate `presetFieldRegistry` today.
- `presetFieldRegistry.applyAll` is called UNCONDITIONALLY for every registered field, regardless of whether `preset[key]` is defined — implementations MUST guard on undefined themselves (utils/PresetFieldRegistry.ts:33-36 contract).
- `presetFieldRegistry.serializeAll` omits a key when its serialize returns `undefined` (utils/PresetFieldRegistry.ts:108-109). This is how `savedCameras` makes itself load-only (see q-019 and `camera-plugin.md`).
- `AnimationEngine.getBinder` checks `binderRegistry.lookup(id)` BEFORE the DDFS auto-derivation (engine/AnimationEngine.ts:82-83). Composite or non-conventional tracks therefore have an explicit escape hatch; this is the F6 fix referenced in animation.md. Site 3 of this contract is the **fallback**, not the only path.
- The undo replay path (`applyStateRestore`, store/slices/historySlice.ts:117-127) does NOT round-trip vec/color through THREE wrappers — it calls the same `set${k}` setter with whatever the snapshot held (which is `JSON.parse(JSON.stringify(...))` of the slice, store/slices/historySlice.ts:103). The auto-setter's sanitisation (store/createFeatureSlice.ts:70-88) re-wraps plain objects back into THREE instances on the way in.
- `endParamTransaction`'s diff uses `JSON.stringify` equality (store/slices/historySlice.ts:180). THREE-wrapped instances stringify with `isVector2` / `isColor` flags; vec sanitisation downstream strips those (utils/PresetLogic.ts:47-51) but the history path keeps them — so a slice mutated only by re-wrapping a vec **does** register as a diff. Generally harmless because the auto-setter only re-wraps when the input was a plain object.

## Interactions with other subsystems

- **e01-feature-system** (`docs/modules/engine/feature-system.md`) — owns `featureRegistry` and the writer side of the auto-setter convention. This doc is the consumer-side catalog.
- **e03-animation** (`docs/modules/engine/animation.md`) — owns the track-id convention (`engine/animation/trackBinding.ts:7-9` for the canonical comment; the binder reader is site 3 here).
- **e08-shortcuts-undo** (`docs/modules/engine/shortcuts-undo.md`) — owns the per-scope undo stacks and routing; this doc captures only the DDFS-iteration site (`beginParamTransaction`).
- **ddfs-string-contract** (`docs/modules/ddfs-string-contract.md`, sibling cross-cut) — owns the string conventions (`set${id}` shape, track-id grammar, vec axis suffix). This doc covers the four-site change contract; that doc covers the strings.
- **camera-plugin** / **presetField** registrars — `presetFieldRegistry` is populated by `utils/defaultPresetFields.ts`, `engine/plugins/camera/presetField.ts`, `engine-gmt/store/gmtPresetFields.ts`; both registries freeze together in `createFeatureSlice` (store/createFeatureSlice.ts:31, see q-013 / q-014). The freeze ordering is an invariant of e01, not of this contract.

## Known issues / Phase 2 carry-in

| Kind | Item | Site | Origin |
|------|------|------|--------|
| silent-fail | All four sites no-op when the derived setter is absent; a typo in one re-derivation is invisible at runtime. There is no central convention helper to grep against — each site re-implements the string transform inline. | utils/PresetLogic.ts:76, engine/AnimationEngine.ts:155, engine/AnimationEngine.ts:214, store/slices/historySlice.ts:123 | q-013 |
| silent-fail | `getAll()` falls back to registration order on dependency cycle (logs `console.error`, does not throw) — engine/FeatureSystem.ts:441-448. Downstream iteration still sees every feature exactly once, but in a non-deterministic order relative to the intended topo sort. Affects all four sites equally. | engine/FeatureSystem.ts:441-448 | f-002 (cross-ref) |
| design-choice | Undo snapshot granularity is whole-slice (deep-cloned via JSON round-trip). Param-level granularity would require either coarser keys (no change at the four sites) or per-param snapshot keys (which breaks the diff loop's per-feature-id assumption at store/slices/historySlice.ts:177-184). | store/slices/historySlice.ts:96-107 | q-013 |
| design-choice | `presetFieldRegistry` is the F3 fragility-audit fix that externalised hardcoded non-feature scene keys from PresetLogic. The first registry (`featureRegistry`) handles features; the second handles top-level scene state. Undo iterates only the first today — a top-level scene field that wants undo coverage must also extend `getParamSnapshot`. | utils/PresetFieldRegistry.ts; store/slices/historySlice.ts:96-107 | q-014, q-019 |
| drift-risk | The DOT form path (engine/AnimationEngine.ts:199-201) is documented as legacy but is still consulted on every case-4 lookup. Removing it requires verifying no saved scenes carry phase-5-era keyframes with `param.axis` shape — only the reader at engine/AnimationEngine.ts:199-201 holds the legacy branch; the writer at engine/animation/trackBinding.ts already produces UNDERSCORE only. | engine/AnimationEngine.ts:199-201 | q-013 |

## Historical context

No existing doc covered this four-site pattern as a synchronised-change obligation. The four sites were independently documented in their respective subsystem docs:

- feature-system.md described the auto-setter convention and listed the four downstream consumers under "Invariants" + "Interactions" (see docs/modules/engine/feature-system.md headings).
- animation.md described `AnimationEngine.getBinder` case 4 as the universal DDFS resolver and explicitly noted the convention is read at three sites (AutoFeaturePanel writer, `getBinder` reader, `createFeatureSlice` setter) — but did not enumerate PresetLogic or historySlice as participants in the same string contract.
- shortcuts-undo.md (the historySlice doc) covered the per-scope stacks but treated `getParamSnapshot`'s registry iteration as an implementation detail.

This doc is the canonical "if you change the convention, audit these four files" reference. The convention strings themselves continue to be owned by ddfs-string-contract.md (sibling cross-cut, scheduled alongside this doc).
