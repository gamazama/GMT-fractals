

export const getMathGLSL = (useRotation: boolean) => {
    
    const rotationLogic = !useRotation ? `
    // Kernel Optimization: No Rotation Code
    void applyLocalRotation(inout vec3 p) {}
    void unapplyLocalRotation(inout vec3 p) {}
    ` : `
    // Kernel Capability: Local Rotation
    // CPU Optimized: Pre-calculated Matrix (mat3) to avoid 6x sin/cos per iteration
    // uniform mat3 uPreRotMatrix; // Defined in UNIFORMS chunk

    void applyLocalRotation(inout vec3 p) {
        if (uPreRotEnabled > 0.5) {
            // p' = M * p
            p = uPreRotMatrix * p;
        }
    }

    void unapplyLocalRotation(inout vec3 p) {
        if (uPreRotEnabled > 0.5) {
            // Inverse of a rotation matrix is its Transpose
            p = transpose(uPreRotMatrix) * p;
        }
    }
    `;

    return `
// Constants
#define MAX_DIST 10000.0
#define MISS_DIST 1000.0            // Far sentinel for missed rays — d > MISS_DIST means no geometry hit; must be < MAX_DIST
#define BOUNDING_RADIUS 400.0
#define PI 3.14159265
#define TAU 6.28318530
#define INV_TAU 0.15915494          // 1/(2π) — maps [-π,π] atan2 to [-0.5,0.5]
#define INV_PI  0.31830989          // 1/π — maps [0,π] acos to [0,1]
#define PRECISION_RATIO_HIGH 5.0e-7 // ~0.5 ppm — float precision floor, scales with distance from fractal origin
#define PRECISION_RATIO_LOW  1.0e-5 // ~10 ppm — low precision / mobile float floor
#define GGX_EPSILON 0.0001          // GGX denominator safety — prevents divide-by-zero near specular singularities
#define DIR_LIGHT_DIST 100.0        // Directional light distance proxy — larger than BOUNDING_RADIUS, treated as infinite
const float phi = 1.61803398875;

// --- RANDOM FUNCTIONS ---
// Interleaved Gradient Noise (Jimenez 2014, "Next Generation Post Processing in Call of Duty")
float ign_noise(vec2 uv) {
    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(uv, magic.xy)));
}

// Hash without sine — Dave Hoskins (shadertoy.com/view/4djSRW)
float hash21(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// --- PRECISION MATH HELPER ---
// Reconstructs the absolute fractal space position from the split-precision context.
// p_fractal = (ctx.pos + ctx.originLow) + ctx.originHigh
vec3 applyPrecisionOffset(vec3 localPos, vec3 low, vec3 high) {
    return (localPos + low) + high;
}

vec4 textureLod0(sampler2D tex, vec2 uv) {
    #if __VERSION__ >= 300
        return textureLod(tex, uv, 0.0);
    #else
        #ifdef GL_EXT_shader_texture_lod
            return texture2DLodEXT(tex, uv, 0.0);
        #else
            return texture2D(tex, uv, -16.0);
        #endif
    #endif
}

// Distance metric: 0=Euclidean, 1=Chebyshev, 2=Manhattan, 3=Quartic
float getLength(vec3 p) {
    float m = uDistanceMetric;
    if (m < 0.5) return length(p);                                     // Euclidean
    if (m < 1.5) return max(abs(p.x), max(abs(p.y), abs(p.z)));       // Chebyshev (L∞)
    if (m < 2.5) return (abs(p.x) + abs(p.y) + abs(p.z)) * 0.57735;  // Manhattan (L1), scaled by 1/√3 to approximate Euclidean magnitude
    vec3 p2 = p*p; vec3 p4 = p2*p2;
    return pow(dot(p4, vec3(1.0)), 0.25);                              // Quartic (L4)
}

#ifdef LAYER3_ENABLED
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
// Perlin's fast approximation: taylorInvSqrt(r) ≈ 1/sqrt(r) for r∈[0.5,2.0]
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

// 3D Simplex noise — Stefan Gustavson (github.com/stegu/webgl-noise)
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;  // 1/7 — gradient grid scale
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // 49 = 7×7 gradient cell wrap
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );              // 7 gradient cells per axis
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );  // 42.0 = Perlin's empirical normalization to [-1,1]
}
#endif // LAYER3_ENABLED

vec3 InverseACESFilm(vec3 x) {
    float a = 2.51; float b = 0.03; float c = 2.43; float d = 0.59; float e = 0.14;
    vec3 y = clamp(x, 0.0, 0.99);
    vec3 A = c * y - a; vec3 B = d * y - b; vec3 C = e * y;
    vec3 D = sqrt(max(vec3(0.0), B*B - 4.0*A*C));
    return (-B - D) / (2.0 * A);
}

// Applies Color Profile to Texture Lookup
// 0=sRGB, 1=Linear, 2=ACES
vec3 applyTextureProfile(vec3 col, float mode) {
    if (mode < 0.5) {
        // 0: sRGB -> Linear
        return pow(max(col, vec3(0.0)), vec3(2.2));
    } 
    if (mode > 1.5) {
        // 2: ACES Inverse -> Linear
        return InverseACESFilm(col);
    }
    // 1: Linear (Pass-through)
    return col;
}

void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {
    float r2 = max(dot(z,z), 1.0e-9);
    float minR2 = max(minR * minR, 1.0e-9);
    float fixedR2 = max(fixedR * fixedR, 1.0e-9);
    float k = clamp(fixedR2 / r2, 1.0, fixedR2 / minR2);
    z *= k; dz *= k;
}

void boxFold(inout vec3 z, inout float dz, float foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}

vec2 intersectSphere(vec3 ro, vec3 rd, float r) {
    float b = dot(ro, rd); float c = dot(ro, ro) - r * r;
    float h = b * b - c; if (h < 0.0) return vec2(1.0, 0.0);
    h = sqrt(h); return vec2(-b - h, -b + h);
}

${rotationLogic}

`;
};
