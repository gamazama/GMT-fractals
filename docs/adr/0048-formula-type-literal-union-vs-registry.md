# ADR-0048: FormulaType is a literal union; registry is the truth (drift contract)

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/types/common.ts`, `engine-gmt/engine/FractalRegistry.ts`, `engine-gmt/formulas/index.ts`

## Context

GMT formulas have a string `id` that doubles as: (a) the formula's identity
in `FractalRegistry`, (b) the type-level discriminator used by code that
narrows behaviour by formula (e.g. `if (formula === 'Modular')` in
`engine-gmt/features/core_math.ts:157`), (c) the GMF save format's
`metadata.id` field, (d) the legacy share-URL token.

Two needs are in tension:

- **Type narrowing wants a literal union** — `formula === 'Modular'` should
  type-check, and adding a new formula should require an explicit update
  somewhere visible.
- **Runtime registration is open** — the Workshop V3 importer registers
  new formulas at runtime (`FormulaWorkshop.tsx:837-838`), and a
  `FormulaType = string` would lose all narrowing across the codebase.

The current state has drift:

- **Aliases are missing from the union.** `engine-gmt/formulas/index.ts:107-111`
  registers 5 legacy aliases (`UberMenger`, `FoldingBrot`, `HyperTorus`,
  `HyperbolicMandelbrot`, `RhombicIcosahedron`) for backward compatibility
  with wild-saved scenes. None appear in `FormulaType`. Code holding a
  `FormulaType` cannot type-represent these IDs.
- **Filename vs id drift.** `engine-gmt/formulas/PseudoKleinianAdv.ts`
  exports a const named `PseudoKleinian06`, imported as such, and the
  `FormulaType` union lists `'PseudoKleinian06'`. Three independent names;
  renaming requires touching all three plus optionally an alias.
- **The cast `as FormulaType[]`** at `engine-gmt/engine/FractalRegistry.ts:30`
  hides this. `registry.register(def)` accepts any `FractalDefinition`,
  `getIds()` widens via cast, and runtime-registered formulas (V3 imports)
  flow through silently.

The parent project's stable branch has separately adopted `FormulaType = string`
(opaque tag). The fork has not.

## Decision

Keep `FormulaType` as the hand-maintained literal union for the engine-gmt
fork. Drift is acknowledged and contained by the `as FormulaType[]` cast at
the registry boundary. The five legacy aliases are accepted as runtime-only
strings; new code that needs to round-trip aliases (e.g. GMF load) must
accept `string` and check membership at runtime.

Three remediation options are recorded in followup `plans/doc-audit-state/survey/_followups/q-102.md`
for future consideration:

1. Drop the union — adopt `FormulaType = string` (parent project's path).
2. Auto-generate the union from `formulas/index.ts` at build time.
3. Keep the union, add a `RegisteredFormulaId = FormulaType | LegacyAliasId`
   wider type for code that touches aliases.

This ADR records the current decision (option 0: status quo) and the drift
contract.

## Consequences

- New formulas added to `engine-gmt/formulas/` MUST be added to the
  `FormulaType` union in `engine-gmt/types/common.ts` explicitly. Forgetting
  causes the `as FormulaType[]` cast to silently widen — no compile error,
  no test failure.
- Workshop V3 imports flow through the cast without union update. Their IDs
  exist at runtime only; code that does `formula === 'MyImportedFormula'`
  doesn't type-check.
- Aliases cannot be type-represented as `FormulaType`. New code that needs
  to round-trip alias IDs (e.g. GMF parse → migration logic → registry
  lookup) must accept `string` and runtime-check.
- Removing a legacy alias requires verification against wild-saved scenes
  (gmt-0.8.5 PNGs, exported GMF files). The five active aliases are listed
  in `engine-gmt/formulas/index.ts:107-111` for grep.
- `registry.register` is silent on replacement — re-registering the same id
  silently overwrites the prior definition. This is load-bearing for the
  Workshop's Preview/Import flow (PREVIEW_ID is re-registered on every
  Preview) but means accidental id collisions silently shadow.
