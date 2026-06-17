/**
 * InteractionSessionMachine — pure decision logic for "is a continuous user
 * gesture in flight?". The deterministic core of ADR-0061's InteractionSession.
 *
 * SCOPE BOUNDARY (ADR-0061): this answers exactly ONE question — *is a gesture
 * active?* — and nothing else. It is deliberately NOT "should the engine be
 * doing work" (that composes gesture-activity with render-dirtiness, camera-
 * blocking, and scene-animation, each its own axis). Keeping it narrow is what
 * makes it correct *and* unit-testable. Do not grow it into a render-intent
 * god-object; that is the trap that produced the five-iteration patch cycle.
 *
 * Pure module: no DOM, no THREE, no React, no Zustand. Crucially it takes `now`
 * as a PARAMETER on every call (mirrors `tickAdaptiveResolution`) and never
 * reads a clock itself — otherwise the debounce-tail and watchdog cases are not
 * deterministically testable. State is mutated in place to avoid allocations.
 *
 * Layering: the `createInteractionSlice` Zustand wrapper owns one instance of
 * this state in a module-level ref, throttles `poke` (~50ms), and writes a
 * coarse reactive `interacting` boolean ONLY on the `edge` returned here (idle
 * ↔ active transitions). The render loop polls `isInteracting()` via getState()
 * so it sees the debounce tail without a subscription. (ADR Performance.)
 *
 *   - `hardActive` = activeCounts.size > 0. Flips only on 0↔N edges (the first
 *     begin and the last end), never on poke or debounce expiry. The reactive
 *     store boolean mirrors this — that is what makes it edge-only / cheap.
 *   - `isInteracting()` = hardActive OR within the DEBOUNCE_MS tail. This is the
 *     render-loop poll; it sees the tail. With a source filter it serves
 *     consumers like HUD-fade (`{ only: ['camera','scrub'] }`).
 *   - `isIdle(ms)` = !hardActive AND idle for >= ms. Distinct window from the
 *     debounce (e.g. the 1s render idle-pause). Consumers compose it with
 *     render-dirtiness; reading it alone is NOT "should we render".
 *   - Watchdog: a stranded `begin` with no `end` would leave the session active
 *     forever → never converges (the regression class we already hit). If a
 *     source is active but nothing has refreshed activity for MAX_SESSION_MS,
 *     force-clear. A live continuous drag refreshes via throttled `poke` on
 *     pointermove (a held-motionless drag legitimately settles). Last line of
 *     defence, not load-bearing.
 *
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 */

/** Open token — engine-core stays domain-agnostic (mirrors ADR-0059). GMT
 *  declares its canonical set (`camera|gizmo|slider|picker|drawing|scrub`) at
 *  the app level; a new input type (touch, MIDI) adds a token, never edits core. */
export type InteractionSource = string;

/** Debounce tail bridging micro-gaps within a drag (ADR open-Q #3 — lean 200ms
 *  to match the legacy input buffer). Distinct from the adaptive module's
 *  FPS-scaled `grace` (the downscale→upscale settle). Two windows, two jobs. */
export const DEFAULT_DEBOUNCE_MS = 200;

/** Watchdog backstop: force-clear a session continuously active this long with
 *  no activity refresh. Crude last-resort against a stranded `begin`. */
export const DEFAULT_MAX_SESSION_MS = 8000;

export interface SourceFilter {
    /** Consider only these sources (e.g. HUD-fade ignores slider/picker). */
    only?: InteractionSource[];
    /** Ignore these sources (e.g. an adaptive that doesn't care about `slider`). */
    except?: InteractionSource[];
}

export interface InteractionSessionState {
    /** Ref count per active source. A gesture can begin more than once
     *  (overlapping handlers, the camera token's OrbitControls + custom paths);
     *  balanced ends are required. Entries are deleted when their count hits 0,
     *  so `activeCounts.size` is the live-source count. */
    activeCounts: Map<InteractionSource, number>;
    /** Last activity (ms) per source — drives the filtered debounce tail so a
     *  filtered `isInteracting` sees the tail for its sources only. */
    lastActivityBySource: Map<InteractionSource, number>;
    /** Global last activity (ms): the unfiltered debounce tail anchor AND the
     *  watchdog anchor (updated by begin/end/poke). */
    lastActivityTime: number;
    /** Coarse "hard active" = activeCounts.size > 0. The reactive store boolean
     *  mirrors this; flips only on 0↔N edges, never on poke / debounce expiry. */
    hardActive: boolean;
}

export interface MutationResult {
    /** True when `hardActive` flipped this call — the slice writes the reactive
     *  boolean only on these edges (idle↔active), never per source-add. */
    edge: boolean;
    /** Dev-only: an `end`/`poke` for a source that wasn't begun (ref-count would
     *  go negative). The slice dev-warns; the set is left consistent regardless. */
    unbalanced?: boolean;
}

export function createInteractionSessionState(): InteractionSessionState {
    return {
        activeCounts: new Map(),
        lastActivityBySource: new Map(),
        lastActivityTime: -Infinity, // never interacted → not in any debounce tail
        hardActive: false,
    };
}

function recordActivity(state: InteractionSessionState, source: InteractionSource, now: number): void {
    state.lastActivityBySource.set(source, now);
    state.lastActivityTime = now;
}

/** Continuous gesture start. Ref-counted per source. */
export function beginInteraction(
    state: InteractionSessionState,
    source: InteractionSource,
    now: number,
): MutationResult {
    const wasActive = state.hardActive;
    state.activeCounts.set(source, (state.activeCounts.get(source) ?? 0) + 1);
    recordActivity(state, source, now);
    state.hardActive = true; // size >= 1 now
    return { edge: !wasActive };
}

/** Gesture end. Ref-counted; an unbalanced end can't strand or go negative. */
export function endInteraction(
    state: InteractionSessionState,
    source: InteractionSource,
    now: number,
): MutationResult {
    const count = state.activeCounts.get(source) ?? 0;
    if (count <= 0) {
        // No matching begin — leave counts consistent, flag for a dev-warn.
        return { edge: false, unbalanced: true };
    }
    if (count === 1) state.activeCounts.delete(source);
    else state.activeCounts.set(source, count - 1);

    const wasActive = state.hardActive;
    recordActivity(state, source, now); // a gesture end is activity → starts the tail
    state.hardActive = state.activeCounts.size > 0;
    return { edge: wasActive && !state.hardActive };
}

/** Discrete event (wheel / key) — refresh the activity timestamp, no source
 *  add, no end. Never flips `hardActive`, so `edge` is always false. The slice
 *  throttles these (~50ms) to coalesce bursts; the pure machine just records. */
export function pokeInteraction(
    state: InteractionSessionState,
    source: InteractionSource,
    now: number,
): MutationResult {
    recordActivity(state, source, now);
    return { edge: false };
}

function sourcePasses(source: InteractionSource, filter: SourceFilter): boolean {
    if (filter.only && !filter.only.includes(source)) return false;
    if (filter.except && filter.except.includes(source)) return false;
    return true;
}

/** Is a gesture active (incl. the debounce tail)? The render loop polls this.
 *  With a filter, restricts to the matching sources (active OR within tail). */
export function isInteracting(
    state: InteractionSessionState,
    now: number,
    filter?: SourceFilter,
    debounceMs: number = DEFAULT_DEBOUNCE_MS,
): boolean {
    if (!filter) {
        return state.hardActive || now - state.lastActivityTime < debounceMs;
    }
    for (const [src, count] of state.activeCounts) {
        if (count > 0 && sourcePasses(src, filter)) return true;
    }
    for (const [src, ts] of state.lastActivityBySource) {
        if (now - ts < debounceMs && sourcePasses(src, filter)) return true;
    }
    return false;
}

/** Idle for at least `ms` with no active source. Distinct window from the
 *  debounce — e.g. the render idle-pause uses `isIdle(now, 1000)`. Consumers
 *  COMPOSE this with render-dirtiness; alone it is not "should we render". */
export function isIdle(
    state: InteractionSessionState,
    now: number,
    ms: number = DEFAULT_DEBOUNCE_MS,
): boolean {
    return !state.hardActive && now - state.lastActivityTime >= ms;
}

/** Backstop for a stranded `begin`. Force-clears all sources if one is active
 *  but nothing refreshed activity for `maxSessionMs`. Returns `cleared` so the
 *  slice can dev-warn. A live drag avoids this by throttle-poking on pointermove. */
export function tickWatchdog(
    state: InteractionSessionState,
    now: number,
    maxSessionMs: number = DEFAULT_MAX_SESSION_MS,
): { cleared: boolean } {
    if (state.hardActive && now - state.lastActivityTime >= maxSessionMs) {
        state.activeCounts.clear();
        state.hardActive = false;
        // lastActivityTime is left as-is; the short debounce tail expires on its
        // own. Sources are gone, so isInteracting() collapses to the tail only.
        return { cleared: true };
    }
    return { cleared: false };
}

/** The currently live (hard-active) sources — for the dev overlay / telemetry. */
export function interactionSources(state: InteractionSessionState): ReadonlySet<InteractionSource> {
    return new Set(state.activeCounts.keys());
}

/** Sources active OR within the debounce tail. For observability only (the dev
 *  overlay): a discrete `poke` (wheel/key) adds NO hard-active source, so
 *  `interactionSources` reads empty while `isInteracting()` is true via the
 *  tail — this surfaces *which* source poked (e.g. wheel → `camera`) so that
 *  state is legible rather than an anonymous "(tail)". Not a hot-path API. */
export function recentInteractionSources(
    state: InteractionSessionState,
    now: number,
    debounceMs: number = DEFAULT_DEBOUNCE_MS,
): ReadonlySet<InteractionSource> {
    const out = new Set<InteractionSource>(state.activeCounts.keys());
    for (const [src, ts] of state.lastActivityBySource) {
        if (now - ts < debounceMs) out.add(src);
    }
    return out;
}
