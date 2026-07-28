#!/usr/bin/env node
/**
 * Overnight audit dashboard generator.
 *
 * Reads plans/overnight-audit/{state,worklist}.json + results/*.json and emits a
 * self-contained HTML page. Run at the end of every cycle; the orchestrator then
 * republishes the same file path via the Artifact tool so the URL stays stable.
 *
 * Usage: node plans/overnight-audit/scripts/build-dashboard.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f, fallback) => {
  try { return JSON.parse(readFileSync(join(ROOT, f), 'utf8')); } catch { return fallback; }
};

const state = read('state.json', {});
const worklist = read('worklist.json', []);

const results = existsSync(join(ROOT, 'results'))
  ? readdirSync(join(ROOT, 'results')).filter((f) => f.endsWith('.json'))
      .map((f) => read(join('results', f), null)).filter(Boolean)
  : [];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const all = results.flatMap((r) => (r.findings || []).map((f) => ({ ...f, subsystem: r.id })));
const byTier = (t) => all.filter((f) => f.tier === t);
const applied = byTier('A'), escalated = byTier('V'), proposed = byTier('B');
// A Tier V finding is only APPLIED if its verifier confirmed it — refuted ones are
// demoted and left in the tree untouched. So the honest "changed the code" count is
// every Tier A plus the confirmed subset of V, not Tier A alone.
const escalatedApplied = escalated.filter((f) => f.commit || f.change);
const changedCount = applied.length + escalatedApplied.length;
const done = worklist.filter((w) => w.status === 'done').length;
const failed = worklist.filter((w) => w.status === 'failed').length;
const pct = worklist.length ? Math.round((done / worklist.length) * 100) : 0;

const guardRuns = results.flatMap((r) => r.guards || []);
const guardsPass = guardRuns.filter((g) => g.pass).length;
const guardsFail = guardRuns.filter((g) => !g.pass);

// Per-cycle finding counts, so the morning read shows how the night actually went
// rather than one flat total.
const cycleCounts = [];
for (const r of results) {
  const c = r.cycle ?? 0;
  cycleCounts[c] = (cycleCounts[c] || 0) + (r.findings || []).length;
}
for (let i = 0; i <= (state.cycle ?? 0); i++) cycleCounts[i] = cycleCounts[i] || 0;
const peak = Math.max(1, ...cycleCounts);
const cycleStrip = cycleCounts.length > 1
  ? `<div class="cycles">${cycleCounts.map((n, i) =>
      `<div class="cyc" title="cycle ${i}: ${n} findings"><i style="height:${Math.round((n / peak) * 100)}%"></i></div>`).join('')}</div>
     <p class="cyc-label">findings per cycle &middot; ${cycleCounts.length} cycles</p>`
  : '';

const sevRank = { high: 0, medium: 1, low: 2 };
const card = (f) => `
  <article class="finding sev-${esc(f.severity || 'low')}">
    <header>
      <span class="badge t${esc(f.tier)}">${esc(f.tier)}</span>
      <span class="sev">${esc(f.severity || 'low')}</span>
      <code>${esc(f.subsystem)}</code>
      ${f.file ? `<code class="file">${esc(f.file)}${f.line ? ':' + f.line : ''}</code>` : ''}
    </header>
    <p class="what">${esc(f.summary)}</p>
    ${f.change ? `<p class="change"><strong>Changed:</strong> ${esc(f.change)}</p>` : ''}
    ${f.verification ? `<p class="verify"><strong>How it was verified:</strong> ${esc(f.verification)}</p>` : ''}
    ${f.guard ? `<p class="guard"><code>${esc(f.guard)}</code> ${f.guardPass ? '<span class="ok">passed</span>' : '<span class="bad">FAILED</span>'}</p>` : ''}
    ${f.commit ? `<p class="commit">commit <code>${esc(f.commit)}</code></p>` : ''}
    ${f.rationale ? `<p class="rationale">${esc(f.rationale)}</p>` : ''}
  </article>`;

const section = (title, note, items) => `
  <section>
    <h2>${esc(title)} <span class="count">${items.length}</span></h2>
    <p class="note">${esc(note)}</p>
    ${items.length
      ? items.sort((a, b) => (sevRank[a.severity] ?? 3) - (sevRank[b.severity] ?? 3)).map(card).join('')
      : '<p class="empty">Nothing in this tier.</p>'}
  </section>`;

const rows = worklist.map((w) => `
  <tr class="s-${esc(w.status)}">
    <td><code>${esc(w.id)}</code></td>
    <td>${esc(w.tier)}</td>
    <td class="area">${esc(w.area)}</td>
    <td class="num">${w.findings || 0}</td>
    <td class="num applied">${w.applied || 0}</td>
    <td class="num esc">${w.escalated || 0}</td>
    <td class="num prop">${w.proposed || 0}</td>
    <td class="st">${esc(w.status)}</td>
  </tr>`).join('');

const html = `<title>GMT overnight audit</title>
<style>
  /* Neutrals carry a slight indigo bias so they sit with the accent rather than
     under it; semantic ok/warn/critical stay independent of the accent hue. */
  :root {
    --bg:#fcfcfd; --fg:#15161c; --dim:#66677a; --line:#e3e3ec; --card:#f6f6fa;
    --ok:#0a7d43; --bad:#bf3125; --warn:#9c5d00; --accent:#4a4fd0;
    --mono:ui-monospace,"Cascadia Code","SF Mono",Consolas,monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#101118; --fg:#e8e8f0; --dim:#9394a8; --line:#272834; --card:#181922;
            --ok:#4ec98a; --bad:#ff8078; --warn:#e0a44a; --accent:#9ea4ff; }
  }
  :root[data-theme="dark"] { --bg:#101118; --fg:#e8e8f0; --dim:#9394a8; --line:#272834; --card:#181922;
            --ok:#4ec98a; --bad:#ff8078; --warn:#e0a44a; --accent:#9ea4ff; }
  :root[data-theme="light"] { --bg:#fcfcfd; --fg:#15161c; --dim:#66677a; --line:#e3e3ec; --card:#f6f6fa;
            --ok:#0a7d43; --bad:#bf3125; --warn:#9c5d00; --accent:#4a4fd0; }
  * { box-sizing:border-box; }
  body { background:var(--bg); color:var(--fg); margin:0; padding:2rem 1.25rem 5rem;
         font:15px/1.55 ui-sans-serif,-apple-system,"Segoe UI",system-ui,sans-serif;
         font-variant-numeric:tabular-nums; }
  :focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  .wrap { max-width:1080px; margin:0 auto; }
  h1 { font-size:1.6rem; margin:0 0 .2rem; letter-spacing:-.02em; }
  .sub { color:var(--dim); margin:0 0 1.75rem; font-size:.9rem; }
  code { font-family:var(--mono); font-size:.85em; }
  h1 code, .sub code { font-size:.9em; }
  .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(136px,1fr)); gap:1px;
           background:var(--line); border:1px solid var(--line); border-radius:4px; overflow:hidden; margin-bottom:1.25rem; }
  .tile { background:var(--card); padding:.8rem .95rem; }
  .tile .v { font-family:var(--mono); font-size:1.55rem; font-weight:600; letter-spacing:-.02em; line-height:1.15; }
  .tile .k { color:var(--dim); font-size:.72rem; text-transform:uppercase; letter-spacing:.07em; margin-top:.25rem; }
  .bar { height:5px; background:var(--line); border-radius:2px; overflow:hidden; margin:0 0 1.5rem; }
  .bar > i { display:block; height:100%; width:${pct}%; background:var(--accent); }
  /* Per-cycle progress through the night — endpoint emphasised, like a sparkline. */
  .cycles { display:flex; align-items:flex-end; gap:3px; height:38px; margin:0 0 1.75rem; }
  .cyc { flex:1; min-width:4px; background:var(--line); border-radius:1px; position:relative; }
  .cyc > i { display:block; width:100%; background:var(--accent); border-radius:1px; opacity:.55; }
  .cyc:last-child > i { opacity:1; }
  .cyc-label { color:var(--dim); font-family:var(--mono); font-size:.7rem; margin:-1.5rem 0 1.5rem; }
  h2 { font-size:1.05rem; margin:2rem 0 .3rem; display:flex; align-items:center; gap:.5rem; }
  h2 .count { background:var(--line); color:var(--dim); border-radius:99px; padding:.05rem .5rem; font-size:.75rem; font-weight:600; }
  .note { color:var(--dim); font-size:.86rem; margin:0 0 .9rem; }
  .empty { color:var(--dim); font-style:italic; font-size:.88rem; }
  /* The stripe is state, not decoration: only severities that want attention get one. */
  .finding { background:var(--card); border:1px solid var(--line); border-radius:4px;
             padding:.75rem .9rem; margin-bottom:.5rem; }
  .finding.sev-high { border-left:3px solid var(--bad); }
  .finding.sev-medium { border-left:3px solid var(--warn); }
  .finding header { display:flex; flex-wrap:wrap; align-items:center; gap:.45rem; margin-bottom:.35rem; }
  .badge { font-family:var(--mono); font-size:.68rem; font-weight:700; border-radius:3px; padding:.1rem .38rem; }
  .badge.tA { background:var(--ok); color:var(--bg); }
  .badge.tV { background:var(--warn); color:var(--bg); }
  .badge.tB { background:var(--accent); color:var(--bg); }
  .sev { font-size:.72rem; color:var(--dim); text-transform:uppercase; letter-spacing:.05em; }
  .file { color:var(--dim); }
  .what { margin:.15rem 0 .35rem; }
  .change,.verify,.guard,.commit,.rationale { margin:.2rem 0; font-size:.87rem; color:var(--dim); }
  .verify { color:var(--fg); }
  .ok { color:var(--ok); font-weight:600; }
  .bad { color:var(--bad); font-weight:600; }
  .scroll { overflow-x:auto; border:1px solid var(--line); border-radius:4px; }
  table { border-collapse:collapse; width:100%; font-size:.85rem; min-width:720px; }
  th,td { text-align:left; padding:.42rem .7rem; border-bottom:1px solid var(--line); }
  th { color:var(--dim); font-weight:600; font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; }
  tr:last-child td { border-bottom:0; }
  .num { text-align:right; font-family:var(--mono); }
  .applied { color:var(--ok); } .esc { color:var(--warn); } .prop { color:var(--accent); }
  .area { color:var(--dim); }
  .st { font-size:.78rem; }
  tr.s-done .st { color:var(--ok); } tr.s-failed .st { color:var(--bad); } tr.s-pending .st { color:var(--dim); }
  footer { margin-top:3rem; color:var(--dim); font-size:.8rem; border-top:1px solid var(--line); padding-top:1rem; }
</style>
<div class="wrap">
  <h1>GMT overnight audit</h1>
  <p class="sub">${state.stopped
      ? `Complete &middot; ${state.cycle ?? 0} cycles`
      : `Running &middot; cycle ${state.cycle ?? 0} of ${state.maxCycles ?? '—'}`
    } &middot; branch <code>${esc(state.branch || 'n/a')}</code> &middot; ${esc(state.lastDashboard || 'now')}</p>
  ${state.stopped && state.stoppedReason
      ? `<p class="note" style="margin-top:-.4rem">${esc(state.stoppedReason)}</p>` : ''}

  <div class="tiles">
    <div class="tile"><div class="v">${done}/${worklist.length}</div><div class="k">subsystems audited</div></div>
    <div class="tile"><div class="v">${all.length}</div><div class="k">findings</div></div>
    <div class="tile"><div class="v" style="color:var(--ok)">${changedCount}</div><div class="k">changes applied<br><span style="font-size:.85em;opacity:.75">${applied.length} self-verified &middot; ${escalatedApplied.length} verifier-confirmed</span></div></div>
    <div class="tile"><div class="v" style="color:var(--warn)">${escalated.length}</div><div class="k">sent to a verifier</div></div>
    <div class="tile"><div class="v" style="color:var(--accent)">${proposed.length}</div><div class="k">awaiting you</div></div>
    <div class="tile"><div class="v">${guardsPass}<span style="font-size:.6em;color:var(--dim)">/${guardRuns.length}</span></div><div class="k">guards passing</div></div>
  </div>
  <div class="bar"><i></i></div>
  ${cycleStrip}

  ${guardsFail.length ? `<section><h2>Guards failing <span class="count">${guardsFail.length}</span></h2>
    <p class="note">Run these yourself before trusting anything downstream of them.</p>
    ${guardsFail.map((g) => `<article class="finding sev-high"><header><code>${esc(g.script)}</code><span class="sev">${esc(g.subsystem || '')}</span></header><p class="what">${esc(g.error || 'failed')}</p></article>`).join('')}
  </section>` : ''}

  ${section('Applied — self-verified', 'Changed and confirmed green by an existing guard script. Each names the guard that proves it.', applied)}
  ${section('Applied — orchestrator-verified', 'No existing test covered these, so a second independent agent re-derived the claim before the change was allowed through. Each names how it was checked.', escalated)}
  ${section('Awaiting your judgement', 'Not applied. These need a human call — design intent, product behaviour, or a tradeoff the run should not make alone.', proposed)}

  <h2>Subsystems</h2>
  <div class="scroll"><table>
    <thead><tr><th>id</th><th>tier</th><th>area</th><th class="num">found</th><th class="num">applied</th><th class="num">checked</th><th class="num">queued</th><th>status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>

  <footer>
    ${failed ? `<strong style="color:var(--bad)">${failed} subsystem(s) errored.</strong> ` : ''}
    Branch <code>${esc(state.branch || '')}</code> — nothing was pushed and <code>main</code> was not touched.
    Review with <code>git log --oneline main..${esc(state.branch || 'HEAD')}</code>, then cherry-pick or merge.
    Tier B items are in <code>plans/overnight-audit/PROPOSALS.md</code>.
  </footer>
</div>`;

writeFileSync(join(ROOT, 'dashboard.html'), html);
console.log(`dashboard: ${done}/${worklist.length} subsystems, ${all.length} findings ` +
  `(${applied.length} applied, ${escalated.length} checked, ${proposed.length} queued), ` +
  `${guardsPass}/${guardRuns.length} guards green`);
