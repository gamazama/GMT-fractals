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
 *         phase) always carry all their values; the occlusion's radius and sample count are look
 *         fields (2026-10-12).
 *   constant  (2026-10-12) the Julia constant's three number rows go in the formula's own call only
 *         when they say another constant than the module holds; rows that merely show a constant
 *         that came with a view send nothing, and rows put back onto one send its exact strings
 *         (the last eight are remembered).
 *   read  with the fake holding the module's defaults, `readParams` equals the feature defaults for
 *         every row that reads back (the real-module version of this is a stage-2 smoke step).
 *   retired  (2026-10-11) the three params that went with the previous-generation marches,
 *         `trueGradient`, `bla` and (in a second step that day) the `rayMarch` switch, have no row
 *         and push nothing, and nothing sends `setBla`, `setJacobian` or `setRayMarch`; a Normals
 *         index of 4 (Gradient, an option until that day) reaches the renderer as 4-tap; Step size
 *         is conditioned on the Mandelbox and is still pushed whatever the formula.
 *
 * What it does not pin: the real module (the smoke does), and `deep-zoom/useHostSync.ts`.
 *
 * FALSIFICATION RECORD, 2026-10-08 (each: one break, this check red, restored, green again)
 *   paramMap.ts: the `haze` row deleted -> 2 red ("map: every feature param has a row", the look
 *     push); a key misspelt (`frameSizee`) -> 3 red (both map lines and the read line).
 *   looseParams.ts: `reach` pushed
 *     unconverted -> 1 red; the unchanged-value test removed -> 2 red; colour sent with scale 0
 *     -> 3 red. (A fifth break, `setBla(true)` sent before the wait -> 4 red, was of the BLA
 *     lines: they went on 2026-10-11 with the shell's BLA setting, its wait and section [4].)
 * 2026-10-11, one break, restored byte for byte (sha-256) and green again:
 *   features/quality.ts: `normalsToRenderer` made to hand the index through (`Math.floor(index ?? 2)`)
 *     -> 2 red: "push: Normals index 4 ... reaches the renderer as 4-tap (2) ..." (the fake saw
 *     `setNormalMode(4)`) and "retired: Normals has four options, and an index that names none ...".
 *   NOT seen red: the other "retired" lines, the `trueGradient` / `bla` / `rayMarch` push line and
 *     the Step size push line (the last two as they are since the second step of 2026-10-11, R7b).
 * 2026-10-12, THE CONSTANT (the Julia constant's three number rows), two breaks in
 *   deep-zoom/host/looseParams.ts, each restored byte for byte (sha-256) and green again:
 *   - the "rows equal what the renderer holds" test taken out of `constant()` (a constant goes with
 *     every formula push) -> 6 red: "constant: another of the formula's values, pushed while the rows
 *     equal what the renderer holds, sends no constant" (it sent [0.5,0,0]), "constant: rows that equal
 *     what the renderer holds send no constant: one that came with a view keeps every digit" (it sent
 *     the remembered strings), and the four older "push: ..." lines that spell out the formula's call
 *     (each gained "c":[0,0,0]).
 *   - the remembered constants not looked up (`return { c: rows }`) -> 2 red: "constant: rows put back
 *     onto a constant that came with a view send its exact strings, not their doubles" (it sent
 *     [0.25,-0.5,0.75]; the fake then held ...409984 where the view had brought ...422329: the 12345
 *     units under the double were gone) and "constant: the ninth to arrive ...".
 *   NOT seen red by a break of its own: "map: the Julia constant is three numbers ...", "constant: a
 *     row that is changed sends the three numbers ...", "constant: a drag from there sends numbers ...",
 *     and the limit of eight in "constant: the ninth ..." (that line went red with the second break,
 *     for the lookup, not for the count).
 * 2026-10-12, THE OCCLUSION'S TWO ROWS (`dzLight.occlusionRadius`, `dzLight.occlusionSamples`), one
 *   break in deep-zoom/host/paramMap.ts, restored byte for byte (sha-256) and green again:
 *   - the samples row's look field misspelt (`look('occlusionSamples', 'aoTaps')` -> `'aoTap'`)
 *     -> 1 red: "push: the occlusion's radius and sample count go as the look fields aoRadius and
 *     aoTaps, one setLook and nothing else, and read back" (the fake saw
 *     setLook({ aoRadius: 0.3, aoTap: 24 })). The "read: with the module at its defaults ..." line
 *     stayed green: a look field the module does not hold has no read-back to compare.
 * 2026-10-12, BURNING (the bulb's switch and its mix in the formula's push), one break, restored byte for byte (sha-256):
 *   - `looseParams.ts`: the `burning: flag('dzFormula', 'burning'),` line of the formula push left out
 *     -> 7 red of 51: "push: Burning and its mix go as setFormula(kind, { ..., burning: true, burnMix: 0.5 }),
 *     one call and nothing else" (the fake saw { ..., "julia":false,"burnMix":0.5 }), "read-back: Burning and
 *     its mix are read from the module's formula()", "push: and off again", and the four lines that hold a
 *     whole formula call as text. Not broken on purpose: the mix's own line of the push.
 * 2026-10-12, KALIBOX (its six numbers in the formula's push), one break, restored byte for byte (sha-256):
 *   - `looseParams.ts`: the `kaliTrans: [...]` line of the formula push left out
 *     -> 6 red of 55: "push: KaliBox goes as setFormula("kalibox", { ..., kaliScale, kaliMinRad2, kaliTrans,
 *     kaliRot }), one call, the Mandelbox's own numbers beside them untouched", "read-back: KaliBox and its numbers
 *     are read from the module's formula() (kind as index 2)", and the four lines that hold a whole formula call
 *     as text. Not broken on purpose: the other three numbers' lines of the push, the band rule for its scale,
 *     the map line.
 */
import { DZ_PARAM_ROWS, DZ_PARAM_FEATURES, DZ_PARAM_ROW_BY_ID, defaultParams, paramId, readParams } from '../../deep-zoom/host/paramMap.ts';
import { createParamPusher } from '../../deep-zoom/host/looseParams.ts';
import { NORMALS_OPTIONS, normalsIndex, normalsToRenderer } from '../../deep-zoom/features/quality.ts';
import { FORMULA_BOX, FORMULA_BULB, FORMULA_KALI } from '../../deep-zoom/features/formula.ts';
import type { DeepZoomApi } from '../../deep-zoom/renderer/index.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

// ── a fake api holding the module's defaults (read in core.js: `const look = {`, `settings()`) ──
function makeApi() {
    const calls: Array<[string, unknown[]]> = [];
    const note = (name: string, ...args: unknown[]): void => { calls.push([name, args]); };
    const s = {
        detail: 1, reach: 1, power: 8, phase: [0, 0] as [number, number], color: 0, cscale: 1, light: 0, falloff: 4,
        normals: 2, land: false, frame: 320, accum: true, lookMode: 1,
    };
    const look: Record<string, unknown> = { mode: 1, view: 0, compare: 0, nrmTap: 1, keyElev: 40, keyTurn: 0, tint: 0.5, shadow: 1, ao: 1, aoRadius: 0.12, aoTaps: 10, sky: 0.3, rough: 0.75, haze: 0 };
    const lever = { stepRelax: 0, capRelax: 1, mode: 'auto' as 'auto' | 'deep' | 'f32', hitRefine: 0 };
    const ray = { bits: 5, factor: 1, hit: 64, tol: 0.05, floor: 256, line: 2, detail: 0 };   // the module's own start values (core.js: `let rayAsk`)
    let normalDetail = 0;
    let auto = true;
    const formula = { kind: 'mandelbulb', scale: 2, minR: 0.5, fold: 1, fixedR: 1, rot: [0, 0, 0] as [number, number, number],
        kaliScale: 1.8, kaliMinRad2: 0.3492, kaliTrans: [0.0365, -1.9183, 0.0365] as [number, number, number], kaliRot: 0, julia: false, burning: false, burnMix: 1 };   // core.js: `let dzFormula`, `const box = {`, `const kali = {`, `let juliaOn`, `let burnOn`, `let burnMix`
    // The Julia constant as the module holds it (core.js: `let juliaHP`, `let juliaF`, `function setJuliaC`): 256-bit
    // numbers as text, and the doubles they read as. Numbers given here must be whole multiples of 2^-256.
    const K = { c: ['0', '0', '0'] as [string, string, string], num: [0, 0, 0] as [number, number, number] };
    const setK = (c: readonly string[] | readonly number[]): void => {
        if (typeof c[0] === 'string') { K.c = [...c] as [string, string, string]; K.num = (c as string[]).map((s) => Number(BigInt(s)) / 2 ** 256) as [number, number, number]; }
        else { K.num = [...c] as [number, number, number]; K.c = (c as number[]).map((x) => String(BigInt(x * 2 ** 256))) as [string, string, string]; }
    };
    const api = {
        setFormula: (kind: string, p?: { scale?: number; minR?: number; fold?: number; fixedR?: number; rot?: [number, number, number]; kaliScale?: number; kaliMinRad2?: number; kaliTrans?: [number, number, number]; kaliRot?: number; julia?: boolean; burning?: boolean; burnMix?: number; c?: string[] | number[] }) => {
            note('setFormula', kind, p); formula.kind = kind;
            const { c, ...rest } = p || {};
            Object.assign(formula, rest);
            if (c) setK(c);
        },
        formula: () => ({ ...formula, rot: [...formula.rot] as [number, number, number], kaliTrans: [...formula.kaliTrans] as [number, number, number], c: [...K.c] as [string, string, string], cNum: [...K.num] as [number, number, number] }),
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
        // three setters nothing in the shell may call any more ([4]). The module has lost the first two; it keeps
        // setRayMarch for the proofs and the bench.
        setBla: (on: boolean | 'auto') => { note('setBla', on); },
        setJacobian: (bits: number) => { note('setJacobian', bits); },
        setStepRelax: (r: number) => { note('setStepRelax', r); lever.stepRelax = r; },
        setHitRefine: (n: number) => { note('setHitRefine', n); lever.hitRefine = n; },
        setRayMarch: (bits: number, opt?: { factor?: number; floor?: number; line?: number }) => { note('setRayMarch', bits, opt); ray.bits = bits; Object.assign(ray, opt || {}); },
        rayMarch: () => ({ ...ray }),
        setCapRelax: (m: number) => { note('setCapRelax', m); lever.capRelax = m; },
        marchLevers: () => ({ ...lever }),
        setLight: (m: number, f?: number) => { note('setLight', m, f); s.light = m; if (f) s.falloff = f; },
        setColor: (m: number, sc?: number) => { note('setColor', m, sc); s.color = m; if (sc) s.cscale = sc; },
    };
    const of = (name: string): unknown[][] => calls.filter(([n]) => n === name).map(([, a]) => a);
    /** A view brings the module a constant (the real one: `dz.setView` with `julia`). */
    return { api: api as unknown as DeepZoomApi, calls, of, clear: () => { calls.length = 0; }, arrive: (c: [string, string, string]) => setK(c) };
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
    // The Constant row (2026-10-12): three numbers in the formula's own push, one composed row over them.
    const axes = ['juliaX', 'juliaY', 'juliaZ'].map((key) => DZ_PARAM_ROW_BY_ID.get(paramId('dzFormula', key)));
    const composed = DZ_PARAM_ROW_BY_ID.get('dzFormula.juliaConstant');
    const shown = (DZ_PARAM_FEATURES.dzFormula.params as Record<string, { composeFrom?: readonly string[]; hidden?: boolean; condition?: unknown }>);
    check(axes.every((row) => !!row && row.cls === 'O' && row.group === 'formula' && typeof row.read === 'function') && !!composed && composed.group === null
        && JSON.stringify(shown.juliaConstant.composeFrom) === '["juliaX","juliaY","juliaZ"]' && JSON.stringify(shown.juliaConstant.condition) === '{"param":"juliaMode","bool":true}'
        && ['juliaX', 'juliaY', 'juliaZ'].every((key) => shown[key].hidden === true),
        'map: the Julia constant is three numbers in the formula\'s push (class O, read back), shown as one composed row while Julia mode is on');
    // KaliBox (2026-10-12): its six numbers in the formula's own push, the translation shown as one composed row.
    const kaliRows = ['kaliScale', 'kaliMinRad2', 'kaliTransX', 'kaliTransY', 'kaliTransZ', 'kaliRot'].map((key) => DZ_PARAM_ROW_BY_ID.get(paramId('dzFormula', key)));
    const kaliComposed = DZ_PARAM_ROW_BY_ID.get('dzFormula.kaliTranslation');
    check(kaliRows.every((row) => !!row && row.cls === 'O' && row.group === 'formula' && typeof row.read === 'function') && !!kaliComposed && kaliComposed.group === null
        && JSON.stringify(shown.kaliTranslation.composeFrom) === '["kaliTransX","kaliTransY","kaliTransZ"]' && ['kaliTransX', 'kaliTransY', 'kaliTransZ'].every((key) => shown[key].hidden === true)
        && ['kaliScale', 'kaliMinRad2', 'kaliTranslation', 'kaliRot'].every((key) => JSON.stringify(shown[key].condition) === JSON.stringify({ param: 'kind', eq: FORMULA_KALI })),
        'map: KaliBox\'s six numbers are in the formula\'s push (class O, read back), its translation one composed row, all four rows shown while the formula is KaliBox');
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
    check(rig.calls[0][0] === 'setFormula' && JSON.stringify(rig.calls[0][1]) === '["mandelbulb",{"scale":2,"minR":0.5,"fold":1,"fixedR":1,"rot":[0,0,0],"kaliScale":1.8,"kaliMinRad2":0.3492,"kaliTrans":[0.0365,-1.9183,0.0365],"kaliRot":0,"julia":false,"burning":false,"burnMix":1}]',
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
    // The occlusion's two rows (2026-10-12): look fields like the rest, so a drag is one setLook and no compile.
    p.push({ 'dzLight.occlusionRadius': 0.3, 'dzLight.occlusionSamples': 24 });
    check(JSON.stringify(rig.of('setLook')) === '[[{"aoRadius":0.3,"aoTaps":24}]]' && rig.calls.length === 1
        && readParams(rig.api)['dzLight.occlusionRadius'] === 0.3 && readParams(rig.api)['dzLight.occlusionSamples'] === 24,
        'push: the occlusion\'s radius and sample count go as the look fields aoRadius and aoTaps, one setLook and nothing else, and read back', JSON.stringify(rig.calls));
    rig.clear();
    p.push({ 'dzFormula.iterations': 40, 'dzFormula.autoIterations': false });
    check(JSON.stringify(rig.of('setIters')) === '[[40]]' && JSON.stringify(rig.of('setAutoIters')) === '[[false]]', 'push: iterations and auto iterations have their own setters');

    // the formula: one call for the kind and the box's numbers, always ahead of the iteration count
    rig.clear();
    p.push({ 'dzFormula.iterations': 300, 'dzFormula.kind': 1, 'dzFormula.boxScale': -1.5 });
    check(rig.calls.map(([n]) => n).join() === 'setFormula,setIters' && JSON.stringify(rig.of('setFormula')) === '[["mandelbox",{"scale":-1.5,"minR":0.5,"fold":1,"fixedR":1,"rot":[0,0,0],"kaliScale":1.8,"kaliMinRad2":0.3492,"kaliTrans":[0.0365,-1.9183,0.0365],"kaliRot":0,"julia":false,"burning":false,"burnMix":1}]]',
        'push: the Mandelbox goes as setFormula("mandelbox", ...) BEFORE the iteration count sent with it (the ceiling is the formula\'s)', JSON.stringify(rig.calls));
    rig.clear();
    p.push({ 'dzFormula.boxRotY': 0.5 });
    check(JSON.stringify(rig.of('setFormula')) === '[["mandelbox",{"scale":-1.5,"minR":0.5,"fold":1,"fixedR":1,"rot":[0,0.5,0],"kaliScale":1.8,"kaliMinRad2":0.3492,"kaliTrans":[0.0365,-1.9183,0.0365],"kaliRot":0,"julia":false,"burning":false,"burnMix":1}]]', 'push: one of the box\'s numbers sends the kind and all seven', JSON.stringify(rig.of('setFormula')));
    rig.clear();
    // JULIA MODE (2026-10-12): the switch rides in the formula's own call. So does its constant, when the rows say
    // another one than the module holds: the "constant: ..." lines below.
    p.push({ 'dzFormula.juliaMode': true });
    check(JSON.stringify(rig.of('setFormula')) === '[["mandelbox",{"scale":-1.5,"minR":0.5,"fold":1,"fixedR":1,"rot":[0,0.5,0],"kaliScale":1.8,"kaliMinRad2":0.3492,"kaliTrans":[0.0365,-1.9183,0.0365],"kaliRot":0,"julia":true,"burning":false,"burnMix":1}]]' && rig.calls.length === 1,
        'push: the Julia switch goes as setFormula(kind, { ..., julia: true }), one call and nothing else', JSON.stringify(rig.calls));
    check(readParams(rig.api)['dzFormula.juliaMode'] === true, 'read-back: the Julia switch is read from the module\'s formula()');
    rig.clear();
    p.push({ 'dzFormula.juliaMode': false });
    check(JSON.stringify((rig.of('setFormula')[0] as [string, { julia: boolean }])[1].julia) === 'false', 'push: and off again');
    // BURNING (2026-10-12): the bulb's switch and its mix ride in the formula's own call too.
    rig.clear();
    p.push({ 'dzFormula.burning': true, 'dzFormula.burningMix': 0.5 });
    { const sent = rig.of('setFormula') as Array<[string, { burning?: boolean; burnMix?: number }]>;
      check(rig.calls.length === 1 && sent.length === 1 && sent[0][1].burning === true && sent[0][1].burnMix === 0.5,
          'push: Burning and its mix go as setFormula(kind, { ..., burning: true, burnMix: 0.5 }), one call and nothing else', JSON.stringify(rig.calls)); }
    check(readParams(rig.api)['dzFormula.burning'] === true && readParams(rig.api)['dzFormula.burningMix'] === 0.5, 'read-back: Burning and its mix are read from the module\'s formula()');
    rig.clear();
    p.push({ 'dzFormula.burning': false, 'dzFormula.burningMix': 1 });
    check((rig.of('setFormula')[0] as [string, { burning?: boolean }])[1].burning === false, 'push: and off again');
    rig.clear();
    p.push({ 'dzFormula.boxScale': 0.3 });
    check(JSON.stringify((rig.of('setFormula')[0] as [string, { scale: number }])[1].scale) === '1.02', 'push: a scale inside the band the renderer cannot draw goes as the nearer end (0.3 -> 1.02)', JSON.stringify(rig.of('setFormula')));
    rig.clear();
    p.push({ 'dzFormula.boxRotation': 7, 'dzFormula.juliaConstant': 7, 'dzFormula.kaliTranslation': 7 });
    check(rig.calls.length === 0, 'push: the composed Pre-Rotation, Constant and Translation rows send nothing themselves', rig.calls.map(([n]) => n).join(','));
    {
        const read = readParams(rig.api);
        check(read['dzFormula.kind'] === 1 && read['dzFormula.boxScale'] === 1.02 && read['dzFormula.boxRotY'] === 0.5 && read['dzFormula.boxFixedRadius'] === 1,
            'read: the formula reads back as the store holds it (kind as its index)', JSON.stringify(read));
    }
    // KALIBOX (2026-10-12): the third kind by name, with its own numbers under their own names, in the same one call.
    rig.clear();
    p.push({ 'dzFormula.kind': FORMULA_KALI, 'dzFormula.kaliScale': 2.04348, 'dzFormula.kaliMinRad2': 0.5, 'dzFormula.kaliTransY': -1.5, 'dzFormula.kaliRot': 0.25 });
    { const sent = rig.of('setFormula') as Array<[string, { scale?: number; kaliScale?: number; kaliMinRad2?: number; kaliTrans?: number[]; kaliRot?: number }]>;
      check(rig.calls.length === 1 && sent.length === 1 && sent[0][0] === 'kalibox' && sent[0][1].kaliScale === 2.04348 && sent[0][1].kaliMinRad2 === 0.5 && JSON.stringify(sent[0][1].kaliTrans) === '[0.0365,-1.5,0.0365]' && sent[0][1].kaliRot === 0.25 && sent[0][1].scale === 1.02,
          'push: KaliBox goes as setFormula("kalibox", { ..., kaliScale, kaliMinRad2, kaliTrans, kaliRot }), one call, the Mandelbox\'s own numbers beside them untouched', JSON.stringify(rig.calls)); }
    { const read = readParams(rig.api);
      check(read['dzFormula.kind'] === FORMULA_KALI && read['dzFormula.kaliScale'] === 2.04348 && read['dzFormula.kaliMinRad2'] === 0.5 && read['dzFormula.kaliTransX'] === 0.0365 && read['dzFormula.kaliTransY'] === -1.5 && read['dzFormula.kaliTransZ'] === 0.0365 && read['dzFormula.kaliRot'] === 0.25 && read['dzFormula.boxScale'] === 1.02,
          'read-back: KaliBox and its numbers are read from the module\'s formula() (kind as index 2)', JSON.stringify(read)); }
    rig.clear();
    p.push({ 'dzFormula.kaliScale': -0.4 });
    check(JSON.stringify((rig.of('setFormula')[0] as [string, { kaliScale: number }])[1].kaliScale) === '-1.02', 'push: a KaliBox scale inside the band goes as the nearer end (-0.4 -> -1.02)', JSON.stringify(rig.of('setFormula')));
    rig.clear();
    p.push({ 'dzFormula.kind': FORMULA_BOX, 'dzFormula.kaliScale': 1.8, 'dzFormula.kaliMinRad2': 0.3492, 'dzFormula.kaliTransY': -1.9183, 'dzFormula.kaliRot': 0 });   // back, for the lines below

    rig.clear();
    p.push({ 'dzInspect.overlays': 2, 'dzQuality.actualPixels': true });
    check(rig.calls.length === 0, 'push: a row with no push sends nothing', rig.calls.map(([n]) => n).join(','));

    rig.clear();
    p.push({ 'dzQuality.precision': 1 });
    check(rig.of('setMode').length === 0, 'push: a `dzQuality.precision` from a scene saved before 2026-10-08 pushes nothing', JSON.stringify(rig.calls));

    // What went on 2026-10-11 and may still be in a saved scene or link.
    rig.clear();
    {
        const realWarn = console.warn;
        const named: string[] = [];
        console.warn = (...args: unknown[]) => { named.push(args.map(String).join(' ')); };
        try { p.push({ 'dzQuality.trueGradient': true, 'dzQuality.bla': 0, 'dzQuality.rayMarch': false }); } finally { console.warn = realWarn; }
        check(rig.calls.length === 0 && named.length === 3 && named.every((line) => line.includes('no param map row')),
            'push: a `dzQuality.trueGradient`, `dzQuality.bla` or `dzQuality.rayMarch: false` from a scene saved before 2026-10-11 pushes nothing (each id is named once)', JSON.stringify(rig.calls) + ' ' + named.join(' | '));
    }
    // Step size: the Mandelbox's row, pushed whatever the formula (the bulb's ray march does not read it).
    rig.clear();
    p.push({ 'dzFormula.kind': 0 });
    rig.clear();
    p.push({ 'dzQuality.stepSize': 0.5 });
    check(JSON.stringify(rig.of('setStepRelax')) === '[[0.5]]' && rig.calls.length === 1,
        'push: Step size goes through setStepRelax with the bulb selected too (the box finds it in force when it is selected)', JSON.stringify(rig.calls));
    rig.clear();
    p.push({ 'dzQuality.normals': 4 });
    check(JSON.stringify(rig.of('setNormalMode')) === '[[2]]' && rig.of('setLook').some((a) => Object.keys(a[0] as object).length === 0),
        'push: Normals index 4 (Gradient, an option until 2026-10-11) reaches the renderer as 4-tap (2), with the empty setLook after it', JSON.stringify(rig.calls));

    // THE CONSTANT (2026-10-12; looseParams.ts). The module holds the Julia constant exact; the rows are doubles.
    {
        /** The `c` of the one setFormula call since the last clear; 'none' when that call carried no constant. */
        const sentC = (): string => {
            const calls = rig.of('setFormula') as Array<[string, { c?: unknown }]>;
            return calls.length !== 1 ? `${calls.length} calls` : calls[0][1].c === undefined ? 'none' : JSON.stringify(calls[0][1].c);
        };
        const held = (): string => rig.api.formula().c.join();
        // A deep constant: 1/4 + 12345 units of 2^-256, and so on. No double holds one of them; they READ as 0.25, -0.5, 0.75.
        const DEEP: [string, string, string] = [String((1n << 254n) + 12345n), String(-(1n << 255n) - 7n), String((3n << 254n) + 1n)];
        const rowsOf = (d: readonly number[]) => ({ 'dzFormula.juliaX': d[0], 'dzFormula.juliaY': d[1], 'dzFormula.juliaZ': d[2] });

        rig.clear();
        p.push({ 'dzFormula.juliaX': 0.5 });
        check(sentC() === '[0.5,0,0]' && readParams(rig.api)['dzFormula.juliaX'] === 0.5 && readParams(rig.api)['dzFormula.juliaZ'] === 0,
            'constant: a row that is changed sends the three numbers in the formula\'s own call, and they read back', sentC());
        rig.clear();
        p.push({ 'dzFormula.boxFold': 1.25 });
        check(sentC() === 'none', 'constant: another of the formula\'s values, pushed while the rows equal what the renderer holds, sends no constant', sentC());

        // A view brings a deep constant, and the shell writes its doubles into the rows (deep-zoom/locations.ts).
        rig.arrive(DEEP); p.constantArrived();
        rig.clear();
        p.push(rowsOf([0.25, -0.5, 0.75]));
        check(sentC() === 'none' && held() === DEEP.join(),
            'constant: rows that equal what the renderer holds send no constant: one that came with a view keeps every digit', `sent ${sentC()}; held ${held()}`);
        rig.clear();
        p.push({ 'dzFormula.juliaX': 0.3125 });               // a drag
        check(sentC() === '[0.3125,-0.5,0.75]', 'constant: a drag from there sends numbers, the two untouched coordinates as their doubles', sentC());
        rig.clear();
        p.push({ 'dzFormula.juliaX': 0.25 });                 // the undo of that drag
        check(sentC() === JSON.stringify(DEEP) && held() === DEEP.join(),
            'constant: rows put back onto a constant that came with a view send its exact strings, not their doubles', `sent ${sentC()}; held ${held()}`);

        // Nine more arrive: eight are kept, so the first two of the ten (DEEP and the first of these) are forgotten.
        const more: Array<{ c: [string, string, string]; d: [number, number, number] }> = [];
        for (let i = 1; i <= 9; i++) {
            const c: [string, string, string] = [String((BigInt(i) << 250n) + 1n), '0', '0'];      // reads as i / 64
            more.push({ c, d: [i / 64, 0, 0] });
            rig.arrive(c); p.constantArrived();
        }
        rig.clear();
        p.push(rowsOf(more[1].d));
        const oldestKept = sentC();
        rig.clear();
        p.push(rowsOf(more[0].d));
        const firstOut = sentC();
        rig.clear();
        p.push(rowsOf([0.25, -0.5, 0.75]));
        check(oldestKept === JSON.stringify(more[1].c) && firstOut === '[0.015625,0,0]' && sentC() === '[0.25,-0.5,0.75]',
            'constant: the ninth to arrive after it pushes a constant out (eight are kept): the oldest kept one goes as its strings, the two forgotten ones as numbers',
            `oldest kept ${oldestKept}; forgotten ${firstOut} and ${sentC()}`);
    }
    p.dispose();
}

// ── [4] retired ──────────────────────────────────────────────────────────────────────────────────
console.log('[4] retired (2026-10-11): True-gradient march, BLA, the Ray march switch, Normals: Gradient');
{
    const quality = DZ_PARAM_FEATURES.dzQuality.params as Record<string, { condition?: unknown }>;
    const rowIds = DZ_PARAM_ROWS.map((r) => paramId(r.feature, r.key));
    check(['trueGradient', 'bla', 'rayMarch'].every((key) => !(key in quality) && !rowIds.includes('dzQuality.' + key)),
        'retired: neither the feature nor the map has `trueGradient`, `bla` or `rayMarch`');
    const rig = makeApi();
    const p = createParamPusher(rig.api);
    p.push(defaultParams());
    check(rig.calls.length > 15 && rig.of('setBla').length === 0 && rig.of('setJacobian').length === 0 && rig.of('setRayMarch').length === 0,
        'retired: a push of every param sends none of setBla, setJacobian, setRayMarch', rig.calls.map(([n]) => n).join(','));
    check(JSON.stringify(quality.stepSize?.condition) === JSON.stringify({ param: '$dzFormula.kind', neq: FORMULA_BULB }) && rig.of('setStepRelax').length === 1,
        'retired: Step size is the row of the Mandelbox and of KaliBox (shown while the formula is not the bulb), and its value was still pushed with the bulb selected',
        JSON.stringify(quality.stepSize?.condition));
    check(NORMALS_OPTIONS.length === 4 && normalsIndex(4) === 2 && normalsToRenderer(4) === 2 && normalsIndex(3) === 3 && normalsToRenderer(3) === 3 && normalsIndex(undefined) === 2,
        'retired: Normals has four options, and an index that names none (4, Gradient) reads as 4-tap: index 2, renderer mode 2',
        `${NORMALS_OPTIONS.length} options, normalsIndex(4) ${normalsIndex(4)}, normalsToRenderer(4) ${String(normalsToRenderer(4))}`);
    p.dispose();
}

console.log(failed === 0 ? 'param-map: all green' : `param-map: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
