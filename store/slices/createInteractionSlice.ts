/**
 * createInteractionSlice — the Zustand wrapper around the pure
 * InteractionSessionMachine (ADR-0061). Single source of truth for gesture
 * activity ("is a continuous user gesture in flight?").
 *
 * SCOPE BOUNDARY (ADR-0061): gesture activity ONLY — not "should the engine be
 * doing work". Render-dirtiness, camera-blocking, and scene-animation are each
 * a separate axis; consumers COMPOSE this with them rather than the session
 * absorbing them. Keeping it narrow is what makes it correct *and* testable —
 * widening it into a render-intent god-object is the trap that produced the
 * five-iteration patch cycle.
 *
 * TRANSIENT-REACTIVE (ADR Performance). This primitive sits on the hottest path
 * in the app (wheel 10–50/s, pointermove / slider onChange 60–120Hz), and the
 * codebase has already tripped React's "Maximum update depth" from interaction
 * re-render storms (see the liveModulations guard in AnimationSystem.tsx). So:
 *   - The machine's HOT state (active sources, timestamps) lives in a
 *     MODULE-LEVEL ref — the exact pattern viewportSlice uses for `_adaptive`.
 *     begin/end/poke mutate the ref; there is no per source-add store write.
 *   - The ONLY reactive store write is the coarse `interacting` boolean, set
 *     ONLY on the machine's `edge` (idle↔active) — once per gesture, never per
 *     pointermove. It mirrors `hardActive`; the debounce tail is visible only
 *     via the polled `isInteracting()`, not the reactive boolean.
 *   - `pokeInteraction` is throttled (~50ms) and only bumps the ref timestamp —
 *     NO store write, ever.
 *   - The read API (isInteracting / isIdle / getInteractionSources /
 *     getLastActivityTime) is read via getState() on hot paths; nothing here
 *     subscribes.
 *
 * P2 is INERT: no producer calls beginInteraction yet (that is P3a/P3b), so in
 * GMT *and* in sibling apps (fluid-toy / fractal-toy, which compose this same
 * store) the machine is never activated, the edge boolean stays false, and the
 * watchdog is a no-op. Proven in debug/test-interaction-wiring.mts.
 *
 * @see engine/InteractionSessionMachine.ts
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 */

import { StateCreator } from 'zustand';
import { EngineStoreState, EngineActions, InteractionConsumerFlags } from '../../types';
// Namespace import so each call reads as the wrapper delegating to the machine
// (`machine.beginInteraction(_session, …)`) and there's no name collision with
// this slice's own begin/end/poke actions.
import * as machine from '../../engine/InteractionSessionMachine';
import type {
    InteractionSessionState,
    InteractionSource,
    SourceFilter,
} from '../../engine/InteractionSessionMachine';

export type InteractionSlice = Pick<EngineStoreState,
    'interacting' | 'interactionConsumerFlags' | 'interactionDivergenceCount'
> & Pick<EngineActions,
    'beginInteraction' | 'endInteraction' | 'pokeInteraction' |
    'isInteracting' | 'isIdle' | 'getInteractionSources' | 'getLastActivityTime' |
    'tickInteractionWatchdog' | 'setInteractionConsumerFlag'
>;

// ── Machine instance + poke throttle (module-level refs; NOT reactive) ──────
// Mirrors viewportSlice's `_adaptive` ref: hot state never triggers a rerender.
// One machine per app store; sibling apps that compose this slice each get
// their own copy and none of them activate it in P2.
const _session: InteractionSessionState = machine.createInteractionSessionState();
let _lastPokeMs = -Infinity;     // ~50ms poke throttle (coalesce wheel/key bursts)
const POKE_THROTTLE_MS = 50;

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// import.meta.env is undefined under node tsx (the tests) → no-op there; Vite
// defines DEV in the browser/dev build. Cast avoids needing vite/client types here.
const devWarn = (msg: string): void => {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) console.warn(msg);
};

export const createInteractionSlice: StateCreator<
    EngineStoreState & EngineActions,
    [['zustand/subscribeWithSelector', never]],
    [],
    InteractionSlice
> = (set, get) => ({
    interacting: false,
    interactionConsumerFlags: { adaptive: false, hold: false, hudFade: false, idlePause: false },
    interactionDivergenceCount: 0,

    beginInteraction: (source: InteractionSource) => {
        const { edge } = machine.beginInteraction(_session, source, now());
        // Reactive write ONLY on the idle→active edge (once per gesture).
        if (edge) set({ interacting: true });
    },

    endInteraction: (source: InteractionSource) => {
        const { edge, unbalanced } = machine.endInteraction(_session, source, now());
        if (unbalanced) {
            devWarn(`[InteractionSession] endInteraction('${source}') with no matching begin — ignored (ref-count stayed consistent).`);
        }
        // `edge` here is the active→idle transition (last source released). The
        // debounce tail keeps the *polled* isInteracting() true a little longer;
        // the coarse boolean mirrors hardActive, so it flips off now.
        if (edge) set({ interacting: false });
    },

    pokeInteraction: (source: InteractionSource) => {
        const t = now();
        if (t - _lastPokeMs < POKE_THROTTLE_MS) return; // coalesce bursts — no ref/store write
        _lastPokeMs = t;
        machine.pokeInteraction(_session, source, t); // timestamp-only refresh; never edges, never writes the store
    },

    isInteracting: (filter?: SourceFilter) => machine.isInteracting(_session, now(), filter),

    isIdle: (ms?: number) => machine.isIdle(_session, now(), ms),

    getInteractionSources: () => machine.interactionSources(_session),

    getLastActivityTime: () => _session.lastActivityTime,

    tickInteractionWatchdog: () => {
        const { cleared } = machine.tickWatchdog(_session, now());
        if (cleared) {
            devWarn('[InteractionSession] watchdog force-cleared a stranded session (a producer missed an endInteraction).');
            // A force-clear is an active→idle edge; mirror it onto the boolean so
            // the low-frequency reactive UI doesn't latch stale-true. (Hot-path
            // consumers already poll isInteracting(), which collapses on its own.)
            if (get().interacting) set({ interacting: false });
        }
    },

    setInteractionConsumerFlag: (key, value) =>
        set((s) => ({ interactionConsumerFlags: { ...s.interactionConsumerFlags, [key]: value } })),
});
