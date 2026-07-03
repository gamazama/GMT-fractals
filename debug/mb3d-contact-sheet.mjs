// Build a visual contact sheet of the MB3D scene imports for geometry review.
// THREE-WAY compare per scene: MB3D original (output/*.jpg) | GMT OLD render
// (cert/gmt-old/*.png) | GMT NEW render (cert/gmt/*.png), paired by normalized
// name. The OLD column is a snapshot of the previous cert pass (e.g. taken before
// a kernel change like the MB3D-faithful marcher, ADR-0088); if cert/gmt-old is
// absent the sheet falls back to a 2-column orig|new layout. Per-scene "mark
// WRONG" + notes persist in localStorage and export to a paste-back list.
//
// Flow:
//   1. (optional) snapshot the current renders as the baseline:
//        cp -r H:/GMT/refSoftware/MB3D/cert/gmt  H:/GMT/refSoftware/MB3D/cert/gmt-old
//   2. npx tsx debug/cert-render.mts        (GPU — renders all bundled scenes → cert/gmt/*.png)
//   3. node debug/mb3d-contact-sheet.mjs    (CPU — this; writes cert/contact-sheet.html)
//   4. open H:/GMT/refSoftware/MB3D/cert/contact-sheet.html
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'H:/GMT/refSoftware/MB3D';
const GMT = path.join(ROOT, 'cert/gmt');          // NEW renders
const OLD = path.join(ROOT, 'cert/gmt-old');      // OLD renders (snapshot; optional)
const REF = path.join(ROOT, 'output');            // MB3D originals
const OUT = path.join(ROOT, 'cert/contact-sheet.html');

const norm = (s) => s.toLowerCase().replace(/\.(png|jpg|jpeg)$/i, '').replace(/[^a-z0-9]/g, '');

const gmtFiles = fs.existsSync(GMT) ? fs.readdirSync(GMT).filter((f) => f.toLowerCase().endsWith('.png')) : [];
const oldFiles = fs.existsSync(OLD) ? fs.readdirSync(OLD).filter((f) => f.toLowerCase().endsWith('.png')) : [];
const refFiles = fs.existsSync(REF) ? fs.readdirSync(REF).filter((f) => /\.(jpg|jpeg)$/i.test(f)) : [];
const refByNorm = new Map(refFiles.map((f) => [norm(f), f]));
const oldByNorm = new Map(oldFiles.map((f) => [norm(f), f]));
const hasOld = oldFiles.length > 0;

if (gmtFiles.length === 0) {
  console.error(`No GMT renders in ${GMT}. Run:  npx tsx debug/cert-render.mts  first.`);
  process.exit(1);
}

const figure = (src, cap, cls = '') =>
  src
    ? `<figure class="${cls}"><img loading="lazy" src="${src}"><figcaption>${cap}</figcaption></figure>`
    : `<figure class="noref"><div class="placeholder">no ${cap}</div><figcaption>${cap}</figcaption></figure>`;

const cells = gmtFiles.sort((a, b) => a.localeCompare(b)).map((g) => {
  const n = norm(g);
  const ref = refByNorm.get(n);
  const old = oldByNorm.get(n);
  const name = g.replace(/\.png$/i, '').replace(/_+/g, ' ').trim();
  const refFig = figure(ref ? `../output/${encodeURIComponent(ref)}` : null, 'MB3D original');
  const oldFig = hasOld ? figure(old ? `./gmt-old/${encodeURIComponent(old)}` : null, 'GMT old') : '';
  const newFig = figure(`./gmt/${encodeURIComponent(g)}`, 'GMT new (faithful)', 'newcol');
  return `<section class="card" data-scene="${name.replace(/"/g, '&quot;')}">
    <h2>${name}</h2>
    <div class="trio${hasOld ? '' : ' pair'}">
      ${refFig}
      ${oldFig}
      ${newFig}
    </div>
    <label class="flag"><input type="checkbox" class="wrong"> mark WRONG</label>
    <textarea class="note" rows="2" placeholder="what's wrong with this one…"></textarea>
  </section>`;
}).join('\n');

const withRef = gmtFiles.filter((g) => refByNorm.has(norm(g))).length;
const withOld = gmtFiles.filter((g) => oldByNorm.has(norm(g))).length;
const cols = hasOld ? 3 : 2;
const minw = hasOld ? 660 : 440;
const html = `<!doctype html><meta charset="utf-8"><title>MB3D import — geometry review</title>
<style>
  :root { color-scheme: dark; }
  body { background:#111; color:#ddd; font:14px/1.4 system-ui,sans-serif; margin:0; padding:16px; }
  header { position:sticky; top:0; background:#111; padding:8px 0 12px; border-bottom:1px solid #333; margin-bottom:16px; z-index:2; }
  h1 { font-size:18px; margin:0 0 4px; }
  .bar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:6px; }
  button { background:#2a2a2a; color:#ddd; border:1px solid #444; border-radius:5px; padding:6px 12px; cursor:pointer; font:inherit; }
  button:hover { background:#333; }
  #count { color:#e88; font-weight:600; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(${minw}px,1fr)); gap:18px; }
  .card { background:#1a1a1a; border:1px solid #2c2c2c; border-radius:8px; padding:10px; }
  .card.flagged { outline:2px solid #e44; }
  .card h2 { font-size:14px; margin:0 0 8px; color:#fff; font-weight:600; }
  .trio { display:grid; grid-template-columns:repeat(${cols},1fr); gap:8px; }
  .trio.pair { grid-template-columns:1fr 1fr; }
  figure { margin:0; }
  figure img { width:100%; height:auto; display:block; background:#000; border-radius:4px; aspect-ratio:1; object-fit:contain; }
  figure.newcol img { outline:2px solid #2a6; }
  figcaption { font-size:11px; color:#888; text-align:center; padding-top:3px; }
  figure.newcol figcaption { color:#6c9; font-weight:600; }
  .noref .placeholder { aspect-ratio:1; display:flex; align-items:center; justify-content:center; text-align:center; color:#666; background:#161616; border:1px dashed #333; border-radius:4px; }
  .flag { display:inline-block; margin-top:8px; font-size:12px; color:#e88; cursor:pointer; user-select:none; }
  .flag input { vertical-align:middle; }
  .note { display:block; width:100%; margin-top:8px; box-sizing:border-box; background:#141414; color:#ddd; border:1px solid #333; border-radius:5px; padding:6px; font:13px/1.4 inherit; resize:vertical; }
  .note:focus { outline:1px solid #5a7; border-color:#5a7; }
  #export { position:fixed; inset:auto 0 0 0; background:#161616; border-top:1px solid #444; padding:12px; display:none; z-index:3; }
  #export textarea { width:100%; height:160px; box-sizing:border-box; background:#0d0d0d; color:#9d9; border:1px solid #333; border-radius:5px; padding:8px; font:13px/1.5 ui-monospace,monospace; }
</style>
<header>
  <h1>MB3D import — geometry review${hasOld ? ' · 3-way (orig / old / faithful)' : ''}</h1>
  <div>${gmtFiles.length} scenes · ${withRef} with MB3D original${hasOld ? ` · ${withOld} with an old render` : ''}. The <b style="color:#6c9">green-outlined</b> column is the new MB3D-faithful marcher (ADR-0088). Colour differs by design — judge GEOMETRY. Tick "mark WRONG" + note what regressed vs the old render or differs from the MB3D original. Notes auto-save.</div>
  <div class="bar">
    <button id="exportBtn">Export wrong-list →</button>
    <span id="count">0 flagged</span>
    <button id="clearBtn" title="clear all flags + notes">clear all</button>
  </div>
</header>
<div class="grid">
${cells}
</div>
<div id="export"><textarea readonly placeholder="nothing flagged yet"></textarea><div style="margin-top:6px;color:#888;font-size:12px">copied to clipboard — paste this back to Claude</div></div>
<script>
  const KEY = 'mb3d-review';
  const store = JSON.parse(localStorage.getItem(KEY) || '{}');
  const cards = [...document.querySelectorAll('.card')];

  function save() { localStorage.setItem(KEY, JSON.stringify(store)); refreshCount(); }
  function refreshCount() {
    const n = Object.values(store).filter((s) => s && (s.wrong || (s.note||'').trim())).length;
    document.getElementById('count').textContent = n + ' flagged';
  }

  cards.forEach((card) => {
    const scene = card.dataset.scene;
    const cb = card.querySelector('.wrong');
    const note = card.querySelector('.note');
    const st = store[scene] || (store[scene] = { wrong: false, note: '' });
    cb.checked = st.wrong; note.value = st.note || '';
    card.classList.toggle('flagged', st.wrong || !!(st.note||'').trim());
    const sync = () => { st.wrong = cb.checked; st.note = note.value;
      card.classList.toggle('flagged', st.wrong || !!st.note.trim()); save(); };
    cb.addEventListener('change', sync);
    note.addEventListener('input', sync);
  });
  refreshCount();

  document.getElementById('exportBtn').addEventListener('click', async () => {
    const lines = cards.map((c) => c.dataset.scene)
      .map((scene) => ({ scene, ...(store[scene] || {}) }))
      .filter((s) => s.wrong || (s.note || '').trim())
      .map((s) => '- ' + s.scene + (s.note && s.note.trim() ? ': ' + s.note.trim() : ' (marked wrong, no note)'));
    const text = lines.length ? 'WRONG / issues:\\n' + lines.join('\\n') : '(nothing flagged)';
    const box = document.querySelector('#export'); const ta = box.querySelector('textarea');
    ta.value = text; box.style.display = 'block';
    try { await navigator.clipboard.writeText(text); } catch (e) {}
    ta.select();
  });
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!confirm('Clear all flags + notes?')) return;
    localStorage.removeItem(KEY); location.reload();
  });
</script>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`wrote ${OUT}`);
console.log(`  ${gmtFiles.length} GMT new renders · ${withRef} paired with an MB3D original · ${hasOld ? withOld + ' with an old render (3-way)' : 'no gmt-old snapshot (2-way orig|new)'}.`);
const noRef = gmtFiles.filter((g) => !refByNorm.has(norm(g))).map((g) => g.replace(/\.png$/i, ''));
if (noRef.length) console.log(`  no MB3D original for (${noRef.length}): ${noRef.join(', ')}`);
