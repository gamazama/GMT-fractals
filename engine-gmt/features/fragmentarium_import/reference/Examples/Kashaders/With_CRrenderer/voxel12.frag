#info pythagore tree 3D
//#define providesInit
#define KN_VOLUMETRIC
#define MULTI_SAMPLE_AO
#define USE_EIFFIE_SHADOW
#include "renderer\DE-kn2.frag"
//#include "DE-Raytracer.frag"

#group Voxels
// Voxel width / 2.
uniform float halfWidth;  slider[0,0.5,2]
// Voxel offset
uniform vec3 Offset; slider[(0,0,0),(0.5,0.5,0.5),(1,1,1)]
// Shrink factor of Voxels
uniform float SFactor;  slider[0,1,1]
// Roundness of Voxels
uniform float RFactor;  slider[0,0,1]

#group object
// Sphere radius
uniform float Radius; slider[0,3,10]


uniform float time;

float DEbox(vec3 p, float a){
	p = abs( p );
	p = p - vec3( a );
	float d = max( p.x, max( p.y, p.z ) );
	if( d > 0. ) d = length( max( p, vec3( 0. ) ) ); 
	return d;
}

float DEsphere(vec3 p){
	return length( p ) - Radius;
}

float DEbase(vec3 p){
	return abs(DEsphere( p )) - Radius*0.1;
	//return max( DEbox( p, 2. ) - 2., -DEsphere( p ) );
}

float DEboxH(vec3 p, float h, float a){
	p = abs( p );
	vec3 pp = min( p, vec3( a - a * RFactor ) );

	if( h < 0. )
		h = 0.;
	else
		h = max( h, 2. * halfWidth );
	//clamp(h,0., 2.*halfWidth);

	return length( vec4( ( p - pp ), h ) ) - RFactor * a;
}

float vWidthMod(vec3 p, float hw){
#if 1
	vec3 m = SFactor * ( 0.5 * sin( -p + PI * time ) + 0.5 ) * 1. ;
	return clamp( dot(vec3(0.2, 0., 1.), m), 0., 1. ) * hw;
#else
	return clamp( SFactor, 0., 1.) * hw;
#endif
}

vec3 round(vec3 p){
	return 2.* halfWidth * floor( 0.5 / halfWidth * ( p - halfWidth * ( Offset - vec3( 1. ) ) ) ) + halfWidth * Offset;
}

float DEvox(vec3 p){
	float HWS = sqrt(3.) * halfWidth;
	
	float d = DEbase( p );
	if( d > HWS*2.) return d - HWS;
	d = max( halfWidth, d - HWS );
	float d0 = d;
	vec3 p0 = round( p );
	vec3 delta = sign( p - p0 ) * 2.* halfWidth;
	vec3 p1 = p0;
	for(int h = 0; h < 2; h++) {
		p1.z = p0.z + float( h ) * delta.z;
		for(int j = 0; j < 2; j++){
			p1.y = p0.y + float( j ) * delta.y;
			for(int i = 0; i < 2; i++){
				p1.x = p0.x + float( i ) * delta.x;
				float d1 = DEboxH( p - p1, DEbase( p1 ), vWidthMod( p1, halfWidth) );
				d0 = min( d0, d1);
			}
		}
	}
	return d0;
}

float DE(vec3 p ) {
	return DEvox( p );
}

#preset default
FOV = 0.4
Eye = 6.52,20.3259,4.42597
Target = -0.0598165,-0.186476,-0.0406053
Up = -0.0661044,-0.192009,0.979164
Gamma = 1
ToneMapping = 3
Exposure = 1.04082
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
FudgeFactor = 1
MaxRaySteps = 128 Locked
Dither = 0
NormalBackStep = 1 NotLocked
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 20
BaseColor = 0.796078,0.54902,0.372549
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -5
FloorColor = 0.176471,0.345098,0.258824
halfWidth = 0.35052
Offset = 0,0,0
SFactor = 1
RFactor = 0.19811
Radius = 4.2857
FocalPlane = 5
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
MaxDistance = 100
DetailAO = -1.07142
coneApertureAO = 0.5
maxIterAO = 0
AO_ambient = 0.83334
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.04762
SpecularExp = 46.296
AmbiantLight = 1,1,1,1
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,3
LightPos = 8.0646,6.5592,8.7096
LightSize = 0.1
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
HF_Fallof = 0.25302
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = -4.4578
HF_Color = 0.380392,0.576471,1,0.82608
HF_Scatter = 48.052
HF_Anisotropy = 0.564706,0.564706,0.564706
HF_FogIter = 4
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
Eye = -17.6586,13.0932,6.41505
Target = -0.694006,0.51458,0.252118
Up = -0.18556,0.148479,0.97135
Gamma = 1
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1.0891
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
FudgeFactor = 1
MaxRaySteps = 128 Locked
Dither = 0.48246
NormalBackStep = 1 NotLocked
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.796078,0.54902,0.372549
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -5
FloorColor = 0.176471,0.345098,0.258824
halfWidth = 0.14432
Offset = 0,0,0
SFactor = 1
RFactor = 0.26415
Radius = 4.6667
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
RefineSteps = 1
MaxDistance = 100
DetailAO = -1.42856
coneApertureAO = 0.56452
maxIterAO = 10
AO_ambient = 0.75
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.44706
SpecularExp = 281.82
AmbiantLight = 1,1,1,0.29412
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,3
LightPos = 0.7526,1.613,3.3334
LightSize = 0.1
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
HF_Fallof = 0.75802
HF_Const = 0.02083
HF_Intensity = 1
HF_Dir = 0,0,1
HF_Offset = -4.4578
HF_Color = 0.380392,0.576471,1,0.82608
HF_Scatter = 48.052
HF_Anisotropy = 0.564706,0.564706,0.564706
HF_FogIter = 4
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
#endpreset


#preset dissolving
FOV = 0.4
Eye = -9.75544,12.9293,-1.8317
Target = 3.41141,-4.52129,0.640532
Up = -0.384407,0.454309,0.803638
Gamma = 1
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1.0891
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
FudgeFactor = 1
MaxRaySteps = 128 Locked
Dither = 0.48246
NormalBackStep = 1 NotLocked
CamLight = 1,1,1,0.15384
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.360784,0.490196,0.341176
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -5
FloorColor = 0.32549,0.341176,0.337255
halfWidth = 0.47422
Offset = 0,0,0
SFactor = 1
RFactor = 0.07547
Radius = 4.2857
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
RefineSteps = 1
MaxDistance = 100
DetailAO = -1.42856
coneApertureAO = 0.56452
maxIterAO = 10
AO_ambient = 0.75
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.2353
SpecularExp = 445.455
AmbiantLight = 1,1,1,0.52942
Reflection = 0.0392157,0.0784314,0.117647
ReflectionsNumber = 1
SpotGlow = true
SpotLight = 1,0.92549,0.772549,3
LightPos = 0.7526,1.613,3.3334
LightSize = 0.1
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
HF_Fallof = 0.75802
HF_Const = 0.02083
HF_Intensity = 1
HF_Dir = 0,0,1
HF_Offset = -4.4578
HF_Color = 0.380392,0.576471,1,0.13044
HF_Scatter = 25.974
HF_Anisotropy = 0.564706,0.419608,0.4
HF_FogIter = 5
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
#endpreset


#preset Atomic
FOV = 0.4
Eye = 18.1479,-6.08693,5.09254
Target = -2.40298,-0.817029,-0.728983
Up = -0.120376,0.179778,0.976314
FocalPlane = 5
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 3
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
Detail = -5
RefineSteps = 3
FudgeFactor = 1
MaxRaySteps = 1000 Locked
MaxDistance = 100
Dither = 0
NormalBackStep = 1
DetailAO = -2.92859
coneApertureAO = 0.12903
maxIterAO = 0
AO_ambient = 0.78572
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.51764
SpecularExp = 390.91
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,5
LightPos = 8.0646,6.5592,8.7096
LightSize = 0
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.54902,0.34902,0.235294
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.0235294,0.0431373,0.0627451
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -5
FloorColor = 0.0666667,0.117647,0.0823529
HF_Fallof = 0.65698
HF_Const = 0.01
HF_Intensity = 0.09877
HF_Dir = 0,0,1
HF_Offset = -4.4578
HF_Color = 0.380392,0.576471,1,0.34782
HF_Scatter = 10.39
HF_Anisotropy = 0.564706,0.564706,0.564706
HF_FogIter = 4
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
halfWidth = 0.04124
Offset = 0,0,0
SFactor = 0.15888
RFactor = 0.65094
Radius = 0
#endpreset



#preset Mes
FOV = 0.4
Eye = 16.1862,-5.58389,4.53685
Target = -4.09892,-0.242402,-2.09503
Up = -0.155597,0.189279,0.969517
FocalPlane = 5
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 3
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
Detail = -5
RefineSteps = 3
FudgeFactor = 1
MaxRaySteps = 1000 Locked
MaxDistance = 100
Dither = 0
NormalBackStep = 1
DetailAO = -2.92859
coneApertureAO = 0.12903
maxIterAO = 0
AO_ambient = 0.78572
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.51764
SpecularExp = 390.91
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,5
LightPos = 8.0646,6.5592,8.7096
LightSize = 0
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.54902,0.34902,0.235294
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.0235294,0.0431373,0.0627451
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -5
FloorColor = 0.0666667,0.117647,0.0823529
HF_Fallof = 0.30352
HF_Const = 0.03125
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = -4.4578
HF_Color = 0.501961,0.717647,1,1.1739
HF_Scatter = 15.584
HF_Anisotropy = 0.564706,0.564706,0.564706
HF_FogIter = 4
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
halfWidth = 0.14432
Offset = 0,0,0
SFactor = 0.70093
RFactor = 0.65094
Radius = 4.4762
#endpreset


#preset Mesoscale02
FOV = 0.4
Eye = 18.1479,-6.08693,5.09254
Target = -2.40298,-0.817029,-0.728983
Up = -0.120559,0.179657,0.976314
FocalPlane = 5
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 3
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
Detail = -5
RefineSteps = 3
FudgeFactor = 1
MaxRaySteps = 1000 Locked
MaxDistance = 100
Dither = 0
NormalBackStep = 1
DetailAO = -2.92859
coneApertureAO = 1
maxIterAO = 5
AO_ambient = 0.78572
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.51764
SpecularExp = 390.91
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,5
LightPos = 8.0646,6.5592,8.7096
LightSize = 0
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.54902,0.34902,0.235294
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.0235294,0.0431373,0.0627451
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -5
FloorColor = 0.0666667,0.117647,0.0823529
HF_Fallof = 0.65698
HF_Const = 0.01
HF_Intensity = 0.09877
HF_Dir = 0,0,1
HF_Offset = -4.4578
HF_Color = 0.380392,0.576471,1,0.34782
HF_Scatter = 10.39
HF_Anisotropy = 0.564706,0.564706,0.564706
HF_FogIter = 4
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
halfWidth = 0.02
Offset = 0,0,0
SFactor = 0.13084
RFactor = 1
Radius = 4.5714
#endpreset

#preset breath 
FOV = 0.4
Eye = 4.28777,14.1713,6.81764
Target = 0,0,0
Up = -0.145485,0.148318,0.97818
FocalPlane = 13.4093
Aperture = 0.21312
InFocusAWidth = 0.05818
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1.0891
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 1
FudgeFactor = 1
MaxRaySteps = 128 Locked
MaxDistance = 100
Dither = 0.48246
NormalBackStep = 1
DetailAO = -0.9625
coneApertureAO = 0.56452
maxIterAO = 16
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.2353
SpecularExp = 445.455
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.52942
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0.0392157,0.0784314,0.117647
ReflectionsNumber = 1
SpotGlow = false
SpotLight = 1,0.92549,0.772549,2
LightPos = 0.7526,1.613,3.3334
LightSize = 0.1
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.772549,0.772549,0.772549
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
FloorHeight = -5
FloorColor = 0.32549,0.341176,0.337255
HF_Fallof = 0.73253
HF_Const = 0.02083
HF_Intensity = 1
HF_Dir = 0,0,1
HF_Offset = -2.1968
HF_Color = 0.380392,0.576471,1,0.10308
HF_Scatter = 14.716
HF_Anisotropy = 0.564706,0.419608,0.4,-0.73076
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
halfWidth = 0.17554
Offset = 0,0,0
SFactor = 0.77508
RFactor = 0.52439
Radius = 4.2857
#endpreset

#preset breathe 
FOV = 0.4
Eye = 4.28777,14.1713,6.81764
Target = 0,0,0
Up = -0.145485,0.148318,0.97818
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.0891
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.25
Detail = -3
FudgeFactor = 1
Dither = 0.48246
NormalBackStep = 1
DetailAO = -0.9625
coneApertureAO = 0.56452
maxIterAO = 16
AO_ambient = 0.66666
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.2353
SpecularExp = 445.455
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.52942
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0.0392157,0.0784314,0.117647
ReflectionsNumber = 1
SpotGlow = false
LightSize = 0.00619
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.772549,0.772549,0.772549
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
FloorColor = 0.32549,0.341176,0.337255
HF_Fallof = 0.949065834
HF_Const = 0
HF_Intensity = 1
HF_Dir = 0,0,1
HF_Offset = -0.8352144
HF_Color = 0.380392,0.576471,1,0.10308
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
halfWidth = 0.3699
Offset = 0,0,0
SFactor = 0.75988
RFactor = 0
Radius = 4.5566
FocalPlane = 13.4093
Aperture = 0.21312
InFocusAWidth = 0.05818
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
BloomPow = 2
BloomTaps = 4
RefineSteps = 1
MaxRaySteps = 128 Locked
MaxDistance = 100
SpotLight = 1,0.92549,0.772549,2
LightPos = 0.7526,1.613,3.3334
FloorHeight = -5
HF_Scatter = 41.002278
HF_Anisotropy = 0.564706,0.419608,0.4,-0.95
HF_FogIter = 8
#endpreset
