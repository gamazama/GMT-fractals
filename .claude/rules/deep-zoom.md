---
paths:
  - "engine/fractal/deepZoom/**"
---

# Deep zoom — reference orbit, LA tables, nucleus

Read first: JSDoc on `engine/fractal/deepZoom/referenceOrbit.ts` (precision
selection, auto-reference search, the nucleus gate), `laBuilder.ts` (two-pass LA
tree, `trimUnsafeStages`), `LAInfoDeep.ts` (the `stepLA` / `compositeLA` math
contract) and `nucleus.ts` (`detectPeriod` / `newtonNucleus`).

Decisions: ADR-0065 (auto-reference glitch fix — the colour/grey-square cases),
ADR-0066 (minibrot-nucleus reference).

## Watch out

- **`app-gmt` does not import this tree at all.** Measured against the checker's
  own reachability: the app-gmt entry graph reaches 0 of the 12 files here, while
  `gradient-explorer` and `fluid-toy` reach all 12, via
  `engine/fractal/DeepZoomController.ts` and `FractalColorRenderer.ts`. app-gmt
  gets its fractal path from `engine-gmt/` instead. So any guard that boots
  app-gmt — `smoke:engine-gmt` above all — can never fail on a change here, and
  citing one would read as coverage while providing none.
- **fluid-toy carries its own partial fork.** `fluid-toy/deepZoom/` (dd,
  laRuntime, diagnostics, benchmark) and `fluid-toy/fluid/DeepZoomController.ts`
  are sibling copies, not re-exports. A fix here does NOT propagate to them.
  Grep both trees before assuming a change is global.
- **Real-axis fixtures hide conjugation errors.** A reference orbit at
  `centerY: 0` is real for every iterate, so `z2im` in `stepLA`/`compositeLA` is
  identically zero and every imaginary-part sign error is unreachable. Measured:
  0 of 500 iters carry a nonzero `Z.im` at `c=(-0.75, 0)` versus 499 of 500 at
  the period-3 complex nucleus. Any new test here needs at least one off-axis
  centre; `smoke:deep-zoom-la` case B runs both for exactly this reason.
- **A tolerance can absorb a real regression.** Flipping the sign of the
  imaginary term in `stepLA`'s ZCoeff update moves that smoke's max relative
  error from 2.49e-4 to 6.83e-4 — a genuine 2.7x signal that its 1e-3 bound still
  swallowed. The exact-equality unit checks in `smoke:deep-zoom-la` case D exist
  to catch that class; prefer them to widening a tolerance.
- **WebGL2 has no `frexp` / `ldexp`.** Use `log2` / `exp2` workarounds — this
  bites every time someone ports precision code from a CPU reference.
- **The ~1e-30 wall is the double-double view centre**, not the iteration math.
  Do not go looking for the limit in `HighPrecComplex.ts`.
- **The LA stage tree can collapse silently.** `trimUnsafeStages` drops every
  stage whose coefficients leave f32 range, and on total failure sets
  `valid = false` with empty `stages`/`las`. That is a legitimate runtime
  outcome (the worker falls back to plain perturbation), so a test asserting
  only "table valid" will not notice the acceleration structure disappearing.
  Assert a stage-count floor.

## Guards

```
npm run smoke:deep-zoom-orbit     # computeReferenceOrbit + HighPrecComplex:
                                  # known orbits, precision selection, power=3, Julia
npm run smoke:deep-zoom-la        # LA construction vs direct perturbed iteration,
                                  # plus exact-equality stepLA/compositeLA unit checks
npm run smoke:deep-zoom-nucleus   # detectPeriod / newtonNucleus against published
                                  # nuclei, and the zoom gate that engages them
npm run smoke:gx-fractal-glitch   # browser (needs the dev server on :3400); boots
                                  # gradient-explorer.html, reaches all 12 files here,
                                  # and is the only guard asserting ADR-0065/0066
                                  # glitch-freedom end-to-end
```

The first three are node-only and pure CPU — no browser, no dev server, ~0.7 s
each. There is no reason not to run all three on any change in this directory.

All three were falsified in the cycle-13 guard sweep (each one broken, watched go
red, reverted).

**`smoke:gx-fractal-glitch` is the slow one and the only one that renders.**
~17 minutes, needs `npm run dev` on :3400 and a QUIET tree — a Vite full reload
mid-run kills it with "Execution context was destroyed", which is what blocked
it from ever completing in cycles 11 and 12. Its reach to this directory was
proven in batch 5, but a sentence here used to claim its assertions had been
falsified under `sibling-apps.md`. **That was not true of either rule** — it had
never had a green baseline at all. Batch 8 got the first one on 2026-07-29 and
then falsified it properly, which immediately found a defect:

- Its Δ comparison is RELATIVE (LA-on dominant vs LA-off dominant), so anything
  that affects both captures cancels. Forcing the display shader to a constant
  colour — a blank render — gave Δ 0.000 on all three views and **exit 0 with
  the full "glitch-free" banner**. And reproducing bug 1 exactly (invert the
  auto-reference gate, grep `disableAutoReference`; orbitLen falls to 588) drove
  the escaping-square dominant from 0.019 to 0.500 while Δ reached only 0.099 —
  under the 0.18 bound. Only the `relocated` assertion caught that one.
- Repaired additively with a per-view absolute `maxDominant` ceiling checked
  before the negative assertions. Both breaks now red at view 1 inside a minute.

So when reading a green run here: `relocated`, `period` and `maxDominant` are
what carry it. A green Δ on its own proves very little.
