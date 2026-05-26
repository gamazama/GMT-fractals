/**
 * P0 capability-protocol snapshot harness.
 *
 * Node-only (no WebGL, no headless Chromium). Iterates every registered
 * formula, runs structural checks + evaluateCompat (no secondary), and
 * snapshots the disabled CompatReport rows to debug/compat-snapshot.jsonl.
 *
 * Modes:
 *   tsx debug/test-compat.mts           — diff mode: exit non-zero on drift
 *   tsx debug/test-compat.mts --write   — regenerate snapshot
 *
 * Structural checks (per formula, plus snapshot of disabled compat rows):
 *   - shader.function and shader.loopBody are present + non-empty
 *     (or Modular, which intentionally has empty shader blocks)
 *   - shader.capabilities exists (set by FractalRegistry via deriveLegacy
 *     if formula didn't declare explicitly) and contains exactly one
 *     of shape:per-iteration / shape:self-contained / shape:modular
 *   - parameters is an array
 *
 * Cheap regression net — does NOT compile shaders. Real shader-compile
 * coverage requires the full harness port (test:baseline / test:hybrid /
 * test:interlace) which is queued as separate work.
 *
 * @see dev/plans/capability-protocol.md (Phase 0)
 * @see dev/docs/gmt/35_Capability_Protocol.md
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Formulas register at module-import time (side effect of importing the
// barrel). Features register via an explicit registerFeatures() call —
// mirrors boot order in app-gmt.
import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';

import { registry } from '../engine-gmt/engine/FractalRegistry';
import { featureRegistry } from '../engine/FeatureSystem';
import { evaluateCompat } from '../engine-gmt/engine/compat';
import type { Capability } from '../engine-gmt/types/capabilities';
import { GmtPanels } from '../engine-gmt/panels';

registerFeatures();

// Resolve snapshot path relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SNAPSHOT_PATH = resolve(__dirname, 'compat-snapshot.jsonl');

const SHAPE_TOKENS: Capability[] = [
  'shape:per-iteration',
  'shape:self-contained',
  'shape:modular',
];

interface StructuralIssue {
  formulaId: string;
  kind: string;
  message: string;
}

interface SnapshotLine {
  formulaId: string;
  featureId: string;
  /** Identifies the panel section when the row originates from a section-level
   *  `requires` declaration in panels.ts (vs. the feature's own `requires`).
   *  Uses `compileParam` as the unique-within-feature key, since multiple
   *  compilable sections of the same feature differ by compileParam. Absent
   *  for feature-level rows. */
  sectionKey?: string;
  status: 'disabled' | 'partial';
  reasons: string[];
}

interface SectionRequires {
  featureId: string;
  sectionKey: string;
  requires: NonNullable<import('../engine-gmt/types/capabilities').CapabilityRequirements>;
}

/** Walk the PanelManifest tree and collect every compilable item that
 *  declares section-level `requires`. Recurses into `items[]` and accordion
 *  `sections[].items[]` because both can host compilable entries. */
function collectSectionRequires(): SectionRequires[] {
  const out: SectionRequires[] = [];
  const visit = (item: any) => {
    if (!item || typeof item !== 'object') return;
    if (item.type === 'compilable' && item.requires) {
      out.push({
        featureId: item.id,
        sectionKey: item.compileParam ?? item.label ?? `unnamed-${out.length}`,
        requires: item.requires,
      });
    }
    if (Array.isArray(item.items)) item.items.forEach(visit);
    if (Array.isArray(item.sections)) item.sections.forEach(visit);
  };
  for (const panel of GmtPanels) {
    if (Array.isArray((panel as any).items)) (panel as any).items.forEach(visit);
  }
  return out;
}

function structuralCheck(): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  for (const def of registry.getAll()) {
    // Modular intentionally has empty shader blocks (graph-compiled)
    if (def.id !== 'Modular') {
      if (!def.shader.function?.trim()) {
        issues.push({ formulaId: def.id, kind: 'missing-function', message: 'shader.function is empty' });
      }
      if (!def.shader.loopBody?.trim()) {
        issues.push({ formulaId: def.id, kind: 'missing-loopBody', message: 'shader.loopBody is empty' });
      }
    }

    const caps = def.shader.capabilities;
    if (!caps) {
      issues.push({ formulaId: def.id, kind: 'missing-capabilities', message: 'shader.capabilities not set (deriveLegacy should populate)' });
    } else {
      const shapeCount = SHAPE_TOKENS.filter(t => caps.has(t)).length;
      if (shapeCount !== 1) {
        issues.push({
          formulaId: def.id,
          kind: 'shape-token-count',
          message: `expected exactly 1 shape:* token, got ${shapeCount}`,
        });
      }
    }

    if (!Array.isArray(def.parameters)) {
      issues.push({ formulaId: def.id, kind: 'parameters-not-array', message: 'parameters is not an array' });
    }
  }
  return issues;
}

function buildSnapshot(): SnapshotLine[] {
  const lines: SnapshotLine[] = [];
  const formulas = [...registry.getAll()].sort((a, b) => a.id.localeCompare(b.id));
  const sectionRequires = collectSectionRequires();

  for (const primary of formulas) {
    // Feature-level: standard evaluateCompat call (no section override).
    const reports = evaluateCompat({ primary });
    for (const r of reports) {
      if (r.status !== 'ok') {
        lines.push({
          formulaId: primary.id,
          featureId: r.featureId,
          status: r.status,
          reasons: [...r.reasons].sort(),
        });
      }
    }

    // Section-level: temporarily patch each feature's `requires` with the
    // section's declaration, re-evaluate, capture the disabled row, restore.
    // Mirrors the CompilableFeatureSection runtime override (see
    // components/CompilableFeatureSection.tsx). Sync-only — safe because
    // evaluateCompat is pure and synchronous.
    for (const sec of sectionRequires) {
      const feat = featureRegistry.get(sec.featureId);
      if (!feat) continue;
      const original = (feat as any).requires;
      (feat as any).requires = sec.requires;
      const sectionReports = evaluateCompat({ primary });
      (feat as any).requires = original;

      const r = sectionReports.find(report => report.featureId === sec.featureId);
      if (r && r.status !== 'ok') {
        lines.push({
          formulaId: primary.id,
          featureId: sec.featureId,
          sectionKey: sec.sectionKey,
          status: r.status,
          reasons: [...r.reasons].sort(),
        });
      }
    }
  }
  // Stable line order: (formulaId, featureId, sectionKey ?? '')
  lines.sort((a, b) => {
    if (a.formulaId !== b.formulaId) return a.formulaId.localeCompare(b.formulaId);
    if (a.featureId !== b.featureId) return a.featureId.localeCompare(b.featureId);
    return (a.sectionKey ?? '').localeCompare(b.sectionKey ?? '');
  });
  return lines;
}

function serialize(lines: SnapshotLine[]): string {
  return lines.map(l => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : '');
}

function main() {
  const writeMode = process.argv.includes('--write');

  const issues = structuralCheck();
  if (issues.length) {
    console.error(`[test:compat] ${issues.length} structural issue(s):`);
    for (const i of issues) {
      console.error(`  ${i.formulaId}: [${i.kind}] ${i.message}`);
    }
    process.exit(1);
  }

  const lines = buildSnapshot();
  const serialized = serialize(lines);

  console.log(`[test:compat] structural checks: ${registry.getAll().length} formulas OK`);
  console.log(`[test:compat] snapshot: ${lines.length} disabled compat rows`);

  if (writeMode) {
    writeFileSync(SNAPSHOT_PATH, serialized);
    console.log(`[test:compat] wrote snapshot to ${SNAPSHOT_PATH}`);
    return;
  }

  if (!existsSync(SNAPSHOT_PATH)) {
    console.error(`[test:compat] snapshot not found at ${SNAPSHOT_PATH}`);
    console.error('[test:compat] run with --write to generate the baseline');
    process.exit(1);
  }

  const expected = readFileSync(SNAPSHOT_PATH, 'utf8');
  if (expected === serialized) {
    console.log('[test:compat] snapshot matches');
    return;
  }

  console.error('[test:compat] snapshot DRIFT detected');
  console.error('[test:compat] run with --write to update the baseline if the drift is intentional');
  // Brief unified-ish hint: show first 5 differing lines
  const expectedLines = expected.split('\n');
  const actualLines = serialized.split('\n');
  let shown = 0;
  for (let i = 0; i < Math.max(expectedLines.length, actualLines.length) && shown < 5; i++) {
    if (expectedLines[i] !== actualLines[i]) {
      console.error(`  line ${i + 1}:`);
      console.error(`    expected: ${expectedLines[i] ?? '<eof>'}`);
      console.error(`    actual:   ${actualLines[i] ?? '<eof>'}`);
      shown++;
    }
  }
  process.exit(1);
}

main();
