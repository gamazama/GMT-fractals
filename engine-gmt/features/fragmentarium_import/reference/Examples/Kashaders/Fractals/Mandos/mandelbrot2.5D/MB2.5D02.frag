#info Mandelbrot set 2.5D

#include "MathUtils.frag"

#define providesInit
#include "DE-Raytracer.frag"

#group Mandelbrot

// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]
// Bailout radius
uniform float Bailout; slider[0,128,1024]
// Slope
uniform float Slope; slider[-10,-2,10]

float k;
void init() {
	k=1./sqrt(1.+Slope*Slope);
}

float DE(vec3 pos) {
	vec2 z=pos.xy;
	vec2 z0=z;
	float r2=dot(z,z);
	vec2 dz=vec2(1.,0.);
	int i=0;
	for(i=0;i<Iterations && r2<10000.;i++){
		dz=2.*vec2(dz.x*z.x-dz.y*z.y+1.,dz.x*z.y+dz.y*z.x);
		z=vec2(z.x*z.x-z.y*z.y,z.x*z.y*2.)+z0;
		r2=dot(z,z);
		orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,0.,r2)));
	}
	float r=sqrt(r2);
	float dr=length(dz);
	//dr=0.4*r*log(r)/dr;
	dr=0.4*r*(log(r)-pow(2.,float(i-Iterations))*log(2.))/dr;
	if(r2<4.) dr=0.;
	return (pos.z-Slope*dr)*k;
}

#preset default
FOV = 0.4
Eye = -0.645159869,-1.7494077,3.63834504
Target = -0.861935003,2.43946523,-5.43944941
Up = 0.102545521,0.904135494,0.414757064
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
MaxRaySteps = 256
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.81027669
Specular = 0.06920415
SpecularExp = 43.91144
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = -0.0367647,0.48529414
CamLight = 1,1,1,0.20535714
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 20
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 0.764705882,0.764705882,0.764705882
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
Iterations = 40
Bailout = 128
Slope = 1.7105264
#endpreset
