# GMT Mandelbulb scene <-> deep-zoom view: the exact mapping

Written 2026-10-07 from a read-only pass. Sources:
- GMT: `engine-gmt/formulas/Mandelbulb.ts` (`formula_Mandelbulb`, `defaultPreset`), `engine-gmt/shaders/chunks/de.ts` (`DE_MASTER`, grep `uDeBailout`), `engine-gmt/store/cameraSlice.ts` (`captureCameraState`), `engine-gmt/engine/FractalEngine.ts` (grep `camFov`).
- Page: `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (branch kernel-perf): `deMandelbulb`, `deF32`, `makeHP` / `P8`, `basis`, `keyLightDir`, `cam = {`, `pushKeyframe`, `window.__dz.getView/setView`.

Anything not read in source is marked **unverified**.

---

## 1. The formula: same map, no axis transform needed

GMT (`formula_Mandelbulb`):

```glsl
float power = uParamA;
float rp1 = pow(r, power - 1.0);
dr = rp1 * power * dr + 1.0;
float theta = acos(clamp(z3.z / r, -1.0, 1.0));
float phi = atan(z3.y, z3.x);
theta = theta * power + uVec2A.x;
phi = phi * power + uVec2A.y;
float zr = rp1 * r;
z3 = zr * vec3(st * cp, sp * st, ct);
...
z3 += c.xyz;
```

Page (`deMandelbulb`, and identically `deF32` and the CPU `deCPU`):

```glsl
float rp1 = pow(r, uPower-1.0);
dr = rp1*uPower*dr + 1.0;
float theta = acos(clamp(z.z/r,-1.0,1.0));
float phi   = atan(z.y, z.x);
theta = theta*uPower + uPhase.x; phi = phi*uPower + uPhase.y;
float zr = rp1*r;
z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta)) + pos;
```

Verdict, item by item:

| Item | GMT | Page | Same? |
|---|---|---|---|
| Pole axis | z (`acos(z/r)`) | z | yes |
| Azimuth | `atan(y, x)` | `atan(y, x)` | yes |
| Power | `uParamA` (coreMath.paramA, 2..16, step 0.001, default 8) | `uPower` / `nPower` | yes for whole numbers; see below |
| Phase | added AFTER the multiply: `theta*power + vec2A.x`, `phi*power + vec2A.y` | same: `+ uPhase.x`, `+ uPhase.y` | yes: `phase = [vec2A.x, vec2A.y]`, radians, no sign flip |
| Recombination | `(st*cp, sp*st, ct)` | same | yes |
| Add c | `c.xyz` (= the sample point when juliaMode is off) | `pos` | yes when `geometry.juliaMode === false` |
| Derivative | `rp1*power*dr + 1` | same | yes |
| Bailout | `dot(z,z) > max(uDeBailout,1.0)`; comment in `DE_MASTER` says default 100, i.e. radius 10 | `r > 2.0` | **differs** (cosmetic: DE values near the surface agree; far-field distance and smooth-iteration colour differ) |
| Iterations | `coreMath.iterations`, default 16 | `cam.iters`, default 14, `setView` clamps to 4..160 | pass through, clamp |

So a GMT world point (x, y, z) is the same fractal point (x, y, z) on the page. **Identity transform.**

The high-precision reference orbit (`makeHP` -> `P8`) confirms it: `cth = z/r`, `cph = x/rho`, `sph = y/rho`, output `[rN*sNth*cNph, rN*sNth*sNph, rN*cNth]`, with the phase applied as a rotation of (n*theta) and (n*phi) by constants.

Things GMT's Mandelbulb has that the page does not (handoff must refuse or warn):
- **Non-integer power.** `P8` uses `ipow(r, nPower)` and Chebyshev `chebT(cth, nPower)`; the GPU uses `uPowerI` as a loop bound. Integer only. Round and warn, or refuse, if `|paramA - round(paramA)| > 1e-6`. The page's own allowed range for `__setPower` is **unverified**.
- **Z Twist** (`uParamD`, coreMath.paramD) - no counterpart. Refuse unless `|paramD| <= 0.001` (GMT's own gate).
- **Radiolaria** (`uVec2B.x > 0.5`) - no counterpart. Refuse unless `vec2B.x <= 0.5`.
- **Julia mode** (`geometry.juliaMode`) and **hybrid** (`geometry.hybridMode`), any weave/interlace, any pre-transform feature - no counterpart. Refuse.

## 2. The camera

### GMT side
- World position is a double per axis: `sceneOffset.x + sceneOffset.xL` (+ `cameraPos.x`, which is serialisation-only and is (0,0,0) at runtime - see the comment on `cameraPos` in `engine-gmt/types/fractal.ts` and `captureCameraState`, which splits with `VirtualSpace.split`: `high = Math.fround(v)`, `low = v - high`).
  Default preset: `sceneOffset {0,0,1 | 0,0,-0.157}` + `cameraPos {0,0,2.157}` = world (0, 0, 3.0).
  **Precision: about 1e-16 relative, so about 16 significant digits. The page holds 256 fractional bits (about 77 digits).**
- Orientation: `cameraRot {x,y,z,w}`, a quaternion applied to a three.js camera (`sceneCtrl.updateFallback(sPos, sQuat, sFov, cam.aspect)` in `FractalEngine`). three.js convention: forward = q * (0,0,-1), up = q * (0,1,0), right = q * (1,0,0). That the GMT ray shader uses exactly this basis is **unverified** (I did not read `ray.ts`), but the default preset (identity quaternion, camera at +z looking at the origin) is consistent with it.
- Field of view: `optics.camFov`, degrees, default 60 (`this.state.optics?.camFov ?? 60.0`). Treated here as three.js vertical FOV - **unverified** beyond that call. `optics.camType` near 1 means orthographic (grep `camType - 1.0`); the page has no orthographic camera.

### Page side
- `cam = { pos:[0,0,2.6], yaw:-Math.PI/2, pitch:0, power:8, iters:14, ... }`; `camHP = cam.pos.map(hp.fromNum)` is authoritative, three BigInts scaled by 2^256 (`hp = makeHP(256)`).
- `basis()`:
  `fwd = [cos p cos y, sin p, cos p sin y]`, `right = [cos(y+pi/2), 0, sin(y+pi/2)] = [-sin y, 0, cos y]`, `up = right x fwd`.
  At the default (yaw = -pi/2, pitch = 0): fwd = (0,0,-1), right = (1,0,0), up = (0,1,0) - **identical to an identity three.js quaternion.** Same handedness, same up axis, no flip.
- Rays: `uv = (fragCoord - 0.5*res) / res.y` so uv.y runs -0.5..+0.5, and `rd = normalize(fwd + fovScale*(uv.x*right + uv.y*up))` with `fovScale = Math.tan(0.5*1.1) = 0.6131`.
  Half-height tangent = 0.5 * 0.6131 = 0.3066, so **the page's vertical field of view is 2*atan(0.3066) = 34.1 degrees, fixed.** (Not 63 degrees: the 1.1 rad is halved twice.)
  Note: the saved path file writes `fovScale:1.1` - that is the angle, not the tangent; do not use that number as a tangent.
- No roll, no FOV control, no orthographic mode.

### Conversions

GMT -> page:
```
pos_j   = BigInt fixed point of (sceneOffset.j + sceneOffset.jL + cameraPos.j)   // exact: fromNum of each double, summed as BigInt
f       = q * (0,0,-1)
pitch   = asin(clamp(f.y, -1, 1))
yaw     = atan2(f.z, f.x)            // undefined when |f.y| ~ 1: keep yaw = -pi/2
```
Summing as BigInt (`fromNum(x) + fromNum(xL) + fromNum(cameraPos.x)`) keeps every bit GMT has; summing as doubles first would round.

Page -> GMT:
```
v_j         = Number(camHP_j) / 2^256           // rounds to a double: everything below ~1e-16 * |pos| is lost
sceneOffset = split(v_j): x = Math.fround(v), xL = v - x ; cameraPos = (0,0,0)
thetaY      = -(yaw + pi/2)
q           = qY(thetaY) * qX(pitch)
            = { x:  cos(thetaY/2)*sin(pitch/2),
                y:  sin(thetaY/2)*cos(pitch/2),
                z: -sin(thetaY/2)*sin(pitch/2),
                w:  cos(thetaY/2)*cos(pitch/2) }
```
Check: yaw = -pi/2, pitch = 0 gives the identity quaternion. yaw = 0 gives thetaY = -pi/2 and forward (1,0,0).

### What is lost
- **GMT -> page:** roll (page up is always world-up-derived); field of view (page fixed at 34.1 degrees vertical; GMT default 60 - at the same position the page shows a 1.88x tighter crop, tan(30 deg)/0.3066); orthographic mode; DOF; `targetDistance`/orbit pivot. To make the first frame look the same, either accept the crop or (better, later) add a FOV setter to the page - one uniform, `uFovScale = 2*tan(camFov/2)`.
- **Page -> GMT:** position below double precision. A view at surface distance d round-trips only while d is well above 1e-16 * |pos|; in practice GMT's f32 marcher stops near 1e-6 anyway, so "send back to GMT" is only meaningful for shallow views. The handoff should compare the page's `__dz.telemetry().depth` against about 1e-6 and warn, or pull the camera back along -fwd until depth is in GMT's range.
- Pitch is unclamped on conversion; whether the page clamps pitch on input is **unverified**.

## 3. The look

Page view fields (exactly what `pushKeyframe` and `__dz.getView` write): `cam[3] (decimal strings), yaw, pitch, iters, power, phase[2], light, falloff, color, cscale, surf`.

| GMT setting | Page counterpart | Notes |
|---|---|---|
| `coreMath.iterations` | `iters` | clamp 4..160 |
| `coreMath.paramA` | `power` | integer only |
| `coreMath.vec2A` | `phase` | direct |
| `lights[]` (three point lights, world positions, colours, falloff) | none | page has one camera-relative key light (`keyLightDir`: 0.5 right + 0.85 up - 0.35 fwd) plus fill/kicker uniforms (`uFillDir`, `uKickDir`), and `lightMode` 0 directional / 1 headlamp / 2 both, `falloffMul` (default 4). GMT light positions, colours and per-light intensity do not map. |
| `coloring.mode` | `color` 0 plain / 1 iteration / 2 orbit-trap | which GMT mode numbers mean iteration vs trap is **unverified**; default GMT mode 0 with a single white stop is closest to page `color: 0` |
| `coloring.scale` / `repeats` | `cscale` (0.05..20, default 1) | units differ; no formula established - **unverified**, treat as not mapped in v1 |
| `coloring.gradient` | the page has `uGradient` / `uUseGradient` uniforms | a setter exists in the page (grep `useGradient`), its handle name and stop format are **unverified** |
| `quality.detail` / `pixelThreshold` | `surf` (0.25..256) | different meaning; do not map |
| materials, AO, shadows, fog, glow, env map, DOF, colour grading, layer 2/3, texturing | none | page has its own depth-buffer AO/shadows; not driven by GMT values |

Recommendation for v1: carry only formula + camera across; leave the page's look at its own defaults; carry nothing of the look back to GMT.

## 4. Sketch

```ts
// deep-zoom/handoff.ts (sketch - not compiled)
const P = 256n;

export interface DzView {
  cam: [string, string, string];   // BigInt decimal strings, value * 2^256
  yaw: number; pitch: number;
  iters: number; power: number; phase: [number, number];
}
export interface GmtCam {
  sceneOffset: { x: number; y: number; z: number; xL: number; yL: number; zL: number };
  cameraPos: { x: 0; y: 0; z: 0 };
  cameraRot: { x: number; y: number; z: number; w: number };
}
export type HandoffRefusal =
  | 'not-mandelbulb' | 'julia' | 'hybrid' | 'z-twist' | 'radiolaria' | 'non-integer-power' | 'orthographic';

/** double -> fixed point with 256 fractional bits, exact (same algorithm as the page's hp.fromNum). */
export function fromNum(x: number): bigint {
  if (x === 0) return 0n;
  const neg = x < 0; x = Math.abs(x);
  const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
  const bits = dv.getBigUint64(0);
  const exp = Number((bits >> 52n) & 0x7ffn), mant = bits & 0xfffffffffffffn;
  const M = exp === 0 ? mant : mant | 0x10000000000000n;
  const E = exp === 0 ? -1074 : exp - 1075;
  const sh = P + BigInt(E);
  const v = sh >= 0n ? M << sh : M >> -sh;
  return neg ? -v : v;
}
export const toNum = (v: bigint) => Number(v) / 2 ** 256;

export function gmtSceneToDzView(p: {
  formula: string;
  coreMath: { iterations: number; paramA: number; paramD: number; vec2A: { x: number; y: number }; vec2B: { x: number; y: number } };
  geometry: { juliaMode: boolean; hybridMode: boolean };
  optics?: { camType?: number };
  sceneOffset: GmtCam['sceneOffset'];
  cameraPos?: { x: number; y: number; z: number };
  cameraRot: GmtCam['cameraRot'];
}): { view: DzView; lost: string[] } | { refuse: HandoffRefusal } {
  if (p.formula !== 'Mandelbulb') return { refuse: 'not-mandelbulb' };
  if (p.geometry.juliaMode) return { refuse: 'julia' };
  if (p.geometry.hybridMode) return { refuse: 'hybrid' };
  if (Math.abs(p.coreMath.paramD) > 0.001) return { refuse: 'z-twist' };
  if (p.coreMath.vec2B.x > 0.5) return { refuse: 'radiolaria' };
  const power = Math.round(p.coreMath.paramA);
  if (Math.abs(power - p.coreMath.paramA) > 1e-6) return { refuse: 'non-integer-power' };
  if (p.optics && Math.abs((p.optics.camType ?? 0) - 1) < 0.1) return { refuse: 'orthographic' };

  const so = p.sceneOffset, cp = p.cameraPos ?? { x: 0, y: 0, z: 0 };
  const cam = [
    fromNum(so.x) + fromNum(so.xL ?? 0) + fromNum(cp.x),
    fromNum(so.y) + fromNum(so.yL ?? 0) + fromNum(cp.y),
    fromNum(so.z) + fromNum(so.zL ?? 0) + fromNum(cp.z),
  ].map(String) as [string, string, string];

  // forward = q * (0,0,-1)
  const { x, y, z, w } = p.cameraRot;
  const fx = -2 * (x * z + w * y), fy = -2 * (y * z - w * x), fz = -(1 - 2 * (x * x + y * y));
  const pitch = Math.asin(Math.max(-1, Math.min(1, fy)));
  const yaw = Math.hypot(fx, fz) < 1e-9 ? -Math.PI / 2 : Math.atan2(fz, fx);

  // roll = how far q's up is from the page's up; reported, not carried
  const ux = 2 * (x * y - w * z), uy = 1 - 2 * (x * x + z * z), uz = 2 * (y * z + w * x);
  const rx = -Math.sin(yaw), rz = Math.cos(yaw);                 // page right
  const pux = -rz * fy, puy = rz * fx - rx * fz, puz = rx * fy;  // page up = right x fwd
  const roll = Math.atan2(ux * rx + uz * rz, ux * pux + uy * puy + uz * puz);
  const lost = ['field of view (page fixed at 34.1 deg vertical)', 'lights and look'];
  if (Math.abs(roll) > 1e-3) lost.unshift(`roll ${(roll * 180 / Math.PI).toFixed(1)} deg`);

  return { view: { cam, yaw, pitch,
    iters: Math.max(4, Math.min(160, Math.round(p.coreMath.iterations))),
    power, phase: [p.coreMath.vec2A.x, p.coreMath.vec2A.y] }, lost };
}

export function dzViewToGmtCamera(v: DzView): GmtCam & { iterations: number; paramA: number; vec2A: { x: number; y: number } } {
  const split = (s: string) => { const d = toNum(BigInt(s)); const hi = Math.fround(d); return [hi, d - hi]; };
  const [x, xL] = split(v.cam[0]), [y, yL] = split(v.cam[1]), [z, zL] = split(v.cam[2]);
  const ty = -(v.yaw + Math.PI / 2) / 2, tp = v.pitch / 2;
  return {
    sceneOffset: { x, y, z, xL, yL, zL },
    cameraPos: { x: 0, y: 0, z: 0 },
    cameraRot: { x: Math.cos(ty) * Math.sin(tp), y: Math.sin(ty) * Math.cos(tp),
                 z: -Math.sin(ty) * Math.sin(tp), w: Math.cos(ty) * Math.cos(tp) },
    iterations: v.iters, paramA: v.power, vec2A: { x: v.phase[0], y: v.phase[1] },
  };
}
```

Caveat on `toNum`: `Number(v) / 2**256` is the page's own `toNum` and is fine for |pos| of order 1; it loses nothing a double could hold.

## 5. Test vectors

1. **GMT default preset.** sceneOffset {0,0,1 | 0,0,-0.157}, cameraPos {0,0,2.157}, cameraRot identity, paramA 8, iterations 16, vec2A (0,0).
   Expect: cam = ["0", "0", String(fromNum(1) + fromNum(-0.157) + fromNum(2.157))] (value 3.0 to within 1 ulp of the doubles), yaw = -pi/2, pitch = 0, power 8, iters 16, phase [0,0], no roll in `lost`.
2. **Page default round-trip.** View cam = [0, 0, fromNum(2.6)], yaw -pi/2, pitch 0 -> GMT: cameraRot = (0,0,0,1) exactly, sceneOffset.z = fround(2.6), zL = 2.6 - fround(2.6), z + zL === 2.6. Then back -> the same yaw/pitch and the same cam strings.
3. **Yaw only.** cameraRot = rotation about +Y by -90 degrees (x 0, y -0.70710678, z 0, w 0.70710678) -> forward (1,0,0) -> yaw = 0, pitch = 0. And the reverse: yaw 0, pitch 0 -> that quaternion (to 1e-12).
4. **Pitch + yaw, and roll detection.** yaw = 0.3, pitch = -0.4 -> quaternion -> back gives yaw 0.3, pitch -0.4 (1e-12), `lost` has no roll entry. Then post-multiply that quaternion by a 20 degree roll about local Z: yaw and pitch unchanged (1e-9) and `lost[0]` reports roll 20.0 deg (sign to be fixed by the test, either way consistently).
5. **Precision and refusals.**
   (a) View with cam.x = fromNum(0.5) + 1n (one unit in the 256th bit) -> `dzViewToGmtCamera` gives x + xL === 0.5 exactly (the extra bit is lost - asserts the documented loss), and GMT -> page of sceneOffset {x: 1, xL: 1e-12} gives exactly fromNum(1) + fromNum(1e-12) (no double pre-sum rounding).
   (b) Refusals: paramA 8.5 -> 'non-integer-power'; paramD 0.01 -> 'z-twist'; vec2B.x 1 -> 'radiolaria'; juliaMode true -> 'julia'; formula 'Mandelbox' -> 'not-mandelbulb'.
   (c) Phase passes through unchanged: vec2A (0.7, -1.2) -> phase [0.7, -1.2].

One extra numeric check worth a GPU-free unit test: evaluate one iteration of both formulas on the CPU at the point (0.3, -0.5, 0.7) with power 8 and phase (0.4, -0.2); port GMT's GLSL lines above to JS and compare against the page's `deCPU` body - they must agree to 1e-12, which pins "identity transform" as a tested fact, not a reading.

## 6. Open / unverified list
- GMT ray basis in the shader (`ray.ts`) equals the three.js camera basis; `camFov` is vertical degrees.
- `uDeBailout` default 100 is from a code comment in `DE_MASTER`, not from the feature definition.
- GMT `coloring.mode` numbering and any `cscale` equivalence; the page's gradient setter name and stop format.
- The page's accepted power range and whether it clamps pitch on `setView`.
- Whether the level-1 app copy at `public/deep-zoom-core/index.html` is byte-identical to the page read here.
