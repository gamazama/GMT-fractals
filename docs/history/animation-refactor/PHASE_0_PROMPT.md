# Phase 0 — Type definitions + test harness

**Scope:** lay down the type union, empty module shells, and test scaffolding for the animation refactor. **No behaviour.** Every method either throws "not implemented" or returns a typed null/false/empty. The output of this phase is a compilable, runnable skeleton that subsequent phases fill in.

**Estimated effort:** 2 days (per [`03_SPEC.md`](./03_SPEC.md) §10 step 1).

**Prerequisite:** the spike has shipped (`06_SPIKE_FINDINGS.md`) with "diagnosis confirmed" or "diagnosis partial — paint dominant". If the spike says "invalidated," do NOT start this phase — return to design.

## Read first (in order)

1. **`00_INDEX.md`** — overall roadmap and working protocol.
2. **`03_SPEC.md`** — entire doc. This phase implements §3 type shells, §8a type appendix, §7 test infrastructure. §6 invariants are the targets for later phases but should be visible.
3. **`06_SPIKE_FINDINGS.md`** — confirm the diagnosis is at least "partially confirmed." If the spike found surprises that change Phase 0's scope, raise them now before starting.
4. **Existing code that informs type shape (don't touch — just read):**
   - `dev/types/animation.ts` — existing `Track`, `Keyframe`, `AnimationSequence` shapes
   - `dev/store/animation/types.ts` — existing slice action signatures + `AudioClip`, `LfoParams` style references
   - `dev/engine/AnimationEngine.ts` — current `ScrubContext` shape
   - `dev/engine/animation/binderRegistry.ts` — current `Binder` shape
5. **`gmt-rs/crates/gmt-core/src/animation/track.rs`** + **`engine.rs`** + **`binder_registry.rs`** — gmt-rs has shipped a parallel type set worth referencing for shape (already informed §3 of the spec; useful as a sanity check while implementing).

## Build (in this order)

### Step 1 — Directory layout

Create:

```
dev/engine/animation/
├── document/
│   ├── AnimationDocument.ts        (class shell)
│   ├── patches.ts                  (Patch union)
│   ├── types.ts                    (Track, Keyframe, Folder, LfoParams, ModulationRule, AudioClip, Sequence — re-export or re-declare per Type Strategy below)
│   └── index.ts                    (barrel)
├── player/
│   ├── Player.ts                   (class shell)
│   └── index.ts
├── engine/
│   ├── Engine.ts                   (class shell)
│   ├── ScrubContext.ts             (type)
│   └── index.ts
├── modulation/
│   ├── ModulationRuntime.ts        (class shell)
│   └── index.ts
├── audio/
│   ├── AudioRuntime.ts             (class shell)
│   └── index.ts
├── recorder/
│   ├── Recorder.ts                 (class shell, including state machine type)
│   └── index.ts
├── history/
│   ├── AppHistory.ts               (class shell)
│   ├── AppPatch.ts                 (union of domain patches)
│   └── index.ts
├── provider/
│   ├── TrackProvider.ts            (interface + installTrackProvider stub)
│   ├── HostAdapter.ts              (interface + HostContext type)
│   └── index.ts
├── shared/
│   ├── brands.ts                   (TimeSec, Frame, toTimeSec, toFrame, framesToTime, timeToFrames)
│   ├── ids.ts                      (TrackId, KeyId, FolderId, LfoId, RuleId, DeckIndex, NodeRef)
│   └── index.ts
└── index.ts                        (top barrel exports for the public surface)
```

**Convention:** one class per file. Barrel `index.ts` re-exports the public surface. The full top-level barrel is what consumers import (`import { animationDocument, player, ... } from 'engine/animation'`).

### Step 2 — Branded primitives (`shared/brands.ts`)

Implement per [`03_SPEC.md`](./03_SPEC.md) §8a:

```ts
export type TimeSec = number & { readonly __brand: 'TimeSec' };
export type Frame   = number & { readonly __brand: 'Frame' };

export const toTimeSec = (n: number): TimeSec => n as TimeSec;
export const toFrame   = (n: number): Frame   => n as Frame;
export const framesToTime = (f: Frame, fps: number): TimeSec => (f / fps) as TimeSec;
export const timeToFrames = (t: TimeSec, fps: number): Frame  => (t * fps) as Frame;
```

Plus one unit test in `tests/animation/brands.spec.ts` that confirms `framesToTime(toFrame(60), 30) === toTimeSec(2)` (validates the brand-bridge round-trip).

### Step 3 — Ids and node refs (`shared/ids.ts`)

```ts
export type TrackId  = string;
export type KeyId    = string;
export type FolderId = string;
export type LfoId    = string;
export type RuleId   = string;
export type DeckIndex = 0 | 1;
export type NodeRef = { kind: 'track'; id: TrackId } | { kind: 'folder'; id: FolderId };
```

Bare strings; no nominal typing. The spec explicitly opted not to brand these.

### Step 4 — Document types (`document/types.ts`)

Define `Track`, `Keyframe`, `Folder`, `LfoParams`, `ModulationRule`, `AudioClip`, `Sequence`, `SequenceJson`. **Re-declare** rather than re-exporting from `dev/types/animation.ts` — the new types live in the new module, and the bridge phase will translate between them. The shapes should mirror the existing `dev/types/animation.ts` for now (so the bridge is mechanical); evolution happens in later phases.

Decisions:
- `Keyframe.time` is `TimeSec` (not `frame` — the storage unit changes per the §1 win).
- `Track.keyframes: readonly Keyframe[]` — readonly arrays in the public type even where the implementation mutates internally (single-writer invariant).
- `Folder` has `id`, `name`, `parentId: FolderId | null`, optional `collapsed`, `mute`, `solo`.
- `Sequence` is whatever serialises to/from `SequenceJson`. For Phase 0, define minimal fields needed for compilation; flesh out in Phase 1.

### Step 5 — Patch union (`document/patches.ts`)

Implement the entire `Patch` union from [`03_SPEC.md`](./03_SPEC.md) §3.1. Export as `AnimationPatch`.

```ts
export type AnimationPatch =
  | { op: 'addKey'; trackId: TrackId; key: Keyframe }
  | { op: 'removeKey'; trackId: TrackId; keyId: KeyId; before: Keyframe }
  // ... rest of §3.1 union
;
```

### Step 6 — Class shells

For each of `AnimationDocument`, `Player`, `Engine`, `ModulationRuntime`, `AudioRuntime`, `Recorder`, `AppHistory`:

- Class with constructor + every method signature from `03_SPEC.md` §3.
- Method bodies: `throw new Error('Phase 0: not implemented')` for non-trivial methods; `return undefined` / `return false` / `return 0` for trivial getters.
- For dep-needing classes (`Engine`, `ModulationRuntime`, `Recorder`), implement Pattern A from `03_SPEC.md` §4a: bare constructor + `init(deps)` method that throws on re-init.
- Module-level singleton exports for all seven (`animationDocument`, `player`, `engine`, `modulationRuntime`, `audioRuntime`, `recorder`, `appHistory`).

### Step 7 — TrackProvider + HostAdapter shells (`provider/`)

- `TrackProvider` interface from `03_SPEC.md` §3.8.
- `HostAdapter` interface from `03_SPEC.md` §3.8.
- `HostContext` interface from `03_SPEC.md` §3.8.
- `installTrackProvider(provider): () => void` that throws "not implemented."
- No registry implementation yet — Phase 8 lands that.

### Step 8 — Test harness scaffolding

Create:

```
dev/tests/animation/
├── brands.spec.ts                 (one test, from Step 2)
├── document/
│   └── document.placeholder.spec.ts   (one passing placeholder)
├── fixtures/
│   └── README.md                  (explains the goldens convention)
└── helpers/
    └── makeTestDoc.ts             (factory: const doc = new AnimationDocument(); — for fresh-per-test isolation)
```

Pick a runner that matches existing GMT conventions — likely Vitest if it's already in `dev/`; otherwise document the chosen runner in the report. Wire up:

- `npm run test:anim` script in `package.json` that runs only `tests/animation/**`.
- Ensure CI (or local pre-commit) picks it up.

The placeholder test exists to confirm the harness runs end-to-end. Phase 1 fills in real tests.

### Step 9 — Top barrel exports (`dev/engine/animation/index.ts`)

```ts
export { animationDocument, AnimationDocument } from './document';
export { player, Player } from './player';
export { engine, Engine } from './engine';
export { modulationRuntime, ModulationRuntime } from './modulation';
export { audioRuntime, AudioRuntime } from './audio';
export { recorder, Recorder } from './recorder';
export { appHistory, AppHistory } from './history';
export type { TrackProvider, HostAdapter, HostContext } from './provider';
export { installTrackProvider } from './provider';
export type * from './shared/brands';
export type * from './shared/ids';
export type * from './document/types';
export type { AnimationPatch } from './document/patches';
```

### Step 10 — Verify

- `npm run typecheck` passes.
- `npm run test:anim` runs the placeholder + brands tests, both pass.
- `npm run test:shader` / `npm run test:frag` / etc. still pass (Phase 0 added zero runtime code paths into the existing app).
- `bench-perf-timeline` against baseline shows no regression (Phase 0 didn't change any runtime — bench is for sanity, not for delta).
- No file imports from `dev/engine/animation` yet in the existing app. The new modules exist as a parallel surface, untouched by Phase 1.

## Acceptance criteria

- [ ] All file paths in Step 1 exist and compile.
- [ ] Every type from `03_SPEC.md` §8a appendix has a TS declaration.
- [ ] Every method signature in `03_SPEC.md` §3 has a corresponding (throwing) implementation.
- [ ] `tests/animation/brands.spec.ts` passes with the round-trip assertion.
- [ ] `tests/animation/document/document.placeholder.spec.ts` passes (proves harness wiring).
- [ ] `npm run typecheck` clean.
- [ ] `npm run test:anim` script added to `package.json` and runs.
- [ ] No existing test suite regresses.
- [ ] No production code imports the new modules yet.

## Out of scope (do not do)

- Any method body that actually does work. Throw "not implemented."
- Any subscription / event-firing logic.
- Patch apply / undo / redo logic.
- Bridge to `sequenceSlice` (Phase 9).
- Editing or deleting existing animation code.
- Any UI changes.
- Property tests / golden tests beyond the harness placeholder. Real tests land per-phase as bodies are implemented.

## Pause points (surface for review)

- **After Step 4 (Document types).** Confirm the type shape matches the spec AND the existing `dev/types/animation.ts` closely enough that the bridge phase will be mechanical. If the new types diverge meaningfully, the bridge cost grows — flag the deviation, get user sign-off before continuing.
- **After Step 8 (test harness).** Confirm runner choice (Vitest? Jest? Existing GMT convention?) before scaffolding the rest of the tests across phases.

## Output

When complete, write `PHASE_0_REPORT.md` adjacent to this file. Cover:

1. **Result line:** "Phase 0 shipped." / "Phase 0 partial — see issues." / etc.
2. **What shipped:** list of files created (path + line count).
3. **What was deferred** (within Phase 0's scope, if anything got pushed to Phase 1 — e.g., "Folder type's `solo` field deferred because of an unresolved interaction with selection state").
4. **Surprises:** anything you noticed that didn't match the spec or your model going in.
5. **Spec amendments:** if `03_SPEC.md` was edited during the phase, list the edits + add entries to `04_CORRECTIONS.md`.
6. **Bench delta:** (should be ~zero since no runtime change — confirm).
7. **Next phase readiness:** confirm Phase 1 prompt can be drafted without further blockers.

## Scope guards

- This phase is **types + shells + harness**. Nothing else.
- If you find yourself wanting to "just implement this small bit because it's obvious" — don't. That's Phase 1+ scope. Each phase ships a coherent unit; Phase 0's unit is "the skeleton compiles and tests run."
- If the type appendix in `03_SPEC.md` §8a is incomplete for some type (e.g., `TimeMap` is sketched but not fully specified), flag the gap and propose a shape in the report — don't invent silently.

## Pre-flight before starting

- [ ] `06_SPIKE_FINDINGS.md` exists and the diagnosis is "confirmed" or "partial."
- [ ] On a fresh branch: `phase/0-scaffolding`.
- [ ] `git status` clean.
- [ ] `npm run typecheck` passes on the starting state.
- [ ] Time block of ~2 days available (this phase is small but should be done in one focused pass — interruptions cost more than the implementation).
