# Phase B brief — the hero band: source · work · use

**For:** a separate interactive session (Opus 5). Paste this whole file as the opening message.
**Repo:** `H:\GMT\workspace-gmt\stable`, branch `ge-v2`. Work in this tree. **Do not commit** —
land everything uncommitted; the main session reviews the diff, the owner walks it visually, then
it is committed. **Do not push.** `main` auto-deploys and `ge-v2` is not `main`, but the rule is
the same: no push from this session.

## Read first (P1: read the code before the plan)

1. `plans/ge-v2-unified-shell-plan.md` — §1 (principles L1–L9, V1–V8, P1–P6), §2 (the target
   screen), §4 Phase B, §8 (the Phase A amendments: the heading bar, inline states, the colour
   picker), §10 (the carry-over list). This brief restates Phase B; the plan wins where they differ.
2. `plans/ge-v2-mock-c.html` — open it in a browser: the hero band (image slot · work · use
   cluster) is the layout reference. Its "Phone" button shows the phone form, which is Phase F,
   not yours.
3. Source, top to bottom: `gradient-explorer/v2/GradientExplorerV2App.tsx` (the shell),
   `gradient-explorer/v2/WorkingHero.tsx` (the hero — it already IS the stops editor with the
   palette row on top and a heading bar), `gradient-explorer/v2/ui/*` (the primitives you compose
   with: Act, StateChip, Floating, ZoneLabel, Icon, bar.ts — read their JSDoc),
   `palette/store/workingStore.ts` (the Working pipeline; do not change its contract),
   `gradient-explorer/v2/shareUrl.ts` (`shareUrlFor`, `takeShareFromLocation`, `SHARE_PARAM = 'g'`),
   `gradient-explorer/v2/ExtractStage.tsx` + `palette/components/useImageDrop.ts` (the image
   path), `gradient-explorer/v2/ExportMenu.tsx`, `gradient-explorer/v2/VariantsMenu.tsx`.
4. `.claude/rules/palette.md` and `.claude/rules/sibling-apps.md` load themselves when you open
   those trees; obey them (in particular: `palette/` never imports an app; `components/ui/**`
   is pure and hook-guarded).

## Goal

L2 and L8 from the plan. Everything that acts on the working gradient lives on the hero; the
hero never unmounts once it exists; the top bar is for the app. Concretely, the hero becomes the
three-column band from mock C:

    [image slot]  [heading bar: name · state · return · more like this]   [★ Keep   ]
                  [source band when live]                                 [Share    ]
                  [palette row on top of the ramp]                        [Export   ]
                  [ramp = the stops editor]                               [Wallpaper]
                  [Curves ▾  Adjust ▾ (Mix/Extract tray tabs come in Phase C)]
     SOURCE                                                                  USE

## Scope (do all of it)

1. **The use cluster.** ★ Keep · Share · Export · Wallpaper move OUT of the top bar and into a
   right-hand column on the hero (`Act` buttons stacked, a `ZoneLabel` "USE" under them). The top
   bar keeps: brand · undo · redo · settings · Back to GMT. Variants stays in the top bar for now
   (Phase D moves it to the shelf). Export's anchored menu re-anchors to its new button. Nothing
   about what Share / Export / Wallpaper DO changes.
2. **The image slot.** A fixed 88×88 slot on the hero's left with a `ZoneLabel` "SOURCE" under
   it. Empty: dashed hairline, "image · drop here" (fg-muted, 11 px). Filled: the image thumbnail
   (the Extract document already holds it — read `imageStore` / `useImageDerived`). Dropping an
   image anywhere fills the slot (the root-mounted `useImageDrop` already routes to Extract;
   keep that). Clicking the slot switches to the Image source (until Phase C makes it a tray).
   When the Image source is active, the slot carries a 2 px accent outline (V3: accent = "this
   one"). The slot uses `gradientBarClass`-style hairline rules (radius 8 because it is pressed,
   V2).
3. **L8 — the hero never unmounts.** Today `GradientExplorerV2App` hides the hero while the
   working input is empty (grep `derived.empty`), so switching to the Image tab with no image
   drops the whole hero. Change: once a hero has appeared in this session, it stays. An empty
   source shows as an EMPTY SOURCE BAND above the ramp ("image · drop one on the slot", or
   "Mix · pick B") while the ramp keeps showing the last working gradient. The previous working
   gradient is one undo away (already true through workingStore). Keep the first-load state
   (no hero before the first pick) exactly as it is — L9.
4. **Back to GMT carries the gradient.** Shown only when arrived from GMT (`?from=gmt` or a
   referrer on the same origin ending in `app-gmt.html`; design doc §1). It links to
   `app-gmt.html?g=<code>` built with `shareUrlFor`'s encoder (read shareUrl.ts; factor the
   URL-building so the same encoder serves both). On the app-gmt side, find where the palette
   overlay / gradient state is initialised at boot (grep `takeShareFromLocation` for the
   Explorer's own consumer as the pattern, then find app-gmt's boot in `app-gmt/main.tsx` and
   the palette feature it should apply the stops to — read before deciding) and apply the decoded
   stops there, ONCE, with the same "elided defaults" semantics. If app-gmt genuinely has no
   clean place to apply a gradient at boot, stop, write that down in your report with the
   file you looked at and why, and leave the link building done.
5. **The quiet hero (L9).** While the pointer has been in the wall for ~900 ms the hero
   collapses: palette row and tray tabs hidden, ramp 34 px, the use cluster becomes one row of
   small buttons, the image slot shrinks to a 56 px strip. Any pointer over the hero (or the
   shelf) restores it. Pure CSS class toggle driven by two timers; no store state. Mock C has
   the exact behaviour (`.hero.quiet`).
6. **Carry-overs you pick up if you touch the file anyway** (plan §10): add `pencil` and
   `refresh` to `ui/Icon.tsx` and use them in VariantsMenu instead of the words "rename" /
   "update"; in BrowseStage, swap the inlined Act / Floating class strings for the primitives
   (they were built concurrently in Phase A). Both are small; do them.

## Not in scope (leave alone)

Mix and Extract as trays (Phase C). Snapshots on the shelf (Phase D). The stop inspector /
colour picker vocabulary (Phase E). Phone layout (Phase F). Anything in `palette/core/**`
(pure maths; if you believe you need a change there, write it in the report instead).
`components/ui/**`. The Working pipeline's contract (`workingStore` actions and derived shape).
Wallpaper internals. The old shell `gradient-explorer.html`.

## Files you may touch

`gradient-explorer/v2/GradientExplorerV2App.tsx`, `WorkingHero.tsx`, `SourceBands.tsx`,
`ExportMenu.tsx`, `VariantsMenu.tsx`, `BrowseStage.tsx` (item 6 only), `shareUrl.ts`,
`ui/Icon.tsx` (additive), `main.tsx` / `registerFeatures.ts` if boot wiring is needed; a NEW
`gradient-explorer/v2/ImageSlot.tsx` and `UseCluster.tsx` if you want them as files; on the
app-gmt side, only the ONE boot site that applies the `?g=` code (name it in the report), plus
whatever tiny helper it needs. Everything else: read, do not edit.

## Principles to hold while building

- V1: the hero is a BAND (surface-dock, hairline, no shadow). The use cluster's buttons are
  Act (8 px). Nothing new floats except menus you re-anchor.
- V2: radius by role. V3: accent only for "this one" (the active source's slot outline); the
  three meaning colours only through StateChip. No new hex colours.
- V5: 11 px uppercase for SOURCE / USE, 13 px controls, 18 px name, nothing meaningful in
  fg-dim. V6: Icon only, no unicode glyph buttons. V7: the band's inner left edge stays at 24 px.
- V8: the image slot and the source band use the shared bar rules.
- P3: move hosts, not behaviour.

## Gates (all must be green before you report)

```
npm run typecheck
npm run test:palette
npm run test:gx-share          # extend it: the GMT-bound URL round-trips through the same decoder
npm run smoke:ge-next
npm run smoke:boot             # app-gmt boot — you touched its boot path
```
Add ONE new smoke, `smoke:ge-hero` (copy the shape of `debug/smoke-boot.mts` / the ge-next one):
boot the v2 page → click a wall tile → assert the hero exists → switch to the Image tab with no
image → assert the hero STILL exists and the ramp still has a gradient → press Escape → hero
still there. Wire it in package.json next to `smoke:ge-next`. Falsify it once (re-introduce the
old hide) and note that it went red.

Also start the dev server yourself if it is not running (`npm run dev`, port 3400) — the smokes
need it — and look at your work in a browser at 1280×800 AND at 1280×680 (the short window is
where the hero's height bites).

## Hand back (your final message; the main session pastes it into the plan)

Under 80 lines:
1. Files changed, one line each; the app-gmt boot site you chose and why.
2. Gates: the commands you ran and their last line. The falsification of `smoke:ge-hero`.
3. **Principles check (plan §8):** which of L1–L9 / V1–V8 you confirmed, which you found
   wanting and what you propose (do not edit §1 yourself).
4. **Still missing (plan §10):** in scope, left undone (with why) · noticed outside scope
   (file + symbol) · what Phase C now carries.
5. What the owner should look at on the walk, in order (3–6 items).
