# gmt-engine

A generic, plugin-based application engine extracted from [GMT (Fractal Explorer)](https://gmt-fractals.com).

Provides: DDFS (data-driven feature system), animation engine, undo/redo, save/load, URL sharing, adaptive viewport, topbar/dock/timeline chrome, worker-offload stub — all usable by any real-time interactive app without fractal-specific coupling.

Three apps ship in this repo as proof:

| App | Entry | What it shows | README |
|-----|-------|---------------|--------|
| `app-gmt` | `app-gmt.html` | Full GMT fractal renderer (42 formulas, 26 features) | [app-gmt/README.md](app-gmt/README.md) |
| `fluid-toy` | `fluid-toy.html` | 2D fluid simulation (Julia/Mandelbrot field) | [fluid-toy/README.md](fluid-toy/README.md) |
| `fractal-toy` | `fractal-toy.html` | Minimal Mandelbulb playground | — |
| `demo` | `index.html` | Hello-world engine plugin (start here) | [demo/README.md](demo/README.md) |

## Quick start

```bash
npm install
npm run dev        # dev server at http://localhost:3400
npm run typecheck  # must exit 0
npm run smoke:all  # headless browser smoke suite
```

Entry points:
- `http://localhost:3400/` — engine demo (hello-world add-on)
- `http://localhost:3400/app-gmt.html` — GMT fractal explorer
- `http://localhost:3400/fluid-toy.html` — fluid toy
- `http://localhost:3400/fractal-toy.html` — fractal toy

## How it's structured

```
engine/        Generic engine core — DDFS, animation, plugins, UI primitives
engine-gmt/    GMT plugin layer — fractal renderer, formulas, camera
app-gmt/       GMT app shell — wires engine + engine-gmt together
fluid-toy/     Fluid sim app (full engine-native app)
demo/          Hello-world plugin (minimal three-file contract)
docs/          Architecture docs — start with docs/DOCS_INDEX.md
```

Apps sit on top of the engine via plugins. They don't fork it. See [docs/engine/01_Architecture.md](docs/engine/01_Architecture.md) for the three-tier model.

## Plugin model

Every app is a plugin. See [demo/README.md](demo/README.md) for the minimal three-file contract (`registerFeatures.ts` → `setup.ts` → mount), and [docs/engine/03_Plugin_Contract.md](docs/engine/03_Plugin_Contract.md) for the full spec.

## Docs

Architecture docs live in [docs/](docs/). Start with [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, how to add a feature, PR checklist, and doc update policy.
