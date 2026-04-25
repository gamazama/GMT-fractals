# gmt-engine

A generic, plugin-based application engine extracted from [GMT (Fractal Explorer)](https://gmt-fractals.com).

Provides: DDFS (data-driven feature system), animation engine, undo/redo, save/load, URL sharing, adaptive viewport, topbar/dock/timeline chrome, worker-offload stub — all usable by any real-time interactive app without fractal-specific coupling.

Three apps ship in this repo as proof:

| App | Entry | What it shows |
|-----|-------|---------------|
| `app-gmt` | `app-gmt.html` | Full GMT fractal renderer on the engine |
| `fluid-toy` | `fluid-toy.html` | 2D fluid simulation (Julia/Mandelbrot) |
| `fractal-toy` | `fractal-toy.html` | Minimal Mandelbulb playground |

## Quick start

```bash
npm install
npm run dev        # dev server at http://localhost:3400
```

Entry points:
- `http://localhost:3400/` — engine demo (hello-world add-on)
- `http://localhost:3400/app-gmt.html` — GMT fractal explorer
- `http://localhost:3400/fluid-toy.html` — fluid toy
- `http://localhost:3400/fractal-toy.html` — fractal toy

## Plugin model

Every app is a plugin. See `demo/` for the minimal three-file contract (`registerFeatures.ts` → `setup.ts` → mount), and `docs/03_Plugin_Contract.md` for the full spec.

## Docs

Architecture docs live in `docs/`. Start with `docs/DOCS_INDEX.md`.

## Tests

```bash
npm run smoke:all       # all smoke tests
npm run typecheck       # tsc --noEmit
```
