#info Hybrid Distance Estimator example
#info Forked from Syntopia's mandelbulb.frag

#include "MathUtils.frag"
#define providesInit
#include "DE-Raytracer.frag"
#group Mandelbulb


// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]

// Number of color iterations.
uniform int ColorIterations;  slider[0,9,100]

// Mandelbulb exponent (8 is standard)
uniform float Power; slider[0,8,16]

// Bailout radius
uniform float Bailout; slider[0,100,100]

// Alternate is slightly different, but looks more like a Mandelbrot for Power=2
uniform bool AlternateVersion; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

uniform float RotAngle; slider[0.00,0,180]

uniform float MinRad2;  slider[0,0.25,2.0]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale;  slider[-3.0,3.0,5.0]

mat3 rot;

void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

// This is my power function, based on the standard spherical coordinates as defined here:
// http://en.wikipedia.org/wiki/Spherical_coordinate_system
//
// It seems to be similar to the one Quilez uses:
// http://www.iquilezles.org/www/articles/mandelbulb/mandelbulb.htm
//
// Notice the north and south poles are different here.
void powN1(inout vec3 z, float r, inout float dr) {
	// extract polar coordinates
	float theta = acos(z.z/r);
	float phi = atan(z.y,z.x);
	dr =  pow( r, Power-1.0)*Power*dr + 1.0;
	
	// scale and rotate the point
	float zr = pow( r,Power);
	theta = theta*Power;
	phi = phi*Power;
	
	// convert back to cartesian coordinates
	z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
}

// This is a power function taken from the implementation by Enforcer:
// http://www.fractalforums.com/mandelbulb-implementation/realtime-renderingoptimisations/
//
// I cannot follow its derivation from spherical coordinates,
// but it does give a nice mandelbrot like object for Power=2
void powN2(inout vec3 z, float zr0, inout float dr) {
	float zo0 = asin( z.z/zr0 );
	float zi0 = atan( z.y,z.x );
	float zr = pow( zr0, Power-1.0 );
	float zo = zo0 * Power;
	float zi = zi0 * Power;
	dr = zr*dr*Power + 1.0;
	zr *= zr0;
	z  = zr*vec3( cos(zo)*cos(zi), cos(zo)*sin(zi), sin(zo) );
}

uniform bool Julia; checkbox[false]
uniform vec3 JuliaC; slider[(-2,-2,-2),(0,0,0),(2,2,2)]

void formulaMBP8(in vec3 pos, inout vec3 z, inout float r, inout float dr) {
	if (AlternateVersion) {
		powN2(z,r,dr);
	} else {
		powN1(z,r,dr);
	}
	z+=(Julia ? JuliaC : pos);
	r=length(z);
	z*=rot;
}

void formulaMBox(in vec3 pos, inout vec3 p, inout float r, inout float dr) {
	p = clamp(p, -1.0, 1.0) * 2.0 - p;  // min;max;mad
	float r2 = dot(p, p);
	float s= clamp(max(MinRad2/r2, MinRad2), 0.0, 1.0)/MinRad2*Scale;
	p = p*s + pos;//(Julia ? JuliaC : pos);
	dr=dr*abs(s)+1.;//(Julia ? 0. : 1.);
	r=length(p);
	//p*=rot;
}
// Compute the distance from `pos` to the Mandelbox.
float DE(vec3 pos) {
	vec3 z=pos;
	float r;
	float dr=1.0;
	int i=0;
	r=length(z);
	while( i < Iterations ) {
		formulaMBox(pos, z, r, dr);
		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*r)));
		i++;
		if (r>Bailout || (i>Iterations)) break;

		formulaMBP8(pos, z, r, dr);
		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*r)));
		i++;
		if (r>Bailout || (i>Iterations)) break;
	}
//	if ((type==1) && r<Bailout) return 0.0;
	return 0.5*r*log(r)/dr;
	/*
	Use this code for some nice intersections (Power=2)
	float a =  max(0.5*log(r)*r/dr, abs(pos.y));
	float b = 1000;
	if (pos.y>0)  b = 0.5*log(r)*r/dr;
	return min(min(a, b),
		max(0.5*log(r)*r/dr, abs(pos.z)));
	*/
}

#preset default
FOV = 0.56284
Eye = 3.42344,5.07694,2.68757
Target = -1.55049,-2.21545,-1.57101
Up = -0.30276,-0.312176,0.90049
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.2
ToneMapping = 3
Exposure = 2
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -3
DetailAO = -0.28574
FudgeFactor = 0.63855
MaxDistance = 10
MaxRaySteps = 352
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.01176
SpecularExp = 83.636
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.11764708,0.77205884
CamLight = 1,1,1,0.08035714
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 1
ShadowSoft = 6
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.2987
X = 0.145098,0.227451,0.6,0.7
Y = 1,0.0235294,0.0235294,0.4
Z = 0.145098,0.8,0.168627,0.5
R = 1,0.898039,0.388235,0
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = false
Cycles = 8.30198
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 8
ColorIterations = 9
Power = 8
Bailout = 100
AlternateVersion = false
RotVector = 1,1,1
RotAngle = 0
MinRad2 = 0.25
Scale = -2
Julia = false
JuliaC = 0,0,0
#endpreset
