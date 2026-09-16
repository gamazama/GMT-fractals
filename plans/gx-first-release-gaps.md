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

- [ ] **Entry-point swap.** `gradient-explorer.html` still loads the old shell; GMT
  (`openGradientExplorer` in `palette/installFavients.ts`), fluid-toy and the landing page open it.
  Steps: move v2's `<head>` + script onto `gradient-explorer.html`; drop "(next)" from the title
  and the `next` badge in `GradientExplorerV2App.tsx`; repoint old-page smokes
  (`smoke-gx-geom-handles`, `smoke-gx-liquify-render`, `smoke-mobile-layout` → `smoke:ge-phone`,
  the `smoke-gx-fractal*` family, `smoke-gx-nucleus-render`, seven `repro-gx-*.mts`); fix
  citations in `.claude/rules/` (deep-zoom, engine-plugins, mobile-layout, sibling-apps),
  `docs/modules/gradient-explorer/app.md`, `engine/plugins/TopBar.tsx`,
  `engine/components/AppErrorBoundary.tsx`, `knip.json`; delete the old shell but KEEP
  `PickerStage.tsx`, `fractalHandoff.ts`, `FullscreenGradientOverlay.tsx`, `fullscreen/**`
  (app-gmt uses them; migration audit §5.1 lists the 18 files knip orphans); GMT changelog line
  "not linked to GMT yet" (`data/help/topics/changelog.ts`); What's New for GX and GMT;
  `npm run context:map`; `check:rule-guards`; owner's final walk. Depends on decision 2.1.
- [ ] **Label sweep** "Favients" → "My Gradients" on the hosts that still show it:
  `app-gmt/PalettePickerOverlay.tsx`, `components/gradient/gradientActions.ts`,
  `palette/components/CanonicalHero.tsx`, `palette/components/GradientSourcePicker.tsx`,
  the toast in `palette/store/favientsDocument.ts`, `buildContactSheet`'s default title.
- [ ] **`/polish` pass** on the v2 shell (never run).
- [ ] **Recent auto-collect ADR** — ADR-0114 still says "Still owed".
- [ ] **ADR-0112 (Variants) update block** — `workingSession.ts` now uses
  `captureStudioSnapshot`/`applyStudioSnapshot`, so it can't all be deleted.
- [x] **What's New showed "> OWNER REVIEW — first draft."** and stale counts — fixed `e9fb88b0`.
- [ ] Credit the Spectrum seed (CARTOColors Prism, CC BY 4.0) and Turbo (Apache-2.0) — licensing §6 action 6.
- [ ] One-line terms statement in `CONTRIBUTE_CONFIRM` (`contributeToGlobal.ts`) — licensing §6 action 6.
- [ ] `public/palette/gxglobal.json` fallback still carries pre-refit preset stops.
- [ ] Download filenames lose spaces / non-ASCII (`slugName` in `exportActions.ts`) — `gradient-file-format.md` "Still open".
- [ ] A GX gradient PNG dropped on app-gmt's scene drop zone says "Couldn't read a scene" instead of importing.
- [ ] A selected stop can survive a gradient swap (`AdvancedGradientEditor.tsx`, `justEmittedRef` effect) — §8b item 9.
- [ ] Export row Copy toasts instead of ticking — §10 2026-09-09 second pass.
- [ ] Kept heart uses `text-warn`, wants its own gold — §10 Phase B closed.
- [ ] Dead `FavientsPanel layout="strip"` branch (~115 lines).
- [ ] Stale JSDoc on `setLossyCount` (`.ugr` exemption closed 2026-09-10).
- [ ] `gradient-explorer-next.html` has no meta description.
- [ ] Guards: `smoke:chrome` (click every top-bar button + menu item; pre-release-ui-pass §3) and a browser guard for the Curves wave tool (§10 2026-09-12 "Still missing").
- [ ] Library "Steps" palettes arrive smooth — needs a bake with a discrete flag and a CDN re-upload (trays-spec §13a). Upload is owner-run.

## 2. Decisions owed by the owner

1. **Keep `gradient-explorer-next.html` as an alias after the swap?** Every share link so far,
   `GX_GLOBAL_SOURCE.url` (`palette/store/globalSetStore.ts`) and GMT's changelog point at it.
   Recommendation: yes — a copy of the entry costs nothing and breaks no link.
2. **Liquify** — ship with `wip: true` banner, hide, or finish.
3. **Group-by shape** — in this release or after? Never placed in a release queue.
4. **Parity rows without a decision:** theme chips (B3), new gradient from nothing (M10), export
   text preview (O4), drop overlay / "reading image…" (M8), "N stops" readout (E10b), landing
   morph (N2), Mix past 0..1 (M5); M11, B13, B7 unrecorded.
5. **Name** — competitors §7 wants it settled before a standalone launch.
6. **Version** — `GX_VERSION = '2.0.0-preview.2'`; `version.ts` says replace before the swap.
7. **Licensing** — Softology families with unverified terms in the default pack (kuler 130,
   colorschemer 48, coolors 31); CC BY-SA share-alike on edits/exports (cpt-city 80, unikn 16);
   GPLv2-only sets and possible GFDL (Nevit Dilmen 886); legal review of §7's 12 questions or ship
   on the recorded good-faith position; close §7 q11 (git history) which memory says was decided.
8. **Smaller calls:** set × swatches export always uses Even; export remembering the last format;
   closing Curves with a wave armed bakes it while Esc discards; export wording sign-off
   ("For GMT", "For other software", "GMT gradient").
9. **Owner-run actions:** delete test row id 5 (`#000000`→`#FFFFFF`) from the live GX Global set;
   CDN upload for any re-baked pack.

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
design §5.8 formats (`.ase`, Tailwind, tokens) exist · pre-release-ui-pass §1–2 done.

## 5. Session log

- 2026-09-16 — `a2df1f3d` (pushed): every page carries `darkreader-lock`, so Firefox's website
  dark mode stops darkening CSS swatches against the canvas ramp. Found testing on an iPhone.
