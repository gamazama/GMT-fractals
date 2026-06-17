# Shader Testing Suite (dev)

Headless WebGL2 regression harness for the engine's native-formula
shader path. Boots the real `ShaderFactory` in tsx + Node, compiles
every native formula in Playwright Chromium, and gates on
`webglCompile`.

Ported from `stable/debug/` on 2026-05-26. Mirrors stable's doc 27
but uses dev's `engine-gmt/` module layout.

## Why this suite exists

Dev's only pre-existing native-formula gate was the cheap structural
check in `debug/test-compat.mts`. It catches *capability-protocol*
breakage (an `import`/symbol path going missing) but doesn't actually
hand a generated shader to a WebGL2 compiler. That left two broad
regression classes uncovered:

- **GLSL syntax / linker breakage** from engine-feature edits
  (rename a uniform, add a preamble, swap a built-in). The compat
  test passes; one formula's main fragment shader still won't link.
- **Cross-formula combinatorics** — the interlace rewriter splices
  primary + secondary formulas into one shader. A namespace
  collision on a single pair (Mandelbulb × KaliBox, for example) is
  invisible until somebody picks that pair in the UI.

Stable runs these as `test:baseline / test:hybrid / test:hybrid-adv
/ test:interlace`; dev now does too.

## What the suite covers

| Script | Cases | Gate | Wall time |
|---|---|---|---|
| `test:baseline` | 43 formulas, all features at defaults | `webglCompile` | ~3s |
| `test:hybrid` | 43 formulas × hybrid box (standard fold) | `webglCompile` | ~3s |
| `test:hybrid-adv` | 43 formulas × hybrid box (interleaved) | `webglCompile` | ~3s |
| `test:interlace` | 41 × 41 = 1681 native-formula pairs | `webglCompile` | ~7-8 min |
| `test:shader` | all four, sequential | — | ~8 min |

Counts at port time (2026-05-26): 44-formula registry minus `Modular`
(separate pipeline) = 43 cases for the config sweep. Interlace also
drops the two `selfContainedSDE` formulas (`JuliaMorph`,
`MandelTerrain`), giving 41 eligible × 41 = 1681 pairs.

The suite gates on `webglCompile` only — render-σ / NaN-fraction
data is recorded as a diagnostic but does not flip pass/fail. This
matches stable's gating and lines up with the existing project rule:
*harnesses gate on webglCompile only* (auto-memory
`feedback_shader_testing_gates`).

## Commands

```bash
npm run test:baseline       # baseline (all features off)
npm run test:hybrid          # hybrid box, standard
npm run test:hybrid-adv      # hybrid box, interleaved
npm run test:interlace       # full N×N interlace sweep
npm run test:shader          # all four, sequential
```

Ad-hoc usage:

```bash
# Single formula, fast triage
npx tsx debug/native-config-sweep.mts --mode=hybrid --formula=Mandelbulb

# One interlace pair
npx tsx debug/native-interlace-sweep.mts --pair=Mandelbulb,KaliBox

# All pairs primary=X
npx tsx debug/native-interlace-sweep.mts --primary=KaliBox

# Watch the browser
npx tsx debug/native-config-sweep.mts --mode=baseline --show --verbose
```

Each script supports `--fresh` (wipe jsonl) and otherwise resumes
from `debug/native-*-sweep.jsonl`. Pass `--timeout=NNNN` (ms) to
extend the per-case ceiling (default 15 s).

## Architecture

```
debug/native-config-sweep.mts   ──┐
debug/native-interlace-sweep.mts ─┤── tsx loads Node-side ShaderFactory
                                  │   from engine-gmt/, generates the
                                  │   full fragment shader, swaps out
                                  │   the engine's `void main()` for a
                                  │   self-contained DE-slice (config
                                  │   sweep) or sphere-trace (interlace
                                  │   sweep) preview main, and posts it
                                  │   to the validator page via
                                  │   `page.evaluate(runValidation)`.
                                  ▼
debug/validator.html  ─────────── single WebGL2 canvas, fixed
                                  passthrough vertex shader, fragment
                                  compile+link → toDataURL thumbnail +
                                  σ-channel readback.
```

Module-side imports (the part that diverges from stable):

```ts
import { registerFeatures } from '../engine-gmt/features/index.ts';
registerFeatures();
import '../engine-gmt/formulas/index.ts';   // side-effect

import { registry }                from '../engine-gmt/engine/FractalRegistry.ts';
import { ShaderFactory }           from '../engine-gmt/engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults.ts';
```

Stable imports from `../engine/...` and `../features/...`; dev's
engine + feature definitions live under `engine-gmt/`.

## Eligibility

| Filter | Excludes | Why |
|---|---|---|
| config sweep | `Modular` | Separate shader pipeline (NodeRegistry) — not exercised by ShaderFactory's fragment path. |
| interlace sweep | `Modular` + `shader.selfContainedSDE` | Interlace bails on these at the rewriter; running them would be a no-op pass. |

## Output

- `debug/native-config-sweep.jsonl` — one row per (formula, mode)
- `debug/native-interlace-sweep.jsonl` — one row per (primary, secondary)
- `debug/thumbnails/config/<sha1>.png` — preview thumbnails (slice grid)
- `debug/thumbnails/interlace/<sha1>.png` — preview thumbnails (sphere trace)

Each jsonl row carries `webglCompile`, `renderSigma`,
`renderNanFraction`, `overall`, `failFirstGate`, and `timeMs`.

## When to run

| Change | Run |
|---|---|
| New formula or formula edit | `test:baseline` (+ `test:interlace` if it can be a secondary) |
| Engine feature uniform rename / preamble change | `test:shader` |
| Hybrid box / geometry rewrite | `test:hybrid` + `test:hybrid-adv` |
| Interlace rewriter, `preambleVars`, feature uniform decls | `test:interlace` |
| Before pushing engine changes | `test:shader` |

## Known limitations

- **σ varies, but gating is compile-only.** The preview main shaders
  produce thumbnails that often have low σ because the engine's
  `map()` depends on runtime state the validator doesn't supply
  (camera, lighting, light spheres, etc.). That's not a bug; render
  data is diagnostic, not a gate.
- **Browser recycle every 120 cases.** Long interlace runs recycle
  the Playwright page to keep the WebGL2 context healthy. SIGINT
  finishes the current case cleanly before exiting.
- **Pairs sweep is sequential.** ~265 ms / pair × 1681 pairs ≈ 7-8
  min on a typical dev box. Splitting across multiple Chromium
  contexts is doable but hasn't been needed yet.

## Related

- `debug/test-compat.mts` (`npm run test:compat`) — structural
  capability-protocol check, gates against missing FractalDefinition
  imports; runs in <100 ms. Pair with this suite for full coverage.
- `docs/gmt/24_Formula_Interlace_System.md` — interlace rewriter +
  `preambleVars` contract.
- `docs/gmt/27_Shader_Testing_Suite.md` — historical (Workshop V4)
  validation harness; superseded for native-formula coverage by the
  scripts above.
