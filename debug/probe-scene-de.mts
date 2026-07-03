import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
for (const nm of ['theli', 'hyperben', 'genetic', 'menger trees', 'tree planet']) {
  const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes(nm));
  if (!s) continue;
  const bytes = decodeSampleScene(s.b64);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const iterations = dv.getInt32(12, true);
  const dZoom = dv.getFloat64(84, true);
  const RStop = dv.getFloat64(92, true);
  const minIt = dv.getUint16(135, true);
  const sDEstop = dv.getFloat32(177, true);
  const mZstepDiv = dv.getFloat32(182, true);
  const stepsAfter = dv.getUint8(134);
  console.log(`${s.name.padEnd(26)} iters=${iterations} minIt=${minIt} RStop=${RStop.toFixed(3)} DEstop=${sDEstop.toExponential(2)} ZstepDiv=${mZstepDiv.toFixed(3)} stepsAfter=${stepsAfter} zoom=${dZoom.toFixed(2)}`);
}
