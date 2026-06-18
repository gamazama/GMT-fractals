/**
 * Engine drag-flight + send-target kernels harness (P0e — interfaces (b) + (c)).
 *
 * `dragFlightReducer` is the pure window-level drag tracker (depth counting + types
 * capture), and `targetsForPayload(payload, {selfId})` is exactly the set a "send to"
 * surface lists + whose `apply(payload)` it dispatches — so testing those covers the
 * behaviour without a DOM. (Same "view ≡ tested selector by construction" tactic as
 * sampleStops ⇄ renderStopsToRamp in test-palette-stopops.)
 *
 * Run: npx tsx debug/test-engine-dnd-kernels.mts
 */

import {
    dragFlightInitial,
    dragFlightReducer,
    type DragFlightState,
} from '../store/dragFlight';
import {
    registerSendTarget,
    unregisterSendTarget,
    getSendTargets,
    subscribeSendTargets,
    targetsForPayload,
    type SendTarget,
} from '../store/sendTargetRegistry';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
    if (!cond) { failures++; console.error('  ✗ ' + msg); }
    else console.log('  ✓ ' + msg);
};

const GRAD_MIME = 'application/x-gmt-gradient';

// ===== (b) drag-flight kernel =====
console.log('[b] dragFlightReducer: depth counting + types capture + reset');
{
    let s: DragFlightState = dragFlightInitial;
    ok(!s.inFlight && s.depth === 0, 'initial: not in flight');
    s = dragFlightReducer(s, { kind: 'enter', types: [GRAD_MIME] });
    ok(s.inFlight && s.depth === 1 && s.types[0] === GRAD_MIME, 'first enter: in flight, types captured');
    s = dragFlightReducer(s, { kind: 'enter', types: [] }); // nested child enter, browsers may report []
    ok(s.depth === 2 && s.types[0] === GRAD_MIME, 'nested enter: depth++ but types stay (not clobbered)');

    // Backfill: if the OUTERMOST enter reported empty types, a later non-empty
    // enter fills them in (else a well would never match that drag).
    let b: DragFlightState = dragFlightReducer(dragFlightInitial, { kind: 'enter', types: [] });
    ok(b.inFlight && b.types.length === 0, 'empty first enter: in flight but no types yet');
    b = dragFlightReducer(b, { kind: 'enter', types: [GRAD_MIME] });
    ok(b.types[0] === GRAD_MIME, 'later non-empty enter backfills the missing types');
    s = dragFlightReducer(s, { kind: 'leave' });
    ok(s.inFlight && s.depth === 1, 'one leave: still in flight (depth 1)');
    s = dragFlightReducer(s, { kind: 'leave' });
    ok(!s.inFlight && s.depth === 0 && s.types.length === 0, 'matching leave: reset to idle');

    // drop/dragend hard-reset even with unbalanced depth.
    s = dragFlightReducer(dragFlightInitial, { kind: 'enter', types: [GRAD_MIME] });
    s = dragFlightReducer(s, { kind: 'enter', types: [] });
    s = dragFlightReducer(s, { kind: 'end' });
    ok(!s.inFlight && s.depth === 0, 'end (drop/dragend) hard-resets regardless of depth');
}

// ===== (c) send-target kernel =====
type GradPayload = { kind: string; ramp: string };

console.log('[c1] registry: register / idempotent / apply dispatch / unregister');
{
    let applied: GradPayload | null = null;
    const unreg = registerSendTarget<GradPayload>({
        id: 'gen-a', label: 'Generator · Slot A', group: 'mode',
        apply: (p) => { applied = p; },
    });
    ok(getSendTargets().some((t) => t.id === 'gen-a'), 'target present after register');
    registerSendTarget({ id: 'gen-a', label: 'Generator · Slot A (2)', group: 'mode', apply: () => {} });
    ok(getSendTargets().filter((t) => t.id === 'gen-a').length === 1, 'idempotent by id');

    (getSendTargets().find((t) => t.id === 'gen-a') as SendTarget<GradPayload>).apply({ kind: 'picker', ramp: 'r' });
    ok((applied as GradPayload | null) === null, 'replacement target won (old apply not called)');
    unreg();
    ok(!getSendTargets().some((t) => t.id === 'gen-a'), 'unregister thunk removes the target');
}

console.log('[c2] targetsForPayload: self-filter + accepts predicate + group preserved');
{
    const a = registerSendTarget<GradPayload>({ id: 'gen-a', label: 'Slot A', group: 'mode', apply: () => {} });
    const b = registerSendTarget<GradPayload>({ id: 'gen-b', label: 'Slot B', group: 'mode', apply: () => {} });
    const host = registerSendTarget<GradPayload>({
        id: 'coloring', label: 'Coloring', group: 'host',
        accepts: (p) => p.kind !== 'favient', apply: () => {},
    });
    const boom = registerSendTarget<GradPayload>({
        id: 'bad', label: 'Bad', group: 'host',
        accepts: () => { throw new Error('x'); }, apply: () => {},
    });

    const fromGenA = targetsForPayload<GradPayload>({ kind: 'generator', ramp: 'r' }, { selfId: 'gen-a' }).map((t) => t.id);
    ok(!fromGenA.includes('gen-a'), 'selfId target is filtered out');
    ok(fromGenA.includes('gen-b') && fromGenA.includes('coloring'), 'other applicable targets included');
    ok(!fromGenA.includes('bad'), 'throwing accepts excludes the target (fail-safe)');

    const favient = targetsForPayload<GradPayload>({ kind: 'favient', ramp: 'r' }).map((t) => t.id);
    ok(!favient.includes('coloring'), 'accepts predicate hides non-applicable target (favient payload)');

    const groups = new Set(targetsForPayload<GradPayload>({ kind: 'image', ramp: 'r' }).map((t) => t.group));
    ok(groups.has('mode') && groups.has('host'), 'both groups represented (menu can section host vs mode)');

    a(); b(); host(); boom();
    ok(getSendTargets().length === 0, 'cleanup: no targets left');
}

console.log('[c3] subscribe fires on register + unregister');
{
    let n = 0;
    const unsub = subscribeSendTargets(() => { n++; });
    const u = registerSendTarget({ id: 'z', label: 'Z', group: 'mode', apply: () => {} });
    u();
    ok(n === 2, `listener fired on register + unregister (got ${n})`);
    unsub();
}

console.log('');
if (failures) { console.error(`FAILED: ${failures} assertion(s)`); process.exit(1); }
else console.log('ALL PASS — drag-flight + send-target kernels (b)+(c)');
