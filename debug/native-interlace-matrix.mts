/**
 * Render a pass/fail matrix from native-interlace-sweep.jsonl.
 *
 * Produces debug/native-interlace-matrix.html: primary rows × secondary cols.
 *   Green  = webglCompile + render both passed
 *   Yellow = compiled, render degenerate (advisory)
 *   Red    = webglCompile failed
 *   Grey   = pair missing (not tested yet)
 *
 * Hover a cell for the error / thumbnail reference.
 *
 * Usage:
 *   npx tsx debug/native-interlace-matrix.mts
 *   npx tsx debug/native-interlace-matrix.mts --thumbs    # embed thumbnails
 */

import * as fs from 'fs';
import * as path from 'path';

const IN_JSONL = path.resolve('debug/native-interlace-sweep.jsonl');
const OUT_HTML = path.resolve('debug/native-interlace-matrix.html');
const WITH_THUMBS = process.argv.includes('--thumbs');

interface Row {
    primary: string;
    secondary: string;
    overall: 'pass' | 'fail' | 'skip';
    failFirstGate: string | null;
    webglCompile: { ok: boolean; error?: string } | null;
    renderSigma: number[] | null;
    thumbnail?: string;
    timeMs: number;
}

function main() {
    if (!fs.existsSync(IN_JSONL)) {
        console.error(`${IN_JSONL} not found — run native-interlace-sweep.mts first`);
        process.exit(1);
    }

    const rows: Row[] = fs.readFileSync(IN_JSONL, 'utf8').trim().split('\n')
        .filter(Boolean).map(l => JSON.parse(l));

    const primaries = Array.from(new Set(rows.map(r => r.primary))).sort();
    const secondaries = Array.from(new Set(rows.map(r => r.secondary))).sort();
    const byKey = new Map<string, Row>();
    for (const r of rows) byKey.set(`${r.primary}__x__${r.secondary}`, r);

    let green = 0, red = 0, grey = 0;
    for (const p of primaries) for (const s of secondaries) {
        const r = byKey.get(`${p}__x__${s}`);
        if (!r) { grey++; continue; }
        if (r.overall === 'fail') red++;
        else green++;
    }

    const total = green + red + grey;

    const cellSize = WITH_THUMBS ? 40 : 14;

    let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Native Interlace Matrix</title>
<style>
  body { background:#0d1117; color:#c9d1d9; font-family:Consolas,monospace; font-size:12px; margin:16px; }
  h1 { font-size:15px; margin:0 0 4px; }
  .summary { margin:6px 0 14px; color:#8b949e; }
  .legend { display:inline-flex; gap:12px; margin-bottom:10px; }
  .legend span { display:inline-flex; align-items:center; gap:4px; }
  .sw { display:inline-block; width:12px; height:12px; border:1px solid #30363d; }
  table { border-collapse:collapse; }
  th { font-weight:normal; color:#8b949e; padding:2px 4px; font-size:11px; }
  th.col { writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg);
           height:160px; vertical-align:bottom; white-space:nowrap; }
  th.row { text-align:right; padding-right:6px; }
  td { width:${cellSize}px; height:${cellSize}px; border:1px solid #0d1117; cursor:help; }
  td.pass { background:#26a641; }
  td.warn { background:#d29922; }
  td.fail { background:#da3633; }
  td.none { background:#30363d; }
  td img { display:block; width:${cellSize - 2}px; height:${cellSize - 2}px; object-fit:cover; }
  #detail { position:fixed; right:16px; top:16px; width:380px; padding:10px;
            background:#161b22; border:1px solid #30363d; border-radius:6px;
            font-size:11px; white-space:pre-wrap; display:none; z-index:10; }
</style></head><body>
<h1>Native × Native Interlace Compile Matrix</h1>
<div class="summary">
  ${total} pairs · <b style="color:#26a641">${green} compile ok</b>
  · <b style="color:#da3633">${red} compile fail</b>
  · <b style="color:#8b949e">${grey} not-tested</b>
  · ${primaries.length} primaries × ${secondaries.length} secondaries
</div>
<div class="legend">
  <span><span class="sw" style="background:#26a641"></span>shader compiles</span>
  <span><span class="sw" style="background:#da3633"></span>compile error</span>
  <span><span class="sw" style="background:#30363d"></span>not tested</span>
</div>
<div id="detail"></div>
<table><thead><tr><th></th>`;
    for (const s of secondaries) html += `<th class="col">${s}</th>`;
    html += `</tr></thead><tbody>`;

    for (const p of primaries) {
        html += `<tr><th class="row">${p}</th>`;
        for (const s of secondaries) {
            const r = byKey.get(`${p}__x__${s}`);
            if (!r) { html += `<td class="none" data-d=""></td>`; continue; }
            const cls = r.overall === 'fail' ? 'fail' : 'pass';
            const err = r.webglCompile?.error || '';
            const gate = r.failFirstGate ? ` [${r.failFirstGate}]` : '';
            const tip = `${p} × ${s}\\n${r.overall}${gate} · ${r.timeMs}ms${err ? '\\n' + err.replace(/\\/g, '/') : ''}`;
            const thumb = (WITH_THUMBS && r.thumbnail)
                ? `<img src="${r.thumbnail}" alt="">` : '';
            html += `<td class="${cls}" data-d="${escapeAttr(tip)}">${thumb}</td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table>
<script>
  const detail = document.getElementById('detail');
  document.querySelectorAll('td[data-d]').forEach(td => {
    td.addEventListener('mouseenter', () => {
      const d = td.getAttribute('data-d');
      if (!d) { detail.style.display = 'none'; return; }
      detail.textContent = d.replace(/\\\\n/g, '\\n');
      detail.style.display = 'block';
    });
    td.addEventListener('mouseleave', () => { detail.style.display = 'none'; });
  });
</script></body></html>`;

    fs.writeFileSync(OUT_HTML, html);
    console.log(`wrote ${OUT_HTML}`);
    console.log(`  ${green} pass · ${yellow} render-warn · ${red} compile-fail · ${grey} not-tested`);
}

function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

main();
