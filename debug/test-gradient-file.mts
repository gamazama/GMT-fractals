/**
 * test-gradient-file — the GMT gradient FILE (ADR-0123): the document payload, the PNG that
 * carries it, the one loader every entrance uses, where an import lands, and the two shelf rules
 * that came with it (the dedupe signature, and a merge keeping Recent at the top).
 *
 * Run: `npm run test:gradient-file` (also a link of `test:palette`). Plain node, a few seconds —
 * the 700-gradient PNG is the slow part.
 *
 *   [1] gradientDocument: the six-item corpus of `debug/test-gradient-roundtrip.mts` (stops, bias,
 *       interpolation, blend, colour space, the ramp form, a name with a space and a non-ASCII
 *       character) plus a group, an origin, a source and a createdAt, encoded → text → decoded
 *       EXACT; the legacy Favients collection, a GX Global wire, a bare config, the editor's copy,
 *       a bare stop array; a session envelope recognised; garbage / another version refused;
 *       hostile input never throws; the session-format mirror pinned to workingSession.ts.
 *   [2] the PNG through its metadata: exact, by `writeGradientPng` → `readGradientPng` and by
 *       `buildGradientFile` (png + json), whose filenames keep the real name.
 *   [3] the SAME PNG with the iTXt stripped → exact display colours as ramp gradients, count and
 *       order, for 1, 12 and 700 gradients (band height 128 / 32 / 16); re-encoded under every
 *       filter type and as RGBA it still reads; a foreign PNG (noise, a smooth 1024-texel ramp
 *       that is not 4-px columns, a small image) is `not-ours`; a scene PNG is `scene`.
 *  [3b] ONE gradient at a custom size (ADR-0123 Update 2026-09-14): 2048 × 40, 256 × 300, 4096 × 3
 *       and 512 × 1 written at that size and, stripped, read back as one ramp gradient with EXACT
 *       colours; a 1000-wide request snaps to 1024; the snap / clamp helpers; no size → 1024 × 128;
 *       a set ignores the size; `buildGradientFile` passes it; with metadata it is still the exact
 *       document; a 2048-wide band whose 8-px block differs in its last column, a flat colour 1000
 *       wide and an empty document's placeholder are not ours; a stripped 1024 × 64 two-set is two.
 *   [4] the router: a legacy collection JSON reads, a session JSON is routed as a session, a
 *       scene PNG as a scene, a foreign PNG as an image, a zip of mixed files imports every entry
 *       in order, names come from the file and the filename fallback is un-slugged, `File`s read
 *       as bytes.
 *  [4b] (2026-09-16) a SET .zip's member names: `favientsExport.buildCollectionZip` and
 *       `buildSwatchZip` name each member `NNN_` + the name as it is (`gradientFileStem`: spaces,
 *       non-ASCII and underscores kept, no path separator); the router names a nameless `.map`
 *       member back EXACTLY (index dropped, underscores kept); a zip written before that day
 *       (`001_Sea_Glass.map`) imports without its index, un-slugged; a new zip whose every name
 *       the old rule could have written reads as old (the documented limit); a zip whose indices
 *       are not its positions names entries as lone files; every member fits 255 UTF-8 bytes (CJK,
 *       emoji, a four-digit index, the longest suffix) and a cut one imports as the name's start.
 *   [5] the destination rule against the real store: the given group; a one-set document into
 *       its named set (created, then found again by label, case-insensitive, once per call); a
 *       plain file into Kept; Recent is not a destination; a multi-set document merges (never
 *       replaces) with destination null; a multi-file drop keeps its order; the summary names
 *       duplicates, a session and a scene.
 *   [6] favientSig: blend, bias and interpolation distinguish; colour space does not.
 *   [7] the store: `exportCollection` writes the document; a merge keeps Recent ONE block at index
 *       0 and every group one run; `importCollection` ensures unique stop ids; the legacy
 *       collection still imports.
 *   [9] (2026-09-16) the SCENE entrance's decision, `takeFromSceneLoader` — what app-gmt's scene
 *       drop and File ▸ Load Scene hand to this loader instead: a GX gradient PNG, its stripped
 *       copy, a gradients document / legacy collection JSON (behind a BOM too), a .zip of gradient
 *       files and a .map are taken; a scene PNG, a gmt-0.8.5 scene PNG, a PNG carrying a scene key
 *       beside gradient metadata, a foreign PNG, a bare `{stops}` JSON, a `{name, colors}` JSON, a
 *       scene JSON with a `colors` list, a session, a `.gmf` or a nameless file holding a document,
 *       a gradient-less zip or .css are not; hostile bytes never throw. Every "not taken" case the
 *       ROUTER alone would import is checked to be one first, so it cannot pass vacuously. The
 *       engine seam it rides is `npm run test:scene-file-claims`; the wiring, `smoke:gmt-gradientdrop`.
 *
 * FALSIFIED 2026-09-14 — 32 breaks, each made in the source by a script, the run red (exit 1),
 * the file restored byte for byte, green again. The number is how many assertions went red.
 *   [1] document: `readEntry` dropping createdAt → 5 ("document round trip is exact", "legacy
 *       collection reads", [2] "PNG round trip via metadata", [2] json, [4] legacy via router);
 *       no legacy-collection branch → 6; no session sniff → 5 (incl. [4] and the [5] summary);
 *       `safeId` admitting `__proto__` → 1 ("never survive"); no one-stop leniency → 1.
 *   [2] PNG metadata: `readGradientPng` ignoring the iTXt → 5 (it reads as bands, names lost);
 *       `gradientFileStem` also stripping whitespace → 3.
 *   [3] pixels: the writer flooring instead of rounding → 11 (the expected colours are computed
 *       in THIS file from `gradientDisplayRamp`, and read back from the ramp STRING — the first cut
 *       compared the writer's own `displayRampBytes` with itself and could not see this); band
 *       candidates tried most-bands-first → 3 ("count 4 of 1", "count 1400 of 700"); bands read
 *       bottom-up → 10; the DECODER's Average unfilter wrong → 2 and its Paeth wrong → 3 (decoder
 *       only — the encoder predicts inline, so a shared-helper break would be symmetric and
 *       invisible); no 4-px column check → 1 ("a smooth 1024-column ramp"); no scene check → 5.
 *       NOTE the opacity check PASSED under mutation on the first cut: one translucent pixel also
 *       breaks its column's uniformity, so the column check refused it. The fixture now makes a
 *       whole texel column translucent in every row → 1 red.
 *  [3b] (2026-09-14, seven more, each reverted — `palette/core/gradientPng.ts`): the reader's k
 *       hard-coded to the old 4 px → 4 ("2048 × 40 … EXACT" reads wrong colours, 256/512 not ours);
 *       the multiple-of-256 width check dropped → 1 ("a flat colour 1000 wide" — the first fixture,
 *       a stepped ramp, stayed GREEN because its blocks happened to disagree; only a flat colour
 *       makes every fractional-offset block "uniform"); the block check stopping at 4 columns → 1
 *       (the first fixture flipped column 9, which a 4-column check still sees — it now flips the
 *       block's LAST column); the single-band candidate back to "128 only" → 5; the writer ignoring
 *       the size → 5; the snap flooring → 2; the empty placeholder back to 1024 wide → 1.
 *   [4] router: no session route → 4; zips refused → 3; the filename fallback not un-slugged → 3.
 *  [4b] (2026-09-16, seven breaks by a script, each restored with its sha1 checked): the router
 *       always un-slugging a set zip → 1 ("… underscores kept"); keeping the index (every entry
 *       named as a lone file) → 4 here and 6 in test:gradient-roundtrip B .map [NAME filename];
 *       ignoring whether an index is the entry's POSITION → 1 ("a zip whose indices are not its
 *       positions …"); `zipMemberName` slugging again → 6 here, 6 in the roundtrip, 1 in
 *       test:palette-exportsubjects [11]; no byte cap → 1 ("fits 255 UTF-8 bytes", 387 / 488);
 *       `gradientFileStem` treating `/` as legal → 6 (incl. "no member name holds a path
 *       separator"); `runSetExport` not passing the member stems → 1 in exportsubjects [11] and 1
 *       in the roundtrip (the credit's `/` welded: "cpt-citytest").
 *   [5] destination: the caller's group ignored → 1; no one-set rule → 4; no collection merge → 3;
 *       a set minted per file → 1 ("make ONE set"); a multi-file drop's items unshifted → 1
 *       ("keeps its order"); Recent accepted as a destination → 2.
 *   [6] favientSig: without blend → 6 (the merges in [5] and [7] dedupe wrongly too); without
 *       bias → 1; without interpolation → 1; WITH colour space → 1.
 *   [7] store: a merge appending at the end (no `placeMerged`) → 3; `exportCollection` writing the
 *       legacy shape → 1; `coerceGradientConfig` without `ensureStopIds` → 1 ("unique id").
 * Also for `debug/test-palette-favients.mts` G3 (see its header): the one-stop leniency admitting
 * `stops: []` with no ramp → 3 red there.
 *   [9] (2026-09-16, `palette/core/importGradientFiles.ts` `takeFromSceneLoader`, each reverted): the
 *       scene-key check removed → 1 ("a PNG carrying a scene key stays the scene loader's …"); the
 *       JSON rule removed (any JSON the router imports is taken) → 4 (the {stops}, {name, colors},
 *       scene-JSON and BOM cases); the name check removed → 2 (".gmf", "no extension"). A fourth
 *       break — dropping an explicit BOM strip before the JSON sniff — stayed GREEN: `trimStart`
 *       already drops U+FEFF, so the strip was dead code and was removed, not guarded.
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

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (cond: boolean, msg: string): void => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};

const doc = await import('../palette/core/gradientDocument');
const png = await import('../palette/core/gradientPng');
const codec = await import('../utils/pngCodec');
const { buildGradientFile, gradientFileStem } = await import('../palette/core/gradientFile');
const router = await import('../palette/core/importGradientFiles');
const { useFavientsStore, favientSig, DEFAULT_GROUP, RECENT_GROUP, RECENT_LABEL, newGroupId } = await import('../palette/store/favientsStore');
const { encodeRamp, decodeRampBytes } = await import('../utils/gradientRamp');
const { gradientDisplayRamp } = await import('../utils/colorUtils');
const { encodeSession } = await import('../store/sessionEnvelope');
const { zipSync, strToU8 } = await import('fflate');
type GradientConfig = import('../types').GradientConfig;

// ── corpus: the six of debug/test-gradient-roundtrip.mts, verbatim ─────────
const hsvHex = (h: number, s: number, v: number): string => {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};
interface Item { key: string; name: string; config: GradientConfig }
const CORPUS: Item[] = [
  { key: '1 bw', name: 'Noir Blanc é', config: { stops: [
    { id: 'a', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 1, color: '#FFFFFF', bias: 0.5, interpolation: 'linear' },
  ], colorSpace: 'srgb', blendSpace: 'oklab' } },
  { key: '2 bias', name: 'Sea Glass é', config: { stops: [
    { id: 'a', position: 0, color: '#0B3D4F', bias: 0.3, interpolation: 'linear' },
    { id: 'b', position: 0.18, color: '#2A9D8F', bias: 0.7, interpolation: 'smooth' },
    { id: 'c', position: 0.47, color: '#E9C46A', bias: 0.2, interpolation: 'linear' },
    { id: 'd', position: 0.73, color: '#F4A261', bias: 0.85, interpolation: 'smooth' },
    { id: 'e', position: 1, color: '#E76F51', bias: 0.5, interpolation: 'linear' },
  ], colorSpace: 'srgb', blendSpace: 'hsv' } },
  { key: '3 step', name: 'Stufe Bänder ä', config: { stops: Array.from({ length: 12 }, (_, i) => ({
    id: `s${i}`, position: i / 12, color: hsvHex((i * 360) / 12, 0.75, i % 2 ? 0.95 : 0.6), bias: 0.5, interpolation: 'step' as const,
  })), colorSpace: 'srgb', blendSpace: 'oklab' } },
  { key: '4 linCS', name: 'Linear Pick ø', config: { stops: [
    { id: 'a', position: 0, color: '#1B0A3A', bias: 0.5, interpolation: 'linear' },
    { id: 'b', position: 0.4, color: '#B8336A', bias: 0.5, interpolation: 'linear' },
    { id: 'c', position: 0.75, color: '#F6AE2D', bias: 0.5, interpolation: 'linear' },
    { id: 'd', position: 1, color: '#FFF8E7', bias: 0.5, interpolation: 'linear' },
  ], colorSpace: 'linear', blendSpace: 'oklab' } },
  { key: '5 ramp', name: 'Zebra Phase ß', config: {
    stops: [],
    ramp: encodeRamp(Array.from({ length: 256 }, (_, i) => ((i + 1) % 2 ? { r: 240, g: 230, b: 200 } : { r: 20, g: Math.round(i * 0.6), b: 255 - i }))),
    colorSpace: 'srgb', blendSpace: 'oklab',
  } },
  { key: '6 dense40', name: 'Spectrum Wheel ü', config: { stops: Array.from({ length: 40 }, (_, i) => ({
    id: `w${i}`, position: i / 39, color: hsvHex((i * 720) / 39 % 360, 0.55 + 0.4 * Math.sin(i * 0.7) ** 2, 0.45 + 0.5 * Math.cos(i * 0.45) ** 2), bias: 0.5, interpolation: 'smooth' as const,
  })), colorSpace: 'srgb', blendSpace: 'oklab' } },
];
const ORIGIN = { ref: 'cpt-city:test', credit: 'cpt-city/test, CC BY 3.0', key: 'k-123' };
/** The corpus as shelf entries: item 2 and 3 in a set, item 6 credited, all with source + createdAt. */
const ENTRIES = CORPUS.map((it, i) => ({
  name: it.name,
  config: JSON.parse(JSON.stringify(it.config)) as GradientConfig,
  ...(i === 1 || i === 2 ? { group: 'g-ocean' } : {}),
  ...(i === 5 ? { origin: ORIGIN } : {}),
  source: `Picker · ${it.key}`,
  createdAt: 1_757_800_000_000 + i,
}));
const GROUPS = { 'g-ocean': 'Océan Set' };

const J = (v: unknown) => JSON.stringify(v);
/** Every field an entry carries, compared exactly. */
const sameEntry = (a: any, b: any): string[] => {
  const d: string[] = [];
  if (a.name !== b.name) d.push(`name ${J(a.name)}→${J(b.name)}`);
  if (J(a.config) !== J(b.config)) d.push(`config ${J(a.config).slice(0, 80)} → ${J(b.config).slice(0, 80)}`);
  if ((a.group ?? '') !== (b.group ?? '')) d.push(`group ${a.group}→${b.group}`);
  if (J(a.origin ?? null) !== J(b.origin ?? null)) d.push('origin');
  if ((a.source ?? null) !== (b.source ?? null)) d.push('source');
  if ((a.createdAt ?? null) !== (b.createdAt ?? null)) d.push('createdAt');
  return d;
};
const allSame = (want: any[], got: any[]): string[] => {
  if (want.length !== got.length) return [`count ${want.length}→${got.length}`];
  return want.flatMap((w, i) => sameEntry(w, got[i]).map((x) => `#${i + 1} ${x}`));
};

// ═══ [1] the document ═══════════════════════════════════════════════════════
console.log('[1] gradientDocument: the payload and every JSON shape it reads');
{
  const text = doc.gradientDocumentText(doc.encodeGradientDocument(ENTRIES, GROUPS));
  const back = doc.decodeGradientDocument(text);
  ok(back.kind === 'gradients' && back.format === 'document', `[1] the document decodes as a document (${back.kind})`);
  const diffs = back.kind === 'gradients' ? allSame(ENTRIES, back.gradients) : ['not gradients'];
  ok(diffs.length === 0, `[1] document round trip is exact — stops, bias, interpolation, blend, colour space, ramp, name, group, origin, source, createdAt (${diffs.slice(0, 3).join('; ') || 'all equal'})`);
  ok(back.kind === 'gradients' && back.groups['g-ocean'] === 'Océan Set', '[1] the set label comes back');
  const parsed = JSON.parse(text);
  ok(parsed.format === 'gmt-gradients' && parsed.version === 1 && Array.isArray(parsed.gradients) && !('id' in parsed.gradients[0]), '[1] the wire shape is ADR-0123 Decision 1 (format, version, gradients, no ids)');
  ok(!('group' in parsed.gradients[0]) && !('origin' in parsed.gradients[0]), '[1] absent fields are not written (a plain gradient is {name, config, …})');

  // the legacy collection, as exportCollection wrote it before ADR-0123
  const legacy = { version: 1, favients: ENTRIES.map((e, i) => ({ id: `fav-${i}`, ...e })), groupLabels: GROUPS };
  const lr = doc.decodeGradientDocument(JSON.stringify(legacy));
  ok(lr.kind === 'gradients' && lr.format === 'collection' && allSame(ENTRIES, lr.gradients).length === 0, '[1] legacy collection reads (every field exact)');
  ok(lr.kind === 'gradients' && lr.groups['g-ocean'] === 'Océan Set', '[1] legacy collection labels read');
  ok(doc.decodeGradientDocument({ version: 2, favients: [] }).kind === 'refused', '[1] a legacy collection under another version is refused');

  // GX Global wire
  const wire = { version: 1, items: [{ id: 'x1', name: 'Shared One', config: { stops: CORPUS[1].config.stops.map(({ id: _i, ...s }) => s), colorSpace: 'srgb', blendSpace: 'hsv' } }, { id: 'bad', config: { stops: [] } }] };
  const gw = doc.decodeGradientDocument(wire);
  ok(gw.kind === 'gradients' && gw.format === 'global' && gw.gradients.length === 1 && gw.gradients[0].name === 'Shared One' && gw.skipped === 1, '[1] a GX Global wire reads (and its malformed item is counted skipped)');
  ok(gw.kind === 'gradients' && gw.gradients[0].config.stops.every((s) => typeof s.id === 'string' && s.id.length > 0), '[1] GX wire stops get ids');

  // bare config / editor copy (the handleCopy shape: no ids, bias and interpolation spelled out)
  const copy = { stops: CORPUS[1].config.stops.map((s) => ({ position: s.position, color: s.color, bias: s.bias, interpolation: s.interpolation })), colorSpace: 'srgb', blendSpace: 'hsv' };
  const ec = doc.decodeGradientDocument(JSON.stringify(copy));
  const strip = (c: GradientConfig) => J({ ...c, stops: c.stops.map(({ id: _i, ...s }) => s) });
  ok(ec.kind === 'gradients' && ec.format === 'config' && strip(ec.gradients[0].config) === strip(CORPUS[1].config), '[1] editor copy reads exactly (positions, bias, interpolation, blend, colour space)');
  const bare = doc.decodeGradientDocument(J({ name: 'Linear Pick ø', ...CORPUS[3].config }));
  ok(bare.kind === 'gradients' && J(bare.gradients[0].config) === J(CORPUS[3].config) && bare.gradients[0].name === 'Linear Pick ø', '[1] a bare config with a name reads exactly, name included');
  const rampCfg = doc.decodeGradientDocument(J(CORPUS[4].config));
  ok(rampCfg.kind === 'gradients' && J(rampCfg.gradients[0].config) === J(CORPUS[4].config), '[1] a bare RAMP config reads exactly');
  const arr = doc.decodeGradientDocument(J(copy.stops));
  ok(arr.kind === 'gradients' && arr.gradients[0].config.stops.length === 5, '[1] a bare stop array reads');

  // sessions, refusals, hostile input
  const sess = encodeSession('gmt-gx-session', 1, { documents: {} });
  ok(doc.decodeGradientDocument(sess).kind === 'session', '[1] a GX session envelope is recognised as a session');
  const wsText = readFileSync(new URL('../palette/store/workingSession.ts', import.meta.url), 'utf8');
  ok(wsText.includes(`WORKING_SESSION_FORMAT = '${doc.GX_SESSION_FORMAT}'`), `[1] GX_SESSION_FORMAT mirrors workingSession.ts WORKING_SESSION_FORMAT ('${doc.GX_SESSION_FORMAT}')`);
  const v2 = doc.decodeGradientDocument(J({ format: 'gmt-gradients', version: 2, gradients: [ENTRIES[0]] }));
  ok(v2.kind === 'refused' && v2.reason === 'version' && v2.version === 2, '[1] a gmt-gradients document of another version is refused as version');
  ok(doc.decodeGradientDocument('not json').kind === 'refused' && doc.decodeGradientDocument('{}').kind === 'refused' && doc.decodeGradientDocument('null').kind === 'refused' && doc.decodeGradientDocument('["#fff","#000"]').kind === 'refused', '[1] garbage, {}, null and a colour list are refused');
  ok(doc.decodeGradientDocument(J({ stops: ['#ff0000', '#0000ff'] })).kind === 'refused', '[1] a {stops: [colour strings]} is left to the colour parsers');
  let threw = false;
  const hostile: unknown[] = [
    '{"format":"gmt-gradients","version":1,"gradients":[null,1,"x",{"config":null},{"config":{"stops":"x"}},{"name":{},"config":{"stops":[{"position":"a","color":7}]}}],"groups":{"__proto__":{"polluted":true},"constructor":"x"}}',
    { format: 'gmt-gradients', version: 1, gradients: [{ name: 'ok', config: CORPUS[0].config, group: '__proto__', origin: { ref: 1 } }] },
    { favients: [{ config: { stops: [{ position: 0, color: '#fff' }] } }, { config: { stops: [] } }] },
    { items: 'nope' }, [null], 42, undefined, '﻿{"stops":[]}',
  ];
  let protoSafe = true;
  try {
    for (const h of hostile) {
      const r = doc.decodeGradientDocument(h);
      if (r.kind === 'gradients') {
        if (Object.getPrototypeOf(r.groups) !== Object.prototype || 'polluted' in r.groups) protoSafe = false;
        if (r.gradients.some((g) => g.group === '__proto__')) protoSafe = false;
      }
    }
  } catch { threw = true; }
  ok(!threw, '[1] hostile payloads never throw');
  ok(protoSafe, '[1] __proto__ group ids and labels never survive');
  const h3 = doc.decodeGradientDocument(hostile[2]);
  ok(h3.kind === 'gradients' && h3.gradients.length === 1 && h3.gradients[0].config.stops.length === 1 && h3.skipped === 1, '[1] a legacy one-stop favourite is still admitted (the store\'s historical import gate), a stop-less one without a ramp is not');
}

// ═══ [2] the PNG through its metadata ═══════════════════════════════════════
console.log('[2] the PNG via its metadata, and buildGradientFile');
{
  const bytes = png.writeGradientPng(ENTRIES, GROUPS);
  const read = png.readGradientPng(bytes);
  ok(read.kind === 'document', `[2] our PNG reads as a document (${read.kind})`);
  const diffs = read.kind === 'document' ? allSame(ENTRIES, read.gradients) : ['not a document'];
  ok(diffs.length === 0, `[2] PNG round trip via metadata is exact (${diffs.slice(0, 3).join('; ') || 'all equal'})`);
  const h = codec.readPngHeader(bytes)!;
  ok(h.width === 1024 && h.height === 6 * 32 && h.colorType === 2 && h.bitDepth === 8 && h.interlace === 0, `[2] six gradients: 1024 × 192, RGB8, non-interlaced (${h.width}×${h.height} ct${h.colorType})`);
  const types = codec.readPngChunks(bytes)!.map((c) => c.type);
  ok(J(types) === J(['IHDR', 'iTXt', 'IDAT', 'IEND']), `[2] chunks are exactly IHDR iTXt IDAT IEND (${types.join(' ')})`);

  const one = buildGradientFile([ENTRIES[1]], GROUPS, 'png');
  ok(one.kind === 'png' && one.filename === 'Sea Glass é.png' && one.mime === 'image/png', `[2] buildGradientFile png keeps the real name (${one.filename})`);
  ok(one.kind === 'png' && codec.readPngHeader(one.bytes)!.height === 128, '[2] one gradient is one 128-px band');
  const set = buildGradientFile(ENTRIES.slice(1, 3), GROUPS, 'json');
  ok(set.kind === 'json' && set.filename === 'Océan Set.gmt-gradients.json' && set.mime === 'application/json', `[2] a set's JSON is named after the set (${set.filename})`);
  const sr = set.kind === 'json' ? doc.decodeGradientDocument(set.text) : null;
  ok(!!sr && sr.kind === 'gradients' && allSame(ENTRIES.slice(1, 3), sr.gradients).length === 0, '[2] buildGradientFile json round-trips exactly');
  ok(gradientFileStem('a/b\\c:d*e?f"g<h>i|j\x01k\x7f  Straße é ') === 'abcdefghijk  Straße é', `[2] the filename strips only \\ / : * ? " < > | and control characters (${J(gradientFileStem('a/b\\c:d*e?f"g<h>i|j\x01k\x7f  Straße é '))})`);
  ok(gradientFileStem('///') === 'gradients', '[2] a name with nothing legal left falls back');
}

// ═══ [3] the stripped PNG: pixels only ═════════════════════════════════════
console.log('[3] the PNG with its metadata stripped, re-encoded, foreign, and a scene');
{
  // The EXPECTED colours are computed here, independently of the writer's `displayRampBytes`: the
  // display ramp rounded to bytes. The READ side is the ramp string's own bytes, not a re-render.
  const expectBytes = (c: GradientConfig): Uint8Array => {
    const r = gradientDisplayRamp(c);
    const out = new Uint8Array(768);
    r.forEach((t, i) => { out[i * 3] = Math.max(0, Math.min(255, Math.round(t.r))); out[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(t.g))); out[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(t.b))); });
    return out;
  };
  const texelsOf = (c: GradientConfig): Uint8Array | null => (c.stops.length === 0 ? decodeRampBytes(c.ramp) : null);
  const stripDisplay = (entries: { config: GradientConfig }[]) => entries.map((e) => expectBytes(e.config));
  const checkBands = (label: string, entries: { name: string; config: GradientConfig }[], wantBand: number) => {
    const bytes = png.writeGradientPng(entries);
    const stripped = codec.stripPngText(bytes)!;
    ok(codec.readPngTextChunks(stripped).length === 0 && stripped.length < bytes.length, `[3] ${label}: the stripped copy has no text chunk`);
    const h = codec.readPngHeader(stripped)!;
    ok(h.height === entries.length * wantBand, `[3] ${label}: band height ${wantBand} (image ${h.height} px)`);
    const r = png.readGradientPng(stripped);
    ok(r.kind === 'bands', `[3] ${label}: reads as bands (${r.kind})`);
    if (r.kind !== 'bands') return null;
    ok(r.configs.length === entries.length, `[3] ${label}: count ${r.configs.length} of ${entries.length}`);
    const want = stripDisplay(entries);
    let exact = 0;
    r.configs.forEach((c, i) => {
      const got = texelsOf(c);
      if (got && want[i] && got.every((v, k) => v === want[i][k])) exact++;
    });
    ok(exact === entries.length, `[3] ${label}: every band is a ramp gradient with EXACT display colours, in order (${exact}/${entries.length})`);
    return stripped;
  };
  checkBands('1 gradient', [ENTRIES[1]], 128);
  const twelve = [...ENTRIES, ...ENTRIES.map((e) => ({ ...e, config: e.config.stops.length ? { ...e.config, stops: e.config.stops.map((s) => ({ ...s, position: 1 - s.position })) } : { ...ENTRIES[1].config, blendSpace: 'rgb' as const } }))];
  const set12 = checkBands('12-gradient set', twelve, 32)!;
  const shelf = Array.from({ length: 700 }, (_, i) => ({
    name: `g${i}`,
    config: { stops: [
      { id: 'a', position: 0, color: `#${(i * 2400 + 17).toString(16).padStart(6, '0').slice(-6).toUpperCase()}` },
      { id: 'b', position: 1, color: hsvHex((i * 37) % 360, 0.7, 0.9) },
    ], colorSpace: 'srgb', blendSpace: 'oklab' } as GradientConfig,
  }));
  const t0 = Date.now();
  checkBands('700-gradient shelf', shelf, 16);
  console.log(`      (700-gradient write + strip + read: ${Date.now() - t0} ms)`);
  ok(png.bandHeightFor(1) === 128 && png.bandHeightFor(2) === 32 && png.bandHeightFor(512) === 32 && png.bandHeightFor(513) === 16 && png.bandHeightFor(1024) === 16 && png.bandHeightFor(1025) === 8 && png.bandHeightFor(9999) === 8, '[3] bandHeightFor steps 128 / 32 / 16 / 8 at 1, 2, 513, 1025');

  // [3b] ONE gradient at a custom size (ADR-0123 Update 2026-09-14): the width snaps to a multiple
  // of 256, each texel is k = width / 256 columns, the height is free — and a stripped copy still
  // reads back exact colours. Expected colours are `expectBytes`, independent of the writer.
  const sized = (entry: { name: string; config: GradientConfig }, size: { width?: number; height?: number }) => {
    const bytes = png.writeGradientPng([entry], undefined, size);
    const stripped = codec.stripPngText(bytes)!;
    const h = codec.readPngHeader(stripped)!;
    const r = png.readGradientPng(stripped);
    const got = r.kind === 'bands' && r.configs.length === 1 ? texelsOf(r.configs[0]) : null;
    const want = expectBytes(entry.config);
    return { bytes, stripped, w: h.width, h: h.height, kind: r.kind, count: r.kind === 'bands' ? r.configs.length : 0, exact: !!got && got.every((v, k) => v === want[k]) };
  };
  for (const [w, hgt, entry] of [[2048, 40, ENTRIES[2]], [256, 300, ENTRIES[4]], [4096, 3, ENTRIES[5]], [512, 1, ENTRIES[1]]] as const) {
    const s = sized(entry, { width: w, height: hgt });
    ok(s.w === w && s.h === hgt, `[3b] one gradient asked ${w} × ${hgt} is written ${s.w} × ${s.h}`);
    ok(s.kind === 'bands' && s.count === 1 && s.exact, `[3b] ${w} × ${hgt}, metadata stripped, reads back as ONE ramp gradient with EXACT colours (${s.kind}, ${s.count}, exact ${s.exact})`);
  }
  const snapped = sized(ENTRIES[1], { width: 1000, height: 40 });
  ok(snapped.w === 1024 && snapped.h === 40 && snapped.exact, `[3b] a 1000-wide request snaps to 1024 and still reads exactly (${snapped.w} × ${snapped.h})`);
  ok(png.snapGradientPngWidth(1000) === 1024 && png.snapGradientPngWidth(100) === 256 && png.snapGradientPngWidth(9000) === 4096 && png.snapGradientPngWidth(640) === 768 && png.snapGradientPngWidth(NaN) === 1024,
    `[3b] snapGradientPngWidth: nearest multiple of 256 in 256…4096, default 1024 (1000→${png.snapGradientPngWidth(1000)}, 100→${png.snapGradientPngWidth(100)}, 9000→${png.snapGradientPngWidth(9000)}, 640→${png.snapGradientPngWidth(640)})`);
  ok(png.clampGradientPngHeight(0) === 1 && png.clampGradientPngHeight(5000) === 4096 && png.clampGradientPngHeight(40.4) === 40 && png.clampGradientPngHeight(undefined) === 128, '[3b] clampGradientPngHeight: 1…4096, rounded, default 128');
  const dflt = codec.readPngHeader(png.writeGradientPng([ENTRIES[1]]))!;
  ok(dflt.width === 1024 && dflt.height === 128, `[3b] no size → the 1024 × 128 default (${dflt.width} × ${dflt.height})`);
  const setIgnores = codec.readPngHeader(png.writeGradientPng(ENTRIES.slice(0, 3), undefined, { width: 2048, height: 40 }))!;
  ok(setIgnores.width === 1024 && setIgnores.height === 3 * 32, `[3b] a SET ignores the size and keeps the band layout (${setIgnores.width} × ${setIgnores.height})`);
  const viaBuild = buildGradientFile([ENTRIES[1]], undefined, 'png', undefined, { width: 512, height: 40 });
  ok(viaBuild.kind === 'png' && codec.readPngHeader(viaBuild.bytes)!.width === 512 && codec.readPngHeader(viaBuild.bytes)!.height === 40, '[3b] buildGradientFile passes the size to the writer');
  const meta = png.readGradientPng(snapped.bytes);
  ok(meta.kind === 'document' && allSame([ENTRIES[1]], meta.gradients).length === 0, '[3b] with its metadata a custom-size PNG still reads as the exact document');
  // THE k-COLUMN RULE, from the refusing side: a 2048-wide single band with ONE non-uniform 8-px
  // block (the LAST column of texel 1's block differs — a check that stopped at the old 4-px
  // column would miss it; rows still identical) is not ours; a width that is not a multiple of 256
  // is not ours even when every pixel agrees (a FLAT colour: the one fixture a fractional texel
  // width would otherwise misread, since every block it looks at is "uniform"); an empty
  // document's placeholder is not claimed.
  {
    const dec2 = codec.decodePng(sized(ENTRIES[2], { width: 2048, height: 6 }).stripped)!;
    const broken = dec2.pixels.slice();
    for (let y = 0; y < 6; y++) broken[(y * 2048 + 15) * 3] ^= 0x40;
    ok(png.readGradientPng(codec.encodePng(2048, 6, broken)).kind === 'not-ours', '[3b] a 2048-wide band whose 8-px texel block differs in its last column is not ours');
    const flat = new Uint8Array(1000 * 20 * 3);
    for (let p = 0; p < 1000 * 20; p++) { flat[p * 3] = 200; flat[p * 3 + 1] = 100; flat[p * 3 + 2] = 50; }
    ok(png.readGradientPng(codec.encodePng(1000, 20, flat)).kind === 'not-ours', '[3b] a flat colour 1000 wide (not a multiple of 256) is not ours');
    const empty = png.writeGradientPng([]);
    ok(png.readGradientPng(codec.stripPngText(empty)!).kind === 'not-ours', '[3b] an empty document\'s placeholder image is not read as a gradient');
  }
  // A 1024-wide height two layouts could produce keeps the fewest-bands rule, and a set still reads.
  {
    const two = codec.stripPngText(png.writeGradientPng([ENTRIES[1], ENTRIES[3]]))!; // 1024 × 64
    const r2 = png.readGradientPng(two);
    ok(r2.kind === 'bands' && r2.configs.length === 2, `[3b] a stripped two-gradient set (1024 × 64) still reads as two bands, not one 64-px gradient (${r2.kind === 'bands' ? r2.configs.length : r2.kind})`);
  }

  // re-encoded by "another tool": every filter type, and RGBA
  const dec = codec.decodePng(set12)!;
  const want = twelve.map((e) => expectBytes(e.config));
  const sameAsWant = (r: ReturnType<typeof png.readGradientPng>) =>
    r.kind === 'bands' && r.configs.length === 12 && r.configs.every((c, i) => !!texelsOf(c) && texelsOf(c)!.every((v, k) => v === want[i][k]));
  for (const f of [0, 1, 2, 3, 4] as const) {
    ok(sameAsWant(png.readGradientPng(codec.encodePng(1024, dec.height, dec.pixels, { filter: f }))), `[3] re-encoded with filter ${f} for every row it still reads exactly`);
  }
  const mixed = codec.encodePng(1024, dec.height, dec.pixels, { filter: (y) => ((y * 7) % 5) as 0 | 1 | 2 | 3 | 4 });
  ok(sameAsWant(png.readGradientPng(mixed)), '[3] re-encoded with a different filter per row it still reads exactly');
  const rgba = new Uint8Array(dec.width * dec.height * 4);
  for (let p = 0; p < dec.width * dec.height; p++) { rgba[p * 4] = dec.pixels[p * 3]; rgba[p * 4 + 1] = dec.pixels[p * 3 + 1]; rgba[p * 4 + 2] = dec.pixels[p * 3 + 2]; rgba[p * 4 + 3] = 255; }
  ok(sameAsWant(png.readGradientPng(codec.encodePng(1024, dec.height, rgba, { channels: 4, filter: 4 }))), '[3] re-encoded as opaque RGBA (Paeth) it still reads exactly');
  // The whole first texel column translucent in EVERY row — rows stay identical and the 4-px column
  // stays uniform, so only the opacity check can refuse it (a single translucent pixel was first
  // tried here and passed under a removed alpha check: the column check caught it instead).
  const translucent = rgba.slice();
  for (let y = 0; y < dec.height; y++) for (let k = 0; k < 4; k++) translucent[(y * 1024 + k) * 4 + 3] = 128;
  ok(png.readGradientPng(codec.encodePng(1024, dec.height, translucent, { channels: 4 })).kind === 'not-ours', '[3] a translucent texel column makes it not ours');

  // foreign PNGs
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) >>> 24);
  const noise = new Uint8Array(1024 * 128 * 3).map(() => rnd());
  ok(png.readGradientPng(codec.encodePng(1024, 128, noise)).kind === 'not-ours', '[3] a noise PNG at our size is not ours');
  const smooth = new Uint8Array(1024 * 128 * 3);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 1024; x++) { const o = (y * 1024 + x) * 3; smooth[o] = x >> 2; smooth[o + 1] = (x * 3) >> 4; smooth[o + 2] = 255 - (x >> 2) + (x % 4 === 3 ? 1 : 0); }
  ok(png.readGradientPng(codec.encodePng(1024, 128, smooth)).kind === 'not-ours', '[3] a smooth 1024-column ramp (identical rows, but not 4-px columns) is not ours');
  ok(png.readGradientPng(codec.encodePng(16, 16, new Uint8Array(16 * 16 * 3))).kind === 'not-ours', '[3] a small PNG is not ours');
  ok(png.readGradientPng(strToU8('not a png at all')).kind === 'not-png', '[3] bytes that are not a PNG are not-png');
  ok(png.readGradientPng(set12.slice(0, 200)).kind === 'not-ours', '[3] a truncated PNG never throws');

  // a scene PNG: the real key
  let sceneKey = png.SCENE_PNG_KEYWORDS[0];
  try {
    sceneKey = (await import('../utils/SceneFormat')).SCENE_METADATA_KEY;
  } catch (e) {
    console.log(`      (utils/SceneFormat did not load in node: ${(e as Error).message}; pinning against its source text)`);
    const src = readFileSync(new URL('../utils/SceneFormat.ts', import.meta.url), 'utf8');
    sceneKey = /SCENE_METADATA_KEY = '([^']+)'/.exec(src)?.[1] ?? '';
  }
  ok(png.SCENE_PNG_KEYWORDS.includes(sceneKey), `[3] SCENE_PNG_KEYWORDS mirrors utils/SceneFormat SCENE_METADATA_KEY ('${sceneKey}')`);
  const scene = codec.encodePng(640, 360, new Uint8Array(640 * 360 * 3), { text: [{ keyword: sceneKey, text: '{"name":"a scene"}' }] });
  ok(png.readGradientPng(scene).kind === 'scene', '[3] a scene PNG is recognised as a scene');
  const legacyScene = codec.encodePng(8, 8, new Uint8Array(8 * 8 * 3), { text: [{ keyword: 'FractalData', text: '{}' }] });
  ok(png.readGradientPng(legacyScene).kind === 'scene', '[3] a gmt-0.8.5 FractalData PNG is a scene too');
  // metadata that does not decode still leaves the pixels readable
  const futureDoc = codec.encodePng(1024, dec.height, dec.pixels, { text: [{ keyword: png.GRADIENT_PNG_KEYWORD, text: J({ format: 'gmt-gradients', version: 9, gradients: [] }) }] });
  ok(sameAsWant(png.readGradientPng(futureDoc)), '[3] metadata of another version falls back to the pixels, exactly');
}

// ═══ [4] the router ═════════════════════════════════════════════════════════
console.log('[4] the one loader: route by content');
{
  const legacyJson = J({ version: 1, favients: ENTRIES.map((e, i) => ({ id: `f${i}`, ...e })), groupLabels: GROUPS });
  const sessionJson = encodeSession('gmt-gx-session', 1, { documents: { working: {} } });
  const gmtPng = png.writeGradientPng([ENTRIES[1], ENTRIES[4]]);
  const strippedSet = codec.stripPngText(png.writeGradientPng([ENTRIES[0], ENTRIES[3], ENTRIES[5]]))!;
  const scenePng = codec.encodePng(8, 8, new Uint8Array(8 * 8 * 3), { text: [{ keyword: 'SceneData', text: '{}' }] });
  const photo = codec.encodePng(4, 4, new Uint8Array(4 * 4 * 3).fill(90));
  const MAP = '0 0 0\n255 0 0\n0 255 0\n255 255 255\n';

  const p = router.parseGradientImports([
    { name: 'favients-collection.json', text: legacyJson },
    { name: 'Sea_Glass_.gxsession.json', text: sessionJson },
    { name: 'scene.png', text: '', bytes: scenePng },
    { name: 'photo.png', text: '', bytes: photo },
  ]);
  ok(p.items.length === 6 && allSame(ENTRIES, p.items as any).length === 0, `[4] a legacy collection JSON reads through the router, exactly (${p.items.length})`);
  ok(p.sessions.length === 1 && p.sessions[0].text === sessionJson, '[4] a session JSON is routed as a session, text intact');
  ok(p.scenes.length === 1 && p.scenes[0] === 'scene.png', '[4] a scene PNG is routed as a scene');
  ok(p.images.length === 1 && p.images[0].name === 'photo.png' && p.images[0].bytes === photo, '[4] a foreign PNG is routed as an image, bytes intact');
  ok(p.skipped === 0, `[4] none of those is "unreadable" (skipped ${p.skipped})`);

  const zip = zipSync({
    '001_Sea_Glass.map': strToU8(MAP),
    'set/002 two.png': gmtPng,
    'set/003_My_Set.png': strippedSet,
    '004_copy.json': strToU8(J({ stops: CORPUS[1].config.stops.map(({ id: _i, ...s }) => s), colorSpace: 'srgb', blendSpace: 'hsv' })),
    '005.gxsession.json': strToU8(sessionJson),
    '__MACOSX/._001_Sea_Glass.map': strToU8('junk'),
    '.DS_Store': strToU8('junk'),
  });
  const file = new File([zip], 'Meine Sammlung ü.zip');
  const reads = await router.readGradientFiles([file]);
  ok(!!reads[0]?.bytes && reads[0].text === '', '[4] readGradientFiles reads a zip as bytes');
  const z = router.parseGradientImports(reads);
  const names = z.items.map((i) => i.name);
  ok(z.items.length === 1 + 2 + 3 + 1, `[4] a zip of mixed files imports every gradient entry (${z.items.length} of 7)`);
  ok(J(names) === J(['001 Sea Glass', 'Sea Glass é', 'Zebra Phase ß', '003 My Set 1', '003 My Set 2', '003 My Set 3', '004 copy']), `[4] zip entries import in order, named from the file or the un-slugged filename (${J(names)})`);
  ok(z.sessions.length === 1 && z.skipped === 0, `[4] the session inside the zip is routed as a session; junk entries are ignored (skipped ${z.skipped})`);
  ok(J(z.items[1].config) === J(CORPUS[1].config) && J(z.items[2].config) === J(CORPUS[4].config), '[4] the GMT PNG inside the zip is exact');
  const stopsOnly = (c: GradientConfig) => J(c.stops.map(({ id: _i, ...s }) => s));
  ok(stopsOnly(z.items[6].config) === stopsOnly(CORPUS[1].config) && z.items[6].config.blendSpace === 'hsv', '[4] the editor copy inside the zip keeps its stops and blend');

  const fileReads = await router.readGradientFiles([new File([gmtPng], 'x.png'), new File([MAP], 'Stufe_B_nder_.map'), new File([J(doc.encodeGradientDocument([ENTRIES[3]]))], 'Linear_Pick.gmt-gradients.json')]);
  const fr = router.parseGradientImports(fileReads);
  ok(fr.items.length === 4 && fr.items[0].name === 'Sea Glass é', '[4] a real File PNG imports by content with the name it carries');
  ok(fr.items[2].name === 'Stufe B nder', `[4] a nameless text file falls back to its un-slugged filename (${J(fr.items[2].name)})`);
  ok(fr.items[3].name === 'Linear Pick ø', '[4] a .gmt-gradients.json names from its document, not "Linear Pick.gmt-gradients"');
  ok(router.gradientNameFromFile('dir/Linear_Pick.gmt-gradients.json') === 'Linear Pick' && router.gradientNameFromFile('Sea_Glass_.gxsession.json') === 'Sea Glass', '[4] the fallback drops .gmt-gradients.json / .gxsession.json whole');
  const hostileBytes = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0]), new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]), new Uint8Array(0)];
  let threw = false;
  try { router.parseGradientImports(hostileBytes.map((b, i) => ({ name: `h${i}.bin`, text: '', bytes: b }))); } catch { threw = true; }
  ok(!threw, '[4] a truncated PNG, a broken zip and an empty file never throw');
}

// ═══ [4b] a set .zip's member names (2026-09-16) ═════════════════════════════
console.log('[4b] a set .zip: members named as the gradients are, and named back');
{
  const { buildCollectionZip, buildSwatchZip, zipMemberName, MAX_ZIP_MEMBER_BYTES } = await import('../palette/core/favientsExport');
  const { getExportFormat } = await import('../palette/core/exportFormats');
  const { unzipSync } = await import('fflate');
  const MAP = '0 0 0\n255 0 0\n0 255 0\n255 255 255\n';
  const favs = (names: string[]) => names.map((name, i) => ({ id: `z${i}`, name, createdAt: i, config: JSON.parse(J(CORPUS[1].config)) })) as any[];
  const namesOf = async (zip: Uint8Array, zipName = 'Set.zip') => router.parseGradientImports(await router.readGradientFiles([new File([zip], zipName)])).items.map((i) => i.name);
  const utf8Len = (s: string) => new TextEncoder().encode(s).length;

  // THE EXPORT: `NNN_` + the name as it is — spaces, case, non-ASCII and underscores kept, only
  // `\ / : * ? " < > |` removed, so no name can make a folder.
  const NAMES = ['Sea Glass é', 'snake_case_name', ' Zebra/Phase: ß? ', '_leading underscore', 'AC\\DC <live>|"1"*', '../../up'];
  const KEPT = ['Sea Glass é', 'snake_case_name', 'ZebraPhase ß', '_leading underscore', 'ACDC live1', '....up'];
  const members = Object.keys(unzipSync(buildCollectionZip(favs(NAMES), 'map')));
  ok(J(members) === J(KEPT.map((n, i) => `00${i + 1}_${n}.map`)), `[4b] buildCollectionZip names each member NNN_<the name as it is>.map (${J(members)})`);
  ok(members.every((m) => !/[\\/]/.test(m)), '[4b] no member name holds a path separator, whatever the gradient is called');
  const swatchMembers = Object.keys(unzipSync(buildSwatchZip(NAMES.map((name) => ({ name, colors: [{ r: 1, g: 2, b: 3 }] })), 'gpl')!));
  ok(J(swatchMembers) === J(KEPT.map((n, i) => `00${i + 1}_${n}-swatches.gpl`)), `[4b] buildSwatchZip names its members by the same rule (${J(swatchMembers)})`);

  // THE IMPORT: a set .zip's `.map` members (no name field) come back as the names, exactly —
  // the index dropped and the underscores KEPT, because this zip holds names the old rule could
  // not have written.
  ok(J(await namesOf(buildCollectionZip(favs(NAMES), 'map'))) === J(KEPT), `[4b] a set .zip imports its .map members as the names exactly, underscores kept (${J(await namesOf(buildCollectionZip(favs(NAMES), 'map')))})`);
  // A zip written BEFORE 2026-09-16 (`[^\w.-]+` → `_`, 48 characters): the index dropped, `_` read as
  // a space — better than the "001 Sea Glass" it imported as until then.
  const OLD = zipSync({ '001_Sea_Glass.map': strToU8(MAP), '002_Stufe_B_nder.map': strToU8(MAP), '003_snake_case.map': strToU8(MAP) });
  ok(J(await namesOf(OLD)) === J(['Sea Glass', 'Stufe B nder', 'snake case']), `[4b] an old slugged set .zip imports without its index, un-slugged (${J(await namesOf(OLD))})`);
  // The documented limit: a new zip whose EVERY name the old rule could also have written cannot be
  // told from an old one by its filenames, so it reads as old.
  ok(J(await namesOf(buildCollectionZip(favs(['snake_case', 'Plain']), 'map'))) === J(['snake case', 'Plain']), '[4b] a set .zip of names the old rule could have written reads as old (zipMemberFallbackNames says so)');
  // Not a set .zip — an index out of position, or a member without one — names each entry as a lone file does.
  const HAND = zipSync({ '002_a_b.map': strToU8(MAP), '001_c.map': strToU8(MAP) });
  ok(J(await namesOf(HAND)) === J(['002 a b', '001 c']), `[4b] a zip whose indices are not its positions keeps them, as a lone file would (${J(await namesOf(HAND))})`);

  // SIZE: a member extracts on ext4 / APFS / NTFS — at most MAX_ZIP_MEMBER_BYTES UTF-8 bytes — even for
  // a 120-code-point stem of 3- and 4-byte characters, a four-digit index and the longest suffix.
  const pdn = getExportFormat('pdn')!;
  const long = [zipMemberName(pdn, 1234, '名'.repeat(150), 'swatches'), zipMemberName(getExportFormat('map')!, 0, '🎨'.repeat(150)), zipMemberName(getExportFormat('map')!, 0, 'a'.repeat(150))];
  ok(long.every((m) => utf8Len(m) <= MAX_ZIP_MEMBER_BYTES), `[4b] every member name fits ${MAX_ZIP_MEMBER_BYTES} UTF-8 bytes (${long.map(utf8Len).join(', ')})`);
  ok(long[0].startsWith('1235_名') && long[0].endsWith('-paintnet-swatches.txt') && long[1].startsWith('001_🎨') && !/\uD83C$/.test(long[1].slice(0, -4)), '[4b] a cut member keeps its index and suffix, and never splits a character');
  ok(long[2] === `001_${'a'.repeat(120)}.map`, `[4b] an ASCII stem is cut at 120 code points, the single-download rule (${long[2].length})`);
  const emojiBack = await namesOf(buildCollectionZip(favs(['🎨'.repeat(150), 'x y']), 'map'));
  ok(emojiBack[0].length > 0 && '🎨'.repeat(150).startsWith(emojiBack[0]) && emojiBack[1] === 'x y', `[4b] a cut name imports as the start of the name (${Array.from(emojiBack[0]).length} code points)`);
}

// ═══ [5] where it lands ═════════════════════════════════════════════════════
console.log('[5] the destination rule (ADR-0123 Decision 4)');
{
  const st = () => useFavientsStore.getState();
  const reset = () => { mem.clear(); useFavientsStore.setState({ favients: [], groupLabels: {}, lastGroupId: DEFAULT_GROUP }); };
  const MAP = (k: number) => `0 0 ${k}\n255 0 0\n0 255 ${k}\n255 255 255\n`;
  /** A document whose every entry sits in ONE set, labelled `label`. */
  const oneSet = (label: string, items = [ENTRIES[1], ENTRIES[2]]) => ({ name: `${label}.gmt-gradients.json`, text: J(doc.encodeGradientDocument(items.map((e) => ({ ...e, group: 'g-ocean' })), { 'g-ocean': label })) });

  reset();
  const mine = newGroupId();
  st().insertMany([{ config: CORPUS[0].config, name: 'seed' }], mine, 'Mine');
  const a = router.importGradientsInto([oneSet('Ocean')], mine);
  ok(a.destination === mine && st().favients.filter((f) => f.group === mine).length === 3, '[5] a group the user owns wins, even over a document naming a set');

  reset();
  const b = router.importGradientsInto([oneSet('Ocean')]);
  const oceanId = Object.keys(st().groupLabels).find((k) => st().groupLabels[k] === 'Ocean');
  ok(!!oceanId && b.destination === oceanId && b.destinationLabel === 'Ocean' && st().favients.every((f) => f.group === oceanId), '[5] no group: a one-set document lands in a NEW set with its label, and returns its id');
  const b2 = router.importGradientsInto([oneSet('OCEAN ', [ENTRIES[1], ENTRIES[5]])]);
  ok(b2.destination === oceanId && b2.imported === 1 && b2.duplicates === 1 && Object.keys(st().groupLabels).length === 1, `[5] a second one-set document finds the set by label (case- and space-insensitive), deduping within it (${b2.imported} imported, ${b2.duplicates} dup)`);
  ok(router.importSummary(b2) === 'Imported 1 gradient into Ocean · 1 already in Ocean', `[5] summary: imported, where, and already there (${router.importSummary(b2)})`);

  reset();
  const c = router.importGradientsInto([oneSet('Reef', [ENTRIES[0]]), oneSet('reef', [ENTRIES[3]])]);
  const reefs = Object.values(st().groupLabels).filter((l) => l.toLowerCase() === 'reef');
  ok(reefs.length === 1 && c.imported === 2 && typeof c.destination === 'string' && c.destination !== DEFAULT_GROUP, `[5] two files naming the same NEW set in one drop make ONE set (${reefs.length} sets)`);

  reset();
  const d = router.importGradientsInto([{ name: 'plain.map', text: MAP(1) }, { name: 'second.map', text: MAP(2) }, { name: 'third.map', text: MAP(3) }]);
  ok(d.destination === DEFAULT_GROUP && d.destinationLabel === 'Kept' && st().favients.every((f) => (f.group ?? '') === ''), '[5] no group, no set named: Kept');
  ok(J(st().favients.map((f) => f.name)) === J(['plain', 'second', 'third']), `[5] a multi-file drop keeps its order (${st().favients.map((f) => f.name).join(',')})`);
  const d2 = router.importGradientsInto([{ name: 'plain.map', text: MAP(1) }], RECENT_GROUP);
  ok(d2.destination === DEFAULT_GROUP && d2.duplicates === 1, '[5] Recent is not a destination a caller can pass (falls back to Kept)');
  ok(router.importSummary(d2) === 'That gradient is already in Kept', `[5] summary: nothing new says where it already is (${router.importSummary(d2)})`);

  // a multi-set document is a collection: merge, never replace
  reset();
  st().insertMany([{ config: CORPUS[0].config, name: 'kept seed' }], DEFAULT_GROUP);
  const other = newGroupId();
  st().insertMany([{ config: { ...CORPUS[2].config, blendSpace: 'rgb' }, name: 'other seed' }], other, 'Other');
  const shelfBefore = st().favients.length;
  const whole = { name: 'shelf.gmt-gradients.json', text: J(doc.encodeGradientDocument(ENTRIES, GROUPS)) };
  const e = router.importGradientsInto([whole], other);
  ok(e.collection === true && e.destination === null, '[5] a document naming several sets merges as a collection (destination null), whatever group was passed');
  ok(st().favients.length === shelfBefore + 5 && st().favients.some((f) => f.name === 'other seed'), `[5] the merge adds and never replaces (${shelfBefore} → ${st().favients.length}; item 1 was already on the shelf)`);
  const oceanNow = Object.keys(st().groupLabels).find((k) => st().groupLabels[k] === 'Océan Set');
  ok(!!oceanNow && st().favients.filter((f) => f.group === oceanNow).map((f) => f.name).join() === 'Sea Glass é,Stufe Bänder ä', '[5] the merged set comes back under its label');

  // sessions / scenes / images in the outcome and its sentence
  reset();
  const s = router.importGradientsInto([{ name: 'w.gxsession.json', text: encodeSession('gmt-gx-session', 1, { documents: {} }) }]);
  ok(s.imported === 0 && s.sessions?.length === 1 && router.importSummary(s) === 'That is a session file, not a gradient file', `[5] summary: a session file says so (${router.importSummary(s)})`);
  const sc = router.importGradientsInto([{ name: 's.png', text: '', bytes: codec.encodePng(8, 8, new Uint8Array(192), { text: [{ keyword: 'SceneData', text: '{}' }] }) }]);
  ok(sc.scenes?.length === 1 && router.importSummary(sc) === 'That is a GMT scene, not a gradient file', `[5] summary: a scene PNG says so (${router.importSummary(sc)})`);
  ok(router.importSummary({ imported: 0, skipped: 3 }) === 'No gradient could be read from that file', '[5] summary: nothing readable still says so');
}

// ═══ [6] the dedupe signature ═══════════════════════════════════════════════
console.log('[6] favientSig learns blend, bias and interpolation — not colour space');
{
  const base = CORPUS[1].config;
  ok(favientSig({ ...base, blendSpace: 'rgb' }) !== favientSig(base), '[6] favientSig distinguishes blend');
  ok(favientSig({ ...base, stops: base.stops.map((s, i) => (i === 2 ? { ...s, bias: 0.5 } : s)) }) !== favientSig(base), '[6] favientSig distinguishes bias (one stop)');
  ok(favientSig({ ...base, stops: base.stops.map((s, i) => (i === 0 ? { ...s, interpolation: 'step' as const } : s)) }) !== favientSig(base), '[6] favientSig distinguishes interpolation (one stop)');
  ok(favientSig({ ...base, colorSpace: 'linear' }) === favientSig(base), '[6] favientSig ignores colour space');
  const noDefaults = { ...CORPUS[0].config, blendSpace: undefined as any, stops: CORPUS[0].config.stops.map(({ bias: _b, interpolation: _i, ...s }) => s) };
  ok(favientSig(noDefaults) === favientSig(CORPUS[0].config), '[6] absent bias / interpolation / blend sign as 0.5 / linear / oklab, as they render');
}

// ═══ [7] the store ══════════════════════════════════════════════════════════
console.log('[7] exportCollection, merge placement, ids');
{
  const st = () => useFavientsStore.getState();
  mem.clear();
  useFavientsStore.setState({ favients: [], groupLabels: {}, lastGroupId: DEFAULT_GROUP });
  st().collectRecent(CORPUS[0].config, 'R old', 'Browse');
  const g = newGroupId();
  st().insertMany([{ config: CORPUS[3].config, name: 'G1' }], g, 'Garden');
  st().insertMany([{ config: CORPUS[5].config, name: 'K1' }], DEFAULT_GROUP);
  const exported = JSON.parse(st().exportCollection());
  ok(exported.format === 'gmt-gradients' && exported.version === 1 && exported.gradients.length === 3 && exported.groups[g] === 'Garden', '[7] exportCollection writes the gmt-gradients document');

  // a file whose Recent, Garden and a new set's entries must not land at the end
  const file = doc.encodeGradientDocument([
    { name: 'R file', config: CORPUS[1].config, group: RECENT_GROUP },
    { name: 'G2', config: CORPUS[2].config, group: g },
    { name: 'H1', config: CORPUS[4].config, group: 'g-new' },
    { name: 'R file 2', config: { ...CORPUS[1].config, blendSpace: 'rgb' }, group: RECENT_GROUP },
  ], { [g]: 'Garden (theirs)', 'g-new': 'New', [RECENT_GROUP]: RECENT_LABEL });
  const n = st().importCollection(J(file), 'merge');
  const groups = st().favients.map((f) => f.group ?? DEFAULT_GROUP);
  const runs = (id: string) => { const idx = groups.map((x, i) => (x === id ? i : -1)).filter((i) => i >= 0); return idx.length > 0 && idx[idx.length - 1] - idx[0] === idx.length - 1; };
  ok(n === 4, `[7] merge added all four (${n})`);
  const recentIdx = groups.map((x, i) => (x === RECENT_GROUP ? i : -1)).filter((i) => i >= 0);
  ok(recentIdx.length === 3 && recentIdx.every((v, k) => v === k), `[7] merge keeps Recent one block at the top (${groups.map((x) => (x === RECENT_GROUP ? 'R' : x === g ? 'G' : x === '' ? 'K' : 'N')).join('')})`);
  ok(runs(g) && runs('g-new') && runs(DEFAULT_GROUP), '[7] merge keeps each group one run');
  ok(st().favients.slice(0, 3).map((f) => f.name).join() === 'R old,R file,R file 2', '[7] the file\'s Recent entries join the end of the existing run, in file order');
  ok(st().groupLabels[g] === 'Garden' && st().groupLabels['g-new'] === 'New' && st().groupLabels[RECENT_GROUP] === RECENT_LABEL, '[7] existing labels win, new ones fill in, Recent keeps its label');

  // ids on the way in
  const legacy = { version: 1, favients: [
    { id: 'f1', name: 'no ids', config: { stops: [{ position: 0, color: '#102030' }, { position: 1, color: '#405060' }], colorSpace: 'srgb', blendSpace: 'oklab' }, createdAt: 1 },
    { id: 'f2', name: 'dup ids', config: { stops: [{ id: 's', position: 0, color: '#aa0000' }, { id: 's', position: 0.5, color: '#00aa00' }, { id: 's', position: 1, color: '#0000aa' }], colorSpace: 'srgb', blendSpace: 'oklab' }, createdAt: 1 },
  ], groupLabels: {} };
  const m = st().importCollection(J(legacy), 'merge');
  const idsOk = ['no ids', 'dup ids'].every((nm) => {
    const f = st().favients.find((x) => x.name === nm);
    const ids = f?.config.stops.map((s) => s.id) ?? [];
    return ids.length > 0 && ids.every((id) => typeof id === 'string' && id.length > 0) && new Set(ids).size === ids.length;
  });
  ok(m === 2 && idsOk, '[7] importCollection ensures every stop has a unique id (a legacy collection, still importable)');
  ok(st().importCollection(J({ stops: CORPUS[0].config.stops, colorSpace: 'srgb', blendSpace: 'oklab' }), 'replace') === null && st().favients.length > 0, '[7] importCollection refuses a bare gradient, so Replace cannot wipe the shelf with it');
  const before = st().favients.length;
  const r = st().importCollection(J(doc.encodeGradientDocument(ENTRIES, GROUPS)), 'replace');
  ok(r === 6 && st().favients.length === 6 && st().favients.every((f, i) => f.name === ENTRIES[i].name), `[7] replace from the document sets exactly its six, in order (${before} → ${st().favients.length})`);
}

// [8] A bare config the gate would THIN is not reproduced as "exact" minus a stop. Found by the
// round-trip guard's probe (2026-09-14): `{stops}` with an `rgb()` stop imported through the router
// as a two-stop gradient, silently losing the green, while importFormats' own reader sends the
// same file to the colour reader. Falsified 2026-09-14 by making `everyStopKept` return the gated
// config unconditionally: red (2 stops, no green).
console.log('\n[8] a thinned bare config falls to the colour reader');
{
  const thin = JSON.stringify({ stops: [{ position: 0, color: '#ff0000' }, { position: 0.3, color: 'rgb(0,255,0)' }, { position: 1, color: '#0000ff' }], colorSpace: 'srgb', blendSpace: 'oklab' });
  const res = router.parseGradientImports([{ name: 'thin.json', text: thin, bytes: new TextEncoder().encode(thin) }] as never);
  const cfg = res.items[0]?.config;
  const ramp = cfg ? gradientDisplayRamp(cfg) : [];
  const greenish = ramp.some((c) => c.g > 200 && c.r < 60 && c.b < 60);
  ok(res.items.length === 1 && !!cfg && cfg.stops.length !== 2 && greenish, `[8] the rgb() stop's green survives as colour (${cfg?.stops.length ?? 0} stops, green ${greenish})`);
}

// ═══ [9] a file offered to a SCENE loader ═══════════════════════════════════
// app-gmt's scene drop and File ▸ Load Scene offer every file to the registered claims first
// (`engine/plugins/SceneFileClaims.ts`); the palette's claim takes what `takeFromSceneLoader` says.
// Every "stays" case below is one the ROUTER alone would import — checked first, so a case cannot
// pass merely because the fixture is not a gradient at all.
console.log('\n[9] the scene loader\'s entrance: gradient files are taken, a scene never is');
{
  const take = router.takeFromSceneLoader;
  const enc = new TextEncoder();
  const bin = (name: string, bytes: Uint8Array) => ({ name, text: '', bytes });
  const txt = (name: string, text: string) => ({ name, text, bytes: enc.encode(text) });
  const routerImports = (r: { name: string; text: string; bytes?: Uint8Array }) => router.parseGradientImports([r]).items.length > 0;

  const gmtPng = png.writeGradientPng([ENTRIES[1]]);
  const stripped = codec.stripPngText(gmtPng)!;
  const docJson = J(doc.encodeGradientDocument([ENTRIES[1]]));
  const scenePng = codec.encodePng(64, 36, new Uint8Array(64 * 36 * 3).fill(40), { text: [{ keyword: 'SceneData', text: '{"formula":"Mandelbulb"}' }] });
  const legacyScenePng = codec.encodePng(8, 8, new Uint8Array(8 * 8 * 3), { text: [{ keyword: 'FractalData', text: '{}' }] });
  // Hand-made (no writer does this): a scene key AND gradient metadata AND the band pixels.
  const decoded = codec.decodePng(gmtPng)!;
  const both = codec.encodePng(decoded.width, decoded.height, decoded.pixels, { text: [
    { keyword: 'SceneData', text: '{"formula":"Mandelbulb"}' },
    { keyword: png.GRADIENT_PNG_KEYWORD, text: codec.readPngText(gmtPng, png.GRADIENT_PNG_KEYWORD)!, compress: true },
  ] });
  const noise = new Uint8Array(32 * 32 * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 7919) % 251;
  const photo = codec.encodePng(32, 32, noise);
  const editorCopy = J({ stops: CORPUS[1].config.stops.map(({ id: _i, ...s }) => s), colorSpace: 'srgb', blendSpace: 'hsv' });
  const colourList = J({ name: 'Sea Glass', colors: ['#0B3D4F', '#2A9D8F', '#E9C46A'] });
  const sceneJson = J({ formula: 'Mandelbulb', name: 'My scene', colors: ['#102030', '#405060'], features: { coloring: { gradient: { stops: CORPUS[0].config.stops } } } });
  const sessionJson = encodeSession('gmt-gx-session', 1, { documents: { working: {} } });
  const MAP = '0 0 0\n255 0 0\n0 255 0\n255 255 255\n';

  ok(take(bin('Sea Glass.png', gmtPng)), '[9] a GX gradient PNG (its gmt-gradients metadata) is taken');
  ok(take(bin('Sea Glass copy.png', stripped)), '[9] its metadata-stripped copy (the band layout) is taken');
  ok(!take(bin('scene.png', scenePng)), '[9] a GMT scene PNG is never taken');
  ok(!take(bin('old.png', legacyScenePng)), '[9] a gmt-0.8.5 FractalData scene PNG is never taken');
  ok(routerImports(bin('both.png', both)) && !take(bin('both.png', both)), '[9] a PNG carrying a scene key stays the scene loader\'s, even beside gradient metadata the router would import');
  ok(!take(bin('photo.png', photo)), '[9] a foreign PNG is not taken (the scene loader keeps its message)');

  ok(take(txt('Sea Glass.gmt-gradients.json', docJson)), '[9] a GMT gradients document JSON is taken');
  ok(take(txt('collection.json', J({ version: 1, favients: ENTRIES.map((e, i) => ({ id: `f${i}`, ...e })), groupLabels: GROUPS }))), '[9] the legacy collection JSON is taken');
  ok(take(txt('bom.gmt-gradients.json', '\uFEFF' + docJson)), '[9] a document behind a BOM is taken');
  ok(routerImports(txt('copy.json', editorCopy)) && !take(txt('copy.json', editorCopy)), '[9] a bare {stops} JSON the router would import stays the scene loader\'s');
  ok(routerImports(txt('export.json', colourList)) && !take(txt('export.json', colourList)), '[9] a {name, colors} JSON the router would import stays the scene loader\'s');
  ok(routerImports(txt('scene.json', sceneJson)) && !take(txt('scene.json', sceneJson)), '[9] a scene JSON the router would read colours from stays the scene loader\'s');
  ok(routerImports(txt('bom-copy.json', '\uFEFF' + editorCopy)) && !take(txt('bom-copy.json', '\uFEFF' + editorCopy)), '[9] a bare {stops} JSON behind a BOM stays the scene loader\'s');
  ok(!take(txt('w.gxsession.json', sessionJson)), '[9] a session JSON is not taken');
  ok(routerImports(txt('scene.gmf', docJson)) && !take(txt('scene.gmf', docJson)), '[9] a .gmf is never looked at, whatever it holds');
  ok(routerImports(txt('noextension', docJson)) && !take(txt('noextension', docJson)), '[9] a file with no extension is never looked at');

  ok(take(bin('set.zip', zipSync({ 'a.map': strToU8(MAP), 'b.png': gmtPng }))), '[9] a .zip of gradient files is taken');
  ok(!take(bin('junk.zip', zipSync({ 'readme.txt': strToU8('hello') }))), '[9] a .zip with no gradient in it is not taken');
  ok(take(txt('Sea_Glass.map', MAP)), '[9] a .map is taken');
  ok(!take(txt('style.css', 'body { color: red; }')), '[9] a .css with no gradient in it is not taken');
  let threw = false;
  try {
    for (const b of [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0]), new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]), new Uint8Array(0)]) take(bin('h.png', b));
    take(null);
  } catch { threw = true; }
  ok(!threw && !take(null), '[9] a truncated PNG, a broken zip, an empty file and null never throw, and are not taken');
}

console.log(failures === 0 ? '\nPASS test-gradient-file' : `\nFAIL test-gradient-file (${failures})`);
process.exit(failures === 0 ? 0 : 1);
