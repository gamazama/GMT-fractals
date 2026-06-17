# Graph-editor unification — collapse the palette fork into one generic component

**Status:** plan (surfaced by `/simplify` on the channel-curve editor, 2026-06-03).
**Goal:** one store-agnostic animation/graph editor used by BOTH the live timeline
(`components/GraphEditor.tsx`) and the palette channel-curve editor
(`palette/components/ChannelGraphEditor.tsx`) — delete the ~950-line fork.

## Why

The palette editor was written as a deliberately structurally-close FORK of the
GMT graph editor. The interaction + tools logic is algorithmically identical; the
ONLY differences are:

| Concern | Live timeline (original) | Palette editor (fork) |
|---|---|---|
| Data source | `useAnimationStore` (reads + actions) | local React state via callbacks |
| Playhead / scrub | yes (`scrub`, `seek`, `setIsScrubbing`, `animationEngine.scrub`) | none (hidden playhead) |
| Track selection | `setTrackSelection` / `addTracksToSelection` | n/a (3 fixed channels) |
| X axis | unbounded `durationFrames` | fixed `CURVE_FRAMES` (256) |
| Vertical | per-track normalize toggle | per-channel normalize (same mechanism) |

Forked files (delete targets): `useChannelGraphInteraction.ts` (~720),
`useChannelGraphTools.ts` (~210), `ChannelSelectionBBox.tsx` (~190 — near-verbatim
port of `components/graph/GraphSelectionBBox.tsx`). Keep (genuinely palette-specific):
`ChannelGraphEditor.tsx` (glue), `ChannelKeyframeInspector.tsx`, `ChannelTrackSidebar.tsx`,
`InlineToggleButtons.tsx`.

**Already pure / reused as-is (no work):** `GraphCanvas`, `GraphRenderer`,
`GraphUtils`, `AnimationMath`, `calculateSmoothingUpdates` /
`calculateConstrainedSmoothing` / `calculateResampleUpdates` / `simplifyTrack` /
`calculateSoftFalloff` / `getTangentStats` / `updateTangentFromStats`,
`keyframeViewBounds`, `trackBinding`. The fork already calls all of these directly.

## The seam — `GraphDataSource`

**Validated 2026-06-03:** `components/GraphEditor.tsx` is the SOLE live consumer of
all three (`useGraphInteraction` / `useGraphTools` / `GraphSelectionBBox`) — one
call site to convert. Full touchpoint audit of `useGraphInteraction` (the plan's
first-draft interface missed the *italic* ones):
reads `sequence`, `selectedKeyframeIds`, soft* — plus *`currentFrame`*;
actions `updateKeyframes` / `selectKeyframes` / `deselectAllKeys` / `setSoftSelection`
/ `snapshot` / `setTrackSelection` / `addTracksToSelection` / `setIsScrubbing` / `seek`
— plus the *singular* *`updateKeyframe`* / *`selectKeyframe`*; and the side-effect
*`animationEngine.scrub(frame)`* after key/handle moves + on scrub (timeline-only —
the palette fork has none). `useGraphTools` additionally reads `bounceTension`/
`bounceFriction` and calls `useAnimationStore.setState` directly + `addKeyframe`.

The only thing blocking reuse is these store reads/writes in the originals. Abstract
them behind one injected interface:

```ts
// utils/GraphDataSource.ts
export interface GraphDataSource {
  // reactive reads
  sequence: AnimationSequence;
  selectedKeyframeIds: string[];
  softSelectionEnabled: boolean;
  softSelectionRadius: number;
  softSelectionType: SoftSelectionType;
  // mutations (replace the store actions)
  currentFrame: number;                 // palette passes a fixed/hidden value
  updateKeyframes(updates: { trackId: string; keyId: string; patch: Partial<Keyframe> }[]): void;
  updateKeyframe(trackId: string, keyId: string, patch: Partial<Keyframe>): void; // singular form the original uses
  selectKeyframes(ids: string[], additive: boolean): void;
  selectKeyframe(trackId: string, keyId: string, additive: boolean): void;
  deselectAllKeys(): void;
  setSoftSelection(radius: number, enabled: boolean): void;
  snapshot?(): void;
  addKeyframe?(trackId: string, frame: number, value: number, interp: Keyframe['interpolation']): void; // useGraphTools
  onAfterMutate?(frame: number): void;  // timeline = animationEngine.scrub(frame); palette = no-op
  bounceTension?: number;               // useGraphTools smoothing physics (default 0.5/0.6)
  bounceFriction?: number;
  // optional timeline-only features (fork passes none / disabled)
  setTrackSelection?(tid: string): void;
  addTracksToSelection?(tids: string[]): void;
  scrub?: { enabled: boolean; seek(f: number): void; setIsScrubbing(b: boolean): void };
}
```

The default impl wraps `useAnimationStore`; the palette editor supplies a
local-state impl (it already has every callback). Feature-flag the timeline-only
paths (`scrub`, track selection) so the fork omits them cleanly.

## STATUS: DONE (2026-06-03)

All three steps executed in order. The ~950-line palette fork is gone; one
store-agnostic graph editor now serves both the live timeline and the palette
channel-curve editor.

- **Step 1 ✅** `utils/GraphDataSource.ts` added (interface + `useAnimationStoreDataSource()`).
  One field beyond the first-draft interface: `replaceKeyframes?` — bake/simplify
  swap whole keyframe arrays (add/remove keys), which `updateKeyframes` (patch-by-id)
  can't express; timeline impl = `useAnimationStore.setState`, palette = `onTracksChange`.
  The `scrub?` field carries `seek` + `setIsScrubbing` (ruler scrub) **and**
  `begin`/`end` (the ADR-0061 InteractionSession gesture the BBox uses).
- **Step 2 ✅** `useGraphInteraction` / `useGraphTools` / `GraphSelectionBBox` all route
  through `ds.*`. The ruler-scrub region check is gated on `ds.scrub`; track-selection
  sync on `ds.setTrackSelection`. **Deviation from plan:** `GraphSelectionBBox` takes a
  **required** `dataSource` prop (a component can't default to a hook without a
  conditional-hook call); `GraphEditor` builds ONE `useAnimationStoreDataSource()` and
  passes it to all three (was 3 independent store subscriptions → 1, behaviour-identical).
  Gate: tsc 0 + `smoke:anim-play / anim-vec2 / anim-orbit / track-binding` green +
  user-verified live timeline (drag/handles/box/soft/bake/smooth/simplify/scrub).
  **Bonus fix (user-reported during verify):** resizing the timeline slid the curves
  vertically (`valueToPixel` anchors to `height/2`, so a Δheight moved every curve by
  Δheight/2). Added a height-change effect in `GraphEditor` that shifts `panY` by
  `Δheight/(2·scaleY)` to pin the curves at the user's zoom. `ChannelGraphEditor` already
  re-fits on resize so it never drifted.
- **Step 3 ✅** `ChannelGraphEditor` builds a local `GraphDataSource` (no scrub, no
  track-selection, no snapshot/onAfterMutate/addKeyframe → smoothing physics default to
  0.5/0.6; `selectedTrackIds = displayTrackIds` so "nothing selected" targets all visible
  channels, matching the old fork). It now calls the engine `useGraphInteraction` /
  `useGraphTools` / `GraphSelectionBBox`. **Deleted:** `useChannelGraphInteraction.ts`,
  `useChannelGraphTools.ts`, `ChannelSelectionBBox.tsx`. Kept (genuinely palette-specific):
  `ChannelGraphEditor.tsx`, `ChannelKeyframeInspector.tsx`, `ChannelTrackSidebar.tsx`,
  `InlineToggleButtons.tsx`. Gate: tsc 0 + `test:palette` all green + `orphans` clean
  (only pre-existing vite-entry false-positives).

**Stable-ref contract — now obsolete but preserved.** The fork warned `updateKeyframes`
MUST be a stable ref or the mousemove listener tears down mid-drag. In the unified
`useGraphInteraction` the window handlers read everything from `latestProps.current.ds`
and the memoized `handleGlobalMove`/`handleGlobalUp` deps are stable (`[canvasRef,
LEFT_GUTTER_WIDTH]`), so the hook is now ROBUST to `ds`/`updateKeyframes` identity changing
each render — the listener is bound imperatively at mousedown and never torn down by a
re-render. The palette's `updateKeyframes` is still a stable ref (reads `tracksRef`), which
is good hygiene but no longer load-bearing.

**Post-merge fix — normalized key-drag span (2026-06-03, user-reported).** In
normalized mode the value axis is scaled per-track by `span` (`(val-min)/span`), so a
pixel of mouse travel = `span` value units. The handle-drag already corrected for this
(`valDelta *= r.span`) but the **key**-drag did not (latent in BOTH the old timeline hook
and the old fork — identical code), so nodes moved `mouse/span` vertically (≈3× too little,
varying by channel). Fixed in `useGraphInteraction` with a per-track `valDeltaFor(tid)`
(applied in both the standard and soft-selection branches). Per-track because a multi-track
selection can mix spans. Log tracks use the same linear-span approximation the handle drag
already uses (consistent, and better than the prior no-span). Fixes both editors.

**Behaviour-equivalence note (smooth/bake/simplify).** The fork applied tool updates to a
drag-start snapshot; the unified hook applies via `ds.updateKeyframes`/`replaceKeyframes`
to the live tracks (exactly as the timeline always did). Equivalent because the targeted
key SET is selection-based (frozen for the duration of a drag), so each move fully
overwrites the same keys and never strands a key; the r=0 smooth "reset" is a no-op in
both since the drag-frozen sequence equals the snapshot.

## Staged plan (smallest, lowest-risk first)

- **Step 0 (done in this pass):** safe local cleanups that shrink the eventual diff
  — efficiency fix (no per-move deep clone in `useChannelGraphTools`), inspector
  tangent-rows map. Did NOT micro-refactor the fork internals or `ChannelSelectionBBox`
  — keeping them byte-close to the originals makes Step 3 mechanical.
- **Step 1:** add `utils/GraphDataSource.ts` (interface + a `useAnimationStoreDataSource()`
  default). Pure types; zero behaviour change.
- **Step 2:** generalize the THREE originals to accept an optional `dataSource`
  (default = store): `useGraphInteraction`, `useGraphTools`, `GraphSelectionBBox`.
  Replace each `useAnimationStore` read/action with `ds.*`; gate scrub/track-selection
  on the optional feature flags. Backward-compatible — the live timeline keeps working
  unchanged (it gets the default store data source). **This is the load-bearing step;
  verify the live timeline pixel-for-pixel (smoke: anim-play / anim-vec2 / track-binding).**
- **Step 3:** in `ChannelGraphEditor`, build a local `GraphDataSource` and call the
  ORIGINAL hooks + `GraphSelectionBBox`; **delete** the three forked files. Net ≈ −950
  lines duplication, +~100 in the originals.

## Risks / notes

- Step 2 touches the live timeline's hooks → run the anim smokes + manual scrub/drag
  check before/after. This is why it's NOT part of the `/simplify` apply pass (out of
  the reviewed diff, behaviour-sensitive).
- `ChannelTrackSidebar` stays palette-specific (per-channel show/hide of L/C/h — the
  timeline's `GraphSidebar` is a different track-list UX). `ChannelKeyframeInspector` was
  CONVERGED (see follow-up below).

## FOLLOW-UP: KeyframeInspector converged (2026-06-03)

`ChannelKeyframeInspector` (~190 lines) deleted; the palette now renders the timeline's
`KeyframeInspector` driven by the same `GraphDataSource`. The palette inherited the richer
inspector: multi-select editing, Linear/Smooth/Flat quick-actions (incl. global-interp when
nothing is selected), and the delete button.
- **Shared pure helpers** `calculateTangentModeUpdates` + `calculateGlobalInterpolationUpdates`
  extracted into `utils/timelineUtils.ts`. The store's `setTangents` / `setGlobalInterpolation`
  were refactored to use them (computation shared; each keeps its existing clone-and-set apply
  so the timeline's memo-invalidation behaviour is byte-identical). The palette's data source
  uses the same helpers (`setTangents` → `updateKeyframes(calc…)`, `setGlobalInterpolation` →
  `replaceKeyframes(calc…)`).
- **GraphDataSource** gained optional `setTangents` / `setGlobalInterpolation` /
  `deleteSelectedKeyframes` / `setSoftSelectionType`. `KeyframeInspector` gates each control on
  the matching method's presence, so a leaner data source degrades gracefully (both editors
  supply all four, so both show the full UI).
- **Defaulting:** `KeyframeInspector` takes an optional `dataSource` prop; `Timeline.tsx`
  renders it propless → `dataSource ?? useAnimationStoreDataSource()` (per-call-site consistent,
  so the conditional hook is safe; palette passes its local source and skips the store hook).
- **Layout:** palette `INSPECTOR_W` 176 → 256 to match the shared inspector's `w-64`.
- Rotation handling stays an inline `tid.includes('rotation')` heuristic (store-agnostic;
  palette channel ids never match). Gate: tsc 0 + test:palette + anim smokes + orphans green,
  user-verified both inspectors.
- The fork's `updateKeyframes` MUST stay a stable ref (documented in the fork) — the
  unified hook must preserve that contract or the mousemove listener tears down mid-drag.
