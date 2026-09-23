# GX first release — what the plans wanted and did not ship

> 2026-09-16. Built from a three-agent sweep of every Gradient Explorer plan, each claim checked
> against code and `git log` (plans go stale; code is truth). Owner decisions from
> `plans/ge-v2-parity-checklist.md` (2026-09-13) and `plans/pre-release-ui-pass.md` are not
> re-listed as gaps. This file is the working list: tick items here, don't edit the source plans.

Sources swept: `ge-v2-unified-shell-plan.md` (+ `ge-v2-figma/*`), `ge-v2-parity-checklist.md`,
`pre-release-ui-pass.md`, `ge-v2-old-shell-migration-audit.md`, `ge-v2-functionality.md`,
`ge-v2-design.md`, `gradient-explorer-next-session-handoff.md`, `fullscreen-v2-rescope.md`,
`ge-v2-research/*`, `gradient-explorer-amendments-plan.md`, `gradient-explorer-polish-findings.md`,
`gradient-ramp-backbone.md`, `gradient-file-format.md`, `ge-ramp-analysis-and-deep-fit.md`,
`palette-catalogue-licensing.md`, `palette-studio-port-plan.md`, `gx-geometry-handles-v2.md`,
`gx-live-fractal-coloring-scope.md`.

## 1. Release work (no owner decision needed)

- [x] **Entry-point swap — MERGED 2026-09-23 (`79b88b16`)** after the owner's walk; ADR-0125 (the alias) + updates to ADR-0014 / ADR-0121 (`f79865d0`). Originally prepared on branch `gx-entry-swap` (worktree
  `.claude/worktrees/agent-a0cf40a624c1fd8bf`, based on `39f2e74b`). Six commits:
  `gradient-explorer.html` loads v2; `gradient-explorer-next.html` is a byte-identical alias
  (guard `test:gx-share` [4]) so old `?g=` links keep working, new links are written on the
  canonical page; "(next)" and the badge gone; smokes repointed (`smoke:mobile-layout` KEPT —
  `ge-phone` doesn't cover `isDeviceMobile` or the 768 px listener); citations fixed; old shell
  deleted (21 files, 3,232 lines, `orphans` clean; `PickerStage`, `fractalHandoff`,
  `FullscreenGradientOverlay`, `fullscreen/**` kept); draft What's New copy for GX and GMT under
  "Unreleased"; `context:map`. Merging into today's main conflicts only in `package.json`
  scripts. Owed before merge: owner review + final walk, `GX_VERSION`, the landing-page link
  (separate repo), the ADR text in §6, and a `context:map` re-run after the merge.
- [x] **Label sweep** "Favients" → "My Gradients" — `4ccd2674` (+ `panelLabel(id)` seam in
  `engine/PanelManifest.ts` for dock tabs / floating titles) and `39f2e74b`.
- [ ] **`/polish` pass** on the v2 shell — not run: its output is UX judgement for the owner's eyes.
- [x] **Recent auto-collect ADR** — ADR-0124 (`76f36007`), owner-approved.
- [x] **ADR-0112 (Variants) update block** — `b37c095f`.
- [x] **What's New showed "> OWNER REVIEW — first draft."** and stale counts — `e9fb88b0`
  (10,509 on a computer, 2,952 on a phone).
- [ ] Credit the preset seeds — **needs the owner** (licensing §6 action 6 frames it as "credit or
  re-derive"). Found 2026-09-16: six of the 20 seeds are exact CARTOColors palettes (CC BY 4.0):
  Spectrum = Prism, Warm Sunset = SunsetDark, Cool Forest = Emrld, Pastel Dreams = TealRose,
  Spring Floral = Temps, Earth Tones = Fall. Turbo is © 2019 Google LLC (Apache-2.0); the
  non-seed "Rainbow Divergent" is ColorBrewer Spectral (Apache-2.0). Draft: a "Built-in presets"
  credit line in `AboutGx.tsx` + source/licence beside each entry in the bake script's `SOURCES`.
- [x] Terms line in `CONTRIBUTE_CONFIRM` — `12a40d43` ("You confirm you have the right to share this.", the plan's §5 wording).
- [x] `public/palette/gxglobal.json` fallback refitted — `edf5319e` (the CDN has no copy; nothing to upload).
- [x] Download filenames keep spaces / non-ASCII — `38534e11`; set .zip members too, and import restores the names — `a2773563`.
- [x] A GX gradient file dropped on GMT (or picked in Load Scene) imports into My Gradients — `f53e61e3` (generic `engine/plugins/SceneFileClaims.ts`). Still open: bare `{stops}` / colour-list / token / GX Global JSON and `.gxsession.json` still reach the scene loader; the loading screen's "Load From File…" and the "Drop to load scene" overlay text are unchanged.
- [x] A selected stop surviving a gradient swap — `d35ec179`.
- [x] Export row Copy ticks instead of toasting — `38534e11`.
- [ ] Kept heart gold — skipped: the plan says the gold token is "still owed"; no colour named.
- [x] Dead `FavientsPanel layout="strip"` — `4a679cc0`.
- [x] Stale `setLossyCount` JSDoc — `38534e11`.
- [x] Meta description on `gradient-explorer-next.html` — `1b116cb4` (copy for the owner's eye).
- [x] `smoke:chrome` — `717efba9` (182 presses, 7 passes, falsified on the Settings hook bug).
- [x] Browser guard for the Curves wave tool — `smoke:ge-wave`, `0f9cc34e`.
- [ ] Library "Steps" palettes arrive smooth — needs a bake with a discrete flag and a CDN re-upload (owner-run). Not started.

### Bugs found and fixed along the way (2026-09-16)
- Recent: a gradient re-picked from an earlier day overwrote its original entry; a quick ♥ flashed Today — `9721cdda`. A merge import showed one day twice on the rail — `ac9f429c`.
- Curves wave tool (found by `smoke:ge-wave`): Esc baked instead of discarding on a desk; undo after closing the face landed on the unbaked preview (nested `beginParamTransaction` overwrote the snapshot); span/feather/phase handles lagged the pointer (77.5 px per 96); the axes stayed in HSV after leaving the face — `dc71bd28`, `fa3e31ed`, `2ed960c5`.
- A Recent sync inside an open undo bracket put a My-Gradients-only entry into a cancelled wave (and any gesture held past 400 ms) — `34706e77`.
- Found, not fixed: the first-run "New here?" banner covers app-gmt's top bar at 1400×900 (`@bug PRODUCTION` in `FirstRunHint.tsx`, `e9f0074f`); the light-gizmo button (`engine-gmt/topbar/CenterHUD.tsx`) and the Support menu's photo button have no label.

## 2. Decisions owed by the owner

1. ~~Merge the swap?~~ **Done 2026-09-23** — walked by the owner (GMT and Fluid Toy openers, old links), merged `79b88b16`.
   The alias for `gradient-explorer-next.html` is built in, as recommended.
2. ~~Liquify~~ **Owner 2026-09-23: ships as is**, `wip: true` banner and all.
3. ~~Group-by shape~~ **After this release** (recommended 2026-09-23, not objected to): new work, never in a release queue.
4. **Parity rows without a decision:** theme chips (B3), new gradient from nothing (M10), export
   text preview (O4), drop overlay / "reading image…" (M8), "N stops" readout (E10b), landing
   morph (N2), Mix past 0..1 (M5); M11, B13, B7 unrecorded.
5. ~~Name~~ **Owner 2026-09-23: keep "Gradient Explorer"** — a casual open-source release on gmt-fractals.com, not marketed; revisit only if it gets traction.
6. ~~Version~~ **Owner 2026-09-23: 2.0.0**, a number to start versioning on, not marketed — `d56a341f`.
7. **Licensing — owner 2026-09-23: the minimum for a casual open-source release.** Keep what is live (per-source credits, NC pack off by default, no-redistribute sets unshipped); ADD a preset credit line and a takedown/contact line in About; no legal review; share-alike and GPLv2-only data need no action beyond the credits already stating the licence. The original open items were: Softology families with unverified terms in the
   default pack (kuler 130, colorschemer 48, coolors 31); CC BY-SA share-alike on edits/exports
   (cpt-city 80, unikn 16); GPLv2-only sets and possible GFDL (Nevit Dilmen 886); legal review of
   §7's 12 questions or ship on the recorded good-faith position; close §7 q11 (git history).
8. **Smaller calls:** set × swatches export always uses Even; export remembering the last format;
   export wording sign-off ("For GMT", "For other software", "GMT gradient"); a Recent entry
   resumed the next day keeps updating the entry filed under the earlier day; the meta
   description copy; where the first-run banner should sit.
9. **Owner-run actions:** delete test row id 5 (`#000000`→`#FFFFFF`) from the live GX Global set;
   CDN upload for any re-baked pack; push `main` (not pushed — see §5).

## 3. Consciously deferred (not gaps)

Reduce-stops popup / deep fit and the "N stops" readout · other filter axes and `facetsVersion` ·
grain (ceded) · mesh as a build (SEO wording only) · handles on stops (rejected) · `.grd` import ·
Copy/Paste gradient · Mix slot mods / slot A / resets · Snapshots/Variants UI, Arched, Parallax,
Sweep/ColorBox, timeline · PWA for GX-only visitors · phone backlog after Phase F (Liquify/Spline
touch, per-mode fractal fold, pinch guard, finger-sized handles, phone-first Curves, safe-area check
on hardware) · C.5 Mix UI and L10 wording (parked on owner) · favourite identity "Update vs Save as
new" (superseded by Recent) · per-tile provenance UI (owner: none) · GX Global refusing edited NC
copies (owner: not policing).

## 4. Plans that now overstate what is open

Parity checklist rows S3, S4, E8b, O5 and its bug list are done (0eb1f47a, 15f2c3d2, 5dba39dd) ·
licensing plan's "nothing uploaded" — credits files and packs are on the CDN (checked 2026-09-16) ·
June amendments W1, W3, W5–W8, W10, T8 all shipped in v2 · `slider-skin.md` "nothing implemented"
— built in `ScalarInput`'s soft branch · `gx-geometry-handles-v2.md` "in flight" — landed ·
design §5.8 formats (`.ase`, Tailwind, tokens) exist · pre-release-ui-pass §1–2 done ·
`ge-ramp-analysis-and-deep-fit.md` "Still open: gxglobal.json" — done `edf5319e` ·
`gradient-file-format.md` "Still open: download names" — done `38534e11` / `a2773563`.

## 5. Session log

- 2026-09-16 — `a2df1f3d` (pushed): every page carries `darkreader-lock`, so Firefox's website
  dark mode stops darkening CSS swatches against the canvas ramp. Found testing on an iPhone.
- 2026-09-16, unattended run — 25 commits on `main` from `e9fb88b0` to `34706e77`, **not pushed**;
  branch `gx-entry-swap` prepared, not merged. Closing check on a quiet tree at `34706e77`, all
  green: typecheck, check:text-bytes, check:rule-guards, orphans, build; test: palette-working,
  palette-favients, palette-shelf, gx-session, gradient-file, gradient-roundtrip,
  palette-exportsubjects, palette-licensing, scene-file-claims, gx-share, palette-wavegen,
  palette-curvespaces, gradient-rampmode; smoke: boot, ge-next, ge-hero, ge-tray, ge-ground,
  ge-wave, ge-phone, ge-session, ge-gradientfile, ge-uiundo, ge-livedrag, gmt-gradientdrop,
  chrome. (`smoke:ge-tray` goes red at random while other agents' edits hot-reload the page;
  it is green on a quiet tree, including the [14] the swap agent reported.)

## 6. ADR text queued for the owner (ADR writes need approval)

- **ADR-0124 update** — the bin pin now survives the first sync; merge/replace order Recent by day
  (`byDayNewestFirst`); Consequences' "bin pin" and "one day twice" fixed 2026-09-16 (guards
  test-palette-working [10]–[12], test-palette-favients [9]); Decision 7 narrowed: the debounce,
  Share and Wallpaper use `syncRecentOutsideUndo` and never sync inside an open param
  transaction; only the ♥ and entering Mix sync directly.
- **ADR-0119 §2 update** — the ♥ does not "add to Recent": `add()` files into the last group used,
  else Kept; bins are left out of the flash because the ♥ flushes the Recent sync first.
- **ADR-0123 update** — GMT's scene drop zone and both Load Scene rows now route gradient files
  through `takeFromSceneLoader` via `engine/plugins/SceneFileClaims.ts` (`f53e61e3`); list the
  JSON cases still reaching the scene loader.
- **If `gx-entry-swap` merges:** ADR-0014 update (`GradientExplorerApp.tsx` deleted;
  `v2/GradientExplorerV2App.tsx` takes its place in the five-host claim, grep `storeCallbacks`);
  ADR-0121 update (old shell `gradient-explorer/main.tsx` deleted); new ADR "The preview address is
  a permanent alias" (`-next.html` identical to the canonical page, guard `test:gx-share` [4], new
  links on the canonical page, retire only when share-link traffic is gone).
