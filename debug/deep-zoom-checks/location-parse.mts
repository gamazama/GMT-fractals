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
 */
import { locationToText, parseLocationText } from '../../deep-zoom/locationParse.ts';

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
}

console.log(failed === 0 ? 'location-parse: all green' : `location-parse: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
