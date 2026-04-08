
import { featureRegistry } from '../../engine/FeatureSystem';

// Generator function to stitch together the post-processing shader
export const generatePostProcessFrag = () => {
    
    // 1. Collect Injections
    let injectedUniforms = "";
    let injectedFunctions = "";
    let injectedMainUV = "";
    let injectedMainColor = "";

    const features = featureRegistry.getAll();
    features.forEach(feat => {
        Object.values(feat.params).forEach(param => {
            if (param.uniform) {
                let type = "float"; 
                switch (param.type) {
                    case 'float': case 'int': case 'boolean': type = 'float'; break;
                    case 'vec2': type = 'vec2'; break;
                    case 'vec3': case 'color': type = 'vec3'; break;
                    case 'vec4': type = 'vec4'; break;
                    case 'image': case 'gradient': type = 'sampler2D'; break;
                }
                injectedUniforms += `uniform ${type} ${param.uniform};\n`;
            }
        });

        if (feat.postShader) {
            const isPostProcessFeature = feat.postShader.main || feat.postShader.mainUV;
            if (isPostProcessFeature) {
                if (feat.postShader.uniforms) injectedUniforms += feat.postShader.uniforms + "\n";
                if (feat.postShader.functions) injectedFunctions += feat.postShader.functions + "\n";
                if (feat.postShader.mainUV) injectedMainUV += `\n    // Feature: ${feat.name} (UV)\n    ${feat.postShader.mainUV}\n`;
                if (feat.postShader.main) injectedMainColor += `\n    // Feature: ${feat.name} (Color)\n    ${feat.postShader.main}\n`;
            }
        }
    });

    return `
uniform sampler2D map;
uniform vec2 uResolution;
uniform float uEncodeOutput;

// --- DYNAMIC UNIFORMS ---
${injectedUniforms}

in vec2 vUv;
layout(location = 0) out vec4 pc_fragColor;

// --- DYNAMIC FUNCTIONS ---
${injectedFunctions}

// --- TONE MAPPING FUNCTIONS ---

// Narkowicz ACES Tone Mapping
vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

// AgX Tone Mapping (Troy Sobotka)
// Preserves saturated colors better than ACES
vec3 AgXToneMap(vec3 val) {
    // AgX inset matrix (sRGB -> AgX log space)
    mat3 agxInset = mat3(
        0.842479062253094, 0.0784335999999992, 0.0792237451477643,
        0.0423282422610123, 0.878468636469772, 0.0791661274605434,
        0.0423756549057051, 0.0784336, 0.879142973793104
    );
    // AgX outset matrix (AgX -> sRGB)
    mat3 agxOutset = mat3(
        1.19687900512017, -0.0980208811401368, -0.0990297440797205,
        -0.0528968517574562, 1.15190312990417, -0.0989611768448433,
        -0.0529716355144438, -0.0980434501171241, 1.15107367264116
    );
    val = agxInset * max(val, vec3(1e-10));
    val = log2(val);
    val = (val + 12.47393) / 16.5;
    val = clamp(val, 0.0, 1.0);
    // 6th order polynomial contrast curve
    vec3 v2 = val * val;
    vec3 v4 = v2 * v2;
    val = 15.5 * v4 * v2
        - 40.14 * v4 * val
        + 31.96 * v4
        - 6.868 * v2 * val
        + 0.4298 * v2
        + 0.1191 * val
        - 0.00232;
    val = agxOutset * val;
    return clamp(val, 0.0, 1.0);
}

// Reinhard Tone Mapping (extended, luminance-based)
vec3 ReinhardToneMap(vec3 x) {
    float lum = dot(x, vec3(0.2126, 0.7152, 0.0722));
    float mapped = lum / (1.0 + lum);
    return x * (mapped / max(lum, 0.001));
}

// Khronos PBR Neutral Tone Mapping
// Minimal color shift, preserves saturation in midtones
vec3 NeutralToneMap(vec3 color) {
    float startCompression = 0.8 - 0.04;
    float desaturation = 0.15;
    float x = min(color.r, min(color.g, color.b));
    float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
    color -= offset;
    float peak = max(color.r, max(color.g, color.b));
    if (peak < startCompression) return color;
    float d = 1.0 - startCompression;
    float newPeak = 1.0 - d * d / (peak + d - startCompression);
    color *= newPeak / peak;
    float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
    return mix(color, vec3(newPeak), g);
}

// Tone mapping dispatcher (uToneMapping: 0=ACES, 1=AgX, 2=Reinhard, 3=Neutral, 4=None)
vec3 applyToneMapping(vec3 col) {
    if (uToneMapping < 0.5) return ACESFilm(col);
    if (uToneMapping < 1.5) return AgXToneMap(col);
    if (uToneMapping < 2.5) return ReinhardToneMap(col);
    if (uToneMapping < 3.5) return NeutralToneMap(col);
    return clamp(col, 0.0, 1.0);
}

// Standard sRGB Transfer Function
vec3 linearToSRGB(vec3 color) {
    // Avoid dynamic indexing loop — fxc warns about uninitialized vec3 with dynamic index
    return vec3(
        color.r <= 0.0031308 ? 12.92 * color.r : 1.055 * pow(color.r, 1.0/2.4) - 0.055,
        color.g <= 0.0031308 ? 12.92 * color.g : 1.055 * pow(color.g, 1.0/2.4) - 0.055,
        color.b <= 0.0031308 ? 12.92 * color.b : 1.055 * pow(color.b, 1.0/2.4) - 0.055
    );
}

void main() {
    vec2 sampleUV = vUv;
    float mask = 1.0;

    // --- FEATURE INJECTION: UV MODIFICATION ---
    ${injectedMainUV}

    vec4 tex = texture(map, sampleUV);
    vec3 col = tex.rgb;

    col *= mask;

    // --- FEATURE INJECTION: COLOR MODIFICATION ---
    ${injectedMainColor}

    // 4. Tone Mapping (selectable via uToneMapping uniform)
    col = applyToneMapping(col);

    // 5. Output Encoding
    if (uEncodeOutput > 0.5) {
        col = linearToSRGB(col);
    }

    pc_fragColor = vec4(col, 1.0);
}
`;
};
