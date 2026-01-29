
import { FractalDefinition, Preset } from '../types';

/**
 * GMF (GPU Mandelbulb Format) Parser & Generator
 * 
 * Strategy:
 * Separate the JSON metadata from the raw GLSL code to allow for a readable, 
 * copy-paste friendly file format that doesn't require escaping newlines in shader strings.
 */

const GMF_API_DOCS = `
  /* 
   * --- GMT SHADER API REFERENCE ---
   * 
   * Available Uniforms:
   * float uParamA, uParamB, uParamC, uParamD, uParamE, uParamF; // The 6 Sliders
   * int uIterations;      // Iteration count
   * float uTime;          // Elapsed time in seconds
   * vec3 uJulia;          // Julia coordinates (if Julia mode active)
   * float uJuliaMode;     // 1.0 if active, 0.0 if not
   * 
   * Helper Functions:
   * void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR);
   * void boxFold(inout vec3 z, inout float dz, float limit);
   * void dodecaFold(inout vec3 z);
   * vec3 bulbPow(vec3 z, float power);        // Spherical Power function
   * vec4 quatPow(vec4 q, float p);            // Quaternion Power
   * vec4 quatMult(vec4 q1, vec4 q2);          // Quaternion Multiplication
   * float snoise(vec3 v);                     // Simplex Noise (-1.0 to 1.0)
   * 
   * Input/Output:
   * z    : Current coordinate (vec4). .xyz is position, .w is auxiliary.
   * dr   : Running derivative (float). Used for distance estimation.
   * trap : Orbit trap accumulator (float). Used for coloring.
   * c    : The constant for the fractal (Julia value or Pixel position).
   */
`;

export const generateGMF = (def: FractalDefinition, preset: Partial<Preset>): string => {
    // 1. Prepare Metadata (exclude shader object as it will be emitted as tags)
    // We clone to avoid mutating the original definition during delete
    const { shader, ...meta } = def;
    
    const metadata = {
        ...meta,
        defaultPreset: preset 
    };

    // Helper to neat-ify JSON (Condense small objects to single lines)
    const neatJSON = (obj: any) => {
        return JSON.stringify(obj, null, 2)
            .replace(/\{\n\s+"label":[\s\S]+?\}/g, (m) => {
                return m.includes('"id": "param') ? m.replace(/\n\s+/g, ' ') : m;
            })
            .replace(/"(cameraPos|cameraRot|sceneOffset|julia|position)": \{\n\s+"[xyz]":[\s\S]+?\}/g, (m) => m.replace(/\n\s+/g, ' '))
            .replace(/"params": \{\n\s+"A":[\s\S]+?\}/g, (m) => m.replace(/\n\s+/g, ' '));
    };

    let out = `<!-- 
  GMF: GPU Mandelbulb Format v1.0 
  A proprietary container for Fractal math definitions + default presets.
  You can edit the GLSL blocks below directly.
-->\n${GMF_API_DOCS}\n`;
    
    out += `<Metadata>\n${neatJSON(metadata)}\n</Metadata>\n\n`;

    if (shader.loopInit) {
        out += `<!-- Code executed once before the loop (Setup) -->\n`;
        out += `<Shader_Init>\n${shader.loopInit.trim()}\n</Shader_Init>\n\n`;
    }

    out += `<!-- Main Distance Estimator Function -->\n`;
    out += `<Shader_Function>\n${shader.function.trim()}\n</Shader_Function>\n\n`;
    
    out += `<!-- The Iteration Loop Body -->\n`;
    out += `<Shader_Loop>\n${shader.loopBody.trim()}\n</Shader_Loop>\n\n`;

    if (shader.getDist) {
        out += `<!-- Optional: Custom Distance/Iteration Smoothing -->\n`;
        out += `<Shader_Dist>\n${shader.getDist.trim()}\n</Shader_Dist>\n\n`;
    }

    return out;
};

export const parseGMF = (content: string): FractalDefinition => {
    const extract = (tag: string) => {
        // Match content between tags, non-greedy
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
        const match = content.match(regex);
        return match ? match[1].trim() : null;
    };

    const metadataStr = extract('Metadata');
    if (!metadataStr) {
        // Fallback: Try parsing as pure JSON (legacy support)
        try {
            const json = JSON.parse(content);
            if (json.id && json.shader) return json as FractalDefinition;
        } catch(e) {}
        throw new Error("Invalid GMF: Missing Metadata tag");
    }

    const metadata = JSON.parse(metadataStr);
    
    // Extract Shader Parts
    const func = extract('Shader_Function');
    const loop = extract('Shader_Loop');
    const init = extract('Shader_Init');
    const dist = extract('Shader_Dist');

    if (!func || !loop) {
         throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");
    }

    const shader = {
        function: func,
        loopBody: loop,
        loopInit: init || undefined,
        getDist: dist || undefined
    };

    return {
        ...metadata,
        shader
    };
};
