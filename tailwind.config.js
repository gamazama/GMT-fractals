/** @type {import('tailwindcss').Config} */
// Build-time Tailwind config. Replaces the runtime `cdn.tailwindcss.com`
// Play CDN that every app entry used to load (a production-fragility: a CDN
// blip rendered the whole app unstyled = blank on the #000 theme). All six
// app entries now import `index.css` (the @tailwind directives) and Vite
// compiles only the classes found in the `content` globs below.
//
// IMPORTANT: classes assembled by string INTERPOLATION at runtime
// (e.g. `bg-${c}-500`) are NOT detected by content scanning and will be
// purged. The Play CDN generated those from the live DOM, so they worked
// before. If a colour/utility goes missing after this change, either switch
// the call site to full literal class strings or add the class to `safelist`.
export default {
  content: [
    './*.html',
    './*.tsx',
    './app-gmt/**/*.{ts,tsx}',
    './gradient-explorer/**/*.{ts,tsx}',
    './fluid-toy/**/*.{ts,tsx}',
    './fractal-toy/**/*.{ts,tsx}',
    './mesh-export/**/*.{ts,tsx}',
    './demo/**/*.{ts,tsx}',
    './engine/**/*.{ts,tsx}',
    './engine-gmt/**/*.{ts,tsx}',
    './palette/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ─── Semantic color tokens (runtime color-scheme system) ───────────
      // Each token resolves to a CSS variable holding space-separated RGB
      // channels (e.g. `--accent-400: 34 211 238`), defined per-scheme in
      // index.css `:root` / `[data-theme="…"]`. The `<alpha-value>` shim keeps
      // Tailwind's `/opacity` modifier working (`bg-accent/50`, `border-line/10`).
      // Added via `extend`, so the default palette stays intact and unmigrated
      // call sites keep working during the incremental migration.
      // Spec + migration mapping: plans/color-scheme-spec.md
      colors: {
        accent: {
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
          800: 'rgb(var(--accent-800) / <alpha-value>)',
          900: 'rgb(var(--accent-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--accent-400) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          glow: 'rgb(var(--accent-glow) / <alpha-value>)',
        },
        // Foreground ink (text)
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          secondary: 'rgb(var(--fg-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--fg-tertiary) / <alpha-value>)',
          muted: 'rgb(var(--fg-muted) / <alpha-value>)',
          dim: 'rgb(var(--fg-dim) / <alpha-value>)',
          faint: 'rgb(var(--fg-faint) / <alpha-value>)',
          ghost: 'rgb(var(--fg-ghost) / <alpha-value>)',
        },
        // Hairlines + tint overlays (white-in-dark / ink-in-light, inverts
        // cleanly). Borders use `border-line/{5,10,20}`, tint fills `bg-line/N`.
        // The solid `gray-700` input border maps to `border-line/20` (≈ identical
        // over the input surface), so no dedicated input-border token is needed.
        line: 'rgb(var(--line) / <alpha-value>)',
        // Surfaces (solids; replace alpha-on-black overlays + arbitrary hex)
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          viewport: 'rgb(var(--surface-viewport) / <alpha-value>)',
          dock: 'rgb(var(--surface-dock) / <alpha-value>)',
          section: 'rgb(var(--surface-section) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
          header: 'rgb(var(--surface-header) / <alpha-value>)',
          tabbar: 'rgb(var(--surface-tabbar) / <alpha-value>)',
        },
        // Status (meaning-bearing; mapped, not free-recolored)
        warn: {
          DEFAULT: 'rgb(var(--warn) / <alpha-value>)',
          strong: 'rgb(var(--warn-strong) / <alpha-value>)',
          fg: 'rgb(var(--warn-fg) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          strong: 'rgb(var(--danger-strong) / <alpha-value>)',
        },
        ok: {
          DEFAULT: 'rgb(var(--ok) / <alpha-value>)',
          strong: 'rgb(var(--ok-strong) / <alpha-value>)',
        },
        info: 'rgb(var(--info) / <alpha-value>)',
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          strong: 'rgb(var(--secondary-strong) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
