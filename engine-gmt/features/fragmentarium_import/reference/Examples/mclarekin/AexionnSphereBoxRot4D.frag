#info Aexions  SphereBox http://www.fractalforums.com/mandelbulb-3d/how-to-make-a-sphere/msg90417/#msg90417
//   mclarekin updated 7 December 2019

#define providesInit

#include "MathUtils.frag"

#include "DE-Raytracer.frag"

#group SphereBox

// Number of fractal iterations.
uniform int Iterations;  slider[0,17,60]

uniform int ColorIterations;  slider[0,8,60]
// box
uniform vec4 Offset; slider[(0.0,0.0,0.0,0.0),(1.0,1.0,1.0,1.0),(5.0,5.0,5.0,5.0)]

// sphere fold
uniform float minRR;  slider[0.0,0.25,5.0]
uniform float maxRR;  slider[0.0,1.0,5.0]
float maxDivMin = maxRR / minRR;
uniform vec4 offsetSph; slider[(-5.0,-5.0,-5.0,-5.0),(0.0,0.0,0.0,0.0),(5.0,5.0,5.0,5.0)]

// scale
uniform float Scale;  slider[0.0,2.0,5.0]

// precomputed constants
uniform vec3 Rotation; slider[(-180,-180,-180),(0,0,0),(180,180,180)]
mat3 rot;

void init() {
 rot = rotationMatrixXYZ(Rotation);
}
// rotation 4D
uniform bool rotate; checkbox[false]
uniform float anglXY; slider[-180.0,0.0,180.0]
uniform float anglYZ; slider[-180.0,0.0,180.0]
uniform float anglXZ; slider[-180.0,0.0,180.0]
uniform float anglXW; slider[-180.0,0.0,180.0]
uniform float anglYW; slider[-180.0,0.0,180.0]
uniform float anglZW; slider[-180.0,0.0,180.0]


	float M_PI_180 = PI/180.;
	float angleXY = anglXY * M_PI_180;
	float angleYZ = anglYZ * M_PI_180;
	float angleXZ = anglXZ * M_PI_180;
	float angleXW = anglXW * M_PI_180;
	float angleYW = anglYW * M_PI_180;
	float angleZW = anglZW * M_PI_180;

vec4 Rotate(vec4 z)
{
	vec4 tp;
	if (angleXY != 0.)
	{
		tp = z;
		z.x = tp.x * cos(angleXY) + tp.y * sin(angleXY);
		z.y = tp.x * -sin(angleXY) + tp.y * cos(angleXY);
	}
	if (angleYZ != 0.)
	{
		tp = z;
		z.y = tp.y * cos(angleYZ) + tp.z * sin(angleYZ);
		z.z = tp.y * -sin(angleYZ) + tp.z * cos(angleYZ);
	}
	if (angleXZ != 0.)
	{
		tp = z;
		z.x = tp.x * cos(angleXZ) + tp.z * sin(angleXZ);
		z.z = tp.x * -sin(angleXZ) + tp.z * cos(angleXZ);
	}
	if (angleXW != 0.)
	{
		tp = z;
		z.x = tp.x * cos(angleXW) + tp.w * sin(angleXW);
		z.w = tp.x * -sin(angleXW) + tp.w * cos(angleXW);
	}
	if (angleYW != 0.)
	{
		tp = z;
		z.y = tp.y * cos(angleYW) + tp.w * sin(angleYW);
		z.w = tp.y * -sin(angleYW) + tp.w * cos(angleYW);
	}
	if (angleZW != 0.)
	{
		tp = z;
		z.z = tp.z * cos(angleZW) + tp.w * sin(angleZW);
		z.w = tp.z * -sin(angleZW) + tp.w * cos(angleZW);
	}
	return z;
}

float DE(vec3 pos) {

	float r=0.0;
	vec3 c = pos;
	vec4 z = vec4(c,length(c));
	float dd = 1.0;
	int i=0;
	vec4 CT = vec4(c.x,c.y,c.z,length(c));

	for (i=0; i<Iterations; i++) {

	z = abs(z + Offset) - abs(z - Offset) - z;

	float rr = dot(z,z);

	z += offsetSph; // test
	if(rr < minRR)
	{
		z *= maxDivMin;
		dd *= maxDivMin;
	}
	else if(rr < maxRR)
	{
		float maxDivRR = maxRR / rr;
		z *= maxDivRR;
		dd *= maxDivRR;
	}
	z -= offsetSph; // test

	z = z * Scale;
	dd = dd * Scale + 1.0;

		//rotation  // test
	vec3 zr = vec3(z.x, z.y, z.z);
	zr *= rot;
	z = vec4(zr.x, zr.y, zr.z, z.w);
	// temp 4D rotation
		if(rotate) z = Rotate(z);
	z = z + CT;


	r=length(z);
			/*	if (i<ColorIterations)
	{
		orbitTrap.x=abs(z.x-z.y-z.z+z.w);
		orbitTrap.y=abs(z.x-z.y+z.z-z.w);
		orbitTrap.z=abs(z.x+z.y-z.z-z.w);
		orbitTrap.w=length(orbitTrap.xyz);
	}*/

		if (i<ColorIterations)
		{
			vec4 p = abs(z);
			orbitTrap.x = min(orbitTrap.x, abs(p.x-p.y-p.z+p.w));
			orbitTrap.y = min(orbitTrap.y, abs(p.x-p.y+p.z-p.w));
			orbitTrap.z = min(orbitTrap.z, abs(p.x+p.y-p.z+p.w));
			orbitTrap.w = min(orbitTrap.w, abs(p.x+p.y+p.z-p.w));
		}




    if ( r>1000.0) break;
		
	}


	return  r / dd;
}



#preset fgf
FOV = 0.4
Eye = 0,0,-19.0000001
Target = 0,0,-9.00000012
Up = 0,1,0
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
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
Detail = -2.3
DetailAO = -0.5
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.699999988
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.400000006
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 0.666666667,1,0.717647059
OrbitStrength = 0.11267606
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,-1
Z = 0.8,0.78,1,-0.02702702
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 17
ColorIterations = 8
Offset = 1,1,1,1
minRR = 0.25
maxRR = 1
offsetSph = 0,-0.9770115,0.7471265,-1.5517241
Scale = 2.0434783
Rotation = 0,13.5000036,0
rotate = false
anglXY = 0
anglYZ = 0
anglXZ = 0
anglXW = 0
anglYW = 0
anglZW = 0
#endpreset

#preset sas
FOV = 0.4
Eye = 0,0,-16.0000001
Target = 0,0,-6.00000009
Up = 0,1,0
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -2.53981
DetailAO = -0.42
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 56
Dither = 0.44737
NormalBackStep = 1
AO = 0,0,0,0.76
Specular = 0
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.25713
SpotLightDir = 0.66266,0.1
CamLight = 1,1,1,0.78874
CamLightMin = 0.31765
Glow = 1,1,1,0.2826
GlowMax = 20
Fog = 0
HardShadow = 0.41538
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.8
X = 0.5,0.6,0.6,0.75238
Y = 1,0.6,0,0.48572
Z = 0.8,0.78,1,0.5
R = 0.545098,0.529412,0.47451,0.65384
BackgroundColor = 1,1,1
GradientBackground = 0.3
CycleColors = false
Cycles = 6.36097
EnableFloor = false NotLocked
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 17
ColorIterations = 8
Offset = 1,1.02071005,1,1
minRR = 0.25
maxRR = 1
offsetSph = 0,0.0798723,0,-0.6869009
Scale = 2.4046921
Rotation = 0,0,0
rotate = false
anglXY = 0
anglYZ = 0
anglXZ = 0
anglXW = 0
anglYW = 0
anglZW = 0
#endpreset
