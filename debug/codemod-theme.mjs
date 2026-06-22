/**
 * codemod-theme.mjs — context-free color-token migration (Phase 1 of the
 * color-scheme cleanup). Replaces ONLY the universally-chrome, byte-identical
 * mappings, so Dark stays pixel-identical and functional color (raw hex /
 * status hues) can't be mis-touched:
 *   - `<prop>-cyan-{300..900}`            → `<prop>-accent-{N}`   (accent ladder)
 *   - `text-gray-{200..700}` (+variants)  → `text-fg-{role}`      (text ink)
 *   - `text-white` (+ /alpha)             → `text-fg`
 *   - `{border,bg,ring,divide,outline,from,via,to}-white/{N}` → `…-line/{N}`
 *
 * Surfaces (bg-black/N, bg-gray-8/900, bg-[#hex]), status colors, and raw-hex
 * chrome are intentionally NOT touched here — they need judgment and are done
 * by per-tree agents afterwards. See plans/color-scheme-spec.md.
 *
 * Usage:  node debug/codemod-theme.mjs            (dry run — prints counts + samples)
 *         node debug/codemod-theme.mjs --apply    (writes changes)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();

const SCAN_DIRS = [
    'engine', 'engine-gmt', 'components', 'hooks', 'store', 'utils', 'data',
    'app-gmt', 'gradient-explorer', 'fluid-toy', 'fractal-toy', 'mesh-export',
    'demo', 'palette',
];
const SKIP_DIR = new Set(['node_modules', 'dist', '.git']);
const EXT = new Set(['.ts', '.tsx']);

const PROP = 'text|bg|border|ring|ring-offset|from|to|via|fill|stroke|divide|outline|decoration|caret|placeholder|shadow';
const GRAY = { 200: 'secondary', 300: 'tertiary', 400: 'muted', 500: 'dim', 600: 'faint', 700: 'ghost' };

/** Ordered list of [name, regex, replacer]. */
const RULES = [
    ['cyan→accent',
        new RegExp(`\\b(${PROP})-cyan-(300|400|500|600|700|800|900)\\b`, 'g'),
        (_m, p, n) => `${p}-accent-${n}`],
    ['text-gray→fg',
        /\btext-gray-(200|300|400|500|600|700)\b/g,
        (_m, n) => `text-fg-${GRAY[n]}`],
    ['text-white/α→fg',
        /\btext-white\/(\d{1,3})\b/g,
        (_m, a) => `text-fg/${a}`],
    ['text-white→fg',
        /\btext-white\b(?!\/)/g,
        () => 'text-fg'],
    ['white/α→line',
        /\b(border|bg|ring|divide|outline|from|via|to)-white\/(\d{1,3})\b/g,
        (_m, p, a) => `${p}-line/${a}`],
    ['white/[α]→line',
        /\b(border|bg|ring|divide|outline|from|via|to)-white\/\[([0-9.]+)\]/g,
        (_m, p, a) => `${p}-line/[${a}]`],
    ['bg-white-solid→fg', /\bbg-white\b(?![/\w-])/g, () => 'bg-fg'],
    ['border-white-solid→fg', /\bborder-white\b(?![/\w-])/g, () => 'border-fg'],

    // ── Surfaces — unambiguous (arbitrary-hex + gray/neutral are always chrome
    //    surfaces; brand hexes #13C3FF/#00b0f0/#0070ba/#005ea6 and the odd
    //    #1a1f3a are intentionally NOT listed, so they're left untouched). ──
    ['hex→surface-viewport', /\bbg-\[#050505\]/g, () => 'bg-surface-viewport'],
    ['hex→surface-dock', /\bbg-\[#(080808|08080c)\]/g, () => 'bg-surface-dock'],
    ['hex→surface', /\bbg-\[#(0a0a0a|0d0d0d|0e0e0e|111|111111|121212|141414)\]/g, () => 'bg-surface'],
    ['hex→surface-raised', /\bbg-\[#(151515|181818|1a1a1a|1f1f1f|222)\]/g, () => 'bg-surface-raised'],
    ['gray-900→sunken', /\bbg-gray-900\b/g, () => 'bg-surface-sunken'],
    ['gray-800→header', /\bbg-gray-800(\/\d{1,3})?\b/g, () => 'bg-surface-header'],
    ['neutral-800→raised', /\bbg-neutral-800\b/g, () => 'bg-surface-raised'],
    ['border-gray→line', /\bborder-gray-(600|700)(\/\d{1,3})?\b/g, () => 'border-line/20'],
    ['border-gray800→line', /\bborder-gray-800(\/\d{1,3})?\b/g, () => 'border-line/10'],

    // ── Black-alpha surfaces — the two highest-volume, 1:1-with-theme-tokens
    //    (panel + section). Backdrops/scrims live at /30–/80 and are left for
    //    the agent pass (panel-vs-backdrop judgment). ──
    ['black/95→surface', /\bbg-black\/9[05]\b/g, () => 'bg-surface'],
    ['black/20→section', /\bbg-black\/20\b/g, () => 'bg-surface-section'],

    // ── Neutral families beyond `gray` (zinc/slate/stone/neutral) + the gray
    //    shades the first pass skipped. text/border consume an optional /alpha
    //    (so we never emit `/20/40` double-alpha). Lighter bg-{gray}-400..700
    //    fills are NOT here — they're context-dependent (track/chip/disabled). ──
    ['text-neutral→fg',
        /\btext-(gray|zinc|slate|stone)-(100|200|300|400|500|600|700)\b/g,
        (_m, _f, n) => `text-fg${({ 100: '-secondary', 200: '-secondary', 300: '-tertiary', 400: '-muted', 500: '-dim', 600: '-faint', 700: '-ghost' })[n]}`],
    ['border-neutral→line',
        /\bborder-(gray|zinc|slate|stone|neutral)-(400|500|600|700)(\/\d{1,3})?\b/g,
        () => 'border-line/20'],
    ['border-neutral8→line',
        /\bborder-(gray|zinc|slate|stone|neutral)-(800|900)(\/\d{1,3})?\b/g,
        () => 'border-line/10'],
    ['bg-neutral950→dock',
        /\bbg-(gray|zinc|slate|stone|neutral)-950(\/\d{1,3})?\b/g,
        (_m, _f, a) => `bg-surface-dock${a || ''}`],
    ['bg-neutral900→surface',
        /\bbg-(zinc|slate|stone|neutral)-900(\/\d{1,3})?\b/g,
        (_m, _f, a) => `bg-surface${a || ''}`],
    ['bg-neutral800→raised',
        /\bbg-(zinc|slate|stone)-800(\/\d{1,3})?\b/g,
        (_m, _f, a) => `bg-surface-raised${a || ''}`],

    // Lighter gray fills used as bg (dots, handles, dividers, slider tracks,
    // disabled states) → the fg ladder, which is byte-identical to the gray
    // ladder in Dark (so no visual change) and inverts in Light. Safe even on
    // the "functional" files (these specific sites are chrome markers).
    ['bg-gray-light→fg',
        /\bbg-gray-(400|500|600|700)(\/\d{1,3})?\b/g,
        (_m, n, a) => `bg-fg-${({ 400: 'muted', 500: 'dim', 600: 'faint', 700: 'ghost' })[n]}${a || ''}`],
];

function walk(dir, out) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
        if (SKIP_DIR.has(e)) continue;
        const full = join(dir, e);
        let st;
        try { st = statSync(full); } catch { continue; }
        if (st.isDirectory()) walk(full, out);
        else if (EXT.has(extname(e))) out.push(full);
    }
}

const files = [];
for (const d of SCAN_DIRS) walk(join(ROOT, d), files);

const ruleCounts = Object.fromEntries(RULES.map(([n]) => [n, 0]));
const samples = Object.fromEntries(RULES.map(([n]) => [n, []]));
let filesChanged = 0;

for (const file of files) {
    let src = readFileSync(file, 'utf8');
    let out = src;
    for (const [name, re, fn] of RULES) {
        out = out.replace(re, (...args) => {
            ruleCounts[name]++;
            const before = args[0];
            const after = fn(...args);
            if (samples[name].length < 4 && before !== after) {
                samples[name].push(`${before} → ${after}  (${file.replace(ROOT, '').replace(/\\/g, '/')})`);
            }
            return after;
        });
    }
    if (out !== src) {
        filesChanged++;
        if (APPLY) writeFileSync(file, out, 'utf8');
    }
}

console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — scanned ${files.length} files, ${filesChanged} would change\n`);
for (const [name] of RULES) {
    console.log(`  ${name.padEnd(18)} ${ruleCounts[name]} replacements`);
    for (const s of samples[name]) console.log(`      ${s}`);
}
console.log('');
