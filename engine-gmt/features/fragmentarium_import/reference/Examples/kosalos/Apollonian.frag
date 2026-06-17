#info https://fractalforums.org/code-snippets-fragments/74/apollonian-plus-spherical-inversion-plus-iteration-tweak/3049
#info -----------------------------------------------------------------------------
#info Spherical Inversion
#info Set [doInversion] checkbox to enable spherical inversion.
#info The companion controls [invX],[invY],[invZ],[invRadius] and [invAngle].
#info specify the inversion center point, radius and angle.
#info Apply Preset [Inv ON], or [Inv OFF] to load Settings to begin exploration.  

#include "MathUtils.frag"
#include "DE-Raytracer-XId.frag" 

#define float3 vec3

#group Apollonian
uniform int maxSteps; slider[2,20,20]
uniform float foam; slider[0.1,1.032,3.0]
uniform float foam2; slider[0.1,0.92,3]
uniform float multiplier; slider[0.1,0.658,30]
uniform float cx; slider[0.1,1.946,10]
uniform float cy; slider[0.1,0.991,10]
uniform float cz; slider[0.1,0.945,10]

uniform bool doInversion; checkbox[true]
uniform float invX; slider[-5,0.758,5]
uniform float invY; slider[-5,0.312,5]
uniform float invZ; slider[-5,0.61,5]
uniform float invRadius; slider[0.1,2.74,10]
uniform float invAngle; slider[-10,0.07,10]

float DE_APOLLONIAN(float3 z) {
    float t = foam * (foam2 + 0.25 * cos(PI * multiplier * (z.z - z.x)));
    float z2,scale = 1.;
    float3 cc = float3(cx,cy,cz);

    for(int i=0; i< maxSteps; ++i) {
        z *= cc;                                     // <-- added
        z = -1.0 + 2.0 * fract(0.5 * z + 0.5);
        z /= cc;                                     // <-- added
        z2 = t / dot(z,z);
        z *= z2;
        scale *= z2;
    }

    orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,z2*z2)));

    return 1.5 * (0.25 * abs(z.y) / scale);
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

        float de = DE_APOLLONIAN(pos);

        de = r2 * de / (invRadius * invRadius + r * de);
        return de;
    }
   
    return DE_APOLLONIAN(pos);
}

#preset Inv ON
FOV = 0.4
Eye = 17.4745364,20.5519868,18.0408676
Target = 13.4006998,13.115347,12.7399044
Up = -0.901026903,0.232614366,0.366115925
EquiRectangular = false
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 6
AntiAliasScale = 1.5
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -6.6
FudgeFactor = 0.06
NormalBackStep = 1
CamLight = 1,1,1,1.038461
BaseColor = 1,1,1
OrbitStrength = 0.7931034
X = 0.5,0.6,0.6,0.3191489
Y = 1,0.6,0,0.1276596
Z = 0.8,0.78,1,0.38596
R = 0.4,0.7,1,0.1914894
BackgroundColor = 0.05882353,0.07843137,0.1019608
GradientBackground = 0
CycleColors = true
Cycles = 2.707692
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
AutoFocus = false
FocalPlane = 1
Aperture = 0
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
DetailAO = -2.783133
MaxDistance = 3299.41861
MaxRaySteps = 5000
Dither = 1
AO = 0,0,0,0.699999988
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.100000001,0.100000001
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 1
ShadowSoft = 20
QualityShadows = false
Reflection = 0
DebugSun = false
maxSteps = 20
foam = 1.032
foam2 = 0.92
multiplier = 0.658
cx = 1.946
cy = 0.991
cz = 0.945
doInversion = true
invX = 0.758
invY = 0.312
invZ = 0.61
invRadius = 2.56473029
invAngle = 0.07
#endpreset

#preset Inv OFF
FOV = 0.4
Eye = 12.7204088,20.9241695,9.39811505
Target = 3.17538112,20.4936546,6.44734037
Up = 0.04452468,-0.636273251,0.043713262
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 1.91895115
ToneMapping = 1
Exposure = 1.01191896
Brightness = 1.227652
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 6
AntiAliasScale = 1.5
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -3.41155234
DetailAO = -6.22503007
FudgeFactor = 0.24672229
MaxDistance = 564.51615
MaxRaySteps = 342
Dither = 0.03098927 Locked
NormalBackStep = 0 NotLocked
AO = 0,0,0,0.13110846
Specular = 0.0738975
SpecularExp = 16.364
SpecularMax = 5.882353
SpotLight = 1,1,1,0.43796526
SpotLightDir = -0.35499398,-0.38628158
CamLight = 1,1,1,0.70719604
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 0
Fog = 0.17401668
HardShadow = 0 NotLocked
ShadowSoft = 0
QualityShadows = false
Reflection = 0 NotLocked
DebugSun = false NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.7931034
X = 0.5,0.6,0.6,0.3191489
Y = 1,0.6,0,0.1276596
Z = 0.8,0.78,1,0.38596
R = 0.4,0.7,1,0.1914894
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 2.707692
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Stereo = 0
EyeSeparation = 2.61846905
ProjectionPlane = 165.441177
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
maxSteps = 6
foam = 0.753277697
foam2 = 1.2475566
multiplier = 0.1
cx = 0.733695633
cy = 1.21195652
cz = 1.30760873
doInversion = false
invX = 0.758
invY = 0.312
invZ = 0.61
invRadius = 2.56473029
invAngle = 0.07
#endpreset
