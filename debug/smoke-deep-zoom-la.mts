/**
 * Headless validation for the LA construction pipeline.
 *
 * The math contract (matches FractalShark's Prepare → Evaluate):
 *   newdz   = dz_input · (2·Ref + dz_input)            ← one exact step
 *   dz_out  = newdz · ZCoeff + dc · CCoeff             ← linear chain
 *
 * The LA's first iter is computed exactly (using its starting Ref);
 * the remaining StepLength-1 iters are linearised. So an LA covering
 * iters [a, a+StepLength) with Ref = z[a] takes (dz_a, dc) and
 * predicts dz_{a+StepLength} via the formula above.
 *
 * This smoke iterates a pixel directly (the truth) and compares the
 * LA prediction within the threshold radius.
 *
 * ── Coverage floors (guard sweep, cycle 13) ─────────────────────────
 * Three ways this smoke used to pass on a table that had been destroyed.
 * All three are now asserted rather than merely printed:
 *
 *   1. `nodesChecked` — case B skips LAs with `StepLength === 0`, and
 *      `maxRelErr` starts at 0. Forcing every stage-0 LA to StepLength 0
 *      in `laBuilder.buildStage0` printed `nodes=0 max relative error=0`
 *      and the central assertion PASSED, exit 0. Observed floors: 100
 *      nodes (real centre) / 167 (complex centre) at maxIter 500.
 *   2. Stage count — case C's old `else` branch printed "only 1 stage"
 *      and asserted nothing, so setting `MAX_LA_STAGES = 1` collapsed the
 *      tree 4 stages -> 1 and left the smoke green. The higher-stage tree
 *      IS the LA acceleration structure; its absence must be red.
 *      Observed: 4 stages @ maxIter 1000, 6 @ 5000.
 *   3. Real-axis-only fixtures — every case used `centerY: 0`, so the
 *      whole reference orbit is real and `z2im` in `stepLA` is identically
 *      zero. Flipping the sign of the imaginary term in `stepLA`'s ZCoeff
 *      update left the smoke green. Case B now also runs the period-3
 *      complex nucleus, whose orbit has 499/500 iters with nonzero Z.im.
 *
 * Margin note: the header math above cites the LA threshold 2^-24 ~ 6e-8,
 * but the measured stage-0 relative error is 7.46e-4 (real) / 2.49e-4
 * (complex) at dc = 1e-4 + 5e-5i — four orders looser than the threshold,
 * because the check compares a whole StepLength run rather than one step.
 * The 1e-3 bound is therefore only ~1.34x above the real-axis measurement.
 * It is deterministic (fixed centre, fixed dc), so this is sensitivity,
 * not flake risk — but do not tighten it without re-measuring.
 */

import { computeReferenceOrbit } from '../engine/fractal/deepZoom/referenceOrbit.ts';
import { buildLATable } from '../engine/fractal/deepZoom/laBuilder.ts';
import {
    type Complex,
    cAdd,
    cMul,
    compositeLA,
    initLAInfoDeep,
    newLAInfoDeep,
    stepLA,
} from '../engine/fractal/deepZoom/LAInfoDeep.ts';
import { defaultLAParameters } from '../engine/fractal/deepZoom/laParameters.ts';

let failed = 0;
const check = (name: string, ok: boolean, msg?: string) => {
    if (ok) console.log(`  ✓ ${name}`);
    else { console.log(`  ✗ ${name}${msg ? `: ${msg}` : ''}`); failed++; }
};

const readZ = (orbit: Float32Array, i: number): Complex => ({
    re: orbit[i * 4 + 0],
    im: orbit[i * 4 + 1],
});

/** Iterate the perturbed step directly. Returns dz at iter `endIter`. */
const directPerturb = (
    orbit: Float32Array,
    dc: Complex,
    startIter: number,
    endIter: number,
): Complex => {
    let dz: Complex = { re: 0, im: 0 };
    if (startIter > 0) {
        // Build dz_startIter from scratch by iterating from 0 to startIter.
        // For startIter = 0, dz = 0 directly.
        for (let n = 0; n < startIter; n++) {
            const Z = readZ(orbit, n);
            const twoZdz = { re: 2 * Z.re * dz.re - 2 * Z.im * dz.im, im: 2 * Z.re * dz.im + 2 * Z.im * dz.re };
            const dz2 = cMul(dz, dz);
            dz = cAdd(cAdd(twoZdz, dz2), dc);
        }
    }
    for (let n = startIter; n < endIter; n++) {
        const Z = readZ(orbit, n);
        const twoZdz = { re: 2 * Z.re * dz.re - 2 * Z.im * dz.im, im: 2 * Z.re * dz.im + 2 * Z.im * dz.re };
        const dz2 = cMul(dz, dz);
        dz = cAdd(cAdd(twoZdz, dz2), dc);
    }
    return dz;
};

/** Minimum stage-0 LA nodes case B must actually evaluate. Observed 100
 *  (real centre) / 167 (complex) at maxIter 500; a collapse to 0 used to
 *  pass silently. Half the smaller observation, so legitimate
 *  re-partitioning has headroom but destruction is red. */
const MIN_NODES_CHECKED = 50;
/** Minimum stages a non-trivial orbit must produce. Observed 4 @ maxIter
 *  1000 and 6 @ 5000; `MAX_LA_STAGES = 1` used to leave this green. */
const MIN_LA_STAGES = 2;

console.log('case A: build LA for c=(-0.75, 0), 1000 iters');
{
    const ref = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1, maxIter: 1000 });
    check('orbit non-empty', ref.length > 100, `len=${ref.length}`);
    const table = buildLATable(ref.orbit, ref.length);
    check('table valid', table.valid);
    check('has stages', table.stages.length > 0, `stages=${table.stages.length}`);
    check('has LAs', table.las.length > 0, `LAs=${table.las.length}`);
    console.log(`    stages=${table.stages.length} LAs=${table.las.length} (per-stage: ${table.stages.map((s) => s.macroItCount).join(',')})`);
    // Coverage floor 2: a multi-stage tree, not just stage 0.
    check(`built a multi-stage tree (>= ${MIN_LA_STAGES} stages, observed 4)`,
        table.stages.length >= MIN_LA_STAGES, `stages=${table.stages.length}`);
}

/**
 * Walk stage-0 LAs in order and compare each LA's Evaluate() against
 * direct perturbed iteration over the same range.
 *
 * Runs for two centres. `centerY: 0` keeps the whole reference orbit on
 * the real axis, which makes `z2im` in `stepLA` identically zero and hides
 * every imaginary-part sign error — so the complex centre is not a
 * duplicate, it is the only case that exercises that arithmetic.
 */
const validateStage0 = (label: string, centerX: number, centerY: number) => {
    console.log(`case B: stage-0 LA prediction vs direct iteration — ${label}`);
    const ref = computeReferenceOrbit({ centerX, centerY, zoom: 1, maxIter: 500 });
    const table = buildLATable(ref.orbit, ref.length);
    check(`table valid (${label})`, table.valid);

    const stage0 = table.stages[0];
    let iterPos = 0;
    let maxRelErr = 0;
    let nodesChecked = 0;
    let imagSeen = 0;
    // Pick a small dc well within stage-0 thresholds: 1e-4.
    const dc: Complex = { re: 1e-4, im: 5e-5 };

    for (let k = 0; k < stage0.macroItCount; k++) {
        const la = table.las[stage0.laIndex + k];
        if (la.StepLength === 0) continue;

        // Truth: iterate from iterPos to iterPos + StepLength.
        const truth = directPerturb(ref.orbit, dc, iterPos, iterPos + la.StepLength);

        // LA's "input dz" is the dz at the start of its range. For
        // k=0, that's dz_0 = 0; for k>0, walk the orbit to compute it.
        const dzStart = iterPos === 0 ? { re: 0, im: 0 } : directPerturb(ref.orbit, dc, 0, iterPos);

        // Evaluate(dz, dc):
        //   newdz = dz · (2·Ref + dz)
        //   out   = newdz · ZCoeff + dc · CCoeff
        const twoRef = { re: 2 * la.Ref.re, im: 2 * la.Ref.im };
        const inner: Complex = { re: twoRef.re + dzStart.re, im: twoRef.im + dzStart.im };
        const newdz = cMul(dzStart, inner);
        const predicted: Complex = cAdd(cMul(newdz, la.ZCoeff), cMul(la.CCoeff, dc));

        const err = Math.hypot(predicted.re - truth.re, predicted.im - truth.im);
        const truthMag = Math.hypot(truth.re, truth.im);
        const relErr = truthMag > 1e-30 ? err / truthMag : err;
        if (relErr > maxRelErr) maxRelErr = relErr;
        if (la.Ref.im !== 0) imagSeen++;
        nodesChecked++;

        iterPos += la.StepLength;
    }
    console.log(`    nodes=${nodesChecked} (imag Ref: ${imagSeen}) max relative error=${maxRelErr.toExponential(2)}`);
    // Coverage floor 1: the loop above must actually have run. `maxRelErr`
    // starts at 0, so with every StepLength zeroed this assertion passed on
    // a destroyed table.
    check(`evaluated >= ${MIN_NODES_CHECKED} LA nodes (${label})`,
        nodesChecked >= MIN_NODES_CHECKED, `nodes=${nodesChecked}`);
    check('LA prediction matches direct iteration', maxRelErr < 1e-3,
        `max err ${maxRelErr.toExponential(3)} (expected < 1e-3 at small dc)`);
    return imagSeen;
};

validateStage0('real centre c=(-0.75, 0)', -0.75, 0);
// Period-3 complex nucleus — 499/500 reference iters have nonzero Z.im.
const imagNodes = validateStage0(
    'complex centre c=(-0.1226, 0.7449)', -0.1225611668766536, 0.7448617666197442);
// Coverage floor 3: if this ever reads 0 the complex fixture has stopped
// being complex and the imaginary arithmetic is unguarded again.
check('complex centre actually exercised imaginary Ref components',
    imagNodes > 0, `LAs with Ref.im !== 0: ${imagNodes}`);

console.log('case C: stage-1+ skipping');
{
    const ref = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1, maxIter: 5000 });
    const table = buildLATable(ref.orbit, ref.length);
    check('built deep table', table.valid && table.stages.length >= 1);
    // Was a silent `if (>= 2) ... else console.log('only 1 stage')`, so a
    // collapsed tree printed a note and exited 0. Now it is an assertion.
    check(`deep table has >= ${MIN_LA_STAGES} stages (observed 6 @ 5000 iters)`,
        table.stages.length >= MIN_LA_STAGES, `stages=${table.stages.length}`);
    if (table.stages.length >= 2) {
        const stage1 = table.stages[1];
        check('stage 1 has fewer LAs than stage 0',
            stage1.macroItCount < table.stages[0].macroItCount,
            `s0=${table.stages[0].macroItCount} s1=${stage1.macroItCount}`);
        // Each stage-1 LA should cover multiple stage-0 LAs.
        const avgSkip = ref.length / stage1.macroItCount;
        console.log(`    stage-1 avg skip ≈ ${avgSkip.toFixed(0)} ref iters per LA`);
    }
}

/**
 * case D: `stepLA` / `compositeLA` complex arithmetic, unit level.
 *
 * The end-to-end cases above are tolerance checks, and a tolerance absorbs
 * a small wrong answer. Measured: flipping the sign of the imaginary term
 * in `stepLA`'s ZCoeff update moves the complex centre's max relative error
 * from 2.49e-4 to 6.83e-4 — a real 2.7x signal, still under the 1e-3 bound,
 * so it stayed green. These are exact-equality checks on hand-computed
 * values instead, so a conjugation error cannot hide inside a threshold.
 *
 * Values chosen so no component is 0 or 1 and no two are equal — a fixture
 * whose arithmetic is degenerate proves nothing (0*x and 1*x survive most
 * sign and operand errors).
 */
console.log('case D: stepLA / compositeLA exact complex arithmetic');
{
    const params = defaultLAParameters();
    const eq = (a: Complex, b: Complex) => a.re === b.re && a.im === b.im;
    const s = (c: Complex) => `(${c.re}, ${c.im})`;

    // Two Steps from the identity LA seeded at Ref=(3,4).
    //   step 1 over z=(3,4):  2z = (6,8)
    //     ZCoeff = 2z·(1,0)         = (6, 8)
    //     CCoeff = 2z·(1,0) + 1     = (7, 8)
    //   step 2 over z=(1,2):  2z = (2,4)
    //     ZCoeff = (2,4)·(6,8)      = (2·6−4·8, 2·8+4·6) = (−20, 40)
    //     CCoeff = (2,4)·(7,8) + 1  = (14−32+1, 16+28)   = (−17, 44)
    // Step 2 is the one that matters: after step 1 ZCoeff.im is nonzero, so
    // the `− z2im · ZCoeff.im` term is finally load-bearing.
    const la1 = newLAInfoDeep();
    stepLA(initLAInfoDeep({ re: 3, im: 4 }, params), { re: 3, im: 4 }, la1, params);
    check('stepLA 1 ZCoeff = (6, 8)', eq(la1.ZCoeff, { re: 6, im: 8 }), s(la1.ZCoeff));
    check('stepLA 1 CCoeff = (7, 8) [the +1 term]', eq(la1.CCoeff, { re: 7, im: 8 }), s(la1.CCoeff));

    const la2 = newLAInfoDeep();
    stepLA(la1, { re: 1, im: 2 }, la2, params);
    check('stepLA 2 ZCoeff = (-20, 40)', eq(la2.ZCoeff, { re: -20, im: 40 }), s(la2.ZCoeff));
    check('stepLA 2 CCoeff = (-17, 44)', eq(la2.CCoeff, { re: -17, im: 44 }), s(la2.CCoeff));
    check('stepLA keeps Ref at the LA start (3, 4)', eq(la2.Ref, { re: 3, im: 4 }), s(la2.Ref));

    // compositeLA: self(ZCoeff=(2,1), CCoeff=(3,-1)) ∘ la(Ref=(1,2), ZCoeff=(1,1), CCoeff=(5,0)).
    //   bridge 2z = (2,4):  outZ = (2,4)·(2,1)      = (0, 10)
    //                       outC = (2,4)·(3,-1)     = (10, 10)   [no +1 here]
    //   chain:              outZ = (0,10)·(1,1)     = (-10, 10)
    //                       outC = (10,10)·(1,1) + (5,0) = (5, 20)
    const mk = (o: Partial<ReturnType<typeof newLAInfoDeep>>) =>
        ({ ...newLAInfoDeep(), LAThreshold: 1, LAThresholdC: 1, ...o });
    const composed = newLAInfoDeep();
    compositeLA(
        mk({ Ref: { re: 9, im: 9 }, ZCoeff: { re: 2, im: 1 }, CCoeff: { re: 3, im: -1 } }),
        mk({ Ref: { re: 1, im: 2 }, ZCoeff: { re: 1, im: 1 }, CCoeff: { re: 5, im: 0 } }),
        composed, params);
    check('compositeLA ZCoeff = (-10, 10)', eq(composed.ZCoeff, { re: -10, im: 10 }), s(composed.ZCoeff));
    check('compositeLA CCoeff = (5, 20) [no +1 on the bridge]',
        eq(composed.CCoeff, { re: 5, im: 20 }), s(composed.CCoeff));
    check('compositeLA keeps self.Ref (9, 9)', eq(composed.Ref, { re: 9, im: 9 }), s(composed.Ref));
}

if (failed > 0) {
    console.log(`\n✗ ${failed} check(s) failed`);
    process.exit(1);
} else {
    console.log('\n✓ all LA construction checks passed');
}
