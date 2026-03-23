// sdf-eval.js — CPU SDF evaluators + Newton vertex projection
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — prototype mesh export

// ============================================================================
// Active formula config — set before calling Newton projection
// ============================================================================
var activeFormula = 'mandelbulb';
var activeFormulaParams = null; // { paramA-F, julia, juliaMode }

// ============================================================================
// mandelbulbDE(px, py, pz, power, iters)
// ============================================================================
function mandelbulbDE(px, py, pz, power, iters) {
  var zx = px, zy = py, zz = pz;
  var dr = 1.0, r;
  for (var i = 0; i < iters; i++) {
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (r > 2.0) {
      return 0.5 * Math.log(r) * r / dr;
    }
    var theta = Math.acos(zz / r);
    var phi = Math.atan2(zy, zx);
    dr = Math.pow(r, power - 1.0) * power * dr + 1.0;
    var zr = Math.pow(r, power);
    theta *= power;
    phi *= power;
    var sinT = Math.sin(theta);
    zx = zr * sinT * Math.cos(phi) + px;
    zy = zr * sinT * Math.sin(phi) + py;
    zz = zr * Math.cos(theta) + pz;
  }
  r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  return -0.5 * r;
}

// ============================================================================
// kaliboxDE(px, py, pz, power, iters, params)
// ============================================================================
function kaliboxDE(px, py, pz, power, iters, params) {
  var scale = params.paramA;
  var minRad2 = params.paramB;
  var offX = params.paramC || 0, offY = params.paramD || 0, offZ = params.paramE || 0;
  var julia = params.julia;
  var hasJulia = params.juliaMode;
  var cx = hasJulia ? julia[0] : px;
  var cy = hasJulia ? julia[1] : py;
  var cz = hasJulia ? julia[2] : pz;
  var x = px, y = py, z = pz;
  var dr = 1.0;
  var absScale = Math.abs(scale);
  var scaleDivMinRad2 = scale / minRad2;
  var absScaleDivMinRad2 = absScale / minRad2;

  for (var i = 0; i < iters; i++) {
    x = Math.abs(x) + offX;
    y = Math.abs(y) + offY;
    z = Math.abs(z) + offZ;

    var r2 = x * x + y * y + z * z;
    var k = Math.max(minRad2 / r2, minRad2);
    if (k > 1.0) k = 1.0;

    x *= k;
    y *= k;
    z *= k;
    dr = dr * k * absScaleDivMinRad2 + 1.0;

    x = x * scaleDivMinRad2 + cx;
    y = y * scaleDivMinRad2 + cy;
    z = z * scaleDivMinRad2 + cz;
  }

  var r = Math.sqrt(x * x + y * y + z * z);
  var de = (r - Math.abs(scale - 1.0)) / dr;
  // For Newton projection, return the raw DE (no threshold).
  // The threshold is only needed for the SDF grid sign detection.
  return de;
}

// ============================================================================
// formulaDE — dispatch to active formula
// ============================================================================
function formulaDE(px, py, pz, power, iters) {
  if (activeFormula === 'kalibox' && activeFormulaParams) {
    return kaliboxDE(px, py, pz, power, iters, activeFormulaParams);
  }
  return mandelbulbDE(px, py, pz, power, iters);
}

// ============================================================================
// sdfGradientTrue — gradient via central differences on active formula
// ============================================================================
function sdfGradientTrue(px, py, pz, power, iters) {
  var h = 1e-5;
  var gx = formulaDE(px + h, py, pz, power, iters) - formulaDE(px - h, py, pz, power, iters);
  var gy = formulaDE(px, py + h, pz, power, iters) - formulaDE(px, py - h, pz, power, iters);
  var gz = formulaDE(px, py, pz + h, power, iters) - formulaDE(px, py, pz - h, power, iters);
  var len = Math.sqrt(gx * gx + gy * gy + gz * gz);
  if (len < 1e-12) return [0, 1, 0];
  var inv = 1.0 / len;
  return [gx * inv, gy * inv, gz * inv];
}

// ============================================================================
// newtonProject — project point onto isosurface with safety guards
// ============================================================================
function newtonProject(vx, vy, vz, power, iters, steps, maxDist) {
  if (steps === undefined) steps = 6;
  if (maxDist === undefined) maxDist = 0.05;
  var ox = vx, oy = vy, oz = vz;
  var prevAbsD = Infinity;
  for (var i = 0; i < steps; i++) {
    var d = formulaDE(vx, vy, vz, power, iters);
    var absD = Math.abs(d);
    if (absD < 1e-8) break;
    if (absD > prevAbsD * 1.5) break;
    prevAbsD = absD;
    var g = sdfGradientTrue(vx, vy, vz, power, iters);
    var nx = vx - d * g[0];
    var ny = vy - d * g[1];
    var nz = vz - d * g[2];
    var dx = nx - ox, dy = ny - oy, dz = nz - oz;
    var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist > maxDist) break;
    vx = nx; vy = ny; vz = nz;
  }
  return [vx, vy, vz];
}

// ============================================================================
// projectMeshVertices — project all mesh vertices onto isosurface
// ============================================================================
function projectMeshVertices(mesh, power, iters, onProgress) {
  var positions = mesh.positions;
  var normals = mesh.normals;
  var vertexCount = mesh.vertexCount;

  for (var v = 0; v < vertexCount; v++) {
    if (onProgress && (v & 0xFFF) === 0) {
      onProgress(Math.round(100 * v / vertexCount));
    }

    var v3 = v * 3;
    var px = positions[v3], py = positions[v3 + 1], pz = positions[v3 + 2];
    var proj = newtonProject(px, py, pz, power, iters, 6);

    positions[v3] = proj[0];
    positions[v3 + 1] = proj[1];
    positions[v3 + 2] = proj[2];

    var g = sdfGradientTrue(proj[0], proj[1], proj[2], power, iters);
    normals[v3] = g[0];
    normals[v3 + 1] = g[1];
    normals[v3 + 2] = g[2];
  }

  return mesh;
}
