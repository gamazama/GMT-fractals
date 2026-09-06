# gmt-engine — Session Handoff

**Location:** `h:/GMT/workspace-gmt/stable/` on `main` — THE working tree and the production checkout (Cloudflare Pages auto-deploys on push). The `dev/` split this header used to describe was retired 2026-06-17; see CLAUDE.md.
**Origin:** Forked from gmt-0.8.5 (was `h:/GMT/gmt-0.8.5/`); the engine extraction happened in the since-retired `dev/` tree.
**Status:** ✅ **GMT fully ported to the engine (2026-04-26).** All three apps boot. `app-gmt.html` is functionally equivalent to gmt-0.8.5: full worker renderer, path tracing, Orbit/Fly navigation, all 26 DDFS features, 42 formulas, all 10 manifest-driven panels, light gizmos, drawing tools, webcam overlay, state debugger, Formula Workshop, GMT loading screen, Share Link, save/load (PNG + GMF + JSON), Camera Manager, formula gallery. `npx tsc --noEmit` → 0 errors. **Mobile mode shipped 2026-05-01.** **True Area Lights shipped 2026-05-03.** **PT reflection quality (env MIS + IS + Sobol) shipped 2026-05-05** — see entry below.

**📋 2026-09-06 — Gradient Explorer v2: unified shell, Phase A (language primitives) built, walked and COMMITTED on `ge-v2`:**

The day's design pass produced the relationship map, five user runs, mock C (`plans/ge-v2-mock-c.html`: one ground · one hero · one shelf, no source tabs) and `plans/ge-v2-unified-shell-plan.md` (principles L1–L9 / V1–V8 / P1–P6, phases A–G, models and sessions, a per-phase "still missing" log in §10). Committed as `750bb445`. Phase A then landed uncommitted: six primitives in `gradient-explorer/v2/ui/` (Act · StateChip · Floating · ZoneLabel · Icon · bar.ts), the V8 gradient-bar classes on the shelf items, slots, bands, palette swatches and the hero ramp, filled meaning chips (live = `ok`, edited = `warn`, armed = new `--gx-armed` / Tailwind `gx-armed`), `AutoFeaturePanel` additive props `hints: 'inline'|'tooltip'|'none'` + `keyframes: boolean` (default = today), `QualityRangePad` `variant: 'row'` (label · gradient track · two readouts) opted into by the v2 Filters popover through `QualityRangePadConnected`, theme-chip counts outside the hue fill, the wall tool palette on stroke icons, and the fg-dim → fg-muted contrast pass across the v2 files. Four owner iterations followed the walk, all in the plan's §8: the hero name row became a HEADING BAR with the state inline (dot + text) instead of a floating pill; the colour picker (`palette/components/HueLightnessPad.tsx`, hue × lightness with a ranged box, click = a 15 % hue band or clear) is the MAIN narrower on the bar above the wall with the saturation strip under it painted toward the box's average colour; Filters is three inline rows (LOOK · ARRANGE · SOURCES), not a popover, because a popover covered the wall it narrows; theme chips and cool/warm are gone from v2; Softology + cpt-city load at boot (11,131 gradients); `GenericDropdown` gained `size: 'md'`; every v2 range selection draws the picker's white-hairline box. Gates: typecheck 0, `test:palette`, `smoke:ge-next`, `smoke:ui-primitives`, `smoke:engine-demo`, `smoke:boot` all green. **Phase A committed. Next:** Phase B (hero band: image slot · use cluster · L8 hero never unmounts · Back to GMT carrying `?g=`) in its own Opus 5 session per the plan's §6. What Phase A left is in the plan's §10.

**📋 2026-09-02 — Audit backlog: 15 "do later" items closed, main thread + three agents (ADR-free; all guard-backed):**

Seventeen commits on `main`, `a468ad6e`…`16445855`, unpushed at time of writing. Verdicts per item are in the CLOSED block under "Do later" in [`plans/overnight-audit/TRIAGE-2026-08-02.md`](./plans/overnight-audit/TRIAGE-2026-08-02.md). Nine new node-side guards, each falsified before its `@invariant` was written: `test:modular-parity`, `test:worklet-analysis`, `test:tick-registry`, `test:shortcuts-teardown`, `test:share-dictionary`, `smoke:export-watchdog`, plus `check:rule-guards` per-row scoping and `context:cost` glob expansion + loud zero.
- **Behaviour changes worth a visual pass:** Modular scenes with Scale / Twist / Bend / Smooth Union / Mix now read the values their sliders show (was: shifted slots); the Modular COMPILE button pulses only while the graph is stale; the Formula Workshop's V4 Preview/Import work on frags V3 cannot analyse (pick `Benesi/MengersmoothPolyhedra.frag` in Auto mode to check); a render throw shows the `AppErrorBoundary` page instead of a white screen; a stalled export frame fails after 60 s of worker silence instead of hanging. Later the same day: the Formula Workshop's browse pickers grey out catalog rows marked `recommended: 'none'` (21 shipped formulas, all parsing today) instead of hiding them; a failed shader compile shows a red dismissable pill.
- **30fps-with-audio (owner's pick, evening):** the drop shows with a plain audio file, so it is not the capture surface. Shipped: `?perf` probe (`engine-gmt/renderer/perfProbe.ts` — one line/s: focus, pointer-over-canvas, audio kind, rAF rate + gap p95, long tasks, ticks dispatched, frames delivered, pre-picks + latency; `window.__perfProbe.copy()`); live-modulation store publish throttled to 20 Hz in app-gmt (render path reads `getLiveModulationsNow()` per frame — measured 15.6 publishes/s under an LFO vs one per tick before); spectrum canvas on CPU raster + visibility-gated; deck poll writes only on change. **Owner to measure** with `?perf`: audio none / file / mic × focused / unfocused × pointer over / off canvas.
- **Session close (owner verdict on the audio drop):** enabling audio still drops the GPU consistently after the mitigations above. Next time this is picked up, the only true way is actual profiling — Chrome DevTools Performance with the GPU track, or a purpose-built tool; `?perf` cannot see GPU time. Recorded on the `@bug` at `connectSystemAudio`.
- **Next session (owner's plan): the Gradient Explorer** — make it a streamlined, worthwhile app in its own right. Start from [`plans/gradient-explorer-amendments-plan.md`](./plans/gradient-explorer-amendments-plan.md) (planning complete, Phase 0 never started), [`plans/gradient-explorer-next-session-handoff.md`](./plans/gradient-explorer-next-session-handoff.md) and [`plans/gradient-explorer-polish-findings.md`](./plans/gradient-explorer-polish-findings.md); the mobile follow-ups are in `feedback`/memory (`project_gradient_explorer_mobile_polish`). Guards for that area: `smoke:mobile-layout` (boots GE), `smoke:liquify`, `smoke:gx-handles`, `test:palette`.
- **Pacing lesson:** three concurrent agents burned the 5-hour cap in ~30 minutes and all three died mid-flight (two had their edits in, one had not started). Main thread, one item at a time, from then on — see `feedback_agent_pacing_5hr_cap`.
- **L2811 closed the same day** (`lastCompileFailed` + a sticky `failed` phase on the compile store + a dismissable red pill; `smoke:compile-failed`). A failed compile is now visible in-app. Tier 2 tooling landed the same day (smoke:all driver, catalog-drift guard, mobile-layout smoke, text-bytes check, palette seam + Favients guards), and the `@invariant → @assumption` sweep ran: 365 of 408 sites downgraded, 43 proven ones keep the tag. **Open next:** the decision-gated triage rows (B1/B2, L2604, L2090, L3016, L3098, L2581, L921, L511, L73) and the Tier 2 tooling (smoke:all driver, mobile-layout guard, frag catalog drift) and the `@invariant → @assumption` sweep.

**📋 2026-07-25 — Audio modulation overhaul: worklet analysis, Hz bands, latency (ADRs 0104–0110):**

44 commits, unpushed. Started as a research question ("cutting-edge audio→frequency methods"), shipped as the 0.9.8.1 release (this line used to say 0.9.9 and cite a `docs/releases/0.9.9.md` that was never written). Notes in [`docs/releases/0.9.8.1.md`](./docs/releases/0.9.8.1.md); in-app entry prepended to `data/help/topics/changelog.ts`.

- **Analysis runs in an AudioWorklet** (ADR-0110). `AudioAnalysisEngine` split into `AudioTransport` (decks/capture/graph) + `WorkletAnalysis` (receiver), behind a facade so ~30 call sites did not churn. Pure DSP in `dsp/{fft,spectrumFrame,bandAnalyser,autoGain}` — node-testable, because audio-thread code cannot be stepped through and a glitch in it is audible. Band geometry in `bandMath.ts`, built independently on both threads from `(sampleRate, fftSize, bandsPerOctave)` so only VALUES cross the wire. `installAudioAnalysis()` at TICK_PHASE.SNAPSHOT.
  - The driver was NOT GPU load — owner-corrected. Rendering is in a worker; the main thread holds 60 regardless. **Corrected 2026-09-01:** the `fps < 20` branch in `GmtRendererTickDriver` (grep `lastYield`) does NOT throttle `runTicks` — `runTicks(clampedDelta)` is called on *both* sides of it, and the early `return` skips only what follows (optics merge, FOV sync, camera serialisation, `renderState` build, convergence gate, `proxy.sendRenderTick`). At UI fps < 20 the driver yields one WORKER DISPATCH per second; every registered tick, analysis included, keeps running once per frame. The starvation was real but the cause was that analysis was frame-rate-bound, not that ticks were throttled — see ADR-0110's 2026-07-27 update block.
  - `?worker&url` MUST stay a **dynamic** import — Vite-only transform; a static one kills every tsx suite that transitively reaches `WorkletAnalysis`.
- **Two A/Bs concluded, both against my proposal.** PCEN was implemented, measured and **rejected** (ADR-0105): per-band adaptive gain of any kind removes the spectrum's shape, and that shape is the signal. Fixed spectral **tilt** replaced it. The AnalyserNode arm of the worklet A/B was deleted after field confirmation — no fallback by design, since a silent downgrade hides the bug that caused it.
- **Rule bands stored in real Hz** (ADR-0106), migration v7 assuming a 48 kHz authoring rate so a share link decodes identically everywhere.
- **ADR-0103 half-reversed:** `modulation` no longer `holdsLiveSession`. The audio INPUT is equipment (kept across scene loads); the RULES are scene content (loaded from the scene). Update block on the ADR; `test-session-hold` [1][2][5] inverted.
- **Latency:** ~175 ms → ~105 ms at defaults. Envelope attack/decay/smoothing in `ModulationEngine` were per-FRAME with no `dt` — the same defect ADR-0110 removed upstream, re-smearing on the main thread what the audio thread had just preserved. Converted to time constants at the 60fps they were tuned at. **Response and Detail now share one latency budget** rather than compounding: the FFT window is itself a smoother, so its share is subtracted from Response's.
- **Dead-code sweep:** `FilterBank` had kept a full second copy of the bins→bands pipeline with zero production callers, tests pointing at it. 425 → 190 lines; tests re-aimed at the live implementation (`test:band-math` added).
- Suites: `fft`, `band-math`, `band-analyser`, `filterbank`, `audio-signal`, `session-hold` + the modulation gates. All green; typecheck 0; `smoke:boot` clean.

⚠ **OPEN, unconfirmed — GMT renders ~30fps focused, ~60fps unfocused** (owner-observed, visibly not just the counter, same resolution). 30 being exactly half of 60 points at frames missing the vsync deadline. Leading hypothesis: the cursor-anchored **hover pre-pick** in `engine-gmt/navigation/Navigation.tsx:585` fires a worker `readPixels` at near-mousemove rate with no time cap — a GPU sync point — and only while the cursor is over the canvas, which correlates with focus. **Test:** keep GMT focused and move the mouse OFF the canvas; if it jumps to 60 it is the pick, not focus. Second check: Orbit mode only (the effect early-returns otherwise). Not investigated further; no code touched.

**📋 2026-07-12 — Rotation semantics + CPU-derived rotation uniforms + canvas rotation gizmo (branch `feat/weave-core`, ADR-0099):**

Three-layer upgrade to how rotation params are declared, converted, and edited. ⚠ **Awaiting owner visual pass** (gizmo look/feel, MB3D degree display, ring-drag direction).
- **RotationDescriptor** (`engine/rotationDescriptor.ts`): explicit `{ kind, units, order }` on rotation params — `FractalParameter`, `ParamConfig`, `PackedParam` all carry it; legacy `mode` strings auto-derive via `rotationFromMode()`. MB3D type-6 rotations stamp `euler / deg / mb3d-xyz`; deg-native params keep their ±180 bounds (the ±2π radian override is gated off) and display via `nativeDegreesMapping` (identity + °).
- **CPU-derived rotation uniforms** (`rotationMath.ts` + UniformSchema bank `uMb3dRotM0..5`/`uMb3dRotSC0..5`/`uMb3dRot4D0..1` + `UniformManager.syncDerivedRotations` called from `FractalEngine.syncFrame`): MB3D angle options bind const offsets to bank elements; the in-shader `mb3dRot()` per-march-step matrix rebuild is DELETED. **Types 3/4 (single angles) and 12 (6-angle 4×4) are live-editable for the first time** (were bake-only; `getSlotOptionMeta` exposability updated). Specs ride `def.shader.derivedRotations` across the worker wire (capabilities pattern), renumber def-globally when weaving (`mb3dBankBody`), and round-trip GMF via `shaderMeta`.
- **Canvas rotation gizmo:** dumb SVG primitive `engine/components/gizmo/RotationGizmo.tsx` (rings/axis-arrow/angle-arc, imperative OVERLAY-tick update, oriented by display camera) + engine-gmt binding (`features/rotation_gizmo/` + `store/rotationGizmoStore.ts`). Toggled per-param from a new header icon on `Vector3Input` (pure prop pair; wired in FormulaParamsWidget for all formula/weave/MB3D rotation params). **Multiple gizmos** coexist, draggable pucks, × to dismiss; ring drags = screen-angle per-component edits through the normal setter path (one undo step per drag; camera blocked via the `gizmo` interaction source). Puck state is session-only — never serialized.
- Gates: typecheck 0, `smoke:boot` clean, `test:mb3d:weave` **318/318** (5 new assertions for derived specs/renumbering/bake fallback replace the 3 old `mb3dRot` ones).
- **Round-2 polish (owner first-pass feedback, same day):** rings split into bold FRONT arc + dim back arc with mild perspective foreshortening (`PERSPECTIVE = 0.22` in RotationGizmo.tsx) — kills the orthographic Necker-flip ambiguity; the dashed angle arc moved OUTSIDE the ring (r·1.18, protractor read); formula switch `closeAll()`s open gizmos (stale gizmos would edit unrelated lanes on the new formula).
- **Round-3 (owner second-pass):** axis arrow reworked to the HELIOTROPE design (`RotationHeliotrope.tsx` is the reference): azimuthal-equidistant tip mapping — centre = toward viewer, the ring = 90°, **beyond the ring = backside** up to 2R = 180°, fully invertible so the tip follows the cursor everywhere with no hemisphere lock; pseudo-3D cues ported (dashed stem, polygon head that grows 1.5× toward the viewer / squashes to 0.05 pointing away, cyan front / red back via a `--rg-axis-color` CSS var so hover and imperative writes don't race). Rings switched to **gimbal frames** (`computeFrames` in RotationGizmoOverlay: outer ring = identity frame, inner rings pick up the outer rotations per named Euler order) with **in-plane drag measurement** (invert the frozen ring basis's 2×2 screen projection; +θ along the drawn ring = +δ on the component by construction of the ringPaths parameterization) — each ring now turns like a wheel about the pole through it; near-edge-on rings fall back to screen-angle mode (|det| ≤ 0.08).
- Follow-ups: (a) migrate native `mode:'rotation'` formulas' `gmt_precalcRodrigues` input onto derived uniforms (Phase 4 of the plan — GLSL cost negligible, contract cleanliness); (b) gizmo icon for `AutoFeaturePanel` DDFS vec3 rotations (geometry pre/post/world) — same store, needs the toggle wired there; (c) MB3D `mb3d-xyz` ring-orientation handedness unverified visually (display-only; flip in `mb3dEulerDegToMat3Display` if rings read mirrored); (d) type-12 vec3 sliders carry no descriptor yet (plain numbers, no ° suffix).

**📋 2026-07-12 — In-app "What's New" changelog surface (branch `feat/weave-core`):**

Additive UI + content — a dated, version-grouped changelog reachable from Help → **What's New**, rendered as a help page. No render/emit risk.
- **Content home:** [`data/help/topics/changelog.ts`](./data/help/topics/changelog.ts) — one `HelpSection` (`changelog.whats-new`, category `"What's New"`), version-grouped newest-first, **12 releases 0.9.8 → 0.8.2**, normalized to release-notes voice. Version boundaries come from package.json bump commits (not Reddit announce dates — owner announces cumulatively), harvested via git log + memories + `docs/CHANGELOG_DEV.md` + the r/GMT_fractals archive: **0.9.6 = the engine rewrite** (its own entry, split from the 0.9.7 production go-live); **0.9.3** added (cursor-anchored orbit / deterministic playback); **0.8.8** folded into 0.8.9. **Adding a release: prepend a `## X.Y.Z` block at the top** (date via a `> ` line, `---` divider above the prior entry), sourced from `docs/releases/<version>.md` (the going-forward home), then bump the About version. The file's JSDoc spells this out. Registered in `topics-bundle.ts` — stays in the lazy help chunk, out of the main bundle.
- **Menu wiring:** `whatsNewMenuItem()` in [`app-gmt/HelpExtras.tsx`](./app-gmt/HelpExtras.tsx) (mirrors `feedbackMenuItem`, references the topic id as a literal so the lazy content isn't pulled into main), added to `installHelp({ extraItems })` in `main.tsx` so it sits next to About. A "What's New →" link + `v{version}` also live in the About body.
- **Unseen-update indicator:** a notification dot lights the topbar `?` anchor and the **What's New** item shows a `NEW` badge whenever `pkg.version` ≠ the localStorage `gmt.whatsNew.seenVersion` (first run counts as unseen → one-time nudge). Opening the changelog writes the version and clears both. Implemented as a **generic Menu-plugin seam** (not GMT logic in engine-core): `MenuDef.badge?` + `MenuButtonItem.badge?` getters, `menu.setBadge(id, getter)` (attach a dot to a menu another plugin registered) + `menu.refresh()`; the anchor dot + row `NEW`/highlight render in `engine/plugins/Menu.tsx`. GMT wires it in `HelpExtras.tsx` (`isWhatsNewUnseen`/`markWhatsNewSeen`) + `main.tsx` (`menu.setBadge('help', isWhatsNewUnseen)`).
- **Shared HelpBrowser extended (owner-approved):** new `"What's New"` category (`types/help.ts` union + `HelpBrowser` `CATEGORY_ORDER`, slotted 2nd so it doesn't displace Getting Started as `CATEGORY_ORDER[0]`, the default landing). Markdown parser gained `---` horizontal rules, `> ` muted asides (used for dates), and `` `code` `` inline spans — all generally reusable across topics.
- **Sources:** primary = the owner's r/GMT_fractals post archive (cached RSS); the June engine-era (0.9.6/0.9.7) reconstructed from git log + memories; 0.9.8 from `docs/releases/0.9.8.md`. Reddit tooling + data relocated tmp → `H:/GMT/stuff/reddit-changelog/` (raw feed, scrape scripts, `extract-milestones.cjs`, `milestones.txt`).
- Gates: typecheck 0, `smoke:boot` clean, `smoke:help-menu` green (shared Menu/HelpBrowser intact for fluid-toy — no badge, no dot), plus headless drive-checks confirming (a) Help → What's New opens `changelog.whats-new`, all 12 entries render, parser features emit (`<hr>` + inline `<code>`); and (b) the dot+`NEW` badge show when unseen, clear on open, persist across reload, and return when `seenVersion` is older — all with zero console errors. Path-scoped `git add` only (the 3 Julia3DLattes wiring files stay uncommitted).

**📋 2026-07-12 — Weave P4.6: animation transfer — keyframes/LFOs follow their formulas (branch `feat/weave-core`):**

The LAST pre-push weave item (ADR-0089 P4). Slot params live on position-keyed banks (`weave.ws<k>*`, ADR-0090) and rhythm timing on layer indices (`weave.weave*<k>`); structure edits permute those indices, and since 2026-07-05 the live VALUES follow each slot silently — but keyframe tracks and LFO targets stayed aimed at the old lanes. Now they move together.
- **Mechanism — mapping returned, not re-derived:** `mergeWeaveBanks`/`mergeDenseLanes` (the value-transfer fns) now emit the routing-string renames their claims imply; `loadUserWeave` returns them (`LoadMB3DResult.paramRenames`). New `engine-gmt/animation/retargetTracks.ts` applies them to BOTH stores — timeline `sequence.tracks` (+ `track.id` + selection ids; one `snapshot()` → undoable in the timeline's own per-scope history) and `engineStore.animations` LFO targets — as a **simultaneous permutation** with `_<axis>` vec-variant expansion. A stale occupant sitting on a rename destination (its slot was deleted) is displaced + counted, never left driving another formula's param. Values and tracks share one mapping by construction, so they cannot diverge.
- **Design amendment (owner-approved):** auto-transfer + post-Build report instead of the §4 sketch's prompt — values already follow silently, so "don't move keyframes" would produce a broken half-state. The interactive choice is reserved for **orphans** (tracks/LFOs targeting `weave.ws*` params the rebuilt def no longer exposes — deleted/replaced slots, baked-away options): amber inline bar with one-click "Remove / Keep". The report survives the panel pane's `key={formula}` remount via a module-scoped relay (the draft-cache pattern).
- **Rhythm timing transfers LIVE:** `syncRhythm` renames `weave.weave{Interval,StartIter,Beats}<k>` tracks at the same moment it permutes the values (reorder / add / remove / iterations-crossing-0 / make-base). Seq↔Rhythm conversions stay warn-only (a fitted decomposition isn't transferable).
- **Detection fixed:** the old reorder warn scanned only engineStore LFOs — real keyframe tracks (separate animation store) were never checked. `hasRhythmTracks` now scans both; the pre-emptive warn banner is retired (nothing shifts until Build; the Build reports).
- Gates: typecheck 0, `test:mb3d` 24/24, `test:mb3d:weave` **313/313** (+22 P4.6: mapping cases, applier swap/displacement/orphans, and the acceptance chain — a keyframed slot param's track and live value land on the SAME lane post-reorder), `smoke:boot` clean. No emit/GLSL change → byte-identity untouched, no cert exposure. NOT pushed (v1+weave ship together; the MB3D-banks re-cert from 2026-07-11 is still owed before push).
- **USER-VERIFIED (visual pass OK) + follow-up fix `da964185`:** the Live-timing slider block used to gate on `!dirty` — the first transient row move of a drag collapsed it and re-heighted every layer row (panel shifted under the captured pointer), and a timing control edited while dirty drove the OLD build's slot at that layer (the layer↔slot binding is compiled). Now the block stays MOUNTED for any built rhythm weave, DISABLED while dirty ("Build to re-link" hint, zero-height), and rows keep the compact timing line (steppers only pre-first-Build). Known residual (pre-existing, 2026-07-09 follow-slot design): `syncRhythm` permutes live timing VALUES at edit time, so the render's rhythm matches neither old nor new intent until Build — full deferral would be a draft-overlay refactor, noted as a follow-up option.

**📋 2026-07-12 — Capability-protocol P8 endgame: legacy shader booleans retired (branch `feat/weave-core`):**

Completed the sunsetting step ADR-0059/P8 left at "@deprecated". `shader.{selfContainedSDE, usesSharedRotation, supportsCuttingPlane, supportsDifs}` are DELETED from `FractalDefinition` (30 declarations across 20 formula files + V3/V4 emit + MB3D fused emit); every runtime consumer reads capability tokens (`core_math` SKIP_PRE_BAILOUT gate, geometry burning gate, estimator `disabledIf`s, mesh-export UI, weave resolver/catalog dual-reads collapsed). See the ADR-0059 update block.
- **New 9th token `estimator:difs`** (ADR amendment) replaces `supportsDifs` — fixes a real data-loss bug: the boolean was never stashed in GMF shaderMeta, so saved MB3D dIFS scenes silently reloaded onto a Linear estimator. `parseGMF` now has a `g_difsDE` auto-detect (mirroring cp_*) that retroactively rescues already-saved files.
- **GMF boundary = promotion point.** `generateGMF` stashes `capabilities` + `preambleVars` only; `parseGMF` unions stashed tokens with promoted legacy booleans + cp_*/g_difsDE body detects, enforcing exactly one `shape:*` token. Legacy booleans stay accepted-forever as parse INPUT (the GMF_API_DOCS banner still teaches `shaderMeta.selfContainedSDE` as the hand/AI-authoring interface) but never reach the runtime def. Fixes the latent black-screen for caps-only-authored files (boolean-only compile gates are gone).
- **Worker contract formalized:** `REGISTER_FORMULA` wire types (FractalEvents + WorkerProtocol + both WorkerProxys) now carry `capabilities`/`preambleVars` instead of `selfContainedSDE`; renderWorker self-heal extended with the g_difsDE detect.
- Docs: doc 35 vocabulary/status/GMF sections updated, spec `plans/capability-protocol.md` marked COMPLETE, `pairHasCapability` stale "unused" JSDoc fixed. `test:compat` snapshot regenerated (2 rows — the old snapshot predated the interlace-feature retirement, pre-existing drift).
- Gates: typecheck 0, `test:compat` 55 formulas OK + snapshot matches, `test:gmf` 16/16, `test:mb3d` 24/24, `test:mb3d:weave` 291/291, `test:frag` 60/60, GMF-CP roundtrip 3/3, `smoke:boot` clean.

**📋 2026-07-11 — MB3D importer folded into the FormulaPicker (branch `feat/weave-core`):**

Retired the standalone Import-Mandelbulb3D modal; its pieces now live in the unified `<FormulaPicker>`. See the ADR-0083 update block for the full map.
- **MB3D scenes → Catalog section.** The 38 bundled `.m3p` sample scenes are a "Mandelbulb3D" group leading the picker's Catalog section (above Fragmentarium/DEC), thumbnailed (`public/thumbnails/mb3d-scenes/`, 35 harness renders + the user's better in-app renders for the rest). Picking loads the scene live. New `mb3dCatalogGroup.ts` (+ `CatalogSource` gains `'mb3d'`, commit routing in `FormulaSelect`).
- **Import consolidated.** `.m3p` and `.frag` file imports are now: contextual picker-footer buttons (shown only while the matching Catalog category is active, via a new `footerSlot` render-prop) + a **File-menu "Import" section**. Removed the MB3D item from the formula hamburger. New shared utils `importM3pFile.ts` / `pickFragFile.ts`; the Workshop's buried frag-file load was lifted via a new store action `openWorkshopWithSource` + Workshop `initialSource` prop. Text-paste dropped.
- **Importer fix — fudge clamp.** `emitFusedHybrid` floors `quality.fudgeFactor` at 0.2 (was 0.01): a tiny authored ZstepDiv exhausted the ray budget → black (Ellarien/Hal-Tenny 0.05, Theli-At 0.10). Only those flip; scenes ≥ 0.2 unchanged (`debug/mb3d-fudge-audit.mts` calibration).
- **Deferred:** DsyneGrafix imports as dust (its IdesFormula slot has no analytic derivative but a sibling Amazing Box writes `dr`, so est7 doesn't auto-route). Static detection can't separate it from HalTenny-Freak (both have a `deOption 0` no-`dr` fractal, but HalTenny renders fine — Integer Power carries the DE). Left on manual-est7; `debug/mb3d-dr-audit.mts` documents the analysis for a future curated-escape-list pass.
- Renamed the gallery's "My Submissions" → "My Fractals".
- Gates: typecheck 0, `test:mb3d` 24/24, `test:mb3d:weave` 291/291, `smoke:boot` clean, no new orphans. Adversarial-reviewed (0 correctness findings). NOT pushed (rides the v1+weave hold). Local-only Julia3D wiring + the CategoryPickerMenu type-to-search hunks deliberately left uncommitted.

**📋 2026-06-25 — Mandelbulb3D scene importer (branch `feat/mb3d-importer`):**

Deterministic-from-source MB3D (`thargor6/mb3d`) → GMT importer. The user's standing rule (deterministic > AI) drove the whole design; the AI formula kit is the fallback, this is the default for a known format. See ADR-0083 + [`plans/mb3d/converter-design.md`](./plans/mb3d/converter-design.md).
- **Pipeline** (`engine-gmt/utils/mb3d/`): `parseMB3D` (text `Mandelbulb3Dv18{…}` custom-base64 + raw `.m3p` binary) → `buildWeaveSequence` (port of MB3D `doHybridPas`, per-iteration slot order) → `transpileSlot[]` → `emitFusedHybrid` (ONE `FractalDefinition`, loop body switches on iteration `i`) → `loadScene`. `constPacker` ports `FillCustomVBufWithVars`+`BuildRotMatrix`; single-slot = parametric uniforms+sliders, multi-slot = baked. UI: `ImportMandelbulb3DModal.tsx` (paste + Load `.m3p`) off the formula menu.
- **Key finding:** GMT's same-named formulas do NOT equal MB3D's (Integer Power = latitude vs GMT colatitude; Quaternion extra terms; Tricorn sign; only Amazing Box matches, at paramD=1). Logged in `plans/mb3d/formula-discrepancies.md` — a live worklist for fixing GMT's own math, NOT papered over by substitution.
- **The `[CODE]` wall:** ~457 MB3D external formulas ship as compiled **x87 machine code**, not source (and the `.m3f` source comments are stale). Built an x87→GLSL **decompiler** (`plans/mb3d/decompiler/`, Capstone disasm → symbolic FPU-stack translation) gated by an **independent numeric cross-check** (`xcheck.mjs` runs a second x87 interpreter on the raw bytes vs the decompiled GLSL on random inputs; mismatch = bug, formula skipped). The cross-check caught the real `fcomp`-pop/`fsub` cut bug (scraggly-mess → clean Menger sponge). `generate-library.mjs` ships only verified-faithful.
- **Coverage:** committed at 62 faithful; a same-day follow-up (below) took it to **94**.

**📋 2026-06-25 (same day) — MB3D follow-up: cross-check harness fix + standalone formula library:**
- **Cross-check harness bug fixed** (`xcheck.mjs` `glslToJs`): it never bound `sin/cos/sqrt/atan2/exp2/log2` or `Cp` (positive-offset) consts, so **no transcendental formula had ever been cross-checked** (the 57 were all non-transcendental). Binding them + `Cm`/`Cp` token-keyed consts took faithful **57 → 89** (+32 transcendental: Benesi, Makin3D, QuadrayBrot, sinh, gnarl, lorenz/rossler/vanderpol/rabinovich…), and surfaced exactly **1** real decompile bug (`_flipC-xyz`, correctly excluded).
- **Standalone formula library in the modal** (your ask): the modal now lists **72** faithfully-translated formulas (5 intern + 67 decompiled) you can click to load standalone at their authored defaults — searchable, grouped (Boxes/Bulbs/IFS/Brots/Inversions/Attractors/Transforms). New: `loadDecompiledFormula`/`loadInternFormula` (synthesize a one-slot scene → existing fuse→load path), `mb3dCatalog.ts`, `DECOMPILED_DEFAULTS` (flat default option layout). **Render-triaged** all 83 standalone (`debug/probe-mb3d-triage.mts`): 72 render visible structure; 11 brots/powers render black because they reference `Cp` consts the packer doesn't produce yet — `transpileSlot` now rejects any formula with unresolved const tokens (statically excluded, no black entries).
- **Recon reprioritized the roadmap** (`triage-categories.mjs`): control-flow alone unlocks only 6; the real order is **Cp-const resolution (recovers 11) → cheap-x87 ops → complex-mem (86 alone) → control-flow (the 129 IFS bucket) → SSE2**.
- **Gates green:** typecheck 0, `test:mb3d` 24/24, `test:mb3d:map` 32/32, `test:mb3d:weave` 41/41 (+ all-catalog emit coverage), `smoke:boot` clean.

**📋 2026-06-23 — Engine-level z-index/stacking system (branch `feat/zindex-layer-system`):**

Holistic z-index overhaul across all six apps. Census found 300 surfaces + 51 stacking traps; the governing fact is two non-competing domains — body **portals** order globally, in-flow **shell** elements (under `MobileViewportShell`/`fixed inset-0` roots) are trapped and can't beat any portal regardless of number. Shipped (see ADR-0082 + `plans/z-index-system-design.md`):
- **Foundation:** `components/ui/zIndex.ts` is now a domain-tagged `TIERS` table behind a back-compat `Z` Proxy (zero call-site churn) + `z(tier, rank)` + `registerTiers`. New: `layerStack.ts` (per-tier click-to-front; `panelStack` = the `'panel'` instance), `layerHost.ts` (`get/setLayerHost`), `Layer.tsx` (`forwardRef` portal primitive — the un-trappable way to author a floating surface). `Modal`/`AnchoredMenu`/`FloatingPanel` portal through `getLayerHost()`.
- **The headline fix:** `Popover` now portals (measures an in-flow marker's parent rect, renders `fixed` at the `popover` tier) → **topbar dropdowns finally render above floating panels**; call sites unchanged.
- **Portalled out of the shell:** CompilingIndicator, LandscapeGate, SceneFileDropZone, DiagnosticsOverlay, RenderContextLostOverlay, tutorial card (+ highlight ring), GE GradientSourcePicker/EasingPicker, DemoExplainer. Tokenized: tool windows, context menus, gallery zoom, GE drag avatars/previews, the four DomOverlays.
- **Guards:** `npm run test:zindex` (overlap + invariants), `npm run check:zindex` (ratchet — fails on new raw `z-[≥100]`).
- **Gates green:** typecheck, test:zindex, check:zindex, smoke:boot, smoke:ui-primitives, smoke:help-menu, smoke:pause-controls. **Needs the user's visual pass** (checklist in design doc §7) since Phase-3 surfaces moved stacking domains.
- **Deferred (tracked):** DomOverlays structural dedupe; ~7 surfaces still `createPortal(_, document.body)` directly + CenterHUD/FormulaPicker raw portal-z (allowlisted, correct today).

**📋 2026-05-20 — Doc audit + documentation migration:**

Three-phase audit (Phase 1: 28 subsystem surveys + 9 docs-existing summaries; Phase 1.5: 120 open-question follow-ups, 119 answered; Phase 2: 35 module docs authored across two parallel sessions) followed by a same-day migration after observing the docs were trending toward "write-only" state-shaped files.

**Migration outcome (current canonical doc surface):**

- **Source-file JSDoc** — ~95 invariant + per-export blocks across ~60 source files. Trust this first; surfaced on IDE hover.
- **ADRs at `docs/adr/`** — 58 dated, append-only decision records (0001-0058). Each: Context / Decision / Consequences. Cited from source via `@see docs/adr/NNNN-*.md`.
- **Policy docs at `docs/policy/`** — 5 prescriptive cross-cuts: `engine-fork-rules.md`, `ddfs-string-contract.md`, `ddfs-auto-wiring.md`, `shared-ui-coupling-rules.md`, `uniform-plugin-contract.md`.
- **CLAUDE.md** — rewritten "Read Docs Before Coding" table to point at source JSDoc + ADRs + policy as the three canonical layers. Pre-extraction `docs/history/engine/*` retained as legacy reference but explicitly demoted (JSDoc + ADRs take precedence where they disagree).
- **`docs/modules/`** — pruned to 3 sibling-app overviews (fluid-toy / fractal-toy / mesh-export) + 2 auto-generated indexes (`bugs.md`, `backlog.md`).
- **Archive at `docs/history/audit-2026-05-20/archive/`** — 31 archived module docs for traceability (not canonical).

**Bug findings** (3 fixed same-day, 2 queued):
- ✅ q-112 — `WorkerDepthReadback` focus-pick hardcoded `< 1000` → fixed to `< MAX_SKY_DISTANCE`
- ✅ f-002 — `FeatureSystem.getAll()` JSDoc corrected (said "throws" but impl falls back)
- ✅ q-019 — investigated: NOT a real bug (followup misread code)
- 🟡 q-002 — `GmtRendererTickDriver:90-94` 30s silent splash timeout (needs UX decision; in `bugs.md`)
- 🟡 q-064 — `StateLibrary` action-name collision (HMR-only landmine; in `bugs.md`)

**Coverage gap (honest)**: audit reached 63% file coverage (527/837), not "every file." 310 uncovered: ~70 claimed-via-glob but never recorded in `coverage.yaml` (post-processing failure) + ~219 truly unclaimed (mostly `components/*`, `engine-gmt/components/*`, `utils/*`, `engine-gmt/gallery/*`, `data/help/*`). 8-file sample found 5 load-bearing with hidden invariants — closure pass deferred; tracked in `docs/modules/backlog.md`.

**Tooling at `docs/history/doc-audit-state/scripts/`**: `verify-doc.mjs`, `extract-bugs.mjs`, `extract-backlog.mjs`, `reconcile-coverage.mjs`, `coverage-check.mjs`, `blob-sha.mjs`, `build-inventory.mjs`, `record-coverage.mjs`.

**📋 2026-05-05 — Cutting-plane DE promoted to engine-level estimator (option 5):**

Code in `engine-gmt/types/fractal.ts` + `engine-gmt/features/quality.ts` + `engine-gmt/features/core_math.ts` + `engine-gmt/engine/SDFShaderBuilder.ts` + the 5 cutting-plane formulas. Full architecture writeup in `docs/history/gmt/24_Formula_Interlace_System.md` ("Cutting-Plane Estimator (2026-05-05)" section).

User reported GSD + MengerSponge interlace produced "tiny dust" instead of solid surfaces (test GMF in `debug/errors/greatstellateddodecahedron-mengerSponge.gmf`). Diagnosis: GSD's custom `getDist` returned `vec2(abs(gsd_dmin), gsd_trap)` which silently overrode the user's estimator dropdown choice; the formula-private `gsd_dmin` accumulator is incoherent under interlace because the secondary doesn't update its scale tracker.

Fix: Cutting Plane is now a first-class compile-time estimator (value 5, alongside Log/Linear/Pseudo/Dampened/Linear2). Engine declares shared `cp_dmin/cp_scale/cp_trap` globals when a formula has `shader.supportsCuttingPlane: true`. The 5 native cutting-plane formulas (`Coxeter`, `Cuboctahedron`, `GreatStellatedDodecahedron`, `RhombicDodecahedron`, `RhombicTriacontahedron`) were migrated to use the shared accumulators (the prefixed `gsd_*` / `cox_*` / `rd_*` / `rt_*` names all renamed to `cp_*`), their custom `getDist` blocks removed, and their `defaultPreset.features.quality.estimator` set to 5. Verified via `debug/dump-cp-shader.mts` and `debug/dump-cp-interlace.mts`.

User can now switch the estimator dropdown to Linear (1) on these formulas to get the standard `(r-1)/dr` math, which composes correctly under interlace with non-CP secondaries — fixes the dust bug. Imported Frags with custom `getDist` are unaffected (their override path is preserved when estimator !== 5).

**Same-day expansion** — additional CP-aware formulas:
- `MengerSponge` — added cube-face cutting plane (3-axis max after sort), `supportsCuttingPlane: true`, default estimator 5. Now interlaces coherently with GSD/Coxeter/etc. under CP estimator.
- `Octahedron`, `Icosahedron`, `Dodecahedron`, `TruncatedIcosahedron` — all four Knighty-fold polyhedra got their natural cutting-plane added (single-axis face for Octahedron; vertex-direction face for Icosa/TruncatedIcosa; (1,1,1)/√3 face for Dodeca's symmetric IFS attractor). Default switched to estimator 5 — visibly sharper polyhedral geometry.
- `SierpinskiTetrahedron` — CP support added with average-of-per-axis scale tracker (geometrically approximate but stable when vec3C is non-uniform). Default estimator unchanged.
- `MengerAdvanced` — CP support added with cube-face plane test computed BEFORE inner box fold + Z-Scale (exact when both extras are off; approximate otherwise). Default estimator unchanged.

Estimator dropdown UI (`components/AutoFeaturePanel.tsx` + `components/GenericDropdown.tsx` + `engine/FeatureSystem.ts`) now supports per-option `disabledIf?: (state) => boolean`. Cutting Plane option in `engine-gmt/features/quality.ts` uses this to gray out for any formula without `supportsCuttingPlane` (engine still falls back to Linear if forced via GMF, so it's purely UX). Mesh-export's own dropdown in `mesh-export/components/PipelineControls.tsx` got CP added with `disabled: !supportsCP` from `loadedDefinition`.

**Polish pass (same day):**
- Sierpinski Tetrahedron's CP plane was originally `(1,1,1)/√3` (symmetry axis, not face normal) → produced octahedron silhouette. Replaced with 3-plane `max` test using actual tet face normals `(-1,1,1)`, `(1,-1,1)`, `(1,1,-1)` (each /√3) — now produces real tetrahedral geometry.
- Help entry `data/help/topics/rendering.ts` → `quality.estimator` updated with all 6 estimator options + a note that Distance Metric only affects `length()`-based estimators (CP uses face normals directly, metric is no-op for CP geometry but still affects orbit-trap coloring).
- New verification script `debug/dump-mesh-cp.mts` checks all 5 mesh-export shader variants × 12 CP formulas + non-CP fallback. All passing.

**Interlace bug fix (post-commit):** Ported `native-interlace-sweep.mts` + `validator.html` from stable to dev (paths rewritten to `engine-gmt/`). First sweep caught 336/1600 pair failures: any non-CP primary × CP-aware secondary produced `'cp_dmin' : undeclared identifier` because the engine only declared `cp_*` globals when the **primary** had `supportsCuttingPlane`. Fix in `engine-gmt/features/core_math.ts` + `engine-gmt/engine/SDFShaderBuilder.ts` (new `pairSupportsCP` helper) — declarations + init now triggered when **either** side supports CP. `engine-gmt/features/quality.ts` `disabledIf` likewise broadened so the dropdown enables CP for non-CP-primary + CP-secondary pairs. Re-sweep: **1600 pass / 0 fail** (~7 min). Cleanup: replaced inline `as { ... }` cast with imported `InterlaceState` type; removed redundant `disabledIf` cast in `AutoFeaturePanel`.

**📋 2026-05-05 — Path-traced reflection quality (env MIS + IS + Sobol bounce):**

Plan: [plans/path-trace-reflections.md](plans/path-trace-reflections.md). Code in `engine-gmt/shaders/chunks/pathtracer.ts` + `engine-gmt/features/lighting/index.ts` + new `engine-gmt/features/reflections/env_cdf.ts` + env-load hooks in `engine-gmt/engine/MaterialController.ts` and `engine-gmt/engine/worker/renderWorker.ts`.

User context: env-map reflections in PT mode remained noisy after 4000 samples even with the VNDF + Filter-Glossy work. Three layered noise sources, all in the env-reflection path: (1) no specular env NEE — the existing `PT_ENV_NEE` was cosine-only, useless on glossy surfaces; (2) no env-map importance sampling — bright HDR features (sun discs, lamps) only contributed when the GGX lobe accidentally aligned with them; (3) blue-noise GGX seeds aren't stratified enough for tight reflection lobes.

**New compile gates (all default off, all gated under `parentId: 'ptEnabled'`):**
- `ptReflMode` — float dropdown, `0=Off / 1=Env MIS / 2=Env MIS + IS`. Replaces the diffuse-only `ptEnvNEE` (which becomes `hidden: true` for back-compat scene loads). Estimated compile cost: 0/250/650 ms.
- `ptSobolBounce` — boolean. Sobol(2) + per-pixel Cranley-Patterson rotation for the bounce-direction seed. ~50ms compile cost.

**Phase 1 — Sobol bounce sampling.** New helpers `radicalInverse_VdC`, `sobol2_d1`, `cpHash`, `sobol2CP` (gated by `PT_SOBOL_BOUNCE`). Replace `vec2 dirSeed = blueNoise.gb` with `sobol2CP(uint(uFrameCount) * 8u + uint(bounce), gl_FragCoord.xy)`. Other blue-noise consumers (shadow jitter, RR, light pick) untouched — LDS only earns its keep where the lobe is tight. `uFrameCount` already exists in scope (used by `getBlueNoise4` for temporal R2 offset); no new uniform.

**Phase 2 — Env MIS (uniform-sphere PDF).** New helpers `sampleEnvDirection(seed, out pdf)`, `pdfEnvSample(dir)` — uniform-sphere fallback (`pdf = 1/(4π)`) when `PT_ENV_MIS_IS` isn't also defined. Replaced the `PT_ENV_NEE` block with a `PT_ENV_MIS` block that draws one direction from `pdf_env`, evaluates the full BSDF (kD diffuse + GGX specular) at that direction, and weights by `misPower2(pdf_env, pdf_bsdf)`. The `!hit` branch's env contribution at `bounce > 0` now applies `misPower2(pdf_bsdf, pdf_env)` against the snapshotted `n_prev` / `viewDir_prev` / `roughness_prev` / `probSpec_prev` (the area-lights work already captures these, so this is free). Bounce 0 still passes through unweighted (no NEE counterpart fired).

**Phase 3 — Env CDF + IS.** CPU builder at `features/reflections/env_cdf.ts`: downsamples the env to 256×128, builds a 1×H marginal CDF (per-row ∫L sin θ totals) and a W×H per-row conditional CDF, plus the lumIntegral normalizer. Output is two R32F `DataTexture`s + a vec2 size + a float scalar — total VRAM ≈128 KB. Triggered from `MaterialController.loadTexture` (LDR DOM path) and `renderWorker` `TEXTURE` / `TEXTURE_HDR` handlers (worker uses `OffscreenCanvas` for image readback; HDR `DataTexture` is read directly with a half-float→float32 conversion). New uniforms `uEnvCDFMarginal` / `uEnvCDFConditional` / `uEnvCDFSize` / `uEnvLumIntegral` defined in `LightingFeature.extraUniforms`; defaults are 1×1 stubs and `uEnvCDFSize = (1,1)` triggers GLSL fall-through to uniform-sphere sampling. New GLSL helpers `sampleEnvImportance(seed, out pdf)` and `pdfEnvImportance(dir)` (gated by `PT_ENV_MIS_IS`) do binary search on the two CDFs and recover pdf via successive-difference (`pdf = du · dv · W·H / (TAU·π · sin θ)`, derivation in code comment). Env rotation is handled by inverse-rotating the sampled direction (`dir.xz * uEnvRotationMatrix` = `M^T * v` in GLSL row-vec convention) before returning to world space — `GetEnvMap` re-applies forward rotation when sampling the texture, no double-rotation. `pdfEnvImportance(dir)` does the matching forward rotation before mapping back to (i, j).

**Migration: `ptEnvNEE` is hidden, not deleted.** Old GMF/JSON scenes that had Environment NEE on auto-promote to `ptReflMode = 1.0` on first load (only when `ptReflMode` is entirely undefined and `ptEnvNEE = true` — explicit `ptReflMode = 0` from new saves wins).

**Verified:** `npm run typecheck` clean, `npm run build` clean (8.9s), `npm run shader:dump --pt` shows zero new symbols (default build strips all gated paths), `npm run shader:dump --pt --all-features` shows 33 occurrences of new gated symbols and 16 of the existing area-light helpers (no regression). User does final visual verification.

**Pending:**
- Visual smoke testing on a chrome-ball + HDR sun-disc scene to confirm the variance-reduction story plays out as expected.
- Optional `debug/bench-pt-refl.mts` (per plan) — converged-reflection-variance bench across the three modes plus rough-ball regression scene. Deferred unless the visual results suggest anything off.

**Known limitations:**
- CDF rebuild fires on every env-map upload, not gated by `ptReflMode`. ~10ms cost is cheap insurance; users can toggle MIS + IS without reloading the env.
- `pdfEnvImportance` does 4 texture lookups per call, called twice per bounce (once at NEE for MIS weight, once at the BSDF-side `!hit` branch). Worth measuring if PT frame-time regresses; could be cached in a vec2 if needed.
- Procedural sky and gradient env (`uEnvSource > 0.5` or `uUseEnvMap < 0.5`) don't get a CDF — the GLSL falls back to uniform sphere via the `uEnvCDFSize == (1,1)` stub. These envs are uniform enough that uniform-sphere MIS converges fast; CDF only matters for HDR textures with concentrated features.

**📋 2026-05-03 — True area lights for the path tracer (Phases 1–4 + UX cleanup):**

Plan: [docs/history/plans-archive/area-lights.md](docs/history/plans-archive/area-lights.md). Code in `engine-gmt/shaders/chunks/pathtracer.ts` + `engine-gmt/features/lighting/` + `engine-gmt/engine/managers/UniformManager.ts` + duplicate type plumbing in both `types/graphics.ts` copies.

User context: prior to this, "Area Lights" in GMT was a stochastic-shadow-jitter trick — a runtime cone perturbation on the shadow ray that *looked* like a soft area light but was still mathematically a delta point. No MIS, no BSDF-side direct catches, ~256 frames to converge clean shadows. New system adds a real light type and physically-correct integration.

**New light type: `'Sphere'`** alongside existing `'Point'` and `'Directional'` (`types/graphics.ts` and `engine-gmt/types/graphics.ts` both widened — duplicate-state pattern). Encoded as `uLightType[i] = 2.0`. Per-light dropdown in the right-click menu (`features/lighting/utils/lightMenuUtils.ts`) — selecting Sphere bumps a zero radius to 0.5 default. Backward-compat: existing GMF/JSON scenes load unchanged; `'Sphere'` only appears for explicit user opt-in.

**New compile gate `ptAreaLights`** ("True Area Lights" engine checkbox under Path Tracing). Off by default — when off, Sphere lights fall through to the Point-light branch (visual no-op vs old behavior). On: emits the new code paths under `#ifdef PT_AREA_LIGHTS`. ~600ms compile cost. Independent of the legacy "Soft Shadow Jitter" (`ptStochasticShadows`) checkbox, which keeps working for Point lights.

**Shader changes (`engine-gmt/shaders/chunks/pathtracer.ts`):**
- New helpers: `intersectAreaLight` (closest-hit test against type-2 sphere lights, reuses `intersectSphere` from `math.ts`), `pdfSphereLightDir` (solid-angle PDF for uniform-area sphere sampling — `activeCount` divisor passed explicitly to keep callers honest), `pdfVNDF` (Heitz 2018 §3 eq. 17), `pdfBSDF` (mixture density matching the bounce-direction sampler at line ~640), `misPower2` (Veach 1995 power-heuristic helper, called from both estimator sites), `tracePTBounce` (wrapper around `traceSceneLean` that tests sphere lights alongside the fractal march and returns whichever is closer).
- NEE block forks on light type: type-2 lights sample a point on the sphere surface (Marsaglia 1972), compute `pdfSphereDir`, and use `1/pdfSphereDir` as the compensation factor instead of `activeCount`. Shadow ray for sphere lights goes to the sampled surface point (not a re-jittered direction); `GetHardShadow` is forced for type-2 regardless of `ptStochasticShadows`/`areaLights` settings (a runtime branch gated on `PT_AREA_LIGHTS` so default builds emit only one shadow path — preserves the S3 ANGLE fix).
- BSDF estimator at the `!hit` branch (next-iter): when `lightHit >= 0`, computes `pdf_light = pdfSphereLightDir(...)`, `pdf_bsdf = pdfBSDF(n_prev, viewDir_prev, currentRd, roughness_prev, probSpec_prev)`, weights with `misPower2(pdf_bsdf, pdf_light)`. Surface state from the bounce that *emitted* the ray is captured before each bounce trace (`n_prev` / `viewDir_prev` / `roughness_prev` / `probSpec_prev` declared at function scope). For delta lights `pdf_light = ∞ → w_nee = 1, w_bsdf = 0`, naturally collapsing to current behavior.
- env-NEE call site swapped to `tracePTBounce` so a sphere light correctly occludes the env-NEE visibility ray (gate: `!envHit && envLightHit < 0`).
- `probSpec` calculation hoisted above NEE so MIS reads the same mixture density the bounce-direction sampler uses below. `activeCount` / `activeIndices` hoisted to function scope (loop-invariant — depends only on uniforms).

**Latent Direct-mode + volumetric bugs fixed.** `engine-gmt/shaders/chunks/lighting/pbr.ts:48` and `engine-gmt/shaders/chunks/lighting/volumetric_scatter.ts:48` were checking `uLightType[i] > 0.5` for "is directional" — Sphere (type 2) was matching that range, so Direct-mode shading and god-ray scatter were treating Sphere lights as Directional (no position, ignoring `uLightPos`). Both narrowed to `> 0.5 && < 1.5`. Sphere lights in Direct mode now correctly fall through to the Point branch.

**`hideEmitter` field added to `LightParams`.** Decouples "show the visible glowing emitter ball" from "what's the physical light radius." For Point lights the legacy `radius == 0 = invisible` behavior is preserved (Visible Sphere toggle flips radius). For Sphere lights, the toggle controls only `hideEmitter` — radius stays > 0 so area sampling is unaffected. New uniform `uLightHideEmitter` (Float32Array, MAX_LIGHTS) gates the emitter render in `engine-gmt/shaders/chunks/lighting/shared.ts`.

**Visible-emitter render fix.** `intersectLightSphere` in `shared.ts:33` was filtering with `uLightType[i] > 0.5`, which excluded both Directional (1) AND Sphere (2). Narrowed so type 2 lights render their emitter sphere normally.

**UI cleanup:**
- `ptStochasticShadows` checkbox renamed `"Area Lights" → "Soft Shadow Jitter"` (the label collision was confusing users).
- ShadowControls.tsx button renamed `"Area" → "Jitter"` with tooltip pointing at Sphere lights for the physical path.
- Per-light popover gets an amber warning banner when a Sphere light is configured but the conditions for area integration aren't met (`renderMode != PathTracing` OR `!ptAreaLights`).
- Hardness slider description gains a note: "Affects Point and Directional lights only — Sphere area lights derive shadow softness from physical sphere sampling."
- `ptAreaLights` description rewritten to explain how to opt in.

**Cleanup pass (multi-agent code review).** Reuse / quality / efficiency agents in parallel; triaged. Taken: extracted `misPower2` helper (deduped two MIS sites), reused existing `intersectSphere` from `math.ts` inside `intersectAreaLight` (4 lines instead of 12), extracted JSX IIFE in LightControls into a named `renderEmitterSection()` helper, removed phase-narration comments and the "trap that killed Patch 3" task reference. Skipped: GLSL `LIGHT_TYPE_*` constants (codebase convention is float-range comparisons everywhere), per-light loop preamble macro (too short), GGX `D_nee`/`G1V_nee` hoist to share with `pdfVNDF` (efficiency agent itself recommended skip unless profiling shows >1% win).

**Verified:** `npm run typecheck` clean, `npm run build` clean (8.3s), `npm run shader:dump --pt --all-features` shows `misPower2`, `intersectSphere(ro - uLightPos...)`, and all gated paths emit correctly. Default-PT shader retains all helpers behind `#ifdef PT_AREA_LIGHTS` so the GPU driver strips them at compile when the gate is off.

**Pending:**
- Visual smoke testing (user does this — memory `feedback_visual_smokes`).
- Phase 4 unbias bench: spec is in `docs/history/plans-archive/area-lights.md` "Phase 4 unbias bench spec" section. Requires building `debug/bench-area-lights-unbias.mts` plus a `PT_NEE_DISABLE` compile gate. Without it, the math is "reasonably believed correct" but not proven bias-free.
- Phase 5 (re-attempt power-weighted light selection from S3 history) — would build on the MIS framework; deferred per plan.

**Known limitations:**
- When using `ptAreaLights` + Sphere lights, `Hardness` and `Edge Softness` sliders have no effect on those lights. UI surfaces this via slider description and the per-light banner; no hard runtime gate.
- Sphere lights in Direct mode render as Point lights (no warning beyond the per-light banner). True area integration requires PT mode.
- Per-bounce sphere-intersect cost scales with `MAX_LIGHTS` (3 default). At 8+ lights with `ptAreaLights` on, may show measurable GPU cost — bench-verify if it surfaces.

**📋 2026-05-01 — Mobile mode for app-gmt (Phase A–C iter, D6, E1, F1):**

Plan: [docs/history/plans-archive/mobile-mode-app-gmt.md](docs/history/plans-archive/mobile-mode-app-gmt.md). Reference doc: [docs/history/engine/17_Mobile_Layout.md](docs/history/engine/17_Mobile_Layout.md).

User report: stable's mobile rendering path works but its UI is "not mobile-friendly"; same true of app-gmt after the port. Goal: make app-gmt usable on phone + tablet (landscape-only) without resorting to desktop tooling, with primitives reusable by sibling apps (`fluid-toy`, `fractal-toy`, `demo`).

**Layering (load-bearing).** Stable's mobile bits live inline in `App.tsx`. The engine fork doesn't have one app — it has four. Mobile primitives must land at the layer where they're reusable:

- `engine/` — `useMobileLayout` (hook + non-React `isMobileSnapshot`), `uiModePreference` slice, `<LandscapeGate>`, `<MobileViewportShell>`, `mobileMenu` API + `<MobileMenuHost>`. New components live in `engine/components/`.
- `engine-gmt/` — drei touch orbit gate (`Navigation.tsx:666`, one-line `pointerType === 'touch'` early-return), `mobileHidden` HOC, `pillClass` helper, mobile-only System menu surrogates.
- `app-gmt/` — composition only: mount the engine primitives, gate `<Dock side="left">`, `<TimelineHost>`, the right Dock-vs-MobileMenuHost swap, and Fly-mode right-dock hide.

**Phase A — foundation.**
- New engine components: `engine/components/LandscapeGate.tsx`, `engine/components/MobileViewportShell.tsx`. Address-bar collapse trick (`sticky top-0 h-[100vh] overflow-hidden`) ported from stable; on desktop it's `fixed inset-0 w-full h-full`. Safe-area insets applied in same component (D6).
- `<GmtNavigationHud isMobile={false}>` hardcodes in `AppGmt.tsx:206, 253` replaced with real `useMobileLayout()` flow.
- Touch orbit fix: drei's native `THREE.TOUCH.ROTATE / DOLLY_PAN` was already declared in `Navigation.tsx:1326` but was being intercepted by the custom cursor-anchored orbit handler at line 666. The handler's only gate was `e.button !== 0`, which passes for touch pointerdown (button is always 0 on touch). One-line fix: `if (e.pointerType === 'touch') return;` early-return — cursor-anchor doesn't translate to multi-touch, so ceding to drei is correct. Mouse path untouched.
- `<MobileControls />` mounted in `AppGmt.tsx` — was missing entirely from app-gmt (legacy `App.tsx` had it, port didn't carry it over).

**Phase B — UI mode preference.**
- `debugMobileLayout: boolean` (debug toggle) graduated to `uiModePreference: 'auto' | 'mobile' | 'desktop'`. Type added to `types/store.ts` and `engine-gmt/types/store.ts`. Slice rewrite in `store/slices/uiSlice.ts` with localStorage read/write helpers under key `gmt.uiModePreference`.
- `useMobileLayout()` rewritten to resolve `auto` via media query / viewport, return forced value otherwise. Keeps `isPortrait` (always actual orientation, used by `<LandscapeGate>`).
- All `debugMobileLayout` call sites migrated: `App.tsx:59`, `components/MobileControls.tsx`, `engine-gmt/topbar.tsx`, `engine-gmt/navigation/useInputController.ts:15, 199, 239`.
- System menu's binary `Force Mobile UI` toggle replaced with a custom 'custom'-type menu item: `UiModePreferenceMenuItem`, a 3-button pill row (Auto / Force Mobile / Force Desktop). Removed `when: advancedMode` gate — this is now a real user setting, visible to everyone.

**Phase C — topbar cull and mobile menu architecture.** Iterative with the user; final state:
- New `mobileHidden(Component): React.FC` HOC in `engine-gmt/topbar.tsx` — wraps a component to return null on mobile, reactive via `useMobileLayout`. Used for: `AdaptiveResolution`, `RenderRegionToggle`, `ShareLinkButton`, `ViewportQuality`, `gmt-div-1`, `gmt-div-2`. Bucket-render install gated by `isMobileSnapshot()` at boot (the installer doesn't accept a component handle — non-reactive limitation acknowledged).
- `CenterHUD` (Light Studio): `isMobileMode={false}` hardcode in the topbar wrapper replaced with real `useMobileLayout` flow + real `navigator.vibrate` callback (was a noop). Tap-to-enable / tap-to-open-menu / tap-to-disable mobile interaction logic in `CenterHUD.tsx:135-162` was already there but had been dormant. Expand-to-8-lights chevron hidden on mobile (the 3x3 grid doesn't fit and the first 3 lights cover the common case).
- New System menu surrogates for mobile-hidden topbar items: `MobileQualityMenuItem` (3x2 grid of all 6 SCALABILITY_PRESETS), `Adaptive Resolution` toggle. Both gated by `when: () => isMobileSnapshot()`. Section header "Quality" + separator scoped the same way.
- **Mobile menu replaces right dock (architectural change in `engine/plugins/Menu.tsx`).** New `mobileMenu` API: module-level `_mobileActiveMenu: string | null` + `open / close / toggle / getActive / subscribe`. `MenuAnchor` branches on `useMobileLayout().isMobile`: desktop path unchanged (local state + popover); mobile path writes to `mobileMenu` global state, no popover. New `<MobileMenuHost>` renders the active menu's items in a scrollable side panel sized like the right dock; the host is mounted by the app shell, which gates the right-Dock vs MobileMenuHost swap. `MenuItemView` is reused identically for both rendering paths so toggles, custom items, separators all match.
- File menu (`engine/plugins/SceneIO.tsx`) migrated from a bespoke 90-line `FileMenu` component to `menu.register('file', …)` + `menu.registerItem('file', …)` calls. Inherits desktop popover + mobile MobileMenuHost rendering for free. Icon-only (no "File" label) — matches Camera/System icon-only pattern. `LoadSceneMenuItem` is the only `'custom'` item — the hidden `<input type="file">` has to live with its trigger button to be `.click()`-able. `extraItems` API added then dropped during cleanup; apps register file-menu items directly.
- `copyShareLink()` extracted from `ShareLinkButton.tsx` as a callable helper. Original button uses it internally; app-gmt registers a "Copy Share Link (URL)" entry in the File menu via `menu.registerItem('file', …)` from `main.tsx`. Desktop also has the topbar share-link icon (mobileHidden); mobile users only see the menu entry.

**Phase D6 — safe-area insets.** `<MobileViewportShell>` applies `padding: env(safe-area-inset-*)` on all four edges when mobile. Hoisted as module-level `MOBILE_STYLE` / `DESKTOP_STYLE` consts to avoid per-render allocation.

**Phase E1 — auto-pick scalability preset on mobile boot.** `hooks/useAppStartup.ts`: after `detectHardwareProfileMainThread()`, if `hwProfile.isMobile && scalability.activePreset === 'balanced'` (engine default, untouched), calls `applyScalabilityPreset('fastest')`. Compile time drops from ~10 s to ~5 s with PT still on. User-chosen presets respected.

**Phase F1 — timeline hidden on mobile.** `<TimelineHost>` wrapped in `{!isMobile && …}` in `AppGmt.tsx`. Animation editing is desktop-only — see `plans/mobile-animation-research.md` for the deferred design (option B + C-lite, ~64px scrubber strip + half-sheet, deferred for scope).

**Cleanup pass (multi-agent code review).** Three review agents (reuse / quality / efficiency) in parallel; their findings triaged. Taken: drop `extraItems` API from SceneIO (redundant once File is a real menu), replace inline X SVG with `CloseIcon`, drop redundant `useState`/`useEffect` mirror in `MobileControls`, convert inline `import('...')` types to top-level `import type`, hoist `MobileViewportShell` style consts, extract `pillClass(active, extra)` helper for the cyan active-button pattern, flatten right-dock conditional in `AppGmt.tsx`, drop redundant `isMobile &&` from `isMobileMenuOpen` derivation, combine consecutive `!loadingVisible &&` guards, defensive `useEffect` to close stale `MenuAnchor` `open` state when toggling into Force Mobile, trim narration / "ported from stable" comments. Skipped: hoisting mobile-detection helper across pre-existing files (out of scope), replacing `mobileHidden` HOC with `when:` predicate (HOC reactivity is by design), folding `mobileMenu` pubsub into engine store (works correctly, bigger refactor), `localStoragePersist` factory (needs a third use site).

**Known limitations (documented in 17_Mobile_Layout.md):**
- Mobile menu outside-tap dismissal not implemented — only the X button in `MobileMenuHost`'s header dismisses.
- `installBucketRender` install-time gate is non-reactive — toggling Force Mobile after boot won't dynamically remove the installed item; reload required.
- ~15 resize listeners across an active session (every `useMobileLayout` consumer registers its own). Works fine, but a single global listener writing to the store would be cleaner.

**Files touched.** New: `engine/components/LandscapeGate.tsx`, `engine/components/MobileViewportShell.tsx`, `docs/history/engine/17_Mobile_Layout.md`. Modified: `App.tsx`, `app-gmt/AppGmt.tsx`, `app-gmt/main.tsx`, `components/MobileControls.tsx`, `engine-gmt/navigation/Navigation.tsx`, `engine-gmt/navigation/useInputController.ts`, `engine-gmt/topbar.tsx`, `engine-gmt/topbar/CenterHUD.tsx`, `engine-gmt/topbar/ShareLinkButton.tsx`, `engine-gmt/types/store.ts`, `engine/plugins/Menu.tsx`, `engine/plugins/SceneIO.tsx`, `hooks/useAppStartup.ts`, `hooks/useMobileLayout.ts`, `store/slices/uiSlice.ts`, `types/store.ts`, `CLAUDE.md`, `docs/DOCS_INDEX.md`, `docs/history/engine/04_Core_Plugins.md`. `npx tsc --noEmit` → 0 errors. Pending real-device validation by user.

**📋 2026-04-30 — Undo system: per-scope stacks (refactor of the 2026-04-26 fix):**

User report: Ctrl+Z occasionally undid a camera move when intending to undo a parameter edit. The 2026-04-26 audit (logged below) had concluded the unified-stack-with-scope-tags design was clean; this turned out to be wrong in one specific way — any consumer that called `undo()` without a scope (the global hotkey, the topbar UndoButton) popped the newest entry of any kind, so a camera gesture sitting on top of the unified stack would get rolled back by a parameter-undo keystroke. Same bug class affected `engine-gmt/topbar.tsx`'s Camera menu disabled-checks, which read `undoStack.length` rather than `canUndo('camera')`.

**Refactor:**
- `store/slices/historySlice.ts`: state shape split from `undoStack` / `redoStack` (with `scope` tags) into four independent stacks — `paramUndoStack` / `paramRedoStack` / `cameraUndoStack` / `cameraRedoStack`. Each lane caps independently at `MAX_STACK = 50`.
- API surface: `scope` is now required on every history method (`undo` / `redo` / `canUndo` / `canRedo` / `peekUndo` / `peekRedo`). The unscoped fallback is gone — the type signature makes the bug class unrepresentable.
- New typed entry points: `beginParamTransaction()`, `endParamTransaction()`, `pushCameraTransaction(state: CameraState)`. Replaces the runtime-overloaded `handleInteractionStart(mode | CameraState)` that conflated the two paths via `typeof mode === 'object' && mode.position`. Old name kept as a back-compat shim that routes by argument shape so the ~30 widget call sites stay unchanged.
- `engine/plugins/Undo.tsx`: global Ctrl+Z / Mod+Y / Mod+Shift+Z hotkeys plus topbar UndoButton/RedoButton all pass `'param'` explicitly. Camera Ctrl+Shift+Z still owned by app-gmt's priority-10 `gmt.undoCameraMove`.
- `engine-gmt/topbar.tsx`: camera menu Undo/Redo disabled-checks now use `canUndo('camera')` / `canRedo('camera')`.
- `app-gmt/AppGmt.tsx`: `GmtNavigation.onStart` calls `pushCameraTransaction(s)` directly. The `as any` cast on the camera-state argument is gone — the entry point is properly typed.
- `types/store.ts` + `engine-gmt/types/store.ts`: declarations updated to per-scope stacks + required scope on the methods.

`npx tsc --noEmit` → 0 errors. Documented in [docs/history/engine/06_Undo_Transactions.md](docs/history/engine/06_Undo_Transactions.md) (rewritten), [F2b](docs/history/engine/20_Fragility_Audit.md#f2b--undo-lane-conflation) (updated with the regression-then-fix history), and [07_Shortcuts.md](docs/history/engine/07_Shortcuts.md) (keybinding table).

**📋 2026-04-27 — Workspace tidy + camera-manager shortcut wiring + state-library notification system:**

- **Workspace reorg.** Moved all four GMT repos under `h:/GMT/workspace-gmt/`: `stable/` (was `gmt-0.8.5/`, 0.9.2), `dev/` (was `gmt-engine/`, bumped to 0.9.3), `landing/`, `backend/`. Folder names are now role-based; folder ↔ repo ↔ deploy map at `h:/GMT/workspace-gmt/README.md`. Renamed Claude Code memory dir to follow. Updated `dev/.git/config` upstream URL, fixed 4 stable test-frag ROOT paths, refreshed HANDOFF/CLAUDE location headers. Stable's repo + Cloudflare Pages + GitHub Pages deploys unaffected (folder names don't reach git).
- **Camera Manager keyboard shortcuts wired.** Three broken paths discovered: (1) `installGmtCameraSlice` called only `installStateLibrarySlice`, missing the `installStateLibrary` bundle that registers `Mod+1..9` / `1..9` against `saveToSlot`/`selectCamera`. (2) `installCamera()` in app-gmt was also registering Mod+1..9 against an adapter-less `@engine/camera` plugin — dead no-ops that won the tie-break against any later library bindings. (3) `engine-gmt/topbar.tsx` Camera menu's slot items called the same dead `camera.recallSlot/saveSlot`. Fix: switched cameraSlice to bundled `installStateLibrary({menu: null, slotShortcuts, onSavedToSlot})`, added `installCamera({hideShortcuts: true})` in app-gmt, rewired the topbar slot items onto the real `savedCameras` actions. fluid-toy already used the bundle correctly — unaffected.
- **State-library notification system (engine-wide).** Promoted the saved-toast pattern out of GMT into `installStateLibrarySlice`. Two transient store fields per library (`${arrayKey}_savedToast`, `${arrayKey}_notifyDot`) with timer cleanup. New `<StateLibraryToast arrayKey={...}/>` component (engine/components) renders a tone-aware floating pill (cyan success, amber warning). `installStateLibrary` auto-mounts it next to the menu when `menu` opt is set; apps with hand-rolled menus (GMT) mount it manually. Field names exported as `toastFieldKey()` / `dotFieldKey()` helpers — no stringly-typed drift.
- **Slot-overflow rejection.** `saveToSlot(n)` with `n > arr.length` previously appended as the next slot but labelled it `${n+1}` — a silent lie that also broke recall. Now rejects with a warning toast (`"Slot N unavailable — only K slots are filled"`). Stable still has the original bug; left untouched.
- **Dynamic menu labels.** `MenuButtonItem.label` and `MenuToggleItem.label` accept `string | (() => string)`. Same shape as the existing `disabled: boolean | (() => boolean)`. Used by GMT's Slot N items (`Slot 3 ✓` when filled), View Manager item (`View Manager ●` when notify dot is lit), and the bundle's auto-generated open + slot items. Available for the System menu and any future menu.
- **fluid-toy smooth view tween.** `applyView` now routes through a 500ms ease-in-out rAF tween (`tweenView`). Snaps `kind`+`maxIter` at start, lerps `center`/`juliaC`/`power` linearly, lerps `zoom` in log-space for perceptually-uniform pacing. Cancels prior in-flight tween. Lifted `lerp` and `easeInOutQuad` to a new `engine/math/Easing.ts` (no scalar lerp existed before — color-specific lerps only).

**📋 2026-04-26 (late) — Camera-undo fix + undo-system audit:**

User report: parameter undo (Ctrl+Z) and timeline undo (Ctrl+Z over timeline) work, but camera undo (Ctrl+Shift+Z) does nothing.

**Root cause** (NOT the agent's first hypothesis of "no camera transactions in stack" — those ARE pushed via `GmtNavigation.onStart` → `handleInteractionStart(camState)` at `app-gmt/AppGmt.tsx:203`):

- `engine/plugins/Undo.tsx:108-114` registers `Mod+Shift+Z` as the Mac-redo alias (`redo.global.shift`).
- `app-gmt/main.tsx:291-297` registers `Ctrl+Shift+Z` for camera-undo (`gmt.undoCameraMove`).
- After `normalizeKey`, both keys are identical. Both at scope `'global'`, priority `0` → resolver tie-breaks on insertion order, and `installUndo()` runs first → **the redo handler wins**, camera-undo never fires.

**Fix:** added `priority: 10` to `gmt.undoCameraMove` and `gmt.redoCameraMove` so they win the conflict resolution. GMT's UX contract is "Ctrl+Shift+Z is camera-undo, full stop"; the Mac-redo alias is intentionally suppressed for app-gmt. Mod+Y still does redo for parameters.

**Audit results — undo system is unified and clean:**
- 2 stacks total: `historySlice.undoStack` (engine-core, holds both 'param' and 'camera' scoped txs) + `animationStore.undoStack` (timeline edits, separate by design — F2b's planned unification deferred and not currently blocking).
- 1 dead-code finding: `engineStore.setFormula` had a redundant manual `set({ undoStack: [], redoStack: [] })` after `resetParamHistory()` (which already calls `clearHistory()`). Removed.
- Backward-compat shims (`undoParam`, `redoParam`, `undoCamera`, `redoCamera`) all delegate to `undo(scope)` / `redo(scope)` cleanly — single mechanism.
- GMT's cameraSlice wraps `undoCamera` / `redoCamera` to fire `CAMERA_TELEPORT` after the diff applies → R3F camera warps correctly.
- No orphan undo paths or duplicate stacks found.

**📋 2026-04-26 (late) — F9 + F15 deferred-cleanup (F10/F11 reassessed):**

- **F9 closed** — Dev-mode `componentId` validator. Added `validateComponentRefs(componentRegistry)` in `engine/FeatureSystem.ts` that walks every feature's `viewportConfig.componentId` and `customUI[].componentId`, asserts each resolves in the supplied registry. Console-errors each missing reference with the feature id + site (e.g. `customUI[2]`) so typos surface at boot instead of "blank panel + silent fallback" at first render. `componentRegistry` gained `has(id)` and `ids()` helpers. App-gmt invokes the validator after `registerGmtTopbar()` (lazy-imported so prod bundle doesn't include the validator code). Dev-only via `import.meta.env.DEV` gate.
- **F15 closed** — Removed the 2s `_offsetGuardTimer` auto-clear in `engine-gmt/engine/worker/WorkerProxy.ts`. The drift-converged check in the FRAME_READY handler is the deterministic guard; the timeout was defensive paranoia that, in slow-boot worst case, could fire BEFORE the worker rendered its first post-set frame and let stale FRAME_READY data overwrite `_localOffset`. Removed `_offsetGuardTimer` field, the timer setup in `setShadowOffset`, the timer-clear in the drift check, and the entry in `_clearAllTimers`. If the worker hangs entirely, the gizmo overlay staying at the user's last-set offset is the correct behaviour (was the timeout's only "edge case" justification).
- **F10 + F11 reassessed and deferred** — Original audit estimated both as "30-min cosmetic". Re-audit shows:
  - **F10** (`formula` → `mode`): 54 hits across 30 files, including on-disk GMF / preset format. Naive rename breaks every existing GMT save unless paired with a migration layer in `applyMigrations` that maps `formula` → `mode` on load. That's mid-size refactor, not a paper-cut.
  - **F11** (`FractalEvents` → `EngineEvents`): 236 references across 53 files. Mechanical but voluminous; risk-reward of 200+ atomic edits in a multi-purpose session is poor.
  - Both deserve dedicated commits when the user wants to invest the time. Documented this scope correction in the deferred table below.

**📋 2026-04-26 (late) — GMF custom-formula loading + save round-trip:**

The 2026-04-25 entry claimed "all GMT PNG and .gmf saves now load correctly" — verified false in audit. Built-in formulas worked; **GMFs containing workshop / Fragmentarium / custom shaders did NOT round-trip**: parseSceneJson only extracted the `<Scene>` block; the `<Metadata>` + shader blocks containing the FractalDefinition were ignored. Saves wrote plain JSON, dropping shader content entirely.

**First fix attempt** (parser plumbing + def registration):
- **`utils/SceneFormat.ts`** — load/save helpers (`loadSceneFromFile`, `extractScenePng`, `embedScenePng`, `snapshotSceneToPng`, `downloadSceneJson`, `downloadScenePng`) all accept optional `parser` / `serialize` parameters. Defaults preserve existing behavior; apps inject richer formats via the SceneIO plugin.
- **`engine/plugins/SceneIO.tsx`** — `InstallSceneIOOptions` gains `parseScene` + `serializeScene` overrides. Threaded through every load + save path (JSON, PNG, dropdown items, quick-PNG button).
- **`app-gmt/main.tsx`** — installs SceneIO with `parseScene` that calls `loadGMFScene`, registers the def in both registries (local `FractalRegistry` + worker via `REGISTER_FORMULA` event), and returns the preset; `serializeScene: saveGMFScene` for round-trip.
- **`engine-gmt/components/panels/formula/FormulaSelect.tsx`** — Import-Formula button had the same registration gap; fixed to register the def explicitly before delegating to `loadScene`.

**Second fix — compile gating** (loadScene vs loadPreset):
SceneIO's LoadButton called `loadPreset(preset)` directly. `loadPreset` only emits `CONFIG: { formula }`, never `CONFIG_DONE`. The worker waited on the 200ms scheduleCompile debounce, and the REGISTER_FORMULA + CONFIG ordering was racy. Switched to `loadScene({preset})` so CONFIG_DONE fires.

**Third fix — the ACTUAL root cause** (full config flush):
After the first two fixes, custom formulas still rendered as a fallback sphere. Side-by-side read of gmt-0.8.5's `loadScene` revealed engine-core's `loadScene` was a stripped-down stub missing **three critical steps** that 0.8.5 does between `loadPreset` and `CONFIG_DONE`:

1. **Full config flush** — `getShaderConfigFromState(get())` builds a complete `ShaderConfig` snapshot (formula + every feature slice) and emits it as ONE CONFIG event. Without this, the worker only knows the formula changed, but its config still has stale values for every other field. The recompile produces a broken shader (rendered as a sphere — the fallback DE).
2. **Offset push** — `engine.setShadowOffset(precise)` + `engine.post({type:'OFFSET_SET', offset})` ensures the first frame after recompile uses the loaded viewpoint, not a stale pre-load offset.
3. **CONFIG_DONE** to skip the debounce (was already added in the second fix).

Fix: ported all three steps from `gmt-0.8.5/store/fractalStore.ts:206-253` into [`store/engineStore.ts`](store/engineStore.ts) `loadScene`. Engine-core stays generic — `getShaderConfigFromState` already existed for this exact use case; it walks `featureRegistry.getAll()` for the slice payload, no GMT coupling.

**Why this fixes the sphere bug:** the worker's recompile now sees the full feature state for the loaded scene (lighting, optics, geometry, coloring, quality, …), not just the formula change. The shader compiles correctly with the right uniforms and structure.

**What this unlocks:** workshop saves load on a fresh runtime; Fragmentarium GMFs in `public/gmf/fragmentarium/` work via the file picker; PNG round-trip preserves the active formula's shader; custom-formula loads compile on the first frame after the user picks the file (no 200ms delay, no missing-formula races).

**All four load paths now use `loadScene({preset})` + CONFIG_DONE**: app-gmt boot (line 282), FormulaSelect Import button, SceneIO file picker, LoadingScreen "Load From File".

**Fourth fix — LoadingScreen bypass + API consolidation:**
LoadingScreen's "Load From File" called `loadSceneFromFile(file)` with no parser argument, fell back to engine-core's plain-JSON parser, skipped formula-def registration → sphere bug at boot even after fix #3.

Fix: removed `loadSceneFromFile` from `utils/SceneFormat.ts` entirely (was a footgun — easy to call without a parser and silently downgrade GMF to JSON). Replaced with single `loadSceneFile(file)` exported from `engine/plugins/SceneIO.tsx` that always routes through the registered `parseScene`. **One public file-loader, no opt-in argument, no way to bypass.** LoadingScreen + SceneIO LoadButton both use it; future file-pick affordances (drag-drop, deep links) inherit GMF parsing automatically.

**Fifth fix — symmetric save-side consolidation:**
Same footgun on the save side: `downloadSceneJson` / `downloadScenePng` accepted an optional serialize argument that defaulted to plain JSON. Only SceneIO called them (correctly with `_serializeScene`), but a future caller could bypass the GMT GMF serializer.

Fix: removed `downloadSceneJson` and `downloadScenePng` from `utils/SceneFormat.ts`. Replaced with `saveSceneJson(filename?)` and `saveScenePng(filename?)` exported from `engine/plugins/SceneIO.tsx`. Both:
- Read the current preset from the store (no `preset` arg — single source of truth)
- Use the registered canvas accessor (no `canvas` arg for PNG)
- Bake in `_serializeScene ?? serializeScene` (registered serializer, plain-JSON fallback)
- Default filename derives from `projectSettings.name`

Public Scene I/O surface is now symmetric and bypass-proof:
- `loadSceneFile(file)` — read with registered parser
- `saveSceneJson(filename?)` — write with registered serializer
- `saveScenePng(filename?)` — snapshot + write with registered serializer

Lower-level building blocks (`extractScenePng`, `parseSceneJson`, `embedScenePng`, `snapshotSceneToPng`, `serializeScene`, `downloadBlob`, `canvasToPngBlob`) stay exported from `utils/SceneFormat.ts` for advanced format authors.

**PNG load path verified through GMF parser:** PNG path is `LoadButton.handleFile` → `loadSceneFromFile(file, _parseScene)` → `extractScenePng(file, parser)` → reads iTXt under `SceneData` (new) or `FractalData` (legacy 0.8.5) → `parser(content)` = app-gmt's GMF-aware `parseScene`. Same parser, same registration, same `loadScene({preset})` sequence as `.gmf` files. PNG bucket-render saves already use `saveGMFScene` so the round-trip preserves formulas.

**📋 2026-04-26 (evening) — Backlog audit + quick-win cleanup:**

Spawned 4 parallel research agents to verify status of every "active backlog" / "deferred" item against current source. Findings + applied fixes:

- **Backlog drift corrected.** Several items listed as outstanding were already done; the doc was stale. See [Remaining work](#remaining-work) below for the corrected list.
- **F14 shim cleanup — closed.** `BezierMath.ts`, `BloomPass.ts`, `UniformNames.ts` were already one-line re-exports. `RenderPipeline.ts` had a 19-line diff (engine-gmt imported `QualityState` from features/quality vs engine-core's inline loose record). Dropped the index-signature mismatch in engine-core's local `QualityState` shape so engine-gmt's narrower type is structurally assignable; collapsed engine-gmt's RenderPipeline.ts to a re-export.
- **`showQuickPng` typecheck error — fixed.** Stale option in `app-gmt/main.tsx`; QuickPngButton already auto-registers when `getCanvas` is supplied. Removed.
- **`express` + `@types/express` — removed from devDependencies.** Old `server/server.js` was deleted in stage 16; no remaining imports.
- **README + demo/README + smoke-script wiring — verified up-to-date** (HANDOFF claims were stale: README correctly describes gmt-engine + port 3400, demo/README lists registerFeatures.ts, all 29 `debug/smoke-*.mts` files wired into `package.json`).
- **EnginePanel visibility toggle — already wired** ([`engine-gmt/topbar.tsx:539-559`](engine-gmt/topbar.tsx#L539-L559)). HANDOFF was stale.
- **Orbit-trap gradient port — non-issue.** Agent C found fluid-toy has identical orbit-trap modes to GMT; "richer multi-stop / radial / angular" claim in prior HANDOFF was aspirational/wrong. Removed.

**📋 2026-04-26 (afternoon) — TSAA unification + bucket-dialog black-frame fix:**

- **AccumulationController protocol** ([`engine/AccumulationController.ts`](engine/AccumulationController.ts)) — generic interface (accumulationCount, convergenceValue, isPaused, setPreviewSampleCap, resetAccumulation). Both WorkerProxy classes (engine-core stub + engine-gmt full) `implements AccumulationController`.
- **`installAccumulationBindings`** ([`store/slices/installAccumulationBindings.ts`](store/slices/installAccumulationBindings.ts)) — one-call helper: subscribes `isPaused` / `sampleCap` from `renderControlSlice` to any controller. Replaces ad-hoc per-app subscriptions. Pairs with `reportAccumulationToStore` for the reverse direction.
- **AdaptiveResolution module** ([`engine/AdaptiveResolution.ts`](engine/AdaptiveResolution.ts)) — pure decision module with the full TSAA algorithm (still-FPS seeding, first-window jump-to-ideal, 0.7/0.3 EMA, FPS-scaled grace, deep-accumulation protection, hold/suppress/alwaysActive options). Used by both GMT's worker `UniformManager.syncFrame` and engine-core's `viewportSlice.reportFps`. Net delta: −94 lines after dedup.
- **Bucket-render black-frame fix** — `adaptiveSuppressed` was set by the bucket popup but never reached GMT's worker. Each user interaction → adaptive scale change → `pipeline.resize()` → `resetAccumulation()` → cleared (black) FBO briefly visible. Fix: plumbed through `EngineRenderState` → `renderState` payload → UniformManager → `tickAdaptiveResolution(suppressed)`.
- **Initial `sampleCap` past max** — known race (initial SET_SAMPLE_CAP arrives at worker pre-engine-creation, silent no-op). Ported gmt-0.8.5's onBooted re-push pattern: [`engine-gmt/renderer/install.ts`](engine-gmt/renderer/install.ts) wraps the app's onBooted callback with a re-push of isPaused / sampleCap.
- **Bucket popup stay-open conditions** — gmt-0.8.5's `RenderTools.tsx:50-69` suppresses click-outside-dismissal during isBucketRendering / previewRegion / `interactionMode === 'selecting_preview'`. Ported to `BucketRenderToggle` in `engine-gmt/topbar.tsx`.
- **Dead code removed** — `bindStoreToEngine`'s isPaused/sampleCap subscriptions were wiring the engine-core stub proxy (different singleton from the real GMT worker proxy) — silently inert in GMT. Removed.
- **Architecture doc**: [11_TSAA.md](docs/history/engine/11_TSAA.md) — full protocol + algorithm + per-app integration patterns + plumbing-pitfalls audit checklist.

**📋 2026-04-26 — GMT port complete. Final wiring pass:**
- **Loading screen** — GMT-branded splash with CPU Julia spinner, formula picker dropdown, Load From File, Lite Render toggle ported to `app-gmt/LoadingScreen.tsx`. Replaces the minimal engine stub.
- **Share Link** — `ShareLinkButton` topbar component with Copied!/N/A/Long URL feedback. Workshop formula detection. URL length guard strips animations if >4096 chars.
- **Adaptive warmup** — first sample window after interaction seed uses 200ms (not 500ms) and jumps directly to `idealScale` (no EMA). Subsequent windows revert to normal 500ms + 0.7/0.3 smoothing.
- **Drawing tools** — `DrawingPanel` registered as `'panel-drawing'`; manifest switched from `features:` to `component:`. Drawing overlay and tick registered.
- **Formula Workshop** — wired from stub to `openWorkshop()`; mounted as left-dock replacement (same as gmt-0.8.5 layout).
- **Webcam overlay + State Debugger** — registered in componentRegistry; State Debugger appears under System → Advanced.
- **`getExtraMenuItems()`** — was never called in topbar.tsx; added loop so features using `menuItems[]` (not `menuConfig`) get system-menu entries.
- **Mesh Export** — saves scene to localStorage + opens `public/mesh-export/index.html` in new tab.
- **Public assets** — `public/formulas/` (manifest.json + dec.json + frag library), `public/gmf/` (gallery.json + fragmentarium GMFs), `public/mesh-export/` (full pipeline) all committed.
- **Scene loading fixed** — PNG (`FractalData` key) + GMF (`<Scene>` block) both parse correctly.
- **FPS counter unified** — `GmtRendererTickDriver` feeds real FPS to `viewport.reportFps()`.
- **Formula panel migration** — last bespoke panel converted to manifest `items:`. `FormulaPanel.tsx` deleted. All 10 GMT panels now manifest-driven.
- **Light gizmos** — `SinglePositionGizmo` + `OverlayProjection` promoted to `engine/`. `DomOverlays` in all three app layouts.
- **F16/F17/F18** — TopBar snapshot, GLSLToJS dead require, dual singleton — all fixed/closed.

**📋 2026-04-25 (continued) — Formula panel migration, scene loading, FPS, light gizmos:**
- **Formula panel migration** — last bespoke panel converted to manifest-driven `items:` array. `FormulaPanel.tsx` deleted. Per-formula params (iterations + `FractalRegistry`-driven scalar/vec controls) extracted to `FormulaParamsWidget` registered as `'formula-params'`. `LfoList` registered as `'lfo-list'`. `geometry` feature gained `panelConfig` for Hybrid Box Fold compilable section. Julia group uses `showIf` predicate (hidden when `formulaDef.juliaType === 'none'`). All 10 GMT panels are now manifest-driven — no bespoke panel components remain except the genuinely domain-specific ones (LightPanelControls, EnginePanel, CameraManagerPanel). `PanelRouter` separator updated to match `SectionDivider` visual treatment (raised block + gradient, not a thin white line).
- **Scene loading** — all GMT PNG and `.gmf` saves now load correctly. Two root causes: (1) wrong iTXt key — gmt-0.8.5 saves under `'FractalData'`, engine looked for `'SceneData'`; added fallback. (2) GMF format unhandled — `parseSceneJson` now detects `<!--` prefix, extracts `<Scene>` block, parses its JSON. `.gmf` added to SceneIO file-input accept list.

**📋 2026-04-25 (continued) — light gizmos, FPS unification, engine-core promotion:**
- **Light gizmos** — `SinglePositionGizmo` + `OverlayProjection` promoted to `engine/` (were in `engine-gmt/`). Re-export shims keep existing consumers working. `DomOverlays` component (renders `featureRegistry.getViewportOverlays().filter(type==='dom')`) added to all three app layouts. `overlay-lighting` + `lightGizmoTick` wired in `registerGmtUi()`. Gizmos tested and working.
- **FPS counter** — `GmtRendererTickDriver` was tracking FPS privately in `throttleRef` but never calling `viewport.reportFps()`, so `useViewportFps()` / `FpsCounter` always showed the default 60. Fixed: `viewport.reportFps(t.fps)` on each 500ms sample window. `fluid-toy` was already correct (called `viewport.frameTick()` via `onFrameEnd`).
- **F16/F17/F18** — all fixed/closed (commit `f2b119d`). TopBar snapshot now returns `_rev`; GLSLToJS dead require path corrected; dual AnimationEngine confirmed non-issue (no local copy exists).

**📋 2026-04-25 sweep (see `docs/history/engine/20_Fragility_Audit.md` F5–F15 entries):**
- **F5 closed** — AnimationEngine camera tracks moved to GMT-side binder module; engine pipeline is camera-shape-agnostic.
- **F7 closed** — `window.useAnimationStore` was leftover scaffolding (no real cycle). Direct imports everywhere.
- **F14 fixed** — Duplicate `ViewportRefs.ts` in `engine/worker/` and `engine-gmt/engine/worker/` had separate module-level `_camera`. Capture path used one copy, dirty-check used the other. Collapsed to a re-export shim. The whole class of "engine-gmt overlay duplicates an engine-core module" is now an audit target.
- **F15 deferred** — Worker `_localOffset` reads zeros for ~20ms at boot before preset values arrive; flagged via Key Cam logging, no visible symptoms.
- **Verbatim ports** — Adaptive resolution badge, Key Cam keyframe body, RenderPopup (video render), GMT logo all ported from `gmt-0.8.5/` rather than reinvented. Lesson saved: when fixing GMT-specific behaviour, the working code is upstream; copy + rewrite imports beats bending engine-core generics.
- **Lifecycle-in-unmounted-components** — Modulation-record overrides cleanup, timeline-hover scope push, `setMouseOverCanvas` for adaptive's settle-on-canvas all moved off legacy `<ViewportArea>` useEffects to plugin-tick or `ViewportFrame` DOM handlers.
- **Panel-manifest** gained `compilable` item type so `<CompilableFeatureSection>` can drive volume scatter / hybrid box / interlace from items lists, not bespoke JSX.
- **State-library plugin** validated by 2nd-app reuse: fluid-toy's "Views" + GMT's "Camera Manager" share `StateLibraryPanel` + `installStateLibrary` (slice + slot shortcuts + topbar menu in one call). View Manager dock-left default, GMT-style preset button grid, ActiveSnapshotFeatures footer helper.
- **Help system** — `helpId` on PanelDefinition / ParamConfig / GroupConfig / PanelItem; `?` button next to hint copy; right-click context-menu DOM walk.

**📐 Architecture baseline committed (2026-04-22).** 12 engine-scope docs written under `docs/01_*` through `docs/20_*`. Start any session with `docs/DOCS_INDEX.md`; the table in `CLAUDE.md` maps "working on X" → "read Y". All design decisions (core+plugins model, feature isolation, unified undo, auto-binding animation, bridges/derived) live in those docs. Any architectural change goes in a doc before it goes in code.

## What this is

An experiment in extracting a reusable application engine (DDFS + animation + UI framework + save/load + worker stub + shader assembly) from GMT. The first goal is to port toy-fluid onto this engine as a proof, then eventually rebuild GMT's raymarching pipeline on top as a plugin.

**Core principle:** strip fractal/raymarching content, preserve every generic pattern with plugin seams so the stripped capabilities can be re-introduced cleanly later.

## Current tree

```
engine/           FeatureSystem, FractalEvents, TickRegistry, AnimationEngine,
                  BezierMath, UniformSchema, UniformNames, HardwareDetection,
                  ShaderBuilder (generic 5-primitive + addSection),
                  ShaderFactory (generic, iterates features), ConfigManager
                  (generic DDFS diffing), ConfigDefaults (generic),
                  RenderPipeline (ping-pong + accumulation), BloomPass,
                  worker/ (WorkerProxy STUB + ViewportRefs), codec/,
                  algorithms/, math/, utils/

store/            fractalStore (generic composition shell, 260 lines),
                  createFeatureSlice, CompileGate, animationStore,
                  animation/, slices/ (ui, renderer, history — generic)

utils/            colorUtils, pngMetadata, fileUtils, helpUtils, CurveFitting,
                  ConstrainedSmoothing, GraphUtils + GraphRenderer (animation
                  keyframe curve editor), keyframeViewBounds, timelineUtils
                  (generic), PresetLogic (generic), Sharing, UrlStateEncoder,
                  histogramUtils

features/         index, types, ui, audioMod, modulation, webcam, debug_tools,
                  color_grading, post_effects
                  — all generic. Fractal-leaning features (camera_manager,
                  coloring, navigation, optics, droste, drawing) deleted.

components/       App shell (App.tsx, LoadingScreen, ViewportArea generic),
                  primitives (Slider, Knob, Dropdown, ToggleSwitch, TabBar,
                  Popover, CollapsibleSection, PanelHeader, StatusDot, etc.),
                  inputs/, vector-input/, pickers, gradient/, timeline/
                  (DopeSheet, KeyframeInspector, TrackRow, minimal
                  TimelineToolbar stub), graph/ (animation keyframe curve
                  editor), layout/ (Dock, DropZones), viewport/ (Composition
                  Overlay, FixedResolutionControls), AutoFeaturePanel,
                  CompilableFeatureSection, PanelRouter, AnimationSystem,
                  KeyframeButton, Histogram, ParameterSelector,
                  PopupSliderSystem, DraggableWindow, ComponentRegistry,
                  GlobalContextMenu, HelpBrowser, CompilingIndicator,
                  MobileControls, PerformanceMonitor,
                  contexts/StoreCallbacksContext

toy-fluid/        Kept as reference; first port target

docs/             Preserved as reference (all fractal-documented — read-only
                  for patterns, don't treat as engine truth)

HANDOFF.md        This doc
```

## What's done

**Git history on top of GMT (15 commits):**

1–11. Delete-by-domain stages (formulas, mesh export, Fragmentarium, raymarching shader chunks, fractal DDFS features, fractal engine internals, modular graph, prototypes/test harnesses, misc ephemera, fractal UI, 4 truly fractal files).

12. Genericize stage — ShaderBuilder rewritten to 5 generic primitives + `addSection`, ShaderFactory/ConfigManager/historySlice/engineStore/PresetLogic all stripped to their generic kernel. FractalEngine, MaterialController, SceneController, UniformManager, controllers/, overlay/, FormulaFormat, remaining shader chunks deleted.

13. **Fix pass to zero tsc errors** — deleted remaining fractal-leaning features (camera_manager, coloring, navigation, optics, droste, drawing), stubbed the worker subsystem (WorkerProxy as in-memory stub; internals deleted), rewrote App/LoadingScreen/ViewportArea/useAppStartup as minimal generic shells, property-access-cast all downstream feature consumers, fixed type mismatches (QualityState typed numerics, WorkerProxy overloads, Timeline onZoom, registry stub shape).

**Verified:** `npx tsc --noEmit` exits 0.

## Plugin seams designed in

Where a future fractal plugin (or any other app) re-installs its capabilities:

| Capability | Re-entry via |
|-----------|--------------|
| Named shader pipeline stages (post-map, miss-handler, integrator, …) | `ShaderBuilder.addSection(name, code)` + `getSections(name)` — plugin registers its pipeline DSL, its own assembler reads sections back |
| Feature state (any shape) | `FeatureRegistry.register(def)` + generic `createFeatureSlice` auto-generates Zustand slice + `AutoFeaturePanel` auto-generates UI |
| Render engine / render loop | Not supplied by engine. App instantiates its own, consuming the store + the shader built by ShaderFactory |
| Worker offload | `WorkerProxy` is an in-memory stub + registry. Apps install a real Worker-backed proxy via `setProxy(realProxy)` so generic dev/ code and the renderer share one singleton (engine-gmt does this in `installGmtRenderer`). |
| Compile scheduling | `CompileGate.queue(msg, fn)` returns `Promise<void>`; opens a cycle on `CompileProgressStore` (single source of truth for spinner state); 500 ms safety net flushes if `pingRef` never paints. |
| Compile progress UI | `store/CompileProgressStore.ts` — both `LoadingScreen` and `CompilingIndicator` subscribe; rAF loops poll `selectProgress(state, now)`. Bar fill via `transform: scaleX` (compositor thread) survives Firefox's main-thread paint stalls. |
| Config diffing | `ConfigManager.update(newConfig, runtimeState)` → `{rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset}` |
| Preset save/load | `PresetLogic.applyPresetState` iterates feature registry + invokes feature setters. `utils/pngMetadata` for PNG embed. `utils/Sharing` + `UrlStateEncoder` for URL state |
| Undo/redo | `historySlice` — snapshots ALL feature state via registry iteration, automatic for any future plugin |
| Animation engine | `engine/AnimationEngine.ts` with `connect(animStore, hostStore)` injection; no direct store coupling |
| TickRegistry phases | SNAPSHOT → ANIMATE → OVERLAY → UI |
| UI componentRegistry | Apps register panel + overlay components by string ID; DDFS feature defs reference them |
| Custom camera controller | Not supplied. Apps install their own Navigation component |
| FormulaType | `type FormulaType = string` — apps narrow via declaration merging |
| ShaderConfig | `Record<string, any>` with engine-level scalar fields — apps widen via declaration merging |

## Phase progress

### ✅ Phase 0 — Architecture baseline (2026-04-22, stages 14-15)
- Feature-residuals cleaned, SceneFormat.ts generic, default panel config genericized.
- Runtime boot verified; `debug/smoke-boot.mts` passes.
- `PanelId: string` + `AutoFeaturePanel` registered as `'auto-feature-panel'`.
- Demo add-on in `demo/` proves the three-step plugin contract end-to-end.
- Fragilities F1 (96a4b5f), F2 (96a4b5f), F3 (a4e7d6b), F4 (c6ee640) — all 🟢 Fixed.

### ✅ Phase 1 — Fractal-toy (2026-04-22, commits `4830a2c` … `b9d13f9`)
- `fractal-toy/` — minimal Mandelbulb playground: one formula, orbit+fly camera, directional light. Used `ShaderBuilder.addSection` as the escape hatch's first real load.

### ✅ Phase 2 — Viewport plugin (2026-04-22, `610b4e0` … `2f73612`)
- `@engine/viewport` (`engine/plugins/Viewport.tsx`) with GMT's production adaptive-quality loop ported and genericized.
- `<ViewportFrame>`, `<ViewportModeControls>`, `<FixedResolutionControls>`, `<AdaptiveResolutionBadge>` — shared plugin components.
- Immediate quality drop on interaction; `smoke:viewport` passes.

### ✅ Phase 3 — Toy-fluid port (2026-04-22, `4830a2c` … `205745a`)
- `fluid-toy/` — engine-native port of the reference `toy-fluid/`. FluidEngine mounts via `<ViewportFrame>` + `qualityFraction`; pointer→splat interaction layer; julia-c auto-orbit via modulation-style tick.
- `@engine/topbar` (`engine/plugins/TopBar.tsx`) — slot-based host + default items (ProjectName, FpsCounter).
- `@engine/scene-io` (`engine/plugins/SceneIO.tsx`) — Save + Load via topbar slot registration, delegates to `utils/SceneFormat.ts`.
- `<TimelineHost>` — shared animation-timeline chrome with GMT's 317-line TimelineToolbar ported as reusable engine chrome.

### ✅ Phase 4 — Input + undo + camera (2026-04-23, `8662447` … `2b8b6f9`)
- **4a** `engine/animation/modulationTick.ts` — canonical modulation tick; orbit refactored to register LFO animations via `setAnimations` instead of its own per-frame tick.
- **4b** `@engine/shortcuts` (`engine/plugins/Shortcuts.ts`) — scope-based keyboard dispatcher with priority resolution, text-input guard, rebinding hook.
- **4c** `@engine/undo` (`engine/plugins/Undo.tsx`) — unified transaction stack with scoped shortcuts (`Mod+Z` global, `Mod+Z` in `timeline-hover` scope routes to animation undo). Topbar Undo/Redo buttons. (F2b — 🟢 Fixed.)
- **4d** `@engine/camera` (`engine/plugins/Camera.ts`) — adapter-based slot plugin. Apps register a `CameraAdapter` with `captureState`/`applyState`; slots 1-9 save/recall via Ctrl+1..9 / 1..9. Preset round-trip via `camera/presetField.ts` side-effect module (F3 registry).

### ✅ Phase 5 — Animation plumbing (2026-04-23, commit `b82dc18`)
- `engine/animation/modulationTick.ts` now **delegates to GMT's AnimationSystem.tick** via `TickRegistry.ANIMATE`. No reinvention — same code path GMT uses, so keyframe playback, LFO modulation, audio-reactive rules, and resolved liveModulations all work identically.
- `engine/animation/cameraKeyRegistry.ts` — generic Key Cam track list. Default capture path-resolves scalar paths in DDFS store; apps override via `setCameraKeyCaptureFn`.
- `engine/AnimationEngine.ts` extended binder resolution: generic 3-part vec paths (`feature.param.x/y/z/w`) alongside GMT's legacy `vec[23][ABC]_axis` convention.
- `store/engineStore.ts` eagerly imports `animationStore` so `window.useAnimationStore` is set before `bindStoreToEngine()` runs → `animationEngine.connect(animStore, hostStore)` always succeeds.
- Both toys now mount `<EngineBridge />`, `<RenderLoopDriver />`, `<GlobalContextMenu />` from the GMT chrome — not reinvented, just mounted.

**Verified via `debug/smoke-anim-play.mts`:** playback advances frame 0 → 73.5 in 700ms; a 2-keyframe track on `julia.power` (2 → 6 over 30 frames) drives the bound param correctly.

### ✅ Phase 6 — GMT vertical slice (2026-04-24)

The "real confidence anchor" previously flagged in Remaining Work has landed: GMT runs end-to-end on the engine. **app-gmt/** boots the full worker renderer, compiles the Mandelbulb shader, renders with path tracing, and responds to Orbit/Fly navigation. All 26 GMT DDFS features + 42 formulas are registered. Key landmarks:

- **Renderer plugin** (`engine-gmt/renderer/`) — `installGmtRenderer` + `GmtRendererCanvas` (OffscreenCanvas + worker) + `GmtRendererTickDriver`.
- **Navigation ported verbatim** (`engine-gmt/navigation/`) — `GmtNavigation`, `useInputController`, `usePhysicsProbe`, `HudOverlay`. No logic edits, only path rewrites.
- **Store hydration via preset** — app-gmt's boot loads `registry.get('Mandelbulb').defaultPreset` through `loadScene()` so every DDFS slice is populated before the worker compiles. Without this the worker booted with a half-formed config and rendered black. Mirrors GMT's `useAppStartup` exactly.
- **Declaration-merged DDFS slices** (`engine-gmt/storeTypes.ts`) — `FeatureStateMap` augmented so the 18 GMT slices (coloring, lighting, geometry, …) typecheck on the root store without local copy-type drift.

### ✅ Panel manifest migration (2026-04-24)

Dock panels moved from "each feature declares its own tab" to "apps declare a PanelManifest". The old tabConfig path suited fluid-toy (9 features, 1:1 panels) but blocked the GMT port (26 features → 10 curated panels composing 2-9 features each). New model:

- **`engine/PanelManifest.ts`** — `PanelDefinition` type with `features[]` stacking, `component` path for bespoke panels (Graph/FlowEditor), `widgets.before/after/between` slotting, and `showIf` predicates (string path or function). See `docs/history/engine/14_Panel_Manifest.md`.
- **`applyPanelManifest(m)` + `addPanel(def)`** — merge-seed `state.panels`; dynamic additions (fractal-toy formulas) survive regardless of call order.
- **`PanelRouter` rewritten** — three render paths (bespoke component / feature stack with widgets / empty). No hardcoded Graph/CameraManager/Engine special-cases.
- **`Dock.tsx` filters via `evalShowIf`** — hardcoded `Graph if Modular` / `Light if advanced` / `Audio if enabled` / `Drawing if enabled` conditionals pulled out, now declared in each app's manifest.
- **Both docks now mount unconditionally** in AppGmt + FluidToyApp. Fixes the "julia disappears on left-dock drop" bug (panels moved to left had nowhere to render).
- **`FeatureTabConfig` reduced to `{label, iconId?, condition?}`** — `dock / order / componentId / defaultActive / aggregatesFrom` removed from 22 feature files and the type.
- **`applyDefaultPanelLayout.ts` + `featureRegistry.getTabs()` deleted** — no consumers.

App manifests:
- `engine-gmt/panels.ts` — 10 panels (Formula / Scene / Shader / Gradient / Quality / Light / Audio / Drawing / Graph / Engine).
- `fluid-toy/panels.ts` — 9 panels, 1:1 with features.
- `fractal-toy/panels.ts` — 2 static + formulas via `addPanel`.

### Known gaps after panel migration

(Most of these closed in the subsequent topbar / compile / camera / formula-picker passes — see below.)

### ✅ Topbar port — Passes 1-3 (2026-04-24)

- **Pass 1 (inline items + menus)**: Playing badge (left, pulsing green when animating), PT toggle (left, flips `renderMode` between Direct + PathTracing), **Camera menu** (Reset Position, Camera Manager stub, 9 slots with click-to-recall / save-on-empty), **System menu** (Advanced Mode, Invert Look Y, Hide Interface, Force Mobile UI, Formula Workshop stub), extended Menu plugin with `disabled?` on button/toggle items.
- **Pass 2 — Light Studio**: Ported `CenterHUD` verbatim — 3-orb collapsed / 8-light 3×3 expanded, shadow toggle + popup, light-gizmo toggle. Registered into the TopBar's `'center'` slot. LightControls / LightDirectionControl / ShadowControls / SingleLightGizmo were already in `engine-gmt/features/lighting/components/`.
- **Pass 3 — Viewport Quality**: Ported `ViewportQuality.tsx` verbatim (PT-aware per-subsystem tier controls + master preset + compile-time batching).
- **Scalability slice** — Ported `scalabilitySlice.ts` from gmt-0.8.5 to `store/slices/`. Root types already declared `scalability` + `hardwareProfile` but nothing initialised them, so ViewportQuality crashed until this landed.

### ✅ Compile pipeline + formula switching (2026-04-24)

- **`engineStore.setFormula` rewritten** to mirror GMT's full flow: clone defaultPreset → preserve compile-time engine params marked `onUpdate:'compile'` → honour `lockSceneOnSwitch` → `loadPreset` → `CONFIG_DONE` event → worker immediate compile.
- **`setFormulaPresetResolver(fn)`** — engine-core stays decoupled from any specific formula registry; apps register their own resolver (engine-gmt-based apps pull from `engine-gmt/engine/FractalRegistry`).
- **`FRACTAL_EVENTS.CONFIG_DONE`** — new generic event; `engine-gmt/renderer/GmtRendererTickDriver` bridges it to `proxy.post({type:'CONFIG_DONE'})` so the worker fires immediate compile without the 200ms scheduleCompile debounce.
- **CompilingIndicator** mounted in AppGmt — IS_COMPILING events (forwarded by WorkerProxy from the worker's FractalEngine) now drive a visible spinner.
- **PT toggle** flips `state.renderMode` (not `ptEnabled`) — the bindings.ts subscription forwards to `setLighting({ renderMode })`, which is the compile-triggering DDFS write GMT expects. `ptEnabled` stays always-on to avoid a second compile hop.

### ✅ Formula picker (2026-04-24)

- Ported GMT's `FormulaSelect` + `FormulaGallery` (full thumbnail-grid dropdown with category sections + type-to-filter + preview) + `FormulaContextMenu` into `engine-gmt/components/panels/formula/`. Registered as `'formula-select'` componentId and slotted via `widgets.before: ['formula-select']` on the Formula panel — matches GMT's layout exactly (picker at the top of the Formula panel, not in the topbar).
- Copied 42 formula thumbnails into `public/thumbnails/` so the gallery preview works.

### ✅ Camera round-trip (2026-04-24)

All three broken flows fixed:

- **Initial load**: after bootWithConfig, `proxy.setShadowOffset(precise)` + `proxy.post({type:'OFFSET_SET'})` so the worker's sceneOffset matches the hydrated preset from frame 1 (mirrors GMT's `useAppStartup`).
- **Formula switch / preset load**: `engineStore.loadPreset` emits both `CAMERA_TELEPORT` AND `OFFSET_SET` directly — Navigation warps the R3F camera, the OFFSET_SET bridge pushes sceneOffset to the worker.
- **Navigation movement**: app-gmt's `setSceneOffset` prop emits `OFFSET_SET` so orbit-absorb and fly-controller keep the worker offset in sync.
- **Reset Position** (Camera menu): restores the current formula's `defaultPreset.{cameraRot, sceneOffset, targetDistance}` via CAMERA_TELEPORT.
- **Preset fields**: `sceneOffset` and `cameraMode` added to `presetFieldRegistry` — save/load now preserves them.

### ✅ Widget registrations (2026-04-24)

- **ColoringHistogram** (per-layer, driven by HistogramProbe readbacks)
- **scene_widgets**: `OpticsControls`, `OpticsDofControls`, `NavigationControls`, `ColorGradingHistogram`
- **HybridAdvancedLock**, **JuliaRandomize**, **InteractionPicker** (Julia c / Mandelbrot c-param picker)
- **EnginePanel** (bespoke, registered as `'panel-engine'`) — surfaces compile-time feature toggles in its own layout. Visibility gated on `engineSettings.showEngineTab`; toggle wired in `engine-gmt/topbar.tsx:539-559` under System → Advanced.
- **CameraManagerPanel** (bespoke, `'panel-cameramanager'`) — fully wired. Slice at `engine-gmt/store/cameraSlice.ts` (composes engine-core's `installStateLibrarySlice` factory), panel at `engine-gmt/features/camera_manager/CameraManagerPanel.tsx`, slot active in `engine-gmt/panels.ts:374-380`. Includes thumbnail capture, drag-reorder, slot shortcuts (Ctrl+1..9 / 1..9), and `undoCamera` / `redoCamera` wrappers that fire `CAMERA_TELEPORT` after engine-core's history slice restores the diff.

### ✅ Interaction picker (2026-04-24)

- Ported `useInteractionManager` hook (focus picking + Julia picking with drag + lerp + record-keyframes) verbatim.
- Mounted in AppGmt with a `viewportRef` on the ViewportFrame's inner wrapper.
- Added `'picking_julia'` to root `InteractionMode` type (extraction drop).

### ✅ Menu plugin — live store subscription (2026-04-24)

- Menu plugin now subscribes to `useEngineStore` and bumps its notify rev on every store change, so toggle items' `isActive()` re-evaluates on each render. Previously the badge stayed stale until a menu-item re-registration. Advanced Mode badge flips correctly now.

### ✅ Post-phase-5 cleanup (2026-04-23 afternoon)

Everything flagged as "known gaps after Phase 5" has landed:

- **F12** 🟢 — UNDERSCORE vec binder in `AnimationEngine.getBinder` via shared `writeVecAxis` helper. Camera Key Cam + AutoFeaturePanel vec2/3/4 all line up on one convention. (commit `be62d7d`)
- **F13** 🟢 — GMT-specific target hijacks (`julia.*` / `coloring.*` / `geometry.*Rot`) in `AnimationSystem.tsx` gated on their slices. Generic DDFS vec + scalar fallback populates `liveModulations` without requiring a `uniform` declaration. (commit `be62d7d`)
- **trackBinding helper** extracted to `engine/animation/trackBinding.ts`. `deriveTrackBinding()` + `readLiveVec()` are the canonical track-ID derivation — AutoFeaturePanel's four branches all route through it. (commit `252060a`)
- **Canvas right-click menu** wired on fluid-toy (Copy Julia c / Pause / Orbit / Recenter / Reset). (commit `ae13ce2`)
- **Canvas pan + wheel + middle-drag zoom** in `FluidPointerLayer.tsx`. Right-drag pans, wheel zooms cursor-anchored, middle-drag zooms click-point-anchored. (commits `e518f47`, `bf1ba8d`)
- **Julia/Mandelbrot kind switch** as a DDFS enum param. (commit `3549d4e`)
- **Vec2 keyframe buttons** in AutoFeaturePanel (the missing `trackKeys` prop on Vector2Input). (commit `acb530c` — immediately superseded by the trackBinding refactor.)
- **Screenshot folded into scene-io** — standalone camera button + `Alt+S` hotkey + dropdown "Save PNG…" all route through one `saveCurrentPng` helper. `Ctrl+Shift+S` is browser-reserved, never reaches JS. (commit `a6795da`)

## Remaining work

> Audited 2026-04-26 evening. Quick wins applied; this list is the post-audit truth.

### Active backlog — real work

**GMT port — finish-the-job items:**
*(none currently outstanding — cameraSlice was at `engine-gmt/store/cameraSlice.ts` all along; the audit that flagged it as missing only searched `store/slices/`.)*

**Fluid-toy polish:**
- **Gesture-mode switcher** — brush / emitter / pick-c / pan-zoom UI. Today's `FluidPointerLayer.tsx` hardcodes left-drag splats / right-drag pan / middle-zoom / wheel-zoom. No mode switcher.
- **MandelbrotPicker as viewport overlay** — component exists at `fluid-toy/components/MandelbrotPicker.tsx` registered as `'julia-c-picker'`. Currently surfaced only via the Julia panel's customUI slot; reference toy-fluid has it as a persistent bottom-right canvas overlay.
- **DDFS-param parity audit** — 53 params currently ported across 9 features (brush/collision/composite/coupling/fluidSim/julia/palette/postFx/presets). Tone-mapping, bloom, orbit-trap coloring all DONE. No comprehensive audit of which of the original ~87 reference toy-fluid params remain unported.

### Deferred — no visible symptoms, cosmetic / architectural

| ID | What | Where | Realistic effort |
|----|------|-------|------------------|
| **F6** | Auto-register DDFS feature setters via `binderRegistry` (escape hatch shipped; full auto-reg deferred) | `engine/AnimationEngine.ts` + `engine/FeatureSystem.ts` | 30 min for scalar/vec params; camera + light tracks must stay explicit |
| **F8** | UI-state undo (panel collapse, timeline scroll, dock layout) — `historySlice` snapshots only registered features today | `store/slices/historySlice.ts:83-94` | 5 min naive (add to snapshot loop); 2 h with scoped 'ui' undo separation |
| **F10** | Rename `formula: string` → `mode` in store types | `types/store.ts:81` + 30 files + on-disk GMF / preset format | **2-3 h** — needs a migration in `applyMigrations` mapping `formula → mode` on load to avoid breaking existing saves. **Not a paper-cut.** |
| **F11** | Rename `FractalEvents` → `EngineEvents` | `engine/FractalEvents.ts` + 53 consumer files (236 references) | **1-2 h** — mechanical but voluminous. Better as a focused commit, not bundled. |

### Closed in 2026-04-26 audit (was listed as outstanding)

- ✅ **F9** — dev-mode `componentId` validator (`validateComponentRefs`)
- ✅ **F14** shim cleanup — all 4 files now re-exports
- ✅ **F15** — worker `_localOffset` 2s timeout removed; drift check is the deterministic guard
- ✅ **GMF custom-formula loading + save round-trip** — `parseScene` / `serializeScene` plugin hooks; app-gmt wires `loadGMFScene` + `saveGMFScene`; FormulaSelect import button now registers def
- ✅ `showQuickPng` typecheck error
- ✅ `express` / `@types/express` removal
- ✅ README + demo/README + smoke-script wiring (verified up-to-date, claims were stale)
- ✅ EnginePanel "Show Engine Tab" toggle wiring (already shipped in topbar.tsx)
- ✅ Orbit-trap gradient port (non-issue — no richer modes exist in fluid-toy reference)

## How to resume

```bash
cd h:/GMT/gmt-engine
git log --oneline -30          # full stage progression
npm run typecheck              # should exit 0
npm run dev                    # plain vite on localhost:3400

# Entry points:
#   http://localhost:3400/               — engine shell (demo add-on)
#   http://localhost:3400/fractal-toy.html — minimal Mandelbulb playground (phase 1)
#   http://localhost:3400/fluid-toy.html   — engine-native fluid toy port (phases 3-5)

# In another shell — smoke checks:
npm run smoke:boot             # headless boot, fail on pageerrors
npm run smoke:interact         # state-flow + save round-trip
npm run smoke:screenshot       # visual baseline → debug/scratch/engine-boot.png
npm run smoke:viewport         # adaptive-quality viewport plugin
# Direct:
npx tsx debug/smoke-anim-play.mts  # timeline playback (phase 5)
```

Note: the `dev` script is now plain `vite`. GMT's custom Express
`server/server.js` was removed in stage 16 — it ran Vite in
middleware mode without attaching HMR to the HTTP server, which
caused full-page reloads every 1-2s. Plain `vite` works out of
the box.

The `upstream` remote points at GMT. Pull updates with `git fetch upstream`. There is no `origin` — nothing pushes anywhere until you add one.

If the experiment turns out not to work: `rm -rf h:/GMT/gmt-engine`. GMT is untouched.

## Key memory references

- `memory/feedback_refactor_approach_selection.md` — why clone-and-strip beat in-place workspace refactor
- `memory/feedback_strip_vs_delete.md` — when to genericize vs delete (generic patterns worth preserving even when fractal-coupled)
- `memory/project_gmt_engine_extraction.md` — pointer to this repo + HANDOFF.md

## Code review

`docs/history/engine/21_Code_Review_2026-04-25.md` — independent multi-agent source survey (2026-04-25). Records what matches the architecture docs, where docs overstate, three live bugs (F16–F18), and the full dual-tree inventory. Read before touching `engine/plugins/`, the dual-tree (`engine-gmt/engine/`), or the onboarding surfaces (README, demo, package.json).
