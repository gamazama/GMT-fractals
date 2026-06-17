---
source: engine/animation/audioExportMix.ts
lines: 104
last_verified_sha: e2e11bd94a62a99e49da9d6650db939448388ac6
additional_sources:
  - engine/animation/audioClipSync.ts
  - engine/animation/audioFileCache.ts
audited: 2026-05-20T09:23:00Z
audited_by: claude-opus-4-7
public_api:
  - syncAudioClips
  - _resetAudioClipSync
  - mixAudioClipsForExport
  - MixedAudio
  - setAudioFile
  - getAudioFile
  - clearAudioFile
depends_on:
  - e03-animation
---

# Audio timeline + FPS sync

Three small modules that keep audio aligned with the animation timeline. Live preview drives each loaded deck's native `<audio>` clock through `syncAudioClips` on every ANIMATE tick. Export builds an offline interleaved-stereo mix through `mixAudioClipsForExport` for the muxer. A page-lifetime `audioFileCache` holds the raw `File` per deck so export can re-decode it without round-tripping through the store.

## Public API

| Symbol | Description | Citation |
|--------|-------------|----------|
| `MixedAudio` | Result shape: interleaved stereo `Float32Array` PCM in [-1, 1], sample rate, frame count, duration in seconds. | engine/animation/audioExportMix.ts:4-10 |
| `mixAudioClipsForExport(clips, fps, startFrame, endFrame, sampleRate?)` | Decode each clip's cached `File`, slice to trim range, position at `startFrame`, sum into interleaved stereo PCM over the export window. Returns `null` when no clip has a cached file. `sampleRate` defaults to 48000. | engine/animation/audioExportMix.ts:15-21 |
| `syncAudioClips(clips, currentFrame, fps, isPlaying)` | ANIMATE-tick deck driver — play/pause/seek each loaded `<audio>` deck so its position matches the timeline. | engine/animation/audioClipSync.ts:36-41 |
| `_resetAudioClipSync()` | Reset module globals between sessions / tests. | engine/animation/audioClipSync.ts:16-20 |
| `setAudioFile(deckIndex, file)` | Cache the raw `File` for `deckIndex` (0 or 1). | engine/animation/audioFileCache.ts:8-10 |
| `getAudioFile(deckIndex)` | Read the cached `File` for a deck. | engine/animation/audioFileCache.ts:12-14 |
| `clearAudioFile(deckIndex)` | Drop the cached `File` for a deck. | engine/animation/audioFileCache.ts:16-18 |

## Architecture

### Live preview path — `audioClipSync.ts`

`syncAudioClips` is invoked once per ANIMATE tick from `engine/animation/AnimationSystem.tsx:151` whenever `audioClips` contains at least one non-null entry (see `engine/animation/AnimationSystem.tsx:148-152`).

Three module-level singletons track edge transitions across ticks (engine/animation/audioClipSync.ts:10-13):

| Global | Purpose |
|--------|---------|
| `prevFrame: number \| null` | Last tick's `currentFrame`, `null` until first call. |
| `prevPlaying: boolean \| null` | Last tick's `isPlaying`, `null` until first call. |
| `ownedDecks: Set<number>` | Decks the timeline is actively driving — prevents pre-empting a deck the AudioMod UI started manually. |

Edge derivation per tick (engine/animation/audioClipSync.ts:45-50):

- `justResumed` — `prevPlaying === false && isPlaying`.
- `justPaused` — `prevPlaying === true && !isPlaying`.
- `justScrubbed` — `|frameDelta| / fps > SCRUB_JUMP_SEC` (0.5s).

The scrub threshold `SCRUB_JUMP_SEC = 0.5` is calibrated against a 25Hz RAF (40ms / tick) so naturally slow renders never trip a false scrub (engine/animation/audioClipSync.ts:4-8).

Per-clip timeline-to-source-second mapping at engine/animation/audioClipSync.ts:60-61:

```
t = ((currentFrame - clip.startFrame) / safeFps) + clip.trimStartSec
inRange = t >= trimStartSec - 1e-6 && t <= trimEndSec + 1e-6
```

Action matrix (engine/animation/audioClipSync.ts:63-86):

| Timeline state | Range state | Action |
|----------------|-------------|--------|
| Playing, in range | `justResumed` or `justScrubbed` | `seek(deckIndex, t)`, then `play` if not already, add to `ownedDecks`. |
| Playing, in range | steady state | `play` only if deck not already playing; no `seek`. |
| Playing, out of range | — | `pause` only if `ownedDecks.has(deckIndex)` AND deck is currently `isPlaying`. |
| Paused, `justPaused` | — | If `ownedDecks` owns deck, `pause` it and remove from owned. |
| Paused, `justScrubbed`, in range | — | `seek(deckIndex, t)` if owned. |
| Paused, idle | — | No-op — leave manually-driven decks alone. |

### Offline mix path — `audioExportMix.ts`

`mixAudioClipsForExport` is the offline mixdown used by `exportRunner` on the beauty pass only — `engine-gmt/components/timeline/RenderPopup/exportRunner.ts:429-437`.

Window math (engine/animation/audioExportMix.ts:25-36):

```
exportStartSec = startFrame / fps
exportEndSec   = (endFrame + 1) / fps    // inclusive end
durationSec    = max(0, exportEndSec - exportStartSec)
numFrames      = ceil(durationSec * sampleRate)
pcm            = Float32Array(numFrames * 2)
```

Per-clip mix loop (engine/animation/audioExportMix.ts:38-92):

1. Skip clips without a cached `File`.
2. Decode via a fresh `AudioContext`, closed in `finally` (engine/animation/audioExportMix.ts:38, 93-95).
3. Compute audible intersection `[max(exportStart, clipStart), min(exportEnd, clipEnd)]` — skip if empty (engine/animation/audioExportMix.ts:57-59).
4. Resample source → 48k via linear interpolation per output sample (engine/animation/audioExportMix.ts:70-90).
5. Sum into the interleaved stereo buffer at the right offset.

Stereo handling: mono sources are upmixed by reusing channel 0 as channel 1 (engine/animation/audioExportMix.ts:73-74). After the loop, the buffer is hard-clipped to [-1, 1] in case multiple clips overlap (engine/animation/audioExportMix.ts:97-101).

### File cache — `audioFileCache.ts`

A `Map<0 | 1, File>` keyed by deck index, module-level singleton with no eviction (engine/animation/audioFileCache.ts:6). The animation store's `AudioClip` carries structured-cloneable peaks + metadata; the raw `File` lives only here because it's needed transiently for re-decode / peak re-compute (engine/animation/audioFileCache.ts:1-4).

Writes are owned by `components/timeline/AudioStrip.tsx:86` (on file load) and cleared on clip remove at `components/timeline/AudioStrip.tsx:215`. Reads happen only inside `mixAudioClipsForExport` (engine/animation/audioExportMix.ts:22, 42).

## Invariants

- **Never seek during steady-state play.** Each `audioAnalysisEngine.seek` call is an audible click on the `<audio>` element; the deck's native clock is the audio reference between transitions. Only the three edge cases — `justResumed`, `justScrubbed`, out-of-range — touch the deck while playing (engine/animation/audioClipSync.ts:22-35, 63-74).
- **Module globals persist across HMR.** `prevFrame` / `prevPlaying` / `ownedDecks` are module-level. Tests must call `_resetAudioClipSync()` between cases (engine/animation/audioClipSync.ts:10-20).
- **Scrub threshold is coupled to tick rate.** At 60fps with 25Hz RAF, per-tick frame delta is ~2.4 frames (~0.04s), well clear of 0.5s. If ANIMATE ever ticks less frequently than ~2Hz, false scrub-seeks will appear (engine/animation/audioClipSync.ts:4-8, 50).
- **Out-of-range during play only pauses owned decks.** Prevents pausing decks the timeline never claimed (engine/animation/audioClipSync.ts:64-69).
- **Out-of-range during pause clears ownership** so future plays from the AudioMod UI aren't reclaimed (engine/animation/audioClipSync.ts:76-81).
- **Export window uses inclusive end.** `(endFrame + 1) / fps` covers the trailing frame's full `1 / fps` slot — without `+1` the audio mix is one frame short (~40ms at 25fps) at the tail (engine/animation/audioExportMix.ts:27-32). If `endFrame` ever becomes exclusive, the `+1` must be dropped.
- **`void srcEndT` at engine/animation/audioExportMix.ts:91 is intentional** — suppresses an unused-binding lint while keeping the variable's documentation value. If the surrounding `writeLen` / `audibleEndSec` math is refactored, drop the `void` marker too.
- **Linear-interpolation resample only.** Adequate for typical 44.1k → 48k; no anti-alias lowpass for large rate ratios (engine/animation/audioExportMix.ts:70-72).
- **Hard-clipping, no per-clip gain.** Overlapping clips at full gain distort — `AudioClip` has no gain field (engine/animation/audioExportMix.ts:97-101).
- **`audioFileCache` is per-page singleton.** Closing the tab loses the file; clip metadata survives in GMF saves but reopening needs a re-upload (engine/animation/audioFileCache.ts:1-6).
- **`deckIndex` is the literal union `0 | 1`.** The cache and `AudioAnalysisEngine` both assume a two-deck mixer; adding a third deck requires widening the union in multiple files (engine/animation/audioFileCache.ts:6-16).

## Interactions with other subsystems

- **e03-animation** — `syncAudioClips` is wired into the ANIMATE tick at `engine/animation/AnimationSystem.tsx:151` and reads `audioClips` / `currentFrame` / `fps` / `isPlaying` from the animation store. The animation module-doc lists these symbols in its surface table (see `docs/modules/engine/animation.md`); this doc owns the implementation detail.
- **AudioMod feature** — `syncAudioClips` calls into `audioAnalysisEngine.getTrackInfo` / `play` / `pause` / `seek` (engine/animation/audioClipSync.ts:1, 57, 66, 70-71, 78, 83). The two-deck `AudioAnalysisEngine` is the audio reference clock between transitions.
- **AudioStrip UI** — owns `setAudioFile` / `clearAudioFile` calls at `components/timeline/AudioStrip.tsx:86, 215`. The cache write happens immediately after `audioAnalysisEngine.loadTrack` so peaks decoded later can find the source.
- **exportRunner / RenderPopup** — calls `mixAudioClipsForExport` on the beauty pass only at `engine-gmt/components/timeline/RenderPopup/exportRunner.ts:429-437`, wraps it in try/catch, and proceeds with silent video on failure.

## Known issues / Phase 2 carry-in

No Phase 2 carry-in items target `g10-audio-fps-sync`. Carry-forward observations from the survey:

- **Cross-engine import.** `engine-gmt/components/timeline/RenderPopup/exportRunner.ts:34` imports `mixAudioClipsForExport` from `engine/animation/audioExportMix` — unusual `engine-gmt → engine` direction. Worth confirming the layering intent during future cleanup.
- **Decode failure is silent at the boundary.** `mixAudioClipsForExport` does not catch its own decode errors; the call site at `engine-gmt/components/timeline/RenderPopup/exportRunner.ts:430-436` swallows + logs, so the user gets no specific error class — only a "silent video" outcome.
- **Beauty-pass-only audio dispatch.** Alpha / depth aux passes drop audio by design. A pass-dispatch bug that misclassifies the beauty pass would silently produce silent exports (engine/animation/audioExportMix.ts:15, `engine-gmt/components/timeline/RenderPopup/exportRunner.ts:429-437`).

## Historical context

In-source rationale comments document the design intent:

- The "never seek during steady-state play" rule and its three permitted edge cases (resume / scrub / out-of-range) are inline at engine/animation/audioClipSync.ts:22-35.
- `SCRUB_JUMP_SEC = 0.5` is documented at engine/animation/audioClipSync.ts:4-8 as calibrated against 25Hz RAF.
- The inclusive-end `+1` in the export window math is explained at engine/animation/audioExportMix.ts:26-32 with the ~40ms tail-mismatch rationale.
- `audioFileCache`'s "structured-cloneable metadata in the store, raw `File` only here" split is captured in the file header at engine/animation/audioFileCache.ts:1-4.

No prior `dev/docs/` module doc existed for this subsystem; the corresponding section in `docs/modules/engine/animation.md` mirrors the same surface for the broader animation doc.
