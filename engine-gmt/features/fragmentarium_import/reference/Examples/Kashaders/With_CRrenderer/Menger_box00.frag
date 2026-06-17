#version 330
#info Menger Distance Estimator.
//#define PERFECT_DE
#define providesInit
#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#include "renderer\DE-Kn2.frag"

#group Menger


// Based on Knighty's Kaleidoscopic IFS 3D Fractals, described here:
// http://www.fractalforums.com/3d-fractal-generation/kaleidoscopic-%28escape-time-ifs%29/

// Number of iterations.
uniform int Iterations;  slider[0,13,100]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[1.01,3.0,4.00]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

// Scale parameter. A perfect Menger is 3.0
uniform float RotAngle; slider[0.00,0,180]

// Scaling center
uniform vec3 Offset; slider[(0,0,0),(1,1,1),(1,1,1)]

mat3 rot;

//problems with mathutils.frag !!!
#if 1
// Return rotation matrix for rotating around vector v by angle
mat3  rotationMatrix3(vec3 v, float angle)
{
	float c = cos(radians(angle));
	float s = sin(radians(angle));

	return mat3(c + (1.0 - c) * v.x * v.x, (1.0 - c) * v.x * v.y - s * v.z, (1.0 - c) * v.x * v.z + s * v.y,
		(1.0 - c) * v.x * v.y + s * v.z, c + (1.0 - c) * v.y * v.y, (1.0 - c) * v.y * v.z - s * v.x,
		(1.0 - c) * v.x * v.z - s * v.y, (1.0 - c) * v.y * v.z + s * v.x, c + (1.0 - c) * v.z * v.z
		);
}
#endif

void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

float boxDE(vec3 z, float siz){
	z = abs(z);// - vec3(siz);
	//return max(z.x,max(z.y,z.z));
	
	if (z.x<z.y)	z.xy = z.yx;
	if (z.x< z.z)	z.xz = z.zx;
	if (z.y<z.z)	z.yz = z.zy;
	z-=vec3(siz);
	if(z.z>0.) return length(z);
	if(z.y>0.) return length(z.xy);
	return z.x;
}

float boxDE2(vec3 z, float siz){
	z-=vec3(siz);
	if(z.z>0.) return length(z);
	if(z.y>0.) return length(z.xy);
	return z.x;
}

float DE(vec3 z)
{
	float r = dot(z,z);
	
	int n = 0;
	// Fold
	z = abs(z);
	if (z.x<z.y)
		 z.xy = z.yx;
	if (z.x< z.z)
		z.xz = z.zx;
	if (z.y<z.z)
		z.yz = z.zy;
	
while (n < Iterations && r<100.) {
		
		z = Scale * z - vec3(Offset.xy,0.) * (Scale - 1.0);
		
		z = rot *z;

		if( z.z>0.5*Offset.z*(Scale-1.0))  z.z-=Offset.z*(Scale-1.0);
		
		// Fold
		z = abs(z);
		if (z.x<z.y)
			z.xy = z.yx;
		if (z.x< z.z)
			z.xz = z.zx;
		if (z.y<z.z)
			z.yz = z.zy;
		
		r = dot(z, z);

		orbitTrap = min(orbitTrap, abs(vec4(z,r)));
		
		n++;
	}
	return boxDE2(z,1.) * pow(Scale, float(-n)) ;
	//return (length(z) - 2.) * pow(Scale, float(-n));
	//return abs(z.x-Offset.z) * pow(Scale, float(-n));
}



#preset Default
FOV = 0.4
Eye = 2.04433,-3.698,1.22781
Target = -2.93027,4.39076,-1.90673
Up = -0.053667,0.136315,0.989211
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0.3
ApertureNbrSides = 5 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.33334
BloomPow = 1.236
BloomTaps = 5
Detail = -3.3
RefineSteps = 4
FudgeFactor = 1
MaxRaySteps = 176
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.7857
coneApertureAO = 0.69355
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 1
SpecularExp = 109.09
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = -5.0538,-3.7634,7.4194
LightSize = 0.0099
LightFallOff = 0.17978
LightGlowRad = 0.3226
LightGlowExp = 0.9524
HardShadow = 1 Locked
ShadowSoft = 12.9032
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.28571
X = 0.6,0.105882,0.105882,1
Y = 0.423529,1,0.470588,0.61166
Z = 0.968627,1,0.584314,1
R = 0.32549,0.368627,1,-0.64706
BackgroundColor = 0.0431373,0.0901961,0.133333
GradientBackground = 1.08695
CycleColors = true
Cycles = 4.65662
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.90951
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = -3.253
HF_Color = 0.505882,0.698039,0.952941,0.52173
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
Iterations = 7
Scale = 3
RotVector = 0,0,1
RotAngle = 0
Offset = 1,1,1
#endpreset


#preset Noname
FOV = 0.4
Eye = 3.47195,1.22203,2.41126
Target = -4.36974,-1.65606,-3.08641
Up = -0.0939751,0.991961,-0.0847446
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0.3
ApertureNbrSides = 5 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.33334
BloomPow = 1.236
BloomTaps = 5
Detail = -3.3
RefineSteps = 4
FudgeFactor = 1
MaxRaySteps = 56
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.35716
coneApertureAO = 0.66129
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.02353
SpecularExp = 61.818
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = 6.129,6.9892,7.2044
LightSize = 0.0099
LightFallOff = 0.17978
LightGlowRad = 0.3226
LightGlowExp = 0.9524
HardShadow = 1 Locked
ShadowSoft = 12.9032
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.36364
X = 0.133333,0.6,0.188235,-0.24272
Y = 1,0.160784,0.160784,0.24272
Z = 0.133333,0.133333,1,1
R = 1,0.980392,0.333333,-0.07844
BackgroundColor = 0.133333,0.133333,0.133333
GradientBackground = 0.65215
CycleColors = true
Cycles = 8.90928
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.90951
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = -3.253
HF_Color = 0.505882,0.698039,0.952941,0.52173
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
Iterations = 7
Scale = 3
RotVector = 0,0,1
RotAngle = 62.0694
Offset = 1,1,0.44643
#endpreset

#preset iNFOg
FOV = 0.4
Eye = 2.83628,2.2484,-1.92672
Target = -4.0808,-3.31379,2.67936
Up = -0.171204,0.87282,0.457027
FocalPlane = 2.90792
Aperture = 0.08434
InFocusAWidth = 0.16981
ApertureNbrSides = 5 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.33334
BloomPow = 1.236
BloomTaps = 5
Detail = -3.3
RefineSteps = 4
FudgeFactor = 1
MaxRaySteps = 56
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.35716
coneApertureAO = 0.66129
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.02353
SpecularExp = 61.818
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = 6.129,6.9892,7.2044
LightSize = 0.0099
LightFallOff = 0.17978
LightGlowRad = 0.3226
LightGlowExp = 0.9524
HardShadow = 1 Locked
ShadowSoft = 12.9032
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.41667
X = 0.133333,0.6,0.188235,0.32558
Y = 1,0.160784,0.160784,0.27906
Z = 0.133333,0.133333,1,0.5814
R = 1,0.980392,0.333333,-0.24706
BackgroundColor = 0.054902,0.0745098,0.129412
GradientBackground = 0.68965
CycleColors = true
Cycles = 32.3
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 1.34182
HF_Const = 0
HF_Intensity = 0.23438
HF_Dir = 0,1,0
HF_Offset = -2.1212
HF_Color = 0.505882,0.698039,0.952941,0.86538
HF_Scatter = 21.667
HF_Anisotropy = 0,0,0
HF_FogIter = 1
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Iterations = 7
Scale = 3
RotVector = 0,0,1
RotAngle = 62.0694
Offset = 1,1,0.44643
#endpreset

#preset iNFOg02
FOV = 0.4
Eye = 3.20756,2.07934,-1.4832
Target = -4.59051,-3.08328,2.0576
Up = -0.291689,0.920977,0.2583
FocalPlane = 2.90792
Aperture = 0.0482
InFocusAWidth = 0.16981
ApertureNbrSides = 5 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.33334
BloomPow = 1.236
BloomTaps = 5
Detail = -3.3
RefineSteps = 4
FudgeFactor = 1
MaxRaySteps = 56
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.35716
coneApertureAO = 0.66129
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.02353
SpecularExp = 61.818
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 6.129,6.9892,7.2044
LightSize = 0.05952
LightFallOff = 0
LightGlowRad = 0.3226
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.41667
X = 0.133333,0.6,0.188235,0.32558
Y = 1,0.160784,0.160784,0.27906
Z = 0.133333,0.133333,1,0.5814
R = 1,0.980392,0.333333,-0.24706
BackgroundColor = 0.054902,0.0745098,0.129412
GradientBackground = 0.68965
CycleColors = true
Cycles = 32.3
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 1.34182
HF_Const = 0
HF_Intensity = 0.23438
HF_Dir = 0,1,0
HF_Offset = -2.1212
HF_Color = 0.505882,0.698039,0.952941,0.03846
HF_Scatter = 21.667
HF_Anisotropy = 0.678431,0.47451,0.356863
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Iterations = 7
Scale = 3
RotVector = 0,0,1
RotAngle = 62.0694
Offset = 1,1,0.44643
#endpreset
