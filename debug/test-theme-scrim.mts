/**
 * Out-of-bounds veil harness — the wash over a region PAST the duration limit must stay
 * visible against the viewport it covers, at every brightness.
 *
 * The bug this pins (GE v2 §8b item 7): the graph editor's past-the-limit region was a
 * hard-coded `rgba(0,0,0,0.6)`. Over the light-grey viewport (182) that lands on 73 — not a
 * recess, a black smear across a light interface. But the first fix, a per-regime constant,
 * was no better and THIS HARNESS CAUGHT IT: `--surface-viewport` sweeps 5 → 224 with
 * brightness (0 → 255 under high contrast), so any constant lands on the viewport somewhere.
 * A light-grey scrim vanished on the Light Grey preset; black had always been invisible on
 * Dark (viewport 5, veil 2 — a difference of three levels nobody can see).
 *
 * So the veil is a wash of INK, which the store already inverts at the midpoint. What is
 * pinned here is the PROPERTY, not the value: whatever the veil is built from, the region
 * must read as out-of-bounds in every scheme the user can select.
 *
 *   [1] the veil is visibly distinct from the viewport under EVERY preset
 *   [2] ...including under high contrast, which pushes the viewport to the extremes
 *   [3] the hatch drawn on top of the veil is distinct from the veil
 *   [4] every var the store emits has a `:root` fallback in index.css, so the pre-React
 *       boot <script> paints the same set the store does
 *
 * Falsified 2026-09-09, each independently:
 *   [1] veil alpha 0.10 → 0.01                    ✗ "Dark: veil reads (Δ2.5)"
 *   [2] veil `--fg` → `--surface-viewport`        ✗ every preset, Δ0.0
 *   [3] hatch alpha 0.16 → 0.0                    ✗ "Dark: hatch is not invisible on the veil"
 *   [4] removing `--app-bg: 0 0 0;` from index.css ✗ "--app-bg has a :root fallback"
 *
 * Run: `npx tsx debug/test-theme-scrim.mts`
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else { console.log('  ✓ ' + msg); }
};

// ─── the DOM slice colorSchemeStore touches ───────────────────────────────
// applyTheme writes inline custom properties on <html>; getThemeColor reads them back
// through getComputedStyle. Node has neither, so both are stubbed over one Map — which
// is also how the test SEES the emitted var set (assertion [4]).
const vars = new Map<string, string>();
const style = {
  setProperty: (k: string, v: string) => { vars.set(k, v); },
  getPropertyValue: (k: string) => vars.get(k) ?? '',
  colorScheme: '',
};
const localStore = new Map<string, string>();
(globalThis as Record<string, unknown>).document = { documentElement: { style } };
(globalThis as Record<string, unknown>).getComputedStyle = () => style;
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => localStore.get(k) ?? null,
    setItem: (k: string, v: string) => { localStore.set(k, v); },
    removeItem: (k: string) => { localStore.delete(k); },
  },
};

const { useColorScheme, THEME_PRESETS } = await import('../engine/store/colorSchemeStore');

/** "r g b" channels → [r,g,b]. */
const chan = (name: string): [number, number, number] => {
  const [r, g, b] = (vars.get(name) ?? '').split(/\s+/).map(Number);
  return [r, g, b];
};
/** The var + alpha behind THEME.limitVeilColor / limitHatchColor in utils/GraphUtils.ts. */
const VEIL_VAR = '--fg';
/** Composite `src` at `alpha` over `dst` (per channel), as canvas does. */
const over = (src: [number, number, number], dst: [number, number, number], a: number) =>
  src.map((c, i) => dst[i] + (c - dst[i]) * a) as [number, number, number];
/** Mean absolute per-channel distance — "can the eye tell these apart". */
const dist = (a: [number, number, number], b: [number, number, number]) =>
  a.reduce((s, c, i) => s + Math.abs(c - b[i]), 0) / 3;

// The two alphas GraphUtils' THEME.limitVeilColor / limitHatchColor use.
const VEIL_A = 0.10;
const HATCH_A = 0.16;
/** Below this the region stops reading as out-of-bounds at all. */
const MIN_DELTA = 12;

console.log('[1] the veil is visibly distinct from the viewport under every preset');
for (const preset of THEME_PRESETS) {
  useColorScheme.getState().applyPreset(preset);
  const viewport = chan('--surface-viewport');
  const d = dist(over(chan(VEIL_VAR), viewport, VEIL_A), viewport);
  ok(d >= MIN_DELTA, `${preset.label}: veil reads (Δ${d.toFixed(1)})`);
}
console.log('[2] ...including under high contrast, which pushes the viewport to the extremes');
for (const p of THEME_PRESETS.filter((x) => x.id === 'dark' || x.id === 'light')) {
  useColorScheme.getState().applyPreset({ ...p, highContrast: true });
  const viewport = chan('--surface-viewport');
  const d = dist(over(chan(VEIL_VAR), viewport, VEIL_A), viewport);
  ok(d >= MIN_DELTA, `${p.label} High Contrast: veil reads (Δ${d.toFixed(1)})`);
}

console.log('[3] the hatch is distinct from the veil it sits on');
for (const preset of THEME_PRESETS) {
  useColorScheme.getState().applyPreset(preset);
  const ink = chan(VEIL_VAR);
  const veil = over(ink, chan('--surface-viewport'), VEIL_A);
  ok(dist(over(ink, veil, HATCH_A), veil) >= MIN_DELTA, `${preset.label}: hatch is not invisible on the veil`);
}

console.log('[4] every emitted var has a :root fallback in index.css');
{
  useColorScheme.getState().applyPreset(THEME_PRESETS[0]);
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  const missing = [...vars.keys()].filter((v) => !root.includes(`${v}:`));
  for (const m of missing) ok(false, `${m} has a :root fallback`);
  ok(missing.length === 0, `all ${vars.size} emitted vars have a :root fallback`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
