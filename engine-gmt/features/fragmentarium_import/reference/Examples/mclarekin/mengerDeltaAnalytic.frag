// For comparison of DeltaDE and AnalyticDE distance estimation methods
// mclarekin 09/04/2020


#info Menger Distance Estimator.
#define providesInit
#include "MathUtils.frag"
#include "DE-Raytracer.frag"
#group Menger
// Based on Knighty's Kaleidoscopic IFS 3D Fractals, described here:
// http://www.fractalforums.com/3d-fractal-generation/kaleidoscopic-%28escape-time-ifs%29/


uniform int Iterations;  slider[0,8,100]
uniform int ColorIterations;  slider[0,8,100]
uniform float Bailout;  slider[0,100,1000]

uniform float Scale; slider[0.00,3.0,4.00]
uniform vec3 Offset; slider[(0,0,0),(1,1,1),(5,5,5)]
// 3 angle rotation
uniform vec3 Rotation; slider[(-180,-180,-180),(0,0,0),(180,180,180)]
uniform float DEtweak;  slider[0,1,5]

uniform bool DeltaDE; checkbox[false]
uniform float DeltaDEScale; slider[-2,0,2]


mat3 rot3;
void init() {

	rot3 = rotationMatrixXYZ(Rotation);
}


float Dd;

vec3 DE1(vec3 z)
{
	int i = 0;
	Dd = 1.0;
	float rr = dot(z,z);
	while(rr<Bailout && (i<Iterations))  {

		z = abs(z);
		if (z.x  <z.y){ z.xy = z.yx;}
		if (z.x < z.z){ z.xz = z.zx;}
		if (z.y < z.z){ z.yz = z.zy;}
		z *= Scale;
		Dd = Dd * Scale;
		z -= Offset;
		if( z.z<-0.5*Offset.z)  z.z+=Offset.z;
		z *= rot3;
		rr = dot(z,z);	
		if (i<ColorIterations) orbitTrap = min(orbitTrap, (vec4(abs(z),rr)));
		i++;
	}
	return z;	
}

float DE(vec3 p) {
	if (!DeltaDE)
	{
		vec3 z = DE1(p);
		return length(z) / (Dd + DEtweak);
	}
else
	{
		vec3 z=p;
		float deltavalue = max(length(z) * 0.000001, DeltaDEScale * 0.1);
		vec3 deltaX = vec3 (deltavalue, 0.0, 0.0);
		vec3 deltaY = vec3 (0.0, deltavalue, 0.0);
		vec3 deltaZ = vec3 (0.0, 0.0, deltavalue);
		vec3 zCenter = DE1(z);
		float r = length(zCenter);
		vec3 d;
		vec3 zx1 = DE1(z + deltaX);
		vec3 zx2 = DE1(z - deltaX);
		d.x = min(abs(length(zx1) - r), abs(length(zx2) - r)) / deltavalue;
		vec3 zy1 = DE1(z + deltaY);
		vec3 zy2 = DE1(z - deltaY);
		d.y = min(abs(length(zy1) - r), abs(length(zy2) - r)) / deltavalue;
		vec3 zz1 = DE1(z + deltaZ);
		vec3 zz2 = DE1(z - deltaZ);
		d.z = min(abs(length(zz1) - r), abs(length(zz2) - r)) / deltavalue;
		float dr = length(d);
		return r /(dr);
	}
}


#preset ex1
FOV = 0.4
Eye = 0,0,-1.7999999
Target = 0,0,8.2000001
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
BaseColor = 1,1,1
OrbitStrength = 1
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,0.400000006
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 8
ColorIterations = 8
Bailout = 100
Scale = 3.35905048
Offset = 1,1,0.43413175
Rotation = 0,-58.410594,0
DEtweak = 2
DeltaDE = false
DeltaDEScale = 0
#endpreset

#preset standard
FOV = 0.4
Eye = 0,0,-1.8999999
Target = 0,0,8.1000001
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
FudgeFactor = 0.94276095
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
BaseColor = 1,1,1
OrbitStrength = 0.97938145
X = 0.5,0.6,0.6,0.93856658
Y = 1,0.6,0,0.414966
Z = 0.8,0.78,1,0.20408164
R = 0.4,0.7,1,-0.3651877
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 8
ColorIterations = 8
Bailout = 100
Scale = 3
Offset = 1,1,1
Rotation = 0,0,0
DEtweak = 1
DeltaDE = false
DeltaDEScale = 0
#endpreset

#preset ex2
FOV = 0.4
Eye = 0,0,-2.59999991
Target = 0,0,7.40000009
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
FudgeFactor = 0.94276095
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
BaseColor = 1,1,1
OrbitStrength = 0.97938145
X = 0.5,0.6,0.6,0.93856658
Y = 1,0.6,0,0.414966
Z = 0.8,0.78,1,0.20408164
R = 0.4,0.7,1,-0.3651877
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 8
ColorIterations = 8
Bailout = 100
Scale = 2.69436204
Offset = 1.0179641,1.2275449,1.43712575
Rotation = 0,-22.649004,0
DEtweak = 1
DeltaDE = false
DeltaDEScale = 0
#endpreset