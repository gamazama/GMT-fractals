# Gradient Explorer — Geometry Handles v2 (redesign)

**Branch:** `exec/fs-onscreen-handles` (dev) · **Date:** 2026-06-10 · **Status:** in flight

Follows the first on-screen-handles pass (commits `861bac8` + `8a99a9d`). Artist review
asked for richer per-mode controls and a leaner mode list. Three concept forks were
confirmed with the user before scoping (see §0).

---

## 0. Confirmed concept decisions

1. **Linear folds in S-curve.** Linear becomes a *rotatable, eased* gradient: an **angle**
   control + a **bias** (s-curve) control. The standalone **S-curve mode is removed** —
   Linear at angle 0 with bias 0 reproduces the old straight linear; with bias it *is* an
   s-curve. One fewer selector entry.
2. **Arched "curvature" bends the band's spine** — warps the band away from a pure circular
   arc toward a flatter / tighter curve, *independent of* the existing Radius handle (radius
   = how big the circle is; curvature = how arc-like vs flat).
3. **Conic mirror is collapsed by default (a discovery).** Default conic is byte-identical to
   today: a single rotation handle, plain `0→1` wrap. A second handle sits *under* the
   rotation handle; pulling it off reveals a **mirrored sweep** (`0→1→0`, no hard seam) whose
   angular width you set, with an independent **bias per half** (rising / falling).

Plus two unambiguous asks: **Radial** gains **scale** + **bias**; **Conic** gains a
**centre-position** control; **Arched** width max is raised so the band can **fill the
screen**; and **Randomized mode is removed**.

---

## 1. Determinism discipline (the load-bearing invariant)

Every new param defaults to **the value that reproduces today's render**, so `geomParams = {}`
stays byte-identical and `npm run test:palette` needs no baseline edit for the *surviving*
modes. The pin only changes where a mode is *removed* (`random`, `scurve`).

| New param | Default | At default → |
|-----------|---------|--------------|
| `linearAngle` | 0 | horizontal `nx` |
| `linearBias` | 0 | identity (straight ramp) |
| `radialScale` | 1 | corner = 1 (current normalisation) |
| `radialBias` | 0 | identity |
| `archCurve` | 0 | circular arc (`Rt = archR`) |
| `conicCx`, `conicCy` | 0 | frame-centred |
| `conicMirror` | 0 | collapsed → legacy `(ang+π)/2π` |
| `conicBiasA`, `conicBiasB` | 0 | identity |

`amount` / `seed` (the random field's params) are removed along with `random`.

---

## 2. Math

### 2.1 Unified bias ease (`bias(t, b)`)
Signed Inigo-Quilez *gain*. `b = 0 → identity` (early-return, exact); `b > 0 → S-curve`
(ease-in-out / contrast); `b < 0 → inverse-S`. Monotone, stays in `[0,1]`.

```
bias(t, b):
  if b == 0: return t
  k = exp(b * BIAS_K)            // BIAS_K ≈ 1.6, so b∈[-2,2] is a usable range
  u = clamp01(t)
  return u < 0.5 ? 0.5*pow(2u, k) : 1 - 0.5*pow(2(1-u), k)
```
Reused by Linear, Radial, and both Conic halves. Replaces `easeShaped`/`smootherstep`
(removed with the scurve mode).

### 2.2 Linear — angle + bias
Project in normalised box space (`nx, ny ∈ [0,1]`), remap to the projection's corner range,
then bias:
```
c = cos(linearAngle), s = sin(linearAngle)
t = (nx*c + ny*s − (min(0,c)+min(0,s))) / (|c| + |s|)
p = bias(t, linearBias)
```
θ=0 → `t = nx`, `p = nx`. ✔ byte-identical.

### 2.3 Radial — scale + bias
```
d = hypot(ux−radialCx, uy−radialCy) * radialNorm   // 0 at centre, ~1 at far corner
p = bias(clamp01(d / radialScale), radialBias)
```
scale=1, bias=0 → current. scale<1 tightens (full ramp before the corner); scale>1 overshoots.

### 2.4 Arched — curvature (spine bend)
Compute the sweep angle first, make the target radius angle-dependent, then the band test:
```
a  = atan2(ux, archCy − uy)                 // 0 at top, ± toward sides
Rt = archR * (1 + archCurve * a*a)          // curve>0 grows R toward ends → flatter
d  = hypot(ux, uy − archCy)
band = archHalfWidth − |d − Rt|             // unchanged shape of the test
```
`archCurve = 0 → Rt = archR →` identical band. Range `[-0.6, 0.6]`. Width max
raised `1 → 3` (isotropic half-units) so the band can fill the stage; the width handle pins
inside the stage when the band overshoots (existing `pin()`).

### 2.5 Conic — centre + mirror + bias-per-half
```
ang = atan2(uy − conicCy, ux − conicCx)
if conicCx==0 && conicCy==0 && conicAngle==0 && conicMirror==0:
    p = bias((ang+π)/2π, conicBiasA)        // LEGACY expression (no wrap01) → byte-identical
else:
    phi = wrap01((ang + conicAngle + π)/2π) // [0,1)
    if conicMirror <= 0:
        p = bias(phi, conicBiasA)           // rotated/centred plain wrap
    else:
        split = 1 − conicMirror             // rising-arc fraction
        p = phi < split ? bias(phi/split, conicBiasA)            // rising 0→1
                        : bias(1 − (phi−split)/conicMirror, conicBiasB)  // falling 1→0
```
`conicMirror ∈ [0, 0.9]`. At 0 the falling arc has zero width (no mirror) → the mirror handle
sits exactly on the rotation handle (single visible handle). Pulling it back grows the falling
arc.

---

## 3. Handles (per mode)

Visual language unchanged (cyan dots, dark stroke, faint/soft guides, fade-on-idle, the
`useParamDrag`/`useHandleDrag` factories, double-click reset, `pin()` for off-screen handles).

- **Linear** — a **bias dot** at the gradient-axis midpoint riding a faint glyph of the real
  eased curve (drag ⟂ to the axis → bend into an S); an **angle dot** tethered to it on the
  axis (drag around centre → rotate). Two handles total.
- **Radial** — **centre dot** (existing) · a **scale ring handle** on the axis at radius
  `scale` from the centre (drag in/out) · a **bias dot** *between* centre and scale (drag
  along the axis → ease the falloff).
- **Conic** — **centre dot** (new) · **rotation handle** on the seam (existing) · a **mirror
  handle** that starts coincident with the rotation handle and pulls out to set
  `conicMirror`; once pulled out, a **bias dot on each arc** (rising / falling).
- **Arched** — apex / radius / width / span (existing) · a new **curvature handle** off the
  band centre-line (drag ⟂ to the spine → flatten/tighten).
- **S-curve, Randomized** — removed.

`hasGeometryHandles` now includes `linear`; Linear gets the toolbar **◉ Handles** toggle.

---

## 4. Files touched

| File | Change |
|------|--------|
| `palette/core/rampGeometry.ts` | `bias()`; linear/radial/arched/conic param math; remove `random`+`scurve` from `GeometryId`/`GEOMETRIES`/`sampleGeometry`; drop `fillRandom`/`RANDOM_MAX_DIM`/`isStochastic`/`easeShaped`/`smootherstep`; new `GEOM_DEFAULTS` keys; drop `amount`/`seed`. |
| `gradient-explorer/fullscreen/modes/geometryModes.tsx` | new `paramFields` (linear angle+bias, radial scale+bias, arch curve, conic centre+mirror+biases); remove `random`+`scurve` entries + `RandomControls`; arch width max → 3; hints. |
| `gradient-explorer/fullscreen/GeometryHandleLayer.tsx` | `LinearHandles`, extend `RadialHandles`/`ConicHandles`/`ArchedHandles`, remove `SCurveHandles`; update `GEOM_HANDLES`. |
| `palette/store/fullscreenStore.ts` | remove `seed`/`amount`/`setFullscreenAmount`/`rerollFullscreen`; `HandleParamKey` = `keyof GeometryParams`. |
| `gradient-explorer/FullscreenGradientOverlay.tsx` | drop `isStochastic`/`RANDOM_MAX_DIM`/`amount`/`seed`; `fullCap = CONTINUOUS_MAX_DIM`; `buildParams = {...fs.geomParams}`. |
| `debug/test-palette-rampgeometry.mts` | drop random/scurve sections; add new-param additive + wired cases; keep mulberry32 §1. |
| `debug/smoke-gx-geom-handles.mts` | replace scurve case with linear; add conic-mirror/centre + arch-curvature drags. |

## 5. Gates
`tsc --noEmit` 0 · `test:palette` green (byte-identity for surviving modes) · `test:dither`
flat-gate · `smoke:gx-handles` · `smoke:liquify`. Then `/code-review high` → `/simplify`.
