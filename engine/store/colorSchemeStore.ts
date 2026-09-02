/**
 * colorSchemeStore — the runtime UI theming source of truth.
 *
 * The theme is composed from a few orthogonal, continuously-adjustable axes (this
 * REPLACED the old fixed preset list — the presets are now just quick-picks that set
 * these axes; see {@link THEME_PRESETS}):
 *  • brightness   — 0 (near-black) → 100 (near-white). Interpolates the whole surface
 *                   ladder between a Dark pole and a Light pole; text / borders / status
 *                   auto-invert at the midpoint ({@link isLightAt}) so contrast holds
 *                   across the range.
 *  • surfaceTint  — bluish tint on the recessed + header surfaces (sunken / header),
 *                   keeping their brightness and shifting only their hue.
 *  • highContrast — pushes surfaces to the extremes + a higher-contrast text ladder.
 *  • accentHue    — primary accent hue (active / focus / links / brand).
 *  • secondaryHue — secondary accent hue (audio / modulation / Path Tracer).
 *  • surfaceHue   — hue of the surface tint (only visible when surfaceTint is on).
 *
 * All axes are generated in JS and applied as inline CSS custom properties on <html>,
 * overriding the `:root` (Dark) fallback in index.css. The computed var set is cached to
 * localStorage (`gmt.themeVars`) so each app's pre-React boot <script> can paint the exact
 * saved theme before first frame — no flash, and no per-preset CSS blocks to maintain.
 *
 * Standalone (like autosaveStore) so every app + the engine-core Settings registry share
 * one store. Persistence keys are shared across same-origin apps, so a choice in one app
 * themes the whole suite. A one-time migration maps the legacy `gmt.colorScheme` enum onto
 * the axes for existing users.
 *
 * @assumption Engine-core — host-agnostic; never imports an app.
 * @see plans/color-scheme-spec.md, index.css, docs/adr/0080-runtime-color-scheme-system.md
 */
import { create } from 'zustand';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';

// ─── Persistence keys + defaults ─────────────────────────────────────────
const BRIGHTNESS_KEY = 'gmt.brightness';
const TINT_KEY = 'gmt.surfaceTint';
const HC_KEY = 'gmt.highContrast';
const ACCENT_HUE_KEY = 'gmt.accentHue';
const SECONDARY_HUE_KEY = 'gmt.secondaryHue';
const SURFACE_HUE_KEY = 'gmt.surfaceHue';
/** Cache of the exact computed inline vars, so the boot <script> paints pre-React. */
const THEME_CACHE_KEY = 'gmt.themeVars';
/** Legacy enum, migrated once onto the axes. */
const LEGACY_SCHEME_KEY = 'gmt.colorScheme';

export const DEFAULT_BRIGHTNESS = 0;
export const DEFAULT_SURFACE_TINT = true;
export const DEFAULT_HIGH_CONTRAST = false;
/** Cyan — the brand default. accentHue === this ≈ the original cyan ladder. */
export const DEFAULT_ACCENT_HUE = 190;
/** Purple — the original secondary (audio / modulation / Path Tracer). */
export const DEFAULT_SECONDARY_HUE = 271;
/** Slate-blue — the surface tint hue (matches the `:root` fallback in index.css). */
export const DEFAULT_SURFACE_HUE = 202;

/** Quick-pick presets (Settings ▸ Colour) — each just sets the three scheme axes. */
export interface ThemePreset {
    id: string;
    label: string;
    brightness: number;
    surfaceTint: boolean;
    highContrast: boolean;
}
export const THEME_PRESETS: ReadonlyArray<ThemePreset> = [
    { id: 'dark', label: 'Dark', brightness: 0, surfaceTint: true, highContrast: false },
    { id: 'grey', label: 'Grey', brightness: 12, surfaceTint: false, highContrast: false },
    { id: 'light-grey', label: 'Light Grey', brightness: 81, surfaceTint: false, highContrast: false },
    { id: 'light', label: 'Light', brightness: 100, surfaceTint: false, highContrast: false },
];

// ─── small helpers ───────────────────────────────────────────────────────
const clampBrightness = (b: number): number => Math.max(0, Math.min(100, Math.round(b)));
const norm = (h: number): number => ((Math.round(h) % 360) + 360) % 360;
/** brightness ≥ 50 ⇒ light regime (dark text/borders); below ⇒ dark regime. */
const isLightAt = (brightness: number): boolean => brightness >= 50;

const readNum = (key: string, fallback: number): number => {
    const v = safeLocalGet(key);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
};
const readBool = (key: string, fallback: boolean): boolean => {
    const v = safeLocalGet(key);
    return v === null ? fallback : v === '1' || v === 'true';
};

/** HSL (h 0-360, s/l 0-100) → "r g b" space-separated channels for the CSS vars. */
function hslToChannels(h: number, s: number, l: number): string {
    const sn = s / 100, ln = l / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = sn * Math.min(ln, 1 - ln);
    const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return `${Math.round(255 * f(0))} ${Math.round(255 * f(8))} ${Math.round(255 * f(4))}`;
}
const grey = (v: number): string => `${v} ${v} ${v}`;
const lerp = (a: number, b: number, t: number): number => Math.round(a + (b - a) * t);

// ─── Accent + secondary ladders (hue-driven; profile depends on light/dark) ──
// [saturation%, lightness%] per rung. Dark regime = bright accent; Light regime =
// darker accent (contrast on light surfaces) + a pale accent-900 tint.
const ACCENT_DARK: Record<number, [number, number]> = {
    300: [85, 69], 400: [84, 53], 500: [94, 43], 600: [91, 36], 700: [82, 31], 800: [70, 27], 900: [64, 24],
};
const ACCENT_LIGHT: Record<number, [number, number]> = {
    300: [91, 36], 400: [82, 31], 500: [94, 43], 600: [91, 36], 700: [82, 31], 800: [70, 27], 900: [86, 90],
};
const ACCENT_RUNGS = [300, 400, 500, 600, 700, 800, 900];
const SECONDARY_DARK = { base: [91, 65] as [number, number], strong: [72, 47] as [number, number] };
const SECONDARY_LIGHT = { base: [81, 56] as [number, number], strong: [72, 47] as [number, number] };

// ─── Surface + global greys as [dark-pole, light-pole] channel values ────────
// Brightness interpolates between the poles. Two pole-pairs: normal + high-contrast.
type Poles = Record<string, [number, number]>;
const SURFACE_NORMAL: Poles = {
    '--surface-viewport': [5, 224],
    '--surface-dock': [8, 236],
    '--surface': [13, 255],
    '--surface-section': [10, 241],
    '--surface-raised': [26, 255],
    '--surface-sunken': [28, 233],
    '--surface-header': [43, 238],
    '--surface-tabbar': [10, 235],
    '--app-bg': [0, 245],
    '--scrollbar-track': [0, 235],
    '--scrollbar-thumb': [51, 184],
    '--scrollbar-thumb-strong': [68, 150],
};
const SURFACE_HC: Poles = {
    '--surface-viewport': [0, 255],
    '--surface-dock': [0, 250],
    '--surface': [0, 255],
    '--surface-section': [13, 244],
    '--surface-raised': [28, 255],
    '--surface-sunken': [0, 248],
    '--surface-header': [18, 246],
    '--surface-tabbar': [0, 248],
    '--app-bg': [0, 245],
    '--scrollbar-track': [0, 240],
    '--scrollbar-thumb': [120, 120],
    '--scrollbar-thumb-strong': [160, 90],
};
/** The two surfaces that carry the tint, with their tint saturation. */
const TINT_SAT: Record<string, number> = { '--surface-sunken': 48, '--surface-header': 36 };

// ─── Ink (text + hairline), 4 regimes; status colours, 2 regimes ─────────────
const FG_VARS = ['--fg', '--fg-secondary', '--fg-tertiary', '--fg-muted', '--fg-dim', '--fg-faint', '--fg-ghost'];
const INK = {
    dark: {
        fg: ['255 255 255', '229 231 235', '209 213 219', '156 163 175', '107 114 128', '75 85 99', '55 65 81'],
        line: '255 255 255',
    },
    light: {
        fg: ['17 17 17', '38 38 38', '55 65 81', '75 85 99', '107 114 128', '156 163 175', '209 213 219'],
        line: '17 24 39',
    },
    darkHc: {
        fg: ['255 255 255', '240 240 240', '225 225 225', '205 205 205', '180 180 180', '155 155 155', '130 130 130'],
        line: '255 255 255',
    },
    lightHc: {
        fg: ['0 0 0', '20 20 20', '35 35 35', '55 55 55', '75 75 75', '100 100 100', '130 130 130'],
        line: '0 0 0',
    },
};
const STATUS = {
    dark: {
        '--warn': '251 191 36', '--warn-strong': '217 119 6', '--warn-fg': '0 0 0',
        '--danger': '239 68 68', '--danger-strong': '220 38 38',
        '--ok': '74 222 128', '--ok-strong': '22 163 74', '--info': '56 189 248',
    },
    light: {
        '--warn': '180 83 9', '--warn-strong': '217 119 6', '--warn-fg': '255 255 255',
        '--danger': '220 38 38', '--danger-strong': '185 28 28',
        '--ok': '21 128 61', '--ok-strong': '22 163 74', '--info': '2 132 199',
    },
};

// ─── Theme generation ────────────────────────────────────────────────────
interface ThemeAxes {
    brightness: number;
    surfaceTint: boolean;
    highContrast: boolean;
    accentHue: number;
    secondaryHue: number;
    surfaceHue: number;
}

/** Compute the full inline var set + native color-scheme for the given axes. */
function buildThemeVars(a: ThemeAxes): { vars: Record<string, string>; colorScheme: 'dark' | 'light' } {
    const t = a.brightness / 100;
    const light = isLightAt(a.brightness);
    const vars: Record<string, string> = {};

    // Surfaces + globals: interpolate the active pole-pair.
    const poles = a.highContrast ? SURFACE_HC : SURFACE_NORMAL;
    for (const name of Object.keys(poles)) {
        const [d, l] = poles[name];
        vars[name] = grey(lerp(d, l, t));
    }
    // Tint the recessed / header surfaces: keep their brightness, shift the hue.
    if (a.surfaceTint) {
        for (const name of Object.keys(TINT_SAT)) {
            const [d, l] = poles[name];
            const lightnessPct = (lerp(d, l, t) / 255) * 100;
            vars[name] = hslToChannels(a.surfaceHue, TINT_SAT[name], lightnessPct);
        }
    }

    // Ink (fg ladder + hairline).
    const ink = a.highContrast ? (light ? INK.lightHc : INK.darkHc) : (light ? INK.light : INK.dark);
    FG_VARS.forEach((v, i) => { vars[v] = ink.fg[i]; });
    vars['--line'] = ink.line;

    // Status (meaning-bearing) colours.
    Object.assign(vars, light ? STATUS.light : STATUS.dark);

    // Accent ladder (hue-driven).
    const accProf = light ? ACCENT_LIGHT : ACCENT_DARK;
    for (const rung of ACCENT_RUNGS) {
        const [s, l] = accProf[rung];
        vars[`--accent-${rung}`] = hslToChannels(a.accentHue, s, l);
    }
    vars['--accent-fg'] = '255 255 255';
    vars['--accent-glow'] = hslToChannels(a.accentHue, accProf[400][0], accProf[400][1]);

    // Secondary accent (hue-driven).
    const secProf = light ? SECONDARY_LIGHT : SECONDARY_DARK;
    vars['--secondary'] = hslToChannels(a.secondaryHue, secProf.base[0], secProf.base[1]);
    vars['--secondary-strong'] = hslToChannels(a.secondaryHue, secProf.strong[0], secProf.strong[1]);

    return { vars, colorScheme: light ? 'light' : 'dark' };
}

/** Apply the axes to <html> as inline vars + native color-scheme, and cache for boot. */
const applyTheme = (a: ThemeAxes): void => {
    if (typeof document === 'undefined') return;
    const { vars, colorScheme } = buildThemeVars(a);
    const root = document.documentElement;
    for (const name of Object.keys(vars)) root.style.setProperty(name, vars[name]);
    root.style.colorScheme = colorScheme;
    // Cache the exact var set so each app's boot <script> paints it before React mounts.
    const css = Object.keys(vars).map((k) => `${k}:${vars[k]}`).join(';') + `;color-scheme:${colorScheme}`;
    safeLocalSet(THEME_CACHE_KEY, css);
    invalidateThemeColors();
};

// ─── Canvas-2D color accessor ────────────────────────────────────────────
// CSS variables can't reach `ctx.fillStyle`/`strokeStyle`, so the timeline /
// dope-sheet / curve-editor renderers read theme colors through this. Cached
// and invalidated on any theme change (getComputedStyle forces a style recalc).
let _themeColorCache: Record<string, string> = {};
const _themeChangeSubs = new Set<() => void>();

function invalidateThemeColors(): void {
    _themeColorCache = {};
    for (const cb of _themeChangeSubs) cb();
}

/** Subscribe to theme changes (for canvas renderers to rebuild their palette). */
export const onThemeChange = (cb: () => void): (() => void) => {
    _themeChangeSubs.add(cb);
    return () => { _themeChangeSubs.delete(cb); };
};

/** Resolve a theme CSS variable (e.g. `--accent-400`) to a canvas color string. */
export const getThemeColor = (varName: string, alpha = 1): string => {
    if (typeof document === 'undefined') return '#000';
    const key = `${varName}@${alpha}`;
    const hit = _themeColorCache[key];
    if (hit) return hit;
    const channels = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!channels) return '#000';
    const [r, g, b] = channels.split(/\s+/);
    const out = alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
    _themeColorCache[key] = out;
    return out;
};

// ─── Migration + init ────────────────────────────────────────────────────
function migrateLegacy(scheme: string): { brightness: number; surfaceTint: boolean; highContrast: boolean } {
    switch (scheme) {
        case 'neutral-grey': return { brightness: 12, surfaceTint: false, highContrast: false };
        case 'dark-high-contrast': return { brightness: 0, surfaceTint: false, highContrast: true };
        case 'light': return { brightness: 100, surfaceTint: false, highContrast: false };
        case 'light-grey': return { brightness: 81, surfaceTint: false, highContrast: false };
        case 'light-high-contrast': return { brightness: 100, surfaceTint: false, highContrast: true };
        case 'dark':
        default: return { brightness: 0, surfaceTint: true, highContrast: false };
    }
}

function initialAxes(): ThemeAxes {
    // One-time migration from the old `gmt.colorScheme` enum, if present + unmigrated.
    const legacy = safeLocalGet(LEGACY_SCHEME_KEY);
    if (safeLocalGet(BRIGHTNESS_KEY) === null && legacy !== null) {
        const m = migrateLegacy(legacy);
        safeLocalSet(BRIGHTNESS_KEY, String(m.brightness));
        safeLocalSet(TINT_KEY, m.surfaceTint ? '1' : '0');
        safeLocalSet(HC_KEY, m.highContrast ? '1' : '0');
    }
    return {
        brightness: clampBrightness(readNum(BRIGHTNESS_KEY, DEFAULT_BRIGHTNESS)),
        surfaceTint: readBool(TINT_KEY, DEFAULT_SURFACE_TINT),
        highContrast: readBool(HC_KEY, DEFAULT_HIGH_CONTRAST),
        accentHue: norm(readNum(ACCENT_HUE_KEY, DEFAULT_ACCENT_HUE)),
        secondaryHue: norm(readNum(SECONDARY_HUE_KEY, DEFAULT_SECONDARY_HUE)),
        surfaceHue: norm(readNum(SURFACE_HUE_KEY, DEFAULT_SURFACE_HUE)),
    };
}

// ─── Store ───────────────────────────────────────────────────────────────
interface ColorSchemeState extends ThemeAxes {
    /** Bumps on every theme change — a reactive dep for canvas repaint (Zustand selector). */
    themeRev: number;
    setBrightness: (b: number) => void;
    setSurfaceTint: (on: boolean) => void;
    setHighContrast: (on: boolean) => void;
    setAccentHue: (hue: number) => void;
    setSecondaryHue: (hue: number) => void;
    setSurfaceHue: (hue: number) => void;
    applyPreset: (p: ThemePreset) => void;
}

const axesOf = (s: ThemeAxes): ThemeAxes => ({
    brightness: s.brightness,
    surfaceTint: s.surfaceTint,
    highContrast: s.highContrast,
    accentHue: s.accentHue,
    secondaryHue: s.secondaryHue,
    surfaceHue: s.surfaceHue,
});

export const useColorScheme = create<ColorSchemeState>((set, get) => {
    const commit = (patch: Partial<ThemeAxes>): void => {
        const next = { ...get(), ...patch };
        applyTheme(axesOf(next));
        set({ ...patch, themeRev: get().themeRev + 1 });
    };
    return {
        ...initialAxes(),
        themeRev: 0,
        setBrightness: (b) => { const v = clampBrightness(b); safeLocalSet(BRIGHTNESS_KEY, String(v)); commit({ brightness: v }); },
        setSurfaceTint: (on) => { safeLocalSet(TINT_KEY, on ? '1' : '0'); commit({ surfaceTint: on }); },
        setHighContrast: (on) => { safeLocalSet(HC_KEY, on ? '1' : '0'); commit({ highContrast: on }); },
        setAccentHue: (hue) => { const v = norm(hue); safeLocalSet(ACCENT_HUE_KEY, String(v)); commit({ accentHue: v }); },
        setSecondaryHue: (hue) => { const v = norm(hue); safeLocalSet(SECONDARY_HUE_KEY, String(v)); commit({ secondaryHue: v }); },
        setSurfaceHue: (hue) => { const v = norm(hue); safeLocalSet(SURFACE_HUE_KEY, String(v)); commit({ surfaceHue: v }); },
        applyPreset: (p) => {
            safeLocalSet(BRIGHTNESS_KEY, String(p.brightness));
            safeLocalSet(TINT_KEY, p.surfaceTint ? '1' : '0');
            safeLocalSet(HC_KEY, p.highContrast ? '1' : '0');
            commit({ brightness: p.brightness, surfaceTint: p.surfaceTint, highContrast: p.highContrast });
        },
    };
});

// Apply the persisted theme on module load — the boot <script> already painted from the
// cache; this reconciles to the exact live values + warms the getThemeColor cache.
applyTheme(axesOf(useColorScheme.getState()));
