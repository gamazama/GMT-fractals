# Gradient Explorer v2 — design (source of truth)

**Status:** design locked in conversation 2026-09-03; Phase 0 = this doc + two mocks. `plans/ge-v2-mock.html` (mock A) laid every surface out at once and the owner judged it complex and squished; `plans/ge-v2-mock-b.html` (mock B) is the streamlined take, see §6b. Phase 0
**COMPLETE (2026-09-03): the owner approved the mock B layout ("overall quite good, we can work with it"). Mock B is the layout reference; §6b supersedes §6 and §5.5. No app code changed yet; Phase 1 awaits the go.**
**Owner intent:** make the Gradient Explorer a streamlined, standalone app for every colour
enthusiast, not a sub-tool of the fractal studio. Purpose-built UI, plain language, one linear flow,
and a discrete-palette face on every gradient.
**Companions:** `plans/gradient-explorer-amendments-plan.md` (June, what was built),
`plans/gradient-explorer-polish-findings.md` (June, why it felt like a console),
`plans/execution/execution-progress.md` (how the June work was run).

---

## 1. Vocabulary (final words)

| Today | v2 | Notes |
|---|---|---|
| Picker | **Browse** | the wall |
| Generator | **Build** | two recipes: **Blend** (Mixer) and **Sweep** (ColorBox) |
| Image | **Extract** | methods **Dominant** / **Tones** / **Path** (Distill / Tone / Trace) |
| Stops sub-mode | folded into the **Working** hero | the hero IS the stops + palette editor |
| Modify + Noise groups | **Adjust** | belongs to Working, not to Build |
| Curves | **Shape** | first-class, one toggle away on every source |
| Favients | **My Gradients** | one bottom strip; auto-built per session; groups are optional organising |
| Animate / timeline | **Variants** | global snapshots A B C D…, tween between two |
| Fullscreen | **Wallpaper** | custom size to 4K, supersample on CPU modes, Gradient Map over the Extract image |
| Save Scene / Load / Restore | **autosave + Restore**; project file under Advanced | files stop being the primary model |
| Export (three places) | **Export** dialog on the hero, formats grouped by use | same dialog exports a My Gradients group |
| (none) | **Share** | URL carrying the current working gradient only |
| "Back to GMT" | shown only when arrived from GMT | referrer / `?from=gmt` |

Internal ids (`paletteFilters`, `paletteGenerator`, `favients` storage keys, send-target ids) do NOT
rename. Only labels, routes and new code use the v2 words.

## 2. The pipeline (one flow, every source)

    Source  →  Shape  →  Adjust  →  Working  →  Use

- **Sources** (Browse, Build, Extract) each produce ONE gradient: the source's **Candidate**.
- **Working** = pipeline output. Its INPUT is a slot holding one gradient. Shape (the L/C/h curve
  editor) and Adjust (hue, chroma, contrast, posterize, repeats, phase, mirror, reverse, noise)
  apply to whatever is in the input slot. This is the existing generator pipeline with the Mixer
  at mix=0 as a pass-through — `buildGradientRamp` stays the only ramp path.
- **Live vs Baked.** Working is *live* while it follows its input + pipeline. Editing a stop on the
  hero *bakes* the ramp to stops (`fitRampToStops`, ghost-previewed, one undo entry) and detaches
  the input; a "return to live" chip reconnects. (June locked decision, unchanged.)
- **Feeding rules.** Build and Extract feed Working live (their result is the point). Browse does
  NOT — clicking the wall never changes Working — unless **Follow** is on (a link toggle on the
  hero), in which case Working follows the Browse candidate through Shape + Adjust so a whole wall
  can be auditioned through one look.

## 3. Roles and gestures (the movement model)

Four roles a gradient can be in:

| Role | Where | Editable | Persists |
|---|---|---|---|
| **Candidate** | the source's own result spot (Browse strip above the wall; Build result; Extract result) | no | no |
| **Working** | the hero at the top | YES (stops, palette, name) | with the session + in variants |
| **Recent** | the auto zone of My Gradients | no | capped, deduped, across sessions |
| **Kept** | the named groups of My Gradients | rename / regroup | localStorage `gmt.favients` (unchanged key) |

Gestures are IDENTICAL on every gradient surface (wall swatch, candidate, Recent item, Kept item,
Working, a Build slot):

- **Click** = select. The source's candidate spot shows it. Nothing else moves.
- **Use** = push into Working's input slot. Button on the candidate · double-click · Enter.
- **Drag** = to any lit target: Working · a Build slot · My Gradients (a group) · a position on the
  working palette row. The existing reveal-and-place layer (`gradientTargets.ts`, `GradientDropLayer`)
  lights targets and opens the section under the pointer.
- **Star** = keep: adds to the "Starred" group of My Gradients. The only touch path to keep.
- **Colour level:** click a palette swatch → copy hex. Drag a swatch from ANY palette row onto the
  working palette row → adds a stop with that colour.

**Armed targets** (the eyedropper pattern). "Mix with…" on Working moves the working gradient into
Build slot A, ARMS slot B, and switches to Browse; the next click on the wall fills B and Working
shows the blend live. Same mechanism arms slot A, or the palette row ("add colours from…").

## 4. My Gradients (the bottom strip)

- **One strip, bottom edge**, always visible on desktop (~100 px: a row of swatches + group
  labels), expandable to the full panel (search, list view, import/export — today's FavientsPanel
  body, relabelled).
- **Auto-built.** The **Recent** zone fills itself: anything that becomes Working (Use, bake,
  Mix result on leaving Build, an Extract result), anything Exported / Shared / sent to Wallpaper,
  and anything starred. NOT wall clicks (noise). Deduped by content signature. Grouped by day
  ("Today", "Yesterday", date). Capped (~60); oldest unstarred drop off.
- **Organising is optional.** Named groups sit to the right of Recent; drag from Recent (or from
  anywhere) into a group, or "+ New group". "Starred" is a built-in named group. Today's group
  labels, reorder, rename and undo all carry over — the store is the existing favientsStore; the
  Recent zone is a new auto-managed group id.
- **Mobile:** a bottom sheet that peeks one row of swatches above the source tabs and pulls up to
  the full panel.

## 5. Surfaces

### 5.1 Working hero (top, every screen)
- Ramp (~56 px) with **stop handles** beneath — the shared `AdvancedGradientEditor` handle layer;
  its per-stop inspector (colour, position, bias, interpolation) lives in the edit drawer (§6b), not over
  the strip.
- **Palette row** beneath: N swatches with hex, derived by a rule — **Stops** (one per stop),
  **Even N**, **Perceptual N** (equal OKLab arc length). A count control sets N. Grabbing a swatch
  converts it into a real stop (palette is a view until touched, authoring after).
- Chips/toggles: name (editable) · Live/Baked · Follow · **Shape** · **Adjust** · Mix with · ★.
- The palette face is the "global palette mode": every gradient in the app exposes the same row
  (Recent/Kept items on hover, candidates always).

### 5.2 Browse
- The wall styled as a **canvas**: floating tool palette (Hand · Rect · Lasso · Paint), zoom readout
  + Fit, row labels on the left edge, faint ground behind swatches, grab cursor. Carve tools show a
  one-line caption while active ("draw around the ones you like, then keep or cut").
- **One narrowing bar** above the wall, nothing else narrows: Search · hue chips · four look
  sliders (light↔dark, muted↔vivid, simple↔complex, warm↔cool) · source chips (licensed packs load
  on demand as now) · live count + one Clear.
- **More like this** on the candidate: re-sort the wall by ramp distance (16-sample OKLab ΔE) to it.
- **Arrange** popover collapses Group / Rows / Sort / size / padding; closed state reads as a
  sentence ("by category · rows by lightness · sorted by hue").
- Candidate strip sits directly above the bar: big preview + name + source + Use · Mix with · ★ ·
  More like this.
- `PickerStage` is ALSO mounted inside app-gmt's palette overlay → the wall + bar become a
  host-agnostic component; the v2 shell and app-gmt both mount it.

### 5.3 Build
- Recipe tabs **Blend** | **Sweep**. Blend = A and B strips with the three L/C/h blend sliders
  between them + Swap. Sweep = per-channel easing pickers. Result = candidate, feeding Working live.
- Slots accept anything (today's `registerCustomRamp` path): drop, armed pick, or click-to-browse
  from My Gradients + built-ins.
- No Shape / Adjust here anymore — they live on Working.

### 5.4 Extract
- Image pane with the Path handles; method chips **Dominant** · **Tones** · **Path**; the dials for
  the active method in the right panel. Dominant colours also appear as individual swatches
  (drag into the working palette). Result = candidate, feeds Working live.
- **Image drop anywhere** in the app routes to Extract.
- The image is also a preview context: **Gradient Map** in Wallpaper (§5.7).

### 5.5 Right panel (context) — SUPERSEDED: v2 has no right panel; the edit drawer (§6b) holds Stops, Curves, Adjust, and Extract dials sit on the stage row
Three collapsible sections, same order on every source: **Source** (Browse: Arrange · Build: the
recipe's dials · Extract: the method's dials) · **Shape** (curve editor: tracks L/C/h, fit-from-
source, detail/smooth as a fit recipe, ghost) · **Adjust** (the modifier list). Shape and Adjust
also open from the hero toggles. On Browse the panel starts collapsed so the wall gets the width.

### 5.6 Variants (top bar)
Slots A B C D + (rename allowed). A variant = every source's dials + documents, Shape + Adjust,
Working (input ref + baked stops), and Recent. Not Kept. Built on `getPreset({includeDocuments})`
/ `restoreDocuments` (already captures all of this). Click = switch. Select two → a **tween**
slider blends their Working outputs in OKLab; **Bake** commits. Persisted with the session.

### 5.7 Wallpaper (was Fullscreen)
- Same eight modes. **Export panel:** size presets (Phone · Square · 1080p · 4K · custom W×H), dither
  on by default, supersample ×2 for the CPU geometry modes, PNG. Offscreen render at the requested
  size: compositor `resize(w,h)` for cpuField/glQuad; a `renderAt(w,h)` face added to the
  `OwnCanvasHandle` for Fractal / Liquify / Parallax. **Cap 4K** (owner decision) — no tiling.
- **Gradient Map** mode: recolour the Extract image with the working gradient (luminance LUT,
  duotone-style) — the registry's unused `cpuRaster` kind was built for exactly an imported image.

### 5.8 Export · Share · Save
- **Export** (hero + My Gradients group): one dialog, formats grouped — *Design apps* (.ase NEW,
  .grd, .ai, .idml, .gpl, .ggr, Paint.NET) · *Code* (CSS vars, SVG, JSON, JS, Python, CSV, Tailwind
  NEW, design-tokens JSON NEW) · *Fractal software* (.map, .ugr, .cpt) · *Image* (PNG strip,
  contact sheet, Wallpaper). Default is remembered; never Fractint by default outside GMT.
- **Share:** URL with the working gradient's stops (small). The rule keeping the library out of
  share strings holds.
- **Save:** the studio autosaves to localStorage always; menu has Restore. "Project file
  (.json)" moves under Advanced.

### 5.9 What leaves the standalone shell
Animate / TimelineHost / keyframe diamonds / installModulation UI · FPS counter · "Untitled" scene
name · Save-as-JSON as the primary path · the dock tab strip as the mode selector · the Favients
label · "Back to GMT" unless arrived from GMT. (The engine plugins stay available; the shell just
stops mounting them.)

## 6. Layout — first take, SUPERSEDED by §6b (kept for the record)

**Desktop (≥1120):** top bar 44 · Working hero ~150 (ramp 56 + handles 16 + palette 44 + chips) ·
source area = left rail 64 (Browse / Build / Extract) + stage + right panel 280 (collapsible) ·
My Gradients strip ~100 at the bottom. Stage keeps ≥ 45 % of the height at 1280×800.
**Tablet (768–1119):** right panel becomes an overlay drawer; rail stays.
**Phone (<768):** hero rail at the top (ramp + palette row, ~110) · stage scrolls · My Gradients
peek row (~56) above the source tab bar (~52); the peek pulls up into the full panel. Sheet and
tabs honour safe-area insets (fixes the June follow-up on body-portaled wells).

## 7. Constraints that shape the build
- **Three hosts** share `palette/` (app-gmt, fluid-toy, the Explorer). Label changes touch all
  three; behaviour changes must keep app-gmt's palette overlay (`PalettePickerOverlay` → `PickerStage`)
  and its floating Favients working.
- **main auto-deploys.** v2 is built on branch `ge-v2` as a second entry page
  (`gradient-explorer-next.html`) beside the old shell; the old shell retires at parity. The
  integration branch is pushed to `dev` for the /dev preview (phone testing).
- **DDFS stays the dial model** (free undo / presets); AutoFeaturePanel is mounted per section, the
  Dock is not. Document registry + history providers are reused unchanged.
- **`palette/core` stays pure**; new maths (sample-N, ramp distance, OKLab tween, .ase writer)
  goes there with `test:palette` coverage.
- The owner does visual testing; no screenshot smokes. Guards: `typecheck`, `test:palette`,
  `smoke:mobile-layout`, `smoke:liquify`, `smoke:gx-handles`, plus new unit tests for the pipeline
  input slot, Recent auto-collect, variants round-trip, sample-N.

## 8. Staging, streams, models

- **Phase 0 — design lock (this session, Fable):** this doc + `plans/ge-v2-mock.html` (clickable,
  measured at desktop / tablet / phone). Iterate until the layout feels right.
- **Phase 1 — foundation (serial, one session, Fable) — BUILT + COMMITTED 2026-09-03 on `ge-v2` (`bd661fd6`), see §11:** Working input slot on the pipeline ·
  Recent auto-collect in favientsStore · variants store · the v2 shell skeleton + entry page built to the mock B skeleton (top bar · hero · drawer · stage · silent row) ·
  frozen interfaces written into this doc. Branch `ge-v2`.
- **Phase 2 — parallel streams (worktrees, 2–3 at a time; shared 5 h cap; check in ~2 h):**

| Stream | Scope | Model |
|---|---|---|
| S1 | Browse: canvas furniture, search + Filters popover (hue chips, look sliders, sources, arrange sentence), More like this, host-agnostic wall | Opus 5 |
| S2 | Working hero: appear-on-first-pick, preview row, stops + palette editor, sample-N rules, edited/live, Follow, the edit drawer (Stops · Curves · Adjust) | Fable |
| S3 | Build + Extract on the stage row (recipe / method segmented control, real-anatomy sliders), armed slots, Mix with, image-drop-anywhere | Opus 5 |
| S4 | Wallpaper: export at size (renderAt face), Gradient Map mode | Opus 5 |
| S5 | Export dialog (+ .ase, Tailwind, tokens), Share URL, label sweep across three hosts, tests | Sonnet 5 |
| S6 | Phone layout of the v2 shell (sheet, tabs, safe-area) — after S1–S3 | Opus 5 |

- **Phase 3 — parity + polish (Fable orchestrates):** parity checklist vs the old shell, `/polish`,
  swap the entry point, retire the old shell, ADRs for the pipeline input slot / Recent / variants.
- Orchestration: doc-anchored (this file + a progress log), single integration branch, the
  orchestrator keeps a lean context and delegates exploration.

## 9. Decisions log
- 2026-09-03 — purpose-built shell replaces the dock-tab console; GMT chrome leaves the standalone app.
- 2026-09-03 — curves (Shape) stay first-class on every source; never "advanced".
- 2026-09-03 — the hero is the stops + palette editor; palette = derived view until touched.
- 2026-09-03 — Browse/Build/Extract feed ONE pipeline (Source → Shape → Adjust → Working).
- 2026-09-03 — four roles (Candidate / Working / Recent / Kept), one gesture set, armed targets.
- 2026-09-03 — Follow OFF by default in Browse; Build/Extract feed Working live.
- 2026-09-03 — "My Gradients", auto-built per session (Recent), organising optional; bottom strip.
- 2026-09-03 — Variants are GLOBAL snapshots; tween between two in OKLab; Animate leaves.
- 2026-09-03 — Wallpaper caps at 4K, no tiling.
- 2026-09-03 — build beside the old shell on `ge-v2`; retire at parity.

## 10. Open
- (closed) right-panel default — there is no right panel in v2.
- Preview row vs ghost-split: the preview row costs ~80 px of hero while browsing; a split inside the working ramp would save it but hide the working gradient during preview. Decide in S2.
- Extract dials: stage row (mock B) or the drawer? Decide in S3.
- The three remaining teaching texts (welcome pill, "click to edit" hover, hex tooltip) — keep unless the owner still finds it wordy.
- Recent cap + whether unstarred items expire by age as well as count.
- Whether Sweep (ColorBox) needs its own candidate spot or shares Blend's.
- Share URL: stops only, or stops + palette rule/N?

**Measured on `ge-v2-mock.html` (2026-09-03, browser pane):**

| Viewport | top bar | hero | candidate | narrowing bar | wall | strip / peek+tabs | wall share |
|---|---|---|---|---|---|---|---|
| Desktop 1280×800 | 44 | 153 | 88 | 67 (two rows) | 356 | 92 | 45 % |
| Phone 390×800 | 44 | 127 | 107 | 61 | 351 | 56 + 52 | 44 % |

Phone: every region 388 px wide inside the 390 px frame, no horizontal overflow (the top bar needed `minmax(0,1fr)` on the frame column — the same trap will exist in the real shell). Tablet 900 wide: right panel overlays the stage when Shape/Adjust/Source is open. Flow checked by script: click tile → candidate; Use → Working; Mix with… → slot B armed → next wall click fills B and switches to Build; clicking a stop → Baked chip + Stop inspector; Recent grew on each Use.

## 6b. Layout, second take: one thing on screen at a time (mock B)

Mock A showed the whole pipeline on every screen: seven persistent regions, two heroes, a bar that exposed every narrower, inline mini-sliders the widget set does not have, and labelled empty zones. The owner read it as complex, squished, and more to read than the current app. Mock B applies the principle the conversation kept circling: **the screen grows with the user, and the next thing is one gesture away.**

- **First load:** the wall, three large source tabs, a search box, a Filters button. Nothing else. A single pill over the wall says what a click does.
- **One hero, with a preview state.** The hero does not exist until the first pick. The first pick IS the hero, marked "previewing, Use to keep". After Use it becomes the working gradient; later picks appear as a dashed preview row beneath it with Use, Mix with, star, More like this, and dismiss. Esc dismisses, Enter uses. This replaces the two-hero layout and answers the "hard to see while picking" worry inside one strip.
- **Editing is a drawer, not a side panel.** Clicking the ramp opens a full-width drawer under the hero with three tabs: Stops and palette, Curves, Adjust. The curve editor gets the full width it needs. There is no right panel anywhere in the app.
- **Narrowing is one control.** Search plus a Filters button with an active-count badge. The popover holds hue chips, the four look axes as real full-width sliders with label and readout, source chips, the count, clear, and the Arrange sentence. Hue chips and More like this do most of the narrowing without any slider.
- **Sources are three tabs across the top of the stage.** No rail. Build and Extract put their recipe or method as one segmented control on the same row. Build and Extract feed the hero live, and the hero chip says so ("live from Build").
- **My Gradients is a silent row.** It appears only once Recent has an item: swatches along the bottom edge, no labels, no empty boxes. A "groups" affordance expands it to Recent, Starred, and named groups.
- **Type and air.** 14 px base, 15 px tabs, 16 px hero name, 24 px gutters. Chips are few and carry state, not actions: the hero header holds the name, one state chip, Mix with, and star.
- **Top bar:** brand, undo, Variants, Share, Export, Wallpaper, settings. Variants opens a popover with the slots and the tween slider.

Regions on screen after the first Use, desktop 1280x800: top bar 48, hero 248 including the preview row (about 170 without it), source row 57, wall 400 (50 %), My Gradients row 47. On the phone the same stack fits in 390x800 with no horizontal overflow and the source tabs move to the bottom.
- 2026-09-03 — mock A (every surface at once) rejected as complex and squished; mock B (one thing at a time, one hero with a preview state, edit drawer, Filters popover, silent My Gradients row) APPROVED as the layout reference. No right panel in v2.
- 2026-09-03 — Phase 1 foundation built on `ge-v2` (§11): one Working pipeline (ADR-0111), Recent auto-collect, variants that bypass loadPreset (ADR-0112), the v2 shell as `gradient-explorer-next.html`. Guards: `test:palette` (21 links) + `smoke:ge-next`.

## 11. Frozen interfaces (Phase 1, 2026-09-03) — streams code against THESE

Everything below exists on branch `ge-v2`, typechecks, and has a node harness where the design says it must. Signatures are copied from the source; when they disagree, the source wins and this section is stale.

**a. Working pipeline — `palette/core/workingPipeline.ts` (pure) + `palette/store/workingStore.ts`.**
- `type WorkingInput = {kind:"empty"} | {kind:"build"} | {kind:"extract"} | {kind:"gradient"; config; name; source} | {kind:"stops"}`.
- `runWorkingPipeline(base, params, curves, noiseSeed, detail, verbatim) -> { base, ramp, final, config, passthrough }` — buildGradientRamp with A === B and no slot mods; `passthrough` = verbatim config returned by identity when `curves === null` and `isIdentityAdjust(params)`. Guard: `npx tsx debug/test-palette-working.mts` (falsified: returning a clone instead of the verbatim object went red).
- Store state: `input`, `name: string|null` (null = auto), `bakedFrom`, prefs `rule` / `count` / `follow`. Actions: `setInput(input)` · `use(config, name, source)` (clones, collects into Recent) · `setName` · `beginEdit()` (fold: fit or verbatim -> paletteEditorStore, reset Adjust + curves, input = stops, remembers bakedFrom) · `returnToSource()` · `collectCurrent()` · `setRule` / `setCount` / `setFollow`. Each mutating action is one `paramEdit` bracket; prefs are not undoable.
- `useWorkingDerived() -> { input, name, empty, live, edited, passthrough, base, ramp, final, config, palette }` and the imperative `deriveWorkingNow()`; `autoWorkingName(input, bakedFrom)`.
- Providers: `captureWorkingHistory` / `restoreWorkingHistory` (undo) and `serializeWorkingDocument` / `restoreWorkingDocument` (scene, coerced via `coerceWorkingSnapshot`), registered by `palette/installWorking.ts` `installWorking({ collectRecent? })`, which also sets the `RecentCollector`. The store never imports the favourites store.

**b. generatorStore additions.** `fitChannelsToTracks` (exported) · `fitFromChannels(base)` action · `baseFromSlice(slice, slotA, slotB, seed)` · `buildBaseNow()` · `useBuildBase()` · `useAdjustParams()` / `readAdjustParamsNow()` · `useSampledCurves()` / `readSampledCurvesNow()` · `readGeneratorSlice` / `setGeneratorSlice` · `MAIN_DEFAULTS` · `sampleCurves` · `type GeneratorSlice`. `imageStore.imageDerivedNow()` is the imperative twin of `useImageDerived`.

**c. Palette face — `palette/core/paletteSample.ts`.** `type PaletteRule = "stops" | "even" | "perceptual"`; `samplePalette(ramp, rule, n, config?) -> PaletteSwatch[]` where `PaletteSwatch = { t, color }`; `sampleEven` / `samplePerceptual` / `sampleAtStops`; `clampCount` (2..64); `rampDistance(a, b, samples = 16)` for More like this. Guard: `npx tsx debug/test-palette-sample.mts`.

**d. Recent — `palette/store/favientsStore.ts`.** `RECENT_GROUP = "g-recent"`, `RECENT_LABEL`, `RECENT_CAP = 60`, `isRecentGroup(id)`; action `collectRecent(config, name, source?) -> string | null` (null = already kept in a named group; moves an existing Recent item to the front; the run is always contiguous at index 0; caps; re-labels; never writes lastGroupId; not undo-bracketed). `add()` never lands in Recent. The divider for Recent is read-only in FavientsPanel. NOTE: `gmt.favients` is shared, so Recent shows in app-gmt and fluid-toy shelves too. Guard: `npx tsx debug/test-palette-favients.mts` section [6].

**e. v2 shell — `gradient-explorer-next.html` -> `gradient-explorer/v2/`.** `main.tsx` installs only registerUI · installShortcuts · installUndo({hideTopBarButtons}) · registerCoreSettings · restorePaletteFilters/watchPaletteFilters. `registerFeatures.ts` = registerPaletteUI({standaloneStopsMode:false}) + installWorking (Recent wired) + setFavientSelectMode(true); NO registerGradientTargets (dock-shaped). `GradientExplorerV2App.tsx` (top bar · WorkingHero · EditDrawer · source tabs + the EXISTING stages · My Gradients footer wrapping FavientsPanel · SettingsHost · ToastHost · FullscreenGradientOverlay), `WorkingHero.tsx`, `EditDrawer.tsx` (Stops & palette · Curves · Adjust). Source switching: entering Build/Extract -> `setInput` live; leaving one -> `use(derived)` commits + collects. Wallpaper -> `collectCurrent()` + `openFullscreen`.

**f. Variants — `palette/store/variantsStore.ts` + `palette/core/variantsCore.ts` + `palette/core/rampTween.ts` (ADR-0112).** `useVariantsStore { variants, activeId, capture(name?, ramp?) -> Variant, restore(id), update(id, ramp?), rename(id, name), remove(id), duplicate(id) }`, `getVariants()`. `Variant = { id, name, createdAt, features: Record<string,unknown>, documents: Record<string,JsonValue> (never `favients`), ramp: number[] | null (256×3 ints) }`. Core: `VARIANT_FEATURES = ['paletteGenerator','paletteImage','paletteFilters']`, `VARIANTS_STORAGE_KEY = 'gmt.ge.variants'`, `MAX_VARIANTS = 12`, `deepClone`, `stripFavients`, `nextVariantName`, `capVariants`, `roundRamp` / `rampFromInts`, `isWellFormedVariant`, `parseVariants` / `serializeVariants`, `featureSetterName`. `tweenRamp(a, b, t) -> RGB[]` (OKLab per texel; t clamped; b resampled by t). Guards: `npx tsx debug/test-palette-variants.mts` (63 assertions incl. "a whole switch is exactly one param-undo entry", falsified by dropping the favients strip: 5 red) and `npx tsx debug/test-palette-tween.mts`. UI: `gradient-explorer/v2/VariantsMenu.tsx` (click = switch, shift-click = tween slider previewing through a plain setState, Bake = `use`).
**Known gaps (carried in the store header):** a variant does not carry the shell's active SOURCE tab, so switching to a variant captured in Browse while standing in Build restores the working gradient but leaves the Build stage on screen (add `source` to the snapshot in Phase 2 if it bites); `restoreImageDocument` is async, so an image-carrying variant lands its image one decode late and OUTSIDE the switch's undo entry; localStorage quota failures on image-heavy variants are silent; the DDFS setter merges rather than replaces, so a param added after a capture keeps its current value on restore.

**What the skeleton deliberately leaves to the streams:** the per-mode heroes still rendered inside PickerStage / GeneratorStage / ImageStage (S1, S3); Browse search + Filters popover (S1); the channel graph editor in the Curves tab and the per-stop inspector (S2); Modify/Noise `dynamicVisible: isMixed` hides Adjust while the Build recipe is ColorBox (S3); keyframe diamonds still render on AutoFeaturePanel sliders (S3/S5 decide: a panel prop or a shell-level flag); the drawer + preview row squeeze the stage on short windows (S2/S6); armed slot B for Mix with (S3); Export / Share / Variants UI (S5 / foundation); phone layout (S6).
