/**
 * MB3D lighting → GMT preset mapping (the `map` stage, lighting half).
 *
 * Reconstructs the scene's authored lights so an imported MB3D scene is lit like
 * Mandelbulb3D instead of inheriting GMT's neutral 3-point `DEFAULT_LIGHTS` rig
 * (which over-lights deep-zoom interiors — the Hyperben2 washout — and washes out
 * every import to flat grey). L1 maps LIGHTS only; material/ambient/fog (L2) and the
 * per-iteration palette (L3) follow. Returns `{ lights: [] }` for a headerless /
 * standalone load so the preset keeps DEFAULT_LIGHTS (mirrors mapCamera's centered
 * fallback).
 *
 * Frame (verified against MB3D Pascal):
 * - **Positional** (`Loption & 4`): world position `(LXpos,LYpos,LZpos)` is mid-relative
 *   (`HeaderTrafos.pas:1360` subtracts `lvMidPos`). The fractal renders at the origin in
 *   GMT and the camera map absorbs `mid` into `sceneOffset`, so the mid-relative position
 *   is already in GMT's light frame → a world-fixed Point light.
 * - **Global / directional** (`Loption & 4 == 0`): the direction is built VIEWER-RELATIVE
 *   (`BuildViewVectorFOV(LYpos,−LXpos)` then sign-flip, `HeaderTrafos.pas:1364`), i.e. it
 *   tracks the camera — exactly GMT's `fixed:true` "headlamp" (UniformManager applies
 *   `cam.quaternion` to a fixed light's direction). So we emit the viewer-space toward-light
 *   vector as a Directional light's rotation and let GMT re-apply the camera. An
 *   object-absolute light (`Loption & 0x20`) is world-fixed → `fixed:false`.
 *
 * @see plans/mb3d/research/lighting-import-spec.md
 * @see docs/adr/0083-mb3d-importer.md
 */
import * as THREE from 'three';
import type { MB3DHeader, MB3DLight } from './parseMB3D';
import type { MB3DCameraPose } from './mapCamera';
import type { LightParams, GradientStop } from '../../types/graphics';

export interface MB3DLightingResult {
  /** [] ⇒ inherit DEFAULT_LIGHTS (standalone / degenerate header). */
  lights: LightParams[];
  /** Material overrides (roughness/diffuse/specular + a graded env ambient). Present only
   *  when the scene carries real lighting data; absent ⇒ inherit material defaults. */
  material?: Record<string, unknown>;
  /** Coloring overrides (the LCols surface palette → gradient). Approximate: MB3D's full
   *  ramp is often an external `.map`; only the 10 in-header anchors survive. */
  coloring?: Record<string, unknown>;
  /** Atmosphere (fog) overrides — MB3D depth-cue / dynamic fog → GMT distance fog.
   *  Present only when the scene authored fog; absent ⇒ inherit atmosphere defaults. */
  atmosphere?: Record<string, unknown>;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** HSV-style saturation of an `#RRGGBB` colour (0 = grey, 1 = fully saturated). */
function hexSaturation(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

/** Relative luminance of an `#RRGGBB` colour (0 = black, 1 = white). */
function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** GMT camera-local forward (lights point down −Z by default; UniformManager negates
 *  to "toward light"). */
const FORWARD = new THREE.Vector3(0, 0, -1);

/**
 * Empirical intensity factor: MB3D's `Lamp` is scaled by a width-dependent term
 * (`1000·Lamp/Width` poslight, `300·Lamp/Width` global — unit-incompatible with GMT),
 * so we drop that and renormalise the raw amplitude. GMT's DEFAULT_LIGHTS key runs 1.5;
 * MB3D amps cluster ~0.4–1.5, so ~1.0 keeps a single key roughly GMT-bright while letting
 * the scene's relative amps through. Calibrated against Torii / ABoxScale2 / Hyperben2.
 */
const K_LIGHT = 1.1;

const v3 = (x: number, y: number, z: number) => ({ x, y, z });

/** One MB3D light → a GMT LightParams (id/temperature backfilled by normalizeLights). */
function mapLight(l: MB3DLight): LightParams {
  const base = {
    color: l.color,
    intensity: Math.max(0, l.amp * K_LIGHT),
    falloff: 0,
    falloffType: 'Quadratic' as const,
    visible: true,
    castShadow: l.hardShadow,
    useTemperature: false,
    radius: 0,
    softness: 0,
  };

  if (l.positional) {
    // Mid-relative world position; the fractal sits at the origin in GMT's frame.
    return { ...base, type: 'Point', position: v3(l.x, l.y, l.z), rotation: v3(0, 0, 0), fixed: false };
  }

  // Global: viewer-space toward-light vector LN (HeaderTrafos.pas:1364, post sign-flip).
  // ax = LXpos, ay = LYpos (radians). MB3D screen-Y runs top→down (see mapCamera), so flip
  // Y into GMT's +Y-up camera space.
  const ax = l.x, ay = l.y;
  const toward = new THREE.Vector3(-Math.sin(ax), Math.sin(ay), -Math.cos(ax) * Math.cos(ay)).normalize();
  // GMT stores "toward light" = −(FORWARD·rot); so FORWARD must rotate to (−toward).
  const q = new THREE.Quaternion().setFromUnitVectors(FORWARD, toward.clone().negate());
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  return {
    ...base,
    type: 'Directional',
    position: v3(0, 0, 0),
    rotation: v3(e.x, e.y, e.z),
    // viewer-relative → headlamp (fixed:true); object-absolute → world-fixed.
    fixed: !l.absAngles,
  };
}

/**
 * MB3D material scalars → GMT materials (L2). All verified against HeaderTrafos.pas:
 * - roughness = `RoughnessFactor/255` (TypeDefinitions.pas:260 "0..255 = 0..1"; the
 *   internal `/255²` is a spec-spread factor, not the artist roughness).
 * - diffuse   = `TBpos[5]·0.02`            (HeaderTrafos.pas:1421, "sDiff").
 * - specular  = `max(0.004,(TBpos[7]&0xFFF)·0.02)` (`:1422`, "sSpec").
 * - ambient   = `AmbCol/AmbCol2` graded by N.y, scaled by `(TBpos[8]&0xFFF)/90` (`:1398`).
 *   GMT has no diffuse-ambient knob, so approximate it as a procedural env (sky) gradient
 *   — for the matte surfaces most imports use it reads as a soft ambient fill. Kept GENTLE
 *   (a fraction of the MB3D multiplier) so it doesn't undo the glow-off contrast.
 * `tbpos` is `TBpos[3..11]`, so `TBpos[n]` lives at `tbpos[n-3]`.
 */
function mapMaterial(h: MB3DHeader): Record<string, unknown> {
  const tb = (n: number) => h.tbpos[n - 3] ?? 0;
  const roughness = clamp(h.roughnessFactor / 255, 0.02, 1);
  const diffuse = clamp((tb(5) || 50) * 0.02, 0, 2);                  // default TB5≈50 → 1.0
  const specular = clamp(Math.max(0.004, (tb(7) & 0xfff) * 0.02), 0, 2);
  const ambMul = (tb(8) & 0xfff) / 90;                                // MB3D ambient multiplier
  const mat: Record<string, unknown> = { roughness, diffuse, specular };
  // Graded env ambient from AmbCol2 (bottom) → AmbCol (top), if the scene authored one.
  if (h.ambCol && h.ambCol2) {
    const stops: GradientStop[] = [
      { id: 'mb3dAmbBot', position: 0, color: h.ambCol2 },
      { id: 'mb3dAmbTop', position: 1, color: h.ambCol },
    ];
    mat.envSource = 1;                                                // procedural gradient
    mat.envGradientStops = stops;
    mat.envStrength = clamp(ambMul * 0.5, 0, 1.5);                    // gentle (keep contrast)
    mat.envBackgroundStrength = 0;                                    // black background (no sky behind)
  }
  return mat;
}

/**
 * MB3D surface palette (`LCols` anchors) → GMT coloring gradient (L3). MB3D colours the
 * fractal by smoothed iteration through a 10-anchor, position-keyed gradient stored in the
 * header (`PaintThread.pas:383`). We map each anchor's diffuse colour (`ColorDif`) at its
 * normalised position into a GMT GradientStop and colour by Iterations (mode 1, MB3D's
 * default). APPROXIMATE: the artist's full ramp is frequently an external `.map`; only the
 * in-header anchors are available, so the band positions can differ from MB3D's render.
 */
function mapColoring(h: MB3DHeader): Record<string, unknown> | undefined {
  const raw = h.colStops ?? [];
  if (raw.length === 0) return undefined;
  const sorted = raw
    .map((c) => ({ position: clamp(c.pos / 32767, 0, 1), color: c.colorDif }))
    .sort((a, b) => a.position - b.position);
  // Drop "parked" duplicate slots (MB3D leaves unused anchors clustered at one position).
  const stops: GradientStop[] = [];
  for (const s of sorted) {
    const prev = stops[stops.length - 1];
    if (prev && Math.abs(prev.position - s.position) < 0.004 && prev.color === s.color) continue;
    stops.push({ id: `mb3dCol${stops.length}`, position: s.position, color: s.color });
  }
  if (stops.length < 2) return undefined; // a single flat colour adds nothing over material
  // SATURATION GATE: when the artist colours from an external `.map`, the in-header LCols
  // anchors are left as near-grey placeholders (Genetic Menger is grey here but renders
  // GREEN from its .map). Importing those produces a muddy wrong tint, worse than neutral.
  // Only adopt the gradient when at least one anchor is genuinely saturated (a real
  // in-header palette, e.g. Theli's tan/mauve/green). Otherwise keep GMT's default.
  const maxSat = Math.max(...stops.map((s) => hexSaturation(s.color)));
  if (maxSat < 0.22) return undefined;
  // Cover the full 0..1 axis so the ends don't snap to GMT's default.
  if (stops[0].position > 0.001) stops.unshift({ id: 'mb3dCol_s', position: 0, color: stops[0].color });
  if (stops[stops.length - 1].position < 0.999) stops.push({ id: 'mb3dCol_e', position: 1, color: stops[stops.length - 1].color });
  const cycling = (h.tbOptions & 0x4000) !== 0;
  return {
    gradient: stops,
    mode: 1, // Iterations (MB3D's default SIgradient axis); orbit-trap mode is rare
    repeats: cycling ? 2 : 1,
  };
}

/**
 * MB3D depth-cue / dynamic fog → GMT distance fog. MB3D fades distant surfaces toward
 * `DepthCol2` linearly in depth (`sDepth = TBpos[4]·0.8e-6`, HeaderTrafos.pas:1292), or
 * toward `DynFog` when the dynamic-fog gradient `TBpos[6] ≠ 53` (the neutral point;
 * `sShadGr = (TBpos[6]−53)·…`, HeaderTrafos.pas:1304). GMT fog is
 * `smoothstep(near,far,d)·intensity` toward `uFogColor`, `d` in world units. We anchor
 * near/far to `targetDistance` (GMT's world scale) — NOT raw MB3D Zpos — and approximate
 * MB3D's full depth curve with a single smoothstep band.
 *
 * Returns undefined when no fog is authored (TBpos[4]=0 AND TBpos[6]=53) so those scenes
 * keep GMT's atmosphere defaults (fog off) byte-for-byte. Single-band approximation: the
 * `bFarFog` curve and 2nd dynamic-fog colour are dropped. NEAR_K/FAR_K/INT_* CALIBRATE
 * against the ref renders (TimeMachine DepthCol2 blue sky, Genetic Menger DynFog green).
 */
function mapFog(h: MB3DHeader, cam: MB3DCameraPose): Record<string, unknown> | undefined {
  const sDepth = (h.tbpos[1] ?? 0) * 0.8e-6;        // TBpos[4]·0.8e-6 (depth-cue amplitude)
  const tb6 = h.tbpos[3] ?? 0;                       // TBpos[6] (53 = neutral / no dynamic fog)
  const hasDynFog = tb6 !== 53 && tb6 !== 0;
  if (Math.abs(sDepth) < 1e-10 && !hasDynFog) return undefined;   // gate: only when fog authored
  const td = cam.targetDistance || 2.157;
  // COLOUR: MB3D's depth fade is toward DepthCol2 (the depth-cue background). DynFog
  // overrides it ONLY when it's a genuinely authored colour — white (#ffffff) is the
  // unset default (≈half the scenes) and would wash the subject white, so fall back to
  // DepthCol2 there. (Matches the refs: Genetic Menger's green DynFog, TimeMachine's blue
  // DepthCol2, Ellarien's orange DepthCol2 even though it carries a token dyn amplitude.)
  const dynCol = hasDynFog && h.dynFog.toLowerCase() !== '#ffffff' ? h.dynFog : null;
  const fogColor = dynCol ?? h.depthCol2;
  // INTENSITY: governs both the background fill (miss rays get full smoothstep → intensity·
  // fogColor over black) and the foreground depth haze. Dynamic fog scales with the gradient
  // amplitude |TBpos[6]−53|; plain depth-cue uses a fixed moderate value.
  // WHITE GUARD: a near-white fog colour (BatJorge DepthCol2 #ffffff, LightBulbMoon #baedfe)
  // washes structure toward max brightness instead of tinting it — luminance ≈ 1 kills
  // contrast everywhere, devastating full-frame "landscape" scenes that have no background
  // to fill. Such fog is haze, not a scene colour, so apply it gently. Mid-tone colours
  // (green/blue/orange/grey, luminance ≈ 0.6) — the actual atmosphere wins (Genetic Menger,
  // TimeMachine, Hyperben2) — keep full strength (guard = 1 below luminance 0.8).
  // The dominant washout source is the BACKGROUND FILL, not the band: with
  // envBackgroundStrength=0 (mapMaterial) the shader fogs miss rays too (d=MISS_DIST →
  // smoothstep saturates → the whole black void fills with intensity·fogColor). On a scene
  // whose subject doesn't fill the frame that full-frame fill drowns contrast. So the
  // depth-cue base is kept GENTLE (0.35, was 0.55) and the white-guard starts earlier.
  const lum = hexLuminance(fogColor);
  const whiteGuard = lum > 0.6 ? 1 - 0.7 * ((lum - 0.6) / 0.4) : 1;   // 1 → 0.30 across [0.6,1]
  const intensity = clamp((hasDynFog ? Math.max(0.2, Math.abs(tb6 - 53) * 0.012) : 0.35) * whiteGuard, 0, 0.55);
  // SPATIAL: anchor to targetDistance (GMT world scale). near is set PAST the subject
  // (1.3·td) so bounded objects stay fully crisp — the subject sits at ≈td, only its deepest
  // tail fogs (TimeMachine's metalwork, Genetic Menger's cube must stay sharp, not hazed);
  // far well behind (5·td) lets the (black) background fill toward the fog colour. Landscape
  // compositions whose surface sweeps to the horizon (BatJorge) still fade at distance —
  // that's correct atmospheric perspective, kept gentle by the moderate intensity. NOT
  // clamped to the fog slider max (10) — the uniform takes any positive distance, and
  // clamping over-fogs far scenes (TimeMachine td=22) and collapses near≈far on deep-zoom.
  // SPATIAL band — SOURCE-DERIVED (was guessed 1.3·td / 5·td). MB3D depth-fog starts at the
  // depth-buffer plane Zpos16=28000 and saturates at Zpos16=28000−1/sDepth (PaintThread.pas:619/645);
  // converted to GMT world distance via the camera's stepWidth/VPoff (mapCamera.ts:103-109, the
  // GetZPos quadratic DivUtils.pas:1052) and evaluated across the decoded fixtures, onset ≈ 0.79·td
  // and saturation ≈ 5.8·td (medians). 5.8 is the one free anchor (sat/td varies 2.5–20 with sDepth).
  const fogNear = Math.max(0.02, td * 0.79);
  const fogFar = Math.max(fogNear + 0.05, td * 5.8);
  return { fogIntensity: intensity, fogNear, fogFar, fogColor };
}

/**
 * Map a header's active lights + material + palette + fog to GMT preset features. Empty
 * when no light is on (or a standalone/degenerate header) → caller omits everything and
 * keeps DEFAULT_LIGHTS + default material/coloring/atmosphere.
 */
export function mapMB3DLighting(h: MB3DHeader, cam: MB3DCameraPose): MB3DLightingResult {
  const active = (h.lights ?? []).filter((l) => l.on);
  if (active.length === 0) return { lights: [] };
  const coloring = mapColoring(h);
  const atmosphere = mapFog(h, cam);
  return {
    lights: active.map(mapLight),
    material: mapMaterial(h),
    ...(coloring ? { coloring } : {}),
    ...(atmosphere ? { atmosphere } : {}),
  };
}
