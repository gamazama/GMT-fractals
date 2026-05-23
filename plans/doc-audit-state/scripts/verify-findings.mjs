#!/usr/bin/env node
// verify-findings.mjs
// Verifies the status of the 11 audit findings the user is tracking:
//   - 5 production bugs from the related-findings map
//   - 5 refactor recommendations from HEALTH.md Pool 6
//   - 1 coverage-gap measure
//
// Output: stdout markdown table. Exit 0.
//
// Each check is a small grep / file probe — no semantic verification. Returns
// one of: DONE | PARTIAL | OPEN | UNKNOWN. Use this after fixing items to
// see what's verifiably resolved.
//
// Add a finding: append to FINDINGS below with id + description + check().
// Re-run via `npm run verify-findings`.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

function read(rel) {
  const abs = resolve(REPO_ROOT, rel);
  try { return readFileSync(abs, 'utf8'); } catch { return null; }
}

function exists(rel) {
  return existsSync(resolve(REPO_ROOT, rel));
}

// ── Findings registry ───────────────────────────────────────────────────────

const FINDINGS = [
  // ── Production bugs ──
  {
    id: 'q-002',
    category: 'bug',
    description: 'Splash timeout silent failure (GmtRendererTickDriver)',
    check() {
      const src = read('engine-gmt/renderer/GmtRendererTickDriver.tsx');
      if (!src) return { status: 'UNKNOWN', evidence: 'file not found' };
      const hasOldTimeout = /setTimeout\([^,]+,\s*30000\)/.test(src);
      const hasEventSub = /WORKER_BOOTED|WORKER_BOOT_FAILED/.test(src);
      if (hasOldTimeout) return { status: 'OPEN', evidence: '30s setTimeout still present' };
      if (hasEventSub) return { status: 'DONE', evidence: 'replaced by event-driven WORKER_BOOTED/WORKER_BOOT_FAILED handling' };
      return { status: 'PARTIAL', evidence: 'timeout removed but no event-driven replacement found' };
    },
  },
  {
    id: 'q-094',
    category: 'bug',
    description: 'HALF_FLOAT alpha fallback unwired in RenderPipeline',
    check() {
      const pipeline = read('engine/RenderPipeline.ts');
      const proxyStub = read('engine/worker/WorkerProxy.ts');
      if (!pipeline || !proxyStub) return { status: 'UNKNOWN', evidence: 'file(s) not found' };
      const probeCalled = /checkHalfFloatAlphaSupport\s*\(/.test(pipeline);
      const stillStub = /checkHalfFloatAlphaSupport\s*\(\s*\)\s*\{\s*return\s+true\s*;?\s*\}/.test(proxyStub);
      if (probeCalled && !stillStub) return { status: 'DONE', evidence: 'probe wired into RenderPipeline + WorkerProxy returns real value' };
      if (probeCalled && stillStub) return { status: 'PARTIAL', evidence: 'probe called in RenderPipeline but WorkerProxy still stubs return true' };
      return { status: 'OPEN', evidence: 'probe not called from RenderPipeline; stub returns true unconditionally' };
    },
  },
  {
    id: 'q-075',
    category: 'bug',
    description: 'AudioPanel green pulse binds to isEnabled instead of isMicActive',
    check() {
      const src = read('engine/features/audioMod/AudioPanel.tsx');
      if (!src) return { status: 'UNKNOWN', evidence: 'AudioPanel.tsx not found' };
      const pulseLine = src.split('\n').find(l => /animate-pulse/.test(l));
      if (!pulseLine) return { status: 'UNKNOWN', evidence: 'animate-pulse class not found' };
      if (/isMicActive/.test(pulseLine)) return { status: 'DONE', evidence: 'pulse now binds to isMicActive' };
      if (/isEnabled/.test(pulseLine)) return { status: 'OPEN', evidence: `pulse still binds to isEnabled: ${pulseLine.trim().slice(0, 100)}` };
      return { status: 'PARTIAL', evidence: 'pulse binding changed but unfamiliar field' };
    },
  },
  {
    id: 'q-115',
    category: 'bug',
    description: 'meshExportStore resetMeshResult does not reset useNarrowBand',
    check() {
      const src = read('mesh-export/store/meshExportStore.ts');
      if (!src) return { status: 'UNKNOWN', evidence: 'meshExportStore.ts not found' };
      const resetMatch = src.match(/resetMeshResult:\s*\(\)\s*=>\s*set\(\{([^}]+)\}/s);
      if (!resetMatch) return { status: 'UNKNOWN', evidence: 'resetMeshResult block not found' };
      const resetBlock = resetMatch[1];
      const hasNarrowBand = /useNarrowBand/.test(resetBlock);
      const hasOtherFields = /lastTimings|smoothingSkipped|logEntries/.test(resetBlock);
      if (hasNarrowBand) return { status: 'DONE', evidence: 'resetMeshResult resets useNarrowBand' };
      if (hasOtherFields) return { status: 'PARTIAL', evidence: 'resets timing/log fields but not useNarrowBand' };
      return { status: 'OPEN', evidence: 'resetMeshResult still minimal' };
    },
  },
  {
    id: 'q-077',
    category: 'bug',
    description: 'AudioPanel (store as any) casts not converted to @ts-expect-error',
    check() {
      const src = read('engine/features/audioMod/AudioPanel.tsx');
      if (!src) return { status: 'UNKNOWN', evidence: 'AudioPanel.tsx not found' };
      const rawCastCount = (src.match(/\(store as any\)/g) || []).length;
      const expectErrorCount = (src.match(/@ts-expect-error/g) || []).length;
      if (rawCastCount === 0) return { status: 'DONE', evidence: 'no raw (store as any) casts remain' };
      if (rawCastCount > 0 && expectErrorCount > 0) return { status: 'PARTIAL', evidence: `${rawCastCount} raw casts + ${expectErrorCount} @ts-expect-error markers (mixed state)` };
      return { status: 'OPEN', evidence: `${rawCastCount} raw (store as any) cast(s) remain` };
    },
  },

  // ── Refactor recommendations ──
  {
    id: 'R1',
    category: 'refactor',
    description: 'WorkerProxy<TRenderState> generic param',
    check() {
      const src = read('engine/worker/WorkerProxy.ts');
      if (!src) return { status: 'UNKNOWN', evidence: 'WorkerProxy.ts not found' };
      const classDecl = src.match(/export class WorkerProxy(<[^>]+>)?\b/);
      if (!classDecl) return { status: 'UNKNOWN', evidence: 'WorkerProxy class declaration not found' };
      if (classDecl[1]) return { status: 'DONE', evidence: `class declared with generic: ${classDecl[0]}` };
      return { status: 'OPEN', evidence: 'no generic param on WorkerProxy class' };
    },
  },
  {
    id: 'R2',
    category: 'refactor',
    description: 'Drop cameraSlots `as any` cast (Camera plugin)',
    check() {
      const src = read('engine/plugins/Camera.ts');
      if (!src) return { status: 'UNKNOWN', evidence: 'Camera.ts not found' };
      const casts = src.match(/cameraSlots[\s\S]{0,80}as any|as any[\s\S]{0,80}cameraSlots/g) || [];
      if (casts.length === 0) return { status: 'DONE', evidence: 'no `as any` casts around cameraSlots' };
      return { status: 'OPEN', evidence: `${casts.length} cast(s) remain` };
    },
  },
  {
    id: 'R3',
    category: 'refactor',
    description: 'Relocate LoadingRenderer* from engine-gmt to app-gmt',
    check() {
      const enginegmtCpu = exists('engine-gmt/engine/LoadingRendererCPU.ts');
      const enginegmtWebgl = exists('engine-gmt/engine/LoadingRenderer.ts');
      const appgmtCpu = exists('app-gmt/LoadingRendererCPU.ts');
      const appgmtWebgl = exists('app-gmt/LoadingRenderer.ts');
      if (!enginegmtCpu && !enginegmtWebgl && (appgmtCpu || appgmtWebgl)) return { status: 'DONE', evidence: 'engine-gmt copy removed, app-gmt copy present' };
      if (appgmtCpu || appgmtWebgl) return { status: 'PARTIAL', evidence: 'app-gmt copy present but engine-gmt also still has copy' };
      return { status: 'OPEN', evidence: 'still at engine-gmt path' };
    },
  },
  {
    id: 'R4',
    category: 'refactor',
    description: 'Relocate ViewportRefs.ts from engine/worker to engine/viewport',
    check() {
      const oldPath = exists('engine/worker/ViewportRefs.ts');
      const newPath = exists('engine/viewport/ViewportRefs.ts');
      if (!oldPath && newPath) return { status: 'DONE', evidence: 'moved to engine/viewport/' };
      if (oldPath && newPath) return { status: 'PARTIAL', evidence: 'both old and new paths exist' };
      return { status: 'OPEN', evidence: 'still at engine/worker/ViewportRefs.ts' };
    },
  },
  {
    id: 'R5',
    category: 'refactor',
    description: 'PreviewCanvas split (mesh-export)',
    check() {
      const monolith = exists('mesh-export/preview/PreviewCanvas.tsx');
      const previewSplit = exists('mesh-export/preview/mesh-preview.ts') && exists('mesh-export/preview/preview-camera.ts');
      const newComponent = exists('mesh-export/components/PreviewCanvas.tsx');
      if (!monolith && (previewSplit || newComponent)) return { status: 'DONE', evidence: 'original monolith removed, split files present' };
      if (monolith && previewSplit) return { status: 'PARTIAL', evidence: 'monolith still exists alongside split files' };
      return { status: 'OPEN', evidence: 'monolith still at mesh-export/preview/PreviewCanvas.tsx' };
    },
  },

  // ── Coverage closure ──
  {
    id: 'coverage',
    category: 'coverage',
    description: 'Coverage gap closure (baseline 219 truly-unclaimed)',
    check() {
      const out = spawnSync('node', [resolve(__dirname, 'reconcile-coverage.mjs')], { encoding: 'utf8' });
      if (out.status !== 0) return { status: 'UNKNOWN', evidence: `reconcile-coverage exit ${out.status}` };
      try {
        const json = JSON.parse(out.stdout);
        const trulyUnclaimed = json.classified?.truly_unclaimed ?? -1;
        const baseline = 219;
        const delta = baseline - trulyUnclaimed;
        if (trulyUnclaimed <= 0) return { status: 'DONE', evidence: `all closed (${trulyUnclaimed} unclaimed)` };
        if (delta >= 50) return { status: 'PARTIAL', evidence: `${trulyUnclaimed} unclaimed (closed ${delta} from baseline 219)` };
        if (delta > 0) return { status: 'PARTIAL', evidence: `${trulyUnclaimed} unclaimed (closed ${delta}, marginal progress)` };
        return { status: 'OPEN', evidence: `${trulyUnclaimed} unclaimed (no change from baseline 219)` };
      } catch (e) {
        return { status: 'UNKNOWN', evidence: 'reconcile-coverage output unparseable' };
      }
    },
  },
];

// ── Run all checks and print a markdown table ──────────────────────────────

const STATUS_GLYPH = {
  DONE: '✅',
  PARTIAL: '🟡',
  OPEN: '❌',
  UNKNOWN: '⚪',
};

const results = FINDINGS.map(f => ({ ...f, ...f.check() }));

const byStatus = results.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});

const lines = [];
lines.push(`# Audit findings — verification snapshot`);
lines.push('');
lines.push(`_Generated: ${new Date().toISOString()}. Re-run via \`npm run verify-findings\`._`);
lines.push('');
lines.push(`**Summary:** ${byStatus.DONE || 0} done · ${byStatus.PARTIAL || 0} partial · ${byStatus.OPEN || 0} open · ${byStatus.UNKNOWN || 0} unknown · ${results.length} total`);
lines.push('');
lines.push('| | ID | Category | Description | Evidence |');
lines.push('|---|---|---|---|---|');
for (const r of results) {
  lines.push(`| ${STATUS_GLYPH[r.status]} ${r.status} | \`${r.id}\` | ${r.category} | ${r.description} | ${r.evidence} |`);
}
lines.push('');
lines.push(`_Add new findings: append to the \`FINDINGS\` array in \`plans/doc-audit-state/scripts/verify-findings.mjs\` with id + description + check() returning {status, evidence}._`);
lines.push('');

process.stdout.write(lines.join('\n'));
