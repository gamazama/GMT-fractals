# ADR-0103: The audio rig is live session state, held across scene loads

- **Status:** Accepted
- **Date:** 2026-07-25
- **Relates to:** ADR-0078 (the `noAccumReset` / `preserveOnApply` axis split), ADR-0089/0090 (weave slot banks)

> **Update 2026-07-25 (the MODULATION half is reversed; the audio half stands):**
> this ADR held `modulation` alongside `audio`, reasoning that both are one live
> rig. Field use showed that conflates two different things. The audio INPUT is
> equipment — a mic, a line feed, a deck, set up once and kept across scene
> changes so a performer is not re-patching between looks. The modulation RULES
> are scene CONTENT: which band drives which parameter *is* the look, and a
> saved scene that cannot restore its own modulation is not really saved.
>
> `modulation.holdsLiveSession` is therefore removed. `audio` keeps its hold, so
> loading a scene now applies that scene's rules while the input keeps running —
> which is what the original motivating complaint ("loading a fractal mid-set
> disarms the rig") actually asked for. Consequence: a scene carrying no
> modulation data resets rules to empty by ordinary preset semantics. Every
> scene `getPreset` writes serialises the slice, so in practice that only
> affects files predating the feature. `debug/test-session-hold.mts` [1], [2]
> and [5] pin the new split.

## Context

Preparing GMT for live VJ use surfaced three defects in how the audio-modulation
system interacts with the rest of the app. All three share a root cause: the
audio rig was modelled as ordinary scene content, when in performance it behaves
like equipment.

**1. A scene load silently disarmed the rig.** `applyPresetState` iterates the
feature registry and, for every param, takes the incoming preset's value or
falls back to `ParamConfig.default`. It honours `userScoped` (device prefs keep
their live value) but nothing else. Almost no scene carries audio data — formula
`defaultPreset`s, MB3D imports and most gallery scenes omit the `audio` and
`modulation` features entirely — so loading one reset `audio.isEnabled` to its
`false` default and `modulation.rules` to `[]`. Changing fractal mid-set switched
the audio engine off and deleted every link. The `preserveOnApply` flag already
marked exactly the right params, but ADR-0078 scoped that flag to the bulk-copy
axis (`applyPartialPreset`) and full preset application never read it.

**2. A weave rebuild left audio links pointing at retired parameters.**
`retargetTracks.ts` moves routing strings when a weave rebuild permutes the
per-slot banks (`weave.ws0ParamA` → `weave.ws1ParamA`, or `coreMath.paramA` →
`weave.ws0ParamA` on a first build). Its docstring enumerated "the two stores
touched" — keyframe tracks and LFO targets — and its carve-out note reasoned that
"transient consumers need no rename: `liveModulations` is recomputed every
frame". `modulation.rules` is neither: it is the durable store that *produces*
`liveModulations`, and it was simply missed. Building a weave off a plain formula
left every audio link on a `coreMath` id the woven formula no longer exposed
(link goes dead); a reorder was worse, leaving the link alive on a lane now owned
by a different formula.

**3. Audio-driven scenes rendered as a single band.** Unrelated to the above but
found alongside it, and documented here because it is the third "audio was not
added to the predicate" bug: `GmtRendererTickDriver`'s `hasActiveModulation`
tested only `lfosEnabled && animations.some(enabled)`. Audio-sourced rules
therefore reported `isSceneAnimating: false` while resetting accumulation every
frame, so progressive banding stayed engaged and `bandScheduler.reset()` ran each
tick — only pass 0's band ever repainted — and adaptive resolution never
downscaled. This is precisely the failure the tiling gate's own comment describes
for playback/LFO.

## Decision

**Introduce a third preservation axis: `FeatureDefinition.holdsLiveSession`.**

A per-feature, *conditional* predicate. When it returns true, `applyPresetState`
skips that feature's slice entirely — the incoming scene can neither overwrite it
nor reset it to defaults.

```ts
holdsLiveSession?: (live, store) => boolean;
```

The three axes are now:

| flag | granularity | read by | meaning |
|---|---|---|---|
| `noAccumReset` | param | uniform/config path | don't clear the accumulation buffer |
| `preserveOnApply` | param | `applyPartialPreset` | bulk copy/reset must not overwrite |
| `holdsLiveSession` | **feature** | `applyPresetState` | **full** scene load must not overwrite *while live* |

Conditionality is the load-bearing part. An unconditional hold would make
scene-borne session state permanently unloadable — a share link carrying an audio
rig could never restore it. The predicates return false when the rig is idle, so:

- `audio`: `(live) => !!live.isEnabled`
- `modulation`: `(live, store) => !!store.audio?.isEnabled && live.rules.length > 0`

`applyPresetState` captures `get()` once, before any setter runs, so both
predicates read a consistent pre-load snapshot and the outcome does not depend on
feature iteration order.

Gating `modulation` on `audio.isEnabled` rather than on rules alone keeps
LFO-only scenes fully scene-driven: nothing is performing, so their rules load
from the file exactly as before.

**Extend `retargetTracks.ts` to the third durable store**, with one deliberate
asymmetry: a displaced *track* or *LFO* is deleted (as before), but a displaced
*audio link* is **disabled, not deleted**. Two links legitimately share a target
— stacking bass and treble on one param is normal practice — so a destination
collision is not the double-drive hazard it is for an LFO. Disabling preserves
the user's frequency band, envelope and gain to re-point by hand, which matters
far more mid-set than mid-edit.

**Add audio to `hasActiveModulation`**, via a shared
`hasLiveModulationSource()` in `renderInteractionState.ts` that mirrors
ModulationEngine's two master gates.

## Consequences

- Changing fractal during a set no longer touches the audio rig. Opening a scene
  that saved one still restores it, provided the engine is idle (boot, share
  links, a fresh session).
- Audio links follow their formula across a weave rebuild the same way keyframes
  and LFOs already did. The weave editor's transfer report counts them.
- Audio-reactive scenes report as animating: banding stands down and adaptive
  resolution engages, which is the correct trade for live use.
- `holdsLiveSession` is opt-in and currently declared by exactly two features;
  `debug/test-session-hold.mts` asserts that, so a third holder cannot appear by
  accident without the test naming it.
- **Known gap, not addressed here:** `applyPresetState` clears `animations`
  unconditionally (it lives outside the feature loop), so a scene load still
  stops the LFOs. An `lfo-`sourced modulation rule then reads a stale cached
  `lfoValues` entry and freezes at its last value. Audio-sourced rules — the VJ
  path — are unaffected. Fixing this means giving `animations` the same
  conditional hold, which needs a decision about whether LFOs are artwork or
  equipment; deferred.
- The three flags now cover three genuinely different questions and none of them
  can substitute for another. A feature may carry all three.

## Addendum (same day): the double-writer flicker

Testing the above surfaced a fourth defect of the same shape — two writers, one
uniform, no agreement.

Dragging a slider on a modulated param made the image flicker at roughly half
the frame rate. The DDFS auto-setter emits the uniform with the **raw base**
value on every pointermove; `AnimationSystem.tick` emits the same uniform with
**base + offset** once per frame. Whichever fired last for a frame won.

**Decision:** the setter composes the live offset into its emit
(`modulationEngine.hasOffsetFor` / `getOffset`) rather than suppressing it.
Suppression was the tempting fix and is wrong: on a silent input the tick sees
no offset change, so it never resets accumulation, and a suppressed emit would
leave the drag painting nothing. Composing keeps both the value and the reset
semantics.

A second instance sat in the tick itself. Each vec AXIS is its own modulation
target, and the vec branch cloned the **base** vector per axis and emitted
immediately — so with X and Y both modulated, Y's emit reset X back to base.
Not a flicker (Set iteration order is stable) but a silent drop of every axis
but the last. Axes now accumulate into a per-vec scratch flushed once after the
loop, mirroring the existing `juliaDirty` composite.

Guarded by `debug/test-modulated-setter.mts`.

## Addendum 2: the flicker had a THIRD writer

The setter fix above was necessary but not sufficient — the flicker survived it.
The setter emits on two channels, and only the `uniform` one had been fixed.

Its `config` emit carries the **raw base**, and in the worker
`FractalEngine.setConfig` responds to any runtime config update by calling
`MaterialController.syncConfigUniforms`, which rewrites *every* uniform-backed
param from that config. A slider drag emits one config update per pointermove,
so the base write lands between modulation ticks and the uniform alternates —
the same flicker, arriving by a different route. (`ConfigManager.syncUniform`
also mirrors uniform writes back into the config, so the two channels fight
inside the config as well; only the render-visible half matters here.)

**Decision:** the modulation tick publishes the uniform names it owns
(`modulationEngine.setOwnedUniforms`, rebuilt each tick so a stopped target
drops out), those cross to the worker in `renderState.modulatedUniforms`, and
`syncConfigUniforms` skips them. The tick re-asserts them every frame, so
skipping loses nothing. Composing values into the config instead was rejected:
`configManager.config` is the base-state mirror, and a modulated value stored
there would be re-applied as base on the next recompile and then offset again.

Post-compile callers deliberately pass no skip list — everything must be
re-established from scratch, and the tick corrects modulated uniforms on the
next frame.
