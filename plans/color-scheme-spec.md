# Color-Scheme / Theming Spec (the migration contract)

**Goal:** a runtime-switchable UI color-scheme system across all 6 GMT apps + engine, driven by
CSS custom properties behind Tailwind semantic color tokens. Switching = set `data-theme` on
`<html>`. This is also the cleanup: every hardcoded chrome color migrates to a semantic token.

**Status:** SHIPPED (2026-06-21). Foundation + full migration + canvas wiring done; typecheck +
build + boot-smoke green. Two orthogonal axes: **scheme** (surface/lightness — Dark, Neutral Grey,
Light, Light Grey) and **accent hue** (a 0-359° slider in Settings ▸ Interface that recolours the
accent on any scheme — replaces the old per-accent duplicate themes). Brand mark (GmtWordmark)
follows the accent. Canvas-2D editors follow the theme via `getThemeColor`. Decision: ADR-0080.
Remaining: visual contrast tuning of the light/grey schemes; long-tail of intentionally-left
functional/decorative status colors.

**Non-negotiables**
- Dark must look essentially identical to today. Accent / text / border tokens are byte-identical
  (same RGB as the cyan/gray/white classes they replace). Surface tokens are solids that replace
  alpha-on-black overlays — visually indistinguishable over the dark viewport.
- Functional color is **excluded** (see §4). Never tokenize fractal/shader/scene data, gradient/
  palette swatches, GLSL syntax highlighting, X/Y/Z=R/G/B axis gizmos, node-category colors, or
  external brand colors (Ko-fi/PayPal).
- `/alpha` opacity modifiers must keep working — every token is `rgb(var(--x) / <alpha-value>)`,
  so CSS vars store **space-separated RGB channels** (`34 211 238`), never hex.

---

## 1. CSS variables (defined in index.css `:root` = Dark default)

### Accent ladder (cyan today) — channels
| var | Dark (cyan) | role |
|---|---|---|
| `--accent-300` | `103 232 249` | bright accent text / hover |
| `--accent-400` | `34 211 238` | **base accent** (DEFAULT) |
| `--accent-500` | `6 182 212` | focus rings, borders |
| `--accent-600` | `8 145 178` | solid accent button bg |
| `--accent-700` | `14 116 144` | accent borders / deep bg |
| `--accent-800` | `21 94 117` | hover on solid |
| `--accent-900` | `22 78 99` | subtle accent bg (`/N` alpha) |
| `--accent-fg`  | `255 255 255` | text/icon ON a solid accent fill |
| `--accent-glow`| `34 211 238` | for `shadow-[…rgb(var(--accent-glow)/.1)]` |

### Foreground ink (text) — channels (Dark = exact Tailwind gray ladder)
| var | Dark | replaces |
|---|---|---|
| `--fg`           | `255 255 255` | `text-white` |
| `--fg-secondary` | `229 231 235` | `gray-200` |
| `--fg-tertiary`  | `209 213 219` | `gray-300` |
| `--fg-muted`     | `156 163 175` | `gray-400` |
| `--fg-dim`       | `107 114 128` | `gray-500` |
| `--fg-faint`     | `75 85 99`    | `gray-600` |
| `--fg-ghost`     | `55 65 81`    | `gray-700` |

### Hairline (borders + tint overlays) — single channel, inverts cleanly
| var | Dark | usage |
|---|---|---|
| `--line` | `255 255 255` | `border-line/{5,10,20}` (= `border-white/N`), `bg-line/{5,10}` (= `bg-white/N` tints + hovers) |

(No dedicated input-border token: `border-gray-700` → `border-line/20`, which is ≈ identical over the input surface in Dark.)

### Surfaces — solids (Dark reproduces current mix; bluish grays kept where current UI is bluish)
| var | Dark | replaces |
|---|---|---|
| `--surface-viewport` | `5 5 5`     | `bg-[#050505]`, viewport frame |
| `--surface-dock`     | `8 8 8`     | `bg-[#080808]`, dock |
| `--surface`          | `13 13 13`  | `bg-black/95` panel, `glass-panel` |
| `--surface-section`  | `10 10 10`  | `bg-black/20` section header / nested |
| `--surface-raised`   | `26 26 26`  | `bg-[#1a1a1a]`/`#181818`/`#151515` dropdowns, menus, popovers |
| `--surface-sunken`   | `17 24 39`  | `bg-gray-900` inputs (gray-900 bluish, kept) |
| `--surface-header`   | `31 41 55`  | `bg-gray-800/80` panel header (gray-800 bluish, kept) |
| `--surface-tabbar`   | `10 10 10`  | `bg-black/40` tab bar |

### Status — meaning-bearing (mapped, not free-recolored). Channels.
| var | Dark | replaces | notes |
|---|---|---|---|
| `--warn`          | `251 191 36`  | `amber-400` | warning text |
| `--warn-strong`   | `217 119 6`   | `amber-600` | warning button bg |
| `--warn-fg`       | `0 0 0`       | `text-black` on amber btn | |
| `--danger`        | `239 68 68`   | `red-500` | error/destructive |
| `--danger-strong` | `220 38 38`   | `red-600` | destructive button bg |
| `--ok`            | `74 222 128`  | `green-400` | success/valid text |
| `--ok-strong`     | `22 163 74`   | `green-600` | success button bg |
| `--info`          | `56 189 248`  | `sky-400`/`blue-400` | info |
| `--secondary`     | `168 85 247`  | `purple-500` | secondary mode (Path Tracer) |
| `--secondary-strong` | `126 34 206` | `purple-700` | |

### Plain-CSS (scrollbars + app bg + color-scheme) — in index.css, themeable
| var | Dark | usage |
|---|---|---|
| `--app-bg`               | `0 0 0`        | `html`/`body` background |
| `--scrollbar-track`      | `0 0 0`        | webkit track |
| `--scrollbar-thumb`      | `51 51 51`     | webkit/firefox thumb (`#333`) |
| `--scrollbar-thumb-strong`| `68 68 68`    | body thumb (`#444`) |
| `color-scheme`           | `dark`         | set per scheme (light flips it) |

---

## 2. Tailwind token names (tailwind.config.js `theme.extend.colors`)

Every entry is `rgb(var(--x) / <alpha-value>)`. Added via `extend` (default palette stays intact,
so incremental migration never breaks unmigrated sites).

```
accent:   { 300,400,500,600,700,800,900, DEFAULT:400, fg }
fg:       { DEFAULT, secondary, tertiary, muted, dim, faint, ghost }
line:     DEFAULT (= --line); plus  'border-input' via --border-input
surface:  { DEFAULT, viewport, dock, section, raised, sunken, header, tabbar }
warn:     { DEFAULT, strong, fg }
danger:   { DEFAULT, strong }
ok:       { DEFAULT, strong }
info:     DEFAULT
secondary:{ DEFAULT, strong }
```

Utilities this yields: `text-accent`, `text-accent-300`, `bg-accent-600`, `border-accent-500`,
`text-fg`, `text-fg-muted`, `text-fg-dim`, `bg-surface`, `bg-surface-raised`, `border-line/10`,
`bg-line/5`, `border-input`, `text-warn`, `bg-warn-strong`, `text-danger`, `text-ok`, `bg-secondary`.

---

## 3. Migration mapping (apply mechanically; `/alpha` suffix preserved verbatim)

### Accent (cyan → accent)
- `{text,bg,border,ring,from,to,via,fill,stroke,shadow,divide,outline}-cyan-300` → `…-accent-300`
- `…-cyan-400` → `…-accent` (DEFAULT) — **or** `…-accent-400` (both valid; prefer bare `accent`)
- `…-cyan-500/600/700/800/900` → `…-accent-500/600/700/800/900`
- keep any `/NN` alpha suffix: `bg-cyan-900/50` → `bg-accent-900/50`
- raw `#22d3ee` / `rgb(34,211,238)` / `rgba(34,211,238,a)` chrome → `rgb(var(--accent-400))` / `rgb(var(--accent-400)/a)`
- inline rgba cyan `103,232,249` (tutorial) → `rgb(var(--accent-300)/a)`

### Text (gray → fg)
- `text-white` → `text-fg` · `text-gray-200` → `text-fg-secondary` · `text-gray-300` → `text-fg-tertiary`
- `text-gray-400` → `text-fg-muted` · `text-gray-500` → `text-fg-dim` · `text-gray-600` → `text-fg-faint`
- `text-gray-700` → `text-fg-ghost`
- (hover/active variants keep prefix: `hover:text-white` → `hover:text-fg`)

### Borders & tints (white-alpha → line)
- `border-white/5` → `border-line/5` · `/10` → `/10` · `/20` → `/20` (any alpha → `border-line/<same>`)
- `bg-white/5` → `bg-line/5` · `bg-white/10` → `bg-line/10` · `hover:bg-white/N` → `hover:bg-line/N`
- `border-gray-700` → `border-line/20` ; other `border-gray-{6,8}00` → nearest `border-line/{20,10}`
- `bg-white/15` (toggle off track) → `bg-line/15`

### Surfaces (black-alpha / arbitrary hex → surface tokens)
- `bg-black/95` (panel) → `bg-surface` · `bg-black/90` → `bg-surface` · `bg-black/80` → `bg-surface`
- `bg-black/20` (section/nested) → `bg-surface-section` · `bg-black/40` (tabbar) → `bg-surface-tabbar`
- `bg-[#050505]` → `bg-surface-viewport` · `bg-[#080808]` → `bg-surface-dock`
- `bg-[#0e0e0e]`/`#111`/`#121212`/`#141414` → `bg-surface` (deep panel)
- `bg-[#151515]`/`#181818`/`#1a1a1a` → `bg-surface-raised`
- `bg-gray-900` → `bg-surface-sunken` · `bg-gray-800` (+`/80`) → `bg-surface-header`
- `bg-neutral-800` (divider) → `bg-surface-raised`
- **Modal/overlay backdrops** `bg-black/60`,`/70`,`/50` that DIM the whole screen → **leave literal**
  (functional dimming, correct in every scheme). Only convert backdrops that are a panel surface.

### Status (meaning preserved)
- `text-amber-400`→`text-warn` · `bg-amber-600`→`bg-warn-strong` · `bg-amber-900/20`→`bg-warn/15`
  · `border-amber-500/20`→`border-warn/20` · `text-black` on amber btn → `text-warn-fg`
- `text-red-500`→`text-danger` · `text-red-300`→`text-danger` (hover) · `bg-red-600`→`bg-danger-strong`
  · `hover:bg-red-900/20`→`hover:bg-danger/10`
- `text-green-400`/`emerald-400`→`text-ok` · `bg-green-600`/`emerald-600`→`bg-ok-strong`
  · `bg-green-900/30`→`bg-ok/15`
- `text-sky-400`/`blue-400` (info) → `text-info` · `bg-purple-700`→`bg-secondary-strong`
  · `bg-purple-900/50`→`bg-secondary/30`

### Icon-btn / composite classes — already centralised in index.css + data/theme.ts (rewritten in foundation).

---

## 4. EXCLUDE LIST — never tokenize (functional color = data/meaning)

- `engine-gmt/formulas/**` — entire dir (fractal scene presets: fogColor, gradient stops, light colors)
- `engine-gmt/features/{materials,coloring,lighting,water_plane,drawing}*` — scene/material/light data
- `fractal-toy/{renderer,formulas,features/lighting}*`, `fluid-toy/{presets,features/palette,fluid}*` — render data
- `data/gradientPresets.ts`, `palette/**` color data, `components/{EmbeddedColorPicker,SmallColorPicker,Histogram}.tsx`,
  `utils/{colorUtils,stopOps}.ts`, `store/slices/uiSlice.ts` picker default, `hooks/usePencilTool.ts`
- `components/inputs/GlslEditor.tsx` — CodeMirror syntax-highlight token colors
- X/Y/Z = R/G/B axis triads: `engine/components/gizmo/SinglePositionGizmo.tsx`,
  `engine-gmt/features/lighting/utils/GizmoMath.ts`, `engine-gmt/features/drawing/DrawingOverlay.tsx`,
  `mesh-export/components/PreviewCanvas.tsx`
- Node-category colors: `engine-gmt/components/panels/flow/{FlowEditor,ShaderNode}.tsx`; palette channel legend
- `engine/features/modulation/index.ts` PRESET_COLORS (LFO identity swatches)
- External brand: `engine-gmt/DonateButton.tsx` Ko-fi/PayPal, `mesh-export` MEM/LOG_COLORS data-viz
- **Status colors that carry meaning** stay mapped to `warn/danger/ok/info` tokens (meaning survives, hue may shift) — NOT collapsed into accent.

### Canvas-2D editors — special case (themed via JS, not CSS)
`utils/{GraphRenderer,GraphUtils,DopeSheetRenderer,DopeSheetRendererBuilder}.ts`,
`components/timeline/TimelineRuler.tsx` draw chrome via `ctx.fillStyle`/`strokeStyle`. CSS vars can't
reach them. They read theme colors through `getThemeColor('--x')` (engine/store/colorScheme accessor)
at draw time, and re-render on scheme change. Their grid/axis/selection colors map to the same tokens.

---

## 5. Apply / persist / switch

- localStorage key: `gmt.colorScheme` (shared across all same-origin apps → one switcher themes the suite).
- Pre-React inline `<script>` in every app HTML head sets `data-theme` before first paint (no flash).
- `engine/store/colorSchemeStore.ts` (standalone zustand, mirrors autosaveStore): `scheme`, `setScheme`
  (persists + `applyColorScheme`), reads initial at module load. `getThemeColor(varName)` for canvas.
- Switcher: enum setting registered in `store/coreSettings.ts` → Settings → Interface, in app-gmt.
