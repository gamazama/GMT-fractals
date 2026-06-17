# ADR-0028: Raw audio File cached out-of-band, not in animation store

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/animation/audioFileCache.ts`, `engine/animation/audioExportMix.ts`

## Context

`AudioClip` must round-trip through GMF save / load and (for the
offscreen worker) structured-clone. A `File` is structured-cloneable
in principle, but storing it on the animation store would bloat
snapshots and serialised history with a binary the UI rarely needs
after initial peak decode.

## Decision

`audioFileCache` is a module-level `Map<0 | 1, File>` keyed by deck
index, written by AudioStrip on file load and cleared on clip remove.
Reads happen only inside `mixAudioClipsForExport`. The store carries
metadata + structured-cloneable peaks; the `File` lives here only.

## Consequences

- Closing the tab loses the file — GMF saves preserve clip metadata
  but reopening requires a re-upload.
- Decode failures during export are silent at the boundary; the user
  only sees a "silent video" outcome.
- Beauty-pass-only audio dispatch means a pass-dispatch bug could
  silently produce silent exports.
