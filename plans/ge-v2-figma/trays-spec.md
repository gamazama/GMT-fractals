# Phase C — the trays, for the Figma pass

Written 2026-09-07 after Phase B closed (`hero-spec.md` §7–7g is the hero's record; the plan's
§4 Phase C and §8 entry of the same date are the brief). Same loop as the hero: **draw one frame,
I read it by node, port it, measure it.** Sibling files: `ref-tray-*.png`, five 2× plates of the
five states as they are TODAY (1280×800, top bar + hero + what opens beneath). They are
"before" pictures, not proposals.

The Figma file is "GE v2 Hero" (`uylQa6kaWZPmBwTrahGXzR`). The connector ran out of Starter-plan
tool calls while creating the "Trays (Phase C)" page — if that page does not exist when you open
the file, duplicate `Hero v3 (agreed)` into a 1280×800 shell and draw the tray under it; I will
pick it up by node name.

---

## 1. The one rule

**One thing open under the card at a time.** Mix, Image, Curves, Adjust and the stop inspector
are five faces of ONE surface: it hangs from the card's bottom edge, floats OVER the wall (the wall
never moves, the shelf never moves — L6), and Esc closes it (Esc order: disarm → close tray →
close popover). Opening one closes the other. Nothing else on screen changes places (L3).

Today they are three different things — two source TABS that swap the whole ground (Mix, Image),
two expanders that push the wall down (Curves, Adjust), and an inspector that also pushes the wall
down (the stop's colour picker). All five become the tray. The three source tabs are deleted.

What the tray is NOT: a second hero. The hero keeps the name, the state, the palette, the ramp and
the outputs; the tray only holds what the *current* face needs.

## 2. Where it hangs

- Anchored to the card's bottom edge, inside the 24 px gutter (x = 24 … 1256 at 1280 wide), top
  corners square (it grows out of the card), bottom corners 20 like the card.
- Floating surface language (V1): `surface/section`, hairline `line` @20 %, one shadow.
- Its own vertical padding and the card's bottom edge are the only things between the ramp and
  the tray's content — the ramp's Curves ▾ / Adjust ▾ row (see §3) is the tray's TAB ROW.
- Height is the face's own; it never pushes the shelf. On a 680-tall window the wall is what
  shrinks (that is the L6 test on the walk).

## 3. What opens it

The ramp's control row today reads `Curves ▾  Adjust ▾  blend Oklab  output Linear  ≡`. That row
becomes the tray's tab row, and gains the two source faces:

    Mix ▾   Image ▾   Curves ▾   Adjust ▾          blend Oklab · output Linear · ≡

- A tab with its tray open is the ACTIVE tab (accent — V3 "this one"); clicking it again closes.
- The stop inspector has no tab: selecting a stop (a click on a knot, or on a palette swatch)
  opens it; Esc or clicking empty ramp closes it. If a tab tray is open when a stop is selected,
  the inspector replaces it (one at a time), and closing the inspector returns to nothing, not
  to the previous tray.
- The image slot on the hero's left ALSO opens the Image face (L3: the slot is the image's home).
- Mix, when opened, arms band B (today's behaviour): the next wall / shelf click fills B. The
  wall must stay visible under the tray for that — the tray is a strip, not a pane, for Mix.

## 4. The five faces, as they are today (content inventory)

Measured from the plates; heights are what each face costs today, all of which currently pushes
the wall.

### Mix  (`ref-tray-mix.png`)
The recipe is already in the HERO: the two source bands A · B over the ramp with the crossfade
line between them (SourceBands). The tray holds only what is left:
- **Swap** (A ↔ B), **Split by channel ▾** (opens three faders: Lightness · Chroma · Hue, each
  A→B, `MixBlend`, 60 px), and a sentence: "Picks fill band B. Click band A above to fill A
  instead. Drag the line between them to blend." / "Band A takes the next pick … Esc cancels."
- Today's Mix TAB also re-renders the whole Browse wall under that row. In the tray that goes:
  the wall is already there, underneath.
- Height today: one 40 px row (+ 60 px with Split open). The tray can be that thin.

### Image  (`ref-tray-image.png` — empty; with an image it is the biggest face)
- Method chips **Dominant · Tones · Path** + **Replace image** at the right.
- The method's dials (`AutoFeaturePanel paletteImage`): Dominant = colours · saliency;
  Tones = tonal detail · chroma boost · band width · smoothing; Path = catmull-rom · golden hour ·
  spacing · reverse. Standard GMT sliders (V4).
- The image pane (`ImageStage` bare): the image with the Path handles and its Draw / Auto /
  Straight toolbar, and the rotatable OKLab colour cloud beside it.
- Dominant's swatch row ("click to copy").
- Empty state: "drop an image anywhere, or click to open" — the hero's source band already says
  "image · drop one on the slot"; the tray should not say it twice.
- This is the ONE face that grows to a pane (L6). Decide its max height (60 % of the window?)
  and whether it scrolls inside.

### Curves  (`ref-tray-curves.png`)
- Row: **Fit from source** · **Curves off/on** · **Reset** · Detail slider (2–10) · Smooth
  slider (0–10) · a caption "Detail and Smooth are the fit recipe; the faint ghost previews a
  re-fit."
- Under it the channel graph (`ChannelGraphEditor`, 240 px tall, full width): L · C · h curves
  over the working base with the prospective-fit ghost; before a fit, a 120 px empty box that
  says "Fit from source to make the lightness, chroma and hue curves editable."
- Height today: ~300 px. The sliders are the engine's generic range inputs, not the standard
  GMT slider (V4 wants the standard one).
- Curves as a split-hero mode (design §13 item 4): when curves are on, the ramp shows the source
  band over the result like Mix does. That part is hero, not tray, and already works.

### Adjust  (`ref-tray-adjust.png`)
- Two columns of standard GMT sliders. **Modify:** Hue rotate (−180…180) · Chroma × (0…2.5) ·
  Contrast (0.2…2.5) · Posterize bands (0…16) · Repeats (1…8) · Phase (0…1). **Noise:** Amount ·
  Frequency · Targets (lightness · chroma · hue toggles).
- Each slider today carries a description line under it (the per-slider box V4 retires in v2 —
  `hints: 'tooltip'` exists on AutoFeaturePanel and is not yet opted into here) and keyframe
  diamonds (`keyframes: false` exists too). Both are one prop each.
- Height today: ~330 px for eight sliders with descriptions. Without descriptions, ~200.

### Stop inspector  (`ref-tray-inspector.png`) — Phase E restyles the insides; Phase C hosts it
- Left column: the tab row items stacked (Curves ▾ · Adjust ▾ · blend · output · ≡) — this goes
  once the tab row is the tray's own.
- The colour picker (`EmbeddedColorPicker`): swatch · hex input · copy · eyedropper; a
  Saturation × Value field with a hue strip; six channel sliders R G B / H S B with numeric
  readouts; four harmony rows (Analog · Mono · Comp · Split); Recent; Palette (= the hero's
  working palette — one palette, not two).
- Interpolation (Smooth / Linear / Step) is on the stop's right-click menu, not here.
- Height today: ~230 px. It is the densest face and the one in a foreign dialect (GMT main's).
  Phase C only decides its box; Phase E decides what stays — the plan already leans to dropping
  the harmony rows in strip chrome.

## 5. What to decide in the frame

1. The tab row: is it the ramp's control row (as in §3) or a row of its own at the tray's top
   edge? Either way it is one row, and the blend / output / ≡ items move to its right end.
2. The tray's padding and the tab row's relationship to the card's bottom edge.
3. Mix as a strip (one row) vs the other faces: does the tray have two heights, or one min height?
4. Image's max height and scrolling.
5. Whether the stop inspector, opened by a click on the ramp, should visually point at the stop
   (a notch, an outline on the knot) or just appear.
6. The empty states: Curves before a fit, Image without an image — one sentence each, or none.

## 6. Rules carried from the hero (do not re-argue)

Large rounding on every gradient bar (10) · radius 8 on pressables · 20 on containers · the less
text on screen the better (no zone labels; captions only where they change what you do) · accent
only for "this one" · the standard GMT slider everywhere (V4) · one icon set (filled Material,
adopted in Phase G) · 24 px gutter · 4 px grid.

---

## 7. Where to draw it (2026-09-07, after Figma's connector limit)

The Figma connector's Starter-plan call limit ended the Figma loop. The tray is drawn on a
Claude Design canvas instead — **https://claude.ai/code/artifact/02580b66-3f8e-4dbe-ba11-b64e53141384**
("GE v2 Tray"): the shell with the tray open on Adjust, one artboard per remaining face (Mix ·
Curves · Stop inspector · Image), and the five "before" plates beside them. Edit in place and
Save; I read the saved version back and port it. Sources: `plans/ge-v2-canvas/` (`gen.py` builds
the artboards from the hero's real tokens and measurements; `_shared.css` is the token sheet).
The seeded page itself (`ge-v2-tray.html`, ~2 MB) is not committed — regenerate with the helper.

## 8. Owner's first pass on the canvas (2026-09-07)

Talked through rather than drawn. Header: good.
- **Adjust = three containers:** Hue rotate · Chroma · Contrast · Posterize | Phase · Repeats |
  Noise: Strength · Noise: Frequency · Targets. ("Amount" reads as Strength.) Posterize moved to the middle bin on the second look.
- **Mix strip, Curves:** fine for now, still to be reviewed.
- **Stop inspector:** the R G B / H S B sliders were too narrow — the channel column gets the
  width. Every column has a VERTICAL DIVIDER that collapses it. A further column, hidden by
  default, holds the full sliders for position and bias plus interpolation. **Multi-select edits
  R G B / H S B across all selected stops while each keeps its own position, bias and
  interpolation** — a behaviour for Phase E's build, recorded here.

## 9. Built (2026-09-07)

`gradient-explorer/v2/Tray.tsx` (the surface + the five faces) · `WorkingHero.tsx` hosts it and
carries the tab row in the ramp's control row (Mix · Image · Curves · Adjust, the open one in
accent) · `GradientExplorerV2App.tsx` owns which face is open — the source FOLLOWS the tray
(Mix = the `build` input, Image = `extract`, else Browse), the three source tabs and
`BuildStage.tsx` are gone, the wall is always the ground · `AdvancedGradientEditor` (strip chrome
only) portals its stop inspector into the tray's host and adds the collapsible position · bias ·
interpolation column; `clearSelection` on its handle; `onSelectionChange` opens / closes the
inspector face. Adjust = three bins via `whitelistParams` + `labelOverrides`, tooltips, no
diamonds. Esc order: popover → tray → armed slot. Guard: `npm run smoke:ge-tray` (six steps,
falsified three ways). Multi-select colour editing already applied to every selected stop
(`handleColorChange`); position stays single-stop, bias and interpolation apply to all — as asked.

## 10. Mix, redesigned (owner, 2026-09-07 — built the same day)

- **No A / B language.** There is your gradient and the gradient you're mixing with.
- **The hero ramp splits cleanly in two**, same total height: the top half is your gradient
  (the source), the bottom half the result. No divider, no label. Clicking the top half arms it
  so the next pick replaces your gradient (dashed outline while armed).
- **The Mix face** = a bar for the gradient you're mixing with (the wall or My Gradients pick
  fills it; opening Mix arms it) beside a column of three plain horizontal sliders — Lightness ·
  Chroma · Hue, 0 = yours, 1 = the other — always shown, plus a **Link** switch (off) that moves
  the three as one, and Swap. The crossfade line, "Split by channel" and the sentence are gone.
- **Leaving Mix bakes**: closing the face or opening another commits the result (`use`); the
  two sources are not kept. Unchanged behaviour, now the only path.

## 11. After the Mix walk (owner, 2026-09-07)

- **No quiet hero.** The source half does not hide when the pointer is over the wall; the L9
  fold, its timers and the `quiet` prop are deleted.
- **The source half is a bar like the result:** its 8 px gutters carry its end colours and its
  top corners are rounded; the result half rounds only its bottom. One bar, two halves.
- **Bug: stops walked on every Mix bake.** Each bake re-fitted the result ramp from nothing; a
  re-quantised ramp moves the fitter's "worst error" a texel, so interior stops drifted (16.9 →
  18.8 → 19.2 → 19.6 %). Fixed by seeding the fit with the stop positions both gradients already
  have (`seedPositions`, carried as `seeds` on the Mix input: yours at enterMix, the other's on
  the pick). Three bakes now reproduce the stops exactly. Guard: `test:palette` (stopfit).

## 12. The stops-walk bug, the whole of it (2026-09-07)

The owner's "a new set of shifted stops every time I click Mix" had THREE causes, found one
under the other:
1. **Adjust applied twice.** Leaving Mix baked the result (Adjust and curves folded in) but left
   the dials set, so they applied again on the next pass — a leftover Phase of 0.02 moved every
   stop 2 % per toggle. `use(…, { bakes: true })` now resets Adjust + curves like the click-to-edit
   bake does. Guarded by `smoke:ge-tray` [5] (falsified: red without `bakes`).
2. **The fit re-found its stops.** Each bake re-fitted the ramp from nothing; a re-quantised ramp
   moves the fitter's worst-error texel and interior stops walked ~0.4 % per bake. The fit now
   seeds the stops both gradients already have (`seedStops`, position + interpolation).
3. **A step edge walked one texel per render.** GMT's renderer holds a step segment's left colour
   through its right boundary INCLUSIVE, so a right-hand stop placed exactly on texel `i` paints
   `i` with the left colour and the jump lands on `i + 1`; the next fit moved the edge again.
   The fitter now places the right-hand stop of a hard edge half a texel early and keeps seeded
   positions exact. Side effect: the fitter's worst-case edge error at 32 stops fell from 0.153
   to 0.105. Guarded by `test:palette` stopfit [5] (a step stop in the fixture; three seeded
   re-fits must reproduce every position).
Measured after all three: clean toggles and toggles with a leftover Phase both hold every stop
exactly. Scrubbing the blend costs ~17 ms a step with no long tasks — the app is not slow; the
headless probes that loaded 11,131 gradients against the dev server during this work were.

## 13. The stop fitter uses bias and step properly (owner, 2026-09-07 — built)

- **Bias and smooth before a new stop.** The refine loop finds the worst SEGMENT and first
  tries its bias (a coarse-then-fine grid) and its interpolation (linear / smooth); a stop is
  spent only when neither gets the segment under tolerance. Trials evaluate the segment's own
  texels, not a full re-render, so a fit stays a few ms. Measured on 40 synthetic gradients
  with random biases: 12.3 → 6.3 stops (linear), 14.5 → 8.6 (smooth); plain bias-0.5 gradients
  unchanged.
- **A step edge is an ISOLATED jump.** The corner detector used to chain step stops through any
  steep run (a strongly biased segment), holding the wrong colour on each stop's own texel
  where no refine could reach (ΔE 0.13 left behind). It now requires the jump to stand out from
  its neighbours (2.5×); a steep run seeds plain stops instead. Side effect on the 64 real
  palettes at 32 stops: worst error 0.105 → 0.068, mean 0.028 → 0.022, same stop count.
- **Opt-in.** `fitBias` is off by default: the GMT seam (legacy palette import) wants crisp
  bands, and bias curves would reproduce a posterised palette within tolerance with fewer, softer
  stops. The v2 working pipeline opts in. Seeds now carry bias too.
- Known limit: two jumps ONE texel apart (a one-texel band) fit at ΔE 0.059 — the second jump
  is not isolated. Rare outside synthetic tests. Guard: `test:palette` stopfit [6] (falsified by
  forcing bias off: two assertions red).

### 13a. Stepped palettes actually produce step knots (owner, 2026-09-07 — built)

The owner: "many stepped gradients in the library and none create stepped knots." Surveyed the
real catalog bundles (core + softology + cpt-city, 11,131 entries): cpt-city alone has 2,006
banded palettes (≥150 flat texels), and the jump-based corner detector gave step stops to 57 of
120 sampled — most bands differ by a tiny ΔE (median edge 0.021), so no "corner" was ever seen.
A banded palette is defined by its FLAT RUNS, not its jumps:
- **One STEP stop per plateau.** A run of ≥4 EXACTLY identical texels seeds a step stop holding
  the band, the next stop half a texel past its end. Exact equality, not a small ΔE: a smooth
  8-bit ramp's one-level differences (~0.002–0.004) made a band's start creep one texel per
  re-fit until equality was required.
- **Banded ramp vs quantisation run.** If most of the ramp (≥60 % of texels) is inside flat
  runs, every run is a band however small the edges (the seam's 64-band test has 0.008 edges).
  Otherwise a run counts only when one of its ends is a real edge (ΔE ≥ 0.01) — a smooth dark
  ramp's identical-texel runs stay linear (a "bluescale" that briefly got 87 stops, 11 of
  them steps, is back to 5).
After: step stops in 105/120 sampled banded cpt-city palettes (was 57), 25/27 softology, 39/120
core (core's "banded" set is mostly smooth uigradients with quantisation runs — correct to leave
linear). Non-banded palettes unchanged (10.4 / 11.6 avg stops). Every fit ≤ 2 ms. Guard:
stopfit [7] (16 bands with 0.013 edges → 16 step stops rendering exactly; a smooth ramp gets
none; falsified with seedPlateaus off).
- **Re-fits are no-ops.** The input's own stops go in first; the plateau and corner detectors
  may add a stop only where the ramp is STILL over tolerance with those seeds in place. Without
  that gate a re-fit found new "bands" in the slow regions of its own rendering and grew four
  stops per bake (`smoke:ge-tray` [5] caught it).
- **One knot per band.** After the plateau pass the fit is re-scored, so the corner detector
  no longer adds its own step stop on a band's last texel (a redundant knot per band).
- **Hard edges stay hard on screen.** The hero's strip is 256 texels stretched to ~1,100 px; the
  browser's bilinear scale-up softened every step into a little gradient. In strip chrome the
  editor now samples the STOPS once per display pixel (1,536 wide) — exact for steps and for
  smooth runs, no banding. `GradientStrip` (the source half, the shelf) has only a ramp: it goes
  nearest + `image-rendering: pixelated` when the ramp is banded (the fitter's 60 % rule) and
  stays bilinear otherwise — pixelated everywhere would band the smooth ones (owner).
- **Some "Steps" palettes are baked smooth in the library.** `PairedColor12Steps` (pypalettes)
  is 255 texel changes out of 256 in `core.bin.gz`: the bake resamples any source with fewer
  than 256 rows by linear interpolation (`debug/bake-palette-catalog.mts`, grep `rows.length ===
  256`), so discrete palettes arrive as smooth ramps and the fitter is right to fit them
  smooth. Fixing that is a re-bake with a per-source "discrete" flag — a separate job.
