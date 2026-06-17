/**
 * Unit tests for utils/DopeSheetRendererCache.
 *
 * Pure (no DOM / OffscreenCanvas needed) — they exercise the cache's
 * key-equality logic, eviction, and the key-builder helpers. Actual
 * off-screen canvas painting is exercised by the bench against real chromium.
 *
 * Run: npx tsx debug/test-dopesheet-renderer-cache.mts
 */

import {
    TrackDiamondCache,
    GroupDiamondCache,
    buildTrackDiamondViewKey,
    buildGroupDiamondViewKey,
} from '../utils/DopeSheetRendererCache';
import type { Keyframe } from '../types';
import type { CacheCanvas } from '../utils/DopeSheetRendererCache';

let pass = 0;
let fail = 0;
const failures: string[] = [];

const assert = (cond: boolean, msg: string) => {
    if (cond) { pass += 1; return; }
    fail += 1;
    failures.push(msg);
};

const assertEq = <T>(actual: T, expected: T, msg: string) => {
    assert(Object.is(actual, expected), `${msg} — expected ${String(expected)}, got ${String(actual)}`);
};

const fakeCanvas = (tag: string) => ({ __fake: tag } as unknown as CacheCanvas);

const mkKey = (id: string, frame: number, value = 0): Keyframe => ({
    id, frame, value, interpolation: 'Linear',
});

// ---------- TrackDiamondCache ----------

{
    const cache = new TrackDiamondCache();
    const keys = [mkKey('a', 0), mkKey('b', 10)];
    const c1 = fakeCanvas('c1');
    cache.set('t1', keys, 'v1', c1, 800, 32);

    const hit = cache.get('t1', keys, 'v1');
    assert(hit !== null, 'TrackDiamondCache: identical (id, keys, viewKey) hits');
    assertEq(hit?.canvas, c1, 'TrackDiamondCache: returns the stored canvas');
    assertEq(hit?.width, 800, 'TrackDiamondCache: returns stored width');
    assertEq(hit?.height, 32, 'TrackDiamondCache: returns stored height');
}

{
    const cache = new TrackDiamondCache();
    const keys = [mkKey('a', 0)];
    cache.set('t1', keys, 'v1', fakeCanvas('a'), 100, 10);

    const miss = cache.get('t1', keys, 'v2');
    assertEq(miss, null, 'TrackDiamondCache: viewKey mismatch misses');
}

{
    const cache = new TrackDiamondCache();
    const keysA = [mkKey('a', 0)];
    const keysB = [mkKey('a', 0)]; // structurally identical but different ref
    cache.set('t1', keysA, 'v1', fakeCanvas('a'), 100, 10);

    const miss = cache.get('t1', keysB, 'v1');
    assertEq(miss, null, 'TrackDiamondCache: keyframes-ref mismatch misses even if structurally equal');
}

{
    const cache = new TrackDiamondCache();
    const keys = [mkKey('a', 0)];
    cache.set('t1', keys, 'v1', fakeCanvas('a'), 1, 1);

    const miss = cache.get('t2', keys, 'v1');
    assertEq(miss, null, 'TrackDiamondCache: trackId mismatch misses');
}

{
    const cache = new TrackDiamondCache();
    const k1 = [mkKey('a', 0)];
    const k2 = [mkKey('a', 0)];
    cache.set('t1', k1, 'v', fakeCanvas('1'), 1, 1);
    cache.set('t2', k2, 'v', fakeCanvas('2'), 1, 1);
    assertEq(cache.size(), 2, 'TrackDiamondCache: size reflects two entries');

    cache.evictStale(new Set(['t2']));
    assertEq(cache.size(), 1, 'TrackDiamondCache: evictStale drops untracked entries');
    assertEq(cache.get('t1', k1, 'v'), null, 'TrackDiamondCache: evicted entry misses');
    assert(cache.get('t2', k2, 'v') !== null, 'TrackDiamondCache: retained entry still hits');
}

{
    const cache = new TrackDiamondCache();
    cache.set('t1', [mkKey('a', 0)], 'v', fakeCanvas('1'), 1, 1);
    cache.set('t2', [mkKey('b', 0)], 'v', fakeCanvas('2'), 1, 1);
    cache.clear();
    assertEq(cache.size(), 0, 'TrackDiamondCache: clear empties the cache');
}

{
    const cache = new TrackDiamondCache();
    const keys = [mkKey('a', 0)];
    cache.set('t1', keys, 'v1', fakeCanvas('old'), 1, 1);
    cache.set('t1', keys, 'v1', fakeCanvas('new'), 1, 1);
    const hit = cache.get('t1', keys, 'v1');
    assertEq((hit?.canvas as any)?.__fake, 'new', 'TrackDiamondCache: set overwrites prior entry for same key');
}

{
    const cache = new TrackDiamondCache();
    const keys = [mkKey('a', 0)];
    cache.get('t1', keys, 'v');                            // missNoEntry
    cache.set('t1', keys, 'v', fakeCanvas('a'), 1, 1);
    cache.get('t1', keys, 'v');                            // hit
    cache.get('t1', keys, 'v2');                           // missViewKey
    cache.get('t1', [mkKey('a', 0)], 'v');                 // missKeysRef
    assertEq(cache.stats.missNoEntry, 1, 'TrackDiamondCache.stats: missNoEntry counted');
    assertEq(cache.stats.hits, 1, 'TrackDiamondCache.stats: hits counted');
    assertEq(cache.stats.missViewKey, 1, 'TrackDiamondCache.stats: missViewKey counted');
    assertEq(cache.stats.missKeysRef, 1, 'TrackDiamondCache.stats: missKeysRef counted');
    assertEq(cache.stats.sets, 1, 'TrackDiamondCache.stats: sets counted');
}

// ---------- GroupDiamondCache ----------

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    const tB = [mkKey('b', 5)];
    const tokens = [tA, tB];
    const c1 = fakeCanvas('g1');
    cache.set('g1', tokens, 'v1', c1, 200, 24);

    const hit = cache.get('g1', tokens, 'v1');
    assert(hit !== null, 'GroupDiamondCache: identical (id, child tokens, viewKey) hits');
    assertEq(hit?.canvas, c1, 'GroupDiamondCache: returns the stored canvas');
}

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    const tokens = [tA];
    cache.set('g1', tokens, 'v1', fakeCanvas('a'), 1, 1);

    // External mutation of the array shouldn't drop the cache entry — set() snapshots.
    tokens.push([mkKey('b', 0)]);
    const hit = cache.get('g1', [tA], 'v1');
    assert(hit !== null, 'GroupDiamondCache: defensively copies the child-token array on set');
}

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    const tB = [mkKey('b', 0)];
    cache.set('g1', [tA, tB], 'v1', fakeCanvas('1'), 1, 1);

    const tB2 = [mkKey('b', 0)]; // structurally identical, different ref
    const miss = cache.get('g1', [tA, tB2], 'v1');
    assertEq(miss, null, 'GroupDiamondCache: any child keyframes-ref change invalidates the group entry');
}

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    cache.set('g1', [tA], 'v1', fakeCanvas('a'), 1, 1);

    const miss = cache.get('g1', [tA], 'v2');
    assertEq(miss, null, 'GroupDiamondCache: viewKey mismatch misses');
}

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    cache.set('g1', [tA], 'v', fakeCanvas('a'), 1, 1);

    const miss = cache.get('g2', [tA], 'v');
    assertEq(miss, null, 'GroupDiamondCache: groupId mismatch misses');
}

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    cache.set('g1', [tA], 'v', fakeCanvas('1'), 1, 1);
    cache.set('g2', [tA], 'v', fakeCanvas('2'), 1, 1);
    assertEq(cache.size(), 2, 'GroupDiamondCache: size reflects two entries');

    cache.evictStale(new Set(['g2']));
    assertEq(cache.size(), 1, 'GroupDiamondCache: evictStale drops untracked entries');
    assertEq(cache.get('g1', [tA], 'v'), null, 'GroupDiamondCache: evicted entry misses');
    assert(cache.get('g2', [tA], 'v') !== null, 'GroupDiamondCache: retained entry still hits');
}

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    cache.set('g1', [tA], 'v', fakeCanvas('a'), 1, 1);
    cache.set('g2', [tA], 'v', fakeCanvas('b'), 1, 1);
    cache.clear();
    assertEq(cache.size(), 0, 'GroupDiamondCache: clear empties the cache');
}

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    cache.set('g1', [tA], 'v1', fakeCanvas('old'), 1, 1);
    cache.set('g1', [tA], 'v1', fakeCanvas('new'), 1, 1);
    const hit = cache.get('g1', [tA], 'v1');
    assertEq((hit?.canvas as any)?.__fake, 'new', 'GroupDiamondCache: set overwrites prior entry for same key');
}

{
    const cache = new GroupDiamondCache();
    const tA = [mkKey('a', 0)];
    const tB = [mkKey('b', 0)];
    cache.set('g1', [tA, tB], 'v', fakeCanvas('1'), 1, 1);
    // Different number of children also fails.
    const miss = cache.get('g1', [tA], 'v');
    assertEq(miss, null, 'GroupDiamondCache: changed child count invalidates');
}

// ---------- buildTrackDiamondViewKey ----------

{
    const k1 = buildTrackDiamondViewKey(1.5, 32, false, 0);
    const k2 = buildTrackDiamondViewKey(1.5, 32, false, 0);
    assertEq(k1, k2, 'buildTrackDiamondViewKey: stable for identical inputs');

    const k3 = buildTrackDiamondViewKey(1.5, 32, true, 0);
    assert(k1 !== k3, 'buildTrackDiamondViewKey: flat flag changes the key');

    const k4 = buildTrackDiamondViewKey(1.50001, 32, false, 0);
    assertEq(k1, k4, 'buildTrackDiamondViewKey: rounds float-jitter (1e-4) to the same key');

    const k5 = buildTrackDiamondViewKey(1.6, 32, false, 0);
    assert(k1 !== k5, 'buildTrackDiamondViewKey: meaningful zoom change rekeys');

    const k6 = buildTrackDiamondViewKey(1.5, 24, false, 0);
    assert(k1 !== k6, 'buildTrackDiamondViewKey: rowHeight change rekeys');

    const k7 = buildTrackDiamondViewKey(1.5, 32, false, 100);
    assert(k1 !== k7, 'buildTrackDiamondViewKey: panX change rekeys');
}

// ---------- buildGroupDiamondViewKey ----------

{
    const k1 = buildGroupDiamondViewKey(1.5, 24, 0);
    const k2 = buildGroupDiamondViewKey(1.5, 24, 0);
    assertEq(k1, k2, 'buildGroupDiamondViewKey: stable for identical inputs');

    const k3 = buildGroupDiamondViewKey(1.50001, 24, 0);
    assertEq(k1, k3, 'buildGroupDiamondViewKey: rounds float-jitter (1e-4) to the same key');

    const k4 = buildGroupDiamondViewKey(1.5, 32, 0);
    assert(k1 !== k4, 'buildGroupDiamondViewKey: rowHeight change rekeys');

    const k5 = buildGroupDiamondViewKey(1.5, 24, 50);
    assert(k1 !== k5, 'buildGroupDiamondViewKey: panX change rekeys');
}

// ---------- Summary ----------

console.log(`[test-dopesheet-renderer-cache] ${pass} passed, ${fail} failed`);
if (failures.length > 0) {
    for (const f of failures) console.log(`  FAIL: ${f}`);
    process.exit(1);
}
process.exit(0);
