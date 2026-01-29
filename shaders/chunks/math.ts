

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
#define BOUNDING_RADIUS 400.0 
const float phi = 1.61803398875;

// --- RANDOM FUNCTIONS (Moved from random.ts to ensure scope availability) ---
float ign_noise(vec2 uv) {
    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(uv, magic.xy)));
}

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
    return vec4(0.0);
}

float getLength(vec3 p) {
    float m = uDistanceMetric;
    if (m < 0.5) return length(p);
    if (m < 1.5) return max(abs(p.x), max(abs(p.y), abs(p.z)));
    if (m < 2.5) return (abs(p.x) + abs(p.y) + abs(p.z)) * 0.57735;
    vec3 p2 = p*p; vec3 p4 = p2*p2;
    return pow(dot(p4, vec3(1.0)), 0.25);
}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

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
  float n_ = 0.142857142857; 
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );   
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
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

vec3 InverseACESFilm(vec3 x) {
    float a = 2.51; float b = 0.03; float c = 2.43; float d = 0.59; float e = 0.14;
    vec3 y = clamp(x, 0.0, 0.99);
    vec3 A = c * y - a; vec3 B = d * y - b; vec3 C = e * y;
    vec3 D = sqrt(max(vec3(0.0), B*B - 4.0*A*C));
    return (-B - D) / (2.0 * A);
}

void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {
    float r2 = dot(z,z); r2 = max(r2, 1.0e-9);
    float minR2 = max(minR * minR, 1.0e-9);
    float fixedR2 = max(fixedR * fixedR, 1.0e-9); 
    if (r2 < minR2) { float temp = (fixedR2 / minR2); z *= temp; dz *= temp; }
    else if (r2 < fixedR2) { float temp = (fixedR2 / r2); z *= temp; dz *= temp; }
}

void boxFold(inout vec3 z, inout float dz, float foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}

// Mandelbulb iteration helper
void DE_Bulb(inout vec3 z, inout float dr, inout float trap, float power) {
    float r = length(z);
    if (r > 1.0e-4) {
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        float theta = acos(clamp(z.z / r, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        theta *= power;
        phi *= power;
        float zr = pow(r, power);
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        trap = min(trap, r);
    } else {
        dr = 1.0;
    }
}

vec3 bulbPow(vec3 z, float power) {
    float r = length(z); if (r < 1.0e-4) return vec3(0.0);
    float r_safe = max(r, 1.0e-9);
    float theta = acos(clamp(z.z / r_safe, -1.0, 1.0));
    float phi = atan(z.y, z.x);
    float zr = pow(r, power); theta *= power; phi *= power;
    return zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
}

vec4 quatSquare(vec4 q) {
    return vec4(q.x*q.x - q.y*q.y - q.z*q.z - q.w*q.w, 2.0*q.x*q.y, 2.0*q.x*q.z, 2.0*q.x*q.w);
}

vec4 tetraSquare(vec4 q) {
    return vec4(q.x*q.x - q.y*q.y - q.z*q.z + q.w*q.w, 2.0*(q.x*q.y - q.z*q.w), 2.0*(q.x*q.z - q.y*q.w), 2.0*(q.x*q.w + q.y*q.z));
}

vec2 intersectSphere(vec3 ro, vec3 rd, float r) {
    float b = dot(ro, rd); float c = dot(ro, ro) - r * r;
    float h = b * b - c; if (h < 0.0) return vec2(1.0, 0.0);
    h = sqrt(h); return vec2(-b - h, -b + h);
}

void dodecaFold(inout vec3 z) {
    vec3 n = normalize(vec3(phi, 1.0, 0.0));
    z -= 2.0 * min(0.0, dot(z, n)) * n;
    vec3 n2 = normalize(vec3(1.0, 0.0, phi));
    z -= 2.0 * min(0.0, dot(z, n2)) * n2;
}

${rotationLogic}

`;
};
