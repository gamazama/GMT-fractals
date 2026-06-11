// Summarize debug/pt-bench/results.json into the tables the report needs.
// Usage: node debug/pt-bench-summary.mjs [path-to-results.json]
import { readFileSync } from 'fs';

const file = process.argv[2] ?? 'debug/pt-bench/results.json';
const { extras, rows } = JSON.parse(readFileSync(file, 'utf8'));
const fx = (v, d = 2) => (v === undefined || v === null ? '—' : Number(v).toFixed(d));

console.log(`backend=${extras.backend} tier=${extras.tier} scenes=${(extras.scenes || []).join(',')} minutes=${extras.totalMinutes}`);
for (const [k, v] of Object.entries(extras)) if (k.startsWith('determinism')) console.log(`  ${k}: ${v}`);

const scenes = [...new Set(rows.map(r => r.scene))];

console.log('\n## CONVERGENCE (PSNR vs reference)');
for (const s of scenes) {
    const rs = rows.filter(r => r.suite === 'convergence' && r.scene === s && r.psnr !== undefined);
    if (!rs.length) continue;
    console.log(`\n${s}:`);
    console.log('  spp   PSNR   PSNRcorr  rmse?   maxAbs  renderMs');
    for (const r of rs.sort((a, b) => a.sppNominal - b.sppNominal)) {
        console.log(`  ${String(r.sppNominal).padStart(3)}  ${fx(r.psnr).padStart(6)}  ${fx(r.psnrCorr).padStart(7)}  ${fx(Math.sqrt(r.mse)).padStart(6)}  ${String(r.maxAbs).padStart(5)}  ${r.renderMs}`);
    }
}

console.log('\n## SEAM MATRIX (seamExcess = band−interior luma; stepRatio vs ref)');
for (const s of scenes) {
    const rs = rows.filter(r => r.suite === 'seam' && r.scene === s);
    if (!rs.length) continue;
    console.log(`\n${s}:`);
    console.log('  case            psnr   seamExcess  seamRatio  stepRatio/ref   spp        ident');
    for (const r of rs) {
        const ratio = r.stepRatioRef !== undefined ? `${fx(r.stepRatio, 2)}/${fx(r.stepRatioRef, 2)}` : fx(r.stepRatio, 2);
        console.log(`  ${r.case.padEnd(14)}  ${fx(r.psnr).padStart(5)}  ${fx(r.seamExcess, 3).padStart(9)}  ${fx(r.seamRatio, 2).padStart(8)}  ${ratio.padStart(13)}   ${(r.sppEffMin + '-' + r.sppEffMax).padStart(7)}  ${r.identicalToRef ? 'YES' : ''}`);
    }
}

console.log('\n## SEAMCONV (seamExcess vs spp — does the tile seam converge?)');
for (const s of scenes) {
    const rs = rows.filter(r => r.suite === 'seamconv' && r.scene === s);
    if (!rs.length) continue;
    for (const variant of ['nopost', 'bloom']) {
        const vr = rs.filter(r => r.case.startsWith(variant)).sort((a, b) => a.sppNominal - b.sppNominal);
        if (!vr.length) continue;
        console.log(`\n${s} ${variant}:`);
        console.log('  spp   seamExcess  stepRatio/ref   psnr');
        for (const r of vr) {
            console.log(`  ${String(r.sppNominal).padStart(3)}  ${fx(r.seamExcess, 3).padStart(9)}  ${(fx(r.stepRatio, 2) + '/' + fx(r.stepRatioRef, 2)).padStart(13)}   ${fx(r.psnr)}`);
        }
    }
}

console.log(`\n## TIMING (${extras.backend === 'gpu' ? 'REAL GPU' : 'HEADLESS-INDICATIVE ONLY'})`);
const tr = rows.filter(r => r.suite === 'timing');
if (tr.length) {
    console.log('  case               renderMs   ms/(Mpx·spp)');
    for (const r of tr) {
        const mpx = (r.width * r.height) / 1e6;
        console.log(`  ${r.case.padEnd(16)}  ${String(r.renderMs).padStart(7)}   ${fx(r.renderMs / (mpx * r.sppNominal), 1)}`);
    }
}
