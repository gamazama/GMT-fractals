/**
 * Guard: the export suite's TWO SUBJECTS (§8b item 5, 2026-09-09).
 *
 * A gradient has two faces and the export registry now knows both: `build` takes the
 * 256-step RAMP, `swatches` takes the palette composed on the hero. This harness pins the
 * seam between them, the four swatch-native formats added with it, and the one thing that
 * would break the OLD shell if it slipped.
 *
 *   [1] every registry format still builds from a 256-step ramp, and the ramp forms are
 *       unchanged — `palette/components/GeneratorExtrasPanel.tsx` and `ImageExtrasPanel.tsx`
 *       iterate EXPORT_FORMATS and call `.build` unconditionally, so a swatches-only entry
 *       would throw in the shell GMT still reaches
 *   [2] `formatsFor('swatches')` is exactly the entries carrying a swatches builder, is a
 *       strict subset of the ramp list, and every one of them actually reads the colour
 *       list it is handed (not the ramp behind it)
 *   [3] .ase round-trips: a reader written against the published block layout recovers the
 *       exact colours and names out of the bytes the writer produced
 *   [4] .ase groups: a set of palettes becomes one file with a named folder per gradient,
 *       balanced group-start / group-end blocks, and the colours land in the right folder
 *   [5] the scale formats name eleven colours 50…950 and any other count 1…N, and a name
 *       full of punctuation becomes a usable identifier
 *   [6] .gpl's two forms differ in the way that matters: 256 entries from a ramp, exactly N
 *       from a palette, and the palette form carries the gradient's name
 *   [7] the set-level swatch builders refuse a format with no swatch form rather than
 *       quietly exporting a ramp into a file the user asked colours from, and .ase carries
 *       the same lossy notice .ai does (they reduce at the same budget)
 *
 *   [8] the stop budget: per-format defaults, a nonsense override falling back, the
 *       reduction actually MOVING in the bytes a writer produces, and the lossy warning
 *       moving with it (including .ugr, which reduced at 64 and warned about nothing)
 *   [9] (2026-09-14, ADR-0122) a RAMP gradient (`stops: []` + `ramp`) on the Linear profile
 *       exports its texels byte-for-byte through `favientsExport`'s set exporter.
 *       FALSIFIED 2026-09-14, each reverted: `rampOf` back to
 *       `renderStopsToRamp(f.config.stops, …)` → [9] red (the greyscale fallback, first line
 *       "0 0 0"); `rampOf` as `renderGradientToRamp(f.config)` (the config's own Linear
 *       colorSpace) → [9] red (the texels linearised).
 *   [10] (2026-09-14, ADR-0123 item 2) every builder with a name field writes the name it is
 *       given — .gpl / .ggr `Name:`, .cpt `# Name:`, the .css and CSS-variables leading comment,
 *       .grd walked by its declared lengths (UTF-8, cut at 255 bytes on a character boundary),
 *       and every other named path carrying it — and an unnamed build keeps its old header.
 *   [11] (same day) no two formats download under one filename (`exportFileName`), checked
 *       through the real `runExport` / `runSetExport` with their download caught at
 *       `createElement('a')`; a plain format's filename (`Sea_Glass.json`) is unchanged.
 *   [7]/[8] also changed that day: CSS joined STOP_BUDGETS, so the "does not reduce, does not
 *       warn" example moved from css to json and CSS now has to warn and honour the budget.
 *   FALSIFIED 2026-09-14, one mutation at a time, each restored, every one exit 1: CSS ignoring
 *     the budget → 1 red · css missing from STOP_BUDGETS → 2 · .gpl ramp build writing
 *     `gradient` → 2 · .ggr → 2 · .cpt → 2 · .grd name not written → 3 · .grd size computed for
 *     an 8-byte name → 3 (a RangeError, reported by name) · the unnamed header default changed →
 *     3 · cssvars without `fileSuffix` → 3 · `runExport` building its filename by hand → 4 ·
 *     `runSetExport`'s zip without the suffix → 4. The first cut of the budget check asserted a
 *     noisy ramp writes exactly 33 CSS stops; the reducer reaches its tolerance at 22, so it now
 *     compares no-override against 33 and 8 against the default.
 *
 * Run: `npm run test:palette-exportsubjects` (also a link of `test:palette`).
 *
 * ── FALSIFIED 2026-09-09 ─────────────────────────────────────────────────
 *   • `formatsFor` returning EXPORT_FORMATS for both subjects → [2] red ("css has no
 *     swatches builder but is offered under the swatches subject").
 *   • `aseNameUnits` dropping its trailing null (the length then excludes the terminator,
 *     which is how nearly every hand-rolled .ase writer gets it wrong) → [3] red: the
 *     reader walks into the next block and the second colour comes back wrong.
 *   • `buildAseBlocks` writing the block length as the WHOLE block rather than the payload
 *     → [3] red on the same walk.
 *   • `stepNames` returning 1…N unconditionally → [5] red ("eleven colours are not a
 *     50…950 scale").
 *   • `buildSwatchZip` falling back to `fmt.build` when there is no swatches builder → [7]
 *     red ("a ramp export came back for a format with no swatch form").
 *   • `.gpl`'s swatches builder delegating to its ramp builder → [6] red (256 entries).
 *   • dropping `.ase` from `collectionQualityWarnings` → [7] red ("a ramp that .ai calls
 *     lossy is exported silently as .ase").
 *
 *   [7]'s FIRST CUT DID NOT REPORT that last break: the fallback dies indexing a
 *   three-colour "ramp" at 255, so the run exploded with a stack trace at whatever line
 *   came next instead of naming the defect. `refuses()` exists for that — a refusal has
 *   to be a returned null, and a throw is a different failure that must say so.
 */

import {
  EXPORT_FORMATS,
  formatsFor,
  getExportFormat,
  buildAse,
  buildAseGroups,
  stopBudgetOf,
  grdStopCount,
  aiStopCount,
  buildAiSwatchLibrary,
  exportFileName,
  type ExportFormatDef,
} from '../palette/core/exportFormats';
import { buildSwatchZip, buildSwatchCollectionFile, collectionQualityWarnings, buildCollectionZip, type NamedSwatches } from '../palette/core/favientsExport';
import { encodeRampBuffer } from '../utils/gradientRamp';
import { unzipSync, strFromU8 } from 'fflate';
import type { RGB } from '../palette/core/oklab';
import { renderStopsToRamp } from '../palette/core/gmtGradient';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
};
const section = (n: string) => console.log(`\n── ${n}`);

// A ramp with real structure, so a reduction that collapses it would show.
const RAMP: RGB[] = Array.from({ length: 256 }, (_, i) => ({
  r: Math.round(127 + 127 * Math.sin((i / 255) * Math.PI * 2)),
  g: Math.round((i / 255) * 255),
  b: Math.round(255 - (i / 255) * 255),
}));

const PALETTE: RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 },
  { r: 255, g: 255, b: 0 },
  { r: 18, g: 52, b: 86 },
  { r: 255, g: 255, b: 255 },
];

const text = (v: string | Uint8Array): string => (typeof v === 'string' ? v : '<binary>');

/** Stops that swing hard enough that a 40-node reduction visibly loses them — the input the
 *  lossy notice exists for. Sixteen alternating black/white stops. */
const NOISY_STOPS = Array.from({ length: 60 }, (_, i) => ({
  id: `s${i}`,
  position: i / 59,
  color: i % 2 ? '#ffffff' : '#000000',
  interpolation: 'linear',
}));

/** The same swings as a 256-step ramp — what a writer is actually handed. */
const NOISY_RAMP: RGB[] = renderStopsToRamp(NOISY_STOPS as never, 'rgb', 'srgb');

// ── [1] every format still builds from a ramp ────────────────────────────
section('[1] every registry format still builds from a 256-step ramp');
for (const f of EXPORT_FORMATS) {
  let out: string | Uint8Array | null = null;
  try {
    out = f.build(RAMP, 'Test Gradient');
  } catch (e) {
    ok(false, `${f.key}: build threw — ${(e as Error).message}`);
  }
  ok(!!out && (typeof out === 'string' ? out.length > 0 : out.length > 0), `${f.key}: build produced nothing from a ramp`);
}
// The formats the old shell offered before the swatches work still exist and still carry a
// build — a rename would silently drop one from GMT's Extras panel.
for (const key of ['map', 'hex', 'css', 'svg', 'json', 'js', 'py', 'csv', 'gpl', 'ggr', 'cpt', 'pdn', 'grd', 'ai', 'idml', 'ugr']) {
  ok(!!getExportFormat(key)?.build, `${key}: the pre-existing format lost its ramp builder`);
}

// ── [2] the swatches subject is the registry filtered by its own shape ───
section('[2] formatsFor(swatches) is exactly the entries with a swatches builder');
const sw = formatsFor('swatches');
const ramps = formatsFor('ramp');
ok(ramps.length === EXPORT_FORMATS.length, 'the ramp subject is not the whole registry');
ok(sw.length > 0 && sw.length < ramps.length, `the swatches subject should be a strict subset (${sw.length} of ${ramps.length})`);
for (const f of sw) ok(!!f.swatches, `${f.key} is offered under the swatches subject but has no swatches builder`);
for (const f of EXPORT_FORMATS) {
  if (!f.swatches) ok(!sw.includes(f), `${f.key} has no swatches builder but is offered under the swatches subject`);
}
// Formats that are ABOUT a ramp must stay out of it, or the window offers a CSS
// linear-gradient of seven colours and calls it a palette.
for (const key of ['css', 'svg', 'ggr', 'cpt', 'map', 'ugr', 'grd', 'ai', 'idml']) {
  ok(!getExportFormat(key)!.swatches, `${key} is a ramp format and should not serve the swatches subject`);
}
// Every swatches builder must READ the list it is handed. A builder that ignored its
// argument would pass every other check in this file.
for (const f of sw) {
  const a = text(f.swatches!(PALETTE, 'Test'));
  const b = text(f.swatches!(PALETTE.slice(0, 3), 'Test'));
  const aBin = f.swatches!(PALETTE, 'Test');
  const bBin = f.swatches!(PALETTE.slice(0, 3), 'Test');
  const differ = typeof aBin === 'string' ? a !== b : (aBin as Uint8Array).length !== (bBin as Uint8Array).length;
  ok(differ, `${f.key}: three swatches and seven produced the same output — the builder ignores its colours`);
}

// ── [3] .ase round-trips ─────────────────────────────────────────────────
section('[3] .ase round-trips through a reader written against the block layout');

interface AseEntry {
  kind: 'color' | 'group-start' | 'group-end';
  name: string;
  color?: { r: number; g: number; b: number };
}

/** Read an .ase back. Deliberately independent of the writer: it walks by the DECLARED
 *  lengths, so an off-by-one in a name length or a block length desynchronises it. */
const readAse = (bytes: Uint8Array): AseEntry[] => {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0;
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (sig !== 'ASEF') throw new Error(`bad signature ${JSON.stringify(sig)}`);
  p = 4;
  const major = dv.getUint16(p, false);
  p += 2;
  const minor = dv.getUint16(p, false);
  p += 2;
  if (major !== 1 || minor !== 0) throw new Error(`bad version ${major}.${minor}`);
  const count = dv.getUint32(p, false);
  p += 4;
  const out: AseEntry[] = [];
  for (let b = 0; b < count; b++) {
    const type = dv.getUint16(p, false);
    p += 2;
    const len = dv.getUint32(p, false);
    p += 4;
    const end = p + len;
    if (type === 0xc002) {
      out.push({ kind: 'group-end', name: '' });
      p = end;
      continue;
    }
    const units = dv.getUint16(p, false);
    p += 2;
    let name = '';
    for (let i = 0; i < units - 1; i++) {
      name += String.fromCharCode(dv.getUint16(p, false));
      p += 2;
    }
    if (dv.getUint16(p, false) !== 0) throw new Error(`block ${b}: name is not null-terminated`);
    p += 2;
    if (type === 0xc001) {
      out.push({ kind: 'group-start', name });
    } else {
      const model = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
      p += 4;
      if (model !== 'RGB ') throw new Error(`block ${b}: colour model ${JSON.stringify(model)}`);
      const r = Math.round(dv.getFloat32(p, false) * 255);
      p += 4;
      const g = Math.round(dv.getFloat32(p, false) * 255);
      p += 4;
      const bl = Math.round(dv.getFloat32(p, false) * 255);
      p += 4;
      p += 2; // colour type
      out.push({ kind: 'color', name, color: { r, g, b: bl } });
    }
    if (p !== end) throw new Error(`block ${b}: walked to ${p}, declared end ${end}`);
  }
  if (p !== bytes.length) throw new Error(`walked to ${p} of ${bytes.length} bytes`);
  return out;
};

try {
  const entries = readAse(buildAse(PALETTE, 'Ember'));
  ok(entries.length === PALETTE.length, `expected ${PALETTE.length} colour blocks, read ${entries.length}`);
  ok(
    entries.every((e) => e.kind === 'color'),
    'a flat .ase should hold colour blocks only',
  );
  const wrong = entries.findIndex((e, i) => e.color!.r !== PALETTE[i].r || e.color!.g !== PALETTE[i].g || e.color!.b !== PALETTE[i].b);
  ok(wrong === -1, `colour ${wrong} did not survive the round trip: ${JSON.stringify(entries[wrong]?.color)} vs ${JSON.stringify(PALETTE[wrong])}`);
  ok(
    entries.every((e) => e.name.startsWith('Ember ')),
    `entries should carry the gradient's name — got ${JSON.stringify(entries[0]?.name)}`,
  );
  // A name outside the BMP contributes TWO UTF-16 units. The reader walks by the declared
  // length, so a writer that counted code points instead would desynchronise here and
  // nowhere else.
  const emoji = readAse(buildAse([PALETTE[1], PALETTE[2]], '🔥 Fire'));
  ok(emoji.length === 2 && emoji[0].name.startsWith('🔥 Fire'), 'a non-BMP name broke the block walk');
} catch (e) {
  ok(false, `.ase did not round-trip: ${(e as Error).message}`);
}

// ── [4] .ase groups ──────────────────────────────────────────────────────
section('[4] a set of palettes becomes one .ase with a folder per gradient');
const SETS: NamedSwatches[] = [
  { name: 'Ember', colors: PALETTE.slice(0, 3) },
  { name: 'Frost', colors: PALETTE.slice(3, 7) },
];
try {
  const entries = readAse(buildAseGroups(SETS));
  const starts = entries.filter((e) => e.kind === 'group-start');
  const ends = entries.filter((e) => e.kind === 'group-end');
  ok(starts.length === 2 && ends.length === 2, `expected two balanced groups, got ${starts.length}/${ends.length}`);
  ok(
    starts.map((s) => s.name).join('|') === 'Ember|Frost',
    `groups should be named after the gradients — got ${starts.map((s) => s.name).join('|')}`,
  );
  const colors = entries.filter((e) => e.kind === 'color');
  ok(colors.length === 7, `expected 3 + 4 colours, got ${colors.length}`);
  // The colours must be INSIDE the right folder, not merely present: walk the sequence.
  let group = '';
  const homes: string[] = [];
  for (const e of entries) {
    if (e.kind === 'group-start') group = e.name;
    else if (e.kind === 'group-end') group = '';
    else homes.push(group);
  }
  ok(homes.slice(0, 3).every((h) => h === 'Ember') && homes.slice(3).every((h) => h === 'Frost'), `colours landed in ${homes.join(',')}`);
  // Same-named sets must stay distinct or Illustrator merges the folders.
  const dupes = readAse(buildAseGroups([SETS[0], { ...SETS[0] }]));
  const names = dupes.filter((e) => e.kind === 'group-start').map((e) => e.name);
  ok(names[0] !== names[1], `two same-named palettes produced the same folder name (${names.join(', ')})`);
} catch (e) {
  ok(false, `.ase groups did not round-trip: ${(e as Error).message}`);
}

// ── [5] scale naming and identifiers ─────────────────────────────────────
section('[5] eleven colours are a 50…950 scale; anything else is 1…N');
const eleven: RGB[] = Array.from({ length: 11 }, (_, i) => ({ r: i * 20, g: 0, b: 0 }));
const tw = getExportFormat('tw')!;
const tokens = getExportFormat('tokens')!;
const cssvars = getExportFormat('cssvars')!;
const twEleven = text(tw.swatches!(eleven, 'Ember'));
ok(twEleven.includes('"50"') && twEleven.includes('"950"'), 'eleven colours are not a 50…950 scale');
ok(!twEleven.includes('"11"'), 'eleven colours were named 1…11 instead of the scale keys');
const twSeven = text(tw.swatches!(PALETTE, 'Ember'));
ok(twSeven.includes('"1"') && twSeven.includes('"7"'), 'seven colours should be named 1…7');
ok(!twSeven.includes('"950"'), 'seven colours were dressed up as a 50…950 scale');
ok(twSeven.includes('"ember"'), `the Tailwind key should be the gradient's identifier — ${twSeven.slice(0, 60)}`);
const nasty = text(cssvars.swatches!(PALETTE.slice(0, 2), '  Sunset / Dusk!! '));
ok(nasty.includes('--sunset-dusk-1:'), `a punctuated name did not become an identifier — ${nasty.split('\n')[1]}`);
const tokenJson = JSON.parse(text(tokens.swatches!(eleven, 'Ember'))) as Record<string, Record<string, { $value: string; $type: string }>>;
ok(!!tokenJson.ember?.['500'], 'the token file has no ember.500');
ok(tokenJson.ember['500'].$type === 'color', 'tokens must declare $type: color');
ok(/^#[0-9a-f]{6}$/.test(tokenJson.ember['500'].$value), `token value is not a hex colour: ${tokenJson.ember['500'].$value}`);

// ── [6] .gpl's two forms ─────────────────────────────────────────────────
section('[6] .gpl: 256 entries from a ramp, exactly N from a palette');
const gpl = getExportFormat('gpl')!;
const gplRamp = text(gpl.build(RAMP, 'Ember'));
const gplSw = text(gpl.swatches!(PALETTE, 'Ember'));
const entriesOf = (s: string) => s.split('\n').filter((l) => /^\s*\d+\s+\d+\s+\d+/.test(l)).length;
ok(entriesOf(gplRamp) === 256, `the ramp form should still be 256 entries (${entriesOf(gplRamp)}) — the import round-trip depends on it`);
ok(entriesOf(gplSw) === PALETTE.length, `the palette form should be ${PALETTE.length} entries, got ${entriesOf(gplSw)}`);
ok(gplSw.includes('Name: Ember'), 'the palette form does not carry the gradient name');

// ── [7] the set-level swatch builders refuse a ramp-only format ──────────
section('[7] a format with no swatch form is refused, not silently ramp-exported');
/** The refusal must be a RETURNED null, not a crash. A builder that fell through to the
 *  ramp form dies indexing a 3-colour "ramp" at 255, and a harness that only checked for a
 *  non-null would report that break as a stack trace at whatever line came next rather than
 *  as the thing that is actually wrong. */
const refuses = (fn: () => unknown, msg: string) => {
  let v: unknown;
  try {
    v = fn();
  } catch (e) {
    ok(false, `${msg} (it threw instead: ${(e as Error).message})`);
    return;
  }
  ok(v === null, msg);
};
refuses(() => buildSwatchZip(SETS, 'css'), 'a ramp export came back for a format with no swatch form');
refuses(() => buildSwatchZip(SETS, 'no-such-format'), 'an unknown format key produced a zip');
const zip = buildSwatchZip(SETS, 'gpl');
ok(!!zip && zip.length > 0, '.gpl swatches should zip for a set');
ok(buildSwatchCollectionFile(SETS, 'gpl') === null, '.gpl does not group swatch lists and must not claim to');
const one = buildSwatchCollectionFile(SETS, 'ase');
ok(!!one && one.ext === 'ase', '.ase should bundle a set of palettes into one file');
// .ase reduces a RAMP at the same 40-stop budget .ai does (ASE_MAX is defined as AI_MAX for
// this reason), so it must carry the same "exports simplified" notice. A format that reduces
// silently is the one thing the notice exists to prevent.
const fussy = [{ name: 'Noisy', config: { stops: NOISY_STOPS, blendSpace: 'rgb', colorSpace: 'srgb' } }] as unknown as Parameters<typeof collectionQualityWarnings>[0];
ok(collectionQualityWarnings(fussy, 'ase').length === collectionQualityWarnings(fussy, 'ai').length,
  '.ase and .ai reduce at the same budget but do not warn alike');
ok(collectionQualityWarnings(fussy, 'ase').length > 0, 'a ramp that .ai calls lossy is exported silently as .ase');
// Was 'css' until 2026-09-14. CSS has reduced (to 33 adaptive stops) since 2026-09-13 and joined
// STOP_BUDGETS on 09-14, so a noisy gradient IS lossy as CSS and must say so; the non-reducing
// example is now .json, which writes all 256 texels.
ok(collectionQualityWarnings(fussy, 'json').length === 0, 'a format that does not reduce should not warn');
ok(collectionQualityWarnings(fussy, 'css').length > 0, 'CSS reduces to 33 stops but did not warn about a gradient it flattens');

// ── [8] THE STOP BUDGET (owner, 2026-09-10; the export window's Settings category) ──────
// Every reducing format used to decide its budget privately. `stopBudgetOf` is the table
// and the override, and the point of an override is that the FILES CHANGE — a budget that
// only moved a number in the UI would be a lie this has to catch.
ok(stopBudgetOf('ugr') === 64 && stopBudgetOf('ai') === 40 && stopBudgetOf('svg') === 32,
  'the per-format defaults are not what the writers used before the override existed');
ok(stopBudgetOf('map') === null && stopBudgetOf('pdn') === null,
  'a format that does not reduce must report no budget, or it would be offered a meaningless setting');
ok(stopBudgetOf('ai', 12) === 12, 'the override is not honoured');
ok(stopBudgetOf('ai', 0) === 40 && stopBudgetOf('ai', 1) === 40,
  'a nonsense override (0, 1) must fall back to the format default rather than write a one-stop file');
// The reduction must MOVE, counted through the writers rather than the reducer, so this
// covers the whole thread from the setting to the bytes.
ok(grdStopCount(NOISY_RAMP) > grdStopCount(NOISY_RAMP, 8),
  'a tighter budget did not reduce the .grd stop count — the override is not reaching the writer');
ok(aiStopCount(NOISY_RAMP, 8) <= 8, '.ai wrote more stops than the budget allowed');
ok(buildAiSwatchLibrary([{ name: 'W', ramp: NOISY_RAMP }], 64).length >
   buildAiSwatchLibrary([{ name: 'W', ramp: NOISY_RAMP }], 8).length,
  'a 64-stop .ai is not larger than an 8-stop one — the budget is not reaching the file');
// And the WARNING moves with it: the whole reason the budget is exposed is that 40 was not
// always right, so a generous budget must stop warning, and .ugr must start.
ok(collectionQualityWarnings(fussy, 'ai', undefined, 200).length === 0,
  'a budget wide enough to keep the detail still reports the gradient as lossy');
ok(collectionQualityWarnings(fussy, 'ugr').length > 0,
  '.ugr reduces at 64 and lost detail but reported nothing — this is the assumption the budget closed');
ok(collectionQualityWarnings(fussy, 'map', undefined, 8).length === 0,
  'a format that does not reduce warned because an override was passed to it');
// CSS (2026-09-14): it ignored the budget — the override moved every reducing format but this one.
{
  const css = getExportFormat('css')!;
  const stopsIn = (s: string | Uint8Array) => (text(s).match(/%/g) ?? []).length;
  ok(stopBudgetOf('css') === 33, `CSS's default budget is not the 33 it has always written (${stopBudgetOf('css')})`);
  ok(text(css.build(NOISY_RAMP, 'W')) === text(css.build(NOISY_RAMP, 'W', 33)), 'CSS with no override is not CSS at its 33-stop default');
  ok(stopsIn(css.build(NOISY_RAMP, 'W', 8)) <= 8 && stopsIn(css.build(NOISY_RAMP, 'W', 8)) < stopsIn(css.build(NOISY_RAMP, 'W')), `CSS at a budget of 8 wrote ${stopsIn(css.build(NOISY_RAMP, 'W', 8))} stops — the override is not reaching the writer`);
}

// ── [9] a RAMP gradient exports its texels (ADR-0122, 2026-09-14) ─────────────────────
// A ramp gradient has no stops; the set exporters read it through `gradientDisplayRamp`.
// On the LINEAR profile on purpose: the catalogue seam forces Linear on every pick, and the
// exporter used to render through the config's own colorSpace — which, for a ramp, would
// write its linearised texels instead of the colours it shows.
section('[9] a ramp gradient exports its texels');
{
  const texels = Uint8Array.from({ length: 768 }, (_, i) => (i * 37 + (i % 3) * 91) & 255);
  const fav = { id: 'r', name: 'Ramp', createdAt: 0, config: { stops: [], ramp: encodeRampBuffer(texels, 3), colorSpace: 'linear', blendSpace: 'oklab' } } as unknown as Parameters<typeof buildCollectionZip>[0][number];
  const files = unzipSync(buildCollectionZip([fav], 'map'));
  const map = strFromU8(Object.values(files)[0] ?? new Uint8Array()).split('\n').map((l) => l.trim().split(/\s+/).map(Number));
  const exact = map.length === 256 && map.every((c, i) => c[0] === texels[i * 3] && c[1] === texels[i * 3 + 1] && c[2] === texels[i * 3 + 2]);
  ok(exact, `a ramp gradient's collection export is its texels (the .map's first line reads ${map[0]?.join(' ')}, texel 0 is ${texels[0]} ${texels[1]} ${texels[2]})`);
}

// ── [10] the builders write the NAME (ADR-0123 item 2, 2026-09-14) ─────────────────────
section('[10] every builder with a name field writes the name it is given');
{
  const NAME = 'Sea Glass é';
  const fmt = (k: string) => getExportFormat(k)!;
  ok(text(fmt('gpl').build(RAMP, NAME)).split('\n')[1] === `Name: ${NAME}`, `.gpl's Name line is not the name: ${text(fmt('gpl').build(RAMP, NAME)).split('\n')[1]}`);
  ok(text(fmt('ggr').build(RAMP, NAME)).split('\n')[1] === `Name: ${NAME}`, `.ggr's Name line is not the name: ${text(fmt('ggr').build(RAMP, NAME)).split('\n')[1]}`);
  ok(text(fmt('cpt').build(RAMP, NAME)).split('\n')[1] === `# Name: ${NAME}`, `.cpt's name comment is not the name: ${text(fmt('cpt').build(RAMP, NAME)).split('\n')[1]}`);
  ok(text(fmt('css').build(RAMP, NAME)).startsWith(`/* ${NAME} */\n`), '.css does not open with the name comment');
  ok(text(fmt('cssvars').build(RAMP, NAME)).startsWith(`/* ${NAME} */\n`), 'CSS variables do not open with the name comment');
  // Unnamed (the old shell's Extras panels call build(ramp)): byte-for-byte what they always wrote.
  ok(text(fmt('gpl').build(RAMP)).startsWith('GIMP Palette\nName: gradient\n'), 'an unnamed .gpl changed its header');
  ok(text(fmt('ggr').build(RAMP)).startsWith('GIMP Gradient\nName: gradient\n'), 'an unnamed .ggr changed its header');
  ok(text(fmt('cpt').build(RAMP)).startsWith('# COLOR_MODEL = RGB\n# gradient\n'), 'an unnamed .cpt changed its header');
  ok(text(fmt('css').build(RAMP)).startsWith('background: linear-gradient('), 'an unnamed .css grew a comment');

  /** Walk a .grd v3 by its declared lengths; returns the name, or throws naming the defect. */
  const readGrd = (b: Uint8Array): { name: string; stops: number } => {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== '8BGR') throw new Error('bad signature');
    if (dv.getUint16(4) !== 3 || dv.getUint16(6) !== 1) throw new Error('not v3 / one gradient');
    let p = 8;
    const len = b[p++];
    const name = new TextDecoder().decode(b.subarray(p, p + len));
    p += len;
    const stops = dv.getUint16(p);
    p += 2 + stops * 20;
    const trans = dv.getUint16(p);
    p += 2 + trans * 10 + 6;
    if (p !== b.length) throw new Error(`walked to ${p} of ${b.length} bytes`);
    return { name, stops };
  };
  try {
    const g = readGrd(fmt('grd').build(RAMP, NAME) as Uint8Array);
    ok(g.name === NAME, `.grd's name is ${JSON.stringify(g.name)}`);
    ok(readGrd(fmt('grd').build(RAMP) as Uint8Array).name === 'gradient', 'an unnamed .grd is no longer named "gradient"');
    const long = readGrd(fmt('grd').build(RAMP, 'é'.repeat(200)) as Uint8Array);
    ok(long.name === 'é'.repeat(127), `a 400-byte name was not cut to 254 bytes at a character boundary (${new TextEncoder().encode(long.name).length} bytes)`);
  } catch (e) {
    ok(false, `.grd does not walk by its declared lengths: ${(e as Error).message}`);
  }

  // Every other path that takes a name carries it (as written, or as its identifier).
  for (const f of EXPORT_FORMATS) {
    if (['map', 'hex', 'svg', 'js', 'py', 'csv', 'pdn'].includes(f.key)) continue; // no name field
    const out = f.build(RAMP, NAME);
    let hay = typeof out === 'string' ? out : '';
    if (typeof out !== 'string') {
      try { hay = Object.values(unzipSync(out)).map((e) => strFromU8(e)).join('\n'); } catch { /* not a zip */ }
      for (let i = 0; i + 1 < out.length; i += 2) hay += String.fromCharCode((out[i] << 8) | out[i + 1]);
      hay += new TextDecoder().decode(out);
    }
    ok(hay.includes(NAME) || hay.includes('sea-glass') || hay.includes('Sea_Glass_é'), `${f.key}: build(ramp, name) does not carry the name`);
  }
}

// ── [11] every format downloads under its own filename (ADR-0123 item 2) ───────────────
section('[11] every format downloads under its own filename');
{
  for (const subject of ['ramp', 'swatches'] as const) {
    const names = formatsFor(subject).map((f) => exportFileName(f, 'Sea_Glass', subject));
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    ok(dupes.length === 0, `[11] ${subject}: two formats download as ${dupes.join(', ')}`);
  }
  // THE WIRING: the Explorer's own download path, not just the helper. Its downloads are caught
  // at `document.createElement('a').click()` (utils/SceneFormat.downloadBlob).
  const caught: string[] = [];
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:t';
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => { const a = { href: '', download: '', click() { caught.push(a.download); } }; return a; },
  };
  const { runExport, runSetExport } = await import('../gradient-explorer/v2/exportActions');
  const pairs: [string, string][] = [['css', 'cssvars'], ['json', 'tokens'], ['js', 'tw'], ['hex', 'pdn']];
  for (const [a, b] of pairs) {
    caught.length = 0;
    runExport({ kind: 'download', key: a }, RAMP, 'Sea Glass', [], {});
    runExport({ kind: 'download', key: b }, RAMP, 'Sea Glass', [], {});
    runExport({ kind: 'download', key: b, subject: 'swatches' }, RAMP, 'Sea Glass', PALETTE, {});
    ok(caught.length === 3 && new Set(caught).size === 3, `[11] runExport: ${a} and ${b} downloads share a filename (${caught.join(', ')})`);
    const favs = [{ id: 'f', name: 'One', createdAt: 0, config: { stops: [{ id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 1, color: '#FFFFFF' }], colorSpace: 'srgb', blendSpace: 'oklab' } }] as unknown as Parameters<typeof runSetExport>[1];
    caught.length = 0;
    runSetExport(a, favs, 'Set');
    runSetExport(b, favs, 'Set');
    ok(caught.length === 2 && caught[0] !== caught[1], `[11] runSetExport: the ${a} and ${b} zips share a filename (${caught.join(', ')})`);
  }
  caught.length = 0;
  runExport({ kind: 'download', key: 'json' }, RAMP, 'Sea Glass', [], {});
  ok(caught[0] === 'Sea_Glass.json', `[11] a plain format's filename changed (${caught[0]}) — smoke:ge-hero [8] asserts it`);
}

console.log(failures ? `\nFAIL — ${failures} assertion${failures === 1 ? '' : 's'}` : '\nPASS — two subjects, one registry, one stop budget');
process.exit(failures ? 1 : 0);
