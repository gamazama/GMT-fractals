/**
 * P0 capability-protocol snapshot harness.
 *
 * Node-only (no WebGL, no headless Chromium). Iterates every registered
 * formula, runs structural checks + evaluateCompat (no secondary), and
 * snapshots the disabled CompatReport rows to debug/compat-snapshot.jsonl.
 *
 * Modes:
 *   tsx debug/test-compat.mts           — diff mode: exit non-zero on drift  (npm run test:compat)
 *   tsx debug/test-compat.mts --write   — regenerate snapshot                (npm run test:compat:write)
 *
 * `--write` IS NOT A GATE — it is the baseline writer, and it always exited 0 once the
 * structural checks passed. That is by design, but it made the workflow this file's own
 * error message recommends ("run with --write to update the baseline if the drift is
 * intentional") the fastest way to destroy the guard. Measured 2026-07-29 (guard sweep,
 * batch 9): with the formula barrel import dropped — registry 55 -> 7 — diff mode
 * correctly went RED, and then `--write` **truncated the tracked baseline to zero bytes,
 * printed "snapshot: 0 disabled compat rows", and exited 0**; diff mode was green forever
 * afterwards on an empty file. Two recorded floors now stand in front of the write (see
 * FORMULA_FLOOR / SNAPSHOT_ROW_FLOOR), so a vanished input fails in BOTH modes instead of
 * being persisted by one of them. Reach for `--write` only when you have read the drift
 * the diff mode printed and decided it is correct.
 *
 * Structural checks (per formula, plus snapshot of disabled compat rows):
 *   - shader.function and shader.loopBody are present + non-empty
 *     (or Modular, which intentionally has empty shader blocks)
 *   - shader.capabilities exists (REQUIRED since P8; FractalRegistry throws
 *     at register if missing) and contains exactly one of
 *     shape:per-iteration / shape:self-contained / shape:modular
 *   - parameters is an array
 *
 * Cheap regression net — does NOT compile shaders. Real shader-compile
 * coverage requires the full harness port (test:baseline / test:hybrid /
 * test:interlace) which is queued as separate work.
 *
 * READ BEFORE TRUSTING A GREEN RUN — the two halves have very different
 * reach, and the snapshot half is much thinner than "55 formulas" suggests.
 * The structural half really does cover all 55. The snapshot half's entire
 * input surface is ONE `requires:` declaration: grep `rejects: { primary:`
 * in engine-gmt/panels.ts. No feature declares a feature-level `requires`
 * anywhere in the tree, which is why every line in compat-snapshot.jsonl
 * carries a `sectionKey` and why there are only two of them. So
 * evaluateCompat's `requires.primary` / `.secondary` / `.pair` /
 * `rejects.secondary` branches are never exercised here, and nor is any
 * secondary-formula path (this harness passes no secondary at all).
 * A capability-protocol regression confined to those branches passes green.
 *
 * What it DOES catch, falsified 2026-07-29, each break reverted:
 *   - a second shape:* token on a formula → exit 1, "Mandelbulb:
 *     [shape-token-count] expected exactly 1 shape:* token, got 2";
 *   - editing that one panels.ts `requires` → exit 1, "snapshot DRIFT
 *     detected" with the changed row diffed;
 *   - flipping a formula's shape token → exit 1, same drift report.
 * Note the `!caps` structural branch is unreachable in practice —
 * FractalRegistry throws at register() when capabilities are missing, so
 * a formula without them never reaches this harness.
 *
 * @see plans/capability-protocol.md (Phase 0)
 * @see docs/history/gmt/35_Capability_Protocol.md
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
      issues.push({ formulaId: def.id, kind: 'missing-capabilities', message: 'shader.capabilities not set (producer must declare explicitly since P8)' });
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

/** Recorded floors. Both halves of this harness derive their entire workload from live
 *  registries, and a workload that never ran produces zero issues and zero rows — so
 *  without these, a vanished input reads as a clean bill of health. Measured 2026-07-29
 *  (guard sweep, batch 9): dropping this file's `import '../engine-gmt/formulas/index'`
 *  side effect took the registry from 55 formulas to 7, and **`--write` truncated the
 *  tracked baseline to zero bytes and exited 0**, after which the diff mode reported
 *  "snapshot matches" forever. Raise a floor when formulas or `requires:` declarations
 *  are added; if you have deliberately REMOVED one, lower it in the same commit — which
 *  is the point, because that edit is where a human looks at the loss on purpose. */
const FORMULA_FLOOR = 55;      // registry.getAll().length, measured 2026-07-29
const SNAPSHOT_ROW_FLOOR = 2;  // disabled compat rows, measured 2026-07-29

function main() {
  const writeMode = process.argv.includes('--write');

  const formulaCount = registry.getAll().length;
  if (formulaCount < FORMULA_FLOOR) {
    console.error(`[test:compat] only ${formulaCount} formulas registered — expected at least ${FORMULA_FLOOR}.`);
    console.error('[test:compat] the matrix shrank rather than failing. Did formula registration break,');
    console.error('[test:compat] or were formulas removed on purpose? (If on purpose, lower FORMULA_FLOOR.)');
    process.exit(1);
  }

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

  console.log(`[test:compat] structural checks: ${formulaCount} formulas OK`);
  console.log(`[test:compat] snapshot: ${lines.length} disabled compat rows`);

  // The snapshot half's entire input surface is the `requires:` declarations reachable from
  // GmtPanels (grep `rejects: { primary:` in engine-gmt/panels.ts). Losing the last one takes
  // this half to zero rows, which an empty-vs-empty comparison then calls a match.
  if (lines.length < SNAPSHOT_ROW_FLOOR) {
    console.error(`[test:compat] only ${lines.length} disabled compat rows — expected at least ${SNAPSHOT_ROW_FLOOR}.`);
    console.error('[test:compat] the snapshot half has no input left to compare. Did a `requires:`');
    console.error('[test:compat] declaration disappear? (If removed on purpose, lower SNAPSHOT_ROW_FLOOR.)');
    process.exit(1);
  }

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
