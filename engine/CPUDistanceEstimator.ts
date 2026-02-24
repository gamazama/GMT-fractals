/**
 * CPU-based Distance Estimator for Fractal Raymarching
 * 
 * This provides an alternative to GPU physics probe, avoiding the
 * GPU-to-CPU readback stall (100-200ms) by using idle CPU cycles.
 * 
 * Uses the formula registry to get the correct DE function for each formula.
 */

import * as THREE from 'three';
import { engine } from './FractalEngine';
import { useFractalStore } from '../store/fractalStore';

export interface SceneOffset {
    x: number; y: number; z: number;
    xL?: number; yL?: number; zL?: number;
}

export interface Vec3 { x: number; y: number; z: number; }

// Type for CPU DE function
export type CPUDEFunction = (pos: Vec3, params: Record<string, number>) => number;

/**
 * Mandelbulb DE function (default fallback)
 */
function mandelbulbDE(pos: Vec3, params: Record<string, number>): number {
    const power = params.paramA || params.power || 8.0;
    const thetaPhase = params.paramB || 0;
    const phiPhase = params.paramC || 0;
    
    let zx = pos.x, zy = pos.y, zz = pos.z;
    let dr = 1.0;
    let r = 0.0;
    
    const maxIter = 20;
    for (let i = 0; i < maxIter; i++) {
        r = Math.sqrt(zx * zx + zy * zy + zz * zz);
        if (r > 2.0) break;
        
        dr = Math.pow(r, power - 1.0) * power * dr + 1.0;
        
        const theta = Math.acos(Math.max(-1.0, Math.min(1.0, zz / r)));
        const phi = Math.atan2(zy, zx);
        
        const zr = Math.pow(r, power);
        
        zx = zr * Math.sin(theta * power + thetaPhase) * Math.cos(phi * power + phiPhase) + pos.x;
        zy = zr * Math.sin(phi * power + phiPhase) * Math.sin(theta * power + thetaPhase) + pos.y;
        zz = zr * Math.cos(theta * power + thetaPhase) + pos.z;
    }
    
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * Menger Sponge DE function
 */
function mengerDE(pos: Vec3, params: Record<string, number>): number {
    const scale = params.paramA || 3.0;
    const iterations = Math.min(6, Math.floor(params.paramB || 4));
    
    let x = pos.x, y = pos.y, z = pos.z;
    
    for (let i = 0; i < iterations; i++) {
        let xi = Math.abs(x);
        let yi = Math.abs(y);
        let zi = Math.abs(z);
        
        // Menger fold - sort coordinates
        if (xi < yi) { const t = xi; xi = yi; yi = t; }
        if (xi < zi) { const t = xi; xi = zi; zi = t; }
        if (yi < zi) { const t = yi; yi = zi; zi = t; }
        
        // Scale and translate
        x = xi * scale - (scale - 1.0);
        y = yi * scale - (scale - 1.0);
        z = zi * scale - (scale - 1.0);
    }
    
    const xi = Math.abs(x);
    const yi = Math.abs(y);
    const zi = Math.abs(z);
    
    return (Math.min(Math.max(xi, yi), zi) - 1.0) / Math.pow(scale, iterations);
}

/**
 * Amazing Box DE function
 */
function amazingBoxDE(pos: Vec3, params: Record<string, number>): number {
    const scale = params.paramA || 3.0;
    const fold = params.paramB || 1.0;
    const iterations = Math.min(6, Math.floor(params.paramC || 4));
    
    let x = pos.x, y = pos.y, z = pos.z;
    let d = 1.0;
    
    for (let i = 0; i < iterations; i++) {
        // Box fold
        x = Math.max(-fold, Math.min(fold, x)) * 2.0 - x;
        y = Math.max(-fold, Math.min(fold, y)) * 2.0 - y;
        z = Math.max(-fold, Math.min(fold, z)) * 2.0 - z;
        
        // Sphere fold
        const r2 = x * x + y * y + z * z;
        if (r2 < 0.5) {
            const t = 2.0 / r2;
            x *= t; y *= t; z *= t;
        } else if (r2 < 1.0) {
            const t = 1.0 / r2;
            x *= t; y *= t; z *= t;
        }
        
        // Scale and translate
        x = x * scale + pos.x;
        y = y * scale + pos.y;
        z = z * scale + pos.z;
        
        d *= scale;
    }
    
    return (Math.sqrt(x * x + y * y + z * z) - 0.5) / d;
}

/**
 * Amazing Surf DE function
 */
function amazingSurfDE(pos: Vec3, params: Record<string, number>): number {
    const scale = params.paramA || 1.0;
    const iterations = Math.min(6, Math.floor(params.iterations || 4));
    
    let x = pos.x, y = pos.y, z = pos.z;
    let d = 1.0;
    
    for (let i = 0; i < iterations; i++) {
        // Box fold
        x = Math.max(-1, Math.min(1, x)) * 2.0 - x;
        y = Math.max(-1, Math.min(1, y)) * 2.0 - y;
        z = Math.max(-1, Math.min(1, z)) * 2.0 - z;
        
        // Sphere fold
        const r2 = x * x + y * y + z * z;
        if (r2 < 0.25) {
            const t = 4.0 / r2;
            x *= t; y *= t; z *= t;
        } else if (r2 < 1.0) {
            const t = 1.0 / r2;
            x *= t; y *= t; z *= t;
        }
        
        // Scale and translate
        x = x * scale + pos.x;
        y = y * scale + pos.y;
        z = z * scale + pos.z;
        
        d *= scale;
    }
    
    return (Math.sqrt(x * x + y * y + z * z) - 0.5) / d;
}

/**
 * Julia DE function (for Julia mode)
 */
function juliaDE(pos: Vec3, params: Record<string, number>): number {
    const power = params.paramA || 8.0;
    const jx = params.juliaX || 0;
    const jy = params.juliaY || 0;
    const jz = params.juliaZ || 0;
    
    let zx = pos.x, zy = pos.y, zz = pos.z;
    let dr = 1.0;
    let r = 0.0;
    
    const maxIter = 20;
    for (let i = 0; i < maxIter; i++) {
        r = Math.sqrt(zx * zx + zy * zy + zz * zz);
        if (r > 2.0) break;
        
        dr = Math.pow(r, power - 1.0) * power * dr + 1.0;
        
        const theta = Math.acos(Math.max(-1.0, Math.min(1.0, zz / r)));
        const phi = Math.atan2(zy, zx);
        
        const zr = Math.pow(r, power);
        
        zx = zr * Math.sin(theta * power) * Math.cos(phi * power) + jx;
        zy = zr * Math.sin(phi * power) * Math.sin(theta * power) + jy;
        zz = zr * Math.cos(theta * power) + jz;
    }
    
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * Mandelorus DE function (Torus-based fractal)
 * Wraps space around a ring instead of a point
 */
function mandelorusDE(pos: Vec3, params: Record<string, number>): number {
    const R = params.paramA || 1.0;           // Major Radius
    const twistInput = params.paramB || 0;     // Twist Steps
    const power = params.paramC || 8.0;        // Fractal Power
    const ringPhase = params.paramD || 0;      // Ring Phase
    const crossPhase = params.paramE || 0;     // Cross Phase
    const zScale = 1.0 + (params.paramF || 0); // Vertical Scale
    
    let zx = pos.x, zy = pos.y, zz = pos.z;
    let dr = 1.0;
    
    const maxIter = 15;
    for (let i = 0; i < maxIter; i++) {
        // Toroidal decomposition
        const lenXY = Math.sqrt(zx * zx + zy * zy);
        const phi = Math.atan2(zy, zx);
        
        // Cross-section relative to ring center
        let qx = lenXY - R;
        let qy = zz * zScale;
        
        // Twist (pre-iteration)
        if (Math.abs(twistInput) > 0.001) {
            const rotAng = phi * twistInput / Math.max(1.0, power);
            const s = Math.sin(rotAng);
            const c = Math.cos(rotAng);
            const nqx = c * qx - s * qy;
            const nqy = s * qx + c * qy;
            qx = nqx;
            qy = nqy;
        }
        
        // Complex power on cross-section
        const r2 = qx * qx + qy * qy;
        const r = Math.sqrt(r2);
        let angleQ = Math.atan2(qy, qx) + crossPhase;
        
        // Derivative calculation
        const dr_cross = power * Math.pow(r, power - 1.0);
        let expansion = Math.max(power, dr_cross);
        expansion *= Math.max(1.0, zScale);
        expansion *= (1.0 + Math.abs(twistInput) * 0.3);
        dr = dr * expansion + 1.0;
        
        // Apply power to cross section
        const newR = Math.pow(r, power);
        const newAngleQ = angleQ * power;
        qx = newR * Math.cos(newAngleQ);
        qy = newR * Math.sin(newAngleQ);
        
        // Solenoidal wrapping
        const newPhi = phi * power + ringPhase;
        
        // Reconstruction
        const ringPosX = Math.cos(newPhi);
        const ringPosY = Math.sin(newPhi);
        
        zx = ringPosX * (R + qx) + pos.x;
        zy = ringPosY * (R + qx) + pos.y;
        zz = qy + pos.z;
        
        const totalR = Math.sqrt(zx * zx + zy * zy + zz * zz);
        if (totalR > 4.0) break;
    }
    
    const r = Math.sqrt(zx * zx + zy * zy + zz * zz);
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * Kleinian DE function (Inversion fractal)
 */
function kleinianDE(pos: Vec3, params: Record<string, number>): number {
    const scale = params.paramA || 1.8;
    const offset = params.paramB || 0.0;
    const limit = params.paramC || 1.0;
    const kFactor = params.paramD || 1.2;
    
    let x = pos.x, y = pos.y, z = pos.z;
    let dr = 1.0;
    
    const maxIter = 20;
    for (let i = 0; i < maxIter; i++) {
        // Clamp and fold
        x = Math.max(-limit, Math.min(limit, x)) * 2.0 - x;
        y = Math.max(-limit, Math.min(limit, y)) * 2.0 - y;
        z = Math.max(-limit, Math.min(limit, z)) * 2.0 - z;
        
        // Inversion
        const r2 = Math.max(x * x + y * y + z * z, 1e-10);
        const k = Math.max(kFactor / r2, 1.0);
        x *= k;
        y *= k;
        z *= k;
        dr *= k;
        
        // Scale and offset
        x = x * scale + offset + pos.x;
        y = y * scale + pos.y;
        z = z * scale + pos.z;
        dr = dr * Math.abs(scale) + 1.0;
        
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r > 4.0) break;
    }
    
    const r = Math.sqrt(x * x + y * y + z * z);
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * BoxBulb DE function (Hybrid Box + Bulb)
 */
function boxBulbDE(pos: Vec3, params: Record<string, number>): number {
    const scale = params.paramA || 3.0;
    const fold = params.paramB || 0.5;
    const power = params.paramC || 8.0;
    const iterations = Math.min(6, Math.floor(params.iterations || 10));
    
    let x = pos.x, y = pos.y, z = pos.z;
    let dr = 1.0;
    
    for (let i = 0; i < iterations; i++) {
        // Box fold
        x = Math.max(-fold, Math.min(fold, x)) * 2.0 - x;
        y = Math.max(-fold, Math.min(fold, y)) * 2.0 - y;
        z = Math.max(-fold, Math.min(fold, z)) * 2.0 - z;
        
        // Scale
        x *= scale;
        y *= scale;
        z *= scale;
        dr *= scale;
        
        // Mandelbulb-style iteration
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r < 2.0) {
            const theta = Math.acos(Math.max(-1.0, Math.min(1.0, z / r)));
            const phi = Math.atan2(y, x);
            const zr = Math.pow(r, power);
            
            x = zr * Math.sin(theta * power) * Math.cos(phi * power) + pos.x;
            y = zr * Math.sin(phi * power) * Math.sin(theta * power) + pos.y;
            z = zr * Math.cos(theta * power) + pos.z;
            dr = Math.pow(r, power - 1.0) * power * dr + 1.0;
        }
    }
    
    const r = Math.sqrt(x * x + y * y + z * z);
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * PseudoKleinian DE function
 */
function pseudoKleinianDE(pos: Vec3, params: Record<string, number>): number {
    const scale = params.paramA || 1.8;
    const offset = params.paramB || 0.0;
    const limit = params.paramC || 1.0;
    const kFactor = params.paramD || 1.0;
    
    let x = pos.x, y = pos.y, z = pos.z;
    let dr = 1.0;
    
    const maxIter = 15;
    for (let i = 0; i < maxIter; i++) {
        // Box fold
        x = Math.max(-limit, Math.min(limit, x)) * 2.0 - x;
        y = Math.max(-limit, Math.min(limit, y)) * 2.0 - y;
        z = Math.max(-limit, Math.min(limit, z)) * 2.0 - z;
        
        // Sphere inversion
        const r2 = Math.max(x * x + y * y + z * z, 1e-10);
        const k = Math.max(kFactor / r2, 1.0);
        x *= k;
        y *= k;
        z *= k;
        dr *= k;
        
        // Scale and translate
        x = x * scale + offset + pos.x;
        y = y * scale + pos.y;
        z = z * scale + pos.z;
        dr = dr * Math.abs(scale) + 1.0;
        
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r > 4.0) break;
    }
    
    const r = Math.sqrt(x * x + y * y + z * z);
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * Quaternion DE function
 */
function quaternionDE(pos: Vec3, params: Record<string, number>): number {
    const jx = params.paramA || -0.25;
    const jy = params.paramB || -0.22;
    const jz = params.paramC || -6.44;
    const jw = params.paramD || 0.29;
    
    let x = pos.x, y = pos.y, z = pos.z, w = 0.0;
    let dr = 1.0;
    
    const maxIter = 20;
    for (let i = 0; i < maxIter; i++) {
        const r2 = x * x + y * y + z * z + w * w;
        if (r2 > 4.0) break;
        
        dr = 2.0 * Math.sqrt(r2) * dr + 1.0;
        
        // Quaternion multiply: q * q + c
        const nx = x * x - y * y - z * z - w * w + jx;
        const ny = 2.0 * x * y + jy;
        const nz = 2.0 * x * z + jz;
        const nw = 2.0 * x * w + jw;
        
        x = nx; y = ny; z = nz; w = nw;
    }
    
    const r = Math.sqrt(x * x + y * y + z * z + w * w);
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * Buffalo DE function
 */
function buffaloDE(pos: Vec3, params: Record<string, number>): number {
    const power = params.paramA || 2.0;
    const iterations = Math.min(20, Math.floor(params.iterations || 15));
    
    let x = pos.x, y = pos.y, z = pos.z;
    let dr = 1.0;
    
    for (let i = 0; i < iterations; i++) {
        // Buffalo fold: abs then invert
        const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
        
        const r = Math.sqrt(ax * ax + ay * ay + az * az);
        if (r > 2.0) break;
        
        const theta = Math.acos(Math.max(-1.0, Math.min(1.0, az / r)));
        const phi = Math.atan2(ay, ax);
        
        dr = Math.pow(r, power - 1.0) * power * dr + 1.0;
        
        const zr = Math.pow(r, power);
        x = zr * Math.sin(theta * power) * Math.cos(phi * power) + pos.x;
        y = zr * Math.sin(phi * power) * Math.sin(theta * power) + pos.y;
        z = zr * Math.cos(theta * power) + pos.z;
    }
    
    const r = Math.sqrt(x * x + y * y + z * z);
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * Bristorbrot DE function
 */
function bristorbrotDE(pos: Vec3, params: Record<string, number>): number {
    const power = params.paramA || 2.0;
    
    let x = pos.x, y = pos.y, z = pos.z;
    let dr = 1.0;
    
    const maxIter = 20;
    for (let i = 0; i < maxIter; i++) {
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r > 2.0) break;
        
        // Bristorbrot: invert z before iteration
        const theta = Math.acos(Math.max(-1.0, Math.min(1.0, -z / r)));
        const phi = Math.atan2(y, x);
        
        dr = Math.pow(r, power - 1.0) * power * dr + 1.0;
        
        const zr = Math.pow(r, power);
        x = zr * Math.sin(theta * power) * Math.cos(phi * power) + pos.x;
        y = zr * Math.sin(phi * power) * Math.sin(theta * power) + pos.y;
        z = -zr * Math.cos(theta * power) + pos.z;
    }
    
    const r = Math.sqrt(x * x + y * y + z * z);
    return 0.5 * Math.log(r) * r / dr;
}

/**
 * HyperbolicMandelbrot DE function (Poincaré-Ahlfors extension)
 * Implements a custom distance estimation that accounts for the unique
 * hyperbolic geometry of this fractal
 */
function hyperbolicMandelbrotDE(pos: Vec3, params: Record<string, number>): number {
    const power = params.paramA || 2.0;
    const hypScale = params.paramB || 1.0;
    const conformalShift = params.paramC || 1.0;
    const phaseTwist = params.paramD || 0.0;
    const zOffset = params.paramE || 0.0;
    
    let x = pos.x, y = pos.y, z = pos.z;
    let dr = 1.0;
    
    const maxIter = 20;
    for (let i = 0; i < maxIter; i++) {
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r > 2.0) break;
        
        // HyperbolicMandelbrot iteration logic
        const rxy2 = x * x + y * y;
        const rxy = Math.sqrt(rxy2);
        
        // Derivative calculation using full 3D magnitude
        dr = power * Math.pow(r, power - 1) * dr + 1.0;
        
        // Ahlfors Extension multiplier: M = (|Z|^2 - T^2) / |Z|^2
        const m = (rxy2 - conformalShift * z * z) / (rxy2 + 1e-20);
        
        // Apply the conformal 3D power with Phase Twist
        const theta = Math.atan2(y, x) * power + phaseTwist;
        const rxy_p = Math.pow(rxy, power);
        
        // Z_{n+1} = Z_n^p * M + C_z
        const nx = rxy_p * Math.cos(theta) * m + pos.x;
        const ny = rxy_p * Math.sin(theta) * m + pos.y;
        
        // T_{n+1} = p * |Z_n|^(p-1) * T_n + C_t
        const nz = power * Math.pow(rxy, power - 1) * z * hypScale + pos.z + zOffset;
        
        x = nx;
        y = ny;
        z = nz;
    }
    
    const r = Math.sqrt(x * x + y * y + z * z);
    
    // Custom distance estimation formula optimized for hyperbolic geometry
    const drSafe = Math.max(Math.abs(dr), 1e-10);
    
    // Use log-based distance estimation for all regions
    return 0.5 * Math.log(r) * r / drSafe;
}

// Registry of CPU DE functions
const cpuDERegistry: Record<string, CPUDEFunction> = {
    'Mandelbulb': mandelbulbDE,
    'MengerSponge': mengerDE,
    'MengerAdvanced': mengerDE,
    'AmazingBox': amazingBoxDE,
    'AmazingSurf': amazingSurfDE,
    'AmazingSurface': amazingSurfDE,
    'Julia': juliaDE,
    'Mandelorus': mandelorusDE,
    'Kleinian': kleinianDE,
    'PseudoKleinian': pseudoKleinianDE,
    'BoxBulb': boxBulbDE,
    'Quaternion': quaternionDE,
    'HyperbolicMandelbrot': hyperbolicMandelbrotDE,
    'Buffalo': buffaloDE,
    'Bristorbrot': bristorbrotDE,
    // Aliases and variants
    'Mandelbar3D': mandelbulbDE,
    'Tetrabrot': mandelbulbDE,
    'MixPinski': mengerDE,
    'Modular': mengerDE,
};

/**
 * Get the CPU DE function for a formula
 */
export function getCPUDEFunction(formulaId: string): CPUDEFunction {
    return cpuDERegistry[formulaId] || mandelbulbDE; // Fallback to Mandelbulb
}

/**
 * Map function - returns distance from a point in SHADER space to the fractal
 */
function mapDistance(
    shaderPos: Vec3,
    sceneOffset: SceneOffset,
    deFunction: CPUDEFunction,
    params: Record<string, number>
): number {
    // Apply precision offset: p_fractal = p + offset
    const fractalPos: Vec3 = {
        x: shaderPos.x + sceneOffset.x + (sceneOffset.xL || 0),
        y: shaderPos.y + sceneOffset.y + (sceneOffset.yL || 0),
        z: shaderPos.z + sceneOffset.z + (sceneOffset.zL || 0)
    };
    
    return deFunction(fractalPos, params);
}

/**
 * Raymarching function - marches a ray to find distance to fractal surface
 */
export function calculateDistanceWithFormula(
    ro: Vec3,
    rd: Vec3,
    sceneOffset: SceneOffset,
    formulaId: string,
    params: Record<string, number>,
    maxSteps: number = 50,
    maxDistance: number = 100.0
): number {
    const deFunction = getCPUDEFunction(formulaId);
    let d = 0.0;
    
    for (let i = 0; i < maxSteps; i++) {
        const px = ro.x + rd.x * d;
        const py = ro.y + rd.y * d;
        const pz = ro.z + rd.z * d;
        
        const h = mapDistance({ x: px, y: py, z: pz }, sceneOffset, deFunction, params);
        
        if (h < 0.0001) {
            return d;
        }
        
        d += h * 0.9;
        
        if (d > maxDistance) break;
    }
    
    return d;
}

/**
 * Get formula parameters from store
 */
function getFormulaParams(): Record<string, number> {
    try {
        const state = useFractalStore.getState();
        
        // Get coreMath parameters (paramA, paramB, etc.) - directly from state
        const coreMath = (state as any)?.coreMath || {};
        const params: Record<string, number> = {};
        
        // Extract parameters
        if (coreMath.paramA !== undefined) params.paramA = coreMath.paramA;
        if (coreMath.paramB !== undefined) params.paramB = coreMath.paramB;
        if (coreMath.paramC !== undefined) params.paramC = coreMath.paramC;
        if (coreMath.paramD !== undefined) params.paramD = coreMath.paramD;
        if (coreMath.paramE !== undefined) params.paramE = coreMath.paramE;
        if (coreMath.paramF !== undefined) params.paramF = coreMath.paramF;
        if (coreMath.iterations !== undefined) params.iterations = coreMath.iterations;
        
        // Get Julia parameters if in Julia mode - directly from state
        const geometry = (state as any)?.geometry || {};
        if (geometry.juliaMode) {
            params.juliaX = geometry.juliaX || 0;
            params.juliaY = geometry.juliaY || 0;
            params.juliaZ = geometry.juliaZ || 0;
        }
        
        return params;
    } catch (e) {
        return {};
    }
}

/**
 * Calculate distance using current formula and parameters from store
 */
export function calculateCurrentDistance(
    ro: Vec3,
    rd: Vec3,
    sceneOffset: SceneOffset,
    maxSteps: number = 30,
    maxDistance: number = 50.0
): number {
    try {
        const state = useFractalStore.getState();
        const formulaId = (state as any)?.formula || 'Mandelbulb';
        const params = getFormulaParams();
        
        return calculateDistanceWithFormula(ro, rd, sceneOffset, formulaId, params, maxSteps, maxDistance);
    } catch (e) {
        // Fallback to Mandelbulb
        return calculateDistanceWithFormula(ro, rd, sceneOffset, 'Mandelbulb', {}, maxSteps, maxDistance);
    }
}

/**
 * Legacy function for backwards compatibility
 */
export function calculateMandelbulbDistanceWithOffset(
    ro: Vec3,
    rd: Vec3,
    sceneOffset: SceneOffset,
    power: number = 8.0,
    maxSteps: number = 50,
    maxDistance: number = 100.0
): number {
    return calculateDistanceWithFormula(ro, rd, sceneOffset, 'Mandelbulb', { paramA: power }, maxSteps, maxDistance);
}

/**
 * Simplified function for backwards compatibility
 */
export function calculateMandelbulbDistance(
    position: Vec3,
    direction: Vec3,
    power: number = 8.0,
    maxSteps: number = 50,
    maxDistance: number = 100.0
): number {
    return calculateMandelbulbDistanceWithOffset(position, direction, { x: 0, y: 0, z: 0 }, power, maxSteps, maxDistance);
}
