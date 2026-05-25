/**
 * Translate the 4 legacy shader.* flags + Modular id into a CapabilitySet.
 *
 * Used by FractalRegistry.register() to populate def.shader.capabilities
 * for formulas that haven't yet declared explicit capabilities. This is
 * the BACKWARD-COMPAT BRIDGE that lets P0 land without touching all 43
 * formula files — P1 migrates the natives to explicit declarations,
 * P5/P6 cover V4/V3 emitters, P8 removes this shim.
 *
 * @sunset Removed in Phase 8 of capability-protocol implementation.
 * @see dev/plans/capability-protocol.md (P0 vocabulary, P8 cleanup)
 */

import type { FractalDefinition } from '../../types';
import type { Capability } from '../../types/capabilities';

export function deriveLegacy(def: FractalDefinition): Set<Capability> {
  const caps = new Set<Capability>();

  // Modular is a node-graph formula; its capabilities are graph-dependent.
  // We tag the shape only — features that reject Modular use rejects.primary.
  if (def.id === 'Modular') {
    caps.add('shape:modular');
    return caps;
  }

  // Shape: per-iteration is the default; self-contained is opt-in.
  if (def.shader.selfContainedSDE) {
    caps.add('shape:self-contained');
  } else {
    caps.add('shape:per-iteration');
  }

  if (def.shader.usesSharedRotation) caps.add('iter:shared-rotation');
  if (def.shader.supportsCuttingPlane) caps.add('estimator:cutting-plane');

  // iter:c-constant, render:writes-trap, render:writes-iter have NO legacy
  // flag mapping — they require explicit declaration. The shim leaves them
  // out; P1 sub-investigation produced the per-formula classification in
  // dev/plans/capability-protocol-p1-classification.md.

  return caps;
}
