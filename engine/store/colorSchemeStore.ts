/**
 * colorSchemeStore — the runtime UI color-scheme (theming) source of truth.
 *
 * Three orthogonal axes:
 *  • scheme       — surface/lightness family (Dark, Neutral Grey, Light, Light Grey),
 *                   applied as a `data-theme` attribute on <html> (colors in index.css).
 *  • accentHue    — the primary accent hue (0-359°): active/focus/links/brand.
 *  • secondaryHue — the secondary accent hue (0-359°): audio, modulation, Path Tracer.
 *
 * Both hues are applied as inline CSS vars on <html> that override the scheme's default
 * ladders, so the user picks a hue and it recolours that accent on ANY scheme — no need
 * for duplicate per-accent themes.
 *
 * Standalone (like autosaveStore) so every app and the engine-core Settings registry
 * share one store. Persistence keys (`gmt.colorScheme`, `gmt.accentHue`, `gmt.secondaryHue`)
 * are shared across same-origin apps, so a choice in one app themes the whole suite. A
 * pre-React inline <script> in each app's HTML head applies the saved scheme before paint.
 *
 * @invariant Engine-core — host-agnostic; never imports an app.
 * @see plans/color-scheme-spec.md, index.css, docs/adr/0080-runtime-color-scheme-system.md
 */
import { create } from 'zustand';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';

export type ColorScheme =
    | 'dark' | 'neutral-grey' | 'dark-high-contrast'
    | 'light' | 'light-grey' | 'light-high-contrast';

/** The shipped surface/lightness schemes, in switcher order. `dark` = `:root`. */
export const COLOR_SCHEMES: ReadonlyArray<{ value: ColorScheme; label: string }> = [
    { value: 'dark', label: 'Dark' },
    { value: 'neutral-grey', label: 'Neutral Grey' },
    { value: 'dark-high-contrast', label: 'Dark High Contrast' },
    { value: 'light', label: 'Light' },
    { value: 'light-grey', label: 'Light Grey' },
    { value: 'light-high-contrast', label: 'Light High Contrast' },
] as const;

const SCHEME_KEY = 'gmt.colorScheme';
const ACCENT_HUE_KEY = 'gmt.accentHue';
const SECONDARY_HUE_KEY = 'gmt.secondaryHue';
const DEFAULT_SCHEME: ColorScheme = 'dark';
/** Cyan — the brand default. accentHue === this ≈ the original cyan ladder. */
export const DEFAULT_ACCENT_HUE = 190;
/** Purple — the original secondary (audio / modulation / Path Tracer). */
export const DEFAULT_SECONDARY_HUE = 271;
const VALID = new Set<string>(COLOR_SCHEMES.map((s) => s.value));

const isLightScheme = (s: ColorScheme): boolean =>
    s === 'light' || s === 'light-grey' || s === 'light-high-contrast';
const norm = (h: number): number => ((Math.round(h) % 360) + 360) % 360;

export const readColorScheme = (): ColorScheme => {
    const v = safeLocalGet(SCHEME_KEY);
    return v && VALID.has(v) ? (v as ColorScheme) : DEFAULT_SCHEME;
};
const readHue = (key: string, fallback: number): number => {
    const v = safeLocalGet(key);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? norm(n) : fallback;
};

// ─── Accent ladder generation (hue → RGB channels) ───────────────────────
// [saturation%, lightness%] per rung, matching the cyan/purple ladders in
// index.css. Dark scheme = bright accent; Light scheme = darker accent (for
// contrast on light surfaces) + a pale accent-900 tint.
const ACCENT_DARK: Record<number, [number, number]> = {
    300: [85, 69], 400: [84, 53], 500: [94, 43], 600: [91, 36], 700: [82, 31], 800: [70, 27], 900: [64, 24],
};
const ACCENT_LIGHT: Record<number, [number, number]> = {
    300: [91, 36], 400: [82, 31], 500: [94, 43], 600: [91, 36], 700: [82, 31], 800: [70, 27], 900: [86, 90],
};
const ACCENT_RUNGS = [300, 400, 500, 600, 700, 800, 900];
// Secondary has just base + strong rungs.
const SECONDARY_DARK = { base: [91, 65] as [number, number], strong: [72, 47] as [number, number] };
const SECONDARY_LIGHT = { base: [81, 56] as [number, number], strong: [72, 47] as [number, number] };

/** HSL (h 0-360, s/l 0-100) → "r g b" space-separated channels for the CSS vars. */
function hslToChannels(h: number, s: number, l: number): string {
    const sn = s / 100, ln = l / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = sn * Math.min(ln, 1 - ln);
    const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return `${Math.round(255 * f(0))} ${Math.round(255 * f(8))} ${Math.round(255 * f(4))}`;
}

/** Apply the primary accent hue as inline `--accent-*` vars (overriding the scheme default). */
export const applyAccentHue = (hue: number, scheme: ColorScheme): void => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const prof = isLightScheme(scheme) ? ACCENT_LIGHT : ACCENT_DARK;
    for (const rung of ACCENT_RUNGS) {
        const [s, l] = prof[rung];
        root.style.setProperty(`--accent-${rung}`, hslToChannels(hue, s, l));
    }
    const [gs, gl] = prof[400];
    root.style.setProperty('--accent-glow', hslToChannels(hue, gs, gl));
    invalidateThemeColors();
};

/** Apply the secondary accent hue as inline `--secondary` / `--secondary-strong` vars. */
export const applySecondaryHue = (hue: number, scheme: ColorScheme): void => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const prof = isLightScheme(scheme) ? SECONDARY_LIGHT : SECONDARY_DARK;
    root.style.setProperty('--secondary', hslToChannels(hue, prof.base[0], prof.base[1]));
    root.style.setProperty('--secondary-strong', hslToChannels(hue, prof.strong[0], prof.strong[1]));
    invalidateThemeColors();
};

/**
 * Apply a scheme — sets `data-theme` on <html> (or clears it for default Dark),
 * then re-applies both accent hues (their lightness profiles depend on the scheme).
 */
export const applyColorScheme = (scheme: ColorScheme, accentHue: number, secondaryHue: number): void => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (scheme === DEFAULT_SCHEME) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', scheme);
    applyAccentHue(accentHue, scheme);
    applySecondaryHue(secondaryHue, scheme);
};

// ─── Canvas-2D color accessor ────────────────────────────────────────────
// CSS variables can't reach `ctx.fillStyle`/`strokeStyle`, so the timeline /
// dope-sheet / curve-editor renderers read theme colors through this. Cached
// and invalidated on scheme/hue change (getComputedStyle forces a style recalc).
let _themeColorCache: Record<string, string> = {};
const _themeChangeSubs = new Set<() => void>();

function invalidateThemeColors(): void {
    _themeColorCache = {};
    for (const cb of _themeChangeSubs) cb();
}

/** Subscribe to scheme/hue changes (for canvas renderers to rebuild their palette). */
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

interface ColorSchemeState {
    scheme: ColorScheme;
    accentHue: number;
    secondaryHue: number;
    setScheme: (s: ColorScheme) => void;
    setAccentHue: (hue: number) => void;
    setSecondaryHue: (hue: number) => void;
}

export const useColorScheme = create<ColorSchemeState>((set, get) => ({
    scheme: readColorScheme(),
    accentHue: readHue(ACCENT_HUE_KEY, DEFAULT_ACCENT_HUE),
    secondaryHue: readHue(SECONDARY_HUE_KEY, DEFAULT_SECONDARY_HUE),
    setScheme: (s) => {
        safeLocalSet(SCHEME_KEY, s);
        applyColorScheme(s, get().accentHue, get().secondaryHue);
        set({ scheme: s });
    },
    setAccentHue: (hue) => {
        const h = norm(hue);
        safeLocalSet(ACCENT_HUE_KEY, String(h));
        applyAccentHue(h, get().scheme);
        set({ accentHue: h });
    },
    setSecondaryHue: (hue) => {
        const h = norm(hue);
        safeLocalSet(SECONDARY_HUE_KEY, String(h));
        applySecondaryHue(h, get().scheme);
        set({ secondaryHue: h });
    },
}));

// Apply the persisted scheme + hues on module load — the boot <script> already
// set `data-theme`, but the accent hues are JS-only; this also warms the cache.
applyColorScheme(readColorScheme(), readHue(ACCENT_HUE_KEY, DEFAULT_ACCENT_HUE), readHue(SECONDARY_HUE_KEY, DEFAULT_SECONDARY_HUE));
