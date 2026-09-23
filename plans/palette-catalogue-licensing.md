# Palette catalogue licensing: what the sources require, what GX does, and the gap

> **This is not legal advice.** It summarises what each source's own licence text says, what the
> code does today, and where the two differ, so the owner can act or take it to someone qualified.
> Where a licence text does not settle a question, it goes in the open questions at the end rather
> than getting an answer here.

Researched 2026-09-13. Read-only: no source file was changed.

**How the numbers were made.** I re-ran steps 1–3 of `debug/bake-palette-catalog.mts` (load,
64-sample signature, global dedup by source priority) against
`H:/GMT/stuff/palette-lab/out/catalog_v2.json`, without writing anything. It reproduces the
shipped per-bundle counts exactly (the `counts` object inside `public/palette/core.json.gz`):
11,131 survivors. cpt-city entry names keep their archive path (`00000_arendal__arctic`), so each
survivor maps back to its archive's `COPYING.xml`. PyPalettes `.map` files are numbered by CSV row
(`import_bundles.py`), so each maps back to the `source` column of `h:/tmp/dl/pypalettes.csv`.
The CDN bundles are live: `cptcity.*` and `softology.*` all return 200 from
`cdn.gmt-fractals.com/palette/`, dated 2026-06-03.

---

## 1. The problems that need attention now

1. **256 cpt-city gradients are CC BY-NC-SA 3.0**: the `jjg/ccolo/*` archives, which are COLOURlovers
   users' palettes. They are served publicly from the CDN and, since v2, loaded at boot on desktop
   (`gradient-explorer/v2/registerFeatures.ts`, grep `PACKS_OFF`). Their own metadata marks them
   `distribute="noncomm"`.
2. **137 cpt-city gradients are marked not for redistribution** (`distribute="no"`): `jjg/neo10`
   (135, derived from Neota's gradients) and `td` (2). The importer ignored the flag.
3. **The manifest's "QGIS-audited redistributable subset" label is wrong.** `import_cptcity.py` converts
   every SVG under `h:\tmp\cptsvg` (the same archive set as QGIS's `cpt-city-qgis-min` package) and
   reads the `<distribute>` element nowhere. Two more archives carry terms that sit awkwardly with an
   aggregated catalogue:
   - **`es`** (ElvenSword, 690): its licence text says "Do not Rip/Merge with other artists work" and
     asks that the files travel with the original previews.
   - **`jm`** (Jim Mossman, 45): a personal, non-transferable licence that allows redistribution
     only to clients for their internal use, and requires a set attribution sentence in a Help/About box.
4. **The core pack is tracked in the public GPL-3 repo and is described as clean, but it is not.**
   `.gitignore` and the bake header both say core is "MIT/Apache/BSD/CC0". Core's 2,609 PyPalettes
   gradients come from a package that is **GPL-3 as a whole**, with mixed upstream licences. Among them:
   - **7 are CC BY-NC 4.0** (`severance`).
   - **117 come from packages with no licence at all** (calecopal, LaCroixColoR, DresdenColor,
     waRhol, NineteenEightyR, musculusColors).
   - 16 are CC BY-SA 4.0 (`unikn`) and 32 are CC BY 4.0 (CARTOColors, through `rcartocolor`).
5. **`credits_cptcity.json` is not served anywhere GX can reach.** It exists only at
   `H:/GMT/stuff/palette-lab/bundles/credits_cptcity.json`, holding authors and a one-line informal
   licence per archive, with no licence URLs or texts. The About box points to it by name. So nearly
   every licence below that requires credit is not met at the level of the author or archive.

Also worth knowing, though not urgent: the local palette-lab repo tracks `bundles/cptcity.zip` and
`softology.zip`, and its remote `github.com/gamazama/GMT_gradients` is **public but empty**. Pushing
that repo as it stands would publish the NC and no-redistribution archives a second time.

---

## 2. Inventory: what is in the catalogue

| Bundle | In GX | Ships from | Licence the code carries (`bundles/manifest.json`, baked into every `.json.gz`) | Real source it was imported from |
|---|---:|---|---|---|
| cpt-city | 4,701 | CDN `cdn.gmt-fractals.com/palette/cptcity.*` (gitignored) | "per-collection redistributable subset (QGIS-audited)" | `h:\tmp\cptsvg` = QGIS `resources/cpt-city-qgis-min`, minus `cb` |
| Softology pack | 3,354 | CDN `softology.*` (gitignored) | "free use (aggregated, mixed provenance)" | `H:\GMT\workspace-gmt\Palettes\*.MAP` (Visions of Chaos palettes) |
| PyPalettes | 2,609 | repo `public/palette/core.*` (tracked) | "per-source (aggregated; see source)" | `h:\tmp\dl\pypalettes.csv` |
| uiGradients | 377 | repo core | "MIT" | `h:\tmp\dl\uigradients.json` |
| Matplotlib | 55 | repo core | "BSD (matplotlib) / CC0 (viridis family)" | every non-`_r` `plt.colormaps()` entry |
| ColorBrewer | 35 | repo core | "Apache-2.0" | `h:\tmp\dl\colorbrewer.json` |
| **Total** | **11,131** | | | |

Separate from the catalogue, the 20 seed gradients in `public/palette/gxglobal.json` are GMT's
built-in presets (`data/gradientPresets.ts`). Two of them carry third-party terms:
- "Spectrum" is exactly CARTOColors *Prism*, which is CC BY 4.0.
- "Turbo" is Google's Apache-2.0 colormap.

---

## 3. Obligations by collection

Key: **Attr** = must credit · **Text** = must include the licence text, or its URL where the licence allows that · **Restr.** = NC, ND, SA or another restriction.

### 3a. cpt-city (4,701, CDN)

Each archive has its own `COPYING.xml`. Counts are survivors in GX.

| Class | Archives (survivors) | Count | Attr | Text | Restr. | What GX does | Gap |
|---|---|---:|---|---|---|---|---|
| **CC BY-NC-SA 3.0** | `jjg/ccolo/*` (19 COLOURlovers users: evad 35, lightningmccarl 23, sugar 21, alpen 20, vredeling 20, Skyblue2u 18, adgrapho 16, angelafaye 15, electroluv 12, drumma 11, katiekat013 11, hana 9, laleh1979 8, smorin2002 8, phill 7, rphnick 7, Bionic_Blender 5, rotten 5, tvr 5) | 256 | yes (author, per user) | licence URL with every copy | **NC + SA**; `distribute="noncomm"` | One line: "cpt-city contributors" | No per-author credit and no licence URL. NC content ships in a GPL-3 project's public deployment. |
| **Not for redistribution** | `jjg/neo10` 135, `td` 2 | 137 | — | — | `distribute="no"` ("Free to use", no licence text) | Served on the CDN | Distributed against the archive's own flag |
| **Restrictive custom** | `es` ElvenSword 690 | 690 | yes, "required for distribution" | — | no merging with other artists' work; keep original previews | "cpt-city contributors" | The catalogue is arguably the merge the text forbids. Needs a decision or the author's permission. |
| **Restrictive custom** | `jm` Jim Mossman (ESRI ShadeMax) 45 | 45 | yes, a set sentence in a Help/About box | keep the agreement with unmodified copies | personal, non-transferable; redistribution to clients only | nothing | Grant does not appear to cover public redistribution |
| **GNU "Free License 1.2"** | `nd` Nevit Dilmen 886 | 886 | yes | full licence text with copies (if GFDL) | copyleft | "cpt-city contributors" | Labelled "GPL" but the text names "GNU Free License, Version 1.2", most likely the GFDL. No text shipped. |
| **CC BY 3.0** | `gacruxa` 861, `bhw` Blackheartedwolf 295 | 1,156 | yes: author, title, source link | licence URL with every copy | none | "cpt-city contributors" | No per-author credit and no licence URL |
| **CC BY-SA 3.0 / 4.0** (+1 GFDL/SA) | `wkp/*` 42 (country 19, schwarzwald 4, strat 4, lilleskut 3, precip 2, tubs 2, ice 1 [GFDL+SA], jarke, knutux, life, mars, plumbago, shadowxfox, stat 1 each), `gps` 15, `ssz` 13 (4.0), `heine` 7, `fvl` 3 | 80 | yes | licence URL | **SA** on adaptations | "cpt-city contributors" | No credit or URL. SA status of edited or exported gradients is unresolved. |
| **GPLv2 / GPL / LGPL** | `ggr` GIMP 73, `kst` 39, `grass` 28, `gmt` 26, `jjg/haxbyish` 25, `idv` LGPL 24, `pm` 23, `saga` 22, `ds9` 12, `fme` 4, `ngdc` 2, `mby` 1 | 279 | notices | licence text | copyleft; GPLv2-only is not GPLv3-compatible | nothing | No notices. v2-only inside a GPL-3 app is an open question. |
| **Apache-like** ("As Cynthia Brewer") | `jjg/cbac` 207, `jjg/serrate` 207, `jjg/cbcont` 27, `jjg/polarity` 9 | 450 | yes | licence | no endorsement | nothing | No notice |
| **MIT / BSD-like / NCL / OGL** | `ncl` UCAR 73, `cmocean` 22, `h5` 16, `cividis` 7, `gist` 5, `nord` 4; OGL: `ukmo` 5, `os` 2, `pn` 1, `wesson` 1 | 136 | yes (copyright notice; OGL has a set statement) | notice + disclaimer | no endorsement (NCL, cividis) | nothing | No notices |
| **Free, credit or link requested** | `go2` GoSquared 83, `rafi` 44, `ds` Diane Simoni 39, `esdb` 19, `arendal` 4 (credit required when published), `fg` 2 (credit + link when distributed), `rf` 1 | 192 | requested (required for `arendal`, `fg`) | — | none | nothing | Courtesy credit missing, and two archives require it |
| **Public domain** | `ocal` 91, `km` Moreland 84, `imagej` 61, `dca` 60, `pd` 56, `tp` 10, `jjg/dem` 9, `dg` 6 (citation requested), `jjg/misc` 6, `wkp/gay-flag` 3, `wkp/template` 3, `jjg/physics` 2, `wkp/encyclopedia` 2, `gery` 1 | 394 | no (`dg` asks for a citation) | no | none | — | none |

### 3b. PyPalettes (2,609, **in the repo**)

The package is GPL-3 "as a whole", and its `LICENSE.note` lists a copyright holder and licence per
source. Licences for upstream packages missing from that note come from CRAN metadata or the
package's GitHub `DESCRIPTION`.

| Upstream licence | Packages (survivors) | Count | Attr | Text | Restr. | Gap |
|---|---|---:|---|---|---|---|
| MIT | palettetown 389, beyonce 130, nbapalettes 128, lisa 123, pals 82, colRoz 53, MoMAColors 35, trekcolors 35, ghibli 27, ltc 23, wesanderson 22, NatParksPalettes 20, futurevisions 20, MexBrewer 18, werpals 17, nord 16, harrypotter 16, ochRe 16, rtist/vangogh/tayloRswift/IslamicArt 15 each, soilpalettes 14, vapoRwave 13, miscpalettes 12, feathers 10, awtools 6, dutchmasters 6, RSkittleBrewer 5, tidyquant 3, colorblindr 1 | 1,300 | copyright notice | MIT text | — | No notices |
| GPL-2 / GPL (≥2) / R base | fishualize 175, ggthemes 143, grDevices 57, palettesForR 41, yarrr 21, dichromat 17, colorBlindness 17, jcolors 12, vapeplot 6, basetheme 5 | 494 | notices | GPL text | copyleft | as for GPLv2 above |
| GPL-3 | tvthemes 56, ggprism 56, khroma 51, ggsci 48, ButterflyColors 29, impressionist.colors 24, Manu 21, rockthemes 21, ggthemr 15, suffrager 6, palr 4 | 331 | notices | GPL text | copyleft (same licence as GMT) | notices |
| CC0 | MetBrewer 56, PrettyCols 26, nationalparkcolors 25, peRReo 21, PNWColors 13, ggpomological 2 | 143 | no | no | — | none |
| matplotlib/seaborn built-ins | (the CSV labels them this way; `LICENSE.note` says CC0) | 117 | see Matplotlib | | | see below |
| Apache-2.0 | Redmonder 41, oompaBase 7, Polychrome 2 | 50 | yes | licence | — | No notice |
| **CC BY 4.0** | rcartocolor 32 (package code MIT; CARTOColors palettes are CC BY 4.0) | 32 | yes | licence URL | — | No credit |
| **CC BY-SA 4.0** | unikn 16 | 16 | yes | licence URL | **SA** (one-way compatible with GPLv3) | No credit |
| **CC BY-NC 4.0** | severance 7 | 7 | yes | licence URL | **NC** | **NC content committed to a GPL-3 repo** |
| **No licence** | calecopal 45, LaCroixColoR 20, DresdenColor 18, waRhol 15, NineteenEightyR 12 (joke licence), musculusColors 7 | 117 | — | — | **no grant at all** | Default copyright; no permission to redistribute |
| Unknown (websites) | wanteeed.com 1, data-to-viz.com 1 | 2 | ? | ? | ? | unverified |

The About box says "PyPalettes / paletteer, per-source (aggregated; see source)", which is not
enough to meet any of the notice or credit requirements above.

### 3c. Softology pack (3,354, CDN)

| What the source says | Attr | Text | Restr. | What GX does | Gap |
|---|---|---|---|---|---|
| Jason Rampe's blog: "No copyright on them so do with them as you wish." The same post says some were made by him, some "found on various Internet sites over the years", and some converted from gradient packs. | none by Rampe | none | none by Rampe, but third-party material inside keeps its own terms | Credits "Jason Rampe / Visions of Chaos (aggregated)". The palette-lab zip carries a good-faith note, which is not shipped. | Rampe cannot waive rights he doesn't hold. The filename prefixes show where much of it came from (next table). |

Surviving Softology files by filename prefix. The prefix is evidence of origin, not proof.

| Prefix | Count | Likely origin and its terms |
|---|---:|---|
| `Flame NNN_<name>` | 698 | The palettes in `flam3-palettes.xml` (701 entries, same names, e.g. `000 south-sea-bather`), from the flam3 repo, which is GPL-3.0. Needs a GPL notice and credit to Scott Draves / flam3. |
| `carr` | 318 | unknown |
| `JACCO` | 150 | unknown |
| `kuler` | 130 | Adobe Kuler (now Adobe Color) user themes, under Adobe's terms. Unverified. |
| `MadFractalist` / `sgg` / `jack's` / `design` / `Movie` / `image` | 107 / 102 / 95 / 88 / 66 / 62 | unknown |
| `colourlovers` | 60 | COLOURlovers, whose API content is CC BY-NC-SA 3.0 (same as `jjg/ccolo`). **Likely NC.** |
| `colorschemer` / `coolors` | 48 / 31 | third-party palette sites, terms unverified |
| `Perlin` / `Simplex` / `SimplexPerlin` / `sinpal` | ~260 | look procedurally generated, probably Rampe's own |

Exact matches with other bundles are negligible: 2 signatures overlap cpt-city and 1 overlaps PyPalettes, mostly trivial stripes.

### 3d. uiGradients, Matplotlib, ColorBrewer (core, in repo)

| Collection | Count | Licence (source) | Attr | Text | Restr. | What GX does | Gap |
|---|---:|---|---|---|---|---|---|
| uiGradients | 377 | MIT, "Copyright (c) 2017 Indrashish Ghosh" | copyright notice | MIT permission notice in "all copies or substantial portions" | — | "uiGradients contributors · MIT" plus link | Copyright line and MIT text not shipped. The holder is named wrongly as "contributors". |
| Matplotlib | 55 | Matplotlib License for the package. viridis, magma, inferno, plasma and cividis are CC0 (BIDS). The 55 also include ColorBrewer-derived maps (Accent, Dark2, Paired, Pastel1/2, Set1–3; Apache), Yorick `gist_*` (BSD-style, notice required), `turbo` (Apache-2.0, © 2019 Google LLC) and `cubehelix` (Dave Green, public domain, citation requested). | Matplotlib notice; per-map notices | Apache-2.0 (turbo, CB maps), Yorick notice | — | "Matplotlib developers; viridis/magma by Smith & van der Walt · BSD / CC0" | The Yorick, Google and ColorBrewer notices are missing. The "BSD" label is loose (the actual licence is PSF-style). |
| ColorBrewer | 35 | Apache-2.0 (axismaps/colorbrewer `LICENCE.txt`; Matplotlib's `LICENSE_COLORBREWER`: © 2002 Brewer, Harrower, Penn State) | yes: retain copyright and attribution notices | Apache-2.0 text or URL | no endorsement | Credit plus "Apache-2.0" | Copyright line and licence text not shipped |

---

## 4. What GX does today (evidence)

| Surface | What it shows | Where |
|---|---|---|
| About box (v2) | One entry per bundle, only for loaded groups: label, count, the `attribution` string, the `license` string, a link. Marked "OWNER REVIEW… drafts". | `gradient-explorer/v2/help/AboutGx.tsx` |
| Filters ▸ Sources | Bundle label, count, a tooltip with attribution and licence, ↗ link; a "licensed source" dot on the CDN packs | `palette/components/PickerControls.tsx` `PickerBundleToggles` |
| Wall hover preview | `· <theme> · <bundle id> · L … vivid …`, i.e. the raw id `cptcity`, with no archive, author or licence | `palette/components/PickerWall.tsx` (grep `hover.entry.bundle`) |
| Arrange by source | Band labels are bundle labels | `palette/core/pickerModel.ts` `bundleLabel` |
| Hero / working gradient | No source line | `gradient-explorer/v2/WorkingHero.tsx` (no `bundle` reference) |
| Shelf (favourites, Keep these N) | `source: 'Picker'` or `'Browse · <theme>'`. **The bundle is dropped.** | `palette/components/usePickerModel.ts`, `gradient-explorer/v2/BrowseStage.tsx` `keepThese` |
| Exports (.map/.ggr/.cpt/.grd/.ase/CSS/JSON/Python/C4D/Blender/.ai…) | Colours, plus a name at most (often the literal `gradient`). **No source or licence in any format.** | `palette/core/exportFormats.ts` (no licence, credit or copyright strings) |
| Share link | Stops, name and colour spaces. No source. | `gradient-explorer/v2/shareUrl.ts` |
| GX Global | POSTs stops and the two colour spaces only (`submitToGlobalSet`); anyone can share the working gradient, including an unedited catalogue entry. No source, name or terms line. | `palette/core/globalSet.ts`, `BrowseStage.tsx` `shareToGlobal` |
| app-gmt Palettes overlay | Same wall (`PickerStage`, which shows the bundle id beside the selection). `AboutGmtBody` credits none of the catalogue. | `app-gmt/PalettePickerOverlay.tsx`, `app-gmt/HelpExtras.tsx` |
| Load default | v2 desktop loads Softology + cpt-city at boot; phones get core only. Either way the CDN files can be fetched by anyone. | `gradient-explorer/v2/registerFeatures.ts` |
| Licence and attribution files | None shipped. `ATTRIBUTION.txt`, the licence texts and `SOURCES.csv` exist only inside the palette-lab zips (`bundles_pack.py`). | — |

---

## 5. What the licences require, applied to GX's surfaces

**Where attribution has to appear.**
- **CC BY 3.0** requires credit to the author, the title and the source link, plus a copy of or link
  to the licence with every copy. The credit may be "in any reasonable manner". In a collection's
  credit list it must be at least as prominent as the other credits.
- **CC BY 4.0 and BY-SA 4.0** are similar, and explicitly allow a link to a page that carries the credits.
- **MIT, BSD, Apache and GPL** attach to *copies*: the notice has to travel with the redistributed data.
  For a web app that most plausibly means a credits/licences page served next to the bundles, and a
  licence file inside anything downloadable.
- **OGL v3** requires the set statement: "Contains public sector information licensed under the Open
  Government Licence v3.0."
- None of these texts requires a credit on every tile. A per-archive credits page linked from About
  and from the hover/hero source line is the pattern the licences describe. Per-gradient display
  is a convenience, and it helps with SA and NC (see below).

**Licence text.** GPL (v2 and v3), Apache-2.0, MIT/BSD notices, and GFDL (if `nd` is GFDL) all
require the text or notice to accompany copies. The CC licences accept a URL.

**Share-alike.**
- CC BY-SA 3.0 and 4.0 define a **Collection** (the work unmodified, alongside other works) as *not*
  an Adaptation. A catalogue that shows a gradient as published is most naturally a Collection.
- When a user edits a BY-SA gradient and exports or shares it, the result is plausibly an Adaptation
  and carries SA. That duty falls on whoever distributes the adaptation, but GX could make it
  visible by carrying the licence into the export.
- **CC BY-SA 4.0 is designated one-way compatible with GPLv3; BY-SA 3.0 is not** (CC's compatible
  licences page). The 80 cpt-city SA gradients are mostly 3.0.
- Whether GX's resample to 256 texels and stop refit counts as an adaptation is open. The CC 3.0
  grant includes "modifications as are technically necessary" to change format, which may cover it.

**NC in a GPL-3 open-source project.**
- CC BY-NC-SA 3.0 and BY-NC 4.0 restrict use "primarily intended for or directed toward commercial
  advantage or private monetary compensation".
- None of the licence texts reviewed here mentions donations, so donations play no part in this analysis.
- The real tension is structural. GPL-3 promises every recipient the right to redistribute and sell
  the program, but NC content cannot be relicensed under GPL-3 and does not carry those freedoms.
- For the 7 `severance` gradients inside `core.*`, which is tracked in the GPL-3 repo: anyone who forks
  the repo and uses it commercially inherits an NC violation they cannot see. Only a separate licence
  notice on that data could keep the two licences apart.
- The CDN-only NC content (256 `jjg/ccolo`, and likely 60 Softology `colourlovers`) is not in the repo,
  but it is served by the public deployment of a GPL-3 app.

**No licence or not for redistribution.** 117 PyPalettes gradients have no licence grant, and 137
cpt-city gradients carry `distribute="no"`. Neither licence text gives permission to redistribute.

**GX Global.**
- Anonymous sharing lets a user republish a catalogue gradient to everyone, edited or not, with no
  name, source or licence attached. For CC BY, BY-SA and GPL sources, that loses the attribution
  and licence the source requires. For NC, no-licence and no-redistribution sources, it repeats the
  redistribution.
- The endpoint has no terms line ("you confirm you have the right to share this"), and no provenance
  follows the gradient from the wall into the working pipeline.
- Separately, the seed set's "Spectrum" (CARTOColors Prism, CC BY 4.0) needs credit.

**Colours may not be copyrightable, but that is not a basis to act on yet.**
- US regulation lists "mere variations of typographic ornamentation, lettering or coloring" as not
  copyrightable (37 CFR 202.1(a)).
- CC states its licences apply only where copyright applies.
- If palettes as data are not protected, several obligations above could fall away. Hand-made art
  gradients (ElvenSword, Gacruxa, Nevit Dilmen, Neota) are the likeliest to be protected, and EU/UK
  database rights may cover the compilations. This is question 1 for a lawyer, not a working assumption.

---

## 6. Actions, in priority order

Rough effort in brackets. Anything that rebakes depends on `H:/GMT/stuff/palette-lab`, `h:\tmp\cptsvg`
and `h:\tmp\dl`, none of which is in the repo.

1. **Take the NC, no-redistribution and no-licence sets off public distribution until decided** [2–3 h].
   - Add a denylist to `debug/bake-palette-catalog.mts`, keyed by name prefix for cpt-city and by CSV
     `source` for PyPalettes, covering `jjg/ccolo/*`, `jjg/neo10`, `td`, `severance` and the six
     no-licence packages.
   - Rebake, commit `core.*`, and re-upload `cptcity.*` to R2.
   - Expect roughly −393 from cpt-city and −124 from core. Dedup could then bring back a duplicate
     from another source, so re-check the counts.
   - Decide about `es` (690) and `jm` (45): drop them, or write to the authors.
   - Git history keeps the old `core.*` blobs (see open question 11).
2. **Correct the labels that claim clean licences** [1 h].
   - Replace the manifest's "QGIS-audited redistributable subset".
   - Replace PyPalettes' "per-source" with "GPL-3 package; per-source upstream licences".
   - Fix the `.gitignore` comment and the bake header that call core "MIT/Apache/BSD/CC0".
   - Replace uiGradients' "contributors" with the actual copyright holder.
3. **Generate and serve a real credits file per pack, and link it from About in GX and app-gmt** [1 day].
   - Build `credits.<group>.json` (or HTML) in the bake: per archive or package, list authors, the
     formal licence name, the licence URL, source links and the survivor count.
   - Sources: `COPYING.xml` (with `<text href>` and `<src>`), PyPalettes `LICENSE.note` plus the CSV,
     flam3 and the Softology prefixes, and the notices for core.
   - Ship full texts where required (GPL-2, GPL-3, Apache-2.0, GFDL-1.2, MIT/BSD/Yorick/NCL notices,
     the OGL statement) next to the bundles, and link it from `AboutGx.tsx` and `AboutGmtBody`.
   - This replaces the missing `credits_cptcity.json`.
4. **Record provenance per gradient in the bake and show it** [½–1 day].
   - Add a `src` key to each entry (cpt-city archive path, PyPalettes upstream package, Softology prefix)
     and a licence-class code.
   - Show "archive · author · licence ↗" in the wall hover and on the hero while the working gradient
     is an unedited catalogue entry.
5. **Carry provenance through the shelf and into exports** [1–2 days].
   - Store `bundle` + `src` on favourites instead of `'Picker'` / `'Browse · theme'`.
   - Write a source + licence comment or field wherever the format allows (`.ggr`/`.cpt`/`.gpl`/CSS/JSON/
     Python/scripts: comment lines; `.ase`/`.grd`: the name field), or add a `LICENSE.txt` to zipped
     collection exports.
   - Needed for BY-SA and GPL sources, and it makes SA visible to users.
6. **GX Global** [½ day, after 4–5].
   - Refuse or warn when the working gradient derives from an NC, no-licence, restrictive or SA
     catalogue entry.
   - Add a one-line terms statement to the share action.
   - Credit CARTOColors for the "Spectrum" seed, or re-derive it.
7. **Audit Softology's origins by prefix** [½ day of research, then decisions].
   - Flame → credit flam3 (GPL-3.0).
   - `colourlovers` (60) → treat as NC; `kuler` (130), `colorschemer`, `coolors` → check those sites' terms.
   - The unknown prefixes → keep them on Rampe's statement, or ask him directly.
8. **Resolve the GPLv2-only and GFDL questions** before or together with action 3, since they decide
   whether ~280 cpt-city and ~490 PyPalettes GPLv2 entries, and the 886 `nd` gradients, need anything
   beyond notices.

---

## 7. Open questions for a qualified person

1. Are colour palettes and gradients protected by copyright at all, under US law (37 CFR 202.1(a)),
   in the owner's jurisdiction, and for hand-made art gradients? Do EU/UK database rights attach to
   the compilations? If not, which obligations above still bind as contract, if any?
2. Is resampling to 256 texels and refitting stops a format change ("technically necessary
   modifications") or an Adaptation under CC 3.0 and 4.0? Does the answer change once a user edits the gradient?
3. Can NC-licensed content be served by the public web deployment of a GPL-3 project, kept as
   separately licensed data (the GPL-3 §5 "aggregate" idea), or must it be kept out entirely? Does
   the answer differ between the repo (`core.*`) and the CDN?
4. Are GPLv2-only data files (GIMP, GMT, KST, SAGA and others) shipped inside a GPL-3 app a
   "combined work" or an aggregate? The GPL FAQ treats v2-only and v3 as incompatible for combined works.
5. What licence is `nd` (Nevit Dilmen, 886) actually under? Labelled "GPL", its text names the "GNU
   Free License, Version 1.2". If it is the GFDL, what does including the licence text require for a web catalogue?
6. Does including CC BY-SA 3.0 gradients (which have no GPL compatibility designation) in the
   catalogue impose anything on GX beyond credit and the licence URL?
7. ElvenSword's terms (no merging with other artists' work, keep original previews): does a mixed
   catalogue breach them even with credit? Is written permission needed?
8. Jim Mossman's ShadeMax licence: does it allow public redistribution in any form?
9. When a user exports or shares a catalogue gradient through GX Global, are the attribution and SA
   obligations GX's, the user's, or both? Is an in-app notice enough?
10. How far can Jason Rampe's "no copyright" statement be relied on, given that the pack contains
    material he says came from elsewhere?
11. After removing restricted entries from `core.*`, do the old blobs in the public GitHub history
    have to be purged, or is stopping distribution going forward sufficient?
12. Low priority: palette **names** that point at trademarks or people (palettetown/Pokémon 389,
    nbapalettes 128, trekcolors, harrypotter, tayloRswift, beyonce, severance, LaCroixColoR). Names
    only, but worth a sentence from someone qualified.

---

## Sources

- cpt-city archive licences: each archive's `COPYING.xml`, read locally from `h:\tmp\cptsvg` and
  mirrored in QGIS at `https://github.com/qgis/QGIS/tree/master/resources/cpt-city-qgis-min`, e.g.
  `.../jjg/ccolo/evad/COPYING.xml` (BY-NC-SA 3.0, `distribute="noncomm"`), `.../jjg/neo10/COPYING.xml`
  (`distribute="no"`), `.../es/COPYING.xml` (ElvenSword's distribution rules). Archive index:
  http://seaviewsensing.com/pub/cpt-city/
- CC BY-NC-SA 3.0 legal code (NC definition, Collection vs Adaptation): https://creativecommons.org/licenses/by-nc-sa/3.0/legalcode
- CC BY 3.0 legal code (§3 technical modifications, §4 licence URI and credit): https://creativecommons.org/licenses/by/3.0/legalcode
- CC compatible licences (BY-SA 4.0 → GPLv3 one-way; none for BY-SA 3.0 or BY-NC-SA): https://creativecommons.org/share-your-work/licensing-considerations/compatible-licenses/
- CC on material not covered by copyright, and data: https://creativecommons.org/faq/ and https://wiki.creativecommons.org/wiki/Data
- 37 CFR 202.1 (material not subject to copyright): https://www.law.cornell.edu/cfr/text/37/202.1
- GPL FAQ (v2/v3 compatibility; mere aggregation): https://www.gnu.org/licenses/gpl-faq.html#v2v3Compatibility and #MereAggregation
- OGL v3 attribution statement: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- Softology on the palettes ("No copyright on them…"): https://softologyblog.wordpress.com/2019/03/23/automatic-color-palette-creation/
- flam3 palettes (GPL-3.0 repo): https://github.com/scottdraves/flam3/blob/master/flam3-palettes.xml
- COLOURlovers API content licence (BY-NC-SA 3.0; the page returned 403 to the fetcher, so this rests on
  search results plus cpt-city's `jjg/ccolo` metadata): https://www.colourlovers.com/api
- PyPalettes (GPL-3 as a whole; per-source `LICENSE.note`): https://github.com/y-sunflower/pypalettes/blob/main/LICENSE.note
- paletteer (GPL-3; `LICENSE.note`): https://github.com/EmilHvitfeldt/paletteer/blob/main/LICENSE.note
- Upstream R package licences: CRAN metadata via https://crandb.r-pkg.org/<package>, and each GitHub
  `DESCRIPTION` (e.g. https://github.com/ivelasq/severance, CC BY-NC 4.0; https://github.com/an-bui/calecopal, no licence)
- CARTOColors (CC BY 4.0): https://github.com/CartoDB/CartoColor
- uiGradients (MIT, © 2017 Indrashish Ghosh): https://github.com/ghosh/uiGradients/blob/master/LICENSE.md
- ColorBrewer (Apache-2.0): https://github.com/axismaps/colorbrewer/blob/master/LICENCE.txt; Matplotlib's copy: https://github.com/matplotlib/matplotlib/blob/main/LICENSE/LICENSE_COLORBREWER
- Matplotlib License: https://github.com/matplotlib/matplotlib/blob/main/LICENSE/LICENSE; Yorick notice: `.../LICENSE/LICENSE_YORICK`
- mpl-colormaps CC0: https://github.com/BIDS/colormap/blob/master/LICENSE.txt
- Turbo (Apache-2.0, Google): https://gist.github.com/mikhailov-work/6a308c20e494d9e0ccc29036b28faa7a

---

## What was done — 2026-09-13

The owner's decisions that afternoon, carried out the same day. Nothing was committed, pushed,
uploaded to R2 or deployed to Supabase: every step below that reaches the outside world is
listed under "What is left for the owner" and was **not** run. Still not legal advice; the tags
below summarise each source's own text.

### Counts per pack, before and after

Survivors after the global dedup are unchanged at **11,131** — separating the restricted sets
did not bring any other copy back (the dedup priority now ranks every restricted bundle below
every clean one, grep `PRIORITY` in `debug/palette-packs.mts`).

| Pack | Before (live v1) | After (v2) | Ships | Publish |
|---|---:|---:|---|---|
| core | 3,076 (uiGradients 377, ColorBrewer 35, Matplotlib 55, PyPalettes 2,609) | **2,952** (PyPalettes 2,485: −7 severance, −117 no-licence) | repo `public/palette/` | `repo` |
| softology | 3,354 | 3,354 | R2 | `cdn` |
| cptcity | 4,701 | **3,573** (−256 jjg/ccolo, −137 neo10 + td, −690 es, −45 jm) | R2 | `cdn` |
| noncommercial | — | 263 (jjg/ccolo 256, severance 7) | R2 only if published | `optional` |
| elvensword | — | 690 | R2 only if published | `optional` |
| mossman | — | 45 | R2 only if published | `optional` |
| unpublished | — | 254 (jjg/neo10 135, td 2; calecopal 45, LaCroixColoR 20, DresdenColor 18, waRhol 15, NineteenEightyR 12, musculusColors 7) | `H:/GMT/stuff/palette-lab/out/unpublished/` only | **`false`** |

### 1. The restricted sets are separated

- `debug/palette-packs.mts` (new) is the licence model: `PACKS` with a `publish` field, the
  cpt-city classifier (`cptcityBundleOf` — `distribute="noncomm"` / `"no"` read from each
  `COPYING.xml`, ElvenSword and Mossman by name), the PyPalettes classifier (`PYPAL_NC`,
  `PYPAL_NO_LICENCE`), per-collection licence tags and credits.
- `debug/bake-palette-catalog.mts` (rewritten) reads every `COPYING.xml` and the PyPalettes CSV
  itself, writes one file pair per pack, writes `publish:false` output outside `public/`, and
  names no unpublished bundle in any file the app loads.
- `palette/core/catalogLoader.ts` `PALETTE_GROUPS` gains `noncommercial`, `elvensword` and
  `mossman` with `optional: true`. The unpublished pack is not registered at all.
  `gradient-explorer/v2/registerFeatures.ts` still turns on only softology + cptcity at boot.
- **How a person reaches an optional pack:** Filters ▸ Sources, below the divider "Optional
  packs — their own licences, off unless ticked": "cpt-city · COLOURlovers (CC BY-NC-SA 3.0)",
  "PyPalettes · severance (CC BY-NC 4.0)", "cpt-city · ElvenSword (own terms)",
  "cpt-city · Jim Mossman (own terms)". Ticking fetches the pack from the CDN, then the local
  base. Until the owner publishes one, the fetch 404s and the box stays unticked. app-gmt's
  Palettes overlay uses the same toggles.
- `public/palette/core.*` re-baked: no severance and no no-licence gradient remains.
- `.gitignore` ignores the three optional packs and the CDN packs' credits.

### 2. Misleading labels corrected

- palette-lab `bundles/manifest.json` is the single source of truth. It gains a short `tag` per
  bundle and entries for the six separated bundles. uiGradients → "Copyright (c) 2017 Indrashish
  Ghosh"; PyPalettes → "GPL-3.0 package; each palette keeps its upstream R package's licence …";
  cpt-city → "Each archive keeps its own licence … restricted archives separated" (no more
  "QGIS-audited redistributable subset"); Softology → "Free use as published by Jason Rampe …
  origins unverified".
- palette-lab `import_bundles.py` no longer overwrites the manifest with the old strings;
  `import_cptcity.py`'s docstring and default entry no longer claim an audited subset;
  `bundles_pack.py`'s MIT notice names Indrashish Ghosh and its cpt-city note says what the
  archive set really is. The already-committed palette-lab zips still carry the old ATTRIBUTION
  text until `bundles_pack.py` is re-run.
- App: the `.gitignore` palette block, the bake header, and the `catalogLoader.ts` /
  `pickerStore.ts` / `PickerControls.tsx` headers ("clean, redistributable core" is gone).

### 3. Credits per pack

- The bake writes `credits.<pack>.txt`. Per collection it lists the credit, authors, licence name
  and URL, source links, notes and the archive's verbatim `COPYING.xml` notice. At the end come
  the verbatim licence texts that ask to travel with copies: MIT, Apache-2.0, GPL-2.0, GPL-3.0,
  LGPL-2.1, Matplotlib, ColorBrewer, Yorick. CC, CC0, OGL and GFDL are given by URL. The bake also
  writes `credits.<pack>.json` (the same, structured). The texts were copied verbatim from local
  files into `H:/GMT/stuff/palette-lab/licences/` (`SOURCES.txt` there says where each came from).
- `credits.core.txt` (109 KB) and `credits.core.json` ship in `public/palette/` (tracked). The
  CDN packs' credits are part of the upload set. This replaces the never-served
  `credits_cptcity.json`.
- GX About (`gradient-explorer/v2/help/AboutGx.tsx`) names each source by its category name. A
  "Credits & licences: core · softology · cptcity" line links every loaded pack's file
  (`getGroupCreditsUrl`, resolved against the base the pack came from). app-gmt About
  (`app-gmt/HelpExtras.tsx`) adds one line, "Gradient catalogue: credits & licences", plus a link
  for any other loaded pack.

### 4. Provenance in the category names

- Format v2 is additive: per-bundle `tag`, per-entry `src`, a `collections` table (`label`, `tag`,
  `credit`) and a `credits` file name. v1 files still load. Manifests merge by version, so a v1
  file still on the CDN cannot put the old labels back (`catalogLoader.mergeManifest`).
- `palette/core/catalogOrigin.ts` `categoryName` is the one formatter. It is used by the Sources
  toggles (`PickerControls.tsx`), the wall's bands (`usePickerModel.ts` → `pickerModel.arrangeRows`
  `bundleLabel` and the new `collectionLabel`), the search index and About.
- Arrange ▸ Group by gains **Collection**, appended at enum index 3 so saved indices keep their
  meaning: one band per archive, package or family.
- Real names from the baked files: "uiGradients (MIT)", "ColorBrewer (Apache-2.0)",
  "PyPalettes (per package)", "cpt-city (per archive)", "Softology (unverified)". Collection bands:
  "cpt-city · gacruxa (CC BY 3.0)", "PyPalettes · nord (MIT)", "Matplotlib · viridis family (CC0)",
  "Softology · Flame (unverified)". Optional: "cpt-city · COLOURlovers (CC BY-NC-SA 3.0)".
- Left alone on purpose: the wall's hover line (still the raw bundle id) and the old shell's
  PickerStage. The owner asked for no per-tile provenance UI.

### 5. Exports carry the source only while unmodified, in the name

- A wall pick or drag stamps a `CatalogOrigin` `{ ref, credit, key }` on the config it produced
  (`entryOrigin`); `key` is the config's `originKey`. The origin then rides along:
  `FavientDragPayload.origin` → the working `gradient` input (`workingStore.use(..., { origin })`,
  kept through undo and session coercion, and through a fold via `bakedFrom`) →
  `Favient.origin` (`add`, `collectRecent`, `insertFavient`, `insertMany`, the ♥, "Keep these N",
  shelf drops).
- `gradient-explorer/v2/exportActions.ts` is the one place names are formed. `runExport` applies
  `exportNameFor(name, origin, config)` (ramp subject); `runSetExport` / `runSetImage` apply
  `withExportName` per member. The credit counts only while the gradient still has the stamped
  key. Any edit, Adjust dial, Curves pass or in-place Recent refresh drops it, with nothing to
  clear. The filename keeps the credit whole (`creditedFileStem`); uncredited downloads keep
  `slugName` exactly.
- Examples: a pick of PyPalettes' "snowstorm" exports as `snowstorm (PyPalettes/nord, MIT)`, file
  `snowstorm_PyPalettes_nord_MIT.json`. A cpt-city gacruxa gradient exports as
  `<name> (cpt-city/gacruxa, CC BY 3.0)`. After one Adjust dial it is `snowstorm` /
  `snowstorm.json`, as before.
- Where the name lands inside the file: .json, .ai, .idml, .ugr, .ase, the C4D / Blender scripts,
  and (as an identifier) Tailwind, design tokens and CSS variables. `.ggr` and `.gpl` write the
  literal `Name: gradient` today and were left alone, because changing them would change every
  export, modified or not. .map, .cpt, .csv, .hex, .css, .svg, .js, .py, .pdn and .grd have no
  name field, so the filename carries it.
- Old favourites have no `origin` and export exactly as before. The bundle they came from was
  never stored, so it cannot be recovered. The swatches subject is never credited: a palette
  sampled at positions the user laid out is a derivative.

### 6. GX Global refuses unedited catalogue gradients

- For every survivor of every pack (published or not), the bake computes the stops a pick sends
  (`entryToGradientConfig`), canonicalises them exactly as the function does and hashes them to
  16 hex characters. It writes the sorted set twice: `public/palette/catalog-sigs.json` (tracked,
  178 KB, 11,129 unique hashes) and `backend/supabase/functions/gx-gradients/catalog-sigs.ts`.
- Client: `palette/core/catalogSigs.ts` (the mirror canonicaliser, the hash and a lazy loader) and
  `gradient-explorer/v2/contributeToGlobal.ts`, which checks before the confirm and toasts
  "That one is straight from the catalogue — GX global only takes gradients you made or changed.
  Edit it first." If the list cannot be fetched, the contribution proceeds and the server decides.
- Server: validation, signature, hash and the check moved into a pure
  `supabase/functions/gx-gradients/validate.ts` (`judgeSubmission`). `index.ts` returns
  `409 { code: 'IN_CATALOGUE' }` before the dedupe. The GET leaves out rows whose signature is in
  the list; older rows stay in the table, unserved. The list is bundled with the function: no
  table, no migration, no new secret. README updated.
- None of the 20 `gxglobal.json` seeds is refused.

### 7. Guards

- `debug/test-palette-catalog-licensing.mts` (`npm run test:palette-licensing`, the last link of
  `test:palette`) covers the pack model against the app, the classifiers, the baked files, merge
  by version, category names, export names and origin carriage. It also checks the client/server
  mirror and the function's own verdict on real core picks, importing the backend's `validate.ts`
  by path. Falsified ten ways, listed in its header.
- `smoke:ge-hero` [8] checks export names on real downloads; [9] checks the GX global refusal
  with the endpoint intercepted. `smoke:ge-ground` [12] checks the Sources names, the optional
  packs and the band headers. `smoke:ge-phone` [11] checks that About links the core credits and
  that the link resolves. Each was falsified; see the headers.
- `.claude/rules/palette.md` gains the four licensing seams and the guard row.

### What is left for the owner

1. **Upload (not run).** From `backend/`: `node upload-palette-r2.mjs --dry-run`, then
   `node upload-palette-r2.mjs`. That sends 8 files: `softology.{bin,json}.gz`,
   `cptcity.{bin,json}.gz` and `credits.{softology,cptcity}.{txt,json}`. Sizes and sha256 are in
   `debug/palette-upload-manifest.json`, and the script refuses a file whose hash differs. The
   script now reads that manifest instead of the dead `dev/public/palette` path. Until this runs,
   the live CDN still serves the old `cptcity.*` with the separated archives in it.
   **Cache:** the old objects were uploaded `immutable, max-age=31536000`. Purge
   `cdn.gmt-fractals.com/palette/*` in Cloudflare after the upload. A browser that already cached
   the old file keeps it unless the file names are versioned, which is a decision.
2. **Publish the optional packs or not.** `--with noncommercial`, `--with elvensword` and
   `--with mossman` each publish one. Nothing publishes them by default.
3. **The unpublished pack** exists only in `palette-lab/out/unpublished/`, for the signature list.
   Its terms give no permission to redistribute; delete it or keep it local.
4. **Deploy the function (not run).** From `backend/`, run `supabase link --project-ref
   ehoacsxzeruhajosexzb` if needed, then `supabase functions deploy gx-gradients
   --no-verify-jwt`. Re-deploy after every re-bake. To check: POST the stops of an unedited wall
   pick (in the app's devtools, `JSON.stringify(__gxWorking().config.stops)`) and expect 409
   IN_CATALOGUE.
5. **Commit and push.** The app repo: core pack, credits, sig list, code. The backend repo:
   `validate.ts`, `catalog-sigs.ts`, `index.ts`, README, the upload script. palette-lab is local
   only: manifest, scripts, `licences/`. **Never push palette-lab:** it still tracks
   `bundles/cptcity.zip` and `bundles/pypalettes.zip` with the NC and no-licence data.
6. **Git history (open question 11):** the old `public/palette/core.*` blobs with severance and
   the 117 no-licence gradients remain in the public GitHub history. No rewrite was attempted.
7. **Not separated, still to decide:** Softology `colourlovers` (60, likely NC), `kuler` (130),
   `colorschemer` (48) and `coolors` (31); the CC BY-SA sets (cpt-city 80, unikn 16); the
   GPLv2-only and `nd` (GFDL?) questions; the "Spectrum" seed's CARTOColors credit.
8. **Smaller calls:** `.ggr` and `.gpl` exports write `Name: gradient` whatever the name, so the
   credit reaches them only through the filename. A user-renamed but unmodified gradient still
   carries the credit. The signature check assumes the stop fit is bit-identical across browsers
   (`@assumption` in `catalogSigs.ts`).

### Update — 2026-09-13, second pass (owner review)

The owner's stance: "we just want to do our due diligence, we're not seeking to police people's
use of gradients." Same hard limits as the first pass: nothing committed, pushed, uploaded or
deployed.

**Pack counts, first pass → second pass.** Survivors are still 11,131; the signature list is
still 11,129 hashes and still covers every pack, the unpublished one included.

| Pack | First pass | Second pass | Publish |
|---|---:|---:|---|
| core | 2,952 | 2,952 | repo |
| softology | 3,354 | **3,294** (−60 COLOURlovers) | cdn |
| cptcity | 3,573 | 3,573 | cdn |
| elvensword | 690 (optional, "cpt-city · es") | **690, its own named pack** | **cdn** |
| noncommercial | 263 | **323** (jjg/ccolo 256, severance 7, Softology COLOURlovers 60) | optional, **now uploaded** |
| mossman | 45 (optional) | — (pack removed) | — |
| unpublished | 254 | **299** (jjg/neo10 135, td 2, no-licence R packages 117, Jim Mossman 45) | false |

**The publish switch.** `palette/core/catalogPacks.ts` `PACK_PUBLISH` is now the one table both
the bake and the app read. `catalogLoader.PALETTE_GROUPS` is derived from it
(`paletteGroupsFrom`), so withdrawing a pack is one value (`false`) plus a re-bake. The bake
then writes that pack to `palette-lab/out/unpublished/`, deletes its stale files from
`public/palette/`, leaves it out of the upload manifest, and keeps its gradients in the
signature list.

**Non-commercial sets: kept, published, off by default.** The owner held the removal, then
decided to keep them. `noncommercial` is a separate, labelled, credited pack. It is in the
default upload set: `upload-palette-r2.mjs` no longer has `--with`, and it uploads every `cdn`
and `optional` pack. In the app it stays OFF, under "Optional packs" in Filters ▸ Sources, and
it stays out of the repo's core. Its category names carry the licence: "cpt-city · COLOURlovers
(CC BY-NC-SA 3.0)", "PyPalettes · severance (CC BY-NC 4.0)", "Softology · COLOURlovers
(CC BY-NC-SA 3.0)".

*The owner's reasoning, recorded as given:*
- The Gradient Explorer is free and non-commercial.
- Every gradient is credited and licence-tagged.
- An unmodified export carries its licence in its name.

So the NC and SA terms are met in good faith. (This is the owner's position, not legal advice.)

**Softology's `colourlovers` family (60): confirmed and moved.**
- The Softology `.MAP` files carry no metadata, and the COLOURlovers site and API returned a
  Cloudflare challenge, which was not bypassed.
- Confirmation came from the colours instead. Three of the 60 — "Thought Provoking", "Ocean
  Five" and "Let Them Eat Cake" — contain every colour of the COLOURlovers palettes of those
  names exactly (0 difference per channel at every swatch). "Thought Provoking" is listed with
  those colours in collections of COLOURlovers palettes (e.g.
  https://gist.github.com/dsparks/978827).
- The other 57 are moved on the strength of the shared `colourlovers` filename prefix.
- They are now bundle `softology-nc`, in the non-commercial pack. `SOFTOLOGY_NC_FAMILIES` in
  `debug/palette-packs.mts` is the switch.

**ElvenSword: its own named, published pack.**
- It is labelled "ElvenSword" everywhere: bundle `elvensword`, category "ElvenSword (free with
  credit)", export credit "ElvenSword, free with credit", and About (which reads the same
  manifest).
- It loads at boot on desktop with softology and cptcity. `registerFeatures` now loads every
  published non-core, non-optional pack from the registry. Phones stay core-only as before.
- It is in the default upload set.
- `credits.elvensword.txt` names the artist, links the DeviantArt gallery
  (http://elvensword.deviantart.com/gallery/) and the author's approval journal, and quotes the
  distribution terms. The archive's full `COPYING.xml` text follows word for word.
- **The "do not distribute my resource files without original preview" clause cannot be met
  literally.** A web catalogue draws its own swatches and has no previews to carry. Shipping the
  work as its own pack under the artist's name — never merged into another collection — with
  the credit in the category name, the credits file and About, plus a link to the gallery, is
  the good-faith equivalent.

**Jim Mossman: dropped.**
- `jm` (45) is in `unpublished`. The `mossman` pack is gone from `PACK_PUBLISH`, the app, the
  upload manifest, Sources and About.
- The bake deleted its old files from `public/palette/`.
- The "Optional packs" divider stays, because `noncommercial` is still under it.

**GX Global as a catalogue source.**
- **Before:** GX Global gradients reached a wall only as their own ground — the rail's GX
  global chip, via `useGroundSource` → `membersOfMany` — and never on All. All is exclusive, so
  that ground and All never share a wall.
- **Now:** GX Global is also a LIVE SOURCE (`catalogLoader.registerLiveSource`, registered in
  `palette/registerPaletteUI.ts`, so app-gmt's Palettes overlay gets it too). It appears in
  Filters ▸ Sources between the packs and the optional divider as "GX Global (shared by
  users)". "shared by users" says what it is. It is not a licence tag, because the gradients
  are user-made.
- **Toggle:** ticking it adds the set to the All wall through `pickerStore.setGroupLoaded`,
  like a pack; unticking removes it. It is off by default, never loaded at boot, and not
  remembered.
- **Not shown twice:** entries are copies (the rail's ground draws the same cached bodies with
  its own rows), ids keep the `gx-global:` prefix, and the All wall is the only place they are
  added.
- **Contributions:** the source re-loads when the set changes.
- **Failure — disabled, not hidden:** when the set cannot be loaded at all (endpoint, CDN copy
  and shipped copy all fail), the row stays visible but unticked, with its checkbox disabled, a
  count of "—" and a title saying it could not be loaded. So the list does not change shape.
  (The shipped `gxglobal.json` fallback means this is rare.)
- **No credit:** `userMade` keeps a GX Global gradient out of export credits.

**Upload set, not run.** `node upload-palette-r2.mjs` now sends 16 files: the `.bin.gz`,
`.json.gz`, `credits.*.txt` and `credits.*.json` of softology, cptcity, elvensword and
noncommercial. Sizes and hashes are in `debug/palette-upload-manifest.json`. The Cloudflare
cache note from the first pass still applies. No Supabase change in this pass: the signature
list is unchanged, so the function deploy steps above stand as written.

**Guards.**
- `test:palette-licensing` gains:
  - the publish switch;
  - no Mossman;
  - ElvenSword as its own pack, labels and credits;
  - the COLOURlovers family;
  - the upload set;
  - a new section [9] on live sources.
  Six new breaks, each falsified (listed in its header).
- `smoke:ge-ground` [12] now checks ElvenSword, GX Global and the divider. [12b] ticks GX
  Global against an intercepted two-gradient set and sees exactly +2 and −2 on the All wall.
  [12c] aborts every GX Global request and sees the row disabled. Four breaks, each falsified.

**Still open for the owner:** the Cloudflare purge after upload; the git-history question; the
Softology `kuler` / `colorschemer` / `coolors` families and the CC BY-SA sets; `.ggr` / `.gpl`
names.

---

## Owner decision, 2026-09-23 — the release posture

GX 2.0.0 is a casual open-source release: on gmt-fractals.com, not marketed. The owner chose the
minimum defensible posture over a legal review:

- **Kept as live:** per-source credits (About, the `credits.<pack>.*` files, the category names);
  the non-commercial pack off by default; the no-redistribute sets never shipped.
- **Added:** a credit line in GX's About for the built-in presets (CARTOColors CC BY 4.0 — six
  of the twenty seeds are exact CARTOColors palettes; ColorBrewer Apache-2.0 — "Rainbow
  Divergent" is Spectral; Google's Turbo Apache-2.0), and a takedown line (credit differently or
  remove on request, via Send Feedback or a GitHub issue). Guarded in `smoke:ge-phone` [11].
- **Closed without action:** the Softology families with unverified terms (kuler 130,
  colorschemer 48, coolors 31) and the possibly-GFDL Nevit Dilmen set stay, covered by the
  takedown path; CC BY-SA share-alike falls on whoever redistributes an edited copy and the
  credits state the licence; GPLv2-only sets ship as separately licensed data beside GPL-3.0 code;
  §7's twelve questions are not taken to a lawyer; §7 q11 (old blobs in git history) — no rewrite.
- **Revisit if** the Explorer gets real traffic, a rights holder writes in, or it is ever sold.
