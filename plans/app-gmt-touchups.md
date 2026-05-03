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
