/**
 * Unit tests for the pure InteractionSessionMachine (ADR-0061 / phase P2 / E5).
 *
 *   tsx debug/test-interaction-session.mts   — runs all cases, exit 1 on any fail
 *
 * Node-only, no WebGL / no Chromium / no store. The machine takes `now` as a
 * parameter, so every time-based case advances an explicit clock — fully
 * deterministic. This is the cheapest verification tier (logic correctness):
 * ref-count balance, unbalanced-end, debounce tail, watchdog force-clear,
 * filtered isInteracting, edge semantics, poke throttle-shape, isIdle window.
 *
 * @see engine/InteractionSessionMachine.ts
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 */

import {
    createInteractionSessionState,
    beginInteraction,
    endInteraction,
    pokeInteraction,
    isInteracting,
    isIdle,
    tickWatchdog,
    interactionSources,
    DEFAULT_DEBOUNCE_MS,
    DEFAULT_MAX_SESSION_MS,
} from '../engine/InteractionSessionMachine';

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

const D = DEFAULT_DEBOUNCE_MS;

// ── ref-count balance: double-begin needs double-end ──────────────────────────
test('ref-count balance', () => {
    const s = createInteractionSessionState();
    beginInteraction(s, 'camera', 0);
    beginInteraction(s, 'camera', 0);
    endInteraction(s, 'camera', 0);
    check(s.hardActive === true, 'still hard-active after 2 begins / 1 end');
    check(isInteracting(s, 0) === true, 'isInteracting true with one ref outstanding');
    endInteraction(s, 'camera', 0);
    check(s.hardActive === false, 'hard-active false after balanced ends');
    check(interactionSources(s).size === 0, 'no live sources after balance');
});

// ── unbalanced end: no begin → flagged, no crash, no negative count ───────────
test('unbalanced end', () => {
    const s = createInteractionSessionState();
    const r = endInteraction(s, 'ghost', 0);
    check(r.unbalanced === true, 'unbalanced end flagged');
    check(r.edge === false, 'unbalanced end is not an edge');
    check(s.hardActive === false, 'unbalanced end leaves session idle');
    check((s.activeCounts.get('ghost') ?? 0) === 0, 'no negative ref-count');
});

// ── debounce tail: isInteracting stays true for DEBOUNCE_MS after last end ────
test('debounce tail', () => {
    const s = createInteractionSessionState();
    beginInteraction(s, 'slider', 0);
    endInteraction(s, 'slider', 1000);
    check(s.hardActive === false, 'no hard source after end');
    check(isInteracting(s, 1000 + D - 1) === true, 'within tail → still interacting');
    check(isInteracting(s, 1000 + D + 1) === false, 'past tail → idle');
});

// ── watchdog: stranded begin with no refresh force-clears at MAX_SESSION_MS ───
test('watchdog force-clear', () => {
    const s = createInteractionSessionState();
    beginInteraction(s, 'camera', 0);
    check(tickWatchdog(s, DEFAULT_MAX_SESSION_MS - 1).cleared === false, 'not cleared before max');
    const r = tickWatchdog(s, DEFAULT_MAX_SESSION_MS + 1);
    check(r.cleared === true, 'cleared at/after max');
    check(s.hardActive === false, 'session force-cleared');
    check(isInteracting(s, DEFAULT_MAX_SESSION_MS + 1 + D) === false, 'fully idle after clear + tail');
});

// ── watchdog stays armed while a live drag pokes (long continuous gesture) ────
test('watchdog refreshed by poke', () => {
    const s = createInteractionSessionState();
    beginInteraction(s, 'camera', 0);
    pokeInteraction(s, 'camera', 7000); // pointermove throttle-poke keeps it alive
    check(tickWatchdog(s, 8001).cleared === false, 'recent poke keeps watchdog disarmed');
    check(s.hardActive === true, 'still active after refresh');
    check(tickWatchdog(s, 7000 + DEFAULT_MAX_SESSION_MS + 1).cleared === true, 'fires once poke goes stale');
});

// ── filtered isInteracting (HUD-fade reads {only:['camera','scrub']}) ─────────
test('filtered isInteracting', () => {
    const s = createInteractionSessionState();
    beginInteraction(s, 'slider', 0);
    check(isInteracting(s, 0, { only: ['camera', 'scrub'] }) === false, 'slider invisible to camera-filter');
    check(isInteracting(s, 0, { only: ['slider'] }) === true, 'slider visible to slider-filter');
    check(isInteracting(s, 0, { except: ['slider'] }) === false, 'slider excluded by except-filter');
    beginInteraction(s, 'camera', 0);
    check(isInteracting(s, 0, { only: ['camera', 'scrub'] }) === true, 'camera visible to camera-filter');
});

// ── filtered debounce tail respects the filter ───────────────────────────────
test('filtered debounce tail', () => {
    const s = createInteractionSessionState();
    beginInteraction(s, 'slider', 0);
    endInteraction(s, 'slider', 100);
    check(isInteracting(s, 100 + D - 1, { only: ['camera'] }) === false, 'slider tail invisible to camera-filter');
    check(isInteracting(s, 100 + D - 1, { only: ['slider'] }) === true, 'slider tail visible to slider-filter');
});

// ── edge semantics: reactive boolean flips only on 0↔N (begin first / end last) ─
test('edge semantics', () => {
    const s = createInteractionSessionState();
    check(beginInteraction(s, 'camera', 0).edge === true, 'first begin is an edge');
    check(beginInteraction(s, 'slider', 0).edge === false, 'second source begin is NOT an edge');
    check(endInteraction(s, 'camera', 0).edge === false, 'end with another source live is NOT an edge');
    check(endInteraction(s, 'slider', 0).edge === true, 'last end is an edge');
});

// ── poke shape: refreshes the tail without a hard source / without an edge ────
test('poke is tail-only, no edge', () => {
    const s = createInteractionSessionState();
    const r = pokeInteraction(s, 'camera', 0);
    check(r.edge === false, 'poke is never an edge');
    check(s.hardActive === false, 'poke adds no hard source');
    check(isInteracting(s, D - 1) === true, 'poke refreshes the debounce tail');
    check(isInteracting(s, D + 1) === false, 'poke tail expires');
});

// ── isIdle: distinct window from the debounce (render idle-pause uses 1000ms) ─
test('isIdle window', () => {
    const s = createInteractionSessionState();
    beginInteraction(s, 'camera', 0);
    check(isIdle(s, 5000, 1000) === false, 'active session is never idle');
    endInteraction(s, 'camera', 0);
    check(isIdle(s, 999, 1000) === false, 'not idle before the window elapses');
    check(isIdle(s, 1000, 1000) === true, 'idle once the window elapses');
});

// ── fresh state: idle, not interacting, no spurious tail ──────────────────────
test('fresh state', () => {
    const s = createInteractionSessionState();
    check(isInteracting(s, 0) === false, 'fresh state not interacting');
    check(isIdle(s, 0, 1000) === true, 'fresh state is idle');
});

// ── report ────────────────────────────────────────────────────────────────────
if (failures.length === 0) {
    console.log(`✓ interaction-session machine: ${passed} assertions passed`);
    process.exit(0);
} else {
    console.error(`✗ interaction-session machine: ${failures.length} FAILED, ${passed} passed`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}
