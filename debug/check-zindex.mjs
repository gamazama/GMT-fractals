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
 * COMMENT LINES ARE NOT USAGES (2026-07-29 guard sweep). Lines whose first
 * non-space characters are `*` or `//` are skipped at the match site. This was a
 * correctness fix, not a convenience: `components/ui/zIndex.ts` and
 * `components/ui/Layer.tsx` quote `z-[9999]` in their JSDoc to say what NOT to
 * write, and the only way to stop that nagging had been to ALLOWLIST both files
 * wholesale — which made the ratchet blind in the worst possible place.
 * Falsified: a hardcoded `zIndex: 9999` planted on `Layer.tsx`'s portal div (so
 * every `<Layer>` renders at 9999 regardless of tier, defeating the entire tier
 * table) passed this check, `npm run test:zindex`, AND `npm run typecheck` — all
 * three green. After the fix the same plant fails here with
 * `components/ui/Layer.tsx:70  zIndex: 9999`, while the JSDoc mention on line 14
 * stays correctly silent. Filtering on the line's leading characters cannot
 * create a false NEGATIVE: real code does not begin a line with `*` or `//`, and
 * a trailing comment leaves the line's start untouched.
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
    // NOTE: components/ui/zIndex.ts and components/ui/Layer.tsx used to sit here
    // ("doc text references the literal — not real usages"). They are gone
    // deliberately — comment lines are now filtered at the match site instead, so
    // the two files that DEFINE the scale are checked like everything else.
    // Allowlisting them wholesale meant a real `zIndex: 9999` in Layer.tsx passed.
    // (a) shell-local chrome (value is local to its own trap)
    'App.tsx',
    'app-gmt/LoadingScreen.tsx',
    'components/LoadingScreen.tsx',
    'components/MobileControls.tsx',
    'components/Timeline.tsx',
    'components/layout/DropZones.tsx',
    'engine/components/ToastHost.tsx',
    'engine/components/StateLibraryToast.tsx',
    'engine/plugins/TopBar.tsx',
    'engine-gmt/components/FirstRunHint.tsx',
    // A DIAGNOSTIC that must outrank the scale. The \?diag boot trace exists to be readable
    // when the app is broken — including when a surface it does not know about is covering the
    // screen — so it sits above every tier on purpose, and routing it through z('tier') would
    // make it obey the thing it is there to diagnose. It renders only behind \?diag.
    'gradient-explorer/v2/bootTrace.ts',
    // (b) ⌛ portal backlog — migrate to z('tier') / <Layer>
    'engine-gmt/topbar/CenterHUD.tsx',                       // hover-bridge zIndex:9990 → contextMenu
    'engine-gmt/components/FormulaPicker/FormulaPicker.tsx', // popover/thumb 9999/10000 → popover/tooltip
]);

const Z_TAILWIND = /\bz-\[(\d+)\]/g;
const Z_INLINE = /zIndex:\s*(\d+)\b/g;
const Z_PROP = /zIndex=\{(\d+)\}/g;
// The `, document.body)` tail of a createPortal call. The optional `,?` matches
// the multi-line/trailing-comma form (`document.body,\n)`) — without it the
// detector silently missed roughly half the body portals in the tree
// (engine/plugins/Help.tsx, the gallery overlays, the gradient-explorer layers …).
const PORTAL_BODY = /,\s*document\.body\s*,?\s*\)/;

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

    const srcLines = src.split('\n');
    const hits = [];
    for (const re of [Z_TAILWIND, Z_INLINE, Z_PROP]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(src))) {
            if (Number(m[1]) >= 100) {
                const line = src.slice(0, m.index).split('\n').length;
                // Prose, not a usage. JSDoc continuation lines (`*`) and line
                // comments (`//`) both quote `z-[9999]` when explaining what NOT
                // to write. Before this, the only way to stop those two files
                // nagging was to allowlist them WHOLESALE — and that made the
                // check blind in exactly the worst place: a real hardcoded
                // `zIndex: 9999` in Layer.tsx, the portal primitive every tier
                // resolves through, passed silently (so did test:zindex and
                // typecheck). Matching on the line's leading characters cannot
                // cause a false NEGATIVE on real code: a code line does not
                // start with `*` or `//`, and a trailing comment on a code line
                // leaves the line's start untouched, so it still gets checked.
                if (/^\s*(\*|\/\/)/.test(srcLines[line - 1] ?? '')) continue;
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
