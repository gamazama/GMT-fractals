/**
 * paletteEditorStore harness — verifies the Stops mode's GradientConfig
 * round-trips losslessly through both the undo provider and the scene document
 * provider, and that the deserialization gate rejects garbage.
 *
 * Tests the PURE core (palette/core/editorConfig) the store wraps — capture =
 * serializeEditorConfig, restore = coerceGradientConfig — so it runs in node
 * without pulling in the engine store. The provider pair registered in
 * registerPaletteUI uses exactly these.
 *
 * Run: npx tsx debug/test-palette-editorstore.mts
 */

import {
  makeDefaultEditorConfig,
  coerceGradientConfig,
  serializeEditorConfig,
} from '../palette/core/editorConfig';
import type { GradientConfig } from '../types';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); }
  else console.log('  ✓ ' + msg);
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log('paletteEditorStore (editorConfig core):');

// 1) Document round-trip — serialize → JSON (file) → coerce reproduces the config
//    byte-for-byte. Mirrors save → reload (JSON / GMF / PNG iTXt all JSON the Preset).
{
  const cfg = makeDefaultEditorConfig();
  const onDisk = JSON.parse(JSON.stringify(serializeEditorConfig(cfg)));
  const restored = coerceGradientConfig(onDisk);
  ok(restored !== null && eq(restored, cfg), 'default config round-trips through serialize → JSON → coerce');
}

// 2) Undo determinism — capture A, edit to B, restore the captured A snapshot →
//    exactly A. The history provider clones via JSON, so go through that path.
{
  const a = makeDefaultEditorConfig();
  const snapA = JSON.parse(JSON.stringify(serializeEditorConfig(a))); // provider capture + historySlice clone
  const b: GradientConfig = {
    stops: [
      { id: 'x', position: 0, color: '#112233', bias: 0.5, interpolation: 'linear' },
      { id: 'y', position: 1, color: '#445566', bias: 0.5, interpolation: 'step' },
    ],
    colorSpace: 'linear',
    blendSpace: 'rgb',
  };
  // (b is a distinct edit)
  ok(!eq(a, b), 'edit changes the config (precondition)');
  const restored = coerceGradientConfig(snapA);
  ok(restored !== null && eq(restored, a), 'restore(capture(A)) deep-equals A (undo determinism)');
  // Idempotent: restoring twice yields the same result.
  ok(eq(coerceGradientConfig(snapA), restored), 'restore is idempotent');
}

// 3) serialize is a DEEP CLONE — mutating the snapshot can't corrupt the live config.
{
  const cfg = makeDefaultEditorConfig();
  const snap = serializeEditorConfig(cfg) as unknown as GradientConfig;
  snap.stops[0].color = '#DEAD00';
  snap.stops.push({ id: 'z', position: 0.7, color: '#000000' });
  ok(cfg.stops[0].color !== '#DEAD00' && cfg.stops.length === 3, 'serialize deep-clones (snapshot mutation is isolated)');
}

// 4) Garbage rejection — the untrusted-deserialization gate is a safe no-op (null).
{
  const garbage: unknown[] = [
    null, undefined, 42, 'nope', [], {}, { stops: 'no' }, { stops: [] },
    { stops: [{ position: 0, color: '#fff' }] },           // only 1 valid stop (< 2)
    { stops: [{ color: '#fff' }, { color: '#000' }] },     // no positions
    { stops: [{ position: 0, color: 'red' }, { position: 1, color: 'blue' }] }, // bad colours
  ];
  const allNull = garbage.every((g) => coerceGradientConfig(g) === null);
  ok(allNull, 'garbage / malformed snapshots → null, never throw');

  // Prototype-pollution: a hostile snapshot (parsed from JSON, so __proto__ is an
  // OWN key) can't inject keys into the coerced result — it's built from scratch.
  const poison = JSON.parse('{"stops":[{"position":0,"color":"#fff"},{"position":1,"color":"#000"}],"__proto__":{"polluted":true}}');
  const r = coerceGradientConfig(poison);
  ok(r !== null && !('polluted' in r) && !('polluted' in ({} as Record<string, unknown>)), 'no prototype pollution leaked into the result or Object');
}

// 5) Normalisation — drops bad stops, fills ids, clamps bias, upper-cases hex,
//    falls back invalid colorSpace/blendSpace to defaults.
{
  const messy = {
    stops: [
      { position: -0.5, color: '#abcdef', bias: 9 },         // pos clamps to 0, bias clamps to 1, id filled
      { position: 2, color: 'garbage' },                      // dropped (bad colour)
      { position: 0.5, color: '#0f0', interpolation: 'wat' }, // 3-digit hex ok, bad interp → linear
      { position: 1, color: '#123456', bias: 0.25, interpolation: 'smooth' },
    ],
    colorSpace: 'banana',
    blendSpace: 'oklab',
  };
  const r = coerceGradientConfig(messy);
  ok(r !== null, 'messy config coerces (≥ 2 valid stops survive)');
  if (r) {
    ok(r.stops.length === 3, 'invalid-colour stop dropped (4 → 3)');
    ok(r.stops[0].position === 0 && r.stops[0].bias === 1, 'position/bias clamped to [0,1]');
    ok(r.stops[0].color === '#ABCDEF', 'hex upper-cased');
    ok(typeof r.stops[0].id === 'string' && r.stops[0].id.length > 0, 'missing id filled');
    ok((r.stops[1].interpolation ?? 'linear') === 'linear', 'invalid interpolation dropped (→ undefined/linear)');
    ok(r.colorSpace === 'srgb', 'invalid colorSpace → srgb default');
    ok(r.blendSpace === 'oklab', 'valid blendSpace preserved');
  }
}

// 6) Duplicate stop ids (hostile / hand-edited scene) are made unique — the editor
//    keys knots by id, so a repeat would act on the wrong knot.
{
  const dupes = {
    stops: [
      { id: 'a', position: 0, color: '#000000' },
      { id: 'a', position: 0.5, color: '#888888' },
      { id: 'a', position: 1, color: '#ffffff' },
    ],
    colorSpace: 'srgb',
    blendSpace: 'oklab',
  };
  const r = coerceGradientConfig(dupes);
  ok(r !== null, 'duplicate-id config still coerces');
  if (r) {
    const ids = r.stops.map((s) => s.id);
    ok(new Set(ids).size === ids.length, `stop ids made unique (${ids.join(',')})`);
  }
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
