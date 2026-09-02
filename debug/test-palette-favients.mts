/**
 * Guard: palette/store/favientsStore — the Favients shelf, the only palette store
 * that INGESTS UNTRUSTED INPUT and PERSISTS it.
 *
 * Favourites arrive from shared scene files and collection imports, and go to
 * localStorage (`gmt.favients`), so a malformed entry that slipped through would
 * survive every reload. The store's own JSDoc says its deserialization gate exists
 * precisely for that, and until 2026-09-02 no harness exercised it (overnight audit,
 * cycle 12: 23 of 24 palette store files unguarded).
 *
 * Runs against the real store with an in-memory `window.localStorage` shim installed
 * before the store module loads, so what is asserted is what the store reads and
 * writes through `store/safeLocalStorage.ts`.
 *
 *   [1] add persists to disk and reloadFromStorage picks up an external write
 *   [2] dedupe is by content signature, and the signature never throws on garbage
 *   [3] the LOAD gate drops malformed favourites (missing colour, NaN position,
 *       non-objects) and keeps the well-formed ones
 *   [4] importCollection rejects non-collections without touching the shelf, admits
 *       only well-formed entries, writes only those to disk, and never lets a
 *       `__proto__` group label become an own property
 *   [5] the undo snapshot round-trips and restore writes through to disk
 *
 * Run: `npm run test:palette-favients` (also a link of `test:palette`)
 *
 * ── FALSIFIED 2026-09-02 ─────────────────────────────────────────────────
 *   `isWellFormedFavient` returning true for anything: the run DIES in [3] with
 *   "Cannot read properties of null (reading 'id')" — the `null` seeded on disk
 *   reached memory and the first `.id` access threw (exit 1), which is the
 *   shelf-bricking failure the gate exists to prevent. `UNSAFE_KEYS` emptied:
 *   [4]'s "does not pollute the labels map" red (`polluted` became reachable
 *   through the prototype), everything else green.
 */

// ── localStorage shim, BEFORE the store loads ─────────────────────────────
const disk = new Map<string, string>();
const shim = {
    getItem: (k: string) => (disk.has(k) ? disk.get(k)! : null),
    setItem: (k: string, v: string) => { disk.set(k, String(v)); },
    removeItem: (k: string) => { disk.delete(k); },
    clear: () => disk.clear(),
    get length() { return disk.size; },
    key: (i: number) => [...disk.keys()][i] ?? null,
};
(globalThis as any).window = { localStorage: shim, addEventListener: () => {} };

const { useFavientsStore, favientSig, readCollectionFavients, captureFavientsHistory, restoreFavientsHistory, DEFAULT_GROUP } =
    await import('../palette/store/favientsStore');
type GradientConfig = import('../types').GradientConfig;

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => { failures++; console.log(`  ✗ ${m}`); };
const check = (cond: boolean, msg: string) => (cond ? ok(msg) : fail(msg));
const cfg = (...colors: string[]): GradientConfig => ({
    stops: colors.map((color, i) => ({ id: `s${i}`, position: colors.length === 1 ? 0 : i / (colors.length - 1), color })),
    colorSpace: 'srgb', blendSpace: 'oklab',
});
const onDisk = (): unknown[] => JSON.parse(disk.get('gmt.favients') ?? '[]');
const store = () => useFavientsStore.getState();

console.log('[1] add persists; reloadFromStorage sees an external write');
{
    store().clear();
    const id = store().add(cfg('#ff0000', '#0000ff'), 'Red to blue', 'harness');
    check(store().favients.length === 1 && store().favients[0].id === id, 'add() lands in memory');
    check(onDisk().length === 1 && (onDisk()[0] as any).id === id, 'add() lands on disk under gmt.favients');
    const external = [...onDisk(), { id: 'ext', name: 'From another tab', config: cfg('#00ff00'), createdAt: 1, group: DEFAULT_GROUP }];
    disk.set('gmt.favients', JSON.stringify(external));
    store().reloadFromStorage();
    check(store().favients.some(f => f.id === 'ext'), 'reloadFromStorage picks up a favourite written by another document');
}

console.log('\n[2] dedupe by content signature; signature never throws');
{
    store().clear();
    store().add(cfg('#112233', '#445566'), 'A');
    check(store().isFav(cfg('#112233', '#445566')) === true, 'isFav matches the same stops under a different id');
    check(store().isFav(cfg('#112233', '#445567')) === false, 'isFav does not match a different colour');
    let threw = false;
    try { favientSig({ stops: [null as any, { position: 'x' as any, color: 7 as any }] } as any); favientSig({} as any); } catch { threw = true; }
    check(!threw, 'favientSig coerces malformed stops instead of throwing');
}

console.log('\n[3] the load gate drops malformed favourites');
{
    const good = { id: 'good', name: 'Good', config: cfg('#000000', '#ffffff'), createdAt: 1 };
    const noColor = { id: 'nocolor', name: 'Bad', config: { stops: [{ id: 'x', position: 0 }], colorSpace: 'srgb', blendSpace: 'rgb' }, createdAt: 1 };
    const nanPos = { id: 'nanpos', name: 'Bad', config: { stops: [{ id: 'x', position: Number.NaN, color: '#fff' }], colorSpace: 'srgb', blendSpace: 'rgb' }, createdAt: 1 };
    const noStops = { id: 'nostops', name: 'Bad', config: { colorSpace: 'srgb' }, createdAt: 1 };
    disk.set('gmt.favients', JSON.stringify([good, noColor, 42, null, nanPos, 'str', noStops]));
    store().reloadFromStorage();
    const ids = store().favients.map(f => f.id);
    check(ids.length === 1 && ids[0] === 'good', `only the well-formed favourite loaded (got [${ids.join(', ')}])`);
    let threw = false;
    try { store().isFav(cfg('#000000', '#ffffff')); } catch { threw = true; }
    check(!threw, 'a dedupe check after the load does not throw');
}

console.log('\n[4] importCollection admits only well-formed entries and safe labels');
{
    store().clear();
    const before = JSON.stringify(onDisk());
    check(store().importCollection('not json', 'replace') === null, 'garbage JSON is rejected');
    check(store().importCollection('{"version":1}', 'replace') === null, 'a JSON object with no favients array is rejected');
    check(store().importCollection('null', 'replace') === null, 'a JSON null is rejected');
    check(JSON.stringify(onDisk()) === before, 'rejected imports leave the shelf untouched');
    const collection = {
        version: 1,
        favients: [
            { id: 'a', name: 'A', config: cfg('#101010', '#f0f0f0'), createdAt: 1, group: 'g1' },
            { id: 'bad', name: 'B', config: { stops: [{ id: 'x', position: 0 }] }, createdAt: 1, group: 'g1' },
            { id: 'c', name: 'C', config: cfg('#123456'), createdAt: 1, group: 'g1' },
            // A favourite IN the hostile group, so its label is not merely pruned as unused.
            { id: 'p', name: 'P', config: cfg('#0f0f0f'), createdAt: 1, group: '__proto__' },
        ],
        groupLabels: { g1: 'Imported', constructor: 'poison', ghost: 'no members' },
    };
    // `__proto__` in an object literal sets the prototype and never reaches JSON, so
    // it is injected into the serialised text — which is exactly how a hostile
    // scene file would carry it. An OBJECT value is the pollution vector:
    // `out['__proto__'] = {…}` would set the prototype of the labels map.
    const json = JSON.stringify(collection).replace('"groupLabels":{', '"groupLabels":{"__proto__":{"polluted":true},');
    check(json.includes('"__proto__":{"polluted":true}'), 'the import text really carries an object-valued __proto__ label');
    check(readCollectionFavients(collection).length === 3, 'readCollectionFavients previews exactly the well-formed entries');
    const n = store().importCollection(json, 'replace');
    check(n === 3, `replace import reports 3 admitted (got ${n})`);
    check(store().favients.length === 3 && store().favients.every(f => f.name !== 'B'), 'the malformed entry is not in memory');
    check(onDisk().length === 3 && onDisk().every((f: any) => f.name !== 'B'), 'the malformed entry is not on disk');
    const labels = store().groupLabels;
    check(labels.g1 === 'Imported', 'a label for a populated group is kept');
    check(!('polluted' in labels) && Object.getPrototypeOf(labels) === Object.prototype, 'a __proto__ label for a POPULATED group does not pollute the labels map');
    check(!Object.prototype.hasOwnProperty.call(labels, 'constructor'), 'a constructor label never becomes an own property');
    check(!('ghost' in labels), 'a label for an empty group is pruned');
    const m = store().importCollection(JSON.stringify({ version: 1, favients: [collection.favients[0], { id: 'd', name: 'D', config: cfg('#abcdef'), createdAt: 1 }] }), 'merge');
    check(m === 1 && store().favients.length === 4, `merge import adds only the gradient not already present (added ${m})`);
}

console.log('\n[5] undo snapshot round-trips and restore writes through');
{
    store().clear();
    store().add(cfg('#aa0000', '#00aa00'), 'One');
    const snap = captureFavientsHistory();
    store().add(cfg('#0000aa'), 'Two');
    check(store().favients.length === 2, 'a second favourite was added after the snapshot');
    restoreFavientsHistory(snap);
    check(store().favients.length === 1 && store().favients[0].name === 'One', 'restore returns memory to the snapshot');
    check(onDisk().length === 1, 'restore writes through to disk');
    restoreFavientsHistory({ garbage: true });
    check(store().favients.length === 1, 'a malformed snapshot is ignored');
}

console.log(failures === 0 ? '\nPASS — the Favients shelf gates what it ingests and persists' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
