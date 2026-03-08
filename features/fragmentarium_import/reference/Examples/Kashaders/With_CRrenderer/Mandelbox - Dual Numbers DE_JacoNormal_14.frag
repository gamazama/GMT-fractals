//#version 120
#info Mandelbox Distance Estimator.
#define providesInit
#define providesNormal
#define providesColor
//#define PERFECT_DE
//#define providesInit
//#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#include "renderer\DE-Kn2.frag"

#group Mandelbox

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[-5.00,2.0,4.00]

// Scaling center
uniform vec3 Offset; slider[(0,0,0),(1,1,1),(5,5,5)]
uniform vec3 Scale2; slider[(0,0,0),(1,1,1),(25,25,25)]

mat3 rot;
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
uniform float RotAngle; slider[0.00,0,180]

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


uniform float fixedRadius2; slider[0.0,1.0,2.3]
uniform float minRadius2; slider[0.0,0.25,2.3]


void sphereFold(inout vec3 z, inout mat3 dz) {
	float r2 = dot(z,z);
	if (r2< minRadius2) {
		float temp = (fixedRadius2/minRadius2);
		z*= temp; dz*=temp;
	} else if (r2<fixedRadius2) {
		float temp =(fixedRadius2/r2);
		//dz= dz* temp * (mat3(1) - 2./r2 * outerProduct(z,z)) ;
		dz= temp * ( dz - 2./r2 * dz * outerProduct(z, z) );
		z*=temp; 
	}
}

uniform float foldingLimit; slider[0.0,1.0,5.0]
void boxFold(inout vec3 z, inout mat3 dz) {
	vec3 a = (1.0-2.0*step(vec3(foldingLimit),abs(z)));
	//vec3 b = vec3( dz[0][0], dz[1][1], dz[2][2] );
	dz[0]*=a.x;	dz[1]*=a.y; dz[2]*=a.z;
	//dz[0][0]=-b.x;	dz[1][1]=-b.y; dz[2][2]=-b.z;
	z = clamp(z, -foldingLimit, foldingLimit) * 2.0 - z;
}

uniform int Iterations; slider[0,10,50]
uniform int ColorIterations; slider[0,2,22]
uniform float F; slider[0.1,1.1,2.3]
vec3 normalvec = vec3(0);
float DE(vec3 z)
{
	mat3 dz = mat3(1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0);
	
	vec3 c = z*Offset;
	mat3 dc =mat3( dz[0]*Offset.x,  dz[1]*Offset.y,  dz[2]*Offset.z );
	for (int n = 0; n < Iterations; n++) {
		boxFold(z,dz);
		sphereFold(z,dz);
		z*=(Scale*Scale2);
		dz=Scale * mat3(dz[0]*Scale2.x,dz[1]*Scale2.y,dz[2]*Scale2.z);
		z += c;
		dz += dc;
		z*= rot;
		dz*=rot;//dz[0]*=rot; dz[1]*=rot; dz[2]*=rot;
		if (length(z)>1000.0) break;
		if (n<ColorIterations) orbitTrap = min(orbitTrap, (vec4(abs(z),dot(z,z))));
	}
	//float r = sqrt(dot(z,z));//*0.5/r;
	//vec3 grad = vec3(dot(z,dz[0]),dot(z,dz[1]),dot(z,dz[2]));
	
	vec3 z1 = normalize(z);
	normalvec = normalize(dz*z);
#if 1 
	float dr = max( length(dz[0]), max( length(dz[1]), length(dz[2]) ) );
#else 
	float dr = length(dz*z1);
	//float dr = length(Dir*dz);
#endif 
	return ( length(z) - 10.5 ) / dr;
	//return (length(z)-3.5)/length(z1*dz);
}

#ifdef providesNormal 
uniform bool FD; checkbox[true]
vec3 normal_fd(vec3 pos, float normalDistance) {
	normalDistance = max(normalDistance*0.5, 1.0e-7);
	vec3 e = vec3(0.0,normalDistance,0.0);
	vec3 n = vec3(DE(pos+e.yxx)-DE(pos-e.yxx),
		DE(pos+e.xyx)-DE(pos-e.xyx),
		DE(pos+e.xxy)-DE(pos-e.xxy));
	n =  normalize(n);
	return n;
}
vec3 normal(vec3 z, float s){
	return FD ? normal_fd(z,s) : normalvec;
}
#endif 

#ifdef providesColor 
vec3 baseColor(vec3 z, vec3 n){
	return (n);
}
#endif 

#preset Default
FOV = 0.28038
Eye = 8.35696,6.00673,7.80129
Target = 0,0,0
Up = -0.209787,-0.0845856,0.974081
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
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
Detail = -3
RefineSteps = 1
FudgeFactor = 0.37752
MaxRaySteps = 263
MaxDistance = 83.74
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.11146
coneApertureAO = 1
maxIterAO = 10
AO_ambient = 0.9148
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0
SpecularExp = 401.85
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.576471,0.576471,0.576471
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,0.952941,0.831373,3
LightPos = -2.3024,2.0962,7.9382
LightSize = 0.07023
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.28364
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
HF_Fallof = 2.41621
HF_Const = 0.013
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,0
HF_Scatter = 6.481
HF_Anisotropy = 0.121569,0.345098,0.388235,0
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
Scale = -2
Offset = 1,1,1
Scale2 = 1,1,1
RotVector = 1,1,1
RotAngle = 0
fixedRadius2 = 1
minRadius2 = 0.25
foldingLimit = 1
Iterations = 17
ColorIterations = 2
F = 1.1
FD = true
#endpreset
