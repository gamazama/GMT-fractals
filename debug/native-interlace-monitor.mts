/**
 * Native Interlace Sweep Monitor — live dashboard for native-interlace-sweep.mts.
 *
 * Reads debug/native-interlace-sweep.jsonl (refresh 2s) and serves a dashboard
 * at http://localhost:3345 showing: stats, rate/ETA, failure distribution,
 * recent compile failures, and a thumbnail grid of recent passes.
 *
 * Usage:
 *   Terminal 1:  npx tsx debug/native-interlace-sweep.mts --fresh
 *   Terminal 2:  npx tsx debug/native-interlace-monitor.mts
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

import { registry } from '../engine/FractalRegistry.ts';
import '../formulas/index.ts';   // side-effect: registers native formulas

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] ?? '3345', 10);
const AUTO_OPEN = !process.argv.includes('--no-open');

const JSONL = path.resolve('debug/native-interlace-sweep.jsonl');
const THUMBS = path.resolve('debug/thumbnails/interlace');

// Total pair count = eligible² (Modular + selfContainedSDE excluded, matches sweep)
function eligibleCount(): number {
    return registry.getAll()
        .filter(d => d.id !== 'Modular')
        .filter(d => !d.shader.selfContainedSDE)
        .length;
}
const TOTAL_EST = eligibleCount() * eligibleCount();

// ─── Dashboard HTML ──────────────────────────────────────────────────────────

const DASHBOARD = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Native Interlace Sweep — Monitor</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Consolas', 'Monaco', monospace; background: #0d1117;
           color: #c9d1d9; padding: 16px; font-size: 13px; }
    h1 { color: #58a6ff; font-size: 18px; margin-bottom: 2px; }
    .sub { color: #8b949e; font-size: 11px; margin-bottom: 12px; }
    .stats { display: flex; gap: 20px; margin-bottom: 14px; flex-wrap: wrap; }
    .stat { padding: 6px 10px; background: #161b22; border: 1px solid #30363d; border-radius: 4px; }
    .stat .lbl { color: #8b949e; font-size: 10px; text-transform: uppercase; }
    .stat .val { font-size: 18px; font-weight: 600; }
    .pass { color: #3fb950; } .fail { color: #f85149; }
    .skip { color: #8b949e; } .warn { color: #d29922; } .info { color: #58a6ff; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .panel { background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
             padding: 12px; overflow: hidden; }
    .panel h2 { font-size: 13px; color: #c9d1d9; margin-bottom: 8px;
                border-bottom: 1px solid #30363d; padding-bottom: 4px; }
    .fail-row { display: flex; gap: 8px; align-items: flex-start; padding: 4px 0;
                border-bottom: 1px solid #21262d; font-size: 11px; }
    .fail-row .name { color: #c9d1d9; min-width: 260px; overflow: hidden;
                      text-overflow: ellipsis; white-space: nowrap; }
    .fail-row .gate { color: #f85149; min-width: 100px; font-size: 10px; }
    .fail-row .msg { color: #8b949e; flex: 1; font-size: 11px; overflow: hidden;
                     text-overflow: ellipsis; white-space: nowrap; }
    .gate-table td { padding: 2px 8px; font-size: 11px; }
    .gate-table td.num { text-align: right; color: #f85149; font-weight: 600; }
    .thumbs { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
    .thumb { position: relative; }
    .thumb img { width: 100%; image-rendering: pixelated; border-radius: 2px;
                 border: 1px solid #30363d; display: block; }
    .thumb .t-name { position: absolute; bottom: 0; left: 0; right: 0; font-size: 8px;
                     color: #c9d1d9; background: rgba(0,0,0,0.7); padding: 1px 2px;
                     overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar { height: 3px; background: #21262d; border-radius: 2px; margin-bottom: 10px; overflow: hidden; }
    .bar > div { height: 100%; background: #58a6ff; transition: width 0.5s; }
    .idle { color: #8b949e; font-style: italic; }
    .clock { color: #8b949e; font-size: 10px; }
  </style>
</head>
<body>
<h1>Native × Native Interlace Sweep</h1>
<div class="sub">Tailing debug/native-interlace-sweep.jsonl · refresh 2s · <span class="clock" id="clock"></span></div>

<div class="bar"><div id="bar" style="width:0%"></div></div>
<div class="stats" id="stats"></div>

<div class="row">
  <div class="panel">
    <h2>Failures by first-failing gate</h2>
    <table class="gate-table" id="gate-table"><tbody></tbody></table>
  </div>
  <div class="panel">
    <h2>Recent compile failures</h2>
    <div id="fails"></div>
  </div>
</div>

<div class="panel" style="margin-top:14px">
  <h2>Latest passing thumbnails (primary × secondary)</h2>
  <div class="thumbs" id="thumbs"></div>
</div>

<script>
document.getElementById('clock').textContent = new Date().toLocaleString();

let startProcessed = 0;
let startTime = Date.now();

async function refresh() {
  document.getElementById('clock').textContent = new Date().toLocaleString();
  try {
    const stats = await (await fetch('/stats')).json();
    const total = stats.total;
    const pct = total > 0 ? (stats.processed / total * 100) : 0;
    document.getElementById('bar').style.width = pct + '%';

    const elapsedMs = Date.now() - startTime;
    const throughput = (stats.processed - startProcessed) > 0
      ? (stats.processed - startProcessed) / (elapsedMs / 1000) : 0;
    const remaining = Math.max(0, total - stats.processed);
    const etaSec = throughput > 0 ? remaining / throughput : 0;
    const etaStr = etaSec > 3600 ? (etaSec/3600).toFixed(1)+'h'
                 : etaSec > 60   ? (etaSec/60).toFixed(1)+'m'
                 :                 etaSec.toFixed(0)+'s';
    if (startProcessed === 0 && stats.processed > 0) { startProcessed = stats.processed; startTime = Date.now(); }

    document.getElementById('stats').innerHTML = [
      \`<div class="stat"><div class="lbl">Processed</div><div class="val info">\${stats.processed}/\${total}</div></div>\`,
      \`<div class="stat"><div class="lbl">Compiles</div><div class="val pass">\${stats.pass}</div></div>\`,
      \`<div class="stat"><div class="lbl">Compile-fail</div><div class="val fail">\${stats.fail}</div></div>\`,
      stats.timeouts > 0 ? \`<div class="stat"><div class="lbl">Timeouts</div><div class="val warn">\${stats.timeouts}</div></div>\` : '',
      \`<div class="stat"><div class="lbl">Rate</div><div class="val">\${throughput.toFixed(1)} /s</div></div>\`,
      \`<div class="stat"><div class="lbl">ETA</div><div class="val \${etaSec > 0 ? 'info' : 'skip'}">\${etaSec > 0 ? etaStr : '—'}</div></div>\`,
      \`<div class="stat"><div class="lbl">Elapsed</div><div class="val">\${(elapsedMs/1000).toFixed(0)}s</div></div>\`,
    ].join('');

    const gates = Object.entries(stats.failByGate).sort((a, b) => b[1] - a[1]);
    document.querySelector('#gate-table tbody').innerHTML =
      gates.length === 0
        ? '<tr><td class="idle">no failures yet</td></tr>'
        : gates.map(([g, n]) => \`<tr><td>\${g}</td><td class="num">\${n}</td></tr>\`).join('');

    document.getElementById('fails').innerHTML =
      stats.recentFails.length === 0
        ? '<div class="idle">no recent failures</div>'
        : stats.recentFails.map(f => \`
          <div class="fail-row">
            <div class="name">\${escapeHtml(f.name)}</div>
            <div class="gate">\${escapeHtml(f.failFirstGate || '?')}</div>
            <div class="msg">\${escapeHtml(f.msg || '')}</div>
          </div>\`).join('');

    document.getElementById('thumbs').innerHTML =
      stats.recentPasses.length === 0
        ? '<div class="idle">no passes yet</div>'
        : stats.recentPasses.map(p => \`
          <div class="thumb">
            <img src="/thumbnails/\${encodeURIComponent(p.thumbFile)}?t=\${Date.now()}">
            <div class="t-name">\${escapeHtml(p.name)}</div>
          </div>\`).join('');
  } catch (e) {
    console.error('refresh failed', e);
  }
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

refresh();
setInterval(refresh, 2000);
</script>
</body>
</html>`;

// ─── Stats aggregation ───────────────────────────────────────────────────────

interface StatsSnapshot {
    processed: number;
    total: number;
    pass: number;
    renderWarn: number;
    fail: number;
    timeouts: number;
    failByGate: Record<string, number>;
    recentFails: Array<{ name: string; failFirstGate: string; msg: string }>;
    recentPasses: Array<{ name: string; thumbFile: string }>;
}

function readStats(): StatsSnapshot {
    const result: StatsSnapshot = {
        processed: 0, total: TOTAL_EST,
        pass: 0, renderWarn: 0, fail: 0, timeouts: 0,
        failByGate: {}, recentFails: [], recentPasses: [],
    };
    if (!fs.existsSync(JSONL)) return result;

    const lines = fs.readFileSync(JSONL, 'utf8').split('\n').filter(Boolean);

    const fails: Array<{ name: string; failFirstGate: string; msg: string; idx: number }> = [];
    const passes: Array<{ name: string; thumbFile: string; idx: number }> = [];

    for (let i = 0; i < lines.length; i++) {
        let row: any;
        try { row = JSON.parse(lines[i]); } catch { continue; }
        result.processed++;

        const label = `${row.primary} × ${row.secondary}`;

        if (row.overall === 'pass') {
            result.pass++;
            if (row.thumbnail) passes.push({ name: label, thumbFile: path.basename(row.thumbnail), idx: i });
        } else if (row.overall === 'fail') {
            result.fail++;
            const gate = row.failFirstGate || 'unknown';
            result.failByGate[gate] = (result.failByGate[gate] || 0) + 1;
            if (gate === 'timeout') result.timeouts++;
            const msg = row.webglCompile?.error
                || row.renderNonDegenerate?.reason
                || (gate && row[gate]?.error)
                || (gate && row[gate]?.reason)
                || '';
            fails.push({ name: label, failFirstGate: gate, msg: String(msg).split('\n')[0].slice(0, 160), idx: i });
        }
    }

    result.recentPasses = passes.slice(-40).reverse().map(({ name, thumbFile }) => ({ name, thumbFile }));
    result.recentFails  = fails.slice(-20).reverse().map(({ name, failFirstGate, msg }) => ({ name, failFirstGate, msg }));
    return result;
}

// ─── HTTP server ─────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
    const url = req.url || '/';
    try {
        if (url === '/' || url.startsWith('/?')) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(DASHBOARD);
            return;
        }
        if (url === '/stats') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(readStats()));
            return;
        }
        if (url.startsWith('/thumbnails/')) {
            const file = decodeURIComponent(url.slice('/thumbnails/'.length).split('?')[0]);
            if (!/^[a-f0-9]+\.png$/i.test(file)) { res.writeHead(400); res.end('bad name'); return; }
            const p = path.join(THUMBS, file);
            if (!fs.existsSync(p)) { res.writeHead(404); res.end(''); return; }
            res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
            res.end(fs.readFileSync(p));
            return;
        }
        res.writeHead(404); res.end('');
    } catch (e: any) {
        res.writeHead(500); res.end(String(e?.message ?? e));
    }
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}/`;
    console.log(`\n  Native Interlace Sweep Monitor`);
    console.log(`  Dashboard: \x1b[36m${url}\x1b[0m`);
    console.log(`  Tailing:   ${JSONL}`);
    console.log(`  Thumbs:    ${THUMBS}`);
    console.log(`  Total est: ${TOTAL_EST} pairs (${eligibleCount()}² eligible formulas)`);
    console.log(`  Refresh:   2s   Ctrl+C to stop\n`);

    if (AUTO_OPEN) {
        import('child_process').then(({ exec }) => {
            if (process.platform === 'win32') exec(`start ${url}`);
            else if (process.platform === 'darwin') exec(`open ${url}`);
            else exec(`xdg-open ${url}`);
        });
    }
});
