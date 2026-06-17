# ADR-0059: Feature compatibility as a closed capability vocabulary + pure reducer

**Date:** 2026-05-25
**Status:** Accepted (P0 landed; P1–P8 phased over ~2 weeks per dev/plans/capability-protocol.md)
**Scope:** `engine-gmt/types/capabilities.ts` (new), `engine-gmt/engine/compat/` (new), `engine-gmt/types/fractal.ts` (`shader.capabilities`), `engine/FeatureSystem.ts` (`FeatureDefinition.requires`), `engine-gmt/engine/FractalRegistry.ts` (decoration), `debug/test-compat.mts` (new harness).

## Context

GMT has ~14 features and 43 native formulas (plus ~360 Workshop-imported and Modular). Feature/formula compatibility was expressed in five ad-hoc ways before this protocol:

1. **Shader capability flags** on `FractalDefinition.shader` (`selfContainedSDE`, `usesSharedRotation`, `supportsCuttingPlane`) — descriptive, no consumer contract.
2. **`engineConfig.toggleParam`** master enables — user can turn off, not formula-gated.
3. **Free-text `tags`** — search only, never compat-checked.
4. **Single `disabledIf` predicate** (one site, `quality.estimator` Cutting Plane option) — the only UI control that actually grays based on formula.
5. **Hard-coded ID strings in feature `inject()` bodies** — the substantive compat logic; silent at injection time.

The audit ([dev/plans/capability-protocol.md](../../plans/capability-protocol.md)) cataloged the failure modes: Workshop V3 imports silently corrupt when feature-injected (no `selfContainedSDE` flag); Modular silently mis-composes with hybrid box and burning ship; interlace dropdown filters Modular but not self-contained formulas; the cutting-plane "pair propagation" check is duplicated across two files with no enforcement of parity. Six different visibility patterns govern UI gating with no shared predicate.

We need ONE declarative vocabulary that formulas opt into and features opt into, plus ONE pure function consumed by every gating site (AutoFeaturePanel, Engine panel, the unified formula picker, the New Scene wizard).

## Decision

Introduce a **closed `Capability` vocabulary** (8 string tokens) declared on formulas via `shader.capabilities: ReadonlySet<Capability>`, and a **per-feature `requires` declaration** matched against scene capabilities by a single pure reducer `evaluateCompat(scene): CompatReport[]`.

**Capability tokens (closed; addition requires ADR amendment):**

- `shape:per-iteration` — engine owns the outer loop
- `shape:self-contained` — formula owns its loop (runs once + break)
- `shape:modular` — graph-compiled (Modular)
- `iter:c-constant` — accepts Julia-style `c` override meaningfully
- `iter:shared-rotation` — reads/writes `gmt_rotAxis`/`rotCos`/`rotSin`
- `estimator:cutting-plane` — writes `cp_dmin`/`cp_scale`/`cp_trap`
- `render:writes-trap` — populates `result.y` for trap-mode coloring
- `render:writes-iter` — populates `result.z` (smoothiter) meaningfully

**Feature requirements schema:**

```ts
requires?: {
  primary?: string[];               // ALL must be in primary.capabilities
  secondary?: string[];             // ALL must be in secondary.capabilities
  pair?: string[];                  // each must be in primary OR secondary
  rejects?: {
    primary?: string[];             // any match → disabled
    secondary?: string[];           // any match → disabled
  };
}
```

Types live in the **shared** `FeatureDefinition` as `string[]` (engine-core is provider-agnostic). GMT features use `[...] satisfies Capability[]` at declaration sites for type safety.

**Reducer:**

```ts
evaluateCompat({
  primary: FractalDefinition,
  secondary?: FractalDefinition,
  enabledFeatures?: Record<string, boolean>,
}): CompatReport[]
```

Returns one `{ featureId, status, reasons }` per registered feature. Pure function — no store imports, no memoization, no caching. Callers handle memo if they want it.

**Backward-compatibility shim (`deriveLegacy`):** `FractalRegistry.register()` populates `def.shader.capabilities` from the four legacy `shader.*` flags + Modular id when not explicitly declared. Lets P0 land without touching all 43 formula files. P1 migrates natives to explicit declarations; P5/P6 cover V4/V3 import emitters; P8 removes the shim.

**Snapshot harness (`test:compat`):** Node-only (no WebGL). Iterates every formula, runs structural checks (shader fields present, exactly one shape token, parameters is array), invokes `evaluateCompat` (no secondary), snapshots disabled rows to `debug/compat-snapshot.jsonl`. Diff-on-CI; `--write` to regenerate. Cheap regression net — does NOT compile shaders (real shader-compile coverage is the queued port of stable's `test:baseline`/`test:hybrid`/`test:interlace`).

## Consequences

**Positive:**
- Single source of truth for "is feature X available given formula Y (and Z)?". Six visibility patterns collapse to one predicate over time.
- The reducer is the contract: adding a new compat rule means editing one feature's `requires` declaration. No more grepping for `formula === 'Modular'` special-cases.
- Test harness catches regressions: adding a new shape token without classifying existing formulas, or removing a `rejects` rule that was load-bearing, both surface as snapshot drift.
- Workshop imports become first-class compat citizens (P5/P6): V4 emitters tag `shape:self-contained`, V3 emitters either tag `shape:per-iteration` or fall through to `shape:self-contained` for the full-DE fallback codepath. Closes the silent-corruption class flagged in `docs/research/v4-rethink-prompt.md`.

**Negative / risks:**
- Closed vocabulary requires ADR discipline. Adding a 9th token without thinking through how every formula maps to it is a regression vector. Mitigation: snapshot harness forces an explicit re-classification.
- Shared `FeatureDefinition.requires` types as `string[]`, losing type safety at the schema boundary. GMT mitigates via `satisfies Capability[]` at declaration sites; other apps using `engine/` (fractal-toy, fluid-toy) ignore the field.
- The legacy shim is a soft dependency: between P0 and P8, capability sets for non-migrated formulas are derived rather than declared. The classification work was done in `dev/plans/capability-protocol-p1-classification.md` — implementer of P1 is bound by it.

## Alternatives considered

1. **Capability tags only on formulas, no requirements declaration on features.** Features grep capabilities ad-hoc in `inject()`. Pro: less ceremony. Con: doesn't fix the UI-gating gap — the whole point is making compat predicates accessible to consumers other than `inject()`.
2. **Per-formula allow/deny lists for each feature.** 14 features × 43 formulas = 602 entries to maintain, plus 360 Workshop imports. Brittle, doesn't compose with interlace pairs.
3. **Runtime compile probe** (try compiling, catch errors). Too late for a wizard (user already committed). Useful as a backstop, not as primary check.
4. **Open `Capability = string` with feature-side enums.** Loses cross-formula consistency. Two features can declare semantically equivalent tokens under different names.

## Migration path

Phases per [dev/plans/capability-protocol.md](../../plans/capability-protocol.md):

- **P0 (this ADR landing)**: vocabulary, reducer, shim, harness. Pure addition. No consumer changes.
- **P1**: native formulas declare explicit `capabilities`. Uses the classification at [dev/plans/capability-protocol-p1-classification.md](../../plans/capability-protocol-p1-classification.md).
- **P2**: Modular explicit + feature `requires` declarations (geometry, interlace).
- **P3**: AutoFeaturePanel + Engine panel + CompilableFeatureSection consume `evaluateCompat`.
- **P4**: interlace dropdown filters via protocol (closes the bug where self-contained formulas appear).
- **P5/P6**: V4/V3 Workshop emitters declare capabilities.
- **P7**: CP mirror collapse via `pairHasCapability` (collapses the inline two-file MIRROR comment in `SDFShaderBuilder.ts` ↔ `core_math.ts`).
- **P8** (COMPLETE): `deriveLegacy` shim deleted; `shader.capabilities` is REQUIRED; `FractalRegistry.register()` throws if missing; legacy `shader.*` flags marked `@deprecated`; GMF round-trip stashes capabilities directly with backward-compat inline fallback for pre-P0 files.

## See also

- [dev/plans/capability-protocol.md](../../plans/capability-protocol.md) — phased implementation spec
- [dev/plans/capability-protocol-p1-classification.md](../../plans/capability-protocol-p1-classification.md) — per-formula capability classification
- [dev/plans/capability-protocol-latent-fixes.md](../../plans/capability-protocol-latent-fixes.md) — pre-P0 latent issue fixes
- [dev/docs/gmt/35_Capability_Protocol.md](../gmt/35_Capability_Protocol.md) — reference doc (vocabulary, examples, semantics)
- [ADR-0048](./0048-formula-type-literal-union-vs-registry.md) — FormulaType / registry drift
