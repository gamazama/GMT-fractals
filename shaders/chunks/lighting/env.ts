
export const LIGHTING_ENV = `
// ------------------------------------------------------------------
// ENVIRONMENT MAP
// ------------------------------------------------------------------

vec3 GetEnvMap(vec3 dir, float roughness) {
    // 1. Apply Rotation (CPU Optimized: uEnvRotationMatrix)
    if (abs(uEnvRotation) > 0.001) {
        dir.xz = uEnvRotationMatrix * dir.xz;
    }

    vec3 col; // Result variable

    if (uEnvSource > 0.5) {
        // Path 1: Gradient Texture
        float t = dir.y * 0.5 + 0.5;
        col = texture2D(uEnvGradient, vec2(t, 0.5)).rgb;
    } 
    else if (uUseEnvMap > 0.5) {
        // Path 2: EnvMap Texture (Flattened else-if for compiler safety)
        vec2 uv = vec2(atan(dir.z, dir.x) * 0.1591549 + 0.5, 1.0 - acos(dir.y) * 0.3183098);
        float bias = roughness * 6.0; 
        col = texture2D(uEnvMapTexture, uv, bias).rgb;
    } 
    else {
        // Path 3: Procedural Sky (Explicit Else block)
        float y = dir.y * 0.5 + 0.5;
        vec3 skyBase = mix(vec3(0.02, 0.02, 0.05), vec3(0.15, 0.15, 0.25), y);
        vec3 sky = mix(skyBase, vec3(0.1), roughness * 0.5); 
        
        float specPower = mix(100.0, 0.5, roughness * roughness); 
        float rimPower = mix(10.0, 1.0, roughness);
        
        vec3 sunDir = normalize(vec3(1.0, 4.0, 2.0));
        float sunDot = max(0.0, dot(dir, sunDir));
        float light = pow(sunDot, specPower);
        
        vec3 rimDir = normalize(vec3(-1.0, 1.0, -1.0));
        float rimDot = max(0.0, dot(dir, rimDir));
        float rim = pow(rimDot, rimPower) * 0.5;
        
        float brightness = mix(1.0, 0.3, roughness);
        col = sky + vec3(1.0) * light * 0.8 * brightness + vec3(0.8, 0.9, 1.0) * rim * brightness;
    }

    return col;
}
`;
