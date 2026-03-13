

// Core helpers needed by all lighting paths (Direct + PT)
export const LIGHTING_SHARED_CORE = `
void buildTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    vec3 up = abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    t = normalize(cross(n, up));
    b = cross(n, t);
}

#ifdef LIGHT_SPHERES
vec2 intersectLightSphere(vec3 ro, vec3 rd) {
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        if (uLightIntensity[i] < 0.01 || uLightType[i] > 0.5 || uLightRadius[i] < 0.001) continue;
        vec3 oc = ro - uLightPos[i];
        float b = dot(rd, oc);
        if (-b < 0.001) continue;
        float dPerp2 = max(0.0, dot(oc, oc) - b * b);
        float r = uLightRadius[i];
        float outerR = r + 0.001;
        if (dPerp2 < outerR * outerR) {
            float dPerp = sqrt(dPerp2);
            float innerR = r * (1.0 - clamp(uLightSoftness[i], 0.0, 1.0));
            float fade = 1.0 - smoothstep(innerR, outerR, dPerp);
            fade *= fade;
            if (fade > 0.001) {
                return vec2(fade, float(i));
            }
        }
    }
    return vec2(0.0, -1.0);
}
#endif
`;

// Fresnel helper — only needed by Cook-Torrance and Path Tracing
export const LIGHTING_SHARED_FRESNEL = `
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
`;

// Combined export for paths that need everything (Cook-Torrance, PT)
export const LIGHTING_SHARED = LIGHTING_SHARED_CORE + LIGHTING_SHARED_FRESNEL;
