import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../engine-gmt/utils/mb3d/sampleScenes.ts';
import { parseMB3DBinary } from '../engine-gmt/utils/mb3d/parseMB3D.ts';
import { buildWeaveSequence, stepSlot, emitWeaveGLSL } from '../engine-gmt/utils/mb3d/weaveSequencer.ts';

const f = (process.argv[2] ?? 'theli').toLowerCase();
const s = MB3D_SAMPLE_SCENES.find((x) => x.name.toLowerCase().includes(f))!;
const p = parseMB3DBinary(decodeSampleScene(s.b64), s.name);
const plan = buildWeaveSequence(p.addon!);
console.log('mode:', plan.mode, 'hasSilent:', (plan as any).hasSilent, 'order length:', plan.order.length);
const slots = plan.order.map(stepSlot);
console.log('order (slot idx per iteration):', slots.join(''));
const counts: Record<number, number> = {};
for (const k of slots) counts[k] = (counts[k] || 0) + 1;
console.log('dispatch counts over one cycle:', JSON.stringify(counts));
const weave = emitWeaveGLSL(plan, 'X');
console.log('weave GLSL fn:\n', weave.glsl.slice(0, 400));
