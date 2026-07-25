/**
 * Smoke for the modulation DOUBLE-WRITER guard in the DDFS auto-setter.
 *
 * Two writers target the same uniform: this setter (on every slider move) and
 * AnimationSystem's tick (once per frame, writing base+offset). The setter used
 * to emit the RAW base, so dragging a slider on a modulated param made the
 * uniform alternate between `base` and `base+offset` — a flicker at roughly
 * half the frame rate, reported as "the modulation only applies every second
 * frame".
 *
 * The fix composes the live offset into the setter's emit so both writers agree.
 * Composing rather than suppressing is load-bearing: on a silent audio input
 * the tick sees no offset change and never resets accumulation, so suppressing
 * the emit would leave the drag painting nothing.
 *
 *   tsx debug/test-modulated-setter.mts
 */

import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';
import { featureRegistry } from '../engine/FeatureSystem';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';

// GMT's feature set must be registered before the store builds its slices —
// createFeatureSlice freezes the registry on first construction.
registerFeatures();

const { useEngineStore } = await import('../store/engineStore');
const { modulationEngine } = await import('../engine/features/modulation/ModulationEngine');

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};

/** Capture uniform emits for one setter call. */
function captureUniforms(fn: () => void): Map<string, any> {
  const seen = new Map<string, any>();
  const off = FractalEvents.on(FRACTAL_EVENTS.UNIFORM, ({ key, value }: any) => seen.set(key, value));
  try { fn(); } finally { off(); }
  return seen;
}

// Find real targets from the live registry rather than hardcoding names, so a
// param rename can't quietly turn this test into a no-op.
const feats = featureRegistry.getAll();
let scalar: { featId: string; key: string; uniform: string } | null = null;
let vec: { featId: string; key: string; uniform: string } | null = null;
for (const f of feats) {
  for (const [key, c] of Object.entries(f.params) as [string, any][]) {
    if (!c.uniform || c.composeFrom) continue;
    if (!scalar && c.type === 'float') scalar = { featId: f.id, key, uniform: c.uniform };
    if (!vec && c.type === 'vec3') vec = { featId: f.id, key, uniform: c.uniform };
  }
  if (scalar && vec) break;
}

const setterFor = (featId: string) =>
  (useEngineStore.getState() as any)[`set${featId.charAt(0).toUpperCase()}${featId.slice(1)}`];

// --- 1: unmodulated param emits the bare base (no behaviour change)
console.log('\n[1] unmodulated param is untouched');
if (!scalar) {
  assert(false, 'found a float param with a uniform to test');
} else {
  modulationEngine.resetOffsets();
  const seen = captureUniforms(() => setterFor(scalar!.featId)({ [scalar!.key]: 0.75 }));
  assert(seen.get(scalar.uniform) === 0.75,
    `${scalar.featId}.${scalar.key} emits the raw value when unmodulated`, seen.get(scalar.uniform));
}

// --- 2: the reported flicker — a modulated scalar composes the offset
console.log('\n[2] modulated scalar emits base + offset');
if (scalar) {
  modulationEngine.resetOffsets();
  modulationEngine.offsets[`${scalar.featId}.${scalar.key}`] = 0.5;
  const seen = captureUniforms(() => setterFor(scalar!.featId)({ [scalar!.key]: 2 }));
  assert(seen.get(scalar.uniform) === 2.5,
    'setter agrees with the tick instead of racing it', seen.get(scalar.uniform));

  // A zero offset must still take the composed path — a signal momentarily at
  // silence must not flip the writer back to raw-base for a frame.
  modulationEngine.resetOffsets();
  modulationEngine.offsets[`${scalar.featId}.${scalar.key}`] = 0;
  const seenZero = captureUniforms(() => setterFor(scalar!.featId)({ [scalar!.key]: 2 }));
  assert(seenZero.get(scalar.uniform) === 2,
    'a zero offset composes to the base (no flip-flop at silence)', seenZero.get(scalar.uniform));
}

// --- 3: vec params compose per axis, and only the modulated axes move
console.log('\n[3] modulated vec composes per axis');
if (!vec) {
  assert(false, 'found a vec3 param with a uniform to test');
} else {
  modulationEngine.resetOffsets();
  modulationEngine.offsets[`${vec.featId}.${vec.key}_x`] = 0.1;
  modulationEngine.offsets[`${vec.featId}.${vec.key}_y`] = 0.2;
  const seen = captureUniforms(() =>
    setterFor(vec!.featId)({ [vec!.key]: { x: 1, y: 1, z: 1 } }));
  const v: any = seen.get(vec.uniform);
  assert(!!v, 'vec uniform was emitted', v);
  if (v) {
    assert(Math.abs(v.x - 1.1) < 1e-9, 'x axis composed', v.x);
    assert(Math.abs(v.y - 1.2) < 1e-9, 'y axis composed — BOTH axes, not just the last', v.y);
    assert(Math.abs(v.z - 1.0) < 1e-9, 'unmodulated axis left at base', v.z);
  }

  // The store's own vector instance must not be mutated by the compose.
  const live: any = (useEngineStore.getState() as any)[vec.featId][vec.key];
  assert(Math.abs(live.x - 1) < 1e-9 && Math.abs(live.y - 1) < 1e-9,
    'store vector is not mutated by the compose (clone, not in-place)', live);
}

modulationEngine.resetOffsets();
console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
