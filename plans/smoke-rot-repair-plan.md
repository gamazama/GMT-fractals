# Smoke-Rot Repair Plan

Follow-up to [smoke-suite-triage.md](smoke-suite-triage.md). The triage found 10 of 39
smokes red — all **smoke-rot** (suite not maintained through refactors), plus the
non-asserting `smoke-orbit`. This plans their repair so they can be re-added to a
trustworthy `smoke:all`.

**Guiding rule:** repoint stale smokes to the new API (don't delete a smoke that
still covers a live feature); CUT smokes whose feature is genuinely gone; and for the
3 "suspected bug" smokes, **verify in-app first** — a real regression must not be
hidden by quietly editing the smoke to match broken behavior.

## Root-cause clusters (verified against source)

### Cluster 1 — fluid-toy: OrbitFeature retired → folded into CouplingFeature
`registerFeatures.ts:73`: "OrbitFeature retired — orbitEnabled/Radius/Speed moved onto
CouplingFeature." State is now `coupling.orbitEnabled` (set via `setCoupling({orbitEnabled})`);
migration `moveField('orbit.enabled','coupling.orbitEnabled')` (`fluid-toy/migrations.ts:63`).
`setOrbit` removed (0 source files).
- **smoke-anim-orbit** — calls `s.setOrbit(...)` → repoint to `setCoupling({orbitEnabled})` / the coupling orbit params.
- **smoke-fluid-presets** — probes `orbitEnabled` at the old (coupling-flat) location → repoint to `coupling.orbitEnabled`.
- **smoke-migrations** — expects `coupling_orbitEnabled` (flat key) → align with the actual migrated shape (`coupling.orbitEnabled`).

### Cluster 2 — fluid-toy: 2D scene-camera API refactor
**smoke-camera** (loads `fluid-toy.html`) calls `s.setSceneCamera({center,zoom})` + reads
`s.sceneCamera`, `s.cameraSlots`, `saveSlot`/recall. `setSceneCamera` is gone (0 files).
- **Action:** find fluid-toy's current 2D-camera setter + state shape (likely on a camera/view slice), repoint the smoke. **RECON NEEDED** — exact replacement not yet identified.

### Cluster 3 — demo app restructure
`demo.html` is still a vite entry ("minimal churn") but there's no `demo` store slice.
- **smoke-interact** (loads root `/`) — expects `s.demo` slice with a `.size` param → demo slice gone. Repoint to the demo's new state shape, OR retarget to a real app, OR CUT.
- **smoke-engine-demo**, **smoke-engine-demo-modulation** — orphans (no package.json script), expect the old demo overlay / animation-panel wiring → **CUT** unless the demo app is still a maintained surface.

### Cluster 4 — verify-in-app (suspected real bug behind a stale smoke)
- **smoke-fluid-toy** — `loadPreset` drops `cp_rad` (0.12→0). Likely the coupling-radius key was renamed in the same refactor, **but** confirm fluid-toy preset save/load actually round-trips the coupling radius before editing the smoke.
- **smoke-canvas-pan-zoom** — `wheel did not change zoom (still undefined)`. Confirm wheel-zoom works in-app; likely a renamed probe, possibly a real regression.
- **smoke-particle-bounce** — `bounce path never fired`. Confirm fluid-toy particle bounce still fires.

### Cluster 5 — non-asserting diagnostic
- **smoke-orbit** — references `window.__r3fCamera`/`__getOrbitTarget` (exist nowhere) + has no assertions. Rewrite to assert via `__gmtProxy` (sceneOffset/accumulation), or CUT.

## Per-smoke table

| Smoke | Cluster | Fix approach | Effort | Risk |
|---|---|---|---|---|
| smoke-anim-orbit | 1 | repoint `setOrbit` → `setCoupling({orbitEnabled})` | S | low |
| smoke-fluid-presets | 1 | repoint probe → `coupling.orbitEnabled` | S | low |
| smoke-migrations | 1 | align expectation w/ migrated `coupling.orbitEnabled` | S | low |
| smoke-camera | 2 | recon fluid-toy 2D-camera API, then repoint | M | med (API unknown) |
| smoke-interact | 3 | repoint to demo's new shape / retarget / cut | M | med (needs demo decision) |
| smoke-engine-demo | 3 | CUT (or rewrite) — orphan | S | low |
| smoke-engine-demo-modulation | 3 | CUT (or rewrite) — orphan | S | low |
| smoke-fluid-toy | 4 | **verify cp_rad round-trip in-app**, then repoint or file bug | M | med (maybe real bug) |
| smoke-canvas-pan-zoom | 4 | **verify wheel-zoom in-app**, then repoint or file bug | M | med |
| smoke-particle-bounce | 4 | **verify bounce in-app**, then repoint or file bug | M | med |
| smoke-orbit | 5 | rewrite to assert via `__gmtProxy`, or CUT | S | low |

## Phased execution (proposed)

- **Phase 0 — recon + in-app verify (gated, do first).** Read each smoke; nail Cluster-2 camera + Cluster-3 demo replacements; **verify the Cluster-4 trio in-app** (server up, manual/probe) to split real-bug vs stale. Output: a confirmed repoint/cut/file-bug decision per smoke. *No edits yet.*
- **Phase 1 — Cluster 1 (orbit→coupling), 3 smokes.** Cheapest + biggest win; mechanical repoint. Re-verify each green, re-add to `smoke:all`.
- **Phase 2 — Cluster 2 (fluid-toy camera).** Repoint smoke-camera once the new API is known.
- **Phase 3 — Cluster 3 (demo).** CUT the two orphans (pending the demo-app decision below); fix or cut smoke-interact.
- **Phase 4 — Cluster 4 (suspected bugs).** Fix any real regression found in Phase 0; otherwise repoint. File separate bug entries for genuine regressions.
- **Phase 5 — Cluster 5 + finalize.** Rewrite/cut smoke-orbit; re-add every repaired smoke to `smoke:all`; reconcile package.json (add scripts for kept orphans, or delete the cut files); run `smoke:all` green end-to-end.

## Open decisions (owner)
1. **Is the demo app (`demo.html`) still a maintained surface for v1?** If no → CUT smoke-interact + the two engine-demo orphans (3 smokes gone, fast). If yes → repoint them (more work).
2. **Is fluid-toy a v1 priority?** Most of the rot is fluid-toy (clusters 1, 2, 4 = 6 of 10 smokes). If fluid-toy is a lower-priority sibling, these can defer; if it's v1, Phase 1/2/4 move up.
3. **Real-bug appetite:** if Phase 0 finds the Cluster-4 trio are genuine regressions (not stale), do we fix them now or just file + skip the smokes for v1?

## Verification protocol (every repaired smoke)
Start `npm run dev` (`:3400`), run the smoke, confirm it asserts + passes; re-add to
`smoke:all`; finish with a green end-to-end `npm run smoke:all`. (Don't append `echo "$?"`
to a backgrounded run — masks the exit; see `feedback_bash_background_windows`.)

## UPDATE — end-to-end `smoke:all` run exposed in-chain flakiness

Running the rebuilt `smoke:all` as a chain FAILED at `smoke-picker-search-kb`
(27th of 28) — green in isolation, red in-chain. Root cause: a fixed
`waitForTimeout(1200)` before counting catalog thumbnail `<img>`s; the thumbnails
load async, and under chain load (26 smokes prior) 1200ms is too short → 0
thumbnails → FAIL. **The feature works; the smoke checks too early.** Not an app bug.

**Implication:** "28 green individually" ≠ "reliably green in-chain." `smoke:all`
is NOT yet a trustworthy gate — ≥1 flaky member, and possibly more (the chain
stopped at #27, so #28 `workshop-state` is untested-in-chain, and others that
passed this run could flake under different load).

### Cluster 6 — flaky fixed-timeout waits (smoke-quality, not app bugs)
| Smoke | Issue | Fix |
|---|---|---|
| smoke-picker-search-kb | fixed `waitForTimeout(1200)` before counting async-loaded thumbnails | `waitForFunction(() => imgs >= 1, {timeout})` |
| (audit) others using `waitForTimeout` before async/DOM assertions | potential same class | grep `waitForTimeout` across the 28; convert load-bearing waits to `waitForFunction` |

**Path to a reliable `smoke:all`:**
- **A. Harden + iterate:** fix picker-search-kb’s wait, re-run `smoke:all`, fix the next flake it surfaces, repeat until green end-to-end. Most robust; iterative (~8 min/round).
- **B. Curate subset:** drop picker-search-kb (+ any further flakies) from `smoke:all` (still runnable individually) for a fast reliable gate now; harden the dropped ones as a follow-up.
