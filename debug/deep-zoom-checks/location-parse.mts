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
 * 2026-10-09, the gradient a place carries (stage 5): `lookOf` returning the look as pasted ->
 * 1 red ("a pasted gradient that is not one is dropped ...").
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
    // A place carries its gradient in the look (stage 5). Pasted text is not trusted with one.
    const GRADIENT = { colorSpace: 'linear', blendSpace: 'oklab', stops: [
        { id: 'a', position: 0, color: '#102030', bias: 0.5, interpolation: 'linear' },
        { id: 'b', position: 1, color: '#F0E0D0', bias: 0.5, interpolation: 'linear' },
    ] };
    const withColour = (dzColour: unknown): string => JSON.stringify({ view: VIEW, look: { dzColour, detail: 2 }, depth: '1e-9' });
    const colourOf = (text: string): Record<string, unknown> | undefined => {
        const r = parseLocationText(text);
        return r.ok ? (r.locations[0].look?.dzColour as Record<string, unknown> | undefined) : undefined;
    };
    const good = colourOf(withColour({ plain: false, mode: 0, scale: 2, gradient: GRADIENT }));
    const kept = good?.gradient as typeof GRADIENT | undefined;
    check(JSON.stringify(kept?.stops) === JSON.stringify(GRADIENT.stops) && kept?.colorSpace === 'linear' && kept?.blendSpace === 'oklab' && good?.scale === 2,
        'a pasted place keeps a well-formed gradient, and the fields beside it');
    const junk = colourOf(withColour({ plain: false, mode: 0, scale: 2, gradient: { stops: 'red to blue' } }));
    check(!!junk && !('gradient' in junk) && junk.scale === 2 && junk.plain === false, 'a pasted gradient that is not one is dropped, and the place keeps its other colour fields');
    const none = colourOf(withColour({ plain: true, mode: 0, scale: 1 }));
    check(!!none && !('gradient' in none), 'a place from before the gradient has no gradient key (a jump leaves the gradient alone)');
}

console.log(failed === 0 ? 'location-parse: all green' : `location-parse: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
