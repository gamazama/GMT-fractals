#info Jerusalem Cross
#include "MathUtils.frag"
#define providesInside
#include "Brute-Raytracer.frag"

#group JC
//#define IterationsBetweenRedraws 5

// Number of fractal iterations.
uniform int Iterations;  slider[0,5,20]

// Param
uniform float Alpha; slider[0,0.4142135623730950488016887242097,1]

bool inside(vec3 p) {
	float scl=Alpha+2.;
	float a=Alpha/scl;
	for(int i=0; i<Iterations+1; i++){
		p=abs(p);
		if(p.x<p.y) p.xy=p.yx;
		if(p.x<p.z) p.xz=p.zx;
		if(p.y<p.z) p.yz=p.zy;
		
		if(p.x>1.) break;

		if(p.z<a && p.y>1.-2.*a)  p.z+=2.*a;

		p-=vec3(1.); p*=scl; p+=vec3(1.);
	}
	return (p.x>1.);
}

#preset Default
FOV = 0.62536
Eye = -2.76014,-2.42908,-1.12372
Target = 3.33046,3.32578,1.75982
Up = 0.286439,0.169428,-0.942999
EquiRectangular = false
Gamma = 2.5
ToneMapping = 1
Exposure = 1.34694
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.58825
AOScale = 2.6699
Glow = 0.34167
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 2.1875
SpecularExp = 40.278
SpotLight = 1,0.678431,0.494118,0.78431
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Fog = 0
BaseColor = 1,1,1
OrbitStrength = 0
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
Iterations = 3
Alpha = 0.41421356
#endpreset

#preset Menger
FOV = 0.62536
Eye = -2.76014,-2.42908,-1.12372
Target = 3.33046,3.32578,1.75982
Up = 0.286439,0.169428,-0.942999
EquiRectangular = false
Gamma = 2.5
ToneMapping = 1
Exposure = 1.34694
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.58825
AOScale = 2.6699
Glow = 0.34167
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 2.1875
SpecularExp = 40.278
SpotLight = 1,0.678431,0.494118,0.78431
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Fog = 0
BaseColor = 1,1,1
OrbitStrength = 0
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
Iterations = 3
Alpha = 1
#endpreset

#preset Jerusalem_Cross
FOV = 0.62536
Eye = -2.76014,-2.42908,-1.12372
Target = 3.33046,3.32578,1.75982
Up = 0.286439,0.169428,-0.942999
EquiRectangular = false
Gamma = 2.5
ToneMapping = 1
Exposure = 1.34694
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.58825
AOScale = 2.6699
Glow = 0.34167
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 2.1875
SpecularExp = 40.278
SpotLight = 1,0.678431,0.494118,0.78431
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Fog = 0
BaseColor = 1,1,1
OrbitStrength = 0
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
Iterations = 3
Alpha = 0.41421356
#endpreset