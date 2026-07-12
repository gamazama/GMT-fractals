# Material Source→Slot Routing + Reflection/Refraction Features — Spec

Status: PLANNING (decisions locked 2026-06-21; build deferred until in-flight sessions land).
Scope: generalize the 3-layer coloring system into an N-source → M-slot router, then build
fresnel control, image-on-reflection, image bump/roughness, and refraction on top of it.

### Locked decisions (2026-06-21)
- **D1 — Home:** a **new feature** (working name `materialSources`) that **aims to supersede the
  Gradient panel**. It owns the full source pool *and*, by the end of the rollout, the albedo slots
  too — `coloring` + `texturing` are on a deprecation path (§8), not kept as peers.
- **D2 — Start with Phase 0** (shared primitive + gradient atlas up front; no hardcode-then-refactor).
- **D3 — Fresnel:** either F0 or IOR is fine for v1. Default to **IOR** (refraction needs it anyway →
  one shared `uIOR`), derive F0 from it.
- **D5 — Slot vocabulary v1 confirmed:** `albedoBase`, `albedoOverlay`, `bump`, `roughness`,
  `reflectionImperfection`, `refractionTint`. Defer metallic/specular/AO map slots.
- **D4 — Image cap:** 4 image samplers + unlimited atlased gradients (confirm at impl).
- **Build gate:** keep planning only. Do NOT touch code until the user signals in-flight sessions
  have committed (avoid colliding on `coloring`/`texturing`/`material_eval.ts`/`panels.ts`).
- **OD1 — RESOLVED:** Direct-mode first for fresnel + image-on-reflection + bump/roughness.
  **Refraction is PT-ONLY** (Direct's single trace + simple secondary march cannot carry transmitted
  radiance) → refraction ships in a later PT phase, not the Direct-first wave. Its compile cost lands
  on the already-heavy PT path (~3.5s+), which users already treat as a deliberate render mode.
- **OD2 — RESOLVED:** **None of these features run on mobile.** Gate the whole `materialSources`
  feature set (slots, reflection-imperfection, refraction, bump/roughness maps) OFF on mobile — no
  per-mobile texture-budget juggling, just disabled. Desktop-only.
- **OD3 — RESOLVED:** phased replacement of the Gradient panel is the goal; do it in stages (§8), not
  in one update. A small Fresnel quick-win can ship in today's update independently (§11).

---

## 0. The central architectural decision (the load-bearing part)

The user is right that the slot/routing model is the most important thing to get correct — the
four shader features are comparatively mechanical once the routing exists.

### 0.1 Current reality (from source audit)

- **Sources are bound to consumers by uniform name.** `uGradientTexture` → albedo layer 1;
  `uGradientTexture2` → albedo layer 2 (blended); `uTexture` → albedo layer 1 *alternate*
  (compile-gated by `USE_TEXTURE`, runtime-gated by `uUseTexture`). Noise (layer 3) is procedural.
- **The mapping is already a reusable library.** `getMappingValue(mode, p, result, n, scale)`
  ([MappingModes.ts](../engine-gmt/features/coloring/MappingModes.ts)) turns 15 intrinsic fractal
  quantities (orbit trap, iterations, angle, decomposition, normal slope, …) into a scalar. Images
  use two of them (U and V); gradients use one (t). This is the fractal-native "UV" — no triplanar
  needed, as the user noted.
- **What is NOT abstracted:** there is no notion of a *source* you can point at an arbitrary
  *consumer*. The layer count (3) and the layer→albedo wiring are baked into
  [material_eval.ts](../engine-gmt/shaders/chunks/material_eval.ts) `getSurfaceMaterial()`.

### 0.2 The model to adopt: **open source pool, fixed slot vocabulary, bindings connect them**

Three concepts. This is deliberately *not* a free-form node DAG — slots map to specific physics, so
their vocabulary is fixed; only the source pool is open-ended.

1. **Source** — a pure value producer. Carries no notion of *where* it lands on the surface.
   - `gradient`: stops → 1D LUT, sampled at a scalar `t`.
   - `image`: uploaded texture, sampled at `vec2(u,v)`.
   - `noise`: procedural (existing layer-3 generator).
   - `constant`: a single color/float (cheap, no texture).
   Both gradient and image are first-class sources — **either can feed any slot** (user requirement).

2. **Binding** — connects one source to one slot input, and supplies the *mapping* (the projection
   onto the surface). The mapping lives on the binding, not the source, so the same gradient can be
   projected differently into different slots.
   ```
   Binding = { sourceId, modeU, modeV, scale, offset, twist, twistArms, bias }
   ```
   1D sources (gradient) use `modeU → t`; 2D sources (image) use `(modeU, modeV) → uv`.

3. **Slot** — a fixed, enumerated shader output channel with fixed semantics. Each slot accepts
   0..1 bindings (overlay slots accept a small stack). The **router is the source×slot matrix.**

   | Slot | Output | Status |
   |---|---|---|
   | `albedoBase` | base color | exists (layer 1) |
   | `albedoOverlay` | blended over base (+blendMode, +opacity) | exists (layer 2) |
   | `bump` | normal perturbation (+strength) | exists as noise-only (layer 3 bump) → generalize |
   | `roughness` | per-pixel roughness modulation (+range) | **new** |
   | `reflectionImperfection` | roughness/normal applied on the *reflection* path | **new (compile)** |
   | `refractionTint` | absorption/tint for the refraction path | **new (compile)** |
   | `emission` | (already its own feature, leave as-is) | exists |

   Key asymmetry to design around: **slots are a closed set** (each is wired to specific physics);
   **sources are open**. This keeps the system tractable — no arbitrary user-named outputs.

### 0.3 The one shared shader primitive

Replace the per-layer hardcoded sampling with a single dispatcher. This is the generalization of
`getTextureColor()` + the inline gradient branch:

```glsl
// Returns the source value projected through a binding's mapping.
// `srcKind` / `srcSlot` are compile-time constants baked per active binding (no dynamic loop).
vec3 sampleSource(int binding, vec3 p, vec3 n, vec4 result) {
    // mapping → coords
    float u = getMappingValue(uBindModeU[binding], p, result, n, uBindScale[binding]);
    // gradient: 1D
    //   float t = pow(abs(fract(mod(u*scale+offset + spiral(...), 1.0))), uBindBias[binding]);
    //   return textureLod0(GRAD_LUT(binding), vec2(t, gradRow(binding))).rgb;
    // image: 2D
    //   float v = getMappingValue(uBindModeV[binding], p, result, n, uBindScale[binding]);
    //   return applyTextureProfile(textureLod0(IMG(binding), vec2(u,v)*scale+offset), space);
}
```

Each consumer slot calls `sampleSource(itsBinding, …)` and interprets the result (color / height /
roughness / tint). The existing layer-1/2/3 code becomes three calls to this primitive.

### 0.4 "Many gradients" vs "many images" — the texture-unit budget

This is the practical scaling constraint and it splits cleanly:

- **Gradients atlas for free.** A gradient is a 256×1 LUT. Pack N of them into one 256×N
  `DataTexture` (the **gradient atlas**) and sample at `vec2(t, (row+0.5)/N)`. → *one* sampler holds
  *all* gradients. "Support many gradients" costs one texture unit, period.
- **Images do not atlas** (arbitrary resolutions). Each image source = one `sampler2D`. WebGL2
  guarantees ≥16 units; ~6 are in use. → cap image sources at, say, **4** for headroom; allow
  effectively unlimited gradients via the atlas.

Recommendation: build the **gradient atlas first** as part of Phase 0 — it's the thing that makes
"many sources" real, and it's low-risk (pure CPU-side texture packing + a `gradRow` uniform).

### 0.5 Strategy: router-ready, but ship discrete measurable features

The user explicitly wants image-on-reflection and refraction as **separate compile-gated features
until they can be measured** — i.e. incremental, not a big-bang router rewrite. Reconcile by:

- Introducing the **Source/Binding data model + `sampleSource` primitive + gradient atlas** as shared
  infrastructure (Phase 0), proven byte-identical against today's output.
- Building each new slot as its **own compile-gated feature** that reuses the primitive. Each ships
  and is measured independently. No feature depends on the full router UI existing.
- Deferring the full visual routing UI (a sources panel + a connection matrix) until the slots exist
  and are validated. Early UI = per-slot "source picker" dropdowns (reusing the existing
  `parentId`/`condition` pattern), not a node editor.

**Decision (D2):** Phase 0 is built up front — the shared primitive + gradient atlas land first, and
every later feature reuses them. No hardcode-then-refactor detour.

### 0.6 Cost model: source *kind* is compile-time, mapping is runtime

The one subtlety that determines the uniform layout and the recompile boundary:

- A binding's **source kind** (gradient vs image vs noise vs constant) is **compile-time per slot**
  — emitted as a `#define SLOT_<name>_KIND`. Changing the kind feeding a slot (gradient → image)
  **recompiles**. This already matches today's behavior (swapping layer-1 gradient↔image flips
  `USE_TEXTURE` and recompiles), and it keeps `sampleSource` branch-free at runtime.
- A binding's **mapping params** (mode/scale/offset/twist/bias) and **which source of the same kind**
  (gradient atlas row, image unit) are **runtime uniforms**. Swapping gradient A → gradient B in a
  slot is a free atlas-row change; re-mapping is a free uniform write.

Consequence for uniforms: binding uniforms are **per-slot** (≈6–7 slots), *not* per-source. Sources
are data (atlas rows + image units); slots carry the wiring. So the uniform count is small and fixed
regardless of how many gradients the user creates.

---

## 1. Data model (TypeScript)

New feature `materialRouting` (or fold into `coloring` — see Open Decision D1).

```ts
type SourceKind = 'gradient' | 'image' | 'noise' | 'constant';

interface MaterialSource {
  id: string;                 // stable id, referenced by bindings
  kind: SourceKind;
  dataType: 'color' | 'data'; // 'data' (roughness/bump/height) → SKIP sRGB decode (§10.B.2)
  gradient?: GradientStop[] | GradientConfig;  // kind==='gradient' → packed into atlas row
  image?: ImageRef;                            // kind==='image' → own sampler (+mips if reflection/rough)
  noise?: NoiseConfig;                         // kind==='noise'
  constant?: [number, number, number];         // kind==='constant'
}

interface SlotBinding {
  // tier 1: inline source is a real DDFS param on the slot (animatable, like coloring.gradient).
  // tier 2: assignedFavientId references the Favients shelf (non-animated). One of the two is active.
  inline?: MaterialSource;          // animatable inline source (default)
  assignedFavientId?: string | null;// or a reference into Favients (the "many" pool)
  // mapping → the binding's animatable surface (DDFS float params)
  modeU: number; modeV: number;     // mapping (MappingModes enum, full set)
  scale: number; offset: number;
  twist: number; twistArms: number;
  bias: number;
  // image-map controls (§10.C) — essential for data maps to be usable
  amount: number;                   // strength of this slot's effect
  invert: boolean;                  // black-is vs white-is
  remapMin: number; remapMax: number; // contrast / clamp
  enabled: boolean;                 // per-slot on/off (§10.C)
}

interface RoutingState {
  slots: Record<SlotId, SlotBinding & SlotExtras>;  // fixed vocabulary; bindings are the state
  soloSlot?: SlotId | null;          // isolate one channel's raw output for authoring (§10.C)
  // NOTE: there is no separate `sources[]` pool — the library is Favients (§10.A).
}
```

Back-compat: the existing `coloring.gradient`, `gradient2`, `layer3*`, and `texturing.layer1Data`
become the seed sources + the `albedoBase`/`albedoOverlay`/`bump` slot bindings on load (migration
in §6).

---

## 2. Phased delivery

| Phase | Deliverable | Risk | Gate |
|---|---|---|---|
| **0** | Source/Binding model + `sampleSource` primitive + **gradient atlas**; migrate the *image* path (`getTextureColor`) onto it first | medium | byte-identical render vs baseline (existing colorUtils byte-exact discipline) |
| **1** | **Fresnel control** on reflections (runtime only) | low | visual; ~0ms compile |
| **2** | **Image/gradient on reflection** (imperfection: roughness + optional normal) — compile-gated feature | medium | measure compile + fps deltas before promoting |
| **3** | **Bump + roughness slots** from any source (generalize layer-3 bump) | low–med | byte-identical when bound to old noise; visual otherwise |
| **4** | **Refraction** — compile-gated feature in Shader Compiler panel | high (cost) | measure; keep behind toggle |
| **5** *(later)* | Full routing UI (sources list + connection matrix); migrate gradient L1/L2 onto primitive | med | UX pass |

Phases 1–4 are independent and individually shippable. Phase 0 unblocks 2–3 cleanly but a
minimal version of 2/3 could hardcode a single new sampler if Phase 0 slips (Open Decision D2).

---

## 3. Per-feature spec

### 3.1 Fresnel control (Phase 1)

Fresnel is **already computed** ([shading.ts:50-54](../engine-gmt/shaders/chunks/lighting/shading.ts#L50-L54),
Schlick `F0 = mix(0.04, albedo, uReflection)`); there is no user dial.

- **Params** (feature `reflections`, group `surface`/`shading`, runtime uniforms):
  - `fresnelF0` (float, `uFresnelF0`, 0–0.2, default 0.04) — dielectric base reflectance, or
  - `fresnelIOR` (float, `uFresnelIOR`, 1.0–3.0) with `F0 = ((ior-1)/(ior+1))²` (pick one — D3).
  - `fresnelEdgeTint` (color, `uFresnelEdge`, default white) — grazing-angle tint.
  - `fresnelExponent` (float, `uFresnelPow`, 2–7, default 5) — Schlick power.
- **GLSL:** replace the literal `0.04` and `pow(…, 5.0)` with the uniforms; tint by `mix(F, F*edge, …)`.
- **Compile:** ~0ms (pure uniform). **FPS:** none.
- **Panel:** Shading panel, under the existing reflection/material surface group.

### 3.2 Image/gradient on reflection — "imperfection" (Phase 2, compile-gated)

The headline request. Reuses `sampleSource`; maps the result to **roughness** (and optionally a
**normal scratch**) on the *reflection* path only.

- **Compile gate:** `reflImperfectionEnabled` (boolean, `onUpdate:'compile'`, `engineConfig`
  toggle → appears as a row in the Shader Compiler panel). Emits `#define REFL_IMPERFECTION`.
- **Binding:** slot `reflectionImperfection` — any source (gradient or image) via §1 model.
- **Runtime params:** `reflImperfRoughness` (`uReflImperfRough`, 0–1, how much it dirties the
  reflection), `reflImperfNormal` (`uReflImperfNormal`, 0–1, scratch normal strength), plus the
  binding's mapping params.
- **GLSL injection point:** the reflection block in
  [shading.ts:56-68](../engine-gmt/shaders/chunks/lighting/shading.ts#L56-L68) /
  [reflections/index.ts](../engine-gmt/features/reflections/index.ts). Before the env/raymarch
  lookup, `float r = clamp(uRoughness + imp * uReflImperfRough, 0.02, 1.0);` and (optional)
  perturb `reflDir` by the sampled normal. The roughness already drives env-mip LOD / VNDF jitter,
  so dirtying it is nearly free.
- **Compile:** ~200ms (one `#define`, small GLSL — comparable to AO). **FPS:** low single digits
  (a few texture samples on hit pixels; no new DE taps).
- **Why compile-gated first:** lets us measure the true delta before deciding if it earns
  always-on status. Matches user's "separate compile feature until we can measure it reliably."

### 3.3 Bump + roughness slots from any source (Phase 3)

Generalize today's noise-only layer-3 bump to *any* source, and add a roughness slot.

- **Bump slot:** `bump` binding → sample height/normal, finite-difference to perturb `n`. This is
  the existing mechanism ([material_eval.ts:107-114](../engine-gmt/shaders/chunks/material_eval.ts#L107-L114))
  with the source swapped from procedural noise to `sampleSource`. Param `bumpStrength`
  (`uBumpStrength`). Apply on primary hit; gate reflection-bounce bump behind `highQuality` (as
  today) to avoid tap explosion.
- **Roughness slot:** `roughness` binding → `roughness = clamp(uRoughness * mix(1, sampled, amt),
  0.02, 1)` in `getSurfaceMaterial()`. Param `roughnessMapAmount` (`uRoughMapAmt`).
- **Compile:** ~200ms if behind a `#define`; or free-ish if folded into existing layer-3 path.
  **FPS:** few % (texture samples, no DE taps).
- **Panel:** Shading panel (runtime amounts) + source picker for each slot.
- **Gate:** when the bump slot is bound to the legacy noise source with identical params, output
  must be byte-identical to today (regression guard).

### 3.4 Refraction (Phase 4, **PT-ONLY**, compile-gated, Shader Compiler panel)

The expensive one, and **Direct mode cannot support it** (per user, 2026-06-21): Direct's single
trace + simple secondary march cannot carry transmitted radiance through the surface. Refraction is
therefore a **path-tracing-only feature** — it lives in `pathtracer.ts` as a transmission bounce, not
in the Direct shading path. A second march through the surface with Fresnel-weighted
reflection/transmission and Beer-Lambert absorption (tinted by the `refractionTint` slot).

- **Compile gate:** `refractionEnabled` (boolean, `onUpdate:'compile'`, `engineConfig` → Shader
  Compiler row). Emits `#define REFRACTION`.
- **Params:** `refractIOR` (`uRefractIOR`, 1.0–2.5), `refractAbsorb` (`uRefractAbsorb`, 0–10,
  Beer-Lambert density), `refractTint` slot binding (color of absorption), `refractSteps`
  (`uRefractSteps`, int, march budget — quality/cost dial), `refractDepth` (max internal distance).
- **GLSL:** new trace path parallel to the raymarched-reflection feature
  ([reflections/shader.ts:57-87](../engine-gmt/features/reflections/shader.ts#L57-L87)
  `traceReflectionRay`): refract `rd` at the surface, march `DE_Dist` inside, accumulate absorption,
  exit to env or recurse once. Split reflection/transmission by Fresnel `F` (reuse §3.1 uniforms).
- **Compile:** **+1000–1500ms** (new trace path, like the +1505ms raymarched-reflection cost).
  **FPS:** **significant** — a second primary-class ray on refractive pixels; `refractSteps` is the
  governor.
- **Panel:** Shader Compiler panel (compile toggle + quality sub-params), per user. Not a preset.
- **Note:** independent of the routing work except for the `refractionTint` source binding; could
  ship even if Phase 0 slips, with a single hardcoded tint source.

---

## 4. UI plan (three panels)

The existing manifest patterns cover everything; no new panel framework needed.

### 4.1 Gradient panel → "Sources" (the source pool)

- Today: accordion with Layer 1 / Layer 2 / Noise
  ([panels.ts:312-402](../engine-gmt/panels.ts#L312-L402)), `AdvancedGradientEditor` for stops,
  `gradient-preview-layer{1,2}` header widgets.
- Evolve to a **sources list**: each entry is a source (gradient editor / image upload / noise /
  constant) with a preview header widget (reuse existing). "Add source" appends to the pool.
  Gradient sources write into the atlas. This is the home of "many gradients."
- Near-term (before the full list UI): keep the accordion but relabel layers as the seed sources;
  add image-upload affordance to any slot (not just layer 1) since images are now first-class.

### 4.2 Shading panel → slot bindings + amounts

- Today: group-filtered `materials` + `reflections` + `ao` items
  ([panels.ts:287-300](../engine-gmt/panels.ts#L287-L300)).
- Add, per new slot (`roughness`, `bump`, `reflectionImperfection`): a **source picker dropdown**
  (which source feeds this slot) + the slot's amount sliders. Use the proven `envSource` pattern —
  a selector param as parent, sub-controls via `parentId` + `condition`
  ([materials.ts envSource](../engine-gmt/features/materials.ts)). The picker's options are the
  current source pool (+ "None").
- Fresnel sliders (§3.1) go in the surface group here.

### 4.3 Shader Compiler panel → compile gates

- Today: bespoke `ShaderCompilerPanel.tsx`, auto-discovers `featureRegistry.getEngineFeatures()`,
  renders `EngineFeatureRow` + nested `AutoFeaturePanel`, with a pending-changes queue + estimated
  compile time + Apply button.
- `reflImperfectionEnabled` (§3.2) and `refractionEnabled` (§3.4) each declare `engineConfig`
  ({ toggleParam, mode:'compile', label, groupFilter }) and appear automatically as rows with their
  quality sub-params. Set realistic `estCompileMs` (refraction ~1200, imperfection ~200) so the
  Apply estimate is honest.

---

## 5. Compile + FPS summary

| Feature | Compile Δ | FPS Δ | Gating |
|---|---|---|---|
| Fresnel control | ~0ms | none | runtime (always on) |
| Image/grad on reflection | ~200ms | low (few %) | compile toggle (measure first) |
| Bump/roughness slots | ~0–200ms | few % | runtime or light compile |
| Refraction | +1000–1500ms | significant (2nd ray) | compile toggle, Shader Compiler panel |
| Gradient atlas (Phase 0) | ~0ms | none | infra |

The only structural cost is refraction; everything else is sub-noise on compile and texture-sample
cost on fps (no new `DE_Dist` taps — the expensive currency stays flat).

---

## 6. Migration & testing gates

- **Seed migration:** on load, synthesize sources from existing `coloring.gradient`/`gradient2`/
  `layer3*` and `texturing.layer1Data`; bind them to `albedoBase`/`albedoOverlay`/`bump`. Old scene
  files and presets must round-trip unchanged.
- **Byte-identical gate (Phase 0/3):** with default bindings, `getSurfaceMaterial` output must match
  baseline byte-for-byte — the repo already enforces byte-exact gradient LUTs
  ([colorUtils.ts](../utils/colorUtils.ts)); extend that discipline to the atlas + `sampleSource`.
- **Compile measurement (Phase 2/4):** use the timer-query bench harness (dump-once-measure-many,
  forced full-frame `uRegionMin/Max`), NOT accumulation-fps (governor-throttled). See
  `reference_shader_fps_benchmarking`.
- **Smoke:** `npm run typecheck`, boot + preset round-trip smokes after each phase.

---

## 8. Supersession path — retiring the Gradient panel

`materialSources` is not a sidecar; it is the eventual replacement for `coloring` + `texturing` and
their Gradient panel. To do that without breaking scenes/presets/animation, retire in stages:

1. **Coexist (Phases 0–3).** `materialSources` owns the *new* slots (bump/roughness/reflection-
   imperfection/refraction-tint) and the source pool + atlas. `coloring`/`texturing` still own the
   albedo slots. Both read the same gradient atlas (Phase 0 makes `getTextureColor` use it). No
   user-visible change to albedo yet.
2. **Absorb albedo (Phase 5a).** Move `albedoBase`/`albedoOverlay` bindings into `materialSources`;
   `getSurfaceMaterial()` calls `sampleSource` for albedo too. `coloring`'s `gradient`/`gradient2`/
   `mode*`/`blend*` params become **read-only shims** that the loader maps into the new sources +
   bindings (seed migration, §6). The legacy uniforms (`uGradientTexture`, `uColorMode`, …) stop
   being authored directly.
3. **Swap the panel (Phase 5b).** The Gradient panel's accordion is replaced by the Sources panel
   (§4.1). `texturing` is deleted; its `layer1Data`/`mapU`/`mapV` collapse into an image source.
4. **Deprecate (Phase 5c).** Mark `coloring`/`texturing` `@deprecated`, keep the load-time shim for
   old files for ≥1 release, then remove the dead params.

**Cross-feature dependencies to carry along:**
- `materials.emissionMode` references "Layer 1 / Layer 2 / Layer 3" as emission sources
  ([materials.ts emission group]). When albedo moves to slots, re-point these options at the new
  source/slot ids (declare `dependsOn: ['materialSources']`).
- Scene/GMF serialization ([SceneFormat.ts]) must learn the new `materialSources` schema and the
  old→new load converter. Old field reads stay until Phase 5c.
- **DDFS guarantees come free** *if* sources + bindings are expressed as DDFS params: animation,
  undo, and preset round-trip all work by construction (every param is a keyframe/undo target). The
  one thing to verify: gradient-stop arrays and the source-pool list must remain DDFS-legible
  (they're already `type:'gradient'` params today, so stops animate; the *list* of sources is new —
  confirm the registry handles an array-of-sources param or model it as a fixed-capacity set).

## 9. Phase 0 — concrete work breakdown (the starting point)

Order is dependency-sorted; each step is independently verifiable. Build gate still applies — this is
the plan to execute once sessions land, not a go-ahead.

**0a. Gradient atlas manager.**
- New `GradientAtlasManager` (beside [GradientLutManager.ts](../engine/fractal/GradientLutManager.ts)).
  Packs up to N gradients into one `256×N` RGBA8 `DataTexture` (`uGradientAtlas`); each source owns a
  row. Reuses `renderStopsToBuffer` ([colorUtils.ts](../utils/colorUtils.ts)) per row — **byte-exact**,
  so a single-gradient atlas row is identical to today's single LUT.
- **MUST fix V-bleed (§10.B.1):** `NEAREST` filter on the V axis (keep `LINEAR` on S) so adjacent
  gradient rows don't blend at seams. Verify a single-row atlas is byte-identical to today's LUT.
- **Image sources used by reflection/roughness need mips (§10.B.3):** `generateMipmaps:true` + trilinear
  on those uploads (atlas is gradients only; images stay individual samplers).
- API: `allocRow(sourceId) → row`, `updateRow(row, stops)`, `freeRow(row)`, `texture`, `rowCount`.
  Repack/regrow on add; trigger a TSAA/accumulation reset on any change (existing pattern).
- Sampling helper in GLSL: `vec3 gradAt(int row, float t)` → `textureLod0(uGradientAtlas,
  vec2(t, (float(row)+0.5)/uGradientRows)).rgb`.

**0b. `sampleSource` primitive + per-slot binding uniforms.**
- Add to a new shader chunk (e.g. `chunks/sources.ts`). Implements the §0.3 dispatcher, with the
  source kind resolved at compile time per slot (`#define SLOT_x_KIND`), mapping via the existing
  `getMappingValue`. Gradient path → `gradAt(row, t)`; image path → `applyTextureProfile(texLod(img,
  uv))`; noise/constant paths port the existing generators.
- Per-slot runtime uniforms: `uBind<Slot>Row` (atlas row or image unit), `uBind<Slot>ModeU/V`,
  `…Scale`, `…Offset`, `…Twist`, `…TwistArms`, `…Bias`.

**0c. Migrate the image path onto the primitive (lowest-risk first).**
- Re-express `getTextureColor` ([coloring.ts:72-79](../engine-gmt/shaders/chunks/coloring.ts#L72-L79))
  as a `sampleSource` call for an `image`-kind binding. This isolates the refactor to the already-
  compile-gated `USE_TEXTURE` path — easy to prove byte-identical against the current image render.

**0d. Data model + feature skeleton.**
- New `materialSources` feature ([FeatureSystem](../engine/FeatureSystem.ts) `defineFeature`) holding
  `RoutingState` (§1): `sources[]` + `slots{}`. No albedo takeover yet — only the source pool and the
  bindings the *new* slots will use. `dependsOn` declared for `coloring` (reads its gradient during
  coexistence) per the feature-isolation rule.

**0e. Verification.**
- Byte-identical gate: image render (0c) matches baseline byte-for-byte.
- `npm run typecheck`, boot smoke, preset round-trip.
- Bench the atlas indirection with the timer-query harness (forced full-frame `uRegionMin/Max`,
  dump-once-measure-many) to confirm the extra `(t, row)` lookup is free vs the old 1D LUT. See
  `reference_shader_fps_benchmarking`.

**Phase 0 done = the router substrate exists and changed zero pixels.** Phases 1–4 then bolt on.

---

## 10. Max-effort review findings (2026-06-21) — amendments to the plan above

A deep pass against the actual codebase (DDFS/animation/serialization, shader correctness, and the
current gradient UX) surfaced the following. These **amend** the sections above; where they conflict,
this section wins.

### 10.A CRITICAL — the "open source pool" was the wrong model. Use the existing Favients shelf.

The DDFS registry is **frozen at construction**; params are a fixed schema. A runtime-growable list of
sources can only be a `complex`-type param (the `lights: LightParams[]` precedent) — which is
serializable but **NOT per-item animatable** (no track-id convention for `sources[3].stops`). Modeling
*all* sources as one pool would therefore **regress** today's ability to keyframe `coloring.gradient`
and `gradient2` independently.

**Two key facts change the design:**
1. **A saved-gradient pool already exists: Favients** (`palette/store/favientsStore.ts`, localStorage
   `gmt.favients`, cross-app, grouped, named, content-deduped, import/export, with a one-time legacy
   `savedGradients.v1` migration already done). This *is* "many gradients." Do **not** build a parallel
   pool — assign sources *from Favients*.
2. **The rich gradient editor is a self-contained component** (`AdvancedGradientEditor.tsx`) plus
   `ColoringHistogram.tsx` and the `gradientActions`/`gradientFavients` menu bridge. The Sources panel
   must **rehost these wholesale, not reimplement** — that's how the entire UX inventory (multi-select,
   bracket-scale, bias diamonds, blend spaces, copy/paste, context menu, undo bracketing, histogram,
   Favients) survives for free.

**Revised model — two tiers:**
- **Inline source per slot** = a real DDFS param (`type:'gradient'`/`'image'`/`'constant'`), exactly
  like today's `coloring.gradient`. Stays **animatable** (whole-value keyframe, as today) and edited
  with the rehosted `AdvancedGradientEditor`. This is the default and covers the common case.
- **Assign-from-Favients** = pick a saved gradient into a slot (a non-animated reference, like picking a
  saved camera). Covers "many."
- **Bindings are the animatable surface:** per-slot `mapping` params (mode/scale/offset/twist/bias) and
  per-slot `amount` are normal DDFS float params → animation/undo/preset work by construction. The one
  accepted regression: you can't keyframe the *stops* of a Favients-pooled source (you never could
  keyframe pooled gradients anyway; inline slots retain whole-gradient keyframing). Acceptable.
- The GPU **atlas** (§9.0a) still backs all *active* inline+assigned gradients so many slots share one
  sampler; it's an implementation detail beneath the two-tier model, not a user-facing pool.

Net: `materialSources` owns the **slot bindings + the atlas**; the **source library is Favients**; the
**editor is the existing component**. This shrinks the build and removes the animation/serialization risk.

### 10.B CRITICAL — three shader-correctness fixes are now Phase-0 scope (not optional)

Confirmed against current code; each would make the feature feel broken if skipped:

1. **Atlas V-axis bleed.** The current LUT is `LINEAR/LINEAR`, wrap-T `CLAMP`
   (`GradientLutManager.ts:53-56`). Stacking gradients as rows with LINEAR-V blends adjacent gradients
   at row seams. **Fix:** `NEAREST` on the V axis (keep `LINEAR` on S for smooth ramps) — or 1-texel
   padding rows + half-texel clamp. Bake into the atlas manager (§9.0a).
2. **Colorspace decode on data maps.** `applyTextureProfile` (`math.ts:271`) unconditionally
   sRGB→linear decodes every image sample. A roughness/bump/height map sampled that way is physically
   wrong (mid-gray 0.5 → 0.25). **Fix:** every source carries a `dataType: 'color' | 'data'`; `data`
   sources skip the decode (sample raw linear). This must be in the data model from day one (§1).
3. **No mipmaps on uploaded images.** Image textures use `LinearFilter`, no `generateMipmaps`
   (`texturing.ts:47`). Reflection roughness-blur via `textureLod` silently samples mip 0 only. **Fix:**
   `generateMipmaps:true` + trilinear for any image source feeding a reflection/roughness slot (verify
   WebGL2 NPOT mip support on target hardware).

Shader-variant explosion is **NOT** a blocker — the cache is a `cyrb53` hash of the full GLSL with
two-stage compile + 200ms debounce + generation counter. Caveat to surface in UX: changing a slot's
source **kind** (gradient↔image) is a compile, and the *first* use of each (slot,kind) combo eats a
cold compile (~3.6s+ base); same-kind swaps and all mapping/amount tweaks are free.

### 10.C IMPORTANT — features required for the slots to feel good (add to v1)

- **Per-binding `amount` + `invert` + `remap(min/max)`.** Image maps are unusable without invert and a
  contrast/remap (black-is-rough vs white-is-rough; tame an over-strong height map). Cheap uniforms.
- **Per-slot enable + solo/isolate preview.** A routing system is guesswork without the ability to (a)
  toggle a slot, (b) *solo* it — view the channel's raw output on the surface (roughness as grayscale,
  bump as normals). This is the single biggest usability multiplier for the whole feature; design it in,
  don't bolt it on.
- **Sensible defaults on enable + per-slot reset.** Enabling "image on reflection" with no source bound
  must do nothing visible (constant default), not look broken.
- **Mapping reuse across slots.** `getMappingValue` (a 15-case switch, ~3 calls/px today) would be
  called per-slot; many slots want the *same* coordinate. Compute a mapping result once and share it
  across slots with identical mode/scale to keep the per-pixel cost flat.
- **Reflection "imperfection" = roughness map *and* normal scratch.** Roughness-only = smudges/
  fingerprints; normal-only = directional scratches that bend the mirror. Ship both knobs; offer two
  defaults ("Smudge" = low-freq roughness, "Scratches" = high-freq normal).

### 10.D Honest limitations to set expectations on

- **Anisotropic / brushed-metal scratches are out of scope.** The streaky directional *highlight* of
  real brushed metal needs an anisotropic BRDF + a tangent frame, and fractals have **no tangent frame**.
  A scratch *image* via bump still catches light per-scratch (looks like scratches), but the elongated
  anisotropic specular streak is not achievable without a tangent basis. Bump-from-height is the right
  fractal-native path; true tangent-space **normal maps** are also weak here for the same reason — prefer
  grayscale height→bump.
- **Intrinsic-mapped scratches follow iteration/trap bands**, not uniform world scale (triplanar
  deferred per user). Fine for organic grime; "even" scratches will want the future triplanar mode.

### 10.E NEW open dimensions needing a call (were not in the original spec)

- **OD1 — Direct vs Path-Tracing scope.** The app has both. Reflection-imperfection and refraction inject
  at *different* sites in each (`shading.ts`/`reflections` vs `pathtracer.ts`). Refraction is actually
  more natural in PT (it's a bounce). Proposal: **Direct-mode first** for all four features (faster to
  ship + measure); add PT support for refraction + reflection-imperfection in a follow-up. Confirm.
- **OD2 — Mobile budget.** Mobile is already fragile (see render-regression history) and texture
  memory/bandwidth-bound. Proposal: atlas + ≤2 image sources on mobile; **refraction disabled on mobile**
  (heavy compile + 2nd march). Confirm the mobile posture.
- **OD3 — Where these live for real users.** The Shader Compiler panel is **dev-gated**
  (`shaderCompiler.showEngineTab`). Per your "advanced compiler panel, not a preset" steer that's right
  for now — but note the graduation path to a user-facing "Advanced Material" section once measured, so
  the features aren't permanently dev-only.

### 10.F Smaller carries (don't lose these)
- Unify mapping modes: texturing exposes 10, coloring exposes 14/15 — the merged source model should
  expose the full set everywhere.
- Emission coupling (`emissionMode` → Layer 1/2/3) must re-point to slot/source ids on migration
  (`dependsOn:['materialSources']`); consider folding emission into the slot model later.
- Migration uses the proven `presetFieldRegistry` re-entrant deserialize hook (lights/renderMode/modular
  precedent) — low risk, no format versioning needed.
- StateLibrary (saved cameras) is the *wrong* precedent for the pool ("switch active snapshot", not
  "assemble a material"); Favients is the right one.

---

## 7. Decisions — RESOLVED (2026-06-21)

All open decisions are resolved; see the "Locked decisions" block at the top. D1: new `materialSources`
feature, supersedes the Gradient panel. D2: Phase 0 first. D3: IOR (derive F0). D4: 4 images +
atlased gradients. D5: slot vocabulary v1 as listed. See §10 for review amendments (Favients-as-pool,
3 shader fixes into Phase 0, solo-preview + amount/invert, Direct-first scope).

---

## 11. Compile-time budget — the worry, answered

The architecture adds **zero baseline compile cost**. Cost is strictly *pay-per-feature-enabled*, and
the disk-persisted hash cache means each distinct shader variant compiles **once, ever**. Concretely:

- **Free (runtime uniforms, no recompile):** every mapping change, amount/invert/remap, same-kind
  source swap (gradient A→B via atlas row), fresnel dials, all slider tweaks.
- **One cold compile, then cached forever:** first time a user *enables* a slot/feature, or changes a
  slot's source **kind** (gradient↔image). Cheap features ≈200ms; reflection-imperfection ≈200ms.
- **Refraction:** ~1–1.5s, but PT-only — it lands on the PT path (already ~3.5s+), a deliberate render
  mode, never the interactive Direct path.

**The load-bearing discipline (this is what keeps compile time flat):** a **disabled slot must emit
ZERO GLSL.** If disabled-slot sampling code is left in the base shader "just in case," every compile
gets slower for everyone. Gate each slot's GLSL entirely behind its `#define`; when nothing new is
enabled, the compiled shader is byte-identical to today and compiles in the same time. Verify this in
Phase 0 (the byte-identical gate already enforces it).

Mitigations already in the engine: two-stage compile (old shader stays live during recompile), 200ms
debounce (coalesces rapid toggles), generation counter (discards stale in-flight compiles). So even
the cold-compile moments don't stall the viewport.

---

## 12. Quick wins shippable in TODAY's update (no architecture needed)

Independent of Phases 0–5; safe because each defaults to the current look.

### 12.1 Fresnel control — BUILT then REVERTED 2026-06-21
Implemented and validated (typecheck + boot + interact all green), then **reverted at user request**.
Reason: the base-reflectance slider (`uFresnelF0`) proved **redundant with the existing Metallic param**
— both move the "how reflective" axis. F0 only differs physically by keeping the reflection white and
retaining diffuse (a glossy *dielectric*), vs Metallic which tints the reflection with albedo and kills
diffuse; in plain scenes that difference is invisible, and the physically-correct 0–0.2 range read as a
narrowed Metallic. **Lesson for a future fresnel control:** base F0 ≈ Metallic — the genuinely
fresnel-distinct knobs are the **falloff exponent** (edge-vs-face sheen, no metallic analog) and an
**edge-tint color** (grazing-angle color). If revisited, ship those two, not base reflectance. All 4
files (`materials.ts`, `shading.ts`, `pbr.ts`, `pathtracer.ts`) are back to HEAD.

(Original note retained below.) The Schlick fresnel math was **already in the shader**
([shading.ts:50-54](../engine-gmt/shaders/chunks/lighting/shading.ts#L50-L54)); there was just no user dial:
- `fresnelIOR` (`uIOR`, 1.0–3.0, default 1.5 → derive `F0=((ior-1)/(ior+1))²`), `fresnelEdgeTint`
  (`uFresnelEdge`, default white), `fresnelExponent` (`uFresnelPow`, 2–7, default 5).
- Replace the literal `0.04` / `pow(…,5.0)` with the uniforms; tint at grazing angle.
- **Compile: 0ms. FPS: 0.** **Defaults reproduce the current image byte-identically** → worst case the
  new sliders sit at defaults and nothing changes. This is the safety property that makes it
  same-day-safe.
- Touches: `materials.ts`/`reflections` (params), `shading.ts` (uniforms), Shading panel item.
- **CAVEAT:** confirm today's in-flight update does NOT also touch `materials.ts` / `shading.ts` /
  `panels.ts` before landing this, or it collides with the build gate. If unsure, hold to next update.

### 12.2 Not today (need Phase 0): image-on-reflection, bump/roughness maps, refraction, the router.
These need the atlas + `sampleSource` + the colorspace/mip fixes; rushing them into a same-day build
risks the three §10.B traps shipping half-done.
