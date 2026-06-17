/**
 * Unit tests for utils/GraphRendererCache.
 *
 * Tests are pure (no DOM / OffscreenCanvas needed) — they exercise the cache's
 * key-equality logic, eviction, and the hash / key-builder helpers. The actual
 * off-screen canvas painting is exercised by the bench against real chromium.
 *
 * Run: npx tsx debug/test-graph-renderer-cache.mts
 */

import {
    PolylineCache,
    SoftSelectionMaskCache,
    hashSelectedIds,
    buildPolylineViewKey,
    buildMaskViewKey,
} from '../utils/GraphRendererCache';
import type { Keyframe } from '../types';
import type { CacheCanvas } from '../utils/GraphRendererCache';

let pass = 0;
let fail = 0;
const failures: string[] = [];

const assert = (cond: boolean, msg: string) => {
    if (cond) {
        pass += 1;
        return;
    }
    fail += 1;
    failures.push(msg);
};

const assertEq = <T>(actual: T, expected: T, msg: string) => {
    assert(Object.is(actual, expected), `${msg} — expected ${String(expected)}, got ${String(actual)}`);
};

/** Fake canvas sentinel for tests; the cache treats canvases as opaque values. */
const fakeCanvas = (tag: string) => ({ __fake: tag } as unknown as CacheCanvas);

const mkKey = (id: string, frame: number, value = 0): Keyframe => ({
    id,
    frame,
    value,
    interpolation: 'Linear',
});

// ---------- PolylineCache ----------

{
    const cache = new PolylineCache();
    const keys = [mkKey('a', 0), mkKey('b', 10)];
    const c1 = fakeCanvas('c1');
    cache.set('t1', keys, 'v1', c1, 800, 24);

    const hit = cache.get('t1', keys, 'v1');
    assert(hit !== null, 'PolylineCache: identical (id, keys, viewKey) hits');
    assertEq(hit?.canvas, c1, 'PolylineCache: returns the stored canvas');
    assertEq(hit?.width, 800, 'PolylineCache: returns stored width');
    assertEq(hit?.height, 24, 'PolylineCache: returns stored height');
}

{
    const cache = new PolylineCache();
    const keys = [mkKey('a', 0)];
    cache.set('t1', keys, 'v1', fakeCanvas('a'), 100, 10);

    const miss = cache.get('t1', keys, 'v2');
    assertEq(miss, null, 'PolylineCache: viewKey mismatch misses');
}

{
    const cache = new PolylineCache();
    const keysA = [mkKey('a', 0)];
    const keysB = [mkKey('a', 0)]; // structurally identical but different ref
    cache.set('t1', keysA, 'v1', fakeCanvas('a'), 100, 10);

    const miss = cache.get('t1', keysB, 'v1');
    assertEq(miss, null, 'PolylineCache: keyframes-ref mismatch misses even if structurally equal');
}

{
    const cache = new PolylineCache();
    const keys = [mkKey('a', 0)];
    cache.set('t1', keys, 'v1', fakeCanvas('a'), 1, 1);

    const miss = cache.get('t2', keys, 'v1');
    assertEq(miss, null, 'PolylineCache: trackId mismatch misses');
}

{
    const cache = new PolylineCache();
    const k1 = [mkKey('a', 0)];
    const k2 = [mkKey('a', 0)];
    cache.set('t1', k1, 'v', fakeCanvas('1'), 1, 1);
    cache.set('t2', k2, 'v', fakeCanvas('2'), 1, 1);
    assertEq(cache.size(), 2, 'PolylineCache: size reflects two entries');

    cache.evictStale(new Set(['t2']));
    assertEq(cache.size(), 1, 'PolylineCache: evictStale drops untracked entries');
    assertEq(cache.get('t1', k1, 'v'), null, 'PolylineCache: evicted entry misses');
    assert(cache.get('t2', k2, 'v') !== null, 'PolylineCache: retained entry still hits');
}

{
    const cache = new PolylineCache();
    cache.set('t1', [mkKey('a', 0)], 'v', fakeCanvas('1'), 1, 1);
    cache.set('t2', [mkKey('b', 0)], 'v', fakeCanvas('2'), 1, 1);
    cache.clear();
    assertEq(cache.size(), 0, 'PolylineCache: clear empties the cache');
}

{
    const cache = new PolylineCache();
    const keys = [mkKey('a', 0)];
    cache.set('t1', keys, 'v1', fakeCanvas('old'), 1, 1);
    cache.set('t1', keys, 'v1', fakeCanvas('new'), 1, 1);
    const hit = cache.get('t1', keys, 'v1');
    assertEq((hit?.canvas as any)?.__fake, 'new', 'PolylineCache: set overwrites prior entry for same key');
}

// ---------- SoftSelectionMaskCache ----------

{
    const cache = new SoftSelectionMaskCache();
    const c1 = fakeCanvas('m1');
    cache.set('k1', c1, 100, 20);

    const hit = cache.get('k1');
    assert(hit !== null, 'SoftSelectionMaskCache: matching key hits');
    assertEq(hit?.canvas, c1, 'SoftSelectionMaskCache: returns stored canvas');

    const miss = cache.get('k2');
    assertEq(miss, null, 'SoftSelectionMaskCache: mismatching key misses');

    cache.clear();
    assertEq(cache.get('k1'), null, 'SoftSelectionMaskCache: clear forgets the entry');
}

// ---------- hashSelectedIds ----------

{
    const a = hashSelectedIds(['t1::k1', 't1::k2']);
    const b = hashSelectedIds(['t1::k2', 't1::k1']);
    assertEq(a, b, 'hashSelectedIds: order-independent');

    const c = hashSelectedIds(['t1::k1']);
    const d = hashSelectedIds(['t1::k1', 't1::k2']);
    assert(c !== d, 'hashSelectedIds: different sets produce different hashes (or accept collision)');

    const e = hashSelectedIds([]);
    assertEq(e, '0', 'hashSelectedIds: empty list is stable');
}

// ---------- buildPolylineViewKey ----------

{
    const k1 = buildPolylineViewKey(1.5, 100, false, 0, 1);
    const k2 = buildPolylineViewKey(1.5, 100, false, 0, 1);
    assertEq(k1, k2, 'buildPolylineViewKey: stable for identical inputs');

    const k3 = buildPolylineViewKey(1.5, 100, true, 0, 1);
    assert(k1 !== k3, 'buildPolylineViewKey: normalized flag changes the key');

    const k4 = buildPolylineViewKey(1.50001, 100, false, 0, 1);
    assertEq(k1, k4, 'buildPolylineViewKey: rounds float-jitter (1e-4) to the same key');

    const k5 = buildPolylineViewKey(1.6, 100, false, 0, 1);
    assert(k1 !== k5, 'buildPolylineViewKey: meaningful zoom change rekeys');
}

// ---------- buildMaskViewKey ----------

{
    const k1 = buildMaskViewKey(['t1::k1'], 5, 'gaussian', 1.0);
    const k2 = buildMaskViewKey(['t1::k1'], 5, 'gaussian', 1.0);
    assertEq(k1, k2, 'buildMaskViewKey: stable for identical inputs');

    const k3 = buildMaskViewKey(['t1::k1'], 10, 'gaussian', 1.0);
    assert(k1 !== k3, 'buildMaskViewKey: radius change rekeys');

    const k4 = buildMaskViewKey(['t1::k1'], 5, 'linear', 1.0);
    assert(k1 !== k4, 'buildMaskViewKey: type change rekeys');

    const k5 = buildMaskViewKey(['t1::k2'], 5, 'gaussian', 1.0);
    assert(k1 !== k5, 'buildMaskViewKey: selection change rekeys');
}

// ---------- Summary ----------

console.log(`[test-graph-renderer-cache] ${pass} passed, ${fail} failed`);
if (failures.length > 0) {
    for (const f of failures) console.log(`  FAIL: ${f}`);
    process.exit(1);
}
process.exit(0);
