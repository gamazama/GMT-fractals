# Spec 10: Spot Lights (Shaped Emission)

## Motivation

Point lights scatter uniformly in all directions. In volumetric/fog scenes this wastes ray samples — every march step evaluates light contribution even when most of the volume is outside the intended illumination area. Spot lights concentrate energy into a cone, producing sharper volumetric beams and reducing wasted computation. They also unlock standard cinematic lighting setups (key/fill/rim) that are impractical with omnidirectional points.

IES profiles are out of scope for this spec — they can be layered on later as a texture-based modulation of the spot cone.

---

## Design

### Light Type Extension

Add `'Spot'` to the existing `LightType` union. A Spot light is a Point light with a directional cone mask. It has both position (like Point) and direction (like Directional), plus two cone angle parameters.

```
Point       → uLightType = 0.0   (omnidirectional, has position)
Directional → uLightType = 1.0   (infinite, has direction only)
Spot        → uLightType = 2.0   (positional + directional cone)
```

### New Parameters on LightParams

```typescript
// Half-angle of the outer cone edge in radians (0 = laser, PI/2 = hemisphere)
coneAngle?: number;    // default: PI/4 (45°)

// Half-angle of the inner cone (full intensity region) in radians
// Must be <= coneAngle. The range [coneInner, coneAngle] is the soft falloff zone.
coneInner?: number;    // default: PI/6 (30°)
```

When `type !== 'Spot'`, these are ignored. Existing `rotation` (YXZ Euler) already controls direction — no new direction parameters needed. Existing `position`, `falloff`, `falloffType`, `radius`, `softness` all apply to Spot lights (they're positional).

### New Uniforms

| Name | Type | Size | Default |
|------|------|------|---------|
| `uLightConeAngle` | `float[]` | `MAX_LIGHTS` | `PI/4` |
| `uLightConeInner` | `float[]` | `MAX_LIGHTS` | `PI/6` |

Register in `UniformNames.ts` and `extraUniforms` in the lighting feature definition.

---

## Shader Implementation

### Cone Attenuation Function

Shared helper injected via `LIGHTING_SHARED` (`shaders/chunks/lighting/shared.ts`):

```glsl
// Spot cone attenuation.
// toLight: normalized direction from surface toward light (same convention as uLightDir)
// spotDir: uLightDir[i] — "toward light" vector (negated at boundary)
// Returns 1.0 inside inner cone, 0.0 outside outer cone, smooth falloff between.
float spotAttenuation(vec3 toLight, vec3 spotDir, float cosOuter, float cosInner) {
    // dot(uLightDir, toLight) = dot(towardLight, towardLight_fromSurface)
    // equals cos(angle between cone axis and surface-to-light)
    // — maximum (1.0) when surface is on the cone axis
    float cosAngle = dot(spotDir, toLight);
    return smoothstep(cosOuter, cosInner, cosAngle);
}
```

**Sign convention note:** `uLightDir[i]` stores "toward light" (negated in UniformManager). For spot cone checks, we compare `dot(uLightDir[i], l)` where `l` is the normalized surface-to-light vector. Both point away from the surface, so `dot = 1.0` means the surface is directly on the cone axis. This is correct — `cos(0) = 1.0` for zero angle from axis.

### UniformManager — Precompute Cosines

Store `cos(coneAngle)` and `cos(coneInner)` in the uniform arrays rather than raw radians. This avoids per-fragment `cos()` calls in the shader.

```typescript
// In UniformManager.updateLightUniforms, inside the !isDirectional branch:
if (l.type === 'Spot') {
    coneArr[i] = Math.cos(l.coneAngle ?? Math.PI / 4);   // outer (smaller cos = wider)
    innerArr[i] = Math.cos(l.coneInner ?? Math.PI / 6);   // inner (larger cos = narrower)
}
```

### Insertion Points

All three lighting paths need spot attenuation applied after the light direction `l` is computed and before radiance contribution. The pattern is identical:

**1. PBR Direct (`shaders/chunks/lighting/pbr.ts`)**

After the `att` computation (after falloff), before radiance scaling:

```glsl
// Spot cone attenuation (Spot type = 2.0)
bool isSpot = uLightType[i] > 1.5;
if (isSpot) {
    float spotAtt = spotAttenuation(l, normalize(uLightDir[i]), uLightConeAngle[i], uLightConeInner[i]);
    if (spotAtt < 0.001) continue;
    att *= spotAtt;
}
```

Where in the existing code:
- Spot lights take the `else` (non-directional) branch for `lVec = uLightPos[i] - p` since they have position
- Existing distance falloff applies (`uLightFalloff`, `uLightFalloffType`)
- Cone attenuation multiplies on top

**2. Path Tracer NEE (`shaders/chunks/pathtracer.ts`)**

Same insertion point — after `att` is computed, before visibility test:

```glsl
if (uLightType[lightIdx] > 1.5) {
    float spotAtt = spotAttenuation(lDir, normalize(uLightDir[lightIdx]), uLightConeAngle[lightIdx], uLightConeInner[lightIdx]);
    att *= spotAtt;
    if (att < 0.001) continue;
}
```

**3. Volumetric Scatter (`shaders/chunks/lighting/volumetric_scatter.ts`)**

After the `_att` falloff computation:

```glsl
if (uLightType[_li] > 1.5) {
    float spotAtt = spotAttenuation(_l, normalize(uLightDir[_li]), uLightConeAngle[_li], uLightConeInner[_li]);
    _att *= spotAtt;
}
```

This is where the main performance win is — volumetric march steps outside the cone get zero contribution and skip the shadow trace.

### Conditional Compilation (Optional)

If no spot lights are active, the `uLightType > 1.5` check is a cheap branch-not-taken. Conditional compilation via `#define HAS_SPOTLIGHTS` is optional — only worthwhile if profiling shows the branch costs are measurable. The check in the lighting feature would be:

```typescript
const hasSpotlights = state?.lights?.some(l => l.type === 'Spot' && l.visible && l.intensity > 0);
if (hasSpotlights) builder.addDefine('HAS_SPOTLIGHTS', '1');
```

---

## CPU / Store Changes

### types/graphics.ts

```typescript
export type LightType = 'Point' | 'Directional' | 'Spot';

export interface LightParams {
    // ... existing fields ...
    coneAngle?: number;   // Spot outer half-angle (radians). Default PI/4.
    coneInner?: number;   // Spot inner half-angle (radians). Default PI/6.
}
```

### features/lighting/index.ts

1. Add `coneAngle` and `coneInner` to the feature `params` definition (with `uniform: null` — synced via array uniforms, not individual uniforms).
2. Add new uniform arrays to `extraUniforms`.
3. Extend `addLight` to include default cone params when type is Spot.
4. No changes to `updateLight` / `removeLight` / `duplicateLight` — they're generic.

### engine/managers/UniformManager.ts

In the per-light loop:
- Encode `'Spot'` as `typeArr[i] = 2.0`
- Spot lights take the same branch as Point for position/falloff (they're positional)
- Additionally sync direction (Spot needs both position AND direction)
- Sync precomputed `cos(coneAngle)` and `cos(coneInner)` to new uniform arrays

Key change: currently, position is only synced for non-directional and direction is synced for all. For Spot, both are needed — this is already the case since the `!isDirectional` branch syncs position, and direction is synced unconditionally outside that branch.

### engine/UniformNames.ts

```typescript
LightConeAngle: 'uLightConeAngle',
LightConeInner: 'uLightConeInner',
```

---

## UI

### LightControls.tsx — Type Selector

Extend the existing type toggle/selector to include Spot. When `type === 'Spot'`, show:
- Cone Angle slider (0°–90°, maps to 0–PI/2 radians)
- Inner Angle slider (0°–coneAngle, clamped to not exceed outer)
- The existing LightDirectionControl (currently only shown for Directional) should also show for Spot

### LightPanel.tsx

No changes — panels render controls based on type, which propagates automatically.

### CenterHUD.tsx — Light Orb

Add a Spot icon variant (cone/flashlight shape) alongside the existing Point (circle) and Directional (sun) icons.

---

## Gizmo

### SingleLightGizmo.tsx

Spot lights need a cone wireframe visualization in addition to the position gizmo axes:

1. Keep existing axis/plane handles (Spot has position like Point)
2. Add cone wireframe: two circles (inner and outer cone at a reference distance) connected by lines to the light position
3. Cone orientation driven by the light's `rotation` Euler (same as directional direction)
4. Cone lines rendered as additional SVG paths in the gizmo, projected to screen space using the same `getScreenTip` pattern

The cone wireframe is a visual aid — it doesn't need to be interactive (no drag-to-resize-cone). The sliders in the popup control cone angles.

---

## Shadows

No changes needed. Shadow raymarching is direction-agnostic — it traces a ray from the surface toward the light regardless of light type. The cone attenuation naturally handles "out of cone = no contribution = effectively shadowed."

---

## Files Changed

| File | Change |
|------|--------|
| `types/graphics.ts` | Extend `LightType`, add cone params to `LightParams` |
| `engine/UniformNames.ts` | Add `LightConeAngle`, `LightConeInner` |
| `features/lighting/index.ts` | Add cone params, uniforms, Spot default |
| `engine/managers/UniformManager.ts` | Encode Spot type, sync cone cosines |
| `shaders/chunks/lighting/shared.ts` | Add `spotAttenuation()` helper |
| `shaders/chunks/lighting/pbr.ts` | Apply spot attenuation in direct loop |
| `shaders/chunks/pathtracer.ts` | Apply spot attenuation in NEE |
| `shaders/chunks/lighting/volumetric_scatter.ts` | Apply spot attenuation in scatter loop |
| `features/lighting/components/LightControls.tsx` | Spot UI controls |
| `features/lighting/components/SingleLightGizmo.tsx` | Cone wireframe |
| `features/lighting/components/LightDirectionControl.tsx` | Show for Spot type too |
| `components/topbar/CenterHUD.tsx` | Spot icon variant |

---

## Not In Scope

- **IES profiles** — texture-based angular emission patterns. Can layer on top of the cone as a lookup texture modulating the `spotAttenuation` result.
- **Rectangular / area lights** — different geometry entirely, would need separate implementation.
- **Projector lights** — texture projection through the cone (gobo patterns). Extension of IES concept.
- **Cone angle gizmo handles** — drag-to-resize cone from the gizmo. Slider control is sufficient for now.
