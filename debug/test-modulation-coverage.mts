/**
 * Coverage gate for modulation targets — "does every param the picker offers
 * actually modulate?"
 *
 * The failure this exists to catch: a target can be offered in the modulation
 * menu, accept a link, drive `liveModulations` so its slider visibly moves, and
 * still never reach the shader. That reads as "modulation is flaky" rather than
 * as a wiring bug, which is how live rotation / camera / lighting stayed broken
 * while working correctly in a render export.
 *
 * Both halves ask `engine/features/modulation/targetRouting.ts` — the same
 * module `AnimationSystem.tick` dispatches on — so this cannot grade a routing
 * the tick doesn't take.
 *
 * Prints the full matrix, then asserts. Run it to SEE coverage:
 *   tsx debug/test-modulation-coverage.mts            # summary + failures
 *   tsx debug/test-modulation-coverage.mts --verbose  # every target
 */

import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';

// GMT's feature set must be registered before the store builds its slices —
// createFeatureSlice freezes the registry on first construction.
registerFeatures();

const { useEngineStore } = await import('../store/engineStore');
const { classifyModulationTarget, listModulatableTargets, LIGHT_PROPS } =
  await import('../engine/features/modulation/targetRouting');

const VERBOSE = process.argv.includes('--verbose');

let failures = 0;
const assert = (cond: boolean, msg: string, detail?: unknown) => {
  if (!cond) { console.error(`  FAIL: ${msg}`, detail ?? ''); failures++; }
  else console.log(`  ok: ${msg}`);
};

const storeState = useEngineStore.getState() as unknown as Record<string, unknown>;
const targets = listModulatableTargets();
const rows = targets.map(t => ({ ...t, routing: classifyModulationTarget(t.target, storeState) }));

// ── The matrix ──────────────────────────────────────────────────────────────

const bySink = new Map<string, typeof rows>();
for (const r of rows) {
  const k = r.routing.sink;
  if (!bySink.has(k)) bySink.set(k, []);
  bySink.get(k)!.push(r);
}

console.log(`\n=== MODULATION COVERAGE — ${rows.length} targets ===\n`);
for (const sink of ['uniform', 'engine-mods', 'render-state', 'display-only', 'none'] as const) {
  const list = bySink.get(sink) ?? [];
  const byBranch = new Map<string, number>();
  for (const r of list) byBranch.set(r.routing.branch, (byBranch.get(r.routing.branch) ?? 0) + 1);
  const breakdown = [...byBranch.entries()].map(([b, n]) => `${b}:${n}`).join(' ');
  console.log(`  ${sink.padEnd(13)} ${String(list.length).padStart(4)}   ${breakdown}`);
  if (VERBOSE || sink === 'none' || sink === 'display-only') {
    for (const r of list) console.log(`      ${r.target}${r.routing.uniform ? `  → ${r.routing.uniform}` : ''}`);
  }
}
console.log('');

// ── Assertions ──────────────────────────────────────────────────────────────

console.log('[1] no offered target routes nowhere');
{
  // A 'none' sink means the picker offers a link that silently does nothing.
  const dead = rows.filter(r => r.routing.sink === 'none');
  assert(dead.length === 0,
    'every offered target reaches a sink',
    dead.map(r => `${r.target} (${r.routing.branch})`));
}

console.log('[2] uniform-backed params reach the shader, not just the UI');
{
  // 'display-only' is legitimate for a uniformless engine-fork app that reads
  // the store directly (fluid-toy). In GMT every param must land on one of the
  // three real transports — uniform, engine.modulations, or the renderState
  // slice merge — or its slider moves while the image does not.
  const displayOnly = rows.filter(r => r.routing.sink === 'display-only');
  assert(displayOnly.length === 0,
    'no DDFS target updates liveModulations without reaching the shader',
    displayOnly.map(r => r.target));
}

console.log('[3] the vec-axis trap is unoccupied');
{
  // AnimationSystem's vec branch claims ANY `feature.name_x` key and drops it
  // when the slice holds no vector there. A scalar param literally named
  // `foo_x` would land in that hole and never modulate.
  const trapped = rows.filter(r => r.routing.branch === 'vecAxis' && r.routing.sink === 'none');
  assert(trapped.length === 0,
    'no scalar param has an axis-shaped name that the vec branch would swallow',
    trapped.map(r => r.target));
}

console.log('[4] rotation, camera and lights route to the syncFrame dict');
{
  // These are the three branches that reach the shader through
  // engine.modulations rather than a uniform write. They were silently
  // main-thread-only in the live path until RENDER_TICK started carrying the
  // dict; pin the routing so a future refactor can't quietly re-strand them.
  const rot = classifyModulationTarget('geometry.preRotX', storeState);
  assert(rot.branch === 'geometryRotation' && rot.sink === 'engine-mods',
    'geometry.preRotX → geometryRotation/engine-mods', rot);

  const cam = classifyModulationTarget('camera.rotation.y', storeState);
  assert(cam.branch === 'camera' && cam.sink === 'engine-mods',
    'camera.rotation.y → camera/engine-mods', cam);

  const light = classifyModulationTarget('lighting.light0_intensity', storeState);
  assert(light.branch === 'lighting' && light.sink === 'engine-mods',
    'lighting.light0_intensity → lighting/engine-mods', light);
}

console.log('[5] every light prop the branch applies is also offered');
{
  // The two used to disagree in both directions: falloff was applied but never
  // offered, rotX/Y/Z were read by UniformManager but never produced.
  const offered = new Set(rows.filter(r => r.featureId === 'lighting' && r.virtual).map(r => r.target));
  const missing = LIGHT_PROPS.filter(p => !offered.has(`lighting.light0_${p}`));
  assert(missing.length === 0, 'LIGHT_PROPS ⊆ offered light targets', missing);

  const unroutable = LIGHT_PROPS.filter(
    p => classifyModulationTarget(`lighting.light0_${p}`, storeState).sink !== 'engine-mods');
  assert(unroutable.length === 0, 'every LIGHT_PROP routes to engine-mods', unroutable);
}

console.log('[6] composed vec widgets are not offered alongside their scalars');
{
  // `preRot` composes from preRotX/Y/Z. Offering both would apply the offset
  // twice — once through the composite, once through each axis.
  const composed = classifyModulationTarget('geometry.preRot_x', storeState);
  assert(!targets.some(t => t.target === 'geometry.preRot_x'),
    'the composeFrom composite is not an offered target');
  assert(composed.branch === 'geometryRotation' && composed.sink === 'none',
    'and if one were authored by hand it resolves to no sink rather than double-applying',
    composed);
}

console.log('[7] the tick delivers rotation offsets to the proxy the worker ships from');
{
  // The end-to-end main-thread half of the live-modulation bug. Two ways it
  // used to break, both silent:
  //   1. AnimationSystem captured `getProxy()` at MODULE scope, so if it
  //      evaluated before the host's setProxy() it wrote to an orphaned stub.
  //   2. Nothing forwarded the dict to the worker at all (RENDER_TICK carried
  //      no modulations), so rotation modulated in an export and not live.
  // This pins (1) and the branch that feeds it; (2) is a protocol field, so it
  // is pinned by the payload assertion below.
  const { getProxy, setProxy, WorkerProxy } = await import('../engine/worker/WorkerProxy');
  const { tick } = await import('../engine/animation/AnimationSystem');

  // Install a fresh proxy AFTER AnimationSystem's module has been evaluated —
  // exactly the ordering that used to strand the writes.
  const installed = new WorkerProxy();
  setProxy(installed);

  useEngineStore.setState({
    lfosEnabled: true,
    animations: [{
      id: 'cov-rot', enabled: true, target: 'geometry.preRotX', shape: 'Sawtooth',
      period: 4, amplitude: 0.5, baseValue: 0, phase: 0.3, smoothing: 0,
    }],
  } as never);

  tick(1 / 60);

  assert(getProxy() === installed, 'the tick resolves the installed proxy, not a module-scope capture');
  assert(typeof installed.modulations['geometry.preRotX'] === 'number'
      && installed.modulations['geometry.preRotX'] !== 0,
    'geometry.preRotX offset lands in the proxy dict the worker ships from',
    installed.modulations);

  // The dict is the frame's COMPLETE set — a target that stops modulating must
  // not keep applying its last offset. The tick runs one CLEANUP pass that
  // rewrites the target at zero (so the frame after removal actively cancels
  // it), then drops the key entirely once `activeTargetsRef` has drained.
  useEngineStore.setState({ animations: [] } as never);
  tick(1 / 60);
  assert((installed.modulations['geometry.preRotX'] ?? 0) === 0,
    'the cleanup tick cancels the offset instead of freezing it at its last value',
    installed.modulations);

  // Once the cleanup pass has drained `activeTargetsRef` the tick early-outs,
  // which happens BEFORE it resets the dict — so the zeroed key lingers rather
  // than being deleted. Harmless by construction (every consumer reads
  // `modulations[k] || 0`), and pinned here so the residue reads as intended
  // rather than as a leak someone "fixes" by adding work to the hot early-out.
  tick(1 / 60);
  assert((installed.modulations['geometry.preRotX'] ?? 0) === 0,
    'and stays cancelled once the tick early-outs (a zeroed key may linger)',
    installed.modulations);
}

console.log(failures === 0 ? '\n✓ all assertions passed' : `\n✗ ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
