/**
 * Build the public formula library from verified passing formulas.
 *
 * 1. Copies passing .frag files to public/formulas/frag/ (preserving folder structure)
 * 2. Generates public/formulas/dec.json from passing DEC formulas
 * 3. Generates public/formulas/manifest.json (metadata index for the UI)
 *
 * Usage:
 *   npx tsx debug/build-formula-manifest.mts
 *   npx tsx debug/build-formula-manifest.mts --dry-run     # Print stats only
 *   npx tsx debug/build-formula-manifest.mts --clean        # Remove public/formulas/ first
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Imports ─────────────────────────────────────────────────────────────────

import { PASSING_FRAG_PATHS, PASSING_DEC_IDS } from '../features/fragmentarium_import/passing-formulas.ts';
import { DEC_FRACTALS } from '../features/fragmentarium_import/random-formulas.ts';

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const CLEAN = process.argv.includes('--clean');

const ROOT = path.resolve('.');
const REF_DIR = path.join(ROOT, 'features/fragmentarium_import/reference/Examples');
const OUT_DIR = path.join(ROOT, 'public/formulas');
const FRAG_OUT = path.join(OUT_DIR, 'frag');
const DEC_OUT = path.join(OUT_DIR, 'dec.json');
const MANIFEST_OUT = path.join(OUT_DIR, 'manifest.json');

// ─── Category inference (same logic as formula-library.ts) ───────────────────

function inferFragCategory(name: string, fragPath: string): { category: string; tags: string[] } {
    const lower = name.toLowerCase();
    const pathLower = fragPath.toLowerCase();
    const tags: string[] = [];

    if (lower.includes('mandelbulb') || lower.includes('bulb')) {
        tags.push('mandelbulb', 'power-formula');
        return { category: 'Mandelbulb', tags };
    }
    if (lower.includes('mandelbox') || lower.includes('mbox') || lower.includes('abox')) {
        tags.push('mandelbox', 'box-fold');
        return { category: 'Mandelbox', tags };
    }
    if (lower.includes('menger') || lower.includes('menge4')) {
        tags.push('menger', 'ifs');
        return { category: 'Menger Sponge', tags };
    }
    if (lower.includes('kleinian')) {
        tags.push('kleinian', 'limit-set');
        return { category: 'Kleinian', tags };
    }
    if (lower.includes('quaternion') || lower.includes('quat')) {
        tags.push('quaternion', '4d');
        return { category: 'Quaternion', tags };
    }
    if (lower.includes('kifs') || lower.includes('ifs') || pathLower.includes('ifs')) {
        tags.push('ifs');
        if (lower.includes('kifs')) tags.push('kaleidoscopic');
        return { category: 'IFS', tags };
    }
    if (lower.includes('hyperbolic') || lower.includes('tesselation') || lower.includes('tessellation')) {
        tags.push('hyperbolic', 'tessellation');
        return { category: 'Hyperbolic Tessellation', tags };
    }
    if (lower.includes('polyhedr') || lower.includes('icosahedr') || lower.includes('dodecahedr') ||
        lower.includes('octahedr') || lower.includes('tetrahedr') || lower.includes('polychora') ||
        lower.includes('catalan') || lower.includes('stellation')) {
        tags.push('polyhedra', 'geometric');
        return { category: 'Polyhedra', tags };
    }
    if (lower.includes('koch') || lower.includes('pythagore')) {
        tags.push('koch', 'fractal-curve');
        return { category: 'Koch & Pythagoras', tags };
    }
    if (lower.includes('apollo')) {
        tags.push('apollonian', 'sphere-packing');
        return { category: 'Apollonian', tags };
    }
    if (lower.includes('mandalabeth') || lower.includes('mandalay')) {
        tags.push('mandalabeth');
        return { category: 'Mandalabeth', tags };
    }
    if (lower.includes('tree') || lower.includes('broccoli') || lower.includes('twig')) {
        tags.push('organic', 'tree');
        return { category: 'Organic', tags };
    }
    if (pathLower.startsWith('tutorials/')) {
        tags.push('tutorial', 'learning');
        return { category: 'Tutorial', tags };
    }
    if (pathLower.includes('kashaders/')) {
        if (pathLower.includes('tessellation')) {
            tags.push('tessellation');
            return { category: 'Tessellation', tags };
        }
        if (pathLower.includes('mandos')) {
            tags.push('mandelbrot-variant');
            return { category: 'Mandelbrot Variants', tags };
        }
        if (pathLower.includes('superellipsoid')) {
            tags.push('menger', 'superellipsoid');
            return { category: 'Menger Sponge', tags };
        }
    }
    if (lower.includes('knot')) { tags.push('knot'); return { category: 'Geometric', tags }; }
    if (lower.includes('noise') || lower.includes('classic')) {
        tags.push('noise'); return { category: 'Noise & Textures', tags };
    }
    if (lower.includes('sphere') || lower.includes('sponge') || lower.includes('primitive')) {
        tags.push('geometric'); return { category: 'Geometric', tags };
    }
    if (lower.includes('surfbox') || lower.includes('mixpinski') || lower.includes('riemann')) {
        tags.push('hybrid'); return { category: 'Hybrid', tags };
    }
    if (lower.includes('honeycomb')) {
        tags.push('hyperbolic'); return { category: 'Hyperbolic Tessellation', tags };
    }
    tags.push('experimental');
    return { category: 'Other', tags };
}

function inferDECCategory(id: string, code: string): { category: string; tags: string[] } {
    const lower = id.toLowerCase();
    const tags: string[] = ['dec'];

    if (lower.includes('apollo')) { tags.push('apollonian'); return { category: 'Apollonian', tags }; }
    if (lower.includes('julia')) { tags.push('julia'); return { category: 'Quaternion', tags }; }
    if (lower.includes('menger') || lower.includes('munger')) { tags.push('menger'); return { category: 'Menger Sponge', tags }; }
    if (lower.includes('mandel') || lower.includes('mbox') || lower.includes('manscaped')) { tags.push('mandelbox'); return { category: 'Mandelbox', tags }; }
    if (lower.includes('tree') || lower.includes('twig')) { tags.push('tree'); return { category: 'Organic', tags }; }
    if (lower.includes('klein')) { tags.push('kleinian'); return { category: 'Kleinian', tags }; }
    if (lower.includes('kali') || lower.includes('rifs')) { tags.push('ifs'); return { category: 'IFS', tags }; }
    if (lower.includes('snow') || lower.includes('flake') || lower.includes('koch')) { tags.push('fractal-curve'); return { category: 'Koch & Pythagoras', tags }; }
    if (lower.includes('schwarz')) { tags.push('schwarz'); return { category: 'Polyhedra', tags }; }
    if (lower.includes('grid') || lower.includes('cage') || lower.includes('box') ||
        lower.includes('voxel') || lower.includes('temple') || lower.includes('gate')) { tags.push('geometric'); return { category: 'Architectural', tags }; }
    if (lower.includes('curl') || lower.includes('whorl') || lower.includes('swirl') ||
        lower.includes('swizz') || lower.includes('spiral')) { tags.push('spiral'); return { category: 'Spirals & Swirls', tags }; }
    if (lower.includes('bone') || lower.includes('bug') || lower.includes('flor') ||
        lower.includes('flower') || lower.includes('water') || lower.includes('reed')) { tags.push('organic'); return { category: 'Organic', tags }; }

    // Numbered fractal_de* — classify by GLSL code patterns
    if (/^fractal_de\d*$/.test(id)) {
        const hasBoxFold = /clamp\s*\(\s*p|2(?:\.0)?\s*\*\s*clamp/.test(code);
        const hasSphereFold = /\/\s*r2|\/\s*dot\s*\(/.test(code);
        const hasModFold = /mod\s*\(/.test(code);
        const hasTrig = /sin\s*\(|cos\s*\(/.test(code);
        const hasPolar = /atan\s*\(|acos\s*\(|asin\s*\(/.test(code);
        const hasRotation = /rot[XYZ]|rotM|mat[23]\s*\(/.test(code);
        const hasCross = /cross\s*\(/.test(code);

        if (hasBoxFold && hasSphereFold) { tags.push('mandelbox', 'box-fold', 'sphere-fold'); return { category: 'Mandelbox', tags }; }
        if (hasBoxFold) { tags.push('box-fold'); return { category: 'Box Fold', tags }; }
        if (hasSphereFold) { tags.push('sphere-fold'); return { category: 'Sphere Fold', tags }; }
        if (hasPolar && hasTrig) { tags.push('power-formula', 'trigonometric'); return { category: 'Mandelbulb', tags }; }
        if (hasModFold && !hasTrig) { tags.push('mod-fold', 'geometric'); return { category: 'Mod Fold', tags }; }
        if (hasModFold && hasTrig) { tags.push('mod-fold', 'trigonometric'); return { category: 'Hybrid', tags }; }
        if (hasTrig) { tags.push('trigonometric'); return { category: 'Trigonometric', tags }; }
        if (hasCross || hasRotation) { tags.push('geometric', 'rotation'); return { category: 'Geometric', tags }; }

        tags.push('experimental');
        return { category: 'DEC Experimental', tags };
    }

    return { category: 'Other', tags };
}

// ─── Build manifest entries ──────────────────────────────────────────────────

interface FragEntry {
    id: string;       // relative path within frag/ (e.g. "3DickUlus/3Dickulus.frag")
    name: string;     // display name
    folder: string;   // top-level folder (artist/collection)
    category: string;
    tags: string[];
}

interface DECEntry {
    id: string;
    name: string;
    author: string;
    category: string;
    tags: string[];
}

interface Manifest {
    generated: string;
    references: {
        frag: string;
        dec: string;
    };
    frags: FragEntry[];
    decs: DECEntry[];
}

function buildFragEntries(): FragEntry[] {
    return PASSING_FRAG_PATHS.map(fragPath => {
        const parts = fragPath.split('/');
        const folder = parts[0];
        const fileName = parts[parts.length - 1].replace('.frag', '');
        const displayName = fileName
            .replace(/^[\d]+\s*-\s*/, '')
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const { category, tags } = inferFragCategory(fileName, fragPath);

        return { id: fragPath, name: displayName, folder, category, tags };
    });
}

function buildDECEntries(): DECEntry[] {
    const passingSet = new Set(PASSING_DEC_IDS);

    return DEC_FRACTALS
        .filter(f => passingSet.has(f.id))
        .map(f => {
            const displayName = f.id
                .replace(/^fractal_de(\d+)$/, 'DEC #$1')
                .replace(/^fractal_de$/, 'DEC #0')
                .replace(/_/g, ' ');

            const { category, tags } = inferDECCategory(f.id, f.code);

            return {
                id: f.id,
                name: displayName,
                author: f.author,
                category,
                tags,
            };
        });
}

// ─── Copy frag files ─────────────────────────────────────────────────────────

function copyFragFiles(): number {
    let copied = 0;
    let missing = 0;

    for (const relPath of PASSING_FRAG_PATHS) {
        const src = path.join(REF_DIR, relPath);
        const dst = path.join(FRAG_OUT, relPath);

        if (!fs.existsSync(src)) {
            console.warn(`  WARNING: missing source: ${relPath}`);
            missing++;
            continue;
        }

        const dstDir = path.dirname(dst);
        fs.mkdirSync(dstDir, { recursive: true });
        fs.copyFileSync(src, dst);
        copied++;
    }

    if (missing > 0) console.warn(`  ${missing} files missing from reference/`);
    return copied;
}

// ─── Build DEC JSON ──────────────────────────────────────────────────────────

interface DECFormulaJSON {
    id: string;
    author: string;
    code: string;
}

function buildDECJSON(): DECFormulaJSON[] {
    const passingSet = new Set(PASSING_DEC_IDS);
    return DEC_FRACTALS
        .filter(f => passingSet.has(f.id))
        .map(f => ({ id: f.id, author: f.author, code: f.code }));
}

// ─── Main ────────────────────────────────────────────────────────────────────

const fragEntries = buildFragEntries();
const decEntries = buildDECEntries();

console.log(`\n  Formula Library Builder`);
console.log(`  ──────────────────────`);
console.log(`  Frag formulas: ${fragEntries.length} passing (from ${PASSING_FRAG_PATHS.length} paths)`);
console.log(`  DEC formulas:  ${decEntries.length} passing`);
console.log(`  Total:         ${fragEntries.length + decEntries.length}`);

// Category breakdown
const catCounts = new Map<string, number>();
for (const e of [...fragEntries, ...decEntries]) {
    catCounts.set(e.category, (catCounts.get(e.category) || 0) + 1);
}
console.log(`\n  Categories:`);
for (const [cat, count] of [...catCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
}

// Folder breakdown for frags
const folderCounts = new Map<string, number>();
for (const e of fragEntries) {
    folderCounts.set(e.folder, (folderCounts.get(e.folder) || 0) + 1);
}
console.log(`\n  Frag folders:`);
for (const [folder, count] of [...folderCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${folder}: ${count}`);
}

if (DRY_RUN) {
    console.log('\n  Dry run — not writing files.');
    process.exit(0);
}

// Clean if requested
if (CLEAN && fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
    console.log(`\n  Cleaned ${OUT_DIR}`);
}

// Create output dirs
fs.mkdirSync(OUT_DIR, { recursive: true });

// 1. Copy frag files
console.log(`\n  Copying frag files...`);
const copied = copyFragFiles();
console.log(`  Copied ${copied} files to public/formulas/frag/`);

// 2. Write DEC JSON
const decJSON = buildDECJSON();
fs.writeFileSync(DEC_OUT, JSON.stringify(decJSON, null, 2));
console.log(`  Wrote ${decJSON.length} DEC formulas to public/formulas/dec.json`);

// 3. Write manifest
const manifest: Manifest = {
    generated: new Date().toISOString().split('T')[0],
    references: {
        frag: 'https://github.com/3Dickulus/Fragmentarium_Examples_Folder',
        dec: 'https://jbaker.graphics/writings/DEC.html',
    },
    frags: fragEntries,
    decs: decEntries,
};

fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2));
console.log(`  Wrote manifest.json (${(JSON.stringify(manifest).length / 1024).toFixed(1)} KB)`);

console.log(`\n  Done.\n`);
