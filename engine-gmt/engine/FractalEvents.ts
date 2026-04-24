/**
 * Re-export of the shared `engine/FractalEvents` — the event bus is a
 * module-scoped singleton and must share identity with the store's
 * emit/subscribe site. See engine-gmt/engine/FeatureSystem.ts for the
 * same rationale.
 */
export * from '../../engine/FractalEvents';
