#info Quadray sets Distance Estimator

#include "MathUtils.frag"

#define providesInit
#include "DE-Raytracer.frag"

#group Quadray

// Number of fractal iterations.
uniform int Iterations;  slider[0,11,100]

// Bailout radius
uniform float Bailout; slider[2,3.5,64]

//Offset int the 4th dimension
uniform float Offset; slider[-2,0,1]

//sign. Actually a factor of the c value
uniform float Sign; slider[-2,0,2]

void init() {
}

const mat3x4 mc=mat3x4(vec4(.5,-.5,-.5,.5),
						     vec4(.5,-.5,.5,-.5),
						     vec4(.5,.5,-.5,-.5));
float DE(vec3 pos) {
	vec4 cp=abs(mc*pos)+vec4(Offset);
	vec4  z=cp;
	float r=length(z);
	cp*=Sign;
	float dr=1.;
	for(int i=0; i<Iterations && r<Bailout;i++){
		dr=2.*r*dr+1.;
		vec4 tmp0=z*z;
		vec2 tmp1=2.*abs(z.wx*z.zy);
		z=abs(tmp0-tmp0.yxwz+tmp1.xxyy+cp);
		r=length(z);
		orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*r)));
	}
	return (0.5*(r-2.)*log(r+1.)/dr);
}
#preset default
FOV = 0.4
Eye = 3.89713071,-6.34293046,1.96269245
Target = -0.724492323,2.13525556,-0.637492622
Up = 0.161304841,0.368690713,0.915449563
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 3
Exposure = 1.5
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
Detail = -3.5
DetailAO = -0.5
FudgeFactor = 0.89219332
MaxDistance = 20
MaxRaySteps = 256
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.90677967
Specular = 0.04779412
SpecularExp = 39.76378
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.27843138,0.50588236
CamLight = 1,1,1,0.1642512
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 1
ShadowSoft = 8.3137256
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 0.784313725,0.784313725,0.784313725
OrbitStrength = 0.27272728
X = 0.0549019608,0.6,0.145098039,0.6946565
Y = 0.909803922,0.231372549,0.0588235294,1
Z = 0.380392157,0.545098039,1,0.7022901
R = 0.988235294,1,0.219607843,-0.29501916
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = false
Cycles = 4.83846152
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 25
Offset = -1.41806019
Sign = 1
Bailout = 32
#endpreset
