// Re-export from engine-core — no GMT-specific runtime content.
// Engine-core's RenderPipeline uses an inline loose-record QualityState;
// GMT's richer QualityState (engine-gmt/features/quality) is structurally
// assignable to it, so callers passing the full type continue to typecheck.
export * from '../../engine/RenderPipeline';
