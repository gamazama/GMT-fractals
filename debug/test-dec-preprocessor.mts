/**
 * Quick test for the DEC (Distance Estimator Compendium) preprocessor.
 * Tests macro expansion, constant promotion, and Fragmentarium shell generation
 * against real-world DEC snippets.
 *
 * Run: npx tsx debug/test-dec-preprocessor.mts
 */

import { detectDECFormat, parseMacros } from '../features/fragmentarium_import/parsers/dec-detector.js';
import { preprocessDEC, expandMacros, extractPromotableConstants } from '../features/fragmentarium_import/parsers/dec-preprocessor.js';
import { detectFormula } from '../features/fragmentarium_import/workshop/detection.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    } catch (e: any) {
        failed++;
        console.log(`  \x1b[31m✗\x1b[0m ${name}`);
        console.log(`    ${e.message}`);
    }
}

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
}

// ============================================================================
// DEC snippets from the compendium
// ============================================================================

const DEC_SIMPLE = `
float de(vec3 p) {
    float s = 2.0;
    for (int i = 0; i < 8; i++) {
        p = abs(p) - vec3(1.2);
        p *= s;
    }
    return length(p) * pow(s, -8.0);
}
`;

const DEC_WITH_ROT_MACRO = `
#define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))

float de(vec3 p) {
    for (int i = 0; i < 10; i++) {
        p = abs(p) - vec3(1.5, 1.2, 0.8);
        p.xz *= rot(0.7);
        p *= 1.8;
    }
    return length(p) * pow(1.8, -10.0);
}
`;

const DEC_MULTIPLE_MACROS = `
#define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))
#define ITER 12
#define fold45(p) if(p.x<p.y)p.xy=p.yx

float de(vec3 p) {
    for (int i = 0; i < ITER; i++) {
        fold45(p);
        p = abs(p) - vec3(1.0, 1.3, 0.9);
        p.xz *= rot(0.5);
        p *= 2.0;
    }
    return length(p) * pow(2.0, -12.0);
}
`;

const DEC_WITH_HELPER = `
#define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))

float box(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float de(vec3 p) {
    for (int i = 0; i < 8; i++) {
        p = abs(p) - vec3(1.2);
        p.xz *= rot(0.4);
        p *= 1.5;
    }
    return box(p, vec3(1.0)) * pow(1.5, -8.0);
}
`;

const DEC_SORTING = `
float de(vec3 p) {
    for (int i = 0; i < 8; i++) {
        p = abs(p);
        if (p.x < p.y) p.xy = p.yx;
        if (p.x < p.z) p.xz = p.zx;
        if (p.y < p.z) p.yz = p.zy;
        p = p * 1.6 - vec3(1.2, 0.8, 0.4);
    }
    return length(p) * pow(1.6, -8.0);
}
`;

const DEC_SIGN_FOLD = `
float de(vec3 p) {
    float s = 1.5;
    for (int i = 0; i < 9; i++) {
        p = abs(p);
        p -= sign(p) * vec3(0.8, 0.6, 0.4);
        p *= s;
    }
    return length(p) * pow(s, -9.0);
}
`;

const DEC_CLAMP_FOLD = `
float de(vec3 p) {
    float d = 1e10;
    for (int i = 0; i < 8; i++) {
        p = clamp(p, -1.5, 1.5) * 2.0 - p;
        float r = dot(p, p);
        p /= clamp(r, 0.25, 1.0);
        p = p * 1.8 + vec3(0.3, -0.5, 0.2);
        d = min(d, length(p));
    }
    return d * pow(1.8, -8.0);
}
`;

const DEC_NO_LOOP = `
float de(vec3 p) {
    return length(p) - 1.0;
}
`;

// This is a Fragmentarium format — should NOT be detected as DEC
const FRAG_FORMAT = `
uniform float Scale; slider[0,2.0,4.0]
uniform vec3 Offset; slider[(-5,-5,-5),(1,1,1),(5,5,5)]
uniform int Iterations; slider[1,8,50]

float DE(vec3 z) {
    int n = 0;
    while (n < Iterations) {
        z = abs(z);
        z = Scale * z - Offset * (Scale - 1.0);
        n++;
    }
    return abs(length(z)) * pow(Scale, float(-n));
}
`;

const DEC_MULTILINE_MACRO = `
#define FOLD(p) \\
    p = abs(p); \\
    if(p.x<p.y) p.xy = p.yx

float de(vec3 p) {
    for (int i = 0; i < 6; i++) {
        FOLD(p);
        p = p * 1.4 - vec3(1.0, 0.8, 0.6);
    }
    return length(p) * pow(1.4, -6.0);
}
`;

const DEC_NESTED_MACRO = `
#define S 1.5
#define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))
#define TRANSFORM(p) p = abs(p) - vec3(1.0); p.xz *= rot(0.5); p *= S

float de(vec3 p) {
    for (int i = 0; i < 8; i++) {
        TRANSFORM(p);
    }
    return length(p) * pow(S, -8.0);
}
`;

const DEC_SDF_NAME = `
float sdf(vec3 p) {
    for (int i = 0; i < 8; i++) {
        p = abs(p) - vec3(1.2);
        p *= 1.5;
    }
    return length(p) * pow(1.5, -8.0);
}
`;

const DEC_MAP_NAME = `
float map(vec3 p) {
    for (int i = 0; i < 8; i++) {
        p = abs(p) - vec3(1.2);
        p *= 1.5;
    }
    return length(p) * pow(1.5, -8.0);
}
`;

// ============================================================================
// Tests
// ============================================================================

console.log('\n=== DEC Detector Tests ===\n');

test('detects simple DEC format', () => {
    const r = detectDECFormat(DEC_SIMPLE);
    assert(r.isDEC, `Expected isDEC=true, got ${r.isDEC} (confidence: ${r.confidence})`);
    assert(r.deFunctionName === 'de', `Expected deFunctionName='de', got '${r.deFunctionName}'`);
    assert(r.confidence > 0.5, `Expected confidence > 0.5, got ${r.confidence}`);
});

test('detects DEC with rot macro', () => {
    const r = detectDECFormat(DEC_WITH_ROT_MACRO);
    assert(r.isDEC, `Expected isDEC=true`);
    assert(r.macros.length >= 1, `Expected at least 1 macro, got ${r.macros.length}`);
    assert(r.macros[0].name === 'rot', `Expected macro name 'rot', got '${r.macros[0].name}'`);
    assert(r.macros[0].params?.length === 1, `Expected 1 param, got ${r.macros[0].params?.length}`);
});

test('detects DEC with multiple macros', () => {
    const r = detectDECFormat(DEC_MULTIPLE_MACROS);
    assert(r.isDEC, `Expected isDEC=true`);
    assert(r.macros.length === 3, `Expected 3 macros, got ${r.macros.length}`);
});

test('does NOT detect Fragmentarium format as DEC', () => {
    const r = detectDECFormat(FRAG_FORMAT);
    assert(!r.isDEC, `Expected isDEC=false, got isDEC=true (confidence: ${r.confidence})`);
});

test('detects sdf() function name', () => {
    const r = detectDECFormat(DEC_SDF_NAME);
    assert(r.isDEC, `Expected isDEC=true`);
    assert(r.deFunctionName === 'sdf', `Expected deFunctionName='sdf', got '${r.deFunctionName}'`);
});

test('detects map() function name', () => {
    const r = detectDECFormat(DEC_MAP_NAME);
    assert(r.isDEC, `Expected isDEC=true`);
    assert(r.deFunctionName === 'map', `Expected deFunctionName='map', got '${r.deFunctionName}'`);
});

console.log('\n=== Macro Expansion Tests ===\n');

test('expands constant macros (#define ITER 12)', () => {
    const macros = parseMacros(DEC_MULTIPLE_MACROS);
    const iterMacro = macros.find(m => m.name === 'ITER');
    assert(!!iterMacro, 'ITER macro not found');
    assert(iterMacro!.params === null, 'ITER should be a constant macro');
    assert(iterMacro!.body === '12', `Expected body '12', got '${iterMacro!.body}'`);
});

test('expands parameterised rot(a) macro', () => {
    const r = preprocessDEC(DEC_WITH_ROT_MACRO);
    assert(r.expandedMacros.includes('rot'), `'rot' not in expanded macros: ${r.expandedMacros}`);
    // The expanded source should contain mat2(cos(...), ...) instead of rot(...)
    assert(!r.fragmentariumSource.includes('rot('), `rot() call still present in expanded source`);
    assert(r.fragmentariumSource.includes('mat2('), `mat2() not found in expanded source`);
});

test('expands multiline macros', () => {
    const r = preprocessDEC(DEC_MULTILINE_MACRO);
    assert(r.expandedMacros.includes('FOLD'), `'FOLD' not in expanded macros`);
    assert(r.fragmentariumSource.includes('abs(p)'), `abs(p) not found in expanded source`);
});

test('expands nested macros (TRANSFORM uses rot and S)', () => {
    const r = preprocessDEC(DEC_NESTED_MACRO);
    assert(r.expandedMacros.includes('TRANSFORM'), `'TRANSFORM' not in expanded macros`);
    assert(r.expandedMacros.includes('S'), `'S' not in expanded macros`);
    // rot() should also be expanded inside TRANSFORM's expansion
    assert(!r.fragmentariumSource.includes('rot('), `rot() still present after nested expansion`);
    assert(r.fragmentariumSource.includes('mat2('), `mat2() not found after nested expansion`);
});

test('handles fold45 statement macro', () => {
    const r = preprocessDEC(DEC_MULTIPLE_MACROS);
    assert(r.expandedMacros.includes('fold45'), `'fold45' not in expanded macros: ${r.expandedMacros}`);
    assert(r.fragmentariumSource.includes('p.xy=p.yx') || r.fragmentariumSource.includes('p.xy = p.yx'),
        'fold45 expansion not found');
});

console.log('\n=== Constant Promotion Tests ===\n');

test('promotes iteration count', () => {
    const r = preprocessDEC(DEC_SIMPLE);
    const iterConst = r.extractedConstants.find(c => c.uniformName === 'Iterations');
    assert(!!iterConst, 'Iterations constant not found');
    assert(iterConst!.type === 'int', `Expected int, got ${iterConst!.type}`);
    assert(iterConst!.defaultValue === 8, `Expected default 8, got ${iterConst!.defaultValue}`);
});

test('promotes scale factor', () => {
    const r = preprocessDEC(DEC_WITH_ROT_MACRO);
    const scaleConst = r.extractedConstants.find(c => c.context === 'scale factor');
    assert(!!scaleConst, `Scale factor not found. Constants: ${r.extractedConstants.map(c => c.uniformName + '(' + c.context + ')').join(', ')}`);
    assert(scaleConst!.defaultValue === 1.8, `Expected 1.8, got ${scaleConst!.defaultValue}`);
});

test('promotes fold offset (vec3)', () => {
    const r = preprocessDEC(DEC_WITH_ROT_MACRO);
    const offsetConst = r.extractedConstants.find(c => c.context.includes('fold offset'));
    assert(!!offsetConst, `Fold offset not found. Constants: ${r.extractedConstants.map(c => c.uniformName + '(' + c.context + ')').join(', ')}`);
});

test('promotes rotation angle', () => {
    const r = preprocessDEC(DEC_WITH_ROT_MACRO);
    const rotConst = r.extractedConstants.find(c => c.context === 'rotation angle');
    assert(!!rotConst, `Rotation angle not found. Constants: ${r.extractedConstants.map(c => c.uniformName + '(' + c.context + ')').join(', ')}`);
    assert(rotConst!.defaultValue === 0.7, `Expected 0.7, got ${rotConst!.defaultValue}`);
});

test('promotes clamp bounds (MinRad2 pattern)', () => {
    const r = preprocessDEC(DEC_CLAMP_FOLD);
    const minRad = r.extractedConstants.find(c => c.context.includes('minimum radius'));
    assert(!!minRad, `MinRad2 constant not found. Constants: ${r.extractedConstants.map(c => c.uniformName + '(' + c.context + ')').join(', ')}`);
    assert(minRad!.defaultValue === 0.25, `Expected 0.25, got ${minRad!.defaultValue}`);
});

test('handles no-loop DE (sphere) without crashing', () => {
    const r = preprocessDEC(DEC_NO_LOOP);
    assert(r.extractedConstants.length === 0, `Expected no constants for sphere, got ${r.extractedConstants.length}`);
});

console.log('\n=== Fragmentarium Shell Generation Tests ===\n');

test('generates valid uniform declarations', () => {
    const r = preprocessDEC(DEC_SIMPLE);
    assert(r.fragmentariumSource.includes('uniform int Iterations;'), 'Missing Iterations uniform');
    assert(r.fragmentariumSource.includes('slider['), 'Missing slider annotation');
});

test('renames de() to DE()', () => {
    const r = preprocessDEC(DEC_SIMPLE);
    assert(r.fragmentariumSource.includes('float DE('), `DE function not found in output`);
    assert(!r.fragmentariumSource.includes('float de('), `Original de() still present`);
});

test('generates #preset Default block', () => {
    const r = preprocessDEC(DEC_SIMPLE);
    assert(r.fragmentariumSource.includes('#preset Default'), 'Missing #preset Default');
    assert(r.fragmentariumSource.includes('#endpreset'), 'Missing #endpreset');
});

test('renames sdf() to DE()', () => {
    const r = preprocessDEC(DEC_SDF_NAME);
    assert(r.fragmentariumSource.includes('float DE('), `DE function not found`);
    assert(!r.fragmentariumSource.includes('float sdf('), `sdf() still present`);
});

test('renames map() to DE()', () => {
    const r = preprocessDEC(DEC_MAP_NAME);
    assert(r.fragmentariumSource.includes('float DE('), `DE function not found`);
    assert(!r.fragmentariumSource.includes('float map('), `map() still present`);
});

console.log('\n=== Full Pipeline Integration Tests ===\n');

test('simple DEC goes through full detectFormula pipeline', () => {
    const result = detectFormula(DEC_SIMPLE);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
    if ('error' in result) return;
    assert(result.candidates.length > 0, 'No candidates found');
    assert(result.warnings.some(w => w.includes('DEC format detected')), 'Missing DEC warning');
    assert(result.loopMode === 'loop', `Expected loopMode='loop', got '${result.loopMode}'`);
});

test('DEC with rot macro goes through full pipeline', () => {
    const result = detectFormula(DEC_WITH_ROT_MACRO);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
    if ('error' in result) return;
    assert(result.candidates.length > 0, 'No candidates found');
    assert(result.uniforms.length > 0, `No uniforms extracted: ${result.uniforms.length}`);
});

test('DEC with multiple macros goes through full pipeline', () => {
    const result = detectFormula(DEC_MULTIPLE_MACROS);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
    if ('error' in result) return;
    assert(result.candidates.length > 0, 'No candidates found');
});

test('DEC with helper function goes through full pipeline', () => {
    const result = detectFormula(DEC_WITH_HELPER);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
    if ('error' in result) return;
    // Should find both DE and the helper
    assert(result.candidates.length >= 1, `Expected at least 1 candidate, got ${result.candidates.length}`);
    // Should find the box helper
    const hasBox = result.doc.helperFunctions.some(h => h.name === 'box');
    assert(hasBox, 'Helper function "box" not found in parsed doc');
});

test('DEC with sorting goes through full pipeline', () => {
    const result = detectFormula(DEC_SORTING);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
    if ('error' in result) return;
    assert(result.loopMode === 'loop', `Expected loopMode='loop', got '${result.loopMode}'`);
});

test('DEC with sign folding goes through full pipeline', () => {
    const result = detectFormula(DEC_SIGN_FOLD);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
});

test('DEC with clamp folding goes through full pipeline', () => {
    const result = detectFormula(DEC_CLAMP_FOLD);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
});

test('DEC no-loop (sphere) goes through full pipeline', () => {
    const result = detectFormula(DEC_NO_LOOP);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
    if ('error' in result) return;
    assert(result.loopMode === 'single', `Expected loopMode='single', got '${result.loopMode}'`);
});

test('DEC nested macros goes through full pipeline', () => {
    const result = detectFormula(DEC_NESTED_MACRO);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
});

test('Fragmentarium source still works unchanged', () => {
    const result = detectFormula(FRAG_FORMAT);
    assert(!('error' in result), `Detection failed: ${'error' in result ? result.error : ''}`);
    if ('error' in result) return;
    // Should NOT have DEC warnings
    assert(!result.warnings.some(w => w.includes('DEC format detected')),
        'Fragmentarium source incorrectly detected as DEC');
    assert(result.uniforms.length >= 3, `Expected at least 3 uniforms, got ${result.uniforms.length}`);
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m out of ${passed + failed}`);
if (failed > 0) process.exit(1);
