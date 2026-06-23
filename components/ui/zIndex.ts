/**
 * Single source of truth for UI stacking across every app in the suite
 * (app-gmt, fluid-toy, fractal-toy, mesh-export, gradient-explorer, demo).
 *
 * ## The one fact that makes z-index predictable here
 *
 * There are TWO stacking *domains* that do NOT compete by z-value:
 *
 *  - **portal** — surfaces `createPortal`'d to the layer host (`document.body`
 *    today). These order *globally* by their numeric z. This is the only domain
 *    where the numbers below mean what they say.
 *  - **shell** — surfaces rendered inline under `MobileViewportShell`
 *    (`position: fixed`/`sticky`) or a `fixed inset-0` app root. The shell is
 *    itself a stacking context, so an in-flow descendant can NEVER paint above
 *    any positive-z portal surface, no matter how high its z. Its number is
 *    meaningful only against its trapped siblings.
 *
 * Corollary: to raise a surface above the floating-panel band you must make it a
 * **body portal** — numeric escalation inside the shell is futile. Author
 * floating surfaces with the `<Layer tier=…>` primitive (which always portals)
 * rather than a bare `z-[9999]`, and they can't be hand-trapped.
 *
 * ## Authoring
 *
 *  - `z('modal')` / `z('panel', rank)` — resolve a tier (optionally with an
 *    intra-band rank) to a number. Prefer this over the raw `Z.*` proxy.
 *  - `Z.modal` — back-compat numeric proxy (every historical call site keeps
 *    working unchanged). New code should use `z()` / `<Layer>`.
 *  - `registerTiers({ … })` — an app adds its own namespaced tiers without
 *    forking this module; overlapping a portal band throws in dev.
 *
 * Bands are deliberately sparse so a new category slots into a gap without
 * renumbering neighbours, and so rank-able bands have headroom (`base + rank`).
 * The `panel` band (100–199) is RESERVED in full for `layerStack` click-to-front
 * (see ADR-0081) — nothing else may land in 100–299.
 *
 * @see docs/adr/0060-floating-panel-primitives.md (the original Z scale)
 * @see docs/adr/0081-floating-panel-click-to-front-stacking.md (panel ranks)
 * @see plans/z-index-system-design.md (the holistic model + migration)
 * @invariant `panel` (100–199) is reserved for click-to-front ranks; no tier or
 *   rank may squat in (100, 199]. `popover` starts at 300 to keep 200–299 clear.
 * @invariant `takeover` (90) stays UNDER `panel` so a full-screen browse scrim
 *   (Palette Picker) keeps floating panels reachable on top of it.
 */

/** Dev-only diagnostics flag, safe under Vite (`import.meta.env.DEV`) and tsx/node (undefined → false). */
const DEV = !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV;

export type LayerDomain = 'portal' | 'shell';

export interface TierDef {
    /** Base z. Rank-able tiers reserve `base … base + span` (via `z(tier, rank)`). */
    base: number;
    /** Reserved range above `base` for `base + rank`. 0 = single fixed value. */
    span: number;
    /**
     * `portal` orders globally (honoured only when body-portalled); `shell`
     * orders only within its in-flow stacking-context trap. `<Layer>` portals
     * `portal` tiers and renders `shell` tiers inline.
     */
    domain: LayerDomain;
}

/**
 * The canonical tier table, top → bottom within each domain. See the module
 * doc for the portal/shell distinction. Mutable only via {@link registerTiers}.
 */
const BASE_TIERS = {
    // ── PORTAL domain — the real global z axis (high → low) ────────────────
    emergency:       { base: 100000, span: 0,  domain: 'portal' }, // GPU-loss / fatal recovery
    deviceGate:      { base: 9800,   span: 0,  domain: 'portal' }, // rotate-to-landscape / orientation block
    dragGhost:       { base: 9600,   span: 9,  domain: 'portal' }, // cursor-following drag avatars
    contextMenu:     { base: 9000,   span: 99, domain: 'portal' }, // right-click / anchored menus, picker popups
    tooltip:         { base: 8500,   span: 99, domain: 'portal' }, // hover previews, transient labels
    toast:           { base: 3200,   span: 0,  domain: 'portal' }, // opt-in toasts-over-modals (see §3f of the design)
    compileProgress: { base: 3000,   span: 0,  domain: 'portal' }, // non-blocking compile banner over modals
    overlayTop:      { base: 2400,   span: 0,  domain: 'portal' }, // sign-in / account over the gallery
    overlayResult:   { base: 2200,   span: 0,  domain: 'portal' }, // result / zoom above a nested overlay
    overlayNested:   { base: 2100,   span: 50, domain: 'portal' }, // modal launched from within an overlay
    overlay:         { base: 2000,   span: 50, domain: 'portal' }, // full-screen app takeover
    osDrop:          { base: 1500,   span: 0,  domain: 'portal' }, // OS file-drag scrim
    modalNested:     { base: 1100,   span: 50, domain: 'portal' }, // dialog stacked on a modal
    modal:           { base: 1000,   span: 50, domain: 'portal' }, // blocking modal + backdrop
    tool:            { base: 600,    span: 0,  domain: 'portal' }, // elevated non-blocking tool windows
    popover:         { base: 300,    span: 99, domain: 'portal' }, // anchored dropdowns / popovers (once portalled)
    panel:           { base: 100,    span: 99, domain: 'portal' }, // floating windows — 100…199 click-to-front (RESERVED)
    takeover:        { base: 90,     span: 0,  domain: 'portal' }, // full-screen browse scrim UNDER panels

    // ── SHELL domain — local order, value meaningful only inside its trap ───
    shellRedock:          { base: 1000, span: 0, domain: 'shell' }, // panel-redock drop zones (DropZones, itself fixed)
    shellToast:           { base: 900,  span: 0, domain: 'shell' }, // ToastHost (default home), FirstRunHint @800
    shellTopbar:          { base: 500,  span: 0, domain: 'shell' }, // TopBar header (itself a sub-trap)
    shellLoading:         { base: 100,  span: 0, domain: 'shell' }, // LoadingScreen, MobileControls
    shellDock:            { base: 40,   span: 0, domain: 'shell' }, // Dock root + grips
    shellTimeline:        { base: 40,   span: 0, domain: 'shell' }, // Timeline chrome (own backdrop-blur trap)
    shellViewportOverlay: { base: 20,   span: 0, domain: 'shell' }, // DomOverlays, region banner, perf monitor
    shellHud:             { base: 10,   span: 0, domain: 'shell' }, // HudOverlay + HUD widgets
} as const satisfies Record<string, TierDef>;

/** The live table (frozen base + any app-registered tiers). */
const TIER_TABLE: Record<string, TierDef> = { ...BASE_TIERS };

export type Tier = keyof typeof BASE_TIERS;
/** @deprecated historical alias for {@link Tier}. */
export type ZTier = Tier;

/** Resolve a tier to its base value, or `undefined` for an unknown tier. */
const tierDef = (tier: string): TierDef | undefined => TIER_TABLE[tier];

/**
 * Resolve a tier (+ optional intra-band rank) to a concrete z-index.
 * Ranks beyond the tier's `span` are clamped and warn in dev (silent
 * collision risk) — give a band more `span` if it hosts many live siblings.
 */
export function z(tier: Tier, rank = 0): number {
    const t = tierDef(tier);
    if (!t) {
        if (DEV) console.error(`z(): unknown tier "${tier}"`);
        return 0;
    }
    if (DEV && rank > t.span)
        console.error(`z('${tier}', ${rank}): rank exceeds span ${t.span} — silent z collision risk.`);
    return t.base + Math.max(0, Math.min(rank, t.span));
}

/** True for tiers that MUST be body-portalled to be honoured (`<Layer>` portals these). */
export const isPortalTier = (tier: Tier): boolean => tierDef(tier)?.domain === 'portal';

/**
 * Back-compat numeric proxy. `Z.modal` etc. resolve to the tier base, so every
 * historical call site keeps working with zero churn. New code: prefer
 * `z(tier, rank)` / `<Layer tier=…>`.
 */
export const Z = new Proxy({} as Record<Tier, number>, {
    get: (_t, prop: string) => tierDef(prop)?.base ?? 0,
});

/**
 * Find pairs of PORTAL tiers whose `[base, base+span]` ranges intersect.
 * Shell tiers legitimately share values (different traps) and are exempt.
 * Used by `registerTiers` (throws) and the `test:zindex` gate (asserts).
 */
export function findPortalOverlaps(table: Record<string, TierDef> = TIER_TABLE): string[] {
    const portal = Object.entries(table).filter(([, d]) => d.domain === 'portal');
    const clashes: string[] = [];
    for (let i = 0; i < portal.length; i++) {
        for (let j = i + 1; j < portal.length; j++) {
            const [an, a] = portal[i];
            const [bn, b] = portal[j];
            const aHi = a.base + a.span;
            const bHi = b.base + b.span;
            if (a.base <= bHi && b.base <= aHi) clashes.push(`${an} [${a.base}..${aHi}] ∩ ${bn} [${b.base}..${bHi}]`);
        }
    }
    return clashes;
}

/**
 * Register app-private tiers without forking this module — the genericise-don't-fork
 * path for a new app/surface category. A new portal tier that overlaps an
 * existing portal band throws in dev (it would be a silent stacking bug);
 * shell tiers may share values freely. Idempotent re-registration of the same
 * tier name with the same def is a no-op.
 */
export function registerTiers(tiers: Record<string, TierDef>): void {
    for (const [name, def] of Object.entries(tiers)) {
        const existing = TIER_TABLE[name];
        if (existing) {
            if (existing.base === def.base && existing.span === def.span && existing.domain === def.domain) continue;
            throw new Error(`registerTiers: tier "${name}" already exists with a different definition.`);
        }
        const probe = { ...TIER_TABLE, [name]: def };
        if (def.domain === 'portal') {
            const clashes = findPortalOverlaps(probe).filter((c) => c.includes(name));
            if (clashes.length) throw new Error(`registerTiers: "${name}" overlaps an existing portal band: ${clashes.join(', ')}`);
        }
        TIER_TABLE[name] = def;
    }
}

/** The whole table, read-only — for tests, the lint gate, and devtools. */
export const allTiers = (): Readonly<Record<string, TierDef>> => ({ ...TIER_TABLE });
