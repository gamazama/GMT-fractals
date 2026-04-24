// this is based on EXAMPLES /historical 3D fractals/mandelbulb.frag

// have also added some other options used in MandelbulberV2
// mclarekin 4-12-20

#info Mandelbulb Distance Estimator

#include "MathUtils.frag"
#include "DE-Raytracer.frag"
#group MandelbulbSinAtan2

// Bailout radius
uniform float Bailout; slider[0,5,30]

// Number of color iterations.
uniform int ColorIterations;  slider[0,9,100]


// Number of fractal iterations.
uniform int Iterations;  slider[0,9,20]
uniform int SwapIter;  slider[0,3,10]
uniform int ZtempIter;  slider[0,1,10]
uniform int CIter;  slider[0,0,10]

// Mandelbulb powers
uniform float MBpower1; slider[0,2,30] 
uniform float MBpower2; slider[0,3,30]

uniform vec3 CScale; slider[(-5,-5,-5),(1,1,1),(5,5,5)]
uniform float time;
vec3 C;
vec3 Ztemp = vec3(0,0,0);
int i;


void Mbulb1(inout vec3 z, inout vec3  C, float r, inout float dr, int i) {
vec3 Ztemp = vec3(0,0,0);

	if (i == CIter) C = Ztemp;
	if (i >= ZtempIter) Ztemp = z;

	float th = asin(z.z / r) * MBpower1;
	float ph = atan(z.y, z.x) * MBpower1;
	float rp = pow(r, MBpower1 - 1.0);
	float cth = cos(th);
	dr = (rp * dr) * MBpower1 + 1.0;
	z = rp*r*vec3(cth*cos(ph), cth*sin(ph), sin(th));
	z += C;
	C = Ztemp;
}

void Mbulb2(inout vec3 z, vec3 C, float r, inout float dr) {
	float th = asin(z.z / r) * MBpower2;
	float ph = atan(z.y, z.x) * MBpower2;
	float rp = pow(r, MBpower2 - 1.0);
	float cth = cos(th);
	dr = (rp * dr) * MBpower2 + 1.0;
	z = rp*r*vec3(cth*cos(ph), cth*sin(ph), sin(th)) + C  * CScale;
}

float DE(vec3 pos) {
	vec3 z=pos;
	float r;
	vec3 C = pos;

	float dr=1.0;
	i=0;
	r=length(z);
	while(r<Bailout && (i<Iterations)) {
		
		if (i < SwapIter) {
			Mbulb1(z,C,r,dr,i);
		} else {
			Mbulb2(z,C,r,dr);
		}

		r=length(z);

		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*r)));
		i++;
	}

	return 0.5*log(r)*r/dr;
}


#preset bnb
FOV = 0.63536
Eye = -2.2e-8,-2.5013075,-2.6e-8
Target = -9.4e-8,1.10000001,-1.09e-7
Up = 0,-2.3e-8,-1
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
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
Detail = -2.84956
DetailAO = -1.35716
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 164
Dither = 0.51754
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.63626,0.5
CamLight = 1,1,1,1.53846
CamLightMin = 0.12121
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 0.35385
ShadowSoft = 12.5806
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.36729223
X = 1,1,1,0.1803279
Y = 0.345098,0.666667,0,0.620915
Z = 1,0.666667,0,0.3529412
R = 0.0784314,1,0.941176,-0.1409836
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.3261
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 13
ColorIterations = 9
Bailout = 5
CScale = 1,1,1
SwapIter = 19
MBpower2 = 3
MBpower1 = 3
ZtempIter = 0
CIter = 0
#endpreset

#preset bbb
FOV = 0.63536
Eye = -2.2e-8,-2.5013075,-2.6e-8
Target = -9.4e-8,1.10000001,-1.09e-7
Up = 0,-2.3e-8,-1
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
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
Detail = -2.84956
DetailAO = -1.35716
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 164
Dither = 0.51754
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.63626,0.5
CamLight = 1,1,1,1.53846
CamLightMin = 0.12121
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 0.35385
ShadowSoft = 12.5806
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.36729223
X = 1,1,1,0.1803279
Y = 0.345098,0.666667,0,0.620915
Z = 1,0.666667,0,0.3529412
R = 0.0784314,1,0.941176,-0.1409836
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.3261
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
ColorIterations = 9
Bailout = 5
CScale = 1,1,1
MBpower2 = 3
MBpower1 = 2
Iterations = 13
SwapIter = 2
CIter = 0
ZtempIter = 1
#endpreset

#preset bmnn
FOV = 0.63536
Eye = -2.2e-8,-2.5013075,-2.6e-8
Target = -0.546874222,1.05818093,0.019659954
Up = 0,0.005523176,-0.999984747
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
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
Detail = -2.84956
DetailAO = -1.35716
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 164
Dither = 0.51754
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.63626,0.5
CamLight = 1,1,1,1.53846
CamLightMin = 0.12121
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 0.35385
ShadowSoft = 12.5806
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.36729223
X = 1,1,1,0.1803279
Y = 0.345098,0.666667,0,0.620915
Z = 1,0.666667,0,0.3529412
R = 0.0784314,1,0.941176,-0.1409836
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.3261
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Bailout = 5
ColorIterations = 9
Iterations = 13
SwapIter = 2
CIter = 1
ZtempIter = 1
MBpower1 = 2
MBpower2 = 3
CScale = 0.8717949,1,-0.3076923
#endpreset

#preset bmnn
FOV = 0.63536
Eye = -2.2e-8,-2.5013075,-2.6e-8
Target = 0.190379779,1.09490951,0.019862899
Up = -4e-9,0.005523199,-0.999984747
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
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
Detail = -2.84956
DetailAO = -1.35716
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 164
Dither = 0.51754
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.63626,0.5
CamLight = 1,1,1,1.53846
CamLightMin = 0.12121
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 0.35385
ShadowSoft = 12.5806
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.36729223
X = 1,1,1,0.1803279
Y = 0.345098,0.666667,0,0.620915
Z = 1,0.666667,0,0.3529412
R = 0.0784314,1,0.941176,-0.1409836
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.3261
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Bailout = 5
ColorIterations = 9
Iterations = 13
SwapIter = 3
CIter = 1
ZtempIter = 1
MBpower1 = 3
MBpower2 = 3
CScale = 1.3265307,1,-0.3076923
#endpreset
