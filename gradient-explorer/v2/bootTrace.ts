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
const POLL_MS = 250;
const WATCH_MS = 20000;
const ALIVE_MS = 15000;

interface Trace {
  started: number;
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
  return `${t.ended ? 'ended normally' : 'DID NOT END (killed?)'} · ${t.view} · ${trail}`;
};

/** A small fixed readout for `?diag`: the previous run's trail, then this run's, live. */
export const BootDiag: React.FC = () => {
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed', left: 4, right: 4, bottom: 4, zIndex: 99999, padding: '6px 8px',
        font: '11px/1.35 ui-monospace, Menlo, monospace', color: '#fff', background: 'rgba(0,0,0,0.82)',
        border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, pointerEvents: 'none', whiteSpace: 'pre-wrap',
      },
    },
    `previous run: ${fmt(previousTrace)}\nthis run: ${fmt(current)}\nUA: ${current.ua.slice(0, 90)}`,
  );
};
