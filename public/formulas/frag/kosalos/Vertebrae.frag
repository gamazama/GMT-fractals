#info written by kosalos, based on many other frags from many sources
#info License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
#info -----------------------------------------------------------------------------
#info Spherical Inversion
#info Set [doInversion] checkbox to enable spherical inversion.
#info The companion controls [invX],[invY],[invZ],[invRadius] and [invAngle].
#info specify the inversion center point, radius and angle.
#info Apply Preset [Inv ON], or [Inv OFF] to load Settings to begin exploration.  

#define providesInit
#include "MathUtils.frag"
#include "DE-Raytracer-XId.frag"

uniform float time;

#group Vertebrae
uniform vec3 C; slider[(-10,-10,-10),(0,0,0),(10,10,10)]
uniform float Cw; slider[0.01,1,4]

uniform vec3 Log; slider[(0,0,0),(0,0,0),(5,5,5)]
uniform vec3 Scale; slider[(0,0,0),(0,0,0),(4,4,4)]
uniform vec3 Offset; slider[(-10,-10,-10),(0,0,0),(10,10,10)]
uniform vec3 Slope; slider[(-1,-1,-1),(0,0,0),(1,1,1)]

uniform float Smooth; slider[1,1,10]
uniform float Angle1; slider[0,0,3]
uniform float Angle2; slider[0,0,3]

uniform bool doInversion; checkbox[true]
uniform vec3 InvPt; slider[(-5,-5,-5),(0,0,0),(5,5,5)]
uniform float InvRadius; slider[0.1,4.01,10]
uniform float InvAngle; slider[-10,1.34,10]

uniform float Aspeed; slider[0,0,2]
uniform float Ascale; slider[-4,0,4]

vec3 rotatePosition(vec3 pos, int axis, float angle) {
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

//-------------------------------------------

vec4 c;
float invRadius2;
float a1;

void init() {
	c = 0.5 * vec4(C,Cw) * sin(time * Aspeed) * Ascale;
	invRadius2 = InvRadius * InvRadius;
 a1 = Angle1 * sin(time * Aspeed/2.0) * Ascale * 3.0;
}

//-------------------------------------------

float DE_VERTEBRAE(vec3 zIn) {
	float md2 = 1.0;
	vec4 z = vec4(zIn,0);
	vec4 nz,oldZ = z;
	float mz2 = dot(z,z);
	
	md2 *= 4.0 * mz2;
	nz.x = z.x * z.x - dot(z.yzw, z.yzw);
	nz.yzw = 2.0 * z.x * z.yzw;
	z = nz+c;
	
	z.xyz = Log * log(z.xyz + sqrt(dot(z.xyz,z.xyz)+1.0));
	z.xyz = Scale * sin(z.xyz + Offset) + z.xyz * Slope;
	
	z.xyz = rotatePosition(z.xyz,0,a1);
	z.xyz = rotatePosition(z.xyz,1,Angle2);
	
	z += (z - oldZ) / Smooth;
	oldZ = z;

	mz2 = dot(z,z);
	orbitTrap = min(orbitTrap, mz2);
	
	return 0.3 * sqrt(mz2/md2) * log(mz2);
}

//-------------------------------------------

float DE(vec3 pos) {
	if(doInversion) {
		pos = pos - InvPt;
		float r = length(pos);
		float r2 = r*r;
		pos = (invRadius2 / r2 ) * pos + InvPt;
		
		float an = atan(pos.y,pos.x) + InvAngle;
		float ra = sqrt(pos.y * pos.y + pos.x * pos.x);
		pos.x = cos(an)*ra;
		pos.y = sin(an)*ra;
		
		float de = DE_VERTEBRAE(pos);
		
		de = r2 * de / (invRadius2 + r * de);
		return de;
	}
	
	return DE_VERTEBRAE(pos);
}

#preset Inv ON
FOV = 0.92857144
Eye = 15.8879375,4.04614535,4.11213538
Target = -31.4007097,-19.3305462,-5.43315638
Up = 0.236367163,-0.508686667,0.074793723
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
EyeSeparation = 3.73955435
ProjectionPlane = 34.8258708
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
Gamma = 0.6097561
ToneMapping = 3
Exposure = 0.83156499
Brightness = 1.20107965
Contrast = 1.7279895
AvgLumin = 0.5,0.5,0.5
Saturation = 1.7631225
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 0
AntiAliasScale = 0
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 2.1574344
Detail = -2.93291138
DetailAO = -7
FudgeFactor = 0.18095238
MaxDistance = 405.9829
MaxRaySteps = 506
Dither = 1 Locked
NormalBackStep = 0 NotLocked
AO = 0,0,0,0
Specular = 0.06883117
SpecularExp = 23.669468
SpecularMax = 13.783404
SpotLight = 1,1,1,0.71326677
SpotLightDir = -0.53296702,-0.31593406
CamLight = 1,1,1,0.93865906
CamLightMin = 0.00958904
Glow = 1,1,1,0.77927322
GlowMax = 545
Fog = 0
HardShadow = 0 NotLocked
ShadowSoft = 13.5253774
QualityShadows = false
Reflection = 0.98155469 NotLocked
DebugSun = false NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.58367912
X = 0.5,0.6,0.6,0.0923277
Y = 1,0.6,0,0.25617686
Z = 0.8,0.78,1,0.03511054
R = 0.4,0.7,1,-0.23697916
BackgroundColor = 0.05882353,0.07843137,0.1019608
GradientBackground = 0
CycleColors = true
Cycles = 0.182352786
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
C = 3.5524654,-0.2402022,2.7180786
Cw = 0.271309786
Log = 1.0949367,1.55696205,1.06962025
Scale = 2.64082688,1.75710596,1.94832044
Offset = -2.2459892,-9.7593582,1.0695188
Slope = -0.40314136,0.17277488,-0.32460732
Smooth = 7.99595145
Angle1 = 2.03162058
Angle2 = 0.8735178
doInversion = true
InvPt = -2.1279373,-0.4166997,-1.7885117
InvRadius = 6.57625003
InvAngle = -4.7295422
Aspeed = 0.61986756
Ascale = -0.8677248
#endpreset

#preset Inv OFF
FOV = 0.92857144
Eye = 15.8879375,4.04614535,4.11213538
Target = -29.599129,-21.4097399,-8.40677597
Up = 0.256954657,-0.497966543,0.078925838
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
EyeSeparation = 3.73955435
ProjectionPlane = 34.8258708
AnaglyphLeft = 1,0,0
AnaglyphRight = 0,1,1
Gamma = 0.8760429
ToneMapping = 3
Exposure = 0.83156499
Brightness = 1.20107965
Contrast = 1.7279895
AvgLumin = 0.5,0.5,0.5
Saturation = 1.7631225
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 0
AntiAliasScale = 0
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 2.1514344
Detail = -2.71239465
DetailAO = -6.96630564
FudgeFactor = 0.488677
MaxDistance = 806.4516
MaxRaySteps = 1578
Dither = 1 Locked
NormalBackStep = 0.8838384 NotLocked
AO = 0,0,0,0.33611443
Specular = 0.06883117
SpecularExp = 26.682987
SpecularMax = 13.783404
SpotLight = 1,1,1,0.71326677
SpotLightDir = -0.00120336,-0.31593406
CamLight = 1,1,1,1.02233252
CamLightMin = 0.00958904
Glow = 1,1,1,0.40762813
GlowMax = 545
Fog = 0
HardShadow = 0 NotLocked
ShadowSoft = 13.5253774
QualityShadows = false
Reflection = 0.98155469 NotLocked
DebugSun = false NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.58367912
X = 0.5,0.6,0.6,0.0923277
Y = 1,0.6,0,0.25617686
Z = 0.8,0.78,1,0.03511054
R = 0.4,0.7,1,-0.23697916
BackgroundColor = 0.05882353,0.07843137,0.1019608
GradientBackground = 0
CycleColors = true
Cycles = 0.182352786
EnableFloor = false NotLocked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
C = -5.4878048,-0.2402022,-5.3902438
Cw = 1.71252679
Log = 1.38259835,2.96781885,1.43623365
Scale = 2.102503,2.47914188,3.23718716
Offset = -2.6829268,-1.4878048,-1.7804878
Slope = -0.22262334,0.07340554,-0.23706378
Smooth = 5.28260877
Angle1 = 1.20858165
Angle2 = 0.7365912
doInversion = false
InvPt = -2.1279373,-0.4166997,-1.7885117
InvRadius = 6.57625003
InvAngle = -4.7295422
Aspeed = 0.61986756
Ascale = -0.8677248
#endpreset

