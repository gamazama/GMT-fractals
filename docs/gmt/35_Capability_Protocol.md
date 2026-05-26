# Feature Capability Protocol

**Status**: P0 landed 2026-05-25 (infrastructure only; no consumers yet).
**Phased implementation**: [dev/plans/capability-protocol.md](../../plans/capability-protocol.md)
**ADR**: [0059-feature-capability-protocol.md](../adr/0059-feature-capability-protocol.md)

## Why

Before this protocol, "is feature X available given formula Y?" was answered six different ways across the codebase: shader flags consulted in `inject()`, per-option `disabledIf` predicates, master `engineConfig.toggleParam` toggles, hard-coded ID-string checks, free-text tag matches, and silent fall-throughs at compile time. Only **one** UI control (`quality.estimator` Cutting Plane option) actually grayed itself based on formula capability. Everything else either failed silently at shader-inject time or required a user to discover the incompatibility by getting a broken render.

The capability protocol gives every consumer — AutoFeaturePanel, Engine panel, CompilableFeatureSection, the future unified formula picker, the future New Scene wizard — one predicate to call: **does this feature work with the current scene?**

## Vocabulary

Closed union of 8 tokens in [`engine-gmt/types/capabilities.ts`](../../engine-gmt/types/capabilities.ts). Adding a token requires an ADR amendment.

| Token | Meaning | Declared by |
|-------|---------|-------------|
| `shape:per-iteration` | Engine owns the outer loop; formula contributes one iteration per call | Most native formulas |
| `shape:self-contained` | Formula owns its full loop (runs once + break) | `MandelTerrain`, `JuliaMorph`, V4 imports |
| `shape:modular` | Graph-compiled — capabilities determined by graph nodes | `Modular` only |
| `iter:c-constant` | Accepts Julia-style `c` override meaningfully (used or just-passed-through) | Formulas where `juliaType` is `'julia'` or `'offset'` and body reads `c` |
| `iter:shared-rotation` | Reads/writes `gmt_rotAxis`/`rotCos`/`rotSin` — needs swap during interlace | Formulas using `gmt_precalcRodrigues` |
| `estimator:cutting-plane` | Writes `cp_dmin`/`cp_scale`/`cp_trap` accumulators | 12 polyhedron formulas (Coxeter, Cuboctahedron, etc.) |
| `render:writes-trap` | Populates `result.y` for trap-mode coloring | Universal in dev — all 43 native formulas |
| `render:writes-iter` | Populates `result.z` (smoothiter) meaningfully | 41/43 (`KleinianJos`/`KleinianMobius` excepted — synthesized via custom `getDist`) |

**Exactly one `shape:*` token per formula.** Other tokens are independent: a formula may carry zero or more of them.

## Schema

### Formula side

```ts
// engine-gmt/types/fractal.ts
interface FractalDefinition {
  shader: {
    // ...existing fields...
    capabilities?: ReadonlySet<Capability>;
  };
}
```

Populated by `FractalRegistry.register()` via `deriveLegacy()` if not explicitly declared. Frozen-by-convention — downstream code mutates at its peril.

### Feature side

```ts
// engine/FeatureSystem.ts (shared with all apps)
interface FeatureDefinition {
  // ...existing fields...
  requires?: {
    primary?: string[];
    secondary?: string[];
    pair?: string[];
    rejects?: {
      primary?: string[];
      secondary?: string[];
    };
  };
}
```

Types as `string[]` because engine-core is provider-agnostic. **GMT features should use `satisfies Capability[]`** for type safety at the declaration site:

```ts
import type { Capability } from '../../types/capabilities';

export const InterlaceFeature: FeatureDefinition = {
  // ...
  requires: {
    primary: ['shape:per-iteration'] satisfies Capability[],
    secondary: ['shape:per-iteration'] satisfies Capability[],
    rejects: {
      primary: ['shape:self-contained', 'shape:modular'] satisfies Capability[],
      secondary: ['shape:self-contained', 'shape:modular'] satisfies Capability[],
    },
  },
};
```

## Reducer semantics

```ts
import { evaluateCompat } from 'engine-gmt/engine/compat';

const reports = evaluateCompat({
  primary: registry.get('Mandelbulb')!,
  secondary: registry.get('AmazingBox'),  // optional
  enabledFeatures: { interlace: true, geometry: true },
});

// reports: Array<{ featureId, status: 'ok' | 'disabled' | 'partial', reasons: string[] }>
```

**Rules:**

- `requires.primary`: **all** listed tokens must be in `primary.capabilities`
- `requires.secondary`: **all** listed tokens must be in `secondary.capabilities` (when secondary set)
- `requires.pair`: **each** listed token must be in primary OR secondary capabilities
- `rejects.primary`: feature disabled if **any** listed token IS in primary capabilities
- `rejects.secondary`: feature disabled if **any** listed token IS in secondary capabilities

**Invariants:**

- Pure function. No store imports. No memoization. Callers handle memo.
- Unknown feature ids are silently skipped (new features can register without forcing simultaneous protocol updates).
- Status is `'disabled'` if any rule fails; `'ok'` otherwise. `'partial'` is reserved for future "compiles but visual quality degraded" cases.
- Returns one report per registered feature, exhaustive (callers filter for the ones they care about).

## Examples

### Example formula declaration (post-P1)

```ts
// engine-gmt/formulas/Mandelbulb.ts
export const Mandelbulb: FractalDefinition = {
  id: 'Mandelbulb',
  // ...
  shader: {
    function: '...',
    loopBody: '...',
    capabilities: new Set([
      'shape:per-iteration',
      'iter:c-constant',
      'render:writes-trap',
      'render:writes-iter',
    ] satisfies Capability[]),
  },
};
```

### Example feature requirement (post-P2)

```ts
// engine-gmt/features/geometry/index.ts (hybrid box section)
export const GeometryFeature: FeatureDefinition = {
  id: 'geometry',
  // ...
  requires: {
    rejects: {
      primary: ['shape:self-contained', 'shape:modular'] satisfies Capability[],
    },
  },
};
```

Result: when primary is `MandelTerrain` (self-contained) or `Modular`, geometry feature reports `disabled` with reasons `['rejected by primary capability: shape:self-contained']` or `[..., 'shape:modular']`. UI displays disabled state with the reason as tooltip.

### Consumer pattern (AutoFeaturePanel, P3)

```ts
const reports = useMemo(
  () => evaluateCompat({
    primary: registry.get(primaryId)!,
    secondary: secondaryId ? registry.get(secondaryId) : undefined,
  }),
  [primaryId, secondaryId],
);

const reportById = new Map(reports.map(r => [r.featureId, r]));

for (const feat of featureRegistry.getAll()) {
  const r = reportById.get(feat.id);
  const disabled = r?.status === 'disabled';
  const tooltip = r?.reasons.join('; ');
  // render feat with disabled state + tooltip
}
```

## Migration: legacy → explicit

The shim ([`engine-gmt/engine/compat/deriveLegacy.ts`](../../engine-gmt/engine/compat/deriveLegacy.ts)) populates `capabilities` from the four legacy `shader.*` flags + Modular id:

| Legacy flag | Derived token |
|-------------|---------------|
| `def.id === 'Modular'` | `shape:modular` (skips others) |
| `shader.selfContainedSDE: true` | `shape:self-contained` |
| (default — no flag) | `shape:per-iteration` |
| `shader.usesSharedRotation: true` | `iter:shared-rotation` |
| `shader.supportsCuttingPlane: true` | `estimator:cutting-plane` |

Three tokens have NO legacy mapping — they require explicit declaration in P1: `iter:c-constant`, `render:writes-trap`, `render:writes-iter`. The classification was done in [dev/plans/capability-protocol-p1-classification.md](../../plans/capability-protocol-p1-classification.md).

## Testing

```bash
npm run test:compat         # diff against debug/compat-snapshot.jsonl
npm run test:compat:write   # regenerate snapshot
```

The harness:
1. Runs **structural checks** per formula — `shader.function`/`loopBody` non-empty (except Modular), `capabilities` populated, exactly one `shape:*` token, `parameters` is an array. Any failure exits non-zero with a per-formula diagnostic.
2. Invokes `evaluateCompat` for each formula as primary (no secondary, all features considered enabled), filters to `status !== 'ok'` rows, and serializes them as JSONL sorted by `(formulaId, featureId)`.
3. Diffs against the committed snapshot. Exits non-zero on drift, showing the first 5 differing lines.

**Snapshot scope is intentionally narrow for P0**: per-formula without secondary. P2 (when features start declaring `requires`) and P4 (interlace dropdown fix) extend it.

**No shader compile check**: real shader-compile coverage requires WebGL infrastructure (the queued port of stable's `test:baseline`/`test:hybrid`/`test:interlace` harnesses). The structural check is a cheap proxy — catches missing shader fields and malformed capability declarations.

## Open / future

- **Per-pair snapshot** (P4 or later): extend the harness to snapshot `(primary, secondary)` matrix for interlace cases.
- **Shader-compile regression net**: port of stable's headless harnesses. Tracked separately from this protocol.
- **`tabConfig.condition`**: existing but unused field on `FeatureTabConfig` (engine/FeatureSystem.ts:159). P8 either wires it via `evaluateCompat` or removes it.
- **Sunsetting legacy flags**: P8 removes `shader.{selfContainedSDE, usesSharedRotation, supportsCuttingPlane}` from `FractalDefinition` once all consumers read from `capabilities`. GMF format stash also pivots to capability set.

## See also

- [dev/plans/capability-protocol.md](../../plans/capability-protocol.md) — 8-phase implementation spec
- [dev/plans/capability-protocol-p1-classification.md](../../plans/capability-protocol-p1-classification.md) — per-formula classification of the three new tokens
- [dev/plans/capability-protocol-latent-fixes.md](../../plans/capability-protocol-latent-fixes.md) — pre-P0 latent issue fixes
- [ADR-0059](../adr/0059-feature-capability-protocol.md) — decision record
- `docs/research/v4-rethink-prompt.md` — context on why V3 imports silently corrupt
