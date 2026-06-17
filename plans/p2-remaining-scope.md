# P2 Remaining Scope — Gradient Explorer

**Date:** 2026-06-08
**Status:** The live remaining-P2 plan (re-scope after P2-A / Picker).

This supersedes the original P2-B/C/D/E/G task split in `p2-scope.md` for purposes of "what's left". It folds in the 5 new user inputs (2026-06-08).

---

## 1. Already shipped

**P2-A (canonical hero + SELECT→ACT)** is DONE and user-verified in Chrome + Firefox: `CanonicalHero.tsx` embedded in all 5 stages, `heroSelection` per-surface sticky pick store, dock with Apply / Send-to / Rename / Fullscreen / ★, hero-as-drop-target self-filtering. **P2-F (ImageStage coexistence)** is DONE — ImageStage early-returns on well-accepted MIME via `isWellDrag()` so gradient drags don't trip the file-import listener. The P2-A Picker + polish follow-up (commit `1325abf`) absorbed several original sub-streams: **P2-B (hero state-lift / resize-blank fix) = DONE** (the `heroSelection` + `heroPrefs` stores survive desktop↔mobile remount, exactly the spec'd pickerSearch pattern); **P2-C unified target list = mostly DONE** via the `(c)` `sendTargetRegistry` + `gradientTargets.ts` (7 targets: gen-a, gen-b, colorbox, stops, favients, fullscreen, export, all using the +4-field interface — `getRect` / `revealPath` / `accepts` / `dragPassthrough` — with a data-driven `deriveIntermediates()` reveal graph, no hardcoded maps); **P2-D drag / avatar / cross-tab dwell / landing = mostly DONE** (cursor-following morphing avatar, 400ms dwell-to-reveal stepping, landing fly-in, and cancel-wipe all present and working in-app). What remains below is the residual of P2-C/D/E/G plus the 5 new items.

---

## 2. Remaining task list

Ordered. Size = S/M/L. "Stream" = clean standalone; "folds into" = attach to an existing surface/effort.

### Quick fixes (small, unblocked)

1. **R1 — loadRamp Stops target** (S, stream)
   Register `paletteEditorStore.loadRamp` as a `SendTarget` so a bare ramp from Image/Generator can be fitted into the Stops editor in one drop, then edited. Today only the one-way `stops` apply (`editorEdit(setConfig)`) is registered. Minimal: add a menu-only target (no `getRect`, reveals `tab:Stops` on click) or anchor it to the stops element.
   Files: `gradient-explorer/gradientTargets.ts`, `palette/store/paletteEditorStore` (loadRamp).
   Deps: none. **~15 min.**

2. **R2 — facetName auto-naming wiring** (S, folds into P2-G)
   `rampToName()` exists and is already called in the Favients apply path (`gradientTargets.ts:210`) but is wired NOWHERE else. Generator / Image save flows still hardcode or blank the name. Wire `rampToName()` into the EXTRACT / GENERATE save flows.
   Files: `palette/core/facetName.ts`, Generator + Image save paths.
   Deps: best done alongside R6 (favourite model). **S.**

3. **N2 — tool cursors for Rect / Lasso / Paint** (S, new item #2, stream)
   `PickerWall.tsx:953` correctly sets `cursor-crosshair` (rect/lasso) and `cursor-none` (paint) as generic fallbacks, but there are no per-tool custom cursors. Create 3 cursor SVGs (rect-crosshair, lasso-loop, brush-circle) and bind per `selectionTool`. Fallback to the current CSS classes for any missing asset.
   Files: `palette/components/PickerWall.tsx:953` (+ cursor assets).
   Deps: none. **S — assets + CSS, no logic change.**

### Bug fix

4. **N1 — Favients undock→redock BUG** (M, new item #1, stream)
   Repro: float the Favients panel, drag a gradient while it's floating, drag the panel back to dock. Suspected root cause: the panel-drag stream (`startPanelDrag`/`endPanelDrag` in `DockTab`) and the gradient-drag stream (`markPickLanded`/`consumePickLanded`, `dragVisual` origin/landing) share one pointer-event stream with no deconfliction. `endPanelDrag` may fire while the gradient avatar is still morphing, so the floating panel's position/size store update doesn't flush before the gradient interaction consumes the landed signal — leaving the float transform incomplete. Likely fix: gate panel-drag completion on `consumePickLanded`, or defer the panel position-flush until `dragVisual` is clear.
   Files: `components/layout/Dock.tsx`, `components/layout/DropZones.tsx`, `palette/store/dragVisual.ts`.
   Deps: none (but touches the same signals as the drag model — sequence-test carefully). **M — test + interaction fix, no new architecture.**

### Extend the canonical drag model to more surfaces (related cluster)

5. **N4 — Generator Slot A/B → hero-esque drag sources** (M, new item #4, folds into P2-C)
   Today `SourceRow` (`GeneratorStage.tsx:53-108`) is click→dropdown and *accepts* HTML5 drops from Favients, but is NOT a CanonicalHero-style drag *source* (no `setDragOrigin`, no `beginCustomAvatarDrag`, no `heroSelection` wiring). Make each slot a hero-esque source: wrap in `CanonicalHero` or attach the drag-source handlers to the slot button. `gen-a`/`gen-b` are already registered drop targets with `data-gx-target` rects, so this is the source side. Decide drag vs click coexistence (keep the picker dropdown on click; drag morphs an avatar out).
   Files: `palette/components/GeneratorStage.tsx:53-108`, `gradient-explorer/gradientTargets.ts` (targets already present).
   Deps: none. **M.**

6. **N3 — remove starring entirely** (M, new item #3, folds into P2-G)
   Drag-to-Favients already works as the replacement add-path (`FavientsPanel` onDrop inserts directly), but the star UI still coexists and remains functional. Delete `FavStar` from `CanonicalHero` / hero embeds, remove the `isFav` toggle from the Favients drag-start (`FavientsPanel.tsx:437-445`), remove `toggle`/`isFav` from `favientsStore` exports, and confirm no other UI reads `isFav`. Document drag-to-Favients as the only add-path.
   Files: `palette/components/FavStar.tsx`, `palette/components/FavientsPanel.tsx:430-445,788`, `palette/store/favientsStore.ts:103-129`, `CanonicalHero.tsx`.
   Deps: pairs with R6 (this decides the favourite model — removal *replaces* the Update-vs-Save-as-new question). **M — 4-5 file sweep + zero-regression test of the add path.**

7. **N5 — Curves widget → drag-drop** (L, new item #5, stream + folds into P2-C)
   `ChannelGraphEditor.tsx` is a pure local graph editor with zero drag-drop binding. Add `onDragOver`/`onDrop`; on drop, read the favient payload and either *emit* (export curves as a gradient config) or *accept* (fit a dropped gradient's 256 samples into keyframes). Requires designing the gradient↔curves mapping contract (256 samples → keyframe fit / simplify). Register a `curves-editor` `SendTarget` (emit), a receiving drop zone (accept), or both.
   Files: `palette/components/ChannelGraphEditor.tsx`, `gradient-explorer/gradientTargets.ts`.
   Deps: needs the gradient↔curves contract decided first (open question Q3). **L — design + emit/accept paths + registry + test.**

### Residual original sub-streams

8. **R3 — favientTargets.ts → sendTargetRegistry migration** (M, folds into P2-C)
   Legacy `FavientTarget` interface (`apply(config,name)`) in `palette/core/favientTargets.ts` still coexists with `SendTarget<P>` (`apply(payload)`). The app-gmt modal host uses the legacy registry; the Explorer uses the new one — dual-registry risk. Incrementally fold the gradient-specific targets into `sendTargetRegistry` and retire `favientTargets` at call sites (`setFavientSelectMode`/`setFavientBrowseAction`/`setFavientStudioAction` live there).
   Files: `palette/core/favientTargets.ts`, `store/sendTargetRegistry.ts`, call sites.
   Deps: none. **M — incremental fold.**

9. **R4 — Generator + Image document round-trip (P2-E)** (M, stream)
   0% done. No capture/restore in `generatorStore.ts` or `imageStore.ts`; neither registered as a document provider in `registerPaletteUI.ts` (only favients + stops are). Generator curves/slots/seed + ImageModel state will NOT survive Save→reload. Mirror the existing stops-provider pattern.
   Files: `palette/store/generatorStore.ts`, `palette/store/imageStore.ts`, `palette/registerPaletteUI.ts`.
   Deps: none. **M — parallel to stops provider, ~2-3h per store.**

10. **R5 — FavientSwatch → CanonicalHero consistency** (L, folds into P2-A polish)
    `FavientSwatch` renders its own inline strip + name, not `CanonicalHero` — so swatches lack the hero's enlarge/metadata/edit affordances. This is partly an intentional grid-compactness choice. Either refactor to embed a minimal `CanonicalHero`, or formally leave as-is. Also folds in the inconsistent selection-ring treatment across surfaces (Picker cyan border vs Favients blue ring vs Stops none) — single highlight treatment per P2-A Decision 4.
    Files: `palette/components/FavientsPanel.tsx`, `CanonicalHero.tsx`, `PickerWall.tsx:197`.
    Deps: design decision (Q2). **L — defer to a polish phase.**

11. **R6 — favourite identity model (P2-G)** (S–M, folds into N3)
    Update-vs-Save-as-new identity is not wired. New item #3 (remove starring) likely *replaces* this question rather than building it — if starring goes, the add-path is drag-to-Favients and there may be no "update vs new" toggle at all. Resolve with N3 + Q1.
    Files: `palette/store/favientsStore.ts`, `FavientsPanel.tsx`.
    Deps: Q1 + N3. **S–M once decided.**

### Deferred (out of near-term P2 scope)

- **D1 — P2-D cross-app drag + Layer-B DataTransfer shim** (L): in-app drag fully works; cross-app file-drop is handled by `dropWellRegistry`, not the P2 system. Deferred per `p2-scope.md §3`.
- **D2 — W9 snapshot export cue** (S–M): payload should carry "(animated — current frame)" when the source is animated; no animation tracking yet. Deferred.
- **D3 — P2-D edge-case stress test** (M): dwell/avatar/landing all work but need smoke-testing for collapse/expand docks mid-drag, rapid tab switches, slow animations, left-side collapse docks. Runtime re-verify mandated by `p2-scope.md §8` — fold into the N1 bug-fix verification pass.

---

## 3. Recommended order + next stream to launch

1. **R1 loadRamp target** (~15 min) — trivial, closes a P2-C gap.
2. **N1 Favients redock bug** — **launch this next.** Why: it's a live regression a user hit, it's contained (M), and fixing it forces the panel-drag ↔ gradient-drag signal deconfliction that the rest of the drag-model extensions (N4/N5) will lean on.
3. **N2 tool cursors** (S) — independent, cheap polish, can run in parallel with N1.
4. **N3 remove starring + R6 favourite model** — decide Q1 first, then do them together (one favourite-model sweep).
5. **N4 Generator slots hero-esque** — natural next drag-model extension after N1 lands the deconfliction.
6. **R4 Generator/Image round-trip (P2-E)** — standalone M, no blockers; good to slot in any time.
7. **R3 favientTargets migration** — incremental, do alongside R4/N4.
8. **N5 curves drag-drop** — after Q3 (the contract) is answered.
9. **R5 FavientSwatch consistency** — defer to a dedicated polish phase.

**Next stream to launch: N1 (Favients undock→redock bug)** — it's a real user-hit regression and its fix unblocks the panel-drag vs gradient-drag deconfliction that N4/N5 build on.

---

## 4. Open questions for the user

- **Q1 (favourite model):** Confirm starring is being *removed entirely* (new item #3) and drag-to-Favients is the sole add-path — i.e. the original P2-G "Update vs Save-as-new" toggle is dropped, not built. If kept, how should "update existing favourite" vs "save as new" be expressed without a star?
- **Q2 (FavientSwatch):** Should Favients swatches adopt the full `CanonicalHero` affordances (enlarge/metadata/inline edit), or stay as compact inline strips? And do you want one unified selection-ring treatment across Picker / Favients / Stops?
- **Q3 (curves drag-drop direction):** For N5, should the Curves widget *emit* gradients (curves → gradient config), *accept* them (gradient's 256 samples → keyframe fit), or both? This determines the gradient↔curves mapping contract.
- **Q4 (Generator slots):** For N4, should drag and the existing click→dropdown picker *coexist* on each slot (drag = morph avatar out, click = open picker), or should drag replace the click affordance?
