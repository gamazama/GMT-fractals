# Session prompt — Weave P4.4+P4.5: absorb interlace + Hybrid Box interleave onto the weave core

**Prepared:** 2026-07-04 · **Branch:** `feat/weave-core` (continue; do NOT push — v1 + weave ship together).
**Model/scope:** Fable 5, high effort — this is the **one-way door on user data** (load-time save migration) plus
the largest legacy retirement of the initiative. All prerequisites are in: the three owner Appendix decisions are
CONFIRMED (below) and per-slot BANKS are landed (ADR-0090), so absorption targets banks — interlace params map onto
a bank and the `uInterlace*` uniform set is DELETED, one migration instead of two.

## Read first (in this order)

1. `plans/mb3d/weave-p4-struct-state-design.md` §3 (absorption + migration mapping — re-target its §3.2 tables
   from dense lanes to BANKS per this prompt) + §6 rows P4.4/P4.5.
2. `plans/mb3d/sessions/S-weave-p4-build.md` — ALL delivery notes at the top (P4.0–P4.3, banks) + the
   **layered-rhythm reconciliation** note at the bottom (absorption converts onto LAYERS, not the binary modulo).
3. `docs/adr/0090-weave-slot-banks.md` + ADR-0089 (all update blocks).
4. `plans/mb3d/sessions/S-nformula-weave-unification.md` — "P4 owner decisions" (the three confirmed decisions)
   + amendments. And `S-weave-p3b.md` §"Non-negotiable discipline".

## Confirmed owner decisions (do not relitigate)

1. **`weaveEnabled`** — ONE whole-weave DDFS param (live, keyframable, default ON; off = base slot only, weave
   dormant — the legacy `interlaceEnabled`/`hybridMode` semantics). UI stays **LOW-PROFILE** (a compat/migration
   affordance, not a hero control; owner: "it's a weird control"); per-slot mute/solo is BACKLOG, not this session.
2. **Transport** — legacy `interlace*`/`hybrid*` state migrates into `weaveSource` + weave feature state at
   **LOAD**; legacy `features.{interlace,geometry-interleave}` state is CLEARED post-migration (no double-apply).
   Files on disk untouched until re-save (accepted one-way door: post-migration saves need current builds).
3. Prefixed-globals ceiling — accepted (already shipped; nothing to do).

## Migration mapping (the §3.2 tables, re-targeted to banks + layers)

Old interlace scene = a registered native host formula + `features.interlace`. It becomes a **2-slot weave**
(slot 0 = host native, slot 1 = secondary native) with a **layered-modulo schedule (base + layer 1)**:

| Old | New |
|---|---|
| host formula + its `coreMath.*` param values | slot-0 native slot; values → `weave.ws0*` bank keys (`weaveBankKey(0, id)`) |
| `interlaceFormula` | slot-1 native slot (`nativeSlotShell`) |
| `interlaceParamA..F` / `Vec2/3/4A..C` (via `INTERLACE_PARAM_MAP`) | `weave.ws1*` bank keys |
| `interlaceInterval` / `interlaceStartIter` (values AND keyframed tracks) | `weave.weaveInterval1` / `weave.weaveStartIter1` |
| `interlaceEnabled` | `weave.weaveEnabled` |
| **animation tracks** `coreMath.<id>` (host params) / `interlace.<...>` | retarget to `weave.ws0<Id>` / the weave keys above — a pure track-id rename on the scene's sequences + LFO targets |
| `interlaceCompiled` | drop (the weave IS the compile state) |

`coreMath.iterations`, geometry (juliaMode etc.), camera/lights/look: untouched. Hybrid Box interleaved
(P4.5, migrate ONLY when `hybridComplex === true`): `hybridSkip → weaveInterval1`, `hybridSwap → weaveStartIter1`
(0/1), `hybridIter → weaveBeats1` (the layer beats cap = the old invocation cap), `hybridMode → weaveEnabled`,
fold params → `ws1*` bank. The pre-loop fast path (`!hybridComplex`) is NOT a weave — stays in geometry, untouched.

## Staged work (one commit per step; confirm each design with the user before building)

1. **[engine] `weaveEnabled` + master gate.** Add the param to the weave feature. The phase-fn gate must be
   **OPT-IN via `emitFusedHybrid` opts** (user-built weaves + migrated scenes request it; plain MB3D imports
   don't) so the 38-scene probe stays BYTE-IDENTICAL — do not gate every weave unconditionally. Editor gets the
   low-profile toggle; note that imports gain the toggle by re-building via "⧉ Open current".
2. **[engine] Interlace load-migration (P4.4).** Hook where `features.*` and the def are both in hand (GMF-aware
   parseScene / post-load preset transform — design doc §3.3.5, verify the anchor). Synthesize the 2-slot weave,
   build the fused def through the existing native-slot path, remap state + retarget tracks per the table, clear
   `features.interlace`. **Capture step-0 references FIRST** (see gates).
3. **[ui + retirement] Absorb the interlace UI.** Remove the interlace panel/picker surface ("Edit weave" opens
   the weave editor); retire `features/interlace/*`, the `uInterlace*` uniform set, and geometry's
   `Interlace_weaveSlot` wiring. **Mesh export:** a migrated scene's formula is now a self-contained fused def, so
   `SDFShaderBuilder`'s parallel interlace path should become DEAD — VERIFY mesh export works on fused weave defs
   before deleting it; if it doesn't, fix that first (do not keep a zombie shim). **The native-interlace sweep
   tests the feature being deleted** — repoint it at 2-slot native weaves (same N×N compile-safety purpose) in the
   same commit that retires the feature; don't leave the gate dark.
4. **[engine+ui] Hybrid Box interleave (P4.5).** The box fold is NOT a registered formula — recommend registering
   a real native "BoxFold" `FractalDefinition` wrapping geometry's fold GLSL (params mirror `hybridFold*`), which
   also gives the picker a box-fold slot for free; confirm with the user (alternative: an internal slot-source
   kind). Then migrate per the table; interleaved emission path in geometry retires; fast path stays.
5. **[docs] ADR** update blocks (0089 + 0090; the retirement + migration contract likely warrants its own ADR) +
   delivery note in `S-weave-p4-build.md`.

## Gates

- **Round-trip pixel-equivalence (the load-bearing gate):** BEFORE step 2, capture reference renders of at least
  one real old interlace scene and one old Hybrid-Box interleaved scene on the pre-change build (render-harness /
  probe-native-weave pattern, real GPU; ask the user for real saved scenes — synthesize presets only as fallback).
  After migration the same files must load pixel-equivalent. "May run slightly differently post-fold" is accepted
  by the owner — the verdict is the user's, on the side-by-side.
- Standing gates every commit: typecheck · `test:mb3d` (24) · `test:mb3d:weave` (189+, grow it: migration mapping,
  track retargeting, enable gate opt-in, cleared legacy state, hybrid fast-path untouched) · `test:refine` (56) ·
  `check:mb3d-decompiler` · `smoke:boot`. Probe (`debug/probe-weave-refactor.mts`): MB3D-only scenes byte-identical
  at every step. `probe-native-weave.mts` re-render for any resolver/emit touch. Disabled-scene case: a migrated
  scene with `interlaceEnabled: false` must round-trip visually as base-formula-only.
- A migrated scene, re-saved and re-loaded, round-trips through the NEW format (weaveSource + weave state).

## Repo gotchas

- **LOCAL-ONLY uncommitted files — keep their hunks out of commits:** `engine-gmt/components/FormulaPicker/
  pickerCategories.ts`, `engine-gmt/formulas/index.ts`, `engine-gmt/types/common.ts` (git-excluded Julia3D wiring).
- Windows: multiline commit messages via bash heredoc; `sed -i` fails onto C: (use python). Headed Chrome for GPU.
- Retirement deletes are big — run `npm run orphans` (knip) before/after; grep is not enough (engine-core/engine-gmt
  same-name siblings).

## Prompt

Read this file in full, then the four docs above; verify every file:line anchor before building. Implement
P4.4+P4.5 per the staged plan — confirm the step-1 opt-in enable design, the step-3 retirement scope (mesh path,
sweep repointing), and the step-4 BoxFold-as-formula call with the user before each lands. The round-trip gate is
the user's side-by-side verdict on real old scenes. Stop after P4.5 with a delivery note; P4.6 (animation
transfer) and P4.7 (panel promotion) remain as separate sessions. Do not push.
