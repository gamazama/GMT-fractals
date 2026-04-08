import { analyzeSource } from '../features/fragmentarium_import/v3/analyze/index.ts';
import { detectFormulaV3 } from '../features/fragmentarium_import/v3/compat.ts';
import { buildFractalParams } from '../features/fragmentarium_import/workshop/param-builder.ts';
import * as fs from 'fs';

const base = 'features/fragmentarium_import/reference/Examples';
const f = 'Kashaders/Fractals/KIFSandCO/CubeKoch01.frag';
const src = fs.readFileSync(base + '/' + f, 'utf8');
const name = 'CubeKoch01';

// V3 analysis
const r = analyzeSource(src, name);
if (!r.ok) { console.log('Analysis FAIL:', r.error); process.exit(1); }
console.log('=== V3 Analysis ===');
for (const p of r.value.params) {
    console.log(`  ${p.name}: ${p.range.min}→${p.range.max} default=${JSON.stringify(p.default)} isDegrees=${p.isDegrees}`);
}

// V3 detection (goes through compat layer)
const det = detectFormulaV3(src, name);
if ('error' in det) { console.log('Detection FAIL:', det.error); process.exit(1); }
console.log('\n=== Workshop Params (after compat) ===');
for (const p of det.params) {
    console.log(`  ${p.name}: slot=${p.mappedSlot} min=${p.uiMin} max=${p.uiMax} step=${p.uiStep} default=${JSON.stringify(p.uiDefault)} isDegrees=${p.isDegrees}`);
}

// Build fractal params (what gets sent to the engine)
// Filter to only mapped params (skip 'ignore')
const mapped = det.params.filter(p => p.mappedSlot && p.mappedSlot !== 'ignore');
const { uiParams, defaultPreset } = buildFractalParams(mapped, name);
console.log('\n=== UI Params (after buildFractalParams) ===');
for (const p of uiParams) {
    console.log(`  ${p.label}: id=${p.id} min=${p.min} max=${p.max} step=${p.step} default=${JSON.stringify(p.default)} scale=${p.scale}`);
}
console.log('\n=== Default Preset ===');
console.log(JSON.stringify(defaultPreset.features.coreMath, null, 2));
