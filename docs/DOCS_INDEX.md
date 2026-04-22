# gmt-engine Documentation — Master Index

## What this is

**gmt-engine** is a generic application engine extracted from GMT. It provides the plumbing — DDFS, animation, UI primitives, save/load, shortcuts, undo, plugin seams — on top of which apps build their domain (fractals, fluids, whatever's next). The engine ships **one tiny core** plus a set of **opt-in core plugins**; apps install what they need.

These docs are **forward-looking and authoritative** for the engine itself. Legacy GMT docs (file numbers 10–44) are preserved as reference but do not describe the engine's current commitments — they describe GMT's fractal-specific systems.

## Documentation layout

```
docs/
├── DOCS_INDEX.md                       ← you are here
│
├── 01_Architecture.md                  FOUNDATION — core + plugins + apps model
├── 02_Feature_Registry.md              defineFeature, isolation, lifecycle
├── 03_Plugin_Contract.md               three-step add-on contract, boot order
├── 04_Core_Plugins.md                  the six plugins that ship with the engine
├── 05_Shared_UI.md                     pure primitives, opt-in context pattern
├── 06_Undo_Transactions.md             unified transaction stack + scopes
├── 07_Shortcuts.md                     registry, scopes, priority resolution
├── 08_Animation.md                     auto-binding, BinderRegistry, track types
├── 09_Bridges_and_Derived.md           intra-feature coordination
├── 10_Viewport.md                      size modes, DPR, interaction, adaptive quality
│
├── 20_Fragility_Audit.md               known issues + remediation status
│
├── (10–44 GMT-era reference — not authoritative)
│   10_Shader_Architecture_Refactor.md  (in archive/)
│   21_Frag_Importer_Current_Status.md
│   22_Frag_to_Native_Formula_Conversion.md
│   …
│
└── archive/, research/, specs/         GMT-era technical notes
```

## Stability markers

Each architecture doc (01–09, 20) opens with a stability marker:

- 🔒 **Stable** — API committed; breaking changes only with major version.
- 🚧 **Evolving** — shape likely but details under active design.
- ⚠️ **Fragile** — known issues (see `20_Fragility_Audit.md`); consult before depending.
- 🧪 **Experimental** — proof-of-concept, not yet committed.

## Engine-scope table of contents

### Foundation
| # | File | Status | Scope |
|---|---|---|---|
| 01 | [Architecture](01_Architecture.md) | 🚧 | Core + plugins + apps model; engine boundaries; render-loop ownership |
| 02 | [Feature Registry](02_Feature_Registry.md) | 🚧 | `defineFeature`, isolation via `dependsOn`, lifecycle hooks, auto-derivation |
| 03 | [Plugin Contract](03_Plugin_Contract.md) | 🚧 | Three-step add-on: `registerFeatures.ts` → store → `setup.ts`; freeze semantics |
| 04 | [Core Plugins](04_Core_Plugins.md) | 🚧 | shortcuts, undo, scene-io, screenshot, topbar, animation, camera — overview |

### Subsystems
| # | File | Status | Scope |
|---|---|---|---|
| 05 | [Shared UI](05_Shared_UI.md) | 🚧 | Pure primitives; `AnimationContext` / `UndoContext` / `ShortcutContext` opt-in; AdvancedGradientEditor as shared |
| 06 | [Undo & Transactions](06_Undo_Transactions.md) | 🚧 | Unified stack; `'param'` / `'camera'` / `'animation'` / `'ui'` scopes; debounce groups |
| 07 | [Shortcuts](07_Shortcuts.md) | 🚧 | Registry, scope stack, priority, text-input guard, rebinding |
| 08 | [Animation](08_Animation.md) | 🚧 | Every DDFS param auto-animatable; BinderRegistry for non-DDFS; interpolators by type |
| 09 | [Bridges & Derived](09_Bridges_and_Derived.md) | 🚧 | Explicit intra-feature coordination; `derive()` and `bridge()` APIs |
| 10 | [Viewport](10_Viewport.md) | 🚧 | Size modes, DPR, interaction state, FPS probe, adaptive quality; canvas-slot abstraction |

### Audit & Migration
| # | File | Status | Scope |
|---|---|---|---|
| 20 | [Fragility Audit](20_Fragility_Audit.md) | 🔒 | Known issues found in 2026-04-22 audit; status of each fix |

## Reading paths

### New contributor
1. [01_Architecture.md](01_Architecture.md) — understand the three tiers.
2. [02_Feature_Registry.md](02_Feature_Registry.md) — the core primitive.
3. [03_Plugin_Contract.md](03_Plugin_Contract.md) — how apps plug in.
4. `demo/README.md` — walk through a real three-file add-on.

### Adding a feature
1. [02_Feature_Registry.md](02_Feature_Registry.md) — `defineFeature` shape.
2. [08_Animation.md](08_Animation.md) — how your params become animatable.
3. [09_Bridges_and_Derived.md](09_Bridges_and_Derived.md) — if your feature talks to another.
4. [05_Shared_UI.md](05_Shared_UI.md) — only if the auto-panel isn't enough.

### Authoring a core plugin
1. [01_Architecture.md](01_Architecture.md) — core-plugin tier.
2. [04_Core_Plugins.md](04_Core_Plugins.md) — existing plugins as shape reference.
3. [03_Plugin_Contract.md](03_Plugin_Contract.md) — registration/boot contract.

### Porting an app onto the engine
1. [01_Architecture.md](01_Architecture.md) — what the engine provides.
2. [04_Core_Plugins.md](04_Core_Plugins.md) — which plugins to install.
3. [03_Plugin_Contract.md](03_Plugin_Contract.md) — boot order.
4. [20_Fragility_Audit.md](20_Fragility_Audit.md) — sharp edges to avoid.

### Debugging
1. [20_Fragility_Audit.md](20_Fragility_Audit.md) — check if you've hit a known issue first.
2. Relevant subsystem doc (06–09) — read its "Known fragilities" section.

## GMT-era reference (legacy)

The GMT fractal explorer's documentation is preserved under its original numbering for historical context and as reference for the GMT port (when that lands on the engine). These docs describe GMT's domain, not the engine's architecture:

- `10–20` — GMT rendering, shader architecture refactor (in `archive/`)
- `21–27` — Fragmentarium importer, formula dev, shader test harness
- `30, 43, 44` — Mesh export, bucket render, preview region
- `archive/`, `research/`, `specs/` — GMT design notes

**Treat these as "what GMT does today," not "what the engine requires."** Many patterns documented there (raymarching, SDF, formula interlace) will become GMT-plugin concerns when we port, not engine concerns.

## Documentation style

### Conventions
- File paths in backticks: `engine/FeatureSystem.ts`
- Line references: `FeatureSystem.ts:236`
- **Rule:** prefix for normative guidance
- **Why:** explanation immediately after
- **Decision** blocks at the bottom of each architecture doc: what/when/alternatives/rationale
- Stability marker in every doc's H1

### When to add a doc
- New subsystem or core plugin → new numbered doc.
- New primitive or pattern within existing subsystem → section in existing doc.
- Bug fix with non-obvious root cause → note in `20_Fragility_Audit.md`.
- Design decision (even rejected) → "Decisions" section of the relevant doc.

### When to delete a doc
- Don't. Move to `archive/` with a one-line "why archived" at the top. Keeps history discoverable.

---

*Engine fork point: GMT 0.9.2 (commit ece5c84). Last doc overhaul: 2026-04-22.*
