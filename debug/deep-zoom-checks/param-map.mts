/**
 * param-map check: the table between the shell's feature params and the renderer
 * (`deep-zoom/host/paramMap.ts`) and the pushes behind it (`deep-zoom/host/looseParams.ts`).
 *
 *   npx tsx debug/deep-zoom-checks/param-map.mts        node only, a fake api, about 2 s
 *
 * What it pins:
 *   map   every param of every mapped feature has exactly one row; every row names a real param;
 *         a `look` row names its field; a row without a push says why.
 *   push  a value reaches the module through the setter its row names, converted by the feature's
 *         own converter; an unchanged value is not sent again; the joint pushes (colour, light,
 *         phase) always carry all their values; BLA "On" is never sent before the wait.
 *   read  with the fake holding the module's defaults, `readParams` equals the feature defaults for
 *         every row that reads back (the real-module version of this is a stage-2 smoke step).
 *
 * What it does not pin: the real module (the smoke does), and `deep-zoom/useHostSync.ts`.
 *
 * FALSIFICATION RECORD, 2026-10-08 (each: one break, this check red, restored, green again)
 *   paramMap.ts: the `haze` row deleted -> 2 red ("map: every feature param has a row", the look
 *     push); a key misspelt (`frameSizee`) -> 3 red (both map lines and the read line).
 *   looseParams.ts: `setBla(true)` sent before the wait -> 4 red (the bla lines); `reach` pushed
 *     unconverted -> 1 red; the unchanged-value test removed -> 2 red; colour sent with scale 0
 *     -> 3 red.
 */
import { DZ_PARAM_ROWS, DZ_PARAM_FEATURES, DZ_PARAM_ROW_BY_ID, defaultParams, paramId, readParams } from '../../deep-zoom/host/paramMap.ts';
import { createParamPusher, DZ_BLA_WAIT_MS } from '../../deep-zoom/host/looseParams.ts';
import type { DeepZoomApi } from '../../deep-zoom/renderer/index.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ── a fake api holding the module's defaults (read in core.js: `const look = {`, `settings()`) ──
function makeApi() {
    const calls: Array<[string, unknown[]]> = [];
    const note = (name: string, ...args: unknown[]): void => { calls.push([name, args]); };
    const s = {
        detail: 1, reach: 1, power: 8, phase: [0, 0] as [number, number], color: 0, cscale: 1, light: 0, falloff: 4,
        normals: 2, land: false, frame: 320, accum: true, lookMode: 1,
    };
    const look: Record<string, unknown> = { mode: 1, view: 0, compare: 0, nrmTap: 1, keyElev: 40, keyTurn: 0, tint: 0.5, shadow: 1, ao: 1, sky: 0.3, rough: 0.75, haze: 0 };
    const lever = { stepRelax: 0, capRelax: 1, mode: 'auto' as 'auto' | 'deep' | 'f32', hitRefine: 0, jacobian: 0 };
    const ray = { bits: 5, factor: 1, hit: 64, tol: 0.05, floor: 256, line: 2, detail: 0 };   // the module as the shell creates it (create option `rayMarch`)
    const compiled: Record<string, number | undefined> = {};
    let bla: 'off' | 'auto' | 'on' = 'auto';
    let normalDetail = 0;
    let auto = true;
    const formula = { kind: 'mandelbulb', scale: 2, minR: 0.5, fold: 1, fixedR: 1, rot: [0, 0, 0] as [number, number, number] };   // core.js: `let dzFormula`, `const box = {`
    const api = {
        setFormula: (kind: string, p?: { scale?: number; minR?: number; fold?: number; fixedR?: number; rot?: [number, number, number] }) => { note('setFormula', kind, p); formula.kind = kind; Object.assign(formula, p || {}); },
        formula: () => ({ ...formula, rot: [...formula.rot] as [number, number, number] }),
        dz: { settings: () => ({ ...s, phase: [s.phase[0], s.phase[1]] as [number, number] }) },
        look,
        setLook: (o: Record<string, unknown>) => { note('setLook', o); Object.assign(look, o); if (typeof o.mode === 'number') s.lookMode = o.mode; },
        setPower: (n: number) => { note('setPower', n); s.power = n; },
        setPhase: (a: number, b: number) => { note('setPhase', a, b); s.phase = [a, b]; },
        setIters: (n: number) => { note('setIters', n); },
        setAutoIters: (on: boolean) => { note('setAutoIters', on); auto = on; },
        autoIters: () => auto,
        setFrame: (px: number) => { note('setFrame', px); s.frame = px; },
        setSurf: (m: number) => { note('setSurf', m); s.detail = m; },
        setNormalDetail: (d: number) => { note('setNormalDetail', d); normalDetail = d; },
        normalDetail: () => normalDetail,
        setReach: (k: number) => { note('setReach', k); s.reach = k; },
        setNormalMode: (m: number) => { note('setNormalMode', m); s.normals = m; },
        setLand: (on: boolean) => { note('setLand', on); s.land = on; },
        setAccum: (on: boolean) => { note('setAccum', on); s.accum = on; },
        setMode: (m: 'auto' | 'deep' | 'f32') => { note('setMode', m); lever.mode = m; },
        setBla: (on: boolean | 'auto') => { note('setBla', on); bla = on === 'auto' ? 'auto' : on ? 'on' : 'off'; },
        blaMode: () => bla,
        compileMs: () => compiled,
        setStepRelax: (r: number) => { note('setStepRelax', r); lever.stepRelax = r; },
        setHitRefine: (n: number) => { note('setHitRefine', n); lever.hitRefine = n; },
        setJacobian: (bits: number) => { note('setJacobian', bits); lever.jacobian = bits; },
        setRayMarch: (bits: number, opt?: { factor?: number; floor?: number; line?: number }) => { note('setRayMarch', bits, opt); ray.bits = bits; Object.assign(ray, opt || {}); },
        rayMarch: () => ({ ...ray }),
        setCapRelax: (m: number) => { note('setCapRelax', m); lever.capRelax = m; },
        marchLevers: () => ({ ...lever }),
        setLight: (m: number, f?: number) => { note('setLight', m, f); s.light = m; if (f) s.falloff = f; },
        setColor: (m: number, sc?: number) => { note('setColor', m, sc); s.color = m; if (sc) s.cscale = sc; },
    };
    const of = (name: string): unknown[][] => calls.filter(([n]) => n === name).map(([, a]) => a);
    return { api: api as unknown as DeepZoomApi, calls, of, compiled, clear: () => { calls.length = 0; } };
}

// ── [1] map ──────────────────────────────────────────────────────────────────────────────────────
console.log('[1] map');
{
    const featureIds: string[] = [];
    for (const [feature, def] of Object.entries(DZ_PARAM_FEATURES)) {
        for (const key of Object.keys(def.params)) featureIds.push(paramId(feature, key));
    }
    const rowIds = DZ_PARAM_ROWS.map((r) => paramId(r.feature, r.key));
    const missing = featureIds.filter((id) => !rowIds.includes(id));
    const extra = rowIds.filter((id) => !featureIds.includes(id));
    const twice = rowIds.filter((id, i) => rowIds.indexOf(id) !== i);
    check(featureIds.length >= 30, 'map: the features were read (30 params or more)', `${featureIds.length}`);
    check(missing.length === 0, 'map: every feature param has a row', missing.join(', '));
    check(extra.length === 0, 'map: every row names a real param', extra.join(', '));
    check(twice.length === 0 && DZ_PARAM_ROW_BY_ID.size === rowIds.length, 'map: no param has two rows', twice.join(', '));
    const badLook = DZ_PARAM_ROWS.filter((r) => (r.group === 'look') !== (typeof r.look === 'string'));
    check(badLook.length === 0, 'map: a look row names its field, and only a look row does', badLook.map((r) => r.key).join(', '));
    const silent = DZ_PARAM_ROWS.filter((r) => r.group === null && !r.why);
    check(silent.length === 0, 'map: a row with no push says why', silent.map((r) => r.key).join(', '));
    const defaults = defaultParams();
    const noDefault = featureIds.filter((id) => defaults[id] === undefined);
    check(noDefault.length === 0, 'map: every param has a default to start the pusher from', noDefault.join(', '));
}

// ── [2] read ─────────────────────────────────────────────────────────────────────────────────────
console.log('[2] read');
{
    const { api } = makeApi();
    const read = readParams(api);
    const defaults = defaultParams();
    const differ = Object.entries(read).filter(([id, v]) => !Object.is(v, defaults[id])).map(([id, v]) => `${id} ${String(v)} != ${String(defaults[id])}`);
    check(Object.keys(read).length >= 28, 'read: 28 params or more read back from the module', `${Object.keys(read).length}`);
    check(differ.length === 0, 'read: with the module at its defaults every read-back equals the feature default', differ.join('; '));
    check(read['dzColour.mode'] === undefined, 'read: colour mode has no read-back while Plain');
}

// ── [3] push ─────────────────────────────────────────────────────────────────────────────────────
console.log('[3] push');
{
    const rig = makeApi();
    const p = createParamPusher(rig.api);

    p.push({ 'dzQuality.detail': 4 });
    p.push({ 'dzQuality.detail': 4 });
    check(JSON.stringify(rig.of('setSurf')) === '[[4]]', 'push: detail goes through setSurf once; the same value again is dropped', JSON.stringify(rig.of('setSurf')));

    rig.clear();
    p.push(defaultParams());
    check(rig.calls.length > 15 && rig.of('setSurf').length === 1 && rig.of('setColor').length === 1 && rig.of('setLight').length === 1 && rig.of('setPhase').length === 1 && rig.of('setFormula').length === 1,
        'push: a first push of every param sends each group once (the joint groups once, not once per key)', rig.calls.map(([n]) => n).join(','));
    check(rig.calls[0][0] === 'setFormula' && JSON.stringify(rig.calls[0][1]) === '["mandelbulb",{"scale":2,"minR":0.5,"fold":1,"fixedR":1,"rot":[0,0,0]}]',
        'push: the formula is the FIRST call of a whole push, with the kind by name and the box\'s seven numbers', JSON.stringify(rig.calls[0]));
    rig.clear();
    p.push(defaultParams());
    check(rig.calls.length === 0, 'push: the same whole set again sends nothing', rig.calls.map(([n]) => n).join(','));

    rig.clear();
    p.push({ 'dzQuality.reach': 2, 'dzQuality.normals': 3, 'dzQuality.depthNormalRadius': 2, 'dzInspect.channel': 4, 'dzLight.shading': 0 });
    const looks = rig.of('setLook').map((a) => a[0]) as Array<Record<string, unknown>>;
    check(JSON.stringify(rig.of('setReach')) === '[[2]]' && JSON.stringify(rig.of('setNormalMode')) === '[[3]]' && rig.of('setMode').length === 0,
        'push: enum indices are converted (reach 2, normals 3), and nothing ever sets the precision mode');
    check(looks.some((o) => o.nrmTap === 3) && looks.some((o) => o.view === 5) && looks.some((o) => o.mode === 0) && looks.some((o) => Object.keys(o).length === 0),
        'push: depth radius index 2 -> nrmTap 3, channel index 4 -> view 5, shading index 0 -> mode 0, and normals is followed by an empty setLook', JSON.stringify(looks));

    rig.clear();
    p.push({ 'dzColour.scale': 2.5 });
    check(JSON.stringify(rig.of('setColor')) === '[[0,2.5]]', 'push: scale alone still sends the mode with it (Plain = 0)', JSON.stringify(rig.of('setColor')));
    rig.clear();
    // The default mapping is Iterations since 2026-10-09 (GMT mode 1); Orbit trap is GMT mode 0.
    p.push({ 'dzColour.plain': false });
    check(JSON.stringify(rig.of('setColor')) === '[[1,2.5]]', 'push: Gradient at the default mapping (GMT mode 1, Iterations) is the module’s iteration colouring (1)', JSON.stringify(rig.of('setColor')));
    rig.clear();
    p.push({ 'dzColour.mode': 0 });
    check(JSON.stringify(rig.of('setColor')) === '[[2,2.5]]', 'push: GMT mode 0 is the module’s orbit trap (2)', JSON.stringify(rig.of('setColor')));

    rig.clear();
    p.push({ 'dzLight.lampFalloff': 8 });
    check(JSON.stringify(rig.of('setLight')) === '[[0,8]]', 'push: falloff alone still sends the light type with it', JSON.stringify(rig.of('setLight')));
    rig.clear();
    p.push({ 'dzFormula.phasePhi': 1.5 });
    check(JSON.stringify(rig.of('setPhase')) === '[[0,1.5]]', 'push: one phase angle sends both', JSON.stringify(rig.of('setPhase')));
    rig.clear();
    p.push({ 'dzLight.keyElevation': 55, 'dzLight.haze': 0.25 });
    check(JSON.stringify(rig.of('setLook')) === '[[{"keyElev":55,"haze":0.25}]]', 'push: look values go in one setLook under the module’s field names', JSON.stringify(rig.of('setLook')));
    rig.clear();
    p.push({ 'dzFormula.iterations': 40, 'dzFormula.autoIterations': false });
    check(JSON.stringify(rig.of('setIters')) === '[[40]]' && JSON.stringify(rig.of('setAutoIters')) === '[[false]]', 'push: iterations and auto iterations have their own setters');

    // the formula: one call for the kind and the box's numbers, always ahead of the iteration count
    rig.clear();
    p.push({ 'dzFormula.iterations': 300, 'dzFormula.kind': 1, 'dzFormula.boxScale': -1.5 });
    check(rig.calls.map(([n]) => n).join() === 'setFormula,setIters' && JSON.stringify(rig.of('setFormula')) === '[["mandelbox",{"scale":-1.5,"minR":0.5,"fold":1,"fixedR":1,"rot":[0,0,0]}]]',
        'push: the Mandelbox goes as setFormula("mandelbox", ...) BEFORE the iteration count sent with it (the ceiling is the formula\'s)', JSON.stringify(rig.calls));
    rig.clear();
    p.push({ 'dzFormula.boxRotY': 0.5 });
    check(JSON.stringify(rig.of('setFormula')) === '[["mandelbox",{"scale":-1.5,"minR":0.5,"fold":1,"fixedR":1,"rot":[0,0.5,0]}]]', 'push: one of the box\'s numbers sends the kind and all seven', JSON.stringify(rig.of('setFormula')));
    rig.clear();
    p.push({ 'dzFormula.boxScale': 0.3 });
    check(JSON.stringify((rig.of('setFormula')[0] as [string, { scale: number }])[1].scale) === '1.02', 'push: a scale inside the band the renderer cannot draw goes as the nearer end (0.3 -> 1.02)', JSON.stringify(rig.of('setFormula')));
    rig.clear();
    p.push({ 'dzFormula.boxRotation': 7 });
    check(rig.calls.length === 0, 'push: the composed Pre-Rotation row sends nothing itself', rig.calls.map(([n]) => n).join(','));
    {
        const read = readParams(rig.api);
        check(read['dzFormula.kind'] === 1 && read['dzFormula.boxScale'] === 1.02 && read['dzFormula.boxRotY'] === 0.5 && read['dzFormula.boxFixedRadius'] === 1,
            'read: the formula reads back as the store holds it (kind as its index)', JSON.stringify(read));
    }

    rig.clear();
    p.push({ 'dzInspect.overlays': 2, 'dzQuality.actualPixels': true });
    check(rig.calls.length === 0, 'push: a row with no push sends nothing', rig.calls.map(([n]) => n).join(','));

    rig.clear();
    p.push({ 'dzQuality.precision': 1 });
    check(rig.of('setMode').length === 0, 'push: a `dzQuality.precision` from a scene saved before 2026-10-08 pushes nothing', JSON.stringify(rig.calls));
    p.dispose();
}

// ── [4] BLA ──────────────────────────────────────────────────────────────────────────────────────
console.log('[4] BLA');
{
    const rig = makeApi();
    const p = createParamPusher(rig.api);
    p.push({ 'dzQuality.bla': 0 });
    check(JSON.stringify(rig.of('setBla')) === '[[false]]', 'bla: Off is sent as false');
    rig.clear();
    p.push({ 'dzQuality.bla': 2 });
    await sleep(DZ_BLA_WAIT_MS * 2 + 80);
    check(JSON.stringify(rig.of('setBla')) === '[["auto"]]', 'bla: On sends auto and waits - never true before the variant is compiled', JSON.stringify(rig.of('setBla')));
    rig.compiled.PB = 5123;
    await sleep(DZ_BLA_WAIT_MS + 120);
    check(JSON.stringify(rig.of('setBla')) === '[["auto"],[true]]', 'bla: once compileMs().PB is defined, true is sent', JSON.stringify(rig.of('setBla')));

    const rig2 = makeApi();
    const p2 = createParamPusher(rig2.api);
    p2.push({ 'dzQuality.bla': 2 });
    p2.push({ 'dzQuality.bla': 1 });
    rig2.compiled.PB = 1;
    await sleep(DZ_BLA_WAIT_MS + 120);
    check(!rig2.of('setBla').some((a) => a[0] === true), 'bla: a choice changed during the wait is not overridden', JSON.stringify(rig2.of('setBla')));

    const rig3 = makeApi();
    const p3 = createParamPusher(rig3.api);
    p3.push({ 'dzQuality.bla': 2 });
    p3.dispose();
    rig3.compiled.PB = 1;
    await sleep(DZ_BLA_WAIT_MS + 120);
    check(!rig3.of('setBla').some((a) => a[0] === true), 'bla: dispose stops the wait');
    p.dispose();
    p2.dispose();
}

console.log(failed === 0 ? 'param-map: all green' : `param-map: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
