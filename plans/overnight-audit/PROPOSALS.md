# Tier B — needs your judgement

Nothing here has been applied. Each entry gives the claim, the evidence, the
options and a recommendation, so you can decide without re-reading the code.

---

## ⚠️ First: two ADR commits predate your "ADRs are Tier B" ruling

You ruled mid-cycle-1 that the run must never edit `docs/adr/**` (the `guard.mjs`
hook escalates every ADR write to a permission prompt, which stalls an unattended
run). Two ADR commits had already landed by then:

- `652fb61c` — line-citation refresh on ADRs 0001 / 0003 / 0004
- `8842a839` — ADR-0110 low-fps mechanism correction

Both are append-only `> **Update ...**` blocks with the ADR bodies untouched, both
are verified, and both are on the audit branch only. **Keep them or drop them —
your call.** To drop: `git rebase --onto <parent> <commit>` or simply don't
cherry-pick them. From cycle 2 onward the run edits no ADRs at all; corrections
arrive here as paste-ready text instead.

`PROTOCOL.md` now carries the rule in its hard-boundaries section.

---

## MEDIUM — Lowering the Auto-Stop slider throws away a converged render

_(cycle 2 · `engine/RenderPipeline.ts:492`)_

`setSampleCap(cap)` runs `if (cap > 0 && this.accumulationCount > cap) this.resetAccumulation();`.
The generic binding that feeds it documents the **opposite** —
`store/slices/installAccumulationBindings.ts:42-44`: *"changing the cap
mid-render does NOT reset accumulation; if the new cap is below the current
count, the controller stops adding samples but keeps the existing buffer."*

The chain is proven end-to-end: store `sampleCap` → `installAccumulationBindings.ts:47`
`controller.setPreviewSampleCap(n)` → `WorkerProxy.ts:670` posts `SET_SAMPLE_CAP`
→ `renderWorker.ts:530` → `FractalEngine.ts:412` `pipeline.setSampleCap(n)`.

The trigger is an ordinary continuous control: `engine/plugins/topbar/PauseControls.tsx:97-101`
is a `Slider` (min 0, max 4096, step 32) wired `onChange={setSampleCap}`. So
dragging **Auto-Stop (Samples)** downward past the current count throws away a
converged buffer and restarts at sample 0 — **repeatedly, once per step, during
the drag.** `RegionOverlay.tsx:71-76` cycles the same cap through
[0, 64, …, 4096]; wrapping 4096 → 0 is safe (0 is uncapped) but 4096 → 64 after
a long accumulation is not.

**Options**

1. **Fix the code** — drop the reset from `setSampleCap`. A converged 512-sample
   image is strictly better than the 64 the user just asked to stop at, and
   `render()` already no-ops once `accumulationCount >= sampleCap`, so the image
   simply freezes where it is. Matches the documented contract, needs no doc
   change, removes the drag-destroys-render behaviour.
2. **Fix the doc** — keep the reset (reading the cap as "re-render with this
   budget") and correct `installAccumulationBindings.ts:42-44`. Then debounce
   PauseControls' slider to end-of-drag, or it still resets N times per drag.
3. Leave both and add an `@invariant` recording the divergence.

**Recommendation: option 1.** The reset destroys work the user already paid GPU
time for, the contradiction resolves for free, and no guard covers the current
behaviour so nothing depends on it. Not applied because which side is wrong is a
product call, and the doc half lives in another subsystem's file.

---

## MEDIUM — Graph-editor curve tools write wrong tangents on log tracks

_(cycle 2 · `utils/CurveFitting.ts:55` — confirmed live by independent verification)_

A track registered via `registerLogTrack` is interpolated in `log(value)` space,
so **its Bezier tangent y-values are log-units**. Every keyframe write path
threads `isLogTrack(trackId)` into `AnimationMath.calculateTangents` — except
`reTangentBezier`, which takes a `Keyframe[]` and no track id, so there is
nothing to derive the flag from. It defaults to `false`.

**Reachable today.** `reTangentBezier` is called by the Pencil tool
(`hooks/usePencilTool.ts:127`, `:145`), the graph editor's Bias handle
(`components/graph/GraphSelectionBBox.tsx:221`) and the palette channel-curve
editor (harmless — palette tracks are never log). fluid-toy registers
`julia.zoom` as a **visible** camera-key track, mounts `<TimelineHost/>`, and
`components/GraphEditor.tsx` has four explicit `isLogTrack` branches precisely
because that track is plotted and edited there. Nothing downstream re-tangents:
`sequenceSlice.updateKeyframes` applies patches verbatim.

**Measured** (probes against the real modules, on the clean Bias path): the same
keys authored both ways diverge by up to **1.34 decades / 22×** on a 24-decade
track, 1.20 decades on a 30-decade track, and **0.30 decades / 2×** on an
everyday 6-decade zoom. Auto-tangent magnitudes collapse to 39% / 2.2% /
1.1e-17% of correct, so curves degenerate toward a flat default ease regardless
of what the user authored.

**Two defects, and the second is larger on the Pencil path.**
`components/GraphEditor.tsx:218` computes the Douglas-Peucker tolerance as
`eps: Math.max(1e-6, range * 0.02)` in **linear value units**. On a 1→1e-30
track that is `eps = 0.02`, which collapses a 101-sample stroke to **3
keyframes**. Measured against what the user actually drew: shipped = 8.01
decades off; with `isLog` fixed but the epsilon left alone = **5.13 decades off**.
So fixing the flag alone leaves the Pencil unusable on `julia.zoom`.

**Paste-ready spec for the flag half** (defaults keep every current caller
behaviourally identical):

1. `utils/CurveFitting.ts` — `reTangentBezier(keys, pred?, isLog = false)`
   forwarding to `calculateTangents(k, prev, next, 'Auto', isLog)`; same for
   `fitSamplesToKeys(samples, startFrame, eps, idPrefix, isLog = false)`.
2. `hooks/usePencilTool.ts` — add `isLog?: boolean` to `PencilTarget`; pass
   `st.target.isLog` at `:127` and `:145`. No registry import in the hook.
3. `components/GraphEditor.tsx` — in the pencil `getTarget` object (`:216-226`)
   add `isLog: isLogTrack(tid)`; `isLogTrack` is already imported at `:17`.
4. `components/graph/GraphSelectionBBox.tsx` — add `isLog: boolean` to the
   `biasTracks` entries built at `:160`, pass `bt.isLog` at `:221`. (This file
   is under `components/graph/`, not `components/ui/`, so the UI-purity hook
   does not apply, and `logTrackRegistry` is a store-free pure module.)

Then the epsilon, as its own change: derive it in log space from the
`trackRanges` log span, or feed `dpIndices` the `log(values)`.

**Recommendation:** do both, in that order, when you can eyeball the graph
editor. Not applied tonight because it is a five-file signature change across UI
with thin guard coverage, and because fixing half of it silently leaves the
Pencil broken — a worse state to wake up to than the current one.
`engine-gmt/animation/cameraBinders.ts` had the identical omission and **was**
fixed (`23239289`): it is behaviour-neutral today since no GMT camera track is
log-registered. The `logTrackRegistry` `@invariant` now carries this as
`@bug PRODUCTION:` so it is greppable.

**Related, worth a glance while you are in there:** the Bias tool's own value
redistribution (`GraphSelectionBBox.tsx:217`) works in linear value units, and
`scale_top`/`scale_bottom` (`:277-279`) map pixels to values via raw `/v.scaleY`
rather than the log-aware `p2v` the `move` branch uses.

---

## ADR corrections — paste-ready (the run is not permitted to edit `docs/adr/`)

### ADR-0015 — says Bezier is unsupported on log tracks; it has been supported since the ADR's own subject commit

_(cycle 2)_ ADR-0015 was captured retroactively on 2026-05-20 from
`logTrackRegistry.ts`'s JSDoc — and that JSDoc was itself stale, written in
commit `05eb7849` **alongside the very code that added Bezier-on-log**. The
commit message says so outright. Proven by probe: endpoints 1.0 → 1e-6 over 100
frames, eased Bezier vs Linear both with `isLog=true`, curves differ by up to
1.28 log-units (coinciding only at the symmetric midpoint). Anyone reading
ADR-0015 to answer *"why does my log-track Bezier curve look like that"* is told
the feature does not exist. Insert under the `# ADR-0015: …` heading:

> **Update 2026-07-28 (Bezier-on-log IS supported; decision unchanged):** The
> Decision and Consequences below state that Bezier is not supported on log
> tracks and that they evaluate as linear-in-log regardless of stored
> interpolation type. That was already untrue when this ADR was written. Commit
> `05eb7849` — the commit this ADR documents — added Bezier-in-log-space to
> `AnimationMath.interpolate`: a `Bezier` key on a log track is solved in
> `(frame, log(value))` and `exp()`ed back, so its tangent y-values are
> LOG-UNITS rather than absolute value-units, and `AnimationMath.calculateTangents`
> takes a matching `isLog` flag so auto-tangents are authored in the same space.
> Only non-Bezier keys take the linear-in-log path. Both branches still fall
> back to linear-in-value when either endpoint is non-positive. Measured:
> endpoints 1.0 → 1e-6 over 100 frames, eased Bezier vs Linear, both with
> `isLog=true` — the curves differ by up to 1.28 log-units. The core decision —
> log-registered tracks interpolate in log-value space, camera pans evaluate
> linear-in-zoom with DD precision — is unchanged.

### ADR-0020 — describes collision handling replaced in `36ad672c`

_(cycle 2)_ Matters because `.claude/rules/render-and-shaders-core.md` cites
ADR-0020 as one of two shader-builder decisions, so an agent reading it concludes
collisions are silent and may "helpfully" add the warning that already exists as
a throw. Insert under the `# ADR-0020: …` heading:

> **Update 2026-07-27 (implementation changed; base-vs-feature split unchanged):**
> the Decision below describes collision handling that no longer exists. Commit
> `36ad672c` (2026-05-21) replaced the silent base-vs-feature filter with two
> boot-time `throw` checks — feature-vs-base and feature-vs-feature — at
> `engine/UniformSchema.ts:113-131` (engine-gmt twin at
> `engine-gmt/engine/UniformSchema.ts:117-136`). `UNIFORM_DEFAULTS`'s last-wins
> reduce is therefore never reached with a duplicate name, and the "Future
> cleanup: surface a dev-mode warning" consequence is closed — the implementation
> went further than a warning. Note the checks live in `UniformSchema`, not in the
> harvester: `featureRegistry.getUniformDefinitions()` still returns duplicates
> unfiltered. The BASE-vs-feature partition and the three BASE sub-categories
> described below are unchanged. See `docs/policy/uniform-plugin-contract.md` I3.

### ADR-0003 — the double-run guard blocks the harness use case the ADR promises

_(cycle 1, restated here now that ADRs are Tier B — see the LOW item further down)_

---

## HIGH — Share links silently drop Droste (and one materials param)

**Files:** `engine-gmt/features/droste/index.ts:27`,
`engine-gmt/features/drawing/index.ts:42`, `engine-gmt/features/materials.ts`

Two `shortId` alias collisions mean every generated share link loses state. This
is live — the `?s=<id>` path is in production, so **shared scenes using Droste
have been arriving without it.**

**Evidence — reproduced, not inferred.** A Playwright probe on the booted app set
droste to `{active:true, zoom:3.5, tiling:4}` and materials to
`{emissionMode:2, envMapColorSpace:'linear'}`, then round-tripped `getPreset()`
through `generateShareStringFromPreset` → `parseShareString`:

- droste came back `{}` — all three values lost
- `envMapColorSpace` came back `undefined`
- `drawing.strokeWidth` and `emissionMode` survived

The cause: `drawing` and `droste` both declare `shortId: 'dr'`; inside
`materials.ts`, `emissionMode` and `envMapColorSpace` both declare param
`shortId: 'ec'`. `UrlStateEncoder.applyDictionary` writes `result[alias] = value`
on encode (`utils/UrlStateEncoder.ts:107`) and `getReverseDict` builds one
`alias → longKey` entry per alias (`:84`), so the later writer wins in both
directions.

**The good news for compatibility:** in both collisions the alias currently
resolves to the *surviving* side (`dr` = drawing, `ec` = emissionMode), so
existing share links have never carried the lost data. The fix is therefore
strictly additive to the wire format.

**Options**

1. **Rename the two losing aliases** — droste `'dr'` → `'ds'` or `'do'`,
   `envMapColorSpace` `'ec'` → `'ecs'`. Old links decode exactly as they do
   today; new links gain the previously-dropped state. Taken feature aliases:
   `au cg dt mod pe wc ao at cl cm dr eng g l ls m n o q rf rg tx vol wp wv`.
2. **Drop `shortId` from droste and `envMapColorSpace` entirely** —
   `getDictionary()` falls back to the full key (`feat.shortId || feat.id`), so
   they encode under their long names. Correct, slightly longer URLs, still no
   old-link breakage.

**Recommendation: option 1.** Not applied by the run because it changes the URL
wire format, which is a product/compat call.

The invariant and a `@bug PRODUCTION:` block naming both instances are already
recorded at the source site in `engine/FeatureSystem.ts` (commit `03040513`), so
the bug is discoverable by `grep -r '@bug'` until you get to it.

---

## MEDIUM — `getDictionary()` has no collision detection (pairs with the above)

**File:** `engine/FeatureSystem.ts:626`

The next alias clash will also be found by a user reporting a lost scene. A
detector is two passes: one over `_alias` values across features, one over each
feature's `paramMap`.

This was raised as Tier V and **demoted rather than verified**, because it isn't
independently checkable: two collisions exist *today*, so a detector at error
level — or a real guard asserting zero duplicates — fails immediately and turns
every GMT smoke red (several smokes fail the run on any `console.error`). It
cannot land before the renames above, which makes it a consequence of that
decision rather than a separate fix.

**Recommendation:** decide the renames first, then land the detector *and* a
share-round-trip guard in the same change. The guard is the valuable half —
**nothing currently asserts share round-trip fidelity at all**, which is exactly
why a production data-loss bug on the live share path went unnoticed. Notes for
whoever writes it: `console.warn` is the right level for the runtime detector
(`validateComponentRefs` in the same file already uses warn for this reason), and
`getDictionary` is called on every share encode/decode (`utils/Sharing.ts:44`,
`:56`), so memoise it or gate on `import.meta.env.DEV`.

---

## MEDIUM — "Feature isolation is enforced" is not true, and it's in your two entry-point docs

**Files:** `.claude/rules/ddfs.md:30` and `CLAUDE.md` (Architecture Rules, 1st bullet)

Both state: *"Reading another feature's state requires `dependsOn: [otherId]` in
the feature def. Undeclared access throws in dev, warns in prod."*

**Nothing implements it.** `dependsOn` is read at exactly two places in
`engine/FeatureSystem.ts`: `register()` L551-557 warns if a named dependency
isn't yet registered, and `topologicalSort()` L711-719 uses it for ordering.
Feature slices are plain objects on one shared zustand store
(`store/createFeatureSlice.ts:115`) — no Proxy, no getter trap, no access check
(`grep -rn 'new Proxy' store/ engine/` returns nothing). Any code can read
`state.otherFeature` freely and silently.

This matters more than a normal doc error because it's stated as an *enforced*
invariant in the two documents an agent loads first — so an agent reasonably
assumes the architecture is self-policing and doesn't check its own cross-feature
reads.

**Options**

1. **Downgrade the wording in both docs** to what's true: isolation is a
   *convention*; `dependsOn` declares injection/init order and produces a
   register-time warning only. Cheap, honest, immediate.
2. **Actually implement it** — a dev-only Proxy in `createFeatureSlice` checking
   the accessing feature against its `dependsOn`. Real work, and the "accessing
   feature" isn't knowable from a plain store read, so it needs a call-site
   convention (e.g. `readFeature(from, id)`) to be enforceable at all.
3. Leave it as an aspiration and mark it explicitly as one.

**Recommendation: option 1.** Not applied because the `CLAUDE.md` half is
off-limits to the run, and correcting only the rule file would leave the two
steering documents contradicting each other — worse than the current state. Both
edits should land together.

---

## LOW — One throwing tick can freeze the whole renderer

**File:** `engine/TickRegistry.ts:148`

The dispatch loop is a bare
`for (let i = 0; i < _entries.length; i++) { _entries[i].fn(delta); }`. A tick
that throws — say an OVERLAY gizmo hitting a null ref — takes out every tick
after it in phase order. Because `GmtRendererTickDriver` calls `runTicks` inline
*before* serializing the camera and calling `proxy.sendRenderTick` (`:483`), the
throw also kills the worker frame dispatch. A tick that throws once usually
throws every frame, so the realistic symptom is a permanently frozen image plus a
dead timeline — presenting as *"the renderer hung"* rather than *"a gizmo is
broken"*.

This is a design fork, not a defect, which is why the run didn't act.

**Options:** (a) leave as-is — fail-fast keeps bugs loud and the tick set is small
and stable; (b) wrap each `fn(delta)` in try/catch that logs once per tick name
and keeps going — the rest of the frame survives and the failing tick is named,
at the cost of a try/catch per tick per frame (negligible: 4-8 entries) and the
risk of a broken tick going unnoticed in production; (c) (b) plus
auto-unregistering after N consecutive throws — self-heals, but can silently drop
functionality.

**Recommendation: (b)**, logging the tick's `name` (the registry already stores
it) and warning once per name rather than per frame. It converts the worst
failure mode — silent whole-renderer freeze — into a named console error while
leaving the failure visible.

---

## LOW — The double-run guard would silently kill a frame-stepping harness

**File:** `engine/TickRegistry.ts:129`

ADR-0003's Context promises: *"Apps that intentionally use a custom driver
(worker-driven, headless test harness) must still be able to call `runTicks` from
their own loop — so the solution can't reject a single legitimate driver, only
the second one within a frame."*

The implementation can't tell the two apart. It suppresses any call arriving less
than `DOUBLE_RUN_WINDOW_MS = 1` ms after the previous one, regardless of caller. A
frame-stepping harness (offline video export, a deterministic headless test
rendering N frames back-to-back) runs each iteration in well under 1 ms and gets
exactly one tick, then silence — and silently, since the dev warning is one-shot
and its text blames a driver double-mount, sending the reader to the wrong place.

**Latent, not live:** only three `runTicks` call sites exist and none hits it
today. It's worth raising now because 4K/offline frame-sequence export is a known
roadmap gap, and an exporter is precisely the shape that trips this.

**Options:** (a) do nothing and let whoever writes the exporter discover it —
cheap now, confusing later; (b) add an opt-out, e.g. `setTickGuardEnabled(false)`
or `runTicksUnguarded(delta)` that a harness calls explicitly, keeping the guard
on for the RAF path; (c) drop the time-window heuristic for driver *identity* —
drivers claim the registry via a token, so a second claimant warns and no-ops
while a single claimant may tick as fast as it likes.

**Recommendation: (b) now** — a few lines, preserves the ADR-0003 guarantee
verbatim, doesn't disturb the RAF path. (c) is the right long-term shape but
isn't worth the churn until a second driver kind exists. Either way ADR-0003
wants an Update block noting the gap (Tier B under the new ADR rule, so it stays
here rather than being applied).

---

## LOW — `HANDOFF.md:12` repeats the corrected ADR-0110 claim

Left for you deliberately: `HANDOFF.md` is your session log, not the run's to
edit. Line 12 says the driver throttles `runTicks` to 1 Hz when UI fps < 20 and
that this "collapsed analysis and lost whole seconds of transients". It doesn't —
`runTicks` is called on both sides of that branch; only the worker dispatch is
yielded. The full corrected mechanism is in the ADR-0110 Update block (commit
`8842a839`).

Worth knowing: the error originates in the `7ba897aa` commit message and was
copied from there into the ADR, into `AudioAnalysis.ts`'s JSDoc (since gone with
the file in `8b89d3ca`) and into `HANDOFF.md` — **one error copied three times,
not three independent observations.**

---

## Recorded as checked, no action needed

- **REFUTED: `TickRegistry.ts:19`'s "Navigation runs before this registry".** An
  auditor believed this was backwards, reasoning from JSX order (the driver is
  declared first at `AppGmt.tsx:338`, so it subscribes first). Independent
  verification found the driver's `useFrame` closes with `}, 1);` — explicit
  renderPriority 1 against Navigation's default 0 — and R3F 8.18.0 sorts
  subscribers ascending, so **Navigation genuinely runs first and the JSDoc is
  correct.** Confirmed at runtime: a temporary probe under Playwright printed
  strictly alternating `NAV, DRIVER` for 20 consecutive frames; the probe was
  reverted and the tree verified clean. The follow-on stale-SNAPSHOT worry is
  moot twice over — SNAPSHOT reads the live THREE camera by reference and
  Navigation mutates that same object in place. *Also surfaced: app-gmt has five
  `useFrame` call sites, not two — `Navigation.tsx:1159`,
  `useInputController.ts:68` and `:94`, `usePhysicsProbe.ts:111`,
  `GmtRendererTickDriver.tsx:276`.*

- **`docs/history/engine/02_Feature_Registry.md:108`** says the registry
  "computes the DAG at freeze time and rejects cycles". It does neither — the DAG
  is computed lazily in `getAll()`, and cycles log to `console.error` and fall
  back to registration order. Not fixed: `docs/history/**` is append-only and out
  of scope. The correct behaviour is already in the authoritative layer
  (`engine/FeatureSystem.ts` header `@invariant` L16-17, `getAll()` JSDoc
  L585-588). Flagged only because that doc is the *cheapest* entry in
  `context:cost` for this subsystem, so a reader who stops there gets the wrong
  model of failure behaviour.

---

## Housekeeping surfaced this cycle

- **`npm run orphans`** reports one unused file repo-wide: `debug/render-harness.ts`.
  Removal is deletion, so the run will never do it — your call.
- **`context-map.json` is stale** (dated 2026-07-13); `npm run context:cost`
  warns on every invocation. `npm run context:map` rebuilds it.
- **`smoke:engine-demo` step 3** counts `input.precision-slider` and logs it, but
  the count is 0 and nothing asserts on it — dead telemetry of exactly the kind
  that let step 1 rot unnoticed for three months (see commit `52d8912f`). Worth
  deciding whether the demo panel should be rendering precision sliders at all.
- **`smoke:pause-controls` rewrites a tracked binary** (`debug/fluid-pause-hover.png`)
  as a side effect of running. The run restores it each cycle, but it will keep
  showing up as a spurious diff for anyone running that smoke.
- **Dead citations in files owned by not-yet-audited subsystems**, all resolving
  under `docs/history/engine/` except the last: `docs/04_Core_Plugins.md` from
  `utils/PresetLogic.ts:137`, `utils/PresetFieldRegistry.ts:45`,
  `utils/defaultPresetFields.ts:9`; `docs/01_Architecture.md` from
  `fractal-toy/main.tsx:9`; `docs/03_Plugin_Contract.md` from
  `fractal-toy/main.tsx:11`; `docs/07_Shortcuts.md` from
  `engine/plugins/Shortcuts.ts:25`; `docs/20_Fragility_Audit.md` from
  `utils/defaultPresetFields.ts:9`. And **`docs/01_System_Architecture.md`** cited
  from `engine-gmt/renderer/GmtRendererCanvas.tsx:22`, which **resolves nowhere** —
  it looks like a pre-fork GMT document that was never carried over. Later cycles
  will fix these as they reach the owning subsystems.

---

## Housekeeping surfaced in cycle 2

- **`smoke:anim-orbit` is flaky under back-to-back sequencing** — failed once in
  five runs with "Execution context was destroyed" at its *first* `page.evaluate`,
  skipping all six real assertions. The fixed `waitForTimeout(2500)` after
  `waitUntil: 'domcontentloaded'` races a reload. It fails loudly (exit 1), so
  it is a flake, not a blind spot — but the same prologue is in
  `smoke-anim-play.mts`, `smoke-anim-vec2.mts` and `smoke-binder-registry.mts`.
  Recommended fix is a single retry around the first evaluate in all four; not
  applied because it could not be reproduced on demand, and an unverifiable fix
  to a guard is worse than a known flake. Repro lever: run the four browser
  smokes back-to-back in one shell rather than individually.
- **`_resetAudioClipSync` has zero callers** (`engine/animation/audioClipSync.ts:19`)
  though the file's own `@invariant` says *"Tests must call
  `_resetAudioClipSync()` between cases"*. The larger gap is that `syncAudioClips`
  has genuinely testable transition logic (justResumed / justScrubbed /
  justPaused, the `SCRUB_JUMP_SEC` threshold, deck ownership) and **no guard
  covers any of it**. Recommend keeping the seam and writing that test if
  audio-clip sync ever regresses; deletion is not worth a session.
- **`targetRouting.ts`'s `@invariant` predates ADR-0109** — it says
  `classifyModulationTarget` must mirror the branch order in
  *`AnimationSystem.tick`'s per-target loop*, and its header lists
  `AnimationSystem.tick` as a consumer. The branch chain now lives in
  `applyTarget.ts`'s `planModulationTarget`. Same drift shape as the
  `AnimationSystem` header fixed in `c02a4a42`, one module over. Left for
  whoever owns the modulation subsystem (`e10-engine-features`).
- **`smoke:tsaa` is weak but honest** — it logs a live probe and asserts only
  `errors.length === 0`, so it would not catch an accumulation regression. Its
  JSDoc states that narrow scope deliberately, so it was not raised as a
  finding. Cheap strengthening: assert `probe.accumulation === true` and
  `probe.canvasW > 0`.
- **`.claude/rules/render-and-shaders-core.md` has no `## Guards` block** (unlike
  `gmt-renderer.md` and `sibling-apps.md`) and names none of `ShaderFactory.ts`,
  `ShaderConfig.ts` or `UniformNames.ts` in its read-first list. Cheap Tier A
  rule-coverage win; skipped this cycle only because two auditors were editing
  that file concurrently.
- **`smoke:tsaa` rewrites tracked binaries** (`debug/fluid-tsaa-on.png`,
  `debug/fluid-tsaa-off.png`) as a side effect, same as `smoke:pause-controls`
  does with `debug/fluid-pause-hover.png`. The run restores them each cycle.
- **A camera-pair gap remains in modulation recording.** The fix in `4d1bc158`
  routes the clean base through `animationEngine.evaluateTrack`, but `scrub()`
  tries `evaluatePairedTrack` *first* for camera-pair tracks, so `camera.*`
  targets can still differ slightly between recording and playback. Noted at the
  call site; worth a follow-up when someone is in that code.

---

# Cycle 3

## MEDIUM — `holdAdaptive` is a public API with zero callers, and its one gap is at the moment it exists for

_(cycle 3 · `engine/AdaptiveResolution.ts:403`, `engine/plugins/Viewport.tsx`)_

`viewport.holdAdaptive(durationMs?)` is documented for "call after loading a
preset / starting an accumulation" — hold the current resolution so a burst of
activity doesn't downscale. Two facts, both verified:

1. **It has no callers.** `holdAdaptive` appears only in the type declaration,
   the config doc, the slice implementation and the plugin facade that forwards
   to it. No app, feature, renderer or smoke calls it, and the only producer of a
   non-zero `holdUntilMs` is `_holdUntilMs` in `viewportSlice`. The other
   `tickAdaptiveResolution` caller (`engine-gmt`'s `UniformManager`) does not
   pass `holdUntilMs` at all. So `now < 0` is always false and **the entire hold
   mechanism is inert today.**
2. **The seed bypasses it.** `tickAdaptiveResolution`'s smart-mode branch assigns
   `state.scale` at two sites. The sample-window site computes
   `withinHold = now < holdUntilMs` and skips when
   `withinHold && nextScale > state.scale`. The idle→active **seed** site
   (`if (state.activeLast === 0)`) assigns with no reference to `holdUntilMs` at
   all — and it sets `state.activeLast = now`, so on that tick `elapsed` is 0 and
   the guarded window block cannot run. The seed's downscale is genuinely
   ungated.

That matters because the seed fires on the idle→active edge, which is *exactly*
the common case right after a preset load — the scenario the API is documented
for. Whoever first adopts it gets a hold that appears to work for an
already-engaged scene and silently does nothing on the edge.

**Options**

1. **Gate the seed on `withinHold` too** — makes the API do what its doc says.
2. **Keep current behaviour deliberately and document it** — arguable: an
   interaction *should* perhaps downscale regardless of a hold, since the user is
   actively moving and wants frames.
3. **Retire the API** — it has no callers and no guard.

**No recommendation offered on purpose** — this is a product judgement about what
"hold" should mean, and there is no usage to infer intent from. The current
behaviour is now documented at both call sites either way, so nothing is silently
wrong while you decide.

---

## LOW — `uninstallShortcuts` is not the inverse of `installShortcuts`

_(cycle 3 · `engine/plugins/Shortcuts.ts:305` — confirmed by independent verification, **latent**)_

Two asymmetries, both real, neither reachable today:

1. **The removal target is hardcoded.** `installShortcuts` attaches to
   `options.domRoot ?? window` but stores neither the root nor the capture flag
   (both are function-local `const`s). `uninstallShortcuts` removes from `window`
   literally. Install with a Document or HTMLElement `domRoot` — a declared,
   typed, documented option — and the listener is never detached, while
   `_listener = null` discards the only handle to it.
2. **`_keyboardCaptureCount` is not reset.** The reset block clears the registry,
   scope stack and installed flag but not the capture counter. The dispatcher's
   early-return for unmodified single-character keys sits *above* the input-focus
   and `when()` checks, so a stranded count silently swallows every such shortcut
   for the life of the page.

**Latent, decisively.** `uninstallShortcuts` has zero callers repo-wide, and the
three plausible indirect routes are all closed: no barrel re-export;
`window.__shortcuts` exposes only `register`/`unregister`/`pushScope`/`popScope`/
`list`/`lookup`/`clear`; and no `import.meta.hot` block exists anywhere in the
repo. All five `installShortcuts` sites use the default `window` root.

**The verifier corrected the original claim in one respect worth keeping:** the
double `removeEventListener` (`false` *and* `true`) already covers both capture
phases, so the classic capture-flag footgun is *already defended* — this is a
single-axis asymmetry, not two. It also found two further un-reset items:
`_scopeSubscribers` is never cleared, and `window.__shortcuts` is never deleted
(the latter is arguably correct — `debug/smoke-undo.mts` uses its presence as the
"install ran" probe — but should be a documented choice, not an oversight).

**Fix, ~6 lines:** stash `_root` at install, remove from it here, null it
afterwards (or the module retains a strong ref to a detached node — a second,
smaller leak introduced by the fix if omitted), and reset the counter. Keep both
removals rather than storing and matching one flag; the double-remove is strictly
more robust. **One genuine behaviour change:** with two capturing surfaces live,
the reset un-captures the still-focused one — exotic and unreachable today.

**Not applied.** No guard covers teardown, the change is unverifiable by any
existing script, and the target is inert code. Documented as `@bug PRODUCTION:`
at the source site instead, so it is greppable. The verifier's own suggestion for
the highest-value adjacent work: add a dev warning when a second
`installShortcuts` call silently drops its options — that silent drop is already
an `@invariant` and is the failure mode a real multi-root caller would hit first.

---

## ADR corrections — cycle 3 (paste-ready)

### ADR-0022 — states the shortcut tiebreak backwards, and calls the correct reading wrong

`docs/adr/0022-shortcuts-scope-stack.md:19` (Decision) says *"Tiebreak is
most-recently-registered (stable sort + insertion order)"*, and its final
Consequences bullet says *"Registering AFTER another shortcut with the same key +
scope + priority wins — legacy docs that claim 'first wins' are wrong; source
comment at `Shortcuts.ts:184-185` is authoritative."* **Both are false**, and the
cited line range is drifted (those lines are inside `lookup()`/`clear()`, not the
resolver).

Worth knowing: `docs/history/engine/06_Undo_Transactions.md` had this **right all
along**. The ADR's bullet was written to override a doc that was correct, and the
old `Shortcuts.ts` `@invariant` then cited the ADR's version back — a
circular-wrong loop, now broken in code, in `.claude/rules/engine-plugins.md`,
and pinned by `npm run smoke:undo`.

Insert immediately after the `**Scope:**` line, before `## Context`:

> **Update 2026-07-28 (tiebreak direction corrected; decision unchanged):** the
> Decision's parenthetical and the last Consequences bullet state the tiebreak
> backwards. `resolve()` sorts matches descending by
> `scopeStack.lastIndexOf(scope) * 10000 + priority` and returns `matches[0]`.
> `Array.prototype.sort` is stable (ES2019) and `matches` derives from
> `shortcuts.list()`, i.e. registry **Map insertion order** — so on a score tie
> the **FIRST-registered** shortcut stays at index 0 and wins; later
> registrations sink to the tail. To beat an existing binding you must raise
> `priority` or use a deeper scope. `docs/history/engine/06_Undo_Transactions.md`
> (§Hotkey routing) was right all along; this ADR's "legacy docs that claim
> 'first wins' are wrong" bullet, and its `Shortcuts.ts:184-185` line reference,
> are both retracted. Practical consequence: `installUndo()` registers
> `redo.global.shift` (`Mod+Shift+Z`, which expands to `Ctrl+Shift+Z` on
> Win/Linux) *before* `app-gmt/main.tsx` registers `gmt.undoCameraMove`, so that
> binding's `priority: 10` is **load-bearing** — removing it silently turns
> Ctrl+Shift+Z from camera-undo into param-redo. The scope-stack design and the
> `consume: true` default are unaffected. Pinned by `npm run smoke:undo`
> ("[shortcuts] resolver tiebreak") and by the `@invariant` on `resolve` in
> `engine/plugins/Shortcuts.ts`.

### ADR-0024 — drifted line reference

`docs/adr/0024-adaptive-resolution-pure-shared-module.md:39` cites the
`selfResized` write as `UniformManager.ts:137`; line 137 is now `let targetH = h;`.
Insert under `## Consequences`:

> **Update 2026-07-28 (line-ref refresh; decision unchanged):** The `selfResized`
> write cited below as `UniformManager.ts:137` now lives at
> `engine-gmt/engine/managers/UniformManager.ts:263`, inside the
> `currentW !== targetW || currentH !== targetH` resize branch of `syncFrame`. It
> is still the only production writer — the second occurrence,
> `debug/interaction-latency-harness.mts:114`, is a test harness. The main-thread
> slice still does not need it, for the reason given below.

---

## Housekeeping surfaced in cycle 3

- **`engine/worker/ViewportRefs.ts:143`** says `_mouseOverCanvas` is "Used by
  adaptive resolution to decide grace period behavior" (false — the module
  ignores that input) and its `@invariant` names `AdaptiveResolutionBadge` as the
  affected component (wrong — the only live reader is
  `engine-gmt/topbar/AdaptiveResolution.tsx:30`). Left for the pending
  `e11-worker-contract` cycle. The file's *real* invariant — ref-backed rather
  than a Zustand selector, so the GMT topbar badge does **not** re-render on
  hover alone — is correct and should be preserved verbatim.
- **`types/store.ts:138`** tells readers to use `getCanvasPhysicalPixelSize()` in
  `fractalStore.ts`; that helper is at `store/engineStore.ts:501` and no
  `fractalStore.ts` exists. Same stale text duplicated at
  `engine-gmt/types/store.ts:119`. One-word fix in both; fold into whichever
  cycle owns `types/store.ts`.
- **`check:zindex` has a structural blind spot.** Its threshold is `z >= 100`
  because it hunts surfaces that outrank the panel band — so a raw z that is too
  **low** (like the Support modal's `z-50`) is invisible to it. Worth considering
  a second, cheaper check: flag any `createPortal(_, document.body)` whose
  className carries a raw `z-*` at all, in either direction.
- **`debug/render-harness.ts`** is still the only file `npm run orphans` reports
  tree-wide — third cycle running. Deletion is your call.
- **Two gitignored scratch probes** were left at `debug/_tiebreak-probe.mts` and
  `debug/_paramA-race-probe.mts` (the `debug/_*` convention means they can never
  be committed). Remove at your leisure.
- **A dev server is still running on :3400** from cycle 1 — it should be stopped
  at the end of the run.

---

# Cycle 4

## MEDIUM — Deleting a saved camera or view is immediate and unrecoverable

_(cycle 4 · `components/StateLibraryPanel.tsx:309`)_

The trash button calls `onDelete(snap.id)` straight from `onClick`. Both consumers
pass the **raw slice action** (`CameraManagerPanel.tsx:97` → `deleteCamera`,
`ViewLibraryPanel.tsx:96` → `deleteView`), and `createStateLibrarySlice`'s
`[actions.delete]` is `writeArray(arr.filter(...))` plus clearing the active id.

The slice exposes exactly one lifecycle hook, `onApplied`, and it fires only from
`applySnap()` — i.e. select and duplicate, **never delete**. Its module JSDoc says
persistence and undo are deliberately app-side, and no app has opted in.
Independently confirmed by measurement: `savedCameras` is absent from
`getParamSnapshot`, so **Ctrl+Z cannot bring a deleted camera back.**

The button is `opacity-0` until row hover and sits 4px from Duplicate, so
mis-clicks are plausible, and a saved camera can represent real work.

**Options**

1. **Confirm-on-delete** — cheapest, but a modal per delete is friction on a list
   users prune, and it cuts against the standing "prefer dockable panels over
   modals" preference.
2. **Soft undo** — the panel keeps the deleted snapshot plus its index in local
   state and surfaces an "Undo" action in the existing toast for a few seconds
   (`engine/store/toastStore.ts` + `ToastHost` are already mounted app-wide),
   restoring via reinsertion.
3. **Route delete through engine-core's unified `undoStack`** — architecturally
   the right home, but the largest change, since the slice touches no history at all.

**Recommendation: option 2.** It matches the app's existing toast affordance,
needs no new modal surface, keeps the primitive generic (the panel already owns
transient UI state), and costs one `setState` plus a toast action. Option 1 is the
fallback if you want zero new state.

The site is annotated `@bug PRODUCTION:` so it is discoverable via
`grep -r '@bug'` until you decide.

---

## LOW — The input-side half of the blank-rename fix

_(cycle 4 · `components/StateLibraryPanel.tsx:159`)_

The **render side is already fixed** (`8a0a4b74`): a blank label now displays
"Untitled", so the row keeps its hit area and stays renameable. That was the
robust half — it repairs rows that are already blank, including any loaded from a
saved scene, and covers every producer.

Still open: `handleRenameSubmit` accepts an empty or whitespace-only value from
both Enter and `onBlur`, so blank labels keep being *written*. The obvious guard
is `const next = editName.trim(); if (next) onRename(editId, next); setEditId(null);`.

**Why it wasn't applied:** `.trim()` also trims non-blank labels, so `" My Cam "`
silently becomes `"My Cam"`. Probably desirable, but that is a behaviour change
beyond "treat blank as cancel" and should be a deliberate choice rather than
smuggled in. Verification also noted `[actions.add]` uses `??`, which does not
catch `''`, so `addCamera('')` still yields a blank label regardless.

Escape is already correct and stays correct either way — it never calls
`handleRenameSubmit`, and unmounting the focused input does not fire a submitting
blur in Chromium (measured). The guard would additionally make Escape robust in
any engine that *does* fire blur-on-removal.

**Recommendation:** apply it, and decide the trim question explicitly. Also worth
knowing: blank labels degrade other surfaces too — the slot toast composes
`` `${savedLabel} saved` ``, which becomes a pill reading " saved".

---

## MEDIUM — `takeMaxFlux` drops a full ring of onsets at an exact wrap

_(cycle 4 · `engine/features/audioMod/WorkletAnalysis.ts:295` — confirmed by probe)_

An auditor flagged `if (unread === 0 && this.latest) unread = 0;` as dead code.
It is. But independent verification found a **real bug underneath it** and
recommended explicitly **against** deleting the line.

`(ringWrite - cursor + 512) % 512` **aliases**: it is 0 both when nothing is
unread *and* when the writer has lapped the reader by exactly one full ring. So a
whole ring of onsets drains as nothing. **Measured** against the real class: 512
unread hops all carrying flux 30 produced a max `fluxRate` of **0**.

The dead line's shape — *"we computed zero unread, yet we do have data"* — reads
as a half-written fix for exactly that, with an intended body of
`unread = this.ringCount`. Deleting it erases the only in-tree trace that the hole
was ever noticed, which is why it is now annotated rather than removed.

**Ruled out:** `unread = 1` is *not* the fix. When the cursor has caught up,
`ring[ringWrite]` is the slot about to be **overwritten** — the oldest entry, not
the newest (newest is `ring[ringWrite - 1]`, which is what `this.latest` points
at). Measured: it would inject a value 2.84 s stale.

**Also ruled out:** the routine no-new-snapshot tick is an **honest zero**, not a
dropped transient. The onset was already delivered at full max on the tick its
batch landed, and `ModulationEngine`'s per-rule attack/decay envelope carries the
pulse forward. Batches arrive at ~53/s, so zero-drain ticks are routine (~12% of
60 Hz ticks, ~63% at 144 Hz) — that is normal, not a smell.

Reachability of the real bug is **narrow**: it needs a ~2.73 s main-thread stall
landing on an exact multiple of 512 hops. At 600 unread it degrades gracefully,
draining the newest 88. Narrow — but ADR-0110 documents long tick stalls as
precisely the scenario this receiver exists to survive.

**Options:** (a) `unread = this.ringCount` in that branch — the verifier's reading
of the intent, making the wrap case drain the whole ring; (b) delete the dead line
**and** keep the `@bug PRODUCTION:` note recording the aliasing.

**The bigger gap either way:** `WorkletAnalysis.ts` has **no guard coverage at
all**. No debug suite imports it — the three that mention it do so only in
comments — and all five audio suites pass identically whether that line reads
`= 0`, `= 1`, or is absent. `test:audio-signal` sets `filterBank.fluxRate`
directly and hand-reimplements `update()`, deliberately omitting the drain. A
guard would need to feed synthetic `AnalysisBatchMessage` payloads into `onBatch`
and assert on `filterBank.fluxRate` after `update()`, pinning: max-not-last across
a multi-hop batch, zero on a no-batch tick, and the exactly-512 wrap case.

**Separately flagged, not bundled:** a real onset arrives as a one-tick impulse,
and a leaky integrator's response to an impulse scales with `dt` — with attack 0.1
(tau 36 ms), one tick at 60 Hz reaches ~0.37 of full scale but only ~0.18 at
144 Hz. Whether transient *peaks* should be frame-rate-independent is a design
question about the envelope, not about this line.

---

## MEDIUM — The "GLSL Debugger" menu item does nothing

_(cycle 4 · `engine/features/debug_tools/index.ts:23`)_

The Advanced-Mode menu item toggles `debugTools.shaderDebuggerOpen`, which **has
no reader anywhere**. `grep` returns only the `DebugToolsState` field, the
`menuItems` entry, the `params` declaration, and six `engine-gmt/formulas/*.ts`
preset blobs that merely serialise the boolean.

Its two siblings are both live — `StateDebugger.tsx:10` self-gates on
`stateDebuggerOpen`, `InteractionSessionBadge.tsx:34` on `interactionSessionOpen`
— so this is the odd one out, not a pattern. Reachability confirmed:
`featureRegistry.getExtraMenuItems()` is consumed at `engine-gmt/topbar.tsx:479`,
which registers each item as a real system-menu toggle gated on `advancedMode`.

The cause is visible in `DebugToolsOverlay.tsx`: *"ShaderDebugger was
fractal-specific (raymarching introspection). StateDebugger is generic and kept"*
— the component was removed at extraction and the menu entry was not.

**Options:** (1) delete the `menuItems` entry, keep the param so existing saved
scenes carrying `shaderDebuggerOpen: false` still round-trip — smallest, no
migration; (2) delete entry, param and `DebugToolsState` field, plus a migration
for the six formula presets; (3) leave it as a placeholder if a GLSL debugger is
planned, in which case it wants a `@stale` annotation naming what is missing.

**Recommendation: (1).** One-line removal that closes a dead affordance without
touching persisted data. Tier B because it is a user-facing UI removal and touches
a param present in shipped scene JSON.

---

## LOW — `installStateLibrary` reads its slot count two different ways

_(cycle 4 · `engine/store/installStateLibrary.ts:236` — demoted from Tier V, latent)_

`registerSlotShortcuts` uses `cfg.count ?? 9`; `registerLibraryMenu` uses
`(typeof opts.slotShortcuts === 'object' && opts.slotShortcuts?.count) || 9`.
Because of `??` vs `||`, an explicit `count: 0` binds zero shortcuts but still
renders **nine** menu items, each hardcoding `shortcut: N` and
`title: 'Click to recall • Ctrl+N saves'` — advertising bindings that do not
exist. `slotShortcuts: false` does the same, via the `typeof … === 'object'` test.
Neither path consults `cfg.saveModifier`, which is configurable.

**Latent — no current consumer hits it.** `cameraSlice.ts:433` passes `menu: null`
so `registerLibraryMenu` never runs, and `fluid-toy/viewLibrary.ts:244` passes
`count: 9` with a menu, so both agree on 9. It is a trap for the third library.

**Options:** (a) leave it and add a JSDoc line on `SlotShortcutOptions.count`
saying the menu mirrors the shortcut count; (b) hoist one
`resolveSlotCount(opts.slotShortcuts)` used by both, returning 0 when shortcuts
are off, and skip the slot section entirely when it returns 0; (c) additionally
thread `saveModifier` into the menu title.

Demoted rather than verified because the three remedies differ in public shape,
which makes it a design call. **Read ADR-0031 first** — it governs this file's key
surface.

---

## Housekeeping surfaced in cycle 4

- **`FRACTAL_EVENTS` listeners can hide from grep.**
  `engine-gmt/navigation/Navigation.tsx:487-488` subscribes with raw string
  literals — `FractalEvents.on('camera_teleport', …)` /
  `('camera_transition', …)` — instead of the `FRACTAL_EVENTS` constants. An
  auditor nearly concluded `CAMERA_TRANSITION` had zero listeners because of it,
  which would have made a camera invariant look unfalsifiable. Worth normalising
  to the constants so listener discovery works; `navigation.md`'s scope.
- **`utils/PresetLogic.ts:137`** cites `docs/04_Core_Plugins.md`, which does not
  exist — it is at `docs/history/engine/04_Core_Plugins.md`. Left for the
  preset-registry subsystem's cycle.
- **`camera.getAllSlots` / `camera.setAllSlots` have zero callers** anywhere, and
  `camera.clearSlot` is called only by the smoke. knip cannot see these because
  they are object-literal members rather than module exports. The exported
  `camera` object is a public plugin API, so pruning it is your call.
- **`smoke:statelibrary-drop` is not wired into the `smoke:all` chain.** That line
  is enormous and editing it mid-run risked a conflict, so it was left. One-line
  addition when convenient.
- **`test:audio-signal` [9] is near-tautological.** "Transient response does not
  depend on the tick rate" holds trivially today because `processAudioSignal`'s
  transient branch never reads `delta` — it would only catch a regression that
  reintroduced a per-frame division, which is admittedly the regression it was
  written for. Not changed; noting so nobody mistakes it for coverage of the
  worklet drain path.
- **ADR-0103 may already carry an update block.** Its decision was partially
  reversed on 2026-07-25 (modulation no longer holds live session), and
  `test-session-hold.mts:146` refers to "ADR-0103's 2026-07-25 update". The run
  cannot open ADRs to check — worth a two-second confirmation.
- **`smoke:ui-primitives` covers less than its billing.** It exercises only
  `clampToViewport` (its own JSDoc says so, and every value it computes does feed
  an assertion), but `ui-and-panels.md` lists it as *the* guard for shared UI
  primitives. It covers no React component at all.

---

# Cycle 5

## HIGH — Five engine-core modules are permanently bound to the no-op worker stub

_(cycle 5 · `store/engineStore.ts:29` — proven at runtime)_

`engine-gmt/renderer/install.ts:32` imports `store/engineStore`, so ESM guarantees
engineStore's module body — and everything it imports — runs **before**
`installGmtRenderer()` can call `setProxy()`. Every module-scope
`const engine = getProxy()` reached along that chain freezes the stub forever.

**Measured**, not inferred. A temporary probe exposed engineStore's captured
`engine` on `window`; against `app-gmt.html` it reported
`{identicalToRealProxy: false, gpuInfo: 'Stub (no worker)', isBooted: false}`
while `window.__gmtProxy` reported `{isBooted: true, gpuInfo: 'ANGLE (…)'}` and a
fresh `getProxy()` returned the real proxy. A second, independent discriminator
agreed: `compileGate.queue` emits `IS_COMPILING` synchronously, and calling
`loadScene` post-boot produced none — i.e. the stub branch ran.

**Affected** (module-scope captures importing from `engine/worker/WorkerProxy`):
`store/engineStore.ts:29`, `store/slices/historySlice.ts:43`,
`components/PerformanceMonitor.tsx:6`, `components/HistogramProbe.tsx:4`,
`utils/timelineUtils.ts:4`. The first two are provably stale (engineStore imports
historySlice); the other three depend on import-graph position and should be
re-checked individually. The ~20 captures under `engine-gmt/` import
engine-gmt's *own* `getProxy()` and are fine.

**Proven consequences**

- `store/engineStore.ts:341` — `if (!engine.isBooted && !engine.bootSent)` is
  always true, so `loadScene` always takes the "initial startup" branch and the
  post-boot branch (compileGate spinner, full-config flush, OFFSET_SET push,
  CONFIG_DONE) is **unreachable**. Every scene load hits it, and
  `NewSceneModal.tsx:376`'s comment "loadScene routes through the existing compile
  gate" is now false.
- `store/slices/historySlice.ts:190` — the `engine.resetAccumulation()` on
  undo/redo restore is a no-op against the stub. Ctrl+Z reaches it.

**Honest caveat, and please respect it.** What is proven is that the branch is
unreachable — **not** that a user-visible defect follows. Scene loading
demonstrably works today, so the early path plus the CONFIG events `loadPreset`
emits may already be sufficient, and accumulation may be reset by the
setter-driven CONFIG emits in the undo path. **Decide whether the dead branch is
dead weight or a latent bug before touching it** — do not chase a phantom.

**Options**

1. **Mechanical sweep** — move the five captures inside the functions that use
   them. Smallest diff, no perf cost (`getProxy` is a null-check and a return),
   but only fixes captures that exist today.
2. **Stable forwarding Proxy** — have engine-core's `getProxy()` return a Proxy
   that always delegates to `_proxy`. Fixes every capture, present and future, at
   the cost of a trap on hot getters (`accumulationCount` is read per frame in
   PerformanceMonitor).
3. **Leave it** and rely on the new `@bug PRODUCTION:` plus the rule entry to stop
   new instances.

**Recommendation: (1).** The capture set is small and enumerable, the invariant is
now documented at the source site and in `.claude/rules/worker-contract.md`, and
(2) pays a per-frame cost for something a lint-style rule already covers. **Pair
the sweep with a decision on engineStore's post-boot `loadScene` branch** — making
the capture live will re-activate it, which is a behaviour change and wants a
visual check.

**Grep trap worth knowing:** `grep 'setProxy('` finds no call site, because
`install.ts` imports it aliased as `setEngineProxy`. An auditor nearly concluded
it was never called at all.

---

## MEDIUM — Every custom `animate-*` utility is undefined in production

_(cycle 5 · `index.css` — confirmed on three independent lines)_

`animate-fade-in`, `animate-slider-entry`, `animate-pop-in`, `animate-fade-in-up`
/`-down`/`-left`/`-right` are defined **only** in `demo.html`'s inline `<style>`.
`index.css` is the single tracked stylesheet in the repo and has zero
`@keyframes`; `tailwind.config.js` extends only `colors`, with no
`theme.extend.keyframes` or `animation`.

**Measured** across seven entry points with `animate-pulse` as a control:
app-gmt, gradient-explorer, fluid-toy, fractal-toy, mesh-export and index all
return `animationName: 'none'` for all seven classes while `animate-pulse`
correctly returns `'pulse'`. Only `demo.html` resolves them. The production
`dist/assets/*.css` corroborates: only Tailwind's four built-ins plus reactflow's
`dashdraw`. Usage outside demo.html: **53 occurrences across 36 files** (fade-in
34, slider-entry 9, pop-in 3, fade-in-up 3, fade-in-left 3, fade-in-down 2,
fade-in-right 1).

**The causal story in the original finding was wrong, and the correction matters.**
It blamed the Tailwind Play-CDN → build-time migration (`80c39444`, 2026-06-17).
That is a red herring: at `80c39444^`, `app-gmt.html` already had no keyframes and
no inline `tailwind.config` override, so the CDN could not have generated them
either. These keyframes were **never in a shared stylesheet** — always a per-entry
inline block in exactly one file. The real history:

- `fd38bb76` (2026-02-01) — full set lands in `index.html`.
- `1bf03516` (2026-03-25) — gradient-explorer / fluid-toy / fractal-toy /
  mesh-export created; `git log -S` on each path returns **empty**. They never had them.
- **`50547f46` (2026-04-24)** — `app-gmt.html` created without them. **This is the
  commit that broke it for the GMT app.**
- `a1e63b06` (2026-05-04) — keyframe-carrying `index.html` renamed to `demo.html`,
  which is the only reason demo still works.
- `095810f2` (2026-06-17) — `index.html` rewritten as the app entry, so `/` lost them.

So: ~3 months without them for app-gmt, ~4 for the sibling apps (never had them),
~6 weeks for the root `/`.

**Restoring is not purely cosmetic.** Measured on the *real* in-app elements (8
`.animate-slider-entry` rows in each app): demo.html gives
`overflow:hidden, max-height:1000px, transform:matrix(…)`; app-gmt gives
`overflow:visible, max-height:none, transform:none`. Because fill-mode is
`forwards`, restoring leaves a **permanent non-`none` transform** — a new stacking
context and a containing block for `position:fixed` descendants — plus a
`max-height:1000px` clip. `ScalarInput.tsx:236` carries it, so this is *every DDFS
scalar slider in every panel of every app*.

**Two code sites document dead guards that would re-arm:**

- `components/AutoFeaturePanel.tsx:483` — `'!animate-none !overflow-visible'` with
  the comment *"Conditional params: skip entry animation to prevent grey-box on
  re-mount (CSS animation restart issue)"*. That is a **previously observed visual
  bug**. The guard covers only condition-bearing *scalar* params in AutoFeaturePanel
  — the vec2/3/4 branches, AdvancedGradientEditor's `isExpanded &&`, DrawingPanel's
  collapsibles and GenericToggleSwitch are all unguarded, so the artifact would
  likely return there.
- `components/GlobalContextMenu.tsx:104` — `[&_.animate-slider-entry]:!animate-none`
  kills the animation for context-menu-hosted widgets but **not** the
  `overflow:hidden`, so those rows would still gain clipping.
- `components/ui/AnchoredMenu.tsx:56` measures `getBoundingClientRect()` at mount;
  any anchored surface hosting widget rows would measure them at `max-height:0` for
  the first 0.35 s — exactly the failure GlobalContextMenu's override exists to
  prevent, and AnchoredMenu has no equivalent guard.

**Options:** (a) paste the block into `index.css` for full parity with demo;
(b) restore only the harmless ones (the 34 `fade-in` uses are 16 ms and effectively
invisible; the directionals and `pop-in` are 0.15–0.3 s opacity+transform) and
leave `slider-entry` out until you have looked at the accordions; (c) move them
into `tailwind.config.js` `theme.extend` — more idiomatic and purgeable, more
churn; (d) decide the app is better without them and strip the 53 dead class
references.

**Recommendation: (b), then eyeball the accordions before adding `slider-entry`.**
Paste-ready CSS is in the cycle-5 auditor's report; it is `demo.html:37-57` verbatim.

---

## MEDIUM — `Modal`'s backdrop-dismiss default is backwards

_(cycle 5 · `components/ui/Modal.tsx:41`)_

`.claude/rules/layers-zindex.md` states: *"No backdrop-click-to-close on complex
modals — it destroys work."* `Modal` defaults `dismissOnBackdrop = true`, and its
JSDoc justifies it historically ("mirrors the hand-rolled modals it replaces").

Of the 13 `<Modal>` call sites, **9 explicitly pass `dismissOnBackdrop={false}`**:
PalettePickerOverlay, NewSceneModal:617, AccountPanel, AuthOverlay,
ModifyWithAIModal, AfxExportDialog, FbxExportDialog, BucketRenderResultModal,
SubmitGalleryModal. Only 4 take the default, and all four are surfaces where
backdrop-close is harmless (a nested confirm-discard, FormulaPicker browse, the
Lightbox image viewer).

So the primitive defaults to the work-destroying behaviour and every real dialog
has to remember the opt-out. A future modal author who forgets ships a data-loss
footgun that no guard catches.

**Options:** (a) flip the default to `false` and pass `dismissOnBackdrop` at the 3
sites that genuinely want it (NewSceneModal:748, FormulaPicker:960, Lightbox:113)
— **behaviour-preserving at every existing site**, safe-by-default for every future
one; (b) leave the default and delete the convention line from the rule, accepting
backdrop-close as house style; (c) add a lint/guard — a lot of machinery for a
one-line default.

**Recommendation: (a).** A 4-file change, provably behaviour-neutral today (every
call site was enumerated), and it makes the primitive agree with the rule that
governs it. Not applied because it changes a shipped interaction default on three
user-facing surfaces and no guard exercises backdrop dismissal.

---

## MEDIUM — Nothing guards mobile layout, and a ready-to-promote probe exists

_(cycle 5 · `.claude/rules/mobile-layout.md`)_

With the 768 px threshold deliberately set to 2000, **both guards the rule
listed passed green** — `smoke:viewport` (adaptive-quality chain) and
`smoke:viewport-fixed` (ViewportFrame content-box). `smoke:boot` also passes; it
boots desktop. So every mobile invariant — breakpoint, orientation, the
sticky-vs-fixed shell branch, ADR-0038 asymmetric gating — is **unguarded**, and
ADR-0038's "Tested under followups q-008 and q-083" has no standing counterpart.

This is a fourth guard-failure mode, distinct from the three earlier cycles found:
not permanently red, not a dead selector, not logged-but-unasserted — a **healthy
guard cited for the wrong thing**.

A working probe is left at `debug/_mobile-layout-probe.mts` (gitignored). It boots
`gradient-explorer.html` in a Pixel 5 context and a desktop context and reads
`isDeviceMobile` / `isPortrait` plus the computed `position` and `height` of the
`MobileViewportShell` div. It already demonstrated it can discriminate — it is what
caught the boot-seed divergence under mutation.

**Options:** (a) promote as-is — rename to `debug/smoke-mobile-layout.mts`, add
assertions (it currently logs rather than throws), add the npm script, list it in
the rule; (b) point it at `app-gmt.html` instead, which also mounts `LandscapeGate`
and `MobileScrollIntro`, so it could assert the rotate prompt fires in portrait and
the intro renders at `100svh` — better coverage, slower boot; (c) leave uncovered
and rely on your device testing, which is the current de facto state.

**Recommendation: (a) now, (b) if someone is already touching app-gmt smokes.**
Not done here because it means editing `package.json` while other auditors hold the
tree, and because a new guard script is itself unreviewed code.

---

## MEDIUM — Do NOT mechanically collapse the eight breakpoint copies

_(cycle 5 · `engine/HardwareDetection.ts`)_

Recorded specifically so a future cleanup pass does not do this blindly. Six of the
eight inline `(pointer: coarse) || innerWidth < 768` copies are literally identical
to `isMobileViewport()` and could be swapped safely (`uiSlice` ×2, `viewportSlice`,
`Dock.tsx`, `GmtRendererCanvas.tsx`, `favientsPanelPersist.ts`).

But **`engine-gmt/components/FormulaPicker/FormulaPicker.tsx:832` is not
equivalent** — it tests `winW < 768` where `winW` is a *locally measured* width,
not `window.innerWidth`. Swapping it changes which width is tested, and it drives
whether the picker renders as an anchored popover or a viewport-fitted sheet.
(`FormulaPicker.tsx:927` *does* use `window.innerWidth` and is safe.)

The highest-value single swap is **`store/slices/uiSlice.ts`'s slice initializer** —
it alone produces observable boot-state divergence (demonstrated by mutation). It is
also the trickiest: it runs at store construction, so importing
`engine/HardwareDetection.ts` there adds a module-init edge — check for a cycle first.

**Options:** (a) swap the six safe ones, leave FormulaPicker:832 with a comment
explaining why it differs; (b) swap only the uiSlice initializer, the one that
matters; (c) leave it all and rely on the now-accurate JSDoc list.
**Recommendation: (b) first**, then (a) as tidy-up — and get the guard above in
place first, since nothing currently catches a mistake here.

---

## LOW — gradient-explorer mounts half of the ADR-0039 pair

_(cycle 5 · `gradient-explorer/GradientExplorerApp.tsx:306`)_

ADR-0039's mechanism is the `100svh` intro **plus** the `100dvh` sticky shell:
their combined height is what gives the body scroll capacity to retract the iOS
address bar. GE mounts only the shell, so on a real phone there is nothing to
swipe past and the collapse cannot fire. The comment reads "…tracks the iOS
address-bar collapse (engine-standard, matches app-gmt)". "Tracks" is defensible —
`100dvh` re-fits whenever the bar retracts for any reason — but "matches app-gmt"
is not, since app-gmt mounts both halves.

This may well be intentional (a palette tool arguably does not want a
swipe-to-enter splash). **Options:** (a) mount `MobileScrollIntro` in GE for
parity; (b) soften the comment to "sizes to the dynamic viewport and clears the
notch; no address-bar collapse (no MobileScrollIntro mounted)"; (c) leave both.
**Recommendation: (b)** — one line, no behaviour risk.

---

## ADR corrections — cycle 5 (paste-ready)

### ADR-0035 — names the wrong component throughout

Insert immediately after the `# ADR-0035: mouseOverCanvas is a ref, not store state` heading:

> **Update 2026-07-28 (component + input-path drift; decision unchanged):** the
> `Scope` line and the Context / Consequences sections name
> `engine/plugins/viewport/AdaptiveResolutionBadge.tsx` as the component that
> would re-render on hover. That component does not import `isMouseOverCanvas` —
> the only live reader is `engine-gmt/topbar/AdaptiveResolution.tsx:30`, which
> uses it to choose the badge's "Auto" (pointer on canvas) vs "Always" (pointer
> off canvas) label. Separately, `engine/AdaptiveResolution.ts` no longer reads
> its `mouseOverCanvas` input at all (optional since ADR-0061 P5 — engagement is
> activity-driven, not pointer-position-driven), though
> `store/slices/viewportSlice.ts:196` still evaluates `isMouseOverCanvas()` once
> per frame inside `reportFps`, driven by
> `engine-gmt/renderer/GmtRendererTickDriver.tsx:302`. The per-frame-poll
> rationale for keeping the value ref-backed therefore still holds and the
> decision stands. The closing "documented in both the worker-contract and
> adaptive-resolution module docs" now resolves to
> `docs/history/audit-2026-05-20/archive/engine/{worker-contract,adaptive-resolution}.md`;
> the live documentation is the JSDoc on `engine/worker/ViewportRefs.ts`.

### ADR-0038 — drifted line reference

Insert under the `# ADR-0038: Asymmetric mobile-detection gating policy` heading:

> **Update 2026-07-28 (line-reference drift; decision unchanged):** The contract
> cited below as "the header comment at `hooks/useMobileLayout.ts:50-65`" now
> lives in the JSDoc block on `export const useMobileLayout` (currently lines
> 81-95); lines 50-65 are the module-level resize listener. Grep for the
> `isMobile` / `isDeviceMobile` / `isPortrait` bullet list rather than a line
> range. The asymmetry itself is unchanged and verified: `LandscapeGate`,
> `MobileScrollIntro` and `MobileViewportShell` all still consume raw
> `isDeviceMobile`.

Note also that ADR-0038's "Tested under followups q-008 and q-083" implies
automated coverage that does not exist — see the mobile-guard proposal above.

### ADR-0014 — status snapshot well out of date

Matters because the rewritten `.claude/rules/ui-and-panels.md` now cites ADR-0014
as the authority for "purity in `components/` is aspirational, not enforced" (that
part is still exactly right). A reader who follows the citation lands on a file
claiming only `Slider` uses the context, and will re-migrate things already done.
Insert immediately after the `# ADR-0014: …` heading:

> **Update 2026-07-28 (migration progressed; decision unchanged):** The status
> snapshot in *Decision* is stale. `useStoreCallbacks()` is now consumed by
> `components/Slider.tsx:163,206`, `components/AutoFeaturePanel.tsx:116`,
> `components/Dropdown.tsx:27`, `components/EmbeddedColorPicker.tsx:255`,
> `components/KeyframeButton.tsx:52`, `components/AdvancedGradientEditor.tsx:131`
> and `hooks/useHelpContextMenu.ts:13` — not "only `Slider`". Still on direct
> store access: `components/Knob.tsx:177-178`,
> `components/vector-input/index.tsx:55-56,196-197,352-353`,
> `components/layout/Dock.tsx:33ff`, `components/layout/DropZones.tsx:9ff`.
> `AutoFeaturePanel` is now **mixed**: it takes
> `handleInteractionStart`/`handleInteractionEnd` from the context (`:116`) but
> still reads the third callback directly as
> `useEngineStore(s => s.openContextMenu)` (`:181`) even though the same context
> supplies it — a one-line cleanup. The precondition this ADR gated the migration
> on ("each host's callbacks are memoised") now holds for **all five** hosts:
> `App.tsx:74`, `app-gmt/AppGmt.tsx:188`, `fluid-toy/FluidToyApp.tsx:86`,
> `fractal-toy/FractalToyApp.tsx:55`, `gradient-explorer/GradientExplorerApp.tsx:268`
> — the last being a host that did not exist when this ADR was written. All five
> wire `openContextMenu: state.openContextMenu` verbatim, so the context value and
> the direct store read are the same function today and the remaining migrations
> are behaviour-neutral. The incremental-migration decision stands.

---

## Housekeeping surfaced in cycle 5

- **`engine/components/modulation/**` and `engine/components/gizmo/**` now match
  NO rule at all.** `modulation.md` scopes `engine/features/modulation/**`, not
  the components dir, and cycle 5 narrowed `mobile-layout.md`'s over-broad
  `engine/components/**` glob (correctly — those files have zero mobile content).
  A coverage gap for whoever owns the modulation rule.
- **Two sub-threshold raw z values**, below `check:zindex`'s `>= 100` blind spot
  and judged not worth a finding: `components/PerformanceMonitor.tsx:263` `z-[50]`
  and `components/viewport/CompositionOverlay.tsx:45` `z-[15]`. Both shell-domain
  in-flow surfaces that contradict their tier-table entry (`shellViewportOverlay`,
  base 20) but have no sibling to collide with.
- **`AutoFeaturePanel.tsx:181`** reads `openContextMenu` directly from the store
  while taking its two sibling callbacks from `useStoreCallbacks()` at `:116`. The
  context supplies all three; one-line cleanup.
- **An untracked `debug/engine-gmt-smoke.png`** was produced by `smoke:engine-gmt`
  and left in the tree. Not committed. Worth adding to `.gitignore` alongside the
  other smoke artefacts.
- **Gitignored scratch probes** left in place for reuse: `debug/_proxy-probe.mts`
  (re-confirms the stale worker capture in ~30 s),
  `debug/_mobile-layout-probe.mts` (the promotable mobile guard),
  `debug/_animate-probe.mts` (the animate-* measurement),
  `debug/_probe-zindex-gap.mts` (the tier-reservation probe).
- **A dev server is still running on :3400** from cycle 1 — stop it at end of run.

---

# Cycle 6

## HIGH — The Formula Workshop's V4 escape hatch is dead, and the obvious fix ships a second bug

_(cycle 6 · `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:721` — confirmed by driving the real UI)_

When V3's detector fails and V4 is the effective pipeline, `runDetect`
**deliberately skips `setError`** so the user can still Preview/Import via V4 —
and the buttons are correspondingly left enabled (`disabled={!canImport && !useV4Pipeline}`
collapses to `false`). But both handlers open with a V3-only guard,
`if (!detected || !selectedFunctionName) return;`, placed **above** both
`setError(null)` and the `if (useV4Pipeline)` branch. So the click is a pure
no-op: no import, no preview, no message, no console output.

**Demonstrated, not inferred.** A verifier drove the Workshop under Playwright.
For both affected library formulas: mode read "Auto (Solo)", `previewDisabled:false`,
`importDisabled:false`, `errorText:null`. Clicking Preview and Import each
returned CLICKED and after 2.5 s left `errorText` null, the store formula
unchanged, the snapshot byte-identical, and **zero console output**. A control run
with a V3-passing formula behaved correctly (params section present, Preview
switched to `frag_workshop_preview`, Import switched to the formula name), proving
the harness would have caught a working path.

**Reachability: two shipped library formulas**, in default auto mode —
`Benesi/MengersmoothPolyhedra.frag` and
`Kashaders/With_CRrenderer/Simple_Kleinian-Slow-DE-02----l.frag`. Both are in
`public/formulas/manifest.json` and pass the picker filter, so they are browsable
by default. `npm run test:frag:scan` names the same two: *"V3 fails, V4 ok: 2
(Workshop shows error on select but V4 would work — needs Fix 2)"*.

Two corrections to the original report, both worth keeping:

- The catalog lists **three** entries with `{v3:'skip', v4:'pass', recommended:'v4'}`,
  but only **two** fail V3 today — `Experimental/3DMandel.frag`'s catalog row is
  stale because V3's preprocessor improved since the catalog was frozen. The
  `@invariant` on `getRecommendedPipeline` already warns about exactly this.
- The **custom-paste path is a milder variant**: pasting GLSL that V3 rejects
  leaves `entryId` null, so `willUseV4` is false and `setError` *does* fire — the
  user sees a V3 parse error while the selector reads "Auto (Solo)", a
  mode/message mismatch. It becomes fully silent only if they explicitly pick
  "Standalone".

**The proposed fix — hoist the `if (useV4Pipeline)` blocks above the guards — is
necessary but NOT sufficient.** V4's `processFormula(source, filename, id?, name?)`
genuinely needs neither `detected` nor `selectedFunctionName`, and `formulaName`
*is* populated (`runDetect` sets `uniqueName(fileBaseName || 'imported')`). But:

1. **ID mismatch would break the import outright.** V4's `sanitizeId` rewrites
   `Simple_Kleinian-Slow-DE-02----l` to `Simple_Kleinian_Slow_DE_02_l`, and
   `FractalRegistry.register` keys on `def.id`. `handleImport`'s V4 branch calls
   `setFormula(formulaName)` — the **unsanitised** string. The import would
   "succeed" and then switch to an id that is not in the registry. Use `r.def.id`.
2. `setError(null)` sits *below* the guard, so hoisting the V4 block above it
   would let a stale error survive a successful V4 preview. Move it up too.
3. The whole detected-gated UI stays hidden (sections gated on
   `{detected && selectedFunctionName && …}`) — no name field, no param table, no
   transformed-output view. A blind import with no rename ability.
4. `buildAndRegisterV4` records no `importSource`, so the re-edit flow silently
   no-ops for anything imported this way.
5. Dropping the guard also drops the `!formulaName.trim()` check for V4; only the
   button's `disabled` expression still guards it.

**Recommendation:** fix it, but as a small deliberate change rather than a hoist —
move the V4 branch up, move `setError(null)` with it, use `r.def.id` for
`setFormula`, and decide whether to un-gate the name field so the user can rename
before importing. Blast radius is 2 of 196 shipped frags, so this is not urgent —
but it is a documented feature that silently does nothing, which is worse than an
error message. No guard mounts `FormulaWorkshop`, so this needs a manual pass.

---

## MEDIUM — `renderExportFrame` still has no timeout

_(cycle 6 · `engine-gmt/engine/worker/WorkerProxy.ts:1002`)_

The export-hang fix (`f57e88b4`) gave `renderExportFrame` a reject route, so a
worker crash or an explicit `EXPORT_ERROR` now settles it. But it still has **no
timer of its own**, unlike `startExport` (10 s) and `finishExport` (60 s). A
silently dropped `EXPORT_FRAME_DONE` — e.g. `renderWorker`'s
`EXPORT_RENDER_FRAME` arriving while `exporter?.active` is false, which posts
nothing at all — still hangs the pump forever.

**Why it wasn't applied:** picking the duration is a product call. A legitimate 4K
path-traced frame at high sample counts can take minutes, so a naive 60 s timeout
would abort real work. Options: (a) derive it from the configured sample count and
resolution; (b) a generous fixed ceiling (5–10 min) purely as a deadlock breaker;
(c) a watchdog that only fires if *no* progress message has arrived for N seconds,
which distinguishes "slow frame" from "dropped frame" properly.
**Recommendation: (c)** — it is the only one that cannot abort legitimate work.

---

## LOW — The pre-boot outbox flushes at the one moment it cannot be applied

_(cycle 6 · `engine-gmt/engine/worker/WorkerProxy.ts:466`)_

`_flushOutbox()` runs immediately *before* `postMessage(initMsg)`, and
`renderWorker` defers all engine construction to `BOOT` — so everything flushed
arrives while `engine` is null, and every handler except `REGISTER_FORMULA` and
`RESIZE` is an `engine?.` no-op. The outbox converts a main-side drop into a
worker-side drop.

**No live bug:** an instrumented boot showed the outbox is empty at both creation
sites, and every real pre-boot payload already has a bespoke replay
(`_registeredFormulas`, `pendingTextures`, `pendingTeleport`, install.ts's
`onBooted` push). The JSDoc has been corrected to say so.

**Options:** (1) leave it — recommended; (2) move the drain to the end of
`case 'BOOT'` after `setupEngine()`, keeping `_replayFormulas()` before INIT since
it must precede the boot compile; (3) delete the outbox and make `post()` throw in
dev when `_worker` is null, forcing every caller to declare a replay.

**Recommendation: (1).** Option 2 changes worker message ordering — the highest-risk
surface in this subsystem, where the `_pendingTick` / `syncOffset` /
OFFSET_SET-discards-buffered-tick dance all depends on it — and no export or
boot-ordering guard would catch a mistake. Revisit only if a future feature
actually needs to post before `initWorkerMode`.

---

## Housekeeping surfaced in cycle 6

- **`g02-shader-pipeline` did not complete.** Its auditor died mid-edit with an
  API error and returned no report. It had already written two files —
  `engine-gmt/engine/ShaderBuilder.ts` (a caveat about the Physics/Histogram
  variants emitting `addHeader` output in a different position than Main, plus
  `@invariant`s on `addUniform`) and the engine-gmt half of
  `docs/policy/uniform-plugin-contract.md`. **Those edits were reverted, not
  committed**, because there is no verification behind them and the protocol
  forbids applying unverified findings. The diff is preserved at
  `plans/overnight-audit/salvage/g02-partial-cycle6.diff` as a starting
  hypothesis for the re-run — treat it as a lead, not as truth. `g02` is back to
  `pending` and will be re-audited.
- **The sibling-app-guard trap keeps recurring.** Three rules have now been found
  citing `smoke:formula-switch` / `smoke:fractal-kind` / `smoke:tsaa` as guards
  for engine-gmt code. All three boot `fractal-toy.html` or `fluid-toy.html`,
  neither of which imports `engine-gmt/` at all. Worth a one-off sweep of every
  `.claude/rules/*.md` Guards block against which entry point each smoke actually
  loads — it is a mechanical check and this run has found it three times.
- **`engine-gmt/formulas/index.ts`, `engine-gmt/types/common.ts` and
  `engine-gmt/components/FormulaPicker/pickerCategories.ts` are
  `git update-index --skip-worktree`** (local-only Julia3DLattes wiring). Edits to
  them cannot be committed. `pickerCategories.ts:14` still carries a dead
  `@see dev/plans/formula-picker-design.md` for that reason.
- **Two more dead `dev/plans/` citations** outside this cycle's scope, for the
  state-library subsystem: `engine-gmt/utils/applyPartialPreset.ts:15` and
  `debug/test-partial-apply.mts:10`.
- **`Experimental/3DMandel.frag`'s catalog row is stale** — `v3:'skip'` but V3
  parses it today. The catalog was frozen 2026-04-18 and V3's preprocessor has
  improved since; `getRecommendedPipeline`'s own `@invariant` flags the staleness
  risk. Worth regenerating the catalog.

---

# Cycle 7

## HIGH — `smoke:orbit` is permanently red, so camera navigation has no working guard

_(cycle 7 · `debug/smoke-orbit.mts:87`)_

`smoke:orbit` is the **only** browser guard that drives a real camera gesture
through `Navigation.tsx`. It is red on unmodified `main`:

```
sceneOffset BEFORE {x:0, y:0, z:3}
sceneOffset AFTER  {x:-0.918, y:1.690, z:-0.651}   delta 4.127
accumulationCount: 1 -> 1 (advanced within 8s: false)
✗ accumulation did not advance after orbit settled (1 -> 1) - render loop stalled?
```

**Proven pre-existing**, not audit-induced: reverting `Navigation.tsx` to pristine
(`git diff --stat` empty) and re-running gives a byte-identical failure, same
delta, same assertion. ADR-0063:81 records this smoke as green at the time of that
decision, so it has regressed at some point since.

**Note the split — this is the useful part.** The guard's *earlier* assertions
PASS: the orbit drag really does move `sceneOffset` by the expected magnitude, so
the Navigation gesture path is demonstrably alive. Only the final **post-settle
accumulation** assertion fails.

**Options**

1. **The assertion is stale.** Cycle 5 established that adaptive engagement is now
   activity-driven and `engine/AdaptiveResolution.ts` no longer reads
   `mouseOverCanvas` at all, so a smoke that settles without further activity may
   now correctly sit at `accumulationCount 1`. Cheap to fix — but silences a real
   signal if wrong.
2. **It is a genuine render-loop stall after gesture end.** This matches the known
   "main-thread gates must mirror worker reality" theme, and would be a real
   user-visible bug: the image never converges after you stop orbiting.
3. **Split the guard** so the `sceneOffset` half stays enforceable while the
   accumulation half is quarantined.

**Recommendation: do not touch the assertion until (2) is ruled out.** The
distinguishing test is a manual orbit-and-release at `localhost:3400/app-gmt.html`,
watching whether the image converges after the drag ends. That is a visual check
and you do the visual testing, which is why this is yours rather than something
the run resolved. If it converges by hand, the smoke's settle/wait model is stale
and option 1 applies; if it does not, this is a shipped convergence bug and the
guard is correctly red.

The red state is already documented in `.claude/rules/navigation.md` so the next
agent does not mistake it for their own breakage — that mitigation is applied and
is independent of which option you pick.

---

## The guard-citation problem is now systemic — worth one deliberate sweep

Six instances across seven cycles, and cycle 7 produced the worst case yet:
**every one of the seven guards** `.claude/rules/navigation.md` listed is
incapable of failing on a `Navigation.tsx` regression.

The full tally so far:

| Rule | Bad citation | Why it cannot fail |
|---|---|---|
| `gmt-renderer.md` | `smoke:tsaa` | boots fluid-toy.html; fluid-toy has zero `RenderPipeline` references |
| `gmt-formulas-and-graph.md` | `smoke:formula-switch`, `smoke:fractal-kind` | boot fractal-toy.html / fluid-toy.html; neither imports `engine-gmt/` |
| `gmt-features.md` | `smoke:camera` | boots fluid-toy.html; asserts fluid-toy's own 2D camera slice |
| `navigation.md` | all seven | 3 boot fluid-toy.html, 3 are node-only, 1 is red |
| `mobile-layout.md` | `smoke:viewport`, `smoke:viewport-fixed` | healthy guards, but blind to the breakpoint (proven by mutation) |
| `ui-and-panels.md` | `smoke:ui-primitives` | covers only `clampToViewport`; renders no React component |

**The check is mechanical:** for each `.claude/rules/*.md` Guards block, read the
`ENGINE_URL` default out of each `debug/smoke-*.mts` and confirm the rule's scoped
paths are actually in that entry point's import graph. Node-only `test:*` scripts
need the same treatment — several self-document as "Node-only, no WebGL".

Worth doing once, properly, rather than one rule per cycle. A small script could
even keep it honest: parse each rule's `paths:` frontmatter and Guards block, and
fail if a cited smoke's entry point cannot reach any scoped path.

---

## Housekeeping surfaced in cycle 7

- **`fluid-toy/README.md:230`** lists `npm run smoke:orbit  # auto-orbit visual
  check` as a fluid-toy check. That smoke boots `app-gmt.html`. Belongs to
  whoever owns the sibling-apps rule.
- **The two known `shortId` collisions are the ONLY ones.** A registry-wide sweep
  over all 27 registered features confirmed exactly one feature-level collision
  (`dr` ← droste, drawing) and exactly one param-level collision (materials `ec` ←
  envMapColorSpace, emissionMode). So the `@bug PRODUCTION:` note in
  `engine/FeatureSystem.ts` is **complete rather than a sample** — useful before
  you pick a wire-format fix, since it means the fix is bounded at two renames.
- **Nine further registry-wide sweeps came back clean** and are recorded in
  `results/g05-engine-gmt-features.json` so a later cycle need not redo them:
  uniform-name uniqueness across the whole GLSL namespace (zero collisions),
  `dependsOn` integrity including topological order, params with no default
  (zero), the CLAUDE.md vestigial-field anti-patterns (zero — fully cleaned up),
  dangling `condition.param`/`parentId` (zero after two false positives were
  dismissed), params lacking a `shortId` (five, all correct), the panel-manifest
  cross-check (all 15 compile-gate references resolve), rule coverage (no gap),
  and `holdsLiveSession` (only `audio`, as expected).
- **`engine-gmt/features/index.ts`'s section comments were actively misleading**
  about which side of the engine/engine-gmt fork several features live on —
  including Droste. Since module identity is what decides whether a
  re-registration short-circuits, a reader who trusted those headers drew the
  opposite conclusion from the truth. Fixed, and flagged here because it is a
  plausible reason the droste/drawing collision went unnoticed for so long.
- **The `fragmentarium_import` subtree is entirely unaudited** — FormulaWorkshop,
  `parsers/`, `v3/`, `v4/`, `transform/`. It is by far the largest feature
  directory and cycle 6 already found a live dead-end in it (the V4 escape hatch).
  Worth its own worklist entry rather than riding along with `g05`.

---

# Cycle 8

## HIGH — A non-cubic export box silently produces distorted geometry

_(cycle 8 · `mesh-export/gpu/gpu-pipeline.ts:275`)_

The GPU SDF sampler has a **single scalar** `uBoundsRange` used for all three
axes — `ExportPanel.tsx:63` passes `gridMax[0] - gridMin[0]`, i.e. the X extent
only — but the bounds UI lets the user set X/Y/Z independently. The shader then
samples a **cube of side = the X extent** anchored at `gridMin`, while dual
contouring maps back with the true per-axis `gridMax[a] - gridMin[a]`.

**Worked example.** size `[3, 6, 3]`, centre `[0,0,0]` → `gridMin = [-1.5,-3,-1.5]`,
`boundsRange = 3`. The shader samples Y over `[-3, 0]` — only the **bottom half**
of the intended box. DC then stretches grid row *j* across the full `[-3, 3]`. The
mesh is the bottom half of the fractal, stretched 2× vertically.

Worse, VDB export is different again: `serializeVDB` writes a single uniform voxel
scale, so **the .vdb is a correct cube while the GLB/STL is a stretched half-box**
— two exports of the same scene that do not match.

**Reachable, and the UI invites it.** `BoundsPanel.tsx:74-82` renders Size as a
per-axis `BaseVectorInput` with `linkable`; it starts linked but `:362-372` renders
an explicit "Link axes" toggle. The panel prints `size[0] × size[1] × size[2]` as
three independent numbers, so the UI advertises anisotropy.

**Mitigating:** `DEFAULT_BBOX_SIZE` is `[3,3,3]` and `autoFitBounds` forces a cube
(`Math.max(sx,sy,sz)`), so the default and auto-fit paths never trip it. Only a
user who deliberately unlinks the axes is affected — which is exactly what the
control invites.

**Options**

1. **Make the sampler anisotropy-aware** — `uBoundsRange` → `uniform vec3 uBoundsSize`,
   update the three world-position lines, `bindPipelineUniforms` (two sites), every
   `voxelSize = boundsRange / N` derivation (the pipeline uses one scalar voxelSize
   for min-feature/closing/jitter radii, which become per-axis or need a policy),
   and the VDB `_writeTransform` (currently a uniform scale matrix; would need
   s.x/s.y/s.z on the diagonal). Largest change, and it makes "voxel" non-cubic,
   which affects the morphological filters and the QEF cell-clamp margins.
2. **Constrain the product to cubic bounds** — drop `linkable` from BoundsPanel's
   Size input, or clamp all three to `max()`. Near-one-line, no silent wrong output,
   but removes a capability the UI currently offers.
3. **Keep the maths and warn** — detect non-uniform size and surface it.

**Recommendation: (2) now, (1) later if artists actually want non-cubic crops.**
Mesh export is a premium surface and the current behaviour is *silently wrong*
rather than degraded — a user who unlinks the axes gets a plausible-looking but
geometrically false mesh with no diagnostic. (2) removes the wrong output
immediately at near-zero risk; (1) touches the SDF filters and the VDB transform
and should not be attempted unattended. Either way this deserves an `@invariant`
on the shader block stating that the sampled region is a cube of side
`uBoundsRange`, because nothing in the code says so today.

---

## MEDIUM — Dual contouring is corner-sampled; the GPU is cell-centred

_(cycle 8 · `mesh-export/algorithms/dc-core.ts:120` — confirmed by probe, deliberately NOT fixed)_

`gridToWorld`/`worldToGrid` use `g / (N-1)`; the GPU samples at `(i + 0.5) / N`.
The difference is provably a **uniform scale of `N/(N-1)` about the grid centre** —
verified symbolically and numerically at three resolutions: **+1.59% at N=64,
+0.196% at the default N=512**, with the fitted fixed point matching the grid
centre to 1e-12.

**dc-core is the outlier, not the sampler.** Five independent sites use `/N`, four
of them with `+0.5`: the SDF sampler itself, the VDB colour pass
(`gridMin[a] + (block + l + 0.5) * voxelSize`), `autoFitBounds`, and every
`voxelSize` derivation in the tree. The sampler cannot be "wrong" — it is where
the data physically is.

**A mitigation the original report missed.** Newton projection is **on by default**
(`newton: true`, 6 steps) and runs after DC, iterating against the *analytic*
formula DE with a displacement clamp of **2 voxels** — four times the 0.5-voxel
maximum DC error. So on the default path most vertices are re-projected onto the
true isosurface and the mesh is geometrically right, with only tangential drift.
The full error ships when Newton is toggled off, on the CPU/no-gl path, and for
vertices where Newton bails early (common in thin/chaotic regions). **A naive
caliper test on a default-settings export might well come back clean.**

**Why it was not fixed tonight:** the fix is two lines
(`gridToWorld => gridMin + ((gx + 0.5)/N)*range`, `worldToGrid` inverse; `sparse-grid.ts`
imports both so it follows for free) — but it **changes visible geometry**. The
mesh will now stop half a voxel inside the drawn wireframe on every face. That is
*correct*, but if it reads as a regression the right response is to adjust the
wireframe or expand the sampled bounds by one voxel — **not** to re-break the
sampler to make the picture match. That is a call for someone who can look at it.

`npm run test:mesh-grid` **pins the current wrong behaviour on purpose**, with
assertions written so that fixing dc-core fails loudly and tells you to flip them,
rather than silently changing every export.

---

## The mesh-export subsystem had zero guard coverage — now partly closed

`mesh-export/` is a premium/monetised surface and **no smoke boots
`mesh-export.html`**. The seven distinct entry points across all `debug/smoke-*.mts`
are `/`, `/app-gmt.html`, `/demo.html`, `/fluid-toy.html`, `/fractal-toy.html`,
`/gradient-explorer.html` and one stale `:5173/app-gmt.html`. The only automated
checks reaching this tree were static: `typecheck` and `orphans`.
`debug/dump-mesh-cp.mts` looks like a mesh-export guard but exercises
`engine-gmt/engine/SDFShaderBuilder.ts` and is not wired to any npm script.

That is why two coordinate conventions coexisted unnoticed. This cycle added
`npm run test:mesh-grid` (no browser, no GPU) which now pins the cell-centre
contract, caught the VDB bug before the fix, and confirmed the de-duplication
after it.

**Still unguarded and worth a follow-up:** SDF filtering (`sdf-filter.ts`, 532
lines — cavity fill, min-feature clamp, morphological closing, entirely unreviewed
and the most likely home for further boundary bugs, since the sparse variants must
handle un-allocated neighbour blocks), the GLB/STL writers, and the preview canvas.

---

## Housekeeping surfaced in cycle 8

- **Open anomaly on the share encoder, worth ~20 minutes.** The falsification of
  the new `smoke:share-link` assertion did **not** fail as expected: adding
  `key === 'repeats'` to the `getDiff` skip-list at `utils/UrlStateEncoder.ts:194`
  left the assertion green *and* the payload length unchanged. A stale dev server
  was ruled out (a marker edit was reflected immediately), as was the value never
  entering the payload (a probe shows `repeats=3.7` lands at dictionary path
  `.p.cl.r1` and grows the payload 2820→2822). localStorage leakage between author
  and recipient was also ruled out. The finding rests on the direct payload
  evidence; **the `getDiff` skip-list may not be on the path assumed.**
- **Cycle 1's premise was partly wrong and is now corrected:** `smoke:share-link`
  *did* already assert share round-trip fidelity (formula, `coreMath.paramA`,
  `materials.roughness`). The real gap was that the sample was two feature slices,
  neither of them droste or the colliding materials params. Save-side fidelity
  *was* genuinely unasserted, and now is.
- **`smoke:migrations` must not be cited for GMF format work.** It defaults to
  fluid-toy.html; `utils/SceneFormat.ts` is in that graph but
  `engine-gmt/utils/FormulaFormat.ts` is not, and its assertions are entirely about
  fluid-toy feature-slice migrations.
- **`smoke:gallery-link` needs `VITE_SUPABASE_*` in `.env.local`** or it dies
  before reaching its mock. It is the only guard that loads a real on-disk `.gmf`
  through `loadGMFScene`, so that is worth knowing.
- **`GmtBucketHost`'s `uFullOutputResolution` invariant is looser than the code.**
  It says the value is seeded once and only reset in `endRender`, but
  `UniformManager.syncFrame` re-copies `uResolution → uFullOutputResolution`
  whenever `uImageTileSize ≈ (1,1)` — which a single-tile bucket render *does* hit.
  Value-identical there, so nothing is broken, but the invariant holds by
  coincidence rather than by the gate.
- **Possible DPR mis-scale in the mesh preview**, noticed but not chased:
  `PreviewCanvas.tsx`'s `resetPan` calls `meshPreviewSetMesh(…, CANVAS_SIZE)` while
  `meshPreviewRender` uses `cvs.width`.

---

# Cycle 9

## HIGH — Adding a Scale, Twist, Bend, Smooth Union or Mix node corrupts every node after it

_(cycle 9 · `engine-gmt/data/nodes/definitions.ts` — confirmed by execution, NOT applied)_

`compileGraph`'s `getParam` closure allocates **one `uModularParams` slot per
call**; `updateModularUniforms` writes **one value per `def.inputs` entry**. Any
definition whose `glsl()` template reads a param more than once therefore
allocates slots the packer never writes — shifting itself **and every node
compiled after it**.

**Measured: exactly 5 of 26 definitions.** `Scale` (scale ×2), `Twist` (amount
×2), `Bend` (amount ×2), `SmoothUnion` (k ×2), `Mix` (factor ×3). The other 21 are
in sync. Notably `IFSScale` and `Mandelbulb` read their params several times too,
but **hoist each `getParam` into a local first** — that is the fix pattern,
already present in the same file.

**What a user actually sees**, from the verifier's realistic case (dropping a
Scale in front of a Mandelbulb): packed `[3, 8, 0.1, 0.2, 0.3, 1, 0]` against
emitted slots 0–6, so Mandelbulb's **power reads 0.1 instead of 8**, twist gets
1.0 instead of 0.3, and AddConstant gets 0.0. Power 0.1 with no Julia constant is
a blank or formless render — and **dragging the Power slider moves the phase
instead**. Five of the node editor's most-used nodes are affected.

**It cannot be worked around.** Pressing COMPILE regenerates the same allocation
deterministically.

**Two corrections to the original report, both material:**

- `MANDELBOX_PIPELINE` — described as "the shipped preset" — has **zero
  importers**. It is dead code and cannot be loaded. The two *reachable* pipelines
  measured **in sync** (`JULIA_REPEATER` maxSlot 9 / packed 10; `TUTORIAL` maxSlot
  6 / packed 7), because neither contains an offender. The bug is reachable via
  the **FlowEditor node picker**, not via a preset.
- **Bound params are exempt.** With `bindings: { scale: 'ParamC' }` the compiler
  emits `uParamC` twice and consumes zero slots, so parity is restored. That is
  why the default `JULIA_REPEATER` survives its `Rotate` node's binding. The bug
  bites **unbound** params only.

**Fix:** hoist each `ctx.getParam(...)` into a local const and interpolate the
local — five one-line edits, matching what `IFSScale` already does. **No migration
needed** (saved scenes store `node.params` keyed by input id, not slot index) —
**but it changes the rendered result of any saved Modular scene containing these
nodes.** Anyone who tuned a scene around the broken values will see it shift.
That is the product call, and it is why this was not applied unattended.

**Do this alongside the fix:** a node-only harness asserting
`calls === def.inputs.map(i => i.id)` for every registered def is ~15 lines, needs
no browser, and locks this shut permanently.

---

## HIGH — Pre-2026-04-25 scene files killed the app *(FIXED — read for the blast radius)*

_(cycle 9 · fixed in `97099e7a`)_

Recorded here because the **blast radius question is still open and is yours.**

Commit `19e605a8` (2026-04-25) changed `savedCameras` from a flat shape to a
wrapped `StateSnapshot`, reasoning that *"SavedCameras aren't currently persisted,
so no migration is needed"*. Flat rows **were** already being written into `<Scene>`
blocks — the file used to reproduce this is dated **2026-04-15**, ten days before.

Loading one and opening the Camera Manager **unmounted the entire React root**:
`rootChildren 1 → 0`, `canvases 27 → 0`, frames frozen. White screen, unrecoverable
without a reload, unsaved work lost. There is **no ErrorBoundary anywhere in the
codebase** — a grep for `componentDidCatch` / `getDerivedStateFromError` /
`ErrorBoundary` returns **zero files** — which is why a render throw is fatal
rather than contained.

Now normalised on load, verified against the same real file.

**Still open, and only you can answer it:**

1. **Server-stored shares and gallery scenes.** `openSharedSceneById` (the
   `?s=<id>` deep link) and `loadGalleryScene` both end in the same
   `loadScene({ preset })`. They are fixed by the same normalisation going
   forward — but if any stored scene predates 2026-04-25, **users hitting those
   links have been getting a white screen.** Worth a query against Supabase.
   Shipped content under `public/` is **clean** — nothing there carries
   `savedCameras` at all.
2. **No ErrorBoundary at all** is the deeper issue. Any render throw anywhere
   takes the whole app down with no diagnostic. A single root-level boundary that
   shows the error and offers a reload would have turned this from "app dead" into
   "panel broken", and would cover every future instance of this class.
3. `engine-gmt/animation/cameraBinders.ts` reads `savedCameras` and calls
   `selectCamera`, so the crash likely reached the Active-Camera binder too. Worth
   a look now that the normalisation is in.

---

## MEDIUM — The modular graph never auto-compiles, and its recompile trigger is blind to edges

_(cycle 9 · `engine-gmt/utils/graphAlg.ts:132` and `engine-gmt/store/modularSlice.ts` — confirmed, NOT applied)_

Two related facts, the second discovered by the verifier and **not in the original
claim**:

1. **`isStructureEqual` cannot see edges.** It compares only `PipelineNode` fields;
   wiring lives on `FractalGraph.edges`, and `compileGraph` derives DCE liveness
   and every node's `in1`/`in2` from them. Reproduced: removing one edge leaves
   topological order identical and both equality checks `true`, while
   `compileGraph` output **differs** (the cut graph emits the identity body,
   discarding both nodes). Swapping which upstream feeds a CSG node's `a` vs `b`
   handle likewise flips A-minus-B to B-minus-A with no node field changing.
2. **`autoCompile` is never initialized and `setAutoCompile` is never
   implemented.** An exhaustive grep finds only the type declarations, two
   FlowEditor usages and one read in `modularSlice`. So `s.autoCompile` is
   permanently `undefined`: branch A of `setGraph` is **dead code**, nothing ever
   auto-compiles, the COMPILE button sits permanently in its purple
   `animate-pulse` state, and **clicking the Auto checkbox throws a TypeError**
   (it calls an undefined setter).

**Net:** this is *loud and recoverable* — nothing auto-compiles anyway, the button
pulses, and one click produces the correct shader. That makes it much less severe
than the slot-parity bug above, which is silent and unfixable by recompiling.

**Options:** (a) implement `autoCompile`/`setAutoCompile` properly *and* fold an
edge fingerprint into `isStructureEqual` — the full fix; (b) fold in the edge
fingerprint only, leaving auto-compile as the dead code it is, so `refreshPipeline`
stays the one true path; (c) remove the Auto checkbox, since it currently throws
when clicked, and keep COMPILE as the documented workflow.

**Recommendation: (c) first — it removes a control that throws — then (b).** Note
the edge fingerprint means a signature change on an exported function
(`isStructureEqual` has exactly one caller today) plus a decision on whether an
edge-only change should bump `pipelineRevision` (full recompile, correct) or take
the cheaper `contentChanged` path (uniform-only, insufficient, since DCE changes
the GLSL).

---

## MEDIUM — Export with Step > 1 desyncs audio from the first second

_(cycle 9 · `engine/animation/audioExportMix.ts:20`)_

The export pump renders `totalFrames = floor((end − start) / frameStep) + 1`
frames encoded at `cfg.fps` — so `frameStep 2` is a 2× time-lapse. But
`mixAudioClipsForExport` never receives `frameStep` and computes
`durationSec = ((endFrame + 1) − startFrame) / fps` over the **full** timeline
span. The audio handed to `startExport` is therefore `frameStep`× longer than the
video, and output second *s* maps to timeline second `start + s` for audio but
`start + s*frameStep` for video: **drift of `(frameStep − 1)·s` seconds, audible
from the first second.**

Reachable, confirmed rather than inferred: `RenderDialog` defaults
`showFrameStep` to `true` and app-gmt does not override it, so the Step control is
visible in the same Render Sequence dialog whose runner mixes the audio.
`cfg.fps` is **not** the problem — it scales keys and audio together.

**Options:** (a) time-compress the audio by `frameStep` — keeps sync but
pitch-shifts, so a time-lapse gets chipmunk audio; (b) mix only the sub-range the
video actually covers — natural pitch, sync'd from frame 0, but the tail is
dropped; (c) drop audio entirely when `frameStep > 1` with a warning, matching the
existing "exporting silent video" fallback; (d) hide the Step field while any
audio clip is loaded.

**Recommendation: (c) as the immediate correctness fix** — one guarded early
return, and it converts a silent wrong-output bug into a visible, explained
limitation. Then (d) as polish. (a) only if a stepped export is meant to be a
speed-ramp deliverable.

---

## LOW — Loading a scene always force-selects camera 1

_(cycle 9 · `utils/defaultPresetFields.ts:87`)_

`deserialize` sets `activeCameraId: rows[0].id` unconditionally. The scene's own
pose is restored separately and `selectCamera` is never called, so the pose is
correct — but the panel now claims camera 1 is active, and since `isCameraModified`
compares live pose to snapshot, the row renders as `*Camera 1`. Clicking anything
then teleports the user away from the pose the scene was saved at.

This is also what made the legacy-shape crash fire at render rather than lying
dormant.

**Options:** (a) leave it; (b) set `activeCameraId: null` on load, matching the
"Free Camera" footer state the panel already renders for a null id, so a loaded
scene reads as *"you are where the author left you, and here are their saved
views"*; (c) persist `activeCameraId` — the existing comment calls it
"intentionally ephemeral", so this would need an ADR-level reversal.

**Recommendation: (b).** One word, removes a spurious modified marker on every
scene load, changes no pose.

---

## ADR corrections — cycle 9 (paste-ready)

### ADR-0050 — asserts a getParam-order convention that 5 of 26 definitions break

Insert directly under the `# ADR-0050: …` heading:

> **Update 2026-07-28 (audit g09-modular-graph; decision unchanged):** the
> Decision section's closing claim — "The two only agree because every existing
> `NodeDefinition` author has, by convention, written `def.glsl()` to call
> `getParam('id')` in the SAME sequence as their `inputs:` array" — is FALSE as of
> this date, and the Consequences section's "UNENFORCED invariant" warning has
> already been realised. Five of the 26 registered definitions in
> `engine-gmt/data/nodes/definitions.ts` interpolate the same `getParam(...)` more
> than once, so the compiler allocates slots the packer never writes: `Scale`
> (scale ×2), `Twist` (amount ×2), `Bend` (amount ×2), `SmoothUnion` (k ×2), `Mix`
> (factor ×3). The failure mode is not only the misaligned slider this ADR
> anticipated — each surplus call shifts EVERY node compiled after it. Measured:
> dropping a `Scale` before a `Mandelbulb` makes Mandelbulb's power read 0.1
> instead of 8. Bound params are exempt (both reads return the same uniform name
> and consume no slot). The slot-parity DECISION is unchanged and still correct;
> what this update records is that the convention it rests on was never true. The
> DEV-assertion hardening recommended below remains the right fix. Live
> annotation: `@bug PRODUCTION:` on `updateModularUniforms` in
> `engine-gmt/utils/GraphCompiler.ts`.

### ADR-0051 — undercounts the synthetic-root rename sites

Insert directly under the `# ADR-0051: …` heading:

> **Update 2026-07-28 (audit g09-modular-graph; decision unchanged):** the first
> Consequences bullet is wrong in both count and scope. The synthetic root ids are
> hard-coded at EIGHT sites across THREE files, not three sites in
> `GraphCompiler.ts`, and its line numbers (20 / 65 / 132) have drifted. Current
> sites — `grep -rn "root-start\|root-end" engine-gmt/`: `utils/GraphCompiler.ts`
> ×5 (DCE seed; the `currentId !== 'root-end' && currentId !== 'root-start'`
> liveness filter, omitted by the original bullet; `varMap` pre-seed; the
> output-edge `target === 'root-end'` lookup; and the `outputEdge.source !==
> 'root-start'` guard, also omitted); `utils/graphAlg.ts` ×2 — `pipelineToGraph`
> MINTS both boundary edges with these ids, the most dangerous omission, because a
> rename that misses it produces a graph whose edges point at nothing, so DCE
> eliminates every node and the shader silently falls back to the identity body;
> and `components/panels/flow/FlowEditor.tsx` ×4. Prefer the grep over any fixed
> list. The two-synthetic-roots decision and the backward DFS walk are unchanged.

---

## Housekeeping surfaced in cycle 9

- **The modular graph has ZERO executable coverage.** Not thin — zero.
  `compileGraph`, `updateModularUniforms`, `topologicalSort`, `hasCycle` and
  `isStructureEqual` are never invoked by any npm script. Proven by falsification:
  a `throw` at the top of `compileGraph` left `test:compat` exiting 0 with
  "55 formulas OK". The whole path is pure functions with no WebGL dependency, so
  a node-only harness is cheap and is the single highest-value follow-up here.
- **`smoke:statelibrary-drop` does not cover camera capture/apply.** It seeds rows
  as `{id, label, state:{}, createdAt}` with `activeCameraId: null`, so it
  exercises the panel wiring and drag/drop contract but **not**
  `captureCameraState` / `applyCameraState` / `isCameraModified`. That is the gap
  the legacy-shape crash fell through.
- **The camera capture/apply aliasing is LIVE, not latent.** Cycle 4 called it
  latent on the generic side; on the GMT side, after a recall
  `store.sceneOffset === snap.state.sceneOffset` is literally true. It is safe
  today only because nothing mutates those objects in place — a tree-wide regex
  for in-place component writes returns zero hits. That rule is now an
  `@invariant` at the site rather than an accident.
- **`_resetAudioClipSync` has zero callers** — there are no tests for
  `audioClipSync` at all, despite its own invariant instructing tests to call it.
- **`setGraph`'s `contentChanged` branch emits CONFIG with `{pipeline}` only, no
  `graph`**, while `MaterialController.syncModularUniforms` takes
  `(pipeline, edges)` and defaults `edges` to `[]`. If `ConfigManager` does not
  retain the previous graph, that path could pack uniforms against an empty edge
  set — which changes DCE liveness and therefore slot layout. Not traced, not
  claimed; a concrete thread for whoever owns the renderer rule.

---

# Cycle 10 — final cycle

## HIGH — Reflection settings have no visible home in the app

_(cycle 10 · `engine-gmt/panels.ts:337` — observed in the browser, marked with `@bug PRODUCTION:`, fix is yours)_

The Shader panel's Reflections entry is `groupFilter: 'shading'`. The reflections
feature declares a `groups.shading` config with a label and description — but
**not one of its params carries `group: 'shading'`**. `reflectionMode`,
`bounceShadows`, `mixStrength`, `roughnessThreshold`, `steps` and
`accurateColors` are all `group: 'engine_settings'`; `enabled` is `group: 'main',
hidden: true`. `AutoFeaturePanel`'s filter is `return p.group === groupFilter`, so
the block matches nothing.

**Observed, not inferred.** Opening the Shader tab and dumping the DOM gives:
`… Rim Light 0 | Screen-space reflection tracing for glossy surfaces. | Glow
Strength 0 …` — the Reflections block contributes one sentence and zero widgets,
while every sibling (materials, atmosphere, emission, AO) renders controls
normally.

**The part that makes it high rather than cosmetic:** `engine_settings` is
consumed only by the Shader Compiler panel, which is `showIf:
'shaderCompiler.showEngineTab'` with `default: false`. So on a default boot there
is **no reachable UI for Reflection Method or its raymarch quality knobs at all**.
This looks like a leftover from the ADR-0079 Shader Compiler consolidation — same
class as the dead `shadow_quality` groupFilter this file already comments out a
hundred lines below.

**Options:** (a) make it a compilable section, mirroring how Shadows and
Volumetric Scatter are handled in this same manifest — `{ type: 'compilable', id:
'reflections', compileParam: 'enabled', compileSettingsParams: ['reflectionMode',
'bounceShadows', 'accurateColors'], runtimeGroup: 'engine_settings' }`; note
`enabled` is currently `hidden: true` and would need lifting; (b) repoint the
entry to `groupFilter: 'engine_settings'` — cheapest, but the compile-flagged
dropdowns then render with no CompileBar, exactly what the Burning Mode and
Volumetric comments in this file warn against; (c) move the user-facing params to
`group: 'shading'` and leave only dev-only ones in `engine_settings`; (d) delete
the dead entry and accept Shader-Compiler-only reflections.

**Recommendation: (a).** It matches the established pattern in this manifest,
keeps the compile gate honest, and restores a default-visible home. Which
reflection knobs belong in the Shader tab is a product call, which is why it was
marked rather than fixed.

**Two questions only you can answer:** open the app at defaults and click the
Shader tab — between **Rim Light** and **Glow Strength**, is there a Reflections
heading with controls, or just the sentence? And with the Shader Compiler tab not
enabled, is there anywhere at all to switch Reflection Method between Off /
Environment Map / Raymarched?

---

## MEDIUM — 18 real importer failures just became invisible *(and were already invisible in practice)*

_(cycle 10 · `package.json` + `.claude/rules/scene-and-formula-format.md` — fixed, but the gap it exposes is yours)_

`test:frag:integration` was **permanently red** — 236 passed / 307 failed / exit 1
— because it swept the whole 580-file `reference/Examples` tree. A guard that has
never been green cannot distinguish a regression from its own baseline, so it was
narrowed to the curated matrix and is now green.

**Narrowing a red guard to make it green is how coverage silently dies**, so a
verifier was pointed at it as a hostile question. It re-ran the sweep, bucketed
all 307 failures, and **re-read every failing file from disk**. The result
corrected the auditor's framing:

- **289 of 307 are by-design rejections** — Fragmentarium raytracer headers,
  `Progressive2D` 2D shaders, DE-less brute-raytracer files. Fine to drop.
- **18 are standalone 3D fractals with a real `float DE(vec3)` body** that die on
  GLSL parse errors. Unsupported `samplerCube`/texture uniform syntax
  (`Burningbulb.frag`, `SkyboxTest.frag`, `TriPlanarTexturing.frag`), **two parser
  null-derefs** (`Benesi/MengersmoothPolyhedra.frag`, `Kashaders/…/Simple_Kleinian-Slow-DE-02----l.frag`),
  and a cluster of Knighty / Kashaders / neozhaoliang algebraic and Kleinian
  formulas. ~5 more are probable.

That is a **genuine importer gap in the parser, not a scope question**. Every one
was already red before the change, so nothing regressed — the verdict was keep —
but the commit message and the rule doc now state the 289/18 split and tell
readers to run `npm run test:frag:integration:discover` by hand.

**Worth knowing:** two of those 18 (`MengersmoothPolyhedra`, `Simple_Kleinian…`)
are the *same files* that hit the queued V3-detector dead-end from cycle 6. They
fail in both pipelines for the same underlying reason — the parser, not the
detector.

---

## MEDIUM — The Fragmentarium catalog has drifted 17% in three months

_(cycle 10 · `public/formulas/v3-v4-catalog.json`, generated 2026-04-18)_

Re-running both pipelines over all 511 manifest entries: **87 rows (17%) disagree
with today's behaviour** in at least one column.

- **2 are hard-stale** — catalog says `pass`, pipeline hard-errors today.
  `Experimental/Knot.frag` → `provides_color` (deferred from V4);
  `kosalos/KIFS.frag` → `no_de_function`. Both confirmed by hand by a second
  agent, error *kinds* matching.
- **105 are soft** — catalog not-`pass`, parses today. Candidates only: parse
  success does not imply GPU render success, and the catalog was built from honest
  GPU snapshots.
- **21 shipped formulas are hidden behind the show-broken toggle** on
  `recommended: 'none'` rows, and **all 21 parse today**: `fractal_de44`,
  `fractal_de113`, `fractal_de114`, `fractal_de245`, `snowflake`, `prisnm`,
  `tokamak`, `rincut`, `torii`, `schwarz`, `rifs`, `swizz`, `swizz2`, `kalic`,
  `spicy`, `blocktree`, `ballFlake`, `greenDragon`, `shreddissimo`, `ripplecube`,
  `kaleidomecha`.
- **34 rows the catalog routes to V4 now parse under V3**, so auto mode imports
  them standalone — no weaving, no hybrid fold, no burning ship.

The `@invariant` on `getRecommendedPipeline` **predicted exactly this** and is
accurate. It was a warning nobody acted on for three months; this quantifies it.

**Options:** (1) regenerate the catalog — correct, but `catalog:build` was
stripped in `77f6d66a` and it needs real-GPU snapshots; (2) keep the GPU-derived
`pass` data but recompute the *parse gate* in Node and demote rows the parse
contradicts — fixes the 2 hard rows with no GPU run; (3) change the picker so
`recommended: 'none'` greys out rather than hides; (4) add a
`test:frag:catalog-drift` guard that fails when the hard-stale count exceeds 0.

**Recommendation: (4) now** — cheap, purely additive, turns a three-month silent
drift into a visible signal — **plus (3)**, since hiding 21 shipped formulas on
three-month-old data is the actual user harm. Reserve (1) for the next time a GPU
box is free. A reusable probe is at the gitignored
`debug/_g12-catalog-drift.mts` (`--list` dumps the ids); promote it to
`debug/check-catalog-drift.mts` if you take (4).

**Also measured, so you can size the cycle-6 dead-end:** exactly **3 of 511**
library entries have V3 detect failing today, all 3 catalog-recommended V4 or
none, so all 3 hit the silent dead-end in auto mode. Forcing the toggle to V4 adds
none. That bounds it.

---

## LOW — `test:frag:scan` is a report wearing a test's name

_(cycle 10 · `debug/scan-frag-parse.mts`)_

No `process.exit`, no `throw`, no assertion. It prints 124 failure lines and exits
0, unconditionally. It is nonetheless named `test:*` and **cycle 6 cited it as a
passing guard for a Tier A finding** — that finding should be read as having no
guard.

This is the **tenth** instance of the miscited-guard pattern this run, and a
stricter variant: not merely scoped wrong, but structurally incapable of failing.

**Options:** (1) rename it `report:frag:scan`; (2) add a checked-in baseline of
its three counts and exit 1 when any worsens; (3) leave it and add a
`REPORT ONLY — always exits 0, never cite as a guard` banner.

**Recommendation: (1) plus (3).** Renaming is the honest fix; the banner covers
the interim. Not applied because renaming an npm script touches every doc and
result file naming it — a cross-file rename is your call, not a mid-run edit. The
rule doc now carries the warning either way. Option (2) pairs naturally with the
catalog-drift guard above.

---

## The manifest sweep came back clean — worth saying plainly

_(cycle 10 · `engine-gmt/panels.ts`)_

A full integrity sweep resolved every string reference in the GMT panel manifest
against the live registries: **7 component ids, 11 widget/headerWidget ids, 49
feature ids, 35 param references, 40 group references, and every dotted `showIf` /
`activePredicate` path**. All resolve except the one reflections `groupFilter`
above. `getPanelManifest()` ids and `store.panels` keys match 13/13, so
`applyPanelManifest`'s merge does what its JSDoc claims.

For a declarative surface this size with no type safety on any of those strings,
one dangling reference is a good result. Recording it so a future cycle doesn't
re-derive it.

**One false positive recorded to save the next reader:** `{ feature: 'navigation',
groupFilter: 'controls' }` looks dead — no navigation *param* has that group — but
is correct. `AutoFeaturePanel` filters `customUI` entries by group too, and
navigation declares `customUI: [{ componentId: 'navigation-controls', group:
'controls' }]`. Any future validator **must union param groups with customUI
groups** or it will emit false positives.

---

## ADR correction — cycle 10 (paste-ready)

### ADR-0006 — states the wrong registry-freeze mechanism

Insert directly under the `# ADR-0006: registerFeatures as a side-effect import`
heading:

> **Update 2026-07-28 (freeze trigger corrected; decision unchanged):** The
> Decision section below says subsequent imports "trigger store construction,
> which freezes the registry". That is not the mechanism. `store/engineStore.ts`
> keeps the store lazy — `let _store: EngineStore | null = null` behind
> `ensureStore()` — and `createFeatureSlice` (the only caller of
> `featureRegistry.freeze()`) is reachable solely from `storeFactory` →
> `_makeStore()` → `ensureStore()`. So the freeze fires on the first store
> ACCESS (hook call / `getState` / `setState` / `subscribe`), not on module
> load. Importing `engineStore` is harmless: `app-gmt/registerFeatures.ts`
> imports it itself, hoisted above its own `registerGmtFeatures()` call, and
> app-gmt boots clean — if the documented mechanism were real, every boot would
> throw. Correspondingly, the first Consequences bullet describes the wrong
> failure: a direct `registerGmtFeatures()` call below the imports would not
> freeze the registry empty — it would run after some other module's first store
> access and throw `FeatureRegistryFrozenError` in dev (warn-and-no-op in prod).
> The decision — register via a side-effect import at the top of `main.tsx` — is
> unchanged and still correct: it is the only ordering that guarantees
> registration precedes any first access.

---

## Housekeeping surfaced in cycle 10

- **There is no `app-gmt/panels.ts`** — app-gmt's manifest *is*
  `engine-gmt/panels.ts`. Worth knowing before someone goes looking.
- **6 of 13 panels use the `component:` escape hatch** (graph, audio, drawing,
  shader-compiler, feedback, cameramanager) — one *more* than the "five escape
  hatches become five forks" figure the documented anti-pattern warns about. Each
  is individually justified in an adjacent comment, so no finding was filed, but
  the `items:`-is-universal invariant reads as if this weren't so.
- **Graph is `order: 1`** while every other panel is 10/20/30…, which is why it
  wins `pickActive`'s lowest-order fallback and boots as `activeLeftTab` even
  though its `showIf` is false on a default Mandelbulb boot. Harmless today
  because `Dock` clamps `activeTabId` to a visible panel; a trap if that clamp
  goes.
- **`test:frag:integration:discover` is referenced nowhere outside
  `package.json`.** The rule doc now names it, but nothing runs it. If the 18
  parser failures matter, that needs to change.
- **The registered matrix ships with one live GLSL issue** — `RecFold: undeclared
  identifier "OrbitStrength"`. Warnings don't affect the exit code.
- **`public/formulas/frag/` holds 200 `.frag` files but `manifest.json` lists
  196**, so 4 shipped frags are unreachable from the browser:
  `Claude/Mandelbulb.frag`, `Claude/Quaternion.frag`, and two neozhaoliang
  Hyperbolic-Honeycombs files.
- **The ErrorBoundary from cycle 9 has a catch.** The natural home is around
  `<AppGmt />` at the bottom of `main.tsx` — but `loadScene({ preset: bootPreset })`
  runs on the line *above* that render, so a boundary wrapping `<AppGmt />` would
  **not** catch a throw from a bad legacy preset. That pre-mount throw needs its
  own try/catch. Know this before assuming one wrapper covers it.
- **Nothing under `app-gmt/` adds to cycle 5's stub-capture blast radius** —
  checked specifically. Every app-gmt `getProxy` import resolves to the *real*
  engine-gmt proxy (a lazy singleton with no `setProxy`, so capture is safe), and
  `main.tsx`'s only module-scope call sits after `installGmtRenderer()` anyway.

---

# Owner review — 2026-07-28 (post-run)

Worked through the queue with the owner the morning after the run. Two entries
above are **corrected** rather than merely resolved — in both cases the audit's
own framing was wrong, and that matters more than the outcome.

## CORRECTED — Reflections: "no visible home" was overstated

_(closes the HIGH item in cycle 10 · `engine-gmt/panels.ts`)_

The finding claimed reflection settings have **no default-visible surface
anywhere in the app**. That is false for two of the six params.
`engine-gmt/types/viewport.ts` declares `SUBSYSTEM_REFLECTIONS` with
`controlledParams: ['reflections.reflectionMode', 'reflections.bounceShadows']`,
driving both through four **Quality-dropdown** tiers (Off / Env Map / Raymarched /
Full). Re-exposing them in a panel would let someone desync them from their tier,
which is very likely *why* they sit in `engine_settings`.

The audit only looked at the panel manifest and the feature's `group:` fields. It
never checked whether another surface already drove them. **A param can be
reachable without appearing in any panel** — that's the generalisable lesson, and
it applies to anything else `engine_settings` holds.

Of the other four, checked against source and ADR-0096 rather than memory:

- `mixStrength` (Raymarch Mix) — blends back toward the env map you already chose
  not to use. Niche.
- `roughnessThreshold` (Roughness Cutoff) — self-described as *"skip raymarching
  to save performance"*. Internal tuning.
- `steps` (Trace Steps) and `accurateColors` — genuinely user-facing, and both
  **already reachable in the Shader Compiler panel**, which the owner considers a
  fine home for advanced knobs. Worth noting `accurateColors` is more than a
  nicety: per ADR-0096 it makes reflected hits sample true trap colour instead of
  the gradient default (~600ms compile, opt-in), so reflections are *miscoloured*
  without it. Still niche enough to leave where it is.

**The proposed fix would also have been broken.** Moving only the three runtime
params fails, because all five non-mode params carry
`condition: { param: 'reflectionMode', eq: RAYMARCH }` and `reflectionMode` is one
of the compile-gated ones — they'd have landed in a panel with no way to reveal
them from there.

**Outcome: closed, no param move.** What remains is cosmetic — the dead
`groupFilter: 'shading'` entry still renders a stray group-description sentence
with nothing beneath it. A one-line deletion of the manifest item whenever
someone is passing.

## DEFERRED — Per-axis export bounds, to the v2 mesh-export integration

_(the HIGH item in cycle 8 · `mesh-export/gpu/gpu-pipeline.ts`)_

Confirmed real: `uBoundsRange` is a scalar applied to all three axes, computed as
`gridMax[0] - gridMin[0]`, so a non-cubic export box silently produces stretched
geometry.

**Not applied, and the reason is worth keeping.** It is not the one-line `float`
→ `vec3` change the finding implies. `voxelSize` derives from this uniform and is
then consumed as a **scalar** in a dozen places — SDF magnitude
(`sdf = -voxelSize * …`), contour thresholds (`absDist < voxelSize * 2`), the
Newton solve's `uVoxelSize`. Widening the uniform breaks all of them. And there is
a genuine design question underneath: with non-cubic voxels an SDF distance is
still isotropic in world space, so the threshold needs a defensible scalar (min?
mean?), not a per-axis one.

Combined with `mesh-export/` having **no runtime guard of any kind** — nothing
would catch a wrong fix — the owner's call is to handle it when the exporter is
integrated properly, since it is still a v2 prototype. Recorded as
`@bug PRODUCTION:` at the uniform declaration with the full reasoning, so whoever
picks it up does not re-derive the scope from scratch.

Verify any eventual fix by exporting a deliberately non-cubic box and measuring it
in a DCC tool — that is the only check available in this tree.

---

# Cycle 11 — a03-tutorial · gx01-gradient-explorer · t01-fluid-toy · t02-fractal-toy

Four subsystems closed; only `p01-palette-suite` remains on the worklist. 20 Tier A
commits, 0 Tier V (nothing needed the verifier step this cycle), 5 Tier B below.

## HIGH — `smoke:liquify` fails ~23% of runs on an unmodified tree

_(cycle 11 · `debug/smoke-gx-liquify-render.mts`)_

3 failures in 13 consecutive runs at HEAD, at **three different assertions** —
`[1] liquify canvas missing`, `[3] grab handle did not change the render`,
`[4] physics frame went blank`. A guard with that false-red rate cannot distinguish
a regression from its own noise, so it was not falsified: **that is the finding.**

Every green run produces byte-identical numbers (push delta 3.77, grab delta 21.03,
variety 51), so the render is deterministic and the variance is timing, not math.
The smoke uses one-shot `waitForTimeout`s before every readback and has **neither
the dep-optimize retry loop nor the Vite dual-instance detector** its sibling
`smoke-gx-geom-handles.mts` carries — and that sibling went 13/13 clean here and
goes red on a real break. `preserveDrawingBuffer` is true on both contexts, so this
is not the classic WebGL readback race.

- **(a)** Port the retry loop + dual-instance guard from `smoke-gx-geom-handles.mts`
  and replace fixed waits with polling until the signature stabilises. Cheap, and
  the sibling is a proven template.
- **(b)** Treat `[4] physics frame went blank` as a possible real liquify
  divergence and instrument before touching the smoke. The `LiquifyMesh` unit test
  asserts finiteness and boundedness over 600 frames and passes, which argues
  against a blowup but does not cover the GL display path.
- **(c)** Leave it and re-run on red.

**Recommendation: (a)**, escalating to (b) only if a hardened smoke still goes
blank. Not applied because a guard rewrite is unreviewed code and there was no way
to beat a 23% baseline statistically on a tree two other auditors were editing. The
flakiness **is** now recorded in `.claude/rules/sibling-apps.md` so a red run is not
misread as a regression in the meantime.

## MEDIUM — `check:rule-guards` has two structural blind spots, both proved by falsification

_(cycle 11 · `debug/check-rule-guards.mjs`)_

This is the run's own guard-health tooling, so it matters more than its size.

**Blind spot 1 — rule granularity.** It matches guards against a rule's **entire**
`paths:` set, so in a multi-app rule any guard touching any one app satisfies every
row. Proved by moving `npm run smoke:fluid-toy` into `sibling-apps.md`'s
*gradient-explorer* row and re-running: output **identical**, still exactly 4
issues. That rule scopes five apps and its own prose warns *"running a fluid-toy
smoke proves nothing about mesh-export"* — precisely the class it cannot see.

**Blind spot 2 — chained scripts.** It resolves an npm script by its **first**
command only. `test:palette` is sixteen `tsx` invocations joined by `&&`; citing it
produced a **false 5th issue** naming `debug/test-palette-stopfit.mts`, having never
reached `debug/test-liquify-mesh.mts` — the link that does cover the rule's files.

**Independently corroborated the same cycle, from the opposite end of the tree.**
The a03-tutorial auditor falsified `smoke:undo` against
`engine/plugins/tutorial/triggers.ts` — inverting the built-in `bool` trigger's
comparator left it fully green, 20/20 — while `check:rule-guards` reports
`engine-plugins.md` as clean. Blind spot 1, seen live. That is a **13th** instance
of the blind-guard class, and the first one the mechanical checker actively hid.

- **(a)** Split multi-app rules into one rule per app so path-granularity matches
  citation-granularity.
- **(b)** Teach the checker to parse guards per table row / per section heading.
- **(c)** Teach it to union the reachable sets of every `&&`-joined command.
- **(d)** Leave it, hand-check.

**Recommendation: (c) first** — smallest change, and it strictly removes a
false-positive class — **then (b)**, which is what actually closes blind spot 1.
Nothing in the checker was changed; only `sibling-apps.md` now states the limitation.

## MEDIUM — the only ADR-0065/0066 guard in the repo is filed under the wrong subsystem

_(cycle 11 · `debug/smoke-gx-fractal-glitch.mts`)_

`grep -rn gx-fractal-glitch .claude/rules/` returns exactly one hit:
`sibling-apps.md`'s gradient-explorer row. The citation is *defensible* — it does
boot `gradient-explorer.html` and drive `fullscreen/modes/fractalMode.tsx`. But its
**assertions are entirely deep-zoom contracts**: LA-on vs LA-off central colour
distribution, auto-reference relocation, ADR-0066 periodic-nucleus adoption.

Meanwhile `gmt-formulas-and-graph.md`, which owns deep zoom, does **not** cite it —
and the three deep-zoom smokes it *does* cite are 3 of the 4 miscitations
`check:rule-guards` reports. So the one guard that tests deep-zoom glitch-freedom is
invisible to anyone changing deep zoom.

- **(a)** Also cite it from `gmt-formulas-and-graph.md`. Additive, no risk.
- **(b)** Leave it; fix the deep-zoom rule's citations independently.

**Recommendation: (a)**, and give this smoke a **quiet tree** during the guard
sweep — it needs ~8 uninterrupted minutes. It could not be baselined this cycle:
two attempts, both killed at the third view by a Vite full-reload from concurrent
auditors. Every assertion it *reached* passed (escaping-square and stripe-square
both delta 0.000). Not applied because that rule belongs to another subsystem.

## LOW — the shared WebGL harness header documents flags its own code does not pass

_(cycle 11 · `debug/helpers/webglHarness.ts`)_

The header lists `--disable-gpu` → force SwiftShader, `--use-gl=swiftshader`,
`--enable-webgl`, `--disable-dev-shm-usage`, `--no-sandbox`. `chromium.launch()`
passes only `--disable-gpu-sandbox`, `--disable-blink-features=AutomationControlled`
and `--disable-features=IsolateOrigins,site-per-process` — and the comment
immediately above it says the **opposite** of the header (*"SwiftShader turned out
to boot far too slowly… default to hardware WebGL"*). Separately, failure-mode 1
says *"always pass `{ noWaitAfter: true }` on mouse.down/up"*; `dragPath` passes
neither.

- **(a)** Delete the stale list, keep the accurate inline comment as the single source.
- **(b)** Also add `noWaitAfter` to `dragPath` to match the documented policy — but
  that changes behaviour for every smoke that drags, and the harness is currently
  reliable.

**Recommendation: (a) only.** Untouched because it is shared debug infrastructure
outside t01/t02. Worth noting this header's authority is what put *"FLAKY —
Chromium GPU watchdog"* into fluid-toy's README, masking a guard that was simply
**red** — that half is now fixed.

## LOW — `context:cost` reports both toy subsystems' source as 0 tokens

_(cycle 11 · `plans/context-protocol/subsystems.json`)_

`npm run context:cost -- t01-fluid-toy` and `-- t02-fractal-toy` each emit a Layer 2
table with **one row** — `fluid-toy/*` (resp. `fractal-toy/*`) — costed at **0
tokens**, so the footer reads *"Cheap path is 100% of the full path"*. The tool
tells you the source is free and that you need not read it. There are 76 tracked
files in `fluid-toy/` and 14 in `fractal-toy/`; `FluidEngine.ts` alone is 2106
lines. Likely cause: `context-map.json` keys on concrete paths and the glob never
matched — which also explains the stale-map warning both invocations print.

- **(a)** Expand both entries into explicit file lists like every other subsystem.
- **(b)** Teach `context-cost.mjs` to expand globs against the map and **fail
  loudly** on a zero-cost Layer 2 rather than printing it as a result.
- **(c)** Leave it; `CODE_MAP.md` is now accurate.

**Recommendation: (b).** A zero-token "source of truth" layer is indistinguishable
from a correct answer — the same failure class as a guard that cannot fail. Not
applied: it is context-protocol tooling, and `npm run context:map` is a tree-wide
rebuild that should not run unattended.

## Three process items from this cycle

**1. `CLAUDE.md` is factually wrong and no agent may fix it.** It states sibling-app
overviews live at `docs/modules/{fluid-toy,fractal-toy,gradient-explorer,mesh-export,palette}/index.md`.
Gradient Explorer's is `app.md`; palette's is `palette-suite.md`. **2 of the 5 named
paths do not exist.** The gx01 auditor found this, verified it, and declined to
touch it because `CLAUDE.md` is steering configuration — correctly. Your call.

**2. Parallel auditors share one working tree, so `git add -A` is unsafe.** The
a03 auditor staged broadly while the gx01 auditor had unstaged edits, and swept 54
lines of `docs/modules/gradient-explorer/app.md` into commit `50d18282`
(*"audit(a03-tutorial): the runner never calls onExit…"*). No content was lost and
history was not rewritten, but that finding is mis-attributed in the log.
`PROTOCOL.md` should require every commit to stage explicit paths.

**3. Cycle 11's a03-tutorial record is reconstructed, not original.** The
orchestrator turn ended before the cycle was closed out and that auditor's return
JSON was lost. Its three Tier A findings were re-derived from commit messages that
carry their verification inline, so the *applied* work is fully documented — but any
**Tier B or Tier V findings it returned are gone.** Treat a03's non-applied surface
as uncovered. `results/a03-tutorial.json` says so in a `provenance` field.
