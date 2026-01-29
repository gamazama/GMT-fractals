
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

        if (feat.shader) {
            const isPostProcessFeature = feat.shader.main || feat.shader.mainUV;
            if (isPostProcessFeature) {
                if (feat.shader.uniforms) injectedUniforms += feat.shader.uniforms + "\n";
                if (feat.shader.functions) injectedFunctions += feat.shader.functions + "\n";
                if (feat.shader.mainUV) injectedMainUV += `\n    // Feature: ${feat.name} (UV)\n    ${feat.shader.mainUV}\n`;
                if (feat.shader.main) injectedMainColor += `\n    // Feature: ${feat.name} (Color)\n    ${feat.shader.main}\n`;
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

// Narkowicz ACES Tone Mapping
vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

// Standard sRGB Transfer Function
vec3 linearToSRGB(vec3 color) {
    vec3 result;
    for(int i=0; i<3; i++) {
        float c = color[i];
        if (c <= 0.0031308) {
            result[i] = 12.92 * c;
        } else {
            result[i] = 1.055 * pow(c, 1.0/2.4) - 0.055;
        }
    }
    return result;
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
    
    // 4. Tone Mapping
    col = ACESFilm(col);
    
    // 5. Output Encoding
    if (uEncodeOutput > 0.5) {
        col = linearToSRGB(col);
    }
    
    pc_fragColor = vec4(col, 1.0);
}
`;
};
