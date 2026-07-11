// Audit authored step/DE header fields across all bundled MB3D scenes, to
// calibrate a fudgeFactor floor that stops too-small authored steps blacking
// out (Theli-At / Hal-Tenny) without disturbing the certified scenes.
// Run: npx tsx debug/mb3d-fudge-audit.mts
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

const rows: Array<{ name: string; zStepDiv: number; deStop: number; rStop: number; iOpt: number; fudge: number }> = [];
for (const s of MB3D_SAMPLE_SCENES) {
  const sc = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
  const h = sc.header as any;
  // Mirror emitFusedHybrid's fudge derivation (pre-clamp), then the current [0.01,1] clamp.
  let mb3dSZ = Math.max(0.0001, h.zStepDiv > 0 ? h.zStepDiv : 0.5);
  if ((h.iOptions & 4) !== 0) mb3dSZ = mb3dSZ * mb3dSZ + 1.2 * mb3dSZ * (1 - mb3dSZ);
  const fudge = Math.min(1.0, Math.max(0.01, mb3dSZ));
  rows.push({ name: s.name, zStepDiv: h.zStepDiv, deStop: h.deStop, rStop: h.rStop, iOpt: h.iOptions, fudge });
}
rows.sort((a, b) => a.fudge - b.fudge);
console.log('fudge   zStepDiv  deStop   rStop     iOpt   scene');
for (const r of rows) {
  console.log(
    `${r.fudge.toFixed(3)}  ${String(r.zStepDiv).padEnd(8)}  ${String(r.deStop).padEnd(6)}  ${String(r.rStop).padEnd(8)}  ${String(r.iOpt).padEnd(5)}  ${r.name}`,
  );
}
