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
