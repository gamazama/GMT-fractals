# ADR-0080: Runtime UI color-scheme system (CSS variables behind Tailwind semantic tokens)

**Status:** Accepted
**Date:** 2026-06-21

## Context

GMT and its sibling apps (gradient-explorer, fluid-toy, fractal-toy, mesh-export, demo)
styled UI chrome with ~2,500 hardcoded Tailwind color classes (`text-gray-500`, `bg-black/95`,
`border-cyan-700/50`, …) plus ~40 raw-hex/rgba chrome sites, scattered across ~200 files. A
`data/theme.ts` semantic-token module existed but (a) stored tokens as **static** Tailwind class
strings (not runtime-swappable) and (b) was adopted by only ~3% of color-using files. There was no
way to change the UI color scheme, and the "single source of truth" was a fiction.

We wanted a user-facing control to switch UI color schemes at runtime across **all** apps, and to
use the migration as a cleanup that makes `data/theme.ts` a *real* single source of truth.

Constraints: the codebase is saturated with Tailwind's `/alpha` opacity modifier (`bg-cyan-900/80`,
`border-white/10`); the default Dark scheme had to stay visually ~identical; and functional color
(fractal/shader output, gradient/palette data, syntax highlighting, X/Y/Z=R/G/B axis gizmos,
node-category colors, external brand colors) must NEVER be themed.

## Decision

**CSS custom properties behind Tailwind semantic color tokens, switched by a `data-theme`
attribute on `<html>`.**

- Semantic tokens in `tailwind.config.js` (`accent`, `fg`, `line`, `surface`, `warn`, `danger`,
  `ok`, `info`, `secondary`) each resolve to `rgb(var(--x) / <alpha-value>)`, so the `/alpha`
  modifier keeps working. Added via `theme.extend`, so the default palette stays intact and the
  migration could be incremental.
- CSS variables hold **space-separated RGB channels** (`--accent-400: 34 211 238`), defined
  per-scheme in `index.css`: `:root` is Dark (channels byte-identical to the cyan/gray/white classes
  they replace), with `[data-theme="light"]` (full override) and `[data-theme="{violet,rose,amber}"]`
  blocks. The scheme axis is **surface/lightness only** — **Dark, Neutral Grey** (dark graphite,
  neutral greys), **Light, Light Grey** (light, grey surfaces).
- **Accent colour is a separate orthogonal axis**: a hue control (`accentHue`, 0-359°) generates the
  accent ladder in JS (`applyAccentHue` — HSL with a per-rung S/L profile, dark vs light per scheme)
  and writes inline `--accent-*` vars on `<html>` that override the scheme's default cyan. So the user
  picks ONE hue and it recolours the accent on ANY scheme — no per-accent duplicate themes. The
  Settings ▸ Interface "Accent colour" hue slider (`components/AccentHueControl.tsx`) drives it; the
  cyan ladder in `:root`/`[data-theme=light]` is the pre-JS fallback.
- `engine/store/colorSchemeStore.ts` (standalone zustand, like `autosaveStore`) owns the scheme:
  persists to `gmt.colorScheme` (shared across same-origin apps → one switcher themes the suite),
  applies via `applyColorScheme()` (sets `data-theme`), and exposes `getThemeColor()` +
  `onThemeChange()` so the canvas-2D editors (which `ctx.fillStyle` outside CSS reach) can follow
  the scheme and repaint. A pre-React inline `<script>` in each app's HTML head applies the saved
  scheme before first paint (no flash). The switcher is an `enum` setting registered in
  `store/coreSettings.ts` (Settings → Interface).
- `data/theme.ts` tokens were repointed to the semantic classes (e.g. `accent.text = 'text-accent'`),
  making the module a real single source of truth. The runtime-injected `componentClasses.ts` plain
  CSS (scrollbars, html bg, `color-scheme`) moved into `index.css` (themeable, reaches every app via
  the shared import) and the file was deleted.

Surfaces became **solid** tokens (replacing alpha-on-black overlays) because alpha-over-black
doesn't invert cleanly to Light; borders/tint-overlays use a single `--line` channel (white in Dark,
ink in Light) that inverts cleanly. Modal/overlay backdrops (`bg-black/60`…) stay literal — dimming
is correct in every scheme. Status tokens preserve **meaning** (red still reads as error), so they
are mapped, not free-recolored.

The migration ran as a deterministic codemod (`debug/codemod-theme.mjs`) for the byte-identical bulk
(cyan→accent, gray-text→fg, white-alpha→line, unambiguous surfaces) plus a per-tree agent pass for
the judgment residual (status colors, panel-vs-backdrop black-alpha, raw-hex). Full mapping +
exclude list: `plans/color-scheme-spec.md`.

## Consequences

- One `data-theme` attribute re-colors all six apps with no rebuild; adding a scheme = one CSS block.
- Dark is visually ~identical (accent/text/border tokens are byte-identical; solid surfaces match
  over the dark viewport). The frosted-glass `bg-black/95` panels became solid `bg-surface` — the
  5%-translucency loss is imperceptible.
- `data/theme.ts` is now the real token source; new chrome should use the semantic tokens
  (`text-accent`, `bg-surface`, `border-line/10`, `text-warn`/`text-danger`/`text-ok`) — NOT raw
  palette colors. Adding `text-cyan-400`/`bg-gray-800` etc. to new code regresses themeability.
- Functional color is explicitly excluded (see spec §4); never tokenize fractal/scene data, gradient/
  palette swatches, syntax highlighting, axis gizmos, node-category colors, or brand colors.
- Light/variant schemes have first-pass values tuned to be structurally correct; precise contrast
  tuning is a follow-up visual pass.
- Dev gotcha: changing `tailwind.config.js` colors can leave a stale `.vite` cache that 500s on
  `index.css` ("class does not exist"); clear `node_modules/.vite` if a custom token appears missing
  in dev. (Production build is unaffected.)

@see plans/color-scheme-spec.md, index.css, engine/store/colorSchemeStore.ts, data/theme.ts
