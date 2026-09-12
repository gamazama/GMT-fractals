# Who else does this — competitor scan for Gradient Explorer

Written 2026-09-12. Companion to `gradient-browsers.md` (which asked *how do other people build a
wall of 11,000 things*); this one asks *who else sells gradients, and what do they have that we
don't*. Desk research only — web search plus page fetches, no code touched, no traffic data (the
similarweb/ahrefs connectors are unauthenticated in this session, so every "how big" claim below is
qualitative). Feature baseline for GE is `plans/ge-v2-functionality.md`.

## 1. The one-line version

**Nobody is building what GE is.** The market splits into six clusters, and every one of them owns a
slice of GE's feature list — but the combination (catalogue of 11k + perceptual editing + image
extraction + a dozen DCC export formats + a full-screen renderer) exists in exactly one place. The
risk is not that a competitor eats GE; it is that GE is six half-products to a visitor who arrived
wanting one of them, and that the two clusters with real traffic (curated galleries, mesh/grain
background generators) are the two where GE currently has the *least* to show.

## 2. The map

### A. Curated gradient galleries — the traffic winners
[uiGradients](https://uigradients.com/), [Gradient Hunt](https://gradienthunt.com/),
[WebGradients](https://webgradients.com/), [Colorffy](https://colorffy.com/gradients),
[Grainient](https://grainient.supply/), Coolors' [gradient browser](https://coolors.co/gradients).

Two-stop linear gradients, hand-curated, copy-the-CSS. Small catalogues (WebGradients: 180.
Colorffy: "2000+ palettes and gradients". Grainient: "over 1,000"). They win on SEO and taste, not
capability. **Money:** Colorffy is $40/year; Grainient sells yearly *or* a one-time lifetime licence;
a plain grainy-gradient texture pack sells on Gumroad for $5.

> GE has 11,131 gradients — 5× the largest paid library here — and cannot be browsed by a stranger
> without loading a studio.

### B. CSS gradient editors — the craft tools
[ColorZilla's Ultimate CSS Gradient Editor](https://www.colorzilla.com/gradient-editor/) (the
Photoshop-like one, ~15 years old and still the reference),
[Learn UI Design's generator](https://www.learnui.design/tools/gradient-generator.html) (LCH
interpolation, explicitly to dodge the grey dead zone), [Coolors gradient
maker](https://coolors.co/gradient-maker), [Colorffy](https://colorffy.com/gradient-generator),
[Color Designer](https://colordesigner.io/gradient-generator), W3Schools/CSSmatic tier below that.

Multi-stop editing, a preview, CSS out. GE's stops editor is a superset of all of them (multi-select,
marquee, bracket-drag, per-stop interpolation, bias handles, four blend spaces, three output
profiles). **Nothing here has curves, adjust, variants, or a catalogue.**

### C. Palette ecosystems — the category kings
[Coolors](https://coolors.co/), [Adobe Color](https://color.adobe.com/create/image-gradient),
[Lospec](https://lospec.com/palette-list) (4,459 palettes), [Color Hunt](https://colorhunt.co/),
Khroma, Colormind.

These are palettes-first, gradients-as-a-feature. Coolors is the one to study: **$3/month billed
annually**, and Pro is sold on *export breadth* — HEX/RGB/HSB/CMYK/LAB plus RAL, HKS, Copic,
Prismacolor, plus CSS/SCSS/SVG/PDF/Tailwind, plus brand-stamped client-facing PDFs. It also has the
image picker, accessibility checking, and design-mockup previews GE doesn't.

Lospec is the information-scent lesson (already in `gradient-browsers.md`): one palette per row, each
carrying **artwork made with it**. Slow to browse, impossible to mistake what a palette does.

### D. Colour-science tools — the credibility tier
[ColorBrewer](https://colorbrewer2.org/), [Leonardo](https://leonardocolor.io/) (Adobe,
contrast-target-first), [Huetone](https://huetone.ardov.me/), [ColorBox by Lyft](https://colorbox.io/),
the OKLCH picker family ([Evil Martians](https://oklch.com/), oklch.fyi, oklchpicker.com), and the
scientific colormap world ([colorcet](https://colorcet.holoviz.org/),
[CMasher](https://github.com/1313e/CMasher), cmocean, viscm).

**ColorBox is the closest thing anywhere to GE's Curves**: hue / saturation / luminosity as editable
curves over N steps. It is a palette generator, not a gradient studio, and it has no source-fitting —
GE *fits* L/C/h curves from an existing gradient and lets you edit the fit, which I could not find
anywhere else. This tier is also where the accessibility story lives (WCAG contrast targets,
colourblind-safe filters, print/photocopy-safe) and GE has **none of it**.

### E. Background / wallpaper generators — the trend GE is missing
[Haikei](https://haikei.app/), [MagicPattern mesh
gradients](https://www.magicpattern.design/tools/mesh-gradients),
[InstantGradient](https://instantgradient.com/) (WebGL shader render, 4K PNG *and MP4*, React + CSS
export), [meshgradient.in](https://meshgradient.in/), ScreenCharm, and the Figma plugin shelf —
"Mesh Gradient" free with 194k+ users, "Mesh gradients" premium at **$9.99/year per designer /
$39.99/year per team**, Supa Mesh Gradient, Noisy Gradients.

This is the most crowded, most commercially active cluster, and it is built on the two things GE's
Wallpaper stage does *not* do: **mesh gradients and grain/noise texture**. GE's Linear / Radial /
Conic / Arch + Fractal + Liquify + Parallax + Spline is a stranger, more interesting set — Liquify
and Fractal have no equivalent anywhere I found — but a designer searching "mesh gradient" bounces.

### F. Fractal & generative-art palette tooling — the home turf
[Ultra Fractal](https://www.ultrafractal.com/) (€49 standard / €89 animation — a *paid desktop app*
whose gradient browser and .ugr sets are the direct ancestor of GE's wall),
[Chaotica](https://www.chaoticafractals.com/manual/fractal_editing/palette_editor) (palette editor =
three independent H/S/V curves, plus an **external companion app, Chaoshelper, that exists purely to
browse gradient packs and paste them back in**), JWildfire (community gradient packs distributed as
downloads), Apophysis, Fractal Architect, Fractint .map archives, Softology's 3,371 palettes.

Read Chaoshelper carefully: a whole third-party app exists because a fractal renderer's palette
browser wasn't good enough. That is GE's thesis, validated by someone else's users, in a niche that
already pays €49 for a desktop licence.

## 3. Where GE stands, feature by feature

| | GE | Best elsewhere |
|---|---|---|
| Catalogue size | 11,131, searchable, filterable, similarity-ranked | Colorffy ~2,000 (paid); Lospec 4,459 palettes; galleries 100–1,000 |
| Arrange / group / sort a wall | group-by, rows-by, sort-by any axis; lasso/box/paint carve | nobody — galleries are one infinite grid, at best a hue filter |
| "More like this" | yes | **found nowhere** |
| Stops editing | multi-select, marquee, bracket-drag, per-stop interp, bias | ColorZilla is the only comparable editor; no bias handles |
| Blend space | RGB / HSV / HSV-far / Oklab, + sRGB/Linear/ACES output | Learn UI (LCH), Tailwind (OKLCH default); ACES: nobody |
| Curves (fit L/C/h from a source, then edit) | yes | ColorBox (generate-only), Chaotica (H/S/V, no fit) |
| Adjust rack (hue rot, chroma, contrast, posterize, repeats, phase, mirror, noise) | yes | scattered one-offs; no single tool has the rack |
| Image → gradient | 3 methods (Dominant / Tones / Path) + dials | Adobe Express, Coolors, MagicPattern — one method each, dominant-colour only |
| Export formats | CSS, SVG, hex, JSON, JS, **.grd, .ai, .idml, .gpl, .ggr, .map, .cpt, .ugr**, CSV, Python | Coolors Pro (CSS/SCSS/SVG/PDF/Tailwind + print libraries). **No online tool anywhere makes .grd** — Adobe Color exports SVG/PNG only, and Adobe's own forum carries standing requests for it |
| Render / wallpaper | 8 geometries + Fractal + Liquify + Parallax + gradient map, to 4K | InstantGradient (mesh + 4K + MP4), Haikei, Figma plugins — all mesh-shaped |
| Mesh gradients | **no** | the entire E cluster |
| Dither (anti-banding) | **blue-noise TPDF at 1 LSB in the shared render tail** (`fullscreen/ditherTail.ts`), every cpuField/glQuad mode inherits it; fractal dithers in-kernel + TSAA | essentially nobody — most tools write an 8-bit canvas raw, which is why their exported PNGs band |
| Aesthetic grain (visible film-grain overlay) | **no** — the ramp has per-channel L/C/h noise along `t`, which is a different axis entirely | Grainient's whole business; Supa Mesh; Noisy Gradients |
| Animated / video export | dropped on purpose in v2 | InstantGradient MP4; animated-CSS generators |
| Accessibility (contrast, CVD simulation) | **no** | ColorBrewer, Leonardo, Coolors, Huetone |
| Variants / A-B-C-D snapshots + tween | yes | **found nowhere** |
| Community / sharing | GX global shared set, share links | Gradient Hunt, Lospec, Coolors are *built* on user submissions |
| Plugin / API surface | no | Lospec has a palettes API; Figma plugins are the distribution channel |

## 4. The four things nobody else has

Ranked by how defensible they look:

1. **The wall.** 11k gradients you can group, sort, carve with a lasso, and re-rank by similarity.
   Every competitor's answer to "find a gradient" is scrolling. This is the product.
2. **Export breadth into real tools.** .grd / .ai / .idml / .ggr / .gpl / .ugr / .map is a wall no web
   tool has climbed, and the demand is documented in Adobe's own forums. It is also the bridge to two
   audiences that already pay for software (Photoshop/Illustrator users, Ultra Fractal users).
3. **Curves fitted from a source.** Take any gradient, decompose it into L/C/h curves, edit the
   curves, re-fit. ColorBox generates from curves; nothing *decomposes* into them.
4. **Gradient → fractal, live.** The Fractal wallpaper mode is the Lightroom hover-preview pattern
   (`gradient-browsers.md` §2a) with a subject nobody else can render. It is also the only honest
   answer to "what does this gradient *do*".

## 5. The four places GE is genuinely behind

1. **Mesh and grain — but not the naive versions.** The single largest live market (cluster E) and
   GE isn't in its comparison sets. Two distinct gaps, and neither is what it first looks like:
   - *Grain* is not dithering. GE's dither is best-in-class and deliberately **invisible** (1 LSB,
     blue-noise TPDF, the tail exists so the quantiser disappears). Aesthetic grain is the opposite
     intent: visible monochrome texture at 5–20% with a size control, composited over the render.
     Same seam though — `ditherTail` already binds the blue-noise tile at unit 2 and every
     cpuField/glQuad mode passes through `wrapModeFragment`, so amplitude + scale uniforms in that
     tail is roughly the whole feature.
   - *Mesh* is a different **data shape**, not a missing mode: GE's pipeline is a 1-D ramp (256-texel
     LUT) and a mesh is a 2-D colour field that doesn't reduce to one. The off-thesis version is the
     400th blob generator. The on-thesis version places **the working gradient's own stops as points
     in the plane** — "your gradient, as a mesh" — which keeps one source of truth, fits `glQuad`
     with `uLut` already bound, and is a take nobody else can copy.
   - Worth separating the vocabulary problem from the capability problem: Liquify and Arch already
     produce soft 2-D colour fields that read as mesh-like. Nothing on the page says "mesh", so the
     search traffic never arrives. Cheaper to test than to build.
2. **No front door.** Every competitor has a URL a stranger can land on that shows gradients
   immediately and costs nothing to understand. GE loads a studio. Galleries win on SEO because they
   are *pages of gradients*; GX global is the seed of this but isn't a browsable public index.

   > **Update 2026-09-12 — GX is to be a standalone app** (owner). That converts half this gap by
   > itself: a standalone product has its own front door by definition, and the "six half-products to
   > a visitor" problem in §1 mostly dissolves once GE stops being a room inside a fractal studio.
   > What remains is narrower and still real — the wall is behind an app shell rather than a set of
   > crawlable pages, so there is still nothing for a search engine to index or a stranger to land on
   > without loading the studio. The public gradient index (§8.2) stays on the list; the framing
   > shifts from "GE needs a front door" to "GE's front door needs pages behind it".
3. **No accessibility layer *on the gradient*.** To be precise about which thing is missing: the
   **app's own chrome** is well served — `engine/store/colorSchemeStore.ts` carries a `highContrast`
   axis (surfaces to the extremes plus a higher-contrast text ladder), exposed in Settings and as
   `HighContrastToggle`. What doesn't exist is any judgement about **the gradient the user is
   making**: grep found no WCAG contrast maths and no CVD simulation anywhere in the repo. Four
   candidates, most valuable first:
   - **Monotonic-lightness check.** Does L rise monotonically along `t`? That is *the* criterion
     separating a gradient that can carry data from one that lies about magnitude (ColorBrewer,
     viscm, colorcet all gate on it). GE already computes the L curve for Curves, so the measurement
     is nearly free — and it belongs on **the wall**, not the hero: a badge per tile, a filter, and a
     sort axis across 11k. That reframes accessibility from a checkbox into the thing GE is shaped to
     do, and it opens the scientific-visualisation audience nobody is currently courting.
   - **CVD simulation of the ramp** — protan/deuteran/tritan matrices over the hero strip; answers
     "do the two ends stay distinguishable".
   - **Greyscale / print survival** — desaturate and see if it still reads.
   - **WCAG contrast readout** for text-over-gradient. Genuinely useful, least interesting to GE's
     audience; it's the one Coolors already owns.
4. **Weak information scent per tile.** Lospec's artwork-per-palette and Lightroom's preview-on-your-
   own-image both beat a 32×18 strip. GE has the renderer to do this better than anyone —
   `gradient-browsers.md` already called it the highest-leverage item on the page.

## 6. Money, for calibration

| Product | Price | What you get |
|---|---|---|
| Coolors Pro | **$3/mo** annual | unlimited saves, AI credits, export breadth, private palettes, brand-stamped PDFs |
| Colorffy premium | **$40/yr** | 2,000+ curated palettes and gradients |
| Grainient | yearly or **one-time lifetime** | 1,000+ gradients/textures, unlimited downloads |
| Figma "Mesh gradients" plugin | **$9.99/yr** per designer, $39.99/yr per team | one feature, inside Figma |
| Gumroad grainy-gradient pack | **$5** | 60 images + a displacement map |
| Ultra Fractal | **€49** / €89 animation | perpetual desktop licence, fractal studio |

The spread says two viable shapes: a cheap recurring tool subscription (Coolors' $3 anchor is brutal
for anyone charging more) or a one-time licence in the €30–70 band aimed at the fractal/desktop
audience who already pay Ultra Fractal. The Figma number is the interesting outlier — $9.99/year for
*one feature* delivered where the work happens. Distribution beats depth.

## 7. Naming

"Gradient Explorer" is taken twice, weakly: a small personal tool at
[mathiasisaksen.github.io/gradient-explorer](https://mathiasisaksen.github.io/gradient-explorer/) and
a Constructr app-template called "Color Gradient Explorer". Neither is a trademark or traffic threat,
but the phrase has no SEO headroom and describes the least differentiated half of the product. If GE
ever gets its own front door, the name should point at the wall or the render, not the verb.

> **Update 2026-09-12 — this got more important, not less.** With GX standalone, "Gradient Explorer"
> stops being a feature name inside GMT and becomes a **product name competing for its own search
> traffic**. A generic phrase, already used by two other things, competing against "gradient
> generator / maker / picker" — which is what people actually type — is a weak position to launch
> from. Still no legal issue and still not a rebrand emergency; but the naming decision now wants
> making *before* the standalone launch rather than whenever. One caveat repeated from above: this is
> an observation about search results, not a trademark search — no register was checked.

## 8. What I'd do about it

In the order I'd do them, all small relative to Phase G:

1. **Grain slider in `ditherTail`** (amplitude + scale, visible by design — *not* more dither), then
   **mesh-from-stops** as a `glQuad` mode. Joins the one crowded market GE is absent from; the first
   is a couple of uniforms in a seam that already exists, the second is the only mesh generator that
   would be about *your* gradient rather than four random blobs.
2. **A public, crawlable gradient index.** The catalogue already exists; a read-only page per
   gradient (name, strip, fractal render, copy CSS, open in GE) is the front door and the SEO play at
   once. Builds on GX global's anonymous-write pattern.
3. **Monotonic-L as a wall axis** (badge, filter, sort) before any hero-side contrast panel — it
   reuses the Curves maths, it scales to 11k, and it's the claim the scientific-colormap world
   actually checks. CVD simulation on the hero after that.
4. **Fractal thumbnails in the wall** (lazy, cached, opt-in) — the `gradient-browsers.md` §2a
   recommendation, now with the extra argument that it's the one preview no competitor can copy.
5. **Lead with export breadth in any marketing.** ".grd, .ase, .ugr, .ggr, .idml — the formats no web
   tool gives you" is the sharpest single sentence GE can say, and it aims at people who already own
   paid software.

Deliberately *not* recommending: animated/video export (dropped on purpose in v2, and InstantGradient
owns it), AI generation (Coolors has credits and scale), or a Figma plugin (right idea, wrong time —
it needs the public index to point at first).

## Sources

Galleries and editors: [uiGradients](https://uigradients.com/) ·
[Gradient Hunt](https://gradienthunt.com/) · [Colorffy](https://colorffy.com/gradients) ·
[Grainient pricing](https://grainient.supply/pricing) ·
[ColorZilla](https://www.colorzilla.com/gradient-editor/) ·
[Learn UI Design](https://www.learnui.design/tools/gradient-generator.html) ·
[Lineicons roundup](https://lineicons.com/blog/best-gradient-tools) ·
[Dopely roundup](https://dopelycolors.com/blog/top-10-css-gradient-generators-2026)

Palette ecosystems: [Coolors pricing](https://coolors.co/pricing) ·
[Coolors gradient maker](https://coolors.co/gradient-maker) ·
[Lospec palette list](https://lospec.com/palette-list) ·
[Adobe Express gradient from image](https://color.adobe.com/create/image-gradient) ·
[MagicPattern palette extractor](https://www.magicpattern.design/tools/extract-palette-from-image)

Colour science: [ColorBox](https://colorbox.io/) ·
[Lyft's coloralgorithm](https://github.com/lyft/coloralgorithm) ·
[colorcet](https://colorcet.holoviz.org/) · [CMasher](https://github.com/1313e/CMasher) ·
[Evil Martians on OKLCH](https://evilmartians.com/chronicles/oklch-a-color-picker-made-to-help-think-perceptively)

Backgrounds: [Haikei](https://haikei.app/) · [InstantGradient](https://instantgradient.com/) ·
[MagicPattern mesh](https://www.magicpattern.design/tools/mesh-gradients) ·
[meshgradient.in](https://meshgradient.in/) ·
[Figma mesh plugin roundup](https://www.wedoflow.com/post/top-5-figma-gradient-plugins)

Fractal: [Ultra Fractal shop](https://www.ultrafractal.com/shop/) ·
[Ultra Fractal gradient docs](http://ultrafractal.helpmax.net/en/gradients/opening-and-saving-gradients/) ·
[Chaotica palette editor](https://www.chaoticafractals.com/manual/fractal_editing/palette_editor) ·
[JWildfire gradients](https://www.jwfsanctuary.club/downloads/gradients/) ·
[Fractal Architect palette editor](https://fractalarchitect.net/FA_Manual/English.lproj/pgs/GradientEditorTutorial.html)

Format gap: [Adobe community, .grd from Adobe Color](https://community.adobe.com/t5/photoshop-ecosystem-discussions/grd-file-option-from-adobe-color-online/m-p/13882913) ·
[psd-grd parser](https://github.com/hi104/psd-grd)

Name collisions: [Gradient Explorer (Isaksen)](https://mathiasisaksen.github.io/gradient-explorer/) ·
[Constructr Color Gradient Explorer](https://constructr.ai/explore/color-gradient-explorer)
