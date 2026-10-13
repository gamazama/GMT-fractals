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

- **`app-gmt` does not import this tree at all.** `gradient-explorer` and `fluid-toy`
  reach all 12 files via `engine/fractal/DeepZoomController.ts` and
  `FractalColorRenderer.ts`; app-gmt gets its fractal path from `engine-gmt/`. A guard that
  boots app-gmt can never fail on a change here.
- **fluid-toy carries its own partial fork.** `fluid-toy/deepZoom/` (dd, laRuntime,
  diagnostics, benchmark) and `fluid-toy/fluid/DeepZoomController.ts` are sibling copies,
  not re-exports. A fix here does NOT propagate to them.
- **Real-axis fixtures hide conjugation errors.** A reference orbit at `centerY: 0` is real
  for every iterate, so `z2im` in `stepLA` / `compositeLA` is identically zero and every
  imaginary-part sign error is unreachable. A test here needs an off-axis centre.
- **A tolerance can absorb a real regression.** Prefer the exact-equality unit checks in
  `smoke:deep-zoom-la` case D to widening a tolerance.
- **WebGL2 has no `frexp` / `ldexp`.** Use `log2` / `exp2` workarounds.
- **The ~1e-30 wall is the double-double view centre**, not the iteration math. Do not go
  looking for the limit in `HighPrecComplex.ts`.
- **The LA stage tree can collapse silently.** `trimUnsafeStages` drops every stage whose
  coefficients leave f32 range, and on total failure sets `valid = false` with empty
  `stages` / `las` (the worker falls back to plain perturbation). "Table valid" does not
  notice the acceleration structure disappearing; a stage-count floor does.

## Guards

```
npm run smoke:deep-zoom-orbit     # computeReferenceOrbit + HighPrecComplex:
                                  # known orbits, precision selection, power=3, Julia
npm run smoke:deep-zoom-la        # LA construction vs direct perturbed iteration,
                                  # plus exact-equality stepLA/compositeLA unit checks
npm run smoke:deep-zoom-nucleus   # detectPeriod / newtonNucleus against published
                                  # nuclei, and the zoom gate that engages them
npm run smoke:gx-fractal-glitch   # browser (dev server on :3400); boots gradient-explorer.html,
                                  # reaches all 12 files here, and is the only guard asserting
                                  # ADR-0065/0066 glitch-freedom end-to-end
```

The first three are node-only, ~0.7 s each. `smoke:gx-fractal-glitch` takes ~17 minutes and
needs a QUIET tree: a Vite full reload mid-run kills it with "Execution context was
destroyed". Its Δ comparison is relative, so a green Δ alone proves little — `relocated`,
`period` and `maxDominant` are what carry a run.
