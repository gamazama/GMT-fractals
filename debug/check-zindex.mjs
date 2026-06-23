/**
 * check:zindex — regression guard for the stacking-tier system.
 *
 * Fails (exit 1) when a source file introduces a raw high z-index literal
 * (`z-[N]` Tailwind utility or inline `zIndex: N` / `zIndex={N}`, N ≥ 100) that
 * is NOT sourced from the scale (`z('tier')` / `Z.*`). N ≥ 100 is the
 * floating-panel band and above — the portal territory where a bare number is
 * almost always a future "trapped under the panels" bug. Use `<Layer tier=…>` or
 * `z('tier')` instead (components/ui/zIndex.ts).
 *
 * It is a RATCHET: the ALLOWLIST below freezes the literals that already existed
 * when the layer system landed (intentional shell-local values + a small
 * not-yet-migrated portal backlog). Anything new must use the scale. As backlog
 * files migrate to `z()` / `<Layer>`, delete them from the allowlist.
 *
 * Also reports (informationally, non-failing) `createPortal(_, document.body)`
 * outside the layer host — those should route through `getLayerHost()`/`<Layer>`.
 *
 * Run: `npm run check:zindex`.  @see plans/z-index-system-design.md
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', 'public', 'docs', 'plans', 'debug', 'dist', 'build', '.vite', 'coverage', 'doc-audit-state']);

// Files that legitimately carry a raw z ≥ 100 today. Two kinds:
//  (a) shell-local: an in-flow value meaningful only inside its own fixed/blur
//      stacking context (loading splash, timeline chrome, dock, topbar header).
//  (b) portal backlog: a body-portalled surface still on a raw number, to be
//      migrated to z('tier') / <Layer> (marked ⌛). Remove on migration.
const ALLOWLIST = new Set([
    // doc text references the literal — not real usages
    'components/ui/zIndex.ts',
    'components/ui/Layer.tsx',
    // (a) shell-local chrome (value is local to its own trap)
    'App.tsx',
    'app-gmt/LoadingScreen.tsx',
    'components/LoadingScreen.tsx',
    'components/MobileControls.tsx',
    'components/Timeline.tsx',
    'components/timeline/TimelineToolbar.tsx',
    'components/layout/DropZones.tsx',
    'engine/components/ToastHost.tsx',
    'engine/components/StateLibraryToast.tsx',
    'engine/plugins/TopBar.tsx',
    'engine-gmt/components/FirstRunHint.tsx',
    // (b) ⌛ portal backlog — migrate to z('tier') / <Layer>
    'engine-gmt/topbar/CenterHUD.tsx',                       // hover-bridge zIndex:9990 → contextMenu
    'engine-gmt/components/FormulaPicker/FormulaPicker.tsx', // popover/thumb 9999/10000 → popover/tooltip
]);

const Z_TAILWIND = /\bz-\[(\d+)\]/g;
const Z_INLINE = /zIndex:\s*(\d+)\b/g;
const Z_PROP = /zIndex=\{(\d+)\}/g;
const PORTAL_BODY = /,\s*document\.body\s*\)/; // the `, document.body)` tail of a createPortal call

function walk(dir, out) {
    for (const name of readdirSync(dir)) {
        if (SKIP_DIRS.has(name)) continue;
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) walk(p, out);
        else if (/\.(tsx?|mts)$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
    }
}

const files = [];
walk(ROOT, files);

const violations = [];
const backlog = [];
const bodyPortals = [];

for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join('/');
    const src = readFileSync(file, 'utf8');

    const hits = [];
    for (const re of [Z_TAILWIND, Z_INLINE, Z_PROP]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(src))) {
            if (Number(m[1]) >= 100) {
                const line = src.slice(0, m.index).split('\n').length;
                hits.push({ line, text: m[0], value: Number(m[1]) });
            }
        }
    }
    if (hits.length) (ALLOWLIST.has(rel) ? backlog : violations).push({ rel, hits });

    if (src.includes('createPortal') && PORTAL_BODY.test(src) && !rel.startsWith('components/ui/')) {
        bodyPortals.push(rel);
    }
}

if (backlog.length) {
    const n = backlog.reduce((a, b) => a + b.hits.length, 0);
    console.log(`ℹ ${n} allowlisted raw z literal(s) in ${backlog.length} file(s) (known shell-local + migration backlog).`);
}
if (bodyPortals.length) {
    console.log(`ℹ ${bodyPortals.length} file(s) still createPortal(_, document.body) directly (route via getLayerHost()/<Layer>):`);
    for (const r of bodyPortals.sort()) console.log(`    ${r}`);
}

if (violations.length) {
    console.error(`\n✗ ${violations.length} file(s) introduce a raw z-index ≥ 100 not sourced from the scale:`);
    for (const v of violations) {
        for (const h of v.hits) console.error(`    ${v.rel}:${h.line}  ${h.text}`);
    }
    console.error(`\nUse z('tier') or <Layer tier="…"> (components/ui/zIndex.ts). If this is an intentional`);
    console.error(`shell-local value, add the file to the ALLOWLIST in debug/check-zindex.mjs with a note.`);
    process.exit(1);
}

console.log('\n✓ no new raw z-index ≥ 100 outside the scale');
