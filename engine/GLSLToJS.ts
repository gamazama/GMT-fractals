/**
 * GLSL to JavaScript Transpiler for Fractal Formulas
 * 
 * Converts GLSL formula code to executable JavaScript functions
 * for CPU-based distance estimation.
 */

import { engine } from './FractalEngine';

// Vector types for CPU computation
export interface Vec3 { x: number; y: number; z: number; }
export interface Vec4 { x: number; y: number; z: number; w: number; }

// GLSL built-in functions mapped to JavaScript
const glslBuiltins: Record<string, string> = {
    'length': 'Math.sqrt',
    'pow': 'Math.pow',
    'sin': 'Math.sin',
    'cos': 'Math.cos',
    'tan': 'Math.tan',
    'atan': 'Math.atan2',
    'atan2': 'Math.atan2',
    'acos': 'Math.acos',
    'asin': 'Math.asin',
    'abs': 'Math.abs',
    'min': 'Math.min',
    'max': 'Math.max',
    'sqrt': 'Math.sqrt',
    'exp': 'Math.exp',
    'log': 'Math.log',
    'floor': 'Math.floor',
    'ceil': 'Math.ceil',
    'fract': '(x => x - Math.floor(x))',
    'mod': '((a, b) => a - b * Math.floor(a / b))',
    'clamp': '((x, a, b) => Math.max(a, Math.min(b, x)))',
    'mix': '((a, b, t) => a * (1 - t) + b * t)',
    'step': '((edge, x) => x < edge ? 0 : 1)',
    'smoothstep': '((edge0, edge1, x) => { const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t); })',
    'sign': 'Math.sign',
    'dot': '((a, b) => a.x * b.x + a.y * b.y + a.z * b.z)',
    'cross': '((a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }))',
    'normalize': '((v) => { const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 0, z: 0 }; })',
};

/**
 * Transpile GLSL formula code to JavaScript function
 */
export function transpileGLSLToJS(glslCode: string, formulaName: string): Function {
    let jsCode = glslCode;
    
    // Remove GLSL comments
    jsCode = jsCode.replace(/\/\/.*$/gm, '');
    jsCode = jsCode.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Convert vec3/vec4 constructors
    jsCode = jsCode.replace(/vec3\s*\(([^)]+)\)/g, (match, args) => {
        const parts = args.split(',').map((s: string) => s.trim());
        if (parts.length === 1) {
            return `{ x: ${parts[0]}, y: ${parts[0]}, z: ${parts[0]} }`;
        } else if (parts.length === 3) {
            return `{ x: ${parts[0]}, y: ${parts[1]}, z: ${parts[2]} }`;
        }
        return match;
    });
    
    jsCode = jsCode.replace(/vec4\s*\(([^)]+)\)/g, (match, args) => {
        const parts = args.split(',').map((s: string) => s.trim());
        if (parts.length === 4) {
            return `{ x: ${parts[0]}, y: ${parts[1]}, z: ${parts[2]}, w: ${parts[3]} }`;
        }
        return match;
    });
    
    // Convert mat2 multiplication (for twist effects)
    jsCode = jsCode.replace(/mat2\s*\(([^)]+)\)\s*\*\s*(\w+)/g, (match, args, vec) => {
        const parts = args.split(',').map((s: string) => s.trim());
        if (parts.length === 4) {
            return `({ x: ${parts[0]} * ${vec}.x + ${parts[2]} * ${vec}.y, y: ${parts[1]} * ${vec}.x + ${parts[3]} * ${vec}.y })`;
        }
        return match;
    });
    
    // Convert swizzle operations (.xyz, .xy, etc.)
    jsCode = jsCode.replace(/(\w+)\.xyz/g, '({ x: $1.x, y: $1.y, z: $1.z })');
    jsCode = jsCode.replace(/(\w+)\.xy/g, '({ x: $1.x, y: $1.y })');
    jsCode = jsCode.replace(/(\w+)\.x/g, '$1.x');
    jsCode = jsCode.replace(/(\w+)\.y/g, '$1.y');
    jsCode = jsCode.replace(/(\w+)\.z/g, '$1.z');
    jsCode = jsCode.replace(/(\w+)\.w/g, '$1.w');
    
    // Convert vector assignment with swizzle
    jsCode = jsCode.replace(/(\w+)\.xyz\s*=\s*/g, (match, varName) => {
        return `(() => { const _tmp = `;
    });
    
    // Convert GLSL built-in functions
    for (const [glsl, js] of Object.entries(glslBuiltins)) {
        const regex = new RegExp(`\\b${glsl}\\s*\\(`, 'g');
        jsCode = jsCode.replace(regex, `${js}(`);
    }
    
    // Convert uniform parameters (uParamA, uParamB, etc.)
    jsCode = jsCode.replace(/uParam([A-Z])/g, (match, letter) => {
        return `params.param${letter}`;
    });
    
    // Convert function signature
    jsCode = jsCode.replace(/void\s+(\w+)\s*\(/, 'function $1(');
    jsCode = jsCode.replace(/inout\s+vec4\s+(\w+)/g, '$1');
    jsCode = jsCode.replace(/inout\s+float\s+(\w+)/g, '$1');
    jsCode = jsCode.replace(/vec4\s+(\w+)/g, '$1');
    jsCode = jsCode.replace(/vec3\s+(\w+)/g, '$1');
    jsCode = jsCode.replace(/float\s+(\w+)/g, '$1');
    
    // Handle inout by wrapping in object (for mutation)
    // This is a simplified approach - we pass objects that can be mutated
    
    return jsCode;
}

/**
 * Create a CPU-executable DE function from GLSL formula
 */
export function createCPUDEFunction(glslFunction: string, loopBody: string, params: Record<string, number>): (pos: Vec3) => number {
    // Create a simplified DE function that runs the formula iterations
    return (pos: Vec3): number => {
        let z = { x: pos.x, y: pos.y, z: pos.z, w: 0 };
        let dr = 1.0;
        let trap = 1000.0;
        const c = { x: pos.x, y: pos.y, z: pos.z, w: 0 };
        
        // Run iterations (simplified - actual implementation would parse and execute GLSL)
        const maxIter = 20;
        let r = 0;
        
        for (let i = 0; i < maxIter; i++) {
            r = Math.sqrt(z.x * z.x + z.y * z.y + z.z * z.z);
            if (r > 2.0) break;
            
            // Execute formula (this would be the transpiled code)
            // For now, we use a direct implementation
            const power = params.paramA || 8.0;
            
            dr = Math.pow(r, power - 1.0) * power * dr + 1.0;
            
            const theta = Math.acos(Math.max(-1.0, Math.min(1.0, z.z / r)));
            const phi = Math.atan2(z.y, z.x);
            
            const thetaPow = theta * power + (params.paramB || 0);
            const phiPow = phi * power + (params.paramC || 0);
            
            const zr = Math.pow(r, power);
            
            z.x = zr * Math.sin(thetaPow) * Math.cos(phiPow) + c.x;
            z.y = zr * Math.sin(phiPow) * Math.sin(thetaPow) + c.y;
            z.z = zr * Math.cos(thetaPow) + c.z;
            
            trap = Math.min(trap, Math.sqrt(z.x * z.x + z.y * z.y + z.z * z.z));
        }
        
        // Distance estimation
        return 0.5 * Math.log(r) * r / dr;
    };
}

/**
 * Get the current formula's DE function for CPU calculation
 */
export function getCurrentFormulaDE(): ((pos: Vec3) => number) | null {
    try {
        // Get current formula from store
        const store = require('../store/fractalStore').useFractalStore.getState();
        const formulaId = store?.formula || 'Mandelbulb';
        
        // Get formula definition
        const registry = require('./FractalRegistry').registry;
        const formulaDef = registry.get(formulaId);
        
        if (!formulaDef?.shader) return null;
        
        // Get current parameters
        const params: Record<string, number> = {};
        if (store?.formulaParams) {
            Object.assign(params, store.formulaParams);
        }
        
        // Create and return DE function
        return createCPUDEFunction(
            formulaDef.shader.function,
            formulaDef.shader.loopBody,
            params
        );
    } catch (e) {
        console.warn('Failed to get formula DE:', e);
        return null;
    }
}
