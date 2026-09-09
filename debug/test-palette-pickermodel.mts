/**
 * pickerModel harness — the pure half of the gradient wall (palette/core/pickerModel.ts),
 * shared by the old PickerStage, app-gmt's palette overlay and the v2 Browse stage.
 *
 *   1. search index + token-AND search over name · theme · source label.
 *   2. filter windows: each of the five quality axes carves independently; a full [0,1]
 *      window is inert; themes / hidden sources / the carve id-set compose.
 *   3. grouping: category vs source vs none, and the row-bucket bands inside a group.
 *   4. sorting: each axis orders within a band; `reverse` flips it; name sorts by string.
 *   5. the entry-set invariant: every (group × rows × sort) pair is a permutation of the
 *      input — nothing dropped, nothing duplicated.
 *   6. similarity: sampleRampBuffer matches bufferToRamp texel-for-texel, the index ranks
 *      the anchor itself first, and similarity mode is ONE ungrouped band.
 *   7. carve: isolate keeps the inside set, cut keeps its complement, and the two
 *      partition the displayed wall.
 *   8. badge / narrower bookkeeping and the Arrange sentence.
 *
 * Run: npx tsx debug/test-palette-pickermodel.mts
 */

import {
  buildSearchIndex,
  filterCatalog,
  arrangeRows,
  arrangeSentence,
  similarityIndex,
  similarityRows,
  rankBySimilarity,
  sampleRampBuffer,
  carveIds,
  sortValue,
  narrowerLabels,
  activeFilterCount,
  activeWindowCount,
  isWindowActive,
  windowsFromSlice,
  FACET_OF,
  ROW_BUCKETS,
  EMPTY_CRITERIA,
  similarityAnchorRamp,
  type FilterCriteria,
  type ArrangeAxes,
} from '../palette/core/pickerModel';
import { bufferToRamp } from '../palette/core/stopFit';
import { rampDistance } from '../palette/core/paletteSample';
import type { GradientConfig } from '../types';
import type { CatalogEntry } from '../palette/core/presetCatalog';
import type { Facets } from '../palette/core/facets';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
};

// --- fixtures --------------------------------------------------------------------

interface Spec {
  id: string;
  name: string;
  theme?: string;
  bundle?: string;
  lightness?: number;
  chroma?: number;
  complexity?: number;
  rainbow?: number;
  warmth?: number;
  hue?: number;
  /** Constant grey level for the 256-texel ramp (so distances are predictable). */
  grey?: number;
}

const facetsOf = (s: Spec): Facets => ({
  lightness: s.lightness ?? 0.5,
  chroma: s.chroma ?? 0.5,
  complexity: s.complexity ?? 0.5,
  rainbow: s.rainbow ?? 0.5,
  warmth: s.warmth ?? 0.5,
  raw: { meanL: 0.5, meanC: 0.1, hf: 0.02, hueSpreadDeg: 120, meanHue: s.hue ?? 180, meanA: 0, hueOrder: 0 },
});

/** A 256×RGBA buffer that ramps from black to `grey` (so entries differ perceptually). */
const rampBuf = (grey: number): Uint8Array => {
  const b = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const v = Math.round((i / 255) * grey);
    b[i * 4] = v; b[i * 4 + 1] = v; b[i * 4 + 2] = v; b[i * 4 + 3] = 255;
  }
  return b;
};

let row = 0;
const entry = (s: Spec): CatalogEntry => ({
  id: s.id,
  name: s.name,
  theme: s.theme,
  bundle: s.bundle,
  facets: facetsOf(s),
  ramp: rampBuf(s.grey ?? 255),
  row: row++,
});

const CAT: CatalogEntry[] = [
  entry({ id: 'a', name: 'Ocean Deep', theme: 'ocean', bundle: 'ui', lightness: 0.15, chroma: 0.8, complexity: 0.1, rainbow: 0.2, warmth: 0.1, hue: 210, grey: 40 }),
  entry({ id: 'b', name: 'Sunset Fire', theme: 'fire', bundle: 'ui', lightness: 0.65, chroma: 0.9, complexity: 0.5, rainbow: 0.4, warmth: 0.9, hue: 30, grey: 200 }),
  entry({ id: 'c', name: 'Ash Grey', theme: 'mono', bundle: 'brewer', lightness: 0.45, chroma: 0.05, complexity: 0.2, rainbow: 0.05, warmth: 0.5, hue: 0, grey: 128 }),
  entry({ id: 'd', name: 'Ocean Foam', theme: 'ocean', bundle: 'brewer', lightness: 0.85, chroma: 0.3, complexity: 0.9, rainbow: 0.7, warmth: 0.3, hue: 190, grey: 255 }),
  entry({ id: 'e', name: 'Fire Coral', theme: 'fire', bundle: 'mpl', lightness: 0.55, chroma: 0.7, complexity: 0.35, rainbow: 0.6, warmth: 0.85, hue: 15, grey: 210 }),
];
const LABEL: Record<string, string> = { ui: 'uiGradients', brewer: 'ColorBrewer', mpl: 'Matplotlib' };
const bundleLabel = (id: string) => LABEL[id];
const IDX = buildSearchIndex(CAT, bundleLabel);
const crit = (over: Partial<FilterCriteria> = {}): FilterCriteria => ({ ...EMPTY_CRITERIA, ...over });
const idsOf = (list: CatalogEntry[]) => list.map((e) => e.id).join(',');
const flat = (rows: { entries: CatalogEntry[] }[]) => rows.flatMap((r) => r.entries.map((e) => e.id));

// --- [1] search ------------------------------------------------------------------

console.log('[1] search index + token-AND');
{
  ok(IDX.get('a') === 'ocean deep ocean uigradients', 'index: name + theme + source LABEL, lowercased — got ' + IDX.get('a'));
  ok(!IDX.get('a')!.includes('ui '), 'index: the bundle ID is not in the haystack (only its label)');
  ok(idsOf(filterCatalog(CAT, crit({ query: 'ocean' }), IDX)) === 'a,d', 'search: name/theme match');
  ok(idsOf(filterCatalog(CAT, crit({ query: 'ocean foam' }), IDX)) === 'd', 'search: tokens are AND-ed');
  ok(idsOf(filterCatalog(CAT, crit({ query: 'foam ocean' }), IDX)) === 'd', 'search: token order does not matter');
  ok(idsOf(filterCatalog(CAT, crit({ query: '  OCEAN  ' }), IDX)) === 'a,d', 'search: trimmed + case-insensitive');
  ok(idsOf(filterCatalog(CAT, crit({ query: 'colorbrewer' }), IDX)) === 'c,d', 'search: reaches the source label');
  ok(idsOf(filterCatalog(CAT, crit({ query: '' }), IDX)) === 'a,b,c,d,e', 'search: empty query is inert');
  ok(filterCatalog(CAT, crit({ query: 'nothinghere' }), IDX).length === 0, 'search: no match → empty');
}

// --- [2] filter windows + the other narrowers ------------------------------------

console.log('[2] windows, themes, sources, carve');
{
  ok(!isWindowActive([0, 1]) && isWindowActive([0.1, 1]) && isWindowActive([0, 0.9]), 'window: full range is inert, either bound narrows');
  ok(activeWindowCount({ qL: [0, 1], qC: [0.2, 1], qCov: [0, 0.5] }) === 2, 'window: count of narrowed axes');

  const w = windowsFromSlice({ qL: { x: 0.5, y: 1 } });
  ok(w.qL![0] === 0.5 && w.qL![1] === 1 && w.qC![0] === 0 && w.qC![1] === 1, 'windowsFromSlice: reads {x,y}, defaults to [0,1]');
  ok(windowsFromSlice(undefined).qWarm![1] === 1, 'windowsFromSlice: undefined slice → all full ranges');

  ok(idsOf(filterCatalog(CAT, crit({ windows: { qL: [0.5, 1] } }), IDX)) === 'b,d,e', 'window qL: light half');
  ok(idsOf(filterCatalog(CAT, crit({ windows: { qC: [0, 0.4] } }), IDX)) === 'c,d', 'window qC: muted half');
  ok(idsOf(filterCatalog(CAT, crit({ windows: { qCov: [0.3, 0.6] } }), IDX)) === 'b,e', 'window qCov: mid complexity');
  ok(idsOf(filterCatalog(CAT, crit({ windows: { qRb: [0.5, 1] } }), IDX)) === 'd,e', 'window qRb: rainbow half');
  ok(idsOf(filterCatalog(CAT, crit({ windows: { qWarm: [0.8, 1] } }), IDX)) === 'b,e', 'window qWarm: warm end');
  ok(
    idsOf(filterCatalog(CAT, crit({ windows: { qL: [0.5, 1], qWarm: [0.8, 1] } }), IDX)) === 'b,e',
    'windows: two axes AND together',
  );
  ok(idsOf(filterCatalog(CAT, crit({ windows: { qL: [0, 1] } }), IDX)) === 'a,b,c,d,e', 'windows: a full range carves nothing');

  ok(idsOf(filterCatalog(CAT, crit({ activeThemes: ['ocean'] }), IDX)) === 'a,d', 'themes: one theme');
  ok(idsOf(filterCatalog(CAT, crit({ activeThemes: ['ocean', 'mono'] }), IDX)) === 'a,c,d', 'themes: OR within the axis');
  ok(idsOf(filterCatalog(CAT, crit({ activeThemes: [] }), IDX)) === 'a,b,c,d,e', 'themes: empty = all');

  ok(idsOf(filterCatalog(CAT, crit({ hiddenBundles: ['ui'] }), IDX)) === 'c,d,e', 'sources: hiding a bundle drops its entries');
  ok(idsOf(filterCatalog(CAT, crit({ hiddenBundles: ['ui', 'mpl'] }), IDX)) === 'c,d', 'sources: two hidden');

  ok(idsOf(filterCatalog(CAT, crit({ keptIds: ['b', 'd'] }), IDX)) === 'b,d', 'carve: keptIds restricts the wall');
  ok(idsOf(filterCatalog(CAT, crit({ keptIds: [] }), IDX)) === '', 'carve: an EMPTY keptIds is a real (empty) carve, not "no carve"');
  ok(
    idsOf(filterCatalog(CAT, crit({ keptIds: ['a', 'b', 'd'], query: 'ocean' }), IDX)) === 'a,d',
    'carve + search compose',
  );
}

// --- [3] grouping ----------------------------------------------------------------

console.log('[3] grouping + row bands');
{
  const axes = (o: Partial<ArrangeAxes> = {}): ArrangeAxes =>
    ({ groupAxis: 'none', rowsAxis: 'none', sortAxis: 'lightness', reverse: false, ...o });

  const none = arrangeRows(CAT, axes(), bundleLabel);
  ok(none.length === 1 && none[0]?.key === 'all', 'group none: exactly one band, key "all"');
  ok(none[0]?.label === '' && none[0]?.cat === undefined, 'group none: no label, not row-mergeable');

  const byTheme = arrangeRows(CAT, axes({ groupAxis: 'theme' }), bundleLabel);
  ok(byTheme.length === 3, 'group theme: one band per theme — got ' + byTheme.length);
  ok(byTheme[0]?.label === 'ocean' || byTheme[0]?.label === 'fire', 'group theme: biggest group first');
  ok(byTheme.map((g) => g.entries.length).join(',') === '2,2,1', 'group theme: ordered by size desc');
  ok(byTheme.every((g) => g.key === g.label), 'group theme: the band key is the theme');
  ok(byTheme.every((g) => g.cat === undefined), 'group theme without row bands: no cat key, so nothing merges');

  const byBundle = arrangeRows(CAT, axes({ groupAxis: 'bundle' }), bundleLabel);
  ok(byBundle.map((g) => g.label).includes('uiGradients'), 'group bundle: label comes from the manifest, not the id');
  ok(byBundle.find((g) => g.key === 'mpl')?.label === 'Matplotlib', 'group bundle: the band key stays the bundle ID');
  ok(
    arrangeRows(CAT, axes({ groupAxis: 'bundle' }), () => undefined).find((g) => g.key === 'mpl')?.label === 'mpl',
    'group bundle: an unknown label falls back to the id',
  );

  const banded = arrangeRows(CAT, axes({ rowsAxis: 'lightness' }), bundleLabel);
  ok(banded.length === 5, 'rows by lightness: five distinct buckets for five entries — got ' + banded.length);
  ok(banded[0]?.entries[0]?.id === 'd', 'rows: highest bucket on top (d, lightness .85)');
  ok(banded[banded.length - 1]?.entries[0]?.id === 'a', 'rows: lowest bucket at the bottom (a, lightness .15)');
  ok(banded[0]?.lo === 0.8 && banded[0]?.hi === 0.9, 'rows: bucket bounds are lo/hi tenths');
  ok(banded[0]?.sublabel === '0.8–0.9', 'rows: sublabel is the range');
  ok(banded.every((g) => g.cat === 'all'), 'rows: bands carry the category key so the wall can merge them');
  ok(banded[0]?.label === '' , 'rows: an ungrouped band set has no header text');

  const both = arrangeRows(CAT, axes({ groupAxis: 'theme', rowsAxis: 'warmth' }), bundleLabel);
  const oceanBands = both.filter((g) => g.cat === 'ocean');
  ok(oceanBands.length === 2, 'group+rows: ocean splits into two warmth buckets');
  ok(oceanBands[0]?.label === 'ocean (warmth)', 'group+rows: the header names the bucketing axis');
  ok(oceanBands[1]?.label === '', 'group+rows: only the first sub-row carries the header');

  ok(FACET_OF.hue(CAT[0]) > 0 && FACET_OF.hue(CAT[0]) <= 1, 'FACET_OF.hue is normalised to 0..1 for bucketing');
  ok(ROW_BUCKETS === 10, 'ROW_BUCKETS is 10 (the sublabels assume tenths)');
}

// --- [4] sorting -----------------------------------------------------------------

console.log('[4] sort axes');
{
  const s = (sortAxis: string, reverse = false) =>
    flat(arrangeRows(CAT, { groupAxis: 'none', rowsAxis: 'none', sortAxis, reverse }, bundleLabel)).join(',');
  ok(s('lightness') === 'a,c,e,b,d', 'sort lightness: dark → light');
  ok(s('vividness') === 'c,d,e,a,b', 'sort vividness: muted → vivid');
  ok(s('complexity') === 'a,c,e,b,d', 'sort complexity: simple → complex');
  ok(s('rainbow') === 'c,a,b,e,d', 'sort rainbow: single-hue → rainbow');
  ok(s('warmth') === 'a,d,c,e,b', 'sort warmth: cool → warm');
  ok(s('hue') === 'c,e,b,d,a', 'sort hue: around the wheel by meanHue');
  ok(s('name') === 'c,e,a,d,b', 'sort name: alphabetical — got ' + s('name'));
  ok(s('lightness', true) === 'd,b,e,c,a', 'reverse: flips the order');
  ok(s('nonsense') === 'a,b,c,d,e', 'sort: an unknown axis is inert (all keys 0, stable)');
  ok(typeof sortValue('name', CAT[0]) === 'string' && sortValue('name', CAT[0]) === 'ocean deep', 'sortValue name is the lowercased name');
}

// --- [5] the entry-set invariant -------------------------------------------------

console.log('[5] arrange preserves the entry set');
{
  const expect = [...CAT].map((e) => e.id).sort().join(',');
  let combos = 0;
  for (const groupAxis of ['none', 'theme', 'bundle']) {
    for (const rowsAxis of ['none', 'lightness', 'vividness', 'complexity', 'rainbow', 'warmth', 'hue']) {
      for (const sortAxis of ['lightness', 'vividness', 'hue', 'name']) {
        for (const reverse of [false, true]) {
          combos++;
          const got = flat(arrangeRows(CAT, { groupAxis, rowsAxis, sortAxis, reverse }, bundleLabel));
          ok(
            got.slice().sort().join(',') === expect && got.length === CAT.length,
            `arrange: every axis pair preserves the entry set (${groupAxis}/${rowsAxis}/${sortAxis}/${reverse}) — got ${got.join(',')}`,
          );
        }
      }
    }
  }
  ok(combos === 168, 'arrange: swept 168 axis combinations — got ' + combos);
  ok(arrangeRows([], { groupAxis: 'theme', rowsAxis: 'lightness', sortAxis: 'hue', reverse: false }, bundleLabel).length === 0,
    'arrange: an empty list produces no bands');
  // The ungrouped/unbanded path used to hand `list` through and sort it in place.
  const before = idsOf(CAT);
  const rows0 = arrangeRows(CAT, { groupAxis: 'none', rowsAxis: 'none', sortAxis: 'name', reverse: false }, bundleLabel);
  ok(idsOf(CAT) === before, 'arrange: never reorders the caller’s array');
  ok(rows0[0]?.entries !== CAT, 'arrange: the band is a copy, not the input array');
}

// --- [6] More like this ----------------------------------------------------------

console.log('[6] similarity');
{
  // The cheap 16-texel read must agree with the full 256-entry conversion, or the ranking
  // silently drifts from what the palette face would compute.
  for (const e of CAT) {
    const cheap = sampleRampBuffer(e.ramp, 16);
    const full = bufferToRamp(e.ramp);
    ok(
      rampDistance(cheap, full, 16) === 0,
      `sampleRampBuffer(${e.id}) reads the same texels rampDistance would (ΔE 0 vs the full ramp)`,
    );
  }
  ok(sampleRampBuffer(CAT[0].ramp, 16).length === 16, 'sampleRampBuffer: 16 swatches');
  ok(sampleRampBuffer(CAT[0].ramp, 1).length === 2, 'sampleRampBuffer: clamps to at least 2');

  const anchorRamp = bufferToRamp(CAT[1].ramp); // b, grey 200
  const dist = similarityIndex(CAT, anchorRamp);
  ok(dist.size === CAT.length, 'similarityIndex: one distance per entry');
  ok(dist.get('b') === 0, 'similarityIndex: the anchor is distance 0 from itself');
  ok(dist.get('a')! > dist.get('e')!, 'similarityIndex: a (grey 40) is further from b than e (grey 210)');

  const ranked = rankBySimilarity(CAT, dist);
  ok(ranked[0]?.id === 'b', 'rank: nearest first — the anchor itself leads');
  ok(ranked[ranked.length - 1]?.id === 'a', 'rank: the most distant entry is last');
  for (let i = 1; i < ranked.length; i++) {
    ok(dist.get(ranked[i - 1].id)! <= dist.get(ranked[i].id)!, 'rank: distances are non-decreasing');
  }
  ok(rankBySimilarity(CAT, dist) !== CAT, 'rank: returns a new array (does not sort the catalog in place)');
  ok(idsOf(CAT) === 'a,b,c,d,e', 'rank: the catalog order is untouched');

  const rows = similarityRows(CAT, dist);
  ok(rows.length === 1 && rows[0]?.key === 'similar', 'similarity mode: exactly one ungrouped band');
  ok(rows[0]?.label === '' && rows[0]?.cat === undefined && rows[0]?.sublabel === undefined, 'similarity mode: no group chrome');
  ok(flat(rows).join(',') === ranked.map((e) => e.id).join(','), 'similarity mode: the band is the ranked list');

  const partial = similarityRows(CAT.filter((e) => e.id !== 'b'), dist);
  ok(flat(partial).length === 4 && !flat(partial).includes('b'), 'similarity mode: ranks whatever survived the filters');
}

// --- [7] carve -------------------------------------------------------------------

console.log('[7] carve');
{
  const displayed = ['a', 'b', 'c', 'd', 'e'];
  const inside = ['b', 'd'];
  const keep = carveIds(displayed, inside, 'isolate');
  const cut = carveIds(displayed, inside, 'cut');
  ok(keep.join(',') === 'b,d', 'carve isolate: keeps exactly the inside set');
  ok(cut.join(',') === 'a,c,e', 'carve cut: keeps exactly the complement');
  ok(
    [...keep, ...cut].slice().sort().join(',') === displayed.slice().sort().join(',') &&
      keep.every((id) => !cut.includes(id)),
    'carve: isolate ∪ cut === displayed, and they are disjoint',
  );
  ok(carveIds(displayed, [], 'isolate').length === 0, 'carve isolate: an empty region keeps nothing');
  ok(carveIds(displayed, [], 'cut').join(',') === 'a,b,c,d,e', 'carve cut: an empty region cuts nothing');
  ok(carveIds(displayed, displayed, 'cut').length === 0, 'carve cut: selecting everything empties the wall');
  ok(carveIds(['b', 'a'], ['a', 'b'], 'isolate').join(',') === 'b,a', 'carve: the survivors keep DISPLAY order, not selection order');
  ok(carveIds(displayed, ['zzz'], 'isolate').length === 0, 'carve: ids not on the wall are ignored');
  // Carving twice narrows monotonically — the second pass runs against the first result.
  const second = carveIds(keep, ['b'], 'cut');
  ok(second.join(',') === 'd', 'carve: a second carve composes with the first');
}

// --- [8] narrower bookkeeping + the Arrange sentence -----------------------------

console.log('[8] badge, narrowers, sentence');
{
  ok(narrowerLabels(crit()).length === 0, 'narrowers: nothing active on a clean slate');
  ok(narrowerLabels(crit({ query: 'x' })).join(',') === 'search', 'narrowers: search is listed');
  ok(
    narrowerLabels(crit({ query: 'x', keptIds: ['a'], windows: { qL: [0.2, 1] }, activeThemes: ['ocean'], hiddenBundles: ['ui'] })).join(',') ===
      'search,carved,quality,themes,sources',
    'narrowers: all five, in reading order',
  );
  ok(narrowerLabels(crit({ query: '   ' })).length === 0, 'narrowers: a whitespace-only query is not a narrower');

  ok(activeFilterCount(crit({ query: 'x' })) === 0, 'badge: search is NOT counted (it has its own field)');
  ok(activeFilterCount(crit({ windows: { qL: [0.2, 1], qC: [0, 0.8] } })) === 2, 'badge: one per narrowed look axis');
  ok(activeFilterCount(crit({ activeThemes: ['ocean', 'fire'] })) === 1, 'badge: themes count once however many are on');
  ok(activeFilterCount(crit({ hiddenBundles: ['ui'] })) === 1, 'badge: hidden sources count once');
  ok(activeFilterCount(crit({ keptIds: [] })) === 1, 'badge: an active carve counts once, even when empty');
  ok(
    activeFilterCount(crit({ query: 'x', windows: { qL: [0.2, 1] }, activeThemes: ['ocean'], hiddenBundles: ['ui'], keptIds: ['a'] })) === 4,
    'badge: 1 look + themes + sources + carve = 4',
  );

  ok(
    arrangeSentence({ groupAxis: 'theme', rowsAxis: 'lightness', sortAxis: 'hue', reverse: false }) ===
      'by category · rows by lightness · sorted by hue',
    'sentence: the design wording',
  );
  ok(
    arrangeSentence({ groupAxis: 'bundle', rowsAxis: 'none', sortAxis: 'name', reverse: true }) ===
      'by source · sorted by name, reversed',
    'sentence: rows-by is omitted when off; reverse is spelled out',
  );
  // No grouping used to read "ungrouped" — the sentence naming the absence of a thing the
  // reader had not been told about. It says nothing now (owner, 2026-09-09).
  const noGroup = arrangeSentence({ groupAxis: 'none', rowsAxis: 'none', sortAxis: 'hue', reverse: false });
  ok(noGroup === 'sorted by hue', `sentence: no grouping says nothing about grouping (got "${noGroup}")`);
}

{
  // "More like this" ranks against DISPLAY colours: the anchor's output profile (an export
  // concern — sRGB / Linear / ACES) must not move the wall at all. Falsified by rendering
  // the anchor with `config.colorSpace` instead of 'srgb' in similarityAnchorRamp: the two
  // rankings diverge and the first check goes red.
  const stops = [
    { id: 'a', position: 0, color: '#B2A599', interpolation: 'linear' as const },
    { id: 'b', position: 0.5, color: '#24404A', interpolation: 'linear' as const },
    { id: 'c', position: 1, color: '#083344', interpolation: 'linear' as const },
  ];
  const srgbRamp = similarityAnchorRamp({ stops, blendSpace: 'oklab', colorSpace: 'srgb' } as GradientConfig);
  const linearRamp = similarityAnchorRamp({ stops, blendSpace: 'oklab', colorSpace: 'linear' } as GradientConfig);
  const acesRamp = similarityAnchorRamp({ stops, blendSpace: 'oklab', colorSpace: 'aces_inverse' } as GradientConfig);
  ok(rampDistance(srgbRamp, linearRamp, 32) === 0 && rampDistance(srgbRamp, acesRamp, 32) === 0,
    'the output profile does not move the ranking (sRGB · Linear · ACES render one anchor ramp)');
  ok(srgbRamp.some((c) => c.r > 40 || c.g > 40 || c.b > 40),
    'the anchor keeps its display colours (a Linear render would be near-black)');
}

console.log(failures === 0 ? '\nOK — pickerModel' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
