---
subsystem_id: g10-audio-fps-sync
audited_at: 2026-05-20T00:00:00Z
files:
  - path: engine/animation/audioClipSync.ts
    blob_sha: 932a0cefb6f7a8a3ed1e15bac07b2562cda88f15
    lines_read: [1, 87]
  - path: engine/animation/audioExportMix.ts
    blob_sha: e2e11bd94a62a99e49da9d6650db939448388ac6
    lines_read: [1, 104]
  - path: engine/animation/audioFileCache.ts
    blob_sha: 0e59e8156ef55a8148c00871dd98009872073d1d
    lines_read: [1, 18]
---

## Public API surface

- `syncAudioClips(clips: (AudioClip|null)[], currentFrame: number, fps: number, isPlaying: boolean): void` — engine/animation/audioClipSync.ts:36
- `_resetAudioClipSync(): void` — engine/animation/audioClipSync.ts:16 (test/session reset)
- `mixAudioClipsForExport(clips, fps, startFrame, endFrame, sampleRate=48000): Promise<MixedAudio|null>` — engine/animation/audioExportMix.ts:15
- `MixedAudio` interface: `{ pcm: Float32Array (interleaved stereo, [-1,1]); sampleRate; numFrames; durationSec }` — engine/animation/audioExportMix.ts:4-10
- `setAudioFile(deckIndex: 0|1, file: File): void` — engine/animation/audioFileCache.ts:8
- `getAudioFile(deckIndex: 0|1): File | undefined` — engine/animation/audioFileCache.ts:12
- `clearAudioFile(deckIndex: 0|1): void` — engine/animation/audioFileCache.ts:16

## Architecture

- `syncAudioClips` is the ANIMATE-tick deck driver: invoked once per frame from `AnimationSystem.tsx:151` whenever `audioClips` contains at least one non-null entry — engine/animation/AnimationSystem.tsx:148-152.
- Two module-level singletons track edge transitions across ticks: `prevFrame` and `prevPlaying`, both `null` until first call — engine/animation/audioClipSync.ts:12-13.
- `ownedDecks: Set<number>` records which decks the timeline is actively driving, so a deck started by the manual AudioMod UI is not pre-empted by the timeline — engine/animation/audioClipSync.ts:10, 65-79.
- Edge derivation per tick: `justResumed` (paused→playing), `justPaused` (playing→paused), `justScrubbed` (|frameDelta|/fps > 0.5s) — engine/animation/audioClipSync.ts:45-50.
- The scrub threshold `SCRUB_JUMP_SEC = 0.5` is calibrated against 25Hz RAF (40ms/tick) so naturally slow renders never look like scrubs — engine/animation/audioClipSync.ts:4-8.
- Steady-state play touches no deck APIs — only the three transition events (resume / scrub / out-of-range) call `seek`/`play`/`pause`. Native `<audio>` clock is trusted as the audio reference between transitions — engine/animation/audioClipSync.ts:22-35, 63-74.
- Per-clip timeline-to-source-second mapping: `t = ((currentFrame - clip.startFrame) / fps) + clip.trimStartSec`, with `inRange` window `[trimStartSec, trimEndSec]` and ±1e-6 slack — engine/animation/audioClipSync.ts:60-61.
- Out-of-range during play: pause only if `ownedDecks.has(deckIndex)` AND deck is currently `isPlaying` — prevents pausing decks the timeline never owned — engine/animation/audioClipSync.ts:64-69.
- Out-of-range during pause: `ownedDecks` is cleared so future plays from the AudioMod UI aren't claimed by the timeline — engine/animation/audioClipSync.ts:77-81.
- `mixAudioClipsForExport` is the offline mixdown used by `exportRunner` on the beauty pass only — engine-gmt/components/timeline/RenderPopup/exportRunner.ts:429-436.
- Export window duration uses `(endFrame + 1) / fps` for the END boundary — covers the trailing frame's full 1/fps slot. Without `+1` audio is one frame short (~40ms tail mismatch) — engine/animation/audioExportMix.ts:26-32.
- Per-clip mix loop: decodes the cached `File` via a fresh `AudioContext` (closed in `finally`), computes the audible intersection of export window vs clip extent, then resamples source → 48k via linear interpolation per output sample — engine/animation/audioExportMix.ts:38-90.
- Stereo handling: mono sources are upmixed by reusing channel-0 as channel-1 — engine/animation/audioExportMix.ts:73-74.
- Mix sums clip contributions then hard-clips to ±1 (no soft limiter) to handle overlap — engine/animation/audioExportMix.ts:97-101.
- `audioFileCache` is a `Map<0|1, File>` keyed by deck index, page-lifetime, no eviction — engine/animation/audioFileCache.ts:6. `AudioClip` carries structured-cloneable peaks/metadata but the raw `File` lives only here because it's needed transiently for re-decode/peak-recompute — engine/animation/audioFileCache.ts:1-4.
- Cache writes are owned by `AudioStrip.tsx:86` (on file load) and cleared on clip remove at `AudioStrip.tsx:215`. Reads happen in `mixAudioClipsForExport` only — engine/animation/audioExportMix.ts:22, 42.
- Recent feature/audio-fps-sync commit chain: c1f5338 (initial AudioStrip) → f156dcc (transitions-only sync) → 6a98c55 (decoding overlay) → b984602 (mux into export) → b45e2c0 (no-seek-steady-state) → 8a02f67 (PTS-0 alignment).

## Invariants and gotchas

- "Never seek during steady-state play" is the load-bearing rule — seeks click audibly. Adding a new condition that calls `audioAnalysisEngine.seek` outside the three edge cases will regress smoothness — engine/animation/audioClipSync.ts:22-35.
- `prevFrame`/`prevPlaying`/`ownedDecks` are module globals — they persist across page navigations in HMR; tests must call `_resetAudioClipSync()` between cases — engine/animation/audioClipSync.ts:10-20.
- `SCRUB_JUMP_SEC = 0.5` is coupled to FPS-vs-RAF-tick math: at 60fps with 25Hz RAF, frame delta per tick is ~2.4 frames (0.04s), well clear of 0.5s. If the engine ever ticks ANIMATE less frequently than ~2Hz, false scrub-seeks will appear — engine/animation/audioClipSync.ts:4-8, 50.
- The `+1` in `exportEndSec = (endFrame + 1) / safeFps` is intentional (inclusive-end semantics) — engine/animation/audioExportMix.ts:30-31. Any future change of `endFrame` from inclusive to exclusive must remove the `+1` to avoid double-counting a frame.
- The `void srcEndT;` at engine/animation/audioExportMix.ts:91 suppresses an unused-binding lint — the value is implicit in `writeLen`/`audibleEndSec` math; if you refactor those, also drop the void marker.
- Linear-interpolation resampler is documented as "adequate for typical 44.1k→48k" — not a high-quality SRC; for large rate ratios there's no anti-alias lowpass — engine/animation/audioExportMix.ts:70-72.
- Hard-clipping in a final pass (engine/animation/audioExportMix.ts:97-101) means overlapping clips at full gain will distort, not duck. There's no per-clip gain field on `AudioClip`.
- `audioFileCache` is per-page singleton — closing the tab loses the file (clip metadata survives in GMF saves but a reopen needs a re-upload). No serialization path exists for the underlying audio bytes.
- `deckIndex` is hardcoded to the union `0 | 1` — the cache and `AudioAnalysisEngine` both assume a two-deck mixer; adding a third deck requires widening the union in three files.
- `mixAudioClipsForExport` is called only on the beauty pass — alpha/depth aux passes silently drop audio by design (engine-gmt/components/timeline/RenderPopup/exportRunner.ts:424-437). A bug in pass dispatch could produce silent beauty exports.
- Decode failure inside the mix loop is not caught locally; the call site at exportRunner.ts:430-436 wraps in try/catch and proceeds with silent video — but this means the user gets no specific error class.

## Drift from existing doc

(no existing doc — skip)

## Open questions

- Orphan-sweep candidate: engine/animation/audioClipSync.ts — single caller (`AnimationSystem.tsx:151`), not orphaned.
- Orphan-sweep candidate: engine/animation/audioExportMix.ts — single caller (`engine-gmt/.../exportRunner.ts:432`), not orphaned but cross-engine boundary (engine/ → engine-gmt/) is unusual; verify this isn't a layering issue.
- Orphan-sweep candidate: engine/animation/audioFileCache.ts — consumed by `AudioStrip.tsx` (writes) and `audioExportMix.ts` (reads), not orphaned.
