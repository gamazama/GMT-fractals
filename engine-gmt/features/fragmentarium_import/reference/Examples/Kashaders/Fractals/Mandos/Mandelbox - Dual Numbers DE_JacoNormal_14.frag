//#version 120
#info Mandelbox Distance Estimator and normals based on the Jacobian.
#info It doesn't work very well. There is that overstepping bubble hovering above eache face.
#include "MathUtils.frag"
#define providesInit
#define providesNormal
#define providesColor
#include "De-Raytracer.frag"

#group Mandelbox
// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[-5.00,2.0,4.00]

// Scaling center
uniform vec3 Offset; slider[(0,0,0),(1,1,1),(5,5,5)]
uniform vec3 Scale2; slider[(0,0,0),(1,1,1),(25,25,25)]

mat3 rot;
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
uniform float RotAngle; slider[0.00,0,180]
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
FOV = 0.4
Eye = -7.94555,-0.325549,-0.731516
Target = 1.93405,0.280285,0.692088
Up = 0.0469062,-0.9845,0.168995
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 3
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -4
DetailAO = -1.57381
FudgeFactor = 0.84211
MaxRaySteps = 214
Dither = 0
NormalBackStep = 1 NotLocked
AO = 0,0,0,1
Specular = 0.00398
SpecularExp = 91.071
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = -0.81494,0.67972
CamLight = 1,1,1,0.26766
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0.71631 NotLocked
ShadowSoft = 12.6882
Reflection = 0 NotLocked
DebugSun = false
BaseColor = 0.737255,0.737255,0.737255
OrbitStrength = 0.2852
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = true
Cycles = 1.33068
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Scale = -2
Offset = 1,1,1
Scale2 = 1,1,1
RotVector = 0,0,1
RotAngle = 0
fixedRadius2 = 1
minRadius2 = 0.00743
foldingLimit = 1
Iterations = 15
ColorIterations = 3
F = 1.1
FD = false
#endpreset

#preset Shaded 
Scale = -2
Offset = 1,1,1
Scale2 = 1,1,1
fixedRadius2 = 1
minRadius2 = 0.25
RotVector = 1,1,1
RotAngle = 0
foldingLimit = 1
Iterations = 15
ColorIterations = 2
F = 1.1
FOV = 0.4
Eye = 5.43037,-3.68899,-3.71911
Target = -1.74773,1.30711,1.13001
Up = -0.406022,-0.866164,0.291388
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -0.6405
FudgeFactor = 1
MaxRaySteps = 268
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.0129
SpecularExp = 91.071
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = -0.70934,0.63322
CamLight = 1,1,1,0.79422
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0.77931
ShadowSoft = 2
Reflection = 0
DebugSun = false
BaseColor = 0.631373,0.631373,0.631373
OrbitStrength = 0.20351
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = true
Cycles = 1.33068
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
#endpreset

#preset ForTesting 
Scale = -2
Offset = 1,1,1
Scale2 = 1,1,1
fixedRadius2 = 1
minRadius2 = 0.25
RotVector = 1,1,1
RotAngle = 0
foldingLimit = 1
Iterations = 15
ColorIterations = 2
F = 1.1
FOV = 0.4
Eye = -4.28171,-8.1171,-3.83175
Target = 0.0148727,0.00468938,0.114875
Up = 0.440057,0.19332,-0.876914
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -0.6405
FudgeFactor = 1
MaxRaySteps = 214
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0
Specular = 0.0129
SpecularExp = 91.071
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = -0.70934,0.63322
CamLight = 1,1,1,0.79422
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = true
Cycles = 1.33068
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
#endpreset

#preset Noname0 
Gamma = 2
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.4
Eye = -4.28171,-8.1171,-3.83175
Target = 0.0148727,0.00468938,0.114875
Up = 0.47158,0.0929187,-0.876914
EquiRectangular = false
FocalPlane = 1
Aperture = 0
ToneMapping = 4
Exposure = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -0.6405
FudgeFactor = 1
MaxRaySteps = 214
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0
Specular = 0.0129
SpecularExp = 91.071
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = -0.70934,0.63322
CamLight = 1,1,1,0.79422
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.48399
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = true
Cycles = 1.33068
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Scale = -2
Offset = 1,1,1
Scale2 = 1,1,1
RotVector = 1,1,1
RotAngle = 0
fixedRadius2 = 1
minRadius2 = 0.25
foldingLimit = 1
Iterations = 1
ColorIterations = 2
F = 1.1
#endpreset
