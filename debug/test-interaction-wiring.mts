/**
 * P2 wiring tests for ADR-0061's InteractionSession (the parts the pure-machine
 * test in test-interaction-session.mts can't reach):
 *
 *   tsx debug/test-interaction-wiring.mts   — runs all cases, exit 1 on any fail
 *
 *   (1) WORKER READ-PATH (guards the silent-false-on-typo failure). The bridge
 *       sends `renderState.interacting` / `.isSceneAnimating`; a consumer that
 *       read a typo'd key would get `undefined` → falsy and adaptive would never
 *       engage, silently. We round-trip known values through the single source
 *       of truth (buildRenderInteractionState) AND through an Object.assign that
 *       mirrors FractalEngine.setRenderState, asserting the KEYS exist and carry
 *       the value.
 *   (2) SIBLING-APP INERTNESS. With NO producer calling beginInteraction, the
 *       slice writes nothing reactive and the watchdog is a no-op — so merely
 *       composing createInteractionSlice into fluid-toy / fractal-toy changes
 *       no behaviour. Then a "proves it's wired (not dead)" pass shows a real
 *       gesture does flip the edge boolean.
 *
 * Node-only, no WebGL / no Chromium / no React. EngineRenderState is a type-only
 * import inside renderInteractionState (erased), so importing it here does not
 * boot the engine.
 *
 * @see engine-gmt/renderer/renderInteractionState.ts
 * @see store/slices/createInteractionSlice.ts
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 */

import {
    buildRenderInteractionState,
    deriveInteracting,
    deriveIsSceneAnimating,
} from '../engine-gmt/renderer/renderInteractionState';
import { createInteractionSlice } from '../store/slices/createInteractionSlice';

let passed = 0;
const failures: string[] = [];

function check(cond: boolean, msg: string): void {
    if (cond) passed++;
    else failures.push(msg);
}

function test(name: string, fn: () => void): void {
    try {
        fn();
    } catch (e) {
        failures.push(`${name}: threw ${(e as Error).message}`);
    }
}

// ── (1) Worker read-path: keys exist + carry the value (silent-false guard) ──
test('read-path: interacting key round-trips true', () => {
    const block = buildRenderInteractionState({ sessionInteracting: true, sessionHoldActive: false, isPlaying: false, hasActiveModulation: false });
    check('interacting' in block, 'block has an `interacting` key (not a typo → undefined)');
    check(block.interacting === true, 'interacting carries the true value');
    check((block as Record<string, unknown>).interactng === undefined, 'a typo key reads undefined — exactly the silent-false the SSOT prevents');
});

test('read-path: isSceneAnimating key + playback/LFO derivation', () => {
    const block = buildRenderInteractionState({ sessionInteracting: false, sessionHoldActive: false, isPlaying: false, hasActiveModulation: false });
    check('isSceneAnimating' in block, 'block has an `isSceneAnimating` key');
    check(block.isSceneAnimating === false, 'idle → not scene-animating');
    check(deriveIsSceneAnimating({ sessionInteracting: false, sessionHoldActive: false, isPlaying: true, hasActiveModulation: false }) === true, 'playback → scene-animating');
    check(deriveIsSceneAnimating({ sessionInteracting: false, sessionHoldActive: false, isPlaying: false, hasActiveModulation: true }) === true, 'active LFO → scene-animating');
    check(deriveInteracting({ sessionInteracting: false, sessionHoldActive: false, isPlaying: true, hasActiveModulation: true }) === false, 'playback is NOT gesture activity (scope boundary)');
});

test('read-path: sessionHoldActive key round-trips (P4 hold consumer)', () => {
    const held = buildRenderInteractionState({ sessionInteracting: true, sessionHoldActive: true, isPlaying: false, hasActiveModulation: false });
    check('sessionHoldActive' in held, 'block has a `sessionHoldActive` key');
    check(held.sessionHoldActive === true, 'sessionHoldActive carries the filtered hold value');
    // A slider-only gesture: unfiltered interacting is true, but the hold subset
    // (camera/gizmo/scrub) is false — the hold must NOT freeze the frame.
    const sliderOnly = buildRenderInteractionState({ sessionInteracting: true, sessionHoldActive: false, isPlaying: false, hasActiveModulation: false });
    check(sliderOnly.interacting === true && sliderOnly.sessionHoldActive === false, 'slider-only: adaptive sees it (interacting) but hold does not (sessionHoldActive false)');
});

test('read-path: Object.assign mirrors FractalEngine.setRenderState', () => {
    // Mirror setRenderState's `Object.assign(this.state, partial)` — the actual
    // worker consumer read path. A key mismatch here would leave the default.
    const engineState: { interacting: boolean; isSceneAnimating: boolean; sessionHoldActive: boolean } = { interacting: false, isSceneAnimating: false, sessionHoldActive: false };
    Object.assign(engineState, buildRenderInteractionState({ sessionInteracting: true, sessionHoldActive: true, isPlaying: true, hasActiveModulation: false }));
    check(engineState.interacting === true, 'setRenderState path lands interacting=true (not silently false)');
    check(engineState.isSceneAnimating === true, 'setRenderState path lands isSceneAnimating=true');
    check(engineState.sessionHoldActive === true, 'setRenderState path lands sessionHoldActive=true');
});

// ── (2) Sibling-app inertness: no producer ⇒ no reactive write, watchdog no-op ─
function makeSliceHarness() {
    const state: Record<string, any> = {};
    const setCalls: any[] = [];
    const set = (partial: any) => {
        const patch = typeof partial === 'function' ? partial(state) : partial;
        Object.assign(state, patch);
        setCalls.push(patch);
    };
    const get = () => state;
    const slice = createInteractionSlice(set as any, get as any, {} as any);
    Object.assign(state, slice); // installs initial fields + action closures
    return { state, setCalls };
}

test('inertness: fresh slice is idle (P5: session is the sole signal, no flags)', () => {
    const { state } = makeSliceHarness();
    check(state.interacting === false, 'reactive boolean defaults false');
    // P5 removed the per-consumer kill-switch flags + the divergence instrument
    // (the session is now permanent); they should no longer exist on the slice.
    check(state.interactionConsumerFlags === undefined, 'per-consumer flags removed in P5');
    check(state.interactionDivergenceCount === undefined, 'divergence instrument removed in P5');
});

test('inertness: read-only API + watchdog make ZERO reactive writes without a producer', () => {
    const { state, setCalls } = makeSliceHarness();
    const writesBefore = setCalls.length; // construction uses Object.assign, not set → 0
    check(state.isInteracting() === false, 'no gesture → isInteracting false');
    check(state.isIdle(1000) === true, 'no gesture → isIdle true');
    check(state.getInteractionSources().size === 0, 'no live sources');
    check(state.getLastActivityTime() === -Infinity, 'never any activity');
    state.tickInteractionWatchdog();              // inert: nothing active to clear
    state.tickInteractionWatchdog();
    check(state.interacting === false, 'watchdog leaves the boolean false');
    check(setCalls.length === writesBefore, 'NO store writes from reads/watchdog (slice provably inert without producers)');
});

test('wired-not-dead: a real gesture flips the edge boolean exactly once per edge', () => {
    const { state, setCalls } = makeSliceHarness();
    const base = setCalls.length;
    state.beginInteraction('camera');
    check(state.interacting === true, 'first begin → interacting true');
    check(setCalls.length === base + 1, 'idle→active is one write');
    state.beginInteraction('slider'); // second source, not an edge
    check(setCalls.length === base + 1, 'second source begin writes nothing');
    state.endInteraction('camera');   // still one source live, not an edge
    check(setCalls.length === base + 1, 'non-final end writes nothing');
    check(state.interacting === true, 'still active with slider outstanding');
    state.endInteraction('slider');   // last end → edge
    check(state.interacting === false, 'last end → interacting false');
    check(setCalls.length === base + 2, 'active→idle is one write');
});

// ── report ──────────────────────────────────────────────────────────────────
if (failures.length === 0) {
    console.log(`✓ interaction-session wiring (read-path + inertness): ${passed} assertions passed`);
    process.exit(0);
} else {
    console.error(`✗ interaction-session wiring: ${failures.length} FAILED, ${passed} passed`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}
