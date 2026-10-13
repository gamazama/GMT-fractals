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
 * module both appliers (`AnimationSystem.tick` and `exportModulations`)
 * classify with before handing the routing to `planModulationTarget` — so this
 * cannot grade a routing the dispatcher doesn't take.
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
const { classifyModulationTarget, listModulatableTargets, LIGHT_PROPS,
        routingInvalidatesAccumulation, targetInvalidatesAccumulation } =
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
  // The dispatcher's vec branch (applyTarget.ts) claims ANY `feature.name_x`
  // key and drops it when the slice holds no vector there. A scalar param
  // literally named `foo_x` would land in that hole and never modulate.
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

console.log('[8] vector widgets that are keyframeable are also modulation-aware');
{
  // `trackKeys` makes a vector widget keyframeable; `liveValue` makes it show
  // modulation. Passing one without the other is silent — the param modulates,
  // the image changes, and the control renders no indicator. That is exactly
  // how formula vec2/vec3/vec4 params (phase/theta and friends) looked broken
  // while modulating correctly, in the same file whose SCALAR branch wired
  // liveValue properly.
  //
  // A source check rather than a runtime one: the failure lives in JSX props,
  // which no amount of store poking reaches.
  const fs = await import('node:fs/promises');
  const files = [
    'components/AutoFeaturePanel.tsx',
    'engine-gmt/components/panels/formula/FormulaParamsWidget.tsx',
    'engine-gmt/components/panels/lighting/LightPanelControls.tsx',
    'engine-gmt/features/lighting/components/LightControls.tsx',
    'engine-gmt/components/panels/scene_widgets.tsx',
  ];
  // Widgets that intentionally omit liveValue, with the reason. Keep this list
  // short and justified — it is the escape hatch that makes the check honest
  // rather than the place bugs go to hide.
  const EXEMPT = new Set([
    // rotDeg is DEGREES, the stored camera.rotation.* offset is RADIANS.
    "trackKeys={['camera.rotation.x', 'camera.rotation.y', 'camera.rotation.z']}",
  ]);

  // The `(?=[\s/>])` lookahead is load-bearing: without it this also matches the
  // TYPE annotation `React.FC<Vector2InputProps>` in components/vector-input/index.tsx
  // and then runs on to the first `/>` inside the component body, reporting the
  // widget's own definition file as a consumer. Found 2026-07-29 by the discovery
  // cross-check below, which is a fair advertisement for adding one.
  const ELEMENT_RE = /<Vector[234]Input(?=[\s/>])[\s\S]*?\/>/g;
  const offenders: string[] = [];
  let scanned = 0;
  for (const f of files) {
    // A path that has moved throws here rather than silently scanning nothing —
    // verified 2026-07-29 by adding a non-existent sixth path (ENOENT, exit 1).
    const src = await fs.readFile(new URL(`../${f}`, import.meta.url), 'utf8');
    // Each JSX element opens at `<Vector{2,3,4}Input` and ends at the first `/>`.
    for (const m of src.matchAll(ELEMENT_RE)) {
      const el = m[0];
      if (!el.includes('trackKeys')) continue;
      scanned++;
      if (el.includes('liveValue')) continue;
      if ([...EXEMPT].some(x => el.includes(x))) continue;
      offenders.push(`${f}: ${el.slice(0, 90).replace(/\s+/g, ' ')}…`);
    }
  }
  console.log(`  (scanned ${scanned} keyframeable Vector*Input elements across ${files.length} files)`);
  assert(offenders.length === 0,
    'every Vector*Input with trackKeys also receives liveValue', offenders);

  // The list above is an ALLOWLIST, and an allowlist is where the next offender
  // hides: a NEW panel with a keyframeable vector widget is simply not scanned,
  // and the check stays green having never looked at it. (Batch 2's check:zindex
  // allowlisted the two files that DEFINED the z-index scale.) A path that MOVES
  // already throws at readFile above; this covers the other direction — discover
  // the real consumer set and require the list to still cover it.
  {
    const path = await import('node:path');
    const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const SKIP = new Set(['node_modules', 'dist', '.git', 'debug', 'docs', 'plans', 'public']);
    const found: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { await walk(full); continue; }
        if (!e.name.endsWith('.tsx')) continue;
        const src = await fs.readFile(full, 'utf8');
        for (const m of src.matchAll(ELEMENT_RE)) {
          if (!m[0].includes('trackKeys')) continue;
          found.push(path.relative(ROOT, full).replace(/\\/g, '/'));
          break;
        }
      }
    };
    await walk(ROOT);
    const unscanned = found.filter(f => !files.includes(f));
    assert(unscanned.length === 0,
      'no file outside the scanned list holds a keyframeable Vector*Input', unscanned);
    // And the scan must not have quietly SHRUNK. `scanned > 0` is not enough:
    // renaming only the `<Vector3Input ` (space-delimited) usages and leaving the
    // `<Vector3Input\n` ones took this from 10 elements to 3 with every assertion
    // still green — measured 2026-07-29. A partial shrink is the realistic form of
    // this failure, so record a floor. Raise it when you add widgets; if you have
    // deliberately REMOVED one, lower it in the same commit that removes it.
    const SCAN_FLOOR = 10; // measured 2026-07-29 across the five files above
    assert(scanned >= SCAN_FLOOR,
      `the Vector*Input scan did not shrink (expected >= ${SCAN_FLOOR})`,
      { scanned, floor: SCAN_FLOOR, discoveredFiles: found });
  }
}

// ── Which targets restart accumulation ──────────────────────────────────────
// A display-pass param (declared `noAccumReset`) can be modulated without
// re-tracing the fractal; everything else cannot. The live tick and the tick
// driver both ask `routingInvalidatesAccumulation`, so this pins the answer for
// one target of each kind and the SHAPE of the exempt set.
{
  console.log('\n[9] which modulated targets restart accumulation');
  const inv = (t: string) => targetInvalidatesAccumulation(t, storeState);

  assert(inv('postEffects.bloomIntensity') === false,
    'bloom intensity does not invalidate accumulation (display pass, declared noAccumReset)');
  assert(inv('coreMath.paramA') === true, 'a formula param does');
  assert(inv('camera.unified.x') === true, 'a camera target does');
  assert(inv('optics.camFov') === true, 'a render-state target (FOV) does');
  assert(inv('geometry.preRotX') === true, 'a geometry rotation does');
  assert(inv('lighting.light0_intensity') === true,
    'a light does — it goes through engine-mods, whatever its param config says');
  assert(inv('nope.nothing') === true, 'an unresolved target answers conservatively');

  // The exempt set is exactly: uniform sink, scalar or vec-axis branch, noAccumReset.
  const exempt = rows.filter(r => !routingInvalidatesAccumulation(r.routing));
  const misfiled = exempt.filter(r => !(r.routing.sink === 'uniform' && r.routing.noAccumReset
    && (r.routing.branch === 'scalar' || r.routing.branch === 'vecAxis')));
  assert(misfiled.length === 0, 'every exempt target is a noAccumReset uniform scalar / vec axis',
    misfiled.map(r => r.target));
  const leaked = rows.filter(r => r.routing.sink !== 'uniform' && !routingInvalidatesAccumulation(r.routing));
  assert(leaked.length === 0, 'no engine-mods / render-state / display-only target is exempt', leaked.map(r => r.target));
  // The sink/branch half of the rule, on SYNTHETIC routings. The catalogue
  // cannot prove it: today no offered engine-mods / render-state / display-only
  // target happens to be declared `noAccumReset`, so "exempt anything flagged
  // noAccumReset" passes every assertion above (measured 2026-10-04 — that
  // break exited 0 before these four lines existed).
  const synth = (sink: string, branch: string) => routingInvalidatesAccumulation(
    { branch, sink, noAccumReset: true, ddfsResolved: true, base: 0, curve: rows[0].routing.curve } as never);
  assert(synth('engine-mods', 'lighting') === true, 'a noAccumReset flag does not exempt an engine-mods target');
  assert(synth('render-state', 'scalar') === true, 'nor a render-state target');
  assert(synth('display-only', 'scalar') === true, 'nor a display-only target (a uniformless app may key its own accumulation on the reset)');
  assert(synth('uniform', 'coloring') === true, 'nor a composite branch — only scalar and vec-axis uniforms');
  assert(synth('uniform', 'scalar') === false && synth('uniform', 'vecAxis') === false, 'a noAccumReset uniform scalar / vec axis is exempt');

  // Not vacuous: there ARE exempt targets, and they are a minority.
  assert(exempt.length > 0 && exempt.length < rows.length / 2,
    `some targets are exempt, most are not (${exempt.length} of ${rows.length})`);
  console.log(`  (${exempt.length} of ${rows.length} offered targets are display-pass)`);
  if (VERBOSE) console.log('  exempt:', exempt.map(r => r.target).join(', '));
}

// ── The tick honours it ─────────────────────────────────────────────────────
// The classifier above is only half: the live tick has to act on it. Before
// 2026-10-04 it emitted one blanket RESET_ACCUM for ANY offset that moved, so
// an LFO on bloom re-traced the fractal every frame. Count the events the tick
// actually emits.
{
  console.log('\n[10] the tick restarts accumulation only for targets that need it');
  const { FractalEvents, FRACTAL_EVENTS } = await import('../engine/FractalEvents');
  const { tick } = await import('../engine/animation/AnimationSystem');
  let resets = 0;
  const uniforms: { key: string; noAccumReset?: boolean }[] = [];
  const offReset = FractalEvents.on(FRACTAL_EVENTS.RESET_ACCUM, () => { resets++; });
  const offUniform = FractalEvents.on(FRACTAL_EVENTS.UNIFORM, (p: { key: string; noAccumReset?: boolean }) => { uniforms.push(p); });
  const lfo = (target: string, baseValue: number) => ({
    id: 'cov-' + target, enabled: true, target, shape: 'Sawtooth', period: 4, amplitude: 0.5, baseValue, phase: 0.3, smoothing: 0,
  });
  const run = (animations: unknown[]) => {
    useEngineStore.setState({ lfosEnabled: true, animations } as never);
    resets = 0; uniforms.length = 0;
    tick(1 / 60);
  };

  // Drain whatever the earlier blocks left active, so the first measured tick is clean.
  useEngineStore.setState({ animations: [] } as never); tick(1 / 60); tick(1 / 60);

  run([lfo('postEffects.bloomIntensity', 0.5)]);
  const bloom = uniforms.find(u => u.key === 'uBloomIntensity');
  assert(!!bloom, 'an LFO on bloom intensity writes uBloomIntensity', uniforms.map(u => u.key));
  assert(bloom?.noAccumReset === true, '...flagged noAccumReset', bloom);
  assert(resets === 0, 'and the tick does NOT restart accumulation for it', { resets });

  run([lfo('coreMath.paramA', 8)]);
  assert(resets >= 1, 'an LFO on a formula param DOES restart accumulation', { resets });

  run([lfo('postEffects.bloomIntensity', 0.5), lfo('coreMath.paramA', 8)]);
  resets = 0; tick(1 / 60);
  // (second tick: both targets already present; whether the offset moved enough
  //  depends on the oscillator clock, so only the removal below is asserted.)

  run([lfo('postEffects.bloomIntensity', 0.5)]);
  assert(resets >= 1, 'removing the formula-param LFO restarts accumulation once (its offset vanished)', { resets });
  resets = 0; tick(1 / 60); tick(1 / 60);
  assert(resets === 0, 'after which bloom alone keeps running without a restart', { resets });

  run([]);
  assert(resets === 0, 'and removing the bloom LFO does not restart it either', { resets });
  tick(1 / 60);
  offReset(); offUniform();
}

console.log(failures === 0 ? '\n✓ all assertions passed' : `\n✗ ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
