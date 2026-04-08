
/**
 * Centralized theme color tokens.
 *
 * All UI color classes are defined here as semantic tokens so that
 * swapping to a different color theme only requires changing this file.
 *
 * Tokens are Tailwind CSS class strings — components import and spread them
 * into className props. Group names describe *purpose*, not color.
 */

// ─── Accent (primary interactive color) ──────────────────────────────
export const accent = {
    text:           'text-cyan-400',
    textHover:      'hover:text-cyan-300',
    textSubtle:     'text-cyan-600',
    bg:             'bg-cyan-900/50',
    bgSolid:        'bg-cyan-900',
    bgMed:          'bg-cyan-700',
    bgBright:       'bg-cyan-600/40',
    border:         'border-cyan-700/50',
    borderFocus:    'border-cyan-500',
    borderFocusDim: 'border-cyan-500/50',
    hoverBg:        'hover:bg-cyan-500/50',
} as const;

// ─── Secondary accent (e.g. Path Tracer mode) ───────────────────────
export const secondary = {
    bgMed:          'bg-purple-700',
} as const;

// ─── Warning (compile, pending changes) ──────────────────────────────
export const warn = {
    text:       'text-amber-400',
    bg:         'bg-amber-900/20',
    border:     'border-amber-500/20',
    btnBg:      'bg-amber-600',
    btnHover:   'hover:bg-amber-500',
    btnText:    'text-black',
} as const;

// ─── Danger (destructive actions) ────────────────────────────────────
export const danger = {
    text:       'text-red-500',
    textHover:  'hover:text-red-300',
    hoverBg:    'hover:bg-red-900/20',
} as const;

// ─── Surface (backgrounds, containers) ───────────────────────────────
export const surface = {
    dock:           'bg-[#080808]',
    panel:          'bg-black/95',
    tabBar:         'bg-black/40',
    sectionHeader:  'bg-black/20',
    nested:         'bg-black/20',
    divider:        'bg-neutral-800',
    panelHeader:    'bg-gray-800/80',
    input:          'bg-gray-900',
    tint:           'bg-white/5',
    tintMed:        'bg-white/10',
    hoverSubtle:    'hover:bg-white/5',
    hoverMed:       'hover:bg-white/10',
} as const;

// ─── Text ────────────────────────────────────────────────────────────
export const text = {
    primary:    'text-white',
    secondary:  'text-gray-200',
    tertiary:   'text-gray-300',
    label:      'text-gray-400',
    dimLabel:   'text-gray-500',
    faint:      'text-gray-600',
    ghost:      'text-gray-700',
} as const;

// ─── Borders ─────────────────────────────────────────────────────────
export const border = {
    subtle:     'border-white/5',
    standard:   'border-white/10',
    prominent:  'border-white/20',
    input:      'border-gray-700',
} as const;

// ─── Composite tokens (common class combos) ──────────────────────────

/** Active dock tab */
export const tabActive = `${surface.dock} ${accent.text} border-x border-t ${border.standard} z-10 -mb-px pb-2`;

/** Inactive dock tab */
export const tabInactive = `${text.dimLabel} ${surface.hoverSubtle} hover:text-gray-300 border border-transparent`;

/** Active collapsed dock icon */
export const collapsedIconActive = `${accent.bgSolid} ${accent.text}`;

/** Inactive collapsed dock icon */
export const collapsedIconInactive = `${text.faint} ${surface.hoverMed}`;

/** Active icon button (e.g. toolbar toggles) */
export const iconBtnActive = `${accent.bg} text-cyan-300 border ${accent.border}`;

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
export const toggleInactive = `${text.dimLabel} hover:text-gray-300`;

/** Disabled toggle in a segmented control */
export const toggleDisabled = `${text.ghost} cursor-not-allowed opacity-50 bg-transparent`;

/** Active grid button (e.g. AA level selector) */
export const gridBtnActive = `${accent.bgBright} text-cyan-300 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]`;

/** Inactive grid button */
export const gridBtnInactive = `bg-transparent ${text.dimLabel} hover:text-gray-300 ${surface.hoverSubtle}`;
