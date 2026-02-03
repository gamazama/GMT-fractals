
import { UNIFORMS } from '../shaders/chunks/uniforms';
import { getMathGLSL } from '../shaders/chunks/math';
import { DE_MASTER } from '../shaders/chunks/de';
import { generateMaterialEval } from '../shaders/chunks/material_eval';
import { getFragmentMainGLSL } from '../shaders/chunks/main';
import { getRayGLSL } from '../shaders/chunks/ray';
import { getTraceGLSL } from '../shaders/chunks/trace';
import { COLORING } from '../shaders/chunks/coloring';
import { POST } from '../shaders/chunks/post';
import { BLUE_NOISE } from '../shaders/chunks/blue_noise';

export type RenderVariant = 'Main' | 'Physics' | 'Histogram';

export class ShaderBuilder {
    // 1. Storage
    private defines: Map<string, string> = new Map();
    private uniforms: Map<string, { type: string; arraySize?: number }> = new Map();
    private functions: string[] = []; // Pre-DE functions (Formulas, Utils)
    private postDEFunctions: string[] = []; // Post-DE functions (Shadows, AO, Reflections, Env)
    private integrators: string[] = []; // Late-stage functions (Lighting Integrators, Path Tracer)
    private headers: string[] = [];

    // 2. Logic Hooks (Specific to GMT Architecture)
    private materialLogic: string[] = [];
    private volumeBody: string[] = [];
    private volumeFinalize: string[] = [];
    private hybridInit: string[] = [];
    private hybridPreLoop: string[] = [];
    private hybridInLoop: string[] = [];

    // 3. Distance Estimator Configuration
    private formulaLoopBody: string = "";
    private formulaInit: string = "";
    private formulaDist: string = "";

    // 4. Config State
    private useRotation: boolean = true;
    private renderMode: 'Direct' | 'PathTracing' = 'Direct';
    private isLite: boolean = false;
    private precisionMode: number = 0;

    constructor(public variant: RenderVariant) {}

    // --- Configuration API ---

    public setRotation(enabled: boolean) {
        this.useRotation = enabled;
    }

    public setRenderMode(mode: 'Direct' | 'PathTracing') {
        this.renderMode = mode;
    }

    public setQuality(isLite: boolean, precisionMode: number) {
        this.isLite = isLite;
        this.precisionMode = precisionMode;
    }

    // --- Injection API ---

    addDefine(name: string, value: string = '1') {
        this.defines.set(name, value);
    }

    addUniform(name: string, type: string, arraySize?: number) {
        this.uniforms.set(name, { type, arraySize });
    }

    addHeader(code: string) {
        this.headers.push(code);
    }

    // Adds a function that does NOT depend on DE/Map (e.g. Formula)
    addFunction(code: string) {
        if (!this.functions.includes(code)) {
            this.functions.push(code);
        }
    }

    // Adds a function that DEPENDS on DE/Map (e.g. Shadows, AO, Reflections)
    addPostDEFunction(code: string) {
        if (!this.postDEFunctions.includes(code)) {
            this.postDEFunctions.push(code);
        }
    }
    
    // Adds a function that depends on MaterialEval AND PostDE (e.g. Lighting Integrators)
    addIntegrator(code: string) {
        if (!this.integrators.includes(code)) {
            this.integrators.push(code);
        }
    }

    // --- Specific Logic Slots ---

    setFormula(loopBody: string, init: string, distFunc: string) {
        this.formulaLoopBody = loopBody;
        this.formulaInit = init;
        this.formulaDist = distFunc;
    }

    addHybrid(init: string, preLoop: string, inLoop: string) {
        if(init) this.hybridInit.push(init);
        if(preLoop) this.hybridPreLoop.push(preLoop);
        if(inLoop) this.hybridInLoop.push(inLoop);
    }

    addMaterialLogic(code: string) {
        this.materialLogic.push(code);
    }

    addVolumeLogic(body: string, finalize: string) {
        if(body) this.volumeBody.push(body);
        if(finalize) this.volumeFinalize.push(finalize);
    }

    // --- Assembly ---

    private buildDefinesString(): string {
        let out = "";
        this.defines.forEach((val, key) => {
            out += `#define ${key} ${val}\n`;
        });
        return out;
    }

    private buildUniformsString(): string {
        // Start with the standard schema (pre-generated in UNIFORMS chunk)
        let out = UNIFORMS + "\n";
        
        // Append extra injected uniforms
        this.uniforms.forEach((info, name) => {
            if (info.arraySize) {
                out += `uniform ${info.type} ${name}[${info.arraySize}];\n`;
            } else {
                out += `uniform ${info.type} ${name};\n`;
            }
        });
        return out;
    }

    // Returns the fully assembled shader string based on the variant
    buildFragment(): string {
        const defines = this.buildDefinesString();
        const uniforms = this.buildUniformsString();
        const headers = this.headers.join('\n');
        const userFunctions = this.functions.join('\n');
        const postDEFunctions = this.postDEFunctions.join('\n');
        const integrators = this.integrators.join('\n');
        const math = getMathGLSL(this.useRotation);

        // Core DE
        const de = DE_MASTER(
            this.formulaLoopBody,
            this.formulaInit,
            this.formulaDist,
            this.hybridInit.join('\n'),
            this.hybridPreLoop.join('\n'),
            this.hybridInLoop.join('\n')
        );

        // --- VARIANT: PHYSICS (Distance Measurement) ---
        if (this.variant === 'Physics') {
            const traceGLSL = getTraceGLSL(false, false, this.precisionMode, 0, "", "");
            
            return `
${defines}
${uniforms}
${math}
${BLUE_NOISE}
${COLORING} 
${headers}
${userFunctions} // Formulas
${de}            // Distance Estimator
${postDEFunctions} // Shadows/AO (if any needed)

${traceGLSL}

layout(location = 0) out vec4 pc_fragColor;

void main() {
    vec3 ro = vec3(0.0);
    vec3 rd = normalize(uCamForward);
    
    float d = 0.0;
    vec4 result = vec4(0.0);
    vec3 dummyGlow = vec3(0.0);
    float dummyVol = 0.0;
    
    bool hit = traceScene(ro, rd, d, result, dummyGlow, 0.0, dummyVol);
    
    if (hit) {
        pc_fragColor = vec4(d, 0.0, 0.0, 1.0);
    } else {
        pc_fragColor = vec4(-1.0, 0.0, 0.0, 1.0);
    }
}
`;
        }

        // --- VARIANT: HISTOGRAM (Data Analysis) ---
        if (this.variant === 'Histogram') {
            const traceGLSL = getTraceGLSL(false, false, this.precisionMode, 0, "", "");
            const rayGLSL = getRayGLSL('Direct'); // Use direct ray generation for sampling

            // Update: Use actual mapping value for accuracy
            return `
${defines}
${uniforms}
${math}
${BLUE_NOISE}
${COLORING} 
${headers}
${userFunctions} // Formulas (Including getMappingValue)
${de}            // Distance Estimator
${postDEFunctions}

${traceGLSL}
${rayGLSL}

layout(location = 0) out vec4 pc_fragColor;

void main() {
    vec3 ro, rd;
    float stochasticSeed;
    getCameraRay(vUv, 0.0, ro, rd, stochasticSeed);
    
    vec3 glow = vec3(0.0);
    float volumetric = 0.0;
    float d = 0.0;
    vec4 result = vec4(0.0);
    
    bool hit = traceScene(ro, rd, d, result, glow, 0.0, volumetric);
    
    if (hit) {
        // Determine Mode/Scale based on active layer
        float mode = (uHistogramLayer > 0) ? uColorMode2 : uColorMode;
        float scale = (uHistogramLayer > 0) ? uColorScale2 : uColorScale;
        
        vec3 p = ro + rd * d;
        vec3 p_fractal = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        
        // Dummy normal is sufficient for most mappings except 'Normal' mode
        // For performance, we skip normal calculation unless absolutely necessary,
        // but since Histogram is 128x128, a single normal tap is cheap.
        // Let's use Up vector as proxy for speed, or calculate real normal if quality needed.
        // For now, proxy is safe.
        vec3 n = vec3(0.0, 1.0, 0.0);
        
        float val = getMappingValue(mode, p_fractal, result, n, scale);
        
        pc_fragColor = vec4(val, 0.0, 0.0, 1.0);
    } else {
        pc_fragColor = vec4(-1.0, 0.0, 0.0, 1.0);
    }
}
`;
        }

        // --- VARIANT: MAIN (Full Render) ---
        const materialEval = generateMaterialEval(this.materialLogic.join('\n'));
        const isPathTracing = this.renderMode === 'PathTracing';
        
        const traceGLSL = getTraceGLSL(this.isLite, true, this.precisionMode, 0, this.volumeBody.join('\n'), this.volumeFinalize.join('\n'));
        const mainGLSL = getFragmentMainGLSL(isPathTracing);

        return `
${defines}
${uniforms}
${headers}
${math}
${BLUE_NOISE}
${COLORING} 

// --- FORMULAS ---
${userFunctions}

// --- DISTANCE ESTIMATOR ---
${de}

// --- UTILS (Shadows, AO, Reflections, Env) ---
${postDEFunctions}

// --- MATERIAL EVAL ---
${materialEval}

// --- RAY GENERATION ---
${getRayGLSL(this.renderMode)}

// --- TRACE SCENE ---
${traceGLSL}

// --- INTEGRATORS (Lighting / PT) ---
${integrators}

// POST PROCESSING
${POST}
${mainGLSL}
`;
    }
}
