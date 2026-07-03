// Verify the no-ADE → est7 auto-route: emit every bundled sample scene via emitFusedHybrid
// and report which get estimator 7 (should be ONLY the no-analytic-derivative escape scenes —
// Oxnot/DsyneGrafix/Recycledrelatives — never box/Menger/IFS which supply a usable dr).
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';

const b64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));
let n7 = 0;
console.log('scene                              estimator  slots');
for (const sc of MB3D_SAMPLE_SCENES) {
  try {
    const parsed = parseMB3DBinary(b64(sc.b64), sc.name);
    const { def, ledger } = emitFusedHybrid(parsed);
    if (!def) { console.log(`${sc.name.padEnd(34)} (unsupported: ${ledger.reasons.join('; ').slice(0, 30)})`); continue; }
    const est = (def.defaultPreset as any)?.features?.quality?.estimator ?? '?';
    const slots = (ledger.slotFlags ?? []).map((s: any) => s.name).join('+');
    const mark = est === 7 || est === 7.0 ? '  ← EST7 (no-ADE)' : '';
    if (est === 7 || est === 7.0) n7++;
    console.log(`${sc.name.padEnd(34)} ${String(est).padEnd(10)} ${slots}${mark}`);
  } catch (e: any) {
    console.log(`${sc.name.padEnd(34)} ERROR ${e?.message?.slice(0, 40)}`);
  }
}
console.log(`\n${n7} scene(s) auto-routed to est7.`);
