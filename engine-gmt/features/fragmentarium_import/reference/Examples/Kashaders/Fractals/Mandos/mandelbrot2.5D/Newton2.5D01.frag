#info Newton (z^3-1) 2.5D

#include "MathUtils.frag"

#define providesInit
#include "DE-Raytracer.frag"

#group julia

// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]
// Bailout radius
//uniform float Bailout; slider[0,128,1024]
// Slope
uniform float Slope; slider[-10,-2,10]

float k;
void init() {
	k=1./sqrt(1.+Slope*Slope);
}

float DE(vec3 pos) {
	vec2 z=pos.xy;
	float r2=dot(z,z);
	vec2 dz=vec2(1.,0.);
	int i=0;
	float delta2=0.0;
	do{
		vec2 az=z;
		float ir2=1./r2;
		vec2 tmp=vec2(1.,0.)+vec2(-z.x*(z.x*z.x-3.*z.y*z.y),z.y*(z.y*z.y-3*z.x*z.x))*ir2*ir2*ir2;
		dz=2./3.*vec2(dz.x*tmp.x-dz.y*tmp.y,dz.x*tmp.y+dz.y*tmp.x);
		z=1./3*vec2(2.*z.x+(z.x*z.x-z.y*z.y)*ir2*ir2,2.*z.y*(1.-z.x*ir2*ir2));
		r2=dot(z,z);
		orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,0.,r2)));
		delta2=dot(z-az,z-az);
		i++;
	}while(i<Iterations && delta2>0.01);
	float d=min(length(z-vec2(1.,0.)),min(length(z-vec2(-0.5,0.5*sqrt(3.))),length(z-vec2(-0.5,-0.5*sqrt(3.)))));
	float dd=length(dz);
	dd=0.5*d*log(d)/dd;
	return max(length(pos)-2.0,(pos.z-Slope*dd)*k);
}

#preset default
FOV = 0.4
Eye = -0.61807577,-2.02768706,4.19481428
Target = 0.696979113,2.28654081,-4.73032261
Up = 0.075881445,0.893310283,0.442988431
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 1
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
DetailAO = -0.5
FudgeFactor = 1
MaxDistance = 20
MaxRaySteps = 128
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.699999988
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.400000006
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,0.400000006
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 21
Slope = -2
#endpreset
