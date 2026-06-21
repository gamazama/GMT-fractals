
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
// Live-blit box filter (NxN average around sampleUV). 1 = single sample.
// The bucket-render frame loop sets this to ceil(srcSize/canvasSize) so that a
// large render target downsampled to a smaller canvas isn't bilinear-aliased.
uniform float uPreviewBoxTaps;
// Multi-pass export uniforms — shared with the main shader via mainUniforms. At defaults
// (uOutputPass=0) these are no-ops; WorkerExporter drives them per session.
uniform float uOutputPass;  // 0=beauty, 1=alpha mask, 2=depth
uniform float uDepthMin;    // Near plane for depth normalization (world units)
uniform float uDepthMax;    // Far plane for depth normalization (world units)

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

    vec4 tex;
    int boxTaps = int(uPreviewBoxTaps + 0.5);
    if (boxTaps <= 1) {
        tex = texture(map, sampleUV);
    } else {
        // NxN box average to filter heavy downsampling (live blit during a
        // bucket render at high export res). Capped at 8x8 so worst-case is
        // 64 taps per fragment — negligible on a small preview canvas.
        const int MAX_TAPS = 8;
        int taps = min(boxTaps, MAX_TAPS);
        vec2 texelSize = 1.0 / uResolution;
        float halfN = float(taps) * 0.5 - 0.5;
        vec4 sum = vec4(0.0);
        float wsum = 0.0;
        for (int y = 0; y < MAX_TAPS; y++) {
            if (y >= taps) break;
            for (int x = 0; x < MAX_TAPS; x++) {
                if (x >= taps) break;
                vec2 off = (vec2(float(x), float(y)) - halfN) * texelSize;
                sum += texture(map, sampleUV + off);
                wsum += 1.0;
            }
        }
        tex = sum / wsum;
    }

    // --- EXPORT PASS BRANCHES ---
    // Alpha and depth passes skip tone mapping + feature color injections entirely
    // and write a luminance pass (same value in R,G,B) so the result is legible as
    // a greyscale video or image regardless of container.
    if (uOutputPass > 1.5) {
        // Depth: linear camera distance, normalized to the user-configured [uDepthMin, uDepthMax]
        // range (defaults to [0, 5] world units; RenderPopup can auto-populate from the
        // atmosphere feature's fog start/end when fog is enabled). Values outside the range
        // clamp to 0 (near) or 1 (far).
        float span = max(uDepthMax - uDepthMin, 0.0001);
        float d = clamp((tex.a - uDepthMin) / span, 0.0, 1.0);
        pc_fragColor = vec4(d, d, d, 1.0);
        return;
    }
    if (uOutputPass > 0.5) {
        // Alpha mask: tex.a is already the accumulated fractional coverage (the main shader
        // writes per-sample binary 1.0/0.0, and the N-sample accumulation averages to a smooth
        // edge). No thresholding needed — the sub-pixel AA comes for free from the TAA jitter.
        float a = clamp(tex.a, 0.0, 1.0);
        pc_fragColor = vec4(a, a, a, 1.0);
        return;
    }

    // Beauty pass (default)
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

    // 6. Ordered dither — breaks 8-bit banding in dark gradients (e.g. the
    // default near-black background). Triangular-PDF noise of ±1 LSB applied in
    // output (sRGB) space; static (not frame-animated) so a converged still
    // image stays steady and accumulation is unaffected. Cost: a few ALU ops on
    // a single full-screen pass — unmeasurable.
    //
    // DETERMINISM NOTE: this is gated on uEncodeOutput, but the PNG/bucket export
    // path also sets uEncodeOutput=1.0 (GmtBucketHost / FractalEngine readback),
    // so encoded exports DO receive this ±1 LSB noise — they are NOT byte-exact.
    // Any reference-image / reproducibility test (e.g. debug/bench-shader-refs)
    // can and SHOULD disable this block (comment it out, or gate it behind a
    // uDither uniform set to 0) before byte-comparing renders.
    if (uEncodeOutput > 0.5) {
        float n1 = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        float n2 = fract(sin(dot(gl_FragCoord.xy + 0.5, vec2(12.9898, 78.233))) * 43758.5453);
        col += (n1 + n2 - 1.0) / 255.0;  // triangular PDF, ±1/255
    }

    pc_fragColor = vec4(col, 1.0);
}
`;
};
