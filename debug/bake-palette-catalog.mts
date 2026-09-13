/**
 * Bake the palette-lab catalogue into a FEW COMPRESSED static packs the Picker loads (not
 * 11k files), plus each pack's CREDITS and the catalogue SIGNATURE LIST GX Global checks.
 *
 * WHAT IS IN WHICH PACK is decided by `debug/palette-packs.mts` — read its header first. In
 * short (owner, 2026-09-13; `plans/palette-catalogue-licensing.md`):
 *
 *   public/palette/core.*           TRACKED in the repo, always loaded. uiGradients (MIT),
 *                                   ColorBrewer (Apache-2.0), Matplotlib (per family) and
 *                                   PyPalettes (a GPL-3.0 package whose palettes keep their
 *                                   upstream licences: MIT, GPL-2/3, CC0, Apache-2.0, CC BY
 *                                   4.0, CC BY-SA 4.0). NOT "MIT/Apache/BSD/CC0", and NOT
 *                                   "free to redistribute" without the credits beside it.
 *                                   The NC `severance` and the six no-licence R packages are
 *                                   NOT in core any more.
 *   public/palette/softology.*      gitignored → R2 CDN, lazy. Origins unverified; its
 *                                   COLOURlovers family is separated.
 *   public/palette/cptcity.*        gitignored → R2 CDN, lazy. Per-archive licences, minus
 *                                   the separated archives.
 *   public/palette/elvensword.*     gitignored → R2 CDN, lazy. ElvenSword under its own name.
 *   public/palette/noncommercial.*  gitignored → R2 CDN, OPTIONAL: jjg/ccolo + severance +
 *                                   Softology's COLOURlovers family. Published, but off by
 *                                   default in the app. Its publish value is the one-line owner
 *                                   switch in palette/core/catalogPacks.ts.
 *   palette-lab/out/unpublished/    every publish:false pack — distribute="no", the no-licence
 *                                   packages, Jim Mossman. Written OUTSIDE public/, never in
 *                                   the upload manifest, never registered in the app. Its only
 *                                   use is the signature list.
 *
 * Which pack is published is `PACK_PUBLISH` in palette/core/catalogPacks.ts (shared with the
 * app); a pack switched to false has its stale public/ files removed by the next bake.
 *
 * Per pack `<id>` the bake writes:
 *   <id>.bin.gz        N × (256×3) RGB ramps, Sub-filtered then gzipped
 *   <id>.json.gz       { v:2, group, count, stride, bundles, counts, collections, credits,
 *                        entries:[{id,name,bundle,theme,f,hue,mh,src}] }
 *   credits.<id>.txt   human-readable credits + the verbatim licence texts that must travel
 *   credits.<id>.json  the same credits, structured (texts referenced, not repeated)
 *
 * and once:
 *   public/palette/catalog-sigs.json                      (tracked) catalogue signature hashes
 *   backend/supabase/functions/gx-gradients/catalog-sigs.ts  the same list, for the function
 *   debug/palette-upload-manifest.json                    (tracked) what WOULD be uploaded
 *
 * FORMAT v2 IS ADDITIVE: `v`, `collections`, `credits`, per-entry `src` and per-bundle `tag`
 * are new; every v1 field keeps its meaning, so a v1 bundle still on the CDN keeps loading
 * (`palette/core/catalogLoader.ts` merges by version so an old file cannot overwrite a new
 * file's labels).
 *
 * "Sub filter" (each pixel stored as a delta from the previous one, like PNG) turns smooth
 * gradients into tiny values that gzip crushes — the loader uses `pako` to inflate + a
 * cumulative sum to undo it. Facets are computed with OUR computeFacets so they match the
 * filters exactly.
 *
 * Dedup is GLOBAL (across all sources) and runs BEFORE the split, so the same gradient never
 * appears twice. `PRIORITY` puts the least-restricted source first, so a duplicate resolves to
 * the cleanest copy that exists.
 *
 * Needs, outside this repo: H:/GMT/stuff/palette-lab (catalog, bundles, manifest, licences),
 * h:/tmp/cptsvg (the cpt-city COPYING.xml files), h:/tmp/dl/pypalettes.csv,
 * H:/GMT/workspace-gmt/Palettes (Softology). A clean checkout cannot re-bake.
 *
 * Run: npm run bake:palette   (npx tsx debug/bake-palette-catalog.mts)
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { computeFacets } from '../palette/core/facets';
import type { RGB } from '../palette/core/oklab';
import { entryToGradientConfig } from '../palette/core/gradientSeam';
import { catalogHashOf, packCatalogSigs, CATALOG_SIGS_FILE } from '../palette/core/catalogSigs';
import type { CatalogEntry } from '../palette/core/presetCatalog';
import {
  PACKS, PRIORITY, packOfBundle, collectionKey, creditOf, BUNDLED_TEXTS, LICENCE_URL,
  cptcityArchiveOf, cptcityBundleOf, cptcityLicenceOf, pypalettesPackageOf, pypalettesBundleOf,
  pypalettesCreditOf, matplotlibFamilyOf, softologyFamilyOf, softologyBundleOf,
  type CptArchive, type CollectionLicence, type TextId, type PackDef,
} from './palette-packs.mts';

const LAB = 'H:/GMT/stuff/palette-lab';
const PALETTES = 'H:/GMT/workspace-gmt/Palettes';
const CPT_SRC = 'h:/tmp/cptsvg';
const PYPAL_CSV = 'h:/tmp/dl/pypalettes.csv';
const BACKEND_FN = 'H:/GMT/workspace-gmt/backend/supabase/functions/gx-gradients';
const OUT_DIR = path.resolve('public/palette');
const UNPUBLISHED_DIR = path.join(LAB, 'out/unpublished');
const UPLOAD_MANIFEST = path.resolve('debug/palette-upload-manifest.json');

const loadMap = (p: string): RGB[] | null => {
  let txt: string;
  try { txt = fs.readFileSync(p, 'utf8'); } catch { return null; }
  const rows: number[][] = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.trim().split(/\s+/);
    if (m.length < 3) continue;
    const r = +m[0], g = +m[1], b = +m[2];
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) rows.push([r, g, b]);
  }
  if (rows.length === 0) return null;
  if (rows.length === 256) return rows.map(([r, g, b]) => ({ r, g, b }));
  const out: RGB[] = [];
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (rows.length - 1), a = Math.floor(t), bb = Math.min(rows.length - 1, a + 1), f = t - a;
    out.push({
      r: Math.round(rows[a][0] * (1 - f) + rows[bb][0] * f),
      g: Math.round(rows[a][1] * (1 - f) + rows[bb][1] * f),
      b: Math.round(rows[a][2] * (1 - f) + rows[bb][2] * f),
    });
  }
  return out;
};

const resolvePath = (p: { path?: string; bundle?: string; file?: string }): string | null => {
  const cands = [
    p.path,
    p.bundle && p.file ? path.join(LAB, 'bundles', p.bundle, p.file) : undefined,
    p.file ? path.join(PALETTES, p.file) : undefined,
  ].filter(Boolean) as string[];
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
};

/** Sub-filter a 256×RGB ramp (delta from previous pixel per channel) for gzip-friendliness. */
const subFilter = (raw: Uint8Array): Uint8Array => {
  const buf = new Uint8Array(256 * 3);
  for (let c = 0; c < 3; c++) buf[c] = raw[c];
  for (let k = 1; k < 256; k++)
    for (let c = 0; c < 3; c++) buf[k * 3 + c] = (raw[k * 3 + c] - raw[(k - 1) * 3 + c]) & 255;
  return buf;
};
const toBytes = (rgb: RGB[]): Uint8Array => {
  const raw = new Uint8Array(256 * 3);
  for (let k = 0; k < 256; k++) {
    raw[k * 3] = Math.max(0, Math.min(255, Math.round(rgb[k].r)));
    raw[k * 3 + 1] = Math.max(0, Math.min(255, Math.round(rgb[k].g)));
    raw[k * 3 + 2] = Math.max(0, Math.min(255, Math.round(rgb[k].b)));
  }
  return raw;
};

// --- sources --------------------------------------------------------------------------------

const xmlText = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const attr = (tag: string, name: string) => new RegExp(`${name}\\s*=\\s*"([^"]*)"`).exec(tag)?.[1];
/** Dedent a COPYING `<text>` body to its own left margin. */
const dedent = (s: string): string => {
  const lines = s.replace(/\r/g, '').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)![0].length), Infinity);
  return lines.map((l) => l.slice(Number.isFinite(ind) ? ind : 0).trimEnd()).join('\n');
};

const readCptArchives = (): CptArchive[] => {
  const out: CptArchive[] = [];
  const walk = (dir: string) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else if (d.name === 'COPYING.xml') {
        // latin1: several COPYING files are not valid UTF-8 (the dump showed "Nu�ez").
        const buf = fs.readFileSync(p);
        let xml = buf.toString('utf8');
        if (xml.includes('\uFFFD')) xml = buf.toString('latin1');
        const rel = path.relative(CPT_SRC, dir).split(path.sep).join('/');
        const authors = [...xml.matchAll(/<author\b([^>]*)>([\s\S]*?)<\/author>/g)].map((m) => ({
          name: xmlText((/<name>([\s\S]*?)<\/name>/.exec(m[2])?.[1] ?? '').trim()),
          href: attr(m[1], 'href'),
        })).filter((a) => a.name);
        const lic = /<license>([\s\S]*?)<\/license>/.exec(xml)?.[1] ?? '';
        const informal = xmlText((/<informal>([\s\S]*?)<\/informal>/.exec(lic)?.[1] ?? '').replace(/\s+/g, ' ').trim());
        const textM = /<text\b([^>]*?)(?:\/>|>([\s\S]*?)<\/text>)/.exec(lic);
        const text = textM?.[2] ? dedent(xmlText(textM[2])) : undefined;
        const q = /<qgis\b([^>]*)\/?>/.exec(xml);
        const links = [...xml.matchAll(/<link\b([^>]*)>([\s\S]*?)<\/link>/g)].map((m) => ({ href: attr(m[1], 'href') ?? '', label: xmlText(m[2].replace(/\s+/g, ' ').trim()) })).filter((l) => l.href);
        out.push({ dir: rel, authors, informal, href: textM ? attr(textM[1], 'href') : undefined, text: text || undefined, distribute: q ? attr(q[1], 'distribute') : undefined, links });
      }
    }
  };
  walk(CPT_SRC);
  return out.sort((a, b) => a.dir.localeCompare(b.dir));
};

/** Minimal RFC-4180 CSV → rows of fields (the PyPalettes CSV quotes its palette column). */
const parseCsv = (txt: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"') { if (txt[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && txt[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0]) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
};

// --- collections + credits -----------------------------------------------------------------

interface Collection {
  key: string;
  bundle: string;
  /** Collection name within its bundle (the entry's `src`). */
  name: string;
  label: string;
  licence: CollectionLicence;
  credit: string;
  authors: { name: string; href?: string }[];
  links: { href: string; label: string }[];
  notice?: string;
  note?: string;
  count: number;
}

const main = () => {
  const cat = JSON.parse(fs.readFileSync(path.join(LAB, 'out/catalog_v2.json'), 'utf8'));
  const manifest: Record<string, { label: string; tag?: string; license: string; attribution: string; url: string }> =
    JSON.parse(fs.readFileSync(path.join(LAB, 'bundles/manifest.json'), 'utf8'));
  const pals: any[] = cat.palettes;
  console.log(`catalog_v2: ${pals.length} palettes`);

  const archives = readCptArchives();
  const archiveByDir = new Map(archives.map((a) => [a.dir, a]));
  const archiveDirs = archives.map((a) => a.dir);
  const csvRows = parseCsv(fs.readFileSync(PYPAL_CSV, 'utf8'));
  const srcCol = csvRows[0].indexOf('source');
  const pypalSource = (file: string): string => {
    const idx = parseInt(file, 10);
    return Number.isFinite(idx) ? csvRows[idx + 1]?.[srcCol] ?? '' : '';
  };

  const collections = new Map<string, Collection>();
  const uiLicence: CollectionLicence = { tag: 'MIT', name: 'MIT', url: LICENCE_URL.MIT, texts: ['MIT'] };
  const cbLicence: CollectionLicence = { tag: 'Apache-2.0', name: 'Apache-Style Software License for ColorBrewer (Apache License 2.0)', url: LICENCE_URL['Apache-2.0'], texts: ['ColorBrewer', 'Apache-2.0'] };

  /** Resolve (bundle, collection) for one catalogue palette, registering the collection. */
  const classify = (p: any): { bundle: string; src: string } | null => {
    const name: string = p.name;
    const reg = (bundle: string, src: string, make: () => Omit<Collection, 'key' | 'bundle' | 'name' | 'count'>) => {
      const key = collectionKey(bundle, src);
      if (!collections.has(key)) collections.set(key, { key, bundle, name: src, count: 0, ...make() });
      return { bundle, src };
    };
    switch (p.bundle) {
      case 'cptcity': {
        const dir = cptcityArchiveOf(name, archiveDirs);
        if (!dir) { console.warn(`  ! cpt-city archive not found for ${name}`); return null; }
        const a = archiveByDir.get(dir)!;
        const bundle = cptcityBundleOf(a);
        const lic = cptcityLicenceOf(a);
        // ElvenSword ships under the artist's OWN name (owner, 2026-09-13), not as a cpt-city
        // archive: the label, the credit and the band all say ElvenSword.
        const named = bundle === 'elvensword';
        return reg(bundle, dir, () => ({
          label: named ? 'ElvenSword' : `cpt-city · ${dir}`,
          licence: lic,
          credit: named ? creditOf(bundle, null, lic.tag) : creditOf(bundle, dir, lic.tag),
          authors: a.authors,
          links: named
            ? [{ href: 'http://elvensword.deviantart.com/gallery/', label: 'ElvenSword on DeviantArt (gallery)' }, ...a.links.filter((l) => !/gallery\/?$/.test(l.href)), { href: `http://seaviewsensing.com/pub/cpt-city/${dir}/`, label: 'as archived by cpt-city' }]
            : [...a.links, { href: `http://seaviewsensing.com/pub/cpt-city/${dir}/`, label: 'cpt-city archive page' }],
          notice: a.text,
          note: [a.informal && `COPYING.xml: "${a.informal}"`, a.href && `licence link: ${a.href}`, a.distribute && `distribute="${a.distribute}"`].filter(Boolean).join(' · '),
        }));
      }
      case 'pypalettes': {
        const pkg = pypalettesPackageOf(pypalSource(p.file ?? ''));
        const bundle = pypalettesBundleOf(pkg);
        const pc = pypalettesCreditOf(pkg);
        return reg(bundle, pkg, () => ({
          label: `PyPalettes · ${pkg}`,
          licence: pc.licence,
          credit: creditOf(bundle, pkg, pc.licence.tag),
          authors: pc.authors.split(/,\s*|\s+&\s+/).map((n) => ({ name: n })),
          links: [{ href: pc.url, label: 'package' }, { href: 'https://github.com/y-sunflower/pypalettes/blob/main/LICENSE.note', label: 'PyPalettes LICENSE.note' }],
          note: 'Via PyPalettes (GPL-3.0 as a whole; the upstream licence of each palette is listed here).',
        }));
      }
      case 'matplotlib': {
        const fam = matplotlibFamilyOf(name);
        return reg('matplotlib', fam.key, () => ({
          label: `Matplotlib · ${fam.label}`,
          licence: fam.licence,
          credit: creditOf('matplotlib', fam.key === 'matplotlib' ? null : fam.key, fam.licence.tag),
          authors: [{ name: fam.authors }],
          links: [{ href: fam.url, label: 'source' }],
        }));
      }
      case 'uigradients':
        return reg('uigradients', 'uigradients', () => ({
          label: 'uiGradients', licence: uiLicence, credit: creditOf('uigradients', null, 'MIT'),
          authors: [{ name: 'Copyright (c) 2017 Indrashish Ghosh', href: 'https://github.com/ghosh' }],
          links: [{ href: 'https://github.com/ghosh/uiGradients/blob/master/LICENSE.md', label: 'LICENSE.md' }],
        }));
      case 'colorbrewer':
        return reg('colorbrewer', 'colorbrewer', () => ({
          label: 'ColorBrewer', licence: cbLicence, credit: creditOf('colorbrewer', null, 'Apache-2.0'),
          authors: [{ name: 'Copyright (c) 2002 Cynthia Brewer, Mark Harrower, and The Pennsylvania State University' }],
          links: [{ href: 'https://github.com/axismaps/colorbrewer/blob/master/LICENCE.txt', label: 'LICENCE.txt' }, { href: 'https://colorbrewer2.org', label: 'colorbrewer2.org' }],
          note: 'This product includes color specifications and designs developed by Cynthia Brewer (http://colorbrewer.org/). No endorsement by Cynthia Brewer or The Pennsylvania State University is implied.',
        }));
      case 'softology': {
        const fam = softologyFamilyOf(name);
        const bundle = softologyBundleOf(name);
        const nc = bundle === 'softology-nc';
        const lic: CollectionLicence = nc
          ? { tag: 'CC BY-NC-SA 3.0', name: 'COLOURlovers palettes: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 (COLOURlovers\' content licence, the same as cpt-city\'s jjg/ccolo)', url: LICENCE_URL['CC-BY-NC-SA-3.0'], texts: [] }
          : { tag: 'unverified', name: 'Free use as published by Jason Rampe ("No copyright on them so do with them as you wish"); origin of this family unverified', url: manifest.softology?.url, texts: [] };
        const FAMILY_NOTE: Record<string, string> = {
          Flame: 'Names match flam3-palettes.xml (flam3, GPL-3.0, Scott Draves) — likely origin, unverified.',
          colourlovers: 'COLOURlovers palettes (CC BY-NC-SA 3.0). Confirmed 2026-09-13: "Thought Provoking", "Ocean Five" and "Let Them Eat Cake" match the COLOURlovers palettes of those names colour for colour. Individual palette authors are not recorded in the Softology files. https://www.colourlovers.com/',
          kuler: 'Prefix suggests Adobe Kuler / Adobe Color user themes, under Adobe\'s terms — unverified.',
          colorschemer: 'Prefix suggests ColorSchemer, third-party terms — unverified.',
          coolors: 'Prefix suggests coolors.co, third-party terms — unverified.',
        };
        const famName = nc ? 'COLOURlovers' : fam;
        return reg(bundle, fam, () => ({
          label: `Softology · ${famName}`, licence: lic, credit: creditOf(bundle, famName, lic.tag),
          authors: nc
            ? [{ name: 'COLOURlovers users (the individual palette authors are not recorded in the Softology files)', href: 'https://www.colourlovers.com/' }, { name: 'collected by Jason Rampe / Visions of Chaos', href: 'https://softology.pro' }]
            : [{ name: 'Jason Rampe / Visions of Chaos (aggregated)', href: 'https://softology.pro' }],
          links: [{ href: manifest.softology?.url ?? 'https://softologyblog.wordpress.com', label: 'Softology blog post' }],
          note: FAMILY_NOTE[fam] ?? 'Filename family; origin unverified.',
        }));
      }
      default:
        console.warn(`  ! unknown bundle ${p.bundle} for ${name}`);
        return null;
    }
  };

  // 1. Collect every palette + a quantized 64-sample signature.
  //    1.5% error margin → quantize step q ≈ round(2·0.015·255) = 8.
  const MARGIN_PCT = 1.5;
  const Q = Math.max(1, Math.round(((2 * MARGIN_PCT) / 100) * 255));
  const prio = (b: string) => PRIORITY[b] ?? 9;

  type Item = { name: string; bundle: string; src: string; theme: string; rgb: RGB[]; sig: string };
  const items: Item[] = [];
  let missing = 0;
  for (const p of pals) {
    const mp = resolvePath(p);
    if (!mp) { missing++; continue; }
    const rgb = loadMap(mp);
    if (!rgb) { missing++; continue; }
    const cls = classify(p);
    if (!cls) { missing++; continue; }
    let sig = '';
    for (let k = 0; k < 64; k++) {
      const c = rgb[Math.round((k * 255) / 63)];
      sig += `${Math.round(c.r / Q)},${Math.round(c.g / Q)},${Math.round(c.b / Q)};`;
    }
    items.push({ name: p.name, bundle: cls.bundle, src: cls.src, theme: p.theme, rgb, sig });
  }

  // 2. Dedup — one canonical per signature cluster (lowest source priority, then shortest name).
  const best = new Map<string, Item>();
  for (const it of items) {
    const ex = best.get(it.sig);
    if (!ex || prio(it.bundle) < prio(ex.bundle) || (prio(it.bundle) === prio(ex.bundle) && it.name.length < ex.name.length)) best.set(it.sig, it);
  }
  const survivors = [...best.values()];
  const dropped = items.length - survivors.length;

  // 3. Partition by pack; count per bundle and per collection.
  const byPack: Record<string, Item[]> = Object.fromEntries(PACKS.map((p) => [p.id, []]));
  const byBundle: Record<string, number> = {};
  for (const it of survivors) {
    const pack = packOfBundle(it.bundle);
    if (!pack) throw new Error(`bundle ${it.bundle} is in no pack`);
    byPack[pack.id].push(it);
    byBundle[it.bundle] = (byBundle[it.bundle] ?? 0) + 1;
    collections.get(collectionKey(it.bundle, it.src))!.count++;
  }

  // The app can reach every pack except publish:false, so only those bundles are named in the
  // files it loads — an unpublished bundle must not appear as a Sources toggle.
  const appBundles = PACKS.filter((p) => p.publish !== false).flatMap((p) => p.bundles);
  const appCounts: Record<string, number> = {};
  const appManifest: Record<string, unknown> = {};
  for (const b of appBundles) {
    if (byBundle[b]) appCounts[b] = byBundle[b];
    if (!manifest[b]) throw new Error(`bundles/manifest.json has no entry for ${b}`);
    appManifest[b] = manifest[b];
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(UNPUBLISHED_DIR, { recursive: true });
  // A pack that is no longer published (or no longer exists) must not linger in public/, where
  // the dev server serves it and a copy of the folder would upload it. Only the bake's own file
  // shapes are touched; the tracked extras (gxglobal.json) are not.
  const live = new Set(PACKS.filter((p) => p.publish !== false).map((p) => p.id));
  for (const f of fs.readdirSync(OUT_DIR)) {
    const m = /^(?:credits\.)?([a-z0-9-]+)\.(?:bin\.gz|json\.gz|txt|json)$/.exec(f);
    if (!m || f === CATALOG_SIGS_FILE || f === 'gxglobal.json' || live.has(m[1])) continue;
    if (!/^credits\./.test(f) && !/\.(bin|json)\.gz$/.test(f)) continue;
    fs.rmSync(path.join(OUT_DIR, f));
    console.log(`  – removed stale ${f} (pack ${m[1]} is not published)`);
  }
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const sizes: string[] = [];
  const catalogHashes: string[] = [];
  const upload: { pack: string; publish: PackDef['publish']; files: { name: string; bytes: number; sha256: string }[] }[] = [];
  const texts: Record<string, string> = Object.fromEntries(BUNDLED_TEXTS.map((t) => [t, fs.readFileSync(path.join(LAB, 'licences', `${t}.txt`), 'utf8').replace(/\r\n/g, '\n')]));

  for (const pack of PACKS) {
    const list = byPack[pack.id];
    const dir = pack.publish === false ? UNPUBLISHED_DIR : OUT_DIR;
    const written: string[] = [];
    const write = (file: string, data: Buffer | string) => { fs.writeFileSync(path.join(dir, file), data); written.push(file); };

    const bin = new Uint8Array(list.length * 256 * 3);
    const entries: any[] = [];
    const packCollections: Record<string, { label: string; tag: string; credit: string }> = {};
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const raw = toBytes(it.rgb);
      bin.set(subFilter(raw), i * 256 * 3);
      const fac = computeFacets(it.rgb);
      entries.push({
        id: `${pack.id}-${i}`, name: it.name, bundle: it.bundle, theme: it.theme,
        f: [r3(fac.lightness), r3(fac.chroma), r3(fac.complexity), r3(fac.rainbow), r3(fac.warmth)],
        hue: r3(fac.raw.hueSpreadDeg), mh: Math.round(fac.raw.meanHue), src: it.src,
      });
      const col = collections.get(collectionKey(it.bundle, it.src))!;
      packCollections[col.key] = { label: col.label, tag: col.licence.tag, credit: col.credit };

      // The catalogue signature: the stops a pick of THIS entry sends, through the same fit.
      const rgba = new Uint8Array(256 * 4);
      for (let k = 0; k < 256; k++) { rgba[k * 4] = raw[k * 3]; rgba[k * 4 + 1] = raw[k * 3 + 1]; rgba[k * 4 + 2] = raw[k * 3 + 2]; rgba[k * 4 + 3] = 255; }
      const h = catalogHashOf(entryToGradientConfig({ id: '', name: it.name, ramp: rgba, row: 0 } as CatalogEntry));
      if (h) catalogHashes.push(h);
    }

    const creditsTxt = `credits.${pack.id}.txt`;
    const creditsJson = `credits.${pack.id}.json`;
    write(`${pack.id}.bin.gz`, zlib.gzipSync(bin, { level: 9 }));
    const json = { v: 2, group: pack.id, count: entries.length, stride: 256 * 3, bundles: appManifest, counts: appCounts, collections: packCollections, credits: creditsTxt, entries };
    write(`${pack.id}.json.gz`, zlib.gzipSync(Buffer.from(JSON.stringify(json)), { level: 9 }));

    // --- credits ---
    const cols = [...collections.values()].filter((c) => pack.bundles.includes(c.bundle) && c.count > 0)
      .sort((a, b) => a.bundle.localeCompare(b.bundle) || b.count - a.count || a.name.localeCompare(b.name));
    const usedTexts = [...new Set(cols.flatMap((c) => c.licence.texts))].sort() as TextId[];
    const lines: string[] = [];
    const rule = '='.repeat(78);
    lines.push(`${pack.label} — credits and licences`, rule, '');
    lines.push(pack.note, '');
    lines.push(`${list.length} gradients in ${cols.length} collection${cols.length === 1 ? '' : 's'}. Generated by debug/bake-palette-catalog.mts`);
    lines.push('in the GMT repository (https://github.com/gamazama/GMT-fractals). Each gradient was converted');
    lines.push('to a 256-step ramp; the catalogue shows it as published. This file summarises what each');
    lines.push('source says about itself so a reader can find the real terms. It is not legal advice.', '');
    for (const b of pack.bundles) {
      const m = manifest[b];
      if (!byBundle[b]) continue;
      lines.push(`Source: ${m.label}${m.tag ? ` (${m.tag})` : ''} — ${byBundle[b]} gradients`, `  ${m.license}`, `  ${m.attribution}`, `  ${m.url}`, '');
    }
    lines.push(rule, 'COLLECTIONS', rule, '');
    for (const c of cols) {
      lines.push(`${c.label} (${c.licence.tag}) — ${c.count} gradient${c.count === 1 ? '' : 's'}`);
      lines.push(`  Credit:  ${c.credit}`);
      if (c.authors.length) lines.push(`  Authors: ${c.authors.map((a) => (a.href ? `${a.name} <${a.href}>` : a.name)).join('; ')}`);
      lines.push(`  Licence: ${c.licence.name}${c.licence.url ? ` <${c.licence.url}>` : ''}`);
      if (c.licence.texts.length) lines.push(`  Full text${c.licence.texts.length > 1 ? 's' : ''} below: ${c.licence.texts.join(', ')}`);
      for (const l of c.links) lines.push(`  Source:  ${l.label} <${l.href}>`);
      if (c.note) lines.push(`  Note:    ${c.note}`);
      if (c.notice) lines.push('  Notice (verbatim from the archive):', ...c.notice.split('\n').map((l) => `    ${l}`));
      lines.push('');
    }
    if (usedTexts.length) {
      lines.push(rule, 'LICENCE TEXTS (verbatim)', rule, '');
      lines.push('Creative Commons licences, CC0, the OGL and the GFDL are referenced by URL above, which');
      lines.push('those licences allow. The texts below are the ones that ask to travel with copies.', '');
      for (const t of usedTexts) lines.push(`----- ${t} ${'-'.repeat(Math.max(4, 70 - t.length))}`, '', texts[t].trimEnd(), '');
    }
    write(creditsTxt, lines.join('\n') + '\n');
    write(creditsJson, JSON.stringify({
      v: 1, pack: pack.id, label: pack.label, publish: pack.publish, note: pack.note, count: list.length, texts: creditsTxt,
      sources: pack.bundles.filter((b) => byBundle[b]).map((b) => ({ bundle: b, count: byBundle[b], ...manifest[b] })),
      collections: cols.map((c) => ({ key: c.key, label: c.label, count: c.count, credit: c.credit, authors: c.authors, licence: { tag: c.licence.tag, name: c.licence.name, url: c.licence.url ?? null, bundledTexts: c.licence.texts }, links: c.links, note: c.note ?? null, notice: c.notice ?? null })),
    }, null, 1) + '\n');

    const files = written.map((f) => { const buf = fs.readFileSync(path.join(dir, f)); return { name: f, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') }; });
    if (pack.publish !== false) upload.push({ pack: pack.id, publish: pack.publish, files });
    const binSize = files.find((f) => f.name.endsWith('.bin.gz'))!.bytes, jsonSize = files.find((f) => f.name.endsWith('.json.gz'))!.bytes;
    sizes.push(`  ${pack.id.padEnd(13)} ${String(entries.length).padStart(5)} gradients · publish ${String(pack.publish).padEnd(8)} · bin ${(binSize / 1e6).toFixed(2)} MB + json ${(jsonSize / 1e6).toFixed(2)} MB${pack.publish === false ? `  → ${UNPUBLISHED_DIR}` : ''}`);
  }

  // 4. The catalogue signature list — every pack, published or not.
  const sigFile = packCatalogSigs(catalogHashes);
  fs.writeFileSync(path.join(OUT_DIR, CATALOG_SIGS_FILE), JSON.stringify(sigFile) + '\n');
  if (fs.existsSync(BACKEND_FN)) {
    const chunks: string[] = [];
    for (let i = 0; i < sigFile.hashes.length; i += 96) chunks.push(`  '${sigFile.hashes.slice(i, i + 96)}'`);
    fs.writeFileSync(path.join(BACKEND_FN, 'catalog-sigs.ts'),
      `// GENERATED by the GMT app's palette bake (workspace-gmt/stable: npm run bake:palette). Do not edit.\n` +
      `// ${sigFile.count} catalogue signature hashes (${sigFile.algo}), every pack incl. unpublished. See validate.ts.\n` +
      `export const CATALOG_SIGS: string = [\n${chunks.join(',\n')},\n].join('');\n`);
  } else console.warn(`  ! ${BACKEND_FN} not found — the function's catalog-sigs.ts was NOT written`);

  // 5. What an upload WOULD send. Nothing here uploads; the owner runs backend/upload-palette-r2.mjs.
  fs.writeFileSync(UPLOAD_MANIFEST, JSON.stringify({
    note: 'Written by npm run bake:palette. NOT uploaded by the bake. `repo` files ship in git; `cdn` and `optional` files go to R2 under palette/ (optional = published, but off by default in the app). publish:false packs are never listed here. The switch is PACK_PUBLISH in palette/core/catalogPacks.ts.',
    base: 'public/palette/', r2Prefix: 'palette/', packs: upload,
    alsoRepo: [CATALOG_SIGS_FILE],
  }, null, 1) + '\n');

  console.log(`\n✓ baked ${survivors.length} gradients · ${dropped} dups dropped @ ${MARGIN_PCT}% (q=${Q}) · ${missing} missing`);
  for (const s of sizes) console.log(s);
  console.log('  by bundle:', byBundle);
  console.log(`  catalogue signatures: ${sigFile.count} unique of ${catalogHashes.length}`);
};

main();
