#version 410 core
#include "MathUtils.frag"
#include "Progressive2D.frag"
#info Plot Magnetic

#group Magnet


// Number of iterations
uniform int  Iterations; slider[10,200,10000]

uniform float R; slider[0,0,1]
uniform float G; slider[0,0.4,1]
uniform float B; slider[0,0.7,1]

uniform float ColDiv; slider[1,256,384]
uniform int  Formula; slider[0,0,3]

uniform vec2 XY; slider[(-2,-2),(-0.6,1.3),(2,2)]
uniform bool Invert; checkbox[false]

// coordinate to invert to infinity
uniform vec2 InvertC; slider[(-5,-5),(0,0),(5,5)]
// performs the active c = T(s)
vec2 domainMap(vec2 c)
{
    float s = dot(c, c);
    return c / s + InvertC;
}


vec3 color(vec2 c)
{

vec2 c2 = XY;

float dist = 0.;
float p = 1.;
float q = 1.;
float a;
float b;
float m, n;

    if (Invert) c = domainMap(-c);
    vec2 z = c;

    int i = 0;
    if (Formula == 0) {
        for (i = 0; i < Iterations; i++) {

            a = z.x * z.x - z.y * z.y + c2.x + 3.;
            p = (z.x + z.x);
            b = p * z.y;
            p += c2.y + 2.;
            q = z.y;
            q += z.y;

            z.x = (a * p + b * q) / (p * p + q * q);
            z.y = (p * b - a * q) / (p * p + q * q);
            a = z.x * z.x - z.y * z.y;
            z.y = 2.0 * z.x * z.y;
            z.x = a;

            dist = max(dist, dot(z, z));

            if(dist > 10000.) break;
        }
    } else if (Formula == 1) {

        z = vec2(.0);
        for (i = 0; i < Iterations; i++) {

            a = z.x * z.x - z.y * z.y + c.x + c2.x;
            p = b = (z.x + z.x);
            p += c.x - 1.;
            b *= z.y;
            b += c.y + c2.y;
            q = z.y + z.y + c.y;

            z.x = (a * p + b * q) / (p * p + q * q);
            z.y = (p * b - a * q) / (p * p + q * q);
            a = z.x * z.x - z.y * z.y;
            z.y = 2.0 * z.x * z.y;
            z.x = a;

            dist = max(dist, dot(z, z));

            if(dist > 10000.) break;
        }
    } else if (Formula == 2) {
        for (i = 0; i < Iterations; i++) {
            a = z.x * z.x - z.y * z.y + 9.;
            b = 2. * z.x * z.y;
            p = a * z.x - b * z.y + 6.;
            q = a * z.y + b * z.x;
            a = 3. * (z.x * z.x - z.y * z.y) + (6. * z.x) + 7.;
            b = 3. * (z.x * z.y + z.x * z.y) + (6. * z.y);
            m = a * a + b * b;
            z.x = (p * a + q * b) / m + c2.x;
            z.y = (a * q - p * b) / m + c2.y;
            n = z.x * z.x - z.y * z.y;
            z.y = 2.0 * z.x * z.y;
            z.x = n;

            dist = max(dist, dot(z, z));

            if(dist > 10000.) break;
        }
    } else if (Formula == 3) {
        float re, im;
        float ren, imn;
        float ret, imt;
        float magr, magi;

        p = z.x + 1.;
        q = z.y;
        re = (p - 1.) * (p - 2.) - q * q;
        im = q * (2. * p - 3.);
        magr = p * p - q * q - 3. * p + 3.;
        magi = 2. * p * q - 3. * q;
        z = c;

        for (i = 0; i < Iterations; i++) {
            ren = z.x * z.x - z.y * z.y;
            imn = 2. * z.x * z.y;
            a = ren + 3. * (p - 1.);
            b = imn + 3. * q;
            ret = a * z.x - b * z.y + re;
            imt = a * z.y + b * z.x + im;
            a = 3. * ren + 3. * ((p - 2.) * z.x - q * z.y) + magr;
            b = 3. * imn + 3. * (q * z.x + (p - 2.) * z.y) + magi;
            m = a * a + b * b;
            z.x = (ret * a + imt * b) / m - c2.x;
            z.y = (a * imt - ret * b) / m - c2.y;
            a = z.x * z.x - z.y * z.y;
            z.y = 2.0 * z.x * z.y;
            z.x = a;

            dist = max(dist, dot(z, z));

            if(dist > 10000.) break;
        }
    }

    if (i < Iterations) {
        // The color scheme here is based on one from Inigo Quilez's Shader Toy:
        // http://www.iquilezles.org/www/articles/mset_smooth/mset_smooth.htm
        // float co = i - log(log(length(z))/log(Bailout))/log(2.0); // smooth iteration count
        // float co = i - log2(log2(length(z)));  // equivalent optimized smooth interation count
        float co =  float(i)*.5 + 1. - log(.5*log(length(z)));
        co = 6.2831 * sqrt(co / ColDiv);
        return 1. - (.5 + .5 * vec3(cos(co + R), cos(co + G), cos(co + B)));
    }  else {
        return vec3(0.0);
    }
}


#preset Default
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Iterations = 256
R = 0
G = 0.4
B = 0.7
ColDiv = 16
Formula = 0
XY = 0,0
Invert = false
InvertC = 0,0
Center = 1.0135237,0.118390411
Zoom = 0.20112196
Gamma = 2.08335
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
#endpreset

#preset Formula1
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Iterations = 256
R = 0
G = 0.4
B = 0.7
ColDiv = 16
Formula = 1
XY = 0,0
Invert = false
InvertC = 0,0
Center = 0.104287058,0.027244821
Zoom = 0.351763565
Gamma = 2.08335
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
#endpreset

#preset Formula2
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Iterations = 256
R = 0
G = 0.4
B = 0.7
ColDiv = 16
Formula = 2
XY = 0,0
Invert = false
InvertC = 0,0
Center = 2.11695743,-0.001897514
Zoom = 0.075609195
Gamma = 2.08335
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
#endpreset

#preset Mag3Chicken
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Iterations = 1000
R = 0
G = 0.4
B = 0.7
ColDiv = 179.472789
Formula = 3
XY = 0.81594852,-1.09
Invert = true
InvertC = 0.8757853,-0.0807427
Center = 10.991687,7.0754155
Zoom = 0.008137061
Gamma = 2.08335
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
#endpreset

#preset Mag2Loopy
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Iterations = 1000
R = 0
G = 0.4
B = 0.7
ColDiv = 179.472789
Formula = 2
XY = 0.6651736,-0.64277716
Invert = true
InvertC = -1.8680089,2.572707
Center = -245.159987,201.117586
Zoom = 0.001749006
Gamma = 2.08335
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
#endpreset

#preset Mag1ChasingMinis
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Iterations = 1000
R = 0
G = 0.4
B = 0.7
ColDiv = 179.472789
Formula = 1
XY = 0.6114222,0.3650616
Invert = true
InvertC = 0.8165549,1.732808
Center = 28.6760571,-1.99732156
Zoom = 0.076143523
Gamma = 2.08335
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
#endpreset

#preset Mag0CatAndMouse
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Iterations = 1000
R = 0
G = 0.4
B = 0.7
ColDiv = 3
Formula = 0
XY = -0.52864724,-1.5000896
Invert = true
InvertC = 0.6599553,0.8948546
Center = -0.528611285,-2.42545012
Zoom = 0.133175497
Gamma = 2.08335
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
#endpreset
