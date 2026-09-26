# P2 Gradient Drag Interaction — Implementation Scope

**Date:** 2026-06-06
**Status:** Scoping (code-grounded, design-research probe). Folds into the P2 portability phase.
**Source:** P2 finding in [execution-progress.md](execution/execution-progress.md) ("drag interaction = MAJOR
selling point; polish bar HIGH + ARCHITECTURAL FORK"), the frozen P0e kernels (b)+(c), and locked
decision #2 (full portability unification: *one model, one target list, one canonical hero*).
**Scope:** Resolve the drag paradigm fork and specify the build for two pillars the user calls a major
selling point:
1. A **lifted swatch** that hovers smoothly near the cursor while dragging (custom animated avatar, not
   the static browser drag image).
2. **Cross-tab drag-to-reveal** — drag from one mode, hover a mode tab → it switches → drop onto a target
   in the now-revealed tab (e.g. Picker → Generator slot).

All paths under `h:/GMT/workspace-gmt/dev/`.

---

## 0. What exists today (the W4/W2 kernels + the live DnD surface)

The P0e kernels are **HTML5 `dataTransfer`-based** and frozen as interfaces (b)+(c):

**Drag + drop-wells (b)** — `store/dropWellRegistry.ts`, `store/dragFlight.ts`, `hooks/useDragInFlight.ts`,
`components/DragWellsOverlay.tsx`:
- `useDragInFlight()` tracks "is a drag in flight + what MIME types" at the **window** level via
  enter/leave **depth counting** (`dragFlightReducer`), reset on `drop`/`dragend`/`blur`. Listeners are
  **capture-phase** except `drop` which is **bubble** (the S6-ratified capture→bubble fix, frozen in (b))
  so a well tile's bubble `onDrop` runs before the overlay unmounts it.
- Visibility keys off `dataTransfer.types` **only** — `getData()` is blocked during `dragover`, readable
  only inside `onDrop`. `DropWell.accepts(types: string[])` decides what shows; `onDrop(dt: DataTransfer)`
  reads the real payload.
- `DragWellsOverlay` portals the accepting wells to `<body>` at `Z.overlay` (2000) while in flight; each
  tile `preventDefault()`s `dragover` and routes `drop` to `well.onDrop`.

**Send-target (c)** — `store/sendTargetRegistry.ts`, `components/SendToMenu.tsx`:
- The click/keyboard twin. `SendTarget<P> { id, label, group: 'host'|'mode', accepts?(payload), apply(payload) }`
  — **payload-generic** (the §4(c) ratified genericization). `targetsForPayload(payload, {selfId})` is the
  pure selector `SendToMenu` lists.

**The gradient MIME path** — `palette/core/favientDnd.ts`:
- `FAVIENT_DND_MIME = 'application/x-gmt-favient'` (+ `FAVIENT_INTERNAL_MIME` reorder marker).
  `setFavientDrag(dt, {config, name, source?, favId?})` / `readFavientDrag(dt): FavientDragPayload | null`.

**Live drag sources** (all HTML5 `draggable` + `setFavientDrag`):
- `palette/components/PickerWall.tsx:237-266` — `draggable`, and **already uses `setDragImage`** with a
  throwaway off-screen canvas of just the hovered swatch. *This is the "static browser drag image" the
  finding wants to replace.*
- `palette/components/FavientsPanel.tsx:419-430` — rows `draggable`, `setFavientDrag` with `favId` for
  reorder; even disabled rows stay draggable so a drag *attempt* surfaces the "clear filter" cue.

**Live drop targets** (all HTML5 `onDragOver` gate on `FAVIENT_DND_MIME` + `onDrop` → `readFavientDrag`):
- `palette/components/GeneratorStage.tsx:62-93` — the two source slots A/B (the headline cross-tab target).
- `palette/components/FavientsPanel.tsx:913-988` — group insert / new-group / trash reorder targets.
- `palette/components/ImageStage.tsx:176-200` — a **window-level** `dragover`/`drop` listener that
  `preventDefault`s every drag to import an image **file**, but **early-returns when `FAVIENT_DND_MIME` is
  present** (`isGradientDrag`). This is the coexistence guard the kernel docs mandate.

**The shell** — `gradient-explorer/GradientExplorerApp.tsx`:
- `Stage` routes off `activeRightTab` → `'Picker' | 'Generator' | 'Image'` (54-71). The **dock tab strip
  IS the mode selector** (`setup.ts`: three right-dock panels; `togglePanel(id, true)` sets the active tab).
- `DragWellsOverlay` is mounted **once** near the shell root (362).
- **Precedent worth noting:** `components/layout/Dock.tsx:258-271` already implements a **pointer-based
  custom drag** for tab reordering — `startPanelDrag` on `mousedown`, `onMouseEnter` reorders while
  `draggingPanelId` is set, `onMouseUp` ends. The codebase already does "hover-to-act during a non-HTML5
  drag," which is exactly the cross-tab-reveal motion.

**Reusable avatar visual** — `palette/components/GradientHoverPreview.tsx`: a `<body>`-portaled canvas at
`z 9500` with a `paint(ctx,w,h)` callback, already used by both Picker and Favients for hover-zoom. The
lifted-swatch avatar is this component's sibling (same paint contract, plus follow/lift/settle motion).

---

## 1. PARADIGM — recommendation: **HYBRID (pointer-primary for in-app, HTML5 retained at the OS boundary)**

### First, the framing correction: the app is NOT a "pure HTML5" app — HTML5 is a confined island

It is tempting to read the fork as "leave our HTML5 DnD app for a pointer one." That framing is wrong, and
it matters for the risk assessment. **The app is overwhelmingly pointer-native already; HTML5 `dataTransfer`
is used in exactly the few places it *should* be.** Verifiable by the unforgeable HTML5 signature
`e.dataTransfer`:

```
rg "e\.dataTransfer" dev --glob '!node_modules'     # the HTML5 islands
rg "setPointerCapture"  dev --glob '!node_modules'  # the pointer-native majority
```

- **`e.dataTransfer` → 8 files only**, every one doing *discrete-item transfer between containers* or *OS
  file ingest*: `PickerWall.tsx`, `FavientsPanel.tsx`, `GeneratorStage.tsx`, `DragWellsOverlay.tsx` +
  `useDragInFlight.ts` (the W4 kernel), `StateLibraryPanel.tsx` (item transfer); `ImageStage.tsx`,
  `SceneFileDropZone.tsx` (OS file ingest). This is the textbook-correct use of HTML5 DnD.
- **`setPointerCapture` / `onPointerMove` + rAF → 40+ files** — the entire *feel* of the app: camera
  navigation (`engine-gmt/navigation`), light/position gizmos, every slider/knob, the colour picker's 2D
  field (`EmbeddedColorPicker`, 11 hits), the fluid-toy brush gestures, `DraggableWindow` panel dragging,
  `MobileControls`, the render loop.
  *(Caveat for the grep-curious: a broad `draggable|dataTransfer` search also hits the word "draggable" in
  comments inside `usePrecisionTrackDrag.ts` / `QualityRangePad.tsx` — those are pointer code, false
  positives. `e.dataTransfer` is the clean discriminator.)*

So "pure HTML5" was only ever true of **the gradient DnD kernel specifically**, never the app. This flips
the cost story: the proposed pointer controller does **not** import a foreign paradigm — it joins the
app's *dominant* one, and three existing pieces de-risk it directly:
- `components/inputs/usePrecisionTrackDrag.ts` — the reusable pointer-drag primitive (P0b extraction;
  click-to-position, delta-drag, re-anchor) to mirror for the controller's pointer bookkeeping.
- `DraggableWindow` + `Dock.tsx` tab-reorder — existing proof that "a pointer drag that survives DOM
  changes via a store flag" works here (the exact mechanic cross-tab reveal needs).
- `GradientHoverPreview.tsx` — existing proof of the body-portaled animated-canvas avatar pattern.

The hybrid therefore keeps HTML5 confined to the file/transfer island where it already lives, and brings
**gradient drag into the pointer world the rest of the app already inhabits** — not "two competing
paradigms" so much as "the app's pointer paradigm + a small, well-fenced HTML5 island for OS files."

### The fork, evaluated concretely

| | Pure HTML5 (`dataTransfer`) | Pure pointer (custom layer) | **Hybrid (recommended)** |
|---|---|---|---|
| Lifted-swatch avatar | ✗ only a frozen `setDragImage` bitmap — no spring-follow, no lift/scale/shadow, no settle | ✓ full control | ✓ full control (pointer path) |
| Cross-tab reveal | ~ technically works (a tab's `onDragEnter` can `togglePanel`; the window-level drag survives the DOM swap and the revealed slot's `onDrop` fires) but the drag image is frozen and dwell/feedback are clumsy | ✓ smooth — JS hit-test + dwell + continue | ✓ smooth (pointer path) |
| OS **file** drop (ImageStage import) | ✓ native | ✗ pointer events never receive OS file drags | ✓ retained on HTML5 |
| Cross-**app** drag (export a gradient out) | ✓ native | ✗ impossible | ✓ retained on HTML5 (optional affordance) |
| Reuses frozen (b)/(c) | ✓ as-is | ✗ wells keyed on `dataTransfer.types` don't apply | ~ (b) retained for file/cross-app; in-app converges on (c) — see §4 |
| Touch / coarse pointer | ~ HTML5 DnD is desktop-mouse-only on most mobile browsers | ✓ Pointer Events unify mouse/touch/pen | ✓ (pointer path) |

**Pure HTML5 fails pillar 1 outright** — `setDragImage` only snapshots a static bitmap at `dragstart`; it
cannot animate, follow with spring physics, or react on drop. No amount of CSS reaches the OS drag image.

**Pure pointer wins the feel but severs the OS boundary** — the ImageStage **file** import
(`ImageStage.tsx:184-200`) and any cross-app export depend on native DnD, which pointer events can't
originate or receive. Locked decision #1 keeps Image in the doc set; W7 import relies on file drop.

**Hybrid is the only option that delivers both.** The split is by **input origin**, not by feature:

- **In-app gradient drags → pointer-based.** A new shell-level **drag controller** owns the avatar, holds
  the payload as a plain JS object (`FavientDragPayload`), hit-tests in-app targets/tabs in JS, and
  resolves the drop in JS. This is where the lush avatar + smooth cross-tab live.
- **OS-originated drags (files) → HTML5, unchanged.** `ImageStage`'s window listener stays exactly as it
  is. The (b) kernel + `useDragInFlight` stay mounted to host **file-drop** wells (and the cross-app guard).
- **Cross-app *export* (drag a gradient OUT to the desktop) → optional HTML5 affordance** retained on the
  source element only (a parallel `draggable` handle), independent of the in-app pointer path.

### What survives / changes / is added

- **Survives unchanged:** `favientDnd.ts` (the payload shape `FavientDragPayload` becomes the in-app
  pointer payload *and* the HTML5 MIME for file/cross-app); `ImageStage` file-import + its
  `isGradientDrag` guard; the (b) HTML5 well kernel (now scoped to file/cross-app wells); `SendToMenu`
  (the click/keyboard twin — unchanged, and the accelerator that keeps non-pointer users whole).
- **Changes:** in-app drag **sources** (PickerWall, FavientsPanel rows, every result hero) gain a
  pointer-drag start *alongside* (or instead of) `draggable`; in-app drop **targets** (Generator slots,
  Favients reorder, wells) are reached by the pointer controller (see §4 for how, with zero rewrite of
  their existing `onDrop` via a compatibility shim).
- **Added:** the pointer drag controller (`store/pointerDragFlight.ts`), the avatar layer
  (`components/DragAvatarLayer.tsx`), a hit-test/geometry seam on the target registry, and tab-dwell
  cross-tab logic.

---

## 2. LIFTED SWATCH — the avatar

### Mount point & ownership
A single **shell-level overlay**, `components/DragAvatarLayer.tsx`, mounted once in `GradientExplorerApp`
right beside `DragWellsOverlay` (line 362). It portals to `<body>` (escapes dock/panel clipping &
transforms, exactly as `GradientHoverPreview` does) at a **dedicated drag tier above the wells but below
context menus** — add `Z.dragAvatar = 9500` to `components/ui/zIndex.ts` (matches the existing
`GradientHoverPreview` z and the documented "context menu always on top" rule). The avatar is
`pointer-events-none` so it never eats the hit-test under the cursor.

### Reads the payload from
A new transient store `store/pointerDragFlight.ts` (mirrors `pickerSearch` — transient, no DDFS/persist/
undo, per the kernel constraint that all drag state is transient):
```ts
interface PointerDragState {
  active: boolean;
  payload: FavientDragPayload | null;   // the gradient being dragged (config + name + provenance)
  pointer: { x: number; y: number };    // raw cursor (updated every pointermove)
  origin: { x: number; y: number };     // where the lift began (for the pickup animation)
}
```
The avatar subscribes via `useSyncExternalStore`; it `paint`s `renderStopsToRamp(payload.config.stops)`
into its canvas (same call PickerWall/Favients already use).

### Motion (the polish bar)
- **Follow:** the store records the *raw* pointer on every `pointermove`; the avatar interpolates its own
  rendered position toward it with a per-frame **lerp/spring** (`pos += (target - pos) * k`, `k≈0.25`
  critically-damped) inside a `requestAnimationFrame` loop. This produces the "hovers smoothly near the
  cursor" lag the user wants — the avatar trails and settles rather than rigidly tracking.
- **Lift on pickup:** on drag start, animate `scale 1 → 1.08`, add a soft drop-shadow + slight rotate, and
  ease in opacity from the `origin` point (so it visibly *lifts off* the source swatch).
- **Snap/settle on drop:** on a valid drop, spring the avatar to the target's centre and fade (a
  "delivered" settle); on an invalid drop (released over nothing), spring it **back to `origin`** and fade
  (the standard "return to source" cancel). Both are short (~150–200ms) and run in the same rAF loop.
- Honor `prefers-reduced-motion`: drop the spring to an instant snap.

### Coexistence with `DragWellsOverlay`
They share `<body>` but never conflict: the avatar is `pointer-events-none` (visual only) at `z 9500`;
the wells are interactive at `Z.overlay` (2000). During an **in-app pointer drag**, the wells overlay is
driven by the pointer controller's synthesized in-flight state (§4) so it still fades in and highlights —
the avatar floats above it. During an **OS file drag**, the avatar stays idle (no in-app payload) and the
HTML5 wells behave exactly as today.

---

## 3. CROSS-TAB REVEAL

### Mechanism
The pointer controller hit-tests on every `pointermove`:
1. **Tab dwell:** the dock tab strip (`Dock.tsx` / `DockTab`) tags each tab with a
   `data-gmt-mode-tab="<PanelId>"` attribute. On pointermove the controller reads
   `document.elementFromPoint(x,y)` and walks up to a tagged tab. If the pointer **dwells** over a tab that
   isn't the active one for **~350–450ms**, it calls `togglePanel(panelId, true)` (the exact call the tab's
   own `onClick` uses) → `activeRightTab` flips → `Stage` re-routes → the target tab's content mounts. The
   drag **continues** (pointer capture is held on the controller, not the source DOM, so the source
   unmounting under the tab swap doesn't end the drag — this is the key advantage over HTML5, where the
   drag is bound to the source element).
2. **Reveal feedback:** while dwelling, the tab shows a fill/progress ring (reuse the `tabActive` styling
   ramp); on switch, a brief highlight confirms the reveal.
3. **Drop onto the revealed target:** after the switch, the now-mounted target (e.g. a Generator slot)
   registers itself in the target registry (§4) on mount. On `pointerup`, the controller hit-tests the
   registry rects under the cursor and invokes the matching target.

### Hit-testing in the pointer paradigm
Two complementary mechanisms, both cheap and testable:
- **Registered rects (primary, for wells + slots + heroes):** drop targets register a live element ref;
  the controller reads `getBoundingClientRect()` at `pointerup` (and on enter for highlight). Pure
  geometry → unit-testable like `wellsForTypes`/`targetsForPayload` are today.
- **`elementFromPoint` + `data-` attributes (for tabs + ad-hoc zones):** no registration needed; good for
  the tab strip and the Favients reorder gaps.

### Dwell timing
- Tab switch: **~400ms** dwell (long enough to not switch on pass-through, short enough to feel
  responsive). Cancel the timer the instant the pointer leaves the tab.
- No dwell needed for the *drop* itself — that's an explicit `pointerup`.

### How a target in the newly-revealed tab is found
Targets register **on mount** (`useEffect` → `registerSendTarget` + a geometry ref) and unregister on
unmount — so the Generator slot only exists in the registry once its tab is revealed and mounted, which is
correct: you can't drop on it before it's visible. The controller re-reads rects at `pointerup`, so a
target that mounted mid-drag (post-reveal) is found with no extra wiring.

---

## 4. KERNEL EVOLUTION — **wrap, don't supersede; converge wells + send-to onto ONE target list**

The (b) HTML5 well kernel is **retained as-is** (frozen signatures untouched) for the **OS file/cross-app
boundary**. In-app gradient drops are handled by the new pointer controller. The question is how the
pointer controller resolves a drop **without rewriting every existing `onDrop`** and **without breaking
frozen interfaces**. Recommendation in two layers:

### Layer A — the unified target list (the locked-decision #2 payoff)
A pointer **drop target** and a **send-target** are the *same thing*: both take a gradient payload and
apply it. The frozen (c) `SendTarget<P> { accepts?(payload), apply(payload) }` is **already the right
shape**. So:
- **Every in-app drop destination registers once as a `SendTarget`** (Generator slot A/B, "edit stops",
  each result hero, the export/PNG/fullscreen wells). `SendToMenu` lists them for click/keyboard
  (accelerator + non-pointer parity); the pointer controller hit-tests the **same list** for drag. This
  *is* "drag ↔ Send-to share ONE target list" (locked #2, P2 carry-forward) — it falls out for free.
- The wells (export/PNG/fullscreen) become send-targets in a `group: 'well'` (or reuse `'mode'`) and the
  overlay that floats them during a drag renders from this list. The (b) HTML5 well registry stays for
  file-drop wells only.

**Required additive change to (c) — flag for orchestrator ratification (frozen interface):** the pointer
controller needs **geometry** to hit-test. Add an *optional* field, exactly as `render?` was added to (b)
and ratified as an additive §4(b) refinement:
```ts
interface SendTarget<P> {
  …                                   // unchanged frozen fields
  getRect?: () => DOMRect | null;     // ADDITIVE, optional — present → drag-droppable; absent → menu-only
}
```
Absent `getRect` ⇒ the target is Send-to-menu-only (host coloring layers, etc.); present ⇒ it also accepts
a pointer drop. **This is the only frozen-interface change in the whole scope** — additive, optional,
back-compatible, and it is what makes "one target list" real. Mark it `(c)`-amendment, needs ratification.

### Layer B — compatibility shim so existing HTML5 `onDrop` handlers keep working
To avoid rewriting `GeneratorStage`/`FavientsPanel` drop handlers (they read `readFavientDrag(e.dataTransfer)`)
on day one, the pointer controller can **terminate a drop by synthesizing a `DataTransfer`**:
`setFavientDrag(new DataTransfer(), payload)` then call the target's existing handler. `new DataTransfer()`
is constructible in Chromium/Firefox (the Explorer's targets). This lets the migration be incremental:
a target works whether it's been ported to a `SendTarget.apply(payload)` or still has its legacy
`onDrop(dt)`. **Recommend converging on `apply(payload)`** (cleaner, no synthetic-DOM fiddliness) and using
the shim only as a transition bridge / for the favients-reorder targets that are genuinely DOM-positional.

### What this means for each frozen piece
- **(b) drop-wells kernel:** *retained, scope narrows* to OS-file/cross-app wells. `useDragInFlight` keeps
  serving HTML5. The S6 capture→bubble drop-reset stays correct (still the file-drop path). **No signature
  change.** S6's fullscreen well migrates to a `SendTarget` with `getRect` (it's an in-app gradient well).
- **(c) send-target kernel:** *evolved additively* with optional `getRect?` (ratify). Becomes the single
  in-app target list for both drag and Send-to.
- **`favientDnd.ts`:** unchanged — `FavientDragPayload` is the in-app pointer payload *and* the HTML5 MIME.
- **`createListRegistry`:** reused for the target list (already backs both kernels).
- **`palette/core/favientTargets.ts`:** migrate onto the engine `sendTargetRegistry` (the existing P2
  carry-forward) — these become the first `SendTarget`s with `getRect`.

---

## 5. RISKS

- **Touch / mobile:** pointer events unify mouse/touch/pen, so the pointer path is *better* than HTML5 here
  — but the mobile shell has **no dock tab strip** (`MobileModeTabs`, `GradientExplorerApp.tsx:151`), so
  cross-tab-reveal-by-dwell must hit-test the **mobile tab bar** instead. And a long-press vs scroll
  disambiguation is needed (start the drag only after a small move threshold + delay so vertical scroll
  isn't hijacked). Treat mobile drag as a **fast-follow**, not pillar-1 launch — the Send-to menu is the
  mobile-complete path.
- **Keyboard / non-pointer parity:** `SendToMenu` is the accelerator and **must stay first-class** — the
  unified target list (§4 Layer A) guarantees every drag target is also reachable by click/keyboard. No
  gradient destination should be drag-only.
- **Avatar perf:** one rAF loop, one canvas, `pointer-events-none`, painted only on payload change (not per
  frame — only the transform updates per frame). `getBoundingClientRect` is read at `pointerup` + on
  zone-enter, not every move (use `elementFromPoint` for the cheap per-move pass). Negligible.
- **ImageStage file-drop coexistence:** the pointer path **does not touch** the HTML5 file listener — an
  OS file drag never starts the pointer controller (no in-app payload), so `isGradientDrag`/file-import is
  untouched. The one watch item: ensure an in-app pointer drag *over* the Image stage doesn't get
  swallowed — but since it's pointer (not HTML5), ImageStage's `dragover` listener never fires for it.
- **Regressing S6's fullscreen well:** S6's well migrates to a `SendTarget` with `getRect`; its drop
  behavior (open fullscreen) is preserved via `apply(payload)`. Keep the S6 capture→bubble reset for the
  retained HTML5 file path. **Visual re-confirm fullscreen open after migration** (S6 was the merge that
  taught the "concept-ok ≠ works" lesson — re-verify at runtime, per the process fix).
- **Two drag *input sources* coexisting (downgraded from "two paradigms"):** the app is already
  pointer-native (§1), so this is not "bolt a second paradigm onto an HTML5 app" — it's the existing
  pointer paradigm + the confined HTML5 file/transfer island. The real invariant to hold: the avatar
  activates *only* for in-app payloads, and an OS file drag and an in-app gradient drag must never both
  think they're active. Gate the pointer controller on "started from an in-app source"; gate
  `useDragInFlight`/wells visibility on HTML5 `types`. They're mutually exclusive by origin. The one
  genuine collision risk is leaving a source `draggable` for cross-app export (open decision #2): a
  `pointerdown` that also fires a native `dragstart` would show a ghost avatar *and* a browser drag image.
  Dropping cross-app export removes this risk class entirely.
- **`new DataTransfer()` availability:** the Layer-B shim assumes constructible `DataTransfer` — true in
  Chromium/Firefox. If ever run somewhere it isn't, the `apply(payload)` path (Layer A) has no such
  dependency, which is the reason to converge on it.

---

## Build breakdown

| # | Piece | What | Effort | Touches |
|---|-------|------|--------|---------|
| 1 | **Pointer drag controller** | `store/pointerDragFlight.ts` (transient store: active/payload/pointer/origin) + `hooks/usePointerDrag.ts` (window pointermove/up, capture, start/end API) | M | new |
| 2 | **Lifted-swatch avatar** | `components/DragAvatarLayer.tsx` — body-portaled canvas at `Z.dragAvatar` (9500, add to `zIndex.ts`); rAF spring-follow; lift/scale/shadow on pickup; snap-to-target / return-to-origin on drop; `prefers-reduced-motion` | M | new + `gradient-explorer/GradientExplorerApp.tsx` (mount) |
| 3 | **Make every result a SOURCE** | `PickerWall`, `FavientsPanel` rows, + each result hero start a pointer drag (alongside the existing `draggable` for cross-app export). Replace the PickerWall `setDragImage` with the avatar | M | `PickerWall.tsx`, `FavientsPanel.tsx`, hero components |
| 4 | **Unified target list (Layer A)** | Add optional `getRect?` to `SendTarget` (**ratify (c)-amendment**); register Generator slots / stops / heroes / wells as `SendTarget`s with `getRect`; migrate `favientTargets.ts` + S6 fullscreen well onto the registry | M–L | `store/sendTargetRegistry.ts`, `GeneratorStage.tsx`, `palette/core/favientTargets.ts`, S6 well |
| 5 | **Pointer drop resolution** | Controller hit-tests `getRect` targets at `pointerup` → `apply(payload)`; Layer-B `new DataTransfer()` shim for legacy `onDrop` handlers during migration; drive `DragWellsOverlay` from synthesized in-flight state so wells still fade in | M | controller + overlay glue |
| 6 | **Cross-tab reveal** | `data-gmt-mode-tab` on `DockTab` + mobile tab bar; ~400ms dwell → `togglePanel`; reveal progress feedback; continue-drag across the Stage remount | M | `Dock.tsx`, `GradientExplorerApp.tsx` (mobile bar), controller |
| 7 | **Parity + a11y** | Confirm every target is in `SendToMenu` (keyboard); reduced-motion; mobile long-press-vs-scroll threshold | S | controller, `SendToMenu` (audit only) |
| 8 | **Tests + visual** | Pure unit tests for the geometry hit-test selector (mirror `wellsForTypes`/`targetsForPayload`); `/code-review` + `/security-review` on the payload path (P2 carry-forward); **runtime visual confirm** of avatar + cross-tab + fullscreen-still-works | S–M | `debug/` harness |

**Total: ~L** (a focused 1–2 week stream within P2). The avatar (1+2) and the unified target list (4) are
the two independent spines and can run in parallel worktrees; 5/6 depend on both; 3 depends on 1.

---

## Suggested sequencing
1. **(c)-amendment ratification** (add optional `getRect?`) — gate everything else on the orchestrator
   signing this off, since it's the one frozen-interface change.
2. **Parallel:** [1+2] pointer controller + avatar  ·  [4] unified target list + well/favientTargets
   migration.
3. **[5] pointer drop resolution** (needs 1+4) → wire the wells overlay to the synthesized state.
4. **[3] make every source a drag source** (needs 1) → replace PickerWall `setDragImage`.
5. **[6] cross-tab reveal** (needs 1+4+5).
6. **[7] parity/a11y + [8] tests/visual** — close-out; **re-confirm S6 fullscreen at runtime**.

---

## Open decisions for the user
1. **Ratify the `(c)` `getRect?` additive amendment?** It's the single frozen-interface change and the
   thing that makes "drag + Send-to share ONE target list" real. Recommended: yes (additive, optional,
   back-compatible — same pattern as the ratified `render?` on (b)).
2. **Keep an HTML5 cross-app *export* drag at all?** (Drag a gradient out of the app onto the desktop as a
   file.) It's a small parallel `draggable` on sources, independent of the pointer path. Default
   recommendation: **keep it** (low cost, real utility for power users) — but it's the only reason sources
   stay `draggable`, so it's worth an explicit yes/no.
3. **Mobile drag now or fast-follow?** Pointer events make it *possible*, but long-press-vs-scroll + the
   mobile tab-bar reveal are extra work. Recommendation: **ship pillar 1+2 desktop-first; mobile uses the
   Send-to menu**, add mobile drag as a fast-follow.
4. **Avatar visual richness** — minimal (just the ramp + lift/shadow) vs. richer (name label, facet chip,
   "→ drop on a slot" hint while in flight). Recommendation: start minimal, add the in-flight hint once the
   target-highlight is in (it doubles as discoverability).
5. **Dwell duration to switch tabs** (~400ms proposed) — tune to feel; expose as a constant, confirm by
   feel during visual review.
