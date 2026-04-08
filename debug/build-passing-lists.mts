/**
 * Build passing-formulas.ts from shader-validator-results.jsonl
 *
 * Outputs PASSING_FRAG_PATHS (relative paths within reference/Examples/) and
 * PASSING_DEC_IDS (DEC fractal identifiers) for use by FormulaWorkshop.tsx.
 *
 * Usage:
 *   npx tsx debug/build-passing-lists.mts              # From latest results
 *   npx tsx debug/build-passing-lists.mts --webgl-only # Only include WebGL-verified passes
 *   npx tsx debug/build-passing-lists.mts --dry-run    # Print stats without writing
 */

import * as fs from 'fs';
import * as path from 'path';

const resultsPath = path.resolve('debug/shader-validator-results.jsonl');
const outputPath = path.resolve('features/fragmentarium_import/passing-formulas.ts');
const refDir = path.resolve('features/fragmentarium_import/reference/Examples');

const WEBGL_ONLY = process.argv.includes('--webgl-only');
const DRY_RUN = process.argv.includes('--dry-run');

interface Result {
    name: string;
    category: string;
    status: string;
    error?: string;
    webglStatus?: string;
    webglError?: string;
    fragPath?: string;
}

// ─── Load results ─────────────────────────────────────────────────────────────

const lines: Result[] = fs.readFileSync(resultsPath, 'utf8')
    .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

// ─── Build name → fragPath[] map from filesystem ─────────────────────────────
// The JSONL may or may not have fragPath; we always discover from disk to be safe.

const nameToFragPaths = new Map<string, string[]>();

function walkFrags(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkFrags(full);
        else if (entry.name.endsWith('.frag')) {
            const rel = path.relative(refDir, full).replace(/\\/g, '/');
            const name = path.basename(entry.name, '.frag');
            const existing = nameToFragPaths.get(name) || [];
            existing.push(rel);
            nameToFragPaths.set(name, existing);
        }
    }
}
walkFrags(refDir);

// ─── Frag formulas ────────────────────────────────────────────────────────────

const fragResults = lines.filter(l => l.category === 'frag');

let passingFragResults: Result[];
if (WEBGL_ONLY) {
    passingFragResults = fragResults.filter(l => l.webglStatus === 'pass');
} else {
    passingFragResults = fragResults.filter(l => l.status === 'pass' && l.webglStatus !== 'fail');
}

// Collect unique passing names
const passingNames = new Set<string>();
for (const r of passingFragResults) {
    passingNames.add(r.name);
}

// Resolve names to paths — include ALL paths for each passing name
// (the same formula in multiple directories should all be available)
const passingPaths: string[] = [];
for (const name of passingNames) {
    const paths = nameToFragPaths.get(name);
    if (paths) {
        for (const p of paths) passingPaths.push(p);
    } else {
        console.warn(`  WARNING: passing formula "${name}" not found on disk`);
    }
}
passingPaths.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

// ─── DEC formulas ─────────────────────────────────────────────────────────────

const decResults = lines.filter(l => l.category === 'dec');
let passingDecResults: Result[];
if (WEBGL_ONLY) {
    passingDecResults = decResults.filter(l => l.webglStatus === 'pass');
} else {
    passingDecResults = decResults.filter(l => l.status === 'pass' && l.webglStatus !== 'fail');
}
const passingDecIds = [...new Set(passingDecResults.map(r => r.name))].sort();

// ─── Stats ────────────────────────────────────────────────────────────────────

const totalFragNames = new Set(fragResults.map(r => r.name)).size;
const glslPass = new Set(fragResults.filter(r => r.status === 'pass').map(r => r.name)).size;
const webglPass = new Set(fragResults.filter(r => r.webglStatus === 'pass').map(r => r.name)).size;
const webglFail = new Set(fragResults.filter(r => r.webglStatus === 'fail').map(r => r.name)).size;

console.log(`\n  Frag formulas:`);
console.log(`    Total unique names: ${totalFragNames}`);
console.log(`    GLSL parse pass:    ${glslPass}`);
console.log(`    WebGL compile pass: ${webglPass}`);
console.log(`    WebGL compile fail: ${webglFail}`);
console.log(`    No WebGL result:    ${glslPass - webglPass - webglFail}`);
console.log(`    Passing names:      ${passingNames.size}`);
console.log(`    Passing paths:      ${passingPaths.length}`);

const totalDecNames = new Set(decResults.map(r => r.name)).size;
console.log(`\n  DEC formulas:`);
console.log(`    Total: ${totalDecNames}`);
console.log(`    Passing: ${passingDecIds.length}`);

const mode = WEBGL_ONLY ? 'WebGL-verified' : 'GLSL pass, no WebGL fail';
console.log(`\n  Mode: ${mode}`);

if (DRY_RUN) {
    console.log('\n  Dry run — not writing file.');
    console.log('\n  Passing frag paths:');
    for (const p of passingPaths) console.log(`    ${p}`);
    console.log('\n  Passing DEC IDs:');
    for (const id of passingDecIds) console.log(`    ${id}`);
    process.exit(0);
}

// ─── Generate output ──────────────────────────────────────────────────────────

const fileContent = `/**
 * Passing formulas verified to compile through V3 pipeline.
 * Frag: ${passingNames.size} names / ${passingPaths.length} paths (of ${totalFragNames} total)
 * DEC:  ${passingDecIds.length} (of ${totalDecNames} total)
 * Mode: ${mode}
 *
 * Auto-generated by: npx tsx debug/build-passing-lists.mts${WEBGL_ONLY ? ' --webgl-only' : ''}
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * To regenerate: run shader-validator.mts --frags --webgl, then build-passing-lists.mts
 */

/** Relative paths within reference/Examples/ for passing .frag formulas */
export const PASSING_FRAG_PATHS: string[] = [
${passingPaths.map(p => `    '${p.replace(/'/g, "\\'")}',`).join('\n')}
];

/** DEC fractal IDs that pass validation */
export const PASSING_DEC_IDS: string[] = [
${passingDecIds.map(id => `    '${id.replace(/'/g, "\\'")}',`).join('\n')}
];
`;

fs.writeFileSync(outputPath, fileContent);
console.log(`\n  Wrote ${passingPaths.length} frag paths + ${passingDecIds.length} DEC IDs to ${outputPath}`);

