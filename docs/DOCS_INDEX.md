# gmt-engine Documentation — Master Index

## What this is

**gmt-engine** is a generic application engine extracted from GMT. It provides the plumbing — DDFS, animation, UI primitives, save/load, shortcuts, undo, plugin seams, HUD — on top of which apps build their domain (fractals, fluids, whatever's next). The engine ships **one tiny core** plus a set of **opt-in core plugins**; apps install what they need.

These docs are split into **engine** (authoritative, forward-looking) and **gmt** (legacy GMT-era reference, preserved for the eventual GMT-onto-engine port).

## Layout

```
docs/
├── DOCS_INDEX.md                  ← you are here
├── FEATURE_STATUS.md              engine snapshot (what works / what's missing)
├── CHANGELOG_DEV.md               running dev log
│
├── engine/                        ← engine docs — authoritative
│   ├── 01_Architecture.md
│   ├── 02_Feature_Registry.md
│   ├── 03_Plugin_Contract.md
│   ├── 04_Core_Plugins.md
│   ├── 05_Shared_UI.md
│   ├── 06_Undo_Transactions.md
│   ├── 07_Shortcuts.md
│   ├── 08_Animation.md
│   ├── 09_Bridges_and_Derived.md
│   ├── 10_Viewport.md
│   ├── 11_Plugin_Authoring.md     how to build a new core plugin
│   ├── 12_App_Handles.md          typed cross-tree state pattern
│   ├── 13_Extracting_From_GMT.md  cookbook for lifting GMT features into engine-core
│   └── 20_Fragility_Audit.md
│
├── gmt/                           ← legacy GMT docs — reference only
│   ├── 01_System_Architecture.md  engine-bridge pattern (pre-extraction)
│   ├── 02_Rendering_Internals.md  raymarching, SDF, path tracing
│   ├── 03_Modular_System.md       modular graph builder, node-to-GLSL
│   ├── 04_Animation_Engine.md     (pre-engine-port version)
│   ├── 05_Data_and_Export.md      GMF format, presets, video export
│   ├── 06_Troubleshooting_and_Quirks.md
│   ├── 07_Code_Health.md          GMT technical debt tracker
│   ├── 08_File_Structure.md       GMT codebase layout (pre-extraction)
│   ├── 21–27_*.md                 formula / frag importer / shader tests
│   ├── 30_Mesh_Export_Prototype.md
│   ├── 43_Bucket_Render_Overhaul.md
│   └── 44_Preview_Region_Plan.md
│
├── archive/                       truly retired design notes
├── research/                      open investigations
└── specs/                         spec-ish deep dives
```

## Stability markers

Each engine architecture doc opens with a marker:

- 🔒 **Stable** — API committed; breaking changes only with major version.
- 🚧 **Evolving** — shape likely but details under active design.
- ⚠️ **Fragile** — known issues (see `engine/20_Fragility_Audit.md`); consult before depending.
- 🧪 **Experimental** — proof-of-concept, not yet committed.

## Engine docs — table of contents

### Foundation
| # | File | Status | Scope |
|---|---|---|---|
| 01 | [Architecture](engine/01_Architecture.md) | 🚧 | Core + plugins + apps model; engine boundaries; render-loop ownership |
| 02 | [Feature Registry](engine/02_Feature_Registry.md) | 🚧 | `defineFeature`, isolation via `dependsOn`, lifecycle hooks, auto-derivation |
| 03 | [Plugin Contract](engine/03_Plugin_Contract.md) | 🚧 | Three-step add-on: `registerFeatures.ts` → store → `setup.ts`; freeze semantics |
| 04 | [Core Plugins](engine/04_Core_Plugins.md) | 🚧 | viewport, topbar, scene-io, render-loop, shortcuts, undo, camera, animation, menu, hud, help — 11 shipped |

### Subsystems
| # | File | Status | Scope |
|---|---|---|---|
| 05 | [Shared UI](engine/05_Shared_UI.md) | 🚧 | Pure primitives; `AnimationContext` / `UndoContext` / `ShortcutContext` opt-in |
| 06 | [Undo & Transactions](engine/06_Undo_Transactions.md) | 🚧 | Unified stack; scopes; debounce groups |
| 07 | [Shortcuts](engine/07_Shortcuts.md) | 🚧 | Registry, scope stack, priority, text-input guard, rebinding |
| 08 | [Animation](engine/08_Animation.md) | 🚧 | DDFS param auto-animation; BinderRegistry; interpolators by type |
| 09 | [Bridges & Derived](engine/09_Bridges_and_Derived.md) | 🚧 | Explicit intra-feature coordination; `derive()` / `bridge()` |
| 10 | [Viewport](engine/10_Viewport.md) | 🚧 | Size modes, DPR, interaction state, FPS probe, adaptive quality |

### Authoring & App Patterns
| # | File | Status | Scope |
|---|---|---|---|
| 11 | [Plugin Authoring](engine/11_Plugin_Authoring.md) | 🚧 | How to build a new core plugin — the four-part shape, seven rules |
| 12 | [App Handles](engine/12_App_Handles.md) | 🚧 | Typed cross-tree state (`defineAppHandles<T>`) for apps |
| 13 | [Extracting From GMT](engine/13_Extracting_From_GMT.md) | ✅ | Cookbook for lifting GMT features into engine-core — triage + worked example (TSAA + pause button) |
| 14 | [Panel Manifest](engine/14_Panel_Manifest.md) | 🚧 | How `panels.ts` declares which features compose into which panels |
| 15 | [Camera Manager Extraction](engine/15_Camera_Manager_Extraction.md) | 🚧 | StateLibrary primitive — how cameras/views/palettes share one mechanism |
| 16 | [Type Augmentation](engine/16_Type_Augmentation.md) | 🔒 | DDFS slices + state-library keys — the two-target declaration-merge rule |

### Audit
| # | File | Status | Scope |
|---|---|---|---|
| 20 | [Fragility Audit](engine/20_Fragility_Audit.md) | 🔒 | Known issues + remediation status |
| 21 | [Code Review 2026-04-25](engine/21_Code_Review_2026-04-25.md) | 🔒 | Independent multi-agent survey: what matches docs, what's overstated, 3 live bugs, onboarding gaps |
| — | [Feature Status](FEATURE_STATUS.md) | 🔒 | Post-phase-5 snapshot across engine + apps |

## Apps — per-app onboarding

Each app folder owns a README that's the canonical entry point for "I'm
about to work on this app":

| App | README | What it covers |
|---|---|---|
| `fluid-toy` | [fluid-toy/README.md](../fluid-toy/README.md) | File map, "how to add a feature" recipe, deliberate-weirdness gotchas, smoke commands |
| `demo` | [demo/README.md](../demo/README.md) | Minimal three-file plugin contract walkthrough |
| `app-gmt` | (no dedicated README — GMT-on-engine port is documented in `HANDOFF.md` and the `gmt/` doc tree) | — |

## Reading paths

### New contributor
1. [engine/01_Architecture.md](engine/01_Architecture.md) — three-tier model.
2. [engine/02_Feature_Registry.md](engine/02_Feature_Registry.md) — the core primitive.
3. [engine/03_Plugin_Contract.md](engine/03_Plugin_Contract.md) — how apps plug in.
4. `demo/README.md` — a real three-file add-on walkthrough.

### Adding a feature
1. [engine/02_Feature_Registry.md](engine/02_Feature_Registry.md) — `defineFeature` shape.
2. [engine/08_Animation.md](engine/08_Animation.md) — how your params become animatable.
3. [engine/09_Bridges_and_Derived.md](engine/09_Bridges_and_Derived.md) — if your feature talks to another.

### Authoring a core plugin
1. [engine/11_Plugin_Authoring.md](engine/11_Plugin_Authoring.md) — the pattern + seven rules.
2. [engine/04_Core_Plugins.md](engine/04_Core_Plugins.md) — shipped plugins as reference.
3. [engine/03_Plugin_Contract.md](engine/03_Plugin_Contract.md) — registration/boot contract.

### Porting an app onto the engine
1. [engine/01_Architecture.md](engine/01_Architecture.md) — what the engine provides.
2. [engine/04_Core_Plugins.md](engine/04_Core_Plugins.md) — which plugins to install.
3. [engine/12_App_Handles.md](engine/12_App_Handles.md) — cross-tree state pattern.
4. [engine/16_Type_Augmentation.md](engine/16_Type_Augmentation.md) — typed slices + state-library keys.
5. [engine/20_Fragility_Audit.md](engine/20_Fragility_Audit.md) — sharp edges to avoid.

### Working on fluid-toy
1. [fluid-toy/README.md](../fluid-toy/README.md) — file map, recipes, gotchas. **Start here.**
2. [engine/02_Feature_Registry.md](engine/02_Feature_Registry.md) — `defineFeature` shape (for adding a feature).
3. [engine/16_Type_Augmentation.md](engine/16_Type_Augmentation.md) — when adding a slice or state library.
4. [engine/14_Panel_Manifest.md](engine/14_Panel_Manifest.md) — when changing how panels compose.

### Debugging
1. [engine/20_Fragility_Audit.md](engine/20_Fragility_Audit.md) — check for known issues first.
2. Relevant subsystem doc (06–10).
3. [gmt/06_Troubleshooting_and_Quirks.md](gmt/06_Troubleshooting_and_Quirks.md) — for WebGL / raymarching issues (legacy GMT).

## GMT-era reference

The [gmt/](gmt/) subdir preserves pre-extraction GMT docs for the eventual port. **Do not treat these as engine commitments** — they describe what GMT does today, which will become GMT-plugin concerns when we port.

- `01–08` — GMT architecture, rendering, modular graph, animation, data, file structure (pre-engine-split).
- `21–27` — Fragmentarium importer, formula dev, shader test harness.
- `30, 43, 44` — Mesh export, bucket render, preview region.

## Style

- File paths in markdown links: `[text](path/to/file.ts)` for clickable references.
- Line references: `[FeatureSystem.ts:236](engine/FeatureSystem.ts#L236)`.
- **Rule:** prefix for normative guidance.
- **Why:** explanation immediately after.
- **Decision** blocks at the bottom of architecture docs: what/when/alternatives/rationale.
- Stability marker in every doc's H1.

### Adding a doc

- New subsystem or core plugin → new numbered doc in `engine/`.
- New primitive or pattern within existing subsystem → section in existing doc.
- Bug fix with non-obvious root cause → note in `engine/20_Fragility_Audit.md`.
- Design decision (even rejected) → "Decisions" section of the relevant doc.

### Deleting a doc

Don't. Move to `archive/` with a one-line "why archived" at the top. Keeps history discoverable.

---

*Engine fork point: GMT 0.9.2 (commit `ece5c84`). Last doc refresh: 2026-04-23 (engine/gmt subdir split; `11_Plugin_Authoring` + `12_App_Handles` added; `toy-fluid/` reference fork retired; debug scratch cleaned).*
