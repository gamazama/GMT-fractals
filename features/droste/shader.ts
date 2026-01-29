
export const DROSTE_MATH = `
// ------------------------------------------------------------------
// DROSTE EFFECT (ESCHER MATH)
// Ported faithfully from Tom Beddard's Pixel Bender script
// ------------------------------------------------------------------

#define DROSTE_PI 3.141592653
#define DROSTE_TWOPI 6.283185307

// Complex Math Helpers
vec2 cAdd(vec2 a, vec2 b) { return vec2(a.x + b.x, a.y + b.y); }
vec2 cMult(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cDiv(vec2 a, vec2 b) { float d = dot(b,b); return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d; }
vec2 cExp(vec2 z) { return vec2(exp(z.x) * cos(z.y), exp(z.x) * sin(z.y)); }
vec2 cLog(vec2 z) { return vec2(log(length(z)), atan(z.y, z.x)); }

// Extended Math (Renamed to avoid GLSL built-in collisions)
float d_sinh(float x) { return (exp(x) - exp(-x)) * 0.5; }
float d_cosh(float x) { return (exp(x) + exp(-x)) * 0.5; }

vec2 cSin(vec2 z) { return vec2(sin(z.x) * d_cosh(z.y), cos(z.x) * d_sinh(z.y)); }
vec2 cCos(vec2 z) { return vec2(cos(z.x) * d_cosh(z.y), -sin(z.x) * d_sinh(z.y)); }

vec2 cTan(vec2 z) {
    float r = 2.0 * z.x;
    float i = 2.0 * z.y;
    float div = cos(r) + d_cosh(i);
    // Prevent division by zero
    if (abs(div) < 1.0e-9) div = 1.0e-9;
    return vec2(sin(r)/div, d_sinh(i)/div);
}

// Complex Power: z^p
vec2 cPower(vec2 z, float p) {
    float r = length(z);
    // Avoid log(0) issues
    if (r < 1.0e-9) return vec2(0.0);
    float a = atan(z.y, z.x);
    float newR = pow(r, p);
    float newA = a * p;
    return vec2(newR * cos(newA), newR * sin(newA));
}

// Returns vec3: .xy = UV, .z = Mask (1.0 = valid, 0.0 = invalid/transparent)
vec3 applyDroste(
    vec2 uv, 
    vec2 center, 
    float r1, float r2, 
    float period, float strands, 
    float zoom, float rot, 
    bool twist, float tilingMode,
    float rotateSpin,
    bool hyperDroste,
    float fractalPoints,
    bool autoPeriodicity,
    bool strandMirror,
    float rotatePolar
) {
    // 1. Shift & Normalize
    // We expect UV in 0..1 range. Center in -1..1 range (percentage)
    vec2 z = uv - 0.5 - (center * 0.01);
    
    // Adjust aspect ratio to square the calculation space
    float aspect = uResolution.x / uResolution.y;
    z.x *= aspect;
    
    // Scale radii to percentage (0.1 - 100 range from UI)
    float R1 = max(0.0001, r1 * 0.01);
    float R2 = max(R1 * 1.001, r2 * 0.01);
    
    float P2 = strands;
    float P1 = period;

    // --- AUTO PERIODICITY LOGIC ---
    // Matches Pixel Bender: p1 = p2/2.0 * (1.0 + sqrt(1.0 - pow(log(r2/r1)/PI, 2.0)))
    if (autoPeriodicity) {
        float logRatio = log(R2/R1);
        float ratioOverPi = logRatio / DROSTE_PI;
        float term = 1.0 - (ratioOverPi * ratioOverPi);
        
        if (term >= 0.0) {
            P1 = (P2 / 2.0) * (1.0 + sqrt(term));
        }
    }
    
    if (abs(P1) < 0.001) P1 = 0.001;
    
    // --- PRE-TRANSFORM DISTORTIONS ---
    
    // Hyper Droste (Complex Sine)
    if (hyperDroste) {
        z = cSin(z);
    }
    
    // Fractal Points (Complex Power + Tan)
    if (fractalPoints > 0.0) {
        z = cPower(z, fractalPoints);
        z = cTan(cMult(z, vec2(2.0, 0.0)));
    }
    
    // --- POLAR ROTATION ---
    // Ported from Pixel Bender: Stereo-graphic projection rotation
    if (abs(rotatePolar) > 0.001) {
        float theta = radians(rotatePolar);
        float cT = cos(theta);
        float sT = sin(theta);
        
        float x2 = z.x * z.x;
        float y2 = z.y * z.y;
        
        float div = (1.0 + x2 + y2 + ((1.0 - x2 - y2) * cT) - (2.0 * z.x * sT)) / 2.0;
        
        // Prevent div by zero
        if (abs(div) < 1.0e-9) div = 1.0e-9;
        
        float numX = z.x * cT + ((1.0 - x2 - y2) * sT / 2.0);
        
        // Complex division: (numX + i*y) / (div + 0i) = numX/div + i*y/div
        z.x = numX / div;
        z.y = z.y / div;
    }
    
    // Rotate Spin (Image Rotation independent of Spiral)
    // Matches Pixel Bender: z *= imageSpin
    if (abs(rotateSpin) > 0.001) {
        float rads = radians(rotateSpin);
        float s = sin(rads);
        float c = cos(rads);
        z = vec2(z.x*c - z.y*s, z.x*s + z.y*c);
    }

    // 2. Pre-Twist Transform
    if (twist) {
         // Apply Zoom & Rotation in log space effectively
         float angle = radians(rot);
         float scale = exp(zoom * 0.1); 
         // Manual rotation matrix
         float c = cos(angle); float s = sin(angle);
         z = vec2(z.x*c - z.y*s, z.x*s + z.y*c) / scale;
         
         // To Log-Polar
         z = cLog(cDiv(z, vec2(R1, 0.0)));
    } else {
        // Cartesian Log mapping for untwisted (Rectangular Projection)
        // Map Y to Angle [-PI, PI]
        z.y *= DROSTE_TWOPI; 
        
        // Map X to Log Radius
        float logWidth = log(R2/R1);
        z.x = z.x * logWidth; 
        
        // Align center
        z.x += logWidth * 0.5;

        // Linear Zoom/Rot application
        z.x -= zoom * 0.1;
        z.y += radians(rot);
    }
    
    // 3. Droste Conformal Map
    float logR = log(R2/R1);
    float angle = atan((P2/P1) * (logR / DROSTE_TWOPI));
    
    float f = cos(angle);
    vec2 beta = cMult(vec2(f, 0.0), cExp(vec2(0.0, angle)));
    
    // Transform Z
    z = cDiv(cMult(vec2(P1, 0.0), z), beta);
    
    // Inverse Log (Exp) to get back to Cartesian
    z = cMult(vec2(R1, 0.0), cExp(z));
    
    // 4. Infinite Tiling (The "Spiral into Infinity")
    float mode = floor(tilingMode + 0.1);
    
    bool doLoop = (mode < 1.5);
    bool doMirror = (abs(mode - 1.0) < 0.1);
    bool flipped = false;
    
    // Calculate Tile Rotation Angle
    float tileAngle = -DROSTE_TWOPI * P1;
    if (P2 > 0.0) tileAngle = -tileAngle;
    
    // Mirror Strand Logic: Divide rotation by number of strands
    // Matches Ref: if (strandMirror) angle /= p2;
    if (strandMirror && abs(P2) > 0.001) {
        tileAngle /= P2;
    }

    if (doLoop) {
        // Ratio determines the scaling and rotation per level
        vec2 ratio = cMult(vec2(R2/R1, 0.0), cExp(vec2(0.0, tileAngle)));
        vec2 ratioInv = cDiv(vec2(1.0, 0.0), ratio);

        float mag = length(z);
        
        // Iteratively scale until within bounds [R1, R2]
        // This simulates the "while" loop in the reference, but GLSL prefers fixed loops
        for(int i=0; i<12; i++) {
            if (mag >= R1 && mag <= R2) break;
            
            if (mag < R1) {
                z = cMult(z, ratio); // Grow
                mag = length(z);
                flipped = !flipped;
            } else if (mag > R2) {
                z = cMult(z, ratioInv); // Shrink
                mag = length(z);
                flipped = !flipped;
            }
        }
    }
    
    if (doMirror && flipped) {
        float r2 = dot(z, z);
        if(r2 > 1.0e-9) {
            z *= (R1 * R2) / r2;
        }
    }

    // 5. Map back to UV
    z.x /= aspect;
    z += 0.5 + (center * 0.01);
    
    float mask = 1.0;
    
    // 6. Apply Final Tiling Mode (Edge Handling)
    if (mode < 0.5) {
        // 0: Repeat
        z = fract(z);
    } else if (mode < 1.5) {
        // 1: Mirror (Standard edge mirroring)
        z.x = 1.0 - abs(mod(z.x, 2.0) - 1.0);
        z.y = 1.0 - abs(mod(z.y, 2.0) - 1.0);
    } else if (mode < 2.5) {
        // 2: Clamp
        z = clamp(z, 0.0, 1.0);
    } else {
        // 3: Transparent
        if (z.x < 0.0 || z.x > 1.0 || z.y < 0.0 || z.y > 1.0) {
            mask = 0.0;
        }
    }
    
    return vec3(z, mask);
}
`;
