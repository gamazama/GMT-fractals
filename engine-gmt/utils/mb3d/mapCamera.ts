/**
 * MB3D camera-pose → GMT Orbit-camera mapping (the `map` stage, camera half).
 *
 * Reconstructs the MB3D scene's actual camera so an imported scene frames EXACTLY
 * like Mandelbulb3D instead of the centered default. The orientation comes from
 * MB3D's stored navigation matrix `hVGrads` (the 3×3 view basis) — NOT the
 * `dXWrot/dYWrot/dZWrot` header fields, which are the unrelated *4D* rotation and
 * are 0 for almost every scene (reading them was why imports framed front-on).
 *
 * The math is reverse-engineered from MB3D's per-pixel ray generation and camera
 * setup (Pascal source): `CalcVGradsFromHeader8rots`/`CalcCamPos` HeaderTrafos.pas,
 * `RMCalculateStartPos` Calc.pas, `CalcStepWidth` DivUtils.pas. See
 * `plans/mb3d/camera-import-spec.md`.
 *
 * @invariant hVGrads is ROW-MAJOR (Math3D.pas TMatrix3 = array[0..2,0..2]). Row 0
 *   = screen-X gradient (camera RIGHT, +), row 1 = screen-Y gradient (camera UP
 *   is its NEGATION — screen-Y runs top→down in MB3D), row 2 = depth gradient
 *   (camera FORWARD / view dir, +). The stored rows are scaled by ~stepWidth·25/24
 *   (a bCalc3D FOV factor) — NORMALIZE each row to unit length before use; never
 *   trust the stored magnitude.
 * @invariant HANDEDNESS — with {right=+row0̂, up=−row1̂, view=+row2̂}, right×up =
 *   −view, which is exactly THREE's right-handed camera convention (local +X×+Y =
 *   +Z = −viewDir). So NO world-Z negation is applied anywhere (positions and the
 *   pivot are used directly); the only sign correction is up = −row1̂. An earlier
 *   "negate world-Z + lookAt" version double-flipped — the ray-gen is the truth.
 * @invariant Degenerate fallback — a zoom ≤ 0, a missing/short hVGrads, a
 *   non-orthonormal basis, a non-finite pose, or a non-positive orbit distance
 *   returns the centered default (never a black/stuck camera). Stereo / pano
 *   headers are out of scope (mono perspective assumed).
 *
 * @see docs/adr/0083-mb3d-importer.md
 * @see plans/mb3d/camera-import-spec.md
 */
import * as THREE from 'three';
import type { MB3DHeader } from './parseMB3D';

export interface MB3DCameraPose {
  /** World position of the camera (absorbed into `sceneOffset` on load). */
  cameraPos: { x: number; y: number; z: number };
  /** THREE quaternion — camera looks down local −Z, up +Y. */
  cameraRot: { x: number; y: number; z: number; w: number };
  /** Orbit radius (camera→pivot distance), world units. */
  targetDistance: number;
  /** Vertical field of view, degrees → `optics.camFov`. */
  fov: number;
}

/** Centered default — matches emitFusedHybrid's neutral scaffold (origin, ~2.16 back). */
const CENTERED_DEFAULT: MB3DCameraPose = {
  cameraPos: { x: 0, y: 0, z: 2.157 },
  cameraRot: { x: 0, y: 0, z: 0, w: 1 },
  targetDistance: 2.157,
  fov: 60,
};

/** GMT `optics.camFov` is clamped 10..150; MB3D fovY ≤ 0 means "unset". */
const sanitizeFov = (fovY: number): number =>
  Number.isFinite(fovY) && fovY >= 10 ? Math.min(150, fovY) : 60;

/**
 * Expand MB3D's row-major quaternion → 3×3 rotation matrix (CreateMatrixFromQuat,
 * Math3D.pas:3142) — used only on the `bNewOptions & 1` (mandId > 43) path where
 * hVGrads holds a quaternion (x,y,z,w) instead of a matrix. Round-tripping through
 * the matrix (rather than reusing the quaternion directly) keeps MB3D's basis
 * convention so the same row→axis mapping below applies.
 */
function quatToRows(q: number[]): number[] {
  const [x, y, z, w] = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), // row0
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (z * y + x * w), // row1
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), // row2
  ];
}

/**
 * Map an MB3D header's camera fields to a GMT Orbit pose. Falls back to the
 * centered default on any degenerate input (see the file invariants).
 */
export function mapMB3DCamera(header: MB3DHeader): MB3DCameraPose {
  const { zoom, fovY, midX, midY, midZ, dZstart, width, height, mandId, bNewOptions, hVGrads } = header;
  if (!(zoom > 0) || !Array.isArray(hVGrads) || hVGrads.length < 9) return { ...CENTERED_DEFAULT };

  // bNewOptions bit1 (mandId > 43): hVGrads@246 holds a quaternion, not a matrix.
  const g = (mandId > 43 && (bNewOptions & 1)) ? quatToRows(hVGrads.slice(0, 4)) : hVGrads;
  const rowVec = (i: number) => new THREE.Vector3(g[i * 3], g[i * 3 + 1], g[i * 3 + 2]);

  const right = rowVec(0).normalize();                       // +row0 (screen-X)
  const up = rowVec(1).normalize().multiplyScalar(-1);        // −row1 (screen-Y is top→down)
  const view = rowVec(2).normalize();                         // +row2 (forward / view dir)
  if (![right, up, view].every((v) => Number.isFinite(v.x) && v.lengthSq() > 0.5)) {
    return { ...CENTERED_DEFAULT };
  }

  // THREE world-rotation basis: columns are the camera's local axes in world
  // space — [right, up, back] where back = −view (THREE camera local +Z = back).
  const m = new THREE.Matrix4().makeBasis(right, up, view.clone().multiplyScalar(-1));
  const q = new THREE.Quaternion().setFromRotationMatrix(m);

  // CalcCamPos (HeaderTrafos.pas:109): eye = mid + view·startoff. stepWidth must
  // be recomputed (the stored @154 / hVGrads magnitudes aren't trustworthy);
  // VPoff is the FOV-dependent view-plane→eye pushback.
  const stepWidth = 2.1345 / (zoom * width);
  const fovHalf = Math.min(Math.abs(fovY), 180) * Math.PI / 180 * 0.5;
  const VPoff = stepWidth * height * 0.5 * Math.cos(fovHalf) / Math.max(0.01, Math.sin(fovHalf));
  const startoff = dZstart - midZ - VPoff;                    // negative → eye behind the pivot
  const mid = new THREE.Vector3(midX, midY, midZ);
  const camPos = mid.clone().add(view.clone().multiplyScalar(startoff));
  const dist = mid.distanceTo(camPos);                        // = |startoff|

  const pose: MB3DCameraPose = {
    cameraPos: { x: camPos.x, y: camPos.y, z: camPos.z },
    cameraRot: { x: q.x, y: q.y, z: q.z, w: q.w },
    targetDistance: dist,
    fov: sanitizeFov(fovY),
  };

  const finite = [camPos.x, camPos.y, camPos.z, q.x, q.y, q.z, q.w].every(Number.isFinite);
  if (!finite || !(dist > 0)) return { ...CENTERED_DEFAULT };

  return pose;
}
