# Deep zoom - the prototype's removal: the table it starts from

Written 2026-10-11 (night) from a read-only survey; nothing was run and nothing deleted. This is the
table `NEXT.md` session 5 asks for: "every step of the prototype's smoke against the shell step that
covers it. Nothing is deleted until that table has no empty row." Not established: whether
`smoke:deep-zoom-prototype` still passes today.

## What would go: 8,860 lines in 17 tracked files

| What | Lines |
|---|---|
| `deep-zoom-prototype/` root (DeepZoomApp, bridge, store, main) | 748 |
| `deep-zoom-prototype/ui/` (RecordPanel 918, DepthGauge 657, LocationsPanel 612, LookPanel 336, TopBar 331, HelpPanel 300, Onboarding 277, kit 222, starters 71) | 3,724 |
| `public/deep-zoom-prototype-core/index.html` (260 KB; it is in a build's service-worker precache today) | 3,977 |
| `debug/smoke-deep-zoom-prototype.mts` | 304 |
| `scripts/sync-deep-zoom-prototype-core.mjs` | 82 |
| `deep-zoom-prototype.html` | 25 |

Plus about 6 config lines. Nothing outside the prototype imports it.

## The table: `debug/smoke-deep-zoom-prototype.mts` against the shell

| # | Prototype check | Shell coverage | State |
|---|---|---|---|
| 1 | shell connected to the core | stage 1 "host.ready resolves inside 120 s"; `smoke:chrome` row `deep-zoom` | covered |
| 1b | first run shows the guide | none: no tutorial yet (`deep-zoom/main.tsx`: "Session, tutorial and What's New: later stages") | **EMPTY** (session 4) |
| 2a-e | telemetry ready, depth, frame size, fps, two samples | stage 1 (frame size is printed, not asserted; stage 2 asserts the chip's text) | covered; 2c partial |
| 3 | `setDetail(3)` reads back | stage 2 "drag the Detail slider ...", stage 4, `check:deep-zoom-param-map` | covered, stronger |
| 4 | thumbnail is not black | stage 2 "the deep path is the picture at every depth", stage 3 "Alt+S saves a PNG" | covered |
| 5a | the top bar has buttons | stage 1; `smoke:chrome` presses them | covered |
| 5b | Locations panel opens and draws | stage 3 "the Locations tab shows the six starter dives" (a dock tab now) | covered |
| 5c | Record panel opens and draws | DROPPED (`ROUTES.md` "What goes from the old plan"; DECISIONS K11). Its replacement, the Route tab, is opened by NO smoke step | dropped; replacement untested in a browser |
| 5d | Look panel | stage 2 "the four dock tabs exist ..." | covered |
| 5e | Help panel opens and draws | none: the shell has only the "?" menu | **EMPTY** (session 4) |
| 5f, 7h | Escape closes a panel | no such behaviour: panels are dock tabs. No line records it as dropped | no explicit drop line |
| 6a | Locations lists starter dives | stage 3 step 1 | covered |
| 6b | the 1e-6 dive lands within a decade | stage 3 (the 1e-30 card, by rays), stage 2, `module-host` "dive:" lines | covered, tighter |
| 6c | the panel reports arrival | the shell says it in a toast; no test reads it | partial |
| 7a | "Save this view" adds a bookmark | stage 3 asserts the button exists and saves with the B key; the button is never clicked | partial |
| 7b-e | bookmarks persist, carry a thumbnail, restore exactly, B saves | stage 3 "B saves a location ...", stage 1 "camera strings ... come back byte-identical" | covered, stronger |
| 7f | the 2 key opens Record | DROPPED (DECISIONS D3: the panel digits are gone; digits are location slots) | dropped, cited |
| 7g | the / key opens Help | none (`deep-zoom/hotkeys.ts`: "Not here yet") | **EMPTY** (session 4) |
| 8a | Record starts and stops | DROPPED: the module's recorder is gone (`ROUTES.md` R7a; K11 "the trail is the record button"). Replacement `deep-zoom/trail.ts`: `check:deep-zoom-trail`, node, fake host | dropped; replacement by node check only |
| 8b | the flight landed in the store | `routeFromTrail`, `setKeyframe`: the trail check's "route:" / "exact:" groups, the route check's "set:" lines | node check only |
| 8c | Preview plays the flight | `playRoute` / `playLeg`: the route check's "play:" lines | node check only |
| 9a | an 8-frame render finished | the ZIP is DROPPED (K16). Replacement `runRouteRender`: NO standing test renders a real frame (fakes in `module-host`, the route check, `test:frame-folder`; the real-GPU proofs were scratch runs) | **EMPTY** as a real render |
| 9b | the top bar showed frame progress | progress is in the render dialog now, untested; no line drops the top-bar readout | **EMPTY** |
| 10a-b | no error boundary, no page error | `smoke:chrome`; stage 1; the runner fails any page or console error | covered, stricter |

## What blocks the deletion

Empty rows:
1. **1b, 5e, 7g**: the first-run guide, the Help panel, the `/` key. Not built; all three close with
   `NEXT.md` session 4, which is ordered before this one.
2. **9a**: a real render finishing. The feature exists; only fakes and git-ignored scratch runs stand
   behind it.
3. **9b**: render progress readable while it runs. It exists in the dialog, untested.

For the owner to rule on:
- **The route, the trail and Play have no browser step** (rows 5c, 8a to 8c): proven by
  `check:deep-zoom-route` and `check:deep-zoom-trail` on a fake host and by scratch runs of the real
  app. He declined new smoke steps twice; filling 9a, 9b or these means his word.
- **"Escape closes a panel"** (5f, 7h) has no drop line; it follows from panels being dock tabs.
- The partial rows: 2c, 6c, 7a.

## What the prototype has that the shell does not (outside its smoke)

No drop is recorded for these; a user of the prototype would miss them:
- **Still export at a chosen size and samples** (16384 px, 256 samples, the X key). The shell has only
  Alt+S / File > Save Scene at the drawn size.
- **Export all / Import of locations as JSON** (`NEXT.md` session 10). A prototype
  `deep-zoom-locations.json` cannot be brought into the shell's list.
- **Load path / Save path**: no importer; a scene file carries the route instead.
- **Length typed as seconds or m:ss, or as a decades-a-second rate.** The timeline's length is in
  frames; the Route tab has "As flown" and "Even pace" at a fixed 0.5.
- **The curve drawing of the Record panel** (depth against time, stalls shaded, live while
  recording). Nearest: the graph editor on the Depth track and the pace line.
- Help topics and "Show the intro again"; paste through a text box (the shell reads the clipboard);
  per-row "Copy", "Dive from here"; Detail buttons 1 / 8 / 32 with a cost line; "Reset look" and
  "Reset formula"; saved places and "deepest today" on the depth scale; a top-bar state chip (FLY /
  DIVE / REC / PLAY / RENDER) with Cancel; a render size above 3840 px (the prototype allowed 7680);
  the 9 / 0 palette keys.

Of the Record panel's four things `ROUTES.md` called "worth lifting": the estimate and the ffmpeg
line are in the shell (`EstimateRow`, `ffmpegLine` in `deep-zoom/routeRender.tsx`); the curve
drawing and the length parsing are not.

## Who still references the prototype (what changes when it goes)

- `package.json`: the scripts `smoke:deep-zoom-prototype` and `sync:deep-zoom-prototype-core`.
- `knip.json` (the entry), `tailwind.config.js` (the glob and its two comment lines),
  `vite.config.ts` (a comment; and the service worker's precache picks the page up by its glob).
- `deep-zoom-prototype.html`.
- `.claude/rules/sibling-apps.md`: the last sentence of the `deep-zoom/` row (an approval prompt).
- Provenance comments naming prototype paths: `deep-zoom/main.tsx`, `data/starters.ts`,
  `host/dive.ts`, `renderer/index.ts`, `debug/deep-zoom-smoke/stage1.mts`; and the stale "arrive
  with the Flight tab" in `deep-zoom/hotkeys.ts`.
- Plan text: BLUEPRINT section 11, BUILD-PLAN S7-1 (its acceptance still says "parity 47 of 47
  with the folder gone" and names a `stage7.mts` that does not exist: parity is retired, ADR-0137),
  DECISIONS K6, `NEXT.md`.
- STAYS: `readLegacy` in `deep-zoom/locations.ts` (it imports users' old bookmarks: their data).
- No reference in `launcher.html`, the `smoke:chrome` app list, `docs/**`, the ADRs or CLAUDE.md.
