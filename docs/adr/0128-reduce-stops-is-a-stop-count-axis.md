# ADR-0128: Reduce stops is a stop-count axis, and it may find a better blend mode

- **Status:** Accepted
- **Date:** 2026-09-24
- **Supersedes in part:** ADR-0127 — its "Named amounts, not numbers", "Every result is measured,
  and never worse than the one before" (restated below for an axis) and "The gradient keeps its own
  blend mode" (now: only with the search off). Its placement, preview-then-one-step, refusals and
  the four tolerances stand.
- **Relates to:** ADR-0113 (the blend spaces), ADR-0122 (a ramp has no stops to reduce);
  `plans/ge-ramp-analysis-and-deep-fit.md`, "Update 2026-09-24" (the measurements). Code:
  `palette/core/reduceStops.ts` (grep `reduceStopsPlan`, `REDUCE_SEARCH_SPACES`, `OTHER_RATIO`,
  `THE AXIS REPAIR`), `components/gradient/gradientStopReducer.ts` (`GradientReducePlan`),
  `components/gradient/ReduceStopsPopup.tsx`, `components/AdvancedGradientEditor.tsx` (grep
  `REDUCE_SEARCH_KEY`, `reduceSubject`), `palette/registerPaletteUI.ts` (the phone rule). Guards:
  `npm run test:palette-reducestops`, `npm run smoke:ge-reduce`.

## Context

The owner, the day after ADR-0127 shipped: the reduce "could be more granular, and also it can
have an (enabled) option to model against different blending modes to find the most suitable
one". Asked three follow-ups, they answered: go down to 2 stops; do not skip Spectral except on
a phone; a readout that names the mode is enough.

Measured before building, over 346 gradients (picks from all five catalogue packs, Detail-8 bakes
of three, and the presets):

- **The four names gave 3.0 different answers per gradient.** Light is often a no-op on a pick and
  neighbours land on the same count; a count axis offers ~13 positions.
- **Blend-mode search saves 15 / 10 / 8 / 5% of stops** at Light / Medium / Strong / Maximum (29% at
  Light on core picks). An earlier note put it at ~4% — measured on the 25 presets, which were
  authored in OkLCh; the catalogue's sources were authored in RGB and GX re-describes them in
  OkLCh when picked, so RGB usually wins. RGB alone carried 86% of the saving; Spectral the last 4%
  at about twice the time of the other five together.
- **The greedy removal path alone matches the old ladder** at its tolerances (0.03 stops worse on
  average) in 9–79 ms, visiting every count on the way down.

## Decision

**A stop-count axis.** The popup's slider covers every count from one fewer than the gradient
has down to 2; each position is the best version found with exactly that many stops. The four
names stay, as quick picks that land where their tolerance does (unchanged: 0.02 / 0.04 / 0.08 /
0.15). The popup still shows counts and names, never a tolerance.

**More stops never look worse than fewer.** A removal path is not monotone (8.6% of counts were
further off than the count below them), so wherever a count is worse, the count below plus one
well-placed stop — one on its own rendered curve is always among the tries — takes its place.

**"Try other blend modes", on by default.** Every other live mode is fitted too, ONE other mode is
chosen per gradient (the one that most lowers the error along the axis), and it is used at a count
only where it is clearly better (under 0.8 × the own mode's error). One mode, not the best per
count: the best per count switched mode about five times along a gradient's axis; one mode keeps
9.8 of the 11.3% the free choice saved. A version in another mode says so in the readout ("12 → 7
stops · RGB") and Apply switches the gradient to it, in the same one undo step as the stops. The
choice is remembered per browser. **A phone searches every mode but Spectral.**

**Plans, not results.** The reducer yields a whole plan and then better ones: the first (the own
path) in tens of milliseconds, the search behind it, one `next()` per macrotask. A chosen name
follows its count as the plan improves; a dragged count stays where it was put.

## Consequences

- Nothing downstream of the gradient sees a changed blend mode — every exporter and the texture
  read the baked 256-texel ramp — but later edits blend in the new mode. That is the price of the
  saving, and why the readout names it and the search can be switched off.
- GMT's gradient editor gets the same popup through the same seam, so a GMT gradient's blend mode
  can change the same way, inside the param's one undo step.
- The whole search takes a median of ~0.4 s (1.1 s, worst 2.5 s, on 60-stop gradients) while
  the popup stays live; one `fitRampToStops` call is the indivisible unit (worst 129 ms seen).
- Retuning is a change to `REFIT_TOLS`, `OTHER_RATIO` or `REDUCE_SEARCH_SPACES` alone; the guards
  measure behaviour against the tolerances and against the search-off plan, not fixed counts.
