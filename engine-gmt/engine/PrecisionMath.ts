/**
 * Re-export shim — `VirtualSpace` moved to
 * `engine/plugins/navigation/core/VirtualSpace.ts` during Stage-1 of the
 * navigation plugin extraction (2026-04-24). Every engine-gmt consumer
 * that previously imported `PrecisionMath` keeps working through this
 * shim; new code should import from `@engine/plugins/navigation/core/VirtualSpace`.
 *
 * The class is genuinely shared — GMT uses it for split-float camera
 * positioning, the same precision trick any raymarcher wants. Delete
 * this shim once the engine-gmt import sites migrate.
 */
export { VirtualSpace } from '../../engine/plugins/navigation/core/VirtualSpace';
