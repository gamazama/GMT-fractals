/**
 * location-parse check: text in, locations out (`deep-zoom/locationParse.ts`). Node only.
 *
 *   npx tsx debug/deep-zoom-checks/location-parse.mts
 *
 * Five kinds of text: this shell's shape, a whole saved row, last week's flat shape (a bare view
 * with a numeric depth), an array, and text that is not a location. The camera strings must come
 * back byte for byte, and a `cam` that is not three whole numbers as text must be refused.
 *
 * FALSIFICATION RECORD, 2026-10-08: the whole-number test on `cam` removed (`isCam` accepting any
 * three strings) -> 1 red ("a cam holding a decimal point is refused").
 * 2026-10-10, a place is a camera and a formula, and a view may carry a roll (one break per run in
 * deep-zoom/locationParse.ts, 1 red each): `lookOf` returning the look as pasted -> "of a pasted
 * look only the formula is kept ..."; `lookOf` answering a look whatever it was given -> "a pasted
 * look with no formula in it ..."; the roll line taken out of `viewOf` -> "a view with a roll reads
 * back with it"; the roll written whatever it is -> "a view without a roll ... has no roll key".
 * (The line of 2026-10-09 about a pasted gradient went with the gradient a place no longer holds.)
 * 2026-10-12, a view may carry a Julia constant (one break, restored byte for byte): the `julia` line taken out
 * of `viewOf` -> 1 red ("a Julia place reads back with its constant, three strings byte-identical, and its
 * mode"). The refusal of a mangled constant was not broken on purpose.
 *
 * EXPORT ALL AND AN IMPORTED LIST (2026-10-12): the "export: ..." and "import: ..." lines. The list
 * "Export all" writes (`locationsToText`) must read back through `parseLocationList` with every
 * camera string and the Julia constant byte for byte; one number-mangled entry must be refused by
 * itself; the old prototype's file must read; a scene must not be taken for locations; and
 * `newLocations` must call two places the same exactly when their camera strings and formula are.
 * FALSIFIED 2026-10-12, three breaks in deep-zoom/locationParse.ts, one a run, each restored:
 *   - `locationsToText` writing the view without its Julia constant -> 2 red ("export: the Julia
 *     constant comes back byte for byte, and no other place gains one", and "import: the same file
 *     again adds nothing ...": the place that lost its constant is no longer the same place).
 *   - `parseLocationList` refusing the whole text at its first unreadable entry, as the strict
 *     reader does -> 3 red ("import: one entry with a mangled camera is refused by itself ...",
 *     "import: the four that are read are the other four ...", "import: a list with no readable
 *     entry ...").
 *   - `locationKey` with the formula's kind taken out -> ALL GREEN. Not a red: the numbers after
 *     it in the key (three for the bulb, seven for the box) tell the two formulas apart without
 *     it. The duplicate rule's lines are therefore NOT falsified, and the file's header says so
 *     (`@assumption`). Whoever spends a break on them next: take the camera out of the key.
 * Not broken on purpose: `looksLikeLocations` (its lines passed as written), the summary's words.
 */
import { importSummary, locationToText, locationsToText, looksLikeLocations, newLocations, parseLocationList, parseLocationText } from '../../deep-zoom/locationParse.ts';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

const CAM: [string, string, string] = [
    '-19106688270107545123610310944093228319268234083931764161217485625786859879978',
    '2056390632353041980388441420253193046898375110266709396020905008395931668174',
    '106035815535807686550824900054021630250672589610944549407697460964969796977517',
];
const VIEW = { cam: CAM, yaw: -1.01, pitch: -0.41, iters: 56, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 };
const sameCam = (c: unknown): boolean => Array.isArray(c) && c.length === 3 && c.every((v, i) => v === CAM[i]);

{
    const text = locationToText({ view: VIEW as never, depth: '1.14e-17' });
    const r = parseLocationText(text);
    check(r.ok && r.locations.length === 1 && sameCam(r.locations[0].view.cam) && r.locations[0].depth === '1.14e-17' && r.locations[0].view.iters === 56,
        'this shell’s own text reads back: the camera strings byte for byte, the depth, the iterations');
}
{
    const r = parseLocationText(JSON.stringify({ id: 'a1', label: 'My place', createdAt: 1, state: { view: VIEW, depth: '2e-9' } }));
    check(r.ok && sameCam(r.locations[0].view.cam) && r.labels[0] === 'My place', 'a whole saved row reads, with its label');
}
{
    const r = parseLocationText(JSON.stringify({ ...VIEW, depth: 6.4e-53, name: 'Last week' }));
    check(r.ok && sameCam(r.locations[0].view.cam) && r.locations[0].depth === '6.4e-53' && r.locations[0].look === undefined && r.labels[0] === 'Last week',
        'last week’s flat shape reads: a bare view, a numeric depth kept as text, no look');
}
{
    const r = parseLocationText(JSON.stringify({ cam: CAM, yaw: 0, pitch: 0 }));
    check(r.ok && r.locations[0].view.iters === 14 && r.locations[0].view.power === 8 && r.locations[0].view.falloff === 4, 'a view with only the camera gets the renderer’s default look fields');
}
{
    const r = parseLocationText(JSON.stringify([{ view: VIEW }, VIEW]));
    check(r.ok && r.locations.length === 2 && r.locations.every((l) => sameCam(l.view.cam)), 'an array reads as several locations');
}
{
    const bad = (text: string): string => { const r = parseLocationText(text); return r.ok ? '' : r.reason; };
    check(bad('') !== '' && bad('hello') !== '' && bad('{}') !== '' && bad('[]') !== '' && bad('42') !== '', 'empty text, plain words, {}, [] and a number are refused, each with a reason');
    check(bad(JSON.stringify({ ...VIEW, cam: [1, 2, 3] })) !== '', 'a cam of numbers is refused');
    check(bad(JSON.stringify({ ...VIEW, cam: ['1.5e76', CAM[1], CAM[2]] })) !== '', 'a cam holding a decimal point is refused');
    check(bad(JSON.stringify({ ...VIEW, cam: [CAM[0], CAM[1]] })) !== '', 'a cam of two values is refused');
    check(bad(JSON.stringify({ cam: CAM })) !== '', 'a camera with no yaw and pitch is refused');
    check(/item 2/.test(bad(JSON.stringify([VIEW, { nope: 1 }]))), 'in a list the reason names the item');
}

{
    // A place is a camera and a formula. Text copied before 2026-10-10 carries the whole look of that day.
    const FORMULA = { power: 4, phaseTheta: 0, phasePhi: 0, iterations: 148, autoIterations: true };
    const OLD_LOOK = {
        dzFormula: FORMULA,
        dzLight: { shading: 1, lightType: 0, lampFalloff: 4, keyElevation: 40 },
        dzColour: { plain: false, mode: 0, scale: 2, gradient: { colorSpace: 'linear', stops: [{ id: 'a', position: 0, color: '#102030' }] } },
        detail: 7.5,
        march: { stepSize: 0.1, hitRefine: 2, reach: 2 },
    };
    const old = parseLocationText(JSON.stringify({ view: VIEW, look: OLD_LOOK, depth: '3.4e-76' }));
    check(old.ok && JSON.stringify(old.locations[0].look) === JSON.stringify({ dzFormula: FORMULA }) && sameCam(old.locations[0].view.cam),
        'of a pasted look only the formula is kept: the light, the colour with its gradient, the detail and the march of an older text are dropped, and the place still reads',
        old.ok ? JSON.stringify(old.locations[0].look) : old.reason);
    const none = parseLocationText(JSON.stringify({ view: VIEW, look: { dzLight: OLD_LOOK.dzLight, detail: 2 }, depth: '1e-9' }));
    check(none.ok && !('look' in none.locations[0]), 'a pasted look with no formula in it leaves the place a bare view');
}
{
    // The roll: carried when the camera has one, absent when it has none.
    const rolled = parseLocationText(locationToText({ view: { ...VIEW, roll: -0.75 } as never, depth: '1e-9' }));
    check(rolled.ok && rolled.locations[0].view.roll === -0.75, 'a view with a roll reads back with it');
    const level = parseLocationText(JSON.stringify({ view: VIEW }));
    const zero = parseLocationText(JSON.stringify({ view: { ...VIEW, roll: 0 } }));
    const junk = parseLocationText(JSON.stringify({ view: { ...VIEW, roll: 'sideways' } }));
    check(level.ok && !('roll' in level.locations[0].view) && zero.ok && !('roll' in zero.locations[0].view) && junk.ok && !('roll' in junk.locations[0].view),
        'a view without a roll, with a roll of 0 or with one that is not a number has no roll key (it reads as 0)');

    // JULIA MODE (2026-10-12): the constant travels with the view as three more strings; the mode with the formula.
    const K: [string, string, string] = [CAM[1], '-' + CAM[2].replace('-', ''), CAM[0]];
    const julia = parseLocationText(locationToText({ view: { ...VIEW, julia: K } as never, look: { dzFormula: { power: 8, phaseTheta: 0, phasePhi: 0, iterations: 56, autoIterations: true, kind: 0, juliaMode: true } } as never, depth: '4.2e+0' }));
    check(julia.ok && julia.locations[0].view.julia?.join() === K.join() && (julia.locations[0].look?.dzFormula as { juliaMode?: boolean }).juliaMode === true,
        'a Julia place reads back with its constant, three strings byte-identical, and its mode');
    const plain = parseLocationText(JSON.stringify({ view: VIEW }));
    check(plain.ok && !('julia' in plain.locations[0].view), 'a view without a Julia constant has no such key');
    const mangled = [{ ...VIEW, julia: [0.25, 0.1, 0.05] }, { ...VIEW, julia: [K[0], K[1]] }, { ...VIEW, julia: [K[0], K[1], '1.5e77'] }].map((v) => parseLocationText(JSON.stringify({ view: v })));
    check(mangled.every((r) => !r.ok && /julia/.test(r.reason)), 'a Julia constant of numbers, of two strings or with a number-mangled string is refused with a reason (never a wrong Julia set)');
}

// ── EXPORT ALL and a list that is imported (2026-10-12) ──────────────────────────────────────────
const shifted = (c: [string, string, string], by: number): [string, string, string] => c.map((s) => String(BigInt(s) + BigInt(by))) as [string, string, string];
const CAM_B = shifted(CAM, 1), CAM_C = shifted(CAM, 2), CAM_D = shifted(CAM, 3), CAM_E = shifted(CAM, 4);
const K: [string, string, string] = [CAM[1], '-' + CAM[2], CAM[0]];
const BULB = { power: 8, phaseTheta: 0, phasePhi: 0, iterations: 56, autoIterations: true, kind: 0, juliaMode: false };
const BOX = { power: 8, phaseTheta: 0, phasePhi: 0, iterations: 120, autoIterations: true, kind: 1, boxScale: -1.5, boxMinRadius: 0.5, boxFold: 1, boxFixedRadius: 1, boxRotX: 0, boxRotY: 0.25, boxRotZ: 0, juliaMode: false };
type Row = { label: string; thumbnail?: string; state: Parameters<typeof locationToText>[0] };
const ROWS: Row[] = [
    { label: 'Certified edge', thumbnail: 'data:image/jpeg;base64,AAAA', state: { view: VIEW as never, look: { dzFormula: BULB } as never, depth: '6.6e-35' } },
    { label: 'A Julia place', thumbnail: 'data:image/jpeg;base64,BBBB', state: { view: { ...VIEW, cam: CAM_B, julia: K } as never, look: { dzFormula: { ...BULB, juliaMode: true } } as never, depth: '4.2' } },
    { label: 'In the box', state: { view: { ...VIEW, cam: CAM_C, roll: -0.75 } as never, look: { dzFormula: BOX } as never, depth: '3e-9', note: 'kept for the fold' } },
    { label: 'From last week', state: { view: { ...VIEW, cam: CAM_D } as never, depth: '' } },
    // a place saved before 2026-10-10 still holds the whole look of that day
    { label: 'An old one', state: { view: { ...VIEW, cam: CAM_E } as never, look: { dzFormula: { ...BULB, power: 4 }, dzLight: { shading: 1 }, dzColour: { gradient: { stops: [{ id: 'a', position: 0, color: '#102030' }] } }, detail: 7.5 } as never, depth: '1e-12' } },
];
const sameTriple = (a: unknown, b: readonly string[]): boolean => Array.isArray(a) && a.length === 3 && a.every((v, i) => v === b[i]);
const EXPORTED = locationsToText(ROWS);
{
    const back = parseLocationList(EXPORTED);
    check(back.ok && back.list && back.total === 5 && back.locations.length === 5 && back.refused.length === 0, 'export: the list "Export all" writes reads back whole, five of five',
        back.ok ? `${back.locations.length} read, ${back.refused.length} refused` : back.reason);
    if (back.ok) {
        check(back.locations.every((l, i) => sameTriple(l.view.cam, ROWS[i].state.view.cam)), 'export: every cam string comes back byte for byte, in the order exported');
        check(sameTriple(back.locations[1].view.julia, K) && back.locations.every((l, i) => i === 1 || !('julia' in l.view)), 'export: the Julia constant comes back byte for byte, and no other place gains one');
        check(back.labels.join('|') === ROWS.map((r) => r.label).join('|') && back.locations.map((l) => l.depth).join('|') === ROWS.map((r) => r.state.depth).join('|'),
            'export: the names and the depths come back (a place with no depth stays without one)');
        check(JSON.stringify(back.locations[0].look) === JSON.stringify({ dzFormula: BULB }) && JSON.stringify(back.locations[2].look) === JSON.stringify({ dzFormula: BOX })
            && (back.locations[1].look?.dzFormula as { juliaMode?: boolean }).juliaMode === true && !('look' in back.locations[3]),
            'export: each formula comes back as it was saved - the bulb, the box with its seven numbers, Julia mode - and a bare view stays bare');
        check(back.locations[2].view.roll === -0.75 && back.locations[2].note === 'kept for the fold', 'export: a roll and a note come back');
    }
    check(!/thumbnail|data:image/.test(EXPORTED), 'export: no thumbnail is in the file');
    check(!/dzLight|dzColour|"detail"/.test(EXPORTED) && /"power": 4/.test(EXPORTED), 'export: of an older place\'s look only the formula is written');
    check(looksLikeLocations(EXPORTED), 'export: the file is recognised as locations');
}
{
    // One entry number-mangled on the way (a spreadsheet, a careless editor): it alone is refused.
    const data = JSON.parse(EXPORTED) as Array<{ view: { cam: unknown[] } }>;
    data[1].view.cam = [1.5e76, Number(CAM_B[1]), Number(CAM_B[2])];
    const text = JSON.stringify(data);
    const part = parseLocationList(text);
    check(part.ok && part.total === 5 && part.locations.length === 4 && part.refused.length === 1 && part.refused[0].item === 2 && /cam/.test(part.refused[0].reason),
        'import: one entry with a mangled camera is refused by itself, with its place in the list and its reason, and the rest are read',
        part.ok ? `${part.locations.length} read, refused ${JSON.stringify(part.refused)}` : part.reason);
    check(part.ok && [CAM, CAM_C, CAM_D, CAM_E].every((c, i) => sameTriple(part.locations[i].view.cam, c)) && part.labels.join('|') === 'Certified edge|In the box|From last week|An old one',
        'import: the four that are read are the other four, byte for byte and in order');
    const strict = parseLocationText(text);
    check(!strict.ok && /item 2/.test(strict.reason), 'import: the strict reader still refuses that whole text, naming the item');
    for (const entry of data) entry.view.cam = [1, 2, 3];
    const none = parseLocationList(JSON.stringify(data));
    check(!none.ok && /item 1/.test(none.reason) && none.detail !== undefined && !/That text/.test(none.detail) && looksLikeLocations(JSON.stringify(data)),
        'import: a list with no readable entry is refused with the first reason - and is still recognised as a file of locations');
}
{
    // The old prototype's export: entries { format, version, name, depth (a number), view }.
    const proto = JSON.stringify([
        { format: 'gmt-deepzoom-location', version: 1, name: 'Seahorse valley', depth: 6.4e-53, view: VIEW },
        { format: 'gmt-deepzoom-location', version: 1, name: 'The rim', depth: 2e-9, view: { ...VIEW, cam: CAM_B } },
    ], null, 1);
    const r = parseLocationList(proto);
    check(r.ok && r.list && r.locations.length === 2 && sameTriple(r.locations[0].view.cam, CAM) && sameTriple(r.locations[1].view.cam, CAM_B)
        && r.labels.join('|') === 'Seahorse valley|The rim' && r.locations[0].depth === '6.4e-53' && r.locations.every((l) => !('look' in l)),
        'import: the old prototype\'s deep-zoom-locations.json reads - names, numeric depths as text, bare views, the camera strings byte for byte');
    check(looksLikeLocations(proto) && looksLikeLocations(JSON.stringify(VIEW)) && looksLikeLocations(locationToText({ view: VIEW as never, depth: '1e-9' })), 'import: the prototype\'s file, a bare view and one copied location are recognised as locations');
    // What is NOT locations: a scene (its camera is under dzView, and it has features), a gradients document, words.
    const scene = JSON.stringify({ version: 0, name: 'Untitled', formula: 'mandelbulb-deepzoom', dzView: { v: 1, cam: CAM, yaw: '-1.01', pitch: '-0.41', depth: '1e-9' }, features: { dzFormula: BULB }, sequence: { tracks: {} } });
    check(!looksLikeLocations(scene) && !looksLikeLocations(JSON.stringify({ format: 'gmt-gradients', sets: [{ name: 'Kept', gradients: [{ stops: [] }] }] }))
        && !looksLikeLocations('hello') && !looksLikeLocations('[]') && !looksLikeLocations('42') && !looksLikeLocations('') && !looksLikeLocations(JSON.stringify({ ...JSON.parse(scene), cam: CAM })),
        'import: a scene, a scene that also names a cam, a gradients file, plain words, [] and a number are NOT locations');
}
{
    // THE DUPLICATE RULE: the same camera strings and formula are the same place.
    const have = ROWS.map((r) => r.state);
    const again = parseLocationList(EXPORTED);
    const twice = again.ok ? newLocations(have, again.locations) : null;
    check(!!twice && twice.fresh.length === 0 && twice.skipped === 5, 'import: the same file again adds nothing - five of five are already there', JSON.stringify(twice));
    const empty = again.ok ? newLocations([], again.locations) : null;
    check(!!empty && empty.fresh.join() === '0,1,2,3,4' && empty.skipped === 0, 'import: into an empty list all five are new, in the file\'s order');
    const state = (view: object, formula?: object): never => ({ view: { ...VIEW, ...view }, ...(formula ? { look: { dzFormula: formula } } : {}), depth: '1e-9' }) as never;
    const base = state({}, BULB);
    const dup = (other: never): boolean => newLocations([base], [other]).skipped === 1;
    check(dup(state({ yaw: 2.5, pitch: 0.1, roll: 0.3 }, BULB)) && dup(state({}, { ...BULB, iterations: 300, autoIterations: false })) && dup(state({ iters: 99, surf: 4 }, BULB)),
        'import: another direction of view, another iteration count or another detail at the same camera is the same place');
    check(dup(state({})) && dup(state({}, { power: 8, phaseTheta: 0, phasePhi: 0, iterations: 56, autoIterations: true })),
        'import: a bare view, and a place saved before the formula choice existed, are the Mandelbulb\'s: the same place as the bulb\'s own');
    check(!dup(state({ cam: CAM_B }, BULB)) && !dup(state({ cam: [CAM[0], CAM[1], CAM_B[2]] }, BULB)), 'import: another camera - one string differing in its last digit - is another place');
    check(!dup(state({}, BOX)) && !dup(state({}, { ...BULB, power: 4 })) && !dup(state({}, { ...BULB, phaseTheta: 0.5 })) && !dup(state({ power: 4 })),
        'import: the same camera under the other formula, another power or another phase is another place');
    check(!dup(state({ julia: K }, { ...BULB, juliaMode: true })) && newLocations([state({ julia: K }, { ...BULB, juliaMode: true })], [state({ julia: [K[0], K[1], CAM_B[0]] }, { ...BULB, juliaMode: true })]).skipped === 0,
        'import: the same camera in Julia mode, or with another Julia constant, is another place');
    { const burn = (mix: number, on = true) => state({}, { ...BULB, burning: on, burningMix: mix });
      check(!dup(burn(1)) && newLocations([burn(1)], [burn(0.5)]).skipped === 0 && newLocations([burn(1)], [burn(1)]).skipped === 1 && dup(burn(0.5, false)),
          'import: the same camera with Burning on, or at another Burning mix, is another place; with Burning off the mix says nothing'); }
    check(newLocations([state({}, BOX)], [state({}, { ...BOX, boxScale: 2 })]).skipped === 0 && newLocations([state({}, BOX)], [state({}, { ...BOX, power: 4 })]).skipped === 1,
        'import: a box of another scale is another place; the bulb\'s power does not tell two boxes apart');
    // Only what is ALREADY in the list counts. Seen in the app 2026-10-12: two starter dives begin at the same
    // camera; saved, exported and imported into an empty list, the second was "skipped" and the list came back short.
    const within = newLocations([], [base, state({ cam: CAM_B }, BULB), base]);
    check(within.fresh.join() === '0,1,2' && within.skipped === 0 && newLocations([base], [base, state({ cam: CAM_B }, BULB), base]).fresh.join() === '1',
        'import: a place that comes twice in one file is added twice (an exported list comes back whole); once it is in the list, neither copy is added');
    check(importSummary({ added: 5, skipped: 0, refused: 0 }) === '5 locations added' && importSummary({ added: 1, skipped: 0, refused: 0 }) === '1 location added'
        && importSummary({ added: 0, skipped: 5, refused: 0 }) === '0 locations added, 5 skipped (already in My locations)'
        && importSummary({ added: 3, skipped: 1, refused: 1 }) === '3 locations added, 1 skipped (already in My locations), 1 could not be read',
        'import: the toast says how many were added, how many were skipped and how many could not be read');
}

console.log(failed === 0 ? 'location-parse: all green' : `location-parse: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
