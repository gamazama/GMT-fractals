/**
 * zoomPath — where a camera is between two keys when its scale changes by many decades.
 *
 * PURPOSE. A key holds a time, a SCALE (how far the camera is from what it looks at: the size of
 * its view), an exact position, and optionally the direction it was travelling. Between two keys
 * the path has to look right at every scale on the way, and it must not lose digits at the deep
 * end, where one view may be 1e-70 of the distance travelled.
 *
 * THE RULE (ported from the route study the owner approved, 2026-10-10; do not re-derive it):
 *   - A leg has its own clock: m(t) = (the scale's integral from the leg's start to t) / (the same
 *     integral over the whole leg). On a straight line that clock gives an even speed ON SCREEN:
 *     velocity / scale is constant.
 *   - The position is a cubic Hermite curve in m. A key's tangent is its on-screen velocity U.
 *     Its size is the mean of the two legs that meet there, the shorter leg weighing more; its
 *     direction is the key's `heading` when it has one, else that same mean.
 *   - EVERYTHING IS MEASURED FROM THE LEG'S DEEPER KEY (the smaller scale). The clock is read as
 *     "share of the integral between the deeper key and t", so every weight of the curve goes to
 *     zero at that key and what is added to its exact position is small where the view is small.
 *   - Orientation is a separate curve that advances with TIME, not with m: on the m clock the
 *     whole turn of a dive would happen in its first decade.
 *
 * THE SEAM. No store, no DOM, no three.js. Positions are three bigints in a fixed-point unit the
 * caller owns (`unit` steps = 1.0). `scaleAt(time)` is the caller's scale curve between keys
 * (for the engine timeline: one exponential track, eased in log space); the integral is then
 * taken numerically, per leg, the first time that leg is asked for. Left out, the scale is
 * log-linear between neighbouring keys and the integral is a closed form.
 *
 *   const path = buildZoomPath(keys, { unit: 2 ** 256, scaleAt });   // cheap: build on every edit
 *   const [x, y, z] = zoomPathPosition(path, time);                  // once a frame
 *   const q = zoomPathOrientation(turnKeys, time);
 *
 * PITFALLS.
 *   - `scaleAt` must be positive and continuous, and return each key's own scale at its time.
 *   - Inside a leg the scale should stay between its two keys' scales. A curve that dips k
 *     decades below the deeper key costs k digits there: the anchor is the key, not the dip.
 *   - A `heading` belongs to the direction a route is played in. Reversing the order of the keys
 *     means negating every heading too, or each key is entered backwards.
 *   - q and -q are one orientation; the sign of what `zoomPathOrientation` returns may flip
 *     between legs. Compare rotations, not components.
 *   - Times outside the keys hold the first / last key.
 *
 * @invariant A position is right to 1e-9 of the scale at that moment, on a leg of up to 77
 *   decades, and the leg ends exactly on its deeper key — proven by: npm run test:zoom-path
 *   ("is … of the scale there off"). The numeric integral is checked against the closed form and
 *   against a brute-force sum on an eased leg; measuring from the shallow key instead reds it.
 */

export type Vec3 = readonly [number, number, number];
/** A unit quaternion as a plain array: [x, y, z, w]. */
export type Quat = readonly [number, number, number, number];
/** An exact position: three integers in a fixed-point unit the caller owns. */
export type FixedVec3 = readonly [bigint, bigint, bigint];

export interface ZoomKey {
    /** When the camera is here. Keys come in rising time order, no two at one time. */
    time: number;
    /** The camera's depth here, in world units. Positive. */
    scale: number;
    position: FixedVec3;
    /** The direction of travel when the key was set. Any length: only its direction is used. */
    heading?: Vec3;
}

export interface ZoomPathOptions {
    /** Fixed-point steps in one world unit: a position of `unit` steps is 1.0. */
    unit: number;
    /** The scale at a time between keys. Left out: log-linear between neighbouring keys. */
    scaleAt?: (time: number) => number;
}

interface Leg {
    ta: number;
    /** The leg's length in time. */
    T: number;
    di: number;
    dj: number;
    /** ln(di / dj): the leg's depth in e-folds, positive on a dive. */
    lam: number;
    /** The deeper key is the leg's SECOND key (a dive). */
    deepEnd: boolean;
    /** Second key minus first, in world units. */
    dp: Vec3;
    /** The scale's integral over the whole leg. */
    I0: number;
    /** Numeric legs only: panel edges in time, and the integral between the deeper key and each. */
    ts?: number[];
    cs?: number[];
}

/** Built by `buildZoomPath`. `legs` and `tangents` fill in as they are first needed. */
export interface ZoomPath {
    readonly keys: readonly ZoomKey[];
    readonly unit: number;
    readonly scaleAt?: (time: number) => number;
    readonly legs: (Leg | undefined)[];
    readonly tangents: (Vec3 | undefined)[];
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const between = (a: FixedVec3, b: FixedVec3, unit: number): Vec3 =>
    [Number(b[0] - a[0]) / unit, Number(b[1] - a[1]) / unit, Number(b[2] - a[2]) / unit];
const steps = (v: number, unit: number): bigint => BigInt(Math.round(v * unit));

// ── the scale's integral ──

/** Log-linear leg: the integral between the deeper key and share-of-time x, per unit of leg time. */
const closed = (L: Leg, x: number): number => (L.deepEnd
    ? L.dj * Math.expm1(L.lam * (1 - x)) / L.lam
    : L.lam === 0 ? L.di * x : L.di * Math.expm1(-L.lam * x) / -L.lam);

// 8-point Gauss-Legendre: exact for an exponential across 4 e-folds to about 1e-13.
const GX = [0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363];
const GW = [0.362683783378362, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763];
function gauss(f: (t: number) => number, a: number, b: number): number {
    const c = 0.5 * (a + b), h = 0.5 * (b - a);
    let s = 0;
    for (let k = 0; k < 4; k++) s += GW[k] * (f(c - h * GX[k]) + f(c + h * GX[k]));
    return s * h;
}

/** How closely a panel must agree with its two halves, relative to itself, before it is kept. */
const PANEL_TOLERANCE = 1e-12;
const MAX_HALVINGS = 26;
/** A leg's budget. A smooth 77-decade leg takes about a hundred panels; a `scaleAt` that is
 *  rough in its last digits everywhere (float32 inside, say) never agrees with its halves, and
 *  without this would halve all the way down: 2^26 panels on the first frame that asks. Past the
 *  budget a panel is kept once the scale changes by under e^2 across it, which is as good as
 *  the rule gets on a function that rough. */
const MAX_PANELS = 4096;

/** Cut [ta, tb] into panels the 8-point rule is good on. Returns the edges and each panel's integral. */
function panels(f: (t: number) => number, ta: number, tb: number): { ts: number[]; parts: number[] } {
    const ts = [ta], parts: number[] = [];
    const walk = (a: number, b: number, whole: number, depth: number): void => {
        const mid = 0.5 * (a + b), l = gauss(f, a, mid), r = gauss(f, mid, b);
        // The panel's own value is kept, not the halves' sum: it is what `fromDeep` gets
        // when it integrates up to this edge, so the clock has no step at a panel edge.
        const agrees = !(Math.abs(l + r - whole) > PANEL_TOLERANCE * (l + r));
        if (agrees || depth >= MAX_HALVINGS || (parts.length >= MAX_PANELS && Math.abs(Math.log(f(b) / f(a))) < 2)) { ts.push(b); parts.push(whole); return; }
        walk(a, mid, l, depth + 1);
        walk(mid, b, r, depth + 1);
    };
    walk(ta, tb, gauss(f, ta, tb), 0);
    return { ts, parts };
}

function legAt(P: ZoomPath, i: number): Leg {
    const made = P.legs[i];
    if (made) return made;
    const a = P.keys[i], b = P.keys[i + 1];
    const L: Leg = {
        ta: a.time, T: b.time - a.time, di: a.scale, dj: b.scale, lam: Math.log(a.scale / b.scale),
        deepEnd: b.scale < a.scale, dp: between(a.position, b.position, P.unit), I0: 0,
    };
    if (P.scaleAt) {
        const { ts, parts } = panels(P.scaleAt, a.time, b.time), n = parts.length, cs = new Array<number>(n + 1).fill(0);
        // summed outwards from the deeper key, smallest first
        if (L.deepEnd) for (let k = n - 1; k >= 0; k--) cs[k] = cs[k + 1] + parts[k];
        else for (let k = 0; k < n; k++) cs[k + 1] = cs[k] + parts[k];
        L.ts = ts; L.cs = cs; L.I0 = L.deepEnd ? cs[0] : cs[n];
    } else {
        L.I0 = L.T * closed(L, L.deepEnd ? 0 : 1);
    }
    P.legs[i] = L;
    return L;
}

/** The share of the leg's integral that lies between its DEEPER key and `time`: 0 at that key, 1 at the other. */
function fromDeep(P: ZoomPath, L: Leg, time: number): number {
    if (!L.ts || !L.cs) return (L.T * closed(L, (time - L.ta) / L.T)) / L.I0;
    const ts = L.ts;
    let lo = 0, hi = ts.length - 1;                                   // the panel [ts[lo], ts[hi]] that holds `time`
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ts[mid] <= time) lo = mid; else hi = mid; }
    const f = P.scaleAt as (t: number) => number;
    return (L.deepEnd ? L.cs[hi] + gauss(f, time, ts[hi]) : L.cs[lo] + gauss(f, ts[lo], time)) / L.I0;
}

/** A key's on-screen velocity (velocity / scale): the tangent of the curve there. */
function tangentAt(P: ZoomPath, i: number): Vec3 {
    const made = P.tangents[i];
    if (made) return made;
    const last = P.keys.length - 1;
    const mean = (k: number): Vec3 => { const L = legAt(P, k); return L.I0 > 0 ? scl(L.dp, 1 / L.I0) : [0, 0, 0]; };
    let u: Vec3;
    if (last < 1) u = [0, 0, 0];
    else if (i === 0) u = mean(0);
    else if (i === last) u = mean(last - 1);
    else {
        // the two legs' means, the shorter leg weighing more (Catmull-Rom on uneven knots)
        const a = legAt(P, i - 1), b = legAt(P, i);
        u = scl(add(scl(mean(i - 1), b.T), scl(mean(i), a.T)), 1 / (a.T + b.T));
    }
    const h = P.keys[i].heading, hl = h ? len(h) : 0;
    if (h && hl > 0) u = scl(h, len(u) / hl);
    P.tangents[i] = u;
    return u;
}

// ── position ──

export function buildZoomPath(keys: readonly ZoomKey[], options: ZoomPathOptions): ZoomPath {
    return { keys, unit: options.unit, scaleAt: options.scaleAt, legs: new Array(Math.max(0, keys.length - 1)), tangents: new Array(keys.length) };
}

/** The camera's exact position at `time`, in the path's fixed-point unit. */
export function zoomPathPosition(path: ZoomPath, time: number): [bigint, bigint, bigint] {
    const keys = path.keys, last = keys.length - 1;
    if (last < 0) throw new Error('zoomPath: a path needs at least one key');
    if (last === 0 || time < keys[0].time) return [...keys[0].position];
    if (time > keys[last].time) return [...keys[last].position];
    let li = 0, hi = last;                                            // the leg [keys[li], keys[li + 1]] that holds `time`
    while (hi - li > 1) { const mid = (li + hi) >> 1; if (keys[mid].time <= time) li = mid; else hi = mid; }

    const L = legAt(path, li);
    // A leg with no usable scale (a key at 0, a NaN from `scaleAt`) holds its deeper key: this
    // runs once a frame, and BigInt(NaN) throws.
    if (!(L.I0 > 0) || L.I0 === Infinity) return [...keys[L.deepEnd ? li + 1 : li].position];
    const w = fromDeep(path, L, time);
    const T0 = scl(tangentAt(path, li), L.I0), T1 = scl(tangentAt(path, li + 1), L.I0);
    // The Hermite curve, written out from whichever key is deeper so that every weight is 0 there.
    let off: Vec3;
    if (L.deepEnd) {
        const h00 = (3 - 2 * w) * w * w, h10 = (1 - w) * w * w, h11 = -(1 - w) * (1 - w) * w;
        off = add(add(scl(L.dp, -h00), scl(T0, h10)), scl(T1, h11));
    } else {
        const h01 = w * w * (3 - 2 * w), h10 = w * (1 - w) * (1 - w), h11 = w * w * (w - 1);
        off = add(add(scl(L.dp, h01), scl(T0, h10)), scl(T1, h11));
    }
    const base = keys[L.deepEnd ? li + 1 : li].position, unit = path.unit;
    return [base[0] + steps(off[0], unit), base[1] + steps(off[1], unit), base[2] + steps(off[2], unit)];
}

/**
 * How far apart two keys are ON SCREEN, in e-folds, when the scale between them is log-linear
 * (a straight dive: |ln(a.scale / b.scale)|). To play a leg at an even pace of P decades a
 * second, give it `zoomLegOnScreen(a, b, unit) / Math.LN10 / P` seconds.
 */
export function zoomLegOnScreen(a: ZoomKey, b: ZoomKey, unit: number): number {
    const lam = Math.log(a.scale / b.scale), g = lam === 0 ? 1 : -Math.expm1(-lam) / lam;
    return len(between(a.position, b.position, unit)) / (a.scale * g);
}

// ── orientation ──

export interface TurnKey {
    time: number;
    orientation: Quat;
}

const qmul = (a: Quat, b: Quat): Quat => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qinv = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];
/** A unit quaternion as a rotation vector (axis times angle), the short way round. */
const qlog = (q: Quat): Vec3 => {
    const s = q[3] < 0 ? -1 : 1, v = Math.hypot(q[0], q[1], q[2]);
    const k = v < 1e-12 ? 2 * s : (2 * s * Math.atan2(v, s * q[3])) / v;
    return [q[0] * k, q[1] * k, q[2] * k];
};
const qexp = (r: Vec3): Quat => {
    const a = len(r), k = a < 1e-12 ? 0.5 : Math.sin(a / 2) / a;
    return [r[0] * k, r[1] * k, r[2] * k, Math.cos(a / 2)];
};

/**
 * The orientation at `time`: a curve through every key whose turning rate is continuous at the
 * keys (a cubic in the rotation group, Kim-Kim-Shin's cumulative form, which holds that for
 * uneven key times where squad does not). Two keys alone give the plain slerp.
 */
export function zoomPathOrientation(keys: readonly TurnKey[], time: number): Quat {
    const last = keys.length - 1;
    if (last < 0) throw new Error('zoomPath: an orientation needs at least one key');
    if (last === 0 || time <= keys[0].time) return keys[0].orientation;
    if (time >= keys[last].time) return keys[last].orientation;
    let i = 0, hi = last;
    while (hi - i > 1) { const mid = (i + hi) >> 1; if (keys[mid].time <= time) i = mid; else hi = mid; }

    const span = (k: number): number => keys[k + 1].time - keys[k].time;
    /** The turn across leg k per unit of time, as a rotation vector in the key's own frame. */
    const rate = (k: number): Vec3 => scl(qlog(qmul(qinv(keys[k].orientation), keys[k + 1].orientation)), 1 / span(k));
    /** A key's turning rate: the two legs' means, weighted as the position's tangents are. */
    const turn = (k: number): Vec3 => (k === 0 ? rate(0) : k === last ? rate(last - 1)
        : scl(add(scl(rate(k - 1), span(k)), scl(rate(k), span(k - 1))), 1 / (span(k - 1) + span(k))));

    const T = span(i), u = (time - keys[i].time) / T, v = 1 - u;
    const w1 = scl(turn(i), T / 3), w3 = scl(turn(i + 1), T / 3);
    const across = qmul(qinv(keys[i].orientation), keys[i + 1].orientation);
    const w2 = qlog(qmul(qmul(qexp(scl(w1, -1)), across), qexp(scl(w3, -1))));
    return qmul(qmul(qmul(keys[i].orientation, qexp(scl(w1, 1 - v * v * v))), qexp(scl(w2, u * u * (3 - 2 * u)))), qexp(scl(w3, u * u * u)));
}
