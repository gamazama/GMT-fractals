# GMT Gradient Explorer — Amendment Plan (features & gaps)

**Status:** planning only — no code. Drafted 2026-06-05 from a 5-agent grounded research
pass + a focused AdvancedGradientEditor code-health audit.
**Scope:** round out the Gradient Explorer so multiple authoring workflows flow intuitively.
**Design philosophy (applies to every item):** minimal, hidden-yet-discoverable, robust.

## Invariants every workstream must respect
- **One ramp.** Everything converges on a single 256-step ramp; `fitRampToStops` is the
  *only* ramp→stops path. No workstream introduces a second one.
- **Deterministic core.** `palette/core/` stays pure (seeded mulberry32 only, no DOM). New
  parsers/helpers that live in core obey this; blob/anchor/File I/O stays in the UI layer.
- **State on the right side.** Scalar/vec dials → DDFS params (free undo/keyframes/presets).
  Non-scalar document state → local Zustand bridged into undo via a history provider.
  Transient UI (drag flags, search text, selection, view-mode) → local component/Zustand,
  never DDFS.
- **Shell installs no viewport/camera/raymarch.** It's a palette tool on gmt-engine.

---

## Locked decisions (2026-06-05)

These six (from the post-polish decision walkthrough) constrain the workstreams below.

1. **Document persistence (W8).** Build the document-provider registry. Document set =
   **generator + image + stops + favients**. Favients is special: on scene **load, prompt the user
   to Replace or Append** favourites — never silently clobber the global library. (The merge prompt
   is the only new UI the registry needs.)
2. **Gradient portability (W2+W4 → one system).** **Full unification.** One model: *every gradient
   is a draggable object; "Send to ▾" is its click/keyboard twin; wells + Favients are
   always-available drop targets.* Drag and Send-to enumerate the **same target list**. One
   **canonical result hero** across all four modes + **per-swatch** Send-to on the shelf; export
   reachable from the result.
3. **Generator curves (W3 merges with Generator coherence).** `detail`/`smooth` become
   **non-destructive, ghost-previewed fit controls; bake-to-commit.** The ghost curve shows what a
   re-fit from source *would* produce, under the editable bezier — nothing overwrites hand edits
   live; track replacement happens only on explicit **bake**. (So the ghost's primary job is
   "preview the prospective fit before bake," atop the base/final channel raster.)
4. **Picker pick (W6).** Standalone: **remove the no-op `applyEntryToColoring`**; Send-to ▾ is the
   destination. app-gmt: pick-is-apply but **bracketed** (one undo txn each) + **reveal the
   target gradient/layer** — **OUT OF SCOPE here** (see scope boundary).
5. **Animation/timeline (W9).** **Keep** the timeline as a **keying + state-comparison tool** (key
   states/combinations, scrub to compare). Export/Send-to **snapshot the current frame** with an
   "(animated — current frame)" cue. No dedicated animated-export path for now.
6. **FavStar identity (T4).** A favourite is a **saved-item with a stable id**; the star shows
   "saved" stably while tuning; saving an edit offers **Update vs Save-as-new-variant**. Kills
   accidental shelf churn; keeps intentional variants.
7. **Engine-core promotions (layering).** Three things are **engine capabilities**, not palette
   domain: **W8 document-provider registry** (parallels `registerHistoryProvider` + plugs into the
   SceneIO engine plugin — every app needs it); **W10 colour picker + harmony + eyedropper**
   (already engine-shared via `EmbeddedColorPicker`/`AutoFeaturePanel`/`colorUtils`); and the
   **W1 Stops editor stays in engine `components/` — genericized IN PLACE, NOT relocated to
   `palette/`** (engine's `AutoFeaturePanel` consumes it, so moving it down would invert the
   palette→engine dependency). The `palette/` Stops mode *mounts* the engine component. As a
   consequence the editor's pure deps (`sampleStops`/`stopOps`/sampler/colour math) are engine-core
   too, which collapses the `palette/core/gmtGradient.ts` byte-exact mirror into a re-export.
8. **W4 drag/drop-wells mechanism → engine-core (generic).** The *kernel* is generic enough for
   future reuse by other apps: a **drag-payload contract + a drop-target/well registry + the
   while-dragging overlay** live in **engine**. `palette/` registers the *gradient* payload and the
   gradient-specific wells (export-bin / PNG / fullscreen) + targets into that engine framework.
   (Pairs with W2's target registry — the generic registry is engine; gradient targets are palette.)

## Scope boundary + post-execution research proposals

**In scope:** the standalone Gradient Explorer shell + the host-agnostic `palette/` suite. Changes
to shared `palette/` modules (which app-gmt inherits when it mounts the suite) count as in-scope.

**Out of scope (park as post-execution research proposals):** app-gmt's own host code/wiring —
- app-gmt Picker pick semantics (bracketed apply + reveal target layer/gradient).
- Drag-and-drop of gradients **into app-gmt's coloring layers**.
- (Add app-gmt-side aspects of the wells / cross-tab coherence here as they surface.)

---

## Workstream 1 — "Stops" Editor mode (promote AdvancedGradientEditor) — **scope M**

### Current state
`components/AdvancedGradientEditor.tsx` (877 lines) is GMT's direct stop-bar editor,
reachable today *only* via `AutoFeaturePanel` for `gradient`-type DDFS params (its sole host
coupling). It is **not** in `palette/`, so the Gradient Explorer — the tool built to author
gradients — has no direct-stop mode (only Picker / Generator / Image). It already takes
`value/onChange` and always emits a rich `GradientConfig` (`{stops, colorSpace, blendSpace}`),
i.e. it is already a controlled editor.

**Full capability inventory** (preserve all of this when porting): add knot (click-drag empty
track), move (drag/arrow-nudge/shift-snap), remove (drag-off ≥50px / Delete / context-menu),
ctrl-drag duplicate, marquee multi-select, selection bracket (move + signed scale w/ inversion),
per-stop bias handle + slider, per-stop interpolation (linear/step/smooth; `cubic` in type but
not in dropdown), embedded colour pick, inspector (interpolation/position/bias, Mixed for
heterogeneous selection), blendSpace cycle (rgb→hsv→hsv-far→oklab), colorSpace cycle
(srgb→linear→aces_inverse), context menu (invert / double / distribute / delete / bias-handle
toggle / reset), copy-paste JSON, Favients entrance.

### Gap
No 4th mode tab, no DDFS feature, no panel-manifest entry; direct-stop authoring is invisible
in the palette tool. Living outside `palette/` advertises it as app-gmt-only and invites a
parallel fork.

### Approach — **genericize IN PLACE in engine `components/`** (CORRECTED: NOT relocate to palette/, NOT wrapper, NOT duplicate)
The Stops editor **stays in engine `components/`** because engine's `AutoFeaturePanel` consumes it
(lazy-imports it for every `gradient` DDFS param); relocating to `palette/` would invert the
palette→engine dependency. Sever the app-gmt couplings *in place* (same de-dup outcome as
`ChannelGraphEditor`, correct layering). The `palette/` Stops mode is a thin `EditorStage` that
**mounts** the engine component + adds a `paletteEditor` DDFS feature (`tabConfig {label:'Stops'}`)
+ a `Stage`/`MOBILE_MODES` branch. The editor's value **is** the gradient; the only seam work is
outward: render the config to a 256-ramp for the strip preview and sends; `fitRampToStops` only on
*inbound* bare ramps (reusing `entryToGradientConfig`).

**Layering consequence:** the editor's pure deps must also be **engine-core** — `sampleStops`,
`stopOps`, and the stops→ramp sampler/colour math live in engine, NOT `palette/core`. **Bonus
cleanup:** this lets `palette/core/gmtGradient.ts` (today a hand-maintained *byte-exact mirror* of
GMT's sampler) **re-export the engine canonical instead of duplicating it** — collapsing a known
duplication. Confirm the engine sampler stays pure (no DOM) so `palette/core`'s determinism
contract still holds.

**Code-health verdict (from the audit): PARTIAL-REWRITE, not god-component.** ~60% view/
host-plumbing, ~25% interaction geometry, ~15% pure logic. Keep the valuable 1-D stop drag
model and the DOM/SVG handles — do **not** force it through GraphCanvas (stops are 1-D; the
graph primitives assume a 2-D frame/value plot and would be more work + worse fit). But:
- **Delete the duplicated/drifted colour math.** Its `getInterpolatedColor` (`:51-69`)
  re-implements `renderStopsToRamp`'s sampler *without* bias/smooth easing → a **latent bug**
  (a newly-inserted knot can pick a colour that doesn't match the baked ramp). Replace with an
  **engine** `sampleStops()` bound to the canonical sampler; drop the duplicate hex/blend copies in
  favour of the engine colour utils.
- **Extract pure stop-ops** into an **engine** stop-ops module (invert/double/distribute/delete/
  default/normalize-paste + drag math: move, signed-scale-about-pivot, set-bias) — currently
  inline lambdas; testable + deterministic.
- **Memoise two per-frame hot paths:** full re-emit on every mousemove (`emitChange` rebuilds
  two arrays + round-trips the store each tick) and the unmemoised CSS-gradient string rebuild.
- **Sever ~12 host couplings behind optional props** (the same two-call undo bracket
  everywhere; Favients/help/render-pause are leaf concerns), using the `ChannelGraphEditor`
  template. The only *direct* store read is the cosmetic `hasFavients` check.

### LOCKED DECISIONS (user, 2026-06-05)
1. **Undo seam:** one shared injected callback contract (`onEditStart`/`onEditEnd` + per-action
   `edit`) that *both* hosts implement — no host-specific undo path in the shared view.
2. **Preview:** exact **256-ramp `<canvas>`** strip (mirrors `ChannelGraphEditor`), not the
   approximate CSS-gradient string — minor look change accepted for correctness.
3. **Bug-fix accepted:** new-knot colour binds to the bias/smooth-aware core sampler; knots on
   biased/smooth segments now pick the corrected (changed) colour.

### Where state lives
Edited `GradientConfig` → new `paletteEditorStore` (non-scalar Zustand), bridged into undo via
`registerHistoryProvider('paletteEditor', …)` like the generator. In app-gmt the editor stays
controlled by its DDFS gradient param (rides undo/keyframes for free). All selection/marquee/
expand/preset-menu state stays transient local. Keep the `justEmittedRef` echo-suppression guard
intact — it's load-bearing.

### Risks
Echo-suppression loop must survive the re-host (else "Maximum update depth"); keep polymorphic
legacy-array input for app-gmt back-compat; `colorSpace=linear` forcing on coloring sends must
go through `applyGradientConfig`, not leak the editor's authoring colorSpace; mobile tab bar
grows to 5 (Picker/Generator/Image/Stops/Favients) — check fit.

### Open decisions
Tab label "Stops" vs "Editor"; does the mode get any DDFS dials or is it a near-param-less canvas
mode like Picker; does Stops state belong in the studio save/session snapshot; replace
`hasFavients` via prop vs the `favientTargets` seam.

---

## Workstream 2 — Mode interoperability (one "Send to" registry) — **scope M**

### Current state
Cross-mode edges are asymmetric and partly Favients-only: Picker pick → `applyEntryToColoring`
only; Image → Generator A/B via explicit buttons (`sendRampToSlot`); Generator → only FavStar;
Favients → any registered target via the host-agnostic `favientTargets.ts`
(`registerFavientTarget({id,label,apply})`). The canonical `ramp→slot` path
(`generatorStore.sendRampToSlot` = `registerCustomRamp` + set slot) and a channel-faithful path
(`registerCustomChannels`) already exist.

### Gap
No Picker→Generator-slot direct edge, no Image→Picker custom entry, no Generator→Image trace
seed, and every mode hand-rolls its own send affordance. `favientTargets` expresses *host*
targets (coloring/slots), not intra-app *mode* targets, so it can't say "Picker → Generator
slot A" as a first-class target.

### Approach — **generalize `favientTargets` into ONE gradient-target registry** (don't fork)
Add an optional `kind`/`group` ('mode' vs 'host') + `accepts` hint to `FavientTarget`, so mode
destinations (Generator Slot A/B, Stops "edit", Image trace-seed) register alongside host
destinations. Build ONE shared **"Send to ▾"** hero affordance (a sibling/extension of FavStar)
that every mode's result header mounts and that reads the registry — the Favients "Applying to ▾"
dropdown *becomes the same component*, so the pattern is learned once. Every `apply()` funnels a
`GradientConfig` (the single seam output) into the existing canonical paths. Picker pick keeps
colouring the fractal but *also* exposes the dropdown. Collapse to a single star+caret on the
hero (hidden-yet-discoverable).

### Where state lives
Registry stays module-level (side-effect registration, not user state). Per-hero "current send
target" = transient local. Mode-target registration happens in the host's `registerFeatures.ts`
(same place gen-a/gen-b register). No new DDFS params.

### Risks / open decisions
Must filter self-targets (don't offer "Generator → Generator slot" on the Generator hero) and
group host vs mode visually or the dropdown gets long; every `apply()` must reuse the
`fitRampToStops` seam (no re-derivation). Decide: is Image→Picker entry ephemeral
(`registerCustomRamp`, session) or persisted; does Picker keep its fractal-colour side-effect in
the standalone shell.

---

## Workstream 3 — Ghosted/raster curve representation — **scope M** (pairs with W2)

### Current state
`generatorPipeline.buildGradientRamp` already returns `{ramp, base, final}` — `base` = post-mix
pre-curve channels; `final` = post-global un-clipped OKLCh per output texel. `ChannelGraphEditor`
edits 3 bezier Tracks and already renders a sibling result strip using the same view transform.
`GraphCanvas` = two stacked `<canvas>` in a relative wrapper owned by the editor.

### Gap
The editor shows only the editable bezier + a thin strip; it does **not** overlay the *actual*
resulting per-channel ramp underneath, so "did my fit/smooth lose detail?" is invisible — even
though the data (`base`/`final`) already exists.

### Approach — **third `<canvas>` behind the bezier, no GraphCanvas fork**
Add a third canvas as the first (z-behind) child of the editor's interaction div, positioned to
the same plot rect, drawn with the editor's existing transform (`frameToCanvasPixel` x,
`v2p(value,channel)` y, honouring `normalized` + `trackRanges`). Paint faint per-channel
polylines from `base`/`final` at low alpha so the user sees the real ramp ghosted behind their
curve. `useEffect` keyed on the same deps as the existing strip effect. A toggle (default on when
`curvesOn`) keeps it minimal.

### Where state lives
Ghost-visible toggle = transient local UI flag (like `normalized`/`visible`), not a DDFS param.
Ghost source data is derived from `BuildResult` each render — nothing persisted, no core change.

### Risks / open decisions
`trackRanges` is derived from *keyframe* min/max, not raw channel min/max — a raw-channel ghost
can fall outside the normalized band and needs range reconciliation; hue must be unwrapped to
match the track. **Decision:** ghost `base` ("how faithful is my fit") vs `final` ("what am I
producing") vs both-as-toggle; default-on vs opt-in. Label clearly (ghost = result, curve =
source) so divergence under active global dials doesn't read as a bug.

---

## Workstream 4 — Global gradient drag-and-drop (wells) — **scope M**

### Current state
DnD is favients-only: MIME `application/x-gmt-favient` (+ internal reorder marker) carrying
`{config, name, source?, favId?}`. Drag sources: Picker entries + Favients swatches only. All
drop targets live *inside* FavientsPanel (reorder zones + a trash well that appears only while
dragging). Per-gradient PNG export is duplicated inline in Generator/Image extras panels. No
fullscreen preview. **Collision:** `ImageStage` installs a window-level dragover/drop listener
that preventDefaults every drag to import image files.

### Gap
Generator/Image results aren't draggable; the only drop targets are in Favients; no export-bin,
no drag-to-PNG, no fullscreen. Payload has no provenance `kind`. No always-available wells.

### Approach — **widen the existing contract, add shell-level wells**
Keep the literal MIME (cross-app back-compat), extend the payload with optional
`kind: 'picker'|'generator'|'image'|'favient'`. Make every result strip a drag source
(`setFavientDrag` with its existing config+name+source). Add ONE shell overlay
(`GradientDropWells`) mounted once in `GradientExplorerApp` beside `DropZones`, rendering three
wells that fade in *only while a gmt-gradient drag is in flight*: **Export bin** (→ selected
format download), **PNG** (→ shared PNG routine), **Fullscreen** (→ Esc-dismissable overlay).
Each well derives the 256-ramp from `payload.config` at drop time (dataTransfer JSON stays
light; still one config→ramp path). **First de-duplicate the two `doPng` copies + export logic
into a shared core helper** (pure up to the blob/anchor step). Coexistence: wells gate on the
gmt-gradient MIME; Favients reorder additionally gates on the internal marker; **`ImageStage`'s
window listener must early-return when the gmt-gradient MIME is present** so real file imports
still work.

### Where state lives
"A gradient is being dragged" flag, hovered-well, fullscreen-open/which-ramp = transient local
(shell-scoped). Export format = reuse existing `generatorStore.exportFmt` / active mode format.
No DDFS, no undo, no persist. New PNG/export-bytes helper is pure core; blob/File stays in UI.

### Risks / open decisions
The ImageStage window listener is the single largest correctness risk (must yield to gmt-gradient
drags). `getData` is blocked during dragover → wells key off `types` (MIME presence) until drop.
Don't re-render a result strip away mid-dragstart. **Decisions:** export bin uses each mode's
format vs hosts its own chooser (Picker/Favient drags have no Extras panel); three wells vs one
combined; Explorer-only vs also app-gmt; true Fullscreen API vs overlay (overlay simpler);
touch/mobile in scope or desktop-only with buttons as the mobile path.

---

## Workstream 5 — Favients: undo + list view + search — **scope M**

### Current state — CONFIRMED
**Favient mutations are NOT undoable.** The only history provider is `paletteGenerator`; there
is **no** favients provider, and FavientsPanel calls `remove/moveFavient/insertFavient/
renameGroup`/Clear raw with no transaction bracket. The undo machinery itself is live in both
hosts — favients simply never opted in. The shelf is a swatch grid only (no name text, no list
rows, no search). Data persists to shared same-origin `gmt.favients*`; panel chrome persists
per-host via `favientsPanelPersist`.

### Gap
No Ctrl+Z for any favient op (a mis-drag reorder, accidental remove, the kebab "Clear" that even
warns "cannot be undone", import-replace — all silently irreversible). Swatch-only = an
unlabelled colour wall at small sizes; no way to scan by name/source/group. No find/filter.

### Approach
**Undo (load-bearing):** add ONE history provider mirroring the generator —
`captureFavientsHistory = () => ({favients, groupLabels})` /
`restoreFavientsHistory` (must write through to localStorage or undo diverges from disk on
reload); register `registerHistoryProvider('favients', …)`; add a `favEditStart/favEditEnd` pair
and bracket each mutation **at the panel gesture boundary** (not inside store mutators — the store
has no gesture notion). `endParamTransaction` no-ops on empty diff, so wrapping is safe; rename
coalesces via focus/blur bracketing. **Exclude `selectedTargetId`** from the snapshot. Leave
`seedPresets` (boot) out.
**List view:** a grid|list toggle in the panel header; list rows = short ramp strip + the
(currently hidden) name + muted source/group caption. Rows keep `data-slot` so the existing
`insertIndexFromPointer` drag logic works unchanged in a single column.
**Search:** a collapsible filter input in the header; transient `useState` query matching
name+source+group (case-insensitive). Feed the filtered list into `buildBlocks`. **Robustness
rule:** disable drag-reorder while a filter is active (reorder index math is against the full
array — a filtered view would corrupt order); show a "clear filter to reorder" hint.

### Where state lives
Collection data stays in favientsStore (shared localStorage), now bridged into undo. View-mode
pref → per-host in `favientsPanelPersist` (extend `Stored` with `viewMode`, backward-compatible
default 'grid') so Explorer ≠ app-gmt. Search query → transient local useState only. Neither is a
DDFS param.

### Risks / open decisions
Wrong bracket placement = silent no-undo (today's bug); restore must persist; search+reorder
collision must disable reorder. Shared `gmt.favients` means undo is single-tab (pre-existing —
doc note, don't solve cross-tab here). **Decisions:** are Clear/import-replace undoable (large
snapshots) or stay confirm-gated; default view mode (grid both, or list for the docked Explorer
shelf); header room at 296px (search likely a toggle-expand icon).

---

## Workstream 6 — Picker text/name search — **scope S**

### Current state
No free-text search over the ~11k catalog. The visible set is one `useMemo` in `PickerStage`
(lines 131-192): `catalog.filter` with four ANDed predicates (hiddenBundles, activeThemes,
keptIds carve, quality windows) → sort (already supports `name`) → group/rows/bands. `name` is
sortable but not filterable.

### Gap
No way to type "ocean"/"viridis"/"softology" to narrow by name/theme/source.

### Approach
Add ONE case-insensitive token-AND predicate over name + theme + bundle *label* (not id; exclude
synthetic `preset-N`/`adhoc-N`), inserted into the **same** `catalog.filter` ahead of
`passesFilters`, with the query folded into the existing memo key. Composes orthogonally with the
other ANDed filters; surviving set flows through the identical pipeline; the count readout
reflects it for free. **Discoverability:** a small search icon in the PickerStage hero header
(next to the count it affects) that expands to one inline input. Empty-results branch gains a
"clear search" affordance. Optionally mirror into `MobilePickerControls`.

### Where state lives
Transient local `useState` in PickerStage — not DDFS, not persisted (follows the deliberate
keptIds/quality-window pattern where only layout prefs persist, so reloads never silently hide
gradients).

### Risks / open decisions
Match bundle label not id; empty wall when stacked on a carve (needs clear-search); mobile parity
needs explicit surfacing. **Decisions:** substring vs fuzzy/token-AND; name-only vs
name+theme+bundle (recommended); mobile now or desktop-first; collapsed-icon active-query badge;
clear-on-tab-switch vs persist-for-session.

---

## Workstream 7 — Gradient file IMPORT (close the one-way export) — **scope S–M**
*(lower confidence — the dedicated agent was cut mid-run; scoped from the export registry + the
DnD agent's file-drop findings. Worth a focused pass before building.)*

### Current state
`exportFormats.ts` is build-only — 15 formats out (`.map .hex .css .svg .json .js .py .csv .gpl
.ggr .cpt .pdn .grd .ai .idml`), zero parse-in. The Image tool extracts from *images*; the
Picker browses a *baked* catalog. `registerCustomRamp` / `sendRampToSlot` already append ad-hoc
ramp-only entries (deduped by content signature). `ImageStage` already owns a window file-drop
listener (for images).

### Gap
You can write a GIMP/Photoshop/Fractint gradient but can't load one back — a round-trip
asymmetry. No "open my gradient file" path anywhere.

### Approach
Add pure parsers in a new `palette/core/importFormats.ts` (deterministic, no DOM; the `File`
read happens in the component). Prioritise round-tripping the **text** formats we already export:
`.map`, `.gpl`, `.ggr`, `.cpt`, `.css`, `.json` (easy); `.grd` (binary 8BGR) is harder — defer.
Each parser → 256-ramp → `registerCustomRamp` (lands as a custom catalog entry, exactly like
Image output). **UI:** coordinate with W4 — a file drop on the new shell wells (or a small
"Import" affordance) routes gradient files here while image files still go to ImageStage. Keep
the single ramp seam.

### Where state lives
Parsers pure in core; imported ramp becomes a custom catalog entry (session) or optionally a
Favient (persisted). No DDFS. Decide ephemeral vs persisted on import.

### Risks / open decisions
File-drop routing must disambiguate gradient files vs image files vs internal gmt-gradient drags
(ties into the W4 ImageStage-listener fix). `.ggr` midpoint/segment + `.grd` binary parsing are
the fiddly bits. **Decision:** which formats first; does an imported gradient persist or stay
session-only; is there a standalone Import button or is drag-a-file the only inbound path.

---

## Workstream 10 — Colour picker upgrade (rich HSB+RGB + harmonies) — **scope M**

### Current state
`components/EmbeddedColorPicker.tsx` (234 lines, engine-shared) is the picker mounted by the
Stops editor (`AdvancedGradientEditor`) and by every gradient/colour DDFS param via
`AutoFeaturePanel`. `utils/colorUtils.ts` already has `rgbToHsv`/`hsvToRgb` (HSB), `hexToRgb`/
`rgbToHex`, and lerp helpers — but **no HSL, no colour-harmony generation, no eyedropper, no
recents/palette rows**.

### Gap (the requested picker, per the reference screenshot)
The current picker is basic. Target a full picker: a **2D saturation/brightness field + hue
strip**, **RGB sliders**, **HSB sliders** (Hue/Saturation/Brightness), **Alpha**, **hex input +
copy + eyedropper**, and a harmony/swatch column: **Analogous / Monochromatic / Complementary /
Split-Complementary / Recents / Palette**.

### Approach
Upgrade the shared `EmbeddedColorPicker` in place (so the Stops editor *and* all colour params
gain it at once). Add pure, deterministic colour math to `colorUtils.ts` (or a new
`core` colour-harmony module): RGB↔HSL (HSB already exists), and harmony generators
(`analogous(base, n)`, `monochromatic`, `complementary`, `splitComplementary`) computed by hue
rotation in HSL/HSB. The 2D field + hue strip are canvas-painted; sliders are the existing
`ScalarInput` style. **Eyedropper** via the browser `EyeDropper` API with a graceful "unsupported"
fallback (it's not in the codebase yet). Keep all colour math pure so it's testable and the picker
stays a thin view.

### Where state lives
The picker is a **controlled** component (`value`/`onChange`) — the colour it edits belongs to its
host (a stop's colour in the Stops editor, a DDFS colour param elsewhere); no new document state.
**Recents** = a small persisted local list (localStorage, capped). The **Palette** row = decision
below (fixed default set vs derived from Favients / the current gradient's stops) — if derived,
it's read-only from existing state, not new state. Harmony swatches are derived, not stored.
No DDFS params added; nothing enters undo beyond the host's existing colour-edit transaction.

### Risks / open decisions
Colour model **DECIDED (user): RGB + HSB** (matches the screenshot's 2D field + sliders; no HSL).
Still open: what feeds the **Palette** row (fixed swatches vs Favients-derived vs
current-stops-derived); recents cap + persistence key (shared vs per-host);
`EyeDropper` API is Chromium-only — fallback must be clean; the picker is engine-shared, so the
upgrade lands in app-gmt too (acceptable — it's a strict improvement, not host-specific).

## Workstream 11 — Fullscreen preview configurations — **scope M** (extends W4 fullscreen well)

### Current state
The W4 fullscreen well (Decision 2 portability system) opens a gradient at full size, but as a
single **linear** strip only. No alternate geometries.

### Gap
A gradient reads very differently as a ring, a sweep, an S-curve, or a stochastic point field —
the fullscreen preview should let the user *see* those, since that's where the gradient will
actually be used (fractal coloring, radial maps, etc.).

### Approach
Make the fullscreen overlay a **configuration gallery** over the same 256-ramp: a small mode
selector cycling **Linear / Radial / Conic (angular sweep) / Arched (arc band) / S-curve (position
remapped through an ease) / Randomized-point interpolation** (a stochastic dithered point field
coloured by the gradient), plus room for more (Diamond, Mirror/Reflected, Bands/Posterized). Each
config is a **pure mapping function** that samples the existing 256-ramp through a geometry and
renders to a canvas in the overlay — **no change to the gradient data**, display-only. The
**randomized** config uses **seeded mulberry32** (per the determinism contract) so the same
gradient renders the same point field every time.

### Where state lives
The selected fullscreen config (+ optional last-used) = **transient local** (shell-scoped UI
state, like the rest of the well/preview state from W4). Mapping functions are pure
(`core`-eligible, deterministic). Not a DDFS param; not persisted document state.

### Risks / open decisions
**DECIDED (user):** configs ARE **exportable** — a chosen config renders to PNG via the W4
export/PNG wells (so the wells emit the *active geometry*, not just a linear strip). The
randomized-point config gets a **re-roll button + an "amount" slider** (randomization strength),
seeded with mulberry32 so any given roll is reproducible.
Still open: which configs ship first vs "useful others"; cap the point-field count for perf at
full resolution.

## Workstream 12 — ColorBox-in-OKLCh generator mode — **scope M** (v1 addition, 2026-06-06)
*(from [gradient-v1-additions-scope.md](gradient-v1-additions-scope.md) — competitive-research pass)*

### What
A second generator mode that builds a ramp by sweeping each **OKLCh** channel (L, C, h) independently
from start→end, each driven by its **own easing curve** (Lyft's ColorBox, but in OKLCh not HSV →
perceptually better, dovetails with our per-channel thinking).

### Current state / gap
No generator-mode concept exists — `generatorPipeline.ts` is one hardwired `buildGradientRamp`. **No
easing library exists** (only a stray `engine/math/Easing.ts::easeInOutQuad`).

### Approach (additive, low blast radius)
1. NEW `palette/core/easings.ts` — ~25 named curves (in/out/inout × quad/cubic/sine/expo/quint/circ/
   back + linear), `EasingName` union + `getEasing(name)`. Pure, unit-testable.
2. NEW `buildColorBoxRamp(params: ColorBoxParams): BuildResult` (parallel builder, NOT a branch inside
   buildGradientRamp) — per-channel `{start,end,easing}`, recompose OKLCh→Lab→**`oklabToRgbSafe`**
   (gamut-safe, so high-chroma sweeps don't hue-shift on clamp). Same `BuildResult` shape → stopFit /
   bake unchanged.
3. Add `generatorMode: 'mixed' | 'colorbox'` to the generator slice; build call-site branches.
4. Register mode + ColorBox params as DDFS params (`paletteGenerator.ts`); `GeneratorStage` shows the
   ColorBox controls when active.

### Where state lives
`generatorMode` + the `ColorBoxParams` (scalar `start/end` + `easing` enum per channel) = **DDFS
params** (free undo/keyframes/presets). easings.ts is pure core (deterministic). No new non-scalar state.

### Open decisions (pending user)
Hue-path default (shortest only vs expose a per-channel "long way round" toggle — reuse the HSV-far
convention). Leonardo contrast-target export as a *third* mode now vs defer (research marked optional).

## Workstream 13 — Richer per-segment interpolation bases — **scope S (Tier A) / M (Tier B)** (v1 addition)
*(from [gradient-v1-additions-scope.md](gradient-v1-additions-scope.md))*

### What
Extend `GradientStop.interpolation` beyond `linear|step|smooth|cubic` with **monotone-cubic** (Tier A,
no-overshoot → gamut-safe) and optionally **Catmull-Rom / B-spline** (Tier B).

### Current state / gap
`utils/colorUtils.ts::sampleSorted` (the canonical, byte-exact-with-the-engine-bake sampler) modulates
`t` per segment and sees only `(s1, s2)`. Overshoot-prone interpolation can push a perceptual ramp out
of gamut — monotone-cubic fixes that.

### Approach — two tiers
- **Tier A (v1): monotone-cubic.** A 2-point scheme → one new branch in `sampleSorted` (operates on `t`
  exactly like the hermite case). Extend the union in `types/graphics.ts`; add to the Stops-editor
  interpolation picker (`AdvancedGradientEditor`); add an `interpolation` field to GMT-native **JSON**
  export (the baked formats are lossy by design — interpolation drops; one-line note in the export UI).
- **Tier B (stretch): Catmull-Rom / B-spline.** Need 4 control points (segment ± neighbours) — refactor
  `sampleSorted`'s segment loop to pass `sorted[i-1…i+2]` and spline on the **colour values** (B1).
  Catmull-Rom can itself overshoot → clamp via the gamut-safe path.

### Risk / gates
The sampler is **hot + shared with the engine texture bake** — keep the `linear` branch first; bake
parity (`generateGradientTextureBuffer` byte-identical) MUST hold; gated by **`test:interlace` +
`test:baseline`** (mandatory). This is an **engine-core** change (touches P0a's sampler) — treat with
P0-level care; and the editor-picker change touches `AdvancedGradientEditor` (S5's mounted editor) →
sequence after S5.

### Where state lives
`interpolation` is already a per-stop field (no new state). New modes round-trip only in GMT-native JSON.

### Open decision (pending user)
**Tier B in v1 or stretch?** (recommend: monotone-cubic in v1; Catmull-Rom/B-spline stretch — it carries
the only sampler refactor.)

## Cross-cutting notes

### Suggested sequencing (dependencies)
1. **W6 Picker search** + **W5 Favients undo** — small, self-contained, high daily value; good
   warm-up that touches the persistence/undo patterns the rest reuse.
2. **W1 Stops mode** — the structural centrepiece; unblocks "edit stops" as a target for W2.
3. **W2 Send-to registry** + **W4 wells** — share the "make every result a source/target"
   refactor and the export/PNG de-dup; do them together to avoid touching the result heroes
   twice.
4. **W3 ghost curves** — independent polish on the Generator; can slot anywhere after W2's hero
   work or standalone.
5. **W7 Import** — after W4 (shares the file-drop routing); re-run a focused research agent first.

### Polish-pass results (DONE — see [gradient-explorer-polish-findings.md](gradient-explorer-polish-findings.md))
The polish-planning pass ran (8 agents, 88 findings). It validated W1–W7 but added **two new
structural workstreams** and **reframed two existing ones as one system**:

- **NEW W8 — Studio document persistence + undo parity (HIGH, correctness hole).** `installSceneIO`
  serialises only DDFS slices; the real authoring (generator curves/slots/seed, image model/trace,
  planned Stops document, favients) lives in non-DDFS stores and is **silently lost on Save→reload**.
  Build a **document-provider registry** feeding *both* SceneIO and the undo stack, covering
  generator/image/stops/favients. This subsumes W5's favients-undo as one instance of a general
  pattern.
- **NEW W9 — Animation/timeline role + snapshot semantics (Ask).** Palette params are keyframeable
  and a timeline is mounted; nobody decided what export/Send-to/wells do with an *animated*
  gradient. Decide the timeline's role; define snapshot semantics.
- **Reframe W2 + W4 as ONE "gradient portability" system.** State one model (*every gradient is a
  draggable object; "Send to ▾" is its click/keyboard twin; wells + Favients are always-available
  drop targets*); drag and Send-to enumerate the **same target list**; one **canonical result-hero**
  layout reused by all four modes (incl. the Picker hero, which has none today, and **per-swatch**
  Send-to on the Favients shelf); export reachable from the result, not dock-only.
- **W1 (Stops) absorbs:** inspector-in-dock (no empty panel), drop the editor's internal Favients/
  clipboard entrances for the shared hero, pass stops **verbatim** when the inbound payload already
  carries a `GradientConfig` (only fit ramp-only sources) + a "re-fit to N stops" cue.
- **Generator coherence (was only adjacent to W3) becomes explicit:** detail/smooth as a
  non-destructive **fit recipe** (dirty-flag, stop silently destroying hand-edited curves);
  make curve-frozen sources genuinely non-interactive; feed the slot picker from the **unified
  catalog** (built-ins + Favients + recent), not just 24 presets.
- **W6 (Picker) absorbs:** remove the studio no-op `applyEntryToColoring` pick (paired with making
  app-gmt pick preview-vs-commit); net-new hero chrome (star+send+export); own the **mobile find**
  story (pinch-zoom + search-primary); unify the four-filter clear near the count.

### Consolidated decisions that need the human
- Stops tab label ("Stops" vs "Editor"); does it carry DDFS dials at all.
- Ghost source: `base` vs `final` vs both.
- Wells: three vs one combined; Explorer-only vs also app-gmt; export-format source.
- Favients: are Clear/import undoable; default view mode.
- Send-to: does Picker keep its fractal-colour side-effect; Image→Picker ephemeral vs persisted.
- Import: formats first; persisted vs session; standalone button vs file-drop only.
