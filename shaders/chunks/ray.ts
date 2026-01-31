
export const getRayGLSL = (renderMode: 'Direct' | 'PathTracing') => {
    
    const noiseLogic = renderMode === 'PathTracing' ? 
        `needNoise = true;` :
        `
        if (!isMoving) needNoise = true;
        if (uPTStochasticShadows > 0.5) needNoise = true;
        if (uDOFStrength > 0.0000001) needNoise = true;
        `;

    return `
// ------------------------------------------------------------------
// STAGE 1: RAY GENERATION
// Handles Camera Basis and Depth of Field
// ------------------------------------------------------------------
void getCameraRay(vec2 uvCoord, float seed, out vec3 ro, out vec3 rd, out float stochasticSeed) {
    vec2 uv = uvCoord * 2.0 - 1.0;
    
    // --- TAA JITTER (Calculated on CPU) ---
    if (uBlendFactor < 0.999) {
        vec2 pixelSize = 2.0 / uResolution;
        // uJitter is pre-calculated Halton(index) from CPU
        uv += uJitter * pixelSize * 0.5;
    }

    stochasticSeed = 0.0;
    
    // Cache blending factor locally to help compiler optimization
    float blendFactor = uBlendFactor;
    bool isMoving = blendFactor >= 0.99;
    
    // --- STOCHASTIC SEED GENERATION ---
    bool needNoise = false;
    
    ${noiseLogic}
    
    if (needNoise) {
        stochasticSeed = ign_noise(gl_FragCoord.xy + vec2(seed * 5.588, seed * 2.123));
    }
    
    vec3 forward = uCamForward;
    vec3 right = uCamBasisX;
    vec3 up = uCamBasisY;
    
    // --- PROJECTION SWITCH ---
    if (uCamType > 1.5) {
        // EQUIRECTANGULAR (360 SKYBOX)
        float lambda = uv.x * 3.1415926535; 
        float phi = uv.y * 1.5707963268;
        float cPhi = cos(phi);
        vec3 localRd = vec3(
            sin(lambda) * cPhi,
            sin(phi),
            -cos(lambda) * cPhi
        );
        vec3 r = normalize(right);
        vec3 u = normalize(up);
        vec3 f = normalize(forward);
        mat3 rot = mat3(r, u, -f);
        rd = r * localRd.x + u * localRd.y + f * -localRd.z;
        ro = vec3(0.0);
        // Fallthrough to DOF logic allowed
    } else if (uCamType > 0.5) {
        // ORTHOGRAPHIC
        rd = normalize(forward);
        ro = uv.x * right + uv.y * up;
    } else {
        // PERSPECTIVE
        rd = normalize(forward + uv.x * right + uv.y * up);
        ro = vec3(0.0);
    }

    // --- DEPTH OF FIELD ---
    if (uDOFStrength > 0.0000001) {
        vec3 focalPoint = ro + rd * uDOFFocus;
        float r = sqrt(stochasticSeed);
        float theta = ign_noise(gl_FragCoord.xy + vec2(seed * 1.1, seed * 3.3)) * 6.283185;
        float blades = 6.0; 
        float pi = 3.14159265;
        float segment = 2.0 * pi / blades;
        float localTheta = mod(theta, segment) - (segment * 0.5);
        float polyRadius = cos(pi / blades) / cos(localTheta);
        r *= polyRadius;
        theta += 0.26;
        vec2 offset = vec2(cos(theta), sin(theta)) * r * uDOFStrength;
        offset.y *= 1.3; 
        vec3 lensOffset = normalize(right) * offset.x + normalize(up) * offset.y; 
        ro += lensOffset;
        
        // Recalculate ray direction to converge at focal point
        // Works for both Perspective and Orthographic (Tilt-Shift effect)
        rd = normalize(focalPoint - ro);
    }
}
`;
};

export const RAY = getRayGLSL('Direct');
