/**
 * bootTrace — the last thing a phone did before it died (2026-09-11).
 *
 * The owner's iPhone showed the wall for a second, then Safari killed the tab, reloaded,
 * killed it again and gave up ("a problem repeatedly occurred"). Nothing here can attach
 * to that device: desktop Chromium, Pixel 5 emulation and Playwright's WebKit all boot the
 * shell clean at 20 MB of heap. When the failing engine cannot be brought to the bench,
 * the bench goes to the engine: this records the boot's milestones into localStorage AS
 * THEY HAPPEN (each write is synchronous, so a process kill a moment later cannot lose
 * it), and on the next load `?diag` shows the previous run's trail with its last mark.
 * "Died after `catalog:11131`" and "died after `wall-canvas`" are different bugs, and the
 * trail tells them apart from the phone's own screen.
 *
 * Since 2026-09-12 it also records `preMainMs` — how long the browser spent before this file
 * ran at all, which is the whole boot payload's fetch + parse. The trail alone could not tell
 * "the code took 9 s to arrive" from "the catalogue took 9 s to build", and those want
 * different work. It prints as `pre N.Ns` at the head of each run.
 *
 * Marks: `main` (this module ran) · `catalog:N` whenever the catalogue count on the rail
 * changes (core arrives first, the two licensed packs a moment later — the sprite is
 * rebuilt at 11,131 rows then) · `wall-canvas` (the first wall chunk exists) · `hero` (a
 * pick happened) · `alive-15s` (the run is ended normally) · `pagehide` (a normal leave,
 * also an end). A previous trail with NO end mark is a run that was killed.
 *
 * Costs one 250 ms poll for twenty seconds and a few hundred bytes of storage. Always on —
 * the data is worthless unless it was already being written when the crash came. Pairs
 * with `?lite` (registerFeatures.ts), which keeps the licensed packs off, so the two
 * together bisect "is it the 11,131-row wall" in two page loads.
 */
import React from 'react';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';

const KEY = 'gmt.ge.bootTrace';
/** A newline, built rather than written, so this file carries no escape a tool can halve. */
const NL = String.fromCharCode(10);
const POLL_MS = 250;
const WATCH_MS = 20000;
const ALIVE_MS = 15000;

interface Trace {
  started: number;
  /**
   * MILLISECONDS BEFORE THIS FILE RAN — `performance.now()` at module evaluation, which is
   * time since navigation started. Added 2026-09-12 to answer a question the trail could not:
   * the owner's iPhone 6 takes ~15 s to load, and nothing here could say how much of that was
   * spent before the app's own code began. A browser fetches and PARSES a module graph
   * completely before it evaluates any of it, so this number is the whole boot payload's
   * network + parse cost (2.17 MB decompressed across 24 chunks, 673 kB over the wire), and
   * the `main` mark that follows is the evaluation of everything that had not run yet.
   *
   * Read the two together. `pre 1.4s → main @0.3s → catalog:3076 @9.0s` says the code is not
   * the problem and the catalogue is; `pre 9.0s` says the opposite. That decides whether the
   * work is import boundaries in the engine or the sprite build, which are different sessions.
   *
   * ⚠ DEV SERVER ONLY: an HMR update re-evaluates this module in the SAME document, so `pre`
   * then reads the age of the tab rather than a boot — 138 s was observed on a page that had
   * been open a couple of minutes. Believe this number on a production build or a hard
   * reload; on `npm run dev` after an edit, it is measuring the wrong thing.
   */
  preMainMs: number;
  ua: string;
  view: string;
  marks: [string, number][];
  ended: boolean;
}

const read = (): Trace | null => {
  try {
    const raw = safeLocalGet(KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Trace;
    return Array.isArray(t.marks) ? t : null;
  } catch {
    return null;
  }
};

/** The run before this one, read once before the current run overwrites it. */
export const previousTrace: Trace | null = read();

const current: Trace = {
  started: Date.now(),
  // Rounded: this is a coarse budget, and a float here would be noise in a 6 px readout.
  preMainMs: typeof performance !== 'undefined' ? Math.round(performance.now()) : -1,
  ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  view: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}` : '',
  marks: [],
  ended: false,
};

const save = () => { safeLocalSet(KEY, JSON.stringify(current)); };

const listeners = new Set<() => void>();
export const mark = (name: string): void => {
  current.marks.push([name, Date.now() - current.started]);
  save();
  listeners.forEach((l) => l());
};

export const diagWanted: boolean = typeof location !== 'undefined' && new URLSearchParams(location.search).has('diag');

let started = false;
export const startBootTrace = (): void => {
  if (started || typeof document === 'undefined') return;
  started = true;
  mark('main');
  let lastCount: string | null = null;
  let wall = false;
  let hero = false;
  const t0 = Date.now();
  const timer = window.setInterval(() => {
    const el = document.querySelector('[data-gx-set-kind="catalog"]') as HTMLElement | null;
    const count = el?.dataset.gxSetCount ?? null;
    if (count && count !== lastCount) { lastCount = count; mark(`catalog:${count}`); }
    if (!wall && document.querySelector('[data-gx-keepselect] canvas')) { wall = true; mark('wall-canvas'); }
    if (!hero && document.querySelector('[data-gx-hero]')) { hero = true; mark('hero'); }
    const age = Date.now() - t0;
    if (age >= ALIVE_MS && !current.ended) { current.ended = true; mark('alive-15s'); }
    if (age >= WATCH_MS) window.clearInterval(timer);
  }, POLL_MS);
  window.addEventListener('pagehide', () => { current.ended = true; mark('pagehide'); });
};

const fmt = (t: Trace | null): string => {
  if (!t) return 'no previous run recorded';
  const trail = t.marks.map(([n, ms]) => `${n} @${(ms / 1000).toFixed(1)}s`).join(' → ');
  // `pre` is the fetch + parse of the whole graph; every @ after it is measured from there.
  const pre = typeof t.preMainMs === 'number' && t.preMainMs >= 0 ? `pre ${(t.preMainMs / 1000).toFixed(1)}s · ` : '';
  return `${t.ended ? 'ended normally' : 'DID NOT END (killed?)'} · ${pre}${t.view} · ${trail}`;
};

/**
 * A small fixed readout for `?diag`: the previous run's trail, then this run's, live.
 *
 * TAP IT TO COPY (2026-09-12). The whole point of this thing is a phone the bench cannot
 * reach, and the first version was `pointerEvents: 'none'` — so the one device that needs it
 * could not select the text, let alone send it anywhere. A tap copies the report now and the
 * box says so.
 *
 * Three ways out, because the target is an OLD phone: `navigator.clipboard` (iOS 13.4+), then
 * the `execCommand('copy')` path over a selection, and failing both the text is left SELECTED
 * with a note saying to copy it, which works anywhere there is a context menu. `user-select`
 * is on regardless, so a long-press works without the tap.
 */
export const BootDiag: React.FC = () => {
  const [, bump] = React.useState(0);
  const [said, setSaid] = React.useState<string | null>(null);
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const report = `previous run: ${fmt(previousTrace)}` + NL + `this run: ${fmt(current)}` + NL + `UA: ${current.ua.slice(0, 90)}`;
  const say = (msg: string) => { setSaid(msg); window.setTimeout(() => setSaid(null), 2500); };
  const selectSelf = (): boolean => {
    const el = boxRef.current;
    if (!el || typeof getSelection !== 'function') return false;
    const s = getSelection();
    if (!s) return false;
    const range = document.createRange();
    range.selectNodeContents(el);
    s.removeAllRanges();
    s.addRange(range);
    return true;
  };
  const copy = () => {
    const nav = navigator as Navigator & { clipboard?: { writeText?: (t: string) => Promise<void> } };
    if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      nav.clipboard.writeText(report).then(
        () => say('copied'),
        () => say(selectSelf() ? 'selected - long-press to copy' : 'could not copy'),
      );
      return;
    }
    const selected = selectSelf();
    let ok = false;
    try { ok = selected && document.execCommand('copy'); } catch { ok = false; }
    say(ok ? 'copied' : selected ? 'selected - long-press to copy' : 'could not copy');
  };
  return React.createElement(
    'div',
    {
      ref: boxRef,
      onClick: copy,
      title: 'Tap to copy this report',
      style: {
        position: 'fixed', left: 4, right: 4, bottom: 4, zIndex: 99999, padding: '8px 10px',
        font: '11px/1.4 ui-monospace, Menlo, monospace', color: '#fff', background: 'rgba(0,0,0,0.88)',
        border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, whiteSpace: 'pre-wrap',
        // The one device this exists for has to be able to get the text OFF it.
        pointerEvents: 'auto', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'pointer',
        maxHeight: '45vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      },
    },
    `${said ? said : 'tap to copy'} - ` + report,
  );
};
