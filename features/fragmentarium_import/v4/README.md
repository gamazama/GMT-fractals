# V4 Frag/DEC Importer Pipeline

Canonical plan: [docs/26_Formula_Workshop_V4_Plan.md](../../../docs/26_Formula_Workshop_V4_Plan.md) §12

See [docs/26b_Fragmentarium_Spec.md](../../../docs/26b_Fragmentarium_Spec.md) for the `.frag` format reference.

## Why V4

V3 extracts per-iteration loop bodies from foreign formulas and wraps them in GMT's outer loop. That transformation is the source of ~86% of V3's measured failures (see [docs/21 §V4 Verification Baseline](../../../docs/21_Frag_Importer_Current_Status.md#v4-verification-baseline)).

V4 instead emits every import as a **self-contained SDE** — pass the DE function through nearly verbatim, wrap with a coloring-pack adapter, set `selfContainedSDE: true`, done. The engine already supports this pattern natively (`JuliaMorph`, `MandelTerrain`).

## Pipeline

```
source (.frag/.dec/.glsl)
    │
    ├── ingest/       → RawSource           (format + render-model detection)
    ├── preprocess/   → PreprocessedSource  (#include resolve, annotation strip, preset extract)
    ├── analyze/      → FormulaAnalysis     (AST: DE + helpers + globals + params)
    └── emit/         → GeneratedFormula    (FractalDefinition with selfContainedSDE: true)
```

## Public API

```typescript
import { processFormula } from 'features/fragmentarium_import/v4';

const result = processFormula(fragSource, 'MyFormula.frag');
if (result.ok) {
    registry.register(result.value.definition);
    // … plus REGISTER_FORMULA event for the worker
}
```

## Implementation status

| Sub-phase | State | Artifact |
|---|---|---|
| B.-1 widen worker protocol | ✓ done | [engine/FractalEvents.ts](../../../engine/FractalEvents.ts), WorkerProtocol.ts, WorkerProxy.ts |
| B.0 scaffolding | ✓ done | this directory |
| B.1 ingest | pending | `ingest/` |
| B.2 preprocess | pending | `preprocess/` |
| B.3 analyze | pending | `analyze/` |
| B.4 emit | pending | `emit/` |
| B.5 integration entry point | pending | wire into `FormulaWorkshop.tsx` behind `useV4Pipeline` dev toggle |
| B.6 engine helper | pending | `shaders/chunks/frag-pack.ts` + auto-trap in `shaders/chunks/de.ts` |
| B.7 harness route | pending | `debug/v4-verify.mts --pipeline=v4` |
| B.8 parameter-aware verification | pending | preset Default honoured by harness |
| B.9 bakeoff prep | pending | `debug/v4-bakeoff.mts` |

## Non-goals for V4

- Interlace/hybrid-fold/burning-ship support for imports (architecturally incompatible with self-contained SDEs per [docs/25 §3.3a](../../../docs/25_Formula_Dev_Reference.md)).
- `providesColor`/`providesBackground` formulas (deferred).
- Texture imports (`sampler2D file[…]`).
- Buffer/multi-pass shaders.
- Retiring the `FormulaType` union (unnecessary churn).
