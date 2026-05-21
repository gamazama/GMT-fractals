#extension GL_EXT_gpu_shader4 : enable
#include "MathUtils.frag"
#include "Progressive2D.frag"
#info lcosz esinz 
#group L

// Number of iterations
uniform int  Iterations; slider[10,200,1000]

uniform float R; slider[0,0,1]
uniform float G; slider[0,0.4,1]
uniform float B; slider[0,0.7,1]
uniform bool Julia; checkbox[false]
uniform vec2 C; slider[(-3.141,-3.141),(0.0,0.0),(3.141,3.141)]
uniform vec2 O; slider[(-6.282,-6.282),(3.141,3.141),(6.282,6.282)]
uniform float ColorDiv; slider[-10,1,10]
uniform float Escape; slider[0,100,2560]
uniform float StripeDensity; slider[-10,1,10]

uniform int Formula; slider[0,1,4]

vec3 color(vec2 z) {
  int count = 0;
  float r=z.x;
  float i=z.y;
  float a,b;
  float p,q;
  float len=0.0;
  float avg=0.0;
  float sum=0.0;
  float lastAdded = 0.0;

// lcosz
if(Formula==0) b=.75;
// esinz
if(Formula==1) b=C.x*C.y;
// lexpz
if(Formula==2) b=C.x+C.y;

  for ( count = 0; count < Iterations; count++)
  {
      r += (Julia ? C.x : 0.);
      i += (Julia ? C.y : 0.);

// lcosz
if(Formula==0) {
    a = exp (-i);
    q = i = a * sin(r);
    p = r = a * cos(r);
    a = r * r + i * i;
    r = ((r / a) + p) * b;
    i = ((-i / a) + q) * b;
//    if(abs (i) > Escape) break;
}
// esinz
if(Formula==1) {
    a = exp(-i);
    q = i = a * sin(r);
    p = r = a * cos(r);
    a = r * r + i * i;
    r = r / a;
    i = -i / a;
    a = (i - q) / 2.;
    i = -(r - p) / 2.;
    r = a;
    a = r - i * b;
    i = i + r * b;
    r = a;
//    if(abs(r) > Escape) break;
}
// expz
if(Formula==2) {
    a = exp(r) * b;
    r = a * sin(i);
    i = a * cos(i);
}
// Lyapunov
if(Formula==3) {
  int nbit = 170;

    while ( count++ < Iterations)
    {
      if( (nbit & 0x01) == 1 ) {
           p=r;q=i;
           nbit = ( nbit >> 1 );
           nbit |= 128;
      }
      else {
           q=r;p=i;
           nbit = ( nbit >> 1 );
      }
      r=p*q*(C.x-q);
      i=log(abs(p-C.y*p*q))/log(2.);
      a += i/float(Iterations);

      if(abs(a) > 1.) break;
    }
}
// BURTSbisector zn+1=-zn^3+zn^2+zn^1+0
if(Formula==4) {

    a = (r * r - i * i) + (Julia ? C.x : r);
    b = 2.0*(r * i) + (Julia ? C.y : i);
    p = (a * r - b * i);
    q = (r * b + i * a);
    r -= p + O.x;
    i -= q + O.y;
}
//    if(abs(r * r - i * i) > Escape*Escape) break;
    len = length(vec2(r,i));
//    if( len > Escape*Escape ) break;
    lastAdded = 0.5+0.5*sin(StripeDensity*atan(i,r));
    avg += lastAdded;
    sum+=len;
  }

	if (count < Iterations) {
      float prevAvg = (avg -lastAdded)/(float(count-1));
      avg /= float(count);
		// The color scheme here is based on one
		// from Inigo Quilez's Shader Toy:
		float co = 1.0 - log(log(len)/log(Escape*Escape))/log(4.0);
	   float ca = co*avg+(1.0-co)*prevAvg;
		co = 6.2831*sqrt(ca)/ColorDiv;
		return vec3( .5+.5*sin(co + vec3(R,G,B)));
	}  else {
      sum = avg+(sum/ColorDiv)/float(count);
      return vec3( .5+.5*sin(sum + vec3(B,G,R)));
	}

}



#preset Default
Center = -0.061271857,-0.0722517
Zoom = 0.657516231
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 200
R = 0
G = 0.4
B = 0.7
C = 0,0
ColorDiv = 1
Escape = 100
StripeDensity = 1
#endpreset

#preset lcos-julia
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
Center = -4.66848163,0.045882337
Zoom = 0.247184719
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
ToneMapping = 1
Exposure = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 200
R = 0.86956523
G = 0.5
B = 0.14046823
Julia = true
C = -1.20591961,6.3e-8
O = 3.14451742,3.10230916
ColorDiv = 1
Escape = 100
StripeDensity = 1
Formula = 0
#endpreset

#preset esin-julia
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
Center = -4.66848163,0.045882337
Zoom = 0.247184719
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
ToneMapping = 1
Exposure = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 200
R = 0.86956523
G = 0.5
B = 0.14046823
Julia = true
C = 0.539859438,0.638015688
O = 3.14451742,3.10230916
ColorDiv = 1
Escape = 100
StripeDensity = 1
Formula = 1
#endpreset

#preset lexp-julia
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
Center = -0.417274931,-0.749743975
Zoom = 0.214943234
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
ToneMapping = 1
Exposure = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 200
R = 0.86956523
G = 0.5
B = 0.14046823
Julia = true
C = 0.371591545,0.609971018
O = 3.14451742,3.10230916
ColorDiv = 1
Escape = 100
StripeDensity = 1
Formula = 2
#endpreset

#preset Lyapunov
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
Center = 0.103548973,0.375894949
Zoom = 0.326901791
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
ToneMapping = 1
Exposure = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 200
R = 0.86956523
G = 0.5
B = 0.14046823
Julia = false
C = 6.3e-8,0.070111643
O = 0.837131028,0.837131028
ColorDiv = 1
Escape = 2560
StripeDensity = 4.1317366
Formula = 3
#endpreset
