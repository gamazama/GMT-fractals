/**
 * Feature compatibility vocabulary.
 *
 * Closed union of capability tokens that formulas declare (what they
 * provide / what shape they are) and features declare requirements
 * against. Single source of truth for the {@link evaluateCompat}
 * reducer used by AutoFeaturePanel, the Engine panel, and the
 * forthcoming New Scene wizard.
 *
 * Adding a new token requires an ADR amendment (see ADR-0059).
 *
 * @see dev/docs/gmt/35_Capability_Protocol.md
 * @see dev/plans/capability-protocol.md
 */

export type Capability =
  // Shape — what kind of formula this is (exactly one expected per formula)
  | 'shape:per-iteration'    // engine owns the outer loop
  | 'shape:self-contained'   // formula owns its loop, runs once + break
  | 'shape:modular'          // graph-compiled (Modular)
  // Iteration behaviour
  | 'iter:c-constant'        // accepts Julia-style c override meaningfully
  | 'iter:shared-rotation'   // reads/writes gmt_rotAxis/rotCos/rotSin
  // Estimator capabilities
  | 'estimator:cutting-plane'// writes cp_dmin/cp_scale/cp_trap accumulators
  // Render-side outputs
  | 'render:writes-trap'     // populates result.y for trap-mode coloring
  | 'render:writes-iter';    // populates result.z (smoothiter) meaningfully

export type CapabilitySet = ReadonlySet<Capability>;

/**
 * Feature-side requirement declaration. Attached to FeatureDefinition.requires.
 *
 * Semantics: a feature is `disabled` if any `requires.*` constraint is
 * unsatisfied OR any `rejects.*` constraint matches. Otherwise `ok`.
 *
 * - `primary`: all listed tokens must be in primary.capabilities
 * - `secondary`: all listed tokens must be in secondary.capabilities (when secondary set)
 * - `pair`: each listed token must be in primary OR secondary capabilities
 * - `rejects.primary`: feature disabled if any listed token IS in primary capabilities
 * - `rejects.secondary`: feature disabled if any listed token IS in secondary capabilities
 *
 * Note: the shared {@link FeatureDefinition} types these arrays as `string[]`
 * (engine-core is provider-agnostic). GMT-side declarations should use
 * `[...] satisfies Capability[]` for type safety at the declaration site.
 */
export interface CapabilityRequirements {
  primary?: Capability[];
  secondary?: Capability[];
  pair?: Capability[];
  rejects?: {
    primary?: Capability[];
    secondary?: Capability[];
  };
}

export type CompatStatus = 'ok' | 'disabled' | 'partial';

export interface CompatReport {
  featureId: string;
  status: CompatStatus;
  /** Human-readable explanations of each constraint that contributed
   *  to the status. Empty when status is 'ok'. Joined for tooltip use. */
  reasons: string[];
}
