/**
 * V4-emit capability derivation — produces the `shader.capabilities` set
 * for Workshop-imported formulas (both self-contained and per-iteration
 * paths). Used by emit/index.ts (self-contained) and emit/per-iteration.ts.
 *
 * Detection is regex-based against the assembled GLSL: cheaper than parsing
 * and good enough for the well-shaped output the V4 emitter produces. False
 * negatives (imports that have a capability the regex doesn't catch) result
 * in features showing as disabled when they could work — recoverable via
 * manual edit after import. False positives (claiming a capability the
 * formula doesn't have) would cause features to attempt and silently fail
 * — same failure mode as today's "no capabilities" state. Net better either
 * way than leaving the field undefined.
 *
 * See:
 * - dev/docs/gmt/35_Capability_Protocol.md
 * - dev/plans/capability-protocol.md (Phase 5)
 */

import type { Capability } from '../../../../types/capabilities';

export interface DerivableGlsl {
  preamble?: string;
  loopInit?: string;
  function: string;
  loopBody: string;
  getDist?: string;
}

export type EmitShape = 'self-contained' | 'per-iteration';

/**
 * Derive the capability set for a V4-emitted formula definition.
 *
 * Always includes the `shape:*` token matching the emit path. Adds:
 * - `iter:shared-rotation` if the GLSL uses any `gmt_rot*` or
 *   `gmt_precalcRodrigues` helper (engine-shared rotation state)
 * - `estimator:cutting-plane` if the GLSL writes to `cp_dmin/cp_scale/cp_trap`
 * - `iter:c-constant` if the function/loopBody reads `c.x/y/z/...` swizzles
 * - `render:writes-trap` if the function assigns to `trap`
 * - `render:writes-iter` (per-iteration only) if the function updates `dr`
 *   (self-contained imports get this only via manual addition — detecting
 *   smoothiter packing in a getDist return is too brittle to automate)
 */
export function deriveImportCapabilities(
  glsl: DerivableGlsl,
  shape: EmitShape,
): Set<Capability> {
  const caps = new Set<Capability>();
  caps.add(shape === 'self-contained' ? 'shape:self-contained' : 'shape:per-iteration');

  const fullBody = `${glsl.preamble ?? ''}\n${glsl.loopInit ?? ''}\n${glsl.function}\n${glsl.loopBody}\n${glsl.getDist ?? ''}`;
  const funcAndLoop = `${glsl.function}\n${glsl.loopBody}`;

  if (/\bgmt_(rot(Axis|Cos|Sin)|precalcRodrigues)\b/.test(fullBody)) {
    caps.add('iter:shared-rotation');
  }
  if (/\bcp_(dmin|scale|trap)\b/.test(fullBody)) {
    caps.add('estimator:cutting-plane');
  }
  if (/\bc\.(?:x|y|z|w|xy|xz|yz|xw|yw|zw|xyz|xyw|xzw|yzw|xyzw)\b/.test(funcAndLoop)) {
    caps.add('iter:c-constant');
  }
  if (/\btrap\s*=/.test(glsl.function)) {
    caps.add('render:writes-trap');
  }
  if (shape === 'per-iteration' && /\bdr\s*[*+\-/]?=/.test(glsl.function)) {
    caps.add('render:writes-iter');
  }

  return caps;
}
