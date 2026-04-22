# 09 — Bridges & Derived Values 🚧

Explicit mechanisms for features to coordinate without direct store reach-through. Replaces GMT's ad-hoc patterns (window-global store handles, circular imports, `set${Feature}` side-channels).

**Rule:** a feature never reads another feature's state except via `dependsOn` (direct read), `derive()` (computed fan-out), or `bridge()` (bidirectional/event-driven).

## Three coordination patterns

| Pattern | Read/Write | Tick cadence | When to use |
|---|---|---|---|
| `dependsOn` | Read-only, in lifecycle hooks | On `onParamChange` | Feature A needs a snapshot of Feature B during its own updates |
| `derive()` | Read-only, fan-out computed value | On-change by default | Multiple features need the same computed value |
| `bridge()` | Read + Write across features | Per-frame or on-change | Feature A drives Feature B (modulation, reactive coupling) |

## `dependsOn` — direct scoped read

Already covered in [02_Feature_Registry.md § isolation](02_Feature_Registry.md#isolation-via-dependson). Summary:

```ts
defineFeature({
  id: 'dye',
  dependsOn: ['fluidSim'],
  onParamChange: (diff, ctx) => {
    const res = ctx.read('fluidSim').resolution;
    // ... use res to rebuild dye buffers
  },
});
```

Read-only. Scoped to the feature's lifecycle hooks. Validated at freeze.

## `derive()` — computed fan-out

A named read-only value computed from one or more source tracks/params. Cached; re-computes on input change.

```ts
// Register a derived value at feature-registration time or plugin install:
derive({
  id: 'dye.effective_decay',
  inputs: ['dye.dissipation', 'audioMod.bands.0'],
  compute: (dissipation, band0) => dissipation * (1 - band0 * 0.1),
  when?: 'onChange' | 'perFrame',      // default: onChange
});
```

### Consuming a derived value

```ts
// From any feature, bridge, or component:
const effectiveDecay = useDerived('dye.effective_decay');

// Or, imperatively:
const v = derivedRegistry.get('dye.effective_decay').value;
```

**Rule:** derived values are one-way. If you need to write back, use a `bridge()` instead.
**Why:** derived values exist in a pure-computation layer. Allowing writes would create cycles and cache invalidation horrors.

### Invalidation

- **`when: 'onChange'`** (default): recomputes when any input changes. Efficient for most uses.
- **`when: 'perFrame'`**: recomputes each frame in the ANIMATE phase. Use only for values that depend on implicit frame context (time, RNG, etc.).

**Rule:** use `onChange` unless you explicitly need per-frame. Opts-out of an entire recomputation per frame.

### Caching

Values are cached and returned from cache until an input changes. The registry tracks input generation counters; if an input's generation bumps, the derived value is invalidated.

## `bridge()` — bidirectional coordination

An explicit, named relationship between features.

```ts
bridge({
  id: 'audio-modulates-dye',
  reads:  ['audioMod.enabled', 'audioMod.bands'],
  writes: ['dye.dissipation'],
  when?: 'onChange' | 'perFrame',          // default: onChange
  tick: (reads, writes, ctx) => {
    if (!reads.audioMod.enabled) return;
    const band0 = reads.audioMod.bands[0] ?? 0;
    writes.dye.dissipation(BASE_DECAY * (1 - band0 * 0.1));
  },
});

bridge.disable('audio-modulates-dye');
bridge.enable('audio-modulates-dye');
bridge.remove('audio-modulates-dye');
```

### Validation at registration

- **Writes must be declared.** Writing to a path not in `writes` throws. This is the hard invariant — no cross-feature writes that aren't visible in the bridge's shape.
- **Reads are validated against the feature registry** — the bridge's `reads` must resolve to existing features/params.
- **Cycles across bridges** are detected at freeze and rejected.

### Tick cadence

- **`when: 'onChange'`** (default): tick() runs when any `reads` input changes. Cheap.
- **`when: 'perFrame'`**: tick() runs every frame in the ANIMATE phase. Use when the bridge depends on time, animation output, or RNG.

**Rule:** default to `onChange`. GMT's existing patterns are almost all `onChange` in disguise (edit a param → reactive update).

### Transactions

Bridge writes happen inside an implicit transaction with scope `'bridge'`. By default, the transaction is committed silently (not added to undo stack).

**Rule:** bridge-driven state changes are NOT undoable by default.
**Why:** a modulation bridge writing every frame would fill the undo stack instantly. If a specific bridge's output SHOULD be undoable (rare), set `undoable: true` in the bridge def.

## Examples

### Example 1 — audio drives fluid decay

```ts
// @audioMod plugin already declares audioMod feature
// @toy-fluid plugin declares dye feature with dependsOn: ['fluidSim']

bridge({
  id: 'audio-kicks-dye',
  reads:  ['audioMod.enabled', 'audioMod.bands'],
  writes: ['dye.dissipation'],
  tick: (r, w) => {
    if (!r.audioMod.enabled) return;
    const kick = r.audioMod.bands[0];
    w.dye.dissipation(0.98 - kick * 0.05);
  },
});
```

One file. User sees dye decay pulse with the beat.

### Example 2 — derived camera target distance

```ts
derive({
  id: 'camera.effective_target',
  inputs: ['camera.position', 'camera.mode', 'scene.pivot'],
  compute: (pos, mode, pivot) => mode === 'Orbit' ? distance(pos, pivot) : 1.0,
});

// Inside a bridge that wants to auto-focus:
bridge({
  id: 'focus-follows-target',
  reads:  ['camera.effective_target'],           // derived values are readable here
  writes: ['optics.focusDistance'],
  tick: (r, w) => w.optics.focusDistance(r.camera.effective_target),
});
```

### Example 3 — audio-mod recording safety

`@engine/animation` itself uses bridges internally. Its recording-safety logic:

```ts
bridge({
  id: 'animation-record-guard',
  reads:  ['animation.isRecording', 'animation.recordingTracks'],
  writes: ['animation.recordingBase'],
  tick: (r, w, ctx) => {
    if (!r.animation.isRecording) { w.animation.recordingBase(null); return; }
    // capture clean base once on entry
    if (w.animation.recordingBase.current === null) {
      const base = captureBaseFromBinders(r.animation.recordingTracks);
      w.animation.recordingBase(base);
    }
  },
});
```

## Observability

All derived values and bridges appear in:
- `bridgeRegistry.list()` — all registered bridges with their reads/writes/status
- `derivedRegistry.list()` — all derived values with current cache state
- Debug overlay (when `@engine/debug-tools` is installed) — shows live values + activity

## Decisions

### 2026-04-22 — Two explicit mechanisms (`derive` + `bridge`) instead of one
**Decision:** `derive()` is read-only computed; `bridge()` is bidirectional.
**Alternative:** single mechanism. Rejected — different semantics (one-way vs bidi) benefit from different APIs; also makes intent visible at the call site.

### 2026-04-22 — `when: 'onChange'` is default (flipped from earlier proposal)
**Decision:** bridges and derived values default to `onChange`; per-frame is opt-in.
**Alternative:** default per-frame (simpler mental model; matches TickRegistry cadence). Rejected — user confirmed most coordination is event-shaped, not frame-shaped.
**Rationale:** cheaper by default; matches actual usage patterns.

### 2026-04-22 — Writes must be declared
**Decision:** bridges list every path they can write to; undeclared writes throw.
**Alternative:** relaxed/convention-based. Rejected — whole point of bridges is visibility.

### 2026-04-22 — Bridge writes are not undoable by default
**Decision:** implicit `'bridge'` scope, not pushed to undo stack.
**Alternative:** all bridge writes undoable. Rejected — continuous modulation would flood the stack.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md):
- **F7** — circular store dependency between `animationStore` and `fractalStore` (GMT's `window.useAnimationStore` hack). Fixed by this model — the animation ↔ host coupling becomes an explicit bridge, no circular import.

## Migration notes (GMT → engine)

GMT patterns that become bridges on the engine:
- `AnimationSystem.tsx` modulation recording → `animation-record-guard` bridge (shown above).
- `EngineBridge.tsx` React ↔ Engine mediation → a set of bridges, one per subsystem (camera, shader config, uniforms).
- Light auto-focus on gizmo pick → a bridge reading `gizmo.selectedLight` and writing `camera.focusDistance`.

Each of these is currently implicit in GMT's code. Making them explicit is worth the refactor — testing, debugging, toggling all become trivial.

## Cross-refs

- Feature isolation rules: [02_Feature_Registry.md § dependsOn](02_Feature_Registry.md#isolation-via-dependson)
- Animation internals: [08_Animation.md](08_Animation.md)
- Architecture tier map: [01_Architecture.md](01_Architecture.md)
