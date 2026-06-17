/**
 * Re-export shim — `ViewportRefs` was duplicated between engine-core
 * (`engine/worker/ViewportRefs.ts`) and engine-gmt during the extraction.
 * Each copy held its own module-level `_camera`, so registrations from
 * `GmtRendererTickDriver` (which imports the gmt copy) were invisible to
 * `utils/timelineUtils.ts` (which imports the engine-core copy). That broke
 * the Key Cam dirty check: rotation tracks read `null` from the engine-core
 * copy and returned `0`, making the keyframe always look "dirty" against the
 * just-captured non-zero euler.
 *
 * Single source of truth lives in engine-core; this file just re-exports.
 */
// `export *` (not selective named re-exports) so new symbols added to
// engine-core propagate automatically. K5: previously selective, which
// silently dropped new exports.
export * from '../../../engine/worker/ViewportRefs';
