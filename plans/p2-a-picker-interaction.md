# P2-A Picker follow-up — interaction model (decisions in progress)

**Date:** 2026-06-08
**Status:** IMPLEMENTED + verified green (the spine, the Favients flip, and the per-surface
selection rework are on `exec/p2-a-picker`; `tsc` 0 + `test:palette` pass). Remaining work in §5.
**Builds on:** `plans/p2-a-v2-design.md` (shipped "select → reveal → place"), `plans/p2-a-picker-handoff.md`.
**Branch:** `exec/p2-a-picker` (no worktree).

This doc records the conceptual interaction decisions for the Picker follow-up — selection
unification + hero/swatch enlarge. It separates **settled** decisions from **parked** threads so
we don't relitigate. The wall enlarge *mechanic* and other implementation choices are deliberately
NOT locked here.

---

## 1. The reframe — per-surface picks (one active for the dock)

> **Update 2026-06-08 (model revised during testing; supersedes the "one global pick" wording below):**
> selection is **per-surface**, not one global pick. Each gradient surface (Picker / Generator /
> Image / Stops / Favients) keeps its **own** sticky pick in `heroSelection.picks[mode]`, so
> **Favients ≠ Picker** — selecting a favourite never touches the Picker's hero, and vice-versa.
> Exactly **one** pick is **active** at a time (the last one clicked): it drives the dock + the
> "active" glow. A non-active surface still shows its pick, but **dormant** (muted, no glow).
> **Deselect** (empty-wall click / Esc) clears the **active** surface's pick + closes the dock;
> other surfaces are untouched. The Picker hero/wall read `useHeroPick('picker')`; the dock reads
> `useActiveHeroSelection()`.

Within a surface the original framing still holds: one pick, shown two ways —

- **large in the hero**, and
- **highlighted (enlarged) in the wall** (`PickerWall.selectedId`),

with the **same click/drag semantics** on both (the wall swatch and the hero are the same gesture
surface at two sizes).

## 2. Settled decisions

1. **Per-surface picks; the hero NEVER blanks.** Each surface's pick is sticky to that surface
   (survives the desktop↔mobile remount, and a favourite click never touches it). The pick is
   **permanent** — it only changes when you pick a different one in that surface; the hero shows
   the last picked gradient forever. **Deselect** (empty-wall click / Esc) and general click-away
   do NOT blank the hero — they clear only the *active* state:
   - empty-wall click / Esc → `deselectActiveHero()`: clears `active` + `optionsOpen` (so the
     **wall/swatch enlarge clears** — it's gated on `active` — and the dock closes), but KEEPS
     `picks[mode]`, so the hero keeps showing the gradient (dormant, muted);
   - general click-away (touching other UI) → `closeHeroOptions()`: closes the dock only; the wall
     enlarge + hero persist;
   - an **empty-wall click** is told apart from a swatch click in `PickerWall` (swatch hits
     `stopPropagation`; misses bubble to the wall's `onDeselect`).

2. **The options/dock are transient — decoupled from the pick.** They open on a pick and dismiss on
   apply / Esc / click-away. The pick (hero + enlarged swatch) persists through all of it; only the
   destination-chooser comes and goes.
   - The dock can no longer be "visible iff `heroSelection != null`" (the pick is now permanent).
     "Options open" needs its own transient flag, separate from "a pick exists".

3. **The hero is the re-entry point.** **Click hero = re-open the options; drag hero = place
   directly.** This replaces the old `onClick = clearHeroSelection`. The hero behaves like a wall
   swatch (click → options, drag → place), just persistent and large. Re-summon the options after a
   click-away by clicking the enlarged swatch *or* the hero.

4. **Wall swatch keeps a rest→enlarge transition.** The wall is thousands of dormant cells, so the
   enlarge is how you spot the pick — it needs the transition. (The hero does not; see §3.)
   *Mechanic TBD — not locked here.*

5. **Hero visual treatment = three orthogonal layers.**
   - **(a) Vertical-enlarge** (strip height `44 ↔ 96`): a **shared, persisted preference across all
     heroes**, defaulted to **enlarged (tall)**. It is fragmented today — Generator has a *local*
     `useState` toggle (`GeneratorStage.tsx:284,374`), Stops is hardcoded `height={64}`
     (`EditorStage`), Picker is a bespoke raw `<canvas>` at `h-10` (40px). Making it shared +
     defaulted means **lifting it into `CanonicalHero`**, which also folds the Picker hero onto
     `CanonicalHero` (the consolidation already wanted).
   - **(b) Active padding/frame** (when selected / options open): a **separate** effect, layered on
     *whatever* height the hero is at. This is "the additional padding when selected."
   - **(c) Ring = draggability.** Always on (the hero is always draggable). It is **not** the active
     signal, and it is **not dashed** — cyan dashed is reserved for dropboxes (drop targets); the
     hero is a *source*, so its active treatment is a **solid/glow**, keeping source ≠ destination
     (avoids the hero melting into the field of dashed dropboxes during placing).
   - The **active-state delta** is therefore glow/brighten + options + padding — **not** a size change.

6. **Behaviour applies to all heroes via `CanonicalHero`** — Generator, Image, Stops, and the
   folded-in Picker hero. (Favients is the parallel swatch surface — see §3.)

## 3. Implemented (this build)

- **Per-surface `heroSelection`** — `picks[mode]` + `active` + `optionsOpen`; per-mode hooks
  (`useHeroPick` / `useActiveHeroSelection` / `useActiveHeroMode` / `useHeroOptionsOpen`).
- **`CanonicalHero`** is the one hero everywhere incl. the Picker (folded on via `selectionKey`,
  rendering the entry's exact ramp); click = pick + open dock, drag = place; tiered ring (neutral =
  draggable, muted cyan = in-hand/dormant, bright + glow = active).
- **Shared persisted vertical-enlarge** (`heroPrefs`, default tall) with the built-in `⬍` toggle;
  Generator `resultTall` / Stops `64` / the Picker's bespoke canvas all removed.
- **Wall enlarge-in-place** — in-canvas oversize-draw in `SwatchCanvas` (drawn last, clamped, shadow
  + thin ring), gated on `active` so deselect clears it.
- **Favients flip (host-aware)** — `setFavientSelectMode(true)` in the Explorer flips click
  apply→select + drops the Destination dropdown; app-gmt (no dock) keeps click=apply + the dropdown,
  untouched.
- **Dock / Favients coexistence** — a `dragPassthrough` target is ALWAYS visual-only, so it never
  covers the panel and falls away on mouse-over → the shelf's own reorder/group mech runs.
- **Drag robustness** — a `mousemove` safety net in `useDragInFlight` + the Favients tracker (a drag
  whose source unmounts mid-drag no longer hangs the avatar / drag state).

## 5. Remaining work (TODO)

- **Collapsed-dock fallback dropwell** — when a side dock is collapsed, the tab-anchored reveal
  dropwells vanish (no `data-gx-mode-tab` anchor on screen). Render a NAMED well at the dock's edge
  (detect left/right from where the dock toggle/icon lives) that NAVIGATES to the page (un-collapse +
  activate the tab), not just reveals.
- **During-drag gradient visual — seamless transform.** The drag avatar should morph out of its
  SOURCE (the swatch / hero) — grow/translate from the source rect into the cursor-following ramp —
  rather than appearing abruptly at the cursor. Not started.
- **Hero showcase backdrop + settings burger** — an adjustable neutral-grey plate behind the hero
  gradient, in a settings panel opened by a top-bar burger. OPEN DECISION: backdrop as a global
  view-pref (in `heroPrefs`) vs a DDFS param; control form (grey slider vs preset swatches); whether
  the `⬍` enlarge toggle moves into the settings panel. (The burger itself is trivial: `topbar.register`.)
- **Active padding/frame (§2.5b)** — the specced extra inner padding/frame on the active hero isn't
  built; the current active treatment is ring + glow only.
- **Main tab panels must NOT be floatable.** The engine provides docked + floatable panels (GMT
  uses both). Favients (DOM-based) floats fine, but the **canvas-based mode stages** (Picker /
  Generator / Image / Stops) **break the UI when floated** — they assume a docked, full-height
  stage. The Explorer should pin those panels as docked-only (no float affordance / `location`
  locked), leaving Favients floatable.

## 4. Invariants to preserve

- The wall stays **NOT `data-gx-selectable`** — but its empty-click meaning **changes**: it must
  **close the options, not blank the hero**.
- Selection survives the **desktop↔mobile remount** (lives in `heroSelection`, never `useState`).
- `heroSelection.key` **fully determines** `payload` (+ `selfTargetId`) — the `setHeroSelection`
  identity guard early-returns on `(mode,key)` match (v2-design §6 contract).
