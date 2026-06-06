/**
 * Engine drag/drop-wells + send-target kernels harness (P0e — interfaces (b) + (c)).
 *
 * The React shells (`DragWellsOverlay`, `SendToMenu`) are thin views over the
 * PURE selectors tested here:
 *   • the overlay renders exactly `wellsForTypes(types)` while a drag is in flight,
 *     and tracks the drag via `dragFlightReducer` — so testing those two covers
 *     what the overlay shows + when, without a DOM;
 *   • the menu lists exactly `targetsForPayload(payload, {selfId})` and dispatches
 *     the chosen target's `apply(payload)` — so testing that covers the menu.
 * (Same "view ≡ tested selector by construction" tactic as sampleStops ⇄
 * renderStopsToRamp in test-palette-stopops.)
 *
 * Run: npx tsx debug/test-engine-dnd-kernels.mts
 */

import {
    registerDropWell,
    unregisterDropWell,
    getDropWells,
    subscribeDropWells,
    wellsForTypes,
    type DropWell,
} from '../store/dropWellRegistry';
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

/** Minimal DataTransfer stand-in: just the `types` list + a keyed payload store. */
const fakeDataTransfer = (data: Record<string, string>): DataTransfer => ({
    types: Object.keys(data),
    getData: (k: string) => data[k] ?? '',
} as unknown as DataTransfer);

// ===== (b) drop-wells kernel =====
console.log('[b1] registry: register / get / idempotent-by-id / unregister');
{
    let dropped: string | null = null;
    const well: DropWell = {
        id: 'export',
        label: 'Export',
        accepts: (t) => t.includes(GRAD_MIME),
        onDrop: (dt) => { dropped = dt.getData(GRAD_MIME); },
    };
    const unreg = registerDropWell(well);
    ok(getDropWells().some((w) => w.id === 'export'), 'well present after register');
    registerDropWell({ ...well, label: 'Export!' }); // same id replaces
    ok(getDropWells().filter((w) => w.id === 'export').length === 1, 'idempotent by id (no dup)');
    ok(getDropWells().find((w) => w.id === 'export')?.label === 'Export!', 'replacement wins');

    // onDrop routing via a fake DataTransfer (getData unblocked at drop time).
    getDropWells().find((w) => w.id === 'export')!.onDrop(fakeDataTransfer({ [GRAD_MIME]: '{"kind":"generator"}' }));
    ok(dropped === '{"kind":"generator"}', 'onDrop reads the real payload from DataTransfer');

    unreg();
    ok(!getDropWells().some((w) => w.id === 'export'), 'unregister thunk removes the well');
}

console.log('[b2] wellsForTypes: MIME-presence visibility + throwing accepts excluded');
{
    const grad = registerDropWell({ id: 'g', label: 'G', accepts: (t) => t.includes(GRAD_MIME), onDrop: () => {} });
    const files = registerDropWell({ id: 'f', label: 'F', accepts: (t) => t.includes('Files'), onDrop: () => {} });
    const boom = registerDropWell({ id: 'x', label: 'X', accepts: () => { throw new Error('bad'); }, onDrop: () => {} });

    const forGrad = wellsForTypes([GRAD_MIME]).map((w) => w.id);
    ok(forGrad.includes('g') && !forGrad.includes('f'), 'only wells whose accepts(types) is true show (gradient drag)');
    ok(!forGrad.includes('x'), 'a throwing accepts is treated as not-accepting (overlay never blanks)');
    ok(wellsForTypes(['Files']).map((w) => w.id).includes('f'), 'file drag shows the file well');
    grad(); files(); boom();
    ok(wellsForTypes([GRAD_MIME]).length === 0, 'cleanup: no wells left');
}

console.log('[b3] subscribe fires on register + unregister');
{
    let n = 0;
    const unsub = subscribeDropWells(() => { n++; });
    const u = registerDropWell({ id: 's', label: 'S', accepts: () => true, onDrop: () => {} });
    u();
    ok(n === 2, `listener fired on register + unregister (got ${n})`);
    unsub();
}

console.log('[b4] dragFlightReducer: depth counting + types capture + reset');
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
else console.log('ALL PASS — drag/drop-wells + send-target kernels (b)+(c)');
