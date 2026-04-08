// Output generated from file: Fragmentarium/TriplexMagnetbulb.frag
// see http://bugman123.com/Hypercomplex/ for triplex  math
// Created: Sun Oct 18 17:38:23 2020
// changed c-1 and c-2 to c-m1 and c-m2
// changed "/" to "*"
// Magnet Type I	 zn+1 = [(zn^2 + c-m1) / (2zn + c-m2)]^2
// Magnet Type II	 zn+1 = [(zn^3 + 3(c-m1)zn + (c-m1)(c-m2)) / (3zn^2 + 3(c-m2)zn + (c-m1)(c-m2) + 1)]^2

#info Triplexbulb Distance Estimator
#define providesInit
//#define USE_IQ_CLOUDS
#define WANG_HASH
//#define KN_VOLUMETRIC
//#define USE_EIFFIE_SHADOW
//#define MULTI_SAMPLE_AO
//#define USE_TERRAIN
uniform float time;
#include "MathUtils.frag"
#include "DE-Raytracer.frag"
//#include "DE-Kn2cr11.frag"
#group MagnetoBulb

// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]

// Number of color iterations.
uniform int ColorIterations;  slider[0,9,100]

// Mandelbulb exponent (8 is standard)
uniform float Power; slider[0,8,16]

// Bailout radius
uniform float Bailout; slider[0,5,30]

// mermelada's tweak Derivative bias
uniform float DerivativeBias; slider[0,1,2]

// Magnet I alt Magnet II
uniform bool AlternateVersion; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

uniform float RotAngle; slider[-180,0,180]

uniform bool Julia; checkbox[false]
uniform vec3 JuliaC; slider[(-8,-8,-8),(0,0,0),(8,8,8)]

uniform bool AbsX; checkbox[false]
uniform bool AbsY; checkbox[false]
uniform bool AbsZ; checkbox[false]


mat3 rot;
void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

vec3 triPow(float power, vec3 a) {
    // Power function for s = x + iy + jz expressed in spherical coordinates
    float r = sqrt( a.x*a.x + a.y*a.y + a.z*a.z )+1e-10;
    float phi = atan(a.y,a.x);  // azimuth
    float theta = 0.0;

    theta = asin(a.z/r);

    r = pow(r,power);
    phi = power*phi;
    theta = power*theta;

    return vec3(r*cos(theta)*cos(phi),
                r*cos(theta)*sin(phi),
                r*sin(theta));
}

// non-trig version

vec3 triMul(vec3 lc, vec3 z1)
{
float r1 = sqrt(z1.x * z1.x + z1.y * z1.y);
float r2 = sqrt(lc.x * lc.x + lc.y * lc.y);
float temp = z1.x;
float a = 1.0 - z1.z * lc.z / (r1 * r2);
z1.x = a * (z1.x * lc.x - z1.y * lc.y);
z1.y = a * (lc.x * z1.y + temp * lc.y);
z1.z = r2 * z1.z + r1 * lc.z;

return z1;
}

vec3 triDiv(vec3 a, vec3 b) {
	return triMul(a, triPow(-1.0, b) );
}

uniform vec3 m1; slider[(-8,-8,-8),(1,0,0),(8,8,8)]
uniform vec3 m2; slider[(-8,-8,-8),(2,0,0),(8,8,8)]

vec3 Magnetobulb1(vec3 z, vec3 c)
{
	vec3 a = triMul(z,z) + c-m1;
	vec3 b = triMul(vec3(2.,0.,0.), z) + c-m2;
	z = triMul( a, b );
	z = triPow(Power,z);

	return z;
}

vec3 Magnetobulb2(vec3 z, vec3 c)
{
	z = triPow(	Power,(
						triMul(
							triPow(3.,z) + triMul(triMul(vec3(3.,0.,0.),(c-m1)),z) + triMul((c-m1),(c-m2)) ,
								triPow(2.,triMul(vec3(3.,0.,0.),z)) + triMul(triMul(vec3(3.,0.,0.),(c-m2)),z) + triMul((c-m1),(c-m2)) + vec3(1.,0.,0.)
			)
		)
	);

	return z;
}

// Compute the distance from `pos` to the Triplex MagnetoBulb.
float DE(vec3 pos) {

	vec3 z = Julia ?  pos : vec3(1e-14);

	float dr=1.0;
	int i=0;
	float r=dot(z,z);
   
	while(r<Bailout && (i<Iterations)) {

		if(AbsX) z.x=abs(z.x);
		if(AbsY) z.y=abs(z.y);
		if(AbsZ) z.z=abs(z.z);


		if(AlternateVersion) {
			z = Magnetobulb2(z, Julia ? JuliaC : pos);
		} else {
			z = Magnetobulb1(z, Julia ? JuliaC : pos);
		}
		
		//z+=(Julia ? JuliaC : pos);

		r=length(z);

		// mermelada's tweak
		// http://www.fractalforums.com/new-theories-and-research/error-estimation-of-distance-estimators/msg102670/?topicseen#msg102670
		dr = max(dr*DerivativeBias,pow( r, Power-1.0 )*dr*Power + 1.0);

		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*dr)));

		z*=rot;
		i++;
	}
	return 0.5*log(r)*r/dr;

}

#preset Default
Gamma = 2.08335
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.62536
Eye = -0.002886673,-0.000787868,-1.64444992
Target = 0.030236385,0.009656393,-0.615029179
Up = 0.005218898,-0.999913855,0.009976966
EquiRectangular = false
ToneMapping = 3
Exposure = 1
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -3.5
FudgeFactor = 0.16011645
MaxRaySteps = 5000
Dither = 1
NormalBackStep = 1
BaseColor = 1,1,1
OrbitStrength = 0.61257791
X = 1,1,1,0.70266482
Y = 0.345098,0.666667,0,0.71669006
Z = 1,0.666667,0,0.59269664
R = 0.0784314,1,0.941176,-0.20897614
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = false
Cycles = 10.1
EnableFloor = true
FloorNormal = 0,1,0
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 8
ColorIterations = 8
Power = 2
Bailout = 4
DerivativeBias = 2
AlternateVersion = false
RotVector = 0,0,1
RotAngle = 0
Julia = false
JuliaC = 0,0,0
AbsX = false
AbsY = false
AbsZ = false
m1 = 0,0,0
m2 = 0,0,0
AutoFocus = false
FocalPlane = 1
Aperture = 0
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
DetailAO = -3.51977395
MaxDistance = 100
AO = 0,0,0,0.78645067
Specular = 1
SpecularExp = 16.364
SpecularMax = 4.678363
SpotLight = 1,1,1,1
SpotLightDir = 0.67685592,-0.62154294
CamLight = 1,1,1,1.53846
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 0.35385
ShadowSoft = 12.5806
QualityShadows = true
Reflection = 0
DebugSun = false
FloorHeight = 1.0260116
#endpreset

#preset Curiosity-02
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.18503402
Eye = -1.21776289,0.612985294,-0.178259746
Target = -0.296541068,0.19844299,0.010486504
Up = 0.097780776,-0.032358215,-0.548310938
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
ToneMapping = 3
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4
DetailAO = -3.47033897
FudgeFactor = 0.018
MaxDistance = 1000
MaxRaySteps = 3000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.699999988
Specular = 0.68406207
SpecularExp = 1.451379
SpecularMax = 7.748538
SpotLight = 1,1,1,6
SpotLightDir = -0.91557496,0.40029114
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.29579376
HardShadow = 1
ShadowSoft = 0.7246376
QualityShadows = true
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.81764707
X = 0.0431372549,0.0901960784,1,1
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0695652
BackgroundColor = 0.0941176471,0.133333333,0.152941176
GradientBackground = 1.36150235
CycleColors = false
Cycles = 5.36260378
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = 1.589596
FloorColor = 0,0,0
Iterations = 8
ColorIterations = 8
Power = 2
Bailout = 4
DerivativeBias = 1
AlternateVersion = true
RotVector = 0,0,1
RotAngle = -90
Julia = true
JuliaC = -0.64336256,0,-0.21978016
AbsX = false
AbsY = false
AbsZ = false
m1 = 0,0,0
m2 = -0.5,0,0
#endpreset

#preset Curiosity-07
Gamma = 2.08335
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.13877552
Eye = -3.92760435,2.01131906,3.01740047
Target = -3.18394933,1.64034042,2.45787679
Up = 0.268103537,-0.162706272,0.464211082
EquiRectangular = false
ToneMapping = 3
Exposure = 1
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4.5
FudgeFactor = 0.01601164
MaxRaySteps = 10000
Dither = 1
NormalBackStep = 1
BaseColor = 1,1,1
OrbitStrength = 0.79705883
X = 1,1,1,1
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.06666666
BackgroundColor = 0.333333333,0.376470588,0.419607843
GradientBackground = 3.20813775
CycleColors = false
Cycles = 5.36260378
EnableFloor = false
FloorNormal = 0,1,0
FloorColor = 1,1,1
Iterations = 8
ColorIterations = 8
Power = 2
Bailout = 8
DerivativeBias = 2
AlternateVersion = false
RotVector = 0,0,1
RotAngle = -87.32673
Julia = true
JuliaC = 2,0,0
AbsX = false
AbsY = false
AbsZ = false
m1 = 1,0,0
m2 = 2,0,0
AutoFocus = false
FocalPlane = 1
Aperture = 0
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
DetailAO = -2
MaxDistance = 10
AO = 0,0,0,0.8880707
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = -0.05094614,-0.98253276
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 1
ShadowSoft = 20
QualityShadows = true
Reflection = 0
DebugSun = false
FloorHeight = 1.199422
#endpreset

#preset Curiosity-08
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.18503402
Eye = 3.83253099,-2.29945452,-1.19339675
Target = 3.0035502,-1.80876909,-0.914484699
Up = -0.152104076,0.048008687,-0.536543752
EquiRectangular = false
ToneMapping = 3
Exposure = 1
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4.5
FudgeFactor = 0.01746725
MaxRaySteps = 3000
Dither = 1
NormalBackStep = 1
BaseColor = 1,1,1
OrbitStrength = 0.81617648
X = 1,1,1,0.7478261
Y = 0.345098,0.666667,0,0.74492756
Z = 1,0.666667,0,0.7474601
R = 0.0784314,1,0.941176,-0.06666666
BackgroundColor = 0.294117647,0.419607843,0.270588235
GradientBackground = 0
CycleColors = false
Cycles = 5.36260378
EnableFloor = true
FloorNormal = 0,0,1
FloorColor = 0.0235294118,0.0274509804,0.031372549
Iterations = 8
ColorIterations = 8
Power = 2
Bailout = 2.5869264
DerivativeBias = 1
AlternateVersion = false
RotVector = 0,0,1
RotAngle = -90
Julia = true
JuliaC = -0.5054944,1.6e-7,-0.43956032
AbsX = false
AbsY = false
AbsZ = false
m1 = -0.83130896,-0.01079616,-0.05398096
m2 = -0.5074224,0.2267208,-0.01079616
AutoFocus = false
FocalPlane = 1
Aperture = 0
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
DetailAO = -3.47033897
MaxDistance = 1000
AO = 0,0,0,0.699999988
Specular = 0.68406207
SpecularExp = 1.451379
SpecularMax = 7.748538
SpotLight = 1,1,1,5
SpotLightDir = 0.75254732,0.44978168
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0.22252374
HardShadow = 1
ShadowSoft = 0.7246376
QualityShadows = false
Reflection = 0
DebugSun = false
FloorHeight = 0.681053
#endpreset

#preset Curiosity-09
Gamma = 2.08335
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.26666666
Eye = -0.002712547,-0.003621577,-2.70692056
Target = 0.059215305,0.001563748,-1.70811283
Up = -0.009561642,-0.561012085,0.003505341
EquiRectangular = false
ToneMapping = 3
Exposure = 1
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4
FudgeFactor = 0.016
MaxRaySteps = 3000
Dither = 1
NormalBackStep = 1
BaseColor = 1,1,1
OrbitStrength = 0.81617648
X = 1,1,1,0.7478261
Y = 0.345098,0.666667,0,0.74492756
Z = 1,0.666667,0,0.7474601
R = 0.0784314,1,0.941176,-0.06666666
BackgroundColor = 0.294117647,0.419607843,0.270588235
GradientBackground = 1.68231615
CycleColors = false
Cycles = 5.36260378
EnableFloor = false
FloorNormal = 0,1,0
FloorColor = 1,1,1
Iterations = 8
ColorIterations = 8
Power = 2
Bailout = 4
DerivativeBias = 1
AlternateVersion = false
RotVector = 1,0,0
RotAngle = 0
Julia = true
JuliaC = 0.5,0,0
AbsX = false
AbsY = false
AbsZ = false
m1 = 1,0,0
m2 = 2,0,0
AutoFocus = false
FocalPlane = 1
Aperture = 0
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
DetailAO = -2
MaxDistance = 10
AO = 0,0,0,0.699999988
Specular = 1
SpecularExp = 16.364
SpecularMax = 7.748538
SpotLight = 1,1,1,1
SpotLightDir = -0.53129548,0.29839884
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0.22252374
HardShadow = 0.35385
ShadowSoft = 12.5806
QualityShadows = false
Reflection = 0
DebugSun = false
FloorHeight = 1.199422
#endpreset

#preset Curiosity-10
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.07619048
Eye = -0.695579042,-2.3982308,-0.372747071
Target = -0.766980994,-1.37580475,-0.357855738
Up = 0.007674293,0.008581127,-0.552375569
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
ToneMapping = 5
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -5
DetailAO = -1.73022591
FudgeFactor = 0.03347889
MaxDistance = 32
MaxRaySteps = 3000
Dither = 1
NormalBackStep = 5
AO = 0,0,0,0.77466864
Specular = 0.68406207
SpecularExp = 1.451379
SpecularMax = 7.748538
SpotLight = 1,1,1,5
SpotLightDir = -0.54585152,0.72343524
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.29579376
HardShadow = 1
ShadowSoft = 0.3188406
QualityShadows = true
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.80294118
X = 0.0431372549,0.0901960784,1,1
Y = 0.345098,0.666667,0,0.7304348
Z = 1,0.666667,0,0.5355588
R = 0.0784314,1,0.941176,-0.03188404
BackgroundColor = 0.0941176471,0.133333333,0.152941176
GradientBackground = 1.36150235
CycleColors = false
Cycles = 14.6390583
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = 1.300579
FloorColor = 0.0823529412,0.0745098039,0.0588235294
Iterations = 8
ColorIterations = 8
Power = 2
Bailout = 7.0097358
DerivativeBias = 2
AlternateVersion = false
RotVector = 0,0,1
RotAngle = -90
Julia = true
JuliaC = -0.5054944,0.35164848,-0.02197792
AbsX = false
AbsY = false
AbsZ = false
m1 = 0.2419056,0.40146032,-0.52901472
m2 = -0.50901472,0.37786784,0.24031312
#endpreset

#preset Curiosity-11
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.18503402
Eye = 0.010610215,-1.35935044,-0.317880566
Target = -0.004701557,-0.426380834,0.053571
Up = -0.004078373,0.191121702,-0.480205773
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
ToneMapping = 5
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -5
DetailAO = -4.30084746
FudgeFactor = 0.002
MaxDistance = 32
MaxRaySteps = 10000
Dither = 1
NormalBackStep = 0
AO = 0,0,0,0.78792342
Specular = 0.68406207
SpecularExp = 1.451379
SpecularMax = 7.748538
SpotLight = 1,1,1,5
SpotLightDir = -0.83114992,0.62445416
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 1
ShadowSoft = 0.2608696
QualityShadows = true
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.80294118
X = 0.0431372549,0.0901960784,1,1
Y = 0.345098,0.666667,0,0.7304348
Z = 1,0.666667,0,0.5355588
R = 0.0784314,1,0.941176,-0.03188404
BackgroundColor = 0.0941176471,0.133333333,0.152941176
GradientBackground = 1.36150235
CycleColors = false
Cycles = 14.6390583
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 1.300579
FloorColor = 0,0,0
Iterations = 8
ColorIterations = 8
Power = 2
Bailout = 8
DerivativeBias = 1.5
AlternateVersion = false
RotVector = 0,0,1
RotAngle = -90
Julia = true
JuliaC = 0.48351664,-0.043956,-0.02197792
AbsX = true
AbsY = true
AbsZ = false
m1 = 0.16194336,-0.07557344,-0.03238864
m2 = 2.4507424,-0.37786768,0.0323888
#endpreset

#preset Curiosity-12
Gamma = 2.2
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.22312926
Eye = 2.86188222,-3.16101984,0.048960342
Target = 2.21092652,-2.39064544,0.066271404
Up = -0.016921348,-0.002154649,-0.540415224
EquiRectangular = false
ToneMapping = 5
Exposure = 1
GaussianWeight = 10
AntiAliasScale = 1.9293078
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -5
FudgeFactor = 0.01164483
MaxRaySteps = 10000
Dither = 1
NormalBackStep = 5
BaseColor = 1,1,1
OrbitStrength = 0.85
X = 0.0431372549,0.0901960784,1,1
Y = 0.345098,0.666667,0,0.7304348
Z = 1,0.666667,0,0.5355588
R = 0.0784314,1,0.941176,-0.03188404
BackgroundColor = 0.0941176471,0.133333333,0.152941176
GradientBackground = 1.36150235
CycleColors = false
Cycles = 14.6390583
EnableFloor = true
FloorNormal = 0,0,1
FloorColor = 0,0,0
Iterations = 8
ColorIterations = 8
Power = 2
Bailout = 2
DerivativeBias = 1
AlternateVersion = false
RotVector = 0,0,1
RotAngle = -90
Julia = true
JuliaC = 0.41758256,-0.043956,-0.10989008
AbsX = true
AbsY = true
AbsZ = false
m1 = 0.18353584,-0.05398096,-0.07557344
m2 = 2.4939272,0.11875856,0.78812432
AutoFocus = false
FocalPlane = 1
Aperture = 0
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
DetailAO = -1.08757054
MaxDistance = 100
AO = 0,0,0,0.78645067
Specular = 0.09026798
SpecularExp = 70.972425
SpecularMax = 4.678363
SpotLight = 1,1,1,4
SpotLightDir = 0.67685592,-0.62154294
CamLight = 1,1,1,2
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 1
ShadowSoft = 0.2608696
QualityShadows = true
Reflection = 0
DebugSun = false
FloorHeight = 1.15607
#endpreset

