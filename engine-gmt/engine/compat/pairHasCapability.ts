/**
 * Pair-aware capability check: does EITHER primary or secondary declare
 * the given capability?
 *
 * Replaces the two-file CP-pair mirror flagged in ADR-0052
 * (`features/core_math.ts` ↔ `engine/SDFShaderBuilder.ts`) — both compile
 * gates delegate here (wired in Phase 7). Token-only by design: the legacy
 * booleans were deleted from FractalDefinition; parseGMF promotes them to
 * tokens at the parse boundary, so every registered def carries a set.
 *
 * @see plans/capability-protocol.md (Phase 7)
 * @see docs/adr/0059-feature-capability-protocol.md (update block: flag retirement)
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
