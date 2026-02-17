

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
    // Offsets the ray origin slightly to anti-alias over time
    // SAFETY: Ensure resolution is valid to prevent NaN
    if (uBlendFactor < 0.999 && uResolution.x > 0.5) {
        vec2 pixelSize = 2.0 / uResolution;
        uv += uJitter * pixelSize * 0.5;
    }

    stochasticSeed = 0.5; // Default safe value
    
    // Cache blending factor locally to help compiler optimization
    float blendFactor = uBlendFactor;
    bool isMoving = blendFactor >= 0.99;
    
    // --- STOCHASTIC SEED GENERATION ---
    bool needNoise = false;
    
    ${noiseLogic}
    
    // Use Blue Noise Red Channel as base seed
    if (needNoise) {
        stochasticSeed = getBlueNoise(gl_FragCoord.xy);
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
        
        // Use Blue Noise channels directly for Disk Sampling to ensure good distribution
        vec4 blue = getBlueNoise4(gl_FragCoord.xy);
        
        float r = sqrt(blue.r);
        float theta = blue.g * 6.283185;
        
        // Polygonal Bokeh Shape (Hexagon)
        float blades = 6.0; 
        float pi = 3.14159265;
        float segment = 2.0 * pi / blades;
        float localTheta = mod(theta, segment) - (segment * 0.5);
        float polyRadius = cos(pi / blades) / cos(localTheta);
        r *= polyRadius;
        
        theta += 0.26; // Rotation offset
        
        vec2 offset = vec2(cos(theta), sin(theta)) * r * uDOFStrength;
        offset.y *= 1.3; // Anamorphic squash
        
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
