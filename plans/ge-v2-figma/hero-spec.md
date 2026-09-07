# Designing the hero in Figma — setup + the measurements

Written 2026-09-07, from the **live** v2 shell on the light-grey scheme, after Phase B landed.
Everything here was measured, not estimated. Sibling files:

- `tokens.json` — the colour / radius / spacing / type tokens, ready to import.
- `ref-hero-picked.png` · `ref-hero-empty-source.png` · `ref-hero-quiet.png` — 2× plates of the
  three hero states, cropped to top-bar + hero, for a Figma underlay.

---

## 1. Import the tokens

`tokens.json` is W3C design-token format. Two plugins read it:

- **Tokens Studio for Figma** — free tier is fine for one theme. File → import → pick the JSON.
  Gives you real Figma Variables you can bind fills and text styles to.
- **Variables Import Export** — simpler, no account, but flatter output.

Either way you end up with variables named `colour/surface/dock`, `radius/press`, `type/name` and
so on, matching what the code calls them. That matters more than it sounds: when you hand a frame
back, "make the heading bar `surface/section`" is unambiguous and I can implement it without
guessing which grey you meant.

**One caveat.** The light-grey scheme is generated at runtime by `colorSchemeStore` from a hue and
a brightness — the hexes in `tokens.json` are a *snapshot* of one setting, not the source of truth.
If you change the scheme in Settings, the app moves and the Figma file does not. Design against the
token *names*; treat the hexes as today's rendering of them.

---

## 2. Set up the frame

Make one frame **1280 × 800** (the desktop reference from mock C). Inside it:

| band | y | height | fill |
|---|---|---|---|
| top bar | 0 | 48 | `surface/dock`, 1px `line` @10% bottom border |
| **hero** | 48 | **229** | `surface/dock`, 1px `line` @10% bottom border |
| ground (the wall) | 277 | fills | `surface/viewport` |
| shelf | 712 | 88 | `surface/dock`, 1px `line` @10% top border |

Also make a **1280 × 680** copy. That's the short-window case, and it's where the hero's height
actually bites — the wall gets squeezed, not the hero.

Drop `ref-hero-picked.png` in at 50% scale (it's 2×) and lock it as an underlay so you can see what
you're changing.

---

## 3. The hero, as built

Three columns, `88px / 984px / 128px`, 16px gap, 12px top and bottom padding, **24px left and right
gutter** (that gutter is the one number the whole shell agrees on — search pill, tray, shelf and
hero all start at x=24).

```
x=24    x=128                                                     x=1128
┌──────┐┌───────────────────────────────────────────────────────┐┌────────┐
│ 88×88││ heading bar        984×40  r8  surface/section         ││ ★ Keep │ 128×26 r8
│ slot ││ ─ name 18/600 · state · More like this ─────────────── ││ Share  │
│ r8   ││                                                       ││ Export │ 6px gap
└──────┘│ palette row        984×34  6px gap between swatches    ││Wallpapr│
 SOURCE │                                                       │└────────┘
        │ ramp wrapper       984×116 r4  ← the stops editor      │    USE
        └───────────────────────────────────────────────────────┘
```

Measured, at 1280×800 with a picked gradient and no expander open:

| element | x | y | size | radius | notes |
|---|---|---|---|---|---|
| hero | 0 | 48 | 1280 × 229 | — | pad `12px 24px`, gap 16 |
| image slot | 24 | 60 | 88 × 88 | 8 | 56 tall when quiet |
| SOURCE label | 24 | — | 88 wide | — | 11px uppercase, centred |
| heading bar | 128 | 60 | 984 × 40 | 8 | pad `0 12px`, gap 10 |
| name input | 141 | 67 | 218 × 27 | — | 18px/600, max-width 40% |
| palette row | 128 | 108 | 984 × 34 | — | 6px between swatches |
| ramp wrapper | 128 | 148 | 984 × 116 | 4 | contains source band + editor |
| use column | 1128 | 60 | 128 × 204 | — | 6px gap |
| use button | 1128 | 60 | 128 × 26 | 8 | 13px, 1px `line` @20% |

**Three heights, all real:**

- picked / editing — **229px**
- empty source (Image tab, nothing loaded) — **174px**
- quiet (pointer has lived in the wall ~900ms) — **159px**

*(I gave you 215 and 110 in the Phase B report — those were eyeballed off a screenshot and wrong.
These three are measured.)*

---

## 4. The rules the design has to keep

Not style preferences — these are load-bearing and the code enforces some of them.

- **Radius means role.** 4 = a sample you look at (swatch, tile, ramp). 8 = something you press
  (button, input, image slot, heading bar). 12 = something that floats. A pill shape is a *state*,
  never an action.
- **Accent is only ever "this one."** Selected tab, selected swatch outline, slider fill, the active
  image slot's outline. Nothing else gets to be accent-coloured.
- **Three meaning colours, and only three.** live = green, edited = amber, armed = violet. Each one
  appears as a coloured dot + coloured text inside the heading bar, and as a 2px outline on the
  thing it refers to. Don't invent a fourth.
- **Four text sizes, two cases.** 11 uppercase = zone label. 13 = every control and caption. 15 =
  tabs. 18/600 = the gradient's name, the only large type on screen. Mono only for hex and numbers.
- **Nothing meaningful in `fg-dim`.** If it carries meaning it's `fg-muted` or brighter.
- **One gutter: 24px.** Everything else on a 4px grid.

---

## 5. What's actually worth redesigning

The band works structurally — Phase B proved the three columns hold at both window heights. What it
doesn't have is any *craft*. Places I'd point a designer:

1. **The use column is four identical grey rectangles.** ★ Keep, Share, Export and Wallpaper have
   very different weights — Keep is the one people press constantly, Wallpaper is a once-a-session
   flourish. Right now they're indistinguishable. Does Keep want to be primary? Do the other three
   want to be icon+label, or smaller?
2. **The image slot is a dashed box that says "image / drop here"** and nothing else. It's the
   entire visual presence of a whole source. It could be a lot more inviting.
3. **The heading bar holds a name, a dot, and one button, in 984px of space.** It reads empty. The
   state indicator in particular is a tiny dot lost against a wide bar.
4. **The empty-source band is a dashed strip with 11px grey text.** It's the moment the app is
   explaining itself to someone confused, and it currently whispers.
5. **The transition to quiet is instant.** No animation, hard snap. Worth deciding what it should
   feel like before I build it.
6. **The ramp has no visual weight.** It's the subject of the entire application and it sits in a
   hairline box with the same emphasis as everything around it.

---

## 6. Handing it back

Once the Figma connector is registered in a session, I can read your frames directly — so the
handoff is just "look at the Hero v2 frame." Failing that, export the frame as PNG at 2× plus a
note of which tokens you used where, and I'll work from that.

Worth knowing what I *can't* take from a Figma frame: anything with live data. The wall is 11,131
canvas-drawn tiles, the ramp is a real gradient, the palette row is draggable. Design the look in
Figma; the behaviour still has to be checked in the running app.

---

## 7. The Figma file (set up 2026-09-07)

**https://www.figma.com/design/uylQa6kaWZPmBwTrahGXzR** — "GE v2 Hero", in Guy Zack's team drafts.
File key `uylQa6kaWZPmBwTrahGXzR`; the connector reads it directly, so hand back by node, not PNG.

What's in it, page "Hero":

- **`GE v2 tokens`** variable collection, one mode `light-grey`, 38 variables named exactly as
  `tokens.json` (`colour/surface/dock`, `radius/press`, `space/gutter`, `size/hero-h` …). Every
  band, radius, gap and height in the frames is *bound* to these, so retinting the scheme is a
  variable edit. Type sizes are not variables — Figma text styles were left for you to define.
- **`Hero v2 — 1280×800`** (node `1:41`) and **`Hero v2 — 1280×680 (short)`** (`1:46`): top bar /
  hero / ground / shelf as auto-layout bands. The hero is built to §3 — three columns, 24px gutter,
  16px gap, and it lands at 229px without any forcing. Everything is auto-layout, so resizing the
  heading bar or use buttons reflows the rest.
- **Reference plates** section below the frames: the three 2× plates at 50%, locked.
- Inside the 800 frame a hidden, locked, 50%-opacity **UNDERLAY** layer of the picked plate —
  toggle it visible to check against the real render.

Placeholder content: name "Copper Dusk", 8-stop swatch palette, a linear-gradient rectangle for
the ramp. The wall is a flat `surface/viewport` rect — don't design the tiles here.

### 7a. Decisions from Guy's first pass (2026-09-07, later the same day)

Guy's frame is **`guy's Hero`** (node `3:45`), left untouched. The agreed version is
**`Hero v3 (agreed)`** (node `10:2`), a clone with these applied:

- **The hero is a card.** 10px inset in the band, radius 32, on `surface/raised`. Inside it the
  gradient column is a darker panel on `surface/dock`, radius 20, with a `surface/base` header strip.
  Band = `surface/base`. The 24px gutter is kept *inside* the card (slot lands at x=24).
- **`surface/base` → #f5f5f5 and `surface/raised` → #e9e9e9.** Guy works lighter than the
  snapshot; the token values were moved to his hexes, not the design to the tokens. The runtime
  scheme generator will need to produce these two steps. Everything else unchanged.
- **Pressables stay radius 8** (rule kept). Card/panel radii are Guy's, not tokenised yet.
- **Zone labels (SOURCE / USE) are gone.** The card shape does the grouping; less text wins.
- **Use column is gone.** ★ Keep / Share / Export / Wallpaper become four 26px icon buttons
  right of "More like this" in the header. (Export = save, Wallpaper = fullscreen.)
- **Image slot is a slim optional input** (45×84, dashed) when empty; it grows to the full
  column height as a square when an image is loaded.
- **Palette row gets a `+` and an Even | Perceptual | Stops segmented control** on its right.
  Guy's mockup of the control is one text node; the real one needs three segments, selected in accent.
- **Hero height ≈ 268.** The extra ~40px over 229 is deliberate: each swatch and the ramp need
  room to be looked at. The ramp may come down a touch if the short window needs it.
- Open: the empty-source and quiet states, the state indicator, Keep's emphasis. See how this
  plays out first.

### 7b. Ported to the prototype (2026-09-07)

`WorkingHero.tsx`, `ImageSlot.tsx`, `ui/Act.tsx` (`icon` prop), `ui/Icon.tsx` (the Material
glyphs Guy pasted: heart · share · download · photo, plus fullscreen). `UseCluster.tsx` deleted.
`npm run smoke:ge-hero` still passes; measured in the browser: card inset 10, slot at x=24,
hero 265 tall with a picked gradient.

**Surface mapping — the Figma hexes are not the app's.** Guy's ladder is band #f5 > card #e9 >
panel #c1. The running light-grey scheme has no such steps (its lightest surface is #d3), so the
code maps the *ladder*, not the values: band = `surface-raised`, card = `surface-section`,
panel = `surface-viewport` (the wall's own ground — the gradient sits on the same ground as the
wall). Three clear steps at every brightness. If the lighter look matters, that is a
`colorSchemeStore` pole change (`SURFACE_NORMAL`), not a hero change.

Kept from the rules: radius 8 on every pressable, 24 px gutter, four text sizes. Departures, on
Guy's call: card 20 / panel 20 / ramp 10 radii (not the 4/8/12 ladder — V2 needs an amendment
if this sticks), a second FILLED icon style confined to the hero header and the slot (V6 said
one weight), no zone labels.

### 7c. Two rules from the first live look (2026-09-07)

- **Gradients and swatches always carry large rounding** — it is what separates them from each
  other. `gradientBarClass` now gives 10 px to every size (swatch, ramp, tile, item, slot) and
  6 px to the thin source bands. Amends V8's "radius 4". Outside the helper and still 4-ish:
  the wall's canvas-drawn tiles (PickerWall) and the shelf's items (FavientsPanel, shared with
  GMT main — left alone on purpose).
- **Quiet no longer hides the palette, and no longer snaps.** It folds the source band away
  over 200 ms and leaves everything else in place; the timer is 600 ms, down from 900. With a
  picked gradient (no split) quiet now changes nothing visible at all, which is the honest
  reading of "the hero is the object". If quiet still earns nothing after a few days, delete it.

### 7d. Second live look (2026-09-07)

- The card is flush with the band's top, right and bottom; only the 10 px left inset stays.
- The name hugs its text (a mirror span sizes it) up to 60% of the header.
- The palette `+` was there but 0 px wide — `Act`'s `px-3` beat the caller's `px-0` and the
  flex parent squeezed the SVG away. `Icon` now carries `shrink-0`; icon buttons use `icon`.
- The ramp has no hairline and no hover outline. In the editor's `strip` chrome the 8 px knot
  gutters are painted with the ramp's two end colours (radius 10, no borders on strip or knot
  track), so the gradient reads edge to edge while the end knots keep their room. `full` chrome
  (GMT main) is untouched.

### 7e. Padding, corrected (2026-09-07)

Read off `Hero v3 (agreed)` → `hero (this one)`: the BAND keeps 10 px all round; the CARD has
0 top / right / bottom and 14 left (13 + its 1 px border in code), so the panel is flush with
the card and the card clips it to its own 20 px corners. Hero = 233 px with a picked gradient.
The name input now really hugs (`size={1}` — its intrinsic 20-character width was winning the
grid cell), so the state reads right after it instead of floating 200 px out.

### 7f. Export (2026-09-07)

- The full window (`ExportMenu`) was being clipped by the card. It now hangs off the hero
  BAND (`WorkingHero` renders `exportMenu` outside the card; the band is `relative`), anchored
  under the header's right edge, and opens over the wall at full height as before.
- **Hover flyout of recents.** The Export icon shows the last three exports as one-click rows
  ("Copy CSS linear-gradient", "Download .grd", "Download PNG strip") plus "All formats…".
  Nothing shows until there is a recent. `exportActions.ts` owns the doing (`runExport`) and
  the recents (localStorage `gx.v2.recentExports`); the full window calls the same function,
  so the two surfaces share one behaviour. The flyout is `fixed` because the card clips.
