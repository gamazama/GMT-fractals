#info Theli-at's Pseudo Kleinian (Scale 1 JuliaBox + Something
#info -----------------------------------------------------------------------------
#info First Surface
#info The usual method is to call the Distance Estimation function until
#info we encounter a position where the fractal equation orbits to zero.
#info That position is considered the 'surface' of the fractal object.
#info If you set [Raytracer][SurfaceIndex] to 2,  the Raymarching session will
#info continue past this 'first surface' by advancing the position by [Raytracer][SurfaceGap] amount,
#info and then begin searching for the next fractal surface.
#info Alter [Raytracer][SurfaceGap] to peer deepar into the fractal object.

#define providesInit
#include "MathUtils.frag"
#include "DE-Raytracer-FirstSurface.frag"
#group PseudoKleinian

#define USE_INF_NORM

// Made by Knighty, see this thread:
// http://www.fractalforums.com/3d-fractal-generation/fragmentarium-an-ide-for-exploring-3d-fractals-and-other-systems-on-the-gpu/msg32270/#msg32270

// Maximum iterations
uniform int MI; slider[0,5,20]

// Bailout
//uniform float Bailout; slider[0,20,1000]

// Size
uniform float Size; slider[0,1,2]

// Cubic fold Size
uniform vec3 CSize; slider[(0,0,0),(1,1,1),(2,2,2)]

// Julia constant
uniform vec3 C; slider[(-2,-2,-2),(0,0,0),(2,2,2)]

// Thingy thickness
uniform float TThickness; slider[0,0.01,2]

// Thingy DE Offset
uniform float DEoffset; slider[0,0,0.01]

// Thingy Translation
uniform vec3 Offset; slider[(-1,-1,-1),(0,0,0),(1,1,1)]

uniform vec3 Eye;

void init() {
}

float RoundBox(vec3 p, vec3 csize, float offset)
{
	vec3 di = abs(p) - csize;
	float k=max(di.x,max(di.y,di.z));
	return abs(k*float(k<0.)+ length(max(di,0.0))-offset);
}

float Thingy(vec3 p, float e){
	p-=Offset;
	return (abs(length(p.xy)*p.z)-e) / sqrt(dot(p,p)+abs(e));
}

float Thing2(vec3 p){
//Just scale=1 Julia box
	float DEfactor=1.;
   	vec3 ap=p+1.;
	for(int i=0;i<MI && ap!=p;i++){
		ap=p;
		p=2.*clamp(p, -CSize, CSize)-p;
      
		float r2=dot(p,p);
		orbitTrap = min(orbitTrap, abs(vec4(p,r2)));
		float k=max(Size/r2,1.);

		p*=k;DEfactor*=k;
      
		p+=C;
		orbitTrap = min(orbitTrap, abs(vec4(p,dot(p,p))));
	}
	//Call basic shape and scale its DE
	//return abs(0.5*Thingy(p,TThickness)/DEfactor-DEoffset);
	
	//Alternative shape
	//return abs(0.5*RoundBox(p, vec3(1.,1.,1.), 1.0)/DEfactor-DEoffset);
	//Just a plane
	return abs(0.5*abs(p.z-Offset.z)/DEfactor-DEoffset);
}

float DE(vec3 p){
	return  Thing2(p);//RoundBox(p, CSize, Offset);
}

#preset Default

FOV = 0.4
Eye = 2.91967867,-1.11627039,-1.61505526
Target = 10.3741467,-7.08399067,-3.82541834
Up = 0.450964641,0.74523772,-0.491172138
EquiRectangular = false
AutoFocus = false
FocalPlane = 2.37315875
Aperture = 0
Stereo = 0
EyeSeparation = 2.19387755
ProjectionPlane = 165.441177
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
Gamma = 1.9785459
ToneMapping = 2
Exposure = 1.66626939
Brightness = 0.6078665
Contrast = 2.16924915
AvgLumin = 0.5,0.5,0.5
Saturation = 3.25421133
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 0
AntiAliasScale = 0
DepthToAlpha = false
Detail = -4.55716002
DetailAO = -7
FudgeFactor = 0.44815257
Dither = 0 Locked
NormalBackStep = 0 NotLocked
AO = 0,0,0,0.7
SpecularExp = 16
CamLight = 1,1,1,1.40846
CamLightMin = 0.20500596
Glow = 1,1,1,0
GlowMax = 62
Fog = 0.4567
Reflection = 0.08700834 NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.28605483
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,-0.25391094
Z = 0.8,0.78,1,0.39350182
R = 0.4,0.7,1,0.75
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = true
Cycles = 1.59086
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
ShowDepth = false
DepthMagnitude = 1
MaxDistance = 446.65015
MaxRaySteps = 208
SurfaceIndex = 2
Specular = 0.4
SpecularMax = 10
SpotLight = 1,1,1,0.400000006
SpotLightDir = 0.100000001,0.100000001
HardShadow = 0 NotLocked
ShadowSoft = 2
QualityShadows = false
DebugSun = false NotLocked
SurfaceGap = 1.17997616
MI = 5
Size = 1.0274136
CSize = 1,1,1
C = 0,0,0
TThickness = 0.01
DEoffset = 0
Offset = 0,0,0
#endpreset

#preset P3
FOV = 0.704
Eye = 0.303257,0.820564,0.919448
Target = -3.89337,-5.8851,-5.45029
Up = -0.670294,-0.251349,0.698233
AntiAlias = 1
Detail = -2.35396
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 56
BoundingSphere = 10
Dither = 0.39474
AO = 0,0,0,0.7
Specular = 3.9796
SpecularExp = 16
SpotLight = 1,1,1,0.4
SpotLightDir = 0.90362,0.51808
CamLight = 1,1,1,1.57746
CamLightMin = 0
Glow = 1,1,1,0
Fog = 0.3937
HardShadow = 0
Reflection = 0
BaseColor = 1,1,1
OrbitStrength = 0.67089
X = 0.5,0.6,0.6,1
Y = 1,0.6,0,-0.33334
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.5
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 1.35415
CycleColors = true
Cycles = 0.1
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
MI = 10
Size = 1
CSize = 0.92436,0.90756,0.92436
C = 0,0,0
TThickness = 0.01
DEoffset = 0
Offset = 0,0,0
#endpreset

#preset Kleinian Forest
FOV = 0.704
Eye = 0.283723,-6.59501,-1.81637
Target = 4.12873,-10.9499,-1.64165
Up = -0.19481,-0.132618,0.971834
AntiAlias = 1
Detail = -2.10616
DetailAO = -0.35357
FudgeFactor = 0.90361
MaxRaySteps = 605
BoundingSphere = 10
Dither = 0.45614
AO = 0,0,0,0.7
Specular = 1.9588
SpecularExp = 16
SpotLight = 1,1,1,0.81159
SpotLightDir = 0.90362,0.51808
CamLight = 1,1,1,2
CamLightMin = 0.40476
Glow = 1,1,1,0
Fog = 0.4127
HardShadow = 0
Reflection = 0
BaseColor = 1,1,1
OrbitStrength = 0.67089
X = 0.666667,0.666667,0.498039,1
Y = 1,0.933333,0.419608,1
Z = 0,1,0.498039,-0.73076
R = 0.0588235,0.454902,0.137255,0.26214
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 1.35415
CycleColors = false
Cycles = 0.1
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
MI = 10
Size = 1.12
CSize = 0.9322,0.90756,0.92436
C = 1.86088,-0.01504,-0.10528
TThickness = 0.01
DEoffset = 0.00095
Offset = 0.2088,0.2844,-0.16484
#endpreset
