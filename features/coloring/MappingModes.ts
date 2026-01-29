
export interface MappingDefinition {
    value: number;
    label: string;
    description?: string;
    // The GLSL code. Available vars: 
    // p (vec3 position), 
    // result (vec4: x=dist, y=trap, z=iter, w=decomp), 
    // n (vec3 normal)
    glsl: string; 
}

export const MAPPING_MODES: MappingDefinition[] = [
    {
        value: 0.0,
        label: 'Orbit Trap',
        description: 'Colors based on how close the orbit came to the origin or geometric traps.',
        glsl: `v = log(max(1.0e-5, result.y)) * -0.2;`
    },
    {
        value: 1.0,
        label: 'Iterations',
        description: 'Smooth gradients based on how long it took to escape. The classic look.',
        glsl: `
            // Standard Iterations
            v = result.z;
            
            // HYBRID FIX: For SDF fractals (Menger, Amazing Box) that don't "escape",
            // the iteration count is constant (1.0). This looks flat.
            // If we hit max iterations (approx 1.0), mix in Orbit Trap (y) to provide texture.
            if (v > 0.99) {
                float trap = log(max(1.0e-5, result.y)) * -0.2;
                // Modulate the 1.0 base with the trap value
                v = 0.95 + 0.05 * sin(trap * 10.0);
            }
        `
    },
    {
        value: 2.0,
        label: 'Radial',
        description: 'Distance from the center of the world.',
        glsl: `v = length(p) * 0.2;`
    },
    {
        value: 3.0,
        label: 'Z-Depth',
        description: 'Height map based on Z coordinate. Good for landscapes.',
        glsl: `v = p.z * 0.2;`
    },
    {
        value: 4.0,
        label: 'Angle',
        description: 'Polar angle around the Z axis. Creates spirals.',
        glsl: `v = atan(p.y, p.x) * 0.15915 + 0.5;`
    },
    {
        value: 5.0,
        label: 'Normal',
        description: 'Based on surface slope (Up/Down).',
        glsl: `v = dot(n, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;`
    },
    {
        value: 6.0,
        label: 'Decomposition',
        description: 'Analytic angle decomposition. Creates grid/chip patterns.',
        glsl: `
            // Removed aggressive zero-clamping that broke some metric modes
            v = result.w;
        `
    },
    {
        value: 7.0,
        label: 'Raw Iterations',
        description: 'Stepped bands showing exact iteration counts.',
        glsl: `v = floor(result.z * float(uIterations)) / float(uIterations);`
    },
    {
        value: 8.0,
        label: 'Potential (Log-Log)',
        description: 'Electric potential. Creates smooth bands near the set boundary.',
        glsl: `
            // Uses result.y (Trap) as magnitude holder if available
            // Optimized for R > 1.0
            float r = max(result.y, 1.0001); 
            v = log2(log2(r));
        `
    }
];

export const generateMappingShader = () => {
    let code = `
    float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) {
        float v = 0.0;
        
        // Mode Selection Ladder
    `;

    MAPPING_MODES.forEach((mode, index) => {
        const isFirst = index === 0;
        const condition = `if (mode < ${mode.value}.5)`;
        const block = `
        ${isFirst ? condition : 'else ' + condition} {
            // ${mode.label}
            ${mode.glsl}
        }`;
        code += block;
    });

    code += `
        // Fallback
        else {
            v = result.z;
        }

        // Safety Clamp
        if (v < -1.0e10 || v > 1.0e10) return 0.0;
        return v;
    }
    `;

    return code;
};
