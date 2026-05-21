#info Smooth boolean operations study.
//#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
//#define providesInit
//#define providesColor
#include "renderer\DE-kn2.frag"

#group Params
//Box position
uniform vec3 BoxPos; slider[(-3,-3,-3),(0,0,0),(3,3,3)]
//box size
uniform vec3 BoxSize; slider[(0,0,0),(1,0.4,0.55),(1,1,1)]
//Box roundness
uniform float BoxRound; slider[0,0,1]
//Sphere radius
uniform float SphRad; slider[0,1,1]
//Bollean operation smooth factor
uniform float BoolSmooth; slider[0,0.1,1]

float sphere(vec3 p, float r){
	return length(p) - r;
}

float cube(vec3 p, vec3 s){
	p = abs(p)-s;
	float v = max(p.x, max(p.y, p.z));
	return v < 0. ? v : length(max(p, vec3(0)));
}

//Another way to express boolen op. using step function
float union(float a, float b){
	return mix(a,b,step(b,a));
}
float intersection(float a, float b){
	return mix(a,b,step(a,b));
}

//Another way to express boolen op. using step function
float Sunion(float a, float b, float r){
	return mix(a,b,smoothstep(-r,r,a-b));
}
float Sintersection(float a, float b, float r){
	return mix(a,b,1.-smoothstep(-r,r,b-a));
}

//from: https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); }

float opSmoothSubtraction( float d1, float d2, float k ) {
    float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    return mix( d2, -d1, h ) + k*h*(1.0-h); }

float opSmoothIntersection( float d1, float d2, float k ) {
    float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) + k*h*(1.0-h); }
//

float DE(vec3 z)
{
	float v = cube(z-BoxPos, BoxSize - vec3(BoxRound))-BoxRound;
	float s = sphere(z,SphRad);
	return opSmoothSubtraction(-v, s, BoolSmooth);
}


#preset Noname
FOV = 0.4
Eye = 3.55587,2.03268,0.93145
Target = -4.76885,-3.09213,-1.17456
Up = -0.167142,-0.0322142,0.985406
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 2
FudgeFactor = 1
MaxRaySteps = 176
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.07142
coneApertureAO = 1
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.15686
SpecularExp = 250
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.15686
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.129412,0.129412,0.129412
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = 3.9784,2.043,2.9032
LightSize = 0.1
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0.95122
ShadowSoft = 10
BaseColor = 0.603922,0.552941,0.270588
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.0941176,0.121569,0.141176
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -1.0714
FloorColor = 0.0980392,0.388235,0.117647
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,1
HF_Scatter = 0
HF_Anisotropy = 0,0,0
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
BoxSize = 1,0.45283,0.64151
BoxRound = 0.28723
BoxPos = 0.86538,0,0
SphRad = 1
BoolSmooth = 0.22989
#endpreset

#preset name
FOV = 0.4
Eye = 3.17758,0.999933,0.683312
Target = -6.10032,-2.0544,-1.45949
Up = -0.16203,-0.0299397,0.986331
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 2
FudgeFactor = 1
MaxRaySteps = 176
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.07142
coneApertureAO = 1
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.15686
SpecularExp = 250
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.15686
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.129412,0.129412,0.129412
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = 3.9784,2.043,2.9032
LightSize = 0.1
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0.95122
ShadowSoft = 10
BaseColor = 0.603922,0.552941,0.270588
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.0196078,0.027451,0.0313725
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -1.1905
FloorColor = 0.0980392,0.388235,0.117647
HF_Fallof = 0.65698
HF_Const = 0
HF_Intensity = 0.4321
HF_Dir = 0,0,1
HF_Offset = -3.012
HF_Color = 0.27451,0.627451,1,0.69564
HF_Scatter = 0
HF_Anisotropy = 0,0,0
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
BoxSize = 1,0.45283,0.64151
BoxRound = 0.28723
BoxPos = 0.86538,0,0
SphRad = 1
BoolSmooth = 0.22989
#endpreset
