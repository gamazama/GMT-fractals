//#version 330 
#info Mandelbox Distance Estimator (Rrrola's version with size correction by knighty).
//#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#define providesInit
//#define providesColor
//#define COMP09
#include "renderer\DE-kn2.frag"

#group Mandelbox

/*
The distance estimator below was originalled devised by Buddhi.
This optimized version was created by Rrrola (Jan Kadlec), http://rrrola.wz.cz/

See this thread for more info: http://www.fractalforums.com/3d-fractal-generation/a-mandelbox-distance-estimate-formula/15/
*/

// Number of fractal iterations.
uniform int Iterations;  slider[0,17,300]
uniform int ColorIterations;  slider[0,3,300]

uniform float MinRad2;  slider[0,0.25,2.0]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale;  slider[-3.0,3.0,5.0]
vec4 scale = vec4(Scale, Scale, Scale, abs(Scale)) / MinRad2;

// precomputed constants

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

// Scale parameter. A perfect Menger is 3.0
uniform float RotAngle; slider[0.00,0,180]

// Problems with MathUtils.frag
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

mat3 rot;

void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

float tscl = (Scale<-1.) ? 2.*abs((Scale-1.)/(Scale+1.)) : 2.;

// Compute the distance from `pos` to the Mandelbox.

float DE0(vec3 p){
	vec4 zc=vec4(tscl*p,1.);
	vec4 z= zc;
	float r2=dot(z.xyz,z.xyz);
	for(int i=0; i < Iterations && r2 < 1000. * tscl; i++){
		z.xyz *= rot;
		z.xyz -= 2. * max( vec3(-1.), min( vec3(1.), z.xyz ) );//box fold
		r2=dot(z.xyz,z.xyz);
		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.xyz,r2)));
		float k=Scale*max(1.,1./max(MinRad2,r2));
		z=z*k+zc;
		r2=dot(z.xyz,z.xyz);
	}
#if 1
	z=abs(z);
	return (max(max(z.x,z.y),z.z)-tscl)/(tscl*z.w);
#else
	return (sqrt(r2)-tscl*sqrt(3.))/abs(tscl*z.w);
#endif
}

uniform float Time;  slider[0,0,20]

float DE1(vec3 pos)
{
    float clock = sin(Time * 0.01);
    float p0 = clock * 0.2 + 0.4;
    vec4 z = vec4(mod(pos, 2.0), 0.5);
    for (int n = 0; n < Iterations; n++) {
        z.xyz = clamp(z.xyz, -p0, p0) * 2.0 - z.xyz;
        z *= 3. * max(dot(z.xyz, z.xyz), 0.0);
    }
    return (length(max(abs(z.xyz) - vec3(0.0, 20.0, 0.0), 0.0))) * z.w;
}

float DE(vec3 p){
	return DE0(p);
}
#preset default 
FOV = 0.5
Eye = -1.78524,-2.75991,2.00403
Target = 0.102683,0.0438591,-0.148218
Up = 0.00225453,0.00327281,0.999992
FocalPlane = 3.37083
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.9
MaxRaySteps = 1027
MaxDistance = 276.6
Dither = 0.86598
NormalBackStep = 2
DetailAO = -2.71432
coneApertureAO = 0.91935
maxIterAO = 5
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = -3.9784,-2.4732,10
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.588235,0.588235,0.588235
OrbitStrength = 0.48052
X = 0.5,0.6,0.6,0.70874
Y = 1,0.6,0,1
Z = 0.8,0.78,1,1
R = 0.4,0.7,1,0.4902
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = true
Cycles = 4.96027
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667,0
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
Iterations = 17
ColorIterations = 10
MinRad2 = 0.25
Scale = 1.4912
RotVector = 1,1,1
RotAngle = 0
#endpreset

