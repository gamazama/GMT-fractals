
// Inlined logic for ProcessVolume
// Expects variables in scope:
// float d (current distance)
// vec4 h (hit result: x=d, y=trap, z=iter, w=decomp)
// vec3 p (current ray position)
// inout vec3 accColor
// inout float accDensity
// inout float accAlpha (used for scalar glow accumulation)

export const ATMOSPHERE_VOLUME_BODY = `
    if (uGlowIntensity > 0.0001) {
        float dist = max(h.x, 0.0);
        // Aura mode: glow peaks AWAY from surface (tightness < 1)
        float k = max(uGlowSharpness, 0.01);
        float aura = dist * k * 2.718 * exp(-k * dist);
        // Standard mode: glow hugs the surface (tightness >= 1)
        float standard = exp(-uGlowSharpness * dist);
        // Blend between aura and standard in the 0.75-1.0 range
        float blend = smoothstep(0.75, 1.0, uGlowSharpness);
        float gFactor = mix(aura, standard, blend);
        gFactor *= uFudgeFactor * 0.4;
        
        #ifdef GLOW_FAST
            // Fast Mode: Accumulate scalar intensity only
            accAlpha += gFactor;
        #else
            // Quality Mode: Accumulate full vector color
            if (gFactor > 1.0e-6) {
                vec3 p_fractal_glow = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
                accColor += getGlowColor(p_fractal_glow, h) * gFactor;
            }
        #endif
    }

    // Volumetric Fog
    if (uFogDensity > 0.0001) {
        float stepVal = max(h.x, 0.0001);
        // Corrected density factor: Reduced from 0.05 to 0.0005 (100x reduction)
        accDensity += (1.0 / (stepVal * 5.0 + 0.1)) * uFogDensity * uFudgeFactor * 0.0005;
    }
`;

export const ATMOSPHERE_VOLUME_FINALIZE = `
    #ifdef GLOW_FAST
        if (accAlpha > 0.0001) {
            vec3 p_fractal_res = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
            // Tint the accumulated intensity by the color at the hit point
            vec3 glowCol = getGlowColor(p_fractal_res, h);
            
            // Prevent blowout
            accColor += glowCol * min(accAlpha, 100.0);
        }
    #endif
`;
