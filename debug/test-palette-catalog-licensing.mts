/**
 * test-palette-catalog-licensing — the catalogue licensing work of 2026-09-13
 * (`plans/palette-catalogue-licensing.md`, "What was done"): which pack a gradient lands in,
 * what the category names and export names say, and what GX Global refuses.
 *
 *   [1] the pack model: `debug/palette-packs.mts` PACKS agrees with the app's PALETTE_GROUPS
 *       (every non-`publish:false` pack registered with the same bundles, optional ⇔ optional,
 *       the unpublished pack NOT registered); the restricted bundles lose every dedup tie.
 *   [2] cpt-city classification from COPYING.xml-shaped fixtures: archive of a .map name, the
 *       bundle (noncomm → nc, distribute="no" → noredist, es / jm by name), the licence tags.
 *   [3] PyPalettes classification: severance → nc, the six no-licence packages → nolicence.
 *   [4] THE BAKED FILES (tracked core + whatever CDN packs are present locally): core carries
 *       no NC / no-licence gradient and names no unpublished bundle; no cdn pack carries a
 *       separated archive; the unpublished pack is not in public/palette/; the corrected labels
 *       (Indrashish Ghosh; no "QGIS-audited"; no "MIT/Apache/BSD/CC0" in .gitignore / the bake
 *       header); every pack's credits file exists and the core one carries the MIT text.
 *   [5] manifests merge by version: a v1 file loaded after a v2 one changes no label or count.
 *   [6] category names: `categoryName`, source + COLLECTION bands, and search by what they say.
 *   [7] export names: an unmodified catalogue gradient's name carries its credit, one stop
 *       moved does not, no origin / a malformed origin does not, sets per member, favourites
 *       and the working input KEEP the origin (additive), and a v1 bundle falls back.
 *   [9] (second pass, 2026-09-13) LIVE SOURCES — GX Global in Filters ▸ Sources: a registered
 *       live source loads into the catalogue through `setGroupLoaded`, its entries are COPIED
 *       (the source's own objects keep their rows), an empty load marks it failed and leaves it
 *       unloaded, unloading removes it, GX Global's info is "GX Global (shared by users)" and
 *       user-made, and a pick from it stamps no export credit.
 *   [10] the ramp form (ADR-0122) — see THE RAMP FORM below.
 *   [8] GX Global: the client's canonical signature equals the server's
 *       (`backend/supabase/functions/gx-gradients/validate.ts`, imported by path) over a corpus;
 *       every sampled core pick hashes INTO the baked list, and the function's own
 *       `judgeSubmission` refuses it with 409 IN_CATALOGUE while a one-stop edit passes; the
 *       function's bundled list equals the app's file; no GMT seed preset is refused.
 *
 * FALSIFIED 2026-09-13 (each reverted; the red line quoted):
 *   • `cptcityBundleOf` ignoring distribute="no"            → [2] "jjg/neo10 (distribute=no) → cptcity-noredist"
 *   • PYPAL_NC emptied                                      → [3] "severance → pypalettes-nc"
 *   • the pre-2026-09-13 core.json.gz/.bin.gz put back      → [4] "core.json.gz is format v2 with a credits file", "every core
 *                                                            entry names a collection the file describes", "uiGradients credits
 *                                                            its copyright holder", "no "QGIS-audited …" label", "PyPalettes
 *                                                            says it is a GPL-3.0 package …" (5 red). NOTE "core has no
 *                                                            severance" itself stays green on that file: it reads `src`,
 *                                                            which a v1 file does not have — the collection check is what
 *                                                            catches an old file, so do not drop it as redundant.
 *   • a core.json.gz whose one collection tag reads "CC0 (as listed)" (the first bake's) → [4] "no licence tag carries parentheses"
 *   • mergeManifest merging every file over                 → [5] "a v1 file loaded after v2 keeps the v2 label"
 *   • arrangeRows ignoring collectionLabel                  → [6] "collection bands are named by collection"
 *   • exportNameFor without the key comparison              → [7] "one stop moved exports exactly as today"
 *   • withOrigin() dropped from favientsStore.add           → [7] "add keeps a well-formed origin"
 *   • client `canonicalSigOf` without `.toUpperCase()`      → [8] "client and server canonicalise identically"
 *   • judgeSubmission without the catalogue check           → [8] "the function refuses an unedited core pick (409 IN_CATALOGUE)"
 * The last two needed the corpus to hold lower-case hex: the catalogue fit already emits upper
 * case, so a corpus of catalogue gradients alone passed the case bug.
 *
 * SECOND PASS 2026-09-13 (ElvenSword named, Mossman dropped, COLOURlovers separated, the publish
 * switch, GX Global as a live source) — falsified, each reverted:
 *   • CPT_MANUAL_BUNDLE es → 'cptcity'                       → [2] "es (ElvenSword) → its own elvensword bundle"
 *   • SOFTOLOGY_NC_FAMILIES emptied                          → [3] "Softology's colourlovers family → softology-nc"
 *   • paletteGroupsFrom registering publish:false packs      → [1] "switching noncommercial to false unregisters it" (+2 more)
 *   • pickerStore tagging live entries IN PLACE (`Object.assign(e, …)`) → [9] "live entries are copies"
 *     (returning `entries` untouched instead reds the load assertion first: the copy is also
 *     where `bundle` is stamped, so that break never reaches the copy check)
 *   • pickerStore not recording a failed live load           → [9] "an empty live load marks the source failed"
 *   • entryOrigin without the `userMade` check               → [9] "a GX Global pick stamps no export credit"
 *
 * THE RAMP FORM, 2026-09-14 (ADR-0122: a gradient is stops OR `stops: []` + a 1,024-char `ramp`).
 * [8] now judges the whole posted config, samples three named core entries that arrive as ramps
 * beside every 23rd pick, and checks each entry's PRE-ADR 128-stop fit is still listed (old shelves
 * and old tabs send it). [10] is new:
 *   [10] (a) a stop gradient's hash equals golden values pinned from HEAD cbb887bd's canonicaliser,
 *        with or without a stale ramp beside the stops; a ramp's signature is `ramp:` + the string;
 *        (b) client `canonicalConfigSigOf` ≡ server `canonicaliseConfig` over a corpus of good and
 *        malformed ramps (1,023 chars, padded, url-safe, non-ASCII, no stops array …), the function
 *        drops a stale ramp beside stops and stores a posted ramp as a ramp row; (c) export credits
 *        — a ramp pick keeps its credit unmodified, loses it on one texel, never lends it to another
 *        ramp, and a stop gradient's origin key is the pinned pre-ramp string; (d) the GX Global
 *        wire — a stop gradient's POST body is the pre-ramp bytes, a ramp posts `stops: []` + ramp
 *        and comes back through `parseGlobalSet` as the same ramp, a malformed one is dropped.
 * FALSIFIED 2026-09-14 (each reverted; red lines quoted, abbreviated):
 *   • catalogSigs ramp sig without the `ramp:` tag          → [8] "every sampled core pick hashes into the list (127/132)",
 *                                                            "every sampled RAMP pick …", [10] "tagged ramp string", "the ramp form identically"
 *   • catalogHashOf back to `canonicalSigOf(config?.stops)`  → [8] the list (127/132), RAMP pick, one-texel edit; [10] tagged ramp string
 *   • validate.ts canonicaliseConfig never taking the ramp path → [8] RAMP pick refused (5, 0 of 5), one-texel edit; [10] "identically",
 *                                                            "accepts a posted ramp gradient as a ramp row"
 *   • validate.ts letting a ramp win over non-empty stops    → [10] "identically", "ignores a stale ramp beside stops"
 *   • validate.ts ramp alphabet loop accepting any character → STAYS GREEN, by design: the atob + 768-byte wall refuses every
 *                                                            string the loop lets through (the client's `isRampString` /
 *                                                            `decodeRampBytes` are the same two walls). Both walls down
 *                                                            (length check only) → [10] "the ramp form identically".
 *   • catalogOrigin.originKey without the ramp branch        → [10] "one texel changed drops a ramp's credit", "another ramp does not
 *                                                            inherit" ("keeps its credit" stays green: every ramp shares `oklab|`)
 *   • globalSetPostBody always sending the stops form        → [10] "accepts a posted ramp", "round-trips the GX Global wire"
 *   • globalSetPostBody putting `ramp` on a stop body        → [10] "a stop gradient's POST body is unchanged"
 *   • canonicalSigOf rounding positions to 1/100             → [8] "identically", the list (14/132), the pre-ADR pick (9/132);
 *                                                            [10] "byte-identical to the pre-ramp one"
 *   • debug/palette-catalog-sigs.mts `entryHashes` without the legacy hash, list re-baked with `--sigs-only` → [8] "the pre-ADR-0122
 *                                                            pick … still in the list (127/132)" (then restored and re-baked; both
 *                                                            lists compared byte-identical to the pre-falsification files)
 *
 * Needs the backend repo checked out beside this one (H:/GMT/workspace-gmt/backend) for [8];
 * set GX_SKIP_BACKEND=1 to skip that half LOUDLY on a machine without it.
 *
 * Run: npm run test:palette-licensing   (npx tsx debug/test-palette-catalog-licensing.mts)
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// localStorage shim BEFORE any store loads (favientsStore reads it at import).
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
};

const packs = await import('./palette-packs.mts');
const { PALETTE_GROUPS, mergeManifest, paletteGroupsFrom, registerLiveSource } = await import('../palette/core/catalogLoader');
const { PACK_PUBLISH } = await import('../palette/core/catalogPacks');
const { arrangeRows, buildSearchIndex, filterCatalog, EMPTY_CRITERIA, collectionKeyOf } = await import('../palette/core/pickerModel');
const { categoryName, exportNameFor, withExportName, entryOrigin, stampOrigin, unmodifiedOrigin, coerceOrigin } = await import('../palette/core/catalogOrigin');
const { canonicalSigOf, canonicalConfigSigOf, gxSigHash, catalogHashOf, parseCatalogSigs } = await import('../palette/core/catalogSigs');
const { originKey } = await import('../palette/core/catalogOrigin');
const { entryToGradientConfig } = await import('../palette/core/gradientSeam');
const { isRampGradient, decodeRampBytes, encodeRampBuffer } = await import('../utils/gradientRamp');
const { entrySigsOf } = await import('./palette-catalog-sigs.mts');
const { useFavientsStore } = await import('../palette/store/favientsStore');
const { coerceWorkingSnapshot, originOfWorking } = await import('../palette/store/workingStore');
type GradientConfig = import('../types').GradientConfig;
type CatalogEntry = import('../palette/core/presetCatalog').CatalogEntry;

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};

const PAL = path.resolve('public/palette');
const readPack = (id: string, dir = PAL): any | null => {
  const p = path.join(dir, `${id}.json.gz`);
  return fs.existsSync(p) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString('utf8')) : null;
};
const decodeRamps = (id: string, count: number): Uint8Array[] => {
  const f = zlib.gunzipSync(fs.readFileSync(path.join(PAL, `${id}.bin.gz`)));
  const out: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const off = i * 768;
    const ramp = new Uint8Array(1024);
    let r = f[off], g = f[off + 1], b = f[off + 2];
    ramp[0] = r; ramp[1] = g; ramp[2] = b; ramp[3] = 255;
    for (let k = 1; k < 256; k++) {
      r = (r + f[off + k * 3]) & 255; g = (g + f[off + k * 3 + 1]) & 255; b = (b + f[off + k * 3 + 2]) & 255;
      ramp[k * 4] = r; ramp[k * 4 + 1] = g; ramp[k * 4 + 2] = b; ramp[k * 4 + 3] = 255;
    }
    out.push(ramp);
  }
  return out;
};

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] the pack model agrees with the app');
{
  const appPacks = packs.PACKS.filter((p) => p.publish !== false);
  for (const p of appPacks) {
    const g = PALETTE_GROUPS.find((x) => x.id === p.id);
    ok(!!g && JSON.stringify([...g.bundles].sort()) === JSON.stringify([...p.bundles].sort()), `pack ${p.id} is registered with the same bundles`);
    ok(!!g && !!g.optional === (p.publish === 'optional') && g.core === (p.publish === 'repo'), `pack ${p.id}: core/optional flags match publish=${p.publish}`);
  }
  ok(PALETTE_GROUPS.length === appPacks.length, 'the app registers no pack the bake does not publish');
  ok(!PALETTE_GROUPS.some((g) => g.id === 'unpublished' || g.bundles.some((b) => b === 'cptcity-noredist' || b === 'pypalettes-nolicence' || b === 'cptcity-jm')), 'the unpublished pack and its bundles (incl. Jim Mossman) are not registered in the app');
  ok(!PALETTE_GROUPS.some((g) => g.id === 'mossman') && !packs.PACKS.some((p) => p.id === 'mossman'), 'there is no Mossman pack');
  ok(PALETTE_GROUPS.filter((g) => g.optional).map((g) => g.id).join(',') === 'noncommercial', 'the only optional pack is noncommercial');
  const elven = PALETTE_GROUPS.find((g) => g.id === 'elvensword');
  ok(!!elven && !elven.core && !elven.optional && elven.bundles.join() === 'elvensword', 'ElvenSword is a normal published pack with its own bundle');
  const withdrawn = paletteGroupsFrom({ ...PACK_PUBLISH, noncommercial: false });
  ok(!withdrawn.some((g) => g.id === 'noncommercial') && withdrawn.length === PALETTE_GROUPS.length - 1, 'switching noncommercial to false unregisters it (the one-line switch)');
  const all = packs.PACKS.flatMap((p) => p.bundles);
  ok(new Set(all).size === all.length && Object.keys(packs.PRIORITY).every((b) => all.includes(b)) && all.every((b) => b in packs.PRIORITY), 'every bundle is in exactly one pack and has a dedup priority');
  const clean = ['colorbrewer', 'matplotlib', 'uigradients', 'pypalettes', 'cptcity', 'softology', 'elvensword'];
  const restricted = ['cptcity-nc', 'pypalettes-nc', 'softology-nc', 'cptcity-jm', 'cptcity-noredist', 'pypalettes-nolicence'];
  ok(restricted.every((r) => clean.every((c) => packs.PRIORITY[r] > packs.PRIORITY[c])), 'a restricted copy loses every dedup tie against a clean one');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] cpt-city: archive, bundle, licence tag');
{
  const A = (dir: string, informal: string, href?: string, distribute = 'yes') => ({ dir, authors: [], informal, href, distribute, links: [] });
  const dirs = ['jjg/ccolo/evad', 'jjg/cbac', 'jjg/neo10', 'td', 'es', 'jm', 'gacruxa', 'wkp/ice', 'wkp/country', 'go2/webtwo'];
  ok(packs.cptcityArchiveOf('00123_jjg__ccolo__evad__some_palette', dirs) === 'jjg/ccolo/evad', 'a nested archive is found from the .map name');
  ok(packs.cptcityArchiveOf('04000_gacruxa__set1__g01', dirs) === 'gacruxa', 'a top-level archive is found');
  ok(packs.cptcityArchiveOf('04000_gacruxaX__g01', dirs) === null, 'a prefix that is not a whole segment does not match');
  ok(packs.cptcityBundleOf(A('jjg/ccolo/evad', 'CC BY-NC-SA', 'http://creativecommons.org/licenses/by-nc-sa/3.0/', 'noncomm')) === 'cptcity-nc', 'jjg/ccolo (distribute=noncomm) → cptcity-nc');
  ok(packs.cptcityBundleOf(A('jjg/neo10', 'Free to use', undefined, 'no')) === 'cptcity-noredist', 'jjg/neo10 (distribute=no) → cptcity-noredist');
  ok(packs.cptcityBundleOf(A('td', 'Free to use', undefined, 'no')) === 'cptcity-noredist', 'td (distribute=no) → cptcity-noredist');
  ok(packs.cptcityBundleOf(A('es', 'Credit requested for use, required for distribution')) === 'elvensword', 'es (ElvenSword) → its own elvensword bundle');
  ok(packs.cptcityBundleOf(A('jm', 'Attribution required')) === 'cptcity-jm' && packs.packOfBundle('cptcity-jm')?.publish === false, 'jm (Jim Mossman) → cptcity-jm, in a publish:false pack');
  ok(packs.cptcityBundleOf(A('gacruxa', 'Creative commons Attribution 3.0 Unported', 'http://creativecommons.org/licenses/by/3.0/')) === 'cptcity', 'gacruxa stays in cptcity');
  const tag = (a: ReturnType<typeof A>) => packs.cptcityLicenceOf(a).tag;
  ok(tag(A('gacruxa', 'Creative commons Attribution 3.0 Unported', 'http://creativecommons.org/licenses/by/3.0/')) === 'CC BY 3.0', 'CC BY 3.0 from the licence link');
  ok(tag(A('jjg/ccolo/evad', 'x', 'http://creativecommons.org/licenses/by-nc-sa/3.0/', 'noncomm')) === 'CC BY-NC-SA 3.0', 'CC BY-NC-SA 3.0');
  ok(tag(A('wkp/country', 'x', 'http://creativecommons.org/licenses/by-sa/3.0/deed.fr')) === 'CC BY-SA 3.0', 'CC BY-SA 3.0 (a localised deed link)');
  ok(tag(A('ggr', 'GPLv2', 'http://www.gnu.org/licenses/gpl-2.0.html')) === 'GPL-2.0' && packs.cptcityLicenceOf(A('ggr', 'GPLv2')).texts.includes('GPL-2.0'), 'GPLv2 carries the GPL-2.0 text');
  ok(tag(A('ukmo', 'Crown Copyright, released under UK Open Government Licence for Public Sector Information', 'http://www.nationalarchives.gov.uk/doc/open-government-licence/')) === 'OGL v3', 'OGL');
  ok(tag(A('es', 'Credit requested')) === 'free with credit' && tag(A('jm', 'Attribution required')) === 'own terms', 'ElvenSword is "free with credit"; Mossman stays "own terms"');
  ok(packs.creditOf('cptcity', 'gacruxa', 'CC BY 3.0') === 'cpt-city/gacruxa, CC BY 3.0' && packs.creditOf('uigradients', null, 'MIT') === 'uiGradients, MIT', 'the export credit is small');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] PyPalettes: package, bundle, licence');
{
  ok(packs.pypalettesPackageOf('The R package: {MoMAColors}') === 'MoMAColors', 'package parsed from the CSV source column');
  ok(packs.pypalettesBundleOf('severance') === 'pypalettes-nc', 'severance → pypalettes-nc');
  for (const p of ['calecopal', 'LaCroixColoR', 'DresdenColor', 'waRhol', 'NineteenEightyR', 'musculusColors'])
    ok(packs.pypalettesBundleOf(p) === 'pypalettes-nolicence', `${p} → pypalettes-nolicence`);
  ok(packs.pypalettesBundleOf('MetBrewer') === 'pypalettes' && packs.pypalettesCreditOf('MetBrewer').licence.tag === 'CC0', 'MetBrewer stays in core as CC0');
  ok(packs.pypalettesCreditOf('rcartocolor').licence.tag === 'CC BY 4.0' && packs.pypalettesCreditOf('unikn').licence.tag === 'CC BY-SA 4.0', 'CARTOColors CC BY 4.0, unikn CC BY-SA 4.0');
  ok(packs.pypalettesCreditOf('wanteeed.com').licence.tag === 'unverified', 'an unknown source is unverified, not guessed');
  ok(packs.softologyBundleOf('colourlovers thought provoking') === 'softology-nc' && packs.packOfBundle('softology-nc')?.id === 'noncommercial', "Softology's colourlovers family → softology-nc, in the noncommercial pack");
  ok(packs.softologyBundleOf('Flame 012_south-sea-bather') === 'softology' && packs.softologyBundleOf('kuler sunset') === 'softology', 'the other Softology families stay in softology');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] the baked files');
const core = readPack('core');
{
  ok(!!core && core.v === 2 && typeof core.credits === 'string', 'core.json.gz is format v2 with a credits file');
  const coreEntries: any[] = core?.entries ?? [];
  const bad = coreEntries.filter((e) => e.bundle !== 'uigradients' && e.bundle !== 'colorbrewer' && e.bundle !== 'matplotlib' && e.bundle !== 'pypalettes');
  const nolic = coreEntries.filter((e) => e.src === 'severance' || packs.PYPAL_NO_LICENCE.has(e.src));
  ok(coreEntries.length > 2000 && bad.length === 0 && nolic.length === 0, `core has no severance / no-licence gradients (${nolic.length} found, ${bad.length} foreign bundles)`);
  ok(coreEntries.every((e) => typeof e.src === 'string' && core.collections[`${e.bundle}:${e.src}`]), 'every core entry names a collection the file describes');
  ok(!!core && !('cptcity-noredist' in core.counts) && !('pypalettes-nolicence' in core.counts) && !('cptcity-noredist' in core.bundles), 'core names no unpublished bundle (so no Sources toggle can offer one)');
  ok(!!core && /Indrashish Ghosh/.test(core.bundles.uigradients?.attribution ?? '') && !/contributors/i.test(core.bundles.uigradients?.attribution ?? ''), 'uiGradients credits its copyright holder');
  ok(!!core && !/QGIS-audited|redistributable subset/i.test(JSON.stringify(core.bundles)), 'no "QGIS-audited redistributable subset" label');
  // A category name ENDS in "(tag)" and an export name in "(credit)"; a tag with its own
  // parentheses makes both unreadable ("CC0 (as listed))") and breaks the smokes' parsing.
  const parenTags = PALETTE_GROUPS.map((g) => readPack(g.id)).filter(Boolean).flatMap((p: any) => [
    ...Object.values(p.collections ?? {}).map((c: any) => c.tag),
    ...Object.values(p.bundles ?? {}).map((b: any) => b.tag ?? ''),
  ]).filter((t: string) => /[()]/.test(t));
  ok(parenTags.length === 0, `no licence tag carries parentheses (${[...new Set(parenTags)].join(', ') || 'none'})`);
  ok(!!core && !/per-source \(aggregated; see source\)/.test(core.bundles.pypalettes?.license ?? '') && /GPL-3\.0/.test(core.bundles.pypalettes?.license ?? ''), 'PyPalettes says it is a GPL-3.0 package with per-package licences');
  for (const [id, sep] of [['cptcity', /^jjg\/ccolo\/|^jjg\/neo10$|^td$|^es$|^jm$/], ['softology', /^colourlovers$/]] as const) {
    const p = readPack(id);
    if (!p) { console.log(`  · ${id}.json.gz not present locally (gitignored CDN pack) — skipped`); continue; }
    ok(p.entries.every((e: any) => !sep.test(e.src ?? '') && (e.bundle === id)), `${id} carries none of the separated sets`);
  }
  ok(!fs.existsSync(path.join(PAL, 'unpublished.json.gz')) && !fs.existsSync(path.join(PAL, 'credits.unpublished.txt')), 'the unpublished pack is NOT written under public/palette/');
  ok(!fs.readdirSync(PAL).some((f) => /mossman/.test(f)), 'no Mossman file is left under public/palette/ (the bake removes a withdrawn pack)');
  const es = readPack('elvensword');
  ok(!!es && es.entries.length === 690 && es.entries.every((e: any) => e.bundle === 'elvensword') && Object.values(es.collections).every((c: any) => c.label === 'ElvenSword') && es.bundles.elvensword?.label === 'ElvenSword', 'the ElvenSword pack is labelled ElvenSword (not "cpt-city · es"), 690 gradients');
  const esCredits = fs.existsSync(path.join(PAL, 'credits.elvensword.txt')) ? fs.readFileSync(path.join(PAL, 'credits.elvensword.txt'), 'utf8') : '';
  ok(/^ElvenSword — credits and licences/.test(esCredits) && /elvensword\.deviantart\.com\/gallery/.test(esCredits) && /Do not Rip\/Merge with other artists work/.test(esCredits) && /good-faith equivalent/.test(esCredits), "ElvenSword's credits name the artist, link the gallery and quote the distribution terms");
  const nc = readPack('noncommercial');
  ok(!!nc && ['cptcity-nc', 'pypalettes-nc', 'softology-nc'].every((b) => nc.entries.some((e: any) => e.bundle === b)) && nc.entries.filter((e: any) => e.bundle === 'softology-nc').length === 60, 'the noncommercial pack holds jjg/ccolo, severance and the 60 Softology COLOURlovers palettes');
  const manifest = JSON.parse(fs.readFileSync('debug/palette-upload-manifest.json', 'utf8'));
  ok(!JSON.stringify(manifest).includes('unpublished') && manifest.packs.every((p: any) => p.publish === 'repo' || p.publish === 'cdn' || p.publish === 'optional'), 'the upload manifest lists no publish:false pack');
  ok(manifest.packs.map((p: any) => p.pack).join(',') === 'core,softology,cptcity,elvensword,noncommercial', `the upload manifest is core + softology, cptcity, elvensword, noncommercial (${manifest.packs.map((p: any) => p.pack).join(',')})`);
  for (const g of PALETTE_GROUPS) ok(fs.existsSync(path.join(PAL, `credits.${g.id}.txt`)) || !fs.existsSync(path.join(PAL, `${g.id}.json.gz`)), `pack ${g.id}: a present pack has its credits file`);
  const creditsCore = fs.existsSync(path.join(PAL, 'credits.core.txt')) ? fs.readFileSync(path.join(PAL, 'credits.core.txt'), 'utf8') : '';
  ok(/Permission is hereby granted, free of charge/.test(creditsCore) && /Apache License/.test(creditsCore) && /Indrashish Ghosh/.test(creditsCore), 'credits.core.txt carries the MIT and Apache texts and the uiGradients holder');
  ok(!/severance|calecopal|LaCroixColoR/.test(creditsCore), 'credits.core.txt lists no separated package');
  const gi = fs.readFileSync('.gitignore', 'utf8');
  ok(!/MIT\/Apache\/BSD\/CC0/.test(gi) && !/clean, redistributable/.test(gi), '.gitignore no longer calls core "clean, redistributable (MIT/Apache/BSD/CC0)"');
  const bake = fs.readFileSync('debug/bake-palette-catalog.mts', 'utf8');
  ok(!/Free to redistribute/.test(bake), 'the bake header no longer says core is "Free to redistribute"');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] manifests merge by version');
{
  const v2 = { v: 2, bundles: { uigradients: { label: 'uiGradients', tag: 'MIT', license: 'MIT', attribution: 'Copyright (c) 2017 Indrashish Ghosh', url: 'u' } }, counts: { uigradients: 377, cptcity: 3573 } };
  const v1 = { bundles: { uigradients: { label: 'uiGradients', license: 'MIT', attribution: 'uiGradients contributors', url: 'u' }, oldonly: { label: 'Old', license: '?', attribution: '?', url: 'u' } }, counts: { uigradients: 377, cptcity: 4701, oldonly: 5 } };
  const empty = { bundles: {}, counts: {}, version: -1 };
  const a = mergeManifest(mergeManifest(empty, v2), v1);
  ok(a.bundles.uigradients.attribution.includes('Indrashish') && a.counts.cptcity === 3573, 'a v1 file loaded after v2 keeps the v2 label and count');
  ok(!!a.bundles.oldonly && a.counts.oldonly === 5, 'a v1 file still fills a bundle v2 never named');
  const b = mergeManifest(mergeManifest(empty, v1), v2);
  ok(b.bundles.uigradients.attribution.includes('Indrashish') && b.counts.cptcity === 3573 && !('oldonly' in b.counts), 'v2 loaded after v1 replaces the stale count table');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] category names');
{
  ok(categoryName('uiGradients', 'MIT') === 'uiGradients (MIT)' && categoryName('Old', undefined) === 'Old', 'categoryName: label (tag); an untagged v1 bundle is its label');
  const fac = { lightness: 0.5, chroma: 0.5, complexity: 0.5, rainbow: 0.5, warmth: 0.5, raw: { meanL: 0, meanC: 0, hf: 0, hueSpreadDeg: 0, meanHue: 0, meanA: 0, hueOrder: 0 } };
  const E = (id: string, bundle: string, src?: string): CatalogEntry => ({ id, name: id, bundle, src, theme: 't', facets: fac, ramp: new Uint8Array(1024), row: 0 });
  const cat = [E('a', 'cptcity', 'gacruxa'), E('b', 'cptcity', 'gacruxa'), E('c', 'cptcity', 'bhw'), E('d', 'uigradients', 'uigradients'), E('e', 'softology')];
  const bundles: Record<string, { label: string; tag?: string }> = { cptcity: { label: 'cpt-city', tag: 'per archive' }, uigradients: { label: 'uiGradients', tag: 'MIT' }, softology: { label: 'Softology' } };
  const cols: Record<string, { label: string; tag: string }> = { 'cptcity:gacruxa': { label: 'cpt-city · gacruxa', tag: 'CC BY 3.0' }, 'cptcity:bhw': { label: 'cpt-city · bhw', tag: 'CC BY 3.0' }, 'uigradients:uigradients': { label: 'uiGradients', tag: 'MIT' } };
  const bl = (id: string) => (bundles[id] ? categoryName(bundles[id].label, bundles[id].tag) : undefined);
  const cl = (k: string) => (cols[k] ? categoryName(cols[k].label, cols[k].tag) : undefined);
  const axes = (groupAxis: string) => ({ groupAxis, rowsAxis: 'none', sortAxis: 'name', reverse: false });
  const bySource = arrangeRows(cat, axes('bundle'), bl, cl).map((r) => r.label);
  ok(bySource.includes('cpt-city (per archive)') && bySource.includes('uiGradients (MIT)'), `source bands carry the licence tag (${bySource.join(' | ')})`);
  const byCol = arrangeRows(cat, axes('collection'), bl, cl);
  ok(byCol.map((r) => r.label).includes('cpt-city · gacruxa (CC BY 3.0)') && byCol.find((r) => r.key === 'cptcity:gacruxa')?.entries.length === 2, 'collection bands are named by collection');
  ok(byCol.find((r) => r.key === collectionKeyOf(cat[4]))?.label === 'Softology', 'a v1 entry with no collection bands under its source name');
  const idx = buildSearchIndex(cat, bl, cl);
  const hits = (q: string) => filterCatalog(cat, { ...EMPTY_CRITERIA, query: q }, idx).map((e) => e.id).join('');
  ok(hits('gacruxa') === 'ab' && hits('cc by') === 'abc' && hits('mit') === 'd', 'search finds what the category names say');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] export names carry the credit only while unmodified');
{
  const cfg: GradientConfig = { stops: [{ id: 'a', position: 0, color: '#112233' }, { id: 'b', position: 1, color: '#AABBCC' }], colorSpace: 'linear', blendSpace: 'oklab' };
  const origin = stampOrigin('cptcity:gacruxa', 'cpt-city/gacruxa, CC BY 3.0', cfg);
  ok(exportNameFor('Sunset', origin, cfg) === 'Sunset (cpt-city/gacruxa, CC BY 3.0)', 'export name: unmodified gets the credit');
  const moved: GradientConfig = { ...cfg, stops: [cfg.stops[0], { ...cfg.stops[1], position: 0.9 }] };
  ok(exportNameFor('Sunset', origin, moved) === 'Sunset', 'export name: one stop moved exports exactly as today');
  const recoloured: GradientConfig = { ...cfg, stops: [cfg.stops[0], { ...cfg.stops[1], color: '#AABBCD' }] };
  ok(exportNameFor('Sunset', origin, recoloured) === 'Sunset' && exportNameFor('Sunset', origin, { ...cfg, blendSpace: 'srgb' }) === 'Sunset', 'a one-unit colour or a blend-space change is a modification');
  ok(exportNameFor('Sunset', undefined, cfg) === 'Sunset' && exportNameFor('Sunset', { ref: 1, credit: 'x', key: 'y' }, cfg) === 'Sunset' && exportNameFor('Sunset', { ...origin, credit: 'x'.repeat(200) }, cfg) === 'Sunset', 'no origin / a malformed origin / an oversized credit: the name as given');
  ok(exportNameFor('Sunset (cpt-city/gacruxa, CC BY 3.0)', origin, cfg) === 'Sunset (cpt-city/gacruxa, CC BY 3.0)', 'a name already carrying the credit is not suffixed twice');
  const members = [{ id: '1', name: 'Kept', config: cfg, origin, createdAt: 0 }, { id: '2', name: 'Edited', config: moved, origin, createdAt: 0 }, { id: '3', name: 'Mine', config: cfg, createdAt: 0 }];
  const out = members.map(withExportName);
  ok(out[0].name === 'Kept (cpt-city/gacruxa, CC BY 3.0)' && out[1] === members[1] && out[2] === members[2], 'a set exports per member: only the unmodified catalogue member is renamed');
  // v1 fallback + the stamp a wall pick makes
  ok(entryOrigin({ bundle: 'cptcity', src: 'gacruxa' }, cfg, { cptcity: { label: 'cpt-city', tag: 'per archive' } }, { 'cptcity:gacruxa': { credit: 'cpt-city/gacruxa, CC BY 3.0' } })?.credit === 'cpt-city/gacruxa, CC BY 3.0', 'a v2 pick stamps the collection credit');
  ok(entryOrigin({ bundle: 'cptcity' }, cfg, { cptcity: { label: 'cpt-city' } }, {})?.credit === 'cpt-city', 'a v1 pick falls back to the source name');
  ok(entryOrigin({}, cfg, {}, {}) === null, 'a built-in preset has no origin');
  // favourites keep it (additive)
  const st = useFavientsStore.getState();
  const id = st.add(cfg, 'Picked', 'Picker', origin);
  const saved = JSON.parse(disk.get('gmt.favients') ?? '[]').find((f: any) => f.id === id);
  ok(!!unmodifiedOrigin(saved?.origin, saved?.config), 'add keeps a well-formed origin, and it survives the round trip to storage');
  const id2 = st.add({ ...cfg, stops: [cfg.stops[0], { ...cfg.stops[1], color: '#000000' }] }, 'Plain', 'Picker');
  const plain = JSON.parse(disk.get('gmt.favients') ?? '[]').find((f: any) => f.id === id2);
  ok(!!plain && !('origin' in plain), 'a favourite without an origin has no origin key (byte-identical to before)');
  const rid = st.collectRecent({ ...cfg, stops: [cfg.stops[0], { ...cfg.stops[1], color: '#123456' }] }, 'R', 'Picker', { origin: coerceOrigin({ ...origin, key: 'k' })! });
  ok(!!useFavientsStore.getState().favients.find((f) => f.id === rid)?.origin, 'collectRecent keeps the origin');
  const ids = st.insertMany([{ config: { ...cfg, blendSpace: 'hsl' }, name: 'M', origin }], 'g-x', 'X');
  ok(!!useFavientsStore.getState().favients.find((f) => f.id === ids[0])?.origin, 'insertMany keeps the origin');
  // the working input keeps it through undo / session coercion
  const snap = coerceWorkingSnapshot({ input: { kind: 'gradient', config: cfg, name: 'n', source: 'Picker', origin }, name: null });
  ok(!!snap && snap.input.kind === 'gradient' && !!unmodifiedOrigin(originOfWorking(snap.input, null), cfg), 'the working input keeps the origin through snapshot coercion');
  const baked = coerceWorkingSnapshot({ input: { kind: 'stops' }, bakedFrom: { input: { kind: 'gradient', config: cfg, name: 'n', source: 'Picker', origin } } });
  ok(!!baked && originOfWorking(baked.input, baked.bakedFrom)?.credit === origin.credit, 'a fold remembers the origin it folded');
  const junk = coerceWorkingSnapshot({ input: { kind: 'gradient', config: cfg, name: 'n', source: 'Picker', origin: { ref: 5 } } });
  ok(!!junk && junk.input.kind === 'gradient' && !('origin' in junk.input), 'a malformed origin in a snapshot is dropped, the input kept');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] live sources: GX Global in Filters ▸ Sources');
{
  // No network in a harness: every fetch fails, so GX Global's own load falls back and yields
  // nothing — which is exactly the "did not load" case the toggle has to survive.
  (globalThis as any).fetch = () => Promise.reject(new Error('offline harness'));
  const { usePickerStore } = await import('../palette/store/pickerStore');
  const { GX_GLOBAL_SOURCE } = await import('../palette/store/globalSetStore');
  const fac = { lightness: 0.5, chroma: 0.5, complexity: 0.5, rainbow: 0.5, warmth: 0.5, raw: { meanL: 0, meanC: 0, hf: 0, hueSpreadDeg: 0, meanHue: 0, meanA: 0, hueOrder: 0 } };
  const shared: CatalogEntry[] = [0, 1, 2].map((i) => ({ id: `gx-global:${i}`, name: `g${i}`, stops: [{ id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 1, color: '#FFFFFF' }], facets: fac, ramp: new Uint8Array(1024), row: i }));
  registerLiveSource({ id: 'test-live', info: { label: 'Test live', tag: 'shared by users', license: '-', attribution: '-', url: '-', userMade: true }, load: async () => shared });
  registerLiveSource({ id: 'test-dead', info: { label: 'Dead', license: '-', attribution: '-', url: '-' }, load: async () => [] });
  const settle = () => new Promise((r) => setTimeout(r, 30));
  const st = () => usePickerStore.getState();
  st().setGroupLoaded('test-live', true);
  await settle();
  const got = st().catalog.filter((e) => e.bundle === 'test-live');
  ok(st().loadedGroups.includes('test-live') && got.length === 3 && st().bundleCounts['test-live'] === 3, 'a live source loads into the catalogue like a pack (3 entries, counted)');
  ok(got.every((e) => !shared.includes(e)) && shared.map((e) => e.row).join() === '0,1,2', "live entries are copies — the source's own objects keep their rows");
  ok(st().bundles['test-live']?.label === 'Test live', "the live source's info is in the bundle manifest (About and the category name read it)");
  st().setGroupLoaded('test-dead', true);
  await settle();
  ok(st().failedGroups.includes('test-dead') && !st().loadedGroups.includes('test-dead'), 'an empty live load marks the source failed and leaves it unloaded');
  st().setGroupLoaded('test-live', false);
  ok(!st().catalog.some((e) => e.bundle === 'test-live') && !st().loadedGroups.includes('test-live'), 'unticking removes the live source from the wall');
  ok(categoryName(GX_GLOBAL_SOURCE.info.label, GX_GLOBAL_SOURCE.info.tag) === 'GX Global (shared by users)' && GX_GLOBAL_SOURCE.info.userMade === true && GX_GLOBAL_SOURCE.id === 'gx-global', 'GX Global is named "GX Global (shared by users)" and marked user-made');
  const offline = await GX_GLOBAL_SOURCE.load();
  ok(Array.isArray(offline) && offline.length === 0, 'GX Global unreachable (no endpoint, no CDN, no shipped copy) loads nothing rather than throwing');
  const cfg: GradientConfig = { stops: shared[0].stops!, colorSpace: 'srgb', blendSpace: 'oklab' };
  ok(entryOrigin({ bundle: 'gx-global' }, cfg, { 'gx-global': GX_GLOBAL_SOURCE.info }, {}) === null, 'a GX Global pick stamps no export credit');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] GX Global refuses unedited catalogue gradients');
{
  const BACKEND = 'H:/GMT/workspace-gmt/backend/supabase/functions/gx-gradients/validate.ts';
  const sigFile = JSON.parse(fs.readFileSync(path.join(PAL, 'catalog-sigs.json'), 'utf8'));
  const sigs = parseCatalogSigs(sigFile);
  ok(sigs.size === sigFile.count && sigs.size > 11000, `the baked signature list parses (${sigs.size} hashes)`);

  // A corpus the fit never produces: lower case, shorthand, unsorted, step, bias, junk.
  const corpus: unknown[] = [
    [{ position: 0, color: '#abc' }, { position: 1, color: '#ddeeff' }],
    [{ position: 1, color: '#FFFFFF', interpolation: 'step' }, { position: 0.25, color: '#10a0Ff', bias: 0.3 }, { position: 0, color: '#000' }],
    [{ position: 0.123456, color: '#aBcDeF', interpolation: 'smooth' }, { position: 0.9999, color: '#012345', interpolation: 'cubic' }],
    [{ position: 0, color: 'red' }, { position: 1, color: '#fff' }],
    [{ position: -0.1, color: '#000000' }, { position: 1, color: '#ffffff' }],
    [{ position: 0.5, color: '#12345' }, { position: 1, color: '#ffffff' }],
  ];
  if (!fs.existsSync(BACKEND)) {
    if (process.env.GX_SKIP_BACKEND === '1') console.log('  ! SKIPPED: the backend repo is not beside this one (GX_SKIP_BACKEND=1) — [8] is NOT guarding anything on this run');
    else ok(false, `the backend's validate.ts is at ${BACKEND}`);
  } else {
    const srv = await import(`file:///${BACKEND}`);
    let same = true;
    for (const stops of corpus) {
      const s = srv.canonicalise(stops);
      const c = canonicalSigOf(stops);
      if ('error' in s ? c !== null : c !== s.sig || gxSigHash(c!) !== srv.sigHash(s.sig)) { same = false; console.log('    differs on', JSON.stringify(stops), '→', JSON.stringify(s), c); }
    }
    ok(same, 'client and server canonicalise identically');
    ok(srv.catalogue().size === sigs.size && [...sigs].every((h) => srv.catalogue().has(h)), "the function's bundled list equals the app's catalog-sigs.json");

    // Real picks from the tracked core pack, through the same seam a wall pick uses. Since
    // ADR-0122 a pick is a STOP gradient or, for a dense entry, a RAMP gradient; the sample is
    // every 23rd entry plus three named core entries known to arrive as ramps, so the ramp
    // path is exercised whatever the stride lands on ("the sample holds ramp picks" says so).
    const ramps = decodeRamps('core', core.count);
    const RAMP_NAMED = ['flag', 'prism', 'glasbey'];
    const sample = new Set<number>();
    for (let i = 0; i < core.count; i += 23) sample.add(i);
    for (const n of RAMP_NAMED) { const i = core.entries.findIndex((e: any) => e.name === n); if (i >= 0) sample.add(i); }
    /** One unit of one colour changed: the first stop's colour, or texel 0's red byte. */
    const editOne = (config: GradientConfig): GradientConfig => {
      if (isRampGradient(config)) {
        const b = Uint8Array.from(decodeRampBytes(config.ramp)!);
        b[0] = b[0] === 0 ? 1 : 0;
        return { ...config, ramp: encodeRampBuffer(b, 3) };
      }
      return { ...config, stops: config.stops.map((s, k) => (k === 0 ? { ...s, color: s.color === '#000000' ? '#010101' : '#000000' } : s)) };
    };
    let inList = 0, refused = 0, editedPass = 0, tooMany = 0, legacyIn = 0;
    let rampSampled = 0, rampInList = 0, rampRefused = 0, rampEditedClient = 0, rampEditedServer = 0;
    for (const i of sample) {
      const config = entryToGradientConfig({ id: core.entries[i].id, name: core.entries[i].name, ramp: ramps[i], row: 0 } as CatalogEntry);
      const isRamp = isRampGradient(config);
      const h = catalogHashOf(config);
      if (h && sigs.has(h)) inList++;
      const verdict = srv.judgeSubmission(config);
      if (!verdict.ok && verdict.code === 'IN_CATALOGUE' && verdict.status === 409) refused++;
      else if (!verdict.ok && /between 2 and 64/.test(verdict.error)) { tooMany++; refused++; }
      const edited = editOne(config);
      const ev = srv.judgeSubmission(edited);
      if (ev.ok || /between 2 and 64/.test(ev.error)) editedPass++;
      // The pre-ADR pick (the 128-stop fit) — what old shelves hold and old tabs send.
      const legacy = entrySigsOf(ramps[i]).legacy;
      if (legacy && sigs.has(legacy)) legacyIn++;
      if (isRamp) {
        rampSampled++;
        if (h && sigs.has(h)) rampInList++;
        if (!verdict.ok && verdict.code === 'IN_CATALOGUE') rampRefused++;
        const eh = catalogHashOf(edited);
        if (eh && !sigs.has(eh)) rampEditedClient++;
        if (ev.ok && ev.ramp === (edited as { ramp?: string }).ramp && ev.stops.length === 0) rampEditedServer++;
      }
    }
    const sampled = sample.size;
    ok(inList === sampled, `every sampled core pick hashes into the list (${inList}/${sampled})`);
    ok(refused === sampled, `the function refuses an unedited core pick (409 IN_CATALOGUE) (${refused - tooMany} refused as catalogue, ${tooMany} over the 64-stop limit anyway)`);
    ok(editedPass === sampled, `a one-stop edit of the same pick is accepted (${editedPass}/${sampled})`);
    ok(rampSampled >= 3, `the sample holds ramp picks (${rampSampled}; the named ${RAMP_NAMED.join(', ')} are core entries too dense for 48 stops — re-pick them if a re-bake changed that)`);
    ok(rampInList === rampSampled && rampRefused === rampSampled, `every sampled RAMP pick hashes into the list and the function refuses it (409 IN_CATALOGUE) (${rampInList}, ${rampRefused} of ${rampSampled})`);
    ok(rampEditedClient === rampSampled && rampEditedServer === rampSampled, `a one-texel edit of a ramp pick passes the client check and the function accepts it as a ramp (${rampEditedClient}, ${rampEditedServer} of ${rampSampled})`);
    ok(legacyIn === sampled, `the pre-ADR-0122 pick (the 128-stop fit) of every sampled entry is still in the list — old shelves and old tabs (${legacyIn}/${sampled})`);

    const seeds = JSON.parse(fs.readFileSync(path.join(PAL, 'gxglobal.json'), 'utf8')).items as { config: GradientConfig }[];
    const seedHits = seeds.filter((s) => { const h = catalogHashOf(s.config); return h && sigs.has(h); }).length;
    ok(seedHits === 0, `no GX Global seed gradient is refused as a catalogue gradient (${seedHits} of ${seeds.length})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] the ramp form (ADR-0122): signatures, export credits, the GX Global wire');
{
  const { globalSetPostBody, parseGlobalSet } = await import('../palette/core/globalSet');
  // A deterministic ramp that no catalogue entry is.
  let seed = 0x9e3779b9;
  const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519) ^ Math.imul(seed + 0x6d2b79f5, 3266489917)) >>> 0) & 255;
  const bytes = Uint8Array.from({ length: 768 }, rnd);
  const RAMP = encodeRampBuffer(bytes, 3);
  const RAMP2 = encodeRampBuffer(Uint8Array.from(bytes, (v, i) => (i === 400 ? (v + 1) & 255 : v)), 3);
  const rampCfg: GradientConfig = { stops: [], ramp: RAMP, colorSpace: 'linear', blendSpace: 'oklab' };
  const twoStops = [{ id: 'a', position: 0, color: '#abc' }, { id: 'b', position: 1, color: '#ddeeff' }];
  const stopCfg: GradientConfig = { stops: twoStops, colorSpace: 'linear', blendSpace: 'oklab' };

  // (a) a stop gradient's signature is what it was: hashes pinned from the pre-ADR canonicaliser
  // (HEAD cbb887bd's catalogSigs.ts, run 2026-09-14), with and without a stale ramp beside them.
  const golden: [unknown[], string][] = [
    [[{ position: 0, color: '#abc' }, { position: 1, color: '#ddeeff' }], '1c877bf80a780603'],
    [[{ position: 1, color: '#FFFFFF', interpolation: 'step' }, { position: 0.25, color: '#10a0Ff', bias: 0.3 }, { position: 0, color: '#000' }], 'ee33d7e566ed6ac0'],
    [[{ position: 0.123456, color: '#aBcDeF', interpolation: 'smooth' }, { position: 0.9999, color: '#012345', interpolation: 'cubic' }], '71cad4581e4b90bf'],
  ];
  ok(golden.every(([stops, h]) => catalogHashOf({ stops, colorSpace: 'srgb', blendSpace: 'oklab' } as GradientConfig) === h && catalogHashOf({ stops, ramp: RAMP, colorSpace: 'srgb', blendSpace: 'oklab' } as GradientConfig) === h),
    "a stop gradient's signature is byte-identical to the pre-ramp one, stale ramp and all");
  const rs = canonicalConfigSigOf(rampCfg);
  ok(rs === `ramp:${RAMP}` && catalogHashOf(rampCfg) === gxSigHash(rs!) && catalogHashOf({ ...rampCfg, ramp: RAMP2 }) !== catalogHashOf(rampCfg),
    "a ramp gradient's signature is the tagged ramp string, and one texel moves it");

  // (b) the client and server mirrors agree on the ramp form, malformed ramps included.
  const BACKEND = 'H:/GMT/workspace-gmt/backend/supabase/functions/gx-gradients/validate.ts';
  if (!fs.existsSync(BACKEND)) {
    if (process.env.GX_SKIP_BACKEND === '1') console.log('  ! SKIPPED: backend not beside this repo — (b) is NOT guarding anything on this run');
    else ok(false, `the backend's validate.ts is at ${BACKEND}`);
  } else {
    const srv = await import(`file:///${BACKEND}`);
    const rampCorpus: unknown[] = [
      rampCfg,
      { stops: [], ramp: RAMP2 },
      { stops: [], ramp: 'A'.repeat(1024) },
      { stops: [], ramp: '/'.repeat(1024) },
      { stops: twoStops, ramp: RAMP },                  // stops win
      { stops: [], ramp: RAMP.slice(1) },               // 1,023 chars
      { stops: [], ramp: `${RAMP.slice(0, 1022)}==` },  // padded
      { stops: [], ramp: `${RAMP.slice(0, 1023)}-` },   // url-safe alphabet
      { stops: [], ramp: `${RAMP.slice(0, 1023)}é` },
      { stops: [], ramp: RAMP + 'A' },
      { stops: [] },                                     // neither
      { stops: [], ramp: null },
      { stops: [], ramp: 12 },
      { ramp: RAMP },                                    // no stops array
      { stops: 'x', ramp: RAMP },
      null,
    ];
    let same = true;
    for (const c of rampCorpus) {
      const s = srv.canonicaliseConfig(c);
      const k = canonicalConfigSigOf(c);
      if ('error' in s ? k !== null : k !== s.sig || gxSigHash(k!) !== srv.sigHash(s.sig)) { same = false; console.log('    differs on', JSON.stringify(c)?.slice(0, 90), '→', 'error' in s ? s.error : s.sig.slice(0, 20), k?.slice(0, 20)); }
    }
    ok(same, 'client and server canonicalise the ramp form identically (malformed ramps refused by both)');
    const j = srv.judgeSubmission({ stops: twoStops, ramp: RAMP });
    ok(j.ok && j.ramp === null && j.stops.length === 2 && j.sig === srv.canonicalise(twoStops).sig, 'the function ignores a stale ramp beside stops: stops row, stops signature, no ramp stored');
    const jr = srv.judgeSubmission(JSON.parse(globalSetPostBody(rampCfg)).config);
    ok(jr.ok && jr.ramp === RAMP && jr.stops.length === 0 && jr.sig === `ramp:${RAMP}`, 'the function accepts a posted ramp gradient as a ramp row');
  }

  // (c) export credits: the key follows the form.
  ok(originKey(stopCfg) === 'oklab|0:#ABC:linear:,10000:#DDEEFF:linear:' && originKey({ ...stopCfg, ramp: RAMP }) === originKey(stopCfg),
    "a stop gradient's origin key is unchanged (pinned pre-ramp), stale ramp and all");
  const ro = stampOrigin('pypalettes:x', 'PyPalettes, CC0', rampCfg);
  const rtrip = JSON.parse(JSON.stringify({ origin: ro, config: rampCfg }));
  ok(exportNameFor('Flag', ro, rampCfg) === 'Flag (PyPalettes, CC0)' && !!unmodifiedOrigin(rtrip.origin, rtrip.config), 'a ramp pick keeps its credit while unmodified (and through a JSON round trip)');
  ok(exportNameFor('Flag', ro, { ...rampCfg, ramp: RAMP2 }) === 'Flag', "one texel changed drops a ramp's credit");
  const other: GradientConfig = { stops: [], ramp: encodeRampBuffer(Uint8Array.from(bytes, (v) => 255 - v), 3), colorSpace: 'linear', blendSpace: 'oklab' };
  ok(exportNameFor('Other', ro, other) === 'Other' && exportNameFor('Mine', ro, { ...stopCfg, stops: [] } as GradientConfig) === 'Mine', 'another ramp does not inherit the credit (nor does an empty stop list)');

  // (d) the GX Global wire.
  ok(globalSetPostBody(stopCfg) === JSON.stringify({ config: { stops: stopCfg.stops, colorSpace: stopCfg.colorSpace, blendSpace: stopCfg.blendSpace } }) && globalSetPostBody({ ...stopCfg, ramp: RAMP }) === globalSetPostBody(stopCfg),
    "a stop gradient's POST body is unchanged, stale ramp and all");
  // What the GET serves for a ramp row (index.ts: `{ stops: [], ramp, colorSpace, blendSpace }`).
  const posted = JSON.parse(globalSetPostBody(rampCfg)).config;
  const [back] = parseGlobalSet({ version: 1, items: [{ id: '7', config: { stops: [], ramp: posted.ramp, colorSpace: posted.colorSpace, blendSpace: posted.blendSpace } }] });
  ok(!!back && isRampGradient(back.config) && back.config.ramp === RAMP && back.config.colorSpace === 'linear' && posted.stops.length === 0,
    `a ramp gradient round-trips the GX Global wire (${back ? `parsed as ${isRampGradient(back.config) ? 'a ramp' : `${back.config.stops.length} stops`}` : 'dropped by parseGlobalSet'})`);
  const bad = parseGlobalSet({ items: [{ id: '8', config: { stops: [], ramp: RAMP.slice(3) } }] });
  ok(bad.length === 0, 'a GET item with a malformed ramp is dropped');
}

console.log(failures ? `\n✗ ${failures} failure(s)` : '\n✓ catalogue licensing: all green');
process.exit(failures ? 1 : 0);
