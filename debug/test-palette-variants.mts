/**
 * Guard: Gradient Explorer "Variants" — `palette/core/variantsCore` (pure) AND
 * `palette/store/variantsStore` (against a real engine store).
 *
 * Variants are global named snapshots (A, B, C…) of the palette studio that the
 * user flips between, persisted to localStorage. Everything asserted here is a
 * property the FEATURE would be broken without, and none of it is visible to
 * `tsc`:
 *
 *   [1] the load gate drops malformed entries and keeps the well-formed ones
 *   [2] the next-name sequence: A, B, C … Z, A2 …, and it is case-insensitive
 *   [3] the cap keeps the NEWEST `MAX_VARIANTS`, dropping from the front
 *   [4] deep clone is independent in both directions
 *   [5] `stripFavients` drops the shared shelf and keeps everything else
 *   [6] the ramp round-trips: 768 ints in 0..255, resampled and clamped
 *   [7] the setter-name convention, and parse/serialize round-tripping
 *   [8] capture reads the three REAL feature slices and no favients document
 *   [9] restore writes them back, as exactly ONE param-undo entry
 *  [10] update / rename / duplicate / remove, and the localStorage round trip
 *
 * ── How the store half runs under node ────────────────────────────────────
 * `store/engineStore` builds its slices from `featureRegistry.getAll()` and
 * FREEZES the registry on first construction, so the three palette features are
 * registered here BEFORE it is imported — the same trick
 * `debug/test-modulated-setter.mts` uses for GMT's features. That skips
 * `palette/registerPaletteUI.ts` (which pulls in the React component tree) and
 * therefore also its document providers, so stand-in `favients` / `generator`
 * providers are registered directly against the engine-core registry. That is
 * what makes [9]'s favients assertion meaningful: a real provider that counts
 * its own restores.
 *
 * A `window` shim (localStorage + matchMedia + location) is installed before any
 * of it, so nothing here touches the developer's real browser storage.
 *
 * Run: `npx tsx debug/test-palette-variants.mts` (also a link of `npm run test:palette`)
 *
 * ── FALSIFIED 2026-09-03 ─────────────────────────────────────────────────
 *   `stripFavients` returning `deepClone(docs)` with the `delete` line removed —
 *   the `@invariant` on that function in `palette/core/variantsCore.ts`. Five
 *   assertions go red, exit 1: all three in [5], plus [8]'s "the captured
 *   documents carry NO favients key" and [9]'s "the favients provider is NEVER
 *   invoked by a variant switch". Everything else stays green, so the failure
 *   names the defect instead of collapsing the run.
 */

import {
  MAX_VARIANTS,
  VARIANT_FEATURES,
  VARIANT_RAMP_TEXELS,
  capVariants,
  deepClone,
  featureSetterName,
  isWellFormedVariant,
  nextVariantName,
  parseVariants,
  rampFromInts,
  roundRamp,
  serializeVariants,
  stripFavients,
  type Variant,
} from '../palette/core/variantsCore';
import type { RGB } from '../palette/core/oklab';
import type { JsonValue } from '../types';

// ── window shim, BEFORE any engine module loads (static imports above are all
//    DOM-free; every engine/store import below is dynamic, so this wins).
const disk = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => (disk.has(k) ? disk.get(k)! : null),
    setItem: (k: string, v: string) => { disk.set(k, String(v)); },
    removeItem: (k: string) => { disk.delete(k); },
    clear: () => disk.clear(),
    get length() { return disk.size; },
    key: (i: number) => [...disk.keys()][i] ?? null,
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 1,
  location: { search: '', href: 'http://localhost/', hash: '' },
};
(globalThis as any).matchMedia = (globalThis as any).window.matchMedia;
(globalThis as any).location = (globalThis as any).window.location;

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  } else {
    console.log('  ✓ ' + msg);
  }
};

const variant = (over: Partial<Variant> = {}): Variant => ({
  id: 'v1',
  name: 'A',
  createdAt: 1_700_000_000_000,
  features: { paletteGenerator: { mixL: 0.5 } },
  documents: { generator: { slotA: null } as unknown as JsonValue },
  ramp: null,
  ...over,
});

console.log('[1] the load gate drops malformed entries');
{
  ok(isWellFormedVariant(variant()), 'a well-formed variant passes');
  ok(isWellFormedVariant(variant({ ramp: [0, 0, 0, 255, 255, 255] })), 'a numeric ramp passes');

  const bad: Array<[unknown, string]> = [
    [null, 'null'],
    ['A', 'a bare string'],
    [[], 'an array'],
    [variantMinus('id'), 'missing id'],
    [variantMinus('name'), 'missing name'],
    [variantMinus('features'), 'missing features'],
    [variantMinus('documents'), 'missing documents'],
    [{ ...variant(), id: '' }, 'an empty id'],
    [{ ...variant(), name: '' }, 'an empty name'],
    [{ ...variant(), createdAt: 'yesterday' }, 'a non-numeric createdAt'],
    [{ ...variant(), createdAt: NaN }, 'a NaN createdAt'],
    [{ ...variant(), features: [] }, 'features as an array'],
    [{ ...variant(), documents: 'x' }, 'documents as a string'],
    [{ ...variant(), ramp: 'nope' }, 'a non-array ramp'],
    [{ ...variant(), ramp: [0, 'x', 2] }, 'a ramp with a non-number'],
    [{ ...variant(), ramp: [0, NaN, 2] }, 'a ramp with a NaN'],
  ];
  let dropped = 0;
  for (const [value, label] of bad) {
    if (isWellFormedVariant(value)) console.error(`      (admitted ${label})`);
    else dropped++;
  }
  ok(dropped === bad.length, `all ${bad.length} malformed shapes are rejected`);

  // A hostile `__proto__` own key (JSON.parse creates it as an own property).
  const polluted = JSON.parse('{"id":"v","name":"A","createdAt":1,"features":{"__proto__":{"pwned":1}},"documents":{},"ramp":null}');
  ok(!isWellFormedVariant(polluted), 'a `__proto__` key inside features is rejected');

  // parseVariants keeps the good ones out of a mixed list.
  const mixed = JSON.stringify([variant({ id: 'good1' }), null, { id: 'x' }, variant({ id: 'good2', name: 'B' })]);
  const kept = parseVariants(mixed);
  ok(kept.length === 2 && kept[0].id === 'good1' && kept[1].id === 'good2', 'parseVariants keeps only the well-formed neighbours');
  ok(parseVariants('{not json').length === 0, 'unparseable storage reads as an empty list, not a throw');
  ok(parseVariants('{"variants":[]}').length === 0, 'a non-array payload reads as an empty list');
  ok(parseVariants(null).length === 0, 'an absent key reads as an empty list');
}

function variantMinus(key: keyof Variant): Record<string, unknown> {
  const v = { ...variant() } as Record<string, unknown>;
  delete v[key];
  return v;
}

console.log('\n[2] the next-name sequence');
{
  ok(nextVariantName([]) === 'A', 'the first variant is A');
  ok(nextVariantName(['A']) === 'B', 'A taken → B');
  ok(nextVariantName(['A', 'B', 'C']) === 'D', 'A B C → D');
  ok(nextVariantName(['B']) === 'A', 'a gap is filled (B taken → A)');
  const az = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  ok(nextVariantName(az) === 'A2', 'after Z comes A2');
  ok(nextVariantName([...az, 'A2', 'B2']) === 'C2', 'the second round continues C2');
  ok(nextVariantName(['a']) === 'B', 'the comparison is case-insensitive (lowercase a blocks A)');
  ok(nextVariantName([' A ']) === 'B', 'names are trimmed before comparison');
  ok(nextVariantName(['Sunset', 'Deep sea']) === 'A', 'user-renamed variants do not block the letters');
}

console.log('\n[3] the cap keeps the newest');
{
  const list = Array.from({ length: MAX_VARIANTS + 5 }, (_, i) => i);
  const capped = capVariants(list);
  ok(capped.length === MAX_VARIANTS, `${MAX_VARIANTS + 5} entries cap to ${MAX_VARIANTS}`);
  ok(capped[0] === 5 && capped[capped.length - 1] === MAX_VARIANTS + 4, 'the OLDEST (front) entries are the ones dropped');
  ok(capVariants([1, 2, 3]).length === 3, 'a short list is untouched');
  ok(capVariants([1, 2, 3]) !== undefined && Array.isArray(capVariants([1, 2, 3])), 'a short list still returns a fresh array');
  const src = [1, 2, 3];
  ok(capVariants(src) !== (src as unknown), 'the returned array is never the input array');
  // The cap is re-applied on READ, so a hand-grown storage file cannot exceed it.
  const many = JSON.stringify(Array.from({ length: 30 }, (_, i) => variant({ id: `v${i}`, name: `N${i}` })));
  ok(parseVariants(many).length === MAX_VARIANTS, 'parseVariants re-applies the cap to an oversized file');
}

console.log('\n[4] deep clone is independent');
{
  const live = { mixL: 0.5, keptIds: ['a', 'b'], swatchSize: { x: 32, y: 18 } };
  const copy = deepClone(live);
  ok(JSON.stringify(copy) === JSON.stringify(live), 'the clone is value-equal');
  ok(copy !== live && copy.keptIds !== live.keptIds && copy.swatchSize !== live.swatchSize, 'no nested structure is shared');
  live.keptIds.push('c');
  live.swatchSize.x = 999;
  ok(copy.keptIds.length === 2 && copy.swatchSize.x === 32, 'mutating the live object does not reach the clone');
  copy.keptIds.push('z');
  ok(live.keptIds.length === 3, 'and mutating the clone does not reach the live object');
  ok(deepClone(undefined) === undefined, 'undefined survives (JSON.stringify would have thrown)');
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  ok(deepClone(cyclic) === cyclic, 'a cyclic value is returned as-is instead of throwing');
}

console.log('\n[5] stripFavients — the @invariant on palette/core/variantsCore.ts');
{
  const docs = {
    favients: { version: 1, favients: [{ id: 'f1' }] },
    stops: { stops: [] },
    generator: { slotA: null },
    image: { path: null },
  } as unknown as Record<string, JsonValue>;
  const out = stripFavients(docs);
  ok(!('favients' in out), 'stripFavients drops the shared favients shelf');
  ok('stops' in out && 'generator' in out && 'image' in out, 'a captured bag keeps every other document');
  ok(Object.keys(out).length === 3, 'exactly one key is removed');
  ok('favients' in docs, 'the caller`s bag is not mutated (the strip works on a clone)');
  ok(out.stops !== docs.stops, 'the surviving documents are cloned, not aliased');
  ok(Object.keys(stripFavients({})).length === 0, 'an empty bag stays empty');
  ok(Object.keys(stripFavients({ favients: null } as unknown as Record<string, JsonValue>)).length === 0, 'a bag that is only favients strips to nothing');
}

console.log('\n[6] the ramp round-trips');
{
  const ramp: RGB[] = Array.from({ length: 256 }, (_, i) => ({ r: i, g: 255 - i, b: i / 2 }));
  const flat = roundRamp(ramp);
  ok(flat !== null && flat.length === VARIANT_RAMP_TEXELS * 3, `roundRamp gives ${VARIANT_RAMP_TEXELS}×3 = 768 ints`);
  ok(flat !== null && flat.every((n) => Number.isInteger(n) && n >= 0 && n <= 255), 'every value is an int in 0..255');
  ok(flat !== null && flat[0] === 0 && flat[1] === 255 && flat[3] === 1, 'texel values land where expected');

  const back = rampFromInts(flat);
  ok(back !== null && back.length === 256, 'rampFromInts returns 256 texels');
  ok(back !== null && back[0].r === 0 && back[0].g === 255 && back[10].r === 10, 'the decoded ramp matches the encoded one');

  // Out-of-range and non-finite channels are clamped, never stored as NaN —
  // a NaN would fail the load gate on the next boot and cost the whole variant.
  const dirty = roundRamp([{ r: -50, g: 900, b: NaN }, { r: 128, g: 128, b: 128 }]);
  ok(dirty !== null && dirty.every((n) => Number.isFinite(n) && n >= 0 && n <= 255), 'out-of-range and NaN channels clamp into 0..255');
  ok(dirty !== null && dirty[0] === 0 && dirty[1] === 255 && dirty[2] === 0, '-50 → 0, 900 → 255, NaN → 0');

  // Any input length is resampled to 256 so the on-disk shape is fixed.
  const short = roundRamp(Array.from({ length: 7 }, (_, i) => ({ r: i * 10, g: 0, b: 0 })));
  ok(short !== null && short.length === 768, 'a 7-texel ramp still stores 768 ints');
  ok(short !== null && short[0] === 0 && short[765] === 60, 'the resample keeps the first and last source texel at the ends');

  ok(roundRamp(null) === null && roundRamp(undefined) === null && roundRamp([]) === null, 'an absent or empty ramp stores null');
  ok(rampFromInts(null) === null && rampFromInts([]) === null && rampFromInts([1, 2]) === null, 'an absent or truncated stored ramp decodes to null');

  // A variant carrying a real ramp survives the storage round trip.
  const withRamp = variant({ ramp: flat });
  const reloaded = parseVariants(serializeVariants([withRamp]));
  ok(reloaded.length === 1 && JSON.stringify(reloaded[0].ramp) === JSON.stringify(flat), 'a ramp survives serialize → parse unchanged');
}

console.log('\n[7] the setter-name convention and the storage round trip');
{
  ok(featureSetterName('paletteGenerator') === 'setPaletteGenerator', 'paletteGenerator → setPaletteGenerator');
  ok(featureSetterName('paletteImage') === 'setPaletteImage', 'paletteImage → setPaletteImage');
  ok(featureSetterName('paletteFilters') === 'setPaletteFilters', 'paletteFilters → setPaletteFilters');
  ok(VARIANT_FEATURES.length === 3, 'three feature slices are captured');
  ok(VARIANT_FEATURES.every((id) => featureSetterName(id).startsWith('setPalette')), 'every captured feature derives a setPalette* setter');

  const list = [variant({ id: 'a', name: 'A' }), variant({ id: 'b', name: 'B' })];
  const round = parseVariants(serializeVariants(list));
  ok(round.length === 2 && JSON.stringify(round) === JSON.stringify(list), 'a variant list survives serialize → parse unchanged');
  ok(serializeVariants([]) === '[]', 'an empty list serialises to []');
  const cyc = variant() as unknown as Record<string, unknown>;
  cyc.self = cyc;
  ok(serializeVariants([cyc as unknown as Variant]) === '[]', 'a cyclic variant serialises to [] instead of throwing');
}

// ══ the store half ═══════════════════════════════════════════════════════
// Register the three palette features BEFORE store construction (the registry
// freezes on first createEngineStore), then stand-in document providers, then
// the store itself.
const { featureRegistry } = await import('../engine/FeatureSystem');
featureRegistry.register((await import('../palette/features/paletteGenerator')).PaletteGeneratorFeature);
featureRegistry.register((await import('../palette/features/paletteImage')).PaletteImageFeature);
featureRegistry.register((await import('../palette/features/paletteFilters')).PaletteFiltersFeature);

const { registerDocumentProvider } = await import('../store/documentRegistry');
let favientsRestores = 0;
let generatorRestores = 0;
let generatorDoc: JsonValue = { slotA: 'from-A' };
const favientsShelf: JsonValue = { version: 1, favients: [{ id: 'f1' }] } as unknown as JsonValue;
registerDocumentProvider('favients', {
  serialize: () => favientsShelf,
  // The real one MERGES into the shared shelf and toasts. Counting is enough:
  // a variant must never make this run at all.
  restore: () => { favientsRestores++; },
});
registerDocumentProvider('generator', {
  serialize: () => generatorDoc,
  restore: (snap) => { generatorRestores++; generatorDoc = snap; },
});

const { useEngineStore } = await import('../store/engineStore');
const { useVariantsStore } = await import('../palette/store/variantsStore');
const engine = () => useEngineStore.getState() as unknown as Record<string, any>;
const vs = () => useVariantsStore.getState();

console.log('\n[8] capture reads the real feature slices');
{
  engine().setPaletteGenerator({ mixL: 0.25, hueRotate: 90 });
  engine().setPaletteImage({ mode: 2, colours: 11 });
  engine().setPaletteFilters({ keptIds: ['x', 'y'], qL: { x: 0.2, y: 0.8 } });

  const a = vs().capture(undefined, [{ r: 255, g: 0, b: 0 }]);
  ok(a.name === 'A', 'the first capture is named A');
  ok(
    VARIANT_FEATURES.every((id) => a.features[id] !== undefined),
    `all three slices captured (${Object.keys(a.features).join(', ')})`,
  );
  ok((a.features.paletteGenerator as any).mixL === 0.25, 'paletteGenerator.mixL was read off the live store');
  ok((a.features.paletteImage as any).mode === 2, 'paletteImage.mode was read off the live store');
  ok(JSON.stringify((a.features.paletteFilters as any).keptIds) === '["x","y"]', 'a non-param `state` field (keptIds) is captured too');
  ok(JSON.stringify((a.features.paletteFilters as any).qL) === '{"x":0.2,"y":0.8}', 'a THREE.Vector2 param serialises as {x, y}');

  ok(!('favients' in a.documents), 'the captured documents carry NO favients key (the @invariant, end to end)');
  ok('generator' in a.documents, 'the other registered documents ARE captured');
  ok(a.ramp !== null && a.ramp.length === 768, 'the working ramp is stored as 768 ints');

  // Independence: a later edit must not reach into the stored variant.
  engine().setPaletteGenerator({ mixL: 0.9 });
  ok((a.features.paletteGenerator as any).mixL === 0.25, 'a later store edit does not reach the captured slice');
  ok(vs().activeId === a.id, 'capture makes the new variant active');
  ok(vs().variants.length === 1 && vs().variants[0].id === a.id, 'the variant lands in the list');
  ok(disk.get('gmt.ge.variants') !== undefined, 'capture persists to localStorage under gmt.ge.variants');
}

console.log('\n[9] restore writes back as ONE undo entry');
{
  const a = vs().variants[0];
  engine().setPaletteGenerator({ mixL: 0.9, hueRotate: -30 });
  engine().setPaletteImage({ mode: 0, colours: 4 });
  engine().setPaletteFilters({ keptIds: null });
  generatorDoc = { slotA: 'from-B' };
  const b = vs().capture(undefined, [{ r: 0, g: 0, b: 255 }]);
  ok(b.name === 'B', 'the second capture is named B');

  const undoBefore = (engine().paramUndoStack as unknown[]).length;
  const favBefore = favientsRestores;
  vs().restore(a.id);

  ok(engine().paletteGenerator.mixL === 0.25, 'restore brings mixL back');
  ok(engine().paletteGenerator.hueRotate === 90, 'restore brings hueRotate back');
  ok(engine().paletteImage.mode === 2 && engine().paletteImage.colours === 11, 'restore brings the image slice back');
  ok(JSON.stringify(engine().paletteFilters.keptIds) === '["x","y"]', 'restore brings a non-param state field back');
  ok(
    engine().paletteFilters.qL?.constructor?.name === 'Vector2' && engine().paletteFilters.qL.x === 0.2,
    'the DDFS setter re-hydrates the JSON-cloned vec2 into a THREE.Vector2',
  );
  ok(JSON.stringify(generatorDoc) === '{"slotA":"from-A"}', 'restore dispatches the captured documents to their providers');
  ok(generatorRestores > 0, 'the generator provider actually ran');
  ok(favientsRestores === favBefore, 'the favients provider is NEVER invoked by a variant switch');

  const added = (engine().paramUndoStack as unknown[]).length - undoBefore;
  ok(added === 1, `a whole switch is exactly one param-undo entry (added ${added})`);
  ok(vs().activeId === a.id, 'restore sets activeId');

  // A no-op switch (restoring the variant already applied) must not stack entries.
  const before2 = (engine().paramUndoStack as unknown[]).length;
  vs().restore(a.id);
  ok((engine().paramUndoStack as unknown[]).length === before2, 'restoring the already-active variant adds no undo entry');
  ok(vs().restore('no-such-id') === undefined && vs().activeId === a.id, 'restoring an unknown id is a silent no-op');
}

console.log('\n[10] update / rename / duplicate / remove, and the disk round trip');
{
  const a = vs().variants[0];
  engine().setPaletteGenerator({ mixL: 0.42 });
  vs().update(a.id);
  const a2 = vs().variants.find((v) => v.id === a.id)!;
  ok(a2.name === 'A' && a2.id === a.id, 'update keeps the slot id and name');
  ok((a2.features.paletteGenerator as any).mixL === 0.42, 'update re-reads the live slice');
  ok(a2.ramp !== null && a2.ramp.length === 768, 'update with no ramp keeps the thumbnail the slot had');
  vs().update(a.id, [{ r: 1, g: 2, b: 3 }]);
  ok(vs().variants[0].ramp![0] === 1, 'update with a ramp replaces the thumbnail');

  vs().rename(a.id, '  Sunset  ');
  ok(vs().variants[0].name === 'Sunset', 'rename trims');
  vs().rename(a.id, '   ');
  ok(vs().variants[0].name === 'Sunset', 'a blank rename is ignored');

  const dup = vs().duplicate(a.id)!;
  ok(dup.id !== a.id, 'duplicate mints a new id');
  ok(dup.name === 'A', 'duplicate takes the next free letter (A is free again after the rename)');
  ok(JSON.stringify(dup.features) === JSON.stringify(vs().variants[0].features), 'duplicate copies the payload');
  ok(dup.features !== vs().variants[0].features, 'the duplicate does not share structure with its source');
  ok(vs().duplicate('nope') === null, 'duplicating an unknown id returns null');

  // Disk is the source of truth after a reload — what we wrote must survive the gate.
  const reloaded = parseVariants(disk.get('gmt.ge.variants') ?? null);
  ok(reloaded.length === vs().variants.length, 'everything on disk survives the load gate');
  ok(JSON.stringify(reloaded) === JSON.stringify(vs().variants), 'the persisted list matches the in-memory list exactly');

  vs().restore(dup.id);
  vs().remove(dup.id);
  ok(!vs().variants.some((v) => v.id === dup.id), 'remove drops the variant');
  ok(vs().activeId === null, 'removing the ACTIVE variant clears activeId');
  ok(parseVariants(disk.get('gmt.ge.variants') ?? null).every((v) => v.id !== dup.id), 'remove is persisted');

  // The cap holds against a runaway capture loop.
  for (let i = 0; i < MAX_VARIANTS + 4; i++) vs().capture(`cap${i}`);
  ok(vs().variants.length === MAX_VARIANTS, `capture caps the list at ${MAX_VARIANTS}`);
  ok(vs().variants[vs().variants.length - 1].name === `cap${MAX_VARIANTS + 3}`, 'the newest capture survives the cap');
  ok(!vs().variants.some((v) => v.name === 'Sunset'), 'the oldest variants are the ones dropped');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
