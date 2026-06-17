#info Kleinian groups
#info Original idea and code by Jos Leys (Dec 2016)
#info Some cosmetic modifications by Naït Merzouk Abdelaziz (A.k.a. Knighty)
#info liscence:  Ask Jos Leys ;-)

//#include "IBL-Raytracer.frag"
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#include "renderer\DE-Kn2.frag"

#group Kleinian_test
uniform int Box_Iterations;  slider[1,50,100]
//Trace of the transformation a
uniform float KleinR;  slider[1.8,2.0,2.0]
uniform float KleinI;  slider[-0.2,0.0,0.2]
//To really give a kleinian group they must be of the form cos(PI/n) if <1 and any value if >=1
uniform float box_size_z;  slider[0.0,0.5,1.0]
uniform float box_size_x;  slider[0.0,0.5,1.0]
//WIP: Help get better DE?
uniform int Final_Iterations;  slider[0,5,20]
//Want do show the balls
uniform bool ShowBalls; checkbox[true]
//4 generators or 3? apply y translation
uniform bool FourGen; checkbox[false]
//The DE is wilde. It needs some clamping
uniform float Clamp_y;  slider[0.01,1.0,10.0]
uniform float Clamp_DF;    slider[0.0,1.0,10.0]

#group SphInv

//Want do do an inversion
uniform bool DoInversion; checkbox[false]
//Inversion center
uniform vec3 InvCenter; slider[(-1,-1,-1),(0,0,0),(1,1,1)]
//Inversion radius squared
uniform float InvRadius;  slider[0.01,1,2]
//Recenter
uniform vec3 ReCenter; slider[(-5,-5,-5),(0,0,0),(5,5,5)]

float dot2(vec3 z){ return dot(z,z);}

vec3 wrap(vec3 x, vec3 a, vec3 s){
	x -= s; 
	return (x-a*floor(x/a)) + s;
}

vec2 wrap(vec2 x, vec2 a, vec2 s){
	x -= s; 
	return (x-a*floor(x/a)) + s;
}

void TransA(inout vec3 z, inout float DF, float a, float b){
	float iR = 1. / dot2(z);
	z *= -iR;
	z.x = -b - z.x; z.y = a + z.y; 
	DF *= iR;//max(1.,iR);
}

void TransAInv(inout vec3 z, inout float DF, float a, float b){
	float iR = 1. / dot2(z + vec3(b,-a,0.));
	z.x += b; z.y = a - z.y; 
	z *= iR;
	DF *= iR;//max(1.,iR);
}

float  JosKleinian(vec3 z)
{
	vec3 lz=z+vec3(1.), llz=z+vec3(-1.);
	float DE=1e10;
	float DF = 1.0;
	float a = KleinR, b = KleinI;
	float f = sign(b) ;     
	for (int i = 0; i < Box_Iterations ; i++) 
	{
		//if(z.y<0. || z.y>a) break;
		
		z.x=z.x+b/a*z.y;
		if (FourGen)
			z = wrap(z, vec3(2. * box_size_x, a, 2. * box_size_z), vec3(- box_size_x, 0., - box_size_z));
		else
			z.xz = wrap(z.xz, vec2(2. * box_size_x, 2. * box_size_z), vec2(- box_size_x, - box_size_z));
		z.x=z.x-b/a*z.y;

		//If above the separation line, rotate by 180° about (-b/2, a/2)
		if  (z.y >= a * (0.5 +  f * 0.25 * sign(z.x + b * 0.5)* (1. - exp( - 3.2 * abs(z.x + b * 0.5)))))	
			z = vec3(-b, a, 0.) - z;//
			//z.xy = vec2(-b, a) - z.xy;//
		
		orbitTrap = min(orbitTrap, abs(vec4(z,dot(z,z))));//For colouring

		//Apply transformation a
		TransA(z, DF, a, b);
		
		//If the iterated points enters a 2-cycle , bail out.
		if(dot2(z-llz) < 1e-12) {
#if 0
			orbitTrap =vec4(1./float(i),0.,0.,0.);
#endif
			break;
		}
		//Store prévious iterates
		llz=lz; lz=z;
	}
	
	//WIP: Push the iterated point left or right depending on the sign of KleinI
	for (int i=0;i<Final_Iterations;i++){
		float y = ShowBalls ? min(z.y, a-z.y) : z.y;
		DE=min(DE,min(y,Clamp_y)/max(DF,Clamp_DF));
		TransA(z, DF, a, b);
	}
	float y = ShowBalls ? min(z.y, a-z.y) : z.y;
	DE=min(DE,min(y,Clamp_y)/max(DF,Clamp_DF));

	return DE;
}

float DE(vec3 p) {
	if(DoInversion){
		p=p-InvCenter-ReCenter;
		float r=length(p);
		float r2=r*r;
		p=(InvRadius * InvRadius/r2)*p+InvCenter;
		float de=JosKleinian(p);
		de=r2*de/(InvRadius * InvRadius+r*de);
		return de;
	}
	else return JosKleinian(p);
}

#preset Default
FOV = 0.4
Eye = 1.63974,-8.43643,-10.1553
Target = 1.53718,-7.12339,-8.65018
Up = -0.302626,0.642868,-0.70366
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 4
FudgeFactor = 0.3636
MaxRaySteps = 297
MaxDistance = 120
Dither = 0.5
NormalBackStep = 1
DetailAO = -2.51849
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0.1923
AmbiantLight = 1,1,1,0.47058
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 5,8,-10
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 2
BaseColor = 0.776471,0.776471,0.776471
OrbitStrength = 0.6
X = 0,1,0.164706,0.44186
Y = 1,0.533333,0,0.7907
Z = 0.603922,0.164706,0.776471,0.4186
R = 0.262745,0.482353,1,0.6
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
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
Box_Iterations = 30
KleinR = 1.9
KleinI = 0.056
box_size_z = 1
box_size_x = 1
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.38705
ShowBalls = false
ReCenter = 0,0,0
#endpreset

#preset QF
FOV = 0.4
Eye = -0.659128,-0.210696,-2.46667
Target = -0.1646,0.552551,-0.685457
Up = 0.0613182,0.914818,-0.399184
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 5
FudgeFactor = 0.25
MaxRaySteps = 297
MaxDistance = 120
Dither = 0.5
NormalBackStep = 1
DetailAO = -2.51849
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0.1923
AmbiantLight = 1,1,1,0.47058
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 5,8,-10
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 2
BaseColor = 0.576471,0.576471,0.576471
OrbitStrength = 0.73333
X = 0,1,0.164706,0.44186
Y = 1,0.533333,0,0.7907
Z = 0.603922,0.164706,0.776471,0.4186
R = 0.262745,0.482353,1,0.6
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
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
Box_Iterations = 40
KleinR = 1.9
KleinI = 0.1
box_size_z = 0.7071
box_size_x = 0.7071
ShowBalls = true
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.30327
ReCenter = 0,0,0
#endpreset


#preset QF2
FOV = 0.71698
Eye = -0.906954,0.667628,0.47372
Target = 0.0324118,0.542785,0.0115637
Up = 0,1,0
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -3.5
FudgeFactor = 0.21212
MaxRaySteps = 541
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0.03846
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.776471,0.776471,0.776471
OrbitStrength = 0.5
X = 0,1,0.164706,1
Y = 1,0.533333,0,-1
Z = 0.603922,0.164706,0.776471,1
R = 0.262745,0.482353,1,0.29412
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = true
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Box_Iterations = 20
KleinR = 1.91134
KleinI = 0.06126
box_size_z = 0.7071
box_size_x = 0.7071
Clamp_y = 0.4
Clamp_DF = 3
DoInversion = false
InvCenter = 0,-1,0
InvRadius = 0.30327
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
MaxDistance = 20
DetailAO = -2.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
AmbiantLight = 1,1,1,2
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,7
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 10
HF_Fallof = 0.1
HF_Const = 0.08861
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
ShowBalls = true
ReCenter = 0,0,0
#endpreset



#preset QF3
FOV = 0.4
Eye = -0.156312,0.467472,-1.17529
Target = 0.129376,1.09716,0.701319
Up = 0.0578722,0.0252976,-0.998003
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -4
RefineSteps = 5
FudgeFactor = 0.25
MaxRaySteps = 297
MaxDistance = 120
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.5
coneApertureAO = 0.9999
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 10,10,-8.1578
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 2
BaseColor = 0.678431,0.678431,0.678431
OrbitStrength = 0.75
X = 0,1,0.164706,1
Y = 1,0.215686,0.752941,0.95348
Z = 0.415686,0.776471,0.137255,1
R = 0.262745,0.482353,1,1
BackgroundColor = 0.180392,0.223529,0.266667
GradientBackground = 0.34485
CycleColors = true
Cycles = 5.16506
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.741176,0.87451,1,1
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
Box_Iterations = 40
KleinR = 1.91134
KleinI = 0.125
box_size_z = 0.7071
box_size_x = 0.7071
Final_Iterations = 10
ShowBalls = true
FourGen = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.3242
ReCenter = 0,0,0
#endpreset


#preset QF4
FOV = 0.4
Eye = -0.657958,-0.589646,-3.7183
Target = -0.286782,0.0337675,-1.8546
Up = 0.0451903,0.028017,-0.998585
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 5
FudgeFactor = 0.25
MaxRaySteps = 297
MaxDistance = 120
Dither = 0.5
NormalBackStep = 1
DetailAO = -2.51849
coneApertureAO = 0.95556
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.6
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 10,10,-8.1578
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 2
BaseColor = 0.576471,0.576471,0.576471
OrbitStrength = 0.65
X = 0,1,0.164706,1
Y = 1,0.215686,0.752941,0.95348
Z = 0.415686,0.776471,0.137255,1
R = 0.262745,0.482353,1,1
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 5.16506
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.741176,0.87451,1,1
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
Box_Iterations = 40
KleinR = 1.90309
KleinI = 0.1125
box_size_z = 0.80902
box_size_x = 0.80902
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.3242
ShowBalls = true
ReCenter = 0,0,0
#endpreset


#preset Balls
FOV = 0.71698
Eye = 0.514148,0.626541,-1.14617
Target = 0.178895,0.554774,-0.149159
Up = 0.0849694,0.996071,-0.0249459
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 3
FudgeFactor = 0.25
MaxRaySteps = 500
MaxDistance = 3
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,3
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 10
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.33333
X = 0,1,0.164706,1
Y = 1,0.533333,0,0.27906
Z = 0.603922,0.164706,0.776471,0.4186
R = 0.262745,0.482353,1,0.12942
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0.05063
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
Box_Iterations = 20
KleinR = 1.91134
KleinI = 0.06126
box_size_z = 1
box_size_x = 0.7071
Clamp_y = 0.5
Clamp_DF = 4
DoInversion = false
InvCenter = 0,-1,0
InvRadius = 0.30327
ShowBalls = true
ReCenter = 0,0,0
#endpreset


#preset Lace
FOV = 0.4
Eye = 0.20506,-0.0280273,-3.24676
Target = 0.23463,0.236689,-1.26458
Up = -0.51366,0.812086,-0.276893
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 5
FudgeFactor = 0.2
MaxRaySteps = 297
MaxDistance = 20
Dither = 1
NormalBackStep = 1
DetailAO = -1.7143
coneApertureAO = 0.5
maxIterAO = 10
AO_ambient = 0.83334
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 2.3684,5,-1.8422
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 2
BaseColor = 0.776471,0.776471,0.776471
OrbitStrength = 0.51667
X = 0,1,0.164706,0.8372
Y = 1,0.533333,0,0.7907
Z = 0.603922,0.164706,0.776471,1
R = 0.262745,0.482353,1,0.01176
BackgroundColor = 0.0627451,0.0745098,0.0862745
GradientBackground = 1.0345
CycleColors = false
Cycles = 3.35606
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
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
Box_Iterations = 30
KleinR = 1.9
KleinI = 0.06549
box_size_z = 0.7071
box_size_x = 1
ShowBalls = false
Clamp_y = 1.5
Clamp_DF = 1
DoInversion = true
InvCenter = -0.21862,0.6592,0
InvRadius = 0.38705
ReCenter = 0,0,0
#endpreset

#preset Dragon
FOV = 0.4
Eye = -0.164924,0.437747,-1.16082
Target = 0.137985,1.09731,0.702785
Up = 0.052929,0.00684249,-0.998575
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Detail = -4
FudgeFactor = 0.25
MaxRaySteps = 297
Dither = 0.5
NormalBackStep = 2
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.658824,0.658824,0.658824
OrbitStrength = 0.5
X = 0,1,0.164706,1
Y = 1,0.215686,0.752941,0.95348
Z = 0.415686,0.776471,0.137255,1
R = 0.262745,0.482353,1,1
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 5.16506
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Box_Iterations = 100
KleinR = 1.91134
KleinI = 0.125
box_size_z = 1
box_size_x = 0.7071
ShowBalls = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.3242
FocalPlane = 1.2
Aperture = 0.0241
InFocusAWidth = 0.2
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
RefineSteps = 5
MaxDistance = 120
DetailAO = -1.50003
coneApertureAO = 0.95556
maxIterAO = 10
AO_ambient = 0.9
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
AmbiantLight = 1,1,1,1
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 10,10,-8.1578
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 2
HF_Fallof = 0.1
HF_Const = 0.00109
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.741176,0.87451,1,1
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
ReCenter = 0,0,0
#endpreset

#preset Hydra
FOV = 0.71698
Eye = 0.337759,0.101177,-1.82455
Target = 0.14406,0.281813,-0.804051
Up = -0.421694,0.845619,-0.327265
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -3.5
FudgeFactor = 0.25
MaxRaySteps = 500
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.35
X = 0,1,0.164706,0
Y = 1,0.533333,0,1
Z = 0.603922,0.164706,0.776471,1
R = 0.262745,0.482353,1,0.01176
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 6.61245
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Box_Iterations = 37
KleinR = 1.91778
KleinI = 0.06126
box_size_z = 1
box_size_x = 0.7071
Clamp_y = 0.5
Clamp_DF = 4
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
RefineSteps = 3
MaxDistance = 3
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
AmbiantLight = 1,1,1,1
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,3
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 10
HF_Fallof = 0.1
HF_Const = 0.05063
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
ShowBalls = true
FourGen = false
DoInversion = true
InvCenter = 0.27576,0.52804,0
InvRadius = 0.19853
Final_Iterations = 1
ReCenter = 0,0,0
#endpreset

#preset Necklace
FOV = 0.71698
Eye = -0.0277687,-0.149878,-0.857614
Target = 0.0450824,0.00297902,0.183012
Up = -0.37895,0.903148,-0.201792
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -3.5
FudgeFactor = 0.25
MaxRaySteps = 500
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.35
X = 0,1,0.164706,0
Y = 1,0.533333,0,1
Z = 0.603922,0.164706,0.776471,1
R = 0.262745,0.482353,1,0.01176
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 6.61245
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Box_Iterations = 37
KleinR = 1.9299
KleinI = 0.06126
box_size_z = 1
box_size_x = 0.7071
Clamp_y = 0.5
Clamp_DF = 4
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
RefineSteps = 3
MaxDistance = 3
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
AmbiantLight = 1,1,1,1
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,3
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 10
HF_Fallof = 0.1
HF_Const = 0.05063
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
ShowBalls = true
FourGen = false
DoInversion = true
InvCenter = -0.0548,0.88822,0
InvRadius = 0.19853
Final_Iterations = 1
ReCenter = -0.1747,-0.7937,0
#endpreset
