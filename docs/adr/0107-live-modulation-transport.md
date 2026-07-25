# ADR-0107 — Modulation offsets ride RENDER_TICK, and one resolver owns target routing

**Date:** 2026-07-25
**Status:** Accepted
**Supersedes:** —
**Related:** ADR-0103 (live-session state survives scene load), ADR-0106 (modulation bands in Hz)

## Context

Modulation offsets reach the shader by more than one route, and only one of
them was actually connected in the live viewport.

`AnimationSystem.tick` resolves every modulated target and dispatches it down a
seven-branch chain. Most branches emit a uniform (`FRACTAL_EVENTS.UNIFORM`),
which the worker applies directly. Three branches cannot: geometry
pre/post/world rotation, camera position/rotation, and the light array are
consumed by `UniformManager.syncFrame`, which composes them into rotation
matrices and packed arrays rather than reading a per-param uniform. Those three
wrote their offsets into `WorkerProxy.modulations`, a public dict on the
main-thread proxy.

`UniformManager` runs **inside the worker**. `RENDER_TICK` carried no
`modulations` field, and the only assignment to a worker-side
`engine.modulations` was in `WorkerExporter` — fed by `EXPORT_RENDER_FRAME`.
The renderer is worker-only (no main-thread `FractalEngine`), so the dict was
written every frame on the main thread and read by nobody.

The result: **geometry rotation, camera and lighting modulated correctly in a
render export and did nothing in the live preview.** The split is what made it
read as flakiness rather than as a wiring bug — the params were reachable, the
sliders moved (`liveModulations` is written by every branch), and an export
proved it "worked".

Two things kept it invisible for so long:

1. `engine/worker/WorkerProxy.ts` documented the transport as if it existed —
   "the real worker reads it on `sendRenderTick`". It did not.
2. Nothing could tell the difference between "this target reaches the GPU" and
   "this target updates a slider". `ParameterSelector` decided what to offer
   from its own private `isModulatable`, entirely independent of the branch
   chain that had to route it. The two disagreed in both directions:
   `lighting.light<i>_rotX` was read by `UniformManager` but never produced by
   any branch, while `falloff` was applied by the branch but never offered.

A third transport also existed unnamed: `optics.camFov` and `optics.orthoScale`
are read by the worker straight off the `optics` block inside `renderState`, so
a link on them updated `liveModulations` and nothing else.

## Decision

**1. `RENDER_TICK` carries `modulations`.** `WorkerProxy.sendRenderTick`
includes its own `this.modulations` on every tick, and the worker replaces
`engine.modulations` wholesale before `syncFrame` reads it. This fulfils the
invariant the JSDoc already claimed, and makes the live path and the export path
resolve these targets identically — the property that matters for a tool whose
output is supposed to match its preview.

Shipped on *every* tick including when empty. Sending only when non-empty would
leave a target that stopped being modulated frozen at its last offset, since
nothing else clears the worker's copy — the same drop-out hazard
`setOwnedUniforms` already guards for uniform names.

**2. `AnimationSystem` resolves the proxy per tick, never at module scope.**
`const engine = getProxy()` at module scope raced `setProxy()`: whichever module
evaluated first won, and if AnimationSystem did, every write landed on an
orphaned stub. The documented invariant ("must run before any caller has
captured a reference") was a footgun with no enforcement; resolving inside the
tick makes capture order irrelevant.

**3. One resolver owns target routing.** `engine/features/modulation/targetRouting.ts`
holds both halves of the question — `isModulatable` (what the picker offers) and
`classifyModulationTarget` (which branch handles it, and which sink it reaches).
`AnimationSystem.tick` dispatches on `routing.branch` rather than re-testing
prefixes, so the resolver cannot describe a routing the tick doesn't take.

Four sinks are named, and naming the third is part of the decision:

| Sink | Reaches the shader via |
|---|---|
| `uniform` | `FRACTAL_EVENTS.UNIFORM` → worker uniform write |
| `engine-mods` | `engine.modulations` → `UniformManager.syncFrame` |
| `render-state` | a feature slice merged with `applyLiveMod` into `renderState` |
| `display-only` | nothing — updates `liveModulations` only |

`optics` joins `render-state` by having `applyLiveMod` folded in where
`renderState` is built, which is what makes `camFov` / `orthoScale` live.

**4. A coverage gate.** `debug/test-modulation-coverage.mts` enumerates every
offered target, classifies it through the same resolver, prints the matrix, and
fails on any `none` or `display-only` sink. Wired into `npm run test:gate`.

## Consequences

- Rotation, camera and lighting modulation work in the live viewport. Live
  preview now matches render export for every target.
- `optics.camFov` and `optics.orthoScale` modulate — FOV pumping is available
  as an effect rather than a dead menu entry.
- Light `falloff` and `rotX/Y/Z` are offered; `LIGHT_PROPS` is the single list
  the branch, the picker and the gate all read.
- Adding a modulation sink now means adding a `ModulationSink` variant and
  teaching the resolver, or the gate fails. That is the intended cost — it is
  exactly the step that was skipped before.
- `RENDER_TICK` grew a small per-frame structured clone (a handful of numeric
  keys; `{}` in the common case). Measured against the alternative — a whole
  class of modulation targets being silently inert — this is not a real cost.
- **Known residue, deliberate:** once the cleanup pass drains
  `activeTargetsRef`, the tick early-outs *before* resetting the dict, so a
  removed target can leave a zeroed key behind. Harmless (every consumer reads
  `modulations[k] || 0`) and pinned by assertion [7] so it isn't "fixed" by
  adding work to the hot early-out path.
- `RENDER_STATE_MERGED_FEATURES` is a claim the gate trusts. Listing a feature
  whose slice ships raw would mark dead targets healthy — the one place in this
  design where the gate can be lied to.
