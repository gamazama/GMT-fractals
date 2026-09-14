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
 *   [8] the RAMP form (ADR-0122): a stop gradient's signature is pinned (to its pre-ramp
 *       string until 2026-09-14; since ADR-0123 to the form that carries blend, bias and
 *       interpolation — see the section); a ramp signs `ramp:<ramp>`; two different ramps never dedupe into one; a stop
 *       favourite reaches disk without a stale ramp; a ramp favourite survives load and
 *       import byte-exact; the LOAD gate keeps a stop-less entry it cannot read while the
 *       IMPORT gate refuses one; and `readFavientDrag` (palette/core/favientDnd.ts) hands a
 *       ramp payload back byte-exact and a stop payload without its stale ramp
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
 *
 * ── FALSIFIED 2026-09-14 (section [8]) — each break made, run red (exit 1), reverted ──
 *   G1 `favientSig` without its stop-less branch (every ramp signs '') → 3 red: "tagged",
 *      "isFav does not match a different ramp", "two different ramps do not dedupe into one
 *      (1 favourites, 1 ramps)".
 *   G2 the ramp signature untagged (the bare ramp string) → 1 red, "tagged". Only that
 *      assertion sees it: no stop signature can equal a base64 ramp in practice, so the tag is
 *      pinned directly rather than through a collision the harness cannot construct.
 *   G3 the import gate without `hasReadableGradient` → 3 red in the import block. (Since
 *      2026-09-14 that gate is `palette/core/gradientDocument.ts` `decodeGradientDocument`, which
 *      `importCollection` and `readCollectionFavients` both call; `hasReadableGradient` is gone.
 *      Re-falsified that day: making `coerceGradientConfig`'s fallback admit `stops: []` with no
 *      ramp via the one-stop leniency → the same 3 red.)
 *   G4 the load path normalising stop-less entries too → 1 red, "the LOAD gate keeps a
 *      stop-less favourite it cannot read" (its ramp was stripped — deleted on next save).
 *   G5 `add` without `cleanConfig` → 1 red, "a stop favourite is saved without a stale ramp".
 *   G6 `readFavientDrag` requiring a non-empty stops list → 1 red, "a ramp drag payload".
 *   G7 `readFavientDrag` without `normalizeGradientConfig` → 1 red, "a stop drag payload
 *      loses a stale ramp". G8 `loadFavients` without `normalizeLoaded` → 1 red, "a stale
 *      ramp on a loaded stop favourite is stripped".
 *   Not claimed: `healStopIds`' early return for a ramp favourite — `ensureStopIds([])`
 *   already came back equal, so removing it stays green; it is clarity, not a guard.
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

console.log('\n[8] the RAMP form (ADR-0122): load, import, dedupe, the drag payload');
{
    const { encodeRamp } = await import('../utils/gradientRamp');
    const { readFavientDrag, FAVIENT_DND_MIME } = await import('../palette/core/favientDnd');
    const rampOf = (seed: number): string =>
        encodeRamp(Array.from({ length: 256 }, (_, i) => ({ r: (i * seed) % 256, g: (i + seed) % 256, b: 255 - i })));
    const rampCfg = (seed: number): GradientConfig => ({ stops: [], ramp: rampOf(seed), colorSpace: 'srgb', blendSpace: 'oklab' });

    // Identity: a stop gradient's signature is PINNED. ADR-0122 pinned it to the pre-ramp string
    // ('0:#112233:l|1000:#445566:l'); ADR-0123 deliberately superseded that pin for three fields —
    // blend space, bias and interpolation joined the signature (absent reads as oklab / 0.5 /
    // linear, as the renderer reads them) so gradients differing only there stop deduping into one.
    // Nothing persists a signature, so the change only makes more gradients distinct. Colour space
    // stays out. The ramp form is untouched. `npm run test:gradient-file` [6] pins the behaviour.
    check(favientSig(cfg('#112233', '#445566')) === '0:#112233:linear:500|1000:#445566:linear:500@oklab', '[8] a stop gradient\'s signature is the ADR-0123 form');
    check(favientSig({ ...cfg('#112233', '#445566'), ramp: rampOf(3) }) === '0:#112233:linear:500|1000:#445566:linear:500@oklab', '[8] a stale ramp on a stop gradient does not change its signature');
    check(favientSig(rampCfg(3)) === `ramp:${rampOf(3)}`, '[8] the ramp signature is tagged (ramp:<ramp>)');

    // Two different ramps must not collide — every stop-less config used to sign as ''.
    store().clear();
    store().add(rampCfg(3), 'Ramp three');
    check(store().isFav(rampCfg(3)) === true, '[8] isFav matches the same ramp');
    check(store().isFav(rampCfg(5)) === false, '[8] isFav does not match a different ramp');
    store().collectRecent(rampCfg(5), 'Ramp five');
    store().collectRecent(rampCfg(7), 'Ramp seven');
    store().collectRecent(rampCfg(5), 'Ramp five again');
    const ramps = store().favients.map((f) => (f.config as { ramp?: string }).ramp);
    check(store().favients.length === 3 && new Set(ramps).size === 3, `[8] two different ramps do not dedupe into one (${store().favients.length} favourites, ${new Set(ramps).size} ramps)`);

    // Persistence: a ramp favourite reaches disk with its ramp, and a stop favourite's saved form is unchanged.
    store().add({ ...cfg('#010101', '#fefefe'), ramp: rampOf(9) }, 'Stops with a stale ramp');
    const diskStop = onDisk().find((f: any) => f.name === 'Stops with a stale ramp') as any;
    check(!!diskStop && JSON.stringify(diskStop.config) === JSON.stringify(cfg('#010101', '#fefefe')), '[8] a stop favourite is saved without a stale ramp (byte-identical to its pre-ramp form)');
    const diskRamp = onDisk().find((f: any) => f.name === 'Ramp three') as any;
    check(!!diskRamp && diskRamp.config.ramp === rampOf(3) && Array.isArray(diskRamp.config.stops) && diskRamp.config.stops.length === 0, '[8] a ramp favourite is saved as stops: [] + its ramp');

    // Load: the ramp comes back byte-exact; a stale ramp is stripped; an UNREADABLE stop-less entry is kept.
    const unreadable = { id: 'unreadable', name: 'From a newer build', config: { stops: [], ramp: 'not-a-ramp-this-build-knows', colorSpace: 'srgb' }, createdAt: 1 };
    const staleOnDisk = { id: 'stale', name: 'Stale', config: { ...cfg('#202020', '#303030'), ramp: rampOf(11) }, createdAt: 1 };
    disk.set('gmt.favients', JSON.stringify([...onDisk(), unreadable, staleOnDisk]));
    store().reloadFromStorage();
    const loaded = store().favients.find((f) => f.name === 'Ramp three');
    check(!!loaded && (loaded.config as { ramp?: string }).ramp === rampOf(3) && loaded.config.stops.length === 0, '[8] a ramp favourite survives a load byte-exact');
    const lu = store().favients.find((f) => f.id === 'unreadable');
    check(!!lu && (lu.config as { ramp?: string }).ramp === 'not-a-ramp-this-build-knows', '[8] the LOAD gate keeps a stop-less favourite it cannot read, ramp untouched (dropping it would delete it from disk)');
    const ls = store().favients.find((f) => f.id === 'stale');
    check(!!ls && !('ramp' in ls.config) && ls.config.stops.length === 2, '[8] a stale ramp on a loaded stop favourite is stripped');

    // Import: ramp favourites are admitted and deduped by ramp; a stop-less one without a readable ramp is refused.
    store().clear();
    const coll = {
        version: 1,
        favients: [
            { id: 'r3', name: 'R3', config: rampCfg(3), createdAt: 1 },
            { id: 'r13', name: 'R13', config: rampCfg(13), createdAt: 1 },
            { id: 'noramp', name: 'No ramp', config: { stops: [], colorSpace: 'srgb' }, createdAt: 1 },
            { id: 'badramp', name: 'Bad ramp', config: { stops: [], ramp: rampOf(3).slice(1) }, createdAt: 1 },
        ],
        groupLabels: {},
    };
    check(readCollectionFavients(coll).length === 2, '[8] import: a stop-less favourite without a readable ramp is refused (2 of 4 admitted)');
    check(store().importCollection(JSON.stringify(coll), 'merge') === 2, '[8] import: two different ramp favourites are both admitted');
    check(store().importCollection(JSON.stringify(coll), 'merge') === 0, '[8] import: re-merging the same ramps adds nothing (dedupe by ramp)');
    check(store().favients.every((f) => (f.config as { ramp?: string }).ramp === rampOf(3) || (f.config as { ramp?: string }).ramp === rampOf(13)), '[8] import: the admitted ramps are byte-exact');

    // The drag payload.
    const dt = (payload: unknown) => ({ getData: (t: string) => (t === FAVIENT_DND_MIME ? JSON.stringify(payload) : '') });
    const pr = readFavientDrag(dt({ config: rampCfg(17), name: 'Dragged ramp' }));
    check(!!pr && (pr.config as { ramp?: string }).ramp === rampOf(17) && pr.config.stops.length === 0, '[8] a ramp drag payload reads back byte-exact');
    const ps = readFavientDrag(dt({ config: { ...cfg('#000000', '#ffffff'), ramp: rampOf(17) }, name: 'Dragged stops' }));
    check(!!ps && !('ramp' in ps.config) && ps.config.stops.length === 2, '[8] a stop drag payload loses a stale ramp');
    check(readFavientDrag(dt({ config: { stops: 'x' }, name: 'n' })) === null && readFavientDrag(dt({ config: rampCfg(1) })) === null, '[8] a drag payload with no stops array, or no name, is still refused');
}

console.log(failures === 0 ? '\nPASS — the Favients shelf gates what it ingests and persists' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
