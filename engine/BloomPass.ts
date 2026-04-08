/**
 * BloomPass — Multi-pass progressive bloom with separable gaussian blur.
 *
 * Pipeline: bright-pass → downsample chain (5 mip levels) →
 *           separable gaussian blur at each level →
 *           progressive upsample with additive blending →
 *           final half-res bloom texture
 *
 * Performance: ~19 draw calls at progressively smaller resolutions.
 * When bloom intensity is 0, no draws are issued (zero cost).
 */

import * as THREE from 'three';

const MIP_COUNT = 7;

// ── Shared vertex shader (same as main app) ──
const BLOOM_VERT = `
precision highp float;
out vec2 vUv;
void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position, 1.0);
}
`;

// ── Bright-pass: extract pixels above threshold with soft knee ──
const BRIGHT_PASS_FRAG = `
precision highp float;
uniform sampler2D uInput;
uniform float uThreshold;
in vec2 vUv;
layout(location = 0) out vec4 pc_fragColor;

void main() {
    vec3 col = texture(uInput, vUv).rgb;
    float brightness = max(col.r, max(col.g, col.b));

    // Soft knee: smooth transition around threshold
    float knee = uThreshold * 0.5;
    float soft = brightness - uThreshold + knee;
    soft = clamp(soft / (2.0 * knee + 0.0001), 0.0, 1.0);
    soft = soft * soft;

    float contribution = max(soft, step(uThreshold, brightness));
    contribution *= step(0.0001, brightness); // avoid div-by-zero darkening

    pc_fragColor = vec4(col * contribution, 1.0);
}
`;

// ── Downsample: 4-tap bilinear box filter ──
const DOWNSAMPLE_FRAG = `
precision highp float;
uniform sampler2D uInput;
uniform vec2 uTexelSize;
in vec2 vUv;
layout(location = 0) out vec4 pc_fragColor;

void main() {
    // 4 bilinear samples at half-texel offsets = effective 16-texel integration
    vec2 ts = uTexelSize;
    vec3 col  = texture(uInput, vUv + vec2(-0.5, -0.5) * ts).rgb;
    col      += texture(uInput, vUv + vec2( 0.5, -0.5) * ts).rgb;
    col      += texture(uInput, vUv + vec2(-0.5,  0.5) * ts).rgb;
    col      += texture(uInput, vUv + vec2( 0.5,  0.5) * ts).rgb;
    pc_fragColor = vec4(col * 0.25, 1.0);
}
`;

// ── Separable gaussian blur (9-tap, sigma ≈ 2.5) ──
// Always samples at 1-texel spacing — the mip chain provides the spread.
const BLUR_FRAG = `
precision highp float;
uniform sampler2D uInput;
uniform vec2 uDirection; // (1/w, 0) for H or (0, 1/h) for V
in vec2 vUv;
layout(location = 0) out vec4 pc_fragColor;

void main() {
    // 9-tap gaussian weights (sigma ≈ 2.5)
    float w0 = 0.2270270270;
    float w1 = 0.1945945946;
    float w2 = 0.1216216216;
    float w3 = 0.0540540541;
    float w4 = 0.0162162162;

    vec3 col = texture(uInput, vUv).rgb * w0;
    col += texture(uInput, vUv + uDirection * 1.0).rgb * w1;
    col += texture(uInput, vUv - uDirection * 1.0).rgb * w1;
    col += texture(uInput, vUv + uDirection * 2.0).rgb * w2;
    col += texture(uInput, vUv - uDirection * 2.0).rgb * w2;
    col += texture(uInput, vUv + uDirection * 3.0).rgb * w3;
    col += texture(uInput, vUv - uDirection * 3.0).rgb * w3;
    col += texture(uInput, vUv + uDirection * 4.0).rgb * w4;
    col += texture(uInput, vUv - uDirection * 4.0).rgb * w4;

    pc_fragColor = vec4(col, 1.0);
}
`;

// ── Upsample: tent filter + weighted blend with higher-res mip ──
const UPSAMPLE_FRAG = `
precision highp float;
uniform sampler2D uLowRes;
uniform sampler2D uHighRes;
uniform vec2 uLowResTexelSize;
uniform float uMipWeight;  // How much this deeper level contributes
in vec2 vUv;
layout(location = 0) out vec4 pc_fragColor;

void main() {
    // 9-tap tent filter for smooth upsampling of low-res input
    vec2 ts = uLowResTexelSize;
    vec3 low  = texture(uLowRes, vUv + vec2(-1.0, -1.0) * ts).rgb * 1.0;
    low      += texture(uLowRes, vUv + vec2( 0.0, -1.0) * ts).rgb * 2.0;
    low      += texture(uLowRes, vUv + vec2( 1.0, -1.0) * ts).rgb * 1.0;
    low      += texture(uLowRes, vUv + vec2(-1.0,  0.0) * ts).rgb * 2.0;
    low      += texture(uLowRes, vUv                         ).rgb * 4.0;
    low      += texture(uLowRes, vUv + vec2( 1.0,  0.0) * ts).rgb * 2.0;
    low      += texture(uLowRes, vUv + vec2(-1.0,  1.0) * ts).rgb * 1.0;
    low      += texture(uLowRes, vUv + vec2( 0.0,  1.0) * ts).rgb * 2.0;
    low      += texture(uLowRes, vUv + vec2( 1.0,  1.0) * ts).rgb * 1.0;
    low /= 16.0;

    vec3 high = texture(uHighRes, vUv).rgb;
    pc_fragColor = vec4(high + low * uMipWeight, 1.0);
}
`;

// ── Helper: create a render target at the given size ──
function createRT(w: number, h: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false
    });
}

export class BloomPass {
    // Two targets per mip: A = primary (downsample/blur result), B = blur temp
    private mipA: THREE.WebGLRenderTarget[] = [];
    private mipB: THREE.WebGLRenderTarget[] = [];

    // Shaders
    private brightPassMat: THREE.ShaderMaterial;
    private downsampleMat: THREE.ShaderMaterial;
    private blurMat: THREE.ShaderMaterial;
    private upsampleMat: THREE.ShaderMaterial;

    // Render scene
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private mesh: THREE.Mesh;

    // Output
    private outputTexture: THREE.Texture | null = null;

    // Track size
    private width = 0;
    private height = 0;

    constructor() {
        // Scene setup (shared across all passes)
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);

        // Materials
        this.brightPassMat = new THREE.ShaderMaterial({
            vertexShader: BLOOM_VERT,
            fragmentShader: BRIGHT_PASS_FRAG,
            uniforms: {
                uInput: { value: null },
                uThreshold: { value: 0.5 }
            },
            depthTest: false, depthWrite: false,
            glslVersion: THREE.GLSL3
        });

        this.downsampleMat = new THREE.ShaderMaterial({
            vertexShader: BLOOM_VERT,
            fragmentShader: DOWNSAMPLE_FRAG,
            uniforms: {
                uInput: { value: null },
                uTexelSize: { value: new THREE.Vector2() }
            },
            depthTest: false, depthWrite: false,
            glslVersion: THREE.GLSL3
        });

        this.blurMat = new THREE.ShaderMaterial({
            vertexShader: BLOOM_VERT,
            fragmentShader: BLUR_FRAG,
            uniforms: {
                uInput: { value: null },
                uDirection: { value: new THREE.Vector2() }
            },
            depthTest: false, depthWrite: false,
            glslVersion: THREE.GLSL3
        });

        this.upsampleMat = new THREE.ShaderMaterial({
            vertexShader: BLOOM_VERT,
            fragmentShader: UPSAMPLE_FRAG,
            uniforms: {
                uLowRes: { value: null },
                uHighRes: { value: null },
                uLowResTexelSize: { value: new THREE.Vector2() },
                uMipWeight: { value: 1.0 }
            },
            depthTest: false, depthWrite: false,
            glslVersion: THREE.GLSL3
        });
    }

    resize(width: number, height: number) {
        if (this.width === width && this.height === height) return;
        this.width = width;
        this.height = height;

        // Dispose old targets
        this.mipA.forEach(t => t.dispose());
        this.mipB.forEach(t => t.dispose());
        this.mipA = [];
        this.mipB = [];

        // Create mip chain at progressive half-resolutions
        let w = Math.floor(width / 2);
        let h = Math.floor(height / 2);
        for (let i = 0; i < MIP_COUNT; i++) {
            this.mipA.push(createRT(w, h));
            this.mipB.push(createRT(w, h));
            w = Math.floor(w / 2);
            h = Math.floor(h / 2);
        }
    }

    /**
     * Run the full bloom pipeline.
     * Returns the bloom texture (half-res), or null if bloom is disabled.
     */
    render(
        inputTexture: THREE.Texture,
        renderer: THREE.WebGLRenderer,
        threshold: number,
        radius: number
    ): THREE.Texture | null {
        if (this.mipA.length === 0) return null;

        const savedTarget = renderer.getRenderTarget();

        // ── 1. Bright pass → mipA[0] (half-res) ──
        this.brightPassMat.uniforms.uInput.value = inputTexture;
        this.brightPassMat.uniforms.uThreshold.value = threshold;
        this.drawPass(renderer, this.brightPassMat, this.mipA[0]);

        // ── 2. Progressive downsample: mipA[0] → mipA[1] → ... → mipA[N-1] ──
        for (let i = 0; i < MIP_COUNT - 1; i++) {
            const src = this.mipA[i];
            this.downsampleMat.uniforms.uInput.value = src.texture;
            this.downsampleMat.uniforms.uTexelSize.value.set(
                1.0 / src.width, 1.0 / src.height
            );
            this.drawPass(renderer, this.downsampleMat, this.mipA[i + 1]);
        }

        // ── 3. Determine active mip levels from radius (spread control) ──
        // radius 0.5 → ~2 levels (tight glow), radius 5.0 → all 5 (wide dreamy bloom)
        const activeLevels = Math.min(MIP_COUNT, Math.max(2, Math.ceil(radius + 0.5)));

        // ── 4. Separable gaussian blur at each active mip level ──
        // Fixed 1-texel spacing — mip chain provides the spread, not tap distance
        for (let i = 0; i < activeLevels; i++) {
            const target = this.mipA[i];
            const temp = this.mipB[i];

            // Horizontal: mipA[i] → mipB[i]
            this.blurMat.uniforms.uInput.value = target.texture;
            this.blurMat.uniforms.uDirection.value.set(1.0 / target.width, 0);
            this.drawPass(renderer, this.blurMat, temp);

            // Vertical: mipB[i] → mipA[i]
            this.blurMat.uniforms.uInput.value = temp.texture;
            this.blurMat.uniforms.uDirection.value.set(0, 1.0 / target.height);
            this.drawPass(renderer, this.blurMat, target);
        }

        // ── 5. Progressive upsample with weighted blending ──
        // Deeper levels contribute based on radius — fractional level gets partial weight
        for (let i = activeLevels - 2; i >= 0; i--) {
            const lowRes = (i === activeLevels - 2) ? this.mipA[i + 1] : this.mipB[i + 1];
            const highRes = this.mipA[i];

            // Weight for the deepest active level fades based on fractional radius
            const levelDepth = i + 1; // depth of the low-res source
            const weight = Math.min(1.0, radius + 0.5 - levelDepth);

            this.upsampleMat.uniforms.uLowRes.value = lowRes.texture;
            this.upsampleMat.uniforms.uHighRes.value = highRes.texture;
            this.upsampleMat.uniforms.uLowResTexelSize.value.set(
                1.0 / lowRes.width, 1.0 / lowRes.height
            );
            this.upsampleMat.uniforms.uMipWeight.value = Math.max(0.0, weight);

            // Write to mipB[i] (can't read+write same target)
            this.drawPass(renderer, this.upsampleMat, this.mipB[i]);
        }

        // Restore original render target
        renderer.setRenderTarget(savedTarget);

        this.outputTexture = this.mipB[0].texture;
        return this.outputTexture;
    }

    getOutput(): THREE.Texture | null {
        return this.outputTexture;
    }

    private drawPass(
        renderer: THREE.WebGLRenderer,
        material: THREE.ShaderMaterial,
        target: THREE.WebGLRenderTarget
    ) {
        this.mesh.material = material;
        renderer.setRenderTarget(target);
        renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.mipA.forEach(t => t.dispose());
        this.mipB.forEach(t => t.dispose());
        this.mipA = [];
        this.mipB = [];
        this.brightPassMat.dispose();
        this.downsampleMat.dispose();
        this.blurMat.dispose();
        this.upsampleMat.dispose();
        this.mesh.geometry.dispose();
        this.outputTexture = null;
    }
}
