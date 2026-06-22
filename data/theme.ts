
/**
 * Centralized theme color tokens.
 *
 * All UI color classes are defined here as semantic tokens. Each token is a
 * Tailwind class string built from the engine's **semantic color tokens**
 * (`accent`, `fg`, `line`, `surface`, `warn`, `danger`, `ok`, `info`,
 * `secondary`) — NOT raw palette colors. Those tokens resolve to CSS variables
 * defined per-scheme in index.css, so spreading these strings into `className`
 * automatically follows the active color scheme (Dark / Light / accent variant).
 *
 * Group names describe *purpose*, not color. Components import and spread these.
 *
 * @see plans/color-scheme-spec.md — the variable set + migration mapping.
 * @see index.css — the `:root` / `[data-theme]` scheme definitions.
 */

// ─── Accent (primary interactive color) ──────────────────────────────
export const accent = {
    text:           'text-accent',
    textHover:      'hover:text-accent-300',
    textSubtle:     'text-accent-600',
    bg:             'bg-accent-900/50',
    bgSolid:        'bg-accent-900',
    bgMed:          'bg-accent-700',
    bgBright:       'bg-accent-600/40',
    border:         'border-accent-700/50',
    borderFocus:    'border-accent-500',
    borderFocusDim: 'border-accent-500/50',
    hoverBg:        'hover:bg-accent-500/50',
} as const;

// ─── Secondary accent (e.g. Path Tracer mode) ───────────────────────
export const secondary = {
    bgMed:          'bg-secondary-strong',
} as const;

// ─── Warning (compile, pending changes) ──────────────────────────────
export const warn = {
    text:       'text-warn',
    bg:         'bg-warn/15',
    border:     'border-warn/20',
    btnBg:      'bg-warn-strong',
    btnHover:   'hover:bg-warn',
    btnText:    'text-warn-fg',
} as const;

// ─── Danger (destructive actions) ────────────────────────────────────
export const danger = {
    text:       'text-danger',
    textHover:  'hover:text-danger',
    hoverBg:    'hover:bg-danger/10',
} as const;

// ─── Surface (backgrounds, containers) ───────────────────────────────
export const surface = {
    dock:           'bg-surface-dock',
    panel:          'bg-surface',
    tabBar:         'bg-surface-tabbar',
    sectionHeader:  'bg-surface-section',
    nested:         'bg-surface-section',
    divider:        'bg-surface-raised',
    panelHeader:    'bg-surface-header',
    input:          'bg-surface-sunken',
    tint:           'bg-line/5',
    tintMed:        'bg-line/10',
    hoverSubtle:    'hover:bg-line/5',
    hoverMed:       'hover:bg-line/10',
} as const;

// ─── Text ────────────────────────────────────────────────────────────
export const text = {
    primary:    'text-fg',
    secondary:  'text-fg-secondary',
    tertiary:   'text-fg-tertiary',
    label:      'text-fg-muted',
    dimLabel:   'text-fg-dim',
    faint:      'text-fg-faint',
    ghost:      'text-fg-ghost',
} as const;

// ─── Borders ─────────────────────────────────────────────────────────
export const border = {
    subtle:     'border-line/5',
    standard:   'border-line/10',
    prominent:  'border-line/20',
    input:      'border-line/20',
} as const;

// ─── Composite tokens (common class combos) ──────────────────────────

/** Active dock tab */
export const tabActive = `${surface.dock} ${accent.text} border-x border-t ${border.standard} z-10 -mb-px pb-2`;

/** Inactive dock tab */
export const tabInactive = `${text.dimLabel} ${surface.hoverSubtle} hover:text-fg-tertiary border border-transparent`;

/** Active collapsed dock icon */
export const collapsedIconActive = `${accent.bgSolid} ${accent.text}`;

/** Inactive collapsed dock icon */
export const collapsedIconInactive = `${text.faint} ${surface.hoverMed}`;

/** Active icon button (e.g. toolbar toggles) */
export const iconBtnActive = `${accent.bg} text-accent-300 border ${accent.border}`;

/** Drag handle on active tab */
export const dragHandleActive = `${accent.textSubtle}`;

/** Drag handle on inactive tab */
export const dragHandleInactive = `${text.ghost}`;

/** Nested sub-container (e.g. Water Plane subsections, Tone Mapping) */
export const nestedContainer = `${surface.nested} p-2 rounded border ${border.subtle}`;

/** Section header row */
export const sectionHeader = `px-3 py-1.5 ${surface.sectionHeader} border-b ${border.subtle} flex items-center justify-between shrink-0`;

/** Compile bar (amber warning strip) */
export const compileBar = `${warn.bg} border ${warn.border}`;

/** Active toggle in a segmented control (e.g. Direct/PT switch) */
export const toggleActive = `${accent.bgMed} ${text.primary}`;

/** Inactive toggle in a segmented control */
export const toggleInactive = `${text.dimLabel} hover:text-fg-tertiary`;

/** Disabled toggle in a segmented control */
export const toggleDisabled = `${text.ghost} cursor-not-allowed opacity-50 bg-transparent`;

/** Active grid button (e.g. AA level selector) */
export const gridBtnActive = `${accent.bgBright} text-accent-300 shadow-[inset_0_0_10px_rgb(var(--accent-glow)/0.1)]`;

/** Inactive grid button */
export const gridBtnInactive = `bg-transparent ${text.dimLabel} hover:text-fg-tertiary ${surface.hoverSubtle}`;
