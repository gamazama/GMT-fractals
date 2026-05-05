/** Verify mesh-export CP path compiles for one CP-aware and one non-CP formula. */
import * as fs from 'fs';
import { registerFeatures } from '../engine-gmt/features/index.ts';
registerFeatures();
import '../engine-gmt/formulas/index.ts';

import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import {
    buildMeshSDFShader,
    buildMeshNewtonShader,
    buildMeshPreviewShader,
    buildMeshEscapeShader,
    buildMeshColorShader,
} from '../engine-gmt/engine/SDFShaderBuilder.ts';

function check(formulaId: string, estimator: number) {
    const def = registry.get(formulaId);
    if (!def) { console.log(`  SKIP ${formulaId} — not in registry`); return; }
    const cfg: any = { definition: def, deType: 'auto', estimator };
    const supportsCP = !!def.shader.supportsCuttingPlane;
    let ok = true;
    let lastErr = '';
    for (const [name, build] of [
        ['SDF',     buildMeshSDFShader],
        ['Newton',  buildMeshNewtonShader],
        ['Preview', buildMeshPreviewShader],
        ['Escape',  buildMeshEscapeShader],
        ['Color',   buildMeshColorShader],
    ] as const) {
        try {
            const src = build(cfg);
            // Parity check: cp_dmin should appear iff supports CP, regardless of estimator
            const hasCpDecl = /^\s*float\s+cp_dmin\s*;/m.test(src);
            const wantCpDecl = supportsCP;
            if (hasCpDecl !== wantCpDecl) {
                ok = false;
                lastErr = `${name}: cp_dmin decl mismatch (got ${hasCpDecl}, want ${wantCpDecl})`;
            }
            // When estimator===5 AND supports CP, getDist body should be the CP one.
            // Color and Escape shaders don't compute distance — Color does orbit-trap
            // output; Escape classifies interior/exterior. Skip those for the abs(cp_dmin) check.
            if (estimator === 5 && supportsCP && name !== 'Color' && name !== 'Escape') {
                if (!src.includes('abs(cp_dmin)')) {
                    ok = false; lastErr = `${name}: no abs(cp_dmin) in shader at est=5`;
                }
            }
        } catch (e: any) {
            ok = false; lastErr = `${name}: ${e.message}`; break;
        }
    }
    console.log(`${ok ? 'OK' : 'FAIL'}: ${formulaId} (est=${estimator}, supportsCP=${supportsCP})${lastErr ? ' — ' + lastErr : ''}`);
}

console.log('=== CP-aware formulas at estimator=5 ===');
['MengerSponge', 'Octahedron', 'Icosahedron', 'Dodecahedron', 'TruncatedIcosahedron',
 'SierpinskiTetrahedron', 'MengerAdvanced', 'GreatStellatedDodecahedron', 'Coxeter',
 'Cuboctahedron', 'RhombicDodecahedron', 'RhombicTriacontahedron'].forEach(f => check(f, 5));

console.log('\n=== CP-aware formulas at estimator=1 (Linear, dead-store cp_*) ===');
['MengerSponge', 'Octahedron'].forEach(f => check(f, 1));

console.log('\n=== Non-CP formulas at estimator=5 (must fall back, not crash) ===');
['Mandelbulb', 'KaliBox', 'Apollonian'].forEach(f => check(f, 5));
