/**
 * Re-export shim — the deep-zoom worker runtime (orbit/LA/AT build off-thread)
 * was carved into the shared `engine/fractal/deepZoom` library so the Gradient
 * Explorer's live-fractal mode drives the SAME worker fluid-toy uses (no fork).
 * The worker itself (`deepZoomWorker.ts`) moved alongside, so `import.meta.url`
 * inside the runtime still resolves the worker bundle correctly.
 *
 * @see engine/fractal/deepZoom/laRuntime.ts (canonical source)
 */
export { DeepZoomRuntime, getDeepZoomRuntime } from '../../engine/fractal/deepZoom/laRuntime';
export type { RefOrbitRequest, RefOrbitResult, ATPayload } from '../../engine/fractal/deepZoom/laRuntime';
