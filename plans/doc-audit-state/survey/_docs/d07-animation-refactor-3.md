---
batch_id: d07-animation-refactor-3
audited_at: 2026-05-20T00:00:00Z
files:
  - path: docs/animation-refactor/21_AUDIO_TIMELINE_SYNC_PROMPT.md
    blob_sha: fdfe9de5a2f5faf9215a3a147069235d6dc0d302
    lines_read: [1, 98]
  - path: docs/animation-refactor/22_AUDIO_TIMELINE_SYNC_REPORT.md
    blob_sha: 74d277a50dff767f9600e834869f4d80aca9fd73
    lines_read: [1, 225]
  - path: docs/animation-refactor/23_MODULATION_OFF_SWITCH_PROMPT.md
    blob_sha: ab8ee643f4b7ab9c55a2f7bd3d36c7f6dc0b7b99
    lines_read: [1, 98]
  - path: docs/animation-refactor/24_MODULATION_OFF_SWITCH_REPORT.md
    blob_sha: 0d82789c9d1c3a7439ec3d8e0e1f3297624b1778
    lines_read: [1, 56]
  - path: docs/animation-refactor/25_NEXT_SESSION_HANDOFF.md
    blob_sha: b9c56d715bd8166820f751753c829f7e7f7389bd
    lines_read: [1, 97]
  - path: docs/animation-refactor/PHASE_0_PROMPT.md
    blob_sha: 0bd5beb2588522430d208e81e3c5816943490b5e
    lines_read: [1, 235]
---

## 21_AUDIO_TIMELINE_SYNC_PROMPT.md

Pre-investigation prompt for an fps-sync bug surfaced during 20_TIMELINE_CLEANUP review: audio waveform render and clip cut positions did not track the timeline's `fps`. Hypothesised root cause was a single `seconds × 60` (default fps) conversion site missing the live `useAnimationStore.fps`. Lays out a three-part plan: Diagnosis (audit every secs/frames conversion in `AudioStrip.tsx`, `audioWaveform.ts`, `audioClipSync.ts`), Fix, Regression gate. Identified four likely culprits (hardcoded 60, project-fps drift formula, stored-frame vs runtime-frame mismatch, AudioBufferSourceNode `playbackRate`). Estimated 0.5-1 day.

Key decisions:
- Separate session from canvas cleanup pass (different mode of thinking — fps-arithmetic detective work vs. structural).
- Acceptance includes parity at fps ∈ {24,25,30,60} and one regression test (unit on `secondsToFrames`/`framesToSeconds` helper or manual checklist).
- Suggested factoring a shared helper in `utils/timelineUtils.ts` if multiple sites are wrong.
- Out of scope: Web Audio engine internals, volume/fade, multi-track mixing.

Preservable:
- Branch name convention: `feature/audio-fps-sync`.
- Repro recipe (load clip at fps=60, change to 30/24/25, observe drift).
- Audit pattern: grep `\b60\b`, `* fps`, `/ fps`, `frameWidth`, `secondsPerFrame`, `framesPerSecond`.
- Memory pointer: `memory/project_audio_timeline_phase.md` for the original integration's seconds↔frames decisions.

MAY BE STALE:
- The single-bug framing was wrong — see 22_REPORT, four bugs landed. The prompt's hypothesis #1 was correct but only one of four contributing causes.

## 22_AUDIO_TIMELINE_SYNC_REPORT.md

The 4-bug fix from memory's 2026-05-18 entry (`feature/audio-fps-sync`). Investigation expanded from the prompt's one expected bug to four compounding ones. Bug 1: `setFps('match')` ([`playbackSlice.ts:146-153`](../../store/animation/playbackSlice.ts#L146-L153)) remapped keyframes but skipped `audioClips[*].startFrame` — drift = `(newFps/oldFps − 1) * startFrame`. Bug 2: `getTrackInfo` ([`AudioAnalysisEngine.ts:169`](../../engine/features/audioMod/AudioAnalysisEngine.ts#L169)) returned `duration: d?.duration || 1` instead of `|| 0`, defeating the `waitForAudioMetadata` poll's "metadata arrived" check and pinning fresh clips to a 1-second slice. Bug 3: `computeWaveformPeaks` ([`AudioStrip.tsx:127-128`](../../components/timeline/AudioStrip.tsx)) overrode lenient `<audio>.duration` with strict-decoded `audioBuf.duration` — for VBR MP3 / MPEG-2 Layer III at low sample rates / some AACs, `decodeAudioData` truncates per the Xing header while `<audio>` plays the full file natively. Bug 4 (dominant — "only half plays"): `app-gmt/AppGmt.tsx` mounted BOTH `<RenderLoopDriver />` (engine-core default RAF) and `<GmtRendererTickDriver />` (R3F useFrame), so `TickRegistry.runTicks()` fired twice per frame → every per-frame consumer (timeline, LFOs, modulation, audio sync, FPS counter, recording) advanced at 2× wall-clock. User diagnostic: 2.004 s window, 120.17 frames at fps=30, `speedMultiple = 1.998`.

Key decisions:
- Bug 1 fix: add `audioClips: s.audioClips.map(c => c ? { ...c, startFrame: remap(c.startFrame) } : null)` to the `'match'` branch return. `trimStartSec`/`trimEndSec` already in seconds — no rescale.
- Bug 2 fix: `d?.duration || 0` (single-char change). `AudioPanel.tsx:54` already guards with `Math.max(0.1, status.duration)`.
- Bug 3 fix: split `AudioClip` duration into two fields — `durationSeconds` (`<audio>.duration`, playback authority for trim+sync) vs new `peaksDurationSeconds?: number` (`audioBuf.duration`, peaks-to-audio-time mapping only). Waveform component takes `peaksDurationSec`; truncated peaks render at their real audio-time positions, un-decoded tail stays blank as visual feedback. Use new `audioAnalysisEngine.getElementDuration(deckIndex)` accessor.
- Bug 4 fix: (a) drop `<RenderLoopDriver />` from `app-gmt/AppGmt.tsx` — GMT has its own R3F driver; (b) defence-in-depth in `TickRegistry.runTicks`: 1ms `DOUBLE_RUN_WINDOW_MS` guard suppresses duplicate calls + dev-only `_warnedDoubleRun` console.warn. Documented contract was already in `engine/plugins/RenderLoop.tsx:4-9`.
- `setFps('keep')` correctly leaves audio alone — by-design wall-clock drift, opt-in.
- Followup refactor (from `simplify` pass): `AudioAnalysisEngine.waitForMetadata(deckIndex, timeoutMs?)` event-driven (`loadedmetadata`/`durationchange`) replaces 50ms-poll; `getElementDuration(deckIndex)` direct accessor avoids full `getTrackInfo` snapshot.

Preservable:
- **Wider impact of Bug 4**: every app-gmt animation/perf bench taken before commit `0814749` reflects the 2×-tick state. Numbers in `project_appgmt_perf_bench.md` and `project_animation_refactor_spike.md` need re-running. (Also flagged in 25_HANDOFF.)
- **Web Audio quirk** (Bug 3): `decodeAudioData` is strict, `<audio>` element is lenient. For files with under-reporting Xing/Info headers (VBR MP3, MPEG-2 Layer III @ low sample rate, some AACs), `audioBuf.duration` can be half or less of `<audio>.duration`. Test file: `H:/GMT/assets/8d82b5_Super_Mario_Bros_Die_Sound_Effect.mp3` (128 kbps MPEG-2 Layer III mono 22.05 kHz, 107 frames × 418 bytes = 2.795 s).
- **TickRegistry contract**: Apps with a custom render loop skip `<RenderLoopDriver />` and call `runTicks` themselves. Documented at `engine/plugins/RenderLoop.tsx:4-9` — now enforced by the 1ms dedup guard.
- **Conversion site audit table** (§2): catalogues every secs/frames conversion in the audio pipeline with OK/WRONG/N/A — useful reference if the pipeline grows.
- Regression smoke: `debug/smoke-audio-fps-remap.mts` / `npm run smoke:audio-fps-remap` covers Bug 1.
- "What survived" §6: `setFps('keep')` correctness, `<audio>.loop=true`, `audioWaveform.ts` sub-frame sample truncation, placeholder-then-replace duration — not bugs, don't chase.
- New top-level `DotToggle.tsx` component pattern (from 24_REPORT, but mentioned here in followups context).

MAY BE STALE:
- File line numbers (e.g. `playbackSlice.ts:146-153`, `AudioStrip.tsx:127-128`) — fixed in this branch, may have drifted post-merge.
- Open checkbox `[ ] Re-bench animation perf numbers from app-gmt/` may have been completed since 2026-05-18; not verified in this batch.

## 23_MODULATION_OFF_SWITCH_PROMPT.md

Pre-push ship blocker prompt: the audio + LFO modulation systems need explicit off-switches at two granularities (per-individual and per-global) before the canvas refactor track can push. Identified three gaps: (1) per-audio-rule UI toggle missing — `ModulationRule.enabled` exists and runtime respects it, but no UI surface in `AudioLinkControls` or `AudioModulationList`; (2) global LFO toggle entirely missing — needs state (`lfosEnabled: boolean` top-level on engineStore), runtime gate in `ModulationEngine.updateOscillators`, and UI in `LfoList`; (3) latent bug — `AnimationSystem.tick` skips `audioAnalysisEngine.update()` when audio disabled but still calls `modulationEngine.update(rules, delta)`, so audio-source rules freeze at last value (stale FFT buffer) instead of returning param to base. Half a day to a day.

Key decisions:
- `lfosEnabled` lives top-level on engineStore (parallel to `animations: AnimationParams[]`), not under a feature slice — matches existing layout, can migrate if a modulation slice ever appears.
- Gap 3 Option A preferred: pass `audioEnabled: boolean` to `ModulationEngine.update`, skip rule body when `rule.source === 'audio' && !audioEnabled`. Non-audio (LFO) rules still evaluate. Option B (whole-call skip) brittle if mixed sources become common.
- Toggle styling: existing `ToggleSwitch` for per-LFO (LfoList line 147); cyan-tinted small toggle for audio rule list rows.
- Acceptance: 4-cell test matrix (audio × LFO, on/off); `lfosEnabled` persists across reload with missing-key compat = `true`.
- Out of scope: solo, sync-across, waveform render quality, cuts, modulation-record fidelity — those come after `19_OFFLINE_MODULATION_BAKE_PROMPT.md`.

Preservable:
- The "can the user turn it off?" ship bar — repeated across the doc set as a quality gate.
- State location decision (top-level vs slice) and the migration path note.
- Branch convention: `feature/modulation-off-switch`, based on dev HEAD after `0814749` (audio fps-sync).
- Locations cataloged: per-rule `enabled` at `ModulationEngine.ts:33` (LFO), `:106` (rule); rule list rows at `AudioPanel.tsx:128-198`; rule detail at `AudioLinkControls.tsx`.

MAY BE STALE:
- Line numbers in `ModulationEngine.ts`, `AudioPanel.tsx`, `LfoList.tsx` — post-merge drift likely.
- "After this lands, `git push origin dev` unblocks" is a one-shot reference; the push presumably happened per 25_HANDOFF.

## 24_MODULATION_OFF_SWITCH_REPORT.md

All three gaps shipped on `feature/modulation-off-switch` (from `dev` at `3d4a3c5`). Gap 1: `DotToggle` added to rule-detail header in `AudioLinkControls.tsx` (dims knobs grid `opacity-50` when off) and to each `AudioModulationList` row (dims row + source pill greys). Gap 2: new `lfosEnabled: boolean` on `EngineStoreState` (default `true`) + `setLfosEnabled` action, serialised into `Preset.lfosEnabled` by `getPreset()`, restored by `applyPresetState` with missing-key compat=`true`. Runtime: `ModulationEngine.updateOscillators(animations, time, delta, lfosEnabled)` early-returns when off. UI: `DotToggle` in `LfoList.headerRight`; body dims `opacity-50` but rows stay interactive (can add/edit LFOs while master off). Gap 3: `ModulationEngine.update(rules, delta, audioEnabled, lfosEnabled)` skips rules with `rule.source === 'audio' && !audioEnabled` and symmetric LFO gate. Audio master surfaced as `DotToggle` on Active Links section header (the green-pulse indicator stays as a status light, not a control).

Key decisions:
- Both Gap 2 and Gap 3 collapsed into one symmetric `ModulationEngine.update(rules, delta, audioEnabled, lfosEnabled)` signature — saved a round of caller wiring.
- New shared `components/DotToggle.tsx`: 5 inline dots collapsed to one component. Variant model: `master` (saturated bg-500/border-400) for panel-wide switches, `item` (translucent /40 + /60) for per-row toggles. Accent `purple` for LFO, `cyan` for audio. `aria-pressed`/`role="switch"` baked in.
- Initial `<ToggleSwitch>` (60px tall) didn't fit the 20px add-button header. User feedback drove the switch to `DotToggle` across all five sites for visual consistency.
- `AnimationSystem.tick` folds `lfosEnabled` into `hasOscillators` — scene with N LFOs but master off skips the full per-frame loop instead of two no-op calls.
- Callers updated symmetrically: `AnimationSystem.tick`, `components/timeline/exportModulations.applyExportModulations`, `engine/features/modulation/applyAt.applyModulationsAt`.

Preservable:
- The 2×2 test matrix (audio × LFO, on/off) confirmed live; save/load cycle preserves both masters + per-rule enables.
- `DotToggle` variant pattern (master saturated, item translucent) is a UI standard worth reusing for future per-feature toggles.
- `Preset.lfosEnabled` migration: missing-key compat defaults to `true` — pattern for future top-level booleans persisted into Preset.
- Decision rationale: audio master toggle lives in "Active Links" section header rather than next to the green-pulse status indicator (controls vs status separation).
- Per-row delete is `text-red-500/50 hover:text-red-400 px-1` (text `×`) — left untouched as out-of-scope.

MAY BE STALE:
- Branch name `feature/modulation-off-switch` was the working branch; presumably merged to dev per 25_HANDOFF.
- File paths assumed unchanged post-merge; any subsequent refactor of `engine/features/modulation/` or `engine/features/audioMod/` would invalidate.

## 25_NEXT_SESSION_HANDOFF.md

Handoff doc dated 2026-05-18 opening the next orchestration session. Single-line state: **Push-ready.** `dev` is 44 commits ahead of `github/dev`; working tree clean; `npm run typecheck` green; canvas refactor + audio fps-sync + modulation off-switches all shipped and merged to `dev`. Immediate next move: `git -C h:/GMT/workspace-gmt/dev push origin dev`. Post-push order: (1) draft `19_OFFLINE_MODULATION_BAKE_PROMPT.md` (architecture in `03_SPEC.md` §3.6 / `02_RATIONALE.md` §9; 3-5 days standalone; unblocks audio feature pass); (2) audio feature pass (sync-across, waveform quality, cuts/trim, mod-record fidelity, audio export) — user-confirmed sequence: must come after `19` ships because the bake's audio decode + FFT pipeline becomes the shared foundation.

Key decisions:
- Working protocol carried forward: one fresh Claude session per phase; pre-phase alignment (assistant drafts PROMPT, user reviews scope) → fresh session for implementation (reads prompt + spec + prior reports, pauses at decision points) → regression gate (`typecheck`, `test:shader`, `bench-perf-timeline --seed=heavy` parity) → report + corrections (spec amendments via `04_CORRECTIONS.md`) → merge.
- Trust boundaries: `03_SPEC.md` is source of truth (amend via `04_CORRECTIONS.md`, don't silently reinterpret); tests non-negotiable; "future-proof working engine" framing per phase; empirical discipline — measure before committing (three probes invalidated their hypotheses).
- "Goals from `02_RATIONALE.md` still unmet (no longer urgent)" enumerated: data layer still Zustand-owned, modulation live/export pipeline duplication, type unification at track boundaries, boot-order not type-enforced. Perf case retracted by canvas wins; hygiene case stands.

Preservable:
- **Architectural debt list** (not blocking push):
  - In-place keyframe mutation grep — 5 writers fixed; `track.keyframes[` / `track.keyframes =` should be a review-checklist item.
  - "For selected of N: keys.find()" antipattern — bitten twice; codified as a footgun.
  - Recording lifecycle coordination — three uncoordinated booleans remain; Recorder state machine designed in `03_SPEC.md §3.6`, unimplemented. Lands with `19` (shared lifecycle surface).
  - HiDPI / DPR rendering across both canvas editors — diamonds blurry on Retina. Mechanical fix. Coupled across `GraphCanvas` + `DopeSheetCanvas` + soft-mask cache.
  - `AnimationSystem.tick` instrumentation — only remaining unknown in bench picture; look there first for future heavy-seed main-thread regressions.
  - **Re-bench app-gmt** — the 2× tick-rate bug invalidates every app-gmt animation/perf bench taken before commit `0814749`. `project_appgmt_perf_bench.md`, `project_animation_refactor_spike.md` need re-running.
- Session-opening prompts (minimal / with-phase / continued-canvas) at §"How to open the new session" — paste-ready templates.
- Session retrospective (§"What this session accomplished"): full `dev/docs/animation-refactor/` doc set (24 docs); 9 architectural questions resolved via Q-walkthrough; two diagnostic probes that saved ~13-17 weeks of misdirected refactor effort; "future-proof working engine" framing; the working protocol itself.

MAY BE STALE:
- "44 commits ahead of `github/dev`" — past tense by 2026-05-20.
- Push presumably happened. Any reference to "blocked on push" can be retired.
- `19_OFFLINE_MODULATION_BAKE_PROMPT.md` may now exist (or not — was queued, not done).
- Architectural debt list may have partially closed since 2026-05-18.

## PHASE_0_PROMPT.md

Phase 0 of the AnimationDocument refactor — type definitions + test harness only, **no behaviour**. Every method throws `'Phase 0: not implemented'` or returns typed null/false/empty. Estimated 2 days. Prerequisite: `06_SPIKE_FINDINGS.md` says "confirmed" or "partial." Builds a parallel `dev/engine/animation/` module hierarchy (`document/`, `player/`, `engine/`, `modulation/`, `audio/`, `recorder/`, `history/`, `provider/`, `shared/`) plus `dev/tests/animation/`. Output: compilable, runnable skeleton subsequent phases fill in.

Key decisions:
- Directory layout enumerated in Step 1 — one class per file, barrel `index.ts` re-exports public surface, top-level barrel is consumer import target.
- Branded primitives in `shared/brands.ts`: `TimeSec = number & {__brand: 'TimeSec'}`, `Frame = number & {__brand: 'Frame'}`, plus `toTimeSec`, `toFrame`, `framesToTime`, `timeToFrames` constructors.
- Ids in `shared/ids.ts` are **bare strings, no nominal typing** — spec explicitly opted not to brand them. `NodeRef = {kind:'track'|'folder', id}`.
- `Track.keyframes: readonly Keyframe[]` — readonly in public type even where implementation mutates internally (single-writer invariant).
- `Keyframe.time` is `TimeSec`, NOT `frame` — the storage unit changes per §1 win.
- **Re-declare** types in `document/types.ts` rather than re-exporting from `dev/types/animation.ts` — new types live in new module; bridge phase translates between them. Mirror existing shapes for now so bridge is mechanical; evolution in later phases.
- Pattern A from spec §4a for dep-needing classes (`Engine`, `ModulationRuntime`, `Recorder`): bare constructor + `init(deps)` method that throws on re-init.
- Module-level singleton exports for all seven (`animationDocument`, `player`, `engine`, `modulationRuntime`, `audioRuntime`, `recorder`, `appHistory`).
- Test runner: Vitest if already in `dev/`, otherwise document choice in report.
- `npm run test:anim` runs only `tests/animation/**`.
- Pause points: after Step 4 (type shape vs existing `dev/types/animation.ts` divergence cost) and Step 8 (runner choice).

Preservable:
- The full directory tree (Step 1) — Phase 0's deliverable shape.
- gmt-rs cross-reference: `gmt-rs/crates/gmt-core/src/animation/{track.rs, engine.rs, binder_registry.rs}` already shipped parallel types; informed `03_SPEC.md` §3 and useful sanity check during implementation.
- The branded-primitives unit test pattern: `framesToTime(toFrame(60), 30) === toTimeSec(2)` — round-trip validates the brand-bridge.
- "No production code imports the new modules yet" — Phase 0's modules exist as parallel surface, untouched by Phase 1 (the bridge phase is later, ~Phase 9).
- Scope guards (§"Scope guards"): "if you find yourself wanting to just implement this small bit because it's obvious — don't" — coherent-unit-per-phase principle.
- Pre-flight: branch `phase/0-scaffolding`, ~2 days focused (interruptions cost more than the implementation).

MAY BE STALE:
- Status: per 25_HANDOFF, Phase 0 was NOT started — the canvas-refactor track + audio fps-sync + modulation off-switches happened instead, and `02_RATIONALE.md` goals are flagged "no longer urgent." The AnimationDocument refactor itself is deferred.
- Prerequisite `06_SPIKE_FINDINGS.md` referenced; per 25_HANDOFF, "two diagnostic probes invalidated their hypotheses" — likely 06 and/or 08/15 are the probes that retracted the perf case for this refactor.
- Pause-point at Step 4 (type shape divergence vs `dev/types/animation.ts`) was never exercised.
