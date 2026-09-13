# GE v2 — Phase G parity checklist (old shell vs v2)

Written 2026-09-13. Static source reading of both shells against `plans/ge-v2-functionality.md`
(2026-09-06) and `plans/ge-v2-old-shell-migration-audit.md` (2026-09-08), plus an independent sweep
of what the old shell's code installs. **Not run in a browser** except where noted. Two claims were
spot-checked by grep on the same day: nothing appends `?from=gmt` (so `cameFromGmt` rests on the
referrer alone), and both openers are `window.open('gradient-explorer.html', …)` with no params.

Owner decision the same day: **GX stays on gmt-fractals.com** — same origin, the shared `gmt.*`
localStorage keys carry over, no migration (closes `plans/pre-release-ui-pass.md` §1c).

Abbreviations: V2APP = `gradient-explorer/v2/GradientExplorerV2App.tsx` · BS = `v2/BrowseStage.tsx` ·
OAPP = `gradient-explorer/GradientExplorerApp.tsx` · OMAIN = `gradient-explorer/main.tsx` ·
AGE = `components/AdvancedGradientEditor.tsx` (the shared stops editor).
Statuses: HAVE · PARTIAL · MISSING · SCRAPPED (decision).

## 1. Browse

| # | Capability (old shell) | v2 | Evidence (grep) | Notes |
|---|---|---|---|---|
| B1 | Wall zoom / pan / fit / readout | HAVE | BS zoom tool, `zoomPct`, `stepZoom` | phone − / + / Fit |
| B2 | Search | HAVE | `buildSearchIndex` | lost: Esc in the search box clears it |
| B3 | Theme chips | SCRAPPED (Phase A) | `PickerThemeChips` only in a BS comment | audit M5 wanted them back — owner call |
| B4 | Hue / look windows | HAVE | `HueLightnessPad`, `padAxes.ts`, `LOOK_AXES` | **bug (both shells):** `CLEAR_ALL_PATCH` in `pickerModel.ts` omits `qHue` |
| B4b | qWarm | SCRAPPED | BS "Owner, 2026-09-06 … redundant" | |
| B5 | Source bundles, licensed load/unload, attribution | HAVE | `PickerBundleToggles layout="row"` | phone default = core only (`PACKS_OFF`) |
| B6 | Arrange | HAVE | `arrangeSentence` | |
| B7 | Swatch size / padding | size SCRAPPED, padding PARTIAL | `tileSizeFor`; `data-gx-zoom-padding` | padding only while zoom tool armed, desktop |
| B8 | Carve tools, keep/cut, "N kept · clear" | PARTIAL | `PickerWall.tsx`; BS tools | readout only while a tool is armed; **bug:** "{n} kept · undo" calls `m.clearCarve` |
| B9 | More like this | HAVE | `setSimilarityAnchor` | |
| B10 | Hover / preview / second click | HAVE (semantics changed) | V2APP candidate effect | pick = Use, second click = edit |
| B11 | Drag tile → My Gradients | HAVE | `SetRail` drop, `onBandDrop` | |
| B12 | Empty states; gesture hint | HAVE; hint SCRAPPED | `gx.picker.gestureHint` dead | |
| B13 | Provenance line under the hero | SCRAPPED (audit rec, not a recorded decision) | tile tooltip carries it | confirm |
| B14 | Wall keyboard nav | HAVE (new) | `keyboard` prop | |
| B15 | Phone picker | HAVE | Phase F | |

## 2. Make

| # | Capability | v2 | Evidence | Notes |
|---|---|---|---|---|
| M1 | Mix A/B, L/C/h, Swap | HAVE | `Tray.tsx` `MixFace`, `enterMix` | |
| M2 | Reset blend | PARTIAL | `resetMix` no v2 caller | default ticks + `enterMix` zero it |
| M3 | Arm slot A alone | MISSING | no `armSlot('A')`; band A = `onCancelFace` | V2APP "Pick a gradient to replace this one" banner near-dead |
| M4 | Per-slot mods (`aHueRotate`…`bMirror`), bake/reset slot | MISSING | old `GeneratorSlotMods.tsx` | 14 live params with no UI; leftover values apply invisibly |
| M5 | Mix past 0..1 | PARTIAL | track clamps, field soft | audit OD6 |
| M6 | Keyframe diamonds on generator params | SCRAPPED | design §5.9 | |
| M7 | Image: drop/paste/dialog, methods, dials, cloud | HAVE | `ExtractStage` `METHODS`, `DIAL_PARAMS` | cloud off on phone |
| M8 | "Drop to load" overlay, "reading image…" | MISSING (minor) | V2APP ignores `over`; `ImageSlot` ignores `loading` | |
| M9 | Sweep / ColorBox | SCRAPPED | plan §3 | |
| M10 | Start from nothing | PARTIAL | View ▸ Reset Default survives; `WorkingHero` null before first pick | OD3 |
| M11 | Curves over a live mix / fit a dropped gradient / bake to curve | MISSING | `fitFromSource`, `fitCurvesFromRamp`, `bakeMainToCurve` no v2 callers | likely by design (Curves bakes the Mix first) — confirm |

## 3. Edit

| # | Capability | v2 | Evidence | Notes |
|---|---|---|---|---|
| E1 | Stops gestures | HAVE | AGE `chrome="strip"` | |
| E2 | Colour picker | HAVE | `EmbeddedColorPicker` | |
| E3 | Interpolation, bias | HAVE | knot right-click | |
| E4 | Blend space, output profile | HAVE (moved) | `BlendSpacePicker`; `ExportMenu` `PROFILES` | `hsv-far` retired |
| E5 | Stops menu actions | HAVE | AGE `onlySections` | |
| E5b | **Copy / Paste gradient** | MISSING | AGE `onlySections` drops Clipboard when `inspectorHost` is set | comment says "homes elsewhere" — none found; breaks GMT → GE copy |
| E5c | Send to Favients, Blend/Output sections in menu | SCRAPPED | owner 2026-09-07 | ♥ covers it |
| E6 | Palette face | HAVE | `PaletteRow.tsx` | no count stepper (`setCount` no UI caller) |
| E7 | Curves | HAVE | `CurvesFace` | "Curves on"/"Reset" removed |
| E8 | Adjust dials incl. mirror / reverse / noise targets | HAVE (static) | `palette-modify-toggles`, `palette-noise-targets` | not runtime-checked |
| E8b | Reseed noise, Reset mods, Reset all | MISSING | `reseedNoise`, `resetMainMods`, `resetAll` no v2 callers | audit M9 |
| E9 | Source/result, bake, return, name, undo | HAVE | `SourceBands`, `returnToSource` | |
| E10 | ★ save, hero drag source | HAVE | `toggleStar`, `beginCustomAvatarDrag` | |
| E10b | Hero enlarge; "N stops" readout | enlarge SCRAPPED (audit rec); readout MISSING (minor) | | |

## 4. Keep & organise

| # | Capability | v2 | Evidence | Notes |
|---|---|---|---|---|
| K1 | Recent auto-collect, dated bins | HAVE (v2 only) | `collectRecent`, `listGroundSets` | |
| K2 | Star, groups, create, rename, reorder, trash | HAVE | `SetRail` | |
| K3 | Delete group | HAVE (new) | `removeGroup` | |
| K4 | Rename gradient, list view | HAVE | `GroundList.tsx` | |
| K5 | Per-item remove | HAVE | `removeFavourites` | |
| K6 | Search within shelf | HAVE | | |
| K7 | Import .map .gpl .ggr .cpt .css .json | HAVE | `FavientsCollectionMenu`, `onOtherFiles` | **bug:** an image first in a mixed drop swallows the gradient files (`useImageDrop.ts` `onDrop`); `.grd` import in neither shell |
| K8 | Save / merge / replace / clear collection | HAVE | `FavientsCollectionMenu withExport={false}` | |
| K9 | Export whole shelf | PARTIAL | rail export → `membersOfMany` | disabled on All |
| K10 | Contact sheet PNG | HAVE | `buildContactSheet` | |
| K11 | Shared `gmt.favients`, cross-tab | HAVE | storage listener | no re-read on focus/visibilitychange |
| K12 | Shelf click fills armed Mix slot | HAVE (new) | `getArmedSlot()` | |
| K13 | "More" panel, left dock | SCRAPPED | plan 2026-09-09 s3 | |
| K14 | Shelf strip | SCRAPPED | Phase D | |

## 5. Snapshots

| V1 | Variants | SCRAPPED; old shell never mounted them | `variantsStore.ts`, `variantsCore.ts`, `rampTween.ts` have no production importer | ADR-0112 wants a status line |
|---|---|---|---|---|

## 6. Output

| # | Capability | v2 | Evidence | Notes |
|---|---|---|---|---|
| O1 | Share link | HAVE (v2 only) | `shareUrl.ts` | |
| O2 | Single export, all formats | HAVE | `ExportMenu` `GROUPS` ⊇ all 22 ids in `exportFormats.ts` | |
| O3 | PNG strip | HAVE | `downloadPng` | |
| O4 | Export text preview | MISSING | old `showPreview` | |
| O5 | .ai/.idml lossy warning on ONE gradient | MISSING | v2 `lossy = isSet && bundles ? … : 0` | sets warn |
| O6 | Wallpaper modes | HAVE | `fullscreen/modes/index.ts` | Arched/Parallax SCRAPPED; Liquify `wip` |
| O7 | Export at size | HAVE | `ExportPanel.tsx` | |
| O8 | Wallpaper follows live gradient | HAVE | `setFullscreenLiveSource` | |
| O9 | Split mode | PARTIAL | nothing in v2 reads `splitY` | overlay covers the shell instead of resizing it — owner call |
| O10 | Gradient map recolours dropped image | HAVE | `rasterGradientMap` | stale "Drop an image on Extract first" in `gradientMapMode.tsx` |
| O11 | Fractal → Fluid Toy, scene embed, coords | HAVE (desktop) | `openInFluidToy` | |
| O12 | Wallpaper by drag well | SCRAPPED | audit S1 | |
| O13 | Send to GMT | HAVE (same as before — via the shared collection) | | |

## 7. Shell

| # | Capability | v2 | Evidence | Notes |
|---|---|---|---|---|
| S1 | Settings | HAVE | `registerCoreSettings`, `registerPaletteSettings` | Autosave settings shown in both, do nothing (`UnsavedWorkGuard` is app-gmt only) |
| S2 | Keys (Esc, Del, arrows, `[ ]`, undo) | HAVE | `installUndo` | |
| S3 | **Load / Save scene, Restore last session** | MISSING | OMAIN `installSceneIO`; v2 none | **working gradient does not survive a reload**; design §5.8 wants autosave + Restore. Old Restore read app-gmt's key (was broken) — don't port verbatim |
| S4 | **Help: Getting Started, Shortcuts, Hints, Support, Feedback** | MISSING | OMAIN `registerFeedbackUI` + `installHelp`; `feedbackPanelEntry` in `setup.ts` | v2 has no menu/panel host; About + What's New are new work (pre-release §1) |
| S5 | `installPwaUpdate` | MISSING | OMAIN only | see swap risk 5 |
| S6 | Timeline, LFO, FPS, HUD, docks | SCRAPPED | design §5.9 | |
| S7 | Back to GMT | PARTIAL | `cameFromGmt` | see swap risk 2 |
| S8 | Phone | HAVE | Phase F | |
| S9 | Context menu, toasts, pre-paint, error boundary | HAVE | | |

## 8. Not in the inventory

| N1 | Select → reveal → place drop dock | SCRAPPED | audit S1 |
|---|---|---|---|
| N2 | Landing / cancel morph (`GradientLandingLayer`) | MISSING (polish) | ~143 lines, "cheapest polish left" |
| N3 | Drag avatar | HAVE | `GradientDragAvatar` |
| N4 | Old-shell UI keys | dropped | UI state only |
| N6 | Licensed packs default | changed | on for desktop in v2 |

## (a) Gaps ranked by user impact

1. **S3 save / restore** — autosave via the document providers `installWorking` registers + a Restore; wire or remove the dead Autosave settings. `v2/main.tsx`, V2APP.
2. **S4 Help / Support / Feedback** — a `?` in the V2APP header rendering the `help` menu; `registerFeedbackUI` + `installHelp` in `v2/main.tsx`; `FeedbackPanel` in a Floating. About / What's New per pre-release §1.
3. **E5b copy / paste gradient** — keep AGE's Clipboard section under `inspectorHost` (additive) or hero menu.
4. **M4 slot mods** — re-host `GeneratorSlotMods` from the Mix face.
5. **E8b / M2 resets + reseed** — one store call each in `Tray.tsx`.
6. **M3 arm slot A** — `SourceBands.tsx` / `Tray.tsx`.
7. **O5 single-gradient lossy warning** — `ExportMenu.tsx`.
8. **O9 split mode** — read `splitY` in V2APP.
9. **K9 export all** when All is lit.
10. B3 theme chips (if wanted) · M10 New gradient · O4 export preview.
11. Small: B8 undo-button bug · `CLEAR_ALL_PATCH` `qHue` · K7 mixed drop · M8 drop overlay / loading · stale gradient-map text · search Esc · M5 soft bounds · N2 landing morph · M11.

## (b) Swap risks

1. **Handoff.** `openGradientExplorer` (`palette/installFavients.ts`) and fluid-toy's inline copy (`fluid-toy/registerFeatures.ts`) open `gradient-explorer.html` with no params; everything else is same-origin localStorage. Keep the filename, swap its script.
2. **`cameFromGmt` cannot pass in production.** Nothing appends `?from=gmt` (verified), and the referrer fallback wants `app-gmt.html`, which fails for `/` and for Cloudflare's pretty URLs. Append `?from=gmt` in both openers.
3. **HTML head.** Copy v2's head wholesale (overflow lock on every pointer, not fine-pointer only); drop "(next)" from the title and the header badge.
4. **Existing share links** are `gradient-explorer-next.html?g=…` (`shareUrlFor` uses the current page). Keep that entry as an alias or redirect with the query.
5. **PWA.** `installPwaUpdate` registers the SW via a TopBar component v2 doesn't have → a GE-only visitor never gets the SW. Call `registerSW` from `virtual:pwa-register` in `v2/main.tsx`.
6. **Must survive the old shell's deletion:** `PickerStage.tsx` (app-gmt `PalettePickerOverlay`), `fractalHandoff.ts`, `FullscreenGradientOverlay.tsx`, `fullscreen/**`. Safe (knip, audit §5.1): `GradientDropLayer`, `GradientExplorerApp`, `GradientLandingLayer`, `TopBarButtons`, `gradientTargets`, `main`, `registerFeatures`, `setup` + the generator UI in `palette/components`. `HeroLiveSource` in the overlay dies.
7. **Guards on the old page** (`ENGINE_URL` default): `smoke:gx-handles`, `smoke:liquify`, `smoke:gx-fractal-glitch`, `smoke:mobile-layout` (in `smoke:all`), `smoke-gx-fractal*.mts`, `smoke-gx-nucleus-render.mts`, seven `repro-gx-*.mts`. Most should run on v2 — re-run. Retire `smoke:mobile-layout` for `smoke:ge-phone`.
8. **Citations:** `.claude/rules/` sibling-apps, mobile-layout, deep-zoom, engine-plugins (fps re-slot cites `gradient-explorer/main.tsx`), tick-and-animation (GE as a `RenderLoopDriver` host), palette; `knip.json`; comments in `engine/plugins/TopBar.tsx`, `engine/components/AppErrorBoundary.tsx`, `palette/installFavients.ts`; `docs/modules/gradient-explorer/app.md`; ADR-0014 (Update block). `npm run check:rule-guards` after.
9. **Possible Delete-key double action** under the wallpaper (spline's window listener vs AGE / BS). Untested.

## (c) Owner calls

- Theme chips (B3).
- Help contents for a standalone GX; keep or drop "Back to GMT".
- Save model: autosave + Restore vs project file; the Autosave settings.
- Clipboard (E5b): restore or confirm dropped.
- Mix: slot mods, slot A, resets / reseed, extrapolation past 0..1.
- New gradient from nothing.
- Curves over a live mix / fit a dropped gradient (M11).
- Split mode: cover or resize.
- Never-recorded audit recommendations: hero enlarge, provenance line, persistent "N kept", landing morph.
- Export-all on All (K9).
- Variants code: delete + ADR-0112 status.
- Keep `gradient-explorer-next.html` as a permanent alias?
- Liquify ships `wip`.

## Owner decisions — 2026-09-13

1. **S3 save / restore** — fix autosave in v2 (the Settings autosave options must actually govern it)
   and add a session Save / Load loop **in the Settings page**; exporting a session is an advanced
   case, so it does not earn top-bar space. → in progress.
2. **S4 Help / Support / Feedback** — yes. On a phone the top bar is already crowded, so a phone gets
   ONE general-purpose menu. → in progress.
3. **E5b Copy / Paste gradient** — gone on purpose. The path to GMT is gradient → library → GMT.
   *Later:* the Curves and Adjust faces as native floating panels in GMT's gradient editor.
4. **M2 / M3 / M4 Mix controls** (slot mods, slot A, resets) — gone on purpose; Mix is streamlined into
   the destructive editing flow. (Leftover slot-mod values reaching v2 invisibly is being checked.)
5. **E8b Adjust** — gets Reseed noise, noise types if the pipeline has them, and Reset all. → in progress.
6. **O9 Split mode** covering the shell is correct. **O5** single-gradient lossy warning — add it
   (→ in progress). **K9** export-all disabled on All is fine.
7. **Swap risks** — acknowledged. No offline caching for a GE-only visitor is fine (skip PWA).
8. **Small bugs** — fix: carve "undo" button, `CLEAR_ALL_PATCH` `qHue`, image-first mixed drop, stale
   gradient-map text, search Esc, `?from=gmt`, the Delete-key double action (if real), the false
   Clipboard comment in AGE. → in progress.

Still open from (c): theme chips (B3), New gradient from nothing (M10), Variants code deletion +
ADR-0112 status, keeping `gradient-explorer-next.html` as an alias, Liquify `wip`.

### Follow-up decisions — 2026-09-13 (later)

- **S3 autosave:** opt-in (off by default) and **separate per app** — GMT's and GX's toggles and
  intervals never affect each other; GMT keeps its existing keys. A share link replacing the
  restored session (undo cannot return to it; the work stays in My Gradients' Recent) is fine. After
  loading a session file, undo not restoring the previous source IMAGE is fine.
- **S4 help:** GX gets its OWN help topics (not GMT's "Welcome to GMT"); Keyboard Shortcuts hidden on
  phones; "Support GMT" → "Support Gradient Explorer" (GMT as the umbrella name in body copy is fine);
  Feedback in GX offers to attach the gradient or a screenshot (not GMT's .gmf scene); "Back to GMT"
  stays when the page came from GMT; **About and What's New are to be built** for GX.
- **Held step fixes** (GX fractal Iterations, Borromean Invert): leave as they are.

## Status — 2026-09-13, end of session (uncommitted)

Built and gated (typecheck, test:palette, test:gx-session, test:gx-share, test:number-drag-rate,
check:rule-guards / text-bytes / zindex, orphans, smoke:ge-tray / ge-hero / ge-ground / ge-phone /
ge-session, smoke:help-menu on fluid-toy, smoke:engine-gmt — all green on one combined run):
- **S3** autosave (opt-in, per-app keys `gmt.ge.autosave-*`, session `gmt.ge.session`) + Settings ▸
  Files ▸ Session Save / Load (`.gxsession.json`). ADR-0121 (+ Update block). fluid-toy and the old
  shell no longer show inert autosave rows.
- **S4** Help / Support / Feedback (desktop `?`, phone ONE menu), GX's own help topics
  (`gradient-explorer/v2/help/`), no Keyboard Shortcuts on phone, "Support Gradient Explorer",
  feedback attaches the gradient, About (live catalogue attributions), What's New (hoisted to
  `engine/plugins/WhatsNew.tsx`, GX key `gx.whatsNew.seenVersion`, version `GX_VERSION` placeholder).
- **E8b** Adjust: Reseed + Reset all (`resetAdjust`); no noise types exist in the pipeline.
- **O5** lossy note on a single gradient (every reducing format).
- **Bugs:** `CLEAR_ALL_PATCH` qHue, mixed image+gradient drop, gradient-map wording, search Esc,
  `?from=gmt`, Delete under the wallpaper (real — fixed), slot mods neutralised on Mix entry and
  on session restore, AGE clipboard comment.

Open / owner calls:
- B8 carve "{n} kept · undo" button clears rather than undoes (no carve history) — relabel "clear"
  or build an undo stack.
- Reseed glyph (the traced Noise hump) may read as a chevron; Reset all includes Noise Frequency +
  Targets; lossy note on every reducing format; split-mode key ownership by last click.
- Feedback screenshot needs the backend to take typed / multiple attachments.
- `credits_cptcity.json` is referenced by About but absent — the cpt-city attribution obligation is
  not met yet. Release-relevant.
- GX_VERSION placeholder `2.0.0-preview`; help + What's New copy is a first draft for owner rewrite.

### Owner review of the end-of-session status — 2026-09-13

- **Hints:** GX has none — hide Show Hints / the H key / hint mentions in GX. → in progress.
- Help + What's New wording OK for now (another pass later). `2.0.0-preview` is where GX versioning starts.
  About credit line OK.
- **Legal:** clarify what the catalogue licences require (cpt-city credits file missing). → research
  in progress, output `plans/palette-catalogue-licensing.md`.
- **Feedback screenshot:** a JPEG inside the JSON attachment fits the 200 KB contract; choosing it
  replaces the gradient. → in progress.
- **B8:** carve button "undo" → "clear". → in progress.
- **Adjust face rework:** Targets row overflows the panel at narrow window widths; Reseed becomes a
  TEXT button; the face gets another row or two; Repeats → **Scale**, continuous ("free"); mirror
  options; a Lightness control in the first column. → in progress.
- **Apply / Cancel replace Reset all.** The destructive paradigm (with undo): every application BAKES
  a new state and starts fresh — Apply bakes + resets the dials, Cancel discards. "Reset all" was the
  old parametric paradigm. → in progress.
- Lossy note on every reducing format: OK. Split-mode key ownership by last click: OK.
