/**
 * smoke:chrome — click every top-bar control and every menu item in every app, and fail on a
 * page error or the error-boundary fallback.
 *
 * WHY THIS EXISTS. From 2026-09-11 to 2026-09-12 the Settings gear crashed every app in
 * production: `SettingsPanel` called a hook below its `if (!open) return null`, React threw
 * "Rendered more hooks than during the previous render" on the one render that opened it, and
 * `AppErrorBoundary` replaced the app with its fallback page (fixed in 4215a65e). The smoke suite
 * stayed green, because `smoke:boot` only looks at boot and nothing clicked chrome
 * (plans/pre-release-ui-pass.md §3). This is the harness that clicks it.
 *
 * WHAT IT COVERS. Each app in `APPS` at desktop size (1400×900), plus a phone pass for the two
 * apps whose phone chrome differs: GX v2 (one combined Menu in a 393×851 Pixel 5) and app-gmt
 * (menus as a side panel — in the Pixel 5 turned LANDSCAPE, 851×393, because app-gmt held in
 * portrait shows only its "Landscape Recommended" gate). mesh-export has no top bar or menus and
 * is not listed; `index.html` is the same entry as `app-gmt.html`.
 *
 * DISCOVERY RULE (at runtime, nothing hard-coded — new chrome is covered the day it lands):
 *   1. The TOP BAR is the topmost visible `<header>` at least half the viewport wide: the engine's
 *      `<TopBarHost>` (every `topbar.register` / `menu.register` item renders inside it) and GX
 *      v2's hand-built bar, which is also a `<header>`.
 *   2. A CONTROL is any visible element that is a button, a link, a summary/select/checkbox/radio,
 *      has an ARIA button/tab/switch/menuitem/option role, or is the outermost element carrying
 *      `cursor: pointer` (that catches click-to-cycle spans such as the FPS readout). Nested
 *      matches collapse to the outermost. A top-bar control must also be inside the viewport;
 *      one that is laid out beyond it is reported as unreachable (a warning).
 *   3. A control is a MENU TRIGGER when it sits inside `[data-menu-anchor]` (the engine's
 *      `menu.register` anchor) or declares `aria-haspopup` (GX v2's `ShellMenuButton`). A
 *      hand-built dropdown whose trigger says neither is pressed, but its rows are not: give the
 *      trigger `aria-haspopup` (it should carry it for accessibility anyway) and they are.
 *   4. A MENU ROW is a control that appears after its trigger is pressed: a DOM node that did not
 *      exist before the press, outside the top bar, of a kind (tag + label) there are now more of
 *      than there were. That reads the engine popover (desktop), `MobileMenuHost`'s side panel
 *      (app-gmt on a phone) and GX v2's anchored menu alike, with no selector per host. The
 *      "more of its kind" half keeps a remount (a dock that unmounts while a menu takes its
 *      place) from reading as something new.
 *
 * ONE TEST = ONE PRESS FROM A CLEAN PAGE. Clean means: no boundary error, the top bar has the
 * control count it booted with, and no control that was not there at boot is visible. Getting
 * back to clean after a test: Escape ×2 and an outside `pointerdown` on `<body>` (what
 * `useDismiss` listens for); then, if a window is still up, its own close control (×, Close,
 * Done, Skip…, up to three presses — a close control is chrome too, and a crash there is
 * reported); then, failing that, a REBOOT: a fresh tab on an origin whose localStorage /
 * IndexedDB / Cache Storage has been wiped, so a toggle that persists (Hide Interface, a UI-mode
 * preference) cannot leak into the next test. A row test opens its menu afresh each time.
 *
 * WHAT FAILS. After each press, `SETTLE_MS`, then: a `pageerror`; `window.__lastBoundaryError`
 * or the fallback's own text ("Something broke while drawing the app" —
 * engine/components/AppErrorBoundary.tsx; a render crash is caught there and is NOT a
 * pageerror, so both are read); the page navigating away; a control that cannot be pressed
 * (covered by something, or gone after a fresh boot); a network write (below). Each failure is
 * named `menu › row` and printed with the presses since the last clean boot — the repro. Errors
 * that arrive after a test settled belong to it and are marked (late). A page that RELOADS under
 * a failing test (Vite's HMR while someone edits the tree, typically) gets one retry from a fresh
 * boot before it counts, and the retry is listed as a warning.
 *
 * BOOTED means: no loading screen over the viewport (a fixed layer covering its centre and 95% of
 * it that does not hold the top bar — app-gmt's LoadingScreen, ~7 s with the GPU) and the top
 * bar's control count still for `STABLE_MS`. AMBIENT CHROME: an app can keep mounting controls
 * after that (app-gmt on a phone adds its camera-mode button as the loading screen goes), and a
 * boot snapshot taken first would call it "left open" after every test. So each pass first
 * watches its untouched page until the controls have held still for `AMBIENT_QUIET_MS` (at most
 * `AMBIENT_MAX_MS`), and every later boot waits as long before it snapshots.
 *
 * NEVER (deny rule first, the browser context as the backstop):
 *   - `DENY` below: links (`a[href]` navigates) and anything whose label / title / aria-label says
 *     it signs in, shares / publishes / uploads / submits, downloads or saves a file, deletes or
 *     clears data, reloads, or opens an external site or another app in a new tab. Each skip is
 *     printed with its reason; disabled controls are skipped as disabled.
 *   - Every request that is not GET / HEAD / OPTIONS is ABORTED by a context route and reported
 *     as a FAILURE of the press that sent it: a control that writes to the network without saying
 *     so in its label is worth knowing about.
 *   - Downloads are refused (`acceptDownloads: false`), service workers blocked, alert / confirm /
 *     prompt dismissed (a confirm-guarded destructive action cancels), and any new tab is closed
 *     at once; each is listed as a warning.
 *
 * NOT COVERED: what is inside a window a control opens (Settings' tabs, the Help browser's
 * pages); rows that only exist in another state (Advanced Mode's extra System rows); popover rows
 * behind a trigger with no `aria-haspopup` (app-gmt's Viewport Quality, Shadow Settings);
 * controls outside the top bar (dock tabs, the GX hero and wall). Opening is covered; working
 * inside is not.
 *
 * SEEDED AS A RETURNING VISITOR (`seedGeSmokeState` plus `CHROME_SEED` below), like the other
 * smokes: a first-run surface over the chrome would otherwise be the thing under test.
 *
 * Usage (needs the Vite dev server; it does not start one):
 *   npm run smoke:chrome
 *   npm run smoke:chrome -- --app app-gmt            one app (repeatable, or comma-separated)
 *   npm run smoke:chrome -- --viewport phone         only phone passes (desktop | phone)
 *   npm run smoke:chrome -- --base http://localhost:4000
 *   npm run smoke:chrome -- --jobs 1                 passes run in parallel, 3 by default
 *   npm run smoke:chrome -- --list                   discover and press menu triggers only
 *   npm run smoke:chrome -- --verbose                every test as it runs, with timings
 *   npm run smoke:chrome -- --software               SwiftShader instead of the GPU (LAUNCH_ARGS)
 *
 * Exit 0 all green · 1 any failure · 2 no server / bad arguments / harness crash.
 *
 * @invariant A top-bar control or menu row whose press crashes the app fails this smoke, named. —
 *   proven by: `npm run smoke:chrome` ("FAIL "System › Settings…": pageerror: Rendered more hooks
 *   than during the previous render. | … | boundary caught: Error: Rendered more hooks than during
 *   the previous render."). Falsified 2026-09-16 by moving `useMobileLayout()` in
 *   components/SettingsPanel.tsx back below its `if (!open) return null` (the 77d3f9e4 shape that
 *   shipped on 2026-09-11): red in all six passes that mount Settings — app-gmt desktop and phone
 *   "System › Settings…", fluid-toy / gradient-explorer / GX v2 desktop "Settings", GX v2 phone
 *   "Menu › Settings" — and green again with the file restored byte-for-byte. fractal-toy mounts
 *   no Settings and stayed green.
 */
import { chromium, devices, type Browser, type BrowserContext, type Page } from 'playwright';
import { seedGeSmokeState } from './geSmokeBoot.mts';

// ── Configuration ────────────────────────────────────────────────────────────────────────────

type Viewport = 'desktop' | 'phone';
interface AppSpec {
    name: string;
    path: string;
    viewports: Viewport[];
    /** Playwright device for the phone pass (default Pixel 5). */
    phoneDevice?: string;
}

const APPS: AppSpec[] = [
    // landscape: app-gmt in portrait on a phone is only the "Landscape Recommended" gate
    { name: 'app-gmt', path: 'app-gmt.html', viewports: ['desktop', 'phone'], phoneDevice: 'Pixel 5 landscape' },
    { name: 'fluid-toy', path: 'fluid-toy.html', viewports: ['desktop'] },
    { name: 'fractal-toy', path: 'fractal-toy.html', viewports: ['desktop'] },
    { name: 'gradient-explorer', path: 'gradient-explorer.html', viewports: ['desktop'] },
    { name: 'gradient-explorer-next', path: 'gradient-explorer-next.html', viewports: ['desktop', 'phone'] },
];

/**
 * localStorage a returning visitor has, on top of `seedGeSmokeState`'s list (debug/geSmokeBoot.mts
 * is where these belong once another smoke needs them).
 */
const CHROME_SEED: Record<string, string> = {
    // engine-gmt/components/FirstRunHint.tsx — the "New here?" pill a first visit sees. Until
    // 2026-09-24 it sat ON the top bar and at 1400×900 covered High-res render, Expand Light
    // Studio, Shadow Settings and the light-gizmo button, which is why this seed began. It now
    // sits 8 px under the bar and covers no control (measured that day); a returning visitor
    // has dismissed it, so the seed stays.
    'gmt-firstrun-dismissed': '1',
};

/** After a press, before reading errors. The 2026-09-11 crash is synchronous with the press. */
const SETTLE_MS = 300;
/** After pressing a menu trigger, before reading its rows. */
const MENU_OPEN_MS = 200;
/** The top bar must hold the same control count this long before a boot counts as up. */
const STABLE_MS = 1000;
/** Ambient chrome (see the header): quiet this long counts as done mounting; watch no longer than max. */
const AMBIENT_QUIET_MS = 3000;
const AMBIENT_MAX_MS = 12000;
const BOOT_TIMEOUT_MS = 30000;

/**
 * DENY — never pressed, matched against `aria-label | title | text`, case-insensitive. The reason
 * is printed in the summary, so keep it short. Word boundaries on purpose: "Send Feedback" opens
 * a form (its own Send is never reached) and is pressed; "Restore Last Session" is not "store".
 */
const DENY: Array<[RegExp, string]> = [
    // network: an account, sharing, anything that posts
    [/\b(sign|log)[ -]?(in|out|up)\b|\baccount\b/i, 'signs in (network)'],
    [/\bshare\b|\bpublish\b|\bupload\b|\bsubmit\b|gx ?global/i, 'shares / uploads (network write)'],
    // a file handed to the browser
    [/\bdownload\b|\bsave\b|\bsnapshot\b|\bscreenshot\b/i, 'downloads a file'],
    // data loss
    [/\bdelete\b|\bremove\b|\bclear\b|\berase\b|\bwipe\b|\bforget\b|\bpurge\b|\bfactory\b/i, 'deletes data'],
    // leaves the page
    [/\breload\b|\brefresh\b|\brestart\b|\bupdate now\b|\binstall update\b/i, 'reloads the page'],
    [/\bdonate\b|ko-?fi|paypal|patreon|github|discord|reddit|youtube|\bwebsite\b|\bnew tab\b|\bopen (fluid|fractal) toy\b|\bopen gradient explorer\b/i, 'opens an external site / new tab'],
];

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const argValues = (flag: string): string[] => {
    const out: string[] = [];
    argv.forEach((a, i) => {
        if (a === flag && argv[i + 1]) out.push(...argv[i + 1].split(','));
        else if (a.startsWith(`${flag}=`)) out.push(...a.slice(flag.length + 1).split(','));
    });
    return out.map((s) => s.trim()).filter(Boolean);
};
const BASE = (argValues('--base')[0] || process.env.SMOKE_BASE || 'http://localhost:3400').replace(/\/$/, '');
const ONLY_APPS = argValues('--app');
const ONLY_VIEWPORTS = argValues('--viewport') as Viewport[];
const JOBS = Math.max(1, Number(argValues('--jobs')[0] ?? 3) || 3);
const LIST_ONLY = argv.includes('--list');
const VERBOSE = argv.includes('--verbose');
const SOFTWARE = argv.includes('--software');

/**
 * The real GPU by default on Windows (ANGLE → D3D11); SwiftShader elsewhere or with --software.
 * Not a nicety: fluid-toy renders on the main thread, and under SwiftShader at 1400×900 each frame
 * holds that thread ~1 s until the image converges (~70 s), so every page round trip waited a
 * second and a single test is a dozen of them (measured 2026-09-16: 1049 ms per evaluate on
 * SwiftShader, 1 ms on an RTX 2070). A software run still works, slowly. The renderer in use is
 * printed first.
 */
const LAUNCH_ARGS = !SOFTWARE && process.platform === 'win32'
    ? ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-sandbox']
    : ['--disable-gpu-sandbox'];

// ── In-page helper ───────────────────────────────────────────────────────────────────────────
// A string, not functions passed to evaluate: tsx wraps named functions in a `__name` helper that
// does not exist in the page. Inside this template literal a regex backslash is written twice.

const PAGE_HELPER = `
(function () {
  if (window.__smokeChrome) return;
  var CLICKABLE = 'button, a[href], summary, select, input[type="checkbox"], input[type="radio"], [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"]';
  var MARK = 'data-smoke-chrome-target';
  var CLOSER = /^(close|close .{1,30}|×|✕|✖|x|done|dismiss|cancel|skip|skip .{1,20})$/i;
  var snaps = { boot: null, pre: null };
  var last = [];
  var landed = null;

  function clean(s) { return String(s || '').replace(/\\s+/g, ' ').trim(); }
  /* Laid out and not hidden; onScreen also wants the box to touch the viewport (a top-bar
     control must; a menu row may be below the fold of its own scroll box). */
  function visible(el, onScreen) {
    if (!el.isConnected) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (onScreen && (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight)) return false;
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    return true;
  }
  function clickable(el) {
    if (el.matches(CLICKABLE)) return true;
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return false;
    if (getComputedStyle(el).cursor !== 'pointer') return false;
    var p = el.parentElement;
    return !(p && getComputedStyle(p).cursor === 'pointer');
  }
  /* candidates -> visible, outermost only, document order */
  function reduce(cands, onScreen) {
    var set = new Set(cands);
    return cands.filter(function (el) {
      if (!visible(el, onScreen)) return false;
      for (var p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false;
      return true;
    });
  }
  function topBar() {
    var hs = Array.prototype.slice.call(document.querySelectorAll('header')).filter(function (h) {
      return visible(h, true) && h.getBoundingClientRect().width >= innerWidth * 0.5;
    });
    hs.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
    return hs[0] || null;
  }
  function describe(el, mode, i) {
    var aria = clean(el.getAttribute('aria-label'));
    var title = clean((el.getAttribute('title') || '').split('\\n')[0]);
    var text = clean(el.innerText || el.textContent).slice(0, 80);
    var label = mode === 'top' ? (aria || title || text) : (aria || text || title);
    if (!label) {
      var img = el.querySelector('img[alt]');
      var alt = img ? clean(img.getAttribute('alt')) : '';
      var ctx = el.parentElement ? clean(el.parentElement.innerText).slice(0, 40) : '';
      label = alt ? 'image "' + alt + '"' : ('unlabeled <' + el.tagName.toLowerCase() + '>' + (ctx ? ' in "' + ctx + '"' : ' #' + i));
    }
    return {
      i: i, tag: el.tagName.toLowerCase(), label: label, aria: aria, title: title, text: text,
      href: el.tagName === 'A' ? (el.getAttribute('href') || '') : '',
      target: el.getAttribute('target') || '',
      disabled: !!(el.disabled || el.getAttribute('aria-disabled') === 'true'),
      menu: !!(el.closest('[data-menu-anchor]') || /^(true|menu|listbox|dialog)$/.test(el.getAttribute('aria-haspopup') || '')),
    };
  }
  function headerClickables(h, onScreen) {
    return reduce(Array.prototype.slice.call(h.querySelectorAll('*')).filter(clickable), onScreen);
  }
  function topControls() {
    var h = topBar();
    if (!h) { last = []; return null; }
    last = headerClickables(h, true);
    return last.map(function (el, i) { return describe(el, 'top', i); });
  }
  function offscreenTop() {
    var h = topBar();
    if (!h) return [];
    var on = new Set(headerClickables(h, true));
    return headerClickables(h, false).filter(function (el) { return !on.has(el); }).map(function (el, i) { return describe(el, 'top', i).label; });
  }
  function bodyClickables() {
    var h = topBar();
    return reduce(Array.prototype.slice.call(document.querySelectorAll('body *')).filter(function (el) {
      return !(h && h.contains(el)) && clickable(el);
    }), false);
  }
  function key(el) { var d = describe(el, 'item', 0); return d.tag + '|' + d.label; }
  function countKeys(list) {
    var m = new Map();
    list.forEach(function (el) { var k = key(el); m.set(k, (m.get(k) || 0) + 1); });
    return m;
  }
  function snap(which) {
    snaps[which] = { nodes: new WeakSet(document.querySelectorAll('*')), counts: countKeys(bodyClickables()) };
  }
  /* new node AND more of its kind (tag + label) than at the snapshot */
  function newClickables(which) {
    var s = snaps[which];
    var all = bodyClickables();
    if (!s) return all;
    var now = countKeys(all);
    var used = new Map();
    return all.filter(function (el) {
      if (s.nodes.has(el)) return false;
      var k = key(el);
      var extra = (now.get(k) || 0) - (s.counts.get(k) || 0);
      var u = used.get(k) || 0;
      if (u >= extra) return false;
      used.set(k, u + 1);
      return true;
    });
  }
  /* A loading screen or device gate: a fixed / absolute layer covering the viewport's centre and
     at least 95% of it, that does not contain the top bar. app-gmt's LoadingScreen is one (up for
     ~7 s, and its chrome keeps mounting under it). Returns a description, or null. */
  function splash() {
    var h = topBar();
    for (var n = document.elementFromPoint(innerWidth / 2, innerHeight / 2); n && n !== document.body; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
      var r = n.getBoundingClientRect();
      if (r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.95 && !(h && n.contains(h))) {
        return '<' + n.tagName.toLowerCase() + '> "' + clean(n.innerText).slice(0, 40) + '"';
      }
    }
    return null;
  }
  /* what the page shows, for the ambient watch: the top-bar count and every control's kind */
  function signature() {
    var h = topBar();
    var keys = bodyClickables().map(key);
    keys.sort();
    return (h ? headerClickables(h, true).length : -1) + '#' + keys.join('\\n');
  }
  function items() {
    last = newClickables('pre');
    return last.map(function (el, i) { return describe(el, 'item', i); });
  }
  function mark(i) {
    Array.prototype.forEach.call(document.querySelectorAll('[' + MARK + ']'), function (el) { el.removeAttribute(MARK); });
    var el = last[i];
    if (!el || !el.isConnected) return false;
    el.setAttribute(MARK, '1');
    return true;
  }
  function state() {
    var e = window.__lastBoundaryError;
    var boundary = e == null ? null : (e instanceof Error ? e.name + ': ' + e.message : String(e));
    var fallback = !!(document.body && document.body.innerText.indexOf('Something broke while drawing the app') >= 0);
    var h = topBar();
    return { boundary: boundary, fallback: fallback, controls: h ? headerClickables(h, true).length : -1, strays: newClickables('boot').length };
  }
  function strayLabels() {
    return newClickables('boot').slice(0, 6).map(function (el, i) { return describe(el, 'item', i).label; });
  }
  function outside() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var ev = typeof PointerEvent === 'function'
      ? new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      : new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
  }
  /* Where to press the marked element: the first of its centre and four inset points that
     hit-tests to the element itself (a covered control is reported, not pressed through). Arms a
     one-shot capture listener so the caller can confirm the press landed on it: the engine's
     right-hand slot shifts whenever the FPS readout changes width. */
  function aim() {
    var el = document.querySelector('[' + MARK + ']');
    if (!el || !el.isConnected) return { err: 'the element went away before it could be pressed' };
    var r = el.getBoundingClientRect();
    if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      r = el.getBoundingClientRect();
    }
    var pts = [[0.5, 0.5], [0.3, 0.5], [0.7, 0.5], [0.5, 0.3], [0.5, 0.7]];
    var hit = null;
    for (var k = 0; k < pts.length; k++) {
      var x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width * pts[k][0]));
      var y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height * pts[k][1]));
      hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) {
        landed = false;
        document.addEventListener('click', function (ev) { landed = !!(ev.target && (ev.target === el || el.contains(ev.target))); }, { capture: true, once: true });
        return { x: x, y: y };
      }
    }
    return { err: hit ? 'covered by <' + hit.tagName.toLowerCase() + '> "' + describe(hit, 'item', 0).label.slice(0, 50) + '"' : 'off-screen' };
  }
  function didLand() { var v = landed; landed = null; return v; }
  /* a window Escape did not close: mark its own close control, return its label (or null) */
  function markCloser() {
    var list = newClickables('boot');
    for (var k = 0; k < list.length; k++) {
      var d = describe(list[k], 'item', k);
      if (d.disabled) continue;
      if (CLOSER.test(d.aria) || CLOSER.test(d.title) || CLOSER.test(d.text)) { last = list; mark(k); return d.label; }
    }
    return null;
  }
  window.__smokeChrome = {
    topControls: topControls, offscreenTop: offscreenTop, items: items, mark: mark, snap: snap,
    signature: signature, splash: splash, state: state, strayLabels: strayLabels, outside: outside, aim: aim,
    didLand: didLand, markCloser: markCloser,
  };
})();
`;

// ── Types / helpers ──────────────────────────────────────────────────────────────────────────

interface Desc {
    i: number; tag: string; label: string; aria: string; title: string; text: string;
    href: string; target: string; disabled: boolean; menu: boolean;
}
interface PageState { boundary: string | null; fallback: boolean; controls: number; strays: number }
interface Failure { name: string; error: string; trail: string[] }
interface Report {
    app: string; viewport: Viewport; clicked: number; skipped: Array<{ name: string; why: string }>;
    failures: Failure[]; warnings: string[]; boots: number; ms: number; lines: string[];
}
type Outcome =
    | { kind: 'ok'; rows?: Desc[] }
    | { kind: 'skip'; why: string }
    | { kind: 'fail'; name: string; errors: string[] };

const denyReason = (d: Desc): string | null => {
    if (d.tag === 'a' && d.href && !d.href.startsWith('#')) return `link (navigates to ${d.href})`;
    if (d.target === '_blank') return 'opens a new tab';
    const hay = `${d.aria} | ${d.title} | ${d.text}`;
    for (const [re, why] of DENY) if (re.test(hay)) return why;
    return null;
};

/** Matching a row across re-opens: live suffixes (ON/OFF, NEW, ✓, ●) are not its identity. */
const norm = (s: string) => s.replace(/\b(ON|OFF|NEW)\b/g, '').replace(/[✓●]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const pickByLabel = (list: Desc[], want: Desc): Desc | null => list.find((d) => norm(d.label) === norm(want.label)) ?? null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const firstLine = (e: unknown) => String((e as Error)?.message ?? e).split('\n')[0];

// ── Session: one tab on one app, rebootable ──────────────────────────────────────────────────

class Session {
    page!: Page;
    boots = 0;
    baselineControls = 0;
    /** The presses since the last clean boot — printed with a failure as its repro. */
    trail: string[] = [];
    /** How long after navigation this app keeps mounting chrome by itself (learnAmbient). */
    ambientMs = 0;
    private errors: string[] = [];
    private navigations = 0;
    private navigationsAtBoot = 0;
    private navigatedAt = 0;
    readonly url: string;

    constructor(private ctx: BrowserContext, app: AppSpec, private report: Report, private touch: boolean,
                private log: (msg: string) => void) {
        this.url = `${BASE}/${app.path}`;
    }

    /** A fresh tab on a wiped origin, up and snapshotted. Returns the top-bar controls. */
    async boot(why = ''): Promise<Desc[]> {
        if (why) this.log(`  reboot: ${why}`);
        if (this.page && !this.page.isClosed()) await this.page.close().catch(() => {});
        this.page = await this.ctx.newPage();
        this.boots++;
        this.errors = [];
        this.trail = [];
        this.navigations = 0;
        const cdp = await this.ctx.newCDPSession(this.page);
        await cdp.send('Storage.clearDataForOrigin', {
            origin: new URL(BASE).origin,
            storageTypes: 'local_storage,indexeddb,websql,cache_storage,service_workers,file_systems',
        }).catch(() => {});
        await cdp.detach().catch(() => {});
        const page = this.page;
        page.on('pageerror', (e) => this.errors.push(`pageerror: ${firstLine(e)}`));
        page.on('framenavigated', (f) => { if (f === page.mainFrame()) this.navigations++; });
        page.on('dialog', (d) => {
            this.report.warnings.push(`${this.where()}: a ${d.type()} dialog ("${d.message().slice(0, 80)}") was dismissed`);
            d.dismiss().catch(() => {});
        });
        page.on('download', (d) => this.report.warnings.push(`${this.where()}: a download (${d.suggestedFilename()}) was refused`));
        this.navigatedAt = Date.now();
        await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
        let bar = await this.waitForTopBar();
        const age = Date.now() - this.navigatedAt;
        if (age < this.ambientMs) {
            await sleep(this.ambientMs - age);
            await this.page.evaluate('window.__smokeChrome.snap("boot")');
            bar = await this.topControls();
            this.baselineControls = bar.length;
        }
        this.navigationsAtBoot = this.navigations;
        return bar;
    }

    /**
     * Once per pass, on the untouched first boot: watch until the page's controls have held still
     * for AMBIENT_QUIET_MS (at most AMBIENT_MAX_MS after navigation), and remember when they last
     * changed so every boot waits that long before its snapshot. See AMBIENT CHROME in the header.
     */
    async learnAmbient(): Promise<void> {
        let sig = (await this.page.evaluate('window.__smokeChrome.signature()')) as string;
        const watchFrom = Date.now();
        let changedAt = 0;
        while (true) {
            const quietFor = Date.now() - Math.max(changedAt, watchFrom);
            if (Date.now() - this.navigatedAt >= AMBIENT_MAX_MS || quietFor >= AMBIENT_QUIET_MS) break;
            await sleep(250);
            const now = (await this.page.evaluate('window.__smokeChrome.signature()').catch(() => sig)) as string;
            if (now !== sig) { sig = now; changedAt = Date.now(); }
        }
        if (changedAt) {
            this.ambientMs = changedAt - this.navigatedAt + 300;
            await this.page.evaluate('window.__smokeChrome.snap("boot")');
            this.baselineControls = (await this.topControls()).length;
            this.log(`chrome kept mounting until ${(this.ambientMs / 1000).toFixed(1)} s after load — every boot waits that long`);
        }
    }

    private where() { return this.trail.length ? `after "${this.trail[this.trail.length - 1]}"` : 'at boot'; }

    /**
     * Up = no loading screen over the viewport (helper `splash`) and the top bar's control count
     * held still for STABLE_MS. Then snapshot the DOM as "boot".
     */
    private async waitForTopBar(): Promise<Desc[]> {
        const t0 = Date.now();
        let lastCount = -1;
        let since = Date.now();
        let cover: string | null = null;
        while (Date.now() - t0 < BOOT_TIMEOUT_MS) {
            const list = (await this.page.evaluate('window.__smokeChrome.topControls()').catch(() => null)) as Desc[] | null;
            cover = (await this.page.evaluate('window.__smokeChrome.splash()').catch(() => 'the page is not answering')) as string | null;
            const n = list && !cover ? list.length : -1;
            if (n !== lastCount) { lastCount = n; since = Date.now(); }
            else if (n > 0 && Date.now() - since >= STABLE_MS) {
                await this.page.evaluate('window.__smokeChrome.snap("boot")');
                this.baselineControls = n;
                return list!;
            }
            await sleep(150);
        }
        const st = await this.state().catch(() => null);
        if (st?.boundary || st?.fallback) throw new Error(`the app booted into the error boundary: ${st.boundary ?? 'fallback page shown'}`);
        throw new Error(cover
            ? `still covered by ${cover} ${BOOT_TIMEOUT_MS / 1000} s after load`
            : `no top bar with controls ${BOOT_TIMEOUT_MS / 1000} s after load`);
    }

    state(): Promise<PageState> { return this.page.evaluate('window.__smokeChrome.state()') as Promise<PageState>; }

    /** The document was replaced since boot without us asking — a dev-server reload, usually. */
    reloadedSinceBoot(): boolean { return this.navigations > this.navigationsAtBoot; }

    /** Page errors since the last call, the boundary, a navigation. Non-empty = a failure. */
    async problems(): Promise<string[]> {
        const out = this.errors.splice(0);
        let why = '';
        const st = await this.state().catch((e) => { why = firstLine(e); return null; });
        if (!st) out.push(`the page stopped answering (${why})`);
        else if (st.boundary) out.push(`boundary caught: ${st.boundary}`);
        else if (st.fallback) out.push('the error-boundary fallback page is showing');
        if (new URL(this.page.url()).pathname !== new URL(this.url).pathname) out.push(`the page navigated to ${this.page.url()}`);
        else if (this.reloadedSinceBoot()) out.push('the page reloaded');
        return out;
    }

    /** Escape ×2 + an outside press; true if that got the page back to its boot state. */
    private async settle(): Promise<boolean> {
        try {
            await this.page.keyboard.press('Escape');
            await sleep(50);
            await this.page.keyboard.press('Escape');
            await this.page.evaluate('window.__smokeChrome.outside()');
            await sleep(150);
            const st = await this.state();
            return !st.boundary && !st.fallback && st.controls === this.baselineControls && st.strays === 0
                && !this.reloadedSinceBoot();
        } catch {
            return false;
        }
    }

    /**
     * Back to the boot state: settle; then a still-open window's own close control (up to three);
     * then a reboot. Returns the problems a close press caused, named, for the caller to report.
     */
    async ensureClean(): Promise<{ name: string; errors: string[] } | null> {
        if (await this.settle()) return null;
        for (let k = 0; k < 3 && !this.reloadedSinceBoot(); k++) {
            const closer = (await this.page.evaluate('window.__smokeChrome.markCloser()').catch(() => null)) as string | null;
            if (!closer) break;
            const opened = this.trail[this.trail.length - 1] ?? '(boot)';
            if (await this.pressMarked()) break;
            this.trail.push(`${closer} (closing it)`);
            await sleep(SETTLE_MS);
            const probs = await this.problems();
            if (probs.length) return { name: `"${closer}" closing what "${opened}" opened`, errors: probs };
            if (await this.settle()) return null;
        }
        if (VERBOSE) {
            const strays = await this.page.evaluate('window.__smokeChrome.strayLabels()').catch(() => []);
            this.log(`  still open: ${JSON.stringify(strays)} — rebooting`);
        }
        await this.boot();
        return null;
    }

    async topControls(): Promise<Desc[]> {
        return ((await this.page.evaluate('window.__smokeChrome.topControls()').catch(() => null)) as Desc[] | null) ?? [];
    }

    /** Find a boot-time control again: same slot if the bar has its boot shape, else by label. */
    async findTop(t: Desc): Promise<Desc | null> {
        const list = await this.topControls();
        if (list.length === this.baselineControls && list[t.i]?.tag === t.tag) return list[t.i];
        return pickByLabel(list, t);
    }

    /** Mark element `i` of the last listing and press it. Returns why it could not be pressed. */
    async pressIndex(i: number): Promise<string | null> {
        const ok = await this.page.evaluate(`window.__smokeChrome.mark(${i})`).catch(() => false);
        if (!ok) return 'the element went away before it could be pressed';
        return this.pressMarked();
    }

    /**
     * Press the marked element the way a person would: a mouse click on desktop, a tap on the
     * phone. Not `locator.click`: its "stable for two frames" wait never settles on the engine's
     * right-hand slot, which moves whenever the FPS readout changes width.
     */
    private async pressMarked(): Promise<string | null> {
        let why = '';
        for (let attempt = 0; attempt < 3; attempt++) {
            const aim = (await this.page.evaluate('window.__smokeChrome.aim()').catch((e) => ({ err: firstLine(e) }))) as { x?: number; y?: number; err?: string };
            if (aim.err) { why = aim.err; await sleep(150); continue; }
            if (this.touch) await this.page.touchscreen.tap(aim.x!, aim.y!);
            else await this.page.mouse.click(aim.x!, aim.y!);
            // true, or null when the handler replaced the document under the listener: pressed.
            // false: the press hit something else — the target moved between aim and press.
            const landed = await this.page.evaluate('window.__smokeChrome.didLand()').catch(() => true);
            if (landed !== false) return null;
            why = 'the press landed beside it (the element moved)';
            await sleep(150);
        }
        return why;
    }
}

// ── One app × viewport ───────────────────────────────────────────────────────────────────────

async function runPass(browser: Browser, app: AppSpec, viewport: Viewport, live: boolean): Promise<Report> {
    const report: Report = { app: app.name, viewport, clicked: 0, skipped: [], failures: [], warnings: [], boots: 0, ms: 0, lines: [] };
    const t0 = Date.now();
    const out = (line: string) => { if (live) console.log(line); else report.lines.push(line); };
    const vlog = (msg: string) => { if (VERBOSE) out(`    ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)} s  ${msg}`); };

    const ctx = await browser.newContext({
        ...(viewport === 'phone' ? devices[app.phoneDevice ?? 'Pixel 5'] : { viewport: { width: 1400, height: 900 } }),
        acceptDownloads: false,
        serviceWorkers: 'block',
    });
    await seedGeSmokeState(ctx);
    await ctx.addInitScript((seed: Record<string, string>) => {
        try { for (const k of Object.keys(seed)) window.localStorage.setItem(k, seed[k]); } catch { /* storage off */ }
    }, CHROME_SEED);
    await ctx.addInitScript({ content: PAGE_HELPER });
    const session = new Session(ctx, app, report, viewport === 'phone', vlog);
    const lastPress = () => session.trail[session.trail.length - 1] ?? '(boot)';

    // Never write to the network: abort anything that is not a read, and fail the press that sent it.
    await ctx.route('**/*', (route) => {
        const req = route.request();
        const m = req.method();
        if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue();
        if (session.trail.length) {
            report.failures.push({
                name: lastPress(),
                error: `sent a network write (${m} ${req.url().slice(0, 120)}) — aborted; say so in its label, or add it to DENY`,
                trail: [...session.trail],
            });
        } else {
            report.warnings.push(`at boot: ${m} ${req.url().slice(0, 120)} was aborted`);
        }
        return route.abort();
    });
    ctx.on('page', (p) => {
        // Session.boot opens its own tabs; anything else is a popup a control opened
        setTimeout(() => {
            if (p !== session.page && !p.isClosed()) {
                report.warnings.push(`after "${lastPress()}": a new tab opened (${p.url()}) and was closed`);
                p.close().catch(() => {});
            }
        }, 50);
    });

    const recordFailure = async (name: string, errors: string[]) => {
        report.failures.push({ name, error: errors.join(' | '), trail: [...session.trail] });
        out(`  ✗ ${name} — ${errors.join(' | ')}`);
        await session.boot('after a failure');
    };

    /** Press a top-bar control. `counts`: this press is the test (not a menu being reopened). */
    const pressTop = async (t: Desc, counts: boolean): Promise<Outcome> => {
        let found = await session.findTop(t);
        if (!found) { await session.boot('control not found'); found = await session.findTop(t); }
        if (!found) return { kind: 'fail', name: t.label, errors: ['not in the top bar after a fresh boot'] };
        if (found.disabled) return { kind: 'skip', why: 'disabled' };
        await session.page.evaluate('window.__smokeChrome.snap("pre")');
        const err = await session.pressIndex(found.i);
        if (err) return { kind: 'fail', name: t.label, errors: [`could not be pressed: ${err}`] };
        session.trail.push(t.label);
        if (counts) report.clicked++;
        await sleep(t.menu ? MENU_OPEN_MS : SETTLE_MS);
        const probs = await session.problems();
        if (probs.length) return { kind: 'fail', name: t.label, errors: probs };
        if (!t.menu) return { kind: 'ok' };
        return { kind: 'ok', rows: (await session.page.evaluate('window.__smokeChrome.items()')) as Desc[] };
    };

    /** Open `t`'s menu afresh and press row `r` (as listed on the first open). */
    const pressRow = async (t: Desc, r: Desc, rowCount: number): Promise<Outcome> => {
        const name = `${t.label} › ${r.label}`;
        let row: Desc | null = null;
        for (let attempt = 0; attempt < 2 && !row; attempt++) {
            if (attempt === 1) await session.boot('row not found');
            const open = await pressTop(t, false);
            if (open.kind !== 'ok') return open;
            const rows = open.rows ?? [];
            row = rows.length === rowCount && norm(rows[r.i]?.label ?? '') === norm(r.label) ? rows[r.i] : pickByLabel(rows, r);
        }
        if (!row) return { kind: 'fail', name, errors: ['the row was not in the menu after a fresh boot'] };
        if (row.disabled) return { kind: 'skip', why: 'disabled' };
        const err = await session.pressIndex(row.i);
        if (err) return { kind: 'fail', name, errors: [`could not be pressed: ${err}`] };
        session.trail.push(name);
        report.clicked++;
        await sleep(SETTLE_MS);
        const probs = await session.problems();
        return probs.length ? { kind: 'fail', name, errors: probs } : { kind: 'ok' };
    };

    /** One test from a clean page, with late errors and the reload retry (see the header). */
    const runTest = async (label: string, fn: () => Promise<Outcome>): Promise<Outcome> => {
        for (let attempt = 0; ; attempt++) {
            if (session.trail.length) {
                const late = await session.problems();
                if (late.length && session.reloadedSinceBoot()) {
                    report.warnings.push(`the page reloaded after "${lastPress()}" (dev-server HMR?) — rebooted`);
                    await session.boot('page reloaded');
                } else if (late.length) {
                    await recordFailure(`${lastPress()} (late)`, late);
                }
            }
            const closing = await session.ensureClean();
            if (closing) await recordFailure(closing.name, closing.errors);
            const res = await fn();
            if (res.kind === 'fail' && session.reloadedSinceBoot() && attempt === 0) {
                report.warnings.push(`"${label}": the page reloaded during the test (dev-server HMR?) — retried from a fresh boot`);
                await session.boot('page reloaded during the test');
                continue;
            }
            if (res.kind === 'fail') await recordFailure(res.name, res.errors);
            return res;
        }
    };

    try {
        await session.boot();
        await session.learnAmbient();
        const bar = await session.topControls();
        const bootProblems = await session.problems();
        if (bootProblems.length) await recordFailure('(boot)', bootProblems);
        vlog('booted');
        out(`  top bar: ${bar.length} controls — ${bar.map((d) => d.label + (d.menu ? ' ▾' : '')).join(' · ')}`);
        const offscreen = (await session.page.evaluate('window.__smokeChrome.offscreenTop()')) as string[];
        if (offscreen.length) report.warnings.push(`top-bar controls outside the viewport, so unreachable: ${offscreen.join(' · ')}`);

        for (const t of bar) {
            const why = denyReason(t) ?? (t.disabled ? 'disabled' : null);
            if (why) { report.skipped.push({ name: t.label, why }); continue; }
            if (LIST_ONLY && !t.menu) continue;

            const top = await runTest(t.label, () => pressTop(t, true));
            vlog(`${t.label}${top.kind === 'fail' ? ' ✗' : top.kind === 'skip' ? ` (skipped: ${top.why})` : ''}`);
            if (top.kind === 'skip') report.skipped.push({ name: t.label, why: top.why });
            if (top.kind !== 'ok' || !t.menu) continue;

            const rows = top.rows ?? [];
            if (rows.length === 0) { report.warnings.push(`"${t.label}" opened no rows`); continue; }
            out(`  ${t.label} ▾ ${rows.length} rows — ${rows.map((r) => r.label).join(' · ')}`);

            for (const r of rows) {
                const name = `${t.label} › ${r.label}`;
                const rWhy = denyReason(r) ?? (r.disabled ? 'disabled' : null);
                if (rWhy) { report.skipped.push({ name, why: rWhy }); continue; }
                if (LIST_ONLY) continue;
                const res = await runTest(name, () => pressRow(t, r, rows.length));
                vlog(`${name}${res.kind === 'fail' ? ' ✗' : res.kind === 'skip' ? ` (skipped: ${res.why})` : ''}`);
                if (res.kind === 'skip') report.skipped.push({ name, why: res.why });
            }
        }
        // anything that surfaced after the last test
        await sleep(SETTLE_MS);
        if (session.trail.length) {
            const late = await session.problems();
            if (late.length && !session.reloadedSinceBoot()) {
                report.failures.push({ name: `${lastPress()} (late)`, error: late.join(' | '), trail: [...session.trail] });
            }
        }
    } catch (e) {
        report.failures.push({ name: '(harness)', error: firstLine(e), trail: [...session.trail] });
        out(`  ✗ (harness) — ${firstLine(e)}`);
    } finally {
        report.boots = session.boots;
        report.ms = Date.now() - t0;
        await ctx.close().catch(() => {});
    }
    return report;
}

// ── Main ─────────────────────────────────────────────────────────────────────────────────────

async function main() {
    try {
        const res = await fetch(`${BASE}/`, { method: 'HEAD' });
        if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
        console.log(`[smoke:chrome] no server at ${BASE} (${firstLine(e)}). Run \`npm run dev\` first, or pass --base.`);
        process.exitCode = 2;
        return;
    }
    const unknown = ONLY_APPS.filter((a) => !APPS.some((s) => s.name === a));
    const badVp = ONLY_VIEWPORTS.filter((v) => v !== 'desktop' && v !== 'phone');
    if (unknown.length || badVp.length) {
        console.log(`[smoke:chrome] unknown ${unknown.length ? `--app ${unknown.join(', ')} (known: ${APPS.map((a) => a.name).join(', ')})` : `--viewport ${badVp.join(', ')} (desktop | phone)`}`);
        process.exitCode = 2;
        return;
    }

    const passes = APPS.flatMap((app) => app.viewports.map((vp) => ({ app, vp })))
        .filter(({ app, vp }) => (!ONLY_APPS.length || ONLY_APPS.includes(app.name)) && (!ONLY_VIEWPORTS.length || ONLY_VIEWPORTS.includes(vp)));
    const jobs = Math.min(JOBS, passes.length);

    const browser = await chromium.launch({ args: LAUNCH_ARGS });
    {
        const p = await browser.newPage();
        const renderer = await p.evaluate(`(function () { var gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return 'no WebGL2'; var e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`).catch(() => 'unknown');
        console.log(`[smoke:chrome] ${BASE} · ${passes.length} passes, ${jobs} at a time · WebGL: ${renderer}`);
        await p.close();
    }

    const t0 = Date.now();
    const reports: Report[] = new Array(passes.length);
    let next = 0;
    await Promise.all(Array.from({ length: jobs }, async () => {
        while (next < passes.length) {
            const k = next++;
            const { app, vp } = passes[k];
            const live = jobs === 1;
            if (live) console.log(`\n── ${app.name} · ${vp} ──`);
            const r = await runPass(browser, app, vp, live);
            reports[k] = r;
            if (!live) {
                console.log(`\n── ${app.name} · ${vp} ── (${(r.ms / 1000).toFixed(1)} s)`);
                r.lines.forEach((l) => console.log(l));
            }
        }
    }));
    await browser.close();

    console.log('\n══ smoke:chrome summary ══');
    let failed = 0;
    for (const r of reports) {
        failed += r.failures.length;
        console.log(`\n${r.failures.length ? '✗' : '✓'} ${r.app} · ${r.viewport}: clicked ${r.clicked}, skipped ${r.skipped.length}, failed ${r.failures.length}  (${(r.ms / 1000).toFixed(1)} s, ${r.boots} boot${r.boots === 1 ? '' : 's'})`);
        if (r.skipped.length) console.log(`    skipped: ${r.skipped.map((s) => `"${s.name}" (${s.why})`).join(', ')}`);
        for (const w of r.warnings) console.log(`    warning: ${w}`);
        for (const f of r.failures) {
            console.log(`    FAIL "${f.name}": ${f.error}`);
            if (f.trail.length > 1) {
                const tail = f.trail.slice(-12);
                console.log(`         presses since the last clean boot: ${f.trail.length > tail.length ? `(${f.trail.length - tail.length} earlier) … → ` : ''}${tail.join(' → ')}`);
            }
        }
    }
    console.log(`\n${failed ? `✗ ${failed} failure(s)` : '✓ no failures'} in ${reports.length} passes, ${((Date.now() - t0) / 1000).toFixed(1)} s${LIST_ONLY ? ' (--list: rows were listed, not pressed)' : ''}`);
    // exitCode, not exit(): exit() on a piped stdout can drop the summary just printed
    process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
    console.error('[smoke:chrome] harness error:', e);
    process.exitCode = 2;
});
