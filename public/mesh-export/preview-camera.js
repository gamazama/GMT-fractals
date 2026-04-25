// preview-camera.js — Orthographic camera, projection, and snap math
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — mesh export prototype
//
// Provides:
//   Vec3: sub3, add3, dot3, scale3, cross3, normalize3, len3
//   Camera: orthoCamBasis(angle, pitch, camDist)
//   Projection: orthoProject(p, angle, pitch, camDist, w, h)
//              orthoUnprojectDelta(dxPx, dyPx, angle, pitch, camDist, h)
//   Snap: SNAP_TARGETS, SNAP_THRESH, normAngle(a), findAxisSnap(angle, pitch, threshold)

// ============================================================================
// Vec3 helpers
// ============================================================================

function sub3(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function add3(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function dot3(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function scale3(v, s) { return [v[0]*s, v[1]*s, v[2]*s]; }
function cross3(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function normalize3(v) { var l = Math.sqrt(dot3(v, v)); return l > 0 ? [v[0]/l, v[1]/l, v[2]/l] : [0,0,1]; }
function len3(v) { return Math.sqrt(dot3(v, v)); }

// ============================================================================
// Orthographic Camera Basis
// ============================================================================

/**
 * Compute orthographic camera basis from angle/pitch.
 * Right is always in the XZ plane (derived from angle alone) — no gimbal lock at poles.
 * @param {number} angle  - yaw in radians
 * @param {number} pitch  - pitch in radians (±π/2 for top/bottom)
 * @returns {{ pos: number[], fwd: number[], right: number[], up: number[] }}
 */
function orthoCamBasis(angle, pitch) {
  var ca = Math.cos(angle), sa = Math.sin(angle);
  var cp = Math.cos(pitch), sp = Math.sin(pitch);
  var right = [ca, 0, -sa];
  var fwd = [-cp * sa, -sp, -cp * ca];
  var up = cross3(right, fwd);
  var pos = sub3([0, 0, 0], scale3(fwd, 10));
  return { pos: pos, fwd: fwd, right: right, up: up };
}

// ============================================================================
// Projection
// ============================================================================

/**
 * Project 3D point to 2D canvas coords (orthographic).
 * Shader convention: res.y pixels spans camDist world units.
 * @param {number[]} p      - 3D world point
 * @param {number} angle    - camera yaw
 * @param {number} pitch    - camera pitch
 * @param {number} camDist  - ortho half-extent
 * @param {number} w        - canvas width in pixels
 * @param {number} h        - canvas height in pixels
 * @returns {number[]} [sx, sy] screen coords
 */
function orthoProject(p, angle, pitch, camDist, w, h) {
  var cam = orthoCamBasis(angle, pitch);
  var v = sub3(p, cam.pos);
  var dx = dot3(v, cam.right);
  var dy = dot3(v, cam.up);
  var s = h / camDist;
  return [w * 0.5 + dx * s, h * 0.5 - dy * s];
}

/**
 * Unproject 2D pixel delta to 3D world delta along camera right/up axes.
 * @param {number} dxPx    - pixel delta X
 * @param {number} dyPx    - pixel delta Y
 * @param {number} angle   - camera yaw
 * @param {number} pitch   - camera pitch
 * @param {number} camDist - ortho half-extent
 * @param {number} h       - canvas height in pixels
 * @returns {number[]} 3D world delta
 */
function orthoUnprojectDelta(dxPx, dyPx, angle, pitch, camDist, h) {
  var s = h / camDist;
  var cam = orthoCamBasis(angle, pitch);
  var wx = dxPx / s, wy = -dyPx / s;
  return add3(scale3(cam.right, wx), scale3(cam.up, wy));
}

// ============================================================================
// Axis Snap
// ============================================================================

var HP = Math.PI * 0.5;

/** 6 cardinal axis snap targets. Pitch ±π/2 for true top/bottom. */
var SNAP_TARGETS = [
  { angle: 0,         pitch: 0,    label: 'Front (-Z)' },
  { angle: Math.PI,   pitch: 0,    label: 'Back (+Z)' },
  { angle: HP,        pitch: 0,    label: 'Right (+X)' },
  { angle: -HP,       pitch: 0,    label: 'Left (-X)' },
  { angle: 0,         pitch: HP,   label: 'Top (+Y)' },
  { angle: 0,         pitch: -HP,  label: 'Bottom (-Y)' }
];

/** Default snap threshold: 15 degrees */
var SNAP_THRESH = 15 * Math.PI / 180;

/** Normalize angle to [-PI, PI] */
function normAngle(a) {
  a = a % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Find closest axis snap target within threshold radians, or null.
 * For top/bottom targets, only pitch matters (preserves current yaw).
 * @param {number} angle
 * @param {number} pitch
 * @param {number} threshold
 * @returns {{ angle: number, pitch: number, label: string } | null}
 */
function findAxisSnap(angle, pitch, threshold) {
  var a = normAngle(angle);
  var best = null, bestDist = Infinity;
  for (var i = 0; i < SNAP_TARGETS.length; i++) {
    var t = SNAP_TARGETS[i];
    var da, dp;
    if (Math.abs(t.pitch) > 1.0) {
      da = 0;
      dp = Math.abs(pitch - t.pitch);
    } else {
      da = Math.abs(normAngle(a - t.angle));
      dp = Math.abs(pitch - t.pitch);
    }
    var dist = Math.sqrt(da * da + dp * dp);
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
