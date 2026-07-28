/**
 * Guard: mesh-export's voxel coordinate convention.
 *
 * The GPU SDF sampler is CELL-CENTRED — grid index i is evaluated at
 * `min + (i + 0.5) * range / N`. That is not a style choice, it is where the
 * data physically is: `gpu-pipeline.ts`'s shader computes
 * `(gl_FragCoord + uTileOffset) * uInvRes * uBoundsRange + uBoundsMin` with
 * `uInvRes = 1/N`, and the tile-offset/readback pairing makes
 * `gl_FragCoord + uTileOffset === i + 0.5` exactly. Z is driven by
 * `sampleOneZ((gz + 0.5) / N, …)`.
 *
 * Every downstream consumer must agree with that or it silently misplaces
 * geometry. Two did not, which is why this file exists — mesh-export is a
 * premium surface with no browser smoke, so nothing else would catch it.
 *
 * Run: `npm run test:mesh-grid`
 *
 * @invariant Sample i lives at `min + (i + 0.5) * range / N`. Any new code that
 *   maps between grid index and world space must use this, and must be pinned
 *   here. Assertions 3-4 deliberately pin a KNOWN-WRONG behaviour so a fix
 *   fails loudly rather than silently changing exports — see PROPOSALS.md
 *   (overnight audit, cycle 8).
 */
import { gridToWorld, worldToGrid } from '../mesh-export/algorithms/dc-core';

let failures = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const fail = (msg: string) => { console.error(`  ✗ ${msg}`); failures++; };
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

/** The reference: where the GPU actually samples grid index i. */
const gpuSample = (i: number, N: number, min: number, range: number) =>
    min + ((i + 0.5) / N) * range;

const MIN = -1.5, MAX = 1.5, RANGE = MAX - MIN;

console.log('\n[mesh-grid] 1. GPU cell-centre reference');
for (const N of [8, 64, 512]) {
    const first = gpuSample(0, N, MIN, RANGE);
    const last = gpuSample(N - 1, N, MIN, RANGE);
    const s = RANGE / N;
    if (near(first, MIN + 0.5 * s) && near(last, MAX - 0.5 * s)) {
        ok(`N=${N}: samples span [min + s/2, max - s/2] — inset half a voxel at each end`);
    } else {
        fail(`N=${N}: cell-centre reference is wrong (${first}, ${last})`);
    }
}

console.log('\n[mesh-grid] 2. worldToGrid is the exact inverse of gridToWorld');
for (const N of [8, 64, 512]) {
    let worst = 0;
    for (const i of [0, 1, N >> 1, N - 2, N - 1]) {
        worst = Math.max(worst, Math.abs(worldToGrid(gridToWorld(i, N, MIN, MAX), N, MIN, MAX) - i));
    }
    if (worst < 1e-9) ok(`N=${N}: round-trip exact (worst ${worst.toExponential(1)})`);
    else fail(`N=${N}: gridToWorld/worldToGrid are not inverses (worst ${worst})`);
}

console.log('\n[mesh-grid] 3. Dual contouring must agree with the sampler, sample for sample');
console.log('    Until 2026-07-28 dc-core used the corner-sampled g/(N-1) while the sampler');
console.log('    used (g+0.5)/N — a uniform N/(N-1) scale about the grid centre, so every');
console.log('    exported mesh was oversized (~1.6% at N=64). These assertions previously');
console.log('    PINNED that divergence; they now require agreement, in both directions.');
for (const N of [8, 64, 512]) {
    // Every sample index must land exactly where the GPU read it, not just the ends.
    let worst = 0, worstAt = -1;
    for (const i of [0, 1, 2, N >> 1, N - 2, N - 1]) {
        const d = Math.abs(gridToWorld(i, N, MIN, MAX) - gpuSample(i, N, MIN, RANGE));
        if (d > worst) { worst = d; worstAt = i; }
    }
    if (worst < 1e-9) ok(`N=${N}: dc-core matches the sampler at every probed index (worst ${worst.toExponential(1)})`);
    else fail(`N=${N}: dc-core diverges from the sampler by ${worst} at index ${worstAt} — the two MUST use the same convention`);

    // Guard the specific regression: reverting to g/(N-1) would put sample 0 exactly
    // on MIN and sample N-1 exactly on MAX. Cell-centred keeps half a voxel at each end.
    const s = RANGE / N;
    const dc0 = gridToWorld(0, N, MIN, MAX);
    const dcLast = gridToWorld(N - 1, N, MIN, MAX);
    if (near(dc0, MIN + 0.5 * s) && near(dcLast, MAX - 0.5 * s)) {
        ok(`N=${N}: inset by half a voxel at both ends (±${(s / 2).toExponential(2)}), as cell-centring requires`);
    } else if (near(dc0, MIN) && near(dcLast, MAX)) {
        fail(`N=${N}: dc-core is corner-sampled again (spans [min,max]) — the N/(N-1) oversize bug is back`);
    } else {
        fail(`N=${N}: dc-core end samples are at neither convention (${dc0}, ${dcLast})`);
    }
}

console.log('\n[mesh-grid] 4. VDB AffineMap translation must announce the cell centre');
// The writer emits a row-vector AffineMap: world = index * s + translation.
// OpenVDB's indexToWorld(Coord(i,j,k)) returns the voxel CENTRE, so the
// translation must place index i at the position the sampler used.
const vdbSrc = await import('node:fs').then((fs) =>
    fs.readFileSync('mesh-export/algorithms/vdb-writer.ts', 'utf8'));
const translationSites = [...vdbSrc.matchAll(/w\.f64\(boundsMin\[0\][^\n]*\n/g)];
if (translationSites.length === 0) {
    fail('could not find any AffineMap translation row in vdb-writer.ts — did it move?');
} else {
    ok(`found ${translationSites.length} AffineMap translation row(s)`);
    for (const [idx, m] of translationSites.entries()) {
        if (/boundsMin\[0\]\s*\+\s*0\.5\s*\*\s*s/.test(m[0])) {
            ok(`translation row ${idx + 1} offsets by half a voxel (cell-centred)`);
        } else {
            fail(`translation row ${idx + 1} writes bare boundsMin — voxel i's centre lands at min + i*s, but the value there was sampled at min + (i+0.5)*s`);
        }
    }
}

console.log(failures ? `\nFAILED: ${failures} assertion(s)\n` : '\n✓ mesh grid convention holds\n');
process.exit(failures ? 1 : 0);
