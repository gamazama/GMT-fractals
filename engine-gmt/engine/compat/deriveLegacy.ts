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

  // P2 removed the hardcoded Modular branch — Modular.ts now declares
  // shape:modular explicitly in its shader.capabilities. The shim only
  // runs when capabilities is undefined, so this code path no longer
  // fires for Modular. Kept for V3/V4 Workshop imports until P5/P6.

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
