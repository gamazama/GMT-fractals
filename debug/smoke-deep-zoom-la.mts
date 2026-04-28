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
 */

import { computeReferenceOrbit } from '../fluid-toy/deepZoom/referenceOrbit.ts';
import { buildLATable } from '../fluid-toy/deepZoom/laBuilder.ts';
import {
    type Complex,
    cAdd,
    cMul,
} from '../fluid-toy/deepZoom/LAInfoDeep.ts';

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

console.log('case A: build LA for c=(-0.75, 0), 1000 iters');
{
    const ref = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1, maxIter: 1000 });
    check('orbit non-empty', ref.length > 100, `len=${ref.length}`);
    const table = buildLATable(ref.orbit, ref.length);
    check('table valid', table.valid);
    check('has stages', table.stages.length > 0, `stages=${table.stages.length}`);
    check('has LAs', table.las.length > 0, `LAs=${table.las.length}`);
    console.log(`    stages=${table.stages.length} LAs=${table.las.length} (per-stage: ${table.stages.map((s) => s.macroItCount).join(',')})`);
}

console.log('case B: validate stage-0 LA prediction vs direct iteration');
{
    const ref = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1, maxIter: 500 });
    const table = buildLATable(ref.orbit, ref.length);
    check('table valid', table.valid);

    // Walk stage-0 LAs in order, accumulating iterations covered.
    const stage0 = table.stages[0];
    let iterPos = 0;
    let maxRelErr = 0;
    let nodesChecked = 0;
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
        nodesChecked++;

        iterPos += la.StepLength;
    }
    console.log(`    nodes=${nodesChecked} max relative error=${maxRelErr.toExponential(2)}`);
    // LA threshold is 2^-24 ≈ 6e-8. Relative error within validity
    // should stay ~at this scale or better.
    check('LA prediction matches direct iteration', maxRelErr < 1e-3,
        `max err ${maxRelErr.toExponential(3)} (expected < 1e-3 at small dc)`);
}

console.log('case C: stage-1+ skipping');
{
    const ref = computeReferenceOrbit({ centerX: -0.75, centerY: 0, zoom: 1, maxIter: 5000 });
    const table = buildLATable(ref.orbit, ref.length);
    check('built deep table', table.valid && table.stages.length >= 1);
    if (table.stages.length >= 2) {
        const stage1 = table.stages[1];
        check('stage 1 has fewer LAs than stage 0',
            stage1.macroItCount < table.stages[0].macroItCount,
            `s0=${table.stages[0].macroItCount} s1=${stage1.macroItCount}`);
        // Each stage-1 LA should cover multiple stage-0 LAs.
        const avgSkip = ref.length / stage1.macroItCount;
        console.log(`    stage-1 avg skip ≈ ${avgSkip.toFixed(0)} ref iters per LA`);
    } else {
        console.log(`    only 1 stage (orbit too short or trivial)`);
    }
}

if (failed > 0) {
    console.log(`\n✗ ${failed} check(s) failed`);
    process.exit(1);
} else {
    console.log('\n✓ all LA construction checks passed');
}
