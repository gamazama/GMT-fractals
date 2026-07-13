# Modulation off-switch — pre-push ship blocker

**Purpose:** before pushing the canvas refactor track, the audio + LFO modulation systems need explicit off-switches at two granularities — per-individual (each LFO, each audio rule) and per-global (the LFO panel, the audio panel). Three of the four switches exist or are partly wired; one is entirely missing and two need UI surfaces. Without these, a user has no way to silence a noisy mod without removing it (and losing its config) or to A/B compare with-vs-without-modulation states. Ship-blocking.

**Status:** ready. **Estimated effort:** half a day to a day.

## Read first

1. **`store/animation/types.ts`** + **`store/engineStore.ts`** — state types under `audio` (DDFS feature, has `isEnabled`) and `modulation` (slice, has `rules: ModulationRule[]`). Top-level `animations: AnimationParams[]` holds LFO params.
2. **`engine/features/modulation/index.ts`** — defines `ModulationRule` (line 11), `AnimationParams` (LFO), `ModulationState` (rules + selectedRuleId), and the `addModulation` / `removeModulation` / `updateModulation` actions. `enabled: boolean` is in both type definitions; new rules default `enabled: true` (line 67).
3. **`engine/features/modulation/ModulationEngine.ts`** — the runtime. Per-LFO enabled check at line 33 (`if (!anim.enabled) continue;`). Per-rule enabled check at line 106 (`if (!rule.enabled) continue;`). Both already wired correctly — the runtime drops disabled mods from the offsets buffer.
4. **`engine/animation/AnimationSystem.tsx`** — orchestrator. Line ~144: `if (audioSlice && audioSlice.isEnabled) { audioAnalysisEngine.update(); }` gates the FFT sample but **not** the subsequent `modulationEngine.update(modulationSlice.rules, delta)` call. So when audio is disabled, audio-source rules still fire against stale data.
5. **`engine/features/audioMod/AudioPanel.tsx`** + **`AudioLinkControls.tsx`** + **`AudioSpectrum.tsx`** — the audio panel UI tree. `audio.isEnabled` is read at `AudioPanel.tsx:206`; rendered as a green-pulse indicator at line 253. The Active Links rule list lives in `AudioModulationList` inside `AudioPanel.tsx:128-198`. Per-rule controls live in `AudioLinkControls.tsx`. **Neither has a per-rule enable toggle yet.**
6. **`engine/components/modulation/LfoList.tsx`** — LFO panel. Per-LFO `ToggleSwitch` exists at line 147 (`actions` slot of `DynamicListItem`). `hasActive` boolean at line 116 is read-only indicator. **No global LFO toggle.**

## The three gaps

### Gap 1: per-audio-rule UI toggle (missing — type + runtime ready)

The `ModulationRule.enabled` field exists and the runtime respects it; the UI never lets users flip it.

**Add toggle in two places:**

- **`AudioLinkControls.tsx`** (the rule-detail panel that opens when a rule is selected) — add a small `ToggleSwitch` to the header row alongside the Target Parameter / Delete cluster (line 60-79). When `rule.enabled === false`, dim the entire knobs grid (line 109) to `opacity-50` so it's visually clear that edits don't currently take effect. Use the existing `updateRule(rule.id, { enabled: v })` shape.
- **`AudioPanel.tsx`** `AudioModulationList` row (line 161-193) — add a tiny enable toggle next to the trash button (line 185-190). Same pattern as the LFO list — small ToggleSwitch, cyan-tinted to match the rule colour scheme. Disabled rules' rows dim to `opacity-50` and the source-label pill (line 177) drops its saturated colour.

**Persistence:** `enabled` is already part of the `ModulationRule` shape in `engineStore.modulation.rules[]` and persists via the standard DDFS preset path. No new persistence work.

### Gap 2: global LFO toggle (new — needs state + UI + runtime gate)

**Add state.** New top-level boolean on engineStore, `lfosEnabled: boolean` (default `true`). Set via `setLfosEnabled(v)` action. Decision: keep it top-level (parallel to `animations: AnimationParams[]`) rather than under a feature slice — simplest path; matches where `animations` itself lives. If a "modulation features" slice ever appears, both can move together.

**Add the runtime gate.** In `ModulationEngine.updateOscillators` (line 30+), add an early-return:

```ts
public updateOscillators(animations, time, delta, lfosEnabled: boolean) {
    if (!lfosEnabled) return;  // global LFO off — no offsets contributed
    for (let i = 0; i < animations.length; ...
```

Caller (`AnimationSystem.tick:166`) reads `lfosEnabled` from engineStore and passes it through. Per-LFO `enabled` continues to gate individual LFOs inside the loop — both layers respected.

**Add the UI.** In `LfoList.tsx`, replace or augment the `hasActive` read-only indicator (line 116) with a `ToggleSwitch` controlling `lfosEnabled`. Render it in the `DynamicList`'s header row (look at how `accent="purple"` flows through to see the right styling). When disabled:
- The list dims to `opacity-50` (matches the per-LFO disabled-row dim pattern).
- The "Add LFO" button stays clickable (you can still add LFOs while the global toggle is off; they just don't fire until the toggle is on).
- The `hasActive` indicator (small dot) reflects "global off" distinctly from "all LFOs individually off" so the user knows which switch they need to flip.

**Persistence:** `lfosEnabled` should persist with the scene like `animations[]` does. Verify by checking `engineStore.ts`'s `getPreset` / `loadPreset` paths — add `lfosEnabled` to whichever serialiser pattern `animations` already follows. If it's auto-serialised via a "save every store field" path, nothing extra; if it's an explicit whitelist, add the key.

### Gap 3: verify global audio toggle gates rule evaluation (latent bug)

Currently `AnimationSystem.tick` skips `audioAnalysisEngine.update()` when `audio.isEnabled === false`, but it still calls `modulationEngine.update(rules, delta)` afterwards. Audio-source rules read from `audioAnalysisEngine.getRawData()` which returns the last buffer (or zeros on init). Result: when the user toggles audio off, audio-source rules freeze at their last value instead of returning the param to its base.

**Fix.** Two options; pick the cleaner one:

- **Option A (preferred — modular):** in `ModulationEngine.update`, take an `audioEnabled: boolean` param and skip the rule body when the rule's `source === 'audio'` and `!audioEnabled`. Non-audio rules (LFO-sourced) still evaluate, which is the right behaviour — turning off the audio engine shouldn't stop LFOs from driving rules.

- **Option B (simpler — less granular):** in `AnimationSystem.tick`, skip the whole `modulationEngine.update(...)` call when `!audioEnabled` AND every rule is audio-sourced. Otherwise still call it. Brittle if mixed rule sources become common.

**Option A is right.** Caller passes `audioSlice?.isEnabled ?? false` through. Inside the loop: `if (rule.source === 'audio' && !audioEnabled) continue;`.

## Acceptance criteria

- [ ] Per-rule enable toggle visible in both `AudioLinkControls` (detail panel) and `AudioModulationList` row. Toggling it persists via the existing `updateModulation` action.
- [ ] Disabled rules dim visually (opacity-50 on the relevant region — knobs grid in detail panel, full row in list).
- [ ] Global LFO toggle in `LfoList` header (top-right of the DynamicList). Toggling it dims the LFO list and stops all LFO oscillators from contributing to offsets.
- [ ] `lfosEnabled` persists across reload (verify with a scene save → reload).
- [ ] Toggling audio off (existing toggle) now silences audio-source rules immediately (runtime gate, not just analyser-update skip). LFO-source rules continue to fire if audio is off but LFOs are on. Test combinations: audio on + LFO on, audio off + LFO on (audio rules silent, LFO rules audible), audio on + LFO off (LFO rules silent, audio rules audible), audio off + LFO off (everything silent).
- [ ] No regression in per-LFO toggle (existing) or per-rule fields (Target/Source/Knobs).
- [ ] Existing presets load without errors (`lfosEnabled` defaults to `true` for missing-key compat).
- [ ] `npm run typecheck` clean.

## Out of scope

- Anything in the deferred audio feature pass (sync-across, waveform render quality, cuts, modulation-record fidelity, render quality). Those come after `19_OFFLINE_MODULATION_BAKE_PROMPT.md`.
- Cleanup of the `audio.isEnabled` DDFS-vs-`lfosEnabled` top-level asymmetry. Both work; future cleanup could unify them under a modulation slice but not in this prompt.
- Visual polish beyond `opacity-50` for the disabled-state dim.
- Adding solo (only-this-rule-fires) functionality. Off-switch is enough for ship.

## Pre-flight

- [ ] On a fresh branch: `feature/modulation-off-switch`.
- [ ] On `dev` HEAD (currently after `0814749` audio fps-sync work).
- [ ] `npm run typecheck` passes.

## Report doc

Write `24_MODULATION_OFF_SWITCH_REPORT.md` adjacent. Sections:

1. Result line.
2. What shipped (files + brief notes).
3. Toggle-combination test matrix (audio×LFO, on/off — confirm each silences what it should and only what it should).
4. Surprises.
5. Push readiness — confirm `typecheck` + interaction smoke + bench parity if applicable. After this lands, `git push origin dev` unblocks.

## Why this blocks the push

The canvas refactor track adds power-user features (drop audio onto the timeline, drive params from audio bands, drive params from LFOs). The ship checklist for a feature like this is: *can the user turn it off?* Without per-mod and per-global off switches the user has to remove a mod to silence it — which loses the config. That's not the bar this codebase usually ships at. Half a day to a day to close the gap.
