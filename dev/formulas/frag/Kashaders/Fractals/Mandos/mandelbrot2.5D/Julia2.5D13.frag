#info Julia set 2.5D

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
// X seed
uniform float Cx; slider[-2,-1,2]
// Y seed
uniform float Cy; slider[-2,0,2]

float k;
void init() {
	k=1./sqrt(1.+Slope*Slope);
}
#vertex
uniform float Cx,Cy;
uniform int Iterations;
varying float D2M;
float DE() {
	vec2 z0=vec2(Cx,Cy);
	vec2 z=z0;
	float r2=dot(z,z);
	vec2 dz=vec2(1.,0.);
	int i=0;
	for(i=0;i<Iterations && r2<1000000000.0;i++){
		dz=2.*vec2(dz.x*z.x-dz.y*z.y,dz.x*z.y+dz.y*z.x);
		z=vec2(z.x*z.x-z.y*z.y,z.x*z.y*2.)+z0;
		r2=dot(z,z);
		
	}
	float r=sqrt(r2);
	float dr=length(dz);
	dr=0.5*(r-2.)*log(r+1.)/dr;dr=max(0.,dr);
	return (dr);
}
void Vinit() {
	D2M=DE();
}
#endvertex
varying float D2M;
float DE(vec3 pos) {
	vec2 z=pos.xy;
	vec2 z0=vec2(Cx,Cy);
	float r2=dot(z,z);
	vec2 dz=vec2(1.,0.);
	float rt=1.;
	int i=0;
	for(i=0;i<Iterations && r2<1000000000.0;i++){
		rt=rt*(1.-exp(-2.*r2/D2M));
		orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,0.,r2)));
		dz=2.*vec2(dz.x*z.x-dz.y*z.y,dz.x*z.y+dz.y*z.x);
		z=vec2(z.x*z.x-z.y*z.y,z.x*z.y*2.)+z0;
		r2=dot(z,z);
	}
	float r=sqrt(r2);
	float dr=length(dz);
	float k1=rt;
	dr=0.5*(r-2.)*log(r+1.)/dr;dr=max(0.,dr*k1);
	return (pos.z-Slope*dr)*k;
}

#preset default
FOV = 0.4
Eye = -1.83305881,-2.03208549,2.93944135
Target = 2.36636181,3.07337861,-4.56383147
Up = -0.063074483,0.841180016,0.53706405
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
MaxDistance = 1000
MaxRaySteps = 56
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
HardShadow = 0 NotLocked
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 0.741176471,0.741176471,0.741176471
OrbitStrength = 0
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,0.400000006
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false NotLocked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 50
Slope = -2.105263
Cx = -0.99053628
Cy = 0.28391168
#endpreset
