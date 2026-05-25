/**
 * Feature compatibility protocol — barrel.
 *
 * @see dev/docs/gmt/35_Capability_Protocol.md
 * @see dev/docs/adr/0059-feature-capability-protocol.md
 */

export { deriveLegacy } from './deriveLegacy';
export { evaluateCompat } from './evaluateCompat';
export type { CompatScene } from './evaluateCompat';
export { pairHasCapability } from './pairHasCapability';

// Re-export the vocabulary types for convenience
export type {
  Capability,
  CapabilitySet,
  CapabilityRequirements,
  CompatReport,
  CompatStatus,
} from '../../types/capabilities';
