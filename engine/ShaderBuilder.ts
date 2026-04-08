
// SHADER ASSEMBLY ORDER (position matters for GLSL function ordering):
//
//  1. Defines            — addDefine()
//  2. Uniforms           — addUniform()
//  3. Headers            — addHeader()
//  4. Math               — (core, always present)
//  5. Blue Noise         — (core)
//  6. Coloring           — (core)
//  7. Preambles          — addPreamble()
//  8. Pre-DE Functions   — addFunction()
//  9. DE (map/mapDist)   — setFormula(), setDistOverride(), addHybridFold()
//                          + addPostMapCode() / addPostDistCode() [accumulative, injected inside map/mapDist]
// 10. Post-DE Functions  — addPostDEFunction()         [can call map()/mapDist()]
// 11. Material Eval      — addMaterialLogic()          [inside getSurfaceMaterial()]
// 12. Miss Handler       — addMissLogic()              [inside sampleMiss()]
// 13. Ray Generation     — (core)
// 14. Trace              — (core, with addVolumeTracing() body/finalize injected inside trace loop)
// 15. Integrators        — addIntegrator()             [after trace, can call everything above]
//                          + requestShading()           [deferred: generates calculateShading() with addShadingLogic() code]
// 16. Post Processing    — addPostProcessLogic()  [inside applyPostProcessing(), fully feature-injected]
// 17. Main Fragment      — addCompositeLogic()         [inside renderPixel(), after integrator]
//
// Physics variant: 1-10 only (simplified trace, no lighting/post)
// Histogram variant: 1-10 + trace + ray (no lighting/material/post)

import { UNIFORMS } from '../shaders/chunks/uniforms';
import { getMathGLSL, MESH_GLSL_UNIFORMS, GLSL_MATH_CONSTANTS, GLSL_SPHERE_FOLD, GLSL_BOX_FOLD, getSnoiseFunctions } from '../shaders/chunks/math';
import { DE_MASTER } from '../shaders/chunks/de';
import { generateMaterialEval } from '../shaders/chunks/material_eval';
import { getFragmentMainGLSL } from '../shaders/chunks/main';
import { getRayGLSL } from '../shaders/chunks/ray';
import { getTraceGLSL } from '../shaders/chunks/trace';
import { COLORING } from '../shaders/chunks/coloring';
import { getPostGLSL } from '../shaders/chunks/post';
import { getShadingGLSL } from '../shaders/chunks/lighting/shading';
import { BLUE_NOISE } from '../shaders/chunks/blue_noise';

export type RenderVariant = 'Main' | 'Physics' | 'Histogram' | 'Mesh';


export class ShaderBuilder {
    // 1. Storage
    private defines: Map<string, string> = new Map();
    private uniforms: Map<string, { type: string; arraySize?: number }> = new Map();
    private preDEFunctions: string[] = [];     // Position 8: Functions before DE (formulas, utilities)
    private postDEFunctions: string[] = [];    // Position 10: Functions after DE (shadows, AO, reflections)
    private integrators: string[] = [];        // Position 15: Late-stage functions (lighting, path tracer)
    private headers: string[] = [];
    private preambles: string[] = [];          // Position 7: Global code before functions

    // 2. Logic Hooks (injected into specific shader locations)
    private postMapCode: string[] = [];        // Position 9: Inside map(), after fractal DE, before return
    private postDistCode: string[] = [];       // Position 9: Inside mapDist(), after fractal DE, before return
    private materialLogic: string[] = [];      // Position 11: Inside getSurfaceMaterial()
    private compositeLogic: string[] = [];     // Position 17: Inside renderPixel(), after integrator
    private missLogic: string[] = [];          // Position 12: Inside sampleMiss(), overrides env
    private volumeBody: string[] = [];         // Position 14: Inside trace loop (per-step volumetric)
    private volumeFinalize: string[] = [];     // Position 14: After trace loop (volumetric finalization)
    private postProcessLogic: string[] = [];   // Position 16: Inside applyPostProcessing(), after glow
    private shadingReflectionCode: string[] = []; // Position 15: Injected into calculateShading() reflection block
    private needsShading: boolean = false;        // Set by requestShading(); triggers getShadingGLSL() in buildFragment()
    private hybridInit: string[] = [];
    private hybridPreLoop: string[] = [];
    private hybridInLoop: string[] = [];

    // 3. Distance Estimator Configuration
    private formulaLoopBody: string = "";
    private formulaInit: string = "";
    private formulaDist: string = "";
    private distOverrideInit: string = '';
    private distOverrideInLoopFull: string = '';
    private distOverrideInLoopGeom: string = '';
    private distOverridePostFull: string = '';
    private distOverridePostGeom: string = '';

    // 4. Config State
    private useRotation: boolean = true;
    private renderMode: 'Direct' | 'PathTracing' = 'Direct';
    private isLite: boolean = false;
    private precisionMode: number = 0;
    private maxLights: number = 0;
    // Depth output is always enabled for MRT - removes shader recompilation issue
    
    // 5. Variant Specific
    private physicsRayGen: string = `
    // Standard Linear Projection
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 rd = normalize(uCamForward + uv.x * uCamBasisX + uv.y * uCamBasisY);
    `;

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

    public setMaxLights(n: number) {
        this.maxLights = n;
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

    // Adds global code at global scope, before functions (e.g. for pre-calculation)
    addPreamble(code: string) {
        if (!this.preambles.includes(code)) {
            this.preambles.push(code);
        }
    }

    /** Position 8: Pre-DE functions — cannot call map()/mapDist().
     *  Used for: formula functions, math utilities, water/geometry helpers. */
    addFunction(code: string) {
        if (!this.preDEFunctions.includes(code)) {
            this.preDEFunctions.push(code);
        }
    }

    /** Position 10: Post-DE functions — CAN call map()/mapDist().
     *  Used for: shadows, AO, reflections, geometry intersection tests. */
    addPostDEFunction(code: string) {
        if (!this.postDEFunctions.includes(code)) {
            this.postDEFunctions.push(code);
        }
    }

    /** Position 15: Late-stage functions — after trace, can call everything above.
     *  Used for: lighting integrators, path tracer, shading pipeline. */
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

    /** Overrides the distance estimator loop with custom init/loop/post code.
     *  Used by Modular formula for custom distance functions. */
    setDistOverride(opts: {
        init?: string;
        inLoopFull?: string;    // Inside map() loop iteration
        inLoopGeom?: string;    // Inside mapDist() loop iteration
        postFull?: string;      // After map() loop, before return
        postGeom?: string;      // After mapDist() loop, before return
    }) {
        this.distOverrideInit = opts.init ?? '';
        this.distOverrideInLoopFull = opts.inLoopFull ?? '';
        this.distOverrideInLoopGeom = opts.inLoopGeom ?? '';
        this.distOverridePostFull = opts.postFull ?? '';
        this.distOverridePostGeom = opts.postGeom ?? '';
    }

    /** Position 9: Hybrid fold injection into the DE loop.
     *  Used for: multi-formula hybrid fractals with pre/in-loop transforms. */
    addHybridFold(init: string, preLoop: string, inLoop: string) {
        if(init) this.hybridInit.push(init);
        if(preLoop) this.hybridPreLoop.push(preLoop);
        if(inLoop) this.hybridInLoop.push(inLoop);
    }

    /** Position 11: Code injected inside getSurfaceMaterial() for material property overrides.
     *  Variables in scope: albedo, n, emission, roughness, p_fractal, result.
     *  Used for: emission modes, water material, custom material overrides. */
    addMaterialLogic(code: string) {
        this.materialLogic.push(code);
    }

    /** Position 9 (accumulative): Code injected inside map() after fractal distance is computed.
     *  Variables in scope: p_fractal, finalD, decomp, smoothIter, outTrap.
     *  Used for: water plane, ground plane, or any geometry that modifies the full DE result. */
    addPostMapCode(code: string) {
        this.postMapCode.push(code);
    }

    /** Position 9 (accumulative): Code injected inside mapDist() after fractal distance is computed.
     *  Variables in scope: p_fractal, finalD.
     *  Used for: water plane, ground plane — geometry-only distance override for shadows/AO. */
    addPostDistCode(code: string) {
        this.postDistCode.push(code);
    }

    /** Position 16: Code injected inside applyPostProcessing(). All post-processing is feature-injected.
     *  Variables in scope: col (modifiable), d, glow, volumetric, fogScatter.
     *  Injection order follows feature registration: Atmosphere (fog+glow) → Volumetric (scatter) → others.
     *  Used for: fog, glow, volumetric scatter, custom atmosphere effects. */
    addPostProcessLogic(code: string) {
        this.postProcessLogic.push(code);
    }

    /** Signals that the direct lighting integrator (calculateShading) should be generated.
     *  Called by LightingFeature. The actual GLSL is generated in buildFragment() so that
     *  reflection code from other features (via addShadingLogic) is available. */
    requestShading() {
        this.needsShading = true;
    }

    /** Position 15 (inside calculateShading): Code injected into the reflection evaluation block.
     *  Variables in scope: p_ray, p_fractal, v, n, albedo, roughness, F, NdotV,
     *    reflDir, reflectionLighting (output), stochasticSeed, d, uReflection, uSpecular.
     *  Functions available: GetEnvMap, applyEnvFog, sampleMissEnv, getSurfaceMaterial,
     *    calculatePBRContribution, getBlueNoise4, traceReflectionRay (if injected).
     *  Used for: reflection modes (env map, raymarched). */
    addShadingLogic(code: string) {
        this.shadingReflectionCode.push(code);
    }

    /** Position 17: Compositing code injected inside renderPixel(), after the integrator runs.
     *  Variables in scope: ro, rd, col, d, hit, stochasticSeed.
     *  Used for: light sphere compositing, overlay effects. */
    addCompositeLogic(code: string) {
        this.compositeLogic.push(code);
    }

    /** Position 12: Code injected inside sampleMiss() to override the environment color.
     *  Variables in scope: ro, rd, roughness, env (modifiable vec3).
     *  Used for: light sphere rendering on miss, portals, custom skyboxes. */
    addMissLogic(code: string) {
        this.missLogic.push(code);
    }

    // Generates sampleMiss() — called by integrators when a ray misses geometry.
    // Features inject code via addMissLogic() to override env before it's returned.
    // Injected code has access to: ro, rd, roughness, env (modifiable).
    private buildMissHandler(): string {
        const injectedCode = this.missLogic.join('\n');
        return `
vec3 sampleMiss(vec3 ro, vec3 rd, float roughness) {
    vec3 env = GetEnvMap(rd, roughness);

    // --- FEATURE INJECTION: MISS RAY OVERRIDE ---
    ${injectedCode}

    return env;
}
`;
    }

    /** Position 14: Volumetric code injected inside the trace loop.
     *  marchCode runs per-step, finalizeCode runs after the loop ends.
     *  Used for: volumetric scatter (god rays), atmospheric effects. */
    addVolumeTracing(marchCode: string, finalizeCode: string) {
        if(marchCode) this.volumeBody.push(marchCode);
        if(finalizeCode) this.volumeFinalize.push(finalizeCode);
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

    // Returns a GLSL library (no #version, no void main) for the mesh SDF pass.
    // The GPU pipeline wraps this with #version 300 es + pass-specific uniforms + void main.
    buildMeshSDFLibrary(): string {
        // Build feature-injected uniforms (interlace params etc.) from addUniform() calls
        let injectedUniforms = '';
        this.uniforms.forEach((info, name) => {
            if (info.arraySize) {
                injectedUniforms += `uniform ${info.type} ${name}[${info.arraySize}];\n`;
            } else {
                injectedUniforms += `uniform ${info.type} ${name};\n`;
            }
        });

        const de = DE_MASTER(
            this.formulaLoopBody,
            this.formulaInit,
            this.formulaDist,
            this.hybridInit.join('\n'),
            this.hybridPreLoop.join('\n'),
            this.hybridInLoop.join('\n'),
            this.distOverrideInit,
            this.distOverrideInLoopFull,
            this.distOverrideInLoopGeom,
            this.distOverridePostFull,
            this.distOverridePostGeom,
            this.postMapCode.join('\n'),
            this.postDistCode.join('\n')
        );

        // Base mesh helpers — sphereFold/boxFold/getLength/rotation stubs/snoise.
        // Does NOT include SHARED_TRANSFORMS_GLSL — that arrives via geometry.inject()
        // calling builder.addPreamble(SHARED_TRANSFORMS_GLSL), ensuring no duplication.
        const meshBaseHelpers = `
${GLSL_SPHERE_FOLD}
${GLSL_BOX_FOLD}

float getLength(vec3 p) { return length(p); }

void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}

${getSnoiseFunctions('_')}
`;

        return `
#define MAX_HARD_ITERATIONS 100

// Math constants shared with the main renderer (PI, TAU, INV_TAU, INV_PI, phi)
${GLSL_MATH_CONSTANTS}

${MESH_GLSL_UNIFORMS}

// Stub uniforms required by DE_MASTER generated code (map + mapDist reference these;
// only mapDist is called in the mesh SDF path but both functions must compile).
// Any uniform referenced by features' hybridInLoop/hybridPreLoop injections also goes here.
uniform vec3  uSceneOffsetLow;
uniform vec3  uSceneOffsetHigh;
uniform vec3  uCameraPosition;
uniform float uColorIter;
uniform float uColorMode;
uniform float uColorMode2;
uniform float uUseTexture;
uniform float uTextureModeU;
uniform float uTextureModeV;
uniform float uBurningEnabled;

// Feature-injected uniforms (e.g. interlace params from Interlace.inject())
${injectedUniforms}

// Precision offset stub — mesh SDF operates in local space (no camera offset needed)
vec3 applyPrecisionOffset(vec3 p, vec3 lo, vec3 hi) { return p; }

// Base mesh helpers (sphereFold, boxFold, getLength, rotation stubs, snoise)
${meshBaseHelpers}

// Preambles from feature inject() calls (e.g. SHARED_TRANSFORMS_GLSL from Geometry)
${this.preambles.join('\n')}

// Pre-DE functions (primary formula + secondary interlace formula functions)
${this.preDEFunctions.join('\n')}

// Distance estimator — generates map(vec3 p) -> vec4 and mapDist(vec3 p) -> float
${de}

// Mesh SDF entry point — wraps mapDist() which is a pure function of position
float formulaDE(vec3 pos) {
    return mapDist(pos);
}
`;
    }

    // Returns the fully assembled shader string based on the variant
    buildFragment(): string {
        if (this.variant === 'Mesh') return this.buildMeshSDFLibrary();
        const defines = this.buildDefinesString();
        const uniforms = this.buildUniformsString();
        const headers = this.headers.join('\n');
        const preambles = this.preambles.join('\n');
        const userFunctions = this.preDEFunctions.join('\n');
        const postDEFunctions = this.postDEFunctions.join('\n');

        // Generate shading integrator if requested (deferred so reflection code is available)
        if (this.needsShading) {
            const reflCode = this.shadingReflectionCode.join('\n');
            this.integrators.push(getShadingGLSL(reflCode));
        }

        const integrators = this.integrators.join('\n');
        const math = getMathGLSL(this.useRotation);

        // Core DE
        const de = DE_MASTER(
            this.formulaLoopBody,
            this.formulaInit,
            this.formulaDist,
            this.hybridInit.join('\n'),
            this.hybridPreLoop.join('\n'),
            this.hybridInLoop.join('\n'),
            this.distOverrideInit,
            this.distOverrideInLoopFull,
            this.distOverrideInLoopGeom,
            this.distOverridePostFull,
            this.distOverridePostGeom,
            this.postMapCode.join('\n'),
            this.postDistCode.join('\n')
        );

        // --- VARIANT: PHYSICS (Distance Measurement) ---
        if (this.variant === 'Physics') {
            // Simplified trace function for physics probe (fewer steps, no extra features)
            const simplifiedTraceGLSL = `
bool traceScene(vec3 ro, vec3 rd, out float d, out vec4 result) {
    d = 0.0;
    result = vec4(0.0);

    // 1. Bounding Sphere
    vec3 sphereCenter = -(uSceneOffsetHigh + uSceneOffsetLow);
    vec2 bounds = intersectSphere(ro - sphereCenter, rd, BOUNDING_RADIUS);
    if (bounds.x > bounds.y) return false;
    
    d = max(0.0, bounds.x);
    
    int limit = 100; // Reduced from uMaxSteps for faster probing
    float maxMarch = 100.0; // Reduced max distance
    
    vec4 h = vec4(0.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= limit) break;

        vec3 p = ro + rd * d;
        h = map(p + uCameraPosition);
        
        // Simple hit detection (no refinement)
        float distFromFractalOrigin = length(p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh);
        float floatPrecision = max(1.0e-5, distFromFractalOrigin * 1.0e-5);
        
        if (h.x < floatPrecision) {
            result = h;
            return true;
        }
        
        // Simple step advance (fixed step size)
        d += max(h.x, floatPrecision * 0.5) * 0.9;
        
        if (d > maxMarch) break;
    }
    
    return false;
}
`;
            
            return `
${defines}
${uniforms}
${math}
${BLUE_NOISE}
${COLORING}
${headers}
${preambles}
${userFunctions}
${de}

${simplifiedTraceGLSL}

layout(location = 0) out vec4 pc_fragColor;

void main() {
    ${this.physicsRayGen}

    vec3 ro = vec3(0.0);
    float d = 0.0;
    vec4 result = vec4(0.0);

    bool hit = traceScene(ro, rd, d, result);

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
${preambles}
${userFunctions}
${de}
${postDEFunctions}

${traceGLSL}
${rayGLSL}

layout(location = 0) out vec4 pc_fragColor;

void main() {
    vec3 ro, rd, roClean, rdClean;
    float stochasticSeed;
    getCameraRay(vUv, ro, rd, stochasticSeed, roClean, rdClean);

    vec3 glow = vec3(0.0);
    vec3 fogScatter = vec3(0.0);
    float volumetric = 0.0;
    float d = 0.0;
    vec4 result = vec4(0.0);

    bool hit = traceScene(ro, rd, d, result, glow, 0.0, volumetric, fogScatter);

    if (hit) {
        float mode = (uHistogramLayer > 0) ? uColorMode2 : uColorMode;
        float scale = (uHistogramLayer > 0) ? uColorScale2 : uColorScale;

        vec3 p = ro + rd * d;
        vec3 p_fractal = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

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
        const missHandler = this.buildMissHandler();
        const isPathTracing = this.renderMode === 'PathTracing';

        const traceGLSL = getTraceGLSL(this.isLite, true, this.precisionMode, 0, this.volumeBody.join('\n'), this.volumeFinalize.join('\n'));
        const traceLeanGLSL = isPathTracing
            ? getTraceGLSL(this.isLite, false, this.precisionMode, 0, "", "", "traceSceneLean")
            : "";
        const mainGLSL = getFragmentMainGLSL(isPathTracing, this.maxLights, this.compositeLogic.join('\n'));
        const rayGLSL = getRayGLSL(this.renderMode);
        const postGLSL = getPostGLSL(this.postProcessLogic.join('\n'));

        // Section size profiling — log where the bytes are
        const sections: [string, string][] = [
            ['Defines',     defines],
            ['Uniforms',    uniforms],
            ['Headers',     headers],
            ['Math',        math],
            ['BlueNoise',   BLUE_NOISE],
            ['Coloring',    COLORING],
            ['Preambles',   preambles],
            ['Formulas',    userFunctions],
            ['DE',          de],
            ['PostDE',      postDEFunctions],
            ['MatEval',     materialEval],
            ['MissHandler', missHandler],
            ['Ray',         rayGLSL],
            ['Trace',       traceGLSL],
            ['TraceLean',   traceLeanGLSL],
            ['Integrators', integrators],
            ['Post',        postGLSL],
            ['Main',        mainGLSL],
        ];
        const profile = sections
            .filter(([, s]) => s.length > 0)
            .map(([name, s]) => `${name}: ${(s.length / 1024).toFixed(1)}kb`)
            .join(' | ');
        const totalSize = sections.reduce((sum, [, s]) => sum + s.length, 0);
        if (import.meta.env.DEV) console.log(`[Shader Profile] ${(totalSize / 1024).toFixed(1)}kb — ${profile}`);

        return `
${defines}
${uniforms}
${headers}
${math}
${BLUE_NOISE}
${COLORING}

${preambles}

${userFunctions}

${de}

${postDEFunctions}

${materialEval}

${missHandler}

${rayGLSL}

${traceGLSL}
${traceLeanGLSL}

${integrators}

${postGLSL}
${mainGLSL}
`;
    }
}
