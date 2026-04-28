/**
 * Headless sanity test for the deep-zoom reference-orbit builder.
 *
 * Doesn't boot the worker — just imports the pure-CPU `computeReferenceOrbit`
 * and runs it on three known-good cases. Catches arithmetic regressions
 * in `HighPrecComplex.ts` without needing a browser.
 *
 * Run: `npm run smoke:deep-zoom-orbit` (or directly: `npx tsx debug/smoke-deep-zoom-orbit.mts`)
 */

import { computeReferenceOrbit } from '../fluid-toy/deepZoom/referenceOrbit.ts';

let failed = 0;
const check = (name: string, ok: boolean, msg?: string) => {
    if (ok) {
        console.log(`  ✓ ${name}`);
    } else {
        console.log(`  ✗ ${name}${msg ? `: ${msg}` : ''}`);
        failed++;
    }
};

console.log('case A: c=(0,0), should stay at zero');
{
    const res = computeReferenceOrbit({ centerX: 0, centerY: 0, zoom: 1, maxIter: 50 });
    check('did not escape', !res.escaped);
    check('all 50 iters', res.length === 50);
    let allZero = true;
    for (let i = 0; i < res.length; i++) {
        if (res.orbit[i * 4 + 0] !== 0 || res.orbit[i * 4 + 1] !== 0) { allZero = false; break; }
    }
    check('all Z values exactly 0', allZero);
    console.log(`    precision: ${res.precisionBits} bits`);
}

console.log('case B: c=(1,0), should escape fast');
{
    const res = computeReferenceOrbit({ centerX: 1, centerY: 0, zoom: 1, maxIter: 50 });
    check('escaped', res.escaped);
    check('escaped within 5 iters', res.length <= 6, `length was ${res.length}`);
    // Z[0]=0, Z[1]=0²+1=1, Z[2]=1²+1=2, Z[3]=2²+1=5 (|Z[3]|²=25>4 → escape).
    // The orbit stores Z[0..3] (length=4); the escape sample IS Z[3].
    // Z[4]=26 is past escape and not stored — not needed for smoothI
    // (the log-log formula uses |Z[escape]|).
    check('Z[1] = 1', Math.abs(res.orbit[1 * 4 + 0] - 1) < 1e-10);
    check('Z[2] = 2', Math.abs(res.orbit[2 * 4 + 0] - 2) < 1e-10);
    check('Z[3] = 5', Math.abs(res.orbit[3 * 4 + 0] - 5) < 1e-10);
    check('escape sample is Z[length-1]', res.orbit[(res.length - 1) * 4 + 2] > 4,
        `|Z[${res.length - 1}]|² = ${res.orbit[(res.length - 1) * 4 + 2]}`);
}

console.log('case C: c=(-0.75, 0), boundary; should NOT escape over 1000 iters');
{
    const res = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1, maxIter: 1000 });
    check('did not escape', !res.escaped, `escaped at iter ${res.length}`);
    check('all 1000 iters computed', res.length === 1000);
    // |Z| should stay bounded by escape radius. Sample a few.
    let maxNorm2 = 0;
    for (let i = 0; i < res.length; i++) {
        const n2 = res.orbit[i * 4 + 2];
        if (n2 > maxNorm2) maxNorm2 = n2;
    }
    check('|Z|² stayed bounded by 4', maxNorm2 < 4, `max |Z|² was ${maxNorm2}`);
}

console.log('case D: deep zoom precision selection');
{
    const res = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1e-30, maxIter: 1000 });
    check('did not escape', !res.escaped);
    check('precision bits ≥ 100', res.precisionBits >= 100, `got ${res.precisionBits}`);
    check('first iter still Z=0', res.orbit[0] === 0 && res.orbit[1] === 0);
    // The high-precision orbit is the *truth*; plain f64 will drift
    // (Mandelbrot iteration is chaotic — small ULP errors amplify). At
    // iter 10 they should still agree closely; by iter 100 f64 may
    // already be off in the 8th-9th digit. Verify both:
    //   – early iter agreement (sanity that the math is right)
    //   – late iter divergence is bounded (high-prec didn't blow up)
    let zr = 0, zi = 0;
    const cr = -0.75, ci = 0;
    for (let i = 0; i < 10; i++) {
        const nzr = zr * zr - zi * zi + cr;
        const nzi = 2 * zr * zi + ci;
        zr = nzr; zi = nzi;
    }
    const dr10 = Math.abs(res.orbit[10 * 4 + 0] - zr);
    const di10 = Math.abs(res.orbit[10 * 4 + 1] - zi);
    // Mandelbrot iterates are exact dyadics whose denominators grow as
    // 2^(2^n) — by iter 10 the exact representation needs ~1024-bit
    // denominators, far past f64's 52 bits. So plain-f64 has been
    // accumulating ULP errors for several iters; ~1e-8 drift at iter 10
    // is normal even though the orbit stays bounded. The high-prec
    // path is the truth here.
    check('Z[10] matches f64 to 1e-6 (low-amplification regime)', dr10 < 1e-6 && di10 < 1e-6, `Δ=(${dr10},${di10})`);
    // High-prec Z[100] must still be inside escape radius (correctness check).
    const n100 = res.orbit[100 * 4 + 2];
    check('Z[100] still bounded', n100 < 4, `|Z[100]|² = ${n100}`);
}

console.log('case E: realistic zoom + iter for phase-2 target');
{
    const t0 = performance.now();
    const res = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1e-30, maxIter: 10_000 });
    const ms = performance.now() - t0;
    console.log(`    built ${res.length} iters @ ${res.precisionBits} bits in ${ms.toFixed(1)} ms`);
    check('reasonable build time (<10s)', ms < 10000, `took ${ms.toFixed(1)} ms`);
    check('output buffer length matches', res.orbit.length === res.length * 4);
}

console.log('case F: power=3 Mandelbrot, c=(0,0) — stays at zero');
{
    const res = computeReferenceOrbit({ centerX: 0, centerY: 0, zoom: 1, maxIter: 50, power: 3 });
    check('did not escape', !res.escaped);
    check('all 50 iters', res.length === 50);
    let allZero = true;
    for (let i = 0; i < res.length; i++) {
        if (res.orbit[i * 4 + 0] !== 0 || res.orbit[i * 4 + 1] !== 0) { allZero = false; break; }
    }
    check('all Z exactly 0 (z³+0=0)', allZero);
}

console.log('case G: power=3 Mandelbrot, c=(0.5, 0) — z=0,0.5,0.625,0.744');
{
    const res = computeReferenceOrbit({ centerX: 0.5, centerY: 0, zoom: 1, maxIter: 10, power: 3 });
    check('Z[1] ≈ 0.5 (= 0³ + 0.5)', Math.abs(res.orbit[1 * 4 + 0] - 0.5) < 1e-10);
    check('Z[2] ≈ 0.625 (= 0.5³ + 0.5)', Math.abs(res.orbit[2 * 4 + 0] - 0.625) < 1e-10);
    // Z[3] = 0.625³ + 0.5 = 0.244 + 0.5 = 0.744
    check('Z[3] ≈ 0.744', Math.abs(res.orbit[3 * 4 + 0] - 0.744140625) < 1e-7);
}

console.log('case H: Julia kind, c=(-0.4, 0.6), z₀=(0, 0) — known interesting Julia');
{
    const res = computeReferenceOrbit({
        centerX: 0, centerY: 0, zoom: 1, maxIter: 100,
        kind: 'julia', juliaCx: -0.4, juliaCy: 0.6,
    });
    check('Z[0] = 0 (initial z₀)', res.orbit[0] === 0 && res.orbit[1] === 0);
    console.log(`    Z[1] actual = (${res.orbit[1 * 4 + 0]}, ${res.orbit[1 * 4 + 1]})`);
    // Z[1] = z₀² + c = 0² + (-0.4 + 0.6i) = -0.4 + 0.6i
    check('Z[1] = c = (-0.4, 0.6)',
        Math.abs(res.orbit[1 * 4 + 0] - (-0.4)) < 1e-6
        && Math.abs(res.orbit[1 * 4 + 1] - 0.6) < 1e-6);
}

console.log('case I: Julia kind, z₀ = (0.3, 0.2), c = (-0.4, 0.6)');
{
    const res = computeReferenceOrbit({
        centerX: 0.3, centerY: 0.2, zoom: 1, maxIter: 5,
        kind: 'julia', juliaCx: -0.4, juliaCy: 0.6,
    });
    console.log(`    Z[0] actual = (${res.orbit[0]}, ${res.orbit[1]})`);
    console.log(`    Z[1] actual = (${res.orbit[1*4+0]}, ${res.orbit[1*4+1]})`);
    check('Z[0] ≈ (0.3, 0.2) (initial z₀)',
        Math.abs(res.orbit[0] - 0.3) < 1e-6
        && Math.abs(res.orbit[1] - 0.2) < 1e-6);
    // Z[1] = (0.3+0.2i)² + (-0.4 + 0.6i)
    //      = (0.09 - 0.04 + 0.12i) + (-0.4 + 0.6i)
    //      = -0.35 + 0.72i
    check('Z[1] = z₀² + c ≈ (-0.35, 0.72)',
        Math.abs(res.orbit[1 * 4 + 0] - (-0.35)) < 1e-6
        && Math.abs(res.orbit[1 * 4 + 1] - 0.72) < 1e-6);
}

if (failed > 0) {
    console.log(`\n✗ ${failed} check(s) failed`);
    process.exit(1);
} else {
    console.log('\n✓ all reference-orbit checks passed');
}
