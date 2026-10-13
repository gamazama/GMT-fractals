# Reconcile check: consistency (2026-10-08)

Checker pass over BLUEPRINT.md, BUILD-PLAN.md, ENGINE-GAPS.md, DECISIONS.md and GMT-SYSTEMS.md
against the owner's decisions D1 to D6 of this job's brief (K1 to K5 in DECISIONS.md) and against
each other. Documents only; nothing was run.

## What I read, and what I did not

- Read in full: DECISIONS.md; BUILD-PLAN.md lines 1 to 125 and 193 to 365, plus the id and "owns"
  column of every package row and rows S1-A, S2-2, S2-6, S2-9, S3-2, S3-6, S4-1, S6a-3, S7-1, S7-3;
  GMT-SYSTEMS.md sections 3.4, 4.5, 7, 8, 9, 10.
- By grep only (iframe, bridge, contentWindow, sync-deep-zoom-core, R-H, R1..R9, relay, embed,
  transport, kernel-perf, setHotkeys, `__name`, "page's own", captured, fly speed, 8.n): all five
  documents. BLUEPRINT.md was opened only at the lines those greps hit (28 to 50, 80, 81, 97, 223,
  398 to 406, 512 to 530, 557 to 663 by line head, 676 to 682, 717 to 748, 791 to 797).
  ENGINE-GAPS.md only at lines 11 to 19, 31, 75 to 98.
- Source opened: `debug/smoke-deep-zoom-parity.mts` (`historicalPath`), `deep-zoom/renderer/index.ts`
  (header lines 21 to 103 by grep). `deep-zoom/renderer/core.js` was grepped once for a download
  call and the pattern matched nothing; I did not look further, so finding 1 is a contradiction
  between the documents, not a statement about what core.js does.
- Not read: BLUEPRINT sections 3 to 6, 8, 10 and 12 end to end; GMT-SYSTEMS sections 1 to 6;
  every file under `research/` and `gmt-systems/`.

## Clean - checked and found consistent

- **No package edits the frozen page or waits on a page handle.** The grep for R-H, `R[0-9]`,
  kernel-perf, "page master", "added to the page" finds only the two sentences that say the old
  wording is gone (BUILD-PLAN "M packages" lead, DECISIONS K1). Every module package (M1 to M8, N4,
  L0) owns `deep-zoom/renderer/core.js`, `core.d.ts`, `index.ts`.
- **Nothing in the four shell documents is routed through an embedded page.** `contentWindow`,
  `postMessage`, `relay` (as a mechanism) and `iframe` have zero hits in BLUEPRINT, BUILD-PLAN,
  ENGINE-GAPS and DECISIONS. `bridge.ts` and `sync-deep-zoom-core` appear only in BLUEPRINT
  section 11 (the move table) and S1-A / S7-1, as files of the prototype.
- **Sizes agree.** Stage N: N0 0.5, N2 0.75, N0b 0.5, N3 1.25 (3.0 in engine and GMT), N4 0.75 to
  1.35, N5 1.75 - the same in BUILD-PLAN's table and GMT-SYSTEMS 3.4. Stage L: L-guard 1, L0 1.5,
  L1 1, L2 0.75 to 1, L3 2.5 to 3, L4 1.5 to 2.5, L6 0.5 to 1, L5 2 to 2.5 - the same in both; the
  GMT rows sum to 6.75 to 8.5 without L6 and 7.25 to 9.5 with it, which both documents round to
  "about 7 to 9.5".
- **The five answered items are recorded the same way in three places**: DECISIONS K4, the
  DECIDED marks on GMT-SYSTEMS 8.1, 8.2, 8.4, 8.7, 8.16, and BUILD-PLAN stage N / stage L leads
  (fly speed 0.01..8 default 3.6; drag-look; GMT shows no Surface; name "Surface" kept).
- **Flying and lighting after N5 and L5** are described as GMT's in BLUEPRINT's plugin rows (lines
  80, 81), BUILD-PLAN stage leads, and the N5 / L5 smoke rows. The interim (module loop, `dzLight`
  sliders) is stated as interim in each.
- **The parity proof survives stage 7.** `historicalPath()` in `debug/smoke-deep-zoom-parity.mts`
  falls back to `pinnedFile('index.html')` when `public/deep-zoom-core/index.html` is absent;
  S1-A owns the one path edit and S7-1 says the smoke then reads the pinned file.
- **No file is owned by two packages of one stage**, with the two exceptions in findings 7 and 8.
  Cross-stage repeats (`components/StatusChip.tsx` S1-2 then S2-5; `deep-zoom/flyGuard.ts` S2-6
  then S4-1 then deleted at N5; `features/colour.ts` S2-2 then S5-1; `deep-zoom/presetFields.ts`
  S3-2 then L5; `components/FlightStrip.tsx` S6a-2 then S6b-3; `tutorial/firstDive.ts` S4-3 then
  S6a-4) are in different stages.

## Findings

### 1. wrong - the stage 6a ZIP depends on a download that M6 and the host contract remove

- BLUEPRINT section 8, item 4 (line 525): "runs the page's own path render (the page downloads the
  ZIPs)". BUILD-PLAN S6a-3: "ZIP = the page's own path render".
- BLUEPRINT section 7 (line 406): "The host never downloads and never opens a dialog; the shell
  saves blobs." BUILD-PLAN M6, first in the module queue: "No download and no `alert` under
  `embed`". BLUEPRINT's option table has `embed: true` as the shell's setting.
- So once M6 lands, the route S6a-3 is built on has no way to deliver its file, and S6a-3 lists no
  module package under "Needs" (only S1-1).
- Fix: pick one and say it in both documents. Either M6 leaves the path render's ZIP download in
  place under `embed` and BLUEPRINT line 406 names that one exception, or the ZIP is handed to the
  shell as a blob (a module package in the queue, named in S6a-3's "Needs", and DECISIONS D11's
  "needs no module package" changes).

### 2. wrong - GMT-SYSTEMS says twelve items are open; DECISIONS closes one of them

- GMT-SYSTEMS section 8 update note: "the other twelve are open". Item 8.13 ("Who edits the module
  once the port lands (BUILD-PLAN D2 assumed the page master)") carries no mark.
- DECISIONS K2: "Also covers GMT-SYSTEMS 8.13 (who edits the module): the builders, one package at
  a time." The open table in DECISIONS lists eleven GMT-SYSTEMS items (8.3, 8.5, 8.15, 8.17, 8.6,
  8.9, 8.8, 8.10, 8.11, 8.12, 8.14), not twelve.
- The owner's D2 does answer the substance (core.js is edited directly). "The builders, one
  package at a time" is the architect's reading, not the owner's words.
- Fix: in GMT-SYSTEMS 8.13 add a one-line mark "answered by DECISIONS K2 (not one of the five
  numbered answers)", and change "the other twelve are open" to "eleven are open; 8.13 is covered
  by K2". 8.13's own text still cites "BUILD-PLAN D2", which is now DECISIONS D2, closed by K1.

### 3. wrong - GMT-SYSTEMS still uses the word reserved for the prototype, for the new shell's plan

- GMT-SYSTEMS 7.6: "both need the module transport, not the iframe." 7.7: "Stage N's N4 can still
  be proven on the iframe transport with handles that exist today (`__moveAlong`, `__lockInput`,
  `__smoothedDist`)". BUILD-PLAN N4 proves it with `debug/deep-zoom-checks/input-owner.mts` on the
  module and the parity smoke; there is no second transport.
- 7.1: "Stage 1 still flies on the page's loop" and "S4-1's fly-key relay is deleted". S4-1 in
  BUILD-PLAN has no relay ("No letter the module still reads (W A S D Q E) is registered"); what
  N5 deletes is `deep-zoom/flyGuard.ts`.
- 7.7: "BUILD-PLAN's R packages edit the page master on `kernel-perf`" - BUILD-PLAN has no R
  packages now.
- 3.4, N4 row: "Shell still flies on the page's loop until N5"; N5 row: "the page-loop interim is
  deleted". Section 8's update note tells the reader how to re-read section 7 only, not 3.4.
- Fix: rewrite 7.1, 7.6, 7.7 and the two 3.4 cells in place (module's own loop; no second
  transport; `flyGuard.ts` deleted at N5), or widen the section 8 note to name 3.4 and remove the
  two "iframe" sentences outright, since the brief forbids the word for anything but the prototype.

### 4. wrong - the bucket renderer: GMT-SYSTEMS 7.3 adds one in stage 6, the other three say not in v1

- GMT-SYSTEMS 7.3: "Add to stage 2 an `AccumulationController` adapter + `installPauseControls()`,
  and to stage 6 a bucket controller."
- BLUEPRINT plugin table (line 97): "BucketRender: not used in v1 - this renderer keeps its own
  tiled export". DECISIONS "Applied without asking": "the bucket renderer is not installed in v1.
  Taken from GMT-SYSTEMS 7.3". BUILD-PLAN has no bucket package in 6a or 6b.
- DECISIONS cites 7.3 for the opposite of what 7.3 says about stage 6, and files it under standing
  rules; the owner was not asked.
- Fix: either move it to the open table in DECISIONS ("bucket controller in stage 6: yes / not in
  v1; recommended not in v1") or mark 7.3's second half in GMT-SYSTEMS as not taken, with the reason.

### 5. missing - what replaces `isCaptured` after N5 has no owner

- BLUEPRINT section 7: "`isCaptured()` and `captureChanged` go at N5" (line 404), and the adapter
  table marks `isCaptured` "removed at N5" (line 478).
- BLUEPRINT section 10 still reads it: "Overlay fade while flying: widgets read
  `host.isCaptured()` through the telemetry store" (line 650) and the tutorial fires
  `actionBus.fire('dz.captured' ...)` (line 662).
- BUILD-PLAN N5 owns the shared set, `deep-zoom/navigation.ts`, `deep-zoom/hotkeys.ts` and the N5
  smoke. It does not own `tutorial/hostEvents.ts`, `tutorial/firstDive.ts`, `host/telemetry.ts` or
  the depth-instrument components that fade, and no step in its row says what "flying" means once
  nothing captures the mouse (GMT-SYSTEMS 3.2 e gives the hook "three activity edges").
- Fix: add to N5's "owns" and steps: the overlay fade and the tutorial's first step move from
  capture to the input hook's activity edges; name the files. Add one line to BLUEPRINT section 10.

### 6. weak - the ADR "Lights resolve against a view frame" is placed in three different packages

- BUILD-PLAN L4: "ADR ... written here". ENGINE-GAPS seam S3: "stage L, package L3". DECISIONS D8:
  "(packages L3, L4)".
- DECISIONS D8 also says the two ADRs were "decided with K4". The owner answered five numbered
  items; the ADRs follow from them but were not themselves answered.
- Fix: one package (L3 introduces the view frame, so L3, or say "drafted in L3, finished in L4" in
  all three), and reword D8 to "follow from K4".

### 7. weak - N0 and N0b own the same test file inside one stage

- BUILD-PLAN N0 owns "new node test under `debug/`"; N0b owns "N0's test extended". The rules
  section says of stages N and L: "they are strictly sequential inside their stage, so they share
  no file." They do share one; only the ordering makes it safe. N2 and N3 likewise both own
  `engine/plugins/navigation/`.
- Fix: reword the rule to "strictly sequential, so two packages never hold a file at the same
  time", or give N0b its own file.

### 8. weak - L5 and S3-2: the scene version stamp L5's migration needs is in no package row

- GMT-SYSTEMS 7.4: "the shell must stamp a scene version from its first saved file". BLUEPRINT
  line 174 and the file tree (line 680, `presetFields.ts` ... "the scene version stamp") carry it.
- BUILD-PLAN S3-2, which owns `deep-zoom/presetFields.ts`, lists `dzView`, the `dzInspect` reset
  and the document providers; no step writes the stamp and `scene-roundtrip.mts` does not assert
  it. L5 owns the same file later "(the migration)".
- Fix: add the stamp as a step of S3-2 and one assertion to `scene-roundtrip.mts`.

### 9. weak - a decision listed as open is written as a step

- BUILD-PLAN S2-2: "Colour uses GMT's mode numbers (0, 1, 5, 7, 8, 13) and GMT's `scale` /
  `offset` / `bias` names from the start ... (open: DECISIONS O3)". DECISIONS O3 is open, blocks
  S2-2, recommended yes. The step reads as settled with the open mark in a bracket at the end.
- Fix: state the step as conditional ("if O3 is yes: ...; if no: the module's own mode numbers")
  so a builder who starts stage 2 before the answer does not bake it into saved scenes.

### 10. weak - old ids and "the page" in rows the pass did not rewrite

- BLUEPRINT still says "page handle H4" / "H1" / "no page handle needed" at lines 88, 164, 520,
  525, 528; BUILD-PLAN calls them M4 and M1. BLUEPRINT line 42 gives the mapping, so this is not a
  contradiction, but a builder reading the RenderDialog row alone meets an id that exists nowhere
  else.
- DECISIONS has no such reading rule and says: D4 option B "the page's renderer would need the
  same sampler" (a change to the renderer, so it must mean the module); D11 "the page's own
  smooth-step timing"; D13 "The page gives defaults but no range".
- BUILD-PLAN smoke row 2: "every feature default equals the page's `host.bootParams()`"; S6a-1 and
  S6a-3: "the page's ease", "the page applies `easeInOut` itself".
- Fix: replace H1 / H4 with M1 / M4 at the five BLUEPRINT lines; in DECISIONS D4 B write "the
  module's renderer"; elsewhere the reading rules cover it.

### 11. weak - small differences between GMT-SYSTEMS and BUILD-PLAN for the same package

- N4: GMT-SYSTEMS 3.4 "`setYawPitch` or basis"; BUILD-PLAN `api.dz.setYawPitch(yaw, pitch)` only.
  That choice is GMT-SYSTEMS 8.3 (roll), which DECISIONS lists as open and says "sizes" N4. N4's
  row should say "if roll is off (8.3)".
- N4 handle name: GMT-SYSTEMS `rawDist`; BUILD-PLAN and BLUEPRINT `rawDistance()`.
- L5: GMT-SYSTEMS 4.5 "pack with its modulation map"; BUILD-PLAN "pack with an empty modulation
  map" (DECISIONS D12, open, recommended leave out).
- BUILD-PLAN stage 7 smoke maps the prototype's steps to "stages 1 to 6b" while the captured-mouse
  steps of stages 2 to 4 are rewritten at N5; the mapping table should name N5 as a possible home.
