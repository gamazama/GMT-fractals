---
paths:
  - "engine-gmt/**"
---

# engine/ ↔ engine-gmt/ — when to shim, when to fork

Read: [`docs/policy/engine-fork-rules.md`](../../docs/policy/engine-fork-rules.md).

## The principle

**Genericize, don't fork.** When GMT needs something engine-core can't express,
extend the engine *in a way another app could also use*, then express GMT's case
through it. The `PanelManifest` `items` model is the canonical example;
`setFormulaParamResolver` and `selectMovementLock`'s feature-driven
`interactionConfig.blockCamera` are smaller ones.

Divergence between GMT and engine-gmt belongs in `engine-gmt/` — a plugin library —
not in GMT-shaped escape hatches inside engine-core.

## Dual state is design, not a bug

engine-core and engine-gmt maintaining parallel state is the intended architecture.
When a load path misbehaves, fix the load path. Don't collapse the two.

Be alert to near-identical files existing in both trees — `ConfigManager.ts`,
`ShaderBuilder.ts`, `UniformSchema.ts` and `panels.ts` all have siblings. Grep
results will show you both. `npm run orphans` (knip) does a real import-graph walk
and is the reliable way to tell which one is actually live.

## Patched slices

`modular` and `camera` are patched slices. When auditing a generic engine-core
path, check whether the app has patched it before concluding the generic path runs.

## One source of truth for shared resources

Component-class CSS, formula presets, scene fields, modulation events — one module
that injects/registers, many consumers. If you're copy-pasting a config block
across entries or apps, lift it into the engine.