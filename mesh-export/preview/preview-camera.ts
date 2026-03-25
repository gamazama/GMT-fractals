// Converted from prototype preview-camera.js
// Orthographic camera, projection, and snap math
// GMT Fractal Explorer — mesh export
//
// Provides:
//   Vec3: sub3, add3, dot3, scale3, cross3, normalize3, len3
//   Camera: orthoCamBasis(angle, pitch)
//   Projection: orthoProject(p, angle, pitch, camDist, w, h)
//              orthoUnprojectDelta(dxPx, dyPx, angle, pitch, camDist, h)
//   Snap: SNAP_TARGETS, SNAP_THRESH, normAngle(a), findAxisSnap(angle, pitch, threshold)

// ============================================================================
// Types
// ============================================================================

export type Vec3 = [number, number, number];

export interface CamBasis {
  pos: Vec3;
  fwd: Vec3;
  right: Vec3;
  up: Vec3;
}

export interface SnapTarget {
  readonly angle: number;
  readonly pitch: number;
  readonly label: string;
}

// ============================================================================
// Vec3 helpers
// ============================================================================

export function sub3(a: Vec3, b: Vec3): Vec3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
export function add3(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
export function dot3(a: Vec3, b: Vec3): number { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
export function scale3(v: Vec3, s: number): Vec3 { return [v[0]*s, v[1]*s, v[2]*s]; }
export function cross3(a: Vec3, b: Vec3): Vec3 { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
export function normalize3(v: Vec3): Vec3 { const l = Math.sqrt(dot3(v, v)); return l > 0 ? [v[0]/l, v[1]/l, v[2]/l] : [0,0,1]; }
export function len3(v: Vec3): number { return Math.sqrt(dot3(v, v)); }

// ============================================================================
// Orthographic Camera Basis
// ============================================================================

/**
 * Compute orthographic camera basis from angle/pitch.
 * Right is always in the XZ plane (derived from angle alone) — no gimbal lock at poles.
 */
export function orthoCamBasis(angle: number, pitch: number): CamBasis {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const right: Vec3 = [ca, 0, -sa];
  const fwd: Vec3 = [-cp * sa, -sp, -cp * ca];
  const up: Vec3 = cross3(right, fwd);
  const pos: Vec3 = sub3([0, 0, 0], scale3(fwd, 10));
  return { pos, fwd, right, up };
}

// ============================================================================
// Projection
// ============================================================================

/**
 * Project 3D point to 2D canvas coords (orthographic).
 * Shader convention: res.y pixels spans camDist world units.
 */
export function orthoProject(p: Vec3, angle: number, pitch: number, camDist: number, w: number, h: number): Vec3 {
  const cam = orthoCamBasis(angle, pitch);
  const v = sub3(p, cam.pos);
  const dx = dot3(v, cam.right);
  const dy = dot3(v, cam.up);
  const s = h / camDist;
  return [w * 0.5 + dx * s, h * 0.5 - dy * s, 0];
}

/**
 * Unproject 2D pixel delta to 3D world delta along camera right/up axes.
 */
export function orthoUnprojectDelta(dxPx: number, dyPx: number, angle: number, pitch: number, camDist: number, h: number): Vec3 {
  const s = h / camDist;
  const cam = orthoCamBasis(angle, pitch);
  const wx = dxPx / s, wy = -dyPx / s;
  return add3(scale3(cam.right, wx), scale3(cam.up, wy));
}

// ============================================================================
// Axis Snap
// ============================================================================

const HP = Math.PI * 0.5;

/** 6 cardinal axis snap targets. Pitch +/-pi/2 for true top/bottom. */
export const SNAP_TARGETS = [
  { angle: 0,         pitch: 0,    label: 'Front (-Z)' },
  { angle: Math.PI,   pitch: 0,    label: 'Back (+Z)' },
  { angle: HP,        pitch: 0,    label: 'Right (+X)' },
  { angle: -HP,       pitch: 0,    label: 'Left (-X)' },
  { angle: 0,         pitch: HP,   label: 'Top (+Y)' },
  { angle: 0,         pitch: -HP,  label: 'Bottom (-Y)' }
] as const;

/** Default snap threshold: 15 degrees */
export const SNAP_THRESH: number = 15 * Math.PI / 180;

/** Normalize angle to [-PI, PI] */
export function normAngle(a: number): number {
  a = a % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Find closest axis snap target within threshold radians, or null.
 * For top/bottom targets, only pitch matters (preserves current yaw).
 */
export function findAxisSnap(angle: number, pitch: number, threshold: number): SnapTarget | null {
  const a = normAngle(angle);
  let best: SnapTarget | null = null, bestDist = Infinity;
  for (let i = 0; i < SNAP_TARGETS.length; i++) {
    const t = SNAP_TARGETS[i];
    let da: number, dp: number;
    if (Math.abs(t.pitch) > 1.0) {
      da = 0;
      dp = Math.abs(pitch - t.pitch);
    } else {
      da = Math.abs(normAngle(a - t.angle));
      dp = Math.abs(pitch - t.pitch);
    }
    const dist = Math.sqrt(da * da + dp * dp);
    if (dist < threshold && dist < bestDist) {
      bestDist = dist;
      best = {
        angle: (Math.abs(t.pitch) > 1.0) ? a : t.angle,
        pitch: t.pitch,
        label: t.label
      };
    }
  }
  return best;
}
