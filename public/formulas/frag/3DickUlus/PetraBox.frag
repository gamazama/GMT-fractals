#info Box Distance Estimator
#info Modified for Fragmentarium by 3Dickulus from iRyanBell's Box DE
#info https://fractalforums.org/share-a-fractal/22/de-mandelbox-variant-julia-previous-iteration-interpolation/3937

#define providesInit

#include "MathUtils.frag"
#include "DE-Raytracer.frag"
#group Box

// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]

// Number of color iterations.
uniform int ColorIterations;  slider[0,9,100]

// Mandelbulb exponent (8 is standard)
uniform float Power; slider[0,8,16]

// mermelada's tweak Derivative bias
uniform float DerivativeBias; slider[0,1,2]

// Alternate is slightly different, but looks more like a Mandelbrot for Power=2
uniform bool AlternateVersion; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

uniform float RotAngle; slider[0.00,0,180]

uniform bool Julia; checkbox[false]
uniform vec3 JuliaC; slider[(-2,-2,-2),(0,0,0),(2,2,2)]
    // Params
uniform bool Petra; checkbox[false]
uniform float scale; slider[-4,2,4]
uniform float boxFold; slider[-4,1,4]
uniform float sphereFold; slider[-4,0.25,4]

mat3 rot;
void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

float DE(vec3 pos) {

   vec4 z = vec4(pos, 1.);
	int i=0;
	float r=0.;
	vec4 c = z;
	vec4 zPrev = Julia ? vec4(JuliaC,1.) : vec4(0,0,0,1); // Initial Julia value

	while(i<Iterations) {
		vec4 zTmp = z;
		z.xyz = clamp(z.xyz, -boxFold, boxFold) * 2.0 - z.xyz;
		z *= scale / clamp(dot(z.xyz, z.xyz), sphereFold, 1.);
		z += Julia ? (zPrev + c) * 0.5 : zPrev;
		zPrev = zTmp;
		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(z));
		z.xyz *= rot;
		i++;
		// r = length(z.xyz);
		// r = abs(length(z.xyz) - length(zPrev.xyz));
		r += (abs(length(z.xyz) - length(zPrev.xyz)))/float(i);
	
	}


	return abs(r/z.w);
}

#preset Default
FOV = 0.64917128
Eye = 0.015714118,-0.126436421,-4.11943933
Target = 0.020166272,-0.082189004,-3.11932804
Up = -0.028368786,-0.997007274,0.06225562
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -6
DetailAO = -1.03443326
FudgeFactor = 0.13364055
MaxDistance = 1000
MaxRaySteps = 5000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 2.507375
SpecularMax = 7
SpotLight = 1,1,1,1
SpotLightDir = -0.85253456,0.33640554
CamLight = 1,1,1,1
CamLightMin = 0.06835067
Glow = 1,1,1,0
GlowMax = 52
Fog = 0
HardShadow = 1 NotLocked
ShadowSoft = 9.6363638
QualityShadows = true
ReflectOnFloorOnly = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.66666667
X = 1,1,1,0.49631812
Y = 0.345098,0.666667,0,0.48159058
Z = 1,0.666667,0,0.47492626
R = 0.0784314,1,0.941176,-0.08983798
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 2.77566803
EnableFloor = false
FloorNormal = 0,1,0
FloorHeight = 1.0260116
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 12
ColorIterations = 12
Power = 2
DerivativeBias = 1
AlternateVersion = false
RotVector = 0,0,1
RotAngle = 0
Julia = false
JuliaC = 0,0,0
Petra = true
scale = 1.31274136
boxFold = 0.66421496
sphereFold = 0.30730944
#endpreset

#preset PB1
FOV = 0.5441989
Eye = 0.466409396,0.110539173,-3.25786665
Target = -0.205773144,-0.047026738,-2.52845836
Up = -0.522354642,-0.128208129,-0.509068659
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4
DetailAO = -2.09899564
FudgeFactor = 0.51775148
MaxDistance = 1000
MaxRaySteps = 1000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = -0.7337278,0.12721894
CamLight = 1,1,1,0.5
CamLightMin = 0.12121
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 1
ShadowSoft = 20
QualityShadows = true
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.74887893
X = 1,1,1,0.49631812
Y = 0.345098,0.666667,0,0.48159058
Z = 1,0.666667,0,0.47492626
R = 0.0784314,1,0.941176,-0.08983798
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = true
Cycles = 1.8662447
EnableFloor = false
FloorNormal = 0,1,0
FloorHeight = 1.0260116
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 8
ColorIterations = 8
Power = 2
DerivativeBias = 1
AlternateVersion = false
RotVector = 0,0,1
RotAngle = 0
Julia = false
JuliaC = 0,0,0
Petra = true
scale = 1.5933148
boxFold = 0.86162632
sphereFold = 0.17595312
#endpreset

#preset PB2
FOV = 0.09116022
Eye = -0.180152842,1.00457872,-5.78903837
Target = 0.01642989,0.24368734,-4.92180368
Up = -0.682410465,-0.063203803,0.099233674
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -5
DetailAO = -2.09899564
FudgeFactor = 0.75
MaxDistance = 1000
MaxRaySteps = 3000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = -0.7337278,0.12721894
CamLight = 1,1,1,0.5
CamLightMin = 0.12
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 1
ShadowSoft = 20
QualityShadows = true
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.74887893
X = 1,1,1,0.49631812
Y = 0.345098,0.666667,0,0.48159058
Z = 1,0.666667,0,0.47492626
R = 0.0784314,1,0.941176,-0.08983798
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = true
Cycles = 4.77566803
EnableFloor = false
FloorNormal = 0,1,0
FloorHeight = 1.0260116
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 12
ColorIterations = 12
Power = 2
Bailout = 384
DerivativeBias = 1
AlternateVersion = false
RotVector = 0,0,1
RotAngle = 0
Julia = true
JuliaC = 0,0,0
scale = 1.61559896
boxFold = 1.10128392
sphereFold = 0.2697948
Petra = true
#endpreset

#preset PB3
FOV = 0.66574586
Eye = -0.422259433,-0.883171374,-5.11081988
Target = 0.533862823,-0.599070716,-4.83658601
Up = 0.167678508,0.047237418,-0.633551698
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4.5
DetailAO = -2.09899564
FudgeFactor = 0.53994083
MaxDistance = 1000
MaxRaySteps = 3000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 0.20200573
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,2
SpotLightDir = -0.67751478,-0.62721894
CamLight = 1,1,1,0.5
CamLightMin = 0
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 1
ShadowSoft = 20
QualityShadows = true
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.74887893
X = 1,1,1,0.49631812
Y = 0.345098,0.666667,0,0.48159058
Z = 1,0.666667,0,0.47492626
R = 0.0784314,1,0.941176,-0.08983798
BackgroundColor = 0.396078431,0.309803922,0.137254902
GradientBackground = 1.4092357
CycleColors = true
Cycles = 4.77566803
EnableFloor = false
FloorNormal = 0,1,0
FloorHeight = 1.0260116
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 12
ColorIterations = 12
Power = 2
Bailout = 384
DerivativeBias = 1
AlternateVersion = false
RotVector = 0,0,1
RotAngle = 0
Julia = true
JuliaC = 0,0,0
scale = 1.61559896
boxFold = 1.10128392
sphereFold = 0.2697948
Petra = true
#endpreset
