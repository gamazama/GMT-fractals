/**
 * Fragmentarium Importer — pipeline smoke tests
 *
 * Run:  npx tsx debug/test-frag-importer.mts
 *   or: npx tsx debug/test-frag-importer.mts --verbose   (full GLSL output)
 *   or: npx tsx debug/test-frag-importer.mts Menger       (filter by name)
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@shaderfrog/glsl-parser';
import { detectFormula } from '../features/fragmentarium_import/workshop/detection.js';
import { buildTransformResult } from '../features/fragmentarium_import/workshop/preview.js';
import type { TransformedFormulaV2 } from '../features/fragmentarium_import/types.js';
import type { FragDocumentV2 } from '../features/fragmentarium_import/types.js';

const VERBOSE = process.argv.includes('--verbose');
const FILTER  = process.argv.slice(2).find(a => !a.startsWith('-') && !a.includes('/') && !a.includes('\\') && !a.includes('.') && !a.includes('test-frag'));
const REF     = 'features/fragmentarium_import/reference/Examples';
const ROOT    = 'h:/GMT/gmt-0.8.5';

// ─── helpers ─────────────────────────────────────────────────────────────────

const ok  = (s: string) => `\x1b[32m✓\x1b[0m  ${s}`;
const err = (s: string) => `\x1b[31m✗\x1b[0m  ${s}`;
const wrn = (s: string) => `\x1b[33m⚠\x1b[0m  ${s}`;
const glsl = (s: string) => `\x1b[35m⚡\x1b[0m  ${s}`;

let passed = 0, failed = 0, glslIssues = 0;

// ─── GLSL built-ins and GMT scope names valid in getDist ─────────────────────

const GLSL_BUILTINS = new Set([
    'abs','acos','all','any','asin','atan','ceil','clamp','cos','cross','degrees',
    'distance','dot','equal','exp','exp2','faceforward','floor','fract','gl_FragCoord',
    'greaterThan','greaterThanEqual','inversesqrt','length','lessThan','lessThanEqual',
    'log','log2','mat2','mat3','mat4','max','min','mix','mod','normalize','not',
    'notEqual','outerProduct','pow','radians','reflect','refract','sign','sin',
    'sinh','smoothstep','sqrt','step','tan','tanh','transpose',
    'bool','bvec2','bvec3','bvec4','float','int','ivec2','ivec3','ivec4',
    'uint','uvec2','uvec3','uvec4','vec2','vec3','vec4',
    'true','false','return',
]);
// Names always in scope inside getDist
const GMT_GETDIST_SCOPE = new Set(['z','dr','r','iter','trap','c','frag_cachedDist','g_orbitTrap']);

/**
 * Validate generated GLSL output.
 * Returns array of issue strings (empty = clean).
 */
function validateGLSL(result: TransformedFormulaV2, doc: FragDocumentV2): string[] {
    const issues: string[] = [];

    // ── 1. Parse the formula function code with the AST parser ────────────────
    // Build a minimal parseable wrapper: declare stubs for global uniforms so
    // the parser doesn't choke on undeclared names.
    const uniformStubs = (result.uniforms || '')
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//'))
        .join('\n');
    const fullCode = uniformStubs + '\n' + result.function;
    try {
        parse(fullCode);
    } catch (e: any) {
        const msg = (e?.message ?? String(e)).split('\n')[0].slice(0, 120);
        issues.push(`GLSL parse error: ${msg}`);
    }

    // ── 2. getDist scope check ────────────────────────────────────────────────
    if (result.getDist) {
        // Build set of names valid in getDist scope:
        // - GMT scope constants
        // - Uniform names declared in uniforms block
        // - Helper function names
        const validInGetDist = new Set([...GLSL_BUILTINS, ...GMT_GETDIST_SCOPE]);

        // Add uniform-declared names (const T u_Name = ... or // Name -> slot)
        for (const m of (result.uniforms ?? '').matchAll(/\bu_(\w+)\b/g)) {
            validInGetDist.add('u_' + m[1]);
        }
        // Add GMT slot uniform names
        for (const m of (result.uniforms ?? '').matchAll(/\b(u(?:Param|Vec2|Vec3)[A-Z])\b/g)) {
            validInGetDist.add(m[1]);
        }
        validInGetDist.add('uIterations'); validInGetDist.add('uJulia'); validInGetDist.add('uJuliaMode');

        // Add helper function names
        for (const h of doc.helperFunctions) {
            validInGetDist.add(h.name);
        }
        // Add function candidates (DE function name, helpers called by DE)
        if (doc.deFunction) validInGetDist.add(doc.deFunction.name);

        // Computed globals are inlined by getDist generation; if inlining succeeded
        // they're gone. If it failed, still add them to avoid false positives.
        for (const cg of doc.computedGlobals) validInGetDist.add(cg.name);
        for (const gd of doc.globalDecls) validInGetDist.add(gd.name);

        // Extract all word tokens from getDist that look like identifiers,
        // EXCLUDING field selectors (.xyz, .w, etc.) and swizzle components.
        const expr = result.getDist.replace(/\breturn\s+vec2\s*\(/, '').replace(/,\s*iter\s*\)\s*;/, '');
        const exprNoSwizzle = expr.replace(/\.\w+/g, '');  // strip .field access

        // Also add any PascalCase/UPPER names that look like helper function calls
        // referenced in getDist (e.g. MM_DE, Thing2) — these are valid if callable at that scope.
        for (const m of exprNoSwizzle.matchAll(/\b([A-Z]\w*)\b/g)) {
            validInGetDist.add(m[1]);
        }
        const identifiers = new Set(
            Array.from(exprNoSwizzle.matchAll(/\b([a-zA-Z_]\w*)\b/g), m => m[1])
        );

        for (const id of identifiers) {
            if (!validInGetDist.has(id)) {
                issues.push(`getDist references '${id}' which may be out of scope`);
            }
        }
    }

    // ── 3. Double-underscore in function name ─────────────────────────────────
    const nameMatch = result.function.match(/void\s+(formula_\w+)/);
    if (nameMatch && nameMatch[1].includes('__')) {
        issues.push(`Formula name contains __ (GLSL reserved): ${nameMatch[1]}`);
    }

    // ── 4. Uninitialized globals must appear at global scope ──────────────────
    // These (e.g. "mat3 rot;") must be declared before helper functions so the
    // helpers can reference them. If they were accidentally scoped into the formula
    // function instead, helper functions would get a compile-time undeclared error.
    for (const gd of doc.globalDecls) {
        if (gd.expression !== undefined) continue; // literal-initialized → local is fine
        const declPattern = new RegExp(`^${gd.type}\\s+${gd.name}\\s*;`, 'm');
        if (!declPattern.test(result.function)) {
            issues.push(`Uninitialized global '${gd.name}' (${gd.type}) not declared at global scope in generated code`);
        }
    }

    return issues;
}

function test(label: string, relPath: string) {
    if (FILTER && !label.toLowerCase().includes(FILTER.toLowerCase())) return;

    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) {
        console.log(`\n─── ${label}`);
        console.log(wrn(`File not found: ${relPath}`));
        return;
    }

    const src = fs.readFileSync(absPath, 'utf8');
    const name = label.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    console.log(`\n─── ${label}`);

    // 1. Detect
    const detected = detectFormula(src, label);
    if ('error' in detected) {
        console.log(err(`detect: ${detected.error}`));
        failed++; return;
    }

    const { doc, selectedFunction, loopMode, params } = detected;

    // 2. Transform
    let result;
    try {
        result = buildTransformResult(detected, selectedFunction, loopMode, name, params);
    } catch (e: any) {
        console.log(err(`transform threw: ${e.message ?? e}`));
        failed++; return;
    }
    if (!result) {
        console.log(err('buildTransformResult returned null'));
        failed++; return;
    }

    // 3. Report
    const li  = doc.deFunction?.loopInfo;
    const loop = li ? `${li.type} counterVar=${li.counterVar ?? 'none'}` : 'no loop';
    const gds  = [...doc.globalDecls.map(g => `${g.name}${g.expression !== undefined ? `=${g.expression}` : ''}`),
                  ...doc.computedGlobals.map(g => g.name)];

    console.log(ok(`${selectedFunction}  [${loop}]`));
    if (gds.length)               console.log(`   globals  : ${gds.join(', ')}`);
    if (doc.includes.length)      console.log(`   includes : ${doc.includes.join(', ')}`);
    if (result.warnings.length)   result.warnings.forEach(w => console.log(wrn(w)));

    const slots = params
        .filter(p => p.mappedSlot !== 'ignore' && p.mappedSlot !== 'builtin')
        .map(p => `${p.name}→${p.mappedSlot}`);
    if (slots.length) console.log(`   params   : ${slots.join('  ')}`);

    console.log(`   getDist  : ${result.getDist ?? '(none — engine fallback)'}`);

    // 4. GLSL validation
    const glslProblems = validateGLSL(result, doc);
    if (glslProblems.length) {
        glslIssues += glslProblems.length;
        glslProblems.forEach(p => console.log(glsl(p)));
    }

    if (VERBOSE) {
        console.log(result.function);
    }

    passed++;
}

// ─── Test matrix ──────────────────────────────────────────────────────────────

// Regression: previously verified
test('Menger IFS (Tutorial 11)',  `${REF}/Tutorials/11 - Simple Distance Estimated 3D fractal.frag`);
test('Mandelbox',                 `${REF}/Historical 3D Fractals/Mandelbox.frag`);
test('Tetrahedron',               `${REF}/Kaleidoscopic IFS/Tetrahedron.frag`);
test('NewMenger',                 `${REF}/Kaleidoscopic IFS/NewMenger.frag`);
test('Menger Kali',               `${REF}/Kaleidoscopic IFS/Menger.frag`);
test('Octahedron',                `${REF}/Kaleidoscopic IFS/Octahedron.frag`);

// mat4 builtins fix (this session)
test('Icosahedron',               `${REF}/Kaleidoscopic IFS/Icosahedron.frag`);
test('Dodecahedron',              `${REF}/Kaleidoscopic IFS/Dodecahedron.frag`);

// Kali's Creations (p.w / julia / literal-globals fixes)
test('KaliBox',                   `${REF}/Kali's Creations/Kalibox.frag`);
test('Treebroccoli',              `${REF}/Kali's Creations/Treebroccoli.frag`);
test('KboxExpSmooth',             `${REF}/Kali's Creations/KboxExpSmooth.frag`);
test('LivingKIFS',                `${REF}/Kali's Creations/LivingKIFS.frag`);
test('RotJulia',                  `${REF}/Kali's Creations/RotJulia.frag`);

// Historical / classic
test('Tutorial 12 (Mandelbulb)', `${REF}/Tutorials/12 - Faster raytracing of 3D fractals.frag`);
test('AmazingSurface',            `${REF}/Kali's Creations/amazingsurface.frag`);
test('Mandelbulb (Historical)',   `${REF}/Historical 3D Fractals/Mandelbulb.frag`);
test('QuaternionJulia',           `${REF}/Historical 3D Fractals/QuaternionJulia.frag`);

// Knighty collection
test('PseudoKleinian',            `${REF}/Knighty Collection/PseudoKleinian.frag`);
test('MandalayBox',               `${REF}/Knighty Collection/MandalayBox.frag`);
test('PseudoKleinianMenger',      `${REF}/Knighty Collection/PseudoKleinianMenger.frag`);

// 3DickUlus collection
test('BuffaloBulb',               `${REF}/3DickUlus/BuffaloBulb.frag`);
test('PetraBox',                  `${REF}/3DickUlus/PetraBox.frag`);
test('BioMorph',                  `${REF}/3DickUlus/BioMorph.frag`);
test('Pengbulb',                  `${REF}/3DickUlus/Pengbulb.frag`);
test('LionBulb',                  `${REF}/3DickUlus/LionBulb.frag`);
test('sinhJulia',                 `${REF}/3DickUlus/sinhJulia.frag`);

// DarkBeam collection
test('BioCube',                   `${REF}/DarkBeam/BioCube.frag`);
test('FoldcutToy',                `${REF}/DarkBeam/FoldcutToy.frag`);
test('RecFold',                   `${REF}/DarkBeam/RecFold.frag`);

// More Knighty
test('PseudoKn4DQ',               `${REF}/Knighty Collection/PseudoKleinian_4D_Quaternion_Julia.frag`);
test('MengerSphere',              `${REF}/Knighty Collection/Menger_Sphere.frag`);

// TGlad collection
test('SphereTree',                `${REF}/TGlad/SphereTree.frag`);
test('Tetrahedral (TGlad)',       `${REF}/TGlad/Tetrahedral.frag`);

// LoicVDB collection
test('Mandelbulb (LoicVDB)',      `${REF}/LoicVDB/Mandelbulb.frag`);
test('MarbleMarcher',             `${REF}/LoicVDB/MarbleMarcher.frag`);

// gannjondal
test('NewtonVarPower',            `${REF}/gannjondal/NewtonVarPower.frag`);
test('NewtonVarPowerSimplified',  `${REF}/gannjondal/NewtonVarPowerSimplified.frag`);
test('NewtonRotFoldMenger',       `${REF}/gannjondal/NewtonVarPowerWithRotatdFoldAndMenger.frag`);

// CozyG
test('aboxMinR2Cuboid',          `${REF}/CozyG/aboxMinR2Cuboid-2.frag`);
test('abox_inCyl',               `${REF}/CozyG/abox_inCyl-10.frag`);

// Experimental — bool flags, frag_pos, various patterns
test('SphereSponge',             `${REF}/Experimental/SphereSponge.frag`);
test('Moebiusbulb',              `${REF}/Experimental/Moebiusbulb.frag`);
test('boxfold_kleinian',         `${REF}/Experimental/boxfold_kleinian.frag`);
test('BenesiFoldedMandelbulb',   `${REF}/Experimental/BenesiFoldedMandelbulb.frag`);
test('Mixed',                    `${REF}/Experimental/Mixed.frag`);

// Knighty — fold/cut
test('FoldCutPolyhedra',         `${REF}/Knighty Collection/Fold and Cut Polyhedra.frag`);

// kosalos — diverse DE patterns
test('kosalos Apollonian',       `${REF}/kosalos/Apollonian.frag`);
test('kosalos KaliBox',          `${REF}/kosalos/KaliBox.frag`);
test('kosalos Kleinian',         `${REF}/kosalos/Kleinian.frag`);
test('kosalos Mandelbulb',       `${REF}/kosalos/Mandelbulb.frag`);

// mclarekin — hybrid formulas
test('MixPinski',                `${REF}/mclarekin/darkbeam_MixPinski.frag`);
test('Mandelbulb_plus',          `${REF}/mclarekin/Mandelbulb_plus.frag`);

// Benesi — unique folding DEs
test('BenesiFoldedBulb',         `${REF}/Benesi/BenesiFoldedBulb.frag`);
test('BenesiPineFoldDE',         `${REF}/Benesi/BenesiPineFoldDE.frag`);
test('MengerSmooth',             `${REF}/Benesi/MengerSmooth.frag`);

// 3DickUlus — additional bulb variants
test('MMM (3Dickulus)',           `${REF}/3DickUlus/MMM.frag`);
test('BurtsBisectorBulb',        `${REF}/3DickUlus/BurtsBisectorBulb.frag`);
test('HiddenBrotCos',            `${REF}/3DickUlus/HiddenBrotCos.frag`);

// Kashaders — KIFS and hybrid DEs
test('Menger11 (Kashaders)',     `${REF}/Kashaders/Fractals/KIFSandCO/Menger11.frag`);
test('CrossMenger (Kashaders)',  `${REF}/Kashaders/Fractals/KIFSandCO/Cross-menger.frag`);
test('AnotherKoch3D',            `${REF}/Kashaders/Fractals/KIFSandCO/AnotherKoch3D.frag`);
test('Bulbox (Kashaders)',       `${REF}/Kashaders/Fractals/Mandos/hybrids/bulbox.frag`);
test('SimpleIFS-DE3D',          `${REF}/Kashaders/Fractals/IFS/SimpleIFS-DE3D-final.frag`);

// Theory
test('Mandelbox DualNumbers',    `${REF}/Theory/Mandelbox - Dual Numbers DE.frag`);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed} passed  ${failed} failed  (${passed + failed} total)`);
if (glslIssues > 0) console.log(`  ${glslIssues} GLSL issue${glslIssues > 1 ? 's' : ''} (⚡) — pipeline passed but generated code may not compile in GMT`);
