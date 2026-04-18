/**
 * Render a grid-view HTML page from the render-sweep jsonl so you can eyeball
 * all thumbnails at once. Tiles are ordered by formula id; shows compile
 * time + render stats on hover.
 *
 * Usage:
 *   npx tsx debug/render-matrix.mts                # reads render-sweep-phase1.jsonl
 *   npx tsx debug/render-matrix.mts --phase=3      # reads render-sweep-phase3.jsonl
 */

import * as fs from 'fs';
import * as path from 'path';

const PHASE = process.argv.find(a => a.startsWith('--phase='))?.split('=')[1] ?? '1';
const IN_JSONL = path.resolve(`debug/render-sweep-phase${PHASE}.jsonl`);
const OUT_HTML = path.resolve(`debug/render-matrix-phase${PHASE}.html`);

interface Row {
    id: string;
    formula: string;
    mode?: string;
    axis?: string;
    axisValue?: string;
    ok: boolean;
    error?: string;
    compile: { totalMs: number; logPreviewMs?: number; logGpuMs?: number };
    frames?: {
        warmupCount: number; measuredCount: number;
        frameMsP50: number; frameMsP95: number;
        samplesPerSec: number;
    };
    render: { sigma: [number, number, number]; nanFraction: number; nonBlackFraction: number };
    thumbnail?: string;
    timeMs: number;
}

function main() {
    if (!fs.existsSync(IN_JSONL)) {
        console.error(`${IN_JSONL} not found — run render-sweep first`);
        process.exit(1);
    }
    const rows: Row[] = fs.readFileSync(IN_JSONL, 'utf8').trim().split('\n')
        .filter(Boolean).map(l => JSON.parse(l));

    rows.sort((a, b) => a.id.localeCompare(b.id));

    let pass = 0, fail = 0;
    for (const r of rows) r.ok ? pass++ : fail++;

    const cardsHtml = rows.map(r => {
        const cls = r.ok ? 'ok' : 'fail';
        // HTML lives in debug/, thumbnails are at debug/thumbnails/... so the
        // jsonl path (already relative to debug/) works as-is.
        const thumbSrc = r.thumbnail ?? '';
        const compileStr = `${r.compile.totalMs}ms`;
        const renderStr = r.render
            ? `σ [${r.render.sigma.join(',')}], ${(100 * r.render.nonBlackFraction).toFixed(0)}% nb`
            : '';
        const perfStr = r.frames
            ? `${r.frames.samplesPerSec}spl/s · p50=${r.frames.frameMsP50}ms`
            : '';
        const err = r.error ? `<div class="err">${escapeHtml(r.error)}</div>` : '';
        return `
    <div class="card ${cls}">
        <div class="thumb">${thumbSrc ? `<img src="${thumbSrc}" alt="">` : '<div class="noimg">—</div>'}</div>
        <div class="meta">
            <div class="id">${escapeHtml(r.id)}</div>
            <div class="stat">compile: ${compileStr}</div>
            ${renderStr ? `<div class="stat">${renderStr}</div>` : ''}
            ${perfStr ? `<div class="stat">${perfStr}</div>` : ''}
            ${err}
        </div>
    </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Render Sweep Phase ${PHASE}</title>
<style>
body { background:#0d1117; color:#c9d1d9; font-family:Consolas,monospace; font-size:12px; margin:16px; }
h1 { font-size:15px; margin:0 0 4px; }
.summary { margin:6px 0 14px; color:#8b949e; }
.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px; }
.card { background:#161b22; border:1px solid #30363d; border-radius:6px; overflow:hidden; display:flex; flex-direction:column; }
.card.fail { border-color:#da3633; }
.thumb { background:#000; aspect-ratio:1; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.thumb img { width:100%; height:100%; object-fit:contain; image-rendering:pixelated; }
.noimg { color:#8b949e; font-size:24px; }
.meta { padding:6px 8px; font-size:11px; }
.id { color:#c9d1d9; font-weight:600; word-break:break-all; }
.stat { color:#8b949e; margin-top:2px; }
.err { color:#f85149; margin-top:4px; font-size:10px; word-break:break-word; }
</style></head><body>
<h1>Render Sweep Phase ${PHASE}</h1>
<div class="summary">
  ${rows.length} cases ·
  <b style="color:#3fb950">${pass} pass</b> ·
  <b style="color:#f85149">${fail} fail</b>
</div>
<div class="grid">${cardsHtml}</div>
</body></html>`;

    fs.writeFileSync(OUT_HTML, html);
    console.log(`wrote ${OUT_HTML} (${rows.length} cases, ${pass} pass / ${fail} fail)`);
}

function escapeHtml(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

main();
