/**
 * V3 Frag Importer — Generation tests
 *
 * Runs V3 analyzeSource() + generateFormula() on the test matrix and validates
 * that the generated GLSL parses correctly.
 *
 * Run:  npx tsx debug/test-frag-v3-generation.mts
 *   or: npx tsx debug/test-frag-v3-generation.mts --verbose
 *   or: npx tsx debug/test-frag-v3-generation.mts Menger
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@shaderfrog/glsl-parser';
import { analyzeSource } from '../features/fragmentarium_import/v3/analyze/index.ts';
import { generateFormula } from '../features/fragmentarium_import/v3/generate/index.ts';
import { autoAssignSlots } from '../features/fragmentarium_import/v3/generate/slots.ts';
import { detectDECFormat } from '../features/fragmentarium_import/parsers/dec-detector.ts';
import { preprocessDEC } from '../features/fragmentarium_import/parsers/dec-preprocessor.ts';

const VERBOSE = process.argv.includes('--verbose');
const FILTER = process.argv.slice(2).find(a => !a.startsWith('-') && !a.includes('/') && !a.includes('\\') && !a.includes('.') && !a.includes('test-frag'));
const REF = 'features/fragmentarium_import/reference/Examples';
const ROOT = 'h:/GMT/workspace-gmt/stable';

const ok  = (s: string) => `\x1b[32m✓\x1b[0m  ${s}`;
const err = (s: string) => `\x1b[31m✗\x1b[0m  ${s}`;
const wrn = (s: string) => `\x1b[33m⚠\x1b[0m  ${s}`;
const dim = (s: string) => `\x1b[90m${s}\x1b[0m`;

let passed = 0, failed = 0, glslErrors = 0;

function test(label: string, relPath: string) {
    if (FILTER && !label.toLowerCase().includes(FILTER.toLowerCase())) return;

    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) return;

    let src = fs.readFileSync(absPath, 'utf8');
    const decResult = detectDECFormat(src);
    if (decResult.isDEC && decResult.confidence > 0.4) {
        src = preprocessDEC(src).fragmentariumSource;
    }

    const name = label.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    console.log(`\n─── ${label}`);

    // Analyze
    const analysis = analyzeSource(src, label);
    if (!analysis.ok) { console.log(err(`analyze: ${analysis.error}`)); failed++; return; }

    const a = analysis.value;
    const selectedFunc = a.functions.find(f => f.isAutoDetectedDE)?.name
        ?? a.functions.find(f => f.name === 'de')?.name
        ?? a.functions[0]?.name;
    if (!selectedFunc) { console.log(err('no function found')); failed++; return; }

    const loopMode = a.functions.find(f => f.name === selectedFunc)?.loop ? 'loop' as const : 'single' as const;

    // Auto-assign slots
    const params = autoAssignSlots([...a.params]);

    // Generate
    const gen = generateFormula(a, selectedFunc, loopMode, name, params);
    if (!gen.ok) { console.log(err(`generate: ${gen.error} (stage: ${gen.stage})`)); failed++; return; }

    const v3 = gen.value;

    // Validate GLSL parses
    try {
        const uniformStubs = (v3.uniformDeclarations || '')
            .split('\n')
            .filter(l => l.trim() && !l.trim().startsWith('//'))
            .join('\n');
        parse(uniformStubs + '\n' + v3.functionCode, { quiet: true });
    } catch (e: any) {
        const msg = (e?.message ?? String(e)).split('\n')[0].slice(0, 120);
        console.log(wrn(`GLSL parse error: ${msg}`));
        glslErrors++;
    }

    // Report
    console.log(ok(`${v3.mode}  getDist=${!!v3.getDist}  warnings=${v3.warnings.length}`));

    if (VERBOSE) {
        console.log(dim('   getDist: ' + (v3.getDist ?? '(none)')));
        if (v3.warnings.length) v3.warnings.forEach(w => console.log(dim('   warn: ' + w)));
    }

    passed++;
}

// ─── Test matrix ────────────────────────────────────────────────────────────

test('Menger IFS (Tutorial 11)',  `${REF}/Tutorials/11 - Simple Distance Estimated 3D fractal.frag`);
test('Mandelbox',                 `${REF}/Historical 3D Fractals/Mandelbox.frag`);
test('Tetrahedron',               `${REF}/Kaleidoscopic IFS/Tetrahedron.frag`);
test('NewMenger',                 `${REF}/Kaleidoscopic IFS/NewMenger.frag`);
test('Menger Kali',               `${REF}/Kaleidoscopic IFS/Menger.frag`);
test('Octahedron',                `${REF}/Kaleidoscopic IFS/Octahedron.frag`);
test('Icosahedron',               `${REF}/Kaleidoscopic IFS/Icosahedron.frag`);
test('Dodecahedron',              `${REF}/Kaleidoscopic IFS/Dodecahedron.frag`);
test('KaliBox',                   `${REF}/Kali's Creations/Kalibox.frag`);
test('Treebroccoli',              `${REF}/Kali's Creations/Treebroccoli.frag`);
test('KboxExpSmooth',             `${REF}/Kali's Creations/KboxExpSmooth.frag`);
test('LivingKIFS',                `${REF}/Kali's Creations/LivingKIFS.frag`);
test('RotJulia',                  `${REF}/Kali's Creations/RotJulia.frag`);
test('Tutorial 12 (Mandelbulb)', `${REF}/Tutorials/12 - Faster raytracing of 3D fractals.frag`);
test('AmazingSurface',            `${REF}/Kali's Creations/amazingsurface.frag`);
test('Mandelbulb (Historical)',   `${REF}/Historical 3D Fractals/Mandelbulb.frag`);
test('QuaternionJulia',           `${REF}/Historical 3D Fractals/QuaternionJulia.frag`);
test('PseudoKleinian',            `${REF}/Knighty Collection/PseudoKleinian.frag`);
test('MandalayBox',               `${REF}/Knighty Collection/MandalayBox.frag`);
test('PseudoKleinianMenger',      `${REF}/Knighty Collection/PseudoKleinianMenger.frag`);
test('BuffaloBulb',               `${REF}/3DickUlus/BuffaloBulb.frag`);
test('PetraBox',                  `${REF}/3DickUlus/PetraBox.frag`);
test('BioMorph',                  `${REF}/3DickUlus/BioMorph.frag`);
test('Pengbulb',                  `${REF}/3DickUlus/Pengbulb.frag`);
test('LionBulb',                  `${REF}/3DickUlus/LionBulb.frag`);
test('sinhJulia',                 `${REF}/3DickUlus/sinhJulia.frag`);
test('BioCube',                   `${REF}/DarkBeam/BioCube.frag`);
test('FoldcutToy',                `${REF}/DarkBeam/FoldcutToy.frag`);
test('RecFold',                   `${REF}/DarkBeam/RecFold.frag`);
test('PseudoKn4DQ',               `${REF}/Knighty Collection/PseudoKleinian_4D_Quaternion_Julia.frag`);
test('MengerSphere',              `${REF}/Knighty Collection/Menger_Sphere.frag`);
test('SphereTree',                `${REF}/TGlad/SphereTree.frag`);
test('Tetrahedral (TGlad)',       `${REF}/TGlad/Tetrahedral.frag`);
test('Mandelbulb (LoicVDB)',      `${REF}/LoicVDB/Mandelbulb.frag`);
test('MarbleMarcher',             `${REF}/LoicVDB/MarbleMarcher.frag`);
test('NewtonVarPower',            `${REF}/gannjondal/NewtonVarPower.frag`);
test('NewtonVarPowerSimplified',  `${REF}/gannjondal/NewtonVarPowerSimplified.frag`);
test('NewtonRotFoldMenger',       `${REF}/gannjondal/NewtonVarPowerWithRotatdFoldAndMenger.frag`);
test('aboxMinR2Cuboid',          `${REF}/CozyG/aboxMinR2Cuboid-2.frag`);
test('abox_inCyl',               `${REF}/CozyG/abox_inCyl-10.frag`);
test('SphereSponge',             `${REF}/Experimental/SphereSponge.frag`);
test('Moebiusbulb',              `${REF}/Experimental/Moebiusbulb.frag`);
test('boxfold_kleinian',         `${REF}/Experimental/boxfold_kleinian.frag`);
test('BenesiFoldedMandelbulb',   `${REF}/Experimental/BenesiFoldedMandelbulb.frag`);
test('Mixed',                    `${REF}/Experimental/Mixed.frag`);
test('FoldCutPolyhedra',         `${REF}/Knighty Collection/Fold and Cut Polyhedra.frag`);
test('kosalos Apollonian',       `${REF}/kosalos/Apollonian.frag`);
test('kosalos KaliBox',          `${REF}/kosalos/KaliBox.frag`);
test('kosalos Kleinian',         `${REF}/kosalos/Kleinian.frag`);
test('kosalos Mandelbulb',       `${REF}/kosalos/Mandelbulb.frag`);
test('MixPinski',                `${REF}/mclarekin/darkbeam_MixPinski.frag`);
test('Mandelbulb_plus',          `${REF}/mclarekin/Mandelbulb_plus.frag`);
test('BenesiFoldedBulb',         `${REF}/Benesi/BenesiFoldedBulb.frag`);
test('BenesiPineFoldDE',         `${REF}/Benesi/BenesiPineFoldDE.frag`);
test('MengerSmooth',             `${REF}/Benesi/MengerSmooth.frag`);
test('MMM (3Dickulus)',           `${REF}/3DickUlus/MMM.frag`);
test('BurtsBisectorBulb',        `${REF}/3DickUlus/BurtsBisectorBulb.frag`);
test('HiddenBrotCos',            `${REF}/3DickUlus/HiddenBrotCos.frag`);
test('Menger11 (Kashaders)',     `${REF}/Kashaders/Fractals/KIFSandCO/Menger11.frag`);
test('CrossMenger (Kashaders)',  `${REF}/Kashaders/Fractals/KIFSandCO/Cross-menger.frag`);
test('AnotherKoch3D',            `${REF}/Kashaders/Fractals/KIFSandCO/AnotherKoch3D.frag`);
test('Bulbox (Kashaders)',       `${REF}/Kashaders/Fractals/Mandos/hybrids/bulbox.frag`);
test('SimpleIFS-DE3D',          `${REF}/Kashaders/Fractals/IFS/SimpleIFS-DE3D-final.frag`);
test('Mandelbox DualNumbers',    `${REF}/Theory/Mandelbox - Dual Numbers DE.frag`);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed} passed  ${failed} failed  (${passed + failed} total)`);
if (glslErrors > 0) console.log(`  ${glslErrors} GLSL parse error${glslErrors > 1 ? 's' : ''}`);
