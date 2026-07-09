/**
 * Probe: building a SINGLE formula under the Live (modulo) schedule must yield
 * that formula (emit degrades to the plain counts path) instead of erroring —
 * the Weave Editor now defaults new drafts to Live, so this is the first Build
 * a new user hits. Also regression-checks the 2-slot Live build.
 * Run: npx tsx debug/probe-live-single.mts
 */
import { buildWeaveDef } from '../engine-gmt/utils/mb3d/loadMB3DScene.ts';
import { nativeSlotShell } from '../engine-gmt/engine/weave/nativeSlotCatalog.ts';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { Mandelbulb } from '../engine-gmt/formulas/Mandelbulb.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import type { FractalDefinition } from '../engine-gmt/types/fractal.ts';

registry.register(Mandelbulb);
registry.register(AmazingBox);

let pass = 0; const fails: string[] = [];
const ck = (name: string, cond: boolean) => { if (cond) pass++; else fails.push(name); };

type WeaveSource = NonNullable<FractalDefinition['weaveSource']>;

function buildLive(ids: string[]) {
  const rows = ids.map((id) => {
    const def = registry.get(id)!;
    return { label: def.name ?? id, kind: 'native' as const, ref: id, slot: nativeSlotShell(id, 2) };
  });
  const title = rows.map((r) => r.label).join(' × ');
  const ws: WeaveSource = {
    version: 1, title,
    slots: rows.map((r) => ({ label: r.label, kind: r.kind, ref: r.ref, slot: { ...r.slot } })),
    // Live schedule exactly as the editor emits it: layers = every non-base slot.
    schedule: { kind: 'modulo', layers: rows.slice(1).map((_, j) => ({ interval: 1, startIter: j + 1, beats: 2 })) },
  };
  return buildWeaveDef(rows.map((r) => r.slot), title, ws, 0);
}

// 1 formula in Live — the fixed case.
const single = buildLive(['Mandelbulb']);
ck('single-slot Live build ok', single.ok);
ck('single-slot Live: no reasons', single.ledger.reasons.length === 0);
if (single.ok) {
  ck('single-slot def registered', !!registry.get(single.def.id));
  ck('single-slot weaveSource kept (kind stays modulo for re-edit)', single.def.weaveSource?.schedule.kind === 'modulo');
  const glsl = JSON.stringify(single.def.shader ?? '');
  ck('single-slot shader has no layer dispatch (degraded to plain path)', !glsl.includes('uWeaveInterval'));
}

// 2 formulas in Live — regression: the real layered path still builds.
const dual = buildLive(['Mandelbulb', 'AmazingBox']);
ck('two-slot Live build ok', dual.ok);
if (dual.ok) {
  const glsl = JSON.stringify(dual.def.shader ?? '');
  ck('two-slot shader HAS the layer dispatch', glsl.includes('uWeaveInterval'));
  ck('two-slot rhythm state stamped into preset', !!(dual.def.defaultPreset?.features as any)?.weave?.weaveInterval1);
}

console.log(`\n==== Live single-formula probe: ${pass} passed, ${fails.length} failed ====`);
if (fails.length) { console.log('FAILED:', fails.join(', ')); process.exit(1); }
