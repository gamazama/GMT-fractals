#info Menger Distance Estimator.
#info ...with some nice presets

#include "MathUtils.frag"

#define providesInit
#include "DE-Raytracer.frag"

#group Menger
// Based on Knighty's Kaleidoscopic IFS 3D Fractals, described here:
// http://www.fractalforums.com/3d-fractal-generation/kaleidoscopic-%28escape-time-ifs%29/

// Number of iterations.
uniform int Iterations;  slider[0,13,100]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[1.01,3.0,4.00]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

// Scale parameter. A perfect Menger is 3.0
uniform float RotAngle; slider[0.00,0,180]

// Scaling center
uniform vec3 Offset; slider[(0,0,0),(1,1,1),(1,1,1)]

mat3 rot;

void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

float DE(vec3 z)
{
	float r = dot(z,z);
	
	int n = 0;
	// Fold
	z = abs(z);
	if (z.x<z.y)
		 z.xy = z.yx;
	if (z.x< z.z)
		z.xz = z.zx;
	if (z.y<z.z)
		z.yz = z.zy;
	
while (n < Iterations && r<100.) {
		
		z = Scale * z - vec3(Offset.xy,0.) * (Scale - 1.0);
		
		z = rot *z;

		if( z.z>0.5*Offset.z*(Scale-1.0))  z.z-=Offset.z*(Scale-1.0);
		
		// Fold
		z = abs(z);
		if (z.x<z.y)
			z.xy = z.yx;
		if (z.x< z.z)
			z.xz = z.zx;
		if (z.y<z.z)
			z.yz = z.zy;
		
		r = dot(z, z);

		orbitTrap = min(orbitTrap, abs(vec4(z,r)));
		
		n++;
	}
	
	return (length(z) - 2.) * pow(Scale, float(-n));
	//return abs(z.x-Offset.z) * pow(Scale, float(-n));
}



#preset Default
FOV = 0.4
Eye = 3.79024,1.84362,1.26377
Target = -4.76537,-2.4291,-1.65947
Up = -0.484682,0.85951,0.162254
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3.3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 176
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.92593
Specular = 0.02353
SpecularExp = 61.818
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.6875,0.375
CamLight = 1,1,1,0.5
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 0
Fog = 0
HardShadow = 0.75385
ShadowSoft = 12.9032
Reflection = 0
DebugSun = false
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.24675
X = 0.6,0.105882,0.105882,1
Y = 0.423529,1,0.470588,0.61166
Z = 0.968627,1,0.584314,1
R = 0.32549,0.368627,1,-0.64706
BackgroundColor = 0.0431373,0.0901961,0.133333
GradientBackground = 1.08695
CycleColors = true
Cycles = 4.65662
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 7
Scale = 3
RotVector = 0,0,1
RotAngle = 0
Offset = 1,1,1
#endpreset


#preset Noname
FOV = 0.4
Eye = 3.83134,1.07756,1.87661
Target = -4.83415,-1.47392,-2.41282
Up = -0.249111,0.96585,-0.0712637
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3.3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.92593
Specular = 0.02353
SpecularExp = 61.818
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.6875,0.375
CamLight = 1,1,1,0.5
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 0
Fog = 0
HardShadow = 0.75385
ShadowSoft = 12.9032
Reflection = 0
DebugSun = false
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.48052
X = 0.133333,0.6,0.188235,-0.26214
Y = 1,0.160784,0.160784,1
Z = 0.133333,0.133333,1,0.92234
R = 1,0.980392,0.333333,0.39216
BackgroundColor = 0.133333,0.133333,0.133333
GradientBackground = 0.65215
CycleColors = true
Cycles = 11.0358
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 7
Scale = 3
RotVector = 0,0,1
RotAngle = 62.0694
Offset = 0.91964,1,0.59821
#endpreset


#preset organic
FOV = 0.4
Eye = 2.8487,0.158975,1.85896
Target = -5.57682,-0.363476,-3.50178
Up = -0.194428,0.961882,0.192304
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3.3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 176
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.92593
Specular = 0.02353
SpecularExp = 61.818
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.25,0.78126
CamLight = 1,1,1,0.5
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 0
Fog = 0
HardShadow = 0.75385
ShadowSoft = 12.9032
Reflection = 0
DebugSun = false
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.24675
X = 0.6,0.105882,0.105882,1
Y = 0.423529,1,0.470588,0.61166
Z = 0.968627,1,0.584314,1
R = 0.32549,0.368627,1,-0.64706
BackgroundColor = 0.0431373,0.0901961,0.133333
GradientBackground = 1.08695
CycleColors = true
Cycles = 4.65662
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 30
Scale = 1.15
RotVector = 1,0.67708,1
RotAngle = 11.3778
Offset = 1,0,0.08036
#endpreset


#preset Octa
FOV = 0.4
Eye = 2.81487,1.43285,-1.52002
Target = -5.32766,-2.19815,3.00931
Up = -0.23472,0.91036,0.340809
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 3
Exposure = 3
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3.3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 176
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.92593
Specular = 0.02353
SpecularExp = 61.818
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.3125,0.625
CamLight = 1,1,1,0.5
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 0
Fog = 0
HardShadow = 0.73846
ShadowSoft = 12.9032
Reflection = 0
DebugSun = false
BaseColor = 0.647059,0.647059,0.647059
OrbitStrength = 0.27273
X = 0.6,0.105882,0.105882,1
Y = 0.423529,1,0.470588,0.61166
Z = 0.968627,1,0.584314,1
R = 0.32549,0.368627,1,-0.64706
BackgroundColor = 0.0431373,0.0901961,0.133333
GradientBackground = 1.08695
CycleColors = true
Cycles = 7.99802
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 33
RotVector = 1,0,0
RotAngle = 0
Offset = 1,0,0
Scale = 2
#endpreset
