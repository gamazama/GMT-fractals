# ADR-0031: installStateLibrary ships as two keys (arrayKey + activeIdKey)

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/store/createStateLibrarySlice.ts`, `engine/store/installStateLibrary.ts`

## Context

The original proposal
(`docs/engine/15_Camera_Manager_Extraction.md:131`) imagined a
single `storeKey` option with derived field names. As the factory
shipped, GMT and fluid-toy both wanted to control the active-id
field name independently (`activeCameraId` vs `activeViewId`) for
declaration merging on `EngineStoreState`.

## Decision

Two explicit keys (`arrayKey`, `activeIdKey`) and an explicit
`StateLibraryActionNames` map for the 8 internal action names. GMT
keeps literal `addCamera` / `selectCamera` names rather than a
derived prefix.

## Consequences

- Apps pay two configuration parameters instead of one; in return,
  type augmentation per library is straightforward and multiple
  libraries (cameras + views + future palettes) coexist without
  prefix collisions.
- The narrow idempotency guard (arrayKey + actions.add) is a known
  gap (followup q-064) — fix is module-scope `Set<string>` registries.
