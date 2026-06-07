# ADR-0064: Fix the LA→PO reference-index handoff in the deep-zoom kernel

**Status:** Accepted
**Date:** 2026-06-07
**Affects:** `engine/fractal/shaders/fractalKernel.ts` (shared by fluid-toy + the
Gradient Explorer live-fractal mode)

## Context

The deep-zoom fractal kernel renders with perturbation theory: one high-precision
reference orbit at the view centre, and each pixel iterates a small perturbation
`dz` against `orbit[ref]`. To go fast, a **Linear-Approximation (LA)** merge tree
skips many reference iterations per step; pixels then hand off to the per-iteration
**perturbation (PO)** loop for the remainder.

A **"square tile"** artifact appeared at certain locations/zooms — a block of wrong
("unrelated") colour in the centre of the screen. The square shape was the tell:
LA only applies to pixels inside an **L∞ (Chebyshev) validity region**
(`max(|dc.x|, |dc.y|) <= threshold`), which is an axis-aligned **square** centred on
the reference. Pixels inside used LA; pixels outside used pure PO. So the square was
the LA-accelerated region rendering differently from the PO surround.

**Root cause:** the LA→PO hand-off computed the orbit reference index as
`ref = iter % uRefOrbitLen`. That is wrong after any **rebase**: a rebase resets the
reference to `orbit[0]` (the pixel orbit came back near zero) but leaves `iter`
counting the *global* iteration total. So after a rebase, `iter % len` no longer
equals the true reference position, and the PO loop continued against a mis-aligned
`orbit[ref]` → a coherent block of wrong pixels (only inside the LA square).

Confirmed against the project's reference renderer **FractalShark**
(`refSoftware/FractalShark/FractalSharkGpuLib/LAKernel.cuh`): it threads a tracked
`RefIteration` from the LA walk straight into the perturbation loop
(`workspace{ Perturb, RefIteration }`, `++RefIteration`), never re-deriving it from
the global iteration count.

## Decision

Track the orbit reference index **through** the LA walk, exactly parallel to how the
PO loop already tracks it (PO does `ref++` per step and `ref = 0` on rebase):

- On each LA step: `ref += la.StepLength` (alongside `iter += la.StepLength`). Our LA
  nodes are variable-step (a merge-tree compression), so we accumulate `StepLength`
  rather than FractalShark's per-iteration `++`, but the invariant is the same —
  `dz_pert` is the perturbation relative to `orbit[ref]`.
- On rebase (`dz_pert = z; j = 0`): also `ref = 0`.
- At hand-off: use the tracked `ref` (clamped to `uRefOrbitLen - 1`) instead of
  `iter % len`.

Stage-fail descent (`j = NextStageLAIndex`) leaves `ref` unchanged — the finer stage
resumes at the same orbit position. Escaped pixels skip PO, so the hand-off is moot
for them.

## Consequences

- The LA-accelerated centre pixels now share the PO surround's reference alignment —
  the square artifact is removed. **The fix is in the shared kernel, so fluid-toy's
  deep zoom benefits identically** (the same artifact existed there — it was a
  pre-existing bug).
- Pure-correctness change: no new state, no perf cost (one extra `ref += StepLength`
  per LA node). The PO path and the shallow/non-LA paths are untouched.
- **Verification:** tsc 0; GX deep smoke (`smoke-gx-fractal-deepzoom`) still resolves
  structure at 1e-9 (216 colours, unchanged at the seahorse view — that view had no
  rebase divergence); `smoke:deep-zoom-orbit`/`-la` (algorithmic) and `smoke:fluid-toy`
  green. The smokes cannot prove the *square* is gone (that needs the specific
  problem view) — **requires visual confirmation** on GX and a glance at fluid-toy
  deep zoom.

> **Superseded 2026-06-07 by [ADR-0065](0065-deep-zoom-auto-reference-glitch-fix.md):**
> the residual glitch + ⚡ LA toggle described below were the stop-gap. ADR-0065
> fixes both residual artifacts at the source (auto non-escaping reference for the
> escaping-orbit square; LA/AT gated off for per-iteration colour modes) and
> **removes the toggle** — LA now stays on and correct.

## Update 2026-06-07 — residual LA glitch + user toggle (superseded by ADR-0065)

The handoff fix above removed the common case, but a **residual** wrong-coloured
square can still appear at views where the **reference orbit escapes early**
(e.g. centre escapes at iter 588 while the view contains interior/minibrot
structure needing more). There the LA tables built from the short, escaped orbit
are an unreliable accelerator for the interior pixels — a genuinely hard
perturbation-glitch problem that serious renderers solve with glitch detection +
secondary references (FractalShark devotes a subsystem to it; it does **not**
combine stripe coloring with LA at all).

Rather than ship a risky partial glitch-detector into the shared kernel, the
Gradient Explorer exposes an **"⚡ LA" toggle** (default on = fast). Turning it
off renders the view with pure perturbation (no iteration-skipping) — slower but
glitch-free. Confirmed by screenshot: at the reported view, LA-off renders the
centre correctly. The per-pixel cap is the orbit length even when `iterMul`
pushes higher (PO rebases against the orbit fine), so `uMaxIter > orbitLen` is
**not** a separate defect — LA is the sole cause.

(Headless verification is limited: the CI Chromium uses a software GPU at
~1 frame/3s, too slow to converge a deep view, so the LA-on/off visual diff was
confirmed on real hardware / via direct-state checks, not a smoke assertion.)

## See also

- `engine/fractal/shaders/fractalKernel.ts` — the LA pre-pass + PO loop (the fix
  sites carry `@see docs/adr/0064`).
- `refSoftware/FractalShark/FractalSharkGpuLib/LAKernel.cuh` — reference RefIteration
  threading.
- ADR-0063 — the fractal-coloring engine carve (this kernel's home).
