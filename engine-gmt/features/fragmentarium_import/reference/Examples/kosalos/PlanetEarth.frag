#info This fragment is based on code created by knighty in May 1, 2010
#info Part of a series of IFS equations
#info http://www.fractalforums.com/sierpinski-gasket/kaleidoscopic-(escape-time-ifs)/?PHPSESSID=95c58fd40b61747add7ef16564ccc048
#info License unknown

#define providesInit

#include "MathUtils.frag"
#include "DE-Raytracer.frag"

#define float3 vec3
#define float4 vec4

#group Geode

uniform int MaxSteps; slider[5,20,60]
uniform float Scale; slider[60,110,175]
uniform float CY; slider[0.7,1,2]
uniform float Angle1; slider[-2,0,2]
uniform float Angle2; slider[-2,0,2]
uniform float Angle3; slider[-2,0,2]

float3 rotatePosition(float3 pos, int axis, float angle) {
   float ss = sin(angle);
   float cc = cos(angle);
   float qt;
   
   if(axis == 0) {
	  qt = pos.x;
	  pos.x = pos.x * cc - pos.y * ss;
	  pos.y =    qt * ss + pos.y * cc;
   }
   
   if(axis == 1) {
	  qt = pos.x;
	  pos.x = pos.x * cc - pos.z * ss;
	  pos.z =    qt * ss + pos.z * cc;
   }
   
   if(axis == 2) {
	  qt = pos.y;
	  pos.y = pos.y * cc - pos.z * ss;
	  pos.z =    qt * ss + pos.z * cc;
   }
   
   return pos;
}

float scale;
float3 n1;
float3 n2;

void init() {
   scale = Scale / 100.0;
   n1 = normalize(float3(-1.0, CY - 1.0, 1.0/CY - 1.0));
   n2 = n1 * (scale - 1.0);
}

float DE(float3 pos) {
	int i;

	for(i=0;i < MaxSteps; ++i) {
		pos = rotatePosition(pos,0,Angle1);
		
		if(pos.x - pos.y < 0.0) pos.xy = pos.yx;
		if(pos.x - pos.z < 0.0) pos.xz = pos.zx;
		if(pos.y - pos.z < 0.0) pos.zy = pos.yz;
		
		pos = rotatePosition(pos,1,Angle2);
		pos = rotatePosition(pos,2,Angle3);
		pos = pos * scale - n2;

		if(length(pos) > 4.0) break;

		orbitTrap = min(orbitTrap, float4(abs(pos),dot(pos,pos)));
	}

	return length(pos) * pow(scale, -float(i));
}

#preset Default

FOV = 0.114369502
Eye = -7.35252155,-1.97883542,-0.063579262
Target = 29.3315782,7.82921225,-0.619425945
Up = 0.077280688,-0.290643284,-0.028192494
EquiRectangular = false
AutoFocus = false
FocalPlane = 2.37315875
Aperture = 0
Stereo = 0
EyeSeparation = 0.51020408
ProjectionPlane = 165.441177
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
Gamma = 0.647810218
ToneMapping = 1
Exposure = 1.17018072
Brightness = 2.26574501
Contrast = 1.80482711
AvgLumin = 0.5,0.5,0.5
Saturation = 3.25421133
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 0
AntiAliasScale = 0
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -3.35599284
DetailAO = -6.68361581
FudgeFactor = 0.325396826
MaxDistance = 159.235671
MaxRaySteps = 360
Dither = 1 Locked
NormalBackStep = 0 NotLocked
AO = 0,0,0,0.211155378
Specular = 0.078125
SpecularExp = 6.50684936
SpecularMax = 3.61445779
SpotLight = 1,1,1,0.257443083
SpotLightDir = -0.063545149,-0.842809364
CamLight = 1,1,1,0.318739055
CamLightMin = 0.098333334
Glow = 1,1,1,0.097879282
GlowMax = 62
Fog = 0
HardShadow = 0.225913621 NotLocked
ShadowSoft = 1.50250418
QualityShadows = false
Reflection = 0 NotLocked
DebugSun = false NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.367149759
X = 0.5,0.6,0.6,0.442278862
Y = 5,0,0,0.094452774
Z = 0.8,0.78,1,-0.040479759
R = 0.0941176471,0.411764706,1,1
BackgroundColor = 0.05882353,0.07843137,0.1019608
GradientBackground = 0
CycleColors = true
Cycles = 14.3058823
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1

MaxSteps = 15
Scale = 123.888889
CY = 0.752436975
Angle1 = 0.379562046
Angle2 = -1.27737226
Angle3 = 0.350364964

#endpreset

