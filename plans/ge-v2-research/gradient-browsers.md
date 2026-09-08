# How other people build a wall of 11,000 things — research for GE v2 Phase D

Written 2026-09-08, for the owner's open question at the head of
`plans/ge-v2-unified-shell-plan.md` §4 Phase D: *"still not happy with the browser canvas"*,
and *"should the shelf and the browser be one surface?"*

Read-only research. No code was changed. Sources are linked inline; where a site refused a
server-side fetch the claim is marked **(second-hand)**.

---

## 1. What we have, honestly

The wall is a canvas of **11,131 gradients** (`plans/ge-v2-unified-shell-plan.md` §10, Phase A
iteration 2) blitted from one shared 256×11131 sprite, drawn by `palette/components/PickerWall.tsx`
into chunked, IntersectionObserver-virtualised canvases capped at 2200 CSS px each. It opens
**Group by: None · Rows by: Lightness (10 buckets) · Sort within: Hue**, each band filled
**column-major**, tiles 32×18 px with a 1 px gap and an 8 px corner. The header
(`gradient-explorer/v2/BrowseStage.tsx`) is a 1fr·auto·1fr grid: a 360×56 hue×lightness pad centred,
a saturation strip under it, and search · Filters · clear-all right-aligned; Filters opens three
inline rows (LOOK · ARRANGE · SOURCES). Four floating tools sit top-right (zoom, box, lasso, paint),
a zoom readout with Fit bottom-right, and "More like this" re-ranks the whole wall into one
row-major band against an anchor. Below it, the shelf is a **separate 88 px footer** — `FavientsPanel
layout="strip"`, 56×30 items, dated bins (Today / Yesterday / date) plus Starred and named groups —
which pulls up to 340 px for the full panel, and which **does not exist at all until Recent has one
item**.

**My guess at what "not happy with the browser canvas" is pointing at.** Not density and not
performance — those are fine. Three things, in order of likelihood:

1. **No sense of place.** Ten lightness bands × ~1,100 tiles is roughly **6,000 px of scroll** at 1280
   wide, with **no sticky band label** (the gutter label is a right-aligned, non-sticky column that
   shrinks toward 0 on narrow walls), no scrollbar index, and **no keyboard navigation at all** (the
   only `keydown` in `PickerWall` is `[` / `]` for the paint brush). You scroll into an
   undifferentiated field and cannot get back to where you were — Shneiderman's *history* task, the
   one nobody implements
   ([*The Eyes Have It*, 1996](https://www.cs.umd.edu/~ben/papers/Shneiderman1996eyes.pdf)).
2. **The arrangement is not legible.** The default is a **hidden double-encode**: the pad's y-axis is
   lightness *and* the rows bucket by lightness *and* the fill is column-major, so the hue sort runs
   **down** each column, against the reading direction. Nothing on screen says any of this —
   `arrangeText`, the sentence that used to, "is no longer shown anywhere" (§10, Phase A iteration 3).
   A wall you cannot describe in a sentence reads as noise even when perfectly ordered. The owner felt
   this once already in miniature: the "More like this" band had to be flipped to row-major because
   "only the first column shows similar gradients".
3. **The shelf is an afterthought, structurally.** Different component, different swatch size (56×30
   vs 32×18), different scroll axis, different empty rule (hidden until non-empty) — and **none of
   the wall's power reaches it**: you cannot search your own gradients from the search box, filter
   them by hue, lasso them, or rank the catalogue against one of them. L4 and L7 are satisfied, but
   *the two surfaces are not the same kind of thing*, and the owner is right to feel it.

A fourth, smaller: the **information scent of a 32×18 gradient strip is weak** — it tells you the
colours, not what the gradient does to a fractal. Every strong library in §2 solves exactly this, and
it is the single highest-leverage thing on this page.

---

## 2. Patterns found

### 2a. The preview is the whole game

The theme running through every large library that works: **the tile predicts the result**, not the
data. Information foraging: a user judges a distal source by its proximal cue and decides whether to
enter the patch ([NN/g](https://www.nngroup.com/articles/information-foraging/)). Five shipping
solutions to the same problem:

- **[ColorBrewer](https://colorbrewer2.org/)** — a *live map* beside the schemes, with
  roads/cities/borders toggles: the palette shown doing its job. Facets are fitness-for-purpose
  (class count, sequential/diverging/qualitative, **colorblind-safe / print-friendly /
  photocopy-safe**), not aesthetics. **Transfers strongly**: our "map" is a fractal thumbnail.
- **[Lospec palette list](https://lospec.com/palette-list)** — 4,459 palettes as a *one-per-row*
  list, each carrying **example artwork made with the palette**. Facets: colour count with an
  Any/Max/Min/**Exact** mode, tag search pre-seeded with suggestions, sort (Default / A–Z /
  Downloads / Newest). The artwork makes it browsable; one-per-row (4–6 per screen out of 4,459)
  makes it slow. **Preview idea transfers; layout does not.**
- **[Lightroom](https://helpx.adobe.com/lightroom-classic/help/apply-presets.html) /
  [Capture One](https://support.captureone.com/hc/en-us/articles/360002611797-An-overview-of-Styles)
  / [Resolve](https://jayaretv.com/color/davinci-resolve-powergrade-and-gallery-explained/)** —
  hover previews the preset **on your own photo/clip**; Capture One previews across *all* browser
  thumbnails at once. Adobe had to ship a **preference to switch hover preview off because it slowed
  machines down**
  ([kb](https://helpx.adobe.com/lightroom-classic/desktop/kb/live-preset-preview-causing-system-slowdown.html))
  — a direct warning: previewing 11k gradients on a live fractal is not free.
- **[Blender's asset browser](https://docs.blender.org/manual/en/latest/editors/asset_browser.html)**
  — auto-thumbnails, but the author can **override the preview by drag-selecting any rectangle in
  Blender**. **Transfers to My Gradients**: a user gradient's tile could carry the render it was made
  for.
- **[Google Fonts](https://fonts.google.com/)** — type one preview string, **the entire library
  re-renders in it** ([design.google](https://design.google/library/reimagining-google-fonts)). The
  purest form of "make the whole wall about me", and **the strongest single idea in the research**.

### 2b. Density, tile shape, and a size control

- Professional browsers all ship a **continuous thumbnail-size control**: Resolve's slider atop the
  LUT browser, UE5's Thumbnail Size presets
  ([docs](https://dev.epicgames.com/documentation/unreal-engine/content-browser-in-unreal-engine)),
  Photos' zoom slider. Web gradient sites almost never do. We have `swatchSize` in `paletteFilters`
  but it is **not exposed anywhere in v2** — only `paddingSize` is, and only inside the zoom readout
  (C.11). Backwards: size is the knob people reach for, padding is not.
- NN/g: for **homogeneous** items use a plain image grid, not cards
  ([cards](https://www.nngroup.com/articles/cards-component/)); thumbnails must be big enough to be
  recognisable ([list thumbnails](https://www.nngroup.com/articles/mobile-list-thumbnail/)). Our
  32×18 is at the edge of that. Keep the grid, expose the size.
- **[WebGradients](https://webgradients.com/)** names all 180 of its gradients and skips search
  entirely — correct at 180, impossible at 11,131. **[uiGradients](https://uigradients.com/)** shows
  **one gradient full-viewport** with arrow-key paging **(second-hand, 403)**: perfect fidelity, zero
  overview. Our hero already *is* the uiGradients view.
- **[Krita's palette docker](https://docs.krita.org/en/reference_manual/dockers/palette_docker.html)**
  since 4.2 is a grid with **addressable positions** — a swatch stays where you put it. **Spatial
  memory beats clever ordering**; our wall's order should be *stable* under narrowing, not re-flowed.

### 2c. Facets, search, and not reaching zero

- Hearst's recommendations for hierarchical faceted search
  ([SIGIR'06 PDF](http://flamenco.berkeley.edu/papers/faceted-workshop06.pdf); the Flamenco study,
  [CHI'03](https://bailando.berkeley.edu/papers/flamenco-chi03.pdf), found 90% of participants
  preferred faceted metadata over standard search on 35,000 fine-arts images): flexible navigation,
  **seamless integration with keyword search**, fluid alternation between refining and expanding,
  **avoidance of empty result sets**, a constant feeling of control. Facets along the top suit image
  collections ([A List Apart](https://alistapart.com/article/design-patterns-faceted-navigation/)).
  **We do this well already** — pad + Filters + live count is a good faceted header, and our empty
  states offer the escape. The gap: facet state is *invisible when Filters is closed* (a count badge
  only).
- **[Substance 3D Painter](https://helpx.adobe.com/substance-3d-painter/interface/assets/navigation.html)**
  hides non-applicable folders by default (structural avoidance of empty sets) and ships
  **[saved searches](https://helpx.adobe.com/substance-3d-painter/interface/assets/saved-searches.html)**
  — a facet state turned into a named, re-openable view. **Transfers directly**: our carve + filter
  state is exactly a saved search, and today it evaporates.
- **[UE5 Collections](https://dev.epicgames.com/documentation/en-us/unreal-engine/filters-and-collections-in-unreal-engine)**
  hold *references*, not assets: one canonical order for storage, unlimited overlapping sets for use.
  **Transfers**: our named groups should be reference sets over the catalogue *and* over My
  Gradients, not a separate container.
- **Curation on top of the archive** is everywhere: cpt-city's hand-made "selection" over its author
  tree **(recollection — host down; ~7,140 gradients per
  [CRAN cptcity](https://cran.r-project.org/package=cptcity))**, [Quixel](https://quixel.com/en-US)'s
  Collections, [Adobe Color Trends](https://color.adobe.com/trends/Ui/ux) bucketed **by industry**,
  Apple Photos' Days view. **We have nothing curated** — 11,131 open as an undifferentiated dump, and
  the theme vocabulary (rainbow, fire, ocean, kaleidoscope, meadow) is reachable only through Filters
  or search (§10, Phase A iteration 1). A wasted asset.
- **[Are.na](https://help.are.na/docs/getting-started/blocks)** offers two orderings on Explore:
  chronological or **random** — the honest answer to "too many, no criteria yet". Cheap; transfers.

### 2d. Zoom as navigation

- **Apple Photos** is the mainstream survivor of semantic zoom: Years / Months / Days / All Photos are
  not the same grid at different sizes — the upper levels are an **editorially reduced set**, with
  near-duplicates, screenshots and receipts suppressed
  ([Apple](https://support.apple.com/en-us/guide/photos/pht56eafa987/6.0/mac/11.0)).
- Cockburn, Karlson & Bederson
  ([ACM CSUR 41(1), 2009](https://faculty.cc.gatech.edu/~stasko/7450/Papers/cockburn-surveys08.pdf))
  separate **overview+detail**, **zooming** (temporally separated — you lose context in the
  transition), **focus+context**, and **cue-based** (highlight/suppress in place). Our zoom tool is
  pure zooming: it costs context and gives nothing semantic back. The **cue-based** family — Furnas'
  `DOI(x) = importance(x) − distance(x, focus)` ([CHI'86](https://dl.acm.org/doi/10.1145/22627.22342))
  — is what "More like this" already is, and the better lever for us.
- **The dedup point is worth stealing.** 11,131 where several hundred are near-identical *is* noise,
  and no arrangement fixes it. We have `similarityProbe`; the same metric can fold near-duplicates
  into one tile that expands on zoom. This is **not** the cancelled idea — the owner cancelled
  *arranging the wall by a 2-D similarity embedding* (§10, 2026-09-07), not collapsing duplicates.

### 2e. Documented failure modes (what not to build)

**Infinite scroll with no position or extent** destroys "where was I" (Pinterest, second-hand) ·
**sort-by-popularity freezes the visible set** and the tail never surfaces (Lospec, Coolors) ·
**live preview at library scale is a performance liability** and may need an off switch (Lightroom) ·
**thumbnails persisted as separate files go stale** — Resolve stores a PowerGrade as `.drx` + a
`.dpx` thumbnail and shows "Media Offline" when the stills folder moves, so keep previews *derived* ·
**free tags with no controlled vocabulary drift into synonym sprawl** (Blender).

---

## 3. Browse vs Mine — five models

| # | Model | Named examples | Best when | Signature failure |
|---|---|---|---|---|
| 1 | **One surface, provenance as a facet** | Spotify's "By you / By Spotify / Downloaded" filters in Your Library ([AlternativeTo](https://alternativeto.net/news/2023/5/spotify-introduces-your-library-sidebar-for-improved-navigation-and-content-collection/)); VS Code's `@installed` in the same list as the marketplace; FontBase/RightFont All / Activated / Collections | the same verbs apply to both kinds; corpus small-to-medium | **Invisible mode.** Spotify's sticky filter can make a full library **look empty** ([community](https://community.spotify.com/t5/Ongoing-Issues/Liked-songs-appear-empty-across-devices/idi-p/7399259)). VS Code's own design issue [#68527](https://github.com/Microsoft/vscode/issues/68527) says it plainly: *"hard to distinguish among installed, recommendations and marketplace"*, and when the marketplace is unreachable the same list silently means something else ([#85555](https://github.com/microsoft/vscode/issues/85555)). Authoring actions lose an unambiguous target. |
| 2 | **Two destinations (tab / pane / window)** | Apple Music Library vs Browse; Steam Store vs Library; Unreal's Content Browser vs the [Fab window](https://dev.epicgames.com/documentation/en-us/unreal-engine/fab-window-in-unreal-engine); Unity, which **removed the in-editor Asset Store in 2020.1** leaving only "My Assets" ([manual](https://docs.unity3d.com/2020.3/Documentation/Manual/AssetStore.html)) | the two have genuinely different verbs and scales | **Two search boxes, and browse doesn't subtract.** Steam users have asked for years to exclude games they already own ([thread](https://steamcommunity.com/discussions/forum/10/618458030667494228)). Unity's split created a three-surface round trip. Modal switching cost mid-task. |
| 3 | **One canvas, zones stacked** | iOS 18 Photos collapsing four tabs into one scroll; Google Photos' "Collections" grid putting People/Places **above** Albums ([9to5Google](https://9to5google.com/2024/08/08/google-photos-library-collections-redesign/)); Lightroom's one Presets panel; Procreate's one palette list | few zones, stable order, small counts | **Loss of a stable address.** Both Apple and Google shipped this in 2024 and both were hammered; **Apple reverted to tabs in iOS 26** ([TechCrunch](https://techcrunch.com/2025/06/09/apple-brings-back-tabs-to-the-photos-app-in-ios-26)). Your zone drifts below machine-made ones; muscle memory dies. |
| 4 | **Copy-on-adopt** | Figma Community → Drafts with "(Community)" appended ([help](https://help.figma.com/hc/en-us/articles/360038510873-Duplicate-Community-files)); Notion templates → Private; UE "Add to Project" | provenance genuinely ends at adoption | **"Where did it go"** at the moment of the click, plus a **severed link** — upstream changes never arrive. |
| 5 | **Mine as a sibling container inside browse** | Resolve's PowerGrade album sitting next to Stills albums (and a user-LUT watch folder next to vendor LUT folders); Blender "Current File" vs user library; Capture One's User Styles beside Built-in | the container metaphor already exists and scope is legible | **Identical-looking siblings, different lifetimes** — Stills are project-scoped, PowerGrades are user-scoped, and saving to the wrong one loses the grade. And mine is **second class**: organising Capture One's User Styles requires moving folders on disk ([support](https://support.captureone.com/hc/en-us/community/posts/360012079397-How-do-I-organize-User-Styles)). |

**Cross-cutting rules the evidence supports, ranked by how much they bite us:**

1. **"Mine" is a *place*, not only a property.** People navigate to their own things by location
   memory; every 2024 attempt to dissolve that place into a computed canvas was reverted or
   complained at. **A unified surface must keep My Gradients addressable** — pinned, at a known edge.
2. **Never rank machine/vendor content above authored content in a shared list.** Lightroom's
   *Premium* above *Yours*; Google's People/Places above Albums; same complaint each time.
3. **Filters are modes, and a mode you cannot see is a bug.** If provenance becomes a facet, its
   state must be loud and one click from off.
4. **One verb, one meaning.** Apple Music's "favourite" meaning both *train the algorithm* and *add to
   library* generated years of threads. Our ★ means exactly one thing; keep it that way.
5. **If they stay separate, browse must subtract** — mark catalogue tiles you already own/starred.
6. **Provenance carried by a 6 px glyph difference is not carried** — Figma draws styles as circles
   and variables as squares in one picker and users still can't tell
   ([forum](https://forum.figma.com/ask-the-community-7/color-styles-not-shown-in-all-color-pickers-31448)).

---

## 4. Five proposals for our shell, ranked

### P1 — **Make the wall legible before making it bigger** (fix the browse canvas, keep the shelf)
*The owner said the canvas is wrong. Nothing below fixes that if the arrangement stays unreadable.*

```
┌ [Recent ▸ 6 of yours]  ← optional 1-row pinned band, top of the wall
├ DARK · single-hue → rainbow ────────────────────────── sticky band label
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
├ MID ────────────────────────────────────────────────
   ...                            [◧ size ▭▭▭●▭▭ ]  ← replaces Padding
   "10 lightness bands, hue across ·  1,240 of 11,131"  ← the sentence, always on
```

Five changes, all inside `BrowseStage` + `PickerWall`:
(a) **sticky band labels** — the gutter label pins to the top of the scroll box while its band is on
screen (`position: sticky` on the label column, or a floating label driven by the chunk
IntersectionObserver we already run); (b) **bring back `arrangeText`** as one quiet line beside the
count — the wall must be describable in a sentence (Phase A iteration 3 noted it went missing);
(c) **flip the default fill to row-major**, or say "down each column" in that sentence — the
"More like this" fix (C.9 era) proved column-major reads wrong; (d) **swap the Padding slider for a
tile-size slider** (`swatchSize` already exists in `paletteFilters`, it is simply not exposed) and
show it always, not only under the zoom tool; (e) **arrow-key navigation + Home/End** on the wall —
today the only key handler in `PickerWall` is `[`/`]`.
**Cost:** low, ~1 day. All additive; `usePickerModel` untouched. **Breaks:** sticky labels need the
label column to become a sibling of the canvas stack rather than a flex child of each `GroupRow`, a
real but contained change to `GroupRow`. app-gmt's overlay mounts the same wall — gate (d) behind a
prop like `tileRadius` was.

### P2 — **The fractal thumbnail** (the highest-leverage single change on this page)
Every strong library previews the preset *doing its job*. A 32×18 colour strip does not tell you what
that gradient does to a Mandelbulb. Render one small fractal orbit-trap image per catalogue entry —
offline, baked into the bundle as a second sprite sheet, so nothing renders at browse time — and let
the wall toggle **strip ⇄ render** (one button by the size slider), or show the render only on hover
and on the enlarged pick. This is ColorBrewer's map, Lospec's example artwork, and Google Fonts'
preview string, in our vocabulary.
**Cost:** medium-high. A baking script (we already have the headless formula→PNG loop —
`project_opus_render_look_loop`), ~11k × (say) 48×32 RGB ≈ 17 MB raw, well under that as WebP; a
second sprite in `usePickerModel`; a `previewMode` on `PickerWall`. **Breaks:** bundle size and the
boot path (the catalogue already costs ~8,000 extra entries before first paint, §10). Mitigate by
loading the render sheet lazily, after the strip wall is up. **Do not** live-preview on the user's
fractal — that is the Lightroom performance trap.

### P3 — **Unify: My Gradients becomes a pinned zone of the wall** (the owner's hypothesis)
```
┌ header: [hue×lightness pad]           [MINE ●] [Filters 2] [Search…]
├─────────────────────────────────────────────────────────────────────
│ MY GRADIENTS · today          ▓▓▓▓▓ ▓▓▓▓▓ ▓▓▓▓▓         ← pinned band,
│ MY GRADIENTS · starred        ▓▓▓▓▓ ▓▓▓▓▓                 never scrolls away
├─────────────────────────────────────────────────────────────────────
│ DARK   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
│ MID    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                ← the catalogue
```
Mine becomes `PickerRow`s at the head of `m.rows` — so search, the hue pad, Filters, zoom, carve and
"More like this" all apply to your own gradients for free, and L7 stops being a convention and starts
being structural. The footer goes; `mineOpen`'s 340 px full panel becomes a dialog reached from a
"manage" affordance (import/export/rename still need `FavientsPanel`).
**Concretely:** a favient → `CatalogEntry` adapter (`renderStopsToRamp` + `computeFacets(ramp)`, both
already exist), rows reserved at the **head** of the sprite so a save repaints 256×N of an
over-allocated canvas instead of rebuilding all 11 MB; a `pinned` flag on `PickerRow` so `PickerWall`
renders those bands in a non-scrolling header stack; and a **MINE** toggle in the header that is
loud when on (rule 3 above).
**Cost:** high, 2–3 days. **What it breaks / risks:** (i) the **write target** problem — with one
list, "what does ★ mean here, and what does drag-to-a-group mean" needs an answer (VS Code #68527 is
the warning); (ii) **your things must never be outranked** by the catalogue (rule 2) — hence *pinned*,
not "first band, then scrolls away"; (iii) the **Apple Photos revert** is the direct
counter-evidence: dissolving a place into a canvas cost addressability, and Apple undid it in iOS 26.
The pinned-band form is specifically designed to keep the place while gaining the powers. (iv) The
strip's 56×30 items become wall tiles at the wall's size — the shelf loses its own scale, which the
owner may or may not want.

### P4 — **Keep them separate; make the shelf a real zone with the wall's powers**
The conservative version of P3, and the one I would ship if P3 feels like a rewrite. The footer stays
where it is (a place, addressable, at a known edge — rule 1), but gains: the header's **search filters
the shelf too** when the shelf has focus, or a small search of its own; a **★-only / all** toggle;
**"more like this" from a shelf item ranks the catalogue** (the anchor already accepts any gradient —
`similarityAnchorRamp` takes a `GradientConfig`, so this is nearly free); and the wall **marks tiles
you already have** with the ★ glyph (rule 5 — Steam's most-requested missing feature). Also fix the
two smaller wrongs: the shelf should occupy its space even when empty (an outline saying what lands
here), because appearing-from-nowhere furniture is worse than an empty shelf, and its dated bins want
the same `ZoneLabel` treatment the wall's bands get.
**Cost:** low-medium, ~1 day. **Breaks:** nothing structural. `FavientsPanel` is shared with GMT main
— every addition must be a prop, per the C.8/`tileRadius` precedent.

### P5 — **A curated front door + saved views**
Two things every large library has and we do not. (a) **The wall does not open on 11,131.** It opens
on a curated shortlist — the theme vocabulary we already have (rainbow, fire, ocean, kaleidoscope,
meadow) as a row of chips under the pad, each a band of ~40 hand-or-metric-picked exemplars, with
"show all 11,131" one click away. This is cpt-city's *selection*, Quixel's *Collections*, Adobe's
*Trends by industry*. It also rescues the theme vocabulary, which §10 records as currently reachable
only through search. (b) **Saved views** — a filter+carve state you can name and reopen, which is
Substance's saved searches and which also gives Shneiderman's missing *history* and *extract* tasks a
home. Bonus: **Random** as an arrange option (Are.na), the honest answer to "too many, no criteria".
**Cost:** (a) low if the exemplar picking is metric-based, medium if hand-curated (an editorial job,
not a coding one). (b) medium — needs a new persisted store. **Breaks:** nothing; both are additive.
Risk: a curated front door hides the tail, the documented cost of every popularity-sorted library.

---

## 5. If I had one day

**P1, entirely, plus the free half of P4.** In order:

1. **Sticky band labels** and **the arrange sentence back on screen**, always visible next to the
   count. Two hours. This is the largest legibility win per line changed, and it directly answers "no
   sense of place" and "the arrangement is not legible".
2. **Expose `swatchSize` as a tile-size slider** in the wall's bottom-right chrome (moving the
   Padding slider behind it or out), always available rather than only under the zoom tool. Every
   professional browser has this knob and ours is hidden. One hour.
3. **Arrow keys + Home/End** on the wall, and the selected tile scrolling itself into view. One hour.
4. **Mark catalogue tiles you have already starred** with the same ★ glyph the shelf uses, and
   **allow a shelf item to become the "More like this" anchor**. Two hours, mostly wiring — and it is
   the cheapest possible demonstration of what unification would feel like, which is exactly the
   evidence the owner needs before committing to P3.

Then walk it. If, after those four, the wall still feels wrong, the problem is the **tile** and not
the layout — and the answer is P2, the fractal thumbnail, which is a bake job rather than a shell
job. I would not start P3 until P1 has been walked: P3 is a 2–3 day structural change premised on the
wall being good enough to host the shelf, and today it is not.

**What I would not do:** re-propose a similarity-embedded 2-D wall (cancelled by the owner,
2026-09-07), or a single canvas that dissolves My Gradients into a scrolling zone with no fixed
address — that is precisely the design Apple and Google both shipped in 2024 and Apple reverted.
