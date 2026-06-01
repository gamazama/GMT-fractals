/**
 * frag-report.mts — triage report for the frag gallery render run.
 *
 * Classifies every catalog-renderable formula into:
 *   works     — rendered with content at the default camera (not flagged flat)
 *   needsLight — was flat at default, RECOVERED via camera-headlight + z-offset retry
 *   flat       — flat at default AND still flat after retry (needs manual fix work)
 *   failed     — never produced a PNG (build/compile/timeout error)
 *
 * Inputs (produced by the gallery + retry passes):
 *   public/formulas/v3-v4-catalog.json
 *   debug/scratch/frag-gallery/_singlecolor/_flagged.json
 *   debug/scratch/frag-gallery/_singlecolor/_retry_status.json
 *   build logs (for failures): debug/scratch/frag-gallery/_logs/frag_gallery_full.log, frag_dec_full.log
 *
 * Outputs into <dir>/_report/:
 *   report.json         — machine-readable buckets
 *   report.md           — human summary
 *   fix-queue.html      — the "flat" + "failed" formulas with thumbnails, for the
 *                         dedicated fix session (links original + best-retry images)
 *   needs-light.html    — the recovered ones (before/after: orig vs headlight)
 *
 * Usage: npx tsx debug/frag-report.mts [--dir=debug/scratch/frag-gallery]
 */
import * as fs from 'fs';
import * as path from 'path';

function arg(flag: string, def?: string) {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const DIR     = arg('--dir', 'debug/scratch/frag-gallery')!;
const ROOT    = 'h:/GMT/workspace-gmt/dev';
const LEVELS  = arg('--levels', 'debug/scratch/frag-gallery-levels')!;
const SC      = path.join(DIR, '_singlecolor');
const OUT     = path.join(DIR, '_report');
const THRESH  = parseFloat(arg('--threshold', '6')!);
const LOGS    = [path.join(DIR, '_logs/frag_gallery_full.log'), path.join(DIR, '_logs/frag_dec_full.log')];

function safeName(id: string) { return id.replace(/[^a-zA-Z0-9_.-]/g, '_'); }

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/formulas/v3-v4-catalog.json'), 'utf8'));
const renderable: string[] = Object.keys(catalog.byId).filter(i => catalog.byId[i].recommended !== 'none');
const flagged: string[] = JSON.parse(fs.readFileSync(path.join(SC, '_flagged.json'), 'utf8'));
const retry: any[] = JSON.parse(fs.readFileSync(path.join(SC, '_retry_status.json'), 'utf8'));
const retryById: Record<string, any> = {}; for (const r of retry) retryById[r.id] = r;

// Parse build failures from logs: lines like "[n/m] FAIL <id> (pipeline)  <error>"
const failed: { id: string; error: string }[] = [];
for (const lg of LOGS) {
    if (!fs.existsSync(lg)) continue;
    for (const line of fs.readFileSync(lg, 'utf8').split('\n')) {
        const m = line.match(/\]\s+FAIL\s+(.+?)\s+\((v3|v4)\)\s*(.*)$/);
        if (m) failed.push({ id: m[1], error: (m[3] || '').trim().slice(0, 160) });
    }
}
const failedIds = new Set(failed.map(f => f.id));

const flaggedSet = new Set(flagged);
const works: string[] = [], needsLight: any[] = [], flat: any[] = [];

for (const id of renderable) {
    if (failedIds.has(id)) continue;               // counted as failed
    if (!flaggedSet.has(id)) { works.push(id); continue; }
    const r = retryById[id];
    if (r && r.ok && typeof r.mean === 'number' && r.mean >= THRESH) {
        needsLight.push({ id, bestDist: r.bestDist, mean: r.mean });
    } else {
        flat.push({ id, retryMean: r?.mean ?? null });
    }
}

fs.mkdirSync(OUT, { recursive: true });

const report = {
    generated: new Date().toISOString().slice(0, 10),
    totals: {
        renderable: renderable.length,
        works: works.length,
        needsLight: needsLight.length,
        flat: flat.length,
        failed: failed.length,
    },
    works, needsLight, flat, failed,
};
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

// ── report.md ──
const md = `# Frag Gallery — Triage Report (${report.generated})

Catalog-renderable formulas: **${renderable.length}**

| Bucket | Count | Meaning |
|---|---:|---|
| ✅ Works out-of-box | ${works.length} | Rendered with content at the formula's default camera |
| 💡 Needs offset/light | ${needsLight.length} | Was flat by default; **recovered** via camera-headlight + z-offset retry |
| ⬛ Flat (needs fix work) | ${flat.length} | Flat by default AND still flat after retry — queued for fix session |
| ✗ Build failed | ${failed.length} | Never produced a PNG (compile/build/timeout) |

## ⬛ Flat — needs manual fix (${flat.length})
${flat.map(f => `- \`${f.id}\`${f.retryMean != null ? ` (best retry mean ${f.retryMean})` : ''}`).join('\n')}

## ✗ Build failed (${failed.length})
${failed.map(f => `- \`${f.id}\` — ${f.error}`).join('\n')}

## 💡 Needs offset/light — recovered (${needsLight.length})
${needsLight.map(f => `- \`${f.id}\` (bestDist ${f.bestDist}, mean ${f.mean})`).join('\n')}
`;
fs.writeFileSync(path.join(OUT, 'report.md'), md);

// ── HTML helpers: embed thumbnails as relative links to the gallery dirs ──
function imgTag(absPath: string, label: string): string {
    if (!fs.existsSync(absPath)) return `<div class=missing>(no image)</div>`;
    const b64 = fs.readFileSync(absPath).toString('base64');
    return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${label}</figcaption></figure>`;
}
const css = `body{background:#0d1117;color:#c9d1d9;font:13px system-ui,monospace;margin:16px}
h1{font-size:18px}.row{display:flex;gap:8px;align-items:flex-start;background:#161b22;padding:8px;margin:6px 0;border-radius:6px}
.row .id{flex:1;word-break:break-all}figure{margin:0;text-align:center}img{width:200px;height:200px;object-fit:contain;background:#000;border:1px solid #30363d}
figcaption{font-size:11px;color:#8b949e}.missing{width:200px;height:200px;display:grid;place-items:center;color:#f85149;border:1px dashed #f85149}`;

// fix-queue.html: flat + failed, with whatever thumbnail exists
const fixRows = [
    ...flat.map(f => {
        const sn = safeName(f.id);
        return `<div class=row><div class=id>⬛ <b>${f.id}</b><br>flat (retry mean ${f.retryMean ?? '—'})</div>
        ${imgTag(path.join(SC, sn + '.orig.png'), 'default render')}
        ${imgTag(path.join(SC, sn + '.png'), 'best headlight retry')}</div>`;
    }),
    ...failed.map(f => `<div class=row><div class=id>✗ <b>${f.id}</b><br>${f.error}</div><div class=missing>build failed</div></div>`),
].join('\n');
fs.writeFileSync(path.join(OUT, 'fix-queue.html'),
    `<!doctype html><meta charset=utf8><title>Frag Fix Queue</title><style>${css}</style>
<h1>Fix Queue — ${flat.length} flat + ${failed.length} failed</h1>
<p>For a dedicated session: each needs a working camera/light/offset or a pipeline fix, then re-run <code>frag-gallery.mts --ids=…</code> and re-check.</p>
${fixRows}`);

// needs-light.html: before/after for the recovered ones
const nlRows = needsLight.map(f => {
    const sn = safeName(f.id);
    return `<div class=row><div class=id>💡 <b>${f.id}</b><br>bestDist ${f.bestDist}, mean ${f.mean}</div>
    ${imgTag(path.join(SC, sn + '.orig.png'), 'default (flat)')}
    ${imgTag(path.join(SC, sn + '.png'), 'headlight + offset')}</div>`;
}).join('\n');
fs.writeFileSync(path.join(OUT, 'needs-light.html'),
    `<!doctype html><meta charset=utf8><title>Recovered via Light/Offset</title><style>${css}</style>
<h1>Recovered with headlight + z-offset — ${needsLight.length}</h1>${nlRows}`);

console.log(`Renderable ${renderable.length}: works=${works.length} needsLight=${needsLight.length} flat=${flat.length} failed=${failed.length}`);
console.log(`wrote ${OUT}/report.json, report.md, fix-queue.html, needs-light.html`);
