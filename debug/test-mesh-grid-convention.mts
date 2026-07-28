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

console.log('\n[mesh-grid] 3. KNOWN DIVERGENCE — dual contouring is corner-sampled, not cell-centred');
console.log('    dc-core uses g/(N-1); the sampler uses (g+0.5)/N. The result is a uniform');
console.log('    scale of N/(N-1) about the grid centre, i.e. the mesh is slightly oversized.');
console.log('    These assertions PIN the current wrong behaviour. When dc-core is fixed to');
console.log('    `min + (g + 0.5) * range / N`, they will fail — that is the signal to flip');
console.log('    them to `near(dc, gpu)`. Do not "fix" this file to make them pass.');
for (const N of [8, 64, 512]) {
    const dc0 = gridToWorld(0, N, MIN, MAX);
    const dcLast = gridToWorld(N - 1, N, MIN, MAX);
    const s = RANGE / N;
    // Corner-sampled: spans the full box exactly, so it is half a voxel wide at each end.
    if (near(dc0, MIN) && near(dcLast, MAX)) {
        ok(`N=${N}: dc-core still spans [min, max] (off by ±s/2 = ±${(s / 2).toExponential(2)} vs the sampler)`);
    } else {
        fail(`N=${N}: dc-core convention CHANGED — if this was the cell-centre fix, flip assertions 3-4 to near(dc, gpu)`);
    }
    // The divergence is a pure uniform scale about the centre.
    const centre = (MIN + MAX) / 2;
    const scale = (dcLast - centre) / (gpuSample(N - 1, N, MIN, RANGE) - centre);
    if (near(scale, N / (N - 1), 1e-9)) ok(`N=${N}: divergence is exactly a ${(N / (N - 1)).toFixed(6)}x scale about the grid centre`);
    else fail(`N=${N}: divergence is no longer a clean N/(N-1) scale (got ${scale})`);
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
