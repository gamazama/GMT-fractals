# Pre-release UI pass — settings menu + the slider audit

Written 2026-09-12, from the owner's list. These are **first-polished-release** work, ahead of
everything in `plans/ge-ramp-analysis-and-deep-fit.md` except group-by (see that doc's §A4).

Scope note: the slider work is **engine-wide**, not GE-specific — `components/inputs/ScalarInput.tsx`
backs every numeric control in app-gmt, fluid-toy and both gradient-explorer shells. Fixing it fixes
all of them, and breaking it breaks all of them.

---

## 0. Done already (2026-09-12)

**The Settings gear crashed every app.** `SettingsPanel` called `useMobileLayout()` below its
`if (!open) return null`, so the hook only ran on the render where the panel opened — React saw hook
#9 appear from nowhere and threw "Rendered more hooks than during the previous render", which
`AppErrorBoundary` turned into a full-app fallback. Landed 2026-09-11 in `77d3f9e4` with the phone
pass; fixed and pushed in `4215a65e`. Affected app-gmt, fluid-toy and both GE shells — everything
that mounts `SettingsHost`.

Worth noting for the audit below: this shipped to production and sat there for a day, because
**nothing opens the Settings panel in any smoke**. `smoke:boot` catches page errors at boot; a panel
that only crashes on click is invisible to it. See §3.

---

## 1. About / Feedback / Support / What's New — a v2 parity gap, not a new feature

**Correction to this doc's first draft (2026-09-12):** it proposed building a bespoke menu on
`AnchoredMenu`. That would have forked a seam the engine already owns — CLAUDE.md Anti-Patterns #1
and #2. The right answer is `installHelp`, and **the old GE shell already calls it**:

```ts
// gradient-explorer/main.tsx:52
registerFeedbackUI();
installHelp({
  support: gmtSupportConfig(),
  extraItems: [feedbackMenuItem()],
});
```

The v2 shell (`gradient-explorer/v2/main.tsx`) never picked this up — it has only the bare
`SettingsButton`. So Support and Feedback are **already written, already shared, and simply absent
from v2**. This belongs on the Phase G parity checklist, not on a feature list.

### What exists, and where

| Piece | Lives in | Reusable as-is? |
|---|---|---|
| the `?` menu itself | `engine/plugins/Help.tsx` → `installHelp({ support, about, extraItems, tutorials })` | yes — needs `installMenu()` first |
| Support | `engine-gmt/support.ts` → `gmtSupportConfig()` | **yes, verbatim.** Its own header says "change it here and every app follows" |
| Feedback | `engine-gmt/feedback/` → `registerFeedbackUI()` + `feedbackMenuItem()` | yes — already engine-gmt, already shared |
| About | `app-gmt/HelpExtras.tsx` → `AboutGmtBody` | **no** — reads `getProxy().gpuInfo`, the fractal worker proxy, which GE has no equivalent of |
| What's New + the unseen dot | `app-gmt/HelpExtras.tsx` → `whatsNewMenuItem()`, `isWhatsNewUnseen()` | **not yet** — app-agnostic logic sitting in an app folder |

### The two actual pieces of work

**1. An `AboutGxBody`.** GMT's version reads the worker proxy for GPU info; GE has no worker. Its About
wants version + build, licence, credits — and the one thing GMT's doesn't need: **the catalogue's
attribution obligations**. `catalogLoader.ts`'s `BundleInfo` already carries `label` / `license` /
`attribution` / `url` per bundle and surfaces them nowhere prominent. cpt-city is redistribution-bound.
About is where that gets honoured, and it should enumerate the loaded bundles rather than hard-code a
list, so a lazily-fetched bundle appears once it loads.

**2. Hoist What's New out of `app-gmt/`.** `whatsNewMenuItem` and `isWhatsNewUnseen` are entirely
app-agnostic except for two strings — the menu title and `CHANGELOG_TOPIC_ID` — plus `pkg.version`,
which is shared anyway. Copying them into GE is the copy-paste-shared-resources anti-pattern
(CLAUDE.md #2). Move them to the engine (or `engine-gmt/`) taking `topicId` and `label` as options;
app-gmt then passes GMT's and GE passes its own. The version-gated localStorage dot comes along free.

Phone: `installHelp`'s menu already handles phone widths wherever GMT and fluid-toy do. Do not invent
a second pattern.

### 1b. GX is a standalone app (owner, 2026-09-12)

That settles the changelog question — **GX gets its own topic**, not a share of
`data/help/topics/changelog.ts`. It also pulls three more things into this section:

- **Its own version.** `pkg.version` is `gmt-engine 0.9.8.3`, monorepo-wide. An About box and a
  version-gated What's-New dot for a standalone product should key off GX's own version, not the
  engine's. This is the concrete reason the What's New hoist (above) must take its version source as
  an option, not read `pkg` directly.
- **"Support GMT" needs an app-name seam.** `gmtSupportConfig()`'s copy is GMT-branded ("GMT is free
  & open source…") and its header says change-it-here-and-every-app-follows. A standalone GX asking
  people to support GMT is either a mistake or a deliberate umbrella — owner's call. The *resolution*
  is not to fork the file: parameterise the app name and keep one definition.
- **"Back to GMT" changes meaning.** `GradientExplorerV2App.tsx:472` renders it as a plain link. For a
  satellite it's "return to the parent"; for a standalone product it's a cross-link to a sibling.
  Keep or drop is an owner call, but it should not read as a back button.

### 1c. The question that decides whether this is small or not

**Standalone as a separate entry on `app.gmt-fractals.com`, or standalone on its own domain?**

Today `gradient-explorer-next` is a Vite entry (`vite.config.ts:148`) on the same origin as app-gmt.
Every shared key is `gmt.*` in **localStorage**, which is **origin-scoped**:

- `gmt.favients`, `.groups`, `.target`, `.seeded`, `.lastgroup` — the user's whole saved collection
- the colour scheme / accent / `gmt.highContrast` — "persists across all same-origin GMT apps"
- `gmt.whatsNew.seenVersion`, and the GE-local `gx.v2.*` keys

**Same origin → nothing breaks, and 1b is the whole job.** Own domain → a returning user arrives at a
brand-new app with an empty shelf, default theme, and every group they made gone, **silently**. That
would need an explicit migration path (an export/import handoff, or a one-time read from the old
origin before the switch) and it is release-blocking in a way none of the rest of this doc is.

Nothing else in this plan depends on the answer, so it isn't blocking the slider work or §1a — but it
should be settled before the entry-point swap, not after.

---

## 2. The slider audit

Four separate defects, reported together, with different root causes. Do not fix them as one change.

### 2.1 Text-field drag outruns the slider drag

**Symptom.** Dragging the number moves the value faster than dragging the track.

**Root cause — near-certain, verify before fixing.** They use two different mappings:

- the **track** drag (`usePrecisionTrackDrag`) maps pointer-x across the *track's pixel width* to the
  value's range. A full sweep of the track = the full range, whatever that range is.
- the **number** drag (`RawDraggableNumber` in `components/Slider.tsx`, with its `sensitivity` prop)
  maps pixels to `step × sensitivity` — an absolute rate, **independent of the range**.

Those two can only agree by coincidence. Wherever `range / trackWidthPx` differs from
`step × sensitivity`, the two gestures move at different speeds on the same parameter, and a control
with a wide range or a fine step diverges hardest.

**Fix direction.** The number drag should derive its rate from the same range-over-width the track
uses, so both gestures traverse the full range in a comparable pointer distance. Where a control has
no meaningful max (`hardMax` only), fall back to the step-based rate — but that should be the
documented exception, not the default.

Both already share `precisionMultiplier` (Shift ×10, Alt ×0.1), so the modifier layer is fine; it's
the base rate that disagrees.

### 2.2 Wrong step sizes

**Symptom.** Some sliders step too coarsely or too finely.

This is not one bug, it's a survey. It needs an inventory pass: every `step` passed to a
`ScalarInput` / `Slider` across the apps, against its `min`/`max`, flagging any where
`(max − min) / step` falls outside a sane band (say under 20 — unusably chunky — or over 10,000 —
pointless precision and a source of 2.1's divergence). Mechanical, greppable, and the output is a
table the owner can rule on.

Do the inventory **before** 2.1, since a pathological step is also the loudest symptom of it.

### 2.3 The slider sits under the text field

**Symptom.** Aiming at the number field catches the track instead.

A hit-area/stacking problem inside `ScalarInput`'s layout — the track element extends beneath the
number and wins the pointer. Wants the track's interactive area clipped to where the track is
actually visible, or the number raised above it. Check the full-width/fill variants too; the overlap
likely differs per variant.

### 2.4 Draggable fields don't look draggable

GMT used **diagonal stripes** as the affordance. Port that (per `feedback_port_verbatim_dont_invent`
— find the original, don't design a new one), subtle enough not to shout, on every field that is
actually drag-enabled and **only** those: an affordance on a non-draggable field is worse than none.

Same pass: make the hit areas use their available space fairly. A field that renders 60 px wide and
accepts pointer input on 24 px of it is the other half of 2.3.

`components/inputs/skin.tsx` is 25 lines and looks like the right home for the stripe treatment —
confirm before assuming.

### 2.5 Sequence

1. **Inventory** every step/min/max (2.2). Produces the table and exposes the outliers.
2. **Unify the drag rate** (2.1). The behavioural fix, and the one with real regression risk.
3. **Hit areas + stacking** (2.3, 2.4 second half). Same layout pass.
4. **Stripes** (2.4). Cosmetic, last, safe.

---

## 3. The guard gap this exposed

The Settings crash was live for a day because no harness opens a panel. That is a category gap, not
a one-off: `smoke:boot` fails on pageerrors at boot, `smoke:interact` covers state flow and preset
round-trip, and **neither clicks a chrome affordance**.

Proposed: a `smoke:chrome` that boots, clicks every registered top-bar button and menu item in turn,
and fails on any pageerror or error-boundary fallback. Cheap to write against the existing headless
setup, and it would have caught this class before the push.

Per CLAUDE.md: write it, then **break `SettingsPanel` deliberately and watch it go red** before
citing it anywhere as proof. A guard nobody has falsified is a guess about a guard — and the whole
point here is that a healthy-looking smoke suite already failed to see this.

---

## 4. Decisions recorded from the 2026-09-12 conversation

For `plans/ge-ramp-analysis-and-deep-fit.md`, now settled:

- **`shape` ships as `Arrange → group by`, not as a filter chip.** Four labelled bands on the wall.
  Grouping is also the *safer* first home for a new classifier: a misgrouped gradient is visible and
  harmless, where a misfiltered one is invisible.
- **The analysis axes become options in the hero's three-line menu** when they arrive as filters.
- **Reduce stops is a popup**, not a menu option — it has settings and a results table.
- **Later idea, UI undecided:** a "face" that *fits* the gradient along the contrast axes, the way
  reduce-stops fits stop count. Push a gradient toward monotonic-L or toward uniform speed rather
  than merely measuring it. The measurement work in Part A is the prerequisite either way, so nothing
  is blocked by leaving the UI open.
- **Everything else competitor-derived waits until after the first polished release.**
