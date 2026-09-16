/**
 * smoke-ge-wave — the Curves face's FUNCTION TOOL (the wave), driven with a REAL mouse.
 *
 * The maths is pinned headless (`test:palette-wavegen`, `test:palette-curvespaces`). This is the
 * browser half: the React-level faults the build actually hit (plans/ge-v2-unified-shell-plan.md
 * §10, 2026-09-12 / 09-13). Desk layout (1280 × 800), a known saturated gradient that starts on
 * red, all input through Playwright's `page.mouse` / `page.keyboard` — `setPointerCapture`
 * refuses a pointer id the browser never issued, so a synthetic PointerEvent cannot drive these
 * handles at all.
 *
 *   [1] arm: the head and overlay mount, the graph tools go (armed is a mode), every handle is
 *       the element under its own centre. Then EVERY row of WaveOverlay's handle table — span A,
 *       span B, feather A, feather B, caliper, crest Y (amplitude) and X (phase), bias zone X
 *       (bias) and Y (skew), the wave body (offset) — takes an 8-move drag, and the pill's value
 *       must tick in the right direction on EVERY move. The four squares also drift up and OFF
 *       the overlay mid-drag and must hold pointer capture throughout (no lostpointercapture
 *       before release): inside the overlay a lost capture is invisible, because the moves
 *       bubble to the svg anyway — which is how bug 1 (a component defined inside a render,
 *       remounting and dropping capture) hid from the first cut of this step.
 *   [2] the working ramp AND the hero's `canvas[data-gx-ramp]` change on the moves of the
 *       amplitude drag, sampled with the button still down.
 *   [5] while armed, a click, Ctrl+click and double-click on empty plot add no key, change no
 *       ramp, push no undo entry; [5b] the same double-click unarmed DOES add one (the control).
 *   [3] arm → 9 drags → the clicks → ✓ is exactly ONE undo entry, and one Ctrl+Z gives back the
 *       pre-arm ramp exactly (all 256 texels, unrounded).
 *   [4] arm → drag → Esc (after a click in the head) restores the pre-arm ramp exactly, adds no
 *       entry, leaves the face open.
 *   [6] switch the axes to HSV (the gradient barely moves and keeps its saturation — bug 2), wave
 *       the HUE channel tall enough to carry it below zero (nothing turns black or grey —
 *       bug 3), ✕ discards exactly.
 *
 * KNOWN BUGS, found by this smoke on 2026-09-16 and reported every run; they gate only under
 * `WAVE_STRICT=1`. When one prints "NO LONGER REPRODUCES", make it a `check`.
 *   [K1] Esc straight after arm → drag CLOSES THE FACE AND BAKES the wave. Arming unmounts the
 *        toolbar button that held focus (focus falls to <body>) and a handle drag takes none
 *        (WaveOverlay preventDefaults pointerdown), so the editor's keydown listener never sees
 *        the key; the shell's window Esc closes the tray, and leaving Curves bakes.
 *   [K2] Closing the face while armed: one entry, but Ctrl+Z lands on the UNBAKED PREVIEW, not
 *        the pre-arm curves. The face-leave bake's `paramEdit` calls `beginParamTransaction`
 *        again inside the wave's open bracket, which OVERWRITES the arm-time snapshot
 *        (paramUndoBracket counts depth but forwards every start to the engine).
 *   [K3] The span / feather squares trail the pointer (77.5 px for a 96 px drag here): the drag
 *        converts pixels through the canvas WIDTH, while the t axis spans only the fitted plot.
 *
 * FALSIFIED 2026-09-16, each against a deliberately broken build and restored byte-for-byte:
 *   · `Square` moved inside WaveOverlay's render (bug 1) → [1] red on all four squares, and ONLY
 *     them: capture lost mid-drag, the value frozen once the pointer left the overlay (e.g.
 *     "0.01 → 0.02 → 0.02 → …"), the pill stuck on after release. Before the off-overlay drift
 *     was added, this break stayed GREEN.
 *   · WaveOverlay calling `onChange` only on release (preview on release) → [2] red ×3 ("1
 *     distinct ramps over 8 moves"); every [1] check stayed green, which is why [2] exists.
 *   · the editor's per-drag bracket no longer suppressed while armed (`!waveArmed` dropped from
 *     `onPointerDownCapture` and the window-pointerup effect) → [3] red ("undo depth 2 → 11",
 *     one Ctrl+Z worst Δ 122.9), [4] red (an entry for a discarded wave).
 *   · `wrapHue` removed from the HSV `toOklch` (bug 3) → [6] red: "black texels 0 → 35".
 *   · the `/ 100` on HSV S and V dropped (bug 2) → [6] red: the switch moved the gradient 111/255.
 *   · `closeWave` not writing the snapshot back → [4] red (Δ 155) and [6]'s ✕ red.
 *
 * WHAT THIS DOES NOT PROVE: the phone layout or touch; that keyframe diamonds are hidden while
 * armed (canvas pixels); the t-axis fit on arm from a zoomed-in view; presets, strength, shape
 * and mode glyphs; where the pill sits. And [5] holds because the overlay's svg covers the plot:
 * removing the editor's own `waveArmed` guards in `handleDoubleClick` / `handleMouseDownWrapped`
 * stayed GREEN — it proves the behaviour, not which layer provides it.
 *
 * Wants `npm run dev` on 3400. The HMR socket is mocked (smoke-gmt-gradientdrop's pattern) and a
 * reload mid-run is itself a red. Store reads go through `__wm`, never a bare module URL.
 * ~20 s. Run: `npm run smoke:ge-wave` (`WAVE_STRICT=1` to gate on the known bugs).
 */
import { chromium, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/gradient-explorer-next.html';
const STRICT = !!process.env.WAVE_STRICT;

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): boolean => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  return ok;
};
let knownOpen = 0;
/** A KNOWN production bug: reported every run, gating only under WAVE_STRICT=1. */
const known = (name: string, ok: boolean, detail = ''): void => {
  if (ok) {
    console.log(`✓ ${name}  — KNOWN BUG NO LONGER REPRODUCES: promote this to a gating check`);
    return;
  }
  knownOpen++;
  if (STRICT) failures++;
  console.log(`✗ KNOWN BUG ${name}${detail ? `  — ${detail}` : ''}`);
};
const hard = (msg: string): never => { throw new Error(msg); };

/** A deterministic, saturated gradient that starts on RED — so a hue wave crosses zero. */
const GRADIENT = {
  colorSpace: 'srgb',
  blendSpace: 'oklab',
  stops: [
    { id: 'w0', position: 0, color: '#C0392B', bias: 0.5, interpolation: 'linear' },
    { id: 'w1', position: 0.33, color: '#F39C12', bias: 0.5, interpolation: 'linear' },
    { id: 'w2', position: 0.66, color: '#16A085', bias: 0.5, interpolation: 'linear' },
    { id: 'w3', position: 1, color: '#2E4A9E', bias: 0.5, interpolation: 'linear' },
  ],
};

/**
 * Page helpers, as a STRING: tsx rewrites named functions with a `__name` helper the page does
 * not have, so a function handed to `evaluate` throws there.
 *
 * `__wm(path)` imports a module by the EXACT URL the page booted it from (read off the resource
 * timeline). A bare `import('/palette/store/workingStore.ts')` is a DIFFERENT module instance
 * whenever the dev server has HMR-stamped that file with `?t=` — the dual-instance trap — and a
 * second store instance answers every question with its own empty state.
 */
const HELPERS = `(() => {
  window.__wm = function (p) {
    var hit = performance.getEntriesByType('resource').map(function (e) { return e.name; })
      .filter(function (n) { try { return new URL(n).pathname === p; } catch (e) { return false; } });
    return import(hit.length ? hit[hit.length - 1] : p);
  };
  // Pointer-capture bookkeeping. A handle that is REMOUNTED mid-drag (a component type defined
  // inside a render) loses its capture the moment its DOM node goes: Chrome fires
  // lostpointercapture at the document while the button is still down.
  if (!window.__capInstalled) {
    window.__cap = { got: 0, lost: 0 };
    document.addEventListener('gotpointercapture', function () { window.__cap.got++; }, true);
    document.addEventListener('lostpointercapture', function () { window.__cap.lost++; }, true);
    window.__capInstalled = true;
  }
  /** Is (x, y) over the wave overlay (its svg or a handle in it)? */
  window.__over = function (x, y) {
    var el = document.elementFromPoint(x, y);
    var svg = window.__overlay ? window.__overlay() : null;
    return !!(el && svg && (el === svg || svg.contains(el)));
  };
  window.__frames = function () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); };
  window.__ws = async function () {
    var eng = await window.__wm('/store/engineStore.ts');
    var gen = await window.__wm('/palette/store/generatorStore.ts');
    var g = gen.useGeneratorStore.getState();
    var keys = {};
    Object.keys(g.tracks || {}).forEach(function (k) { keys[k] = g.tracks[k].keyframes.length; });
    var d = window.__gxWorking ? window.__gxWorking() : null;
    var ramp = d && d.ramp ? d.ramp.map(function (c) { return [c.r, c.g, c.b]; }) : null;
    var root = document.querySelector('[data-gx-tray-root]');
    return {
      undo: eng.useEngineStore.getState().paramUndoStack.length,
      space: g.curveSpace, keys: keys, curvesOn: g.curvesOn,
      ramp: ramp ? JSON.stringify(ramp) : null,
      face: root && root.dataset.gxTray ? root.dataset.gxTray : null,
      armed: !!document.querySelector('[data-gx-wave="head"]'),
      tools: document.querySelectorAll('[data-gx-tool]').length,
      active: document.activeElement ? document.activeElement.tagName : null,
    };
  };
  window.__overlay = function () {
    var crest = document.querySelector('[data-gx-wave="crest"]');
    return crest ? crest.closest('svg') : null;
  };
  /** The drag pill: the only text the tool shows, and only while a drag is live. */
  window.__pill = function () {
    var svg = window.__overlay();
    var p = svg && svg.parentElement ? svg.parentElement.querySelector(':scope > div.tabular-nums') : null;
    return p ? p.textContent : null;
  };
  window.__hero = function () {
    var c = document.querySelector('[data-gx-hero] canvas[data-gx-ramp]');
    if (!c) return 'no-canvas';
    var ctx = c.getContext('2d');
    var out = [];
    for (var i = 0; i < 48; i++) {
      var x = Math.min(c.width - 1, Math.floor((i / 47) * (c.width - 1)));
      var px = ctx.getImageData(x, Math.floor(c.height / 2), 1, 1).data;
      out.push(px[0] + ',' + px[1] + ',' + px[2]);
    }
    return out.join('|');
  };
  /** Centre of every overlay handle in client px, and whether a pointer there hits THAT handle. */
  window.__handles = function () {
    var svg = window.__overlay();
    if (!svg) return null;
    var sr = svg.getBoundingClientRect();
    var centre = function (el) { if (!el) return null; var r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    var kids = Array.prototype.slice.call(svg.children);
    var byStroke = function (col) { return kids.filter(function (g) { return g.tagName === 'g' && g.querySelector(':scope > rect[stroke="' + col + '"]'); }); };
    var span = byStroke('#f0997b');
    var feather = byStroke('#9ca3af');
    var caliper = kids.find(function (g) { return g.tagName === 'g' && g.querySelector(':scope > line'); });
    var bias = kids.find(function (g) { return g.tagName === 'g' && (g.getAttribute('style') || '').indexOf('crosshair') >= 0; });
    var body = kids.find(function (k) { return k.tagName === 'path'; });
    var crest = svg.querySelector('[data-gx-wave="crest"]');
    var nodes = { a: span[0], b: span[1], fa: feather[0], fb: feather[1], lam: caliper, pa: crest, bs: bias, dc: body };
    var hits = function (k, pt) { var el = pt ? document.elementFromPoint(pt.x, pt.y) : null; return !!(el && nodes[k] && (el === nodes[k] || nodes[k].contains(el))); };
    var out = { svg: { x: sr.x, y: sr.y, w: sr.width, h: sr.height }, a: centre(span[0]), b: centre(span[1]), fa: centre(feather[0]), fb: centre(feather[1]), lam: null, pa: centre(crest), bs: centre(bias), dc: null, curve: [] };
    if (caliper) {
      var mid = caliper.querySelector('circle');
      out.lam = { x: sr.x + Number(mid.getAttribute('cx')), y: sr.y + Number(mid.getAttribute('cy')) };
    }
    if (body) {
      var pts = body.getAttribute('d').split(/[ML]/).filter(Boolean).map(function (s) { var p = s.trim().split(/\\s+/); return { x: sr.x + Number(p[0]), y: sr.y + Number(p[1]) }; });
      out.curve = pts;
      // a point ON the invisible wave body, a quarter to a half along, that nothing covers
      out.dc = pts.find(function (p) { return p.x > sr.x + sr.width * 0.22 && p.x < sr.x + sr.width * 0.45 && hits('dc', p); }) || null;
    }
    out.hits = {};
    Object.keys(nodes).forEach(function (k) { out.hits[k] = hits(k, out[k]); });
    return out;
  };
  /** What a pointer at (x, y) would hit: 'svg' for the overlay's own empty ground. */
  window.__hitAt = function (x, y) {
    var el = document.elementFromPoint(x, y);
    var svg = window.__overlay();
    return !el ? 'nothing' : el === svg ? 'svg' : el.tagName + (svg && svg.contains(el) ? ' (a handle)' : '');
  };
  return true;
})()`;

type Pt = { x: number; y: number };
type WaveState = { undo: number; space: string; keys: Record<string, number>; curvesOn: boolean; ramp: string | null; face: string | null; armed: boolean; tools: number; active: string | null };
type HandleId = 'a' | 'b' | 'fa' | 'fb' | 'lam' | 'pa' | 'bs' | 'dc';
type Handles = Record<HandleId, Pt | null> & { svg: { x: number; y: number; w: number; h: number }; curve: Pt[]; hits: Record<HandleId, boolean> };

const ws = (page: Page) => page.evaluate('window.__ws()') as Promise<WaveState>;
const pill = (page: Page) => page.evaluate('window.__pill()') as Promise<string | null>;
const hero = (page: Page) => page.evaluate('window.__hero()') as Promise<string>;
const frames = (page: Page) => page.evaluate('window.__frames()');
const handles = async (page: Page): Promise<Handles> => {
  const h = (await page.evaluate('window.__handles()')) as Handles | null;
  return h ?? hard('the wave overlay is not mounted (no [data-gx-wave="crest"] inside an svg)');
};

type Rgb = number[];
const rampOf = (s: WaveState): Rgb[] => (s.ramp ? (JSON.parse(s.ramp) as Rgb[]) : hard('no working ramp (window.__gxWorking)'));
const worstDelta = (a: Rgb[], b: Rgb[]): number => {
  let w = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) for (let j = 0; j < 3; j++) w = Math.max(w, Math.abs(a[i][j] - b[i][j]));
  return a.length === b.length ? w : Infinity;
};
/** Mean HSV saturation (0..1), and how many texels are near-black / near-grey. */
const rampStats = (r: Rgb[]) => {
  let sat = 0;
  let black = 0;
  let grey = 0;
  for (const [R, G, B] of r) {
    const mx = Math.max(R, G, B);
    const mn = Math.min(R, G, B);
    const s = mx <= 0 ? 0 : (mx - mn) / mx;
    sat += s;
    if (mx <= 12) black++;
    if (mx - mn <= 6) grey++;
  }
  return { sat: sat / r.length, black, grey };
};

/**
 * A real multi-step mouse drag. `read` runs after every move, WITH THE BUTTON STILL DOWN — so
 * whatever it samples is mid-drag, not the settled result of a release.
 */
type Cap = { got: number; lost: number };
type Dragged<T> = { before: T; during: T[]; got: number; lostMid: number; outside: number };
async function drag<T>(page: Page, from: Pt, dx: number, dy: number, steps: number, read: () => Promise<T>): Promise<Dragged<T>> {
  await page.mouse.move(from.x, from.y);
  await frames(page);
  const before = await read();
  const c0 = (await page.evaluate('window.__cap')) as Cap;
  await page.mouse.down();
  const during: T[] = [];
  let outside = 0;
  for (let i = 1; i <= steps; i++) {
    const x = from.x + (dx * i) / steps;
    const y = from.y + (dy * i) / steps;
    // Asked BEFORE the move lands, so a handle dragged along under the pointer does not count.
    if (!(await page.evaluate(`window.__over(${x}, ${y})`))) outside++;
    await page.mouse.move(x, y);
    await frames(page);
    during.push(await read());
  }
  const c1 = (await page.evaluate('window.__cap')) as Cap;
  await page.mouse.up();
  await frames(page);
  return { before, during, got: c1.got - c0.got, lostMid: c1.lost - c0.lost, outside };
}

/** Numbers parsed from each pill reading; null where the pill was gone or did not match. */
const series = (readings: (string | null)[], re: RegExp, group = 1): (number | null)[] =>
  readings.map((t) => {
    const m = t ? re.exec(t) : null;
    return m ? Number(m[group]) : null;
  });
/** Strictly monotone in `dir` at EVERY step, with no step lost. */
const monotone = (xs: (number | null)[], dir: 1 | -1): boolean =>
  xs.every((x) => x !== null) && xs.every((x, i) => i === 0 || (x! - xs[i - 1]!) * dir > 0);
/** The same for a quantity that wraps at 1 (phase), unwrapped step by step. */
const monotoneWrapped = (xs: (number | null)[], dir: 1 | -1): boolean =>
  xs.every((x) => x !== null) &&
  xs.every((x, i) => {
    if (i === 0) return true;
    let d = x! - xs[i - 1]!;
    d -= Math.round(d);
    return d * dir > 0;
  });

async function main() {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await seedGeSmokeState(ctx);
  // No HMR (smoke-gmt-gradientdrop's pattern): other agents edit this tree while a smoke runs,
  // and one reload mid-run wipes the helpers and the tool's state.
  await ctx.routeWebSocket(/./, () => {});
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  let navigations = 0;
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigations++; });

  console.log(`→ GET ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction('!!window.__gxWorking', null, { timeout: 20000 });
  const bootNavigations = navigations;
  await page.evaluate(HELPERS);
  /**
   * Start a step from the known gradient with no curves and no face — so a red in one step does
   * not cascade into the next one's "before". Through the store the shell itself reads; `bakes`
   * is `use`'s own reset of Adjust + curves.
   */
  const fresh = async () => {
    if ((await ws(page)).face) { await page.click(`[data-gx-tray-tab="${(await ws(page)).face}"]`); await page.waitForTimeout(300); }
    await page.evaluate(`window.__wm('/palette/store/workingStore.ts').then(function (m) { m.useWorkingStore.getState().use(${JSON.stringify(GRADIENT)}, 'Wave smoke', 'Browse', { bakes: true }); })`);
    await page.waitForSelector('[data-gx-hero]', { timeout: 8000 }).catch(() => hard('no hero after loading the smoke gradient — dual module instance? restart `npm run dev`'));
    await page.waitForTimeout(400);
  };
  await fresh();

  const openCurves = async () => {
    if ((await ws(page)).face !== 'curves') await page.click('[data-gx-tray-tab="curves"]');
    await page.waitForSelector('[data-gx-tool="wave"]', { timeout: 8000 }).catch(() => hard('the Curves face has no wave tool button'));
    await page.waitForTimeout(300);
  };
  const arm = async () => {
    await page.click('[data-gx-tool="wave"]');
    await page.waitForSelector('[data-gx-wave="head"]', { timeout: 4000 }).catch(() => hard('clicking the wave tool did not arm it (no head)'));
    await frames(page);
  };

  // ── [1] arm, then every handle kind in the header table, with a real drag ─────────────────
  await openCurves();
  const pre = await ws(page);
  await arm();
  const armed = await ws(page);
  const h0 = await handles(page);
  check('[1] arming mounts the head and the overlay, and takes the graph tools away (armed is a mode)',
    armed.armed && armed.tools === 0 && pre.tools > 0, `tools ${pre.tools} → ${armed.tools}`);
  const missing = (Object.keys(h0.hits) as HandleId[]).filter((k) => !h0.hits[k]);
  check('[1] every handle is the thing under its own centre (none covered, none drifted off its hit box)', missing.length === 0, missing.length ? `not hit: ${missing.join(', ')}` : '8 handles');

  // Each case: which handle, the drag, the pill field that must move, which way.
  const X = 96; // 8 × 12 px: every step moves span by > 0.01 of a 973 px plot, so a 2-dp readout must tick each time
  const Y = 40; // 8 × 5 px
  /**
   * `escape`: the drag also drifts UP and OFF the overlay half way through (a sloppy diagonal,
   * or a square at the plot's edge dragged past it). A square only reads X, so its value must
   * keep ticking out there — which only pointer CAPTURE delivers: without it the moves land on
   * whatever is under the pointer, the drag freezes, and the release never reaches the overlay.
   * Inside the overlay a lost capture is invisible, because the moves bubble to the svg anyway.
   */
  type Case = { id: HandleId; label: string; dx: number; dy: number; re: RegExp; group?: number; dir: 1 | -1; wrap?: boolean; follows?: boolean; escape?: boolean };
  const cases: Case[] = [
    { id: 'a', label: 'coral span square A → span start', dx: X, dy: 0, escape: true, re: /^span ([\d.]+)–([\d.]+)$/, dir: 1, follows: true },
    { id: 'b', label: 'coral span square B → span end', dx: -X, dy: 0, escape: true, re: /^span ([\d.]+)–([\d.]+)$/, group: 2, dir: -1, follows: true },
    { id: 'fa', label: 'grey feather square A (inward) → feather', dx: X, dy: 0, escape: true, re: /^feather (\d+)%$/, dir: 1, follows: true },
    { id: 'fb', label: 'grey feather square B (inward) → feather', dx: -X, dy: 0, escape: true, re: /^feather (\d+)%$/, dir: 1, follows: true },
    { id: 'lam', label: 'caliper → wavelength', dx: X, dy: 0, re: /^λ ([\d.]+)/, dir: 1 },
    { id: 'pa', label: 'crest circle, Y up → amplitude', dx: 0, dy: -Y, re: /amp ([\d.]+)$/, dir: 1 },
    { id: 'pa', label: 'crest circle, X → phase', dx: X, dy: 0, re: /^phase ([\d.]+)/, dir: -1, wrap: true },
    { id: 'bs', label: 'bias zone, X → bias', dx: X, dy: Y, re: /^↔ ([\d.]+)/, dir: 1 },
    { id: 'bs', label: 'bias zone, Y down → skew', dx: X, dy: Y, re: /↕ ([\d.]+)$/, dir: 1 },
    { id: 'dc', label: 'the wave body, Y up → offset', dx: 0, dy: -Y, re: /^offset (-?[\d.]+)$/, dir: 1 },
  ];
  let liveProbe: { ramps: string[]; heroes: string[]; before: { ramp: string; hero: string } } | null = null;
  const done = new Map<string, (string | null)[]>();
  /** How far each square travelled against the pointer — reported under [K3]. */
  const follow: { id: HandleId; moved: number; dx: number }[] = [];
  for (const c of cases) {
    // The bias zone carries TWO values on one drag: run it once, read both fields off it.
    const key = `${c.id}:${c.dx}:${c.dy}`;
    let readings = done.get(key);
    let moved = NaN;
    if (!readings) {
      const h = await handles(page);
      const at = h[c.id];
      if (!at || !h.hits[c.id]) { check(`[1] ${c.label}`, false, `handle not hittable at ${JSON.stringify(at)}`); continue; }
      const isAmp = c.id === 'pa' && c.dy !== 0;
      // leave through the top edge by the middle of the drag: exits at ~step 3.5 of 8
      const dy = c.escape ? 2 * (h.svg.y - at.y) - 30 : c.dy;
      const r = await drag(page, at, c.dx, dy, 8, async () => {
        const p = await pill(page);
        if (!isAmp) return { p, ramp: '', hero: '' };
        const s = await ws(page);
        return { p, ramp: s.ramp ?? '', hero: await hero(page) };
      });
      readings = r.during.map((d) => d.p);
      done.set(key, readings);
      check(`[1] ${c.label}: holds pointer capture for the whole drag${c.escape ? ` (${r.outside} of 8 moves off the overlay)` : ''}`,
        r.got >= 1 && r.lostMid === 0 && (!c.escape || r.outside >= 3),
        `gotpointercapture ${r.got}, lostpointercapture before release ${r.lostMid}${c.escape ? `, moves off the overlay ${r.outside}` : ''}`);
      if (isAmp) liveProbe = { ramps: r.during.map((d) => d.ramp), heroes: r.during.map((d) => d.hero), before: { ramp: r.before.ramp, hero: r.before.hero } };
      const after = await handles(page);
      if (c.follows && after[c.id]) moved = after[c.id]!.x - at.x;
      const gone = await pill(page);
      if (gone !== null) check(`[1] ${c.label}: the pill clears on release`, false, `still reads "${gone}"`);
    }
    const xs = series(readings, c.re, c.group ?? 1);
    const ok = c.wrap ? monotoneWrapped(xs, c.dir) : monotone(xs, c.dir);
    check(`[1] ${c.label}: moves ${c.dir > 0 ? 'up' : 'down'} on every one of 8 moves`, ok, xs.map((x) => (x === null ? '∅' : x)).join(' → '));
    if (c.follows && Number.isFinite(moved)) follow.push({ id: c.id, moved, dx: c.dx });
  }

  // ── [2] the gradient follows the drag LIVE, not on release ─────────────────────────────────
  if (!liveProbe) {
    check('[2] live preview', false, 'the amplitude drag never ran');
  } else {
    const rampSteps = new Set(liveProbe.ramps).size;
    const heroSteps = new Set(liveProbe.heroes).size;
    check('[2] mid-drag, the working ramp has already changed (button still down)',
      liveProbe.ramps[3] !== liveProbe.before.ramp && liveProbe.ramps[7] !== liveProbe.before.ramp, `step 4 ${liveProbe.ramps[3] !== liveProbe.before.ramp ? 'changed' : 'unchanged'}, step 8 ${liveProbe.ramps[7] !== liveProbe.before.ramp ? 'changed' : 'unchanged'}`);
    check('[2] the ramp changes on (nearly) every move, not once', rampSteps >= 7, `${rampSteps} distinct ramps over 8 moves`);
    check('[2] the hero bar repaints mid-drag', liveProbe.heroes[7] !== liveProbe.before.hero && heroSteps >= 4, `${heroSteps} distinct hero frames over 8 moves`);
  }

  // ── [5] armed is a MODE: a click, a Ctrl+click or a double-click on the plot adds no key ──
  const hm = await handles(page);
  // An empty spot: three quarters along, as far from the curve as the plot allows.
  const ex = hm.svg.x + hm.svg.w * 0.72;
  const curveAt = hm.curve.reduce((best, p) => (Math.abs(p.x - ex) < Math.abs(best.x - ex) ? p : best), hm.curve[0]);
  const topY = hm.svg.y + 45;
  const botY = hm.svg.y + hm.svg.h - 30;
  const ey = Math.abs(topY - curveAt.y) > Math.abs(botY - curveAt.y) ? topY : botY;
  const hitKind = await page.evaluate(`window.__hitAt(${ex}, ${ey})`);
  const m0 = await ws(page);
  await page.mouse.click(ex, ey);
  await frames(page);
  await page.keyboard.down('Control');
  await page.mouse.click(ex, ey);
  await page.keyboard.up('Control');
  await frames(page);
  await page.mouse.dblclick(ex, ey);
  await page.waitForTimeout(150);
  const m1 = await ws(page);
  check('[5] while armed, click / Ctrl+click / double-click on empty plot add no keyframe',
    JSON.stringify(m1.keys) === JSON.stringify(m0.keys) && m1.ramp === m0.ramp && m1.undo === m0.undo && m1.armed,
    `hit ${hitKind}; keys ${JSON.stringify(m0.keys)} → ${JSON.stringify(m1.keys)}; undo ${m0.undo} → ${m1.undo}; still armed ${m1.armed}`);

  // ── [3] commit (✓) after all those drags is ONE undo step back to the pre-arm ramp ─────────
  await page.click('[data-gx-wave="commit"]');
  await page.waitForTimeout(300);
  const c1 = await ws(page);
  check('[3] ✓ bakes: the tool closes, the face stays, the ramp is not the pre-arm one', !c1.armed && c1.face === 'curves' && c1.ramp !== pre.ramp, `armed ${c1.armed}, face ${c1.face}`);
  check('[3] the whole session — arm, 9 drags, clicks, commit — is exactly ONE undo entry', c1.undo === pre.undo + 1, `undo depth ${pre.undo} → ${c1.undo}`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  const c2 = await ws(page);
  check('[3] one Ctrl+Z restores the pre-arm ramp EXACTLY', c2.ramp === pre.ramp && c2.undo === pre.undo,
    `worst Δ ${worstDelta(rampOf(c2), rampOf(pre)).toFixed(4)}; undo depth ${c2.undo}; keys ${JSON.stringify(c2.keys)} (pre-arm ${JSON.stringify(pre.keys)})`);

  // ── [4] Esc while armed discards: the pre-arm ramp exactly, no undo entry ──────────────────
  await openCurves();
  const e0 = await ws(page);
  await arm();
  const he = await handles(page);
  if (he.pa) await drag(page, he.pa, 0, -Y, 8, async () => null);
  const e1 = await ws(page);
  // Put focus in the tool the way a desk user does: click something in its head. The ACTIVE
  // mode segment is a no-op click (Segmented ignores a click on the option that is already on).
  await page.click('[data-seg-group="wave-mode"] [aria-pressed="true"]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const e2 = await ws(page);
  check('[4] the drag before Esc really changed the gradient (so the restore below means something)', e1.ramp !== e0.ramp);
  check('[4] Esc (focus in the tool) disarms and leaves the face open', !e2.armed && e2.face === 'curves', `armed ${e2.armed}, face ${e2.face}`);
  check('[4] Esc restores the pre-arm ramp EXACTLY and adds no undo entry', e2.ramp === e0.ramp && e2.undo === e0.undo,
    `worst Δ ${worstDelta(rampOf(e2), rampOf(e0)).toFixed(4)}; undo depth ${e0.undo} → ${e2.undo}`);

  // [5b] the CONTROL for [5]: unarmed, the same double-click on the same spot DOES add a key —
  // so [5]'s "nothing changed" is a probe that can see an add, not one that is blind to it.
  const k0 = await ws(page);
  await page.mouse.dblclick(ex, ey);
  await page.waitForTimeout(200);
  const k1 = await ws(page);
  const addedTo = Object.keys(k1.keys).filter((k) => k1.keys[k] === (k0.keys[k] ?? 0) + 1);
  check('[5b] control: unarmed, that double-click adds a keyframe (so [5] could have seen one)', addedTo.length === 1 && k1.undo === k0.undo + 1,
    `keys ${JSON.stringify(k0.keys)} → ${JSON.stringify(k1.keys)}`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);

  // ── [6] HSV: switching axes and waving the hue leaves the gradient coloured ────────────────
  await fresh();
  await openCurves();
  const beforeSpace = await ws(page);
  await page.click('button[title="Axes space"]');
  await page.locator('button', { hasText: /^HSV$/ }).first().click();
  await page.waitForTimeout(500);
  const hsv0 = await ws(page);
  const okRamp = rampOf(beforeSpace);
  const hsvRamp = rampOf(hsv0);
  const okStats = rampStats(okRamp);
  const hsvStats = rampStats(hsvRamp);
  check('[6] the axes switch to HSV', hsv0.space === 'hsv' && !!hsv0.keys.H, `space ${hsv0.space}, keys ${JSON.stringify(hsv0.keys)}`);
  check('[6] …and the gradient survives the switch (not greyed: the S/V 0..100 scaling)',
    worstDelta(hsvRamp, okRamp) <= 16 && hsvStats.sat >= okStats.sat * 0.85 && hsvStats.grey <= okStats.grey + 4,
    `worst Δ ${worstDelta(hsvRamp, okRamp).toFixed(1)}, mean saturation ${okStats.sat.toFixed(3)} → ${hsvStats.sat.toFixed(3)}, grey texels ${okStats.grey} → ${hsvStats.grey}`);
  await page.locator('[data-gx-tray-root] button', { hasText: /^Hue$/ }).first().click();
  await page.waitForTimeout(200);
  const hh = await ws(page);
  await arm();
  const h6 = await handles(page);
  // A tall hue wave: amplitude up, so the troughs carry the red end's hue BELOW zero.
  if (h6.pa) await drag(page, h6.pa, 0, -Y, 8, async () => null);
  const hsv1 = await ws(page);
  const waved = rampOf(hsv1);
  const wavedStats = rampStats(waved);
  const hhStats = rampStats(rampOf(hh));
  check('[6] a hue wave in HSV changes the gradient', worstDelta(waved, rampOf(hh)) >= 20, `worst Δ ${worstDelta(waved, rampOf(hh)).toFixed(1)}`);
  check('[6] …and turns nothing black (the signed-modulo hue) or grey',
    wavedStats.black <= hhStats.black && wavedStats.grey <= hhStats.grey + 4 && wavedStats.sat >= hhStats.sat * 0.7,
    `black texels ${hhStats.black} → ${wavedStats.black}, grey ${hhStats.grey} → ${wavedStats.grey}, mean saturation ${hhStats.sat.toFixed(3)} → ${wavedStats.sat.toFixed(3)}`);
  await page.click('[data-gx-wave="cancel"]');
  await page.waitForTimeout(300);
  const hsv2 = await ws(page);
  check('[6] ✕ discards the HSV wave exactly', !hsv2.armed && hsv2.ramp === hh.ramp && hsv2.undo === hh.undo, `worst Δ ${worstDelta(rampOf(hsv2), rampOf(hh)).toFixed(4)}, undo ${hh.undo} → ${hsv2.undo}`);

  // ── KNOWN BUGS (reported, gating only under WAVE_STRICT=1) ─────────────────────────────────
  // [K1] Esc straight after arming and dragging — no click in the head first. Arming unmounts
  //      the toolbar button that had focus, and no handle drag takes focus, so the key goes to
  //      the shell's window listener instead of the tool.
  await fresh();
  await openCurves();
  const q0 = await ws(page);
  await arm();
  const hq = await handles(page);
  if (hq.pa) await drag(page, hq.pa, 0, -Y, 8, async () => null);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const q1 = await ws(page);
  known('[K1] arm → drag → Esc discards (focus where arming leaves it)', !q1.armed && q1.face === 'curves' && q1.ramp === q0.ramp && q1.undo === q0.undo,
    `face ${q0.face} → ${q1.face}, undo depth ${q0.undo} → ${q1.undo}, curves ${JSON.stringify(q0.keys)} → ${JSON.stringify(q1.keys)}, worst Δ ${worstDelta(rampOf(q1), rampOf(q0)).toFixed(1)} — the face closed and BAKED the wave`);

  // [K2] commit by CLOSING the face (it bakes) — one Ctrl+Z should land on the pre-arm ramp.
  await fresh();
  await openCurves();
  const z0 = await ws(page);
  await arm();
  const hz = await handles(page);
  if (hz.pa) await drag(page, hz.pa, 0, -Y, 8, async () => null);
  if (hz.a) await drag(page, hz.a, X, 0, 8, async () => null);
  const zp = await ws(page);
  await page.click('[data-gx-tray-tab="curves"]');
  await page.waitForTimeout(500);
  const z1 = await ws(page);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(500);
  const z2 = await ws(page);
  known('[K2] arm → drags → close the face (bakes) → one Ctrl+Z restores the pre-arm ramp', z1.undo === z0.undo + 1 && z2.ramp === z0.ramp,
    `undo depth ${z0.undo} → ${z1.undo} → ${z2.undo}; the undo lands on ${z2.ramp === zp.ramp ? 'the UNBAKED PREVIEW (the wave is still there)' : 'neither the pre-arm ramp nor the preview'}: curves ${JSON.stringify(z2.keys)}, pre-arm ${JSON.stringify(z0.keys)}, worst Δ against pre-arm ${worstDelta(rampOf(z2), rampOf(z0)).toFixed(1)}`);

  // [K3] a span / feather square stays under the pointer that drags it. Measured in [1].
  known('[K3] span and feather squares keep up with the pointer',
    follow.length === 4 && follow.every((f) => Math.abs(f.moved - f.dx) <= 2),
    follow.map((f) => `${f.id} ${f.moved.toFixed(1)}/${f.dx} px`).join(', ') + ' — the drag divides by the canvas width, not the plotted t span');

  check('no pageerror', pageErrors.length === 0, pageErrors.join(' | '));
  check('the page did not reload mid-run (HMR blocked)', navigations === bootNavigations, `${navigations - bootNavigations} reload(s)`);
  await browser.close();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (failures) {
    console.error(`\n${failures} wave check(s) failed (${secs} s)`);
    process.exit(1);
  }
  console.log(`\nPASS — every wave handle drags with a real mouse, previews live, and undoes as one step (${secs} s)${knownOpen ? `; ${knownOpen} known bug(s) still open` : ''}`);
}

main().catch((e) => { console.error('SMOKE FAILED:', e.message ?? e); process.exit(1); });
