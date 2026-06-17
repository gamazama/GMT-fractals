/**
 * Pure reducer: given a scene shape, return a CompatReport per feature.
 *
 * Consumed by AutoFeaturePanel, CompilableFeatureSection, the Engine
 * panel feature list, and the forthcoming New Scene wizard. Single
 * source of truth for "is this feature available given current
 * formula(s)?" — replaces six ad-hoc visibility patterns (see audit
 * in dev/plans/capability-protocol.md).
 *
 * @invariant Pure function. No store imports. No memoization. Callers
 *   handle memo if they want it. No side effects.
 * @invariant Unknown feature ids are silently skipped (allows new
 *   features to register without forcing simultaneous protocol updates).
 *
 * @see dev/plans/capability-protocol.md
 * @see dev/docs/gmt/35_Capability_Protocol.md
 */

import type { FractalDefinition } from '../../types';
import type { Capability, CompatReport, CompatStatus } from '../../types/capabilities';
import { featureRegistry } from '../../../engine/FeatureSystem';

export interface CompatScene {
  primary: FractalDefinition;
  secondary?: FractalDefinition;
  /** Which features are currently enabled. Disabled features still
   *  produce a report (status 'ok' or 'disabled' based on requires).
   *  Callers use this to filter — the report is exhaustive. */
  enabledFeatures?: Record<string, boolean>;
}

export function evaluateCompat(scene: CompatScene): CompatReport[] {
  const reports: CompatReport[] = [];
  const primaryCaps = scene.primary.shader.capabilities ?? new Set<Capability>();
  const secondaryCaps = scene.secondary?.shader.capabilities;

  for (const feat of featureRegistry.getAll()) {
    const req = (feat as { requires?: {
      primary?: string[];
      secondary?: string[];
      pair?: string[];
      rejects?: { primary?: string[]; secondary?: string[] };
    } }).requires;

    if (!req) {
      reports.push({ featureId: feat.id, status: 'ok', reasons: [] });
      continue;
    }

    let status: CompatStatus = 'ok';
    const reasons: string[] = [];

    // requires.primary — all tokens must be in primary capabilities
    if (req.primary) {
      for (const tok of req.primary) {
        if (!primaryCaps.has(tok as Capability)) {
          status = 'disabled';
          reasons.push(`requires primary capability: ${tok}`);
        }
      }
    }

    // requires.secondary — all tokens must be in secondary (when secondary present)
    if (req.secondary && secondaryCaps) {
      for (const tok of req.secondary) {
        if (!secondaryCaps.has(tok as Capability)) {
          status = 'disabled';
          reasons.push(`requires secondary capability: ${tok}`);
        }
      }
    }

    // requires.pair — each token must be in primary OR secondary
    if (req.pair) {
      for (const tok of req.pair) {
        const inEither = primaryCaps.has(tok as Capability)
          || (secondaryCaps?.has(tok as Capability) ?? false);
        if (!inEither) {
          status = 'disabled';
          reasons.push(`requires pair capability (either side): ${tok}`);
        }
      }
    }

    // rejects.primary — feature disabled if any listed token IS in primary caps
    if (req.rejects?.primary) {
      for (const tok of req.rejects.primary) {
        if (primaryCaps.has(tok as Capability)) {
          status = 'disabled';
          reasons.push(`rejected by primary capability: ${tok}`);
        }
      }
    }

    // rejects.secondary — feature disabled if any listed token IS in secondary caps
    if (req.rejects?.secondary && secondaryCaps) {
      for (const tok of req.rejects.secondary) {
        if (secondaryCaps.has(tok as Capability)) {
          status = 'disabled';
          reasons.push(`rejected by secondary capability: ${tok}`);
        }
      }
    }

    reports.push({ featureId: feat.id, status, reasons });
  }

  return reports;
}
