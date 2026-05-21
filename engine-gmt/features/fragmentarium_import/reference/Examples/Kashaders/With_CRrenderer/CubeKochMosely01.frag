#info CubeKoch Distance Estimator.
#info I realized later that is has a name: Mosley :)
#info Try very low iterations number to carve the fractal from a cube. ;oD

#define PERFECT_DE
#define providesInit
#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#include "renderer\DE-Kn2.frag"

#group CubeKoch
// Based on Knighty's Kaleidoscopic IFS 3D Fractals, described here:
// http://www.fractalforums.com/3d-fractal-generation/kaleidoscopic-%28escape-time-ifs%29/

// Number of iterations.
uniform int Iterations;  slider[0,10,40]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[0.00,3,4.00]

// Hollow version ?
uniform bool IsHollow; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,0,0),(1,1,1)]

// Rotation angle. 
uniform float RotAngle; slider[0.00,00,360]

// Scaling center
uniform vec3 Offset; slider[(-2,-2,-2),(1,1,0),(2,2,2)]

mat3 rot;
float sc,sr;

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
	vec3 o=abs(Offset);
	sc = max(o.x,max(o.y,o.z));
	sr=sqrt(dot(o,o)+1.);
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

float DE(vec3 p)
{
	float r2=dot(p,p);
	float dd=1.;	
	for(int i = 0; i<Iterations && r2<100.; i++){
		//foldings begin: feel free to comment/uncomment to see the effect of each fold
		p=abs(p);
		if(p.y>p.x) p.xy=p.yx;
      		if(p.z>p.y) p.yz=p.zy;
      		if(p.y>p.x) p.xy=p.yx;
		if(!IsHollow)
			p.x=abs(p.x-1./3.*Offset.x)+1./3.*Offset.x;
		p.y=abs(p.y-1./3.*Offset.y)+1./3.*Offset.y;
		//p.z=abs(p.z-1./3.*Offset.z)+1./3.*Offset.z;
		//foldings end
		p=p*Scale-Offset*(Scale-1.); dd*=Scale;
		p=rot*p;
		r2=dot(p,p);
		orbitTrap = min(orbitTrap, abs(vec4(p,r2)));
	}
	return boxDE(p,1.) / dd ;
	//return (sqrt(r2)-sr)/dd;
	//p=abs(p); return (max(p.x,max(p.y,p.z))-sc)/dd;
}

#preset Default 
FOV = 0.4
Eye = 2.39057,-2.07032,2.10934
Target = -4.0658,2.82022,-3.75564
Up = -0.331706,0.275332,0.90231
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3.3
FudgeFactor = 1
MaxRaySteps = 176
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.44043
X = 0.6,0.105882,0.105882,1
Y = 0.423529,1,0.470588,0.61166
Z = 0.968627,1,0.584314,0.18152
R = 0.32549,0.368627,1,0.70198
BackgroundColor = 0.0431373,0.0901961,0.133333
GradientBackground = 1.08695
CycleColors = true
Cycles = 8.30778
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0.3
ApertureNbrSides = 5 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
Bloom = false
BloomIntensity = 0.33334
BloomPow = 1.236
BloomTaps = 5
RefineSteps = 4
MaxDistance = 20
DetailAO = -1.10404
coneApertureAO = 0.79389
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 1
SpecularExp = 109.09
AmbiantLight = 1,1,1,1
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,1,1,7
LightPos = -5.0538,-3.7634,7.4194
LightSize = 0.0099
LightFallOff = 0.17978
LightGlowRad = 0.3226
LightGlowExp = 0.9524
HardShadow = 1 Locked
ShadowSoft = 12.9032
HF_Fallof = 0.90951
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = -3.253
HF_Color = 0.505882,0.698039,0.952941,0.52173
HF_Scatter = 0
HF_Anisotropy = 0,0,0,0
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
Iterations = 6
Scale = 3
RotVector = 1,0,0
RotAngle = 0
Offset = 1,1,0
#endpreset

#preset Noname 
FOV = 0.4
Eye = 1.39289,-2.4687,2.53293
Target = -0.0712518,-0.0589173,-0.0164997
Up = -0.018165,0.0324825,0.999307
Gamma = 2
ToneMapping = 3
Exposure = 1.5594
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -4
FudgeFactor = 1
MaxRaySteps = 176
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.509804,0.509804,0.509804
OrbitStrength = 0.69713
X = 0.6,0.105882,0.105882,1
Y = 0.423529,1,0.470588,0.94622
Z = 0.968627,1,0.584314,0.6626
R = 0.32549,0.368627,1,0.2353
BackgroundColor = 0.0431373,0.0901961,0.133333
GradientBackground = 1.08695
CycleColors = true
Cycles = 4.00779
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
FocalPlane = 2.81544
Aperture = 0.10099
InFocusAWidth = 0.31117
ApertureNbrSides = 5 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
Bloom = false
BloomIntensity = 0.33334
BloomPow = 1.236
BloomTaps = 5
RefineSteps = 1
MaxDistance = 20
DetailAO = -1.83218
coneApertureAO = 0.79389
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.35784
SpecularExp = 212.965
AmbiantLight = 0.831373,0.913725,1,0.54342
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,0.976471,0.882353,6
LightPos = -5.2882,-3.4336,10
LightSize = 0.01229
LightFallOff = 0.19746
LightGlowRad = 0.3226
LightGlowExp = 0.9524
HardShadow = 1 Locked
ShadowSoft = 0
HF_Fallof = 1.01275
HF_Const = 0
HF_Intensity = 0.16537
HF_Dir = 0,0,1
HF_Offset = 0.4884
HF_Color = 0.376471,0.654902,0.94902,0
HF_Scatter = 3.394
HF_Anisotropy = 0.588235,0.133333,0.0705882,-0.74418
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
Iterations = 20
Scale = 3
RotVector = 1,0,0
RotAngle = 0
Offset = 1,1,0
#endpreset

#preset Noname2 
FOV = 0.4
Eye = 1.58547,-2.78566,2.86826
Target = 0.109846,-0.412738,0.291031
Up = -0.0236997,0.0407345,0.998889
FocalPlane = 3.37483
Aperture = 0.04448
InFocusAWidth = 0.13851
ApertureNbrSides = 5 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
Gamma = 2
ToneMapping = 3
Exposure = 1.5594
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.33334
BloomPow = 1.236
BloomTaps = 5
Detail = -4
RefineSteps = 1
FudgeFactor = 1
MaxRaySteps = 176
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.83218
coneApertureAO = 0.79389
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.35784
SpecularExp = 212.965
CamLight = 1,1,1,0
AmbiantLight = 0.831373,0.913725,1,0.54342
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,0.976471,0.882353,6
LightPos = -5.2882,-3.4336,10
LightSize = 0.01229
LightFallOff = 0.19746
LightGlowRad = 0.3226
LightGlowExp = 0.9524
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.509804,0.509804,0.509804
OrbitStrength = 0.69713
X = 0.6,0.105882,0.105882,1
Y = 0.423529,1,0.470588,0.94622
Z = 0.968627,1,0.584314,0.6626
R = 0.32549,0.368627,1,0.2353
BackgroundColor = 0.0431373,0.0901961,0.133333
GradientBackground = 1.08695
CycleColors = true
Cycles = 4.00779
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 1.72343
HF_Const = 0
HF_Intensity = 0.16537
HF_Dir = 0,0,1
HF_Offset = -0.809
HF_Color = 0.376471,0.654902,0.94902,0
HF_Scatter = 3.394
HF_Anisotropy = 0.588235,0.133333,0.0705882,-0.74418
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
Iterations = 20
Scale = 1.39536
RotVector = 1,0,0
RotAngle = 45
Offset = 1,0.46708,2
#endpreset

#preset cage
FOV = 0.4
Eye = 1.76592602,-2.80371155,1.86308128
Target = -2.77358551,4.51496881,-3.21922511
Up = -0.473211723,0.274196995,0.817524547
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
DetailAO = -1.10404
coneApertureAO = 0.79389
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
SpotLight = 1,1,1,7
LightPos = -5.0538,-3.7634,7.4194
LightSize = 0.0099
LightFallOff = 0.17978
LightGlowRad = 0.3226
LightGlowExp = 0.9524
HardShadow = 1 Locked
ShadowSoft = 12.9032
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.44043
X = 0.6,0.105882,0.105882,1
Y = 0.423529,1,0.470588,0.61166
Z = 0.968627,1,0.584314,0.18152
R = 0.32549,0.368627,1,0.70198
BackgroundColor = 0.0431373,0.0901961,0.133333
GradientBackground = 1.08695
CycleColors = true
Cycles = 8.30778
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
HF_Anisotropy = 0,0,0,0
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
Iterations = 20
Scale = 1.23931624
RotVector = 0,0,1
RotAngle = 117.060134
Offset = 1,1,0.12987016
#endpreset
