/**
 * Guard: the camera pair keeps its pan on a long leg.
 *
 * `engine/animation/cameraPairRegistry.ts` moves a pan with a zoom so the pan crosses the screen
 * at an even speed: pan = c0 + (c1 - c0) * (zT - z0) / (z1 - z0). The pan is two f64 words (a
 * double-double), but the share of the way is ONE f64. Measured from the shallow key it has no
 * digits left once the zoom is 16 decades below that key, and the pan arrives early: 5 % of a
 * view off at zoom 1e-16, the whole remaining pan from 1e-17 on. Measured from the DEEPER key
 * the share goes to zero where the view is smallest and every digit survives.
 *
 * Each fixture is ONE pan segment across 30 decades of a log zoom track. At every checked frame
 * the real `evaluatePairedTrack` is asked for both words and the sum is compared with the same
 * formula worked in exact integers, using the engine's own zoom at that frame:
 *
 *   [1] plain   linear pan keys, the deep key carries a low word          (dive)
 *   [2] exact   the same with both low words zero                         (dive)
 *   [3] rising  the deep key first                                        (climb)
 *   [4] eased   Bezier pan keys: the pair looks the zoom up at a moved, "virtual" frame
 *   [5] curved  Bezier zoom keys: the zoom itself eased in log space
 *
 * THE BAR. 1e-12 of a view, or two steps of the pair's own low word where that is coarser. The
 * second half is not slack in the arithmetic: two f64 words whose low word is about 1e-18 cannot
 * hold anything finer than 1.9e-34, which is already 1e-5 of a view at zoom 1e-29. So with that
 * low word the plain 1e-12 of a view is what is asserted down to zoom 4e-22, and the pair's own
 * grid below it. Fixture [2] has no such floor and is held to 1e-12 of a view all the way down
 * (measured: 7e-17).
 *
 * Run: `npm run test:camera-pair`
 *
 * ── FALSIFIED 2026-10-11 ─────────────────────────────────────────────────
 *   Against the code as it stood, measuring from the shallow key (grep `fromK1` in the registry
 *   and force it false): 183 of 295 frames red, every fixture but [3], the first at zoom 1e-5
 *   (2e-12 of a view) and the worst 0.45 of a view - the whole pan. [3] stays green either way:
 *   on a climb the shallow-key form already measures from the deeper key.
 */
import { registerLogTrack } from '../engine/animation/logTrackRegistry';
import { registerCameraPair, evaluatePairedTrack } from '../engine/animation/cameraPairRegistry';
import { AnimationMath } from '../engine/math/AnimationMath';
import type { AnimationSequence, Keyframe, Track } from '../types';

// ── exact arithmetic: every f64 here is an exact multiple of 2^-700 ──
const P = 700n;
function big(x: number): bigint {
    if (x === 0) return 0n;
    const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, Math.abs(x));
    const bits = dv.getBigUint64(0), exp = Number((bits >> 52n) & 0x7ffn), mant = bits & 0xfffffffffffffn;
    const M = exp === 0 ? mant : mant | 0x10000000000000n, sh = P + BigInt(exp === 0 ? -1074 : exp - 1075);
    if (sh < 0n) throw new Error(`${x} needs more than ${P} bits`);
    return (x < 0 ? -1n : 1n) * (M << sh);
}
const toNum = (v: bigint): number => {
    const neg = v < 0n, a = neg ? -v : v, s = a.toString(2).length - 60;
    const m = s > 0 ? Number(a >> BigInt(s)) * 2 ** s : Number(a);
    return (neg ? -m : m) / 2 ** Number(P);
};
/** One step of the f64 grid at x. */
const ulp = (x: number): number => (x === 0 ? 0 : 2 ** (Math.floor(Math.log2(Math.abs(x))) - 52));

const FRAMES = 300;
const key = (id: string, frame: number, value: number, more: Partial<Keyframe> = {}): Keyframe => ({ id, frame, value, interpolation: 'Linear', ...more });
const track = (id: string, keyframes: Keyframe[]): Track => ({ id, type: 'float', label: id, keyframes });

interface Fixture {
    name: string;
    zoom: [Keyframe, Keyframe];
    hi: [Keyframe, Keyframe];
    lo: [number, number];
}
const SHALLOW = 1, DEEP = 1e-30, LOW = 1.2345678901234567e-18;
const fixtures: Fixture[] = [
    { name: 'plain', zoom: [key('z0', 0, SHALLOW), key('z1', FRAMES, DEEP)], hi: [key('h0', 0, 0.75), key('h1', FRAMES, 0.3)], lo: [0, LOW] },
    { name: 'exact', zoom: [key('z0', 0, SHALLOW), key('z1', FRAMES, DEEP)], hi: [key('h0', 0, 0.75), key('h1', FRAMES, 0.3)], lo: [0, 0] },
    { name: 'rising', zoom: [key('z0', 0, DEEP), key('z1', FRAMES, SHALLOW)], hi: [key('h0', 0, 0.3), key('h1', FRAMES, 0.75)], lo: [LOW, 0] },
    {
        name: 'eased', zoom: [key('z0', 0, SHALLOW), key('z1', FRAMES, DEEP)], lo: [0, LOW],
        hi: [
            key('h0', 0, 0.75, { interpolation: 'Bezier', rightTangent: { x: 100, y: 0 } }),
            key('h1', FRAMES, 0.3, { interpolation: 'Bezier', leftTangent: { x: -100, y: 0 } }),
        ],
    },
    {
        name: 'curved', hi: [key('h0', 0, 0.75), key('h1', FRAMES, 0.3)], lo: [0, LOW],
        zoom: [
            key('z0', 0, SHALLOW, { interpolation: 'Bezier', rightTangent: { x: 100, y: 0 } }),
            key('z1', FRAMES, DEEP, { interpolation: 'Bezier', leftTangent: { x: -100, y: 20 } }),     // y in log units: the dive levels off into the key
        ],
    },
];

let pass = 0;
const fails: string[] = [];
const show = (x: number): string => x.toExponential(2);

fixtures.forEach((fx, n) => {
    const ids = { zoom: `pair${n}.zoom`, hi: `pair${n}.x`, lo: `pair${n}.xLow` };
    registerLogTrack(ids.zoom);
    registerCameraPair({ zoom: ids.zoom, pan: [ids.hi], panLow: [ids.lo] });
    const sequence: AnimationSequence = {
        durationFrames: FRAMES,
        tracks: {
            [ids.zoom]: track(ids.zoom, fx.zoom),
            [ids.hi]: track(ids.hi, fx.hi),
            [ids.lo]: track(ids.lo, [key('l0', 0, fx.lo[0]), key('l1', FRAMES, fx.lo[1])]),
        },
    };
    const [h0, h1] = fx.hi;
    const c0 = big(h0.value) + big(fx.lo[0]), c1 = big(h1.value) + big(fx.lo[1]);
    const z0 = big(fx.zoom[0].value), z1 = big(fx.zoom[1].value);

    console.log(`[${n + 1}] ${fx.name}`);
    let worstViews = 0, worstOverBar = 0, deepest = Infinity;
    for (let frame = 5; frame < FRAMES; frame += 5) {
        // the frame the pair looks the zoom up at: the pan keys' own easing moves it (linear keys: no move)
        let at = frame;
        if (h0.interpolation === 'Bezier') {
            const dc = h1.value - h0.value;
            const u = AnimationMath.interpolate(frame,
                { ...h0, value: 0, rightTangent: h0.rightTangent && { x: h0.rightTangent.x, y: h0.rightTangent.y / dc } },
                { ...h1, value: 1, leftTangent: h1.leftTangent && { x: h1.leftTangent.x, y: h1.leftTangent.y / dc } }, false, false);
            at = u * FRAMES;
        }
        const zT = AnimationMath.interpolate(at, fx.zoom[0], fx.zoom[1], false, true);        // the engine's own zoom there
        const hi = evaluatePairedTrack(ids.hi, frame, sequence), lo = evaluatePairedTrack(ids.lo, frame, sequence);
        if (hi === undefined || lo === undefined) { fails.push(`${fx.name}: the pair did not answer at frame ${frame}`); return; }
        const exact = (c0 * (z1 - z0) + (c1 - c0) * (big(zT) - z0)) / (z1 - z0);              // the same formula, in integers
        const err = Math.abs(toNum(big(hi) + big(lo) - exact));
        const bar = Math.max(1e-12 * zT, 2 * ulp(Math.max(Math.abs(lo), Math.abs(fx.lo[0]), Math.abs(fx.lo[1]))));
        worstViews = Math.max(worstViews, err / zT);
        worstOverBar = Math.max(worstOverBar, err / bar);
        deepest = Math.min(deepest, zT);
        if (err > bar) fails.push(`${fx.name}: frame ${frame}, zoom ${show(zT)}: the pan is ${show(err / zT)} of a view off (the bar there is ${show(bar / zT)})`);
        else pass++;
    }
    console.log(`    down to zoom ${show(deepest)}: worst ${show(worstViews)} of a view, ${show(worstOverBar)} of the bar`);
});

if (fails.length > 0) {
    console.error(`\n${fails.length} failed (${pass} passed). The first few:`);
    for (const f of fails.slice(0, 8)) console.error('  FAIL: ' + f);
    process.exit(1);
}
console.log(`\ncamera-pair: ${pass} frames checked, all inside the bar`);
