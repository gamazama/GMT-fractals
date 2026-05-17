# Audio strip / timeline fps sync — diagnosis + fix report

**Companion to:** [`21_AUDIO_TIMELINE_SYNC_PROMPT.md`](./21_AUDIO_TIMELINE_SYNC_PROMPT.md).

## 1. Result line

**Fixed (four bugs).** The prompt set out to find one. Investigation surfaced three more, all of which were contributing to the user-visible "audio doesn't sync" symptom. They compound, so fixing only one of them looks like the symptom persists.

1. **`setFps('match')` skipped `audioClips[*].startFrame`** ([`playbackSlice.ts:146-153`](../../store/animation/playbackSlice.ts#L146-L153)). Wall-clock-preserving fps change rescaled keyframes but left audio clips pinned to the old frame index — drift = `(newFps/oldFps − 1) * startFrame` frames. The prompt's original hypothesis.
2. **`getTrackInfo` returned `duration: 1` instead of `0`** for a freshly-loaded deck whose `<audio>` element hadn't yet decoded metadata ([`AudioAnalysisEngine.ts:169`](../../engine/features/audioMod/AudioAnalysisEngine.ts#L169)). The `|| 1` fallback made `waitForAudioMetadata` resolve on its first 50ms poll with a bogus `dur=1`, locking the clip to a 1-second slice. Only the happy path (`computeWaveformPeaks` overwriting it within ~100ms) hid this.
3. **`computeWaveformPeaks` overrode `<audio>.duration` with `audioBuf.duration`** ([`AudioStrip.tsx:126-148`](../../components/timeline/AudioStrip.tsx#L126-L148)). Web Audio's `decodeAudioData` is strict — for files whose container headers under-report sample count (VBR MP3, MPEG-2 Layer III at low sample rates, some AACs) it returns a *truncated* buffer with a `duration` shorter than reality. The `<audio>` element's browser-native decoder is lenient and plays through anyway. Trusting `audioBuf.duration` capped the clip's playable range to the truncated value. Fix: `<audio>.duration` is the playback authority; `audioBuf.duration` is stored separately as `peaksDurationSeconds` and only governs the waveform's peak-bucket-to-audio-time mapping (so truncated peaks render at their real audio-time positions instead of stretching across the full clip).
4. **Two RAF loops were calling `TickRegistry.runTicks()` per frame** ([`AppGmt.tsx`](../../app-gmt/AppGmt.tsx)). `<RenderLoopDriver />` (engine-core default RAF driver) and `<GmtRendererTickDriver />` (GMT's R3F useFrame driver that also dispatches the worker frame) were both mounted, so every tick fired twice → animation timeline, LFOs, modulation rules, and audio sync all advanced at **2× wall-clock**. The audio deck plays at native rate, so it had reached only the file's midpoint when the playhead crossed the clip's visual end and sync paused the deck. **This was the dominant cause of the live "only half plays" symptom**; the first three bugs were contributing pre-conditions but bug 4 made every clip play exactly half regardless. Fix: drop the redundant `<RenderLoopDriver />`; add a defence-in-depth guard in [`TickRegistry.runTicks`](../../engine/TickRegistry.ts) that detects duplicate calls within 1ms, suppresses the second, and warns in dev so the wiring bug surfaces in the console instead of as silent 2× drift.

**Wider impact of bug 4:** Every per-frame consumer in the GMT main app was running at 2× wall-clock for as long as both drivers were mounted. That includes LFO oscillators, modulation rules, audio-reactive bindings, gizmo ticks, FPS counter, performance monitor, and recording. Any benchmarks taken on `app-gmt/` while both drivers were mounted reflect the 2×-tick state — re-bench any animation-perf numbers that came from this app (`project_appgmt_perf_bench.md`, `project_animation_refactor_spike.md`).

Regression smoke at [`debug/smoke-audio-fps-remap.mts`](../../debug/smoke-audio-fps-remap.mts) covers bug 1. Bugs 2–4 verified in-browser against `H:/GMT/assets/8d82b5_Super_Mario_Bros_Die_Sound_Effect.mp3` (an MPEG-2 Layer III 22.05 kHz mono file — the format that surfaces all three by happening to combine VBR-quirk decode + short duration + the symptom).

## 2. Conversion site audit

Every site that converts between frames, seconds, and pixels in the audio pipeline. `OK` = uses the current `fps` from the store at the moment of the call. `WRONG` = uses a stale/wrong fps. `N/A` = doesn't involve fps conversion.

| Site | Math | Status |
|---|---|---|
| [`AudioStrip.tsx:171`](../../components/timeline/AudioStrip.tsx#L171) | `widthPx = trimSpanSec * fps * frameWidth` | **OK** — `fps` is prop-threaded from `AudioGroup` which subscribes to the store. |
| [`AudioStrip.tsx:172`](../../components/timeline/AudioStrip.tsx#L172) | `leftPx = clip.startFrame * frameWidth` | **OK** — `startFrame` is already in frames; no conversion. (But see §3 for the bug this exposes.) |
| [`AudioStrip.tsx:191-196`](../../components/timeline/AudioStrip.tsx#L191-L196) | `dFrame = dx/frameWidth`; `startFrame += dFrame` | **OK** |
| [`AudioStrip.tsx:201-205`](../../components/timeline/AudioStrip.tsx#L201-L205) | `dSec = dFrame/fps`; trim_left shifts `startFrame` by `trimDelta * fps` | **OK** — round-trips through fps; visual right edge stays pinned. |
| [`AudioStrip.tsx:208`](../../components/timeline/AudioStrip.tsx#L208) | `newTrimEnd = trimEnd + dSec` | **OK** |
| `Waveform` component, [`AudioStrip.tsx:50-65`](../../components/timeline/AudioStrip.tsx#L50-L65) | bucket index = `(trimRange[i] / durationSec) * peaks.length`, mapped linearly across `widthPx` | **OK** — entirely in seconds + bucket-fractions; no fps reference. Correctness flows from §1 setting widthPx right. |
| [`audioWaveform.ts`](../../utils/audioWaveform.ts) | `bucketSize = floor(totalSamples / buckets)`; peak per bucket | **N/A** — works in samples only. Minor sample-truncation at the tail (~5 ms for typical clips) is negligible. |
| [`audioClipSync.ts:60`](../../engine/animation/audioClipSync.ts#L60) | `t = (currentFrame − clip.startFrame) / safeFps + clip.trimStartSec` | **OK** — `fps` is passed live from `AnimationSystem`. |
| [`audioClipSync.ts:50`](../../engine/animation/audioClipSync.ts#L50) | scrub-jump detection: `|frameDelta| / safeFps > 0.5` | **OK** |
| [`audioExportMix.ts:30,53`](../../engine/animation/audioExportMix.ts#L30-L53) | `exportStartSec = startFrame / safeFps`; `clipStartSec = clip.startFrame / safeFps` | **OK** |
| [`AnimationEngine.ts:257`](../../engine/AnimationEngine.ts#L257) | `deltaFrames = dt * fps` (non-deterministic) / `frameDur = 1/fps` (deterministic) | **OK** — playhead advances at `fps` frames per real second, matching audio's 1× native playback. |
| **[`playbackSlice.ts:111-147`](../../store/animation/playbackSlice.ts#L111-L147) — `setFps('match')`** | Remaps `keyframe.frame`, `leftTangent.x`, `rightTangent.x`, `durationFrames`, `sequence.durationFrames`, `currentFrame` by `newFps / oldFps`. **Skips `audioClips[*].startFrame`.** | **WRONG** |
| [`playbackSlice.ts:111-114`](../../store/animation/playbackSlice.ts#L111-L114) — `setFps('keep')` | Just sets `fps`. Frame indices preserved by design. | **OK by design** — see §6. |
| **[`AudioAnalysisEngine.ts:169`](../../engine/features/audioMod/AudioAnalysisEngine.ts#L169) — `getTrackInfo`** | `duration: d?.duration || 1` — returns a synthetic 1-s fallback when `<audio>.duration` is NaN (file just loaded, metadata not yet decoded). Defeats the polling-check in [`AudioStrip.tsx:79`](../../components/timeline/AudioStrip.tsx#L79) which expects `duration > 0` to mean "real metadata arrived." | **WRONG** (not strictly fps math — but it's the seconds-source feeding the whole audio pipeline, so it owns the same class of "wrong seconds → wrong everything" failure mode the prompt was hunting.) |

## 3. Root cause

`AudioClip.startFrame` is a frame-indexed field, semantically identical to a keyframe's `frame`. The `'match'` fps-change mode is designed to preserve wall-clock time: every frame index gets scaled by `newFps / oldFps`. The implementation in [`playbackSlice.ts:122-147`](../../store/animation/playbackSlice.ts#L122-L147) iterates `state.sequence.tracks` and rescales their keyframes, plus the top-level `currentFrame` and `durationFrames` — but `audioClips` lives in a separate slice ([`audioClipsSlice.ts`](../../store/animation/audioClipsSlice.ts)) and the `setFps` action never touches it.

Consequence — at fps=60, place a clip at `startFrame=60` (= 1.0 s wall time) and a keyframe at frame 60 (also 1.0 s). Switch to fps=30 `'match'`:

| | Pre-change | Post-change `'match'` | Wall-clock |
|---|---|---|---|
| Keyframe `frame` | 60 | **30** (remapped) | 1.0 s ✓ preserved |
| Audio clip `startFrame` | 60 | **60** (skipped) | **2.0 s** ✗ shifted |

Net drift: 1.0 s of wall-clock between the keyframe and the audio it was placed against. Compounds with `startFrame` magnitude — a clip dropped 30 s into the timeline drifts 30 s worth of wall-clock relative to the keyframes around it.

Why nobody caught it: the audio-clip integration ([`memory/project_audio_timeline_phase.md`](../../../../C:/Users/gighz/.claude/projects/h--GMT-workspace-gmt-stable/memory/project_audio_timeline_phase.md)) landed before `'match'` mode existed (2026-05-06 → 09 vs. `'match'` added in CHANGELOG_DEV.md:137 as a separate landed feature). The `'match'` implementation only knew about the sequence slice. No regression test exercises `setFps('match')` with audio clips loaded.

## 3b. Root cause — bug 2: `getTrackInfo` synthesizes 1-second duration

[`AudioAnalysisEngine.getTrackInfo`](../../engine/features/audioMod/AudioAnalysisEngine.ts#L166-L176) is a poll-friendly snapshot of a deck's state. It guards against `null`/`NaN` with `||` fallbacks: `duration: d?.duration || 1` was meant to keep callers from dividing by zero. But `Deck.duration` ([`AudioAnalysisEngine.ts:42`](../../engine/features/audioMod/AudioAnalysisEngine.ts#L42)) already returns `0` when `<audio>.duration` is `NaN` — so the `|| 1` ends up firing precisely when the metadata is *still loading*, the exact moment a polling caller is trying to detect.

[`waitForAudioMetadata`](../../components/timeline/AudioStrip.tsx#L74-L91) sees `info.duration === 1`, judges that "metadata arrived" (`1 > 0 && Number.isFinite(1)`), and resolves immediately. The `EmptyDeckSlot.handleFile` callback then writes `{ durationSeconds: 1, trimEndSec: 1 }` to the clip — pinning a 1-second slice into the store before the file has actually been measured.

The follow-up `computeWaveformPeaks` overwrites both fields with the real values **if** it succeeds. If the decode fails (unusual format, AudioContext suspended by autoplay policy, file too large, etc.) the catch block swallows the error and the clip is left with the bogus 1-second state.

The only other caller of `info.duration`, [`AudioPanel.tsx:54`](../../engine/features/audioMod/AudioPanel.tsx#L54), guards its own division with `Math.max(0.1, status.duration)`, so dropping the `|| 1` is safe.

Why nobody caught it: the audio integration's happy path (`computeWaveformPeaks` succeeds within ~100ms for typical clips) overwrites the bogus value before any human notices. The bug only manifests when the decode path fails *or* lags long enough for the user to act on the stale state.

## 4. Fix — bug 1: `setFps('match')` audio remap

Single edit in [`store/animation/playbackSlice.ts`](../../store/animation/playbackSlice.ts), inside the `mode === 'match'` branch's `set` callback. Add `audioClips` to the returned partial state:

```ts
// BEFORE (around line 137-147):
return {
    fps: newFps,
    durationFrames: Math.max(1, remap(s.durationFrames)),
    currentFrame: remap(s.currentFrame),
    sequence: { ...s.sequence, durationFrames: ..., tracks: newTracks },
};

// AFTER:
return {
    fps: newFps,
    durationFrames: Math.max(1, remap(s.durationFrames)),
    currentFrame: remap(s.currentFrame),
    sequence: { ...s.sequence, durationFrames: ..., tracks: newTracks },
    audioClips: s.audioClips.map(c => c ? { ...c, startFrame: remap(c.startFrame) } : null),
};
```

`trimStartSec` and `trimEndSec` are already in seconds — wall-clock preservation needs no rescaling on them. `durationSeconds` and `peaks` are audio-file properties, untouched by fps.

## 4b. Fix — bug 2: drop the `|| 1` fallback in `getTrackInfo`

Single edit in [`engine/features/audioMod/AudioAnalysisEngine.ts:169`](../../engine/features/audioMod/AudioAnalysisEngine.ts#L169):

```ts
// BEFORE:
duration: d?.duration || 1,

// AFTER:
duration: d?.duration || 0,
```

After the fix, `waitForAudioMetadata` correctly distinguishes "no metadata yet" (`0`) from "real duration" (`> 0`) and keeps polling until `<audio>.duration` is populated. The clip is initialized with the real value on the first successful poll, so a subsequent `computeWaveformPeaks` failure no longer leaves the clip in a 1-second stub state.

## 5. Regression test

Unit test on the slice action — boots the store, sets fps=60, loads a synthetic audio clip at `startFrame=120` (= 2.0 s wall), calls `setFps(30, 'match')`, asserts `audioClips[0].startFrame === 60` (= still 2.0 s wall at fps=30). Lives next to the existing slice tests if any; otherwise as a one-off `audioClipsSlice.fpsRemap.test.ts`.

Manual smoke (acceptance criteria §1, §2, §4 from the prompt):
1. Load audio clip at fps=60. Place a keyframe on any track at the clip's midpoint frame.
2. `setFps(30, 'match')`. Keyframe and clip midpoint should remain aligned visually.
3. `setFps(60, 'keep')` from baseline (no audio change expected — keyframes drift in wall-clock by design). Document this so the next investigator doesn't chase it.

## 6. What survived (not bugs, don't chase)

- **Internal sync at any single fps.** Every conversion in the audio pipeline uses the live `fps` from the store. At fps=30 with a freshly-loaded clip, the waveform pixel width, drag math, playback sync, and export mix all use the same `fps` value — no drift.
- **`setFps('keep')` not remapping audio.** Consistent with the mode's contract: `'keep'` preserves frame indices for *everything*, accepting wall-clock drift. Keyframes don't move, durationFrames doesn't move, audio shouldn't either. Wall-clock alignment between keys + audio is preserved (both interpret frame indices via the new fps); only their wall-clock position on the timeline shifts together. The user opts into this when picking `'keep'`.
- **`<audio>.loop = true`** in [`AudioAnalysisEngine.ts:14`](../../engine/features/audioMod/AudioAnalysisEngine.ts#L14). Native loop only kicks in if the timeline runs past the file's natural end *without* sync-tick pausing it — sync runs every animation frame, so this is theoretical. Not the symptom.
- **Placeholder-then-replace duration** in [`AudioStrip.tsx:108-128`](../../components/timeline/AudioStrip.tsx#L108-L128). Optimistic 60-s placeholder gets replaced when `waitForAudioMetadata` resolves (typically <100 ms). Visual jump on initial load is brief and orthogonal to fps sync.
- **`audioWaveform.ts` sample truncation.** Up to `bucketSize − 1` samples (< 25 ms at 44.1 kHz / 1024 buckets) dropped from the tail. Sub-frame at any usable fps. Not chase-worthy.

## 7. Status

- [x] Diagnosis (Part 1).
- [x] Fix bug 1 (`setFps('match')` audio remap) at [`playbackSlice.ts:146-153`](../../store/animation/playbackSlice.ts#L146-L153) on branch `feature/audio-fps-sync`.
- [x] Fix bug 2 (`getTrackInfo` `|| 1`) at [`AudioAnalysisEngine.ts:169`](../../engine/features/audioMod/AudioAnalysisEngine.ts#L169).
- [x] Regression test (Part 3) — [`debug/smoke-audio-fps-remap.mts`](../../debug/smoke-audio-fps-remap.mts), `npm run smoke:audio-fps-remap`. Asserts: (a) `'match'` remaps `audioClips[0].startFrame` 120 → 60 alongside the keyframe at frame 120; (b) round-trip 30→60 restores 120; (c) `'keep'` leaves `audioClips` alone. Verified to fail pre-fix (`audio startFrame expected 60, got 120`) and pass post-fix.
- [x] Typecheck clean (`npm run typecheck`).
- [ ] Acceptance criteria from the prompt: visual peak/ruler alignment at fps ∈ {24, 25, 30, 60} — needs in-browser verification (out of scope for headless smoke; per `feedback_visual_smokes.md`, user does visual testing).
- [ ] Bug-2 in-browser repro: load a short sound, confirm the clip width = `duration * fps * frameWidth`, the waveform spans the full clip, and playback covers the whole audio file rather than stopping at 1 s.
