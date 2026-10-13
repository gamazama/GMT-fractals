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
    './deep-zoom/**/*.{ts,tsx}',
    // The embedded-page prototype, moved aside 2026-10-08. Dev-only (no build input), but its
    // classes must still be scanned or its page renders unstyled. Goes when the folder goes.
    './deep-zoom-prototype/**/*.{ts,tsx}',
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
      // ─── `animate-pulse-live` — the pulse for anything that stays on screen ──
      // Same keyframes as `animate-pulse`, stepped: the opacity changes about
      // three times a second instead of on every frame.
      //
      // WHY IT EXISTS. A smooth infinite CSS animation makes the browser
      // composite and present the whole window on every vsync for as long as it
      // runs — measured 2026-10-04 with `npm run bench:audio`: one pulsing 6 px
      // dot = 60 presents/s, stepped = 3. On Windows those presents are made on
      // the GPU process's main thread, the same thread that decodes the render
      // worker's WebGL commands, and after a focus change each one blocks ~15 ms
      // waiting for vsync. The fractal then gets what is left: a 6 ms frame was
      // delivered at 14 fps instead of 60. The dot that did it was the
      // "this slider is modulated" indicator — so the slowdown appeared exactly
      // when audio modulation was switched on.
      //
      // RULE: an indicator that can be visible while the viewport is rendering
      // (modulated / playing / recording / pending / rendering) uses
      // `animate-pulse-live`. Plain `animate-pulse` is for transient loaders that
      // are gone within seconds. `npm run smoke:idle-damage` fails on a smooth
      // infinite animation left running in app-gmt.
      // @see docs/adr/0131-nothing-on-the-page-repaints-every-frame.md
      animation: {
        'pulse-live': 'pulse 2s steps(4, jump-none) infinite',
      },
      // ─── Semantic color tokens (runtime color-scheme system) ───────────
      // Each token resolves to a CSS variable holding space-separated RGB
      // channels (e.g. `--accent-400: 34 211 238`). The live values are generated
      // by engine/store/colorSchemeStore.ts from the theme axes (its dark/light
      // tables) and set inline on <html>; index.css `:root` holds only the Dark
      // first-paint fallback. (Corrected 2026-09-24: this said "defined per-scheme
      // in index.css `:root` / `[data-theme]`" — there are no per-scheme blocks.)
      // The `<alpha-value>` shim keeps
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
        // v2 shell "armed" meaning colour (gradient-explorer/v2/ui/StateChip.tsx) — see
        // the --gx-armed definition in index.css for why this isn't `secondary`.
        'gx-armed': 'rgb(var(--gx-armed) / <alpha-value>)',
        // Inks that invert with the scheme but are not status colours — the Help menu's
        // Support pink and the kept ♥'s gold. These vars are FULL colours (a pigment mixed
        // with `--fg` in index.css `:root`), not channel triples, so there is no
        // `/opacity` modifier on them. `text-kept` must beat `text-accent-300`, which Act's
        // `active` state also puts on the ♥: measured 2026-09-24 in the built CSS, the colour
        // utilities come out in class-name order (`text-[…]` < `text-accent` <
        // `text-accent-300` < `text-kept` < `text-support` < `text-warn`), so it does — an
        // arbitrary `text-[color:var(--kept)]` would have lost.
        support: {
          DEFAULT: 'var(--support)',
          strong: 'var(--support-strong)',
        },
        kept: 'var(--kept)',
      },
    },
  },
  plugins: [],
};
