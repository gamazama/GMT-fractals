# P2-A — Canonical Hero + "Select → Act" — Design

**Date:** 2026-06-07
**Status:** DRAFT design — for user verification + iteration; no code yet.
**Scope owner:** P2-A (spine 1 of the P2 portability phase).
**Reads:** `plans/p2-scope.md` (§2, §9 Decision 4), `plans/p2-drag-interaction-scope.md` (the drag paradigm
this hero must be compatible with — same (c) target list backs both Send-to and drag).

This doc makes the canonical-hero + SELECT→ACT model **concrete and decision-ready**. It deliberately keeps
**2–3 viable options open** rather than over-specifying one answer. The user wants the UX iterated before
any code lands.

---

## 1. What we're unifying (the problem in one screen)

Today the five gradient surfaces each hand-roll a "hero" (the result preview strip) with divergent click
semantics:

| Surface | Hero today | Click means | Has rename? | Fullscreen? | Send-to? | Selection ring? |
|---------|-----------|-------------|-------------|-------------|----------|-----------------|
| Picker (`PickerStage:269–319`) | strip + name + bundle + sm★ + hint | **immediate apply** (`applyEntryToColoring`) | no (search only) | no | no | cyan on **wall** swatch only |
| Generator (`GeneratorStage:354–384`) | strip + md★ + stops count + ⛶ + ⬍ | **no click-apply** (drag only) | no | yes (hardcoded ⛶) | no | none |
| Image (`ImageStage:508–528`) | strip + md★ + 2× "Send to A/B" buttons | **hardcoded send buttons** | no | no | hardcoded A/B | none |
| Stops/Editor (`EditorStage:50–60`) | strip + md★ + stops count | **read-only** (always live-editing) | no | no | no | none |
| Favients swatch (`FavientsPanel:352–494`) | canvas swatch, draggable | **immediate apply** (`activeTarget.apply`) | dbl-click name (list only) | no | no | amber hover only |

Plus a **state-loss bug**: Picker holds `selected` in local `useState` (`PickerStage:71`); the desktop↔mobile
layout flip at `GradientExplorerApp:55–73` remounts the Picker subtree and **blanks the hero**. (Search
survives because it lives in the transient `pickerSearch` store — the exact precedent we copy.)

**P2-A goal:** one `CanonicalHero` every surface embeds, one coherent *click = select + reveal options*
interaction, one selection treatment, and the Picker state-loss fixed by lifting selection to a transient
store.

---

## 2. `CanonicalHero` — component spec

### 2.1 Proposed API

```ts
interface CanonicalHeroProps {
  // content
  config: GradientConfig;            // the gradient to render (frozen (e) core)
  name: string;                      // payload.name ?? stage label
  source?: string;                   // provenance chip: 'Picker · <bundle>' | 'Generated' | 'Image · <mode>' | fav source

  // selection (lifted state — see 2.3)
  selected?: boolean;                // draws the selection treatment; mode owns the bit
  onSelect?: () => void;             // click body → select + reveal actions

  // the action set (mode opts in; absent ⇒ action hidden)
  primaryTarget?: SendTarget<FavientDragPayload>;  // the "Apply" destination; absent ⇒ no primary Apply (Stops)
  onRename?: (next: string) => void;               // absent ⇒ no Rename (Picker)
  onFullscreen?: () => void;                        // absent ⇒ no Fullscreen
  // ★ favourite is ALWAYS present (FavStar embedded directly, not via the action set)

  // sizing / layout
  height?: number;                   // strip height (Picker 40, Generator 44/96, etc.)
  className?: string;

  // drag source wiring — P2-D ONLY, stubbed here:
  // dragPayload?: FavientDragPayload;  startPointerDrag?(payload): void;
}
```

It **owns**: the `GradientStrip` render, the name + source chip, the embedded `FavStar`, the affordance
header/bar, and the SELECT→ACT interaction. It **embeds, never modifies**: `GradientStrip` (frozen
signature `ramp/height/className/rounded`), `FavStar` (reads `favientSig(config)`, calls `favStatus.toggle`),
`SendToMenu`/`AnchoredMenu` shell for the options surface, optionally `GradientHoverPreview` for an enlarged
preview on select.

**Payload shape** passed to every action: the frozen `FavientDragPayload` `{config, name, source?, favId?}`
(`palette/core/favientDnd.ts`). No envelope change in P2 (matches scope §10).

### 2.2 States

- **idle** — strip + name + source chip + ★ (low-emphasis). No action bar/popover.
- **hovered** — subtle ring (hover affordance, distinct from selected); ★ and a "⋯"/caret hint may brighten.
  On Favients grid this is today's `ring-amber-300/80`.
- **selected** — the **one** selection treatment (Decision below) + actions revealed (popover or docked bar,
  per chosen Option). `aria-selected`, focus-visible outline for keyboard.

Selection is **per-mode, never global** (scope constraint): a selected Picker gradient must not light up the
Generator hero. The store is keyed by mode.

### 2.3 How it fixes the Picker resize state-loss

Lift the selected-entry/preview state out of `PickerStage`'s `useState` into a **transient module-level
store** built on the `pickerSearch` precedent (`useSyncExternalStore`, no DDFS / no persist / no undo). This
survives the desktop↔mobile remount exactly as the search query does today.

**Recommended shape (scope Decision 5 — one keyed store):**

```ts
// palette/store/heroState.ts  (transient — mirrors pickerSearch / fullscreenStore)
type HeroMode = 'picker' | 'generator' | 'image' | 'stops';
interface HeroSelection { entryId?: string; config?: GradientConfig; name?: string; source?: string; }
// module-level Record<HeroMode, HeroSelection>; emit() only on change (stable snapshot ref);
// useHeroSelection(mode) via useSyncExternalStore; setHeroSelection(mode, sel).
```

One keyed store avoids four near-identical modules (`pickerHeroPreview`, …). The same `entryId` feeds
`PickerWall`'s existing `selectedId` prop so the wall's cyan strokeRect stays in sync with the hero.

> **This is technically sub-stream P2-B**, but the store shape is specified here because the hero's API
> (`selected` / `onSelect`) is the contract P2-B fills. P2-A can land against a temporary local-state shim
> and P2-B swaps in the store, or they co-land on `PickerStage`.

### 2.4 Precedents reused (all unchanged)

- `GradientStrip.tsx` — dumb canvas ramp; the base preview. Frozen signature.
- `FavStar.tsx` — ★ toggle via `favientSig`; embedded as a sibling affordance (NOT inside the popover —
  too frequent/heavyweight to bury).
- `SendToMenu.tsx` + `ui/AnchoredMenu.tsx` — portalled, capture-phase dismiss + Escape, `Z.popover` (200).
  The "Send to ▾" sub-list is exactly `targetsForPayload(payload, {selfId})` — no signature change needed.
- `sendTargetRegistry.ts` `targetsForPayload` — pure selector; the hero reuses it to know if a Send-to is
  even available (hide the affordance when empty).
- `GradientHoverPreview.tsx` — body-portalled enlarged preview (`paint()` callback, z 9500) for an optional
  "zoom on select".
- `pickerSearch.ts` / `fullscreenStore.ts` — the transient-store pattern for §2.3.
- `paramUndoBracket.ts` — rename/apply/★ ride the gesture-boundary bracket (start→end), not ad-hoc writes.
- `PickerWall.tsx:196–199` — cyan `strokeRect` (#22d3ee, 2px) selection-ring template.

### 2.5 Mount points (one per surface)

- **Picker** — replaces `PickerStage:269–319` hero block; toolbar + wall below unchanged; feeds `selectedId`
  to the wall.
- **Generator** — replaces the result block `GeneratorStage:354–384`; the `resultTall` height toggle becomes
  the `height` prop; ⛶ moves into the action set.
- **Image** — replaces `ImageStage:508–528`; the hardcoded "Send to A/B" buttons become the generic Send-to.
- **Stops/Editor** — replaces `EditorStage:50–60`; **minimal variant** (no `primaryTarget` ⇒ no Apply).
- **Favients** — `FavRow` swatches gain the same SELECT→ACT surface (replaces immediate `onApply`); inline
  list-rename stays as a fast path, grid gains rename via the popover.

---

## 3. The "Select → Act" model — three options

All three share: click body = **select** (not apply); ★ stays a sibling; "Apply" hidden when no
`primaryTarget`; "Send to ▾" lists `targetsForPayload`; rename brackets via `paramUndoBracket`; selection
treatment unified. They differ in **where the actions live** and the **feel**.

Proposed default action set (confirm in Decision A): **Apply · Send to ▾ · Rename · Fullscreen · ★(sibling)**.

---

### Option 1 — **Inline popover around the swatch** (anchored menu)

Click the hero/swatch → it gains the selection ring and an `AnchoredMenu` popover drops below it with the
actions. Reuses the `SendToMenu`/`AnchoredMenu` shell verbatim; "Send to" is a nested group inside it.

```
 ┌─ Sunset Vivid · Picker · cb-warm ──────────────┐  ★
 │▓▓▓▒▒▒░░░██████  ◀ selected (cyan ring)          │
 └─────────────────────────────────────────────────┘
        ▼ (popover, Z.popover)
   ┌───────────────────────────┐
   │ ▸ Apply (to Coloring)     │
   │ ▸ Send to ▸  (submenu)    │
   │ ▸ Rename…                 │
   │ ▸ Fullscreen              │
   └───────────────────────────┘
```

- **Actions:** Apply · Send to ▸ · Rename… · Fullscreen.  ★ stays on the header (sibling).
- **Selection:** cyan ring on the strip (`PickerWall` template) + popover open.
- **Desktop:** popover anchored below, capture-phase dismiss + Escape (free from `AnchoredMenu`).
- **Mobile:** identical popover, full-width sheet anchored to the swatch; tap-outside dismiss.
- **Fits best:** Favients swatches (dense grid — a transient popover doesn't reflow the grid), Picker.
- **PRO:** smallest build — literally the existing `SendToMenu` shell + 3 extra items; zero layout reflow.
- **CON:** actions are hidden until click; a second click/dismiss step before acting (one extra tap on mobile).

---

### Option 2 — **Docked action bar on the hero** (contextual toolbar)

Selecting reveals a slim action **bar docked to the hero** (inline, below or beside the strip) with the
actions as buttons — always in place once selected, no floating layer. "Send to ▾" is still a popover off
its own button.

```
 ┌─ Sunset Vivid · Picker · cb-warm ──────────────┐  ★
 │▓▓▓▒▒▒░░░██████  ◀ selected (cyan ring)          │
 ├─────────────────────────────────────────────────┤
 │ [Apply] [Send to ▾] [Rename] [⛶ Fullscreen]      │  ← docked bar (reveals on select)
 └─────────────────────────────────────────────────┘
```

- **Actions:** same set as buttons; ★ on the header row.
- **Selection:** cyan ring + the bar's presence is itself the "selected" signal.
- **Desktop:** bar animates in below the strip; persists while selected (act without re-opening anything).
- **Mobile:** bar wraps / becomes a 2-row button grid; large tap targets, no floating layer to mis-dismiss.
- **Fits best:** Generator / Image / Stops result heroes (roomy, single result, the bar has space). Less
  ideal for the dense Favients grid (reflows neighbours).
- **PRO:** all actions visible at a glance once selected; direct (one tap = act); mobile-friendly big targets.
- **CON:** consumes vertical space and reflows layout on select; awkward in the dense Favients grid.

---

### Option 3 — **Expand-to-detail panel** (hero grows into a detail card)

Selecting expands the hero into a taller detail card: enlarged preview + name (editable in place) + the
full action row + metadata (stops count, source, facet chips). One "focused" gradient at a time.

```
 idle:   ┌─ Sunset Vivid ───────────┐ ★
         │▓▓▒▒░░██████              │
         └───────────────────────────┘
 selected (expands):
   ┌───────────────────────────────────────────┐
   │  ▓▓▓▒▒▒░░░░██████████  (enlarged preview)   │
   │  [ Sunset Vivid        ]✎   ★   12 stops    │  ← inline-editable name
   │  Picker · cb-warm                           │
   │  [Apply] [Send to ▾] [Fullscreen]           │
   └───────────────────────────────────────────┘
```

- **Actions:** Apply · Send to ▾ · Fullscreen; **Rename is inline** (name field always editable when
  expanded — no separate Rename action).
- **Selection:** the expansion itself + cyan ring; only one card expanded per mode.
- **Desktop:** smooth height/scale expand (reuse `GradientHoverPreview` paint for the enlarged ramp).
- **Mobile:** expands to a near-full-width card; natural on touch.
- **Fits best:** Generator / Image / Stops (where the result deserves prominence). Heavy for Favients grid.
- **PRO:** richest, most "designed" feel; rename is frictionless inline; doubles as the enlarged preview
  (could retire the separate ⬍ enlarge toggle on Generator).
- **CON:** biggest build + biggest layout movement; overkill for Picker/Favients where you scan many quickly;
  expansion animation is the main polish risk.

---

### Recommendation

**Hybrid, defaulting to Option 1:** ship the **inline popover (Option 1)** as the universal baseline —
it's the cheapest, reuses the `SendToMenu` shell almost verbatim, and works in every surface including the
dense Favients grid. Then, for the **roomy single-result heroes (Generator / Image / Stops)**, allow the
hero to render the same actions as a **docked bar (Option 2)** via a `layout: 'popover' | 'bar'` prop — same
action set, same handlers, just a presentation switch. Hold **Option 3** as a future enhancement for the
Generator/Image "focus" view (it can grow out of the bar later). This keeps one component, one action set,
one selection treatment, while letting dense vs roomy surfaces pick the fitting presentation.

---

## 4. Open design questions (for the user)

- **A. Exact action set.** Confirm **Apply · Send to ▾ · Rename · Fullscreen · ★**. Anything to add
  (Duplicate, Copy CSS/stops, Delete-on-Favients) or drop? Should ★ ever live inside the popover instead of
  as a sibling?
- **B. Rename affordance.** Popover "Rename…" (Option 1/2) vs always-inline-editable name (Option 3)? And on
  Favients: keep the list double-click inline-rename as a fast path **and** add the popover rename, or
  replace it? (Picker has no rename — confirm.)
- **C. Does Stops stay minimal?** Scope §122 proposes **preview + rename + ★ + fullscreen, no primary Apply**
  (it's always live-editing). Confirm — or do you want a "commit/snapshot to favourite" pseudo-apply there?
- **D. Selection visual.** Single treatment across all five surfaces: the cyan ring (#22d3ee, 2px, the
  existing `PickerWall` template) reused everywhere? Or a softer fill/elevation for heroes vs the crisp ring
  for wall swatches? (Constraint: it must read on a canvas strip AND a small grid swatch.)
- **E. Mobile behaviour.** Popover-as-sheet (Option 1) vs wrapped button-grid bar (Option 2) on small
  screens? Tap-outside-to-dismiss vs an explicit close? (Drag is P2-D / fast-follow — Send-to is the
  mobile-complete apply path.)
- **F. Layout switch.** Accept the recommended `layout: 'popover' | 'bar'` prop (one component, two
  presentations), or force a single presentation everywhere for strict consistency?
- **G. Hero name source.** `name = payload.name ?? stage label`, `source` always a chip, rename always
  available where applicable — confirm (scope §10).

---

## 5. What stays frozen

- **(c) `SendTarget<P>`** consumed as-is: `{id, label, group, accepts?, apply(payload)}`. The hero only
  *reads* `targetsForPayload` and *calls* `apply(payload)`. The `getRect?` additive amendment is **P2-C/P2-D's**
  concern (drag droppability), **not P2-A** — no new field needed for the Send-to/click path. **No option
  above requires any (c) change.**
- **(b) drop-well kernel** — untouched by P2-A (scope narrows to OS-file/cross-app in P2-D).
- **(e) gradient core** (`sampleStops`/`renderStopsToRamp`/`fitRampToStops`) and **(f) colour core** —
  untouched; the hero renders via `GradientStrip` which already calls these.
- **`FavientDragPayload` `{config, name, source?, favId?}`** — immutable; the hero's action payload uses this
  exact shape (no wider envelope in P2).
- **`GradientStrip` / `FavStar` / `GradientHoverPreview` / `SendToMenu` / `AnchoredMenu`** — embedded
  unchanged; the hero adds no callbacks beyond their existing mutation hooks.
- **Transient-store rule** — `heroState` follows `pickerSearch`/`fullscreenStore` (module-level,
  `useSyncExternalStore`, no DDFS/persist/undo).

**Flag:** none of the three options needs a new interface. If the user wants **Send-to to also work as a
drag from the popover** (drag an item out of the menu), that pulls in P2-D's `getRect?` — out of P2-A scope;
note it and defer.
