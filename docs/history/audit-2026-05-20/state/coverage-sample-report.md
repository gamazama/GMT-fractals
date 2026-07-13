# Coverage gap sample report

8 files spot-checked from the 310 uncovered. Goal: determine whether the gap contains surprises or is mostly tertiary.

Note: the audit slot called for `engine-gmt/components/Histogram.tsx` and `engine-gmt/components/PerformanceMonitor.tsx`, but both files only exist under `components/` — engine-gmt has no such siblings. The app-level files were spot-read in their place. Likewise `utils/codec.ts` does not exist; `utils/pngMetadata.ts` was substituted as the most load-bearing utility candidate (GMF-in-PNG embedding per CLAUDE.md). Shaders confirmed to be `.ts` files (template-string emitters), not `.glsl`.

## File 1: h:/GMT/workspace-gmt/dev/components/Histogram.tsx
**Classification:** load-bearing
**Purpose:** Interactive Levels/Gamma widget: canvas histogram + drag handles for min/max, a midtone-bias gamma handle whose position uses the inverse mapping `gamma = ln(0.5)/ln(pos)`, plus optional gradient overlay with repeats/phase. Used by both the Coloring layer and the Scene-grade histogram (see HistogramProbe upstream).
**Surprise:** Histogram.tsx:264-271 — the gradient overlay uses a `factor = 1 + 2/safeRepeats` extension and `translateX` instead of CSS `background-position` to avoid the "percentage is relative to container-minus-tile" gotcha. Hidden CSS invariant that's easy to break if someone "simplifies" it later. Also Histogram.tsx:198 — gamma formula is unobvious enough to warrant a one-line mention in the coloring/levels doc.

## File 2: h:/GMT/workspace-gmt/dev/components/PerformanceMonitor.tsx
**Classification:** load-bearing
**Purpose:** Module-scoped FPS sampler with a `tick()` exported for orchestration plus a React panel that surfaces "low FPS" remediations (adaptive resolution, AA reset, Lite Mode, resolution -33%). Talks directly to the WorkerProxy `engine` singleton and reads `accumulationCount`/`sampleCap` to suppress warnings during finished accumulations.
**Surprise:** PerformanceMonitor.tsx:14-27 — keeps **module-singleton mutable state** (`performanceState`) that React effects mutate at PerformanceMonitor.tsx:134-155, holding pointers to setState callbacks. If the panel is mounted twice (or HMR re-mounts it) the callback handoff race-condition is real. Also bypasses TickRegistry: the exported `tick()` is fed timestamps from outside, which contradicts the "phase-based" tick orchestration described in CLAUDE.md. PerformanceMonitor.tsx:72 hard-codes a "first 8 seconds since page load" startup grace, using `performance.now()` (page time) rather than engine boot time — easy regression when boot becomes slower.

## File 3: h:/GMT/workspace-gmt/dev/engine-gmt/shaders/chunks/trace.ts
**Classification:** load-bearing
**Purpose:** Emits the Stage-2 raymarch GLSL (`traceScene` function) as a template string, parameterized by mobile/precision/glow/volume injection points. Owns the candidate-tracking overstep-recovery loop, adaptive epsilon, and the world-origin-offset hoist.
**Surprise:** trace.ts:33-40 — a multi-line code comment documents an audit that was tried and reverted (`mapDist` split → +5% slower because the inner-loop DCE already optimized it). This is exactly the kind of "don't try this again" historical context that belongs in a rendering-internals doc and currently exists only as an inline comment. trace.ts:55-58 also encodes the invariant that `worldOriginOffset = uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh` — pre-hoisted for perf, a hidden contract with UniformManager.

## File 4: h:/GMT/workspace-gmt/dev/engine-gmt/gallery/index.ts
**Classification:** tertiary (barrel file)
**Purpose:** Six-line public-API barrel for the engine-gmt gallery subsystem. Re-exports installGallery / overlays / store / submit-token helpers.
**Surprise:** none — this is exactly a barrel. The real surface area lives in the sibling files (`installGallery.tsx`, `GalleryClient.ts`, etc.), each of which is its own concern. The barrel itself is documentation-cheap; the gallery subsystem as a whole likely does deserve module-level coverage but not via this file.

## File 5: h:/GMT/workspace-gmt/dev/utils/pngMetadata.ts
**Classification:** load-bearing
**Purpose:** PNG `iTXt`-chunk injector/extractor used to embed the GMF scene blob inside snapshot PNGs (per CLAUDE.md's "PNG snapshots embed GMF in metadata"). Hand-rolled CRC32 + chunk-walker; reads legacy `tEXt` chunks for backward compat.
**Surprise:** pngMetadata.ts:60 — `iTXt` chunk layout is hand-encoded with magic offsets (`1+1+1+1+1`) and zero comments at the byte-layout level. If a future round-trip ever needed compression flag = 1, the writer would silently produce invalid PNGs. pngMetadata.ts:144-156 silently falls back to `tEXt`-with-UTF-8-decode for legacy PNGs, which is technically illegal per spec (tEXt is Latin-1) but works in practice — undocumented compat detail that belongs in the data-and-export doc.

## File 6: h:/GMT/workspace-gmt/dev/data/help/registry.ts
**Classification:** secondary
**Purpose:** Lazy loader for the ~3400-line help-topics bundle: `loadHelpTopics()` does a dynamic import so Vite emits a separate chunk, `prefetchHelpTopics()` uses `requestIdleCallback` to warm it, and `getLoadedHelpTopics()` is a sync accessor that returns null until first load.
**Surprise:** registry.ts:1-18 — the docstring itself is the surprise: it explicitly calls out the bundle-splitting reasoning, the prefetch hook (App.tsx idle callback), and the sync-vs-async access patterns. The file is self-documenting and well-commented; it just needs a one-line mention from whichever module doc covers help/UI scaffolding.

## File 7: h:/GMT/workspace-gmt/dev/components/EngineBridge.tsx
**Classification:** tertiary (the file itself) — but flagged as a doc gap
**Purpose:** A 22-line component that mounts once, runs `bindStoreToEngine()` from a useEffect guarded by a ref, returns null. All the actual bridge logic lives in `store/engineStore.ts::bindStoreToEngine`.
**Surprise:** EngineBridge.tsx:17 — CLAUDE.md elevates EngineBridge.tsx to a "key file" and "React ↔ Engine mediator", but the mediation is **not here** — it's in `bindStoreToEngine` inside engineStore. The file is essentially a useEffect shim. The architectural surprise is the documentation mismatch: any doc that points at `EngineBridge.tsx` for mediator logic will mislead readers. The real coverage target should be `store/engineStore.ts::bindStoreToEngine`.

## File 8: h:/GMT/workspace-gmt/dev/engine-gmt/components/HistogramProbe.tsx
**Classification:** load-bearing
**Purpose:** Headless React component (returns null) that runs an rAF loop polling the worker for histogram readbacks every 60 frames when autoUpdate is on, or immediately when `trigger` changes. Marked as ported verbatim from gmt-0.8.5 (matches `feedback_port_verbatim_dont_invent.md`).
**Surprise:** HistogramProbe.tsx:36-50 — the rAF loop captures `autoUpdate`/`trigger` from the effect closure but `frameCount` is a local var inside the effect, meaning every effect re-run resets the modulo-60 counter. If a parent re-renders with a stable autoUpdate but unstable callback identity (the `useEffect` deps include `onUpdate`/`onLoadingChange`), the probe restarts the cadence each time — a hidden invariant that the parent must memoize callbacks. Worth a note in the histogram pipeline doc.

## Summary
- load-bearing: 5 (Histogram, PerformanceMonitor, trace.ts, pngMetadata, HistogramProbe)
- secondary: 1 (help/registry.ts)
- tertiary: 2 (gallery/index.ts barrel, EngineBridge.tsx shim — the latter is a doc-pointer mismatch surprise of its own)

## Recommendation
The gap is real, not catastrophic, but **not safe to dismiss as "forms and shells"**. Five of eight files contained at least one invariant, perf-tuning comment, or hidden contract that belongs in a module doc (gamma formula, gradient-tile CSS workaround, module-singleton mutable FPS state, raymarch audit-reverted history, PNG iTXt offsets, callback-memoization contract). The recommended closure pass should be **selective**: enumerate the uncovered set, batch the obvious tertiary cases (barrels, content registries, icon files, type-only modules) into a single "low-stakes" appendix, and reserve full per-file attention for utils/* (likely load-bearing), engine-gmt/shaders/chunks/* (definitely load-bearing — every chunk emits GLSL with hidden invariants), and any *.tsx file that touches the WorkerProxy directly. The EngineBridge case also signals worth: existing module docs should be re-checked for pointer-mismatches where the named "key file" is actually a thin shim.
