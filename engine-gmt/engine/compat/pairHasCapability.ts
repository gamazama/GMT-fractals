/**
 * Pair-aware capability check: does EITHER primary or secondary declare
 * the given capability?
 *
 * Replaces the two-file CP-pair mirror flagged in ADR-0052
 * (`features/core_math.ts` ↔ `engine/SDFShaderBuilder.ts`). Currently
 * unused — wired up in Phase 7 of capability-protocol implementation.
 *
 * @see dev/plans/capability-protocol.md (Phase 7)
 */

import type { FractalDefinition } from '../../types';
import type { Capability } from '../../types/capabilities';

export function pairHasCapability(
  primary: FractalDefinition,
  secondary: FractalDefinition | undefined,
  cap: Capability,
): boolean {
  if (primary.shader.capabilities?.has(cap)) return true;
  if (secondary?.shader.capabilities?.has(cap)) return true;
  return false;
}
