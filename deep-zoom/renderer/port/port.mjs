#!/usr/bin/env node
/**
 * deep-zoom/renderer/port/port.mjs — the PROVENANCE of deep-zoom/renderer/core.js.
 *
 * PURPOSE
 *   core.js is the standalone Mandelbulb perturbation deep-zoom page (repo `mandelbulb_deepzoom`,
 *   file index.html, commit 3b65946) turned into a module by this script and by nothing else.
 *   The script reads the page AT THE PINNED COMMIT straight out of git (never the working copy),
 *   takes the body of its one inline script and the body markup that script looks up, applies the
 *   short list of named transforms below, and writes core.js. Each transform states how many
 *   places it must change and the script fails if the count is different. Every string literal
 *   that carries GLSL is hashed before and after; any difference fails the run.
 *
 *   node deep-zoom/renderer/port/port.mjs           write core.js
 *   node deep-zoom/renderer/port/port.mjs --check   regenerate in memory and compare with core.js
 *                                                   (line endings ignored: git may renormalise them)
 *   DZ_SOURCE_REPO=<path>                           where the mandelbulb_deepzoom repo is checked out
 *
 * SEAM
 *   Input:  `git -C <repo> show 3b65946:index.html` (sha-256 pinned below).
 *   Output: ../core.js. From 2026-10-07 core.js is the source that gets edited; this script stays
 *   as the record of how the first version was made and as the way to prove a given core.js is
 *   still "the page plus these transforms" (run --check before the first hand edit, not after).
 *
 * PITFALLS
 *   - The page is frozen. Do not point this at a newer commit to "pick up a fix": change core.js.
 *   - The page has CRLF line endings and so does the generated file. JavaScript reads CRLF inside
 *     a template literal as LF, so the shader text the GPU compiler receives does not depend on it.
 *   - A module is strict-mode code and the page's script was not. The script therefore type-checks
 *     its own output for undeclared names (an assignment to one is silent in a page and throws in
 *     a module) and fails if it finds any.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'core.js');
const SOURCE_REPO = process.env.DZ_SOURCE_REPO || 'H:/GMT/workspace-gmt/mandelbulb_deepzoom';
const SOURCE_COMMIT = '3b65946';
const SOURCE_FILE = 'index.html';
const SOURCE_SHA256 = 'f3ac89fa3bf073acb93686831652a41ff4079970ca96324ba86b8bc1d66804cd';
const PORT_DATE = '2026-10-07';
const CHECK = process.argv.includes('--check');

const fail = (msg) => { console.error('PORT FAILED: ' + msg); process.exit(1); };
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const countOf = (hay, needle) => hay.split(needle).length - 1;

/* ── 1. the pinned page ─────────────────────────────────────────────────────────────────────── */
let htmlBuf;
try {
  htmlBuf = execFileSync('git', ['-C', SOURCE_REPO, 'show', `${SOURCE_COMMIT}:${SOURCE_FILE}`], { maxBuffer: 64 * 1024 * 1024 });
} catch (e) { fail(`cannot read ${SOURCE_COMMIT}:${SOURCE_FILE} from ${SOURCE_REPO} (${String(e.message).split('\n')[0]})`); }
const gotSha = createHash('sha256').update(htmlBuf).digest('hex');
if (gotSha !== SOURCE_SHA256) fail(`the pinned page hashes to ${gotSha}, expected ${SOURCE_SHA256}`);
const html = htmlBuf.toString('utf8');
const EOL = html.includes('\r\n') ? '\r\n' : '\n';

if (countOf(html, '<script>') !== 1 || countOf(html, '</script>') !== 1) fail('expected exactly one inline <script> in the page');
const CANVAS_TAG = '<canvas id="gl"></canvas>' + EOL;
if (countOf(html, CANVAS_TAG) !== 1) fail('expected exactly one <canvas id="gl"> line');
const scriptOpen = html.indexOf('<script>') + '<script>'.length + EOL.length;
const scriptClose = html.indexOf('</script>');
const pageScript = html.slice(scriptOpen, scriptClose);
const markup = html.slice(html.indexOf(CANVAS_TAG) + CANVAS_TAG.length, html.indexOf('<script>'));

/* ── 2. literals: every string or template literal, in source order, with the name it is bound to ─ */
const GLSL_NAMES = ['KERNEL_CORE', 'VERT', 'FRAG', 'DEEP_FRAG', 'SHADE_FRAG', 'GUIDE_FRAG'];
const GLSL_MARK = /#version|#define|#extension|\bprecision\s+(?:high|medium|low)p\b|\bvoid\s+main\s*\(|\buniform\s+\w+\s+\w+|\bgl_FragCoord\b|\bvec[234]\s*\(/;
function parse(text) {
  const sf = ts.createSourceFile('core.js', text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  if (sf.parseDiagnostics && sf.parseDiagnostics.length) {
    const d = sf.parseDiagnostics[0];
    fail('does not parse: ' + ts.flattenDiagnosticMessageText(d.messageText, ' ') + ' at offset ' + d.start);
  }
  return sf;
}
function literals(text) {
  const sf = parse(text), out = [];
  const visit = (node) => {
    const k = node.kind;
    if (k === ts.SyntaxKind.NoSubstitutionTemplateLiteral || k === ts.SyntaxKind.TemplateExpression || k === ts.SyntaxKind.StringLiteral) {
      const raw = node.getText(sf);
      const p = node.parent;
      const name = p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) ? p.name.text : '';
      out.push({ name, raw, glsl: GLSL_NAMES.includes(name) || GLSL_MARK.test(raw) });
      return;                                            // outermost literal only
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
function declaredNames(text) {                            // every declared variable / function / parameter name
  const sf = parse(text), names = new Set(), top = new Set();
  const visit = (node, depth) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node)) && node.name && ts.isIdentifier(node.name)) {
      names.add(node.name.text);
      if (depth <= 3) top.add(node.name.text);
    }
    ts.forEachChild(node, (c) => visit(c, depth + 1));
  };
  visit(sf, 0);
  return { names, top };
}

/* ── 3. names this script injects must not exist in the page ────────────────────────────────── */
const INJECTED_PLAIN = ['api', 'options', 'instance'];
const INJECTED_DZ = ['dzScaffold', 'dzScaffoldParent', 'dzById', 'dzListen', 'dzListeners', 'dzInterval', 'dzIntervals', 'dzScheduleFrame',
  'dzRaf', 'dzAutoStart', 'dzSizeEl', 'dzViewW', 'dzViewH', 'dzNotice', 'dzDispose', 'dzDisposed', 'dzPublished', 'dzApiTarget', 'DZ_SCAFFOLD_HTML',
  'dzKeyTarget', 'dzDropTarget', 'dzClickTarget', 'dzShortcuts', 'dzResetOnResize', 'dzLastW', 'dzLastH', 'dzContextLost', 'dzReleaseKeys'];
const decl = declaredNames(pageScript);
for (const n of INJECTED_PLAIN) if (decl.names.has(n)) fail(`the page already declares "${n}"`);
for (const n of INJECTED_DZ) if (new RegExp('\\b' + n + '\\b').test(pageScript)) fail(`the page already uses the name "${n}"`);
for (const n of ['frame', 'frameN', 'dzDive']) if (!decl.top.has(n)) fail(`the page no longer declares "${n}" at the top level`);

/* ── 4. the transforms ──────────────────────────────────────────────────────────────────────── */
/* find: a string (every occurrence) or a global RegExp. expect: the exact number of places. */
const TRANSFORMS = [
  { name: 'embed-flag-from-options', expect: 1,
    find: "const EMBED = new URLSearchParams(location.search).get('embed') === '1';",
    to: 'const EMBED = options.embed !== false;' },
  { name: 'canvas-from-argument', expect: 1,
    find: "const canvas = document.getElementById('gl');",
    to: "/* canvas: the createDeepZoom argument (the page looked up #gl here) */" },
  { name: 'webgl-missing-throws-error', expect: 1,
    find: 'throw 0;',
    to: "dzDispose(); throw new Error('WebGL2 unavailable');" },
  { name: 'body-is-scaffold', expect: 4, find: 'document.body', to: 'dzScaffold' },
  { name: 'lookup-in-scaffold', expect: 8, find: 'document.getElementById(', to: 'dzById(' },
  { name: 'handle-assign', expect: 79, find: /window\.__([A-Za-z0-9_]+)(\s*=)(?!=)/g, to: 'api.$1$2' },
  { name: 'handle-read', expect: 39, find: /window\.__([A-Za-z0-9_]+)/g, to: 'api.$1' },
  { name: 'window-listeners-recorded', expect: 6, find: /^addEventListener\(/gm, to: 'dzListen(window, ' },
  { name: 'document-listener-recorded', expect: 1, find: 'document.addEventListener(', to: 'dzListen(document, ' },
  { name: 'canvas-listener-recorded', expect: 1, find: 'canvas.addEventListener(', to: 'dzListen(canvas, ' },
  /* the five below are OPTION SEAMS added after review (2026-10-07). With the default options each
     resolves to exactly what the page did: keys and drops on window, a click takes the pointer. */
  { name: 'keys-on-key-target', expect: 2, find: /dzListen\(window, '(keydown|keyup)'/g, to: "dzListen(dzKeyTarget, '$1'" },
  { name: 'shortcuts-optional', expect: 1,
    find: 'if (inputLocked) return; keys[e.code]=true;',
    to: 'if (inputLocked) return; keys[e.code]=true; if (!dzShortcuts) return;' },
  { name: 'drops-on-drop-target', expect: 2, find: /dzListen\(window, '(dragover|drop)'/g, to: "dzListen(dzDropTarget, '$1'" },
  { name: 'pointer-lock-optional', expect: 1, find: "dzListen(canvas, 'click'", to: "dzListen(dzClickTarget, 'click'" },
  { name: 'compile-poll-stops-on-dispose', expect: 1,
    find: 'const poll = () => {' + EOL + '    if (done) return;',
    to: 'const poll = () => {' + EOL + '    if (done || dzDisposed) return;' },
  { name: 'panel-sync-interval-recorded', expect: 1, find: 'setInterval(', to: 'dzInterval(' },
  { name: 'frame-loop-cancellable', expect: 3, find: 'requestAnimationFrame(frame)', to: 'dzScheduleFrame()' },
  { name: 'view-width-from-size-element', expect: 2, find: 'window.innerWidth', to: 'dzViewW()' },
  { name: 'view-height-from-size-element', expect: 2, find: 'window.innerHeight', to: 'dzViewH()' },
  { name: 'alert-to-notice', expect: 3, find: /\balert\(/g, to: 'dzNotice(' },
];

const before = literals(pageScript);
let body = pageScript;
const report = [];
for (const t of TRANSFORMS) {
  let n;
  if (typeof t.find === 'string') { n = countOf(body, t.find); body = body.split(t.find).join(t.to); }
  else { n = (body.match(t.find) || []).length; body = body.replace(t.find, t.to); }
  if (n !== t.expect) fail(`transform "${t.name}" matched ${n} place(s), expected ${t.expect}`);
  report.push(`${t.name}: ${n}`);
}

/* nothing of the page-global kind may be left behind */
const RESIDUE = [
  ['window.__', /window\.__/g, 0], ['location.', /\blocation\./g, 0], ['alert(', /\balert\(/g, 0],
  ['document.body', /document\.body/g, 0], ['document.getElementById', /document\.getElementById/g, 0],
  ['window.innerWidth/innerHeight', /window\.inner(?:Width|Height)/g, 0],
  ['bare addEventListener(', /(^|[^.\w])addEventListener\(/gm, 0],
  ['element .addEventListener( (scaffold buttons and panels)', /\.addEventListener\(/g, 6],
  ['setInterval(', /\bsetInterval\(/g, 0], ['requestAnimationFrame(frame)', /requestAnimationFrame\(frame\)/g, 0],
  ['throw 0', /throw 0\b/g, 0],
];
for (const [what, re, want] of RESIDUE) {
  const n = (body.match(re) || []).length;
  if (n !== want) fail(`after the transforms ${n} "${what}" remain, expected ${want}`);
}

/* ── 5. shader strings must come through byte-identical ─────────────────────────────────────── */
const after = literals(body);
const gA = before.filter((l) => l.glsl), gB = after.filter((l) => l.glsl);
if (gA.length !== gB.length) fail(`GLSL literal count changed: ${gA.length} -> ${gB.length}`);
for (const n of GLSL_NAMES) if (!gA.some((l) => l.name === n)) fail(`shader string ${n} not found in the page`);
for (let i = 0; i < gA.length; i++) {
  if (sha(gA[i].raw) !== sha(gB[i].raw)) fail(`GLSL literal #${i} (${gA[i].name || 'anonymous'}) changed: ${sha(gA[i].raw).slice(0, 12)} -> ${sha(gB[i].raw).slice(0, 12)}`);
}
const shaderDigest = sha(gB.map((l) => sha(l.raw)).join('\n'));
const shaderBytes = gB.reduce((s, l) => s + Buffer.byteLength(l.raw, 'utf8'), 0);

/* ── 6. the scaffold markup as one template literal ─────────────────────────────────────────── */
const markupLit = '`' + markup.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
if (new Function('return ' + markupLit)() !== markup.replace(/\r\n/g, '\n')) fail('the scaffold markup does not survive the round trip through a template literal');
for (const id of ['loading', 'hud', 'topbar', 'ctlbtn', 'renderbtn', 'aboutbtn', 'controls', 'ctlbody', 'render', 'rstatus', 'about', 'lockcue',
  'r_res', 'r_samp', 'r_export', 'r_rec', 'r_sp', 'r_sa', 'r_smooth', 'r_play', 'r_load', 'r_save', 'r_frames', 'r_pres', 'r_psamp', 'r_render', 'r_cancel']) {
  if (countOf(markup, `id="${id}"`) !== 1) fail(`the markup does not hold exactly one element with id "${id}"`);
}

/* ── 7. assemble ────────────────────────────────────────────────────────────────────────────── */
const HEADER = `/**
 * deep-zoom/renderer/core.js — the Mandelbulb perturbation deep-zoom renderer, as a module.
 *
 * WHAT THIS IS
 *   The inline script of the standalone page, wrapped in createDeepZoom(canvas, options) so the
 *   gmt-shell in deep-zoom/ can drive it directly instead of embedding a page in an iframe.
 *
 * WHERE IT CAME FROM
 *   repo    mandelbulb_deepzoom (github.com/gamazama/mandelbulb-deepzoom), branch kernel-perf
 *   file    index.html
 *   commit  ${SOURCE_COMMIT}  (sha-256 of the file ${SOURCE_SHA256})
 *   ported  ${PORT_DATE} by deep-zoom/renderer/port/port.mjs
 *
 * IT IS A VERBATIM PORT. Between the BEGIN and END markers below every line is the page's line,
 * except where one of these transforms touched it (name: places changed):
${'%TRANSFORMS%'}
 *   Shader strings: ${gB.length} GLSL literals, ${shaderBytes} bytes, byte-identical to the page
 *   (combined sha-256 ${shaderDigest}).
 *   Everything above BEGIN and below END is the module wrapper and is not from the page.
 *
 * WHAT THE WRAPPER ADDS
 *   - a hidden scaffold element built from the page's body markup, so the developer panel, HUD and
 *     loading box the script looks up exist (never shown); removed by dispose()
 *   - api: the object that carries what the page put on window as window.__name (api.name);
 *     with options.publishOnWindow each member is ALSO written to window.__name as the page did
 *   - one recorder for window / document / canvas listeners and the one interval, so dispose()
 *     removes them; a cancellable frame loop; step(now) for a host that drives the loop itself
 *   - option seams for a host that shares the window with other things (all default to the page's
 *     behaviour): keyTarget, shortcuts, dropTarget, pointerLock, resetStillOnResize,
 *     loseContextOnDispose, onContextLost. See core.d.ts.
 *
 * THE HISTORICAL PAGE STAYS FROZEN at ${SOURCE_COMMIT}. It is the reference this file is tested against
 * (npx tsx debug/smoke-deep-zoom-parity.mts). From ${PORT_DATE} THIS FILE is the source that gets
 * edited; port.mjs is kept as provenance (node deep-zoom/renderer/port/port.mjs --check proves a
 * copy is still "the page plus the transforms" — true only until the first hand edit).
 *
 * Types: core.d.ts (loose) and index.ts (the product surface). Import from index.ts.
 */
`.replace('%TRANSFORMS%', report.map((r) => ' *     ' + r).join('\n'));

const PRELUDE = `
const DZ_SCAFFOLD_HTML = ${'%MARKUP%'};

export function createDeepZoom(canvas, options = {}) {
/* ════════ module wrapper (not from the page) ════════ */
if (!canvas || typeof canvas.getContext !== 'function') throw new Error('createDeepZoom: a canvas element is required');
const dzAutoStart = options.autoStart !== false;              // false: the host calls instance.step(now)
const dzSizeEl = options.sizeElement || canvas.parentElement || null;
/* options.resetStillOnResize (default false = the page): a change of the available size restarts the
   still. The page only did that for its own panel; without it a resize mid-convergence blends into
   an empty target. accumReset is the page's own flag, read here at call time only. */
const dzResetOnResize = options.resetStillOnResize === true;
let dzLastW = 0, dzLastH = 0;
const dzViewW = () => { const v = dzSizeEl ? dzSizeEl.clientWidth : window.innerWidth; if (v !== dzLastW) { if (dzLastW && dzResetOnResize) accumReset = true; dzLastW = v; } return v; };
const dzViewH = () => { const v = dzSizeEl ? dzSizeEl.clientHeight : window.innerHeight; if (v !== dzLastH) { if (dzLastH && dzResetOnResize) accumReset = true; dzLastH = v; } return v; };
/* input seams. Defaults are the page: keys and file drops on window, a canvas click takes the pointer. */
const dzKeyTarget = options.keyTarget || window;              // where keydown / keyup listen
const dzShortcuts = options.shortcuts !== false;              // false: keys are only recorded for flying, no shortcut acts
const dzDropTarget = options.dropTarget === undefined ? window : options.dropTarget;   // null: no drop listeners at all
const dzClickTarget = options.pointerLock === false ? null : canvas;                   // null: a click does not take the pointer
const dzNotice = typeof options.onNotice === 'function' ? options.onNotice : (message) => console.warn(message);
/* the page's body markup, hidden: everything the script looks up by id lives in here */
const dzScaffold = document.createElement('div');
dzScaffold.setAttribute('data-deep-zoom-scaffold', '');
dzScaffold.style.display = 'none';
dzScaffold.innerHTML = DZ_SCAFFOLD_HTML;
const dzScaffoldParent = options.scaffoldParent || canvas.parentElement || document.body;
dzScaffoldParent.appendChild(dzScaffold);
const dzById = (id) => dzScaffold.querySelector('#' + id);
/* api.name is what the page called window.__name */
const dzPublished = new Map();
const dzApiTarget = {};
const api = options.publishOnWindow
  ? new Proxy(dzApiTarget, { set(target, key, value) {
      target[key] = value;
      /* a disposed instance publishes nothing: its deep-shader callback can land after dispose() */
      if (typeof key === 'string' && !dzDisposed) { window['__' + key] = value; dzPublished.set(key, value); }
      return true;
    } })
  : dzApiTarget;
const dzListeners = [];
function dzListen(target, type, handler, opts) { if (!target) return; target.addEventListener(type, handler, opts); dzListeners.push([target, type, handler, opts]); }
/* a host-supplied key target can lose focus with a fly key down and never see its keyup */
if (options.keyTarget) {
  const dzReleaseKeys = () => { for (const k in keys) keys[k] = false; };
  dzListen(dzKeyTarget, 'blur', dzReleaseKeys);
  dzListen(window, 'blur', dzReleaseKeys);
}
/* the page had no context-loss handling: every draw becomes a no-op and telemetry keeps saying ready */
let dzContextLost = false;
dzListen(canvas, 'webglcontextlost', () => { dzContextLost = true; if (typeof options.onContextLost === 'function') options.onContextLost(); });
const dzIntervals = [];
function dzInterval(fn, ms) { const id = setInterval(fn, ms); dzIntervals.push(id); return id; }
let dzRaf = 0, dzDisposed = false;
function dzScheduleFrame() {                                  // the page's requestAnimationFrame(frame)
  if (dzDisposed || !dzAutoStart) return;
  if (dzRaf) cancelAnimationFrame(dzRaf);                     // one pending frame at most, whoever asked
  dzRaf = requestAnimationFrame(frame);
}
function dzDispose() {
  if (dzDisposed) return;
  dzDisposed = true;
  if (dzRaf) cancelAnimationFrame(dzRaf);
  dzRaf = 0;
  for (const [target, type, handler, opts] of dzListeners) target.removeEventListener(type, handler, opts);
  dzListeners.length = 0;
  for (const id of dzIntervals) clearInterval(id);
  dzIntervals.length = 0;
  try { if (document.pointerLockElement === canvas) document.exitPointerLock(); } catch (e) { /* not locked */ }
  /* end the three things that would otherwise keep ticking on their own requestAnimationFrame */
  try { if (dzApiTarget.stopPlay) dzApiTarget.stopPlay(); } catch (e) { /* not built yet */ }
  try { if (dzApiTarget.cancelRender) dzApiTarget.cancelRender(); } catch (e) { /* not built yet */ }
  try { dzDive = 0; } catch (e) { /* disposed before the script reached it */ }
  /* options.loseContextOnDispose: drop every GL object this instance made (programs, textures, the
     deep compile in flight). The canvas cannot be used again afterwards: mount a fresh one. */
  if (options.loseContextOnDispose) {
    try { const ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* no context was made */ }
  }
  for (const [key, value] of dzPublished) { if (window['__' + key] === value) delete window['__' + key]; }
  dzPublished.clear();
  dzScaffold.remove();
}
/* ════════ BEGIN ported page script — mandelbulb_deepzoom ${SOURCE_COMMIT}:index.html ════════ */
`;

const EPILOGUE = `/* ════════ END ported page script ════════ */
const instance = {
  canvas,
  api,
  get frameCount() { return frameN; },                        // frames the loop has run (the page's frameN)
  get disposed() { return dzDisposed; },
  get contextLost() { return dzContextLost; },                // the browser took the WebGL context: dispose and mount a fresh canvas
  step(now) { if (!dzDisposed) frame(typeof now === 'number' ? now : performance.now()); },
  dispose: dzDispose,
};
return instance;
}
`;

const toEol = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, EOL);
const output = toEol(HEADER) + toEol(PRELUDE).replace('%MARKUP%', () => markupLit) + body + (body.endsWith(EOL) ? '' : EOL) + toEol(EPILOGUE);
if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(output)) fail('the output holds a control byte');

/* ── 8. the output must be a valid strict-mode module with no undeclared names ──────────────── */
parse(output);
{
  const host = ts.createCompilerHost({});
  const readFile = host.readFile.bind(host), fileExists = host.fileExists.bind(host), getSourceFile = host.getSourceFile.bind(host);
  const VIRTUAL = OUT.replace(/\\/g, '/');
  const same = (f) => f.replace(/\\/g, '/').toLowerCase() === VIRTUAL.toLowerCase();
  host.readFile = (f) => (same(f) ? output : readFile(f));
  host.fileExists = (f) => (same(f) ? true : fileExists(f));
  host.getSourceFile = (f, lang, ...rest) => (same(f) ? ts.createSourceFile(f, output, lang, true, ts.ScriptKind.JS) : getSourceFile(f, lang, ...rest));
  const program = ts.createProgram([VIRTUAL], { allowJs: true, checkJs: true, noEmit: true, strict: false, skipLibCheck: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: [] }, host);
  const sf = program.getSourceFiles().find((s) => same(s.fileName));
  if (!sf) fail('the strict-mode scan could not load the output');
  const syn = program.getSyntacticDiagnostics(sf);
  if (syn.length) fail('syntax: ' + ts.flattenDiagnosticMessageText(syn[0].messageText, ' '));
  /* 2304 / 2552: cannot find name (an implicit global: silent in a page, a ReferenceError in a module)
     2451 / 2300: redeclared name (a wrapper name colliding with a page name)                        */
  const bad = program.getSemanticDiagnostics(sf).filter((d) => [2304, 2552, 2451, 2300].includes(d.code));
  if (bad.length) {
    for (const d of bad.slice(0, 20)) {
      const pos = sf.getLineAndCharacterOfPosition(d.start || 0);
      console.error(`  core.js:${pos.line + 1}  TS${d.code}  ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
    }
    fail(`${bad.length} undeclared or redeclared name(s) in the output`);
  }
}

/* ── 9. write, or compare ───────────────────────────────────────────────────────────────────── */
const norm = (s) => s.replace(/\r\n/g, '\n');
console.log(`source   ${SOURCE_REPO} ${SOURCE_COMMIT}:${SOURCE_FILE}  sha256 ${gotSha.slice(0, 16)}…  script ${pageScript.split('\n').length - 1} lines, markup ${markup.split('\n').length - 1} lines`);
for (const r of report) console.log('transform  ' + r);
console.log(`shaders  ${gB.length} GLSL literals (${gB.filter((l) => l.name).map((l) => l.name).join(', ')} + ${gB.filter((l) => !l.name).length} unnamed), ${shaderBytes} bytes, all hashes identical  combined ${shaderDigest.slice(0, 16)}…`);
console.log('strict   no undeclared or redeclared names');
if (CHECK) {
  if (!existsSync(OUT)) fail('core.js does not exist');
  const have = readFileSync(OUT, 'utf8');
  if (norm(have) !== norm(output)) fail('core.js differs from what the port produces (it has been edited by hand, or the port changed)');
  console.log(`check    core.js is exactly the port's output${have === output ? '' : ' (line endings differ)'}  sha256 ${sha(norm(output)).slice(0, 16)}…`);
} else {
  writeFileSync(OUT, output, 'utf8');
  console.log(`wrote    ${OUT}  ${Buffer.byteLength(output, 'utf8')} bytes  sha256(LF) ${sha(norm(output)).slice(0, 16)}…`);
}
