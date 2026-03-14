
import { FeatureDefinition } from '../engine/FeatureSystem';

export interface PostEffectsState {
    bloomIntensity: number;
    bloomThreshold: number;
    bloomRadius: number;
    caStrength: number;
}

export const PostEffectsFeature: FeatureDefinition = {
    id: 'postEffects',
    shortId: 'pe',
    name: 'Post Effects',
    category: 'Post Process',
    params: {
        bloomIntensity: {
            type: 'float',
            default: 0.0,
            label: 'Bloom',
            shortId: 'bi',
            uniform: 'uBloomIntensity',
            min: 0.0, max: 5.0, step: 0.01,
            group: 'bloom',
            noReset: true,
            format: (v) => {
                const n = v as number;
                if (n === 0) return '0.0 (off)';
                return n.toFixed(3);
            }
        },
        bloomThreshold: {
            type: 'float',
            default: 0.25,
            label: 'Threshold',
            shortId: 'bt',
            uniform: 'uBloomThreshold',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'bloom',
            parentId: 'bloomIntensity',
            condition: { gt: 0.0 },
            noReset: true
        },
        bloomRadius: {
            type: 'float',
            default: 7.0,
            label: 'Spread',
            shortId: 'br',
            uniform: 'uBloomRadius',
            min: 0.5, max: 7.0, step: 0.1,
            group: 'bloom',
            parentId: 'bloomIntensity',
            condition: { gt: 0.0 },
            noReset: true
        },
        caStrength: {
            type: 'float',
            default: 0.0,
            label: 'Chromatic Aberration',
            shortId: 'ca',
            uniform: 'uCAStrength',
            min: 0.0, max: 10.0, step: 0.01,
            group: 'lens',
            noReset: true,
            format: (v) => {
                const n = v as number;
                if (n === 0) return '0.0 (off)';
                return n.toFixed(3);
            }
        }
    },
    postShader: {
        uniforms: `uniform sampler2D uBloomTexture;`,
        functions: `
            // Barrel distortion — models how real lenses bend light more at edges
            vec2 caBarrelDistort(vec2 coord, float amt) {
                vec2 cc = coord - 0.5;
                float dist = dot(cc, cc);
                return coord + cc * dist * amt;
            }

            // Attempt to approximate visible spectrum as RGB
            // Maps t in [0,1] across the hue spectrum (YACA by Fu-Bama)
            vec3 caSpectrum(float t) {
                vec3 w = abs(t * 4.0 - vec3(1.0, 2.0, 1.0));
                w = clamp(1.5 - w, 0.0, 1.0);
                w.xz += clamp(t * 4.0 - 3.5, 0.0, 1.0);
                w.z = 1.0 - w.z;
                return w;
            }
        `,
        main: `
            // --- Spectral Chromatic Aberration ---
            // Per-wavelength barrel distortion (12 spectral samples)
            if (uCAStrength > 0.0001) {
                const int CA_SAMPLES = 12;
                float caMaxDistort = uCAStrength * 0.15;

                vec3 caSum = vec3(0.0);
                vec3 caWSum = vec3(0.0);
                for (int i = 0; i < CA_SAMPLES; i++) {
                    float t = float(i) / float(CA_SAMPLES - 1);
                    vec3 w = caSpectrum(t);
                    caWSum += w;
                    caSum += w * texture(map, caBarrelDistort(sampleUV, caMaxDistort * (t - 0.5))).rgb;
                }
                col = caSum / caWSum;
            }

            // --- Multi-Pass Bloom (composited by BloomPass in worker) ---
            if (uBloomIntensity > 0.001) {
                col += texture(uBloomTexture, sampleUV).rgb * uBloomIntensity;
            }
        `
    }
};
