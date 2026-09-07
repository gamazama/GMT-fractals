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
 *   [6] collectRecent: the auto-collected Recent group — front-of-run dedupe, the
 *       cap, the "already filed by the user" no-op, the restored label, and the
 *       contiguous-run-at-index-0 invariant it shares with `add()`
 *   [7] updateRecent: the v2 working-session entry refreshed in place — no-op on same
 *       content, keeps id + place, absorbs a Recent duplicate, refuses a non-Recent id
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
 *
 * ── FALSIFIED 2026-09-03 (section [6]) ───────────────────────────────────
 *   `collectRecent` emitting `[...rest, ...run]` instead of `[...run, ...rest]`:
 *   3 failures, exit 1 — "the Recent run is one contiguous block at index 0" red at
 *   two of its three sites, plus "a collect after a user save ... leaves the save
 *   below the run". Restored: green. Note the third contiguity site stays GREEN
 *   under that break, and so do every index-0 check in the pure-Recent sub-cases:
 *   with no non-Recent favourites present `rest` is empty and both orders agree.
 *   The break is only observable once the shelf holds a user group as well — which
 *   is why the mixed cases are here and why deleting them would gut the guard.
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

const { useFavientsStore, favientSig, readCollectionFavients, captureFavientsHistory, restoreFavientsHistory, DEFAULT_GROUP, RECENT_GROUP, RECENT_LABEL, RECENT_CAP } =
    await import('../palette/store/favientsStore');
const { buildBlocks } = await import('../palette/components/favientBlocks');
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

console.log('\n[6] collectRecent auto-fills the Recent group');
{
    const groups = (): string[] => store().favients.map(f => f.group ?? DEFAULT_GROUP);
    // The invariant on collectRecent: every Recent entry sits in ONE run that starts at 0.
    // Vacuously true when nothing is collected yet.
    const contiguousAt0 = (): boolean => {
        const gs = groups();
        const n = gs.filter(g => g === RECENT_GROUP).length;
        return n === 0 || (gs.indexOf(RECENT_GROUP) === 0 && gs.lastIndexOf(RECENT_GROUP) === n - 1);
    };

    store().clear();
    const idA = store().collectRecent(cfg('#ff0000', '#0000ff'), 'Working gradient', 'editor');
    check(typeof idA === 'string', 'collectRecent returns the new favourite id');
    check(store().favients.length === 1 && store().favients[0].id === idA && store().favients[0].group === RECENT_GROUP,
        'a new collect lands at index 0 in RECENT_GROUP');
    check((onDisk()[0] as any)?.group === RECENT_GROUP, 'the collect is written through to disk');
    check(store().groupLabels[RECENT_GROUP] === RECENT_LABEL, 'the Recent divider label is set');

    // Promote, don't duplicate.
    store().collectRecent(cfg('#00ff00', '#00ffff'), 'Second');
    check(store().favients.length === 2 && store().favients[0].name === 'Second', 'the newest collect is at the front');
    const idA2 = store().collectRecent(cfg('#ff0000', '#0000ff'), 'Working gradient again');
    check(store().favients.length === 2, 're-collecting the same gradient does not duplicate it');
    check(idA2 === idA && store().favients[0].id === idA, 're-collecting moves the existing entry to the front and keeps its id');
    // `fresh` (entering a source again — the Image, a Mix — is new work, owner 2026-09-07):
    // a NEW entry even though the signature is already in Recent. Falsified by dropping the
    // `opts?.fresh ? -1 :` branch in collectRecent: the first check below goes red.
    const idA3 = store().collectRecent(cfg('#ff0000', '#0000ff'), 'Working gradient, fresh', 'Image', { fresh: true });
    check(idA3 !== idA && store().favients.length === 3, 'a fresh collect of a known signature opens a NEW Recent entry');
    check(store().favients[0].id === idA3 && store().favients[0].group === RECENT_GROUP, 'the fresh entry lands at the front of Recent');
    // D.1 — Recent files into DATED bins: the shelf splits its run at every change of local
    // day, Today / Yesterday / the date. Falsified by keying blocks on the group alone in
    // buildBlocks: "two days → two Recent blocks" goes red.
    {
      const now = Date.now();
      const recent = store().favients.filter((f) => f.group === RECENT_GROUP);
      check(recent.length >= 3, `three Recent entries to bin (${recent.length})`);
      const aged = recent.map((f, i) => ({ ...f, createdAt: now - (i === 2 ? 86400000 : 0) }));
      const blocks = buildBlocks(aged, now);
      check(blocks.length === 2, `two days → two Recent blocks (got ${blocks.length})`);
      check(blocks[0]?.label === 'Today' && blocks[0].favs.length === 2, `the first bin is Today with 2 (${blocks[0]?.label}, ${blocks[0]?.favs.length})`);
      check(blocks[1]?.label === 'Yesterday' && blocks[1].favs.length === 1, `the second bin is Yesterday with 1 (${blocks[1]?.label})`);
      const old = buildBlocks(recent.map((f) => ({ ...f, createdAt: now - 40 * 86400000 })), now);
      check(old.length === 1 && /\d/.test(old[0].label ?? ''), `an older day reads as a date (${old[0]?.label})`);
    }

    // lastGroupId is the landing group for the user's next deliberate save — a collect
    // must not steer it. Park it on a named group via the drag path, then collect.
    store().clear();
    store().insertFavient(cfg('#abcdef'), 'Kept', 'harness', 0, 'g1');
    check(store().lastGroupId === 'g1', 'insertFavient parks lastGroupId on the named group (precondition)');
    store().collectRecent(cfg('#010203', '#040506'), 'Auto');
    check(store().lastGroupId === 'g1', 'collectRecent leaves lastGroupId alone');
    check(contiguousAt0(), 'the Recent run is one contiguous block at index 0');

    // Already filed by the user → a no-op, not a shadow copy.
    const before = JSON.stringify(store().favients);
    const dup = store().collectRecent(cfg('#abcdef'), 'Kept again');
    check(dup === null, 'a gradient already in a named group returns null');
    check(JSON.stringify(store().favients) === before, 'and leaves the collection byte-identical');

    // The label survives its own pruning: emptying the run drops it, the next collect
    // puts it back (nothing else would).
    store().clear();
    const idP = store().collectRecent(cfg('#111111'), 'Solo')!;
    store().remove(idP);
    check(store().groupLabels[RECENT_GROUP] === undefined, 'emptying the run prunes the Recent label (precondition)');
    store().collectRecent(cfg('#222222'), 'Again');
    check(store().groupLabels[RECENT_GROUP] === RECENT_LABEL, 'the next collect restores the pruned Recent label');

    // Cap: oldest off the tail.
    store().clear();
    const hex = (i: number) => `#${i.toString(16).padStart(6, '0')}`;
    for (let i = 1; i <= RECENT_CAP + 5; i++) store().collectRecent(cfg(hex(i)), `c${i}`);
    check(store().favients.length === RECENT_CAP, `the run is capped at RECENT_CAP (${RECENT_CAP}, got ${store().favients.length})`);
    check(store().favients[0].name === `c${RECENT_CAP + 5}`, 'the newest collect survives at the front');
    check(!store().favients.some(f => f.name === 'c1'), 'the oldest collect fell off the tail');
    check(onDisk().length === RECENT_CAP, 'the capped run is what reaches disk');

    // A normal save must not split the run: the default group has no divider, so an
    // insert at literal index 0 would push Recent off the front.
    store().clear();
    store().collectRecent(cfg('#0a0a0a'), 'R1');
    store().collectRecent(cfg('#0b0b0b'), 'R2');
    check(store().lastGroupId === DEFAULT_GROUP, 'lastGroupId is still the default group (precondition)');
    store().add(cfg('#0c0c0c'), 'User save');
    check(store().favients.length === 3, 'the user save was added');
    check(contiguousAt0(), 'the Recent run is one contiguous block at index 0');
    check(store().favients[2].name === 'User save' && (store().favients[2].group ?? DEFAULT_GROUP) === DEFAULT_GROUP,
        'a default-group add() lands after the Recent run, not at index 0');

    // ...and the user keeps working: the next collect prepends to Recent and must leave
    // the save sitting below the run, not get emitted underneath it.
    store().collectRecent(cfg('#0e0e0e'), 'R3');
    check(contiguousAt0(), 'the Recent run is one contiguous block at index 0');
    check(store().favients[0].name === 'R3' && store().favients[3].name === 'User save',
        'a collect after a user save prepends to Recent and leaves the save below the run');

    // Dragging a favourite INTO Recent parks lastGroupId there; the next save must not
    // follow it in (it would silently fall off the cap).
    store().moveFavient(store().favients.find(f => f.name === 'User save')!.id, 0, RECENT_GROUP);
    check(store().lastGroupId === RECENT_GROUP, 'a drag into Recent parks lastGroupId there (precondition)');
    const idU = store().add(cfg('#0d0d0d'), 'Save after drag');
    const saved = store().favients.find(f => f.id === idU)!;
    check((saved.group ?? DEFAULT_GROUP) === DEFAULT_GROUP, 'add() with lastGroupId === RECENT_GROUP falls back to DEFAULT_GROUP');
    check(store().lastGroupId === DEFAULT_GROUP, 'and the fallback is what gets remembered');
}

console.log('\n[7] updateRecent refreshes a session entry in place');
{
    store().clear();
    const id = store().collectRecent(cfg('#ff0000', '#0000ff'), 'Session', 'Browse')!;
    store().collectRecent(cfg('#00ff00'), 'Other');
    check(store().favients.length === 2 && store().favients[0].name === 'Other', 'precondition: two Recent entries, Other in front');
    check(store().updateRecent(id, cfg('#ff0000', '#0000ff'), 'Session') === true, 'same content + name → true');
    const before = JSON.stringify(store().favients);
    store().updateRecent(id, cfg('#ff0000', '#0000ff'), 'Session');
    check(JSON.stringify(store().favients) === before, 'and writes nothing');
    check(store().updateRecent(id, cfg('#ff0000', '#00ff00'), 'Session edited') === true, 'an edit → true');
    const e = store().favients.find(f => f.id === id)!;
    check(favientSig(e.config) === favientSig(cfg('#ff0000', '#00ff00')) && e.name === 'Session edited', 'the entry now holds the edited gradient and name');
    check(store().favients.length === 2 && store().favients[1].id === id, 'it keeps its id and its place in the run');
    check(favientSig((onDisk().find((f: any) => f.id === id) as any).config) === favientSig(e.config), 'the update is written through to disk');
    // Converging on another Recent entry's content drops that entry: one-per-gradient.
    store().updateRecent(id, cfg('#00ff00'), 'Same as Other');
    check(store().favients.length === 1 && store().favients[0].id === id, 'an update that matches another Recent entry absorbs it');
    // No longer Recent → false, untouched.
    store().moveFavient(id, 0, 'g1');
    const kept = JSON.stringify(store().favients);
    check(store().updateRecent(id, cfg('#123456'), 'Nope') === false, 'an entry dragged into a user group returns false');
    check(JSON.stringify(store().favients) === kept, 'and is left byte-identical');
    check(store().updateRecent('no-such-id', cfg('#123456'), 'Nope') === false, 'an unknown id returns false');
}

console.log(failures === 0 ? '\nPASS — the Favients shelf gates what it ingests and persists' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
