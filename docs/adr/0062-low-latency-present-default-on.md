# ADR-0062: Low-latency (`desynchronized`) present default-on for the worker WebGL context

**Date:** 2026-05-31
**Status:** Accepted _(default-on shipped `80ea104`; kept after the user's feel-test + export verification)_
**Scope:** the worker WebGL context creation (`engine-gmt/engine/worker/renderWorker.ts:~105`) + the `LOW_LATENCY_PRESENT` constant / `?lowlatency` URL flag. **Present-path concern — distinct from ADR-0061** (the InteractionSession refactor); the two were investigated together but are separate.
**Related:** ADR-0061 (the present-path investigation that surfaced this — see its "Worker bridge — now-PINNED ~1s lag" section).

## Context

Investigating the interaction-engagement lag (ADR-0061) root-caused the renderer as **GPU present-path-bound under load** on the user's Windows / D3D11 / RTX 2070 stack: the long tasks were all `CrGpuMain` in `DXGISwapChainImageBacking::Present` / `SwapBuffers` / `ScheduleOverlays`, and Chrome gates input dispatch + rAF on frame production. The standard browser canvas present goes through the compositor's double/triple-buffer + DWM sync, which adds present latency and caps throughput under load.

`desynchronized: true` is the Web platform's **low-latency canvas** hint — it lets the canvas bypass much of the compositor sync path. It's the single biggest known Windows present-latency/throughput lever for a WebGL app.

Measured on the real GPU (headed Playwright + `--use-angle=d3d11`; headless software-GL cannot reproduce the present path):
- **+59% throughput under load** (6.8 → 10.8 fps on a heavy scene).
- **Marginal on the engagement floor** — consistent with the floor being a one-time first-interaction FBO *allocation*, not present latency.

## Decision

Create the worker WebGL context with **`desynchronized: true` by default**, with a `?lowlatency=0` URL escape hatch that disables it **with no rebuild**. Revert criteria live on the `LOW_LATENCY_PRESENT` constant.

- **Default-on**, because the throughput win is large and the app's common case is heavy scenes under load.
- **Escape hatch** (`?lowlatency=0`) because `desynchronized` behavior is GPU/driver-dependent and can regress on some stacks — users (or support) can disable it instantly.
- It is a **context-creation attribute** — it CANNOT be toggled per-frame. So export-time safety can't be achieved by toggling it off during export; it has to be safe-by-construction (see Verification).

## Verification

- **Exports + snapshots confirmed clean** (user-verified, 2026-05-31). This holds because the export / bucket-render / snapshot paths read the **render target directly via readback** (which forces a GPU finish), NOT the *presented* swapchain — so a low-latency present path cannot tear an export. `desynchronized` affects compositing/present, which exports don't consume.
- Live-view tearing not observed by the user on this GPU.

## Consequences

**Benefits:** +59% throughput under load; lower present latency on the path that gates input dispatch.

**Risks / mitigations:** `desynchronized` can cause live-view tearing or behave worse on some GPUs/drivers → the `?lowlatency=0` escape hatch + the documented `LOW_LATENCY_PRESENT` revert criteria (tearing / torn snapshots+exports / present flicker / worse latency on some GPUs). If a broad regression surfaces, flip the default back to off (one constant; no rebuild needed for the per-session opt-out). A new global render-context default for future contributors to be aware of.

**Not fixed by this:** the one-time first-interaction FBO-allocation spike (a boot pre-warm is the available-but-declined fix), and genuinely heavy converged full-res frame cost (a separate scene/shader/quality workstream). Both are present-path-adjacent but out of scope here.
