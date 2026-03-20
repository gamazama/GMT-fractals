/**
 * V3 Frag Importer — Analysis tests
 *
 * Runs V3 analyzeSource() on the test matrix and validates results.
 *
 * Run:  npx tsx debug/test-frag-v3-analysis.mts
 *   or: npx tsx debug/test-frag-v3-analysis.mts --verbose
 *   or: npx tsx debug/test-frag-v3-analysis.mts Menger
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeSource } from '../features/fragmentarium_import/v3/analyze/index.ts';
import { detectDECFormat } from '../features/fragmentarium_import/parsers/dec-detector.ts';
import { preprocessDEC } from '../features/fragmentarium_import/parsers/dec-preprocessor.ts';

const VERBOSE = process.argv.includes('--verbose');
const FILTER = process.argv.slice(2).find(a => !a.startsWith('-') && !a.includes('/') && !a.includes('\\') && !a.includes('.') && !a.includes('test-frag'));
const REF = 'features/fragmentarium_import/reference/Examples';
const ROOT = 'h:/GMT/gmt-0.8.5';

// ─── helpers ─────────────────────────────────────────────────────────────────

const ok  = (s: string) => `\x1b[32m✓\x1b[0m  ${s}`;
const err = (s: string) => `\x1b[31m✗\x1b[0m  ${s}`;
const wrn = (s: string) => `\x1b[33m⚠\x1b[0m  ${s}`;
const dim = (s: string) => `\x1b[90m${s}\x1b[0m`;

let passed = 0, failed = 0;

function test(label: string, relPath: string) {
    if (FILTER && !label.toLowerCase().includes(FILTER.toLowerCase())) return;

    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) {
        console.log(wrn(`${label}: file not found`));
        return;
    }

    let src = fs.readFileSync(absPath, 'utf8');

    // DEC preprocessing
    const decResult = detectDECFormat(src);
    if (decResult.isDEC && decResult.confidence > 0.4) {
        const preprocessed = preprocessDEC(src);
        src = preprocessed.fragmentariumSource;
    }

    console.log(`\n─── ${label}`);

    // V3 analysis
    const v3 = analyzeSource(src, label);
    if (!v3.ok) {
        console.log(err(`V3 failed: ${v3.error} (stage: ${v3.stage})`));
        failed++;
        return;
    }

    const a = v3.value;
    const v3DE = a.functions.find(f => f.isAutoDetectedDE);
    const deInfo = v3DE ? `DE=${v3DE.name}` : 'no DE';
    const loopInfo = v3DE?.loop
        ? `${v3DE.loop.type} counter=${v3DE.loop.counterVar ?? 'none'}`
        : 'no loop';
    const v3InitOnce = a.init?.statements.filter(s => s.frequency === 'once').length ?? 0;
    const v3InitPerPixel = a.init?.statements.filter(s => s.frequency === 'per-pixel').length ?? 0;
    const initInfo = a.init
        ? `init: ${v3InitOnce} once + ${v3InitPerPixel} per-pixel`
        : 'no init';

    console.log(ok(`${deInfo}  [${loopInfo}]  params=${a.params.length}  funcs=${a.functions.length}`));
    console.log(dim(`   ${initInfo}  globals: ${a.globals.computed.length}comp + ${a.globals.uninitialized.length}uninit + ${a.globals.literalInit.length}lit`));

    if (a.warnings.length) a.warnings.forEach(w => console.log(wrn(w)));

    if (VERBOSE) {
        console.log(dim('   params:'));
        for (const p of a.params) {
            console.log(dim(`     ${p.name} (${p.type}) default=${JSON.stringify(p.default)} range=[${p.range.min},${p.range.max}]${p.isDegrees ? ' deg' : ''}`));
        }
        if (a.init) {
            console.log(dim('   init statements:'));
            for (const s of a.init.statements) {
                console.log(dim(`     [${s.frequency}] ${s.code.slice(0, 80)}${s.code.length > 80 ? '...' : ''}`));
            }
        }
    }

    passed++;
}

// ─── Test matrix ──────────────────────────────────────────────────────────────

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
