# Gradient Explorer — Execution Progress (LIVE STATE)

**This is the orchestrator's memory.** Update it every cycle. Where it disagrees with the
[playbook](execution-playbook.md), **this file wins** (it reflects ratified reality). Seeded
2026-06-05 at planning completion; nothing built yet.

Status legend: `not-started` · `in-flight` · `blocked` · `in-review` (gates/visual pending) ·
`merged` · `deferred`.

---

## Current phase: **PHASE 1 COMPLETE ✅ → P2 (integration pass)** (integration branch `exec/gradient-explorer` @ `cb421c5`)

All Phase-0 foundations + all Phase-1 streams merged & gate-green.

**RUNNING IN PARALLEL (2026-06-07, non-blocking):**
- **(a) LIVE-FRACTAL CARVE — DELIVERED, IN-REVIEW** (wt-lf, `exec/livefractal`; 36 files +3478/−1617 on
  b2db36b). Carved fluid-toy's fractal kernel + gradient sampler + TSAA + GradientLutManager + the WHOLE
  deepZoom/* stack + DeepZoomController → **engine/fractal/** (share-not-fork; fluid-toy via re-export
  shims). New **FractalColorRenderer** (own WebGL2 ctx). GX "Fractal" mode (frozen ramp colormap + live
  phase/repeats/mapping + palette-cycle + pan/zoom + PNG + WebGL2 fallback). **SCOPE-EXPANDED: deep zoom
  INCORPORATED** (was deferred +L) — off-thread orbit/LA/AT, double-double pan, 1e-100 floor; 2822 colors
  @1e-9. ADR-0063 (carve), ADR-0064 (LA→PO ref-index fix vs FractalShark). Gates green; NO fluid-toy
  regression. **MERGE GATES: independent review ✅ PASS (2 lenses, both MERGE-READY — carve verified
  byte-faithful, FluidEngine zero-diff, layering clean, WebGL lifecycle/leak-fix solid, all shader loops
  bounded) + USER visual confirm.** ⭐ **Lens A flagged ONE smoke-INVISIBLE reservation** → the required
  visual: **a fluid-toy AT+LA *deep* Mandelbrot view vs the pre-fix build** (ADR-0064 advances `iter` but
  not `ref` through the AT prepass → handoff index short by the AT-covered count when AT is active; AT+LA
  always co-active; no smoke covers it — the deep-zoom smokes are CPU-builder-only, the GX one only checks
  distinctColours≥50). On clean → merge as-is. Open → backlog (see below). **OWNED BY bootstrap session
  through merge; fresh orchestrator owns overnight cleanups + P2 (avoid double-editing this log).**
- **(b) OVERNIGHT AUTONOMOUS RUN ✅ COMPLETE + ALL 3 CLEANUPS MERGED 2026-06-07** (PM, user-authorized).
  The 4 overnight units: `fullscreen-v2-scope.md` (doc, → backlog/decisions) + 3 cleanups now **MERGED**
  into integration (knip `91313d8` · oklab `9a83f0f` · facet `d2227f7` = HEAD; combined gate green).
  fullscreen-v2 decision (a) resolved (user: S6 live+good). **P2 scope probe launched** → `plans/p2-scope.md`
  (the human-run probe never landed). Live-fractal still in wt-lf (user: wait).

**🔁 ORCHESTRATOR HANDOFF (2026-06-07):** the bootstrap orchestrator session got heavy → handing the role
to a FRESH orchestrator (doc-anchored, this file is the memory). In-flight to ingest: the live-fractal
carve (wt-lf, exec/livefractal — needs independent review + human visual confirm of fluid-toy AND the
fractal mode before merge); the P2-scope probe doc; then run fullscreen-v2 scope; then P2. **New
orchestrator: run autonomous SAFE units (scoping + low-ambiguity cleanups) overnight, paced, NO MERGES;
everything waits for human visual confirm to merge.**

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

**NEW-FINDING → P2 (drag interaction = MAJOR selling point; polish bar HIGH) + ARCHITECTURAL FORK:**
User vision: a **lifted swatch that hovers smoothly near the cursor** while dragging (custom animated
avatar, not the static browser drag image), and **cross-tab drag-to-reveal** (drag from Picker → hover a
mode tab → it switches → drop onto e.g. a Generator slot). **The P0e W4 kernel is HTML5 `dataTransfer`**
(good for cross-app + file drops + wells, but the drag visual = static browser image; cross-tab is
possible but clunky). The smooth-avatar + cross-tab vision points to **pointer-based custom drag**. So a
real P2 paradigm decision: HTML5 vs pointer vs hybrid.
**VERDICT (probe `plans/p2-drag-interaction-scope.md`, 2026-06-06): HYBRID** — pointer-primary in-app
(lifted avatar + cross-tab), HTML5 retained ONLY at the OS boundary (file-drop import + optional
cross-app export). Key finding: the app is ALREADY pointer-native (dataTransfer in 8 files; pointer-
capture in 40+), so the pointer controller joins the dominant paradigm; precedents to mirror —
`usePrecisionTrackDrag`, `Dock` tab-reorder (drag-survives-DOM-change), `GradientHoverPreview`
(body-portaled animated avatar). **Kernel: WRAP not supersede** — (b) HTML5 well kernel retained for the
file/cross-app island (scope narrows, no signature change); **S6 fullscreen well MIGRATES to the
pointer/(c) path → ⚠ RE-VERIFY fullscreen at runtime (concept-ok≠works lesson).** Enabler = the (c)
`getRect?` amendment (ratified above). Effort ~L (1–2-wk P2 stream): 2 spines [avatar] + [unified target
list] → then drop-resolution/cross-tab.
**P2 DRAG DECISIONS — LOCKED 2026-06-06:** (1) `getRect?` amendment ratified; (2) **KEEP HTML5 cross-app
export drag** on result sources (drag a gradient out to other apps — manage the avatar/drag-image
collision); (3) **desktop-first** pointer drag, **mobile uses Send-to menu** (touch-drag = fast-follow);
(4) avatar = **clean core (lift/follow/settle) + in-flight target hints** (valid/invalid affordance,
target-action hints, well highlighting — per "polish as hard as possible"); (5) tab-dwell ~400ms (tune live).

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
| S2 | W5 Favients undo/list/search | 1 | ✅ **merged `39ad6a2`** | `exec/s2-favients` | undo/list/search + favourite rename (single-click, list-mode, no-enlarge, undoable) + engine-core historySlice fix + shared paramUndoBracket. User visual confirm; full integration gate green. Deferred→P2: click=select-vs-apply model, cross-tab undo focus |
| S3 | W3 ghost curves + Generator coherence | 1 | ✅ **merged `cd4c469`** | `exec/s3-generator` | indep review PASS; 2 cleanups applied (ghost-fold gated on `ghostVisible`; `genEditEnd` gated on `interactive` = restores pre-S3 undo-arming) + 2 optional one-liners; gates green; user confirm (fixes invisible/strictly-improving) |
| S4 | W7 Import | 1 | ✅ **merged `8945a9c`** | `exec/s4-import` | Import in Favients kebab menu → parseGradientText → fitRampToStops → favientsStore.add (persisted, deduped); pure parsers + `/security-review` clean. Touched **FavientsPanel.tsx (S2's file)** — S2 rebases + folds import into its undo provider |
| S5 | W1 Stops *mode* | 1 | ✅ **merged `73bcd08`** | `exec/s5-stops-mode` | 4th mode: mounts engine editor (P0c) as-is; paletteEditorStore + (d) seam + history & 'stops' doc providers; EditorStage + StopsDockPanel (doc-level inspector, T5) + Stage/MOBILE_MODES + setup. **Also: EmbeddedColorPicker responsive reflow (see watch) + blank-canvas fix.** User visual confirm; full gate green. **WAVE 2 COMPLETE — studio is now 4-mode.** |
| S6 | W11 Fullscreen configs | 1 | ✅ **merged `94e8e5d`** | `exec/s6-fullscreen` | foundation + fixes: drop-race in W4 kernel (capture→bubble reset — ratified into (b)) + isotropic geometries (radial/conic round). User visual confirm (drop opens fullscreen; shapes round). Integration gate green. FUTURE: richer options (backlog "fullscreen v2") |
| S7 | W12 ColorBox generator mode (v1 addition) | 1 | ✅ **merged `5c2a280`** | `exec/s7-colorbox` | easings.ts + buildColorBoxRamp + generatorMode + visual easing picker + colored L/C/h sliders (NEW additive `ScalarInput.trackBackground`) + colorBoxFit.ts (frozen-ahead for P2 drop) + "Fit from gradient" interim button. Fixed hue-key-casing black-ramp bug. User visual confirm; full gate green |
| S8 | W13 interpolation bases | 1 | ✅ **resolved — DEFERRED, no code** | `exec/s8-interp` | S8 REFUTED Tier A: 2-point `sampleSorted` can't overshoot → monotone-cubic degenerates to smoothstep (already ships as smooth/cubic); the no-overshoot win needs **multi-point = Tier B**. **W13 entirely deferred to Tier B**; v1 ships nothing from it. Zero code (sampler byte-unchanged). Good catch (flawed scope-doc premise). Rationale → project memory |
| P2 | W2 portability integration (W9 deferred) | 2 | **IN FLIGHT — RE-SCOPED** (`plans/p2-remaining-scope.md`) | merged: live-fractal · P2-F · P2-A · P2-A-Picker+polish (`fdfcbed`). **P2-B/C/D mostly ABSORBED** by P2-A/Picker. **Remaining task list:** R1 loadRamp-Stops (S) · R2 facetName wiring (S) · N2 tool cursors (S) · **N1 Favients redock bug (M, NEXT)** · N4 slots hero-esque (M) · N3 remove starring (M) · N5 curves drag (L) · R3 favientTargets→registry (M) · R4 gen/image doc round-trip [old P2-E] (M) · R5 FavientSwatch→CanonicalHero (L, defer). **N1+2 dock fixes ✅ `2bc4cfb`. Batch A ✅ MERGED `498d7dd`** (N4/N5/N3/R2/R3/R1 + drag-race fix). **Remaining: Batch B** (small UI — N2 cursors · N6 favients-menu-offscreen · N7 picker-icon host-gate) · **Batch C** (R4 gen/image doc round-trip). P2-G dropped; R3 app-gmt cross-app (watch). | `exec/p2-*` (per sub-stream) | **7 sub-streams** (`plans/p2-scope.md`). **pre P2-F** ✅ MERGED `c817911`. **W1: P2-A** ✅ DELIVERED in-review (`exec/p2-a` 7146275) — tab-anchored "select→reveal→place" (NOT a bin dock; spec was wrong → `p2-a-v2-design.md`); brought the canonical hero (`CanonicalHero`, `targetId` prop) + the data-driven dropbox/reveal layer (`DropTarget`/`DropTargetLayer`); **(c) +4 fields ratified** (see frozen block). P2-C/P2-D now build on P2-A's reveal layer + the 4 (c) fields (P2-A productionized the in-app pointer/dropbox part of P2-D). ‖ **P2-E** gen+image doc round-trip (M). **W2:** P2-B hero state-lift (S) ‖ P2-G favourite Update/Save-as-new + facetName (M) ‖ P2-D finish drag/avatar/cross-tab (L). **W3:** close-out + **runtime re-verify (S6 well migration)**. **Undo focus = (b) auto-focus** (ratified). **NEXT (user's pick):** the Picker two-selection-states + swatch enlarge → `plans/p2-a-picker-handoff.md` (fresh in-`dev` branch). **Worktrees now opt-in** — serial streams run in `dev` directly (additionalDirectories fix landed). |
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
    - **§4(c) AMENDMENT — RATIFIED + SUPERSEDED by P2-A (2026-06-08).** P2-A added **4 optional additive
      fields** to `SendTarget` (all user-ratified in-session, gate-green at every commit) — these REPLACE
      the originally-planned single `getRect?` amendment:
        - `getRect?: () => DOMRect | null` — target's on-screen rect (anchors the dropbox + drag hit-test).
        - `revealPath?` — the chain of intermediate targets to traverse to reach a hidden target (e.g. mode
          tab → sub-mode → slot); `deriveIntermediates` walks the registry to build it — **no hardcoded
          tab→target map** (adding a target anywhere auto-populates its final + intermediate path).
        - `acceptsTypes?` — payload/MIME gating for what a target will accept.
        - `dragPassthrough?` — lets a drag fall through the dropbox affordance to a host's own handling
          (e.g. Favients shelf insert/reorder takes over once the pointer is over the shelf).
      All additive/optional ⇒ existing (c) consumers unaffected. **The model is TAB-ANCHORED "select →
      reveal → place"** (dropbox lights over each target via getRect; chained reveal/dwell to reach hidden
      ones) — **NOT** a bottom-centre bin dock (the p2-a-implementation-spec.md bin-dock framing was WRONG
      and is superseded by `plans/p2-a-v2-design.md`). Downstream P2 streams (esp. P2-C/P2-D) build on THESE
      4 fields, not the old single getRect.
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

## Cross-cutting watch items (cont.)

- **`EmbeddedColorPicker` responsive reflow (S5).** The engine-shared rich picker (every colour DDFS
  param, app-gmt, lighting panels, SmallColorPicker, the Stops editor) now reflows by **measured
  container width** (≥600px 3-col pads∣channels∣swatches; ≥400px 2-row; <400px stack = the original
  narrow path, byte-for-byte). Verified painted at 1600/1100/380px. Narrow consumers are unchanged *by
  construction* (width-keyed), but it's a broad-blast-radius shared-component change — **any colour-param
  / lighting-panel work should glance**, and a user spot-check of a NARROW dock picker in app-gmt/lighting
  is belt-and-suspenders (the 380px stack test already covers the layout). A blank-canvas-on-layout-remount
  bug was found+fixed (layout added to the canvas draw-effect deps).

- **⚠️ PROCESS: node_modules junction + worktree removal = data loss.** `git worktree remove` (and
  `Remove-Item -Recurse`) **follow the `node_modules` junction and delete dev's REAL node_modules through
  it** — the recurring partial-install (hit P0d-era, S2, S5). **SAFE CLEANUP: `cmd /c rmdir
  ..\wt-sX\node_modules` (removes the junction only) BEFORE `git worktree remove`.** Never `rm -rf` /
  `Remove-Item -Recurse` a junctioned worktree. If it happens: `npm install` in dev repairs it.

## Cross-cutting watch items (cont. 2)

- **`ScalarInput.trackBackground` (S7).** NEW additive prop on the app-wide slider primitive — renders a
  custom CSS track (used for the ColorBox colored L/C/h ramps) and suppresses the cyan fill when set;
  **default-off = byte-identical** for every existing slider (verified by review). Low risk, but it's the
  3rd cross-cutting touch to ScalarInput/the picker family — any slider work should be aware.

## P2 carry-forwards (fold into the P2 scope doc)

- **colorBoxFit.ts (S7)** — pure gradient→ColorBox fitter, frozen-ahead for P2's drop path; only
  test-consumed today (may orphan-flag — DO NOT delete). P2 drop-onto-ColorBox calls
  `fitColorBoxFromCatalog`/`fitColorBoxToRamp` with the dropped ramp + adds start/end sub-range selection
  UI. (Gamut caveat: oklabToRgbSafe clips chroma → very-high-chroma gradients fit closest in-gamut C.)
- **Easing-picker ↔ formula-picker consolidation** — S7's `easingThumb`/`EasingPicker` mirror the app-gmt
  FormulaPicker tile pattern but the formula picker's renderer isn't generic (hardcoded `<img src>`).
  Future: a shared thumbnail-grid primitive both consume. (S7 reused the generic `GradientHoverPreview`
  for the enlarge to keep consolidation seamless.)
- **ColorBox defaults in 3-4 places** (feature def / GENERATOR_PARAM_DEFAULTS / DEFAULT_COLORBOX_PARAMS /
  UI) — a shared default-object is a micro-simplify candidate (same pattern as GeneratorSlotMods).

## Backlog / deferred debt

- **Live-fractal carve FOLLOW-UPS (from the 2-lens independent review, 2026-06-07):** (1) **deep-zoom
  AT-path `ref` threading** — advance `ref` through the AT prepass to match FractalShark's RefIteration
  model (or add a code comment documenting why AT deliberately doesn't); related to (2) the **residual
  LA-vs-escaping-reference glitch** (the ⚡ toggle is the workaround; real fix = FractalShark-style glitch
  detection + secondary references) — both are deep-zoom perturbation-correctness items, best tackled
  together. (3) **No automated coverage of the deep-zoom kernel `ref`-tracking** — the deep-zoom smokes are
  CPU-builder-only; the GX smoke only asserts distinctColours≥50. A GLSL-output regression test (or a
  golden-pixel check on real GPU) would close the gap. (4) NIT: stale `engine/fractal/index.ts` barrel
  header ("Shallow float32 only…") — update post deep-zoom incorporation. (5) NIT: clamp
  `effectiveMaxIter()` to the kernel's 65536 PO ceiling so extreme `iterMul` doesn't silently stop
  refining. None block merge (carve is byte-faithful; gated on the targeted AT+LA visual check).

- **W9 snapshot (timeline as keying/compare tool + export-snapshots-current-frame) — DEFERRED out of P2**
  (user ratified 2026-06-07). Was P2 sub-stream P2-H (S-M, leaf, no dependents). Becomes its own post-P2
  initiative; scope when P2 lands. Decision rationale: keep P2 strictly on portability.

- **Live-fractal coloring mode (extract from fluid-toy) — INITIATIVE, SCOPED 2026-06-06**
  (`plans/gx-live-fractal-coloring-scope.md`). Add a GX fullscreen mode where the current 256-ramp colors
  a live Mandelbrot. **KEY DE-RISK: no gradient seam needed** — fluid-toy samples a 256×1 RGBA8 LUT and
  GX `renderStopsToBuffer()` is byte-identical; `engine.setGradientBuffer(buf)` = the colormap setter.
  **Carve:** the renderer is decoupled from the fluid sim but welded to the 1.8k-line FluidEngine — lift
  the fractal/gradient/deep-zoom passes out (deepZoom/* perturbation+LA+AT+BigInt-worker stack copies
  as-is). **Integration:** 5 insertion points in FullscreenGradientOverlay + rampGeometry; existing
  PNG export works on a WebGL canvas unchanged. **Phasing (ACCEPTED — no throwaway, shallow ⊂ deep):**
  shallow f32 MVP first (≈M/L, ~90% of the wow) → deep-zoom as +L follow-on. **Risks:** FluidEngine carve
  must not regress fluid-toy (gate smoke:fluid-toy/smoke:orbit); GPU precision variance (shallow must
  bound zoom so it never visibly quantizes — ties to render_4k_gap/ANGLE). **DECISION (2026-06-06):** gradient stays
  **FROZEN** (256-ramp snapshot) in fractal mode — NOT live stop-editing. Instead expose a few **live,
  animatable ramp modifiers during fractal interaction: phase / repeats / mapping-mode** (cheap
  ramp-offset / ramp-tiling / iteration→index-remap — in the sampling shader or via a re-uploaded
  transformed LUT), **keyframeable via the existing timeline → palette-cycling on the fractal.**
  Rationale: keep it a GRADIENT app (the gradient is the star; don't let it become a fractal-animation
  app "giving away too much"). S6 static geometries stay frozen-at-open (unchanged). NOT v1-critical;
  post-P2 / own initiative.

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

- **Fullscreen mode v2 — NOW A MAJOR FEATURE INITIATIVE (user expanded 2026-06-08).** The early
  `plans/fullscreen-v2-scope.md` (per-geometry parametric controls + new geoms + animated preview +
  comparison grid + zoom-pan) is **necessary but INSUFFICIENT** — and its triple-overlap blocker is now
  CLEARED (live-fractal + P2 well-migration both merged). **Added scope:** horizontal **SPLITSCREEN** ·
  high-quality **SOTA dithering** · **MESH + FLUID modes** · **aesthetic & customizability overhaul of ALL
  existing modes** · **S-curve → a real SPLINE mode** · **live-binds to the last-updated hero / clicked
  fav** · **RANDOM mode = layered random dots in pseudo-3D parallax with draw interactivity** · all
  interactions **neat & professional yet child-simple** (basic click+drag) · + TBD. **→ NEEDS A FULL FRESH
  RE-SCOPE** on the merged foundation before building (next big feature phase after P2 closes; re-scope first).
- **Curve-editor refinements (ChannelGraphEditor) — user 2026-06-08.** (a) resizable box-selection needs a
  **centre handle** for moving the whole selection; (b) a new **'bias' feature** that moves points around;
  (c) small **ghost points** in the curve to explain the smooth & detail-level sliders; (d) NEW global
  **pencil tool** — draw keyframes onto the selected track(s), **normalize captured-on-start**; (e) the
  global tool panel (bake/smooth/normalize/…) reflows to **2 columns** when too tall. Distinct stream;
  builds on S3 ghost curves + the N5 curves-widget drop target.
- **Generator polish — user 2026-06-08 (NEW stream).** Rename **'mixed' → 'Mixer'**; reorganize so **Stops
  sits next to Mixer + ColorBox** as prominent peer sections; **polish the vertical sliders** to be
  intuitive (keep precision / over-max-min / keyframeable — see the "children can use it" UX bar) — they're
  currently unclear; **Mixer needs a Reset**.
- **Favients add-path → last group — user 2026-06-08.** Dropping/adding a favourite should land it in the
  **last-used / last-created group**, not a default group.
  (P2: fold the ⛶ open into the canonical hero + add gradient drag sources.)

- **Auto-name generated/extracted favourites from facets (user, 2026-06-06).** Favouriting a Generator
  result (and Image / future ColorBox) currently yields a flat "Generated" name. Instead derive a
  descriptive name from the **categorization system** — compute the gradient's perceptual facets
  (`palette/core/facets.ts`: lightness/chroma/complexity/rainbow/warmth) + theme matches and compose a
  human label (e.g. "Warm Vivid", "Cool Muted Rainbow"). Applies to any un-named generated/extracted
  gradient. Mechanism = a small `facets→name` helper. Home: **P2** (favourite/portability pass) or a
  standalone polish item. Not actioned now.

## Changelog / decisions made during execution

_(Orchestrator appends every cycle: ratified interface changes, re-scopes, blockers resolved,
merges, plan amendments. Newest first.)_

- 2026-06-08 — **P2-FINISH (Batch B+C) DELIVERED — in-review, NOT merged** (branch `exec/p2-finish`,
  uncommitted; gates green tsc 0 · test:palette **14/14**; /code-review 7-angle + /simplify applied;
  **AWAITING USER VISUAL CONFIRM → then commit+merge**). **Batch B:** N2 per-tool cursors (rect/lasso
  data-URI SVG, paint brush-ring; threaded `toolActive` so swatches inherit the wall cursor) · N6 floating
  kebab clamped on-screen (reused `clampToViewport`) + Explorer header tools right-aligned · N7 picker
  'Palettes' icon host-gated OFF in GX (app-gmt keeps it). **Batch C (R4):** `generatorDocument` +
  `imageDocument` providers (registerPaletteUI, parallel to favients); image serializes thumbnail JPEG +
  trace (async re-ingest, decode-race token guard); **generator slots serialize as resolved 256-RGB ramps,
  NOT catalog indices** (catalog isn't persisted) + restore via `registerCustomRamp`; shared `decode.ts` +
  `coerceJson.ts`; hardening (sanitizeTracks valid-keyframes, no-image reset, JPEG-encode cache). Known:
  baked-slot out-of-gamut extremes lost on round-trip (visible identical); pre-provider scenes load no-op.
  **⚠ VERIFY at merge:** test:palette reported **14/14** here vs 15/15 earlier — confirm no suite was
  dropped. Visual checklist: tool cursors across the whole wall incl. swatches · floating ⋮ stays on-screen
  + header icons right in Explorer · no picker icon in GX (present in app-gmt) · image+trace+slots+curves
  round-trip on save/reload. **On confirm → this closes P2; finalize the P2 phase summary.**
- 2026-06-08 — **MORE notes (user) → captured to streams.**
  - **CURVE EDITOR** (expand the refinements stream): + NEW global **PENCIL tool** — draw keyframes onto the
    selected track(s), **normalize captured-on-start** · + the global tool panel (bake/smooth/normalize/…)
    reflows to **2 COLUMNS** when too tall to fit · (+ existing: box-select **centre handle** for move,
    **bias** feature, **ghost points** for smooth/detail).
  - **GENERATOR POLISH** (NEW stream): rename **'mixed' → 'MIXER'** · reorganize so **Stops sits next to
    Mixer + ColorBox** as prominent peer sections (clearer IA) · **polish the vertical sliders** — keep the
    precision / over-max-min / keyframeable behaviour but make them **intuitive** (the "children can use it"
    bar — they're currently unclear) · **Mixer section needs a RESET**.
  - **FAVIENTS:** the click/add-path should **drop into the last-used / last-created GROUP** (not a default).
  - **FULLSCREEN-V2** (fold into its re-scope): + horizontal **SPLITSCREEN** · live-binds to the
    **last-updated hero / clicked fav** · **RANDOM mode** = a few layers of random dots in **pseudo-3D
    parallax** space with **draw interactivity** · all interactions **neat & professional yet child-simple**.
  - **★ UX BAR (recurring user value):** GX interactions must be intuitive for users with only **basic
    click+drag understanding** ("my children can use it") — guides the slider polish, fullscreen-v2, and P3.
- 2026-06-08 — **ROADMAP LOCKED (user) + curve-editor refinements added.** Post-P2 roadmap decisions:
  - **(1) Finish P2** (Batch B UI + Batch C R4 doc round-trip) — **almost done** → P2 phase summary to follow.
  - **(2) Fullscreen-v2 — EXPANDED to a MAJOR feature initiative; original `fullscreen-v2-scope.md` now
    insufficient → needs a FULL FRESH RE-SCOPE on the merged foundation.** New scope = horizontal
    **SPLITSCREEN** · high-quality **SOTA dithering** · **MESH + FLUID modes** · **aesthetic & customizability
    overhaul of ALL existing modes** · **S-curve becomes a real SPLINE mode** (not a param) · "+ others we'll
    find along the way." This is the next big feature phase after P2; re-scope before building.
  - **(3) W9 snapshot — LOW PRIORITY** (stays deferred).
  - **(4) W13 Tier-B interpolation — REMOVED** (not building it).
  - **(5) Live-fractal carve follow-ups — CLOSED** (carve well-completed; the 5 nits not pursued unless they
    resurface).
  - **(6) Tech-debt — treat as ANTI-DEBT-ACCRUAL** (may be blocking; don't let it grow): `test:compat`
    failing (potentially prod-blocking), oklab de-dup remainder (4 fns need a `colorUtils` export), ColorBox
    sub-range UI, P0d nits, easing↔formula-picker consolidation, ColorBox defaults. Fold a cleanup in rather
    than accrue more.
  - **(7) P3 `/polish` — clarified:** it's the whole-app UX coherence sweep (review surface-by-surface +
    holistically, triage act/ask/avoid, apply) — not just ceremony, but **likely lighter than originally
    conceived** given the continuous visual polish done throughout P2; scope it when we get there.
  - **NEW — Curve-editor refinements (ChannelGraphEditor; distinct stream):** (a) the resizable box-selection
    needs a **CENTRE HANDLE for moving** the selection; (b) a new **'BIAS' feature** that moves points around;
    (c) small **GHOST POINTS** in the curve to explain the smooth & detail-level sliders. Relates to S3 ghost
    curves + the N5 curves widget.
- 2026-06-08 — **✅ P2 BATCH A MERGED** into integration `498d7dd` (commit `c9da379`; 16 files +227/−196,
  FavStar.tsx deleted; gate green; user visual-confirmed Chrome+Firefox incl. the app-gmt Destination-dropdown
  regression). Cleared 6 items + 2 in-session follow-ups: **N4** Generator slots → hero-esque drag sources
  (catalog dropdown dropped; still the gen-a/gen-b drop target via the shared layer); **N5** curves widget =
  accept-only drop target (`generatorStore.fitCurvesFromRamp` decomposes a dropped ramp into L/C/h curves;
  revealPath tab:Generator→gen:mixed); **N3** starring removed (FavStar deleted, `favientsStore.toggle`
  dropped, drag-to-Favients sole add-path; **isFav KEPT** — still used by gradient-file-import dedup, the
  scope doc's "remove isFav" was wrong); **R2** facetName auto-naming via ONE shared `configToName` across
  all 4 add-paths + an `autoName` flag on the placeholder-named Generator/Stops/Image output heroes (was
  yielding "Generated"/"Stops"/"Image · distill"; now perceptual); **R3** favientTargets→sendTargetRegistry
  migration (**app-gmt coloring layers now `registerSendTarget(group:'host')`** — the panel Destination
  dropdown reads `getSendTargets()` host-group; persisted ids coloring-1/2/env unchanged); **R1** Stops
  loadRamp target verified (already wired). Plus a **drag-completion-race fix** (GradientDropLayer: a `dragend`
  listener ends the session/teardown, guarded by `revealedRef` so intermediate-step drops survive — fixes
  "drag after a prior click-pick doesn't complete"; shared layer so all sources inherit it; panel-drag
  boundary untouched). (c)/(b) registries consumed additively (no INTERFACE-CHANGE-REQUEST). **WATCH:** R3
  is a cross-app change (app-gmt host targets now via the engine registry) — confirmed live, but app-gmt
  coloring-destination work should be aware.
  **2 NEW issues (user, post-pass) → Batch B:** **N6** Favients SYSTEM MENU lands offscreen (positioning
  bug); **N7** Favients 'picker' icon — useful in app-gmt, NOT in Gradient Explorer (host-gate it off in GX).
  **Remaining P2 (2 sessions):** **Batch B** = small UI fixes — N2 rect/lasso/paint cursors · N6 menu
  offscreen · N7 picker-icon host-gate (coherent Picker/Favients UI context); **Batch C** = R4 Generator/
  Image document round-trip (old P2-E, distinct SceneIO/document-provider context, M). Defer: R5
  FavientSwatch→CanonicalHero, cross-app drag, W9 cue.
- 2026-06-08 — **✅ N1 + 2 dock fixes MERGED** into integration `2bc4cfb` (merge of `exec/p2-n1-favients-redock`,
  3 commits; gate green; user visual-confirmed Chrome+Firefox). (1) **N1** floating-Favients reliable
  single-drag redock — root cause was a STUCK `nativeDrag` signal left by a shelf reorder keeping the
  gradient overlay (Z 2000) live over the redock zones (z 1000), swallowing the drop; fix = gate
  `GradientDropLayer` off `draggingPanelId` (panel-drag ⇒ whole gradient layer stands down). (2) right-docked
  Favients reveals from its collapsed-dock well (key reveal on `CENTRE_MIRRORED_MODES`, un-collapse own side
  — was left-only). (3) centre stage keeps last mode when the non-mode Favients tab opens (was blanking).
  **The panel-drag↔gradient-drag boundary is now clean + commented → N4/N5 inherit it.** Memory:
  `project_drag_flight_architecture.md` updated.
  **PROCESS CHANGE (user feedback): BATCH remaining work into larger coherent sessions** — N1 solved in
  ~10min but per-session overhead (context-load + review + error-check) dominated; reloading the same
  drag-flight context per tiny task is waste. New memory `feedback_batch_session_scope.md`. **Re-batched
  remaining P2 into 2 sessions:**
    - **Batch A — extend the canonical drag/target/favourite model to all surfaces + consolidate the
      registry** (one session; shares drag-flight + (c)-registry + CanonicalHero + favients context):
      **N4** Generator slots → hero-esque drag sources + drop their click-dropdown · **N5** Curves widget →
      drag-drop · **N3** remove starring entirely (drag-to-Favients sole add-path; P2-G toggle dropped) ·
      **R2** facetName auto-name on drag-add · **R3** favientTargets→sendTargetRegistry migration · **R1**
      loadRamp Stops target.
    - **Batch B — scene round-trip + tool cursors** (separate context): **R4** Generator/Image document
      round-trip (old P2-E) · **N2** rect/lasso/paint cursor icons.
    - Defer: R5 FavientSwatch→CanonicalHero, cross-app drag, W9 cue.
  **Next: Batch A.**
- 2026-06-08 — **Q1 RESOLVED + N1 issued.** User ratified: **starring removed entirely** ⇒ the P2-G
  "Update vs Save-as-new" favourite toggle is **DROPPED, not built** (R6 favourite-identity folds away;
  drag-to-Favients is the sole add-path). **Next stream = N1 (Favients undock→redock bug)** — prompt issued
  to a fresh in-`dev` session (branch `exec/p2-n1-favients-redock`); its panel-drag ↔ gradient-drag signal
  deconfliction is foundational for N4/N5. Awaiting the session summary.
- 2026-06-08 — **P2 RE-SCOPE DELIVERED** → `plans/p2-remaining-scope.md` (the authoritative remaining-P2
  task list; run `wz4nnwqn9`, 4 agents). **P2 collapsed substantially** — P2-A + Picker absorbed most of it.
  **DONE/absorbed:** P2-A, P2-F, **P2-B** (hero state-lift / resize-blank via `heroSelection`+`heroPrefs`),
  **P2-C** unified target list (mostly — `sendTargetRegistry` + `gradientTargets.ts` 7 targets + data-driven
  reveal graph), **P2-D** drag/avatar/cross-tab-dwell/landing/cancel-wipe (mostly — all working in-app).
  **GENUINELY REMAINING (task list, sized):** R1 loadRamp Stops target (S) · R2 facetName auto-naming
  wiring (S) · N2 tool cursors rect/lasso/paint (S) · **N1 Favients undock→redock BUG (M)** · N4 Generator
  slots → hero-esque drag sources (M) · N3 remove starring entirely (M) · N5 Curves widget → drag-drop (L) ·
  R3 favientTargets→sendTargetRegistry migration (M) · R4 Generator/Image document round-trip = the old
  P2-E, 0% done (M) · R5 FavientSwatch→CanonicalHero + unified ring (L, defer) · R6 favourite identity
  (S–M, resolved by N3). Deferred: cross-app drag/Layer-B, W9 animated cue, P2-D edge-case stress. **The 5
  new items placed:** N1+N2 = small fixes; N3/N4/N5 = "extend the canonical drag model to more surfaces"
  cluster (N3 folds into P2-G, N4/N5 into P2-C). **RECOMMENDED NEXT: N1** (real user-hit regression,
  contained, AND its fix forces the panel-drag ↔ gradient-drag signal deconfliction that N4/N5 depend on).
  **OPEN Q1 (user):** confirm starring is removed entirely (drag-to-Favients = sole add-path) ⇒ the original
  P2-G "Update vs Save-as-new" toggle is **DROPPED, not built**.
- 2026-06-08 — **5 NEW P2 INPUTS (user) + RE-SCOPE kicked off.** Folding into the remaining-P2 plan:
  (1) **BUG: Favients undock→redock fails** — when the Favients panel is floating, the drag to re-dock it
  doesn't complete (double-click + drag sometimes works). Dock/undock drag-completion bug on the floating
  panel.
  (2) **Rect/lasso/paint selection tools need mouse CURSOR ICONS** (currently no tool-specific cursor).
  (3) **REMOVE the "starring" favourite method entirely** — drag-to-Favients now makes star-to-favourite
  obsolete clutter; strip the star affordance/path (genericize-in-place per usual).
  (4) **Generator Slot A/B → hero-esque** — make each slot a drag SOURCE (like a CanonicalHero) AND remove
  its click→dropdown-menu behaviour (click should select/drag, consistent with the canonical model).
  (5) **Curves widget → drag-drop** — the channel-curves widget (ChannelGraphEditor) becomes a drag
  source/target too.
  Re-scope (read-only) running to map what P2-A/Picker actually shipped vs the original P2-B/C/D/E/G scope
  AND place these 5 items → produces the authoritative remaining-P2 task list. P2-C/P2-D suspected largely
  absorbed by P2-A/Picker.
- 2026-06-08 — **✅ P2-A PICKER POLISH MERGED** into integration `fdfcbed` (merge of `exec/p2-a-picker-polish`,
  off 98b5cb9; 11 files +389/−66; 3 commits). Combined gate green (tsc 0 · test:palette ALL PASS).
  **User visual-confirmed in BOTH Chrome and Firefox.** **PICKER INTERACTION NOW FULLY CLOSED** — all of
  p2-a-picker-interaction.md §5 cleared: (1) **cancel-wipe** (task #12 — `cancel` one-shot in `dragVisual`
  + `CancelAvatar` in `GradientLandingLayer`, fired from in-hand teardown in `GradientDropLayer`; L→R alpha
  + X-shrink); (2) **active padding/frame** (§2.5b — `CanonicalHero` tinted matte + glow, footprint-stable
  via ramp insets); (3) **hover-preview suppression** (`PickerWall` `inHand` prop). **Plus session-fixed
  user follow-ups:** Favients cancel-wipe regression (shared `markPickLanded`/`consumePickLanded` gate set
  by both dock `handleSent` and `FavientsPanel.doDrop`); **cross-browser drag robustness** — synchronous
  `beginNativeDrag`/`useNativeDragging` signal (replaces fragile dragenter/leave depth counting),
  `DropTargetLayer.dragActiveOverride` prop, eager transparent drag-image, click→drag origin-null race;
  **Firefox-specific** mousemove-leak fix (end-backstop gated on dragover-recency ~200ms). **Quality:**
  `paintRampToCanvas` (new `palette/core/rampCanvas.ts`) dedups packed-ramp→256×1 across avatar/landing/
  cancel/GradientSourcePicker; `suppressNativeDragImage`→`beginCustomAvatarDrag` (the one chokepoint every
  custom-drag source funnels through). **NEW public drag surface** (for future drag/reorder components):
  `dragVisual` {beginNativeDrag/useNativeDragging · markPickLanded/consumePickLanded/clearPickLanded ·
  triggerCancel/clearCancel/useCancel}, `favientDnd.beginCustomAvatarDrag`, `DropTargetLayer.dragActiveOverride`,
  `rampCanvas.paintRampToCanvas`. Memory: `project_drag_flight_architecture.md` (foundational for future
  custom-drag). /code-review extra-high (2 fixed) + /simplify + adversarial verify (9 land-signal + 7
  drag-flight flows) clean. **Next: re-scope P2-C (P2-A likely absorbed much of it) → then P2-C/P2-E.**
- 2026-06-08 — **✅ P2-A PICKER follow-up MERGED** into integration `1325abf` (merge of `exec/p2-a-picker`
  9fa34e2; clean — branch was based on current integration; 27 files +1324/−314, 5 commits). Combined gate
  green (tsc 0 · test:palette ALL PASS). User visual pass OK ("fine for now"). **Done:** one selection model
  (`heroSelection`, per-surface sticky; hero never blanks; survives mobile remount); `CanonicalHero`
  everywhere incl. Picker (tiered ring neutral/cyan/bright+glow; click=pick+open dock, drag=place);
  **wall enlarge-in-place** (canvas oversize-draw, the real work); collapsed-dock fallback dropwell; generic
  `floatable` panel flag (canvas mode panels pinned docked); **seamless drag** (avatar morphs from source
  rect → lands into target rect); **click-through Stage 1** (click → in-hand follows cursor → click
  destination to land; Favients drop incl.). **Resolved in-session:** Favients click→SELECT flip (host-aware,
  app-gmt untouched); ring KEPT as the tiered treatment. New: `GradientLandingLayer`, `dragVisual` store,
  `heroPrefs`, `useDragEndSafetyNet`. Design: `plans/p2-a-picker-interaction.md`.
  **TRACKED FOLLOW-UPS (in p2-a-picker-interaction.md §5 — NOT blocking; merged base is usable):**
  (1) **Stage 2 — the cancel wipe** (task #12, the big one: in-hand pick ending with no land → alpha mask
  off L→R + ramp shrink-X; plan written, fire from in-hand teardown); (2) active padding/frame (§2.5b,
  specced not built); (3) in-hand hover-preview overlap (minor — suppress wall preview while picked &&
  !dragging). **Next: user's pick — finish Stage 2 cancel-wipe (+the 2 minor) as a polish stream, OR move to
  the next P2 stream (P2-C / P2-E).**
- 2026-06-08 — **Worktree cleanup (moved to in-`dev` branches).** Retired all 5 worktrees (wt-p2a/-p2a2/
  -p2f/-s7/-s8) — junction-first removal, dev node_modules intact. Deleted merged/throwaway branches
  exec/{p2-a, p2-f-imagestage, s7-colorbox, s8-interp, p2-a-prototype}. Only `dev` worktree remains.
  `wt-lf` + `wt-p2a2` folders linger on disk (git-deregistered; held by an editor/shell — harmless, delete
  when freed). **Process change: serial streams now run on in-`dev` feature branches, not worktrees** (the
  per-folder write-permission flood made worktrees painful; `additionalDirectories` fix landed for the
  opt-in parallel case). Older merged branches (exec/cleanup-*, phase-0, s1-s6, livefractal) left for a
  later branch-tidy if wanted.
- 2026-06-08 — **✅ P2-A MERGED** into integration `e0240f9` (merge of `exec/p2-a` 7146275; clean, no
  conflicts; 20 files +1440/−125). Combined gate green (tsc 0 · test:palette ALL PASS). User skipped the
  optional independent review (confirmed the interaction live + session ran 2 review passes; (c) additions
  are additive + user-ratified) and chose merge-core-now with the Picker as a separate follow-on stream.
  Canonical hero + tab-anchored reveal layer + (c)+4 fields are now in integration; P2-C/P2-D build on them.
  **Next: the Picker follow-up** (`plans/p2-a-picker-handoff.md`) as a fresh in-`dev` branch (no worktree).
- 2026-06-08 — **P2-A DELIVERED — in-review, gate-green, NOT merged** (branch `exec/p2-a` @ `7146275`,
  worktree `wt-p2a2`, off integration `90206c6`; net diff 20 files +1440/−125; 13 commits — treat the NET
  diff as the deliverable, the first bottom-dock commit `0a38f9a` is superseded). **Tab-anchored "select →
  reveal → place":** select a swatch/hero → drop targets light up over their element (getRect) → click or
  drag to send; hidden targets reached via a data-driven chained `revealPath` (mode tab → sub-mode), dwell
  ~400ms or click to traverse (ColorBox = 2 steps proves it; A/B slots reachable from ColorBox mode); drag
  avatar follows cursor. All topology data-driven (`deriveIntermediates` walks the registry — no hardcoded
  map). New engine-core `components/DropTarget.tsx` + `DropTargetLayer.tsx`; host `gradientTargets`/
  `GradientDropLayer`/`heroSelection`/`CanonicalHero` (one `targetId` prop + one (c) registration converts
  any hero; self-filters when a hero is both source+target). `DragWellsOverlay` reverted to pristine (still
  the (b) file-drop kernel for other hosts); `gradientBins.ts` removed.
  **⚠ MY SPEC WAS WRONG (orchestrator accountability):** `p2-a-implementation-spec.md` specified a
  bottom-centre bin dock and claimed it replaced the tab model — it CONTRADICTED the user's verified
  prototype + `p2-drag-interaction-scope.md`. User rejected it on sight; stream re-directed live to the
  verified tab-anchored model. **Lesson: a user-verified prototype/scope doc is the model authority — a
  fresh spec must not override it.** `p2-a-implementation-spec.md` is **SUPERSEDED** by `plans/p2-a-v2-design.md`.
  **(c) interface RATIFIED:** +4 optional additive fields (getRect?/revealPath?/acceptsTypes?/dragPassthrough?)
  — recorded in the frozen (c) block above; supersedes the single getRect? plan. **Review:** session ran 2
  passes ×2 lenses, fixed 5 real bugs (drag-through, hooks-order crash, label dragover, pointer-events
  passthrough, avatar flash); no blocking bugs. **Gates green every commit.** Visual: user iterated live +
  confirmed (chained ColorBox reveal, Favients passthrough, click-away/Esc cancel, Stops source+target
  self-filter). **MERGE GATING:** orchestrator recommends a focused INDEPENDENT review of the (c) interface
  design + cross-hero wiring (high-blast-radius + frozen-interface change future streams build on) before
  merge — then merge on user confirm. **Open: merge P2-A core now vs hold for the Picker follow-up?**
  **FOLLOW-UPS:** Picker two-selection-states + swatch enlarge-in-place → `plans/p2-a-picker-handoff.md`
  (user's next item, fresh session); Favients click=select (currently apply); mobile tab-bar anchors;
  deferred simplify (shared paintRamp256, select-mode refresh hook) → p2-a-v2-design §6.
- 2026-06-08 — **✅ P2-F MERGED** (`c817911`; merge of `exec/p2-f-imagestage` rebased over live-fractal;
  user pre-authorized "visual check happens once merged"). ImageStage file-drop coexists with the
  DragWellsOverlay via the registry-driven early-return (+11/−8). Post-merge gate green (tsc 0 ·
  test:palette ALL PASS). **Housekeeping:** retired the live-fractal worktree — git de-registered + pruned
  `wt-lf`, killed 10 stale `npm run dev`/vite processes the bootstrap session left running (they locked the
  folder + held ports); the empty `wt-lf` dir lingers on disk (held by an editor/shell, harmless). dev
  node_modules intact throughout. One `wt-p2a` dev server (from 00:28, pre-rebase/iter2) still up — pending
  user's call to close. Next: continue P2-A prototype iteration; fan out Wave 1 (P2-C, P2-E).
- 2026-06-08 — **✅ LIVE-FRACTAL CARVE MERGED into integration `cbfad67`** (merge of `exec/livefractal`
  91ae8f5; 55 files +6196/−1752; NO conflicts). **Focused independent review (run `w14heyn2c`, 2 lenses)
  came back 0 blockers / 0 real-bugs:** Lens A (nucleus correctness) **merge-ready** — traced the
  dead-`uRefPeriod` fix end-to-end and confirmed it's wired in BOTH consumers (kernel decl → FractalColorRenderer
  JULIA_UNIFORMS → fluid-toy FluidEngine list → shared DeepZoomController bind), modulo-wrap exact (no
  off-by-one), period detection can't corrupt orbit (post-Newton z_P verify rejects false periods), ε-calib
  + AT fully off for periodic refs; Lens B (integration safety) **merge-with-nits** — deferred items
  confirmed benign; its one flagged item (fluid-toy deep power-2 Mandelbrot path = the only un-render-covered
  spot) **CLOSED by user: "already did a deep dive."** **Combined integration gate GREEN @ cbfad67:** tsc 0
  · test:palette ALL PASS · smoke:deep-zoom-orbit/-la/-nucleus ✓ · smoke:fluid-toy ✓ (GPU gx-fractal-glitch/
  -nucleus-render attested green in the commit). **P2-F (`b0d2574`) + P2-A prototype (`7a1c061`) REBASED onto
  cbfad67** (both clean, node_modules junctions intact). engine/fractal/ is now the shared home; fluid-toy via
  re-export shims. **TODO: retire wt-lf** (carefully — `cmd /c rmdir ..\wt-lf\node_modules` junction FIRST,
  then `git worktree remove`). Next: land P2-F; continue P2-A prototype iteration; fan out the rest of Wave 1.
- 2026-06-08 — **LIVE-FRACTAL CARVE DELIVERED + ADR-0066 nucleus reference; user visual ✅ "looks
  fantastic" (both apps); under FINAL focused independent review → then MERGE.** Session summary ingested
  (commit `91ae8f5` on `exec/livefractal`, wt-lf, clean tree, NOT yet merged). ADR-0066 = minibrot-NUCLEUS
  periodic reference (atom-domain period detection `detectPeriod` + FractalShark ball criterion in exact
  fixed-point + Newton refinement to nucleus c*; kernel wraps a 1-period orbit modulo `uRefPeriod`;
  falls back to ADR-0065 heuristics; ε-calib + AT gated off for periodic refs; interior dives ~48× shorter
  orbit, render-identical). **Author ran a 5-finder review that CAUGHT A CRITICAL BUG: `uRefPeriod` was
  never registered in either consumer's uniform list → wrap was inert (smokes/first visual passed on the
  fallback); fixed + re-verified real path Δ=0.** Verify: tsc 0; CPU smokes deep-zoom-orbit/-la/-nucleus +
  fluid-toy green; GPU gx-fractal-glitch(3) + gx-nucleus-render green; new `smoke:deep-zoom-nucleus` added
  to smoke:all. Memory: `project_deep_zoom_nucleus_reference.md`. **Orchestrator gate before merge
  (lesson #3):** the prior 2-lens independent review predates ADR-0066 + the author's self-review has
  blind spots → running a FOCUSED independent review on the ADR-0066 delta (nucleus correctness + the
  uniform fix wired in BOTH consumers + integration/no-regression; run `w14heyn2c`). On clean → merge
  `exec/livefractal` → integration + combined gate (tsc · test:palette · key smokes) → then **rebase P2-F +
  the P2-A prototype over the new HEAD.** Known deferred (in the commit, benign): knobs carry across
  openFullscreen; lastDeepStats not cleared on deep-disable; HPReal.toNumber truncates-not-rounds; frontier
  wall ~1e-30 (DD view-center cap, independent of this work).
- 2026-06-07 (PM, interactive design loop) — **P2-A DESIGN VERIFIED WITH USER + PROTOTYPE (2 iters).**
  P2-A is design-first (user: "verify the exact plan before acting; iterate on what I see"). Design probe →
  `plans/p2-a-design.md` (untracked). **User-verified interaction model:** click & drag REVEAL THE SAME
  available target locations ("dropboxes") — one selects, the other drops; CLICK = 3-stop path
  gradient→tab→result; DRAG mirrors it (grab→~400ms tab-DWELL switches mode→drop). **HARD architecture ask:
  ONE shared component renders every dropbox** (styleable together) — realized as `TargetDropbox` driven by
  a registry (prototype-local stand-in for the unbuilt (c) `getRect`; frozen (c) NOT touched). Flagged
  throwaway prototype in the Picker, branch `exec/p2-a-prototype` (wt-p2a), iters `4a111e4` → **`2c91ec2`**
  (gate-green, NOT merged). **iter2 applied user feedback:** swatches first-class (click+drag, no rename);
  removed Apply (no destination in standalone) + Fullscreen (dup of the bottom well); targets narrowed to
  REAL destinations only — **Generator** (slots) · **Stops** (loads into editor) · **Favients** (saves to
  shelf, drag-to-favients now works); **Image hidden** (no destination); **rename → Favients only** (off
  heroes/swatches); de-roughed avatar (lift/scale/shadow). **Awaiting user's next iteration feedback.** When
  the interaction locks → it's the verified spec for the real P2-A (swap throwaway registry for (c)+getRect).
- 2026-06-07 (PM) — **P2-F (ImageStage coexistence) DONE — in-review, gate-green, NOT merged**
  (commit `4e411d9` on `exec/p2-f-imagestage`, worktree `wt-p2f`, branched off integration `ff13cab`;
  run `wf_f921d66b-b25`). **Finding:** ImageStage already had a coexistence guard but it HARDCODED the
  favient MIME (`dataTransfer.types.includes(FAVIENT_DND_MIME)`); P2-F generalized it onto the frozen (b)
  kernel — `isWellDrag(e)` = `wellsForTypes(types).length>0` — so ImageStage's window dragover/drop
  early-returns for ANY registered well's MIME (the same query the overlay uses → they agree by
  construction), and only genuine OS file drops proceed to image import. **Behaviorally identical today**
  (only the Fullscreen well is registered, accepting exactly FAVIENT_DND_MIME) but auto-defers when
  P2-C/P2-D register more wells — zero further edits. Diff +11/−8, `ImageStage.tsx` only; (b) consumed
  read-only (no interface change); no shared-shell touched. Gates green (tsc 0 · test:palette ALL PASS).
  /code-review +/simplify: 0 findings (the change IS the reuse/altitude fix). **HOLDS for: (1) user visual
  confirm (drag-gradient→well vs OS-file-drop→import — no double-handling); (2) the live-fractal merge,
  then rebase P2-F over it (disjoint, clean) before merging.** Then → fan out Wave 1 (P2-A ‖ P2-C ‖ P2-E).
- 2026-06-07 (PM) — **P2 DECISIONS RATIFIED by user** (locked into `plans/p2-scope.md` top block):
  (1) **cross-mode undo focus = (b) auto-focus the affected mode** — supersedes the earlier user lean
  toward (a) tab-as-undo-step; (2) **W9 snapshot DEFERRED out of P2** → drop sub-stream **P2-H**; **P2 is
  now 7 sub-streams** (W9 becomes its own post-P2 initiative — log to backlog); (3) **sequencing = land
  live-fractal FIRST, then fan out P2; fullscreen-v2 independent** (one planned S6-well re-touch in P2-C).
  Still open (non-blocking, resolved at P2-A prompt): exact select→act option set + selection affordance +
  whether Stops stays minimal. **GATING NEXT STEP: live-fractal merge** (owned by bootstrap session; needs
  the user's AT+LA deep-Mandelbrot visual). On that merge → fan out **P2-F** (pre) then **Wave 1**
  (P2-A ‖ P2-C ‖ P2-E).
- 2026-06-07 (PM) — **P2 SCOPE DELIVERED** → `plans/p2-scope.md` (309 lines, PENDING-HUMAN-REVIEW;
  run `w4cu5rnoj`, 5 agents). **Verdict: P2 is fan-outable into 8 ordered sub-streams** behind a single
  ratification gate (the additive (c) `getRect?`, already ratified) — only ONE frozen-interface change in
  all of P2; everything else is new additive modules. **Decomposition:** pre = **P2-F** ImageStage
  coexistence fix (S); **Wave 1** ‖ = **P2-A** canonical hero + select→act (L) · **P2-C** unified target
  list + favientTargets→registry migration (M-L) · **P2-E** generator+image doc round-trip (M); **Wave 2**
  ‖ = **P2-B** hero state-lift (S, needs A) · **P2-G** favourite Update-vs-Save-as-new + facetName wiring
  (M, needs A) · **P2-D** drag/avatar/cross-tab (L, the drag sub-plan, needs A+C); **Wave 3** = P2-D finish
  → **P2-H** W9 snapshot v1 (S-M leaf) → close-out + runtime re-verify. **~3-4 focused weeks; P2-D is the
  biggest single piece (~1-2wk).** **Recommended sequencing:** land P2 AFTER the live-fractal carve merges;
  let fullscreen-v2 P0+P1 land independently and accept ONE planned S6-well re-touch during P2-C (rather
  than coordinating all three up front). **Biggest risk:** runtime≠gates on the S6 fullscreen well
  migrating (b)-HTML5 → (c)-SendTarget+getRect (S6 already taught concept-ok≠works — a merge was backed
  out) → mandatory live re-verify; close second = every-hero blast radius of the P2-A canonical-hero
  rewrite. **DECISIONS FOR USER:** (1) cross-mode undo focus — auto-focus the affected mode [probe rec:
  yes] vs current no-switch; (2) W9 snapshot v1 vs defer [rec: v1-minimal, no dependents]; (3) start P2
  after live-fractal + accept one fullscreen-v2 re-touch [rec: yes]; (4) exact select→act option set +
  selection affordance + whether Stops stays minimal. **Next: user ratifies decisions → orchestrator
  fans out P2-F then Wave 1.**
- 2026-06-07 (PM, **user present, driving toward plan completion**) — **3 OVERNIGHT CLEANUPS MERGED +
  P2 SCOPE PROBE LAUNCHED.** User reviewed the morning queue and authorized: (1) merge all 3 cleanup
  branches; (2) generate the P2 scope doc next; (3) **wait** on live-fractal (still finishing in wt-lf).
  **Merged --no-ff into integration** (off the moved HEAD `1a91934`, which the bootstrap session had
  advanced with the live-fractal review entries): knip `91313d8` · oklab `9a83f0f` · facet `d2227f7`
  (now HEAD). **Combined integration gate GREEN: tsc 0 · test:palette ALL PASS** (incl. the new
  facetname suite). All 3 merged with zero conflicts (disjoint files; cleanup branches never committed
  execution-progress.md so no log collision). `fullscreen-v2-scope.md` committed to integration alongside
  this log update. **User confirmed S6 fullscreen is live + good** (generator-result gradient) → resolves
  fullscreen-v2 decision (a); v2 itself stays a **post-plan backlog initiative**, not a v1 gate. **P2
  (portability integration) is now the critical path to completing the plan** — its scope doc never
  landed (human probe absent on disk), so launching a read-only consolidation probe → `plans/p2-scope.md`
  (folds the ~7 accumulated P2 inputs: hybrid drag paradigm, click=select-vs-apply, canonical hero,
  hero-resize state-loss, cross-mode undo-focus, favientTargets→registry migration, ImageStage
  coexistence). Live-fractal untouched (bootstrap session owns it through merge; gated on the user's
  targeted **fluid-toy AT+LA deep Mandelbrot vs pre-fix** visual per the Lens-A reservation).
- 2026-06-07 — **LIVE-FRACTAL CARVE: 2-lens independent review PASS (both MERGE-READY).** Lens B
  (lifecycle/GX/layering): leak-fix solid + regression-guarded (24-cycle smoke), GX scoped/opt-in off the
  one-ramp seam, engine/fractal host-agnostic, all shader loops bounded — clean. Lens A (carve
  faithfulness): shims byte-faithful, FluidEngine zero-diff, worker/asset survived, shallow path provably
  unchanged. **ONE smoke-invisible reservation (Lens A):** ADR-0064 advances `iter` but not `ref` through
  the AT prepass → LA→PO handoff index short by the AT-covered count when AT active (AT+LA always
  co-active); no smoke covers it. **Resolution: a targeted USER visual check (fluid-toy AT+LA deep view vs
  pre-fix) — not a speculative code fix (may be shifting an already-approximate value).** On clean → merge.
  5 follow-ups → backlog (AT-ref threading, LA-glitch, deep-zoom-kernel test gap, stale barrel header,
  iterMul ceiling). Carve remains owned by bootstrap session through merge.

- 2026-06-07 — **🌅 [AUTONOMOUS] OVERNIGHT RUN COMPLETE — MORNING DIGEST.** Safe backlog EXHAUSTED;
  scheduling STOPPED. The fresh orchestrator ran 4 paced SAFE units overnight (1 scoping probe + 3
  low-ambiguity cleanups), **NOTHING MERGED** — all are a clean morning review queue. Integration
  `exec/gradient-explorer` is **pristine at `bfc8cba`** (every cleanup branched off it, committed, and
  restored). Each cleanup gate-passed (tsc 0 + test:palette green) before committing; /code-review +
  /simplify clean on all.
  **Review queue (suggested order):**
    1. **fullscreen-v2 scope doc** — `plans/fullscreen-v2-scope.md` (untracked, READ + decide). Has 3
       decisions for you: (a) confirm S6 fullscreen is actually live+visually-correct before any v2 work
       (gates≠runtime); (b) v2 before/after P2+live-fractal (probe recommends v2 P0+P1 lands independently,
       accept one planned re-touch); (c) which geometries are v1 + S-curve control style. **Key risk to
       weigh:** the `FullscreenGradientOverlay.tsx` triple-overlap (v2 params / P2 well-migration /
       live-fractal `'fractal'` GeometryId) — v2's param-contract redesign should leave a non-pure escape
       hatch so live-fractal doesn't force a reshape.
    2. **knip-entry cleanup** — branch `exec/cleanup-knip-entry` (`16e740e`, +1 line knip.json). Lowest
       risk; un-blinds `npm run orphans` for the whole gradient-explorer subtree (unused-files 25→6).
       Merge-ready. Remaining 6 unused files are intentional/pre-existing (incl. the P0e `SendToMenu.tsx`
       frozen-ahead shell) — flagged, not touched.
    3. **facet→name helper** — branch `exec/cleanup-facet-naming` (`121e605`). New pure `facetName.ts` +
       test (in `test:palette`), **unwired/frozen-ahead for P2**. Glance at the naming thresholds/word
       choice (reasonable default; tweak at P2-wiring time).
    4. **oklab de-dup** — branch `exec/cleanup-oklab-dedup` (`a007127`, oklab.ts only, +13/-30). Collapsed
       only `lerpOklab` (re-export). **Follow-up surfaced:** 4 more byte-identical fns
       (srgbToLinear01/linear01ToSrgb/rgbToOklab/oklabToRgb) could also collapse, but only by adding
       `export` to the frozen `colorUtils.ts` — left for a deliberate human-nodded unit (touches the frozen
       file).
  **Still in flight, NOT mine (await as before):** live-fractal carve (`wt-lf`/`exec/livefractal` — needs
  independent review + human visual confirm of fluid-toy AND the fractal mode before merge); human-run
  `p2-scope.md` probe (not yet present on disk). **Then:** P2 execution + fullscreen-v2 execution, both
  gated on their scope docs + your decisions. No frozen interfaces were changed; no guesses were made; one
  unit (oklab) deliberately under-collapsed to stay off the frozen file rather than guess.
- 2026-06-07 — **[AUTONOMOUS] oklab/blend de-dup DONE** (commit `a007127` on branch
  `exec/cleanup-oklab-dedup`, **NOT merged** — PENDING-HUMAN-REVIEW; run `wx09qfcpy`). De-duped only the
  ONE safely-collapsible symbol: `lerpOklab` (exported in both files + byte/behaviour-identical) now
  re-exports from engine `utils/colorUtils.ts` (`palette/core/oklab.ts`, +13/-30; **`colorUtils.ts`
  untouched** per guardrail; same direction as P0a's gmtGradient collapse). 4 other byte-identical fns
  (`srgbToLinear01`/`linear01ToSrgb`/`rgbToOklab`/`oklabToRgb`) **KEPT local** — collapsing them would
  require adding `export` to the frozen `colorUtils.ts` (out of scope → logged as a follow-up). Palette-only
  symbols (RGB/Lab/oklabDistance/inGamut/oklabToRgbSafe/…) untouched. **Drift-pin** (`test-palette-stopops`
  §4) now tautological for `lerpOklab` (same fn reference — expected, as with gmtGradient; still documents
  the contract); byte-exact math guard still meaningfully lives in the renderStopsToRamp==sampleStops §1
  seam. Gates green (tsc 0 · test:palette ALL PASS incl. the pin). /code-review medium +/simplify: 0
  findings (this IS the reuse fix). Only oklab.ts staged; orchestrator files untouched; restored to
  `exec/gradient-explorer`.
- 2026-06-07 — **[AUTONOMOUS] facet→name helper DONE** (commit `121e605` on branch
  `exec/cleanup-facet-naming`, **NOT merged** — PENDING-HUMAN-REVIEW; run `wf_df917614-20c`). New PURE,
  frozen-ahead helper `palette/core/facetName.ts`: `facetsToName(f: Facets): string` + `rampToName(ramp):
  string` (convenience). **Unwired by design — P2 owns wiring it into the favourite/extract naming flow**
  (mirrors how colorBoxFit was built ahead of its consumer). `palette/core/facets.ts` API matched the
  assumption exactly (`computeFacets(ramp: RGB[]) → Facets {lightness,chroma,complexity,rainbow,warmth ∈
  0..1, higher=light/vivid/complex/rainbow/warm, + raw}`); no theme-match catalog exists (kept simple, not
  folded in). **Naming scheme** (each part dropped in its neutral band; "Neutral" fallback): lightness
  Dark(<.3)/Bright(>.72) · warmth Warm(>.62)/Cool(<.38) · chroma Muted(<.18)/Soft(<.4)/Vivid(>.6) ·
  "Rainbow" suffix when rainbow>.6. E.g. "Warm Vivid", "Cool Vivid Rainbow", "Dark Muted", "Bright Warm
  Vivid", "Neutral". NEW deterministic test `debug/test-palette-facetname.mts` (8 exact labels + 500
  seeded-random determinism/totality + an end-to-end rainbow ramp), wired into `test:palette` (package.json
  +1 line, on-branch only). Gates green (tsc 0 · test:palette incl. new test). /code-review +/simplify
  clean (0 findings; test's hsv helpers copied per the established self-contained-test convention). Only 3
  files staged (helper, test, package.json); orchestrator log/scope-doc untouched; restored to
  `exec/gradient-explorer`. No merge/worktree/node_modules ops. **NOTE:** the naming thresholds/word choice
  are a reasonable default — open to human tweak at P2-wiring time.
- 2026-06-07 — **[AUTONOMOUS] knip-entry cleanup DONE** (commit `16e740e` on branch
  `exec/cleanup-knip-entry`, **NOT merged** — PENDING-HUMAN-REVIEW; run `wf_d96868fb-ff2`). One-line
  additive `knip.json` edit (registered `gradient-explorer/main.tsx` as an entry, mirroring the sibling
  `<app>/main.tsx` pattern). **Result:** unused-files 25→6; the ENTIRE gradient-explorer subtree (19
  files) stopped being flagged. Gates green (tsc 0 · test:palette pass · orphans re-run). /code-review
  +/simplify clean. **Finding that closes the NEW-FINDING caveat:** knip is configured files-only
  (`rules.exports/types="off"`), so it reports NO unused *exports* — the fix could only ever change the
  unused-*files* list, and CANNOT surface dead exports (so the "do it deliberately, may reveal real unused
  exports" worry is moot; frozen-ahead modules like `colorBoxFit`/`stopOps`/`sampleStops` are unaffected
  either way). Remaining 6 unused FILES are unrelated/pre-existing & mostly intentional —
  `components/SendToMenu.tsx` (P0e frozen-ahead shell, expected), `app-gmt/FavientsToggleButton.tsx`,
  `engine-gmt/.../FormulaGallery.tsx`, `engine-gmt/formulas/categories.ts`, + 2 debug helpers — flagged for
  the morning, NOT touched. Session correctly left my uncommitted log edits + the scope doc alone; restored
  to `exec/gradient-explorer`. No worktree/node_modules/merge ops.
- 2026-06-07 — **[AUTONOMOUS] fullscreen-v2 scope probe DELIVERED** → `plans/fullscreen-v2-scope.md`
  (295 lines, untracked, **PENDING-HUMAN-REVIEW**; run `wf_ab0fe679-24a`, 5 agents). **Verdict:** v2 is
  mostly ADDITIVE over the clean pure deterministic `palette/core/rampGeometry.ts` core — geometry-math is
  the easy part; the **sharp edge is sequencing vs P2 + live-fractal** (triple-overlap on
  `FullscreenGradientOverlay.tsx`: v2 params + P2 well migration (b)→(c) SendTarget + live-fractal's
  `'fractal'` GeometryId all edit the same file/union). **Phasing:** P0 redesign `GeometryParams`
  (stochastic-only → per-geom tagged union, S) → P1 conditional per-geometry sliders (radial centre / conic
  angle / arch radius / S-curve, S/M — cheapest high-wow slice, stands alone) → opt P2 new geoms
  (Diamond/Mirror/Bands) → opt P3 comparison grid (M) → opt P4 param animation (M); apply-to-content +
  zoom-pan deferred. **Effort:** v1-of-v2 (P0+P1) S/M self-contained; full set M-L; no throwaway path.
  **Top decisions for human (morning queue):** (1) confirm S6 is actually live+visually-correct first
  (gates-green≠runtime-good — it was premature-merged then backed out); (2) v2 before/after P2+live-fractal
  (probe recommends v2 P0+P1 lands independently, accept one planned re-touch); (3) which geoms are v1 +
  S-curve control style (easing-preset picker recommended). **Key risk:** if P0's param contract doesn't
  leave a non-pure escape hatch for `'fractal'`, live-fractal forces a reshape. NO code, NO merges.
  Next SAFE unit: knip-entry cleanup. clutter fix (drag-attempt cue) + favourite rename (undoable) DONE &
  verified. New finding: rename UX awkward (hover-enlarge obscures name; grid click=apply). Interim fix
  routed back (list-mode rename, no hover-enlarge in list). The deeper "click=select+options vs apply"
  question → **P2** (key canonical-interaction input; see finding above). S2 merges after this fix.
- 2026-06-06 — **S7 MERGED `5c2a280` → PHASE 1 COMPLETE.** ColorBox-OKLCh mode (easings + parallel
  builder + mode toggle + visual easing picker + colored L/C/h sliders + frozen-ahead colorBoxFit for P2)
  + the interim "Fit from gradient" button. Caught+fixed a hue-key-casing black-ramp bug (closed a
  registration↔store-read coverage gap). Full integration gate green (tsc 0 + test:palette 15). Watch:
  `ScalarInput.trackBackground` (3rd cross-cutting slider touch, additive/default-off). **ALL Phase 0 + 1
  done. Next: consolidated P2 scope doc → launch P2.**
- 2026-06-06 — **S8 RESOLVED — DEFERRED (no code).** Execution session REFUTED the W13 Tier-A premise:
  monotone-cubic's no-overshoot benefit is a MULTI-POINT property; `sampleSorted` is per-segment 2-point
  (can't overshoot by construction), so a faithful 2-point monotone = smoothstep (already ships). No cheap
  Tier-A win → **W13 entirely deferred to Tier B** (where monotone actually pays off). Orchestrator ratified
  (don't force a relabeled-smoothstep change into the byte-exact engine bake sampler). Zero diff. Wave 3
  now = **S7 only** (still in flight).
- 2026-06-06 — **S5 MERGED `73bcd08` → WAVE 2 COMPLETE.** Stops mode = 4th authoring mode (studio is now
  Picker/Generator/Image/Stops). Full integration gate green (tsc 0 + test:palette 13). Reuses P0c editor
  + (d) seam + paramUndoBracket + W8 doc registry — all frozen interfaces consumed cleanly. Also: shared
  EmbeddedColorPicker responsive reflow + blank-canvas fix (→ watch). Diagnosed the recurring node_modules
  wipe: worktree-remove follows the junction → safe-cleanup process fix logged. **Phase 1 remaining: wave
  3 (S7 ColorBox, S8 monotone). Then P2.**
- 2026-06-06 — **P2 drag-interaction probe complete** → `plans/p2-drag-interaction-scope.md`. Verdict:
  **HYBRID** (pointer-primary in-app for the lifted avatar + cross-tab; HTML5 only at the OS boundary).
  App is already pointer-native (8 dataTransfer files vs 40+ pointer-capture). Kernel WRAP-not-supersede;
  S6 fullscreen well migrates to pointer/(c) (re-verify). **Ratified the (c) `getRect?` amendment**
  (additive; gates "drag ↔ Send-to share ONE target list"). Effort ~L within P2. Open decisions → user
  (cross-app export drag / mobile timing / avatar richness / dwell).
- 2026-06-06 — **S2 MERGED `39ad6a2` → WAVE 2a COMPLETE** (S6+S2). Full integration gate green (tsc 0 +
  ALL test:palette incl. the 2 previously worktree-unrunnable scripts; engine-core historySlice fix
  verified alongside the merged generator provider). S2 = undo provider + list + search + favourite
  rename (single-click/list-mode) + paramUndoBracket + historySlice fix. **Wave 2b: S5 (Stops mode) issued.**
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
