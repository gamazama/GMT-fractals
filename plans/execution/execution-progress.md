# Gradient Explorer — Execution Progress (LIVE STATE)

**This is the orchestrator's memory.** Update it every cycle. Where it disagrees with the
[playbook](execution-playbook.md), **this file wins** (it reflects ratified reality). Seeded
2026-06-05 at planning completion; nothing built yet.

Status legend: `not-started` · `in-flight` · `blocked` · `in-review` (gates/visual pending) ·
`merged` · `deferred`.

---

## Current phase: **Phase 0 COMPLETE ✅ → opening Phase 1** (integration branch `exec/gradient-explorer` @ `0e04e8d`)

- **P0a** — engine gradient + colour CORE — ✅ DONE (in-review, **uncommitted**; gates green;
  interfaces (e)+(f) FROZEN below).
- **P0b** — colour picker UI (consumes (f)) — ✅ DONE + **committed `018b63b`** (user visually
  confirmed incl. vector inputs). Rich picker + NEW shared `usePrecisionTrackDrag` primitive;
  ScalarInput refactored onto it (cross-cutting — see WATCH item below).
- **P0c** — Stops editor genericize-in-place + undo contract — ✅ **committed `ae449b8`** (independent
  review PASS, 2 lenses; user app-gmt visual confirm). (d) frozen + signed off. 3 hosts preserved.
- **P0d** — document-provider registry — ✅ **committed `45506c5`** (independent security review PASS;
  user visual round-trip confirm). (a) frozen + signed off. W8 correctness hole CLOSED (favients
  round-trips; heavy stores register their providers in Phase 1).
- **P0e** — drag/drop-wells + send-target kernels — ✅ DONE ((b)+(c) FROZEN; `/code-review high`
  (2 finders) + `/simplify`; fixed a generic `useSyncExternalStore` infinite-loop bug at the root).
  Gates green; nothing visible (kernels unconsumed = expected frozen-ahead). ✅ **committed `0e04e8d`;
  Phase 0 COMPLETE.** Integration branch `exec/gradient-explorer` established at this HEAD.

**S4↔S2 overlap (wave-2 sequencing):** S4 (import) now writes into the Favients menu + favientsStore;
S2 (favients undo/list/search) owns those. When S2 runs: it must rebase over S4's import action, AND
S4's imported-favient writes should go through S2's new history provider so imports are undoable. Land
S4 first (wave 1), then S2 rebases + folds import into its undo coverage.

**NEW-FINDING → backlog (knip false positives):** `gradient-explorer/main.tsx` is missing from knip's
entry list, so the whole gradient-explorer subtree (TopBarButtons, GradientExplorerApp, setup, …) reads
as orphaned. One-line `knip.json` fix in a cleanup pass — but it may surface real unused exports in that
tree, so do it deliberately (not mid-stream).

**NEW-FINDING → P2 (hero state-loss on resize):** in the Picker, resizing to a small/mobile viewport
flips the layout and the **hero gradient goes blank** — the desktop↔mobile branch swap remounts the
Picker subtree and drops the hero's local preview state. Likely pre-existing (polish flagged
state-loss-on-mode-switch); confirmed on the S1 branch but not S1's doing. **P2 owns the canonical hero
— lift its preview state to a transient store (same pattern as `pickerSearch`) so it survives the
remount.** (User reported 2026-06-06; "fix wherever convenient" → P2.)

**NEW-FINDING → P2 (what does clicking a gradient DO — key design input):** surfaced via S2 — currently
click=apply everywhere, but (a) it blocks clicking the name to rename, and (b) applying makes no sense when
the destination isn't on screen. User direction (up for discussion, but converging): **click should
SELECT the gradient and reveal options around it** (apply / Send-to / rename / fullscreen), not always
immediately apply. This IS the H2 canonical-hero + per-swatch Send-to model — P2 must design one coherent
"select → act" interaction across Picker/Favients/result-heroes (resolves the "3 competing models" finding
+ the pick-semantics decision). The S2 list-mode-rename fix is the interim; P2 does the real model.

**NEW-FINDING → P2 / cross-cutting (undo focus across modes):** Ctrl+Z can undo an action in a mode
you're not currently viewing (the undo stack is global; actions are per-mode). User wants either (a)
tab-switches become undo steps, or (b) undo auto-focuses/switches to the mode the undone action belongs
to. **Orchestrator lean: (b)** (standard "undo focuses the affected context"; (a) pollutes the stack with
navigation). Out of S2 scope — decide at P2 (which unifies cross-mode UX). (User reported 2026-06-06,
leans (a).)

**Carry-forward for P2 (portability integration):** (1) the DragWellsOverlay must coexist with
ImageStage's window dragover/drop file-import listener — **ImageStage must early-return when a
well-accepted MIME is present** (documented in dropWellRegistry.ts, not solved in P0e); (2) **real
drop-payload parsing needs a `/security-review`** (and W7 import too); (3) migrate
`palette/core/favientTargets.ts` onto the engine send-target registry + `createListRegistry`.

**PHASE 1 — Wave 1 COMPLETE ✅** (S1 `065fa72`, S4 `8945a9c`, S3 `cd4c469` all merged; **integration
gate green** — tsc 0 + test:palette all-pass on the combined branch @ `5525534`).

**PHASE 1 — Wave 2 PLAN (shared-shell — sequenced, not free-for-all):** run **S2 + S6 in parallel**
(largely disjoint: S2 = FavientsPanel/favientsStore/registerPaletteUI-history; S6 = App-overlay +
ramp-mappings + W4-wells-consumer), **then S5 alone** (Stops mode — touches registerPaletteUI [rebase
over S2], GradientExplorerApp [rebase over S1+S6], setup; running last absorbs all shared-shell edits
cleanly). **S2 must:** rebase over S4's FavientsPanel Import menu item AND fold imported-favient writes
into its new history provider (imports become undoable). **Convention still holds: sessions DO NOT edit
execution-progress.md.**

Next action: launch S2 + S6 worktrees → ingest/review/merge → then S5.

**Document round-trip coverage (W8) — track as streams register their providers:**
favients (P0d, reference consumer) · generator (S3) · image (its stream) · stops/paletteEditorStore (S5).
The engine registry + SceneIO wiring + the Replace/Append favients-load prompt land in P0d; heavy
stores register their own `{serialize,restore}` in their Phase-1 streams.

**Carry-forward for P0c:** the editor's buggy `getInterpolatedColor`
(`components/AdvancedGradientEditor.tsx:51-69`) is **STILL LIVE** — the engine `sampleStops` fix
exists but the editor isn't bound to it yet (P0c binds it + replaces the inline lambdas with
`stopOps`; re-key `double`'s `-dup` ids on adoption). **`stopOps.setBias(stops, index, …)` takes an
array index into a POSITION-SORTED array — pass the sorted array, not store order** (noted in stopOps.ts).
P0c **inherits the rich picker for free** where it mounts `EmbeddedColorPicker`, and the shared GMT
slider feel; it may reuse `components/inputs/usePrecisionTrackDrag.ts` for the 1-D stop bar drag.
**Orphan caution:** `utils/stopOps.ts` + `sampleStops` are intentionally unconsumed until P0b/P0c
— `npm run orphans` will flag them; **DO NOT delete** (frozen-ahead interfaces).
**Recommend:** commit P0a on `exec/phase-0-foundations` as a checkpoint before P0b.

**Orchestrator decisions on W10 leftovers (build-time, overridable):** Palette row = a **fixed
engine default swatch set** (keeps the engine picker host-agnostic — it can't depend on
palette/Favients; a host may pass an optional palette prop later). Recents = **shared** localStorage
(`gmt.colorpicker.recents`), capped ~16.

---

## Workstream status

| ID | Workstream | Phase | Status | Branch / worktree | Notes |
|----|------------|-------|--------|-------------------|-------|
| P0 | Engine foundations (W8 doc-registry, W10 picker, W4 kernel, W1-engine, undo contract, gmtGradient collapse) | 0 | ✅ **COMPLETE (P0a–P0e)** | `exec/phase-0-foundations` | ALL 6 interfaces (a)-(f) frozen; merging to integration → Phase 1 fan-out |
| S1 | W6 Picker text search | 1 | ✅ **merged `065fa72`** | `exec/s1-picker-search` | search only; pick-semantics + hero send/export → P2; +mobile-search additive edit to GradientExplorerApp (S5/S6 rebase) |
| S2 | W5 Favients undo/list/search | 1 | **in-review (round 3 — rename-UX fix)** | `exec/s2-favients` | undo/list/search + favourite rename (undoable) + drag-attempt clutter fix all DONE & verified. Round-3 finding: rename awkward — hover-enlarge obscures the name + grid click=apply blocks text-click. Final contained fix routed back: **rename = list-mode only; no hover-enlarge in list mode**. Big "what does click do" (select+options vs apply) → **P2** |
| S3 | W3 ghost curves + Generator coherence | 1 | ✅ **merged `cd4c469`** | `exec/s3-generator` | indep review PASS; 2 cleanups applied (ghost-fold gated on `ghostVisible`; `genEditEnd` gated on `interactive` = restores pre-S3 undo-arming) + 2 optional one-liners; gates green; user confirm (fixes invisible/strictly-improving) |
| S4 | W7 Import | 1 | ✅ **merged `8945a9c`** | `exec/s4-import` | Import in Favients kebab menu → parseGradientText → fitRampToStops → favientsStore.add (persisted, deduped); pure parsers + `/security-review` clean. Touched **FavientsPanel.tsx (S2's file)** — S2 rebases + folds import into its undo provider |
| S5 | W1 Stops *mode* | 1 | **queued (wave 2b — after S2+S6)** | `exec/s5-stops-mode` | run LAST: rebase over S2 (registerPaletteUI) + S1/S6 (GradientExplorerApp); mounts the engine Stops editor; shared: registerPaletteUI, GradientExplorerApp, setup |
| S6 | W11 Fullscreen configs | 1 | ✅ **merged `94e8e5d`** | `exec/s6-fullscreen` | foundation + fixes: drop-race in W4 kernel (capture→bubble reset — ratified into (b)) + isotropic geometries (radial/conic round). User visual confirm (drop opens fullscreen; shapes round). Integration gate green. FUTURE: richer options (backlog "fullscreen v2") |
| S7 | W12 ColorBox generator mode (v1 addition) | 1 | **queued (wave 3)** | `exec/s7-colorbox` | NEW easings.ts + buildColorBoxRamp (parallel builder) + generatorMode enum + DDFS/UI; additive, collision-free w/ wave 2. **LOCKED: shortest hue-path only; no Leonardo (modes = mixed+colorbox)** |
| S8 | W13 interpolation bases (v1 addition) | 1 | **queued (wave 3)** | `exec/s8-interp` | **Tier A monotone-cubic ONLY** (Tier B deferred): engine `sampleSorted` branch + union + AdvancedGradientEditor picker + JSON field. **ENGINE-CORE** (test:interlace + test:baseline gate, P0-level care) + touches the editor → run **AFTER S5** |
| P2 | W2 portability integration + W9 snapshot | 2 | not-started | `exec/p2-portability` | depends: ALL Phase 1; touches every hero |
| P3 | `/polish` pass | 3 | deferred | — | after structure lands |

---

## Frozen interfaces (FINAL signatures land here once Phase 0 ratifies)

> Until Phase 0 writes the final signatures here, the **proposed** ones in playbook §4 stand.
> Downstream streams must read THIS block, not the playbook, once it is populated.

- (a) **Document-provider registry — FROZEN + SIGNED OFF (P0d).** In-session HIGH `/code-review` +
  `/simplify` + dedicated deserialization security agent (2 real bugs found + fixed), THEN
  **orchestrator independent security review PASS** (reproduced the prototype-pollution edge in Node +
  confirmed closed; verified `includeDocuments` opt-in across every `getPreset` caller incl. the
  gallery/share privacy paths; trusted-id-only iteration; no leaked roots). 3 non-blocking nits.
  Matches playbook §4(a) (registry signature unchanged); one behaviour refinement (opt-in save flag)
  noted below — NOT an interface change.
    - **Engine registry** (`store/documentRegistry.ts`, pure engine-core, host-agnostic; parallels
      `registerHistoryProvider`):
      - `registerDocumentProvider(id: string, provider: DocumentProvider): void`
      - `unregisterDocumentProvider(id: string): void`
      - `interface DocumentProvider { serialize(): JsonValue; restore(snap: JsonValue): void }`
      - `serializeDocuments(): Record<string, JsonValue>` (collects all; each wrapped try/catch; `{}` if none)
      - `restoreDocuments(docs: unknown): void` (validates/ dispatches; **iterates only the TRUSTED
        registered ids via `hasOwnProperty` — never the untrusted snapshot keys**; each restore
        wrapped try/catch; no-op on absent/garbage `docs`).
      - `JsonValue` added to `types/common.ts` (exported via the `types` barrel).
    - **Scene-shape contract:** snapshots live on the `Preset` under a top-level
      `documents?: Record<string, JsonValue>` key (`types/preset.ts`), ALONGSIDE the DDFS
      `features`/scene fields — DDFS path untouched. Round-trips through JSON **and** GMF
      (`<Scene>` block) **and** PNG iTXt automatically (all serialise the whole `Preset`).
    - **Save/Load wiring:** `getPreset(options?: { includeScene?; includeDocuments? })` — when
      `includeDocuments`, attaches `documents` (omitted if empty, keeping legacy files byte-clean).
      `loadPreset` calls `restoreDocuments(p.documents)` after `applyPresetState` (back-compat:
      pre-`documents` scenes → no-op). **Opt-in by save path (the one §4(a) refinement):** only the
      file/PNG/autosave saves pass `includeDocuments:true` (`engine/plugins/SceneIO.tsx`
      `saveScene`/`saveScenePng`/`serializeCurrentScene`). Deliberately **NOT** on `getShareString`
      (favients library would bloat the URL) nor the dirty-hash/`lastSavedHash` paths (favouriting
      must not mark the scene dirty). Downstream streams that want a doc in the file just register a
      provider — no save-path change needed.
    - **Reference consumer = favients** (`palette/store/favientsDocument.ts`, registered in
      `registerPaletteUI` — additive shared-shell): `serialize` = the collection
      (`JSON.parse(exportCollection())`); `restore` compares the scene's gradients against the live
      shelf and branches: **identical** (nothing new, no extras) → **toast**, no dialog; **nothing
      new but shelf has extras** → **Replace/Omit** dialog (no Append); **something new** →
      **Append/Replace/Omit** dialog. Chosen action routes through `importCollection` (validates,
      fresh ids, content-sig dedupe, writes through to `localStorage gmt.favients` + store) + a result
      toast. The 3-way dialog is an **async, self-mounting** modal
      (`palette/components/favientsRestoreDialog.tsx`, lazy `react-dom/client` root on
      document.body) — host-agnostic, **zero app-shell edits** (works in the Gradient Explorer AND
      app-gmt), and non-blocking (scene finishes loading, dialog appears over it). Engine registry
      stays generic — the choice UX is entirely palette-side.
    - **S5 coverage note:** `paletteEditorStore` (stops doc) doesn't exist yet — it registers its own
      provider in S5. generator/image register theirs in their Phase-1 streams. (NOT wired here.)
- (b) **Drag + drop-wells kernel — FROZEN (P0e)** (engine-core: `store/dropWellRegistry.ts` +
  `store/dragFlight.ts` + `hooks/useDragInFlight.ts` + `components/DragWellsOverlay.tsx`):
    - `interface DropWell { id; label; accepts(types: string[]): boolean; onDrop(dt: DataTransfer): void; render?(s:{active:boolean}): ReactNode }` (**`render?` optional — §4(b) refinement, additive, ratified**).
    - `registerDropWell(well): () => void` (idempotent by id; returns unregister thunk) ·
      `unregisterDropWell(id)` · `getDropWells(): DropWell[]` (stable ref) · `subscribeDropWells(l)` ·
      `wellsForTypes(types): DropWell[]`.
    - `interface DragPayloadBase { kind: string }` (payload discriminator; kernel routes raw
      DataTransfer — visibility keys off `dataTransfer.types` only, getData blocked mid-drag).
    - `useDragInFlight(enabled=true): { inFlight: boolean; types: string[] }` · `<DragWellsOverlay z? className? />`.
    - **RATIFIED FIX (S6, 2026-06-06):** the drop `inFlight`-reset moved **capture→bubble** phase, so a
      well tile's bubble-phase `onDrop` runs before the overlay unmounts the tile (capture-first /
      bubble-last ordering; dragenter/leave/end stay capture). Behavior-only — signature unchanged.
      Was a latent kernel bug (S6 = first consumer to hit it). **P2 (heavy wells consumer) inherits this.**
- (c) **Send-target registry kernel — FROZEN (P0e)** (engine-core: `store/sendTargetRegistry.ts` +
  `components/SendToMenu.tsx`):
    - `interface SendTarget<P=unknown> { id; label; group: 'host'|'mode'; accepts?(payload: P): boolean; apply(payload: P): void }` — **§4(c) RATIFIED CHANGE: `apply(config: GradientConfig)` → generic `apply(payload: P)`** (engine-core can't reference GradientConfig; this IS Decision #8's genericization). **S2/S6/P2 register gradient targets/wells with their own payload type P = {GradientConfig + kind}.**
    - `registerSendTarget<P>(t): () => void` · `unregisterSendTarget(id)` · `getSendTargets()` ·
      `subscribeSendTargets(l)` · `targetsForPayload<P>(payload, opts?:{selfId?}): SendTarget<P>[]`.
    - `<SendToMenu<P> payload selfId? label? onSent? className? disabled? />`.
    - Shared primitive `createListRegistry<T extends {id:string}>()` (`store/createListRegistry.ts`) —
      id-keyed registry + React-safe cached snapshot (fixes a `useSyncExternalStore` infinite-loop
      class bug; backs both kernels). **`palette/core/favientTargets.ts` is a natural migration
      candidate → fold into P2's favient-target re-home.**
- (d) **Reusable-editor undo contract — FROZEN + SIGNED OFF (P0c; independent review PASS, 2 lenses).**
  Matches playbook §4(d). Optional props on engine `AdvancedGradientEditor`
  (`components/`):
    - `onEditStart?(): void` (open gesture bracket = one undo entry) · `onEditEnd?(): void` (close it).
    - `edit?(mutate: () => void): void` — discrete one-shot (start+mutate+end).
    - Default (all omitted) = engine StoreCallbacks `handleInteractionStart('param')` /
      `handleInteractionEnd()` → app-gmt rides undo unchanged. Palette host (S5) passes
      `genEditStart`/`genEditEnd`/`genEdit` (driving its `registerHistoryProvider` snapshot).
    - Supporting engine seam (not an (a)-(f) interface): `setGradientEditorEntrance` /
      `getGradientEditorEntrance` / `subscribeGradientEditorEntrance` in
      `components/gradient/gradientEditorEntrance.ts`. **Palette registers a Favients entrance via
      `registerPaletteUI` (additive shared-shell) — S5/S2 rebase over it, do NOT re-add.**
- (e) **Engine gradient core — FROZEN (P0a).** Lives in `utils/colorUtils.ts` (pure, no DOM/THREE);
  `palette/core/gmtGradient.ts` re-exports it. `palette/core` RGB ≡ structural `{r,g,b}`.
    - `sampleStops(stops, pos, blendSpace?='oklab', colorSpace?='srgb'): RGB` — canonical per-texel
      sampler, bias+step/smooth/cubic aware; shares private `sampleSorted` with `renderStopsToRamp`
      → byte-identical by construction.
    - `renderStopsToRamp(stops, blendSpace?='oklab', colorSpace?='srgb'): RGB[256]`
    - `renderStopsToBuffer(stops, blendSpace?='oklab', colorSpace?='srgb'): Uint8Array` (RGBA 256×1)
    - `generateGradientTextureBuffer(input)` — signature unchanged; now delegates.
    - `utils/stopOps.ts` (pure; selection by stop id, setBias by index): `stopOps.{ invert, double,
      distribute(ids), delete(ids), default(), normalizePaste(raw), move(ids,dt,snap?),
      scaleAboutPivot(ids,dt,side:'left'|'right'), setBias(index,dt,snap?) }` — also exported
      individually (`deleteStops`/`defaultStops` aliases). `double` mints **collision-safe** dup
      ids (`"<id>-dup"`, falling back to `-dup2…` if taken). `setBias(stops, index, …)` — `index`
      is into a **position-sorted** array (callers must pass sorted, not store order).
      `normalizePaste` tolerates no-`#` and 3-digit hex. `sampleStops` clamps `pos` on empty stops.
- (f) **Colour core — FROZEN (P0a)**, in `utils/colorUtils.ts` (pure; RGB+HSB only, no HSL).
    - `rgbToHsb===rgbToHsv` → `{h:0-360,s:0-100,v:0-100}`; `hsbToRgb===hsvToRgb` (h,s,b)→`{r,g,b}` 0-255.
    - `rotateHue(hex,deg): string` · `analogous(base,n=5,stepDeg=30): string[]` ·
      `monochromatic(base,n=5): string[]` · `complementary(base): string[]` ·
      `splitComplementary(base): string[]`. Harmonies: hex-in → hex[]-out.

---

## Locked product decisions (carry into every session)

From the [amendment plan](../gradient-explorer-amendments-plan.md) "Locked decisions" block:
1. Doc set = generator+image+stops+favients; favients **Replace/Append prompt** on load.
2. **Full** portability unification (one model, one target list, one canonical hero, per-swatch shelf).
3. detail/smooth = **non-destructive, ghost-previewed, bake-to-commit**.
4. Picker: remove standalone no-op pick (app-gmt pick = **out of scope, parked**).
5. Timeline = **keying/compare** tool; export snapshots current frame + cue.
6. Favourite = **saved-item id + Update-vs-Save-as-new**.
7. Engine-core: W8 + W10 + W1-engine (genericize in place) + **W4 kernel**.
8. W10 colour model = **RGB + HSB**. W11 configs **exportable** + randomized **re-roll + amount slider**.

**Out of scope (parked → post-execution research):** app-gmt host changes — its pick semantics
(bracketed apply + reveal target), DnD into app-gmt coloring layers.

---

## Cross-cutting watch items

- **`ScalarInput` refactored onto `usePrecisionTrackDrag` (P0b).** `ScalarInput` backs **every
  slider/vector input app-wide** and has **no unit tests**. The extraction is behavior-preserving
  (monorepo tsc 0, faithful-extraction self-review tracing every branch). **User visually confirmed
  both a normal dock slider AND vector/multi-axis inputs (2026-06-05) — safety net complete.** Still
  no unit tests, so **any later slider/vector work should glance at this** and re-confirm feel. New canonical primitive: `components/inputs/usePrecisionTrackDrag.ts`
  (click-to-position, delta-drag, Shift×10 / Alt×0.1, re-anchor) — single source of truth for
  ScalarInput + the picker; reusable by future track controls.

## Backlog / deferred debt

- **oklab/blend math duplicated across `utils/colorUtils.ts` and `palette/core/oklab.ts`** (P0a).
  The byte-exact stopfit regression went tautological after the gmtGradient collapse; now guarded by
  an explicit drift-pin (`test-palette-stopops §4`: `colorUtils.lerpOklab === palette/core/oklab.lerpOklab`,
  448 samples). Full de-dup needs a cross-layer move (engine `utils/` ↔ `palette/core/`) — out of P0a
  scope. Candidate: a `/simplify` micro-stream or fold into P3. Guarded, not silent.

- **Context-menu "Reset Default" forces `colorSpace='linear'`** (pre-existing in the editor;
  preserved verbatim by P0c, NOT introduced). Possibly an unintended default — revisit when the
  Stops mode (S5) / app-gmt coloring semantics are touched.

- **P0d security nits (3, non-blocking, follow-up):** (1) rapid double scene-load leaves the first
  restore Promise dangling (harmless, no state mutated); (2) no hard upper bound on imported favients
  count / snapshot size (scene-file size is the de-facto cap; matters only if scene files ever come
  from a fully-hostile remote feed — note: gallery submit excludes documents, so N/A today); (3)
  `favientsDocument.ts:72` re-stringifies then `importCollection` re-parses (minor double-work).

- **`npm run test:compat` FAILS — PRE-EXISTING, not P0d.** Confirmed identical on a clean tree
  (P0d changes stashed). It's a formula capability-gating snapshot drift, unrelated to the gradient
  work. Needs a separate `--write`/investigation pass (not a Phase-0 blocker; Phase-0 gates are tsc +
  test:palette + smoke:boot + orphans, all green).

- **Fullscreen mode v2 — "make it awesome" (user, 2026-06-06).** Even once S6 works, its foundation
  (6 static geometry renders) is too thin. Needs its own scoping pass: per-geometry parametric controls
  (radial centre, conic angle, S-curve shape, arch radius), more geometries (Diamond/Mirror/Bands/
  tiling), live/animated preview, apply-to-content previews, comparison/grid, zoom-pan. Scope with the
  user after S6 is fixed. (P2: fold the ⛶ open into the canonical hero + add gradient drag sources.)

## Changelog / decisions made during execution

_(Orchestrator appends every cycle: ratified interface changes, re-scopes, blockers resolved,
merges, plan amendments. Newest first.)_

- 2026-06-06 — **S2 round 3:** clutter fix (drag-attempt cue) + favourite rename (undoable) DONE &
  verified. New finding: rename UX awkward (hover-enlarge obscures name; grid click=apply). Interim fix
  routed back (list-mode rename, no hover-enlarge in list). The deeper "click=select+options vs apply"
  question → **P2** (key canonical-interaction input; see finding above). S2 merges after this fix.
- 2026-06-06 — **S6 RE-MERGED `94e8e5d`** (fixes, visually confirmed FIRST this time): drop-race in W4
  kernel (useDragInFlight capture→bubble reset — ratified into frozen (b); P2 inherits) + isotropic
  radial/conic/arched. Integration gate green. **Wave 2a: S6 ✅; S2 in-review (feedback round).**
- 2026-06-06 — **S2 feedback triage:** (4) "clear filter to reorder" → show only on drag-attempt (S2
  fix); (1) favourites can't be renamed at all (group-rename works/undoes) → fold favourite-item rename
  + undo into S2; (2) search/filter undo "not working" = **by design** (transient view state, like Picker
  filters — not a document mutation); (3) cross-tab undo UX (undo affecting an unseen tab) → **out of S2
  scope, logged → P2** (see carry-forward). S2 NOT merged until rename+clutter fix re-verified.
- 2026-06-06 — **dev/node_modules repaired** (partial-install: three/fflate/vite/.bin/tsc missing →
  blocked the app + 2 test scripts in every worktree via the junction). `npm install` in dev (637 pkgs)
  fixed it; worktrees junction to it so all now whole. (Matches the project_dev_toolchain_global_tsc note.)
- 2026-06-06 — **S2 code DONE (pending verify).** Undo provider (favients capture/restore + write-through),
  list view (per-host viewMode persist), search (transient, reorder disabled while filtered); folds S4
  import into undo. **Engine-core fix:** historySlice was pushing spurious no-op undo entries for any
  registered provider (incl. merged S3) → reads ext-key via provider.capture(); shared `paramUndoBracket.ts`
  extracted (gen+fav). Visual was env-blocked (deps) → unblocked now. NOT merged until full gate + visual
  (incl. generator-undo regression) confirm.
- 2026-06-06 — **S6 PREMATURE MERGE → BACKED OUT.** Orchestrator merged S6 on the user's "ok as a
  concept" comment, but that was a SCOPE note, not a works-confirmation — the user then found
  **fullscreen doesn't actually work at runtime** (tsc + test:palette had passed; visual-only break).
  Reset integration `cc2efbf` → `96cfa51` (S6 removed; work safe on `exec/s6-fullscreen` @ `3cfb400`).
  **PROCESS FIX: a merge requires an explicit "it works" visual confirm — never "concept ok."** S6
  stays in-flight; user fixing in wt-s6 → re-merge when working + confirmed. Wave 2a: S6 (fixing), S2 (in-flight).

- 2026-06-06 — **v1 additions folded in** (competitive-research probe → `gradient-v1-additions-scope.md`):
  W12 ColorBox-in-OKLCh generator mode (new easings.ts + parallel builder + generatorMode enum) and
  W13 richer interpolation bases (Tier A monotone-cubic = engine sampler branch; Tier B Catmull-Rom/
  B-spline = stretch). Added as streams **S7/S8, wave 3** (after wave 2). **Wave 2 unaffected** (W12 =
  generator-only, W13 = sampler+editor, both disjoint from S2/S5/S6). 3 scope decisions pending user
  (interp Tier B v1-vs-stretch; ColorBox hue-path; Leonardo 3rd-mode). Research verdicts: GMT leads on
  color science; 2D/mesh DEFERRED; stop model VALIDATED; ML-gen dropped.
- 2026-06-06 — **WAVE 1 COMPLETE** (S3 merged `cd4c469` via `5525534`). Integration gate green: tsc 0 +
  test:palette all-pass on the combined branch. S3's 2 review cleanups applied (ghost-fold/ghostVisible,
  genEditEnd/interactive) + 2 optional one-liners; merged without re-visual (fixes invisible /
  strictly-improving; #2 restores pre-S3 undo-arming). **Opening Wave 2: S2+S6 parallel → S5.**
- 2026-06-06 — **S4 (Import → Favients) MERGED `8945a9c`** (merge `e1e1735`; clean, disjoint from S1).
  User re-scoped (live) from wall→Favients kebab: pure parsers (.map/.gpl/.ggr/.cpt/.css/.json,
  security-clean) → fitRampToStops → favientsStore.add. Touched FavientsPanel (S2 rebases). User visual
  confirm. **Wave 1: S1✅ S4✅; S3 finishing its 2-cleanup fix pass.**
- 2026-06-06 — **S1 (Picker search) MERGED `065fa72`** (FF into integration; dev/ now on
  `exec/gradient-explorer`). User visual confirm. Gates green. Token-AND search + transient
  `pickerSearch` store + self-explaining count readout + mobile parity. Additive `GradientExplorerApp`
  edit flagged for S5/S6 rebase. NEW-FINDING logged → P2: hero blank on resize-to-mobile (remount
  state-loss). Wave 1 remaining: S3, S4 (summaries pending).
- 2026-06-06 — **P0e DONE → PHASE 0 COMPLETE.** Generic engine kernels: (b) drop-wells
  (`dropWellRegistry` + `dragFlight` reducer + `useDragInFlight` + `<DragWellsOverlay/>`) and (c)
  send-targets (`sendTargetRegistry` + `<SendToMenu/>`), backed by a shared `createListRegistry`.
  Pure engine-core, no consumers yet (frozen-ahead; 3 React shells orphan-flagged = expected).
  Ratified 2 interface refinements: §4(c) `apply` → generic `apply(payload:P)` (Decision #8
  genericization; S2/S6/P2 supply gradient payload), §4(b) `render?` optional. `/code-review high`
  (2 finders) fixed a generic `useSyncExternalStore` infinite-loop bug at the root in
  `createListRegistry`. Gates: tsc 0, test:palette (10 scripts), smoke:boot. P2 carry-forwards logged
  (ImageStage coexistence, drop-payload security-review, favientTargets migration). **All 6 interfaces
  (a)-(f) frozen. Committing → merge to integration → Phase 1.**
- 2026-06-06 — **P0d DONE** (in-review, uncommitted): engine **document-provider registry**
  (`store/documentRegistry.ts`) parallel to `registerHistoryProvider`; SceneIO Save/Load wiring via a
  `Preset.documents` key (opt-in `getPreset({includeDocuments})` on file/PNG/autosave saves; restore
  in `loadPreset`; back-compat for pre-`documents` scenes). **(a) FROZEN** above (signature matches
  §4(a); one opt-in-save refinement, not an interface change). Reference consumer = **favients**
  (`palette/store/favientsDocument.ts`, registered in `registerPaletteUI`): scene-restore is a 3-way
  **Append/Replace/Omit** dialog (async, self-mounting modal — `favientsRestoreDialog.tsx`; zero
  app-shell edits, works in both hosts) — identical shelf⇄scene → toast (no dialog); shelf-superset →
  Replace/Omit (no Append); new content → all three; routes through `importCollection` (validates +
  localStorage write-through) + result toasts. **(User-feedback revision: upgraded from a 2-way
  `window.confirm` to the 3-way dialog + toast.)** **Quality pass:** `/code-review high` + `/simplify` +
  dedicated deserialization `/security-review` (the skill's auto-diff errored on a missing origin
  ref → ran as a dedicated agent). **2 real bugs found + FIXED:** (1) persistent poison-pill —
  malformed stops from an untrusted scene survived `validFavients` then crashed `favientSig` on every
  star/toggle, bricking the shelf across sessions → hardened `isWellFormedFavient` (shared by load +
  import) + made `favientSig` total; (2) autosave "Restore Last Session" popped a pointless
  Replace/Append modal that mutated the global library → `newCount===0` short-circuit. Plus a
  low-sev defense-in-depth `pruneLabels` `__proto__` hardening (`UNSAFE_KEYS` skip). **Security
  verdict: safe to ship** (prototype-pollution INERT — registry iterates trusted ids only; no
  DoS/eval). Simplify: dropped now-dead per-entry guard + over-engineered `Parameters<>` cast. Gates:
  tsc 0 (monorepo), test:palette 9/9, smoke:boot clean, orphans clean (new modules consumed).
  Shared-shell: `registerPaletteUI` additive only. **Coverage note:** app-gmt's GMF save path
  (`engine-gmt/topbar.tsx` `saveGMFScene(getPreset())`) does NOT yet opt into `includeDocuments` —
  fine for P0d (reference = Gradient Explorer JSON); fold into app-gmt integration later. S5
  `paletteEditorStore` doc not stubbed (registers its own provider in S5). Awaiting user visual
  round-trip confirm → commit.
- 2026-06-06 — **P0c independent review PASS** (orchestrator-run, 2 parallel lenses: correctness +
  layering; primary review since the author's automated /code-review was declined). Both MERGE-READY,
  no REAL-BUG/SUSPICIOUS. Verified: undo brackets leak-free, echo-guard byte-identical, sampleStops
  bug-fix correct, setBias sorted-array correct, zero forbidden imports, seam pure engine-core
  (palette→engine), app-gmt + fluid-toy + (future S5) all preserved, isolatedModules clean. 2 benign
  nits (degenerate-drag no-op emit; safer paste validation) — no fix. (d) signed off. Awaiting user
  app-gmt visual confirm → commit P0c.
- 2026-06-06 — **P0c DONE** (in-review, uncommitted): engine `AdvancedGradientEditor` genericized
  in place — bound to `sampleStops` (bias/smooth bug-fix: new-knot colour now matches the baked ramp)
  + `stopOps.*` (−~70 lines inline math); exact 256-ramp `<canvas>` preview (LOCKED); severed the
  `hasFavients`/palette/engine-gmt couplings (editor now imports engine-core only); Favients entrance
  re-homed onto a new `gradientEditorEntrance` engine seam + palette `FavientsEditorEntrance`. **(d)
  FROZEN** (matches §4; default = engine StoreCallbacks bracket → app-gmt unchanged; S5 passes
  genEdit*). Echo-guard + legacy-array input + always-emit preserved. Gates: tsc 0 (monorepo),
  test:palette 9/9, smoke:boot, orphans clean (resolves the stopOps/sampleStops orphan carry-forward).
  Author's **`/code-review` skill was DECLINED** → manual review (fixed 2 self-introduced issues:
  knotSession dep churn, editAction fallback) → **orchestrator independent review now PRIMARY (running).**
  AutoFeaturePanel untouched (default seam). Shared-shell: registerPaletteUI additive only.
- 2026-06-05 — **P0b DONE** (in-review, uncommitted; user visually confirmed "all looks good"):
  rich `EmbeddedColorPicker` in place — 2D sat×bright field + hue strip, RGB+HSB sliders, **opt-in
  Alpha**, hex/copy/**eyedropper** (EyeDropper API + fallback), harmony rows, **shared capped
  Recents** (`gmt.colorpicker.recents`), **fixed default Palette** (+ optional `palette?` seam).
  Consumes (f) only — no interface moved. Additive back-compat props: `alpha?`/`onAlphaChange?`/
  `palette?`. **Design call:** `onColorChange` always emits `#RRGGBB` (6-digit; stop renderer's
  hexToRgb only matches 6) — **alpha is opt-in/gated**, no host wires it (stops are RGB); true-alpha
  gradients = a separate future stream. Quality pass: `/code-review medium` + `/simplify` + perf —
  fixed undo-transaction leak on capture-loss/unmount, invalid-hex revert-on-blur, greyscale hue
  preservation, harmonies recompute gated on open. **Scope-expansion (accepted):** extracted shared
  `usePrecisionTrackDrag` + refactored ScalarInput onto it (→ WATCH item). **P0c issued.**
- 2026-06-05 — **P0a quality pass DONE** (`/code-review high` + `/simplify`, gates re-green):
  hardening — `double` now collision-safe; `normalizePaste` tolerates no-`#`/3-digit hex; `sampleStops`
  clamps `pos` on empty stops; harmony docstrings fixed. Simplify — `wrapHue` dedup (−2 copies),
  `analogous` hoists base parse, `distribute` uses a Set. Drift-pin added (tautological regression →
  explicit `lerpOklab` equivalence). No interface signatures moved; (e) footnotes updated above. Debt
  logged (oklab/blend cross-layer dup). **P0a ready to commit.**
- 2026-06-05 — Added a **self-review quality pass** to the gates (playbook §5) + prompt template +
  summary `REVIEW` field: each session runs `/code-review` (effort by step) + `/simplify`, plus
  `/security-review` for W7/W8/W4; orchestrator runs an independent review on P0c/P2 diffs pre-merge;
  human may `/code-review ultra` at phase→main boundaries. P0b amended to include it.
- 2026-06-05 — **P0a DONE** (in-review, uncommitted): `sampleStops` (bias+smooth, byte-exact w/
  `renderStopsToRamp` via shared `sampleSorted` — fixes the editor drift at the root), `utils/stopOps.ts`,
  `gmtGradient.ts` collapsed to a re-export, `rgbToHsb`/`hsbToRgb`+harmonies in colorUtils, THREE import
  removed (keeps core DOM-free). Gates green (monorepo tsc 0, test:palette + new stopops). Interfaces
  (e)+(f) frozen above. No UI/shared-shell touched. **P0b issued.** Orchestrator resolved W10 leftovers
  (fixed-default Palette row; shared capped Recents). Editor bug still live → P0c.
- 2026-06-05 — P0a issued (engine gradient+colour core). Phase 0 chunked into P0a→P0e on one
  branch for context + incremental interface freeze.
- 2026-06-05 — kit created; planning complete; Phase 0 not yet started.
