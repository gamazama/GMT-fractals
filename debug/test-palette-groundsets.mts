/**
 * test-palette-groundsets — the pure half of "one ground, many sets" (GE v2 Phase D,
 * `palette/core/groundSets.ts`). Plain node, no browser, sub-second.
 *
 *   [1] the rail's order: All first, Recent's bins newest first (Today · Yesterday · a
 *       date), Kept, named groups in shelf order, Snapshots last; a group split into two
 *       runs is ONE chip with the summed count; Presets hides once Recent has anything
 *   [2] membersOf resolves a bin to that day's Recent entries and a group to its run(s), in
 *       shelf order; All and Snapshots resolve to nothing
 *   [3] favientsToEntries numbers rows 0..n-1 in input order, ids are the favourites' ids,
 *       ramps are 256 RGBA texels rendered in sRGB, and a rename does not re-render (the
 *       body cache hits by id + content)
 *   [4] tileSizeFor: never below the base in either axis, never grows with count, and the
 *       full catalogue keeps the base
 *   [5] parseSetId round-trips the id builders and reads garbage as the catalogue
 *   [6] insertMany (the store): files in one write at the START of an existing group's
 *       run, at the tail for a new group with a unique label, skips content already in
 *       that group, and returns the ids filed
 *
 * FALSIFIED 2026-09-08 (each reverted): dropping the `bins` push in `listGroundSets` reds
 * [1] "Today is second"; `favientsToEntries` numbering rows from 1 reds [3] "rows are
 * 0..n-1"; `tileSizeFor` returning the step without the `Math.max(base…)` floor reds [4]
 * "never below base" with a 320-wide base; `insertMany` splicing at index 0 instead of the
 * group's run reds [6] "joins the START of the group's run".
 */

// ── localStorage shim, BEFORE the store loads ─────────────────────────────
const mem = new Map<string, string>();
const shim = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, String(v)); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: (i: number) => Array.from(mem.keys())[i] ?? null,
  get length() { return mem.size; },
};
(globalThis as any).window = { localStorage: shim, addEventListener: () => {} };
(globalThis as any).localStorage = shim;

const { listGroundSets, membersOf, favientsToEntries, tileSizeFor, parseSetId, binSetId, groupSetId, ALL_SET_ID, SNAPSHOTS_SET_ID, KEPT_LABEL } =
  await import('../palette/core/groundSets');
const { useFavientsStore, RECENT_GROUP, DEFAULT_GROUP, PRESETS_GROUP, newGroupId } = await import('../palette/store/favientsStore');
const { dayKey } = await import('../palette/components/favientBlocks');
type Favient = import('../palette/store/favientsStore').Favient;
type GradientConfig = import('../types').GradientConfig;

let failures = 0;
const ok = (cond: boolean, msg: string): void => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};

const cfg = (a: string, b: string): GradientConfig => ({
  stops: [
    { id: 's0', position: 0, color: a, interpolation: 'linear' } as any,
    { id: 's1', position: 1, color: b, interpolation: 'linear' } as any,
  ],
  blendSpace: 'oklab',
  colorSpace: 'srgb',
} as GradientConfig);

const DAY = 86400000;
const now = new Date(2026, 8, 8, 12).getTime(); // 2026-09-08 noon local
let seq = 0;
const fav = (name: string, group: string | undefined, createdAt: number, a = '#ff0000', b = '#0000ff'): Favient => ({
  id: `f${seq++}`, name, config: cfg(a, b), createdAt, group,
});

// The shelf: Recent run first (today ×2, yesterday ×1, older ×1), then Kept, Ocean, Kept
// again (a split run), Presets.
const shelf: Favient[] = [
  fav('t1', RECENT_GROUP, now - 1000),
  fav('t2', RECENT_GROUP, now - 2000, '#00ff00', '#000000'),
  fav('y1', RECENT_GROUP, now - DAY),
  fav('o1', RECENT_GROUP, now - 3 * DAY),
  fav('k1', DEFAULT_GROUP, now),
  fav('oc1', 'g-ocean', now),
  fav('oc2', 'g-ocean', now),
  fav('k2', DEFAULT_GROUP, now),
  fav('p1', PRESETS_GROUP, now),
];
const labels = { [RECENT_GROUP]: 'Recent', 'g-ocean': 'Ocean', [PRESETS_GROUP]: 'Presets' };

console.log('[1] the rail order');
{
  const sets = listGroundSets({ favients: shelf, groupLabels: labels, catalogTotal: 11131, snapshotCount: 3, now });
  ok(sets[0].id === ALL_SET_ID && sets[0].count === 11131, 'All is first with the catalogue count');
  ok(sets[1].kind === 'bin' && sets[1].label === 'Today' && sets[1].count === 2, 'Today is second, count 2');
  ok(sets[2].label === 'Yesterday' && sets[2].count === 1, 'Yesterday third');
  ok(sets[3].kind === 'bin' && sets[3].label !== 'Today' && sets[3].label !== 'Yesterday', 'an older bin carries a date');
  ok(sets[4].kind === 'group' && sets[4].label === KEPT_LABEL && sets[4].count === 2, 'Kept follows the bins, split run summed to 2');
  ok(sets[5].label === 'Ocean' && sets[5].count === 2 && sets[5].id === groupSetId('g-ocean'), 'Ocean next, in shelf order');
  ok(!sets.some((s) => s.group === PRESETS_GROUP), 'Presets hides while Recent has anything');
  ok(sets[sets.length - 1].id === SNAPSHOTS_SET_ID && sets[sets.length - 1].count === 3, 'Snapshots last');
  const noRecent = listGroundSets({ favients: shelf.filter((f) => f.group !== RECENT_GROUP), groupLabels: labels, catalogTotal: 1, snapshotCount: 0, now });
  ok(noRecent.some((s) => s.group === PRESETS_GROUP), 'Presets shows when Recent is empty');
  ok(!noRecent.some((s) => s.id === SNAPSHOTS_SET_ID), 'no Snapshots chip without snapshots');
  ok(listGroundSets({ favients: [], groupLabels: {}, catalogTotal: 5, snapshotCount: 0 }).length === 1, 'an empty shelf is All alone');
}

console.log('[2] membersOf');
{
  const today = membersOf(binSetId(dayKey(now)), shelf);
  ok(today.map((f) => f.name).join(',') === 't1,t2', 'Today = the two Recent entries from today, in order');
  ok(membersOf(binSetId(dayKey(now - DAY)), shelf).map((f) => f.name).join() === 'y1', 'Yesterday = y1');
  ok(membersOf(groupSetId(DEFAULT_GROUP), shelf).map((f) => f.name).join() === 'k1,k2', 'Kept = both runs of the default group');
  ok(membersOf(groupSetId('g-ocean'), shelf).length === 2, 'Ocean = 2');
  ok(membersOf(ALL_SET_ID, shelf).length === 0 && membersOf(SNAPSHOTS_SET_ID, shelf).length === 0, 'All / Snapshots resolve to nothing');
}

console.log('[3] favientsToEntries');
{
  const favs = shelf.slice(0, 3);
  const entries = favientsToEntries(favs);
  ok(entries.map((e) => e.row).join() === '0,1,2', 'rows are 0..n-1 in order');
  ok(entries.every((e, i) => e.id === favs[i].id && e.name === favs[i].name), 'ids are the favourites\' ids');
  ok(entries.every((e) => e.ramp.length === 256 * 4 && e.ramp[3] === 255), 'ramps are 256 RGBA texels');
  const e0 = entries[0].ramp, e1 = entries[1].ramp;
  ok(e0[0] > 200 && e0[2] < 60 && e1[1] > 200, 'the ramp starts on the first stop\'s colour (red / green)');
  ok(typeof entries[0].facets.lightness === 'number', 'facets are computed');
  const renamed = favientsToEntries([{ ...favs[0], name: 'renamed' }]);
  ok(renamed[0].ramp === entries[0].ramp && renamed[0].name === 'renamed', 'a rename reuses the rendered body');
  ok(favientsToEntries([]).length === 0, 'an empty set is an empty list');
}

console.log('[4] tileSizeFor');
{
  const base = { w: 32, h: 18 };
  const sizes = [1, 5, 8, 9, 24, 25, 60, 61, 160, 161, 400, 401, 1500, 1501, 11131].map((n) => tileSizeFor(n, base));
  ok(sizes.every((s, i) => i === 0 || (s.w <= sizes[i - 1].w && s.h <= sizes[i - 1].h)), 'never grows with count');
  ok(sizes.every((s) => s.w >= base.w && s.h >= base.h), 'never below base');
  ok(sizes[0].w >= 160 && sizes[sizes.length - 1].w === 32, 'five is large, the full catalogue is the base');
  const big = tileSizeFor(3, { w: 320, h: 180 });
  ok(big.w === 320 && big.h === 180, 'a larger base wins over the step');
}

console.log('[5] parseSetId');
{
  ok(parseSetId(binSetId('2026-09-08')).kind === 'bin' && parseSetId(binSetId('2026-09-08')).key === '2026-09-08', 'bin round-trips');
  ok(parseSetId(groupSetId('')).kind === 'group' && parseSetId(groupSetId('')).key === '', 'the default group round-trips');
  ok(parseSetId(SNAPSHOTS_SET_ID).kind === 'snapshots', 'snapshots');
  ok(parseSetId('nonsense').kind === 'catalog' && parseSetId('').kind === 'catalog', 'garbage reads as the catalogue');
}

console.log('[6] insertMany');
{
  const st = () => useFavientsStore.getState();
  st().clear();
  st().insertFavient(cfg('#111111', '#222222'), 'a', 'x', 0, 'g-one');
  st().renameGroup('g-one', 'One');
  st().insertFavient(cfg('#333333', '#444444'), 'b', 'x', 1, 'g-two');
  st().renameGroup('g-two', 'Two');
  const ids = st().insertMany([{ config: cfg('#555555', '#666666'), name: 'c' }, { config: cfg('#999999', '#aaaaaa'), name: 'e' }], 'g-two');
  ok(ids.length === 2, 'two new items filed into Two (content is only deduped against that group)');
  const names = st().favients.map((f) => `${f.name}:${f.group}`).join(' ');
  ok(names === 'a:g-one c:g-two e:g-two b:g-two', `joins the START of the group's run — ${names}`);
  const again = st().insertMany([{ config: cfg('#555555', '#666666'), name: 'c again' }], 'g-two');
  ok(again.length === 0 && st().favients.length === 4, 'content already in the group is skipped');
  const g = newGroupId();
  const fresh = st().insertMany([{ config: cfg('#777777', '#888888'), name: 'd' }], g, 'One');
  ok(fresh.length === 1 && st().favients[st().favients.length - 1].group === g, 'a new group lands at the tail');
  ok(st().groupLabels[g] === 'One 2', `a new group's label is made unique — got "${st().groupLabels[g]}"`);
  ok(st().lastGroupId === g, 'the new group is the last-used group');
}

console.log(failures === 0 ? '\nPASS test-palette-groundsets' : `\nFAIL test-palette-groundsets (${failures})`);
process.exit(failures === 0 ? 0 : 1);
