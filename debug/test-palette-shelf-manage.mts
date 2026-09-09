/**
 * test-palette-shelf-manage — the shelf's MANAGE surface: everything the GE v2 set rail
 * gained on 2026-09-09 (§8b item 4, the 2026-09-08 migration audit's M1-M4 / M7 / M12),
 * when the operations that lived only inside the My Gradients kebab — and only ever meant
 * the whole collection — became things you do to the set you are pointing at.
 *
 * Plain node, no browser, sub-second.
 *
 *   [1] importGradientFiles: parsing is fail-safe on hostile and malformed input, every
 *       imported item is named from its filename and carries `Import · .<fmt>`, and a
 *       failed read counts as skipped rather than aborting the batch
 *   [2] importGradientsInto: WHERE an import lands and what it dedupes against — a group
 *       dedupes within that group (a gradient kept elsewhere can still join it), no group
 *       dedupes across the whole collection (the panel kebab's historical behaviour)
 *   [3] importSummary's wording, and isGradientFileName / GRADIENT_FILE_ACCEPT
 *   [4] removeGroup: the group goes, its gradients move to Kept as ONE run, the label is
 *       dropped, lastGroupId cannot be left pointing at it, and the default group, Recent
 *       and an unknown id are no-ops
 *   [5] listGroundSets shows a labelled-but-EMPTY group (so a group can be created before
 *       it is filled), and membersOfMany unions several sets, deduped, in shelf order
 *   [6] the ground SELECTION: All is exclusive, the selection is never empty, toggle adds
 *       and removes, ctrl-click's setGroundSetId replaces, and a pre-2026-09-09 bare id in
 *       localStorage reads back as a one-element selection
 *   [7] fileFavientsAt — a BATCH lands as one contiguous run, in the order given, at the
 *       place asked for, in one store write; and wallSelection's snapshot is
 *       reference-stable (the wall's paint effect has it in a dependency array)
 *   [8] fileFavientInto — the ONE rule behind every drop target (a rail chip, a band on
 *       the wall): a favourite MOVES rather than copying, a gradient that matches by
 *       CONTENT moves too, a drop onto its own group does nothing, and an unnamed payload
 *       is named the way every other add-path names it
 *
 * A section pinning `setV2FavientsPanelKey` is gone. It, which guarded a cross-host leak
 * that only existed while GE v2 mounted `FavientsPanel`. v2 retired that panel on
 * 2026-09-09 (the collection kebab is all that survives), so the fix, its call and this
 * section went with it rather than sitting here as a guard for a surface that is gone. The
 * leak itself is real and recorded in the plan, should the panel ever come back.
 *
 * FALSIFIED 2026-09-09 — breaks reverted one at a time, each exit 1. Three
 * assertions PASSED under mutation on the first attempt and were rewritten; they are noted
 * because the weakness, not the fix, is the lesson.
 *
 *   • `gradientName` losing its `|| 'imported'` fallback → 2 red. First attempt passed:
 *     every fixture had a real filename stem, so the fallback was never reached. A file
 *     named `"   .map"` now exercises it.
 *   • `importGradientsInto` using `add`+`isFav` instead of `insertMany` for a group → 8 red
 *     ("into ANOTHER group: a gradient kept elsewhere still joins (got 0)").
 *   • `removeGroup` keeping the label → 1 red. Splicing the re-homed block to the ends
 *     instead of into Kept's run → 1 red ("Kept is ONE contiguous run … (got KK.K)").
 *     That one also passed at first: with everything in Kept the contiguity check was
 *     vacuous, so section [4] now keeps a THIRD group that survives the removal.
 *   • `listGroundSets` dropping the empty-group pass → 2 red.
 *   • `membersOfMany` concatenating the sets in the order asked for instead of walking the
 *     shelf → 1 red. Also vacuous at first, because the test named the sets in shelf order;
 *     it now names them in the reverse.
 *   • `normalise` returning an empty selection → 3 red; dropping All's exclusivity → 1 red.
 *   • `fileFavientInto` dropping its CONTENT match → 3 red ("the same gradient with NO
 *     favId still moves, not copies"); filing `p.name` raw instead of falling back to
 *     `configToName` → 1 red ("an unnamed payload is still named (got \"\")").
 *
 * Four more on 2026-09-09 for [7], same method:
 *   • `fileFavientsAt` reversing the batch → 1 red ("got b1,a3,a1,b2").
 *   • it splicing the batch at index 0 instead of at the anchor → 3 red, including
 *     "B stays ONE contiguous run (got BB.BB.)" — the run check earns its place here.
 *   • it ignoring `beforeId` and always appending → 1 red ("got b1,b2,a1,a3").
 *   • `wallSelection` dropping its no-op guard → 1 red ("writing the SAME ids does not
 *     publish a new reference"). That guard is not tidiness: the wall's per-swatch paint
 *     effect has the Set in its dependency array, so a fresh reference repaints every
 *     mounted chunk.
 */

// ── localStorage shim, BEFORE any store loads ─────────────────────────────
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

let failures = 0;
const ok = (cond: boolean, msg: string): void => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};

const {
  parseGradientImports,
  importGradientsInto,
  importSummary,
  isGradientFileName,
  GRADIENT_FILE_ACCEPT,
} = await import('../palette/core/importGradientFiles');
const { useFavientsStore, DEFAULT_GROUP, RECENT_GROUP, newGroupId } = await import('../palette/store/favientsStore');
const { listGroundSets, membersOfMany, groupSetId, binSetId, ALL_SET_ID } = await import('../palette/core/groundSets');

// ── fixtures ──────────────────────────────────────────────────────────────
/** A Fractint .map: four evenly-spaced anchors. */
const MAP = '0 0 0\n255 0 0\n0 255 0\n255 255 255\n';
/** A CSS linear-gradient — a different parser, a different ramp. */
const CSS = 'background: linear-gradient(to right, #ff00ff 0%, #00ffff 100%);';
const GPL = 'GIMP Palette\nName: x\n#\n10 20 30\n200 100 50\n';

const reset = (): void => {
  mem.clear();
  useFavientsStore.setState({ favients: [], groupLabels: {}, lastGroupId: DEFAULT_GROUP });
};

console.log('[1] parse: fail-safe, named, provenance');
{
  const hostile = [
    { name: 'a.map', text: '\u0000\u0001\u0002 not a gradient at all' },
    { name: 'b.ggr', text: 'GIMP Gradient\nName: broken\n999999\n' },
    { name: 'c.css', text: '### nonsense ###\n!!!\n' },
    { name: 'd.json', text: '{"unterminated": ' },
    { name: 'e.cpt', text: '' },
    null, // a read that failed
  ];
  let threw = false;
  let res: ReturnType<typeof parseGradientImports> | null = null;
  try {
    res = parseGradientImports(hostile);
  } catch {
    threw = true;
  }
  ok(!threw, 'parse: hostile and malformed input is skipped, never thrown');
  ok(!!res && res.items.length + res.skipped === hostile.length, 'parse: every file is either an item or skipped, none lost');

  const good = parseGradientImports([
    { name: 'sunset.map', text: MAP },
    { name: 'C:\\pics\\deep sea.css', text: CSS },
    { name: 'pal.gpl', text: GPL },
    // a file whose stem is nothing at all — the case the fallback name exists for
    { name: '   .map', text: MAP },
  ]);
  ok(good.items.length === 4 && good.skipped === 0, `parse: four readable files import (got ${good.items.length}, ${good.skipped} skipped)`);
  ok(good.items.every((i) => i.name.trim().length > 0), 'parse: every imported item has a non-empty name');
  ok(good.items[3].name === 'imported', `parse: a file with no stem is still named (got "${good.items[3].name}")`);
  ok(good.items[0].name === 'sunset', `parse: the name is the filename without its extension (got "${good.items[0].name}")`);
  ok(good.items[1].name === 'deep sea', `parse: a windows path keeps only the file stem (got "${good.items[1].name}")`);
  ok(good.items[0].source === 'Import \u00b7 .map' && good.items[1].source === 'Import \u00b7 .css', 'parse: provenance names the format it was read as');
  ok(good.items.every((i) => i.config.stops.length >= 2), 'parse: every item fits to a real stop list');
}

console.log('[2] importGradientsInto: destination and dedupe scope');
{
  reset();
  const g = newGroupId();
  const reads = [{ name: 'one.map', text: MAP }, { name: 'two.css', text: CSS }];
  const a = importGradientsInto(reads, g);
  ok(a.imported === 2 && a.skipped === 0, `into a group: both land (got ${a.imported})`);
  ok(useFavientsStore.getState().favients.every((f) => f.group === g), 'into a group: they carry that group');

  const again = importGradientsInto(reads, g);
  ok(again.imported === 0 && again.skipped === 2, `into the SAME group: both are duplicates (got ${again.imported} imported, ${again.skipped} skipped)`);

  const other = newGroupId();
  const cross = importGradientsInto(reads, other);
  ok(cross.imported === 2, `into ANOTHER group: a gradient kept elsewhere still joins (got ${cross.imported})`);

  reset();
  const b = importGradientsInto(reads);
  ok(b.imported === 2, `no group: both land (got ${b.imported})`);
  const b2 = importGradientsInto(reads);
  ok(b2.imported === 0 && b2.skipped === 2, 'no group: dedupe is against the WHOLE collection');
  ok(
    useFavientsStore.getState().favients.every((f) => (f.group ?? DEFAULT_GROUP) === DEFAULT_GROUP),
    'no group: they land in the last-used group, which is Kept here',
  );
}

console.log('[3] the reported sentence, and which files are offered');
{
  ok(importSummary({ imported: 1, skipped: 0 }) === 'Imported 1 gradient', 'summary: one');
  ok(importSummary({ imported: 3, skipped: 2 }) === 'Imported 3 gradients \u00b7 2 skipped', 'summary: plural with a skipped tail');
  ok(importSummary({ imported: 0, skipped: 4 }) === 'No gradient could be read from that file', 'summary: nothing readable says so');
  ok(isGradientFileName('x.GGR') && isGradientFileName('a/b/c.map'), 'isGradientFileName: case-insensitive, path-tolerant');
  ok(!isGradientFileName('photo.png') && !isGradientFileName('noext'), 'isGradientFileName: an image and an extensionless name are not gradients');
  for (const ext of ['map', 'gpl', 'ggr', 'cpt', 'css', 'json']) {
    if (!GRADIENT_FILE_ACCEPT.includes('.' + ext)) { failures++; console.log(`  \u2717 accept is missing .${ext}`); }
  }
  ok(GRADIENT_FILE_ACCEPT.split(',').length === 6, `accept lists every parseable extension (${GRADIENT_FILE_ACCEPT})`);
}

console.log('[4] removeGroup: the container goes, its contents do not');
{
  reset();
  const st = () => useFavientsStore.getState();
  const g = newGroupId();
  const keep = newGroupId(); // a group that SURVIVES — without it the run check is vacuous
  importGradientsInto([{ name: 'k1.map', text: MAP }], DEFAULT_GROUP);
  importGradientsInto([{ name: 'g1.css', text: CSS }, { name: 'g2.gpl', text: GPL }], g);
  importGradientsInto([{ name: 'o1.map', text: MAP.replace('255 255 255', '9 9 9') }], keep);
  st().renameGroup(g, 'Blues');
  st().renameGroup(keep, 'Untouched');
  ok(st().favients.filter((f) => f.group === g).length === 2, 'precondition: two in the group, one in Kept, one in another group');

  const moved = st().removeGroup(g);
  ok(moved === 2, `removeGroup returns how many moved (got ${moved})`);
  ok(!st().favients.some((f) => f.group === g), 'removeGroup: nothing is left in the group');
  ok(st().favients.length === 4, 'removeGroup: nothing was deleted');
  ok(!(g in st().groupLabels), 'removeGroup: the label is dropped');
  ok(st().groupLabels[keep] === 'Untouched', 'removeGroup: the OTHER group keeps its label');
  ok(st().lastGroupId !== g, 'removeGroup: lastGroupId cannot point at a group that is gone');
  ok(st().favients.filter((f) => (f.group ?? DEFAULT_GROUP) === DEFAULT_GROUP).length === 3, 'removeGroup: the two re-homed join the one already in Kept');
  const kept = st().favients.map((f) => (f.group ?? DEFAULT_GROUP) === DEFAULT_GROUP);
  const first = kept.indexOf(true);
  const last = kept.lastIndexOf(true);
  ok(kept.slice(first, last + 1).every(Boolean), `removeGroup: Kept is ONE contiguous run — no other group's favourite is spliced through it (got ${kept.map((b) => (b ? 'K' : '.')).join('')})`);

  ok(st().removeGroup(DEFAULT_GROUP) === 0, 'removeGroup: the default group is a no-op');
  ok(st().removeGroup(RECENT_GROUP) === 0, 'removeGroup: Recent is a no-op');
  ok(st().removeGroup('grp-does-not-exist') === 0, 'removeGroup: an unknown id is a no-op');
  ok(st().favients.length === 4, 'removeGroup: the no-ops changed nothing');
}

console.log('[5] an empty group is a place; several sets are one ground');
{
  reset();
  const st = () => useFavientsStore.getState();
  const g = newGroupId();
  st().renameGroup(g, 'Empty');
  const sets = listGroundSets({ favients: st().favients, groupLabels: st().groupLabels, catalogTotal: 100 });
  const chip = sets.find((s) => s.group === g);
  ok(!!chip, 'listGroundSets: a labelled group with no members is still a chip');
  ok(chip?.count === 0 && chip?.label === 'Empty', `the empty chip carries its label and a count of 0 (got ${chip?.count})`);
  ok(!sets.some((s) => s.group === RECENT_GROUP), 'listGroundSets: Recent is never a group chip');

  reset();
  const a = newGroupId();
  const b = newGroupId();
  importGradientsInto([{ name: 'a.map', text: MAP }], a);
  importGradientsInto([{ name: 'b.css', text: CSS }], b);
  importGradientsInto([{ name: 'c.gpl', text: GPL }], DEFAULT_GROUP);
  // Named b FIRST, deliberately: the shelf holds a's favourite before b's, so a union that
  // simply concatenates the sets in the order asked for comes back reversed.
  const union = membersOfMany([groupSetId(b), groupSetId(a)], st().favients);
  ok(union.length === 2, `membersOfMany: two sets union (got ${union.length})`);
  const shelfOrder = st().favients.filter((f) => union.some((u) => u.id === f.id)).map((f) => f.id).join();
  ok(union.map((f) => f.id).join() === shelfOrder, 'membersOfMany: the union is in SHELF order, not the order the sets were named');
  const dup = membersOfMany([groupSetId(a), groupSetId(a)], st().favients);
  ok(dup.length === 1, `membersOfMany: a favourite reachable twice appears once (got ${dup.length})`);
  ok(membersOfMany([ALL_SET_ID, groupSetId(a)], st().favients).length === 1, 'membersOfMany: All contributes nothing (the caller handles it)');
  ok(membersOfMany([binSetId('1999-01-01')], st().favients).length === 0, 'membersOfMany: an empty bin resolves to nothing');
}

console.log('[6] the ground selection');
{
  mem.clear();
  const gs = await import(`../palette/store/groundSet?fresh=${Date.now()}`);
  ok(gs.getGroundSetIds().join() === ALL_SET_ID, 'a fresh browser starts on All');

  gs.toggleGroundSetId('group:one');
  ok(gs.getGroundSetIds().join() === 'group:one', 'toggling a set on drops All');
  gs.toggleGroundSetId('group:two');
  ok(gs.getGroundSetIds().join() === 'group:one,group:two', `two sets can be lit at once (got ${gs.getGroundSetIds().join()})`);
  gs.toggleGroundSetId('group:one');
  ok(gs.getGroundSetIds().join() === 'group:two', 'toggling one off leaves the other');
  gs.toggleGroundSetId('group:two');
  ok(gs.getGroundSetIds().join() === ALL_SET_ID, 'the selection is NEVER empty — the last one off falls back to All');

  gs.setGroundSetIds(['group:a', 'group:b', 'group:c']);
  ok(gs.getGroundSetIds().length === 3, 'setGroundSetIds takes a whole selection');
  ok(gs.getGroundSetId() === 'group:a', 'getGroundSetId is the PRIMARY (first) set');
  gs.toggleGroundSetId(ALL_SET_ID);
  ok(gs.getGroundSetIds().join() === ALL_SET_ID, 'All is exclusive: choosing it clears the rest');
  gs.setGroundSetIds(['group:a', ALL_SET_ID, 'group:b']);
  ok(gs.getGroundSetIds().join() === ALL_SET_ID, 'All is exclusive even mid-list');
  gs.setGroundSetId('group:x');
  ok(gs.getGroundSetIds().join() === 'group:x', 'ctrl-click (setGroundSetId) replaces the selection');
  gs.setGroundSetIds([]);
  ok(gs.getGroundSetIds().join() === ALL_SET_ID, 'an empty selection is All');
  ok(mem.get('gmt.ge.groundSet') === JSON.stringify([ALL_SET_ID]), 'the selection persists as JSON');

  mem.set('gmt.ge.groundSet', 'group:legacy');
  const gs2 = await import(`../palette/store/groundSet?legacy=${Date.now()}`);
  ok(gs2.getGroundSetIds().join() === 'group:legacy', 'a pre-2026-09-09 bare id reads back as a one-set selection');
}

console.log('[7] fileFavientsAt + wallSelection: a batch, and a stable snapshot');
{
  reset();
  const st = () => useFavientsStore.getState();
  const { fileFavientsAt } = await import('../palette/store/favientFiling');
  const a = newGroupId();
  const b = newGroupId();
  // three in A, two in B, one in Kept — enough that a bad splice interleaves visibly
  importGradientsInto([{ name: 'a1.map', text: MAP }, { name: 'a2.css', text: CSS }, { name: 'a3.gpl', text: GPL }], a);
  importGradientsInto([{ name: 'b1.map', text: MAP.replace('255 255 255', '9 9 9') }, { name: 'b2.map', text: MAP.replace('0 255 0', '9 200 9') }], b);
  importGradientsInto([{ name: 'k1.map', text: MAP.replace('255 0 0', '3 3 3') }], DEFAULT_GROUP);
  const inA = st().favients.filter((f) => f.group === a).map((f) => f.id);
  ok(inA.length === 3, `precondition: three in A (got ${inA.length})`);

  // move A's first and third into B, in that order, in front of B's second
  const bMembers = st().favients.filter((f) => f.group === b);
  fileFavientsAt(b, [inA[0], inA[2]], bMembers[1].id);
  const names = (g: string) => st().favients.filter((f) => (f.group ?? DEFAULT_GROUP) === g).map((f) => f.name);
  ok(st().favients.length === 6, 'a batch move deletes nothing');
  ok(names(a).length === 1, `the ones moved left A (got ${names(a).join()})`);
  ok(names(b).length === 4, `and joined B (got ${names(b).join()})`);
  ok(names(b).join() === 'b1,a1,a3,b2', `the batch lands IN ORDER, at the place asked for (got ${names(b).join()})`);
  const groupsInOrder = st().favients.map((f) => f.group ?? DEFAULT_GROUP);
  const bRun = groupsInOrder.map((g) => g === b);
  ok(bRun.slice(bRun.indexOf(true), bRun.lastIndexOf(true) + 1).every(Boolean), `B stays ONE contiguous run (got ${groupsInOrder.map((g) => (g === b ? 'B' : '.')).join('')})`);

  // null anchor = the end of the group
  fileFavientsAt(b, [st().favients.find((f) => f.name === 'k1')!.id], null);
  ok(names(b)[names(b).length - 1] === 'k1', `a null anchor appends (got ${names(b).join()})`);
  fileFavientsAt(b, ['no-such-id'], null);
  ok(st().favients.length === 6, 'an unknown id is skipped, not inserted');

  const sel = await import(`../palette/store/wallSelection?fresh=${Date.now()}`);
  ok(sel.getWallSelection().size === 0, 'the selection starts empty');
  const empty1 = sel.getWallSelection();
  ok(sel.getWallSelection() === empty1, 'selection: the snapshot is reference-stable between reads');
  sel.setWallSelection(['x', 'y']);
  const s1 = sel.getWallSelection();
  ok(s1.size === 2 && s1.has('x'), 'a selection can be set');
  ok(sel.getWallSelection() === s1, 'selection: still reference-stable after a write');
  sel.setWallSelection(['x', 'y']);
  ok(sel.getWallSelection() === s1, 'selection: writing the SAME ids does not publish a new reference');
  sel.setWallSelection(['z'], 'add');
  ok(sel.getWallSelection() !== s1 && sel.getWallSelection().size === 3, 'selection: a real change publishes a new reference');
  sel.setWallSelection(['x'], 'subtract');
  ok(sel.getWallSelection().size === 2 && !sel.getWallSelection().has('x'), 'subtract removes');
  sel.toggleWallSelected('y');
  ok(!sel.getWallSelection().has('y'), 'toggle removes one that is in');
  sel.toggleWallSelected('y');
  ok(sel.getWallSelection().has('y'), 'and adds one that is out');
  sel.clearWallSelection();
  ok(sel.getWallSelection().size === 0, 'clear empties it');
}

console.log('[8] fileFavientInto: one rule for every drop target');
{
  reset();
  const st = () => useFavientsStore.getState();
  const { fileFavientInto } = await import('../palette/store/favientFiling');
  const a = newGroupId();
  const b = newGroupId();
  importGradientsInto([{ name: 'moves.map', text: MAP }], a);
  const fav = st().favients[0];

  // by id \u2014 a favourite dragged from one chip to another
  fileFavientInto(b, { config: fav.config, name: fav.name, source: fav.source, favId: fav.id });
  ok(st().favients.length === 1, 'a favourite MOVES \u2014 it is not copied');
  ok(st().favients[0].group === b, 'and it carries the destination group');

  // onto its own group \u2014 nothing
  const before = JSON.stringify(st().favients);
  fileFavientInto(b, { config: fav.config, name: fav.name, favId: fav.id });
  ok(JSON.stringify(st().favients) === before, 'a drop onto its own group is a no-op');

  // by CONTENT \u2014 no favId (a catalogue tile, or the working hero)
  fileFavientInto(a, { config: fav.config, name: 'a different name' });
  ok(st().favients.length === 1, 'the same gradient with NO favId still moves, not copies');
  ok(st().favients[0].group === a, 'and lands in the group it was dropped on');

  // something genuinely new, with no name
  const other = parseGradientImports([{ name: 'x.css', text: CSS }]).items[0];
  fileFavientInto(a, { config: other.config, name: '' });
  ok(st().favients.length === 2, 'a gradient that is not on the shelf is inserted');
  const added = st().favients.find((f) => f.id !== fav.id)!;
  ok(!!added && added.name.trim().length > 0, `an unnamed payload is still named (got "${added?.name}")`);
}

console.log(failures === 0 ? '\nPASS test-palette-shelf-manage' : `\nFAIL test-palette-shelf-manage (${failures})`);
process.exit(failures === 0 ? 0 : 1);
