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
