# The slider, for GE v2 — three proposals

Written 2026-09-07. Companion to `hero-spec.md` (§7c the large-rounding rule, §4 the radius/accent
rules) and `trays-spec.md` (§6 "the standard GMT slider everywhere", §8 the three Adjust bins).
The subject is `components/inputs/ScalarInput.tsx`'s `soft` branch — the current first cut — and
what it should become. Nothing here is implemented; §4 says what would change.

---

## 1. What the app's language says a slider should be

The v2 shell has exactly three visual moves and a slider has to be made of them. **Bars are
rounded and coloured** — `gradientBarClass` gives every gradient 10 px and a `line/20` hairline,
and the reason given (hero-spec §7c) is that large rounding is *what separates one bar from
another*; a slider track is a bar on the same screen as eight of those, so it inherits the
rounding and must not compete for colour. **Pressables are quiet rectangles** — `Act` is 26 px
tall, radius 8, 13 px text, `bg-surface-section`, a `line/20` border, `fg-muted` text that goes
`fg` on hover, and no fill at all until `active`; that is the whole button vocabulary and a thumb
is the nearest thing a slider has to a pressable. **Accent means "this one" and nothing else** —
PaletteRow's segmented control uses `bg-accent-400/15 text-accent-300` for the selected segment
and plain `fg-muted` for the rest, which is the only accent on a resting screen. And **the less
text the better**: the zone labels were deleted, per-slider descriptions became tooltips
(`hints="tooltip"`), keyframe diamonds were switched off in the tray. So: a slider is a rounded
bar, mostly grey, that spends accent only on the part that says where the value is, carries one
line of 12–13 px text with the number right-aligned in tabular figures, and shows its extra
machinery (default marker, reset, keyframe) only when it is relevant or hovered. The current
`soft` branch gets the shape right and the *weight* wrong — a 10 px `line/15` track with a
`accent-400/60` fill and a 14 px `bg-fg` thumb with a black ring is three loud elements where the
shell wants one, and eight of them stacked in an Adjust bin read as a barcode.

---

## 2. Three options

Shared by all three (they are the app's constants, not choices):

- Row width fills its bin (`AdjustFace` bins are `flex-1 … px-3.5`, so ~200–290 px at 1280).
- Label `text-[12px] text-fg-muted`, truncating; value `text-[12px] tabular-nums text-fg` in the
  same row, right-aligned, `min-w-[52px]`, still a `DraggableNumber` (drag the number = fine
  adjust, double-click = type).
- Right-click anywhere on the row resets (`onContextMenu` is already wired at the row).
- Disabled: `opacity-70 pointer-events-none` on the row, fill drops to `bg-fg-muted/20`,
  thumb/text to `fg-dim`. Unchanged from today, and correct.
- Keyframe slot = `headerRight`, rendered before the label; when a host passes nothing (the tray
  does) the row simply has no leading cell, no reserved gap.

### Option A — "Quiet bar" (the current cut, tuned down)

```
  Hue rotate                         −24°
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓●───────┆────────────      ← 10px bar, ● 12px thumb, ┆ default tick
```

| part | spec |
|---|---|
| row | `py-1`, label line `h-5`, track block `h-[18px]` (10 px bar + 4 px above/below) |
| track | `h-[10px] rounded-full bg-line/12`; no hairline (a ring at 10 px height reads as a pill outline) |
| fill | `bg-accent-400/45`, `rounded-full`, width = value % |
| thumb | 12 px circle, `bg-surface-section border border-line/40` — i.e. an `Act` in circle form, not a white dot. Hover `border-line/70`; drag `border-accent-400 bg-surface-raised` |
| default tick | 1 px `bg-fg/25`, full track height, under the fill |
| at-default | fill is `bg-accent-400/25` instead of `/45` — the row visibly cools when untouched |
| live | 1 px `bg-secondary` column in the track at `livePct` + the existing 6 px pulsing dot after the label |
| keyframed | `headerRight` diamond, 12 px, `text-accent-300` when a key sits on the frame |
| reset | right-click only; plus click the default tick (a 8 px invisible hit box centred on it) |
| hover | track `bg-line/18`, value text `fg` |

Cost: nearest to what exists — a colour pass, one thumb rebuild. Risk: at 10 px the fill's rounded
cap and the thumb overlap awkwardly at both extremes (the `calc(% - 7px)` offset lets the thumb
hang past the bar), and stacked ×8 it still reads busy.

### Option B — "Thumbless" — recommended

```
  Hue rotate                         −24°
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░┆░░░░░░░░░░░      ← 10px bar, no thumb; the fill's edge IS the value
```

No thumb at all. The fill's leading edge is the value, exactly as the ramp's own bars carry
meaning by extent rather than by a marker.

| part | spec |
|---|---|
| row | `py-[3px]`; label line `h-5 flex items-center gap-2`; track block `h-[16px] flex items-center` |
| track | `h-[10px] rounded-[10px] bg-line/12 overflow-hidden` (10 px radius, matching `gradientBarClass`, not `rounded-full` — same number, same family) |
| fill | `absolute inset-y-0 left-0 rounded-[10px] bg-accent-400/50`; width = value % |
| fill edge | a 2 px `bg-accent-300` cap at the fill's right edge — visible at 100 % and at 0 % as a hairline stub, so the value never disappears |
| default tick | 1 px `bg-fg/30` above the fill (`z-10`), full 10 px height |
| at-default | fill `bg-accent-400/30`, cap `bg-accent-400/60`; touched = the values above |
| hover | track `bg-line/20`; the cap grows to 3 px; `cursor-ew-resize` (already) |
| drag | fill `bg-accent-400/65`, cap `bg-accent-300`, and the value text goes `text-fg font-medium`; a 1 px `ring-1 ring-accent-400/30` on the track |
| live | `w-[3px] bg-secondary rounded-full` inside the track at `livePct`, over the fill; label dot as today |
| keyframed | `headerRight` diamond before the label (12 px `Icon`), `text-fg-dim` empty / `text-accent-300` on a key; the track gains no marks |
| disabled | fill `bg-fg-muted/15`, no cap, label + value `fg-dim` |
| reset | right-click the row; and the default tick carries an invisible 10 px-wide hit area with `title="Reset to N"` |
| `trackBackground` | when a host passes a colour ramp (hue/chroma tracks), the fill goes transparent and the cap becomes a 2 px `bg-fg` line with a `shadow-[0_0_0_1px_rgba(0,0,0,.4)]` so it survives any hue under it — the one place a marker is required |

Stacked eight-deep this is a column of quiet grey bars with one accent length each. It is the same
object as the gradient bars above it, one family, no new shapes.

### Option C — "Inline" (one line total)

```
  Hue rotate ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  −24°       ← 26px row, label left, bar centre, value right
```

Label and value flank a 10 px bar on a single 26 px row — the same height as `Act`, so a slider
and a button sit on one line without either looking odd.

| part | spec |
|---|---|
| row | `h-[26px] flex items-center gap-2.5` |
| label | `text-[13px] text-fg-muted shrink-0 max-w-[45%] truncate` |
| track | `flex-1 min-w-[64px] h-[10px] rounded-[10px] bg-line/12`; fill and cap exactly as Option B |
| value | `text-[13px] tabular-nums text-fg-muted w-[52px] text-right shrink-0`, `fg` on row hover |
| everything else | as Option B (states, live, default tick, `trackBackground`) |
| keyframed | no room for a leading diamond at the label — it goes after the value, 12 px, and the row grows to `gap-2` |

Saves ~14 px per slider (Adjust's three bins drop from ~200 to ~120 px, so the tray shrinks and
the wall grows). Cost: at bin width the track is only ~90 px, so a 0–2.5 chroma slider gets ~36 px
of usable travel per unit — coarse. Best for a 2-up or full-width face (Mix, Curves' Detail /
Smooth), poor for the three-column Adjust bins.

---

## 3. Recommendation

**Option B, with Option C available as a `dense` prop for full-width rows.**

B is right because it removes the element the shell has no vocabulary for. Everything else in v2
is either a rounded coloured bar or a quiet bordered rectangle; a floating circular thumb with a
drop shadow is a third species, and at 12–14 px it is the highest-contrast thing in a tray full of
deliberately low-contrast controls. Killing it costs nothing functionally — the gesture is
`usePrecisionTrackDrag` on the whole track, not a grab on the thumb, so the thumb was never a
handle, only a readout; the fill's edge reads that value at least as well, and the 2 px cap keeps
it legible at both extremes and against a `trackBackground`. It also lands the slider in the same
10 px-radius family as the ramp, the swatches, the wall tiles and the Adjust bins, which is the one
rule the owner has stated twice.

A loses because it keeps the thumb and therefore keeps the three-element weight problem; C is a
genuinely good row but the Adjust bins are too narrow for it, and shipping one slider that changes
shape by container is worse than one shape plus an opt-in.

Second-order: B is also the only option that behaves well in **dark scheme** without a second set
of values. `line/12` and `accent-400/50` are both alpha-on-current-surface, so the track darkens
and the fill brightens with the scheme automatically; the current cut's `bg-fg` thumb with a
`rgba(0,0,0,.35)` ring is a light-scheme artefact that goes muddy on dark.

---

## 4. What would change in `ScalarInput`'s `soft` branch

Described, not edited. All of it inside the `if (soft) { … }` block; the `default` branch,
`compact`, `minimal` and every gesture hook stay untouched (genericize, don't fork).

1. **Delete the thumb `<div data-role="thumb">`.** Then `handleImmediateChange` must stop looking
   for it — today it does `trackContainerRef.current?.querySelector('[data-role="thumb"]')` and
   sets `left`. Retarget that query to a new `[data-role="cap"]` and set `left: calc(pct% - 2px)`,
   or (simpler) let the cap be an `::after` on the fill element so the existing
   `fullTrackFillRef.style.width` write moves it for free. The second is preferable: one DOM write
   per drag frame instead of two, and no querySelector in the hot path.
2. **Track:** `rounded-full` → `rounded-[10px]`, `bg-line/15` → `bg-line/12`, add
   `group-hover:bg-line/20` (the row needs a `group` class for that).
3. **Fill:** `bg-accent-400/60` → `bg-accent-400/50`, and `/30` when
   `defaultValue !== undefined && value === defaultValue` — a cheap derived boolean next to the
   existing `isActive`.
4. **Cap:** the `::after` above — `content-[''] absolute right-0 inset-y-0 w-[2px] bg-accent-300`,
   widening to 3 px on row hover. When `trackBackground` is set, `bg-fg` +
   `shadow-[0_0_0_1px_rgba(0,0,0,.4)]` instead (the branch already knows `trackBackground`).
5. **Default tick:** keep the existing 1 px div, raise it to `z-10` (it currently sits inside the
   `overflow-hidden` track *before* the fill in DOM order and is painted under it), change
   `bg-fg/40` → `bg-fg/30`, and wrap it in a sibling button with `w-[10px] -ml-[5px]`,
   `title={`Reset to ${defaultValue}`}`, `onPointerDown` stopping propagation so the track drag
   does not start — the same pattern the `default` branch's reset strip already uses.
6. **Live indicator:** `w-1` → `w-[3px] rounded-full`; leave the pulsing label dot as is.
7. **Row metrics:** `py-1` → `py-[3px]`; the track container's inline `height: softTrackH + 8`
   → `16` with `top: 3` on the bar (the +8 was clearance for the overhanging thumb, which is gone).
8. **Keyframe slot:** no code change — `headerRight` already renders before the label and the tray
   passes `keyframes={false}`. Worth a comment saying that is the diamond's home in this skin, so
   a future host does not invent a second slot.
9. **Optional `dense` (Option C):** a `dense?: boolean` on `ScalarInputProps`, honoured only when
   `soft && variant === 'full'`, that emits the single 26 px row instead of the two-line stack.
   Set it on the Mix face's three channel sliders and Curves' Detail / Smooth (which are still raw
   `<input type="range">` today and should become `Slider`s in the same pass, per trays-spec §6).

No new component, no new file: `skin.tsx` keeps two values and the shape of the change is entirely
inside the branch it already gates.
