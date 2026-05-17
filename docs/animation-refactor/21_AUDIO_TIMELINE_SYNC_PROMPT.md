# Audio strip / timeline fps sync — investigation + fix prompt

**Purpose:** the audio strip's waveform render and clip-cut positions don't track the timeline's fps. Surfaced by the user during the [`20_TIMELINE_CLEANUP_REPORT.md`](./20_TIMELINE_CLEANUP_REPORT.md) Part-1 review. Explicitly out of scope of that pass (per `18_TIMELINE_CLEANUP_PROMPT.md` "Out of scope": *"Audio interaction features ... is unchanged"*). This prompt captures the issue for a dedicated session.

**Status:** pre-investigation. Reproduces in the timeline panel when an audio clip is loaded.

**Estimated effort:** 0.5-1 day. Bounded by *figuring out where the seconds-to-frames conversion fell out of sync* — once located, the fix is usually one place.

## Symptom (from user)

> audio tracks waveforms and position/cuts still dont seem to sync with the audio - are they respecting the timeline's fps?

Translation:
- The waveform's x-axis pixel mapping doesn't agree with the timeline's frame ruler — visible peaks in the waveform line up with the *wrong* timeline frame.
- Clip "cuts" (the in/out trim handles or clip-start/end markers) sit at the wrong frame relative to the audio they correspond to.

Both symptoms point at one root cause: a `seconds × something` conversion that uses a stale or wrong `fps` value (most likely the project default of 60 instead of `useAnimationStore.getState().fps`).

## Read first

1. **[`components/timeline/AudioStrip.tsx`](../../components/timeline/AudioStrip.tsx)** — the waveform canvas and the clip-position math. The 16_ report's surprise #3 already touched this file for the `MAX_CANVAS_PX` clamp; the seconds-to-frames conversion is in the same file.
2. **[`utils/audioWaveform.ts`](../../utils/audioWaveform.ts)** — the helper that builds peak buckets from an `AudioBuffer`. Watch how it expresses time: in seconds (`buffer.duration`), in samples, or in frames.
3. **[`store/animationStore`](../../store/animationStore.ts)** — `state.fps` is the source of truth. Wherever audio code computes pixel-x from a timestamp, it should be doing `seconds × fps × frameWidth` (NOT `seconds × 60 × frameWidth`).
4. **[`docs/animation-refactor/00_INDEX.md`](./00_INDEX.md)** §"Audio + multi-key bbox" — the original audio integration landed in the `audio_timeline_phase` work (memory pointer: `memory/project_audio_timeline_phase.md`). The README of that landed work captures the original seconds↔frames mapping decisions.

## Likely culprits (don't trust without verification)

1. **A hardcoded `60` in `AudioStrip.tsx` or `audioWaveform.ts`** where `fps` should be used. Grep `\b60\b` in those files first; any plain `60` that touches time math is suspect.
2. **The waveform pixel-width formula uses `audio.duration × frameWidth × DEFAULT_FPS`** instead of `audio.duration × frameWidth × project.fps`. Project-fps drift (24, 25, 30, 60) wouldn't show up at 60 fps but would visibly break at every other rate.
3. **A clip-start frame stored as samples-or-seconds at write time, read back as frames at render time** — e.g. `clip.startFrame` set as `clip.startTimeSec × 60` regardless of the project's actual fps. Check the `AudioClip` (or whatever the type is) store-write path.
4. **AudioBufferSourceNode playback offset vs. visual playhead** — the audio engine plays at the audio's native sample rate × `playbackRate`; if `playbackRate` is set off the wrong fps, the audio "drifts" relative to the playhead even when the visual ruler looks right.

## Reproduction

1. Load an audio clip into the timeline at the project default fps (60).
2. Change project fps to 30 (or 24, or 25 — anything other than 60).
3. Observe:
   - The waveform's visible peaks shift away from the timeline ruler marks they used to align with.
   - Cut markers (clip-start, clip-end, any mid-clip cuts the user has placed) appear at the wrong frame.
   - Scrubbing the playhead to "obvious" audio events (a beat, a snare hit) — the playhead position no longer lines up with the audible event.

If only one of the three symptoms reproduces, the others may share a root cause but be masked by the same constant getting used in both directions — verify each independently.

## Three parts

### Part 1 — Diagnosis (~2-3 hours)

- Grep `AudioStrip.tsx`, `audioWaveform.ts`, `store/animationStore` for: `60`, `* fps`, `/ fps`, `frameWidth`, `secondsPerFrame`, `framesPerSecond`. Trace every seconds-to-frames or frames-to-seconds conversion.
- For each, verify it sources `fps` from the store at the *current* moment (not at audio-load moment, not from a captured closure that pre-dates an fps change).
- Cross-check against the project-fps change handler — does it re-emit a re-render to AudioStrip? Does it invalidate any audio-side caches?
- Result: a written list (in the report doc) of "every seconds-frames conversion site, with `OK` or `WRONG: explanation`".

### Part 2 — Fix (~1-2 hours, usually one place)

- Apply the fix to whichever site fails the diagnosis. Most likely a single line: replace `60` with `useAnimationStore.getState().fps` or thread the current fps through props if the call site is component-scoped.
- If multiple sites are wrong, factor a shared `framesToSeconds(frames: number, fps: number)` / `secondsToFrames(seconds: number, fps: number)` helper in [`utils/timelineUtils.ts`](../../utils/timelineUtils.ts) so the next audio surface can't drift again.

### Part 3 — Regression gate (~1 hour)

- The bench already has audio scenarios via the heavy seed's track set, but no scenario specifically exercises "load audio, change fps, scrub, expect playhead-event sync". Add one.
- If no test framework reaches this layer cleanly, a manual smoke list in the report is acceptable — but a unit test on `secondsToFrames` / `framesToSeconds` at non-60 fps catches the most likely regression.

## Acceptance criteria

- [ ] Waveform visible peaks align with the timeline ruler at fps ∈ {24, 25, 30, 60} for the same loaded clip.
- [ ] Clip-start, clip-end, and any user-placed cut markers sit at the same audio-time after an fps change as before.
- [ ] Scrubbing the playhead to a peak in the waveform plays the corresponding audio sample at that exact instant.
- [ ] No regression at fps=60 (the default — must not have broken the current working case).
- [ ] `typecheck` clean; bench parity confirmed against the post-canvas-cleanup baseline.
- [ ] One regression test (unit on the conversion helper, or manual checklist in the report) that catches drift if fps-aware code regresses.

## Out of scope

- Audio engine internals (Web Audio playback, AudioBuffer source-node lifecycle) — unless the diagnosis points there.
- Volume / fade / envelope features — separate from sync.
- Multi-track audio mixing — single-clip sync first.

## Pre-flight

- [ ] On a fresh branch: `feature/audio-fps-sync` (or similar).
- [ ] On dev HEAD post-canvas-cleanup merge.
- [ ] `npm run typecheck` passes.
- [ ] Reproduce the symptom in-browser at fps={24,30,60} with a known audio clip — capture the visual diff as part of the diagnosis report.

## Report doc structure

Write `22_AUDIO_TIMELINE_SYNC_REPORT.md` adjacent. Sections:

1. **Result line** — one sentence: "fixed at <site>, fps now respected end-to-end" or "diagnosis only — root cause is X, fix queued for next session because Y."
2. **Conversion site audit** — table of every seconds-frames conversion found, with OK/WRONG annotation.
3. **Root cause** — what was wrong, why nobody caught it.
4. **Fix** — file:line, before/after.
5. **Regression test** — what was added.
6. **What survived** — anything that looked like it should be wrong but wasn't (so future audits don't waste time).

## Why this is worth its own session

The cleanup pass (`18_` → `20_`) was a structural and code-health pass — the canvas architecture work shipped a 137-ms freeze fix and the cleanup-pass paid down the dead code that the refactors orphaned. Audio sync is functional behaviour, requires reproduction in-browser with audible feedback, and the diagnosis is fps-arithmetic detective work — completely different mode of thinking. Bundling it with cleanup would have stretched scope and made both passes worse. Separate session = focused diagnosis.
