# ADR-0127: Reduce stops is a set of named tolerances, previewed on the gradient and applied as one step

- **Status:** Accepted
- **Date:** 2026-09-24
- **Relates to:** ADR-0122 (a gradient is stops or a 256-colour ramp — Reduce is for stops);
  `plans/ge-ramp-analysis-and-deep-fit.md` §B4–B5 (the research); `plans/ge-v2-parity-checklist.md`
  row E10b (the stop count). Code: `palette/core/reduceStops.ts` (grep `REDUCE_STEPS`),
  `components/gradient/gradientStopReducer.ts` (the slot), `components/gradient/ReduceStopsPopup.tsx`,
  `components/AdvancedGradientEditor.tsx` (grep `reducePull`, `data-gx-stop-count`),
  `palette/core/stopFit.ts` (its `blendSpace` option), `palette/registerPaletteUI.ts`. Guards:
  `npm run test:palette-reducestops`, `npm run smoke:ge-reduce`.

## Context

Gradients from the catalogue, from Mix, from an image or from Curves often carry more stops than
they need, and dense stop lists are slower to edit and render. `stopFit` already fits a ramp with
few stops well, but nothing in the interface let a person ask for fewer stops on the gradient in
hand. The competitor scan (2026-09-12) settled that Reduce stops is a popup, not a filter or a
face; the owner, on 2026-09-23, put it in the gradient's ☰ menu and asked for "just some options
for how much to reduce".

## Decision

**Named amounts, not numbers.** The popup offers Light, Medium, Strong and Maximum. Each is a
tolerance: the worst rendered OkLab difference from the original at any of the 256 texels
(0.02, 0.04, 0.08, 0.15). The popup shows names and stop counts only ("16 → 8 stops"), never the
tolerances.

**Every result is measured, and never worse than the one before.** For each amount the reducer
tries greedy removal and a fresh `stopFit` fit followed by removal, keeps whichever needs fewer
stops, and checks it against the tolerance. It never returns more stops than the input or than the
previous amount; an amount that removes nothing is shown dimmed.

**The gradient keeps its own blend mode.** The fit runs in the gradient's `blendSpace` (`stopFit`
gained an option for it; omitted, it is byte-identical to before), so an RGB gradient stays RGB.

**Preview, then one step.** Hovering an amount (tapping, on a phone) paints that result on the
gradient's bar with its knots; Apply commits it as one undo step; Cancel, Esc or the menu commit
nothing, and clicking outside does not close it. Results are computed one amount per macrotask,
so a long gradient never blocks a frame.

**Where it lives.** "Reduce Stops…" sits in the gradient editor's menu (☰ and right-click), so
every host that mounts the palette suite gets it — the Explorer's hero and GMT's gradient editor
alike. It is disabled, with the reason as a tooltip, on a ramp gradient (Add Stops is its tool),
on two stops, and while a face shows something other than the stops. The hero shows a quiet
"N stops" beside the blend chooser.

## Consequences

- Light often removes nothing from a fresh catalogue pick, which was already fitted at about that
  level; it matters on edited, mixed and dense gradients (a 128-stop Softology ramp measured
  101 / 70 / 47 / 26 stops across the four amounts; core picks averaged 10.4 → 9.2 / 7.1 / 5.5 / 4.1).
- Retuning the amounts is a change to `REDUCE_STEPS` alone; the guards measure behaviour against
  the tolerances, not fixed stop counts.
