---
source: fluid-toy/main.tsx
lines: 288
last_verified_sha: 19b2425a1311b8be66692962180929d4d08b4987
additional_sources:
  - fluid-toy/README.md
audited: 2026-05-20T16:00:00Z
audited_by: claude-opus-4-7
public_api: []
depends_on:
  - e01-feature-system
  - e02-tick-registry
  - e03-animation
---

# fluid-toy — overview

Sibling app: real-time 2D fluid simulation using the same engine as GMT, with brush-driven pointer interaction and deep-zoom. Demonstrates "engine as library" — reuses ~9 engine subsystems (TickRegistry, AnimationEngine, FeatureSystem, panels, save/load, etc.) and adds a fluid-simulation domain on top.

## Where to start

| If you're touching... | Read |
|---|---|
| Anything in `fluid-toy/` | `fluid-toy/README.md` first |
| Boot order / engine wiring | JSDoc on `fluid-toy/main.tsx` + `FluidToyApp.tsx` |
| The fluid simulation itself | `fluid-toy/features/fluidSim.ts` + `fluid-toy/CODE_MAP.md` |
| Brush / pointer interactions | `fluid-toy/gestures/*` |
| Deep-zoom precision | `fluid-toy/features/deepZoom/*` |
| Engine fork rules (when adding code that touches both fluid-toy and engine) | [`docs/policy/engine-fork-rules.md`](../../policy/engine-fork-rules.md) |

## Architecture (1-line summary)

`main.tsx` registers fluid-toy features + cross-tree handles → `FluidToyApp.tsx` mounts the engine shell + fluid-specific panels → engine plugins (`RenderLoopDriver`, etc.) drive per-frame ticks → `features/fluidSim.ts` advances the GPU sim each frame via TickRegistry.

## Historical context

The full file catalog (80 files across feature/shader/store/UI/preset/component subtrees) is archived at [`docs/audit-2026-05-20/archive/sibling-apps/fluid-toy-catalog.md`](../../audit-2026-05-20/archive/sibling-apps/fluid-toy-catalog.md) — useful when navigating the codebase but heavy. The README + `CODE_MAP.md` (in the sibling-app root) are the canonical onboarding entry points per the audit's `keep-as-is` disposition for `fluid-toy/README.md`.

Cross-cutting decisions affecting fluid-toy (see ADR descriptions):
- ADR-0046 — unified-coordinate camera + treadmill absorb (also used here for deep-zoom precision)
- ADRs 0007-0014 — DDFS contract (fluid-toy authors features via the same `defineFeature` API)
- ADR-0034 / 0035 — worker contract (fluid-toy runs its sim on the main thread today; see deep-zoom for the partial worker boundary)
