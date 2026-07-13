# Animation modules — inter-module API design

**Status:** v2 — open questions resolved, signatures updated (2026-05-10)
**Companion to:** [02_RATIONALE.md](./02_RATIONALE.md), [01_AUDIT.md](./01_AUDIT.md)
**Inspiration:** the gmt-rs port's animation crate ([`crates/gmt-core/src/animation/`](../../gmt-rs/crates/gmt-core/src/animation/) + [`binder_registry.rs`](../../gmt-rs/crates/gmt-core/src/binder_registry.rs)) has already worked through several of these problems; patterns marked **[gmt-rs]** are direct ports, **[ts]** is TS-specific.

This doc specifies the public surface of each module the refactor introduces — the contracts they expose, what state they own, what they read from and write to. Implementation detail is out of scope; this is the spec the implementations are tested against.

## 1. Design principles

These are constraints on every module's API. If a proposed signature violates one, default to refusing the signature.

**P1. State as data, behaviour as functions. [gmt-rs]**
Modules hold state in plain objects. Behaviour lives in free functions or class methods that take the state object explicitly. No hidden globals. `tickAnimation(state, dt, deps)` over `state.tick(dt)` where the method would close over module-level singletons. *Why:* testability, multi-instance support (e.g. preview + bake animation states), no surprise dependencies.

**P2. Single source of truth per concern.**
Each piece of state lives in exactly one module. No mirrors, no shadow copies, no parallel implementations. If two callers need it, they read from the same source. *Why:* the live-vs-export modulation pipeline duplication was caused by violating this; it created the "export and preview disagree" bug class.

**P3. Type-segregated dispatch over runtime tags. [gmt-rs]**
Float tracks, color tracks, enum tracks, gradient tracks live in parallel maps on the Document. Each maps to its own typed binder. No `if (track.type === 'float')` branches in dispatch. *Why:* dispatch becomes O(1) without per-track tag checks; adding a new track type adds a new map + binder type, no editing of existing branches.

**P4. Auto-register at feature-freeze. [gmt-rs]**
At app boot, after the feature registry is frozen, walk every feature's animatable params and emit a binder for each. Apps register only the *exceptions* (composite tracks, off-store cameras). Eliminates the F6 silent-no-op when a setter doesn't match `set${Feature}`. *Why:* dispatch is correct by construction. No name inference, no fallback chain, no silent failures.

**P5. Explicit dependencies via parameters, not imports.**
A module that needs the Document takes a `Document` parameter; it doesn't `import { animationDocument } from '...'`. Singletons (`audioAnalysisEngine`) are the exception, and only because they wrap genuinely-singleton browser resources (`AudioContext`). *Why:* swapping a real Document for a mock in tests is a parameter change, not a module-graph rewrite.

**P6. One write path per data type.**
The Document is the only writer of animation data. The Player is the only writer of playback state. AppHistory is the only writer of undo state. Lint rule (or runtime assertion in dev) catches violations. *Why:* the audit found 15+ snapshot callers and 2 direct-`setState` paths today; that's how patch undo silently corrupts.

**P7. No-op gate on every public write.**
Every public mutator checks for actual change before applying. Returns boolean indicating whether anything changed. *Why:* the existing `setIsCameraInteracting` / `setIsScrubbing` equality gates patched 240 no-op `set()` calls per 4s of idle. Make it the default, not a per-caller convention.

**P8. Subscription bails by default.**
Subscribers receive a typed event with the minimum information to decide whether to react. `{ docVersion, changedTracks: Set<string> }` lets a per-track subscriber bail in O(1) when its track wasn't touched. *Why:* React fan-out is the cost we're refactoring away; the new contract has to make bailing the natural default.

**P9. Test the contract, not the implementation.**
Each module's public surface gets property tests + golden tests *before* implementation. Inverse-patch round-trips for the Document, scrub determinism for the Engine, FFT magnitude reproducibility for AudioRuntime. *Why:* without this, the second contributor wrecks the first contributor's invariants. The tests are the specification.

## 2. Data ownership map

Single-source-of-truth boundary. Each row says "this state lives here, and only here." Refactor PRs that introduce a duplicate fail review.

| State | Owner | Read access | Write access |
|---|---|---|---|
| Tracks (float/color/enum/gradient) | `AnimationDocument` | anyone | `AnimationDocument` methods only |
| Keyframes | `AnimationDocument` | anyone | `AnimationDocument` methods only |
| LFO definitions | `AnimationDocument` | anyone | `AnimationDocument` methods only |
| Modulation rule definitions | `AnimationDocument` | anyone | `AnimationDocument` methods only |
| Audio clip placement | `AnimationDocument` | anyone | `AnimationDocument` methods only |
| Track folders / hierarchy | `AnimationDocument` | anyone | `AnimationDocument` methods only |
| Document version counter | `AnimationDocument` | anyone | `AnimationDocument` (auto-bumped on writes) |
| `currentFrame`, `fps`, `isPlaying`, `loopMode`, `durationFrames`, `deterministicPlayback`, `isScrubbing` | `Player` | anyone | `Player` methods only |
| Recorder state machine (mode + sub-state) | `Recorder` | anyone | `Recorder.transition()` only |
| Recording snapshot handle (docVersion checkpoint) | `Recorder` | `Engine` (via `Recorder.activeSnapshot()`) | `Recorder` only |
| `selectedTrackIds`, `selectedKeyframeIds` | UI store (Zustand selection slice) | UI | UI; subscribes to Document for "remove dangling ids on track delete" |
| `collapsedGroups`, `timelineSidebarWidth` | UI store (Zustand UI slice) | UI | UI |
| `liveModulations` (resolved offsets per target) | `ModulationRuntime` | anyone | `ModulationRuntime.tick()` / `evaluateOffsetsAt()` only |
| Audio analyser state, decks, `AudioContext` | `AudioRuntime` | anyone | `AudioRuntime` only |
| Audio source `File`s per deck | `AudioRuntime` (absorbs `audioFileCache`) | `AudioRuntime`, export pipeline | `AudioRuntime` only |
| Binders (per track id) | `BinderRegistry` | `Engine` | apps + `auto_register` at feature-freeze |
| Camera key tracks list + capture fn | `CameraKeyRegistry` | `Recorder`, UI Key Cam button | apps |
| Camera pair definitions | `CameraPairRegistry` | `Engine` | apps |
| Log track set | `LogTrackRegistry` | `Engine`, `AnimationMath` | apps |
| Unified undo log | `AppHistory` | nobody (opaque) | every undoable writer in the app |

## 3. Module APIs

Concrete TypeScript surfaces. Bodies elided; this is the contract, not the code.

### 3.1 `AnimationDocument`

```ts
// engine/animation/document/AnimationDocument.ts

// --- Patch types (closed union, one per write op) ---
export type Patch =
  | { op: 'addKey'; trackId: TrackId; key: Keyframe }
  | { op: 'removeKey'; trackId: TrackId; keyId: KeyId; before: Keyframe }
  | { op: 'updateKey'; trackId: TrackId; keyId: KeyId; before: Partial<Keyframe>; after: Partial<Keyframe> }
  | { op: 'batchAppend'; trackId: TrackId; keys: Keyframe[] }
  | { op: 'addTrack'; track: Track }
  | { op: 'removeTrack'; trackId: TrackId; before: Track }
  | { op: 'updateTrack'; trackId: TrackId; before: Partial<Track>; after: Partial<Track> }
  | { op: 'addFolder'; folder: Folder }
  | { op: 'removeFolder'; folderId: FolderId; before: Folder; orphanPolicy: 'unparent' | 'delete' }
  | { op: 'reorder'; before: ReadonlyArray<NodeRef>; after: ReadonlyArray<NodeRef> }
  | { op: 'addLfo'; lfo: LfoParams }
  | { op: 'removeLfo'; lfoId: LfoId; before: LfoParams }
  | { op: 'updateLfo'; lfoId: LfoId; before: Partial<LfoParams>; after: Partial<LfoParams> }
  | { op: 'addRule'; rule: ModulationRule }
  | { op: 'removeRule'; ruleId: RuleId; before: ModulationRule }
  | { op: 'updateRule'; ruleId: RuleId; before: Partial<ModulationRule>; after: Partial<ModulationRule> }
  | { op: 'setAudioClip'; deckIndex: DeckIndex; before: AudioClip | null; after: AudioClip | null }
  | { op: 'remapTime'; before: TimeMap; after: TimeMap }            // fps-equivalent rescale
  | { op: 'setSequence'; before: Sequence; after: Sequence };       // load-scene only

// --- Subscription event ---
export interface DocChange {
  docVersion: number;
  /** null = "everything changed" (load-scene). Otherwise the set of touched track / lfo / rule / folder ids. */
  changedTracks: ReadonlySet<TrackId> | null;
  changedLfos: ReadonlySet<LfoId> | null;
  changedRules: ReadonlySet<RuleId> | null;
  changedFolders: ReadonlySet<FolderId> | null;
  changedAudioClips: ReadonlySet<DeckIndex> | null;
}

export type DocSubscriber = (event: DocChange) => void;
export type TrackSubscriber = (event: { trackVersion: number }) => void;

// --- Document class ---
export class AnimationDocument {
  // --- Reads (sync, no allocation) ---
  getTrack(id: TrackId): Track | undefined;
  getTrackKeys(id: TrackId): readonly Keyframe[] | undefined;
  trackVersion(id: TrackId): number;
  docVersion(): number;
  trackIds(): readonly TrackId[];
  /** Time-domain helpers — keyframes are stored in seconds (Q2: branded TimeSec at the boundary). */
  evaluateAt(trackId: TrackId, timeSec: TimeSec): number | undefined;
  keyAtTime(trackId: TrackId, timeSec: TimeSec, epsilon?: number): Keyframe | undefined;
  /** Hierarchy (Q5: folders are passive — no folder evaluation). */
  getFolder(id: FolderId): Folder | undefined;
  rootOrder(): ReadonlyArray<NodeRef>;        // top-level tracks + folders, in user order
  /** LFO + rule + audio reads. */
  lfos(): readonly LfoParams[];
  rules(): readonly ModulationRule[];
  audioClips(): ReadonlyArray<AudioClip | null>;
  /** Derived properties (Q3) — lazily cached by trackVersion, invalidated on writes.
   *  Treated as data properties of the curve, not UI concerns. */
  getTrackRange(id: TrackId): { min: number; max: number; span: number } | undefined;
  getTrackFrameBounds(id: TrackId): { first: Frame; last: Frame } | undefined;
  getTrackKeyCount(id: TrackId): number;

  // --- Writes (transactional; each opens an implicit txn unless one is open).
  //     Per P7, every write returns boolean for "did anything change" — except those
  //     that return an id on success (id-returners use `| undefined` to signal no-op). ---
  addKey(trackId: TrackId, timeSec: TimeSec, value: number, opts?: AddKeyOpts): KeyId | undefined;
  removeKey(trackId: TrackId, keyId: KeyId): boolean;
  updateKey(trackId: TrackId, keyId: KeyId, patch: Partial<Keyframe>): boolean;
  updateKeys(updates: KeyUpdate[]): number;          // returns count actually changed
  batchAppend(trackId: TrackId, keys: Keyframe[]): boolean;
  addTrack(track: Track): boolean;
  removeTrack(trackId: TrackId): boolean;
  updateTrack(trackId: TrackId, patch: Partial<Track>): boolean;

  // Hierarchy.
  addFolder(folder: Folder): boolean;
  removeFolder(folderId: FolderId, orphanPolicy?: 'unparent' | 'delete'): boolean;
  reorder(parentId: FolderId | null, order: NodeRef[]): boolean;
  setSolo(nodeRef: NodeRef, solo: boolean): boolean;
  setMute(nodeRef: NodeRef, mute: boolean): boolean;

  // Modulation config.
  addLfo(lfo: LfoParams): LfoId | undefined;
  removeLfo(lfoId: LfoId): boolean;
  updateLfo(lfoId: LfoId, patch: Partial<LfoParams>): boolean;
  addRule(rule: ModulationRule): RuleId | undefined;
  removeRule(ruleId: RuleId): boolean;
  updateRule(ruleId: RuleId, patch: Partial<ModulationRule>): boolean;
  setAudioClip(deckIndex: DeckIndex, clip: AudioClip | null): boolean;

  // Bulk / structural.
  remapTime(map: TimeMap): boolean;                    // fps re-rate, time-stretch, etc.
  setSequence(seq: Sequence): boolean;                 // load-scene; clears AppHistory

  // --- Transactions (group multiple writes into one undo entry) ---
  beginTxn(label?: string): void;
  endTxn(): void;
  withTxn<T>(fn: () => T, label?: string): T;

  // --- Subscriptions ---
  subscribe(fn: DocSubscriber): () => void;
  subscribeTrack(trackId: TrackId, fn: TrackSubscriber): () => void;

  // --- Serialisation (delegates schema decisions to format module) ---
  toJSON(): SequenceJson;
  static fromJSON(json: SequenceJson): AnimationDocument;
}

export const animationDocument = new AnimationDocument();   // app-wide singleton; tests construct fresh
```

**Invariants documented as part of the contract:**
- Times stored in **seconds**, not frames. Player converts frame ↔ time using its fps.
- Keyframe arrays are sorted by `time` at all times. `batchAppend` requires `keys` already sorted and starting after the last key.
- Every write returns/records whether it actually changed state; no-op writes don't bump versions or fire notifications (P7).
- Patches outside an open txn commit as a single-patch undo entry; patches inside commit as one entry per `endTxn`.
- `setSequence` notifies with `changedTracks: null` and clears `AppHistory`'s undo/redo for the document scope.
- Subscriber callbacks fire **after** state is visible (write → bump version → notify). Subscribers may call any read method during the callback.

### 3.2 `Player`

```ts
// engine/animation/Player.ts

export interface PlayerState {
  isPlaying: boolean;
  currentFrame: Frame;           // float; sub-frame precision
  fps: number;                   // bare number — fps isn't time, isn't frames
  durationFrames: Frame;
  loopMode: 'Once' | 'Loop' | 'PingPong';
  deterministicPlayback: boolean;
  isScrubbing: boolean;          // UI hint; does not gate playback
}

export class Player {
  // --- Reads ---
  state(): Readonly<PlayerState>;
  currentTimeSec(): TimeSec;
  // --- Writes (each gates on equality per P7; returns true when state changed) ---
  play(): boolean;
  pause(): boolean;
  stop(): boolean;
  seekFrame(frame: Frame): boolean;
  seekTime(timeSec: TimeSec): boolean;
  setFps(fps: number, mode: 'keep' | 'matchTime'): boolean;   // matchTime drives Document.remapTime
  setDuration(frames: Frame): boolean;
  setLoopMode(mode: PlayerState['loopMode']): boolean;
  setDeterministicPlayback(v: boolean): boolean;
  setIsScrubbing(v: boolean): boolean;
  // --- Tick (called from TickRegistry.ANIMATE before Engine.tick) ---
  /** Advance currentFrame by dt according to fps + deterministic flag.
   *  Returns true if frame actually advanced (false if RAF gap accumulator hasn't filled). */
  tick(dt: number): boolean;
  // --- Subscriptions ---
  subscribe(fn: (state: Readonly<PlayerState>) => void): () => void;
}

export const player = new Player();
```

The Player owns the master clock. `setFps('matchTime')` is the only Player method that touches the Document — and it does so by emitting one `remapTime` patch.

### 3.3 `Engine`

```ts
// engine/animation/Engine.ts

export interface ScrubContext {
  timeSec: TimeSec;
  frame: Frame;                  // for legacy binders that prefer frame units
  isPlaying: boolean;
  isRecordingCamera: boolean;
  /** Tracks the Recorder marks as "skip during scrub" (it owns them this frame). */
  overriddenTracks: ReadonlySet<TrackId>;
}

export type ScrubHook = (ctx: ScrubContext) => void;

export interface EngineDeps {
  doc: AnimationDocument;
  player: Player;
  recorder: Recorder;
  binders: BinderRegistry;
  pairs: CameraPairRegistry;
  logTracks: LogTrackRegistry;
}

export class Engine {
  constructor(deps?: EngineDeps);    // bare for singleton; tests pass deps directly
  init(deps: EngineDeps): void;      // Pattern A from §4a; throws if already inited
  // --- Hot path (RAF per-frame, captured deps, allocation-free) ---
  /** Called from TickRegistry.ANIMATE after Player.tick. Reads deps.doc; substitutes
   *  deps.recorder.activeSnapshot() if a recording snapshot is active. */
  tick(dt: number): void;
  // --- Pure form (Q6: explicit doc for bake, tests, alternate-doc scenarios) ---
  /** Evaluate every active track in `doc` at `timeSec`, dispatch to binders. Pure with
   *  respect to (doc version, timeSec): same inputs produce byte-equal binder writes.
   *  **Tested as the determinism contract** (I1). The bake path calls this against the
   *  recording snapshot: `engine.scrubAt(recorder.activeSnapshot() ?? deps.doc, time)`. */
  scrubAt(doc: AnimationDocument, timeSec: TimeSec): void;
  // --- Pre/post scrub hooks (used by GMT split-precision camera commit) ---
  registerScrubHook(phase: 'pre' | 'post', fn: ScrubHook): () => void;
}

export const engine = new Engine();   // bare singleton; wired via engine.init() at boot (§4a Pattern A)
```

The Engine knows about the Document, Player, Recorder, and Registries — that's it. It does not import store slices, does not emit FractalEvents, does not write to `engine.modulations`. Its only side effect is calling binders.

**Key change vs. today:** UI scrubbers (TimelineRuler, KeyframeInspector frame field, etc.) call `Player.seekTime(t)`; the Player's setter triggers the Engine's `tick` internally. Today's 16 direct `animationEngine.scrub()` call sites collapse: most become `Player.seekTime`; the few synchronous-eval cases (export) use `scrubAt`.

### 3.4 `ModulationRuntime`

```ts
// engine/animation/ModulationRuntime.ts

/** Resolved offsets for one frame. Map from track id to additive offset. */
export type Offsets = ReadonlyMap<TrackId, number>;

export interface ModulationDeps {
  doc: AnimationDocument;        // reads lfos() + rules()
  audio: AudioRuntime;           // reads getMagnitudesAt()
  player: Player;                // reads currentTimeSec(), deterministicPlayback
}

export class ModulationRuntime {
  constructor(deps?: ModulationDeps);    // bare for singleton; tests pass deps directly
  init(deps: ModulationDeps): void;      // Pattern A from §4a
  // --- Hot path (RAF, captured deps) ---
  /** Live per-tick eval. Reads deps.doc (lfos, rules), deps.audio (live magnitudes),
   *  deps.player (current time). */
  tick(dt: number): Offsets;
  // --- Pure form (Q6: explicit deps for bake + tests + export) ---
  /** Used by Recorder.bake and offline export — same pipeline as tick(), no duplication.
   *  This eliminates today's exportModulations.ts vs AnimationSystem.tick divergence. */
  evaluateOffsetsAt(doc: AnimationDocument, magnitudes: Magnitudes | null, timeSec: TimeSec, dt: number): Offsets;
  /** Reset persistent state (envelope follower EMAs, smoothing prev values) — called at
   *  recording start, scene load, and bake start so warm-up state doesn't leak. */
  reset(): void;
  // --- Subscriptions (UI consumes for the live "modulated value" indicator) ---
  subscribe(fn: (offsets: Offsets) => void): () => void;
}

export const modulationRuntime = new ModulationRuntime();   // wired via .init() at boot
```

The Runtime is the live/export duplication killer. The current `AnimationSystem.tick` (588 lines) splits into:
- `Player.tick` (clock advance — 20 lines).
- `Engine.tick` (track scrub — already exists).
- `ModulationRuntime.evaluateOffsetsAt` (LFO + rules — pure, ~100 lines).
- `applyOffsets(offsets, host)` (host-app uniform mapping — see §3.9 host adapter; 50-150 lines per app).
- `Recorder.tick` (recording lifecycle — see §3.6).

The GMT-specific branches (Julia composite, color repeats, geometry rotation, lighting array) move into the GMT host adapter. fluid-toy's host adapter looks different; both consume the same Offsets.

### 3.5 `AudioRuntime`

```ts
// engine/animation/AudioRuntime.ts

/** FFT magnitudes at a moment in time. Length = analyser.frequencyBinCount (1024 today). */
export type Magnitudes = Readonly<Uint8Array>;

export class AudioRuntime {
  // --- Live (browser AudioContext + AnalyserNode) ---
  init(): void;
  loadDeck(deckIndex: DeckIndex, file: File): void;
  unloadDeck(deckIndex: DeckIndex): void;
  play(deckIndex: DeckIndex): void;
  pause(deckIndex: DeckIndex): void;
  seek(deckIndex: DeckIndex, timeSec: TimeSec): void;
  setCrossfade(value: number): void;        // 0..1
  setMasterGain(value: number): void;
  connectMicrophone(): Promise<void>;
  connectSystemAudio(): Promise<void>;
  /** Reads the analyser's current sample. Live tick only. */
  getCurrentMagnitudes(): Magnitudes | null;
  /** Per-tick deck⇄timeline sync (folds in `audioClipSync`). */
  syncClipsToTimeline(clips: ReadonlyArray<AudioClip | null>, timeSec: TimeSec, isPlaying: boolean): void;
  // --- Offline (decode + per-frame FFT for bake/export) ---
  /** Decode all loaded decks once; returns a closure that yields magnitudes at any time.
   *  Used by Recorder bake and by export. Implementation: decode → JS FFT on windowed
   *  PCM slices → leaky-integrate to match AnalyserNode's smoothingTimeConstant. */
  bakeOfflineMagnitudes(timeSec: TimeSec): Magnitudes;
  prepareOfflineBake(): Promise<void>;       // decode all loaded decks; cache PCM
  releaseOfflineBake(): void;                 // free cached PCM
  // --- File access (absorbs audioFileCache) ---
  getDeckFile(deckIndex: DeckIndex): File | undefined;
}

export const audioRuntime = new AudioRuntime();
```

Single audio surface. The current scattered set — `audioAnalysisEngine` + `audioFileCache` + `audioClipSync` + `audioExportMix` + decoder code in two `exportModulations.ts` files — collapses into this one module. Live FFT and offline FFT both go through `Magnitudes`, and the documented contract is *they should produce equivalent results to within a documented tolerance* (golden-tested).

### 3.6 `Recorder`

```ts
// engine/animation/Recorder.ts

/** State machine. Combinations not listed are illegal — transition() rejects. */
export type RecorderState =
  | { mode: 'Idle' }
  | { mode: 'ManualKey' }                                    // isRecording
  | { mode: 'CameraOnly' }                                   // recordCamera (no isRecording)
  | { mode: 'ManualKeyPlusCamera' }                          // isRecording + recordCamera
  | { mode: 'ArmingModulation' }                             // user pressed "Arm"
  | { mode: 'RecordingModulation'; snapshotVersion: number; activeTargets: ReadonlySet<TrackId> };

export type RecorderEvent =
  | 'StartManualKey' | 'StopManualKey'
  | 'StartCameraOnly' | 'StopCameraOnly'
  | 'ArmModulation' | 'CancelArm'
  | 'PlayWhileArmed'                                         // arm → recording
  | 'StopRecording'                                          // any mode → idle (commits bake on mod stop)
  | 'BakeComplete';

export interface RecorderDeps {
  doc: AnimationDocument;
  player: Player;
  engine: Engine;
  modulation: ModulationRuntime;
  audio: AudioRuntime;
  history: AppHistory;
}

export class Recorder {
  constructor(deps?: RecorderDeps);    // bare for singleton; tests pass deps directly
  init(deps: RecorderDeps): void;      // Pattern A from §4a
  // --- State ---
  state(): RecorderState;
  /** Single transition entry. Rejects illegal transitions, returns false. */
  transition(event: RecorderEvent): boolean;
  // --- Snapshot access (Engine reads this during ModRecording) ---
  /** When in RecordingModulation, returns the doc-version checkpoint at arm time.
   *  Engine.scrub reads from this when present (prevents jitter from per-tick mutations). */
  activeSnapshot(): SnapshotHandle | null;
  // --- Tick (called from TickRegistry.ANIMATE after Engine.tick) ---
  /** Per-tick recording behaviour. ManualKey: no-op (writes happen at slider drag-end).
   *  CameraOnly: capture camera-key tracks if isPlaying. ModRecording: no-op live (bake at stop). */
  tick(dt: number): void;
  // --- Bake (Q4: chunked + cancellable + sync fast-path) ---
  /** Walk every frame in [0, durationFrames], replay LFOs deterministically, FFT audio
   *  rules offline, write per-frame keyframes via Document.batchAppend. Single transaction.
   *
   *  Estimated work < 200ms runs synchronously. Longer runs chunked via requestIdleCallback
   *  with per-chunk progress callback. Cancellation discards the open transaction (no
   *  partial commit). Web Worker offload deferred to v2 — the async signature leaves room. */
  bakeModulation(opts?: {
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
  }): Promise<BakeResult>;
  // --- Subscriptions ---
  subscribe(fn: (state: RecorderState) => void): () => void;
}

export const recorder = new Recorder();   // wired via .init() at boot
```

Three previously-independent flags collapse into one state machine. Illegal combinations are rejected at the boundary. The bake step is the *only* path that writes recorded modulation keyframes; per-tick writes are gone.

### 3.7 `AppHistory` (unified undo)

```ts
// engine/animation/AppHistory.ts

/** Patch union covers every undoable domain in the app, not just animation. */
export type AppPatch =
  | { domain: 'animation'; patch: AnimationPatch }               // re-export of AnimationDocument's Patch
  | { domain: 'scene';     patch: ScenePatch }                   // formula switch, save state
  | { domain: 'features';  patch: FeaturePatch };                // feature config (already partially undoable)

export interface AppHistory {
  /** Commit one operation. Caller passes the inverse it computed. Bumps history version.
   *  Q7: `coalesceKey` (optional) — same key within 400ms merges into the prior entry
   *  by mutating its `after`. Use for slider drags: `coalesceKey = '${op}:${targetId}:${field}'`. */
  commit(args: {
    label: string;
    patch: AppPatch;
    inverse: AppPatch;
    coalesceKey?: string;
  }): void;
  /** Group multiple commits into one undo entry. */
  beginTxn(label?: string): void;
  endTxn(): void;
  /** Discard an open transaction without committing (used by Recorder.bake cancellation). */
  discardTxn(): void;
  /** Replay the inverse of the most recent commit. Returns the domain that was undone. */
  undo(): AppPatch['domain'] | null;
  redo(): AppPatch['domain'] | null;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Wipe the entire stack. Q1: Document.setSequence calls this — load-scene is a hard
   *  break, animation + scene + features undo all clear. */
  clear(): void;
  /** Subscribed by any UI showing undo state. */
  subscribe(fn: (event: HistoryEvent) => void): () => void;
}

export const appHistory = new AppHistoryImpl();
```

The `timeline-hover` shortcut scope goes away: one Mod+Z, one stack, undoes whatever was last written regardless of surface. AE / Photoshop / Figma model.

Apply functions per domain are registered at boot:

```ts
appHistory.registerDomain('animation', {
  apply: (patch) => animationDocument.applyPatch(patch),
});
appHistory.registerDomain('scene', { apply: (patch) => sceneSlice.apply(patch) });
appHistory.registerDomain('features', { apply: (patch) => featuresSlice.apply(patch) });
```

### 3.8 `TrackProvider` (the new app-extension surface)

Today each app's `main.tsx` calls a soup of installs (audit §7). One per concern, no documented order, silent failure if any is missed. `TrackProvider` collapses them into one shape:

```ts
// engine/animation/TrackProvider.ts

export interface TrackProvider {
  /** Identifier; used for teardown. */
  readonly id: string;
  /** Tracks this provider declares (for Key Cam button + auto track creation). */
  cameraKeyTracks?: ReadonlyArray<CameraKeyTrackEntry>;
  /** Live capture function — replaces setCameraKeyCaptureFn. */
  captureCameraKeyFrame?: (frame: Frame, opts?: CameraKeyCaptureOptions) => void;
  /** Track ids that interpolate in log space. */
  logTracks?: ReadonlyArray<TrackId>;
  /** Camera pair definitions (pan/zoom coherence). */
  cameraPairs?: ReadonlyArray<CameraPair>;
  /** Explicit binders — for tracks whose writers don't follow DDFS conventions. */
  binders?: ReadonlyArray<BinderDef>;
  /** Pre/post scrub hooks for composite-track batching (e.g. split-precision camera). */
  scrubHooks?: { pre?: ScrubHook; post?: ScrubHook };
  /** Q8: HostAdapter instance — translates ModulationRuntime offsets into the app's
   *  uniform layout. Class form (not bare function) so adapters have a natural home for
   *  state when it appears (last-value cache, debouncing, profiling counters). */
  adapter?: HostAdapter;
}

export interface HostAdapter {
  /** One-time setup on install. Called once per provider lifecycle. */
  init?(ctx: HostContext): void;
  /** Per-tick: translate offsets into uniform writes via ctx.emitUniform / ctx.setEngineMod. */
  apply(offsets: Offsets, dt: number, ctx: HostContext): void;
  /** Release any held refs on uninstall. */
  dispose?(): void;
}

export interface HostContext {
  getFeatureState: <K extends string>(featureId: K) => unknown;     // typed by app
  emitUniform: (key: string, value: unknown, noReset?: boolean) => void;
  setEngineMod: (key: string, offset: number) => void;
  timeSec: TimeSec;
  frame: Frame;
}

export function installTrackProvider(provider: TrackProvider): () => void;
```

App boot becomes:

```ts
// app-gmt/main.tsx
const cleanup = installTrackProvider({
  id: 'gmt-camera',
  cameraKeyTracks: [...],
  captureCameraKeyFrame: gmtCaptureFn,
  scrubHooks: { pre: gmtPreScrub, post: gmtPostScrub },
  binders: [...],
});
const cleanup2 = installTrackProvider({
  id: 'gmt-modulation',
  adapter: new GmtModulationAdapter(),
});
// ... that's it. installModulation, registerCameraKeyTracks, setCameraKeyCaptureFn,
// installGmtCameraBinders all gone — folded into the providers.
```

### 3.9 Registries (already clean — minor updates)

The four existing registries stay structurally as-is. Updates:

- **`BinderRegistry`** — gains `BinderRegistry.autoRegisterFromFeatures(featureRegistry)` per **[gmt-rs]** P4. Called once at app boot after feature freeze. Walks every animatable param, emits a binder. Apps register only the exceptions (composite tracks). The current name-inference fallback chain in `AnimationEngine.getBinder` cases 4-5 deletes entirely.
- **`CameraKeyRegistry`** — folded into `TrackProvider.cameraKeyTracks` + `TrackProvider.captureCameraKeyFrame`. The standalone module deletes; the data structure becomes per-provider.
- **`CameraPairRegistry`** — folded into `TrackProvider.cameraPairs`. Same.
- **`LogTrackRegistry`** — folded into `TrackProvider.logTracks`. Same.

Apps stop calling four register functions in main.tsx and instead install one or more providers. Composability and teardown become correct by construction.

## 4. Per-tick data flow

```
RAF
 │
 ▼
TickRegistry.runTicks(dt)
 │
 ├── SNAPSHOT phase
 │     (host: snapshot input state — mouse, viewport, etc.)
 │
 ├── ANIMATE phase
 │     │
 │     ├── 1. Player.tick(dt)
 │     │       - advance currentFrame per fps + deterministic flag
 │     │       - returns true if frame changed
 │     │
 │     ├── 2. AudioRuntime.syncClipsToTimeline(...) + getCurrentMagnitudes()
 │     │       - drives <audio> elements to match playhead
 │     │
 │     ├── 3. Engine.tick(dt)
 │     │       - calls scrub(player.currentTimeSec())
 │     │       - reads Document.tracks
 │     │       - dispatches via BinderRegistry → feature state
 │     │       - reads Recorder.activeSnapshot() to substitute during ModRecord
 │     │
 │     ├── 4. ModulationRuntime.tick(dt)               (Q6: hot-path captured-deps form)
 │     │       - reads deps.doc.lfos() + rules()
 │     │       - reads deps.audio.getCurrentMagnitudes()
 │     │       - reads deps.player.currentTimeSec()
 │     │       - returns Offsets (ReadonlyMap)
 │     │
 │     ├── 5. for each provider: provider.adapter?.apply(offsets, dt, hostCtx)   (Q8)
 │     │       - app-specific uniform mapping (GMT/fluid-toy/...)
 │     │       - writes uniforms via hostCtx.emitUniform
 │     │       - writes engine.modulations via hostCtx.setEngineMod
 │     │
 │     └── 6. Recorder.tick(dt)
 │             - mode-dependent: CameraOnly captures, others no-op
 │             - bake happens on transition('StopRecording'), not here
 │
 ├── OVERLAY phase
 │     (host: gizmo overlays, drawing, etc.)
 │
 └── UI phase
       (host: HUD counters; canvas timeline paint loop)
```

Key change vs. today: clear ordering, no recursion (today's `AnimationSystem.tick` calls Engine internally and writes the same data Engine reads). Each step has one input source, one output sink.

## 4a. Singleton construction (Q9 hybrid, refined)

Q9 picked hybrid singletons: a default instance plus the class. For dependency-free modules (`AnimationDocument`, `AudioRuntime`, `AppHistory`) this is trivial — module-load constructs the singleton. For dep-needing modules (`Engine`, `ModulationRuntime`, `Recorder`) the singleton can't be eagerly wired because its deps don't exist at module load. Two patterns are acceptable; **pick one for the codebase and stick to it.**

**Pattern A — eager construct, explicit init:**

```ts
export class Engine {
  private deps: EngineDeps | null = null;
  init(deps: EngineDeps): void {
    if (this.deps) throw new Error('Engine already initialised');
    this.deps = deps;
  }
  tick(dt: number): void {
    if (!this.deps) throw new Error('Engine.tick called before init');
    // ...
  }
}
export const engine = new Engine();  // module-load OK; deps wired at boot
```

Boot: `engine.init({ doc: animationDocument, player, recorder, binders, pairs, logTracks });`

**Pattern B — factory function, no module-level singleton:**

```ts
export class Engine { constructor(deps: EngineDeps) { ... } }
// no `export const engine`; apps construct + own.
```

Boot: `export const engine = new Engine({ ... });` lives in the app's animation bootstrap module.

**Recommended: A.** Matches the `bindStoreToEngine` lazy-wiring pattern already in use today, keeps `import { engine } from '@gmt/animation'` ergonomic at every call site, and the `init()` throw on misuse satisfies invariant I9 (boot-order safety). Tests construct fresh instances via `new Engine(testDeps)` — no init needed there.

## 5. Boot / lifecycle

```ts
// app boot, in order:
import { animationDocument, player, audioRuntime, modulationRuntime, engine,
         recorder, appHistory, installTrackProvider } from '@gmt/animation';
import { binderRegistry } from '@gmt/animation/registries';
import { featureRegistry } from '@gmt/features';

// 1. Module-load constructs dep-free singletons (Document, AudioRuntime, AppHistory)
//    and bare-constructs dep-needing ones (Engine, ModulationRuntime, Recorder).
// 2. Wire dependencies (Pattern A from §4a — explicit init on each dep-needing singleton)
audioRuntime.init();                                         // browser AudioContext etc.
binderRegistry.autoRegisterFromFeatures(featureRegistry);    // ← P4 [gmt-rs] kills F6
appHistory.registerDomain('animation', { apply: (p) => animationDocument.applyPatch(p) });
appHistory.registerDomain('scene',     { apply: (p) => sceneApplyPatch(p) });
appHistory.registerDomain('features',  { apply: (p) => featuresApplyPatch(p) });
engine.init({ doc: animationDocument, player, recorder, binders: binderRegistry, pairs: cameraPairRegistry, logTracks: logTrackRegistry });
modulationRuntime.init({ doc: animationDocument, audio: audioRuntime, player });
recorder.init({ doc: animationDocument, player, engine, modulation: modulationRuntime, audio: audioRuntime, history: appHistory });

// 3. Install track providers (the *only* app-extension surface)
const cleanups = [
  installTrackProvider(gmtCameraTrackProvider),
  installTrackProvider(gmtFractalTrackProvider),
];

// 4. Register the animation tick in TickRegistry.ANIMATE
const tickCleanup = registerTick('animation', TICK_PHASE.ANIMATE, (dt) => {
  player.tick(dt);
  audioRuntime.syncClipsToTimeline(animationDocument.audioClips(), player.currentTimeSec(), player.state().isPlaying);
  engine.tick(dt);                              // uses captured deps (Q6)
  const offsets = modulationRuntime.tick(dt);   // uses captured deps (Q6)
  // Build one HostContext per tick; pass to each provider's adapter (Q8)
  const ctx: HostContext = buildHostContext(player);
  for (const provider of installedProviders) provider.adapter?.apply(offsets, dt, ctx);
  recorder.tick(dt);
});

// 5. App-specific UI mounts after this. Document, Player, etc. are available.
```

Boot order is **explicit, documented, and enforced by the type system** (you can't call `engine.tick` without an `Engine` constructed with deps). The current "cargo-cult main.tsx" failure mode disappears.

## 6. Cross-module invariants

These hold at all times during normal operation. Each is testable.

**I1. Determinism of `Engine.scrub`.** Same `(timeSec, Document version)` produces byte-equal binder writes. Holds across playback, manual scrub, and offline export. **Test:** golden output for a fixture sequence at frames {0, 30, 60, 120, 1199.5}, asserted byte-equal across paths.

**I2. Determinism of `ModulationRuntime.evaluateOffsetsAt`.** Same `(timeSec, dt, Document version, Magnitudes)` produces equal Offsets. Required for live/export parity. **Test:** golden offsets for a fixture LFO + rule set against a fixture FFT slice.

**I3. Single writer per domain (P6).** Lint or runtime assertion catches `useAnimationStore.setState` outside the Document. **Test:** AST scan + dev-mode assertion.

**I4. Patch round-trip.** For every patch type, `apply(p)` then `apply(inverse(p))` returns to the prior state byte-equal (modulo intentional version bump). **Test:** property test over each patch op.

**I5. Subscription bail (P8).** A per-track subscriber for track A receives no callback when only track B changes. **Test:** subscribe + write to B, assert callback count is 0.

**I6. No notification on no-op write (P7).** Writing the same value as already present returns `false` and fires no notification. **Test:** subscribe + write current value, assert callback count is 0.

**I7. Recorder state machine totality.** Every `(state × event)` pair has a defined transition (either a target state or explicit reject). **Test:** exhaustive table.

**I8. Time invariance on fps change.** `Player.setFps(newFps, 'matchTime')` followed by evaluation at the same `timeSec` produces the same value. Frame index changes; time-based output doesn't. **Test:** evaluate before+after setFps('matchTime'), assert equal.

**I9. Boot-order safety.** Calling tick before deps are wired throws (not silently no-ops). **Test:** intentional out-of-order construction.

**I10. Crash-resilience round-trip.** Snapshot Document to IndexedDB; restore in a new process; equal Document. **Test:** serialise + parse + structural equality.

## 7. Test strategy (P9)

Tests are part of the spec, not an afterthought.

| Module | Test types |
|---|---|
| `AnimationDocument` | Unit: every public method round-trips. Property: random patch sequences + their inverses. Golden: serialise/deserialise of fixture documents. |
| `Player` | Unit: every setter gates on equality. Property: tick(dt) accumulator behaviour matches deterministic and non-deterministic modes. |
| `Engine` | Unit: scrub at fixture frames. Golden (I1): binder writes byte-equal across playback/scrub/export. Property: hooks fire in declared order. |
| `ModulationRuntime` | Golden (I2): offsets reproducible per (time, dt, magnitudes). Property: reset() clears state. |
| `AudioRuntime` | Golden: live magnitudes vs offline magnitudes within tolerance for fixture WAV. Unit: deck lifecycle (load/play/seek/unload). |
| `Recorder` | Exhaustive: state machine transitions (I7). Integration: bake produces same per-frame keyframes as the original deterministic LFO. |
| `AppHistory` | Property: commit/undo/redo round-trip for each domain. Integration: cross-domain undo ordering. |
| `TrackProvider` | Integration: install + uninstall is fully reversible (no leftover binders, hooks, registry entries). |

**Golden test infrastructure:** fixture sequences live in `tests/fixtures/animation/` as JSON. Goldens are checked into the repo. CI fails on diff. Updates require a dedicated commit so review catches behaviour changes.

## 8. Resolved decisions

These were the open questions in v1 of this doc. Each is now resolved with a binding decision and rationale. Future amendments require explicit revision of this section, not silent reinterpretation.

**Q9 → Hybrid singletons.** Each module exports a class **and** a default singleton instance. App code imports the singleton (zero ergonomic change vs. today). Tests construct fresh instances via `new`. Costs one constructor signature per module; unlocks clean test isolation without `reset()` rituals.

**Q2 → Branded `TimeSec` / `Frame` at module boundaries.** Public APIs of `AnimationDocument` and `Player` accept and return branded types (`type TimeSec = number & { __brand: 'TimeSec' }`). Internal math uses bare `number`. Only the conversion helpers `framesToTime(f, fps)` and `timeToFrames(t, fps)` legitimately bridge brands. Catches the foot-gun ("passed a frame where a time was expected") without poisoning every arithmetic line.

**Q6 → Hybrid `tick()` + `scrubAt(doc, time)`.** `Engine.tick(dt)` uses captured deps for the per-frame RAF hot path (allocation-free). `Engine.scrubAt(doc: AnimationDocument, time: TimeSec)` is the pure form used by bake, tests, and any future alternate-document scenarios. Same pattern applied to `ModulationRuntime.evaluateOffsetsAt(doc, audio, time, dt)`. The substitution mechanism in today's `AnimationEngine.scrub` (recordingSnapshot vs sequence) deletes — substitution lives at the call site: `engine.scrubAt(recorder.activeSnapshot() ?? doc, time)`.

**Q8 → `HostAdapter` class per app, attached to TrackProvider.** `TrackProvider.adapter?: HostAdapter` (not `applyModulationOffsets: fn`). `HostAdapter` is a class with `apply(offsets, dt, ctx)`, optional `init(ctx)`, optional `dispose()`. Gives adapters a natural home for state (last-value cache, debouncing, profiling counters) when it appears. Chosen over the function form because the GMT modulation dispatch has historically accumulated concerns; the class structure pays for itself on the second time you need to add state.

**Q7 → Whole-object patches + commit-time coalescing.** LFO / rule / audio-clip / track-property patches are `{ before: T, after: T }` (whole-object), not field-level. The commit helper coalesces rapid edits to the same target+field within 400ms into one undo entry. Slider drag → one entry. Three separate field edits → three entries. Matches Maya / Blender / AE UX. Same mechanism as the existing FPS-drag coalescing in `playbackSlice.ts:11-12`.

**Q4 → Chunked bake with sync fast-path + cancellable transaction.** `Recorder.bakeModulation()` returns a Promise. Estimated work < 200ms runs synchronously; longer runs chunked via `requestIdleCallback` with a per-chunk progress callback. Cancellation discards the open transaction (no partial commit). Web Worker offload is deferred to v2 — the async signature leaves room without changing callers.

**Q1 → `setSequence` clears `AppHistory` entirely.** Loading a scene (GMF/PNG, gallery, share link) is a hard break: animation undo and all other domain undo entries clear. Matches Maya / Blender / AE convention. Formula switches (which mutate, not replace) go through normal undoable patches — `{ domain: 'scene', op: 'switchFormula', before, after }` — and the undo stack survives.

**Q5 → Folders are passive (organisational only).** A folder has name + parent + ordered children + collapsed/mute/solo flags. No animatable properties; the Engine never dispatches "folder values." Hierarchy changes (move, reorder, rename) are normal undoable patches. The "animate a group" use case is deferred to v2 shared-curve references, which solve the same UX without dispatch complexity.

**Q3 → Lazy cached derived properties on the Document.** `getTrackRange(tid)`, `getTrackFrameBounds(tid)`, `getTrackKeyCount(tid)` etc. live as Document reads, lazily computed and cached by `trackVersion`. Invalidated automatically on writes. Graph editor goes from O(visibleTracks × keys) per render to O(visibleTracks) hashmap lookups. Treated as data properties of the curve, not UI concerns; future derived stats (peak velocity, key density) add via the same pattern.

## 8a. Type appendix (forward references)

Types referenced above whose full shape is implementation detail rather than contract. Listed here so the spec is self-contained; final shapes land in Phase 0 step 1.

```ts
// Branded primitives (Q2).
export type TimeSec = number & { readonly __brand: 'TimeSec' };
export type Frame   = number & { readonly __brand: 'Frame' };
export const toTimeSec = (n: number): TimeSec => n as TimeSec;
export const toFrame   = (n: number): Frame => n as Frame;
export const framesToTime = (f: Frame, fps: number): TimeSec => (f / fps) as TimeSec;
export const timeToFrames = (t: TimeSec, fps: number): Frame  => (t * fps) as Frame;

// Ids — bare strings; nominal at the type level is overkill here.
export type TrackId  = string;
export type KeyId    = string;
export type FolderId = string;
export type LfoId    = string;
export type RuleId   = string;
export type DeckIndex = 0 | 1;
export type NodeRef = { kind: 'track'; id: TrackId } | { kind: 'folder'; id: FolderId };

// Existing types (defined in current codebase; same shape carries over).
export type Keyframe        = { ... };     // see types/animation.ts
export type Track           = { ... };
export type Folder          = { id: FolderId; name: string; parentId: FolderId | null; collapsed?: boolean; mute?: boolean; solo?: boolean };
export type LfoParams       = { ... };     // see engine/components/modulation
export type ModulationRule  = { ... };
export type AudioClip       = { ... };
export type Sequence        = { /* document state */ };
export type SequenceJson    = { formatVersion: number; ... };

// Bulk update shape.
export type KeyUpdate = { trackId: TrackId; keyId: KeyId; patch: Partial<Keyframe> };

// addKey options — interpolation override, explicit tangent mode, etc.
export type AddKeyOpts = { interpolation?: 'Linear' | 'Step' | 'Bezier'; tangentMode?: 'Auto' | 'Aligned' | 'Unified' | 'Free' | 'Ease' };

// remapTime input — old→new function over time (fps change, time stretch).
export type TimeMap = { oldFps: number; newFps: number } | { stretch: number };

// Recorder bake + snapshot opaque handles.
export type SnapshotHandle = { docVersion: number };
export type BakeResult = { committed: boolean; frames: number; reason?: 'cancelled' | 'error' };

// Provider plumbing.
export type CameraKeyTrackEntry = TrackId | { id: TrackId; hidden?: boolean };
export type CameraKeyCaptureOptions = { skipSnapshot?: boolean; interpolation?: 'Linear' | 'Bezier' | 'Step' };
export type BinderDef = { id: TrackId; label?: string; category?: string; write: (v: number) => void };
export type CameraPair = { zoom: TrackId; pan: [TrackId, TrackId]; panLow?: [TrackId, TrackId] };

// AppHistory domain patches (full shape per domain owner).
export type AnimationPatch = /* re-export of AnimationDocument's Patch union */;
export type ScenePatch     = { op: 'switchFormula'; before: FormulaId; after: FormulaId } | { op: 'updateSceneParam'; ... };
export type FeaturePatch   = { featureId: string; before: unknown; after: unknown };
```

Branded-type ergonomics note: arithmetic on `TimeSec`/`Frame` requires explicit casts at internal boundaries. Helpers (`framesToTime`, `timeToFrames`) are the only legitimate cross-brand bridges; if you find yourself writing `as TimeSec` repeatedly, you're missing a helper.

## 9. What this spec doesn't cover

Out of scope for this doc; tracked elsewhere or deferred:

- **Canvas DopeSheet / GraphEditor implementation details.** The Document API is what they consume; the canvas implementation is its own design pass after Phase 0.
- **Modifier stack** (deferred to v2 per scope decision).
- **Expressions / drivers** (deferred to v2).
- **Devtools panel** (deferred to v2; tests substitute for now).
- **Pluggable interpolators** (deferred; current closed set is `linear | step | bezier | log`).
- **Format versioning + migration** (deferred; add `formatVersion` field now, write migrations later).
- **Per-track curve presets / shared curves** (deferred to v2).
- **Concurrency model details** (TS is single-threaded; the contract is: writes are synchronous, subscribers fire after state is visible, no re-entrancy).

## 10. Implementation order

Once this spec is approved:

1. **Type definitions + tests scaffolding** (~2 days): write the type union, the empty class shells, the test harness with goldens directory. No behaviour yet.
2. **`AnimationDocument` body + tests** (~5 days): patch apply, transactions, subscriptions. All I4-I6 tests pass.
3. **`AppHistory` body + tests** (~2 days): patch commit/undo/redo. Animation domain only.
4. **`Player` body + tests** (~2 days): clock + setters + tick. I8 passes.
5. **`AudioRuntime` body + tests** (~3 days): wraps existing audio code; golden tests for live-vs-offline parity.
6. **`ModulationRuntime` body + tests** (~3 days): port existing pipeline; I2 passes.
7. **`Engine` body + tests** (~3 days): scrub + binders + hooks. I1 passes.
8. **`Recorder` body + tests** (~4 days): state machine + bake. I7 passes.
9. **`TrackProvider` API + porting GMT/fluid-toy/fractal-toy providers** (~4 days).
10. **Bridge to existing Zustand slices** (~5 days): two-way mirror so consumers migrate one at a time.

That's ~33 days of foundation work before any UI changes — call it 6-7 weeks at sustainable pace including review + integration friction. Canvas DopeSheet + GraphEditor work happens *after* this; they're the consumers, not the foundation.

## 11. Decision

This spec is the contract Phase 0 implements. Sign-off here means: when implementation diverges from spec, the implementation changes (or the spec is amended via this doc with rationale). The tests in §7 are the enforcement.

**Next action:** review this doc; raise objections to specific signatures, invariants, or open questions; iterate until aligned. Then start §10 step 1.
