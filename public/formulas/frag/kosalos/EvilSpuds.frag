#info This fragment is based on code created by EvilRyu in 2018-03-10
#info https://www.shadertoy.com/view/4sGyRR
#info License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
#info -----------------------------------------------------------------------------
#info Spherical Inversion
#info Set [doInversion] checkbox to enable spherical inversion.
#info The companion controls [invX],[invY],[invZ],[invRadius] and [invAngle].
#info specify the inversion center point, radius and angle.
#info Apply Preset [Inv ON], or [Inv OFF] to load Settings to begin exploration.  

#include "MathUtils.frag"
#include "DE-Raytracer-XId.frag"

#define float3 vec3
#define float4 vec4

#group EvilSpuds
uniform int maxSteps; slider[1,3,10]
uniform vec3 fold; slider[(-5,-5,-5),(0,0,0),(5,5,5)]
uniform float kMax; slider[0.01,0.03,1]
uniform float offset1; slider[0,0.3,1]
uniform float offset2; slider[0.01,0.03,0.4]

uniform bool doInversion; checkbox[true]
uniform float invX; slider[-5,-0.96,5]
uniform float invY; slider[-5,-0.52,5]
uniform float invZ; slider[-5,-2.304,5]
uniform float invRadius; slider[0.1,4.01,10]
uniform float invAngle; slider[-10,1.34,10]

float DE_SPUDS(float3 p) {
	float scale = 1.0;
	
	for(int i=0;i < maxSteps; ++i) {
		p = 2.0*clamp(p, -fold, fold) - p;
		float r2 = dot(p,p);
		float k = max((1.)/(r2), kMax);

		p *= k;
		scale *= k;
		orbitTrap = min(orbitTrap, float4(p,r2));
	}

	float l = length(p.xy);
	float rxy = l - offset1;
	float n = l * p.z;
	rxy = max(rxy, -(n) / (length(p)) - offset2);

	return rxy / abs(scale);
}

float DE(float3 pos) {
	if(doInversion) {
		float3 invCenter = float3(invX,invY,invZ);
		pos = pos - invCenter;
		float r = length(pos);
		float r2 = r*r;
		pos = (invRadius * invRadius / r2 ) * pos + invCenter;
		
		float an = atan(pos.y,pos.x) + invAngle;
		float ra = sqrt(pos.y * pos.y + pos.x * pos.x);
		pos.x = cos(an)*ra;
		pos.y = sin(an)*ra;
		
		float de = DE_SPUDS(pos);
		
		de = r2 * de / (invRadius * invRadius + r * de);
		return de;
	}
	
	return DE_SPUDS(pos);
}

#preset Inv ON
FOV = 0.79656864
Eye = 3.5374549,5.20115784,-0.937811822
Target = 3.47161446,-16.344917,-1.30770886
Up = -0.005639616,0.001044374,-0.059829743
EquiRectangular = false
AutoFocus = false
FocalPlane = 2.37315875
Aperture = 0
EyeSeparation = 2.6523546
ProjectionPlane = 165.441177
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
Gamma = 1.1366539
ToneMapping = 1
Exposure = 1.22803738
Brightness = 2.12643678
Contrast = 1.80811808
AvgLumin = 0.5,0.5,0.5
Saturation = 3.25421133
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 0
AntiAliasScale = 0
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -3.33249364
DetailAO = -6.68361581
FudgeFactor = 0.36265224
MaxDistance = 159.235671
MaxRaySteps = 360
Dither = 1 Locked
NormalBackStep = 0 NotLocked
AO = 0,0,0,0
Specular = 0.31653747
SpecularExp = 52.367689
SpecularMax = 8.391608
SpotLight = 1,1,1,0.12340426
SpotLightDir = -0.46448086,-0.43169398
CamLight = 1,1,1,0.16170212
CamLightMin = 0.09809264
Glow = 1,1,1,0.27175368
GlowMax = 481
Fog = 0
HardShadow = 0.64673914 NotLocked
ShadowSoft = 1.06412
QualityShadows = false
Reflection = 0 NotLocked
DebugSun = false NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.17606603
X = 0.5,0.6,0.6,0.02457958
Y = 1,0.333333333,0.498039216,-0.19275548
Z = 0.658823529,0.666666667,0.0666666667,0.3195343
R = 0,1,0,-0.14248704
BackgroundColor = 0.05882353,0.07843137,0.1019608
GradientBackground = 0
CycleColors = true
Cycles = 1.53384217
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
maxSteps = 4
fold = 0.6157636,-0.7881773,-0.9605911
kMax = 0.572388617
offset1 = 0.25883839
offset2 = 0.20401515
doInversion = true
invX = -2.8589109
invY = -4.1212871
invZ = -2.4876237
invRadius = 6.61695368
invAngle = -1.111111
#endpreset

#preset Inv OFF
maxSteps = 4
fold = 0.1865223,0.1744886,-0.5836341
kMax = 0.668426705
offset1 = 0.06912992
offset2 = 0.197794994
doInversion = false
invX = -2.8589109
invY = -4.1212871
invZ = -2.4876237
invRadius = 6.61695368
invAngle = -1.111111
FOV = 0.79656864
Eye = 4.14773853,5.44858434,-0.168403869
Target = -7.80923595,-12.4539816,-1.1188751
Up = -0.002479966,0.004834287,-0.059857945
EquiRectangular = false
AutoFocus = false
FocalPlane = 2.37315875
Aperture = 0
EyeSeparation = 1.7982989
ProjectionPlane = 165.441177
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
Gamma = 1.1366539
ToneMapping = 1
Exposure = 1.22803738
Brightness = 2.12643678
Contrast = 1.80811808
AvgLumin = 0.5,0.5,0.5
Saturation = 3.25421133
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 0
AntiAliasScale = 0
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -3.33249364
DetailAO = -6.68361581
FudgeFactor = 0.36265224
MaxDistance = 159.235671
MaxRaySteps = 360
Dither = 1 Locked
NormalBackStep = 0 NotLocked
AO = 0,0,0,0
Specular = 0.31653747
SpecularExp = 52.367689
SpecularMax = 8.391608
SpotLight = 1,1,1,0.12340426
SpotLightDir = -0.46448086,-0.43169398
CamLight = 1,1,1,0.16170212
CamLightMin = 0.09809264
Glow = 1,1,1,0.27175368
GlowMax = 481
Fog = 0
HardShadow = 0.64673914 NotLocked
ShadowSoft = 1.06412
QualityShadows = false
Reflection = 0 NotLocked
DebugSun = false NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.17606603
X = 0.5,0.6,0.6,0.02457958
Y = 1,0.333333333,0.498039216,-0.19275548
Z = 0.658823529,0.666666667,0.0666666667,0.3195343
R = 0,1,0,-0.14248704
BackgroundColor = 0.05882353,0.07843137,0.1019608
GradientBackground = 0
CycleColors = true
Cycles = 1.53384217
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
#endpreset


