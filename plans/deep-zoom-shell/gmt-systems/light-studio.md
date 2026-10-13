# GMT systems vs the deep zoomer — Light Studio

Reader: light-studio. Date 2026-10-07. Read-only pass; nothing was run.
Verdict words: AS-IS / ADAPTER / REWORK / NOT-NOW.

## 0. The answer in five lines

1. The **light record** (colour, temperature, power, EV, cast-shadow, on/off, direction) carries over. The **frame** it is expressed in does not: GMT knows two frames, world and camera, and both measure distance in absolute world units. The deep zoomer needs a third frame (the surface in view) and distances measured in multiples of the view's own scale.
2. The **Light Studio UI cannot be mounted outside GMT today**. Every component in it reads GMT's worker proxy and viewport camera at module scope. That is the largest rework, and it is a plain decoupling that GMT also benefits from (the same conversion code exists three times).
3. The **light list is welded to GMT's shader generator**. `LightingFeature` is one object holding the light list, its four actions, 20-odd path-tracing and shadow-march parameters, and the GLSL injection. A shell cannot install the list without the rest.
4. **Shadows share nothing but the on/off and the opacity**. GMT marches a ray per light per sample; the deep zoomer reads its depth buffer. The shell declares its own shadow controls.
5. On the renderer side (the ported module, not GMT) the shading pass has three hard-wired lights. Turning that into a loop over N lights is what lets a light list drive it at all. That is module work, 1 session.

Total: about 6 to 8 sessions, of which 4 to 5 are changes to GMT's own lighting code.

---

## 1. Facts, with file and symbol

### 1.1 The light record

`engine-gmt/types/graphics.ts`, `LightParams` and `LightType`:

```ts
export type LightType = 'Point' | 'Directional' | 'Sphere';
export interface LightParams {
    id?: string;
    type: LightType;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    color: string;
    intensity: number;
    falloff: number;
    falloffType: FalloffType;
    fixed: boolean;
    visible: boolean;
    castShadow: boolean;
    temperature?: number;  useTemperature?: boolean;
    range?: number;            // "0 = infinite (no range cutoff)"
    intensityUnit?: IntensityUnit;   // 'raw' | 'ev'
    radius?: number;           // "Visible radius in world-space units"
    softness?: number;         // "fraction of radius"
    hideEmitter?: boolean;
}
```

Every property and its unit, as the renderer consumes it (`engine-gmt/engine/managers/UniformManager.ts`, `syncFrame`, the `if (lighting && Array.isArray(lighting.lights))` block):

| Property | Unit / meaning | Decisive line |
|---|---|---|
| `type` | Point 0, Directional 1, Sphere 2 | `typeArr[i] = isDirectional ? 1.0 : (isSphere ? 2.0 : 0.0);` |
| `position` | absolute world units when `fixed` is false; camera-local units when true | `this.virtualSpace.getLightShaderVector(effectivePos, l.fixed, cam, posArr[i])` |
| `rotation` | Euler radians, order YXZ, applied to forward (0,0,-1); uniform stores the direction TOWARD the light | `this.lightEuler.set(..., 'YXZ')` then `.copy(this.lightDir).negate().normalize()` |
| `fixed` | true = attached to the camera ("Headlamp"), false = world | `if (l.fixed) { this.lightDir.applyQuaternion(cam.quaternion); }` |
| `intensity` + `intensityUnit` | linear multiplier, or stops | `(l.intensityUnit === 'ev') ? Math.pow(2, l.intensity + dIntensity) : (l.intensity + dIntensity)` |
| `visible` | on/off (zeroes intensity) | `intArr[i] = l.visible ? Math.max(0, baseIntensity) : 0.0;` |
| `range`, `falloff`, `falloffType` | range in world units = distance where light is at 1%; packed to one coefficient | Quadratic: `k = range > 0.001 ? 99.0 / (range * range) : ...` (att = 1/(1 + k·d²)); Linear: `k = 99.0 / range` (att = 1/(1 + k·d)) |
| `radius`, `softness`, `hideEmitter` | emitter ball radius in world units; soft edge as a fraction of radius | `radArr[i] = l.radius ?? 0.0;` |
| `castShadow` | per-light flag | `shaArr[i] = l.castShadow ? 1.0 : 0.0;` |
| `color`, `temperature`, `useTemperature` | hex colour; Kelvin is UI-side only, it writes `color` | `LightControls.tsx`: `updateLight({ index, params: { temperature: kelvin, color: newColor } })` |

Limits: `MAX_LIGHTS = 8` (`data/constants.ts`). UI ranges (`engine-gmt/components/panels/lighting/LightPanelControls.tsx` and `engine-gmt/features/lighting/components/LightControls.tsx`): position `min={-10} max={10} step={0.01}`; Power 0..100 (Sphere 0..10000); Power (EV) -4..10 (Sphere 20); Range 0..100; radius 0.0001..5; Edge Softness 0..2; temperature 1000..10000 K.

Default rig, `DEFAULT_LIGHTS` in `engine-gmt/features/lighting/index.ts`: three Point lights at world (-2, 1, 2), (2, -1, 1), (0, -5, 2), intensity 1.5 / 0.5 / 0.25, 5500 / 3500 / 7500 K; only the first is `visible: true`; the third is `fixed: true`.

### 1.2 How the frame is resolved (the part that breaks)

`engine/plugins/navigation/core/VirtualSpace.ts`, `getLightShaderVector`:

```ts
if (isFixed) {
    this._relativePos.set(lightPos.x, lightPos.y, lightPos.z).applyQuaternion(camera.quaternion);
    targetVec.copy(this._relativePos);
} else {
    targetVec.set(
        lightPos.x - (so.x + so.xL) - camera.position.x, ...
```

Two frames only, and the world one is a plain double subtraction of the scene offset. The same conversion is also written out in the generic overlay helper `engine/overlay/OverlayProjection.ts`, `storeToWorld` ("fixed=true: position is camera-local ... fixed=false: position is absolute → subtract scene offset"), and by hand twice more in `handleToggleFixed` (one copy in `LightControls.tsx`, a second verbatim copy in `LightPanelControls.tsx`), beside a fourth, `VirtualSpace.resolveRealWorldPosition`.

### 1.3 Placing and aiming

- **Panel fields.** `LightPanelControls.tsx` (the advanced dock tab; its header comment: "The primary user-facing light UI is the Light Studio in the top bar (CenterHUD.tsx)"): `Vector3Input` labelled `World Position` or `Offset XYZ`, the "Attachment Mode" toggle with options `Headlamp` / `World`, type toggle Point / Directional (Sun), Power, Range, Falloff Curve, colour, Cast Shadows, "Show 3d helpers", and a global Shadows block.
- **Top-bar Light Studio.** `engine-gmt/topbar/CenterHUD.tsx` renders one `LightOrb` per light and a hover `LightSettingsPopup` (both exported from `LightControls.tsx`), which can be torn off into a floating panel. Body of CenterHUD not read in full.
- **Drag an orb onto the picture.** `engine-gmt/hooks/useInteractionManager.ts`, the `state.draggedLightIndex !== null` branch. A Directional light is aimed: `padCoordToLightEuler(x, -y, willBeFixed, cam.quaternion)` (screen centre = view-forward, radius 1 = 90 degrees). A Point light is placed on the pick ray at half the measured surface distance, clamped: `const targetDist = Math.max(0.0002, Math.min(20.0, engine.lastMeasuredDistance * 0.5));` then converted to store space by adding `engine.sceneOffset`.
- **Heliotrope pad.** `LightDirectionControl.tsx` calls the same `padCoordToLightEuler` (in `engine-gmt/features/lighting/utils/GizmoMath.ts`), which is pure maths on a camera quaternion.
- **Gizmos.** `LightGizmo.tsx` and `components/SingleLightGizmo.tsx` draw DOM/SVG handles over the viewport (`viewportConfig: { componentId: 'overlay-lighting', renderOrder: 50, type: 'dom' }` on the feature). They project with `getDisplayCamera()` and `engine.sceneOffset` through `getLightWorldPosition` → `storeToWorld`. Visible emitter balls are a separate compile-gated shader feature, `LightSpheresFeature` in `light_spheres.ts` (`estCompileMs: 150`).
- **Popup singleton (ADR-0008).** `GizmoMath.ts`: `export const activeLightPopup = { index: -1 };` — "Written by CenterHUD, read by SingleLightGizmo for range circle gating." A module-level object, no store.
- No "place at camera" button was found; the equivalent is the anchor button in the popup (`handleToggleFixed`), which converts the position between the two frames so the light does not jump.

### 1.4 How light state reaches the renderer, and whether the UI can live without the worker

- State: DDFS feature `lighting` (`LightingFeature`, `id: 'lighting'`, `shortId: 'l'`), param `lights: { type: 'complex', default: DEFAULT_LIGHTS, ..., hidden: true, noAccumReset: true, preserveOnApply: true }`, actions `updateLight`, `addLight`, `removeLight`, `duplicateLight`.
- Uniforms declared in `extraUniforms`, all arrays of `MAX_LIGHTS`: `Uniforms.LightCount`, `LightType`, `LightPos`, `LightDir`, `LightColor`, `LightIntensity`, `LightShadows`, `LightFalloff`, `LightFalloffType`, `LightRadius`, `LightSoftness`, `LightHideEmitter`. Written every frame by `UniformManager.syncFrame` in the worker. Modulation offsets arrive under keys `lighting.light{i}_intensity | _falloff | _posX/Y/Z | _rotX/Y/Z`.
- The same object's `inject` adds the shadow GLSL (`getShadowsGLSL`), the Direct integrator (`getLightingPBRSimple` / `getLightingPBRFull`) or the path tracer (`getPathTracerGLSL`), and imports all of them at the top of `index.ts`. So importing the light list imports GMT's shader chunks.
- **The UI cannot exist without GMT's worker today.** `LightControls.tsx`, `LightPanelControls.tsx`, `LightGizmo.tsx` and `SingleLightGizmo.tsx` each open with `import { getProxy } from '.../engine/worker/WorkerProxy'; const engine = getProxy();` and read `engine.sceneOffset`, plus `getViewportCamera()` / `getDisplayCamera()` from `engine-gmt/engine/worker/ViewportRefs`. They also read `useEngineStore(s => s.lighting)`, `s.updateLight`, `s.handleInteractionStart`, and `useAnimationStore` for keyframes. What they actually need from the proxy is small: a camera orientation, a camera position, the scene offset, and the measured surface distance.

### 1.5 Shadows in GMT

Global params on `LightingFeature` (group `shadows`): `shadows` (bool, `uShadows`), `shadowIntensity` "Opacity" 0..1, `shadowSoftness` "Hardness" 2..2000 log (default 16), `shadowSteps` "Quality (Steps)" 16..512 (default 128), `shadowBias` 0..1 log (default 0.002), `areaLights` "Shadow Jitter", `shadowAlgorithm` Lite / HQ ("HQ = accurate IQ penumbra (~2x slower)"), and the compile gate `shadowsCompile` (`estCompileMs: 500`). Per light: `castShadow`. Cost: a ray march toward each shadow-casting light at every shaded sample, up to `shadowSteps` distance-estimator evaluations each (help text, `data/help/topics/lighting.ts`, topic `shadows`: "We march a ray from the surface *towards* the light."). Path tracing with `ptNEEAllLights` is "N× more shadow rays".

### 1.6 The deep zoomer's lighting (the historical page, `mandelbulb_deepzoom/index.html`)

- Three directions, no positions: `uniform vec3 uFillDir, uKickDir; // toward the fill light and the kicker (the key is uLightDir)`. Colours `uFillCol`, `uKickCol`; key strength `uLookB.x`.
- Directions hang off a plane fitted to the surface in view: `function rigDir(azDeg, elDeg, right, up)` — "a light direction hung off the fitted plane: elDeg above it, coming from azDeg in the picture"; the plane normal is `rig.n` (uniform `uPlaneN`), fitted from a 32 × 32 read-back (`RIG_N = 32`) and eased over frames.
- Defaults (`const look`): `key: 3.0, keyElev: 40, keyAz: 152, fillAz: -40, fillElev: 21, fill: 0.5, kick: 0.25, tint: 0.5, shadow: 1.0, soft: 0.05, shadowLen: 0.6, ao: 1.0, aoRadius: 0.12, sky: 0.3, rough: 0.75`.
- The shading is GMT's model by its own comment: "GMT's Direct shading, Blinn-Phong variant ... and the rig of its fresh Mandelbulb scene: a white key, an orange fill a sixth as strong, a blue kicker from under the camera ... Key and fill cast shadows, as there."
- Shadows and occlusion come from the G-buffer: `shadowed(c, g.x, rd, n, L, 0.0)` and `occlusion(c, g.x, rd, n)`; README: no "extra fractal work — and see only what is in the picture".
- Headlamp: `uLightMode` (0 directional, 1 headlamp, 2 both) with a falloff length tied to the view: `uFalloffRel; // log2 of the headlamp falloff length L (= surface distance · mul)`, attenuation `1.0 / (1.0 + a*a)` with a = distance / L, `falloffMul = 4.0` (range 0.25..64).
- The shell blueprint (`plans/deep-zoom-shell/BLUEPRINT.md`, parameter table) already lists these as plain sliders: `keyElevation`, `keyTurn`, `lightTint`, `shadows`, `occlusion`, `sky`, `roughness`, `haze`, `lightType` Direct / Lamp / Both, `lampFalloff`. It does not mention the Light Studio.

### 1.7 The gap, stated once

- At a view scale of 1e-30 a world position such as (-2, 1, 2) is 1e30 view-widths away: every Point light degenerates into a directional light from a fixed world direction, and its `range` (0..100 world units) either never or always cuts off. The position field's step is 0.01 and the drag-in placement floors at 0.0002, so **GMT's own positional lights already stop being placeable below a surface distance of about 4e-4** (0.0002 / 0.5), well before the f32 marcher's 1e-6 wall.
- The page's headlamp falloff is exactly GMT's Quadratic falloff with the range expressed in view units: page att = 1/(1 + (d/L)²); GMT att = 1/(1 + 99·d²/range²); they agree when range = L·√99 ≈ 9.95·L, L = 4 × surface distance by default. So the model matches and only the unit differs.
- GMT's `rotation` for a Directional light is a full direction; the page's key is two angles relative to the fitted plane. A direction can be stored as-is; what is missing is the frame it is relative to.

---

## 2. Verdict table

| Sub-system | What it assumes today | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| Light record: colour, temperature, power, EV, visible, castShadow, id | Pure data; EV → linear is `2^ev` | **AS-IS** | none; the shell's adapter repeats the one-line EV conversion | 0 | nothing changes |
| Light record: `fixed` (the frame) | Two frames, world or camera, as a boolean | **REWORK** | Replace the boolean's meaning with a named frame: world, camera, and a third, "the surface in view" (directions and offsets relative to a plane the renderer reports for the current view). Stored as an optional field beside `fixed`; an absent field reads as today's boolean, so old scenes load unchanged. The frame is resolved by one function that takes a "view frame" (camera orientation, camera position, surface plane normal, view scale) supplied by whichever renderer is mounted | 1 to 2 sessions for the type, `normalizeLight`, the one resolver, the UI toggle becoming a three-way choice; plus GMT's own provider of a surface plane (see risks) | Gain: GMT gets lights that keep raking the surface as the camera turns and flies, which is the look the owner approved on the page. Risk: GMT has no fitted plane today, only `engine.lastMeasuredDistance`; a first GMT version could use the camera frame tilted by the centre normal, a real plane fit needs a depth read-back in the worker (unverified, 1 to 2 more sessions). Saved scenes: additive field only |
| Units: `position`, `range`, `radius` | Absolute world units; UI ranges -10..10, 0..100, 0.0001..5 | **REWORK** | A per-light distance unit: world units, or multiples of the view's own scale (the measured surface distance). In view units a headlamp offset, a range and an emitter radius hold their look at any depth. Same resolver as the row above multiplies by the view scale before packing uniforms. Optional field; absent = world | 1 session on top of the frame row (same code path, same UI row) | Gain: GMT's headlamp and range stop needing re-tuning every time the user zooms 100×; fixes the placement floor at 0.0002. Risk: a light in view units changes brightness as the camera approaches a surface (that is the intent, but it is new behaviour, so opt-in per light and never the default for existing scenes) |
| Light types | Point, Directional, Sphere | Directional **AS-IS** (through the frame); Point **NOT-NOW** except as headlamp; Sphere **NOT-NOW** | none now. Point lights apply once positions in view units exist AND the deep renderer reconstructs a view-relative position per pixel from its log depth (it has depth, so this is feasible). Sphere lights need path tracing | 0 now | none |
| Falloff (`range`, `falloffType`) | k = 99/range² or 99/range, world units | **ADAPTER** after the units row | none beyond units; the page's headlamp formula is GMT's Quadratic curve with range ≈ 9.95 × L | inside the shell adapter | none |
| Light list state + actions (`lights`, `updateLight`, `addLight`, `removeLight`, `duplicateLight`, `normalizeLights`, `getLightFromSlice`) | Lives inside `LightingFeature`, whose module imports the shadow, PBR and path-tracer GLSL and carries ~20 path-tracing / shadow-march params | **REWORK** | Split the file, not the feature: move the light list (param definition, default factory, four actions, the two helpers) into a module with no shader imports; `LightingFeature` spreads it back in, so feature id `lighting`, param key `lights`, short ids and save format are byte-identical. A second app installs a feature built from the same piece plus its own render params | 1 session | Gain: nothing visible; one less 540-line file doing three jobs. Risk: low; `smoke:engine-gmt` plus a scene round-trip cover it (not run here) |
| Renderer transport (uniform arrays `uLight*[8]`, written in `UniformManager.syncFrame`) | GMT's worker, GMT's uniform names | **ADAPTER** | none in GMT. In the ported renderer module: the shading pass's three named lights (`uLightDir`, `uFillDir`, `uKickDir`, `uFillCol`, `uKickCol`) become arrays of N direction / colour / casts-shadow, looped. Per light the cost is one Blinn-Phong evaluation plus, if it casts, one depth-buffer shadow lookup; no fractal iterations. The shell's adapter subscribes to its store's light list and resolves each light through the frame resolver | 1 session in the module + 1 session for the shell adapter | none; GMT's worker contract is untouched |
| Light Studio UI: orbs, popup, panel (`LightOrb`, `LightSettingsContent`, `LightSettingsPopup`, `LightPanel`, `LightDirectionControl`) | Module-scope `getProxy()` + `ViewportRefs`; reads `engine.sceneOffset` and the viewport camera; store reads by name (`s.lighting`, `s.updateLight`) | **REWORK** | The components stop importing a renderer. They read the "view frame" (camera orientation and position, scene offset, surface distance, and now plane normal and view scale) from a small provider the host app registers; GMT registers one backed by its proxy, the shell one backed by its renderer. The duplicated frame-conversion code (two `handleToggleFixed` copies, `storeToWorld`, `resolveRealWorldPosition`, `getLightShaderVector`) collapses onto the one resolver. Type-specific rows (Range, emitter, Sphere warning, Lite/HQ) are already conditional on type and stay so | 2 sessions | Gain: five copies of one conversion become one; the popup becomes testable without a worker. Risk: the gizmo drag and the anchor toggle are easy to regress and I found no smoke that drags a light (unverified); needs a manual pass in GMT |
| Top-bar Light Studio host (`engine-gmt/topbar/CenterHUD.tsx`) | An engine-gmt top-bar component; also hosts other HUD items | **REWORK (small) or ADAPTER** | If the orb strip is a separable piece of CenterHUD, the shell mounts it in its own top-bar slot; if it is entangled, lift the strip into its own component first (improve the master, no copy) | 0.5 to 1 session; body not read, so unverified | Gain: none visible. Risk: low |
| Drag an orb onto the picture (`useInteractionManager`, `draggedLightIndex`) | THREE raycaster on GMT's display camera; `engine.lastMeasuredDistance`; clamps 0.0002..20 world units | Directional aim **ADAPTER** (the maths, `padCoordToLightEuler`, is pure); Point placement **NOT-NOW** | For aiming: the shell's own pointer handler calls the same function with its camera orientation. For placement: applies after the units row, when "half the surface distance" is simply 0.5 in view units and the clamp disappears | 0.5 session for aiming | Gain (later): GMT's placement clamp goes away |
| Viewport gizmos (`LightGizmo`, `SingleLightGizmo`) and emitter balls (`LightSpheresFeature`) | Project world positions with GMT's camera + scene offset; balls are GLSL in GMT's marcher | **NOT-NOW** | Applies once positional lights do. In view units a gizmo projects with an ordinary float camera in a view-relative space, so the existing overlay maths (`engine/overlay/OverlayProjection.ts`) would serve unchanged. A direction-only gizmo for surface-frame lights would be new work | later, 1 to 2 sessions | none now |
| Attachment modes UI ("Headlamp" / "World", anchor icon) | Two-state toggle that converts position so the light does not jump | **REWORK** (same change as the frame row) | Three-way choice; conversion between frames goes through the resolver, in view units where chosen | counted above | as the frame row |
| Shadows: per-light `castShadow` | Flag | **AS-IS** | none; the page already has per-light casting (key and fill cast, kicker does not) | 0 | none |
| Shadows: global controls (`shadowSoftness` hardness 2..2000, `shadowSteps`, `shadowBias`, Jitter, Lite/HQ, `shadowsCompile`) | Describe a ray march toward the light | **ADAPTER** | none in GMT. The shell declares its own shadow group for a depth-buffer shadow: strength (0..1, same meaning as GMT's Opacity), softness (page default 0.05), length (0.6), plus occlusion and its radius (0.12). Do not reuse GMT's hardness/steps/bias names for different quantities | inside the shell feature | none. A later, separate idea: GMT's worker could offer depth-buffer shadows as a cheap preview mode; not needed for the shell and not proposed here |
| Active-light popup singleton (ADR-0008, `activeLightPopup`) | Module-level `{ index: -1 }`, gates the range circle on the gizmo | **AS-IS** | none; rides along with the UI | 0 | none |
| Default rig and presets (`DEFAULT_LIGHTS`, formula default lights, saved scenes) | World positions around a unit-sized object at the origin | **ADAPTER** | The shell supplies its own default list: three Directional lights in the surface frame with the page's angles (key 40° elevation at azimuth 152°, fill 21° at -40°, kicker from under the camera) and strengths 3.0 / 0.5 / 0.25. Carrying a GMT scene's lights into the deep zoomer transfers colour, power and casting only; positions do not transfer | 0.5 session | none |
| Preview-lighting stub (`advancedLighting` false branch in `LightingFeature.inject`) | Hard-coded key/fill in GMT's marcher GLSL | **NOT-NOW** | does not apply; the deep zoomer's own "classic" look plays this role | 0 | none |
| Animation and modulation of lights (track ids `lighting.light{i}_posX`, `_rotX`, `_intensity`, `_falloff`, `_radius`, `_softness`) | Offsets added in `UniformManager.syncFrame`; curves from `engine/features/modulation/paramMapping.ts` (`mappingForVirtual('lighting.light0_intensity', ...)`) | **ADAPTER** | none in GMT if the shell's feature keeps the id `lighting` and its adapter adds the same offsets before resolving. Whether the timeline binds these ids generically or through GMT-only code is unverified | 0.5 session, after checking | none |
| Help topics (`data/help/topics/lighting.ts`: `panel.light`, `light.type`, `light.sphere`, `light.rot`, `light.intensity`, `light.mode`, `light.falloff`, `light.pos`, `shadows`) | Text describes ray-marched shadows, world position, Sphere lights | **ADAPTER** | The shell registers its own topics for shadows and attachment; `light.intensity`, `light.rot` and colour temperature text is reusable if the help registry allows per-app overrides (unverified) | 0.5 session | none |
| Tutorial lesson (`app-gmt/tutorial/lessons.ts`, steps keyed on `draggedLightIndex` and `showLightGizmo`) | app-gmt only | **NOT-NOW** | applies if the shell gets a tutorial | 0 | none |

---

## 3. The three reworks that matter, in order

1. **A view frame and a third light frame (frame + units rows; 2 to 3 sessions, plus 1 to 2 if GMT fits a real plane).** One optional field for the frame (world / camera / surface in view) and one for the distance unit (world / view scale), resolved in one place from a view-frame record any renderer can supply. This is the change that makes a light list mean something at 1e-30, and in GMT it gives surface-following lights and zoom-proof headlamps.
2. **Take the renderer out of the Light Studio components (2 sessions).** Replace the module-scope `getProxy()` / `ViewportRefs` reads in the four lighting UI files with a registered view-frame provider, and fold the duplicated conversions into the resolver from item 1. Without this the shell has two options, both against the standing rules: import GMT's worker proxy, or copy the components.
3. **Separate the light list from the shader injection (1 session).** Same feature id, same keys, same saves; the list becomes installable on its own.

Until 1 to 3 land, the shell can ship with the blueprint's plain sliders (key elevation, key turn, tint, shadows, occlusion), which is the page's behaviour. The N-light loop in the renderer module (1 session) is the only step that touches no GMT code and can be done first.

## 4. Decisions for the owner

- Should a surface-frame light be the deep zoomer's only kind for now, with world lights hidden, or should the three-way choice show from day one? (Names only in the UI: World / Camera / Surface.)
- Does GMT get the surface frame in the same change, or only the data field and resolver, with GMT's provider reporting "no plane" (falls back to camera) until a plane fit is built?
- Eight lights is GMT's cap (`MAX_LIGHTS = 8`, array uniforms). The deep zoomer's shading pass could take more cheaply; keep 8 for one shared list, or let the cap be per renderer?

## 5. Unverified

- `engine-gmt/features/lighting/components/ShadowControls.tsx`, `LightDirectionControl.tsx` (beyond its `padCoordToLightEuler` call), the bodies of `LightGizmo.tsx` and `SingleLightGizmo.tsx` (only their imports and proxy reads were read), and `engine-gmt/topbar/CenterHUD.tsx` (only the matching lines).
- `docs/adr/0008-activelightpopup-singleton-bypassing-store.md` — file exists; body not opened. The singleton itself was read in `GizmoMath.ts`.
- `engine-gmt/shaders/chunks/lighting/shadows.ts`, `pbr.ts`, `shared.ts` — not opened; shadow cost is taken from the param descriptions and the help text, not from the GLSL or a benchmark.
- The literal uniform strings behind `Uniforms.LightPos` etc. (`engine/UniformNames.ts` not opened); `uLightDir` is confirmed by the `@assumption` in `UniformManager.ts`.
- How the `lighting` slice crosses from the main thread to the worker (which event or config sync) — not traced.
- Whether `getProxy()` starts a worker at import or only on first use (`engine-gmt/engine/worker/WorkerProxy.ts` not opened). Either way the import pulls the worker client into the shell's bundle.
- A sibling `types/graphics.ts` at the repo root also matches `LightParams`; which of the two is live was not checked (the lighting feature imports from `engine-gmt/types`).
- Whether any smoke drags a light gizmo or toggles the anchor; none was found by name, none was searched for exhaustively.
- The page's `shadowed()` and `occlusion()` bodies and the plane-fit routine above `rigDir` were not read line by line; their behaviour is taken from the call sites, the `look` defaults and the README.
- `plans/deep-zoom-in-gmt/*` was not re-read in this pass; the 1e-16 position figure in the brief is not re-checked here.
- The tutorial lesson text (only the two trigger lines in `app-gmt/tutorial/lessons.ts` were seen).
