#info Mandelbulb Distance Estimator
#define providesInit
#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW 
#define MULTI_SAMPLE_AO
#include "renderer\DE-kn2.frag"
//#include "DE-Raytracer.frag"
//#include "MathUtils.frag"
#group Mandelbulb


// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]

// Number of color iterations.
uniform int ColorIterations;  slider[0,9,100]

// Mandelbulb exponent (8 is standard)
uniform float Power; slider[0,8,16]

// Bailout radius
uniform float Bailout; slider[0,5,30]

// Alternate is slightly different, but looks more like a Mandelbrot for Power=2
uniform bool AlternateVersion; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

uniform float RotAngle; slider[0.00,0,180]

mat3 rot;
uniform float time;

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
	 rot = rotationMatrix3(normalize(RotVector), RotAngle+time*10.0);
}

// This is my power function, based on the standard spherical coordinates as defined here:
// http://en.wikipedia.org/wiki/Spherical_coordinate_system
//
// It seems to be similar to the one Quilez uses:
// http://www.iquilezles.org/www/articles/mandelbulb/mandelbulb.htm
//
// Notice the north and south poles are different here.
void powN1(inout vec3 z, float r, inout float dr) {
	// extract polar coordinates
	float theta = acos(z.z/r);
	float phi = atan(z.y,z.x);
	dr =  pow( r, Power-1.0)*Power*dr + 1.0;
	
	// scale and rotate the point
	float zr = pow( r,Power);
	theta = theta*Power;
	phi = phi*Power;
	
	// convert back to cartesian coordinates
	z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
}

// This is a power function taken from the implementation by Enforcer:
// http://www.fractalforums.com/mandelbulb-implementation/realtime-renderingoptimisations/
//
// I cannot follow its derivation from spherical coordinates,
// but it does give a nice mandelbrot like object for Power=2
void powN2(inout vec3 z, float zr0, inout float dr) {
	float zo0 = asin( z.z/zr0 );
	float zi0 = atan( z.y,z.x );
	float zr = pow( zr0, Power-1.0 );
	float zo = zo0 * Power;
	float zi = zi0 * Power;
	dr = zr*dr*Power + 1.0;
	zr *= zr0;
	z  = zr*vec3( cos(zo)*cos(zi), cos(zo)*sin(zi), sin(zo) );
}



uniform bool Julia; checkbox[false]
uniform vec3 JuliaC; slider[(-2,-2,-2),(0,0,0),(2,2,2)]

// Compute the distance from `pos` to the Mandelbox.
float DE(vec3 pos) {
	vec3 z=pos;
	float r;
	float dr=1.0;
	int i=0;
	r=length(z);
	while(r<Bailout && (i<Iterations)) {
		if (AlternateVersion) {
			powN2(z,r,dr);
		} else {
			powN1(z,r,dr);
		}
		z+=(Julia ? JuliaC : pos);
		r=length(z);
		z*=rot;
		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*r)));
		i++;
	}
//	if ((type==1) && r<Bailout) return 0.0;
	return 0.5*log(r)*r/dr;
	/*
	Use this code for some nice intersections (Power=2)
	float a =  max(0.5*log(r)*r/dr, abs(pos.y));
	float b = 1000;
	if (pos.y>0)  b = 0.5*log(r)*r/dr;
	return min(min(a, b),
		max(0.5*log(r)*r/dr, abs(pos.z)));
	*/
}

#preset Default
FOV = 0.42276
Eye = -1.47862,1.55381,2.09556
Target = 0.466245,-0.450386,-0.638673
Up = 0.238293,0.0754634,0.968257
FocalPlane = 2.91642
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74236
MaxRaySteps = 524
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -3.06341
coneApertureAO = 0.70938
maxIterAO = 6
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -2.043,3.3334,10
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.52655
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 1.19565
CycleColors = true
Cycles = 18.7773
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 1.0105
HF_Const = 0.01042
HF_Intensity = 0.19753
HF_Dir = 0,0,1
HF_Offset = -0.3614
HF_Color = 0.478431,0.580392,0.737255,0.47826
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843,0
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
Iterations = 15
ColorIterations = 9
Power = 8
Bailout = 5
AlternateVersion = false
RotVector = 1,1,1
RotAngle = 0
Julia = false
JuliaC = 0,0,0
#endpreset

#preset TheMyst 
FOV = 0.42276
Eye = 2.87572,0.692995,0.832889
Target = -5.55021,-1.2607,-1.58106
Up = -0.0597184,-0.0128025,0.998133
FocalPlane = 2.71196
Aperture = 0.00874
InFocusAWidth = 0.16981
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5.5
RefineSteps = 4
FudgeFactor = 0.5
MaxRaySteps = 2000
MaxDistance = 100
Dither = 0.5
NormalBackStep = 1
DetailAO = -3.3446
coneApertureAO = 0.70938
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,0.980392,0.870588,6
LightPos = -1.0684,5.8758,7.1176
LightSize = 0.07563
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.862745,0.862745,0.862745
OrbitStrength = 0.49655
X = 0.588235,0.172549,0.172549,0.80334
Y = 0.117647,0.615686,0.12549,0.39696
Z = 1,0.890196,0.270588,0.43168
R = 0.854902,0.854902,0.854902,0.0826
BackgroundColor = 0,0,0
GradientBackground = 1.19565
CycleColors = false
Cycles = 4.88846
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 4.33267
HF_Const = 0.002
HF_Intensity = 0.42763
HF_Dir = 0,0,1
HF_Offset = -0.6122
HF_Color = 0.321569,0.537255,0.737255,0.62163
HF_Scatter = 100
HF_Anisotropy = 0.403922,0.305882,0.137255,-0.83838
HF_FogIter = 16
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
Iterations = 9
ColorIterations = 9
Power = 8
Bailout = 5
AlternateVersion = false
RotVector = 1,1,1
RotAngle = 0
Julia = false
JuliaC = 0,0,0
#endpreset

#preset P5
FOV = 0.42276
Eye = -2.31894,0.457376,2.00376
Target = 0.603887,-0.13398,-0.522642
Up = 0.127595,0.231615,0.964403
FocalPlane = 2.91642
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.78788
MaxRaySteps = 524
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -3.37386
coneApertureAO = 0.70938
maxIterAO = 5
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.60268
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.117647,0.117647,0.0941176
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = 1.754,4.1686,8.77
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.65098,0.65098,0.65098
OrbitStrength = 0.49409
X = 0.866667,0.0666667,0.0666667,0.71046
Y = 1,0.933333,0,0.30512
Z = 0.027451,0.921569,0.282353,0.82182
R = 0.0509804,0.258824,0.937255,0.24108
BackgroundColor = 0,0,0
GradientBackground = 1.19565
CycleColors = true
Cycles = 10.1448
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 1.5172
HF_Const = 0.01042
HF_Intensity = 0.19753
HF_Dir = 0,0,1
HF_Offset = -0.3614
HF_Color = 0.478431,0.580392,0.737255,0
HF_Scatter = 5.437
HF_Anisotropy = 0.176471,0.431373,0.568627,-1
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
Iterations = 15
ColorIterations = 15
Power = 5
Bailout = 5
AlternateVersion = false
RotVector = 1,1,1
RotAngle = 0
Julia = false
JuliaC = 0,0,0
#endpreset
