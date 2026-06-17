#info https://github.com/3Dickulus/FragM/blob/master/Fragmentarium-Source/Examples/Experimental/Spudsville2.frag
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
#define float4x4 mat4

#group SpudsVille
uniform int maxSteps; slider[3,5,30]
uniform float power; slider[1.5,4,12]
uniform float MinRad; slider[-5,0,5]
uniform float FixedRad; slider[-5,0,5]
uniform float FoldLimit; slider[-5,0,5]
uniform float FoldLimit2; slider[-5,0,5]
uniform float ZMUL; slider[-10,0,10]
uniform float Scale; slider[-5,0,5]
uniform float Scale2; slider[-5,0,5]

uniform bool doInversion; checkbox[true]
uniform float invX; slider[-5,-0.96,5]
uniform float invY; slider[-5,-0.52,5]
uniform float invZ; slider[-5,-2.304,5]
uniform float invRadius; slider[0.1,4.01,10]
uniform float invAngle; slider[-10,1.34,10]

void spudsSphereFold(inout float3 z,inout float dz) {
    float r2 = dot(z,z);

    if (r2< MinRad) {
        float temp = (FixedRad / MinRad);
        z *= temp;
        dz *= temp;
    } else if (r2 < FixedRad) {
        float temp = FixedRad /r2;
        z *= temp;
        dz *= temp;
    }
}

void spudsBoxFold(inout float3 z,inout float dz) {
    z = clamp(z, -FoldLimit, FoldLimit) * 2.0 - z;
}

void spudsBoxFold3(inout float3 z,inout float dz) {
    z = clamp(z, -FoldLimit2,FoldLimit2) * 2.0 - z;
}

void spudsPowN2(inout float3 z, float zr0, inout float dr) {
    float zo0 = asin( z.z/zr0 );
    float zi0 = atan( z.y,z.x );
    float zr = pow( zr0, power-1.0 );
    float zo = zo0 * power;
    float zi = zi0 * power;
    dr = zr*dr * power * abs(length(float3(1.0,1.0,ZMUL)/sqrt(3.0))) + 1.0;
    zr *= zr0;
    z = zr*float3( cos(zo)*cos(zi), cos(zo)*sin(zi), ZMUL * sin(zo) );
}

float DE_SPUDS(float3 pos) {
	orbitTrap = vec4(1e5);
    int n = 0;
    float dz = 1.0;
    float r = length(pos);

    while(r < 10.0 && n < maxSteps) {
        if (n < 6) {
            spudsBoxFold(pos,dz);
            spudsSphereFold(pos,dz);
            pos *= Scale;
            dz *= abs(Scale);
        } else {
            spudsBoxFold3(pos,dz);
            r = length(pos);
            spudsPowN2(pos,r,dz);
            pos *= Scale2;
            dz *= abs(Scale2);
        }

        r = length(pos);
        n++;
orbitTrap = min(orbitTrap, abs(vec4(pos,r*r)));
    }

    return r * log(r) / dz;
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
FOV = 0.129341317
Eye = 16.2990197,-43.6066286,10.1715687
Target = 14.297992,-38.0919227,8.17023812
Up = 0.057134572,-0.03925596,0.004149462
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 0.502994014
ToneMapping = 2
Exposure = 0.827586207
Brightness = 1
Contrast = 1.16666667
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0.270916335
GaussianWeight = 3.515625
AntiAliasScale = 0
DepthToAlpha = false
Detail = -4.39298669
DetailAO = -2.85247883
FudgeFactor = 0.051497006
Dither = 1
NormalBackStep = 9.51456311 NotLocked
AO = 0,0,0,0
SpecularExp = 76.0147602
CamLight = 1,1,1,1.91616767
CamLightMin = 0.005988024
Glow = 1,1,1,0
GlowMax = 0
Fog = 0
Reflection = 0 NotLocked
BaseColor = 1,0.235294118,0.823529412
OrbitStrength = 0.961676648
X = 0.5,0.6,0.6,0.576783556
Y = 1,0.6,0,0.760580413
Z = 0.8,0.78,1,-0.339782346
R = 0.4,0.7,1,0.366384523
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 2.707692
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
ShowDepth = false
DepthMagnitude = 1
MaxDistance = 87.2817962
MaxRaySteps = 896
Specular = 0.38647343
SpecularMax = 80.0738008
SpotLight = 1,1,1,0.88982036
SpotLightDir = 0.146311972,0.100000001
HardShadow = 0.706586827 NotLocked
ShadowSoft = 3.32524272
QualityShadows = false
DebugSun = false NotLocked
maxSteps = 11
power = 4.48179612
MinRad = -0.405078596
FixedRad = -0.320435306
FoldLimit = 1.03385733
FoldLimit2 = 2.37605805
ZMUL = 1.32352943
Scale = -1.28778718
Scale2 = 2.35187425
doInversion = true
invX = 0.09068924
invY = 0.054413546
invZ = -1.28778718
invRadius = 1.93822816
invAngle = -3.33333332
#endpreset

#preset Inv OFF
FOV = 0.129341317
Eye = 16.2990197,-43.6066286,10.1715687
Target = 14.1001781,-37.9951351,8.72324093
Up = 0.038664643,0.05655838,-0.014242508
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
ProjectionPlane = 165.441177
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
Gamma = 0.502994014
ToneMapping = 2
Exposure = 0.827586207
Brightness = 1
Contrast = 1.16666667
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0.270916335
GaussianWeight = 3.515625
AntiAliasScale = 0
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4.39298669
DetailAO = -2.85247883
FudgeFactor = 0.051497006
MaxDistance = 87.2817962
MaxRaySteps = 896
Dither = 1 Locked
NormalBackStep = 9.51456311 NotLocked
AO = 0,0,0,0
Specular = 0.38647343
SpecularExp = 76.0147602
SpecularMax = 80.0738008
SpotLight = 1,1,1,0.88982036
SpotLightDir = 0.146311972,0.100000001
CamLight = 1,1,1,1.91616767
CamLightMin = 0.005988024
Glow = 1,1,1,0
GlowMax = 0
Fog = 0
HardShadow = 0.706586827 NotLocked
ShadowSoft = 3.32524272
QualityShadows = false
Reflection = 0 NotLocked
DebugSun = false NotLocked
BaseColor = 1,0.235294118,0.823529412
OrbitStrength = 0.961676648
X = 0.5,0.6,0.6,0.576783556
Y = 1,0.6,0,0.760580413
Z = 0.8,0.78,1,-0.339782346
R = 0.4,0.7,1,0.366384523
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 2.707692
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
EyeSeparation = 3.49331715
maxSteps = 9
power = 2.88224633
MinRad = 0.6438027
FixedRad = 0.4271962
FoldLimit = -0.1383874
FoldLimit2 = 0.6678701
ZMUL = -7.8780488
Scale = 0.9446451
Scale2 = -3.5198556
doInversion = false
invX = 0.09068924
invY = 0.054413546
invZ = -1.28778718
invRadius = 1.93822816
invAngle = -3.33333332
#endpreset

#preset lagrande
FOV = 0.15733016
Eye = 1.51994947,-14.8906361,0.900116241
Target = 1.47429659,-11.6051659,-0.467878038
Up = -0.00120336,0.0171739,0.10228642
EquiRectangular = false
AutoFocus = false
FocalPlane = 16.8478265
Aperture = 0
ProjectionPlane = 165.441177
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
Gamma = 2.50297975
ToneMapping = 1
Exposure = 1.29797379
Brightness = 2.5387366
Contrast = 1.3230036
AvgLumin = 0.5,0.5,0.5
Saturation = 0.6555423
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0.3
GaussianWeight = 0
AntiAliasScale = 0
DepthToAlpha = true
ShowDepth = false
DepthMagnitude = 1
Detail = -4.82671476
DetailAO = -3.64741272
FudgeFactor = 0.03933254
MaxDistance = 614.14395
MaxRaySteps = 563
Dither = 0 Locked
NormalBackStep = 0.7323232 NotLocked
AO = 0,0,0,0.63766389
Specular = 0
SpecularExp = 37.086904
SpecularMax = 0
SpotLight = 1,1,1,0.8585608
SpotLightDir = 0.33333334,-0.133574
CamLight = 1,1,1,0.11414392
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 0
Fog = 0.33134684
HardShadow = 0 NotLocked
ShadowSoft = 5.1690822
QualityShadows = false
Reflection = 0 NotLocked
DebugSun = false NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.40217392
X = 0.282352941,0.603921569,0.8,0.32129966
Y = 1,0.6,0,0.28519856
Z = 0.980392157,0.380392157,1,0.67509026
R = 0.384313725,1,0.694117647,-0.47051744
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = false
Cycles = 0.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
EyeSeparation = 3.49331715
maxSteps = 8
power = 7.76449275
MinRad = 2.8820699
FixedRad = 4.0493382
FoldLimit = 0.9807461
FoldLimit2 = 1.5102287
ZMUL = 0.5365854
Scale = 1.2093863
Scale2 = -2.8459687
doInversion = false
invX = -2.3781291
invY = -1.7588932
invZ = -3.2058047
invRadius = 1.78423235
invAngle = -2.0827586
#endpreset
