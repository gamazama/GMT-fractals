/**
 * palette-packs — the bake's LICENCE MODEL: which pack every catalogue gradient lands in,
 * which collection (archive / package / family) it came from, and the short licence tag and
 * credit that collection carries. Pure data + pure functions, no filesystem, so the harness
 * (`debug/test-palette-catalog-licensing.mts`) can check the classification without the
 * source data the bake itself needs.
 *
 * Written 2026-09-13 from `plans/palette-catalogue-licensing.md` and the owner's decisions
 * that day. NOT LEGAL ADVICE: every tag here is a summary of what the source's own licence
 * text says (cpt-city `COPYING.xml`, PyPalettes `LICENSE.note` + CRAN / GitHub metadata),
 * written so a person can find the real text, not a ruling on what it permits.
 *
 * THE PACKS and their publish switch are `palette/core/catalogPacks.ts` (`PACK_PUBLISH`,
 * `PACK_BUNDLES`) — shared with the app, so publishing or withdrawing a pack is one line there
 * plus a re-bake. This file adds what only the bake needs: labels, credits notes, the
 * classifiers. History (owner, 2026-09-13):
 *
 *   core          'repo'     tracked, always loaded
 *   softology     'cdn'      R2 — minus its `colourlovers` family (COLOURlovers, NC)
 *   cptcity       'cdn'      R2 — minus jjg/ccolo, jjg/neo10, td, es, jm
 *   elvensword    'cdn'      R2 — ElvenSword under its OWN name, not merged into cpt-city
 *                            (second pass: "elvensword would prefer to be bundled with its own name")
 *   noncommercial 'optional' jjg/ccolo + severance + Softology colourlovers: PUBLISHED (in the
 *                            upload) but off by default in the app, under "Optional packs"
 *   unpublished   false      distribute="no", the no-licence R packages, and Jim Mossman
 *                            (dropped, second pass)
 *
 * Separating a set into a pack does not change its terms. `publish: false` is the bake
 * refusing to put a set anywhere the app or the CDN can reach, not a licence.
 */

import { PACK_PUBLISH, PACK_BUNDLES, PACK_IDS, type PackPublish } from '../palette/core/catalogPacks';

export type Publish = PackPublish;

export interface PackDef {
  /** File stem: `<id>.bin.gz` / `<id>.json.gz` / `credits.<id>.txt`. */
  id: string;
  label: string;
  publish: Publish;
  /** Source-bundle ids whose survivors land in this pack. */
  bundles: readonly string[];
  /** The credits header: what this pack is and why it is separate. */
  note: string;
}

const ELVENSWORD_TERMS =
  'ElvenSword\'s own terms (quoted from the archive\'s COPYING.xml, below): the gradients are free for personal and commercial artwork with credit, and "okay distributing my resources with credit, for good, for free" — but "do not distribute my resource files without original preview", "do not remove my name", "do not create collection with new preview, claiming … they\'re your own creations" and "do not Rip/Merge with other artists work". So they ship as their own pack under the artist\'s name, never merged into another collection, with ElvenSword credited here, in the category name and in About. The original previews cannot travel with a web catalogue that draws its own swatches; the named pack plus this credit and a link to the gallery (http://elvensword.deviantart.com/gallery/) is the good-faith equivalent. Author approval for inclusion in cpt-city: http://elvensword.deviantart.com/journal/18622706/';

const NOTE: Record<string, (p: Publish) => string> = {
  core: () => 'Tracked in the GMT repository (public/palette/) and always loaded. The collections below keep their own licences: most are permissive, some are GPL-2.0/GPL-3.0, CC BY 4.0 or CC BY-SA 4.0. The non-commercial and no-licence PyPalettes packages are NOT in this pack.',
  softology: () => 'Loaded on demand from the CDN. Jason Rampe published these with "No copyright on them"; he also says some came from elsewhere, so origins are unverified. The "colourlovers" family (COLOURlovers palettes, CC BY-NC-SA 3.0) is NOT in this pack.',
  cptcity: () => 'Loaded on demand from the CDN. Every archive keeps its own licence (below). The non-commercial (jjg/ccolo), not-for-redistribution (jjg/neo10, td) and Jim Mossman (jm) archives are NOT in this pack, and ElvenSword (es) ships as its own named pack.',
  elvensword: () => `ElvenSword's gradients, as their own named pack. ${ELVENSWORD_TERMS}`,
  noncommercial: (p) => p === false
    ? 'NOT FOR PUBLICATION (the owner withdrew it). Non-commercial licences (CC BY-NC-SA 3.0, CC BY-NC 4.0): jjg/ccolo, severance, and Softology\'s COLOURlovers family. Kept only for the GX Global catalogue check.'
    : 'Published as a separate, clearly-labelled pack, OFF by default in the app (Filters ▸ Sources ▸ Optional packs). Non-commercial licences (CC BY-NC-SA 3.0, CC BY-NC 4.0), which cannot be relicensed under GPL-3.0 and are kept apart from the repository\'s code and core pack: cpt-city\'s COLOURlovers archives (jjg/ccolo), PyPalettes\' severance, and Softology\'s "colourlovers" family. The Gradient Explorer is free and non-commercial; every gradient here is credited and licence-tagged, and an unmodified export carries its licence in its name.',
  unpublished: () => 'NOT FOR PUBLICATION. cpt-city archives marked distribute="no", R packages with no licence grant, and Jim Mossman\'s ShadeMax gradients (a personal, non-transferable licence; dropped by the owner 2026-09-13). Their terms give no permission to redistribute; this pack exists only so the GX Global catalogue check can recognise them.',
};
const LABEL: Record<string, string> = {
  core: 'Core pack', softology: 'Softology pack', cptcity: 'cpt-city pack', elvensword: 'ElvenSword',
  noncommercial: 'Non-commercial pack', unpublished: 'NOT FOR PUBLICATION',
};

export const PACKS: PackDef[] = PACK_IDS.map((id) => {
  const publish = PACK_PUBLISH[id] as Publish;
  return { id, label: publish === false && id !== 'unpublished' ? `${LABEL[id]} — NOT FOR PUBLICATION` : LABEL[id], publish, bundles: PACK_BUNDLES[id], note: NOTE[id](publish) };
});

export const packOfBundle = (bundle: string): PackDef | undefined => PACKS.find((p) => p.bundles.includes(bundle));

/** Dedup priority (lower wins a duplicate): clean core first, restricted sets last, so a
 *  gradient that exists in two sources always resolves to the least-restricted copy. */
export const PRIORITY: Record<string, number> = {
  colorbrewer: 0, matplotlib: 1, uigradients: 2, pypalettes: 3, cptcity: 4, softology: 5, elvensword: 6,
  'cptcity-nc': 7, 'pypalettes-nc': 7, 'softology-nc': 7,
  'cptcity-jm': 8, 'cptcity-noredist': 8, 'pypalettes-nolicence': 8,
};

/** The short source name a credit starts with. */
export const BUNDLE_SHORT: Record<string, string> = {
  cptcity: 'cpt-city', 'cptcity-nc': 'cpt-city', 'cptcity-jm': 'cpt-city', 'cptcity-noredist': 'cpt-city',
  pypalettes: 'PyPalettes', 'pypalettes-nc': 'PyPalettes', 'pypalettes-nolicence': 'PyPalettes',
  softology: 'Softology', 'softology-nc': 'Softology', elvensword: 'ElvenSword',
  matplotlib: 'Matplotlib', uigradients: 'uiGradients', colorbrewer: 'ColorBrewer',
};

// --- licence texts the bake bundles verbatim (H:/GMT/stuff/palette-lab/licences/<id>.txt) ---

export const BUNDLED_TEXTS = ['MIT', 'Apache-2.0', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'Matplotlib', 'ColorBrewer', 'Yorick'] as const;
export type TextId = (typeof BUNDLED_TEXTS)[number];

export const LICENCE_URL: Record<string, string> = {
  MIT: 'https://opensource.org/license/mit',
  'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
  'GPL-2.0': 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html',
  'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
  'LGPL-2.1': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html',
  'GFDL-1.2': 'https://www.gnu.org/licenses/old-licenses/fdl-1.2.html',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-SA-3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC-BY-NC-4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'CC-BY-NC-SA-3.0': 'https://creativecommons.org/licenses/by-nc-sa/3.0/',
  'OGL-UK-3.0': 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  Matplotlib: 'https://matplotlib.org/stable/project/license.html',
};

/** What a collection is licensed under, as far as its source says. */
export interface CollectionLicence {
  /** Short tag shown in category names, e.g. "CC BY 3.0". */
  tag: string;
  /** The licence as its source names it. */
  name: string;
  url?: string;
  /** Verbatim texts to bundle with the pack's credits. */
  texts: TextId[];
}

const L = (tag: string, name: string, url?: string, texts: TextId[] = []): CollectionLicence => ({ tag, name, url, texts });

// --- cpt-city -------------------------------------------------------------------------

export interface CptArchive {
  /** Directory relative to the cpt-city root, e.g. "jjg/ccolo/evad". */
  dir: string;
  authors: { name: string; href?: string }[];
  informal: string;
  href?: string;
  /** Verbatim `<license><text>` body, when the archive has one. */
  text?: string;
  /** `<distribute><qgis distribute="…">`. */
  distribute?: string;
  links: { href: string; label: string }[];
}

/** Archives separated by their terms rather than by a `distribute` flag: ElvenSword ships under
 *  its own name (owner, 2026-09-13), Jim Mossman is dropped into the unpublished pack. */
export const CPT_MANUAL_BUNDLE: Record<string, string> = { es: 'elvensword', jm: 'cptcity-jm' };

/** The bundle a cpt-city archive's survivors land in. Data-driven for the two flags
 *  (`distribute="noncomm"`, `distribute="no"`), manual for ElvenSword and Jim Mossman. */
export const cptcityBundleOf = (a: Pick<CptArchive, 'dir' | 'distribute'>): string => {
  const top = a.dir.split('/')[0];
  if (CPT_MANUAL_BUNDLE[a.dir] ?? CPT_MANUAL_BUNDLE[top]) return CPT_MANUAL_BUNDLE[a.dir] ?? CPT_MANUAL_BUNDLE[top];
  if (a.distribute === 'no') return 'cptcity-noredist';
  if (a.distribute === 'noncomm') return 'cptcity-nc';
  return 'cptcity';
};

/**
 * Which archive a cpt-city .map came from. `import_cptcity.py` names each file
 * `NNNNN_<dir with / → __>__<file>`, so the archive is the LONGEST archive dir whose
 * `__`-joined form is a whole-segment prefix of the stem.
 */
export const cptcityArchiveOf = (name: string, dirs: string[]): string | null => {
  const stem = name.replace(/^\d+_/, '');
  let best: string | null = null;
  for (const d of dirs) {
    const j = d.split('/').join('__');
    if ((stem === j || stem.startsWith(`${j}__`)) && (!best || d.length > best.length)) best = d;
  }
  return best;
};

/** Per-archive overrides where the informal line is not the licence (read from the texts). */
const CPT_LICENCE_OVERRIDE: Record<string, CollectionLicence> = {
  es: L('free with credit', 'ElvenSword\'s own terms: free to use and to redistribute, for free, with credit; do not remove the artist\'s name, do not merge into another artist\'s collection, distribute with the original previews', 'http://elvensword.deviantart.com/gallery/'),
  jm: L('own terms', 'Jim Mossman / ESRI ShadeMax script licence: personal, non-transferable; attribution sentence required'),
  nd: L('GNU FL 1.2?', 'Labelled "GPL"; the text grants "the GNU Free License, Version 1.2 or any later version" (most likely the GFDL 1.2)', LICENCE_URL['GFDL-1.2']),
  'wkp/ice': L('GFDL / CC BY-SA', 'GNU Free Documentation License 1.2+ and Creative Commons BY-SA (dual), credit to Eric Gaba'),
  ncl: L('NCL licence', 'NCAR Command Language source code licence (UCAR, custom open-source; notice required)'),
  arendal: L('credit required', 'GRID-Arendal: free use; any publication must credit the cartographer and link the source page'),
  fg: L('credit required', 'Fused Graphics: free use; credit and a link are required when distributed'),
  dg: L('public domain', 'Contributed to the public domain; citation of the paper requested'),
  td: L('free use', 'Free to use (distribute="no")'),
  'jjg/neo10': L('free use', 'Free to use (distribute="no"), derived from Neota\'s gradients'),
  cividis: L('BSD-like', 'BSD-like (Battelle Memorial Institute / PNNL); notice and disclaimer required'),
  gist: L('BSD-style', 'Yorick/gist BSD-style licence (The Regents of the University of California)', undefined, ['Yorick']),
  h5: L('MIT', 'MIT (h5utils, Steven G. Johnson)', LICENCE_URL.MIT, ['MIT']),
  nord: L('MIT', 'MIT (Arctic Ice Studio, Sven Greb)', LICENCE_URL.MIT, ['MIT']),
  cmocean: L('MIT', 'MIT (Kristen M. Thyng)', LICENCE_URL.MIT, ['MIT']),
  rafi: L('free use', 'Royalty-free, free for personal and commercial use'),
  esdb: L('free use', 'Free to use for any purpose (European Soil Data Centre legend notice)'),
  mpl: L('CC0', 'CC0 1.0, attribution requested', LICENCE_URL['CC0-1.0']),
  idv: L('LGPL', 'GNU LGPL (Unidata IDV)', LICENCE_URL['LGPL-2.1'], ['LGPL-2.1']),
};

/** Classify an archive's licence from its COPYING.xml — the `<text href>` first, the
 *  informal line second, the overrides above for the archives whose informal line is not
 *  the licence. */
export const cptcityLicenceOf = (a: CptArchive): CollectionLicence => {
  const o = CPT_LICENCE_OVERRIDE[a.dir];
  if (o) return o;
  const href = (a.href ?? '').toLowerCase();
  const inf = a.informal.toLowerCase();
  if (href.includes('/by-nc-sa/3.0')) return L('CC BY-NC-SA 3.0', a.informal, LICENCE_URL['CC-BY-NC-SA-3.0']);
  if (href.includes('/by-sa/4.0')) return L('CC BY-SA 4.0', a.informal, LICENCE_URL['CC-BY-SA-4.0']);
  if (href.includes('/by-sa/3.0')) return L('CC BY-SA 3.0', a.informal, LICENCE_URL['CC-BY-SA-3.0']);
  if (href.includes('/by/3.0')) return L('CC BY 3.0', a.informal, LICENCE_URL['CC-BY-3.0']);
  if (href.includes('publicdomain/zero')) return L('CC0', a.informal, LICENCE_URL['CC0-1.0']);
  if (href.includes('open-government-licence') || inf.includes('open government licence'))
    return L('OGL v3', `${a.informal} — "Contains public sector information licensed under the Open Government Licence v3.0."`, LICENCE_URL['OGL-UK-3.0']);
  if (inf === 'gplv2' || href.includes('gpl-2.0')) return L('GPL-2.0', a.informal, LICENCE_URL['GPL-2.0'], ['GPL-2.0']);
  if (inf === 'gpl' || href.includes('copyleft/gpl')) return L('GPL', a.informal, LICENCE_URL['GPL-3.0'], ['GPL-2.0', 'GPL-3.0']);
  if (inf === 'mit') return L('MIT', a.informal, LICENCE_URL.MIT, ['MIT']);
  if (inf.startsWith('apache')) return L(inf.includes('like') ? 'Apache-like' : 'Apache-2.0', a.informal, LICENCE_URL['Apache-2.0'], ['Apache-2.0']);
  if (inf.includes('public domain')) return L('public domain', a.informal);
  if (inf.includes('bsd')) return L('BSD-like', a.informal);
  if (inf.includes('free to use') || inf.includes('free for')) return L('free use', a.informal);
  if (inf.includes('share-alike') || inf.includes('share alike')) return L('CC BY-SA', a.informal);
  if (inf.includes('requested')) return L('credit requested', a.informal);
  if (inf.includes('required')) return L('credit required', a.informal);
  return L('see notice', a.informal || 'unspecified');
};

// --- PyPalettes ---------------------------------------------------------------------------

/** `The R package: {MoMAColors}` → `MoMAColors`; the two website rows and the Python
 *  built-ins keep a readable key. */
export const pypalettesPackageOf = (source: string): string => {
  const m = /\{([^}]+)\}/.exec(source);
  if (m) return m[1];
  if (/matplotlib|seaborn/i.test(source)) return 'matplotlib-seaborn';
  return source.trim() || 'unknown';
};

/** Six upstream packages with no licence grant at all (research §3b). */
export const PYPAL_NO_LICENCE = new Set(['calecopal', 'LaCroixColoR', 'DresdenColor', 'waRhol', 'NineteenEightyR', 'musculusColors']);
/** Non-commercial upstream licences. */
export const PYPAL_NC = new Set(['severance']);

export const pypalettesBundleOf = (pkg: string): string =>
  PYPAL_NC.has(pkg) ? 'pypalettes-nc' : PYPAL_NO_LICENCE.has(pkg) ? 'pypalettes-nolicence' : 'pypalettes';

const MIT_PKGS: Record<string, string> = {
  palettetown: 'Tim Lucas', beyonce: 'David Miller', nbapalettes: 'Murray Josh', lisa: 'Tyler Littlefield', pals: 'Kevin Wright',
  colRoz: 'Jacinta Dara Kong', MoMAColors: 'Blake Robert Mills', trekcolors: 'Matthew Leonawicz', ghibli: 'Ewen Henderson',
  ltc: 'Loukas Theodosiou, Kristian Ullrich', wesanderson: 'Karthik Ram', NatParksPalettes: 'Kevin Blake', futurevisions: 'Joey Stanley',
  MexBrewer: 'Antonio Páez', werpals: 'Vebash Naidoo', nord: 'Arctic Ice Studio, Sven Greb', harrypotter: 'Alejandro Jimenez Rico',
  ochRe: 'Alicia Allan, Di Cook, Ross Gayler, Holly Kirk, Roger Peng, Elle Saber', rtist: 'Tomas Okal', vangogh: 'Cheryl Isabella',
  tayloRswift: 'Alex Stephenson', IslamicArt: 'Lambda Moses', soilpalettes: 'Kaizad F. Patel', vapoRwave: 'Matthew J. Oldach',
  miscpalettes: 'Emil Hvitfeldt', feathers: 'Shandiya Balasubramaniam', awtools: 'Austin Wehrwein', dutchmasters: 'Edwin Thoen',
  RSkittleBrewer: 'Alyssa Frazee', tidyquant: 'Matt Dancho, Davis Vaughan', colorblindr: 'Claire D. McWhite, Claus O. Wilke',
  rcartocolor: 'Jakub Nowosad (package, MIT); CARTOColors palettes by CARTO',
};
const GPL2_PKGS: Record<string, string> = {
  fishualize: 'Nina M. D. Schiettekatte, Simon J. Brandl, Jordan M. Casey', ggthemes: 'Jeffrey B. Arnold', palettesForR: 'Francois Rebaudo',
  yarrr: 'Nathaniel Phillips', dichromat: 'Thomas Lumley, Ken Knoblauch, Scott Waichler, Achim Zeileis', jcolors: 'Jared Huling',
  vapeplot: 'Luke Smith', basetheme: 'Karolis Koncevičius',
};
const GPL3_PKGS: Record<string, string> = {
  tvthemes: 'Ryo Nakagawara', ggprism: 'Charlotte Dawson', khroma: 'Nicolas Frerebeau, Brice Lebrun', ggsci: 'Nan Xiao, Miaozhu Li',
  ButterflyColors: 'Gabriela Junqueira, Sofia Schirmer', 'impressionist.colors': 'Federico Casale', Manu: 'Geoffrey Thomson',
  rockthemes: 'John MacKintosh', ggthemr: 'Ciaran Tobin', suffrager: 'Diego Alburez-Gutierrez', palr: 'Michael D. Sumner',
};
const CC0_PKGS: Record<string, string> = {
  MetBrewer: 'Blake Robert Mills', PrettyCols: 'Nicola Rennie', nationalparkcolors: 'Katie Jolly', peRReo: 'Juan B González',
  PNWColors: 'Jake Lawlor', ggpomological: 'Garrick Aden-Buie',
};
const APACHE_PKGS: Record<string, string> = {
  Redmonder: 'Pedro Mac Dowell Innecco, Erich Neuwirth', oompaBase: 'Kevin R. Coombes', Polychrome: 'Guy Brock, Kevin R. Coombes',
};
const NOLIC_PKGS: Record<string, string> = {
  calecopal: 'An Bui', LaCroixColoR: 'Dave Armitage, Johannes Bjork', DresdenColor: 'Katie Saund', waRhol: 'Alex Skeels',
  NineteenEightyR: 'John Hughes', musculusColors: 'Clara N. Bird',
};

export interface PackageCredit { authors: string; licence: CollectionLicence; url: string }

/** A PyPalettes upstream package's licence and authors (LICENSE.note, CRAN, the package's own
 *  DESCRIPTION — research §3b). Unknown packages come back unverified rather than guessed. */
export const pypalettesCreditOf = (pkg: string): PackageCredit => {
  const cran = `https://cran.r-project.org/package=${pkg}`;
  if (pkg === 'grDevices') return { authors: 'R Core Team', licence: L('GPL-2|3', 'GPL-2 | GPL-3 (R base)', LICENCE_URL['GPL-2.0'], ['GPL-2.0', 'GPL-3.0']), url: 'https://www.r-project.org/' };
  if (pkg === 'colorBlindness') return { authors: 'Jianhong Ou', licence: L('GPL ≥2', 'GPL (>= 2)', LICENCE_URL['GPL-2.0'], ['GPL-2.0', 'GPL-3.0']), url: cran };
  if (pkg === 'rcartocolor') return { authors: MIT_PKGS[pkg], licence: L('CC BY 4.0', 'CARTOColors palettes: Creative Commons Attribution 4.0 (package code MIT)', LICENCE_URL['CC-BY-4.0']), url: 'https://github.com/CartoDB/CartoColor' };
  if (pkg === 'unikn') return { authors: 'Hansjoerg Neth, Nico Gradwohl', licence: L('CC BY-SA 4.0', 'Creative Commons Attribution-ShareAlike 4.0', LICENCE_URL['CC-BY-SA-4.0']), url: cran };
  if (pkg === 'severance') return { authors: 'Isabella Velásquez', licence: L('CC BY-NC 4.0', 'Creative Commons Attribution-NonCommercial 4.0 International', LICENCE_URL['CC-BY-NC-4.0']), url: 'https://github.com/ivelasq/severance' };
  if (pkg === 'matplotlib-seaborn') return { authors: 'Matplotlib and seaborn developers', licence: L('CC0 as listed', 'Listed by PyPalettes\' LICENSE.note as CC0 / public domain (Matplotlib colormaps); seaborn palettes are BSD-3-Clause upstream', LICENCE_URL['CC0-1.0']), url: 'https://github.com/y-sunflower/pypalettes/blob/main/LICENSE.note' };
  if (MIT_PKGS[pkg]) return { authors: MIT_PKGS[pkg], licence: L('MIT', 'MIT', LICENCE_URL.MIT, ['MIT']), url: cran };
  if (GPL2_PKGS[pkg]) return { authors: GPL2_PKGS[pkg], licence: L('GPL-2.0', 'GPL-2', LICENCE_URL['GPL-2.0'], ['GPL-2.0']), url: cran };
  if (GPL3_PKGS[pkg]) return { authors: GPL3_PKGS[pkg], licence: L('GPL-3.0', 'GPL-3', LICENCE_URL['GPL-3.0'], ['GPL-3.0']), url: cran };
  if (CC0_PKGS[pkg]) return { authors: CC0_PKGS[pkg], licence: L('CC0', 'CC0 1.0', LICENCE_URL['CC0-1.0']), url: cran };
  if (APACHE_PKGS[pkg]) return { authors: APACHE_PKGS[pkg], licence: L('Apache-2.0', 'Apache License 2.0', LICENCE_URL['Apache-2.0'], ['Apache-2.0']), url: cran };
  if (NOLIC_PKGS[pkg]) return { authors: NOLIC_PKGS[pkg], licence: L('no licence', 'No licence grant (default copyright)'), url: cran };
  return { authors: pkg, licence: L('unverified', 'Not verified (a website, not a package)'), url: `https://${pkg}` };
};

// --- Matplotlib ---------------------------------------------------------------------------

const MPL_CC0 = new Set(['viridis', 'magma', 'inferno', 'plasma', 'cividis']);
const MPL_CB = new Set(['Blues', 'BrBG', 'BuGn', 'BuPu', 'GnBu', 'Greens', 'Greys', 'Grays', 'OrRd', 'Oranges', 'PRGn', 'PiYG', 'PuBu', 'PuBuGn', 'PuOr', 'PuRd', 'Purples', 'RdBu', 'RdGy', 'RdPu', 'RdYlBu', 'RdYlGn', 'Reds', 'Spectral', 'YlGn', 'YlGnBu', 'YlOrBr', 'YlOrRd', 'Accent', 'Dark2', 'Paired', 'Pastel1', 'Pastel2', 'Set1', 'Set2', 'Set3']);

export interface FamilyCredit { key: string; label: string; authors: string; licence: CollectionLicence; url: string }

export const matplotlibFamilyOf = (name: string): FamilyCredit => {
  if (MPL_CC0.has(name)) return { key: 'viridis', label: 'viridis family', authors: 'Nathaniel J. Smith, Stefan van der Walt, Eric Firing (viridis); cividis: Jamie R. Nuñez, Christopher R. Anderton, Ryan S. Renslow', licence: L('CC0', 'CC0 1.0 (BIDS/colormap)', LICENCE_URL['CC0-1.0']), url: 'https://github.com/BIDS/colormap' };
  if (MPL_CB.has(name)) return { key: 'colorbrewer', label: 'ColorBrewer maps', authors: 'Cynthia Brewer, Mark Harrower, The Pennsylvania State University', licence: L('Apache-2.0', 'Apache-Style Software License for ColorBrewer (Apache License 2.0)', LICENCE_URL['Apache-2.0'], ['ColorBrewer', 'Apache-2.0']), url: 'https://colorbrewer2.org' };
  if (name.startsWith('gist_')) return { key: 'gist', label: 'Yorick gist maps', authors: 'David H. Munro; The Regents of the University of California', licence: L('BSD-style', 'BSD-style licence for gist/yorick colormaps', undefined, ['Yorick']), url: 'https://github.com/matplotlib/matplotlib/blob/main/LICENSE/LICENSE_YORICK' };
  if (name === 'turbo') return { key: 'turbo', label: 'turbo', authors: 'Copyright 2019 Google LLC (Anton Mikhailov)', licence: L('Apache-2.0', 'Apache License 2.0', LICENCE_URL['Apache-2.0'], ['Apache-2.0']), url: 'https://gist.github.com/mikhailov-work/6a308c20e494d9e0ccc29036b28faa7a' };
  if (name === 'cubehelix') return { key: 'cubehelix', label: 'cubehelix', authors: 'Dave Green (scheme, public domain, citation requested); Matplotlib Development Team (implementation)', licence: L('public domain', 'Scheme contributed to the public domain (citation of Green 2011 requested); implementation under the Matplotlib License', undefined, ['Matplotlib']), url: 'http://www.mrao.cam.ac.uk/~dag/CUBEHELIX/' };
  return { key: 'matplotlib', label: 'Matplotlib maps', authors: 'Copyright (c) 2012- Matplotlib Development Team; All Rights Reserved', licence: L('Matplotlib License', 'Matplotlib License (PSF-style, BSD-compatible)', LICENCE_URL.Matplotlib, ['Matplotlib']), url: 'https://matplotlib.org' };
};

// --- Softology ------------------------------------------------------------------------------

/** Filename families research §3c found. The prefix is evidence of origin, not proof. */
const SOFT_PREFIXES = ['SimplexPerlin', 'Simplex', 'Perlin', 'sinpal', 'MadFractalist', 'colourlovers', 'colorschemer', 'coolors', 'kuler', 'JACCO', 'carr', 'sgg', "jack's", 'design', 'Movie', 'image'];

/** Softology filename families that are COLOURlovers palettes, whose content licence is
 *  CC BY-NC-SA 3.0 (the same as cpt-city's jjg/ccolo). Confirmed 2026-09-13: three of the 60
 *  ("Thought Provoking", "Ocean Five", "Let Them Eat Cake") match the published COLOURlovers
 *  palettes of those names colour for colour, at every swatch. */
export const SOFTOLOGY_NC_FAMILIES = new Set(['colourlovers']);

export const softologyBundleOf = (name: string): string => (SOFTOLOGY_NC_FAMILIES.has(softologyFamilyOf(name)) ? 'softology-nc' : 'softology');

export const softologyFamilyOf = (name: string): string => {
  if (/^Flame \d+_/i.test(name)) return 'Flame';
  const lower = name.toLowerCase();
  for (const p of SOFT_PREFIXES) if (lower.startsWith(p.toLowerCase())) return p;
  return 'other';
};

// --- collections -----------------------------------------------------------------------------

/** Collection key: `<bundle>:<collection>` — unique across the whole catalogue. */
export const collectionKey = (bundle: string, collection: string): string => `${bundle}:${collection}`;

/** The credit a gradient's exported name carries: small, e.g. "cpt-city/gacruxa, CC BY 3.0".
 *  A single-collection source drops the collection ("uiGradients, MIT"). */
export const creditOf = (bundle: string, collection: string | null, tag: string): string => {
  const short = BUNDLE_SHORT[bundle] ?? bundle;
  return collection ? `${short}/${collection}, ${tag}` : `${short}, ${tag}`;
};
