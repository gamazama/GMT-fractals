/**
 * Bake the palette-lab catalog into a FEW COMPRESSED static assets the Picker loads
 * (not 11k files). The library is split into SEPARABLE bundles so a public build can
 * ship the clean core alone and load the licence-encumbered sources on demand:
 *
 *   public/palette/core.bin.gz / core.json.gz
 *     — always shipped: uigradients (MIT) + colorbrewer (Apache) + matplotlib (BSD/CC0)
 *       + pypalettes (per-source aggregate). Free to redistribute.
 *   public/palette/softology.bin.gz / softology.json.gz
 *     — provenance-unverified (Visions of Chaos aggregate). Removable / lazy-loaded.
 *   public/palette/cptcity.bin.gz / cptcity.json.gz
 *     — redistribution-bound (per-collection licences). Removable / lazy-loaded.
 *
 * Each pair is the same format:
 *   <group>.bin.gz   — N × (256×3) RGB ramps, Sub-filtered then gzipped
 *   <group>.json.gz  — { group, count, stride, bundles, counts, entries:[{id,name,bundle,theme,f,hue,mh}] }
 *
 * "Sub filter" (each pixel stored as a delta from the previous one, like PNG) turns
 * smooth gradients into tiny values that gzip crushes — the loader uses `pako` to
 * inflate + a cumulative-sum to undo the filter.
 *
 * Facets are computed with OUR computeFacets (palette/core/facets) so they match the
 * QualityRangePad filters exactly. The .map pixels come from catalog_v2.json's paths
 * (softology in workspace Palettes/, the rest in palette-lab/bundles/<bundle>/).
 *
 * Dedup is GLOBAL (across all sources) and runs BEFORE the split, so the same gradient
 * never appears twice once multiple bundles are loaded. Source priority puts the core
 * (redistributable) sources ABOVE the licensed ones, so a duplicate resolves to the
 * core copy whenever one exists — maximising what the core-only build can show.
 *
 * Run: npm run bake:palette   (npx tsx debug/bake-palette-catalog.mts)
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { computeFacets } from '../palette/core/facets';
import type { RGB } from '../palette/core/oklab';

const LAB = 'H:/GMT/stuff/palette-lab';
const PALETTES = 'H:/GMT/workspace-gmt/Palettes';
const OUT_DIR = path.resolve('public/palette');

/** Which baked file each source bundle lands in. Core = always-shipped, redistributable. */
const GROUP_OF: Record<string, string> = {
  uigradients: 'core',
  colorbrewer: 'core',
  matplotlib: 'core',
  pypalettes: 'core',
  softology: 'softology',
  cptcity: 'cptcity',
};
const GROUPS = ['core', 'softology', 'cptcity'] as const;

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
const subFilter = (rgb: RGB[]): Uint8Array => {
  const raw = new Uint8Array(256 * 3);
  for (let k = 0; k < 256; k++) {
    raw[k * 3] = Math.max(0, Math.min(255, Math.round(rgb[k].r)));
    raw[k * 3 + 1] = Math.max(0, Math.min(255, Math.round(rgb[k].g)));
    raw[k * 3 + 2] = Math.max(0, Math.min(255, Math.round(rgb[k].b)));
  }
  const buf = new Uint8Array(256 * 3);
  for (let c = 0; c < 3; c++) buf[c] = raw[c];
  for (let k = 1; k < 256; k++)
    for (let c = 0; c < 3; c++) buf[k * 3 + c] = (raw[k * 3 + c] - raw[(k - 1) * 3 + c]) & 255;
  return buf;
};

const main = () => {
  const cat = JSON.parse(fs.readFileSync(path.join(LAB, 'out/catalog_v2.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(LAB, 'bundles/manifest.json'), 'utf8'));
  const pals: any[] = cat.palettes;
  console.log(`catalog_v2: ${pals.length} palettes`);

  // 1. Collect every palette + a quantized 64-sample signature.
  //    1.5% error margin → quantize step q ≈ round(2·0.015·255) = 8.
  const MARGIN_PCT = 1.5;
  const Q = Math.max(1, Math.round(((2 * MARGIN_PCT) / 100) * 255));
  // Core (redistributable) sources outrank the licensed ones, so a duplicate resolves
  // to a core copy whenever one exists → maximises the core-only build.
  const PRIORITY: Record<string, number> = { colorbrewer: 0, matplotlib: 1, uigradients: 2, pypalettes: 3, cptcity: 4, softology: 5 };
  const prio = (b: string) => PRIORITY[b] ?? 9;

  type Item = { name: string; bundle: string; theme: string; rgb: RGB[]; sig: string };
  const items: Item[] = [];
  let missing = 0;
  for (let i = 0; i < pals.length; i++) {
    const p = pals[i];
    const mp = resolvePath(p);
    if (!mp) { missing++; continue; }
    const rgb = loadMap(mp);
    if (!rgb) { missing++; continue; }
    let sig = '';
    for (let k = 0; k < 64; k++) {
      const c = rgb[Math.round((k * 255) / 63)];
      sig += `${Math.round(c.r / Q)},${Math.round(c.g / Q)},${Math.round(c.b / Q)};`;
    }
    items.push({ name: p.name, bundle: p.bundle, theme: p.theme, rgb, sig });
  }

  // 2. Dedup — one canonical per signature cluster (lowest source priority, then
  //    shortest name). Same policy as palette-lab's build_picker.
  const best = new Map<string, Item>();
  for (const it of items) {
    const ex = best.get(it.sig);
    if (!ex || prio(it.bundle) < prio(ex.bundle) || (prio(it.bundle) === prio(ex.bundle) && it.name.length < ex.name.length)) {
      best.set(it.sig, it);
    }
  }
  const survivors = [...best.values()];
  const dropped = items.length - survivors.length;

  // 3. Partition survivors by output group, preserving order. Build entries + ramps
  //    per group; facet counts (across ALL bundles) are baked into every file so the
  //    source-toggle UI can show counts for bundles that aren't loaded yet.
  const byGroup: Record<string, Item[]> = { core: [], softology: [], cptcity: [] };
  const byBundle: Record<string, number> = {};
  for (const it of survivors) {
    const g = GROUP_OF[it.bundle] ?? 'core';
    byGroup[g].push(it);
    byBundle[it.bundle] = (byBundle[it.bundle] ?? 0) + 1;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const sizes: string[] = [];

  for (const group of GROUPS) {
    const list = byGroup[group];
    const ramps: Uint8Array[] = [];
    const entries: any[] = [];
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      ramps.push(subFilter(it.rgb));
      const fac = computeFacets(it.rgb);
      entries.push({
        id: `${group}-${i}`,
        name: it.name,
        bundle: it.bundle,
        theme: it.theme,
        f: [r3(fac.lightness), r3(fac.chroma), r3(fac.complexity), r3(fac.rainbow), r3(fac.warmth)],
        hue: r3(fac.raw.hueSpreadDeg),
        mh: Math.round(fac.raw.meanHue),
      });
    }

    const bin = new Uint8Array(ramps.length * 256 * 3);
    for (let i = 0; i < ramps.length; i++) bin.set(ramps[i], i * 256 * 3);
    const binGz = zlib.gzipSync(bin, { level: 9 });
    const jsonStr = JSON.stringify({ group, count: entries.length, stride: 256 * 3, bundles: manifest, counts: byBundle, entries });
    const jsonGz = zlib.gzipSync(Buffer.from(jsonStr), { level: 9 });

    fs.writeFileSync(path.join(OUT_DIR, `${group}.bin.gz`), binGz);
    fs.writeFileSync(path.join(OUT_DIR, `${group}.json.gz`), jsonGz);
    sizes.push(`  ${group}: ${entries.length} gradients · bin ${(binGz.length / 1e6).toFixed(2)} MB + json ${(jsonGz.length / 1e6).toFixed(2)} MB`);
  }

  console.log(`\n✓ baked ${survivors.length} gradients · ${dropped} dups dropped @ ${MARGIN_PCT}% (q=${Q}) · ${missing} missing`);
  for (const s of sizes) console.log(s);
  console.log('  by bundle:', byBundle);
};

main();
