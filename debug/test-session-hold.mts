/**
 * Smoke for `FeatureDefinition.holdsLiveSession` — the live-session hold in
 * applyPresetState.
 *
 * The contract under test (see FeatureSystem.ts + utils/PresetLogic.ts):
 * a feature reporting `holdsLiveSession() === true` is skipped ENTIRELY by a
 * full preset application, so a scene load / formula switch can neither
 * overwrite it from the file nor reset it to param defaults when the file
 * omits the feature. It must report FALSE while idle, or scene-saved session
 * state could never be loaded at all.
 *
 * Motivating case: VJ use. Loading a new fractal mid-set used to switch the
 * audio engine off (`audio.isEnabled` fell back to its `false` default) and
 * wipe every modulation link (`modulation.rules` → `[]`), because almost no
 * scene carries audio data.
 *
 *   tsx debug/test-session-hold.mts
 */

import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';
import { featureRegistry } from '../engine/FeatureSystem';

registerFeatures();

const { applyPresetState } = await import('../utils/PresetLogic');

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};

/** Fresh fake store: every feature seeded to its declared defaults, plus the
 *  auto-setter convention applyPresetState derives by name. */
function makeStore(): any {
  const store: any = {
    animations: [],
    lfosEnabled: true,
    setAnimations: (v: any) => { store.animations = v; },
    setLfosEnabled: (v: any) => { store.lfosEnabled = v; },
  };
  for (const feat of featureRegistry.getAll()) {
    const initial: Record<string, any> = { ...(feat.state ?? {}) };
    for (const [key, config] of Object.entries(feat.params)) {
      if (initial[key] === undefined) initial[key] = (config as any).default;
    }
    store[feat.id] = initial;
    const setterName = `set${feat.id.charAt(0).toUpperCase()}${feat.id.slice(1)}`;
    store[setterName] = (updates: Record<string, any>) => {
      store[feat.id] = { ...store[feat.id], ...updates };
    };
  }
  return store;
}

const apply = (store: any, preset: any) =>
  applyPresetState(preset, (partial) => Object.assign(store, partial), () => store);

const RULE = {
  id: 'rule-kick', target: 'coreMath.paramA', source: 'audio', enabled: true,
  color: '#ef4444', lowHz: 0, highHz: 960, thresholdMin: 0.1, thresholdMax: 1,
  attack: 0.1, decay: 0.3, smoothing: 0, gain: 3.5, offset: 0,
};

// --- 1: the reported bug — a scene with NO audio data must not disarm a live rig
console.log('\n[1] live rig survives a scene that omits audio/modulation');
{
  const s = makeStore();
  s.audio = { ...s.audio, isEnabled: true, gain: 1.4, smoothing: 0.65 };
  s.modulation = { rules: [RULE], selectedRuleId: RULE.id };

  apply(s, { formula: 'Mandelbulb', features: { coloring: { repeats: 3 } } });

  assert(s.audio.isEnabled === true, 'audio engine stays enabled', s.audio.isEnabled);
  assert(s.audio.gain === 1.4 && s.audio.smoothing === 0.65, 'audio engine settings kept');
  assert(s.modulation.rules.length === 1, 'modulation rule kept', s.modulation.rules.length);
  assert(s.modulation.rules[0].gain === 3.5, 'rule gain/band untouched');
  assert(s.coloring.repeats === 3, 'the rest of the scene still loads normally', s.coloring.repeats);
}

// --- 2: a scene that DOES carry audio data still cannot clobber a live rig
console.log('\n[2] live rig wins over scene-borne audio data');
{
  const s = makeStore();
  s.audio = { ...s.audio, isEnabled: true };
  s.modulation = { rules: [RULE], selectedRuleId: RULE.id };

  apply(s, {
    formula: 'Mandelbulb',
    features: {
      audio: { isEnabled: false, gain: 0.1 },
      modulation: { rules: [], selectedRuleId: null },
    },
  });

  assert(s.audio.isEnabled === true, 'scene cannot switch the running engine off');
  assert(s.modulation.rules.length === 1, 'scene cannot wipe the live links');
}

// --- 3: the boot / share-link path — an IDLE rig loads from the file
console.log('\n[3] idle rig hydrates from the scene (boot + share links)');
{
  const s = makeStore();
  assert(s.audio.isEnabled === false, 'precondition: rig starts idle');

  apply(s, {
    formula: 'Mandelbulb',
    features: {
      audio: { isEnabled: true, gain: 1.1 },
      modulation: { rules: [RULE], selectedRuleId: RULE.id },
    },
  });

  assert(s.audio.isEnabled === true, 'scene-saved audio rig loads', s.audio.isEnabled);
  assert(s.audio.gain === 1.1, 'scene-saved audio settings load');
  assert(s.modulation.rules.length === 1, 'scene-saved links load', s.modulation.rules.length);
}

// --- 4: an idle rig is still reset to defaults by a scene that omits audio
console.log('\n[4] idle rig follows normal preset semantics');
{
  const s = makeStore();
  s.modulation = { rules: [RULE], selectedRuleId: RULE.id }; // links but engine OFF

  apply(s, { formula: 'Mandelbulb', features: {} });

  assert(s.modulation.rules.length === 0,
    'links from a non-performing session are scene-driven as before', s.modulation.rules.length);
}

// --- 5: the hold is opt-in — no other feature may declare it by accident
console.log('\n[5] hold is scoped to the audio rig');
{
  const holders = featureRegistry.getAll()
    .filter((f) => typeof (f as any).holdsLiveSession === 'function')
    .map((f) => f.id)
    .sort();
  assert(
    holders.length === 2 && holders[0] === 'audio' && holders[1] === 'modulation',
    'exactly audio + modulation declare holdsLiveSession', holders,
  );
}

console.log(`\n${failures === 0 ? '✓ all assertions passed' : `✗ ${failures} assertion(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
