#version 140
// New 2D fragment...
#include "MathUtils.frag" 
#include "Complex.frag" 
#include "Progressive2D.frag" 
#info Formula Based on https://fractalforums.org/index.php?topic=4600.msg32485
 
#group Broken Newton 
 
// Number of iterations 
uniform int  Iterations; slider[10,200,1000] 

uniform float R; slider[0,0,1] 
uniform float G; slider[0,0.4,1] 
uniform float B; slider[0,0.7,1] 
 
uniform float ColorLog; slider[1,2,10] 
uniform float Bailout; slider[0,4,100] 

uniform float TM; slider[0,1,2]

uniform float fSampleOffset; slider[-2,1,2]
uniform float OffsetScale; slider[-2,1,2]
uniform float DistScale; slider[0,1,2]

// The color scheme here is based on one from Inigo Quilez's Shader Toy: 
// http://www.iquilezles.org/www/articles/mset_smooth/mset_smooth.htm 
vec3 IQColor(float i, vec2 z) { 
      float co;  // equivalent optimized smooth iteration count 
      co = 3.1415+i - log(log2(length(z)))/log(ColorLog); 
      co = 6.2831*sqrt(co); 
      return .5+.5*cos(co+vec3(R,G,B) ); 
}

vec2 fsample(vec2 z, vec2 p) {
    const float d = 1.0;
    //(z-1)(z+1)(z-p)
    vec2 a = z - vec2(d, 0.0)+fSampleOffset; // 
    vec2 b = z + vec2(d, 0.0)-fSampleOffset; //
    vec2 c = z - p;
    return cMul(cMul(a, b), c);
}

vec3 color(vec2 c) {
    vec2 uv = c;
    
    vec2 seed;
    
    vec2 dr, di;
    float f = 0.0;
    float dist = 0.0;
    vec2 z;
    
    vec2 startuv = uv;
    
    float tm = 0.0;
    float tm2 = 0.0;
    
	 seed = uv;
    tm = TM;

    float toff = pow(tm, 0.25);
    int i;
    for (i=0; i<Iterations; i++) {

        z = cMul(uv, vec2(0.333333 + tm*0.5, 0.0 + tm)); //0.85*toff));
        
        vec2 a = fsample(z, seed);
//anayltical derivatives
        vec2 p = seed;
        float zx = z[0], zy = z[1];
        float px = p[0], py = p[1];
        
        dr.x = -(2.0*((px-zx)*zx-(py-zy)*zy)+zy*zy+1.0-zx*zx);
        dr.y = -2.0*((py-zy-zy)*zx+(px-zx)*zy);
      
        di.x = 2.0*((py-zy-zy)*zx+(px-zx)*zy);
        di.y = -(2.0*((px-zx)*zx-(py-zy)*zy)+zy*zy+1.0-zx*zx);

        mat2 rxm = mat2( vec2(4.0*(px-3.0*zx)*(px-3.0*zx),-4.0*(px-3.0*zx)*(py-3.0*zy)),
                 vec2(-4.0*(px-3.0*zx)*(py-3.0*zy), 4.0*(py-3.0*zy)*(py-3.0*zy)));
        mat2 rym = mat2(vec2(4.0*(py-3.0*zy)*(py-3.0*zy), 4.0*(px-3.0*zx)*(py-3.0*zy)),
                  vec2(4.0*(px-3.0*zx)*(py-3.0*zy), 4.0*(px-3.0*zx)*(px-3.0*zx)));
        mat2 ixm = mat2(vec2(4.0*(py-3.0*zy)*(py-3.0*zy), 4.0*(px-3.0*zx)*(py-3.0*zy)),
                  vec2(4.0*(px-3.0*zx)*(py-3.0*zy), 4.0*(px-3.0*zx)*(px-3.0*zx)));
        mat2 iym = mat2(vec2(4.0*(px-3.0*zx)*(px-3.0*zx), -4.0*(px-3.0*zx)*(py-3.0*zy)),
                  vec2(-4.0*(px-3.0*zx)*(py-3.0*zy), 4.0*(py-3.0*zy)*(py-3.0*zy))); 
        mat2 m = mat2(dr, di);
        
        m = inverse(m);
        
        vec2 off = -m * a;
        
        off.xy += vec2(-off.y, off.x)*OffsetScale;
        
        dist += 2.0*length(off) / (DistScale + length(iym*rxm * off));
        
        if (dist > int(Bailout) || dist < 0.) {
            break;
        }
        
        uv += off;
    }

    float d1 = length(uv - vec2(-1.0, 0.0));
    float d2 = length(uv - vec2(1.0, 0.0));
    float d3 = length(uv - seed);
    
    //find closest root shade
    f = d1 < d2 ? 1.0 : 0.75;
    f = d3 < d2 && d3 < d1 ? 0.5 : f;
    
    float tfac = pow(1.0 - toff, 0.25);
    float dfract;

    dfract = 1.0 - abs(fract(dist*0.004)-0.5)*2.0; // tent(dist*0.004);
    f = sqrt(dfract)*0.5;
    
	return IQColor(f,uv);
 }

#preset Default
Center = 0.689694455,0.034870839
Zoom = 0.070265291
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 1000
R = 0
G = 0.4
B = 0.7
ColorLog = 1.67880366
TM = 0.22391858
OffsetScale = 1.40460084
DistScale = 2
Bailout = 100
fSampleOffset = 0
#endpreset
