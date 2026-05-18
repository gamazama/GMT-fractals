# Modulation off-switch — pre-push report

**Result:** shipped. All three gaps from `23_MODULATION_OFF_SWITCH_PROMPT.md` closed on branch `feature/modulation-off-switch` (from `dev` at `3d4a3c5`).

## What shipped

### Gap 1 — per-audio-rule UI toggle

- [engine/features/audioMod/AudioLinkControls.tsx](../../engine/features/audioMod/AudioLinkControls.tsx) — added a small `DotToggle` to the rule-detail header next to the trash button. Dims the knobs grid to `opacity-50` when disabled.
- [engine/features/audioMod/AudioPanel.tsx](../../engine/features/audioMod/AudioPanel.tsx) — added a `DotToggle` to each `AudioModulationList` row beside the delete `×`. Disabled rows dim and the source pill greys out.

### Gap 2 — global LFO master switch

- New `lfosEnabled: boolean` on `EngineStoreState` (default `true`) + `setLfosEnabled` action — [types/store.ts](../../types/store.ts), [store/engineStore.ts](../../store/engineStore.ts).
- Serialised into `Preset.lfosEnabled` ([types/preset.ts](../../types/preset.ts)) by `getPreset()` and restored by `applyPresetState` with missing-key compat: presets predating this field default to `true` ([utils/PresetLogic.ts](../../utils/PresetLogic.ts)).
- Runtime: `ModulationEngine.updateOscillators(animations, time, delta, lfosEnabled)` early-returns when off ([engine/features/modulation/ModulationEngine.ts](../../engine/features/modulation/ModulationEngine.ts)).
- UI: `DotToggle` in `LfoList.headerRight`; body dims to `opacity-50` when globally off but rows stay interactive (you can still add and edit LFOs while the master is off) ([engine/components/modulation/LfoList.tsx](../../engine/components/modulation/LfoList.tsx)).

### Gap 3 — audio toggle gates rule evaluation

- `ModulationEngine.update(rules, delta, audioEnabled, lfosEnabled)` skips rules whose source is currently masked: `if (rule.source === 'audio' && !audioEnabled) continue;` and the symmetric LFO gate. Both gates live in one place; the rule keeps reading the cached signal otherwise (stale FFT buffer / frozen `lfoValues`) and the param hangs at its final modulated value instead of returning to base.
- The audio master toggle is surfaced as a `DotToggle` on the `Active Links` `CollapsibleSection.rightContent`, flipping `audio.isEnabled`.

### Cross-cutting

- New `components/DotToggle.tsx` — 5 inline dots collapsed to one component. Variant model: `master` (saturated bg-500/border-400) for panel-wide switches, `item` (translucent /40 + /60) for per-row toggles. Accent `purple` for LFO, `cyan` for audio. `aria-pressed`/`role="switch"` added for free.
- Callers updated symmetrically: `AnimationSystem.tick`, `components/timeline/exportModulations.applyExportModulations`, `engine/features/modulation/applyAt.applyModulationsAt`.
- Early-return guard in `AnimationSystem.tick` now folds `lfosEnabled` into `hasOscillators` so a scene with N LFOs but the master off skips the full per-frame loop instead of doing two no-op modulation calls.

## Test matrix (audio × LFO master)

Tested live in the running app on `feature/modulation-off-switch` with one audio-source rule on `coreMath.paramA` and one LFO + LFO-source rule on `coreMath.paramB`:

| audio.isEnabled | lfosEnabled | audio rule | LFO oscillator + LFO rule |
|---|---|---|---|
| on | on | drives paramA from FFT | drives paramB from LFO |
| off | on | silent — paramA returns to base | drives paramB from LFO |
| on | off | drives paramA from FFT | silent — paramB returns to base |
| off | off | silent — both params at base | silent — both params at base |

Per-LFO toggle (existing) still gates individual LFOs inside the loop. Per-rule toggle (Gap 1) still drops a single rule from offsets regardless of master state. Save → reload preserves both master switches and per-rule enables (verified by user with a save/load cycle on the dev build).

## Surprises

- The prompt suggested two separate Edit passes for Gap 2's runtime gate and Gap 3's audio gate. Both ended up in the same `ModulationEngine.update(rules, delta, audioEnabled, lfosEnabled)` signature because the gate logic is symmetric (`if (rule.source === X && !XEnabled) continue;`). Saved one round of caller wiring.
- I initially used `<ToggleSwitch>` for the master toggles (matching the existing per-LFO pattern). The user pointed out they didn't fit neatly in the header layout (60px tall vs the 20px add button). Replaced with small dot indicators across all five sites for visual consistency. Then toned the "on" state from solid to translucent on the per-item dots while keeping the masters saturated, to preserve visual hierarchy.
- Per-row delete buttons in `AudioModulationList` were `text-red-500/50 hover:text-red-400 px-1` (text `×`). Left as-is — the prompt only required adding the enable toggle.
- The audio master switch's natural home in the "Active Links" section header instead of next to the green-pulse indicator at the top of the panel — that indicator now reads as a status light, not a control.

## Push readiness

- `npm run typecheck` — clean.
- Interaction smoke — verified manually in dev build: matrix above, plus toggling persists across scene save/reload.
- Bench parity — not run; this PR doesn't touch the shader or render loop.

After this lands, `git push origin dev` unblocks.
