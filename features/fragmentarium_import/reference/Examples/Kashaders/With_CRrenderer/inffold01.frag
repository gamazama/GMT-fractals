#version 400 
//the #version clause is just to avoid the numerous warnings that hide the errors
#info Hex grid
#info Testing infinite tiling for Zhao's ball packings
#define PERFECT_DE
//#define providesInit
//#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#include "renderer\DE-Kn2.frag"
#group Hex 

uniform float radius; slider[0,0.5,1]
uniform float littlerad; slider[0,0.1,0.5]
uniform vec3 TVec; slider[(-2,-2,-2),(0,0,0),(2,2,2)]

//fold about line with normal ndir (normalized) and dist to origin d.
void fold(inout vec2 p, in vec2 ndir, in float d){
   float t = dot(p, ndir) + d;
   t = 2.*min(t,0.);
   p -= t * ndir;
}

//fmod with step = stp
void infmod(inout float x, float stp){
	x *= 1./stp;
	x -= floor(x);
	x *= stp;
}

//infinite fold. stp is the tile size.
//its like performing infinite folds about plane at 0 and plane at stp
void inffold(inout float x, float stp){
	x *= 1./(2.*stp);
	x -= floor(x);
	x  = 0.5 - abs( x - 0.5 );
	x *= 2.*stp;
}

//Simplest: fold into unit square then about the diagonal
void fold244(inout vec2 p){
	inffold( p.x , 1. );
	inffold( p.y , 1. );
#define VAL sqrt(2.)/2.
	fold( p, -vec2( VAL, VAL ), VAL);
#undef VAL 
}

//fold into rectangle then a little sequence of line folds.
void fold236(inout vec2 p){
#define S3 sqrt(3.) 
	inffold( p.x , 3. );
	inffold( p.y , S3 );
	vec2 n = -0.5 * vec2(S3, 1.);
	float d = .5 * S3;
	fold(p, n, d);
	p = abs(p);
	fold(p, n, d);
#undef S3 
}

//most complicated
void fold333(inout vec2 p){
#define S3 sqrt(3.) 
	//change origin
	p.x += 1.;
	//fold y into segment of height sqrt(3)
	inffold( p.y ,S3 );
	//change of coordinates to go to ( (2,0) ; (1,sqrt(3)) ) ish basis. We only nees x coordinate to be transformed
	p.x -= p.y * 1. / S3;
	//do an fmod instead for x.
	infmod(p.x, 6.);
	//undo the coordinates change
	p.x += p.y * 1./S3;
	//The folding sequence... 4 folds
	//There are other choices. I've choosen the one where I need only one direction instead of two.
	vec2 n = -0.5 * vec2(S3, 1.);
	float d = 2. * S3;
	//1st
	fold(p, n, d);
	//2nd
	d = S3;
	fold(p, n, d);
	//3rd
	p.y = abs(p.y);
	//4th same as 2nd
	fold(p, n, d);
	//restore origin
	p.x -=1.;
#undef S3 
}

//--------------------------------------------------------------------------------------------------
void tile(inout float x, float a){//infinite fold
   x-= a;
   x = abs(x-(2*floor(x*0.5/a)+1)*a);
}

void reduce(inout vec2 p){//infinite tiling of the plane
   tile(p.x,1.5);
   tile(p.y,sqrt(3)/2);
}

void fold(inout vec2 p){
   float t = dot(p, vec2(- sqrt(3.)/2., - 0.5)) + sqrt(3.)/4.;
   t = 2.*min(t,0.);
   p -= t * vec2(- sqrt(3.)/2., - 0.5);
}

float hexcircles(vec3 p, float r){
   reduce(p.xy);
   fold(p.xy);
   p.y = abs(p.y) - sqrt(3)/2;
   return length( vec2(length(p.xy) - r, p.z) ) - littlerad;
}
//--------------------------------------------------------------------------------------------------

float donut244(in vec3 p, in float r){
	fold244(p.xy);
	p -= TVec;
	return length( vec2(length(p.xy) - r, p.z) ) - littlerad;
}

float donut236(in vec3 p, in float r){
	fold236(p.xy);
	p -= TVec;
	return length( vec2(length(p.xy) - r, p.z) ) - littlerad;
}

float donut333(in vec3 p, in float r){
	fold333(p.xy);
	p -= TVec;
	return length( vec2(length(p.xy) - r, p.z) ) - littlerad;
}

float DE(vec3 p){
	//return hexcircles(p, radius);
	//return donut244(p, radius);
	//return donut236(p, radius);
	return donut333(p, radius);
}

#preset Default 
FOV = 0.4
Eye = 9.65558,-16.6545,10.8442
Target = 5.40462,-9.43517,5.38433
Up = -0.121398,0.16563,0.978688
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3.5
FudgeFactor = 1
MaxRaySteps = 200
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 20
BaseColor = 0.266667,0.4,0.647059
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
radius = 0.83794
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
RefineSteps = 4
MaxDistance = 83.74
DetailAO = -2.18568
coneApertureAO = 0.5
maxIterAO = 5
AO_ambient = 0.9148
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
AmbiantLight = 1,1,1,1
Reflection = 0.105882,0.054902,0.0901961
ReflectionsNumber = 2 Locked
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = -5.431,-2.1552,5.1724
LightSize = 0.1
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0
ShadowSoft = 10
HF_Fallof = 2.41621
HF_Const = 0.013
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,0
HF_Scatter = 6.481
HF_Anisotropy = 0.121569,0.345098,0.388235
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
#endpreset

#preset Noname
FOV = 0.4
Eye = 10.6518,-17.4515,4.43187
Target = 7.45114,-9.46261,-0.660697
Up = -0.10806,0.130367,0.985559
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3.5
FudgeFactor = 1
MaxRaySteps = 200
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 20
BaseColor = 0.647059,0.470588,0.227451
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
radius = 0.56522
FocalPlane = 9.56359
Aperture = 0.26988
InFocusAWidth = 0.01914
ApertureNbrSides = 7
ApertureRot = 0
ApStarShaped = true
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
RefineSteps = 4
MaxDistance = 83.74
DetailAO = -2.18568
coneApertureAO = 0.5
maxIterAO = 5
AO_ambient = 0.9148
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 1.20362
SpecularExp = 500
AmbiantLight = 1,1,1,1
Reflection = 0.105882,0.054902,0.0901961
ReflectionsNumber = 2 Locked
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = -5.431,-2.1552,5.1724
LightSize = 0.1
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0
ShadowSoft = 10
HF_Fallof = 2.41621
HF_Const = 0.013
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,0
HF_Scatter = 6.481
HF_Anisotropy = 0.121569,0.345098,0.388235
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
littlerad = 0.21138
#endpreset
