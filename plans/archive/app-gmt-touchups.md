# app-gmt — final touchups

Small polish items remaining on dev/app-gmt. Each section names files + lines so changes can be made independently. Rough order is "self-contained UI tweaks → bigger investigations" but they're not load-bearing on each other.

---

## 1. Gradient → Repeats slider: more log, expand 0.1–5 range

**Where:** [engine-gmt/features/coloring/index.ts:102](engine-gmt/features/coloring/index.ts#L102) and [engine-gmt/features/coloring/index.ts:216](engine-gmt/features/coloring/index.ts#L216) — `repeats` and `repeats2` params.

**Current:**
```ts
repeats:  { type: 'float', default: 1.0, label: 'Repeats', shortId: 'r1', min: 0.1, max: 100, step: 0.1, ... }
repeats2: { ... same shape ... }
```
Linear over [0.1, 100] — almost the entire bar lives in the > 5 range that nobody uses; the artistic sweet-spot 0.1–5 collapses into ~5% of the slider.

**Change:** add `scale: 'log'` (existing param convention — see `escape` at [coloring/index.ts:152](engine-gmt/features/coloring/index.ts#L152) and `overstepTolerance` in [quality.ts:152](engine-gmt/features/quality.ts#L152)) so the bar maps logarithmically. With `min: 0.1`, `max: 100`, log mapping puts the geometric midpoint (≈3.16) at 50% — i.e. half the bar lives in 0.1–~3, half in ~3–100. That's roughly what the user asked for ("half the bar should be in 0.1 to 5 range").

**Verify:** the existing `Slider` log-scale path handles min ≥ 0.1 fine (escape uses `min: 1`, overstep uses `min: 0.0` with a guard). No `customMapping` needed — the param-level `scale: 'log'` flag is the normal route.

---

## 2. Shadow panel — remove horizontal padding

**Where:** [engine-gmt/features/lighting/components/ShadowControls.tsx:19](engine-gmt/features/lighting/components/ShadowControls.tsx#L19).

**Current:**
```tsx
<Popover width="w-52" tutAnchor="shadow-panel">
    <div className="relative space-y-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1"> ...header... </div>
        {shadows && (
            <div className="space-y-1">
                <AutoFeaturePanel featureId="lighting" groupFilter="shadows" />
            </div>
        )}
    </div>
</Popover>
```

The `Popover` primitive already supplies its own padding (check [components/Popover.tsx](components/Popover.tsx)); the per-row `px-3` inside `AutoFeaturePanel` rows then double-pads the lighting/shadow widgets so they look inset relative to other panels.

**Change:** check the Popover wrapper's default padding. If it adds `p-2`/`p-3`, override with `className="!p-0"` (or whatever the prop is — confirm in source) for this popover specifically, and let the inner `AutoFeaturePanel` rows own their own horizontal spacing. Alternatively, drop the leading `px-1` on the header and rely on the panel's internal row padding for alignment.

Visual goal: shadow controls flush-left/right with the popover edge instead of inset.

---

## 3. Quality → Resolution → Internal Scale + Viewport Quality multiplier: add 0.75, link them

Two related changes.

**3a. Add 0.75 to the AA-level dropdown.**

[engine-gmt/components/panels/quality/QualityRenderControls.tsx:41](engine-gmt/components/panels/quality/QualityRenderControls.tsx#L41):
```ts
const AA_LEVELS = [
    { label: '0.25', value: 0.25 },
    { label: '0.5',  value: 0.5  },
    { label: '1.0',  value: 1.0  },
    { label: '1.5',  value: 1.5  },
    { label: '2.0',  value: 2.0  },
];
```
→ insert `{ label: '0.75', value: 0.75 }` between 0.5 and 1.0.

The store side ([store/slices/renderControlSlice.ts:82](store/slices/renderControlSlice.ts#L82)) already accepts arbitrary float `aaLevel` and pipes it to `dpr` — no schema change needed.

**3b. Link the in-viewport render-scale pill to the same `aaLevel`.**

Found it. The pill is `RenderScaleControl` rendered inside `ViewportModeControls` at [engine/plugins/viewport/ViewportModeControls.tsx:42](engine/plugins/viewport/ViewportModeControls.tsx#L42) — top-center of the viewport, only visible in Fixed mode (intentional — see comment at line 138-140). It uses an app-supplied source via `setRenderScaleSource(...)`.

GMT registers that source in [app-gmt/main.tsx:141-148](app-gmt/main.tsx#L141-L148):
```ts
setRenderScaleSource({
    use: () => {
        const value = useEngineStore((s: any) => s.quality?.aaLevel ?? 1.0);
        const setQuality = useEngineStore((s: any) => s.setQuality);
        return [value, (v: number) => setQuality({ aaLevel: v })];
    },
    steps: [0.25, 0.5, 1.0, 1.5, 2.0],
});
```

**Two problems:**
- The source reads/writes `quality.aaLevel`, but the Quality panel's "Internal Scale" reads/writes the root-level `aaLevel` (renderControlSlice). Same name, different field. They never see each other's writes — that's why they appear unlinked.
- The `steps` array hardcoded here lacks 0.75. The default `RENDER_SCALE_STEPS` in [store/slices/viewportSlice.ts:73](store/slices/viewportSlice.ts#L73) (`[0.25, 0.5, 0.75, 1.0, 1.5, 2.0]`) already has it, but the override shadows it.

**Fix:**
- Repoint the source to the renderControlSlice's `aaLevel` / `setAALevel`. After 3a, that's the field with `0.75` in its dropdown:
  ```ts
  setRenderScaleSource({
      use: () => {
          const value = useEngineStore((s: any) => s.aaLevel ?? 1.0);
          const setAALevel = useEngineStore((s: any) => s.setAALevel);
          return [value, (v: number) => setAALevel(v)];
      },
      steps: [0.25, 0.5, 0.75, 1.0, 1.5, 2.0],
  });
  ```
- Verify nothing else is reading `quality.aaLevel` — that field looks like a stale leftover (no param defined in `quality.ts`; `setQuality({aaLevel})` writes a field nothing actually reads). If confirmed, that's a separate small cleanup.
- After wiring: changing the viewport pill updates the Internal Scale dropdown, and vice-versa, on every frame. Single source of truth = `aaLevel` in renderControlSlice → `dpr` via `setAALevel` (see [renderControlSlice.ts:82-87](store/slices/renderControlSlice.ts#L82)).

---

## 4. Bucket render — output was the enlarged last tile (bug)

**Symptom:** user ran a bucket render and the saved output was the last tile, scaled up to fill the export resolution — not the stitched grid.

**Suspected cause:** the interaction between the two resolution paths — the `aaLevel`/`dpr` viewport multiplier and the bucket panel's `setResolutionMode('Fixed')` swap at [engine/plugins/topbar/BucketRenderPanel.tsx:244-251](engine/plugins/topbar/BucketRenderPanel.tsx#L244-L251). Per-tile dims are computed as `Math.floor(outputWidth / tileCols)` (line 257), but `outputWidth` here is the user-set export width, while the actual render target may be sized via `pipeline.resize(width, height)` in `GmtBucketHost.setRenderSize` at [engine-gmt/engine/GmtBucketHost.ts:105](engine-gmt/engine/GmtBucketHost.ts#L105).

If `dpr` / the viewport multiplier silently scales the requested tile size up or down between "compute tile rect" and "actual GL render," the readback would capture the wrong region — and if the readback covers the full tile size *but* the stitcher expects the unscaled size, the last tile could be the only one that "fits" by accident and end up filling the saved PNG.

**Action:**
- bucket render with viewport quality at non-1.0, output ≠ viewport, ≥2×2 tiles. Compare with same render at viewport quality = 1.0.
- Trace: log `tilePixels` (panel-side), `setRenderSize(width, height)` (host-side), and the BucketRunner's tile-stitch step. Look for any place where `dpr` or `aaLevel` multiplies the resolution after bucket-render begins.
- Likely fix: bucket render should pin its render target dimensions to the user's `outputWidth/outputHeight` regardless of viewport `dpr`. The host's `setRenderSize` must not be modulated by anything that changes during the export window. Verify the engine's `pipeline.resize` doesn't apply dpr internally.
- Also confirm the panel's `Fixed`-mode swap at the start of the popover lifecycle doesn't fight an `aaLevel` change made *while* the panel is open.

This may also be the cause of #7 (accumulation reset on open/close) — both look like resolution-side-effect bugs.

---

## 5. Bucket render ETA format — "10.5m – 12m" (30s rounding, no seconds)

**Where:** [engine-gmt/components/timeline/exportHelpers.ts:4](engine-gmt/components/timeline/exportHelpers.ts#L4) — `formatTimeWithUnits`. Used by the bucket panel at [engine/plugins/topbar/BucketRenderPanel.tsx:386-387](engine/plugins/topbar/BucketRenderPanel.tsx#L386).

**Current:**
```ts
if (secs < 60) return `${secs.toFixed(0)}s`;
if (m < 60)    return `${m}m ${s}s`;
return `${h}h ${remM}m`;
```
ETA renders like `2m 15s` or `10m 30s`.

**Change (bucket-ETA only — don't touch the elapsed counter or other consumers):**

Two options, both fine:
- **A. New helper** `formatEtaCoarse(secs)` in `exportHelpers.ts`:
  - < 60s → `${secs.toFixed(0)}s` (preserve fine grain so very fast renders aren't all "0m")
  - 60s – 1h → round to nearest 0.5 minute → `${(Math.round(secs/30)/2).toFixed(1).replace('.0','')}m` (yields `10.5m`, `12m`, `1m`)
  - ≥ 1h → `${h}h ${Math.round(remM/30)*30 ? '30m' : ''}` or just `${h}h`
- **B. Inline change** in the bucket panel, only at the ETA call site, leaving `formatTimeWithUnits` untouched.

Prefer A — the elapsed/duration callers in the timeline export view stay precise; only the bucket ETA pill rounds. Apply at lines 386-387:
```tsx
const etaLabel = etaRange.max > 0
    ? `${formatEtaCoarse(etaRange.min)} – ${formatEtaCoarse(etaRange.max)}`
    : '—';
```

---

## 6. Auto-Stop accumulation samples — lower default to 64

**Decision:** one-liner. Change the default `sampleCap` in [renderControlSlice.ts:58](store/slices/renderControlSlice.ts#L58) from `256` → `64`. Slider already accepts the lower value (`min={0}`, `step={32}`) so no UI change.

64 is enough for most viewport refines; users who want longer convergence can drag the slider up. Existing scenes with explicit `sampleCap` saved into a preset keep that value — only the default changes.

---

## 7. Accumulation reset on bucket-render panel open/close

**Symptom:** opening or closing the bucket render popover wipes the on-screen accumulator unnecessarily.

**Where:** [engine/plugins/topbar/BucketRenderPanel.tsx:146-172](engine/plugins/topbar/BucketRenderPanel.tsx#L146-L172) — the mount/unmount effect that snapshots viewport state and swaps to `Fixed` mode if `matchViewportAspect === false`.

**Cause:** `state.setResolutionMode(...)` and `state.setFixedResolution(...)` likely trigger pipeline resize → `reset_accum`. On close, the saved-state restore does it again. So the user pays an accumulator reset twice for opening the panel even when no bucket render runs.

**Action:**
- Identify which exact setter emits `reset_accum`. Likely the viewport-plugin subscription on `dpr` / canvas-pixel-size changes — not the renderControlSlice setters themselves (those don't emit `reset_accum` for `setOutputWidth/Height/setResolutionMode/setFixedResolution`).
- Cheapest fix: detect "no actual change" before swapping. If `matchViewportAspect === true` OR the computed Fixed dims equal the viewport's current dims, skip the swap entirely.
- Stronger fix: gate the reset_accum on a "real" pipeline-content change, not on dpr/resolution mode changes that are purely viewport-side. Bucket prep doesn't change the rendered scene — only its on-canvas presentation.
- For close: if the pre-open mode/dims match what's currently set (no swap happened), skip the restore.

This may share root cause with #4 — same family of "bucket prep changes resolution as a side effect."

---

## 8. Tile-blit downscale filtering during render

**Symptom:** while a bucket render is in progress and the per-tile composite is blitted to the canvas at a smaller size than its source, the result is visibly aliased / blocky.

**Where:** [engine-gmt/engine/GmtBucketHost.ts:207-228](engine-gmt/engine/GmtBucketHost.ts#L207-L228) — `onTileBlitToScreen`. Uses `displayMaterial` to render the composite texture into the canvas.

**Action:**
- Check `MaterialController.displayMaterial` — what filter mode is its `map` uniform's texture set to?
- The composite texture (`pipeline.getOutputTexture()`) is a render target, typically `THREE.NearestFilter` for both `min` and `mag` to avoid sampling artifacts during accumulation.
- For the on-screen blit ONLY (not the readback path), set `composite.minFilter = THREE.LinearFilter` and `composite.magFilter = THREE.LinearFilter` before `gl.render(displayScene, ...)`, then restore. Or use a separate texture object aliased to the same GPU texture with linear sampling.
- Alternative: branch in the shader — if the composite is at a higher resolution than the canvas viewport, downsample with a 2×2 (or wider) box filter in `displayMaterial`'s frag. Cheap, keeps the readback path nearest.
- Don't change the readback path's filtering — exported PNGs must come from nearest-sampled texels (no resampling artifacts in saved tiles).

Out-of-scope but adjacent: the SSAA pixel-density override path at [GmtBucketHost.ts:70](engine-gmt/engine/GmtBucketHost.ts#L70) is separate — that's primary-ray density, not filtering.

---

## 9. Loading screen — progress bar is scaled, not masked

**Symptom:** the LoadingScreen progress bar visually scales the inner Julia spinner instead of revealing it through a clip.

**Where:** [app-gmt/LoadingScreen.tsx:168-181](app-gmt/LoadingScreen.tsx#L168-L181).

**Current:**
```tsx
<div className="relative z-10 w-[500px] h-16 ... overflow-hidden ...">
    <div
        className="absolute top-0 left-0 w-[500px] h-full origin-left overflow-hidden transition-transform duration-75 ease-linear"
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress / 100))})`, willChange: 'transform' }}
    >
        <canvas ref={fgCanvasRef} className="absolute top-0 left-0 w-[500px] h-16" />
    </div>
    ...
</div>
```

The intent (per the existing comment) is "use scaleX so the fill animates on the compositor thread, and the Julia canvas inside is rendered at full width and revealed by the clip." The clip is the inner `overflow-hidden`. But because both the inner div AND the `<canvas>` are 500px wide, when scaleX is e.g. 0.5, the canvas paints into 500px of layout width but the parent's transform compresses it horizontally to 250px → scaled, not masked.

**Fix:** the `scaleX` approach only works as a mask if you counter-scale the child OR use a `clip-path` / `width` animation instead of a transform. Three options, in order of simplicity:

- **A.** Counter-scale the canvas: wrap the canvas in `style={{ transform: 'scaleX(...)', transformOrigin: 'left' }}` with the inverse scale. Brittle (divide-by-zero at progress=0) and breaks the compositor-thread benefit.
- **B.** Animate `clip-path: inset(0 ${100-progress}% 0 0)` on the parent div. GPU-composited on modern browsers; the canvas inside paints once at full size and gets clipped, no scaling. This is what the original comment was trying to describe. Recommended.
- **C.** Animate the parent's `width` from 0 → 500px. Layout thrash, defeats the original perf intent.

Go with B. Drop the `transform: scaleX(...)` and replace with `clipPath: inset(0 ${(1 - p) * 100}% 0 0)` on the inner div. Keep the `willChange: 'clip-path'` and `transition` so the bar animates smoothly. Verify on Firefox (the original comment mentions a Firefox-specific paint stall that motivated the compositor approach).

Worth a smoke pass on the bar at very low (5%) and very high (95%) progress to confirm it looks like a mask.

---

## 10. Viewport ratio dropdown — add Custom (resolution dialog)

**Where:** the "Fit to Window" dropdown in [engine/plugins/viewport/FixedResolutionControls.tsx:139-155](engine/plugins/viewport/FixedResolutionControls.tsx#L139-L155), populated from `ASPECT_RATIOS` in [data/resolutionPresets.ts:22](data/resolutionPresets.ts#L22).

**Action:**
1. Append `{ label: 'Custom...', ratio: 'Custom' }` to `ASPECT_RATIOS`. Extend `AspectRatioValue` in the same file to `number | 'Max' | 'Free' | 'Custom'`.
2. In `FixedResolutionControls.applyPreset` (line 92), branch on `'Custom'` and open a small modal instead of computing dimensions. The other viewport consumer (`ASPECT_LOCK_OPTIONS` filter at [resolutionPresets.ts:41](data/resolutionPresets.ts#L41)) excludes `'Max'` — extend the filter to also exclude `'Custom'` so the bucket-render and quality-panel ratio dropdowns don't get a no-op entry.
3. Modal contents: two `NumberInput`s (W, H) only — no DPR / internal-scale controls (those live in the Quality panel and the new viewport pill from #3b). OK / Cancel.
4. On OK: call `onSetResolution(snap8(w), snap8(h))` (the prop already wired to `setFixedResolution`). No mode switch needed — the dropdown only appears in Fixed mode anyway.
5. Modal primitive: use whatever the Hardware Preferences modal uses (check `HardwarePreferencesModal` or similar — known good pattern per HANDOFF.md 2026-04-26). Don't roll a new one.

Don't extend `RESOLUTION_PRESETS` for this — that list is curated. Custom is a UI-only sentinel that opens a dialog.

---

## Status

| # | Item | Status |
|---|------|--------|
| 1 | Repeats slider log scale | ✅ done — Slider in `ColoringHistogram.tsx` is hand-rolled (not driven by AutoFeaturePanel), so the param-def `scale: 'log'` was inert. Added `customMapping` directly on the Slider; one component covers both layers via the `layer` prop |
| 2 | Shadow panel padding | ✅ done — Popover gets `!px-0`, header gets matching `px-3` |
| 3a | Add 0.75 to AA_LEVELS | ✅ done |
| 3b | Repoint viewport render-scale source at root `aaLevel`, add 0.75 step | ✅ done — `app-gmt/main.tsx` rewired |
| 4 | Bucket scaled-tile bug | ⏸ deferred — please retest after #3b; the suspected root was the dual-`aaLevel` confusion that #3b fixes |
| 5 | ETA coarse format | ✅ done — new `formatEtaCoarse` helper, used at the bucket pill only |
| 6 | Lower default sampleCap to 64 | ✅ done |
| 7 | Accum reset on bucket open/close | ✅ done — adaptive-suppress moved to render-start; restore guarded on actual swap |
| 8 | Tile blit filtering | ✅ done — initial mipmap approach failed (Float32 + `gl.generateMipmap` produced black; `OES_texture_float_linear` / Three RT-tracking issues). Reverted. Real path: the *live* in-progress blit (`handleRenderTick`) sampled `pipeline.outputTexture` (e.g. 8k tile) into the canvas (~800px) bilinear-only. Added `uPreviewBoxTaps` uniform on `displayMaterial`; shader does NxN box average (capped 8×8) when taps > 1. `handleRenderTick` sets taps to `ceil(srcSize/canvasFootprint)` during bucket render, 1 otherwise. Zero cost outside bucket render; ~30M texture reads at 8× downsample on a small preview (sub-millisecond on modern GPUs). |
| 9 | Loading screen mask not scale | ✅ done — `clip-path: inset(...)` instead of `scaleX` |
| 10 | Viewport ratio Custom dialog | ✅ done — `Custom...` entry opens portal modal with W/H NumberInputs, Enter applies, Esc cancels |

`npx tsc --noEmit` clean. `npm run build` clean (~8s).

## Resolved

- **#3b:** in-viewport render-scale pill (top-center, Fixed mode), repointed at root `aaLevel`.
- **#6:** lower default to 64.
- **#10:** strictly W×H.

---

# Animation timeline — round 2

Docs read first: [`engine/08_Animation.md`](../docs/engine/08_Animation.md), [`gmt/04_Animation_Engine.md`](../docs/gmt/04_Animation_Engine.md), [`gmt/24_Formula_Interlace_System.md`](../docs/gmt/24_Formula_Interlace_System.md). Selection state is already shared across views (per [§7.2 SelectionSlice](../docs/gmt/04_Animation_Engine.md) — `setTrackSelection` / `selectKeyframe` etc. live in `store/animation/selectionSlice.ts`); group-collapse state is the missing piece. Track grouping for both views is centralised in [`utils/groupTracks.ts`](../engine-gmt/utils/groupTracks.ts) per the docs — that's the single file behind #13 and #14.

## 11. Persist group open/closed + selection across Graph Editor ↔ Dope Sheet

**Symptom:** opening a group in the Dope Sheet, switching to the Graph Editor, and switching back — group state is reset. Selection sometimes appears to clear too.

**Where:**
- DopeSheet: [components/timeline/DopeSheet.tsx:83](engine-gmt/components/timeline/DopeSheet.tsx#L83) — `useState<Set<string>>(new Set(['Formula', 'Optics', 'Lighting', 'Shading']))`.
- GraphSidebar: [components/graph/GraphSidebar.tsx:52](components/graph/GraphSidebar.tsx#L52) — same `useState<Set<string>>`, identical default. Two parallel React-local states with no shared source.

**Selection** is already shared via [`store/animation/selectionSlice.ts`](store/animation/selectionSlice.ts) (`selectedTrackIds` / `selectedKeyframeIds`) — both views subscribe (`GraphEditor.tsx:48-49`, DopeSheet via TrackRow). If the user reports selection loss, it's likely a side-effect of the views *unmounting* on tab switch — confirm in the timeline tab-switch component whether the inactive view is unmounted (losing its local state) vs hidden (preserving it). The collapsedGroups state would be wiped on unmount even if it's a `useState`.

**Change:**
1. Add a small `timelineUiSlice` (or extend the existing selection slice with a `ui:` namespace) holding `collapsedGroups: Set<string>` + a `toggleCollapsedGroup(name, isAlt)` action. Mirror the existing `toggleGroup` logic from [DopeSheet.tsx:137-152](engine-gmt/components/timeline/DopeSheet.tsx#L137) — Alt-click = solo (collapse all others). Keep the same default `new Set(['Formula', 'Optics', 'Lighting', 'Shading'])`.
2. Replace the `useState` in BOTH `DopeSheet.tsx:83` and `GraphSidebar.tsx:52` with a store subscription. Drop the local `setCollapsedGroups`; route the toggle handlers through the new store action.
3. Verify on tab switch: inspect whether `<DopeSheet>` and `<GraphEditor>` unmount or just `display: none`. If they unmount, sharing via the store fixes both collapse + any other local UI state. If they stay mounted, sharing still fixes the cross-view "I opened it in Dope Sheet but Graph Editor still shows it collapsed" mismatch.

**Don't** put this in the sequence slice — it's UI state, not animation data. Should NOT undo/redo, should NOT save into GMF.

**Out of scope:** the selection-loss observation. Confirm-or-deny it in a separate trace before adding logic — it may already work and the user is conflating it with the collapse reset.

---

## 12. Dope sheet item names overflow

**Where:** [components/timeline/TrackRow.tsx:184-185](engine-gmt/components/timeline/TrackRow.tsx#L184) — fixed `w-[220px]` sidebar, with `truncate` + `title=` tooltip on the label at line 191-192.

**Current:** all track-label cells are 220px regardless of content. Long labels (`Hybrid Box Fold Limit X`, vec component triplets, formula param labels) ellipse out. The matching ruler/keyframe-grid offset is the same 220px (sticky-left column) — they're aligned visually but not via a shared CSS variable.

**Change — pick one tier:**

- **A. Bump the constant.** Cheapest. `w-[220px]` → `w-[260px]` everywhere it appears (`TrackRow.tsx`, GraphSidebar, the TimelineRuler / DopeSheet container if they hardcode the same offset). Search `220px` across `engine-gmt/components/timeline/` and `components/graph/` to find all aligned offsets. Doesn't fix "longer than 260px" labels but covers ~95% of cases for zero behavioural risk.
- **B. CSS variable + draggable handle.** Add `--timeline-sidebar-w: 220px` on the timeline root, swap all `w-[220px]` to `w-[var(--timeline-sidebar-w)]`. Add a 4px-wide drag handle on the right edge of the sidebar header that updates the variable. Persist into the same `timelineUiSlice` from #11. This is the right answer; ~30 LOC if the handle component is rolled inline.
- **C. Content-aware (auto-fit to longest visible label, capped at e.g. 320px).** Brittle — recomputing on every track add/rename, and the ruler offset has to follow. Not recommended unless A and B both fall short.

Recommend **B**. Re-uses the new UI slice from #11 for persistence, gives power users the escape valve, and the implementation lifts cleanly to "panel-relative width" if other timeline columns want it later.

---

## 13. Interlace formula params show under "Shading"

**Where:** [utils/groupTracks.ts:15-28](engine-gmt/utils/groupTracks.ts#L15) — `classifyTrackId`. Current rules:

```ts
if (tid.startsWith('camera.'))                                 return 'Camera';
if (tid.startsWith('lights.') || tid.startsWith('lighting.')) return 'Lighting';
if (
    tid.startsWith('coreMath.')   ||
    tid.startsWith('geometry.')   ||
    tid.startsWith('param')       ||
    tid.startsWith('julia.')      ||
    tid.startsWith('hybridParams.') ||
    tid === 'iterations'
)                                                              return 'Formula';
if (tid === 'camFov' || tid.startsWith('optics.') || tid.startsWith('dof'))
                                                               return 'Optics';
if (tid.startsWith('fog') || tid.startsWith('atmosphere.'))   return 'Shading';
return 'Shading';   // FALLBACK — eats everything else
```

**Diagnosis:** the interlace feature ID is `'interlace'` ([engine-gmt/features/interlace/index.ts:118](engine-gmt/features/interlace/index.ts#L118)). Animatable interlace params (`interlaceParamA`, `interlaceVec3A`, etc., per [doc 24 § Uniform Naming](../docs/gmt/24_Formula_Interlace_System.md)) get track IDs `interlace.interlaceParamA`, `interlace.interlaceVec3A_x` etc. Those start with `interlace.` — no rule matches → falls through to **Shading**. That's the bug.

**Change:** add interlace to the Formula bucket. The interlace formula's params are a *secondary formula's* params — they conceptually belong with the primary's coreMath/geometry params, not under shading.

```ts
if (
    tid.startsWith('coreMath.')      ||
    tid.startsWith('geometry.')      ||
    tid.startsWith('param')          ||
    tid.startsWith('julia.')         ||
    tid.startsWith('hybridParams.')  ||
    tid.startsWith('interlace.')     ||   // ADD
    tid === 'iterations'
) return 'Formula';
```

**Optional follow-up** (worth flagging, not required for the fix): both DopeSheet and GraphSidebar import `classifyTrackId` from this file (per [doc 04 §8](../docs/gmt/04_Animation_Engine.md): "Track grouping is centralised in `utils/groupTracks.ts` (single source of truth)"). So the one-line edit fixes both views simultaneously. The fallback-to-Shading is permissive — anything mis-named or not yet classified silently lands there. Consider logging unknown prefixes in dev (`if (import.meta.env.DEV) console.warn('classifyTrackId fallback:', tid)`) so future omissions surface instead of silently bucketing wrong.

---

## 14. Param display names ("World Geometry and other params aren't named nicely")

Less specific than #13 — needs investigation. Two failure modes both present in the codebase, only one of which is fixable without touching feature defs.

**Where labels resolve:**
- Track label is set at track-creation time from `deriveTrackBinding(...).trackLabels`, which reads `config.label` from the feature's param definition. See [engine/animation/trackBinding.ts:63-84](engine/animation/trackBinding.ts#L63) and the consumer [components/AutoFeaturePanel.tsx:335-343](engine-gmt/components/AutoFeaturePanel.tsx#L335) / vector-input wrapper [components/vector-input/index.tsx:136,196](engine-gmt/components/vector-input/index.tsx).
- TrackRow renders `sequence.tracks[tid].label` directly ([TrackRow.tsx:191-192](engine-gmt/components/timeline/TrackRow.tsx#L191)) — no further transform.

**Likely failure mode A — missing `label`.** A param def without a `label` falls back to the param key as label. Spot-check candidates:

```bash
# in dev/
rg "type:\s*'(float|vec[234]|color|gradient|bool|int)'" engine-gmt/features --type ts -A 1 \
  | rg -B 1 -v "label:" \
  | rg "type:\s*'"
```

(Or skim `engine-gmt/features/*/index.ts` for any param literal that lacks `label:`.) If present in geometry / coloring / optics / etc., add a `label: 'Human Name'` to each.

**Likely failure mode B — vec axis suffix.** `deriveTrackBinding` appends ` X`/` Y`/` Z`/` W` to the base label for vec axes ([trackBinding.ts](engine/animation/trackBinding.ts)). If the base label is already `'Geometry Engine'` or `'World Geometry'`, the axis tracks read `'World Geometry X'` which is fine. But if the base label is *missing* and falls back to a key like `worldGeometry`, the axis tracks become `worldGeometry X` — which matches the user's "not named nicely" description.

**Action:**
1. Snapshot a sequence with a typical scene — keyframe one of every animatable param (or scrape the `liveModulations` map at runtime). Dump `Object.entries(useAnimationStore.getState().sequence.tracks).map(([id, t]) => ({ id, label: t.label }))` to console.
2. Identify any rows where `label === id` or `label` looks like a camelCase key not a sentence — those are the param defs missing `label:`. Fix each in its feature def.
3. Specifically check: anything called `worldGeometry` (the user named this) — but `engine-gmt/features` has no `worldGeometry` ID per `rg`; it may live under `geometry.*` already. Confirm what the user means by "world geometry" before making changes — could be the `geometry.geometryEngine` boolean (label `'Geometry Engine'`), or a coloring/world-bounds param. Don't guess.

**Don't** add a global "key → pretty name" lookup table. The right fix is per-param `label:` at the feature def.

**Constraint:** changing labels does NOT change track IDs (per [doc 04 §2.2](../docs/gmt/04_Animation_Engine.md)) — saved presets keep working. Labels are display-only.

---

## 15. Multi-keyframe selection bounding box in Graph Editor

**Symptom:** selecting several keyframes in the Graph Editor doesn't show a transform bbox with handles — only the marquee that drew the selection. There's no scalable container to grab and drag. Dope Sheet has one (`SelectionTransformBar`).

**Where:**
- DopeSheet has it: [components/timeline/SelectionTransformBar.tsx:10-34](engine-gmt/components/timeline/SelectionTransformBar.tsx#L10) — orange move + left/right scale handles. Per [doc 04 §8](../docs/gmt/04_Animation_Engine.md), TrackGroup renders one bar per group when ≥2 keys selected.
- Graph Editor only has the marquee: [hooks/useGraphInteraction.ts:104,493-502](hooks/useGraphInteraction.ts#L104) tracks `selectionBox` during the box-drag, then clears it once selection resolves. No persistent transform bbox after.

**Change — what "robust flexible scaleable" needs to mean here:**

The Dope Sheet bar is 1D (frame axis only — it scales horizontally because rows are time-only). The Graph Editor canvas is 2D (frame × value), so the bbox needs:

- 8 handles (4 corners + 4 edges) for non-uniform scale on either axis.
- Whole-bbox drag for translate.
- Rotation? Skip. DCC graph editors don't rotate keyframes — value-vs-time isn't a rotatable space.

**Action:**
1. Add `selectionBBox` derived state to `useGraphInteraction` (or a new `useGraphSelectionBBox` hook): for every selected key in `selectedKeyframeIds`, compute its `(frame, value)` position; reduce to `{minFrame, maxFrame, minValue, maxValue}`. Per-track value scales differ — clamp value-axis to the track's currently-displayed scale (whatever the canvas's `v2p` is doing), or skip the value axis when keys span multiple tracks with incompatible scales.
2. Render an SVG/HTML overlay component on the graph canvas. Reuse the visual style from `SelectionTransformBar.tsx` for consistency (orange stroke, square handles).
3. Drag handlers: each handle should call into the existing keyframe-edit primitives. Specifically, scaling along the frame axis is already implemented as keyframe-time scaling in the Dope Sheet's transform bar — find that scaler and reuse it (don't rewrite the Bezier-handle x-rescaling math; per [doc 04 §4.3](../docs/gmt/04_Animation_Engine.md), `scaleHandles` proportionally scales handle x AND y to preserve angle, and that needs to happen here too).
4. Multi-track selection edge case: when keys span >1 track, the value-axis handles should be hidden or no-op (each track has its own value scale, so a shared y-bbox is meaningless). Frame-axis handles still work — the entire selection slides/scales in time.
5. The bbox should auto-update on zoom/pan (recompute from `(frame, value)` → canvas px every render — don't cache pixel coords).

**Out of scope:** soft-selection falloff visualisation around the bbox (per [doc 04 §7.2](../docs/gmt/04_Animation_Engine.md), soft selection is settings-based — leave the existing Linear/Dome/Pinpoint/S-Curve UI alone).

**Smoke test:** select 5+ keys across 2 tracks, verify (a) bbox spans them, (b) drag-to-scale on left edge compresses time, (c) zooming the canvas redraws the bbox in correct screen position, (d) Bezier tangent handles visually rescale alongside their keys.

---

## Status — round 2 (animation timeline)

| #  | Item | Status |
|----|------|--------|
| 11 | Persist collapsedGroups across DopeSheet/GraphSidebar | ✅ done — new `uiSlice` (animation store), both views drop their `useState<Set>` and read from store. Selection was already shared via `selectionSlice`; this closes the only remaining drift |
| 12 | Sidebar width resizable (CSS via store) | ✅ done — `timelineSidebarWidth` in `uiSlice`, default 220, clamped 140-480. Drag handle on TimelineRuler's "Tracks" header (DopeSheet mode) and GraphSidebar's "Curves" header (Graph mode). All `w-[220px]` / `TIMELINE_SIDEBAR_WIDTH` in the timeline path repointed at the store. `GradientContextMenu`'s unrelated `w-[220px]` left alone |
| 13 | Interlace params under Formula | ✅ done — `tid.startsWith('interlace.')` added to the Formula branch in `utils/groupTracks.ts` |
| 14 | Param label cleanup | ✅ done — geometry per-axis rotation labels: `Pre X/Y/Z` → `Pre Rotation X/Y/Z`, `Post X/Y/Z` → `Post Rotation X/Y/Z`, `World X/Y/Z` → `World Rotation X/Y/Z`. Hybrid vec3s: `Shift` → `Hybrid Shift`, `Rotation` → `Hybrid Rotation`. Texturing: `U` / `V` → `Texture U Mode` / `Texture V Mode`. UI panels are unaffected (per-axis scalars are `hidden: true` so the labels only surface in the timeline). The labels-by-key fallback still exists for any feature def that hasn't set `label`; future audits should snapshot `useAnimationStore.getState().sequence.tracks` to find more offenders |
| 15 | Graph Editor multi-key transform bbox | ✅ done — new `components/graph/GraphSelectionBBox.tsx` overlay. Renders when ≥2 keys selected; left/right edges scale time (anchored at the opposite edge, scales Bezier handle X to preserve curve shape); top/bottom edges scale value in pixel space (hidden in normalized mode); center is grab-to-translate (frame + value). Uses `pixelToValue` for the value-axis round-trip and `updateKeyframes` for batched store writes |

`npx tsc --noEmit` clean (root + engine-gmt). `npx vite build` clean (~9s).

