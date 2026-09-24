# GX polish pass — brief for the next session

> Written 2026-09-24, at the end of the session that merged the entry-point swap and built the
> 2.0.0 features. The owner chose to run `/polish` in a fresh session, with them present.
> Read this, then `plans/gx-first-release-gaps.md` (the release list), then start.

## Where things stand

- `main` holds the whole 2.0.0 release, **not pushed** (the owner pushes when everything is
  done — a push deploys at once and can crash a user mid-session on the old build; see memory
  `project_push_interrupts_live_users`). The GMT release commit (`0.9.8.5`, date,
  `docs/releases/0.9.8.5.md` in the owner's words, `package.json` + lock) is still to be made
  at push time; GX is already `2.0.0` (`gradient-explorer/v2/version.ts`). Both What's New
  entries are in the owner's words.
- `gradient-explorer.html` is the v2 shell; `gradient-explorer-next.html` is its permanent alias
  (ADR-0125). The first shell is deleted.
- New this week, all guarded: Reduce stops (ADR-0127, `smoke:ge-reduce`), New Gradient, the drop
  hint and "reading image…", the export text preview, the GMT ↔ Explorer trip (ADR-0126,
  `smoke:gmt-gx-handoff`), picks starting Adjust / Curves fresh, an untouched Curves visit leaving
  the gradient alone, curve edits surviving undo, `smoke:chrome`, `smoke:ge-wave`.

## What the pass should cover

The v2 shell at `http://localhost:3400/gradient-explorer.html` (dev server: `.claude/launch.json`
entry `gmt-dev`), **desktop and phone** (the phone layout is a real product surface — ADR-0115).
Suggested order, most-used first: the hero card (name row, palette row, ramp, ☰ menu, tray tabs) →
the four faces and the stop inspector → the wall, set rail and Filters → Export → Wallpaper →
Settings / Help / About → the empty state and first run. Include the GMT ↔ Explorer trip and
GMT's gradient editor only where they touch the Explorer.

Run `/polish` in its default mode (review → triage into Act / Ask / Avoid → apply the clear
ones, ask the rest). It fans out many agents: keep to 2–3 at a time (memory
`feedback_agent_pacing_5hr_cap`), and queue any ADR writes for the end (they need the owner's
approval prompt — memory `feedback_adr_writes_need_owner`).

## The owner's standing UI preferences (memory files — read before judging anything)

- `feedback_ui_no_claims_preview_instead` — option labels are names only; preview on hover, act on click.
- `feedback_ui_surface_design` — no backdrop-click close; prefer dockable panels.
- `feedback_master_components_no_parallels` — improve the master component, never build a parallel one.
- `feedback_no_forced_choice_for_design` — open design questions in prose, not multiple choice.
- `feedback_ui_mock_measure_dont_eyeball` — measure, don't eyeball.
- `feedback_visual_smokes` — the owner does visual judgement; no screenshot-diff smokes.
- `project_zindex_layer_system` — `<Layer tier>`, never raw `z-[N]` (ADR-0082).
- From the GE v2 memory (`project_ge_v2`): switches use the joined `Segmented` look; on a phone a
  multi-option switch becomes one cycling button; controls that are not controls do not belong in
  a toolbar; a handle must not move while another is dragged.
- Changelog / copy style: `feedback_changelog_style` — plain language, real numbers.

## Known issues to feed in (found, not fixed)

- **Phone hero, "N stops":** one agent saw the new stop count push the hero's tab row onto a
  second line on a phone; the agent that built it measured one line and a 215 px hero. Measure
  at 360, 390 and 412 px wide.
- **Palette swatches swallow file drops:** `PaletteRow`'s drop handler stops every drop, so a file
  dropped on a swatch is silently lost.
- **Kept heart** still uses `text-warn`; a gold token is owed and has no colour yet.
- **Landing / cancel morph** (parity N2) — the notes call it "the cheapest polish left"; the first
  shell's `GradientLandingLayer` is recoverable with `git show 39f2e74b:gradient-explorer/GradientLandingLayer.tsx`.
- **Small open calls** (`plans/gx-first-release-gaps.md` §2 item 8): set × swatches export always
  Even; Export remembering the last format; export wording sign-off; the meta description copy.
- **Undo edges still not carrying `tracksEdited`:** a scene / session load and `returnToSource` /
  `cancelLive` (ADR-0111, 2026-09-24 block).
- **Recent:** an entry resumed the next day keeps updating the entry filed under the earlier day
  (owner decision pending).
- **GMT side, for completeness:** the first-run "New here?" banner covers app-gmt's top bar at
  1400×900 (`@bug PRODUCTION` in `engine-gmt/components/FirstRunHint.tsx`); the light-gizmo button
  and the Support menu's photo button have no label; the scene drop overlay still says "Drop to
  load scene" although gradient files are now taken; bare `{stops}` / colour-list / token JSON
  still reach the scene loader (ADR-0123 2026-09-16 block).
- **Needs the owner, not code:** Library "Steps" palettes arriving smooth (a bake with a discrete
  flag plus a CDN re-upload); deleting the test row id 5 from the live GX Global set.

## Undo calls for the owner (from the 2026-09-24 undo/interface audit, `134df14b`)

The interface now rides every undo entry (ADR-0120, 2026-09-24 block). Six things the audit left
for the owner rather than guessing:
1. Undo now reopens a face you closed AFTER the edit (edit a stop, Esc, Ctrl+Z → the inspector
   opens on that stop). ADR-0120 predicts it — confirm it feels right.
2. A peek into Curves closed untouched leaves one undo step that shows nothing (already true
   before). Should a peek leave no step at all?
3. Which set the wall shows is not restored: undoing an import that switched the wall to Kept
   leaves Kept showing. Should it be?
4. Choosing any item in the hero's ☰ menu drops the stop selection before the item runs, so undoing
   New Gradient returns with the inspector closed — likely the click falling through to the
   editor's marquee.
5. Changing the colour space in the Export window while editing is not its own undo step, and the
   next unrelated Ctrl+Z quietly reverts it.
6. Loading a session file that holds a live Mix or Image does not open that face.

## Checks to run after the pass

On a quiet tree (browser smokes go red at random while files are being edited — HMR reloads the
page mid-run; re-run a red that looks unrelated before believing it):
`npm run typecheck`, `check:text-bytes`, `check:rule-guards`, `orphans`, `build`, the palette node
tests, and the smokes `boot`, `ge-next`, `ge-hero`, `ge-tray`, `ge-ground`, `ge-wave`, `ge-reduce`,
`ge-phone`, `ge-session`, `ge-gradientfile`, `ge-uiundo`, `ge-livedrag`, `gmt-gradientdrop`,
`gmt-gx-handoff`, `chrome`. A smoke that imports a store module in the page must import it at the
exact URL the page loaded (see `debug/smoke-ge-hero.mts` step [9]).
