// Dump the Oxnot-Shells scene constants needed to make the numeric-DE CPU sim faithful:
// iterations, rStop (bailout), deStop, zStepDiv, zoom, width, camera, world rotation,
// bInsideRendering (iOptions/bNewOptions), and the PseudoXDB Z-multiplier option.
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { MB3D_SAMPLE_SCENES } from '../engine-gmt/utils/mb3d/sampleScenes.ts';

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const scene = MB3D_SAMPLE_SCENES.find((s) => s.name === 'Oxnot - Shells')!;
const parsed = parseMB3DBinary(b64ToBytes(scene.b64), scene.name);
const h = parsed.header;

console.log('=== Oxnot - Shells header ===');
console.log('iterations      :', h.iterations);
console.log('rStop (radius²?) :', h.rStop);
console.log('deStop          :', h.deStop);
console.log('zStepDiv        :', h.zStepDiv);
console.log('zoom            :', h.zoom, '  → StepWidth = 2.1345/(zoom·width) =', 2.1345 / (h.zoom * h.width));
console.log('width x height  :', h.width, 'x', h.height);
console.log('iOptions        :', h.iOptions, ' (0x' + h.iOptions.toString(16) + ')');
console.log('bNewOptions     :', h.bNewOptions);
console.log('fovY            :', h.fovY);
console.log('midX/Y/Z        :', h.midX, h.midY, h.midZ);
console.log('dZstart/dZend   :', h.dZstart, h.dZend);
console.log('wRot X/Y/Z      :', h.wRotX, h.wRotY, h.wRotZ);
console.log('isJulia         :', h.isJulia, ' jx/jy/jz/jw:', h.jx, h.jy, h.jz, h.jw);
console.log('hVGrads (row-major 3x3):');
console.log('   ', h.hVGrads.slice(0, 3).map((v: number) => v.toFixed(5)).join('  '));
console.log('   ', h.hVGrads.slice(3, 6).map((v: number) => v.toFixed(5)).join('  '));
console.log('   ', h.hVGrads.slice(6, 9).map((v: number) => v.toFixed(5)).join('  '));

console.log('\n=== formula slots ===');
for (const s of parsed.addon?.slots ?? []) {
  if (!s.name && s.formulaIndex === -1) continue;
  console.log(`slot "${s.name}" idx=${s.formulaIndex} iters=${s.iterCount} optCount=${s.optionCount}`);
  console.log('   optionTypes :', s.optionTypes.slice(0, s.optionCount).join(', '));
  console.log('   optionValues:', s.optionValues.slice(0, s.optionCount).map((v) => v.toFixed(4)).join(', '));
}

// bOptions2 lives in the addon/CFA — the parse surfaces iOptions/bNewOptions; the
// bInsideRendering flag is (PCFA.bOptions2 and 6). Print raw addon options for inspection.
console.log('\n=== addon options ===');
console.log('options1/2/3    :', parsed.addon?.options1, parsed.addon?.options2, parsed.addon?.options3);
console.log('hybOpt1/2       :', parsed.addon?.hybOpt1, parsed.addon?.hybOpt2);
console.log('formulaCount    :', parsed.addon?.formulaCount);
