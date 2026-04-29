// sdf-eval.ts — CPU SDF evaluators + Newton vertex projection
// Converted from prototype sdf-eval.js
// GMT Fractal Explorer — mesh export

// ============================================================================
// Types
// ============================================================================

export interface FormulaParams {
  paramA: number;
  paramB: number;
  paramC: number;
  paramD: number;
  paramE: number;
  paramF: number;
  julia: [number, number, number];
  juliaMode: boolean;
}

export interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  vertexCount: number;
}

// ============================================================================
// Active formula config — set before calling Newton projection
// ============================================================================
let activeFormula: string = 'mandelbulb';
let activeFormulaParams: FormulaParams | null = null;

export function setActiveFormula(f: string): void {
  activeFormula = f;
}

export function setActiveFormulaParams(p: FormulaParams | null): void {
  activeFormulaParams = p;
}

// ============================================================================
// mandelbulbDE(px, py, pz, power, iters)
// ============================================================================
export function mandelbulbDE(px: number, py: number, pz: number, power: number, iters: number): number {
  let zx = px, zy = py, zz = pz;
  let dr = 1.0, r: number;
  for (let i = 0; i < iters; i++) {
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (r > 2.0) {
      return 0.5 * Math.log(r) * r / dr;
    }
    const theta = Math.acos(zz / r);
    const phi = Math.atan2(zy, zx);
    dr = Math.pow(r, power - 1.0) * power * dr + 1.0;
    const zr = Math.pow(r, power);
    const thetaP = theta * power;
    const phiP = phi * power;
    const sinT = Math.sin(thetaP);
    zx = zr * sinT * Math.cos(phiP) + px;
    zy = zr * sinT * Math.sin(phiP) + py;
    zz = zr * Math.cos(thetaP) + pz;
  }
  r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  return -0.5 * r;
}

// ============================================================================
// kaliboxDE(px, py, pz, power, iters, params)
// ============================================================================
export function kaliboxDE(px: number, py: number, pz: number, power: number, iters: number, params: FormulaParams): number {
  const scale = params.paramA;
  const minRad2 = params.paramB;
  const offX = params.paramC || 0, offY = params.paramD || 0, offZ = params.paramE || 0;
  const julia = params.julia;
  const hasJulia = params.juliaMode;
  const cx = hasJulia ? julia[0] : px;
  const cy = hasJulia ? julia[1] : py;
  const cz = hasJulia ? julia[2] : pz;
  let x = px, y = py, z = pz;
  let dr = 1.0;
  const absScale = Math.abs(scale);
  const scaleDivMinRad2 = scale / minRad2;
  const absScaleDivMinRad2 = absScale / minRad2;

  for (let i = 0; i < iters; i++) {
    x = Math.abs(x) + offX;
    y = Math.abs(y) + offY;
    z = Math.abs(z) + offZ;

    const r2 = x * x + y * y + z * z;
    let k = Math.max(minRad2 / r2, minRad2);
    if (k > 1.0) k = 1.0;

    x *= k;
    y *= k;
    z *= k;
    dr = dr * k * absScaleDivMinRad2 + 1.0;

    x = x * scaleDivMinRad2 + cx;
    y = y * scaleDivMinRad2 + cy;
    z = z * scaleDivMinRad2 + cz;
  }

  const r = Math.sqrt(x * x + y * y + z * z);
  const de = (r - Math.abs(scale - 1.0)) / dr;
  // For Newton projection, return the raw DE (no threshold).
  // The threshold is only needed for the SDF grid sign detection.
  return de;
}

// ============================================================================
// formulaDE — dispatch to active formula
// ============================================================================
export function formulaDE(px: number, py: number, pz: number, power: number, iters: number): number {
  if (activeFormula === 'kalibox' && activeFormulaParams) {
    return kaliboxDE(px, py, pz, power, iters, activeFormulaParams);
  }
  return mandelbulbDE(px, py, pz, power, iters);
}

// ============================================================================
// sdfGradientTrue — gradient via central differences on active formula
// ============================================================================
export function sdfGradientTrue(px: number, py: number, pz: number, power: number, iters: number): [number, number, number] {
  const h = 1e-5;
  const gx = formulaDE(px + h, py, pz, power, iters) - formulaDE(px - h, py, pz, power, iters);
  const gy = formulaDE(px, py + h, pz, power, iters) - formulaDE(px, py - h, pz, power, iters);
  const gz = formulaDE(px, py, pz + h, power, iters) - formulaDE(px, py, pz - h, power, iters);
  const len = Math.sqrt(gx * gx + gy * gy + gz * gz);
  if (len < 1e-12) return [0, 1, 0];
  const inv = 1.0 / len;
  return [gx * inv, gy * inv, gz * inv];
}

// ============================================================================
// newtonProject — project point onto isosurface with safety guards
// ============================================================================
export function newtonProject(
  vx: number, vy: number, vz: number,
  power: number, iters: number,
  steps: number = 6, maxDist: number = 0.05
): [number, number, number] {
  const ox = vx, oy = vy, oz = vz;
  let prevAbsD = Infinity;
  for (let i = 0; i < steps; i++) {
    const d = formulaDE(vx, vy, vz, power, iters);
    const absD = Math.abs(d);
    if (absD < 1e-8) break;
    if (absD > prevAbsD * 1.5) break;
    prevAbsD = absD;
    const g = sdfGradientTrue(vx, vy, vz, power, iters);
    const nx = vx - d * g[0];
    const ny = vy - d * g[1];
    const nz = vz - d * g[2];
    const dx = nx - ox, dy = ny - oy, dz = nz - oz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) break;
    vx = nx; vy = ny; vz = nz;
  }
  return [vx, vy, vz];
}

// ============================================================================
// projectMeshVertices — project all mesh vertices onto isosurface
// ============================================================================
export function projectMeshVertices(
  mesh: Mesh,
  power: number, iters: number,
  onProgress?: (percent: number) => void
): Mesh {
  const positions = mesh.positions;
  const normals = mesh.normals;
  const vertexCount = mesh.vertexCount;

  for (let v = 0; v < vertexCount; v++) {
    if (onProgress && (v & 0xFFF) === 0) {
      onProgress(Math.round(100 * v / vertexCount));
    }

    const v3 = v * 3;
    const px = positions[v3], py = positions[v3 + 1], pz = positions[v3 + 2];
    const proj = newtonProject(px, py, pz, power, iters, 6);

    positions[v3] = proj[0];
    positions[v3 + 1] = proj[1];
    positions[v3 + 2] = proj[2];

    const g = sdfGradientTrue(proj[0], proj[1], proj[2], power, iters);
    normals[v3] = g[0];
    normals[v3 + 1] = g[1];
    normals[v3 + 2] = g[2];
  }

  return mesh;
}
