/**
 * Re-export of the shared `engine/FeatureSystem` — the feature registry
 * is a module-scoped singleton and MUST have a single instance across the
 * whole app. The original GMT copy that lived here instantiated a second
 * registry; GMT features registered into it but the store's
 * createFeatureSlice iterated the other one, so no GMT slices appeared.
 *
 * Importing through this shim keeps `engine-gmt/engine/FeatureSystem`
 * as a valid path for everything under engine-gmt/ while routing all
 * identity to the one true registry at `engine/FeatureSystem`.
 */
export * from '../../engine/FeatureSystem';
