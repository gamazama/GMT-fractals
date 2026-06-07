/**
 * Headless test for the minibrot-nucleus reference math (ADR-0066).
 *
 * Pure CPU — imports `detectPeriod` / `newtonNucleus` and checks them against
 * KNOWN minibrot nuclei whose periods and centres are exact / well-published:
 *   period 1  c = 0                       (main cardioid)
 *   period 2  c = -1                      (period-2 disc)
 *   period 3  c ≈ -1.7548776662466927     (real "airplane" island)
 *   period 3  c ≈ -0.1225611668766536 + 0.7448617666197442 i  (complex)
 *
 * Newton must refine an offset seed back onto each nucleus to high precision,
 * and the period-P iterate z_P(c*) must land on ~0 (the defining property).
 *
 * Run: `npm run smoke:deep-zoom-nucleus` (or `npx tsx debug/smoke-deep-zoom-nucleus.mts`)
 */

import { HPComplex } from '../engine/fractal/deepZoom/HighPrecComplex.ts';
import { detectPeriod, newtonNucleus } from '../engine/fractal/deepZoom/nucleus.ts';
import { computeReferenceOrbit } from '../engine/fractal/deepZoom/referenceOrbit.ts';

let failed = 0;
const check = (name: string, ok: boolean, msg?: string) => {
    if (ok) console.log(`  ✓ ${name}`);
    else { console.log(`  ✗ ${name}${msg ? `: ${msg}` : ''}`); failed++; }
};

const P = 160; // working precision (bits) — generous for these shallow tests

/** |z_period(c)| via direct critical-orbit iteration (ground-truth check). */
const zPMag = (c: HPComplex, period: number): number => {
    let z = HPComplex.zero(P);
    for (let n = 0; n < period; n++) z = z.sqr().add(c);
    const [re, im] = z.toFloat32Pair();
    return Math.hypot(re, im);
};

interface Case {
    name: string; period: number;
    cx: number; cy: number;            // known nucleus
    seedDx: number; seedDy: number;    // offset of the Newton seed from it
    radius: number;                    // detection ball radius
}
const CASES: Case[] = [
    { name: 'period-1 cardioid',  period: 1, cx: 0,  cy: 0, seedDx: 0.02, seedDy: 0.02, radius: 0.05 },
    { name: 'period-2 disc',      period: 2, cx: -1, cy: 0, seedDx: 0.03, seedDy: 0.02, radius: 0.05 },
    { name: 'period-3 airplane',  period: 3, cx: -1.7548776662466927, cy: 0, seedDx: 0.01, seedDy: 0.0, radius: 0.01 },
    { name: 'period-3 complex',   period: 3, cx: -0.1225611668766536, cy: 0.7448617666197442, seedDx: 0.008, seedDy: -0.006, radius: 0.01 },
];

for (const t of CASES) {
    console.log(`\ncase: ${t.name} (period ${t.period}, c=(${t.cx}, ${t.cy}))`);
    const seed = HPComplex.fromNumbers(t.cx + t.seedDx, t.cy + t.seedDy, P);

    // 1) Period detection from the seed.
    const det = detectPeriod(seed, t.radius, 4096, P);
    check('period detected', det.period === t.period, `got ${det.period} (escaped=${det.escaped})`);

    // 2) Newton refinement back onto the nucleus.
    const cStar = newtonNucleus(seed, t.period, P);
    if (!cStar) { check('Newton converged', false, 'returned null'); continue; }
    const [rx, ry] = cStar.toFloat32Pair();
    const cErr = Math.hypot(rx - t.cx, ry - t.cy);
    check('Newton hit known nucleus (<1e-12)', cErr < 1e-12, `c*=(${rx}, ${ry}) err=${cErr.toExponential(3)}`);

    // 3) Defining property: z_P(c*) ≈ 0.
    const mag = zPMag(cStar, t.period);
    check('z_P(c*) ≈ 0 (<1e-14)', mag < 1e-14, `|z_P| = ${mag.toExponential(3)}`);

    // 4) DD round-trip of c* (what the kernel offset consumes).
    const [hiX, loX] = cStar.re.toDoubleDouble();
    const [hiY, loY] = cStar.im.toDoubleDouble();
    const ddErr = Math.hypot((hiX + loX) - t.cx, (hiY + loY) - t.cy);
    check('DD c* round-trips (<1e-13)', ddErr < 1e-13, `err=${ddErr.toExponential(3)}`);
}

// Negative control: an exterior point escapes → no period, Newton irrelevant.
console.log('\ncase: exterior point (c=0.4, 0.4) — no period');
{
    const c = HPComplex.fromNumbers(0.4, 0.4, P);
    const det = detectPeriod(c, 1e-6, 4096, P);
    check('escaped, period 0', det.period === 0 && det.escaped);
}

// ── Integration: computeReferenceOrbit adopts a short periodic reference ─────
// Deep-zoom into the period-3 airplane nucleus: the builder must detect the
// period, refine to the nucleus, and return a ONE-period orbit (length 3,
// period 3) instead of a long non-periodic one.
console.log('\ncase: computeReferenceOrbit deep-zoom on period-3 airplane');
{
    const res = computeReferenceOrbit({
        centerX: -1.7548776662466927, centerY: 0,
        zoom: 1e-7, maxIter: 5000,
    });
    check('adopted periodic reference (period 3)', res.period === 3, `period=${res.period}`);
    check('orbit is one period long (len 3)', res.length === 3, `length=${res.length}`);
    check('did not escape', !res.escaped);
    check('orbit[0] = 0 (nucleus convention)', res.orbit[0] === 0 && res.orbit[1] === 0);
    check('reference relocated to nucleus', res.relocated);
    // The relocated centre must be the airplane nucleus.
    check('ref centre is the nucleus',
        Math.abs(res.refCenterX + 1.7548776662466927) < 1e-9 && Math.abs(res.refCenterY) < 1e-9,
        `ref=(${res.refCenterX}, ${res.refCenterY})`);
}

console.log('\ncase: shallow view does NOT engage nucleus path');
{
    // zoom 1 (above NUCLEUS_MIN_ZOOM) — interior point, must keep the full orbit.
    const res = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1, maxIter: 500 });
    check('no period (shallow gated out)', res.period === 0, `period=${res.period}`);
    check('full-length orbit kept', res.length === 500, `length=${res.length}`);
}

if (failed > 0) { console.log(`\n✗ ${failed} check(s) failed`); process.exit(1); }
else console.log('\n✓ all nucleus checks passed');
