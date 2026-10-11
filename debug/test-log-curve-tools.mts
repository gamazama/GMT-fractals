/**
 * Guard: the curve tools and the graph editor's arithmetic work on an EXPONENTIAL track in the
 * space it plays in, and on a plain track exactly as they did.
 *
 * The contract is the header of `engine/animation/logTrackRegistry.ts`. Node only: the real
 * curve tools, the real evaluator, the real animation store.
 *
 *   [P] PLAIN IS UNCHANGED. Every function this stage touched gives, for a plain track, the
 *       output of the same function at the commit before it (`BASE`), compared as JSON (a
 *       double prints to the digits that give it back, so equal text is equal bits). The base
 *       files are read with `git show` into `debug/scratch/log-curves-base/` (ignored by git).
 *       The three that were inline in components at `BASE` are compared with that expression,
 *       copied here.
 *   [T] RE-TANGENT. `reTangentBezier(keys, _, true)` is `reTangentBezier` done by hand on the
 *       keys' logs: the two played curves agree to 1e-9 decades, on a 24-decade track and a
 *       6-decade one. The same keys tangented as a plain track are printed beside it.
 *   [F] FIT. `fitSamplesToKeys(samples, .., true)` is the plain fit of the samples' logs, to
 *       1e-9 decades, and holds the samples to within 1.5x its tolerance.
 *   [E] TOLERANCE. `strokeTolerance(keys, true)` is 2 % of the LOG range, to 1e-12 decades; a
 *       stroke that wiggles over the whole range keeps its wiggles (it kept 2 keys before).
 *   [G] GRAPH SPACE. A key dragged d graph units moves d decades; a handle sits on the control
 *       point playback solves with, and a handle drag of d graph units moves it by d.
 *   [K] KEY CAM. Between two keys of an exponential track the status is 'partial' while the
 *       live value is the curve's, 'dirty' once it is 1 % off; on a key, 'keyed'.
 *   [L] PAYLOAD. A drag gives a payload track's key no value, and the patch it writes moves
 *       the key in time and leaves its value where it was.
 *   [S] SPLIT. A key added between two Bezier keys of an exponential track lies on the curve
 *       and leaves the curve where it was.
 *   [U] LENGTH. A change of the timeline's length taken as a step is undone and redone with
 *       the sequence; a tool that grows the timeline is undone whole.
 *
 * Run: `npm run test:log-curves`
 *
 * ── FALSIFIED 2026-10-11 ─────────────────────────────────────────────────
 *   One edit a group, each restored after (47 checks in all); the counts are the red checks.
 *   [P] `fitSamplesToKeys` fitting every all-positive run of samples in log, flag or not: 3 red
 *       ("fitSamplesToKeys, case 0", and the two [E] lines whose "before" is that plain fit).
 *   [T] `reTangentBezier` without the flag: 5 red - 0.988 and 0.345 decades off, the handles,
 *       and the seam heal 0.74 off.
 *   [F] `lnSamples` giving null: 6 red - 2 keys against 10 and 4.22 decades off on the 24-decade
 *       stroke, 4 keys and 0.84 on the 6-decade one, both deep halves down to 2 keys.
 *   [E] `strokeTolerance` blind to the flag: 2 red (0.0087 decades against 0.4675 and 0.1169).
 *   [G] `tangentGraphY` giving 1: 1 red (the handle 1.7 graph units from the control point).
 *   [K] `cameraKeyStatus` evaluating without the flag: 2 red ('dirty' between two keys). And
 *       `differsOnTrack` comparing plain differences: 5 red (1 % off reads 'partial', a tenth
 *       of a key's value reads 'keyed', the key button's ratio).
 *   [L] `draggedKeyValue` blind to the payload registry: 1 red (it hands back 1e-15; the store
 *       still holds the value, which is the third [L] line staying green).
 *   [S] `addKeyframe`'s split in plain values, as it was: 1 red (the key at 3.68 on a curve at
 *       4.02e-5, the curve 6.35 decades off).
 *   [U] `applyHistory` not setting the length: 2 red.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { create } from 'zustand';
import { useAnimationStore } from '../store/animationStore';
import { createSequenceSlice } from '../store/animation/sequenceSlice';
import { registerLogTrack } from '../engine/animation/logTrackRegistry';
import { registerPayloadTrack } from '../engine/animation/payloadTrackRegistry';
import * as CF from '../utils/CurveFitting';
import * as TU from '../utils/timelineUtils';
import { toGraphY, fromGraphY, tangentGraphY, graphHandleY, offsetGraphY, draggedKeyValue, formatGraphY } from '../utils/GraphUtils';
import { calculateViewBounds } from '../utils/keyframeViewBounds';
import type { Keyframe, AnimationSequence } from '../types';

/** The commit before this stage: what "as before" means in [P]. */
const BASE = 'b2a476743102c7f5e372ca50a9e33ee0579e12c4';

let pass = 0;
const fails: string[] = [];
const ck = (name: string, ok: boolean, detail = ''): void => { if (ok) { pass++; console.log('  ok   ' + name); } else fails.push(detail ? `${name}: ${detail}` : name); };
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const LN10 = Math.LN10;
const e = (x: number): string => x.toExponential(2);

/** A small seeded generator, so a red run can be run again. */
let seed = 0x2b0c1a57;
const rnd = (): number => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const key = (frame: number, value: number, over: Partial<Keyframe> = {}): Keyframe =>
    ({ id: `k${frame}`, frame, value, interpolation: 'Bezier', autoTangent: true, brokenTangents: false, ...over });
const play = (keys: Keyframe[], f: number, isLog: boolean): number => TU.evaluateTrackValue(keys, f, false, isLog);
/** The largest gap between two played curves over [0, last], in decades. `aLog`: `a` holds values, else logs. */
const gapDecades = (a: Keyframe[], aLog: boolean, b: Keyframe[], bLog: boolean): number => {
    let worst = 0;
    const last = a[a.length - 1].frame;
    for (let f = 0; f <= last; f++) {
        const ya = aLog ? Math.log10(play(a, f, true)) : play(a, f, false) / LN10;
        const yb = bLog ? Math.log10(play(b, f, true)) : play(b, f, false) / LN10;
        worst = Math.max(worst, Math.abs(ya - yb));
    }
    return worst;
};
const lnKeys = (keys: Keyframe[]): Keyframe[] => keys.map((k) => ({ ...k, value: Math.log(k.value) }));

// ── [P] plain is unchanged: against the functions as they stood at BASE ─────────────────────────
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..');
const baseDir = path.join(here, 'scratch', 'log-curves-base');
const loadBase = async <T,>(file: string): Promise<T | null> => {
    let src: string;
    try { src = execFileSync('git', ['show', `${BASE}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }); }
    catch { return null; }
    const dir = path.posix.dirname(file);
    const out = src.replace(/(from\s+|import\s+)(['"])(\.{1,2}\/[^'"]+)\2/g,
        (_m, kw: string, q: string, spec: string) => `${kw}${q}../../../${path.posix.normalize(path.posix.join(dir, spec))}${q}`);
    fs.mkdirSync(baseDir, { recursive: true });
    const target = path.join(baseDir, file.replace(/[\\/]/g, '__').replace(/\.tsx?$/, '.mts'));
    fs.writeFileSync(target, out);
    return import(pathToFileURL(target).href) as Promise<T>;
};
const baseCF = await loadBase<typeof CF>('utils/CurveFitting.ts');
const baseTU = await loadBase<typeof TU>('utils/timelineUtils.ts');
const baseSlice = await loadBase<{ createSequenceSlice: typeof createSequenceSlice }>('store/animation/sequenceSlice.ts');
ck(`[P] the files at ${BASE.slice(0, 8)} can be read (git show)`, !!baseCF && !!baseTU && !!baseSlice,
    'that commit is not in this repository any more: point BASE at the commit before R2b, or retire [P]');

/** A plain track of `n` keys: mixed interpolation, some hand-set handles, values of any sign. */
const plainTrack = (n: number): Keyframe[] => {
    let f = Math.round(rnd() * 5);
    return Array.from({ length: n }, (_, i) => {
        if (i > 0) f += 3 + Math.round(rnd() * 40);
        const kind = rnd();
        const k: Keyframe = { id: `p${i}`, frame: f, value: (rnd() - 0.5) * 20, interpolation: kind < 0.7 ? 'Bezier' : kind < 0.85 ? 'Linear' : 'Step', brokenTangents: false };
        if (k.interpolation === 'Bezier') {
            k.autoTangent = rnd() < 0.6;
            if (!k.autoTangent || rnd() < 0.5) { k.leftTangent = { x: -(1 + rnd() * 8), y: (rnd() - 0.5) * 3 }; k.rightTangent = { x: 1 + rnd() * 8, y: (rnd() - 0.5) * 3 }; }
        }
        return k;
    });
};
const samplesOf = (n: number): number[] => { let v = rnd() * 4; return Array.from({ length: n }, (_, i) => (v += (rnd() - 0.5) * 0.6 + 0.2 * Math.sin(i / 7))); };

if (baseCF && baseTU && baseSlice) {
    let cfRed = '';
    for (let c = 0; c < 200 && !cfRed; c++) {
        const keys = plainTrack(4 + Math.floor(rnd() * 12)), pred = (_k: Keyframe, i: number) => i % 3 !== 1;
        if (!same(CF.reTangentBezier(keys), baseCF.reTangentBezier(keys))) cfRed = `reTangentBezier, case ${c}`;
        else if (!same(CF.reTangentBezier(keys, pred), baseCF.reTangentBezier(keys, pred))) cfRed = `reTangentBezier with a predicate, case ${c}`;
        const samples = samplesOf(40 + Math.floor(rnd() * 120)), eps = 0.01 + rnd() * 0.2, start = Math.floor(rnd() * 30);
        const idx = CF.dpIndices(samples, eps);
        if (!same(CF.fitKeysToSamples(samples, idx, (i) => i * 2, 'f'), baseCF.fitKeysToSamples(samples, idx, (i) => i * 2, 'f'))) cfRed ||= `fitKeysToSamples, case ${c}`;
        if (!same(CF.fitSamplesToKeys(samples, start, eps, 's'), baseCF.fitSamplesToKeys(samples, start, eps, 's'))) cfRed ||= `fitSamplesToKeys, case ${c}`;
        const lo = keys[1].frame + 1, hi = keys[keys.length - 2].frame - 1;
        if (hi - lo >= 2) {
            const span = CF.fitSamplesToKeys(samples.slice(0, hi - lo + 1), lo, eps, 'x');
            for (const seamOnly of [true, false]) {
                if (!same(CF.spliceSpan(keys, lo, hi, span, seamOnly), baseCF.spliceSpan(keys, lo, hi, span, seamOnly))) cfRed ||= `spliceSpan(seamOnly ${seamOnly}), case ${c}`;
            }
        }
    }
    ck('[P] reTangentBezier, fitKeysToSamples, fitSamplesToKeys and spliceSpan give a plain track what they gave at BASE (200 tracks)', !cfRed, cfRed);

    let tuRed = '';
    for (let c = 0; c < 60 && !tuRed; c++) {
        const keys = plainTrack(5 + Math.floor(rnd() * 8));
        const seq = { durationFrames: 300, tracks: { 'p.v': { id: 'p.v', type: 'float', label: 'p', keyframes: keys } } } as AnimationSequence;
        const strip = (u: { trackId: string; newKeys: Keyframe[] }[]) => u.map((x) => x.newKeys.map((k) => [k.frame, k.value, k.interpolation]));
        if (!same(strip(TU.calculateResampleUpdates(['p.v'], seq, 2)), strip(baseTU.calculateResampleUpdates(['p.v'], seq, 2)))) tuRed = `calculateResampleUpdates (Bake), case ${c}`;
        const ids = keys.slice(1, -1).map((k) => `p.v::${k.id}`);
        for (const radius of [2.5, -1.5]) {
            if (!same(TU.calculateSmoothingUpdates(['p.v'], seq, ids, radius, seq), baseTU.calculateSmoothingUpdates(['p.v'], seq, ids, radius, seq))) tuRed ||= `calculateSmoothingUpdates(${radius}), case ${c}`;
        }
    }
    ck('[P] Bake, Smooth and Bounce give a plain track what they gave at BASE (60 tracks)', !tuRed, tuRed);

    // The store's own writers, on two small stores built from the slice now and the slice at BASE.
    const mini = (slice: typeof createSequenceSlice) => create<any>()((set: any, get: any, api: any) =>
        ({ durationFrames: 300, fps: 30, currentFrame: 0, audioClips: [], selectedKeyframeIds: [], selectedTrackIds: [], ...slice(set, get, api) }));
    const now = mini(createSequenceSlice), was = mini(baseSlice.createSequenceSlice);
    const bare = (s: ReturnType<typeof mini>) => s.getState().sequence.tracks['p.v'].keyframes.map((k: Keyframe) => ({ ...k, id: '' }));
    let stRed = '';
    for (const s of [now, was]) { s.getState().addTrack('p.v', 'p'); }
    for (let c = 0; c < 80 && !stRed; c++) {
        const frame = Math.round(rnd() * 200), value = (rnd() - 0.5) * 9, kind = rnd() < 0.8 ? 'Bezier' : 'Linear';
        for (const s of [now, was]) { s.getState().snapshot(); s.getState().addKeyframe('p.v', frame, value, kind); }
        if (!same(bare(now), bare(was))) stRed = `addKeyframe (the split between two Bezier keys included), key ${c}`;
    }
    for (const s of [now, was]) { s.getState().undo(); s.getState().undo(); s.getState().redo(); }
    if (!same(bare(now), bare(was))) stRed ||= 'undo, undo, redo of a sequence edit';
    ck('[P] addKeyframe and undo / redo give a plain track what they gave at BASE (80 keys)', !stRed, stRed);
}

// The three that were inline at BASE, against that expression.
{
    let red = '';
    for (let c = 0; c < 400 && !red; c++) {
        const keys = plainTrack(2 + Math.floor(rnd() * 9));
        let mn = Infinity, mx = -Infinity;
        keys.forEach((k) => { if (k.value < mn) mn = k.value; if (k.value > mx) mx = k.value; });
        const range = (isFinite(mx - mn) && mx > mn) ? mx - mn : 1;
        if (CF.strokeTolerance(keys) !== Math.max(1e-6, range * 0.02)) red = `strokeTolerance, case ${c}`;
        const start = (rnd() - 0.5) * 50, d = (rnd() - 0.5) * 7, w = rnd();
        if (draggedKeyValue('p.v', start, d) !== start + d || draggedKeyValue('p.v', start, d * w) !== start + (d * w) || offsetGraphY(start, d, false) !== start + d) red ||= `the key drag's sum, case ${c}`;
        const t = (rnd() - 0.5) * 4, r = { min: -3 + rnd(), span: 1 + rnd() * 9 };
        if (graphHandleY(start, t, false) !== start + t || graphHandleY(start, t, false, r) !== (start + t - r.min) / r.span) red ||= `a handle's place, case ${c}`;
        if (toGraphY(start, false) !== start || fromGraphY(start, false) !== start || tangentGraphY(false) !== 1) red ||= `the plain space is the identity, case ${c}`;
    }
    ck('[P] the Pencil tolerance, a key drag, a handle and the axis are the plain arithmetic they were (400 cases)', !red, red);
    ck('[P] a plain axis label is the number itself', formatGraphY(-10, false) === '-10' && formatGraphY(0.30000000000000004, false) === '0.30000000000000004');
}

// ── the exponential tracks every group below uses ───────────────────────────────────────────────
const ZOOM = 'lc.zoom', DEPTH = 'lc.depth', PLAIN = 'lc.plain';
registerLogTrack(ZOOM);
registerLogTrack(DEPTH);
registerPayloadTrack(DEPTH);
/** 24 decades (a route) and 6 (an everyday zoom). */
const WIDE = [key(0, 2), key(60, 1e-3), key(150, 4e-12), key(200, 1e-14), key(300, 2e-24)];
const NARROW = [key(0, 1), key(80, 0.1), key(140, 1e-4), key(240, 1e-6)];
const TRACKS: [string, Keyframe[]][] = [['24 decades', WIDE], ['6 decades', NARROW]];

// ── [T] re-tangent ──────────────────────────────────────────────────────────────────────────────
for (const [name, keys] of TRACKS) {
    const inLog = CF.reTangentBezier(keys, undefined, true), byHand = CF.reTangentBezier(lnKeys(keys)), asPlain = CF.reTangentBezier(keys);
    const gap = gapDecades(inLog, true, byHand, false), before = gapDecades(asPlain, true, byHand, false);
    ck(`[T] ${name}: re-tangented as an exponential track, the played curve is the one tangented by hand in log (${e(gap)} decades apart; tangented as a plain track it was ${before.toFixed(2)})`,
        gap < 1e-9 && before > 0.05, `${e(gap)} decades (bound 1e-9); as a plain track ${before.toFixed(3)}`);
    ck(`[T] ${name}: and its handles are those, number for number`, same(inLog.map((k) => [k.leftTangent, k.rightTangent]), byHand.map((k) => [k.leftTangent, k.rightTangent])));
}
{
    // The seam heal the Pencil commits through, and its predicate.
    const span = CF.fitSamplesToKeys(Array.from({ length: 41 }, (_, i) => 1e-6 * Math.pow(10, -i / 20)), 100, 0.05, 'pen', true);
    const healed = CF.spliceSpan(WIDE, 100, 140, span, true, true) as Keyframe[];
    const hand = (CF.spliceSpan(lnKeys(WIDE), 100, 140, lnKeys(span), true) as Keyframe[]);
    const gap = gapDecades(healed, true, hand, false);
    ck(`[T] spliceSpan heals an exponential track's seam in log (${e(gap)} decades from the splice done by hand on the logs)`, gap < 1e-9, `${e(gap)} decades`);
}

// ── [F] fit, and [E] the tolerance ──────────────────────────────────────────────────────────────
for (const [name, decades] of [['24 decades', 24], ['6 decades', 6]] as [string, number][]) {
    const N = 240;
    /** A dive with a wiggle on it, a sample a frame. */
    const lnAt = (f: number): number => -decades * LN10 * Math.pow(f / N, 1.4) + 0.06 * decades * Math.sin(f / 9);
    const samples = Array.from({ length: N + 1 }, (_, f) => Math.exp(lnAt(f)));
    const ends = [key(0, samples[0]), key(N, samples[N])];

    const eps = CF.strokeTolerance(ends, true), epsHand = 0.02 * (Math.log(Math.max(samples[0], samples[N])) - Math.log(Math.min(samples[0], samples[N])));
    const epsPlain = CF.strokeTolerance(ends);
    ck(`[E] ${name}: the Pencil's tolerance is 2 % of the LOG range (${(eps / LN10).toFixed(4)} decades; by hand ${(epsHand / LN10).toFixed(4)})`,
        Math.abs(eps - epsHand) / LN10 < 1e-12, `${eps / LN10} against ${epsHand / LN10} decades`);

    const fit = CF.fitSamplesToKeys(samples, 0, eps, 'fit', true), byHand = CF.fitSamplesToKeys(samples.map(Math.log), 0, eps, 'fit');
    const gap = gapDecades(fit, true, byHand, false);
    ck(`[F] ${name}: fitted as an exponential track, the keys are the plain fit of the samples' logs (${fit.length} keys, the played curves ${e(gap)} decades apart)`,
        fit.length === byHand.length && fit.every((k, i) => k.frame === byHand[i].frame) && gap < 1e-9, `${fit.length} keys against ${byHand.length}; ${e(gap)} decades (bound 1e-9)`);
    let off = 0;
    for (let f = 0; f <= N; f++) off = Math.max(off, Math.abs(Math.log10(play(fit, f, true)) - lnAt(f) / LN10));
    ck(`[F] ${name}: and the fitted curve holds the samples to ${off.toFixed(4)} decades (the tolerance is ${(eps / LN10).toFixed(4)}; bound 1.5x)`, off <= 1.5 * eps / LN10, `${off} decades`);

    // A stroke over the deep half of the track, where every value is smaller than 2 % of the
    // plain range. As it was: the tolerance a share of the PLAIN range, the fit in plain values.
    const half = samples.slice(N / 2), deep = CF.fitSamplesToKeys(half, N / 2, eps, 'pen', true), old = CF.fitSamplesToKeys(half, N / 2, epsPlain, 'pen');
    let oldOff = 0;
    for (let f = N / 2; f <= N; f++) { const v = play(old, f, true); oldOff = Math.max(oldOff, v > 0 ? Math.abs(Math.log10(v) - lnAt(f) / LN10) : Infinity); }
    ck(`[E] ${name}: a stroke over its deep half keeps its shape (${deep.length} keys; with the tolerance and the fit in plain values it kept ${old.length}, ${isFinite(oldOff) ? oldOff.toFixed(2) + ' decades off the stroke' : 'and played through zero'})`,
        deep.length >= 4 && old.length <= 3, `${deep.length} keys now, ${old.length} before`);
}

// ── [G] graph space ─────────────────────────────────────────────────────────────────────────────
{
    const moved = offsetGraphY(3e-10, -2.5, true);
    ck('[G] a key dragged 2.5 graph units down on an exponential track is 2.5 decades deeper', Math.abs(Math.log10(moved / 3e-10) + 2.5) < 1e-12, `${moved}`);
    ck('[G] a drag with no rise leaves the value to the bit', offsetGraphY(3.3e-17, 0, true) === 3.3e-17 && draggedKeyValue(ZOOM, 3.3e-17, 0) === 3.3e-17);
    ck('[G] the space and its inverse', Math.abs(fromGraphY(toGraphY(7e-31, true), true) / 7e-31 - 1) < 1e-12 && toGraphY(1e-10, true) === -10 && toGraphY(-4, true) === -4);
    // A handle is drawn on the control point playback solves with: ln(value) + tangent.y, in ln-units.
    const k = CF.reTangentBezier(WIDE, undefined, true)[2], t = k.rightTangent as { x: number; y: number };
    const control = (Math.log(k.value) + t.y) / LN10;
    ck('[G] a handle sits on the control point the evaluator uses', Math.abs(graphHandleY(k.value, t.y, true) - control) < 1e-12, `${graphHandleY(k.value, t.y, true)} against ${control}`);
    const d = 1.75, dragged = t.y + d / tangentGraphY(true);
    ck('[G] a handle dragged 1.75 graph units is drawn 1.75 higher, and over a normalised range by its share', Math.abs(graphHandleY(k.value, dragged, true) - graphHandleY(k.value, t.y, true) - d) < 1e-12
        && Math.abs(graphHandleY(k.value, dragged, true, { min: -24, span: 25 }) - graphHandleY(k.value, t.y, true, { min: -24, span: 25 }) - d / 25) < 1e-12);
    ck('[G] the gutter of an exponential axis reads the value', formatGraphY(-10, true) === '1e-10' && formatGraphY(-10.000000000000002, true) === '1e-10' && formatGraphY(0, true) === '1'
        && formatGraphY(2, true) === '100' && formatGraphY(-2, true) === '0.01' && formatGraphY(12, true) === '1e12' && formatGraphY(-36.5, true) === '3.16e-37',
        [-10, 0, 2, -2, 12, -36.5].map((y) => formatGraphY(y, true)).join(' '));
    const seq = { durationFrames: 300, tracks: { [ZOOM]: { id: ZOOM, type: 'float', label: 'z', keyframes: WIDE } } } as AnimationSequence;
    const b = calculateViewBounds([ZOOM], seq);
    ck('[G] the view is fitted to the exponents', !!b && Math.abs(b.minV - Math.log10(2e-24)) < 1e-12 && Math.abs(b.maxV - Math.log10(2)) < 1e-12, JSON.stringify(b));
}

// ── [K] Key Cam ─────────────────────────────────────────────────────────────────────────────────
{
    const linear = WIDE.map((k) => ({ ...k, interpolation: 'Linear' as const })), bezier = CF.reTangentBezier(WIDE, undefined, true);
    for (const [name, keys] of [['Linear', linear], ['Bezier', bezier]] as [string, Keyframe[]][]) {
        const seq = { durationFrames: 300, tracks: { [ZOOM]: { id: ZOOM, type: 'float', label: 'z', keyframes: keys } } } as AnimationSequence;
        const at = (frame: number, live: number | null) => TU.cameraKeyStatus([ZOOM], seq, frame, live === null ? null : () => live);
        const curve = play(keys, 100, true);
        ck(`[K] ${name}: between two keys, the live value on the curve: the camera is unchanged ('partial')`, at(100, curve) === 'partial', `${at(100, curve)} (the curve is at ${e(curve)})`);
        ck(`[K] ${name}: 1 % off it: changed ('dirty')`, at(100, curve * 1.01) === 'dirty', at(100, curve * 1.01));
        ck(`[K] ${name}: on a key, at its value: 'keyed'; a tenth of it: 'keyed-dirty'`, at(150, 4e-12) === 'keyed' && at(150, 4e-13) === 'keyed-dirty', `${at(150, 4e-12)}, ${at(150, 4e-13)}`);
        ck(`[K] ${name}: nothing is compared while the timeline plays`, at(100, null) === 'partial' && at(150, null) === 'keyed');
    }
    ck("[K] a key button's reading on an exponential track is a ratio", TU.differsOnTrack(ZOOM, 1e-12, 5e-12, 0.0001) && !TU.differsOnTrack(ZOOM, 1e-12, 1e-12 * (1 + 1e-6), 0.0001));
    ck('[K] and a plain difference on a plain track', !TU.differsOnTrack(PLAIN, 1e-12, 5e-12, 0.0001) && TU.differsOnTrack(PLAIN, 1, 1.001, 0.0001));

    // A plain track, against Key Cam's reading as it was written at BASE (inline in TimelineToolbar.tsx).
    let red = '';
    for (let c = 0; c < 300 && !red; c++) {
        const keys = plainTrack(2 + Math.floor(rnd() * 6)).map((k, i) => ({ ...k, frame: i * 10 }));
        const seq = { durationFrames: 300, tracks: { 'cam.rotation.x': { id: 'cam.rotation.x', type: 'float', label: 'r', keyframes: keys }, [PLAIN]: { id: PLAIN, type: 'float', label: 'p', keyframes: plainTrack(3).map((k, i) => ({ ...k, frame: i * 25 })) } } } as AnimationSequence;
        const frame = Math.round(rnd() * 60), playing = rnd() < 0.2, lives: Record<string, number> = {};
        const tids = ['cam.rotation.x', PLAIN, 'cam.missing'];
        for (const tid of tids) { const t = seq.tracks[tid]; lives[tid] = t ? TU.evaluateTrackValue(t.keyframes, frame, tid.includes('rotation')) + (rnd() < 0.5 ? 0 : (rnd() - 0.5) * 0.01) : 0; }
        let hasAnyTrack = false, hasKeyAtFrame = false, isDirty = false;
        for (const tid of tids) {
            const track = seq.tracks[tid];
            if (track) {
                hasAnyTrack = true;
                const k = track.keyframes.find((x) => Math.abs(x.frame - frame) < 0.1);
                if (k) hasKeyAtFrame = true;
                if (!playing) {
                    const timelineVal = k ? k.value : TU.evaluateTrackValue(track.keyframes, frame, tid.includes('rotation'));
                    if (Math.abs(timelineVal - lives[tid]) > 0.001) isDirty = true;
                }
            }
        }
        const was = !hasAnyTrack ? 'none' : hasKeyAtFrame ? (isDirty ? 'keyed-dirty' : 'keyed') : (isDirty ? 'dirty' : 'partial');
        const got = TU.cameraKeyStatus(tids, seq, frame, playing ? null : (tid) => lives[tid]);
        if (got !== was) red = `case ${c}: ${got}, was ${was}`;
    }
    ck("[P] Key Cam's reading of plain tracks is the one it gave at BASE (300 cases)", !red, red);
}

// ── [L] a payload track: time only ──────────────────────────────────────────────────────────────
const anim = () => useAnimationStore.getState();
const keysOf = (tid: string): Keyframe[] => anim().sequence.tracks[tid]?.keyframes ?? [];
{
    anim().addTrack(DEPTH, 'Depth');
    anim().addKeyframe(DEPTH, 0, 2, 'Bezier', { cam: 'a' });
    anim().addKeyframe(DEPTH, 100, 1e-12, 'Bezier', { cam: 'b' });
    const k = keysOf(DEPTH)[1];
    const value = draggedKeyValue(DEPTH, k.value, -3);
    ck('[L] a drag gives a key of a payload track no value', value === undefined && draggedKeyValue(DEPTH, k.value, 0) === undefined, `${value}`);
    ck('[L] and a key of an exponential track that is not one, its value three decades down', Math.abs(Math.log10((draggedKeyValue(ZOOM, k.value, -3) as number) / k.value) + 3) < 1e-12);
    // The patch useGraphInteraction's key drag writes for it (40 frames right, any way down).
    anim().updateKeyframes([{ trackId: DEPTH, keyId: k.id, patch: value === undefined ? { frame: 140 } : { frame: 140, value } }]);
    const after = keysOf(DEPTH).find((x) => x.id === k.id) as Keyframe;
    ck("[L] the patch of a diagonal drag moves the key in time and leaves its value and payload", after.frame === 140 && after.value === 1e-12 && same(after.payload, { cam: 'b' }), JSON.stringify(after));
}

// ── [S] a key added between two Bezier keys of an exponential track ─────────────────────────────
{
    anim().addTrack(ZOOM, 'Zoom');
    anim().addKeyframe(ZOOM, 0, 2, 'Bezier');
    anim().addKeyframe(ZOOM, 200, 3e-18, 'Bezier');
    anim().updateKeyframes([{ trackId: ZOOM, keyId: keysOf(ZOOM)[0].id, patch: { rightTangent: { x: 70, y: -3 }, autoTangent: false } }]);
    const before = keysOf(ZOOM), want = play(before, 77, true);
    anim().addKeyframe(ZOOM, 77, 12345, 'Bezier');
    const after = keysOf(ZOOM), added = after.find((k) => k.frame === 77) as Keyframe;
    const gap = gapDecades(after, true, before, true);
    ck(`[S] the key lies on the curve (${e(added.value)}; the curve was at ${e(want)}) and the curve stays where it was (${e(gap)} decades)`,
        after.length === 3 && Math.abs(Math.log10(added.value / want)) < 1e-9 && gap < 1e-9, `value ${added.value}, wanted ${want}; the curve moved ${e(gap)} decades`);
}

// ── [U] the timeline's length is part of an undo step ───────────────────────────────────────────
{
    anim().setDuration(300);
    const seqBefore = JSON.stringify(anim().sequence), steps = anim().undoStack.length;
    anim().snapshot();                    // what the length field does with the first change of a drag
    anim().setDuration(420);
    anim().setDuration(500);              // ... and not again on the ticks that follow
    ck('[U] a drag of the length is one step', anim().undoStack.length === steps + 1);
    anim().undo();
    ck('[U] undo puts the length back, the sequence with it', anim().durationFrames === 300 && JSON.stringify(anim().sequence) === seqBefore, `length ${anim().durationFrames}`);
    anim().redo();
    ck('[U] redo sets it again', anim().durationFrames === 500 && JSON.stringify(anim().sequence) === seqBefore, `length ${anim().durationFrames}`);

    // A tool that grows the timeline: a key past the end, in one step.
    anim().addTrack(PLAIN, 'Plain');
    anim().snapshot();
    anim().addKeyframe(PLAIN, 900, 1);
    anim().setDuration(900);
    anim().undo();
    ck('[U] a tool that grew the timeline is undone whole: its key gone, the length as it was', keysOf(PLAIN).length === 0 && anim().durationFrames === 500, `${keysOf(PLAIN).length} keys, length ${anim().durationFrames}`);
    anim().redo();
    ck('[U] and redone whole', keysOf(PLAIN).length === 1 && anim().durationFrames === 900, `${keysOf(PLAIN).length} keys, length ${anim().durationFrames}`);
    // An edit that does not touch the length leaves it alone, both ways.
    anim().snapshot();
    anim().addKeyframe(PLAIN, 10, 2);
    anim().undo();
    ck('[U] undoing an edit of the keys leaves the length where it was', anim().durationFrames === 900 && keysOf(PLAIN).length === 1);
}

console.log(`${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length === 0 ? 0 : 1);
