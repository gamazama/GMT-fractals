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
const { canonicalSigOf, gxSigHash, catalogHashOf, parseCatalogSigs } = await import('../palette/core/catalogSigs');
const { entryToGradientConfig } = await import('../palette/core/gradientSeam');
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

    // Real picks from the tracked core pack, through the same seam a wall pick uses.
    const ramps = decodeRamps('core', core.count);
    let inList = 0, refused = 0, sampled = 0, editedPass = 0, tooMany = 0;
    for (let i = 0; i < core.count; i += 23) {
      sampled++;
      const config = entryToGradientConfig({ id: core.entries[i].id, name: core.entries[i].name, ramp: ramps[i], row: 0 } as CatalogEntry);
      const h = catalogHashOf(config);
      if (h && sigs.has(h)) inList++;
      const verdict = srv.judgeSubmission(config.stops);
      if (!verdict.ok && verdict.code === 'IN_CATALOGUE' && verdict.status === 409) refused++;
      else if (!verdict.ok && /between 2 and 64/.test(verdict.error)) { tooMany++; refused++; }
      const edited = config.stops.map((s, k) => (k === 0 ? { ...s, color: s.color === '#000000' ? '#010101' : '#000000' } : s));
      const ev = srv.judgeSubmission(edited);
      if (ev.ok || /between 2 and 64/.test(ev.error)) editedPass++;
    }
    ok(inList === sampled, `every sampled core pick hashes into the list (${inList}/${sampled})`);
    ok(refused === sampled, `the function refuses an unedited core pick (409 IN_CATALOGUE) (${refused - tooMany} refused as catalogue, ${tooMany} over the 64-stop limit anyway)`);
    ok(editedPass === sampled, `a one-stop edit of the same pick is accepted (${editedPass}/${sampled})`);

    const seeds = JSON.parse(fs.readFileSync(path.join(PAL, 'gxglobal.json'), 'utf8')).items as { config: GradientConfig }[];
    const seedHits = seeds.filter((s) => { const h = catalogHashOf(s.config); return h && sigs.has(h); }).length;
    ok(seedHits === 0, `no GX Global seed gradient is refused as a catalogue gradient (${seedHits} of ${seeds.length})`);
  }
}

console.log(failures ? `\n✗ ${failures} failure(s)` : '\n✓ catalogue licensing: all green');
process.exit(failures ? 1 : 0);
