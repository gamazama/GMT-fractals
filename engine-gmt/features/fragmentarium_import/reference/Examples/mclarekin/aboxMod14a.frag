// modification of Mandelbox fractal aka AmazingBox or ABox, invented by Tom Lowe in 2010
// @reference conditional sphere inversion alexl sanbase
// http://www.fractalforums.com/3d-fractal-generation/realtime-rendering-on-gpu/
// choice of symmetrical addition of constants
// mclarekin 6/5/2020
#info Mandelbox Distance Estimator
#define providesInit

#include "MathUtils.frag"
#include "DE-Raytracer.frag" 
#group Mandelbox


// Number of fractal iterations.
uniform int Iters;  slider[0,40,100]

// Number of color iterations.
uniform int ColorIterations;  slider[0,9,100]

// Bailout radius
uniform float Bailout; slider[0,100,1000]

uniform bool Asurf; checkbox[false]
uniform vec3 Limit; slider[(-5,-5,-5),(1,1,1),(5,5,5)]

uniform float invMin; slider[0,0,6]
uniform float invMax; slider[1,2,6]

uniform float scale; slider[-12,6,12]

uniform vec3 scaleP0; slider[(-2,-2,-2),(0,0,0),(2,2,2)]

uniform bool pSign; checkbox[false]

uniform vec3 JuliaC; slider[(-5,-5,-5),(0,0,0),(5,5,5)]
uniform bool JCSignP; checkbox[false]
uniform bool JCSignP0; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
uniform float RotAngle; slider[0.00,0,180]

uniform float DEtweak; slider[0,0,2]

mat3 rot;
void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

float DE(vec3 pos)
{ 
	float Dd = 1.0;
	float rr;
	vec3 p = vec3(pos);
	vec3 signP0 = sign(pos);
	vec3 p0 = scaleP0 * vec3(pos);
	vec3 p0abs = abs(p0);
	vec3 signJc = scaleP0 * JuliaC;
	float minrr = 1.0 / invMin;
	float maxrr = 1.0 / invMax;

	for (int i = 0; i < Iters &&  rr < Bailout; i++)
	{
		// abs box fold
		p.xz = abs(p.xz + Limit.xz) - abs(p.xz - Limit.xz) - p.xz;
		if(!Asurf) p.y = abs(p.y + Limit.y) - abs(p.y - Limit.y) - p.y;

		// a type of conditional sphere inversion
		float m;
		float rr = dot(p, p);
		if(rr < invMin) m = minrr;
		else if(rr < invMax) m = 1.0 / rr;
		else m = maxrr;
		p *= m;
		Dd *= m; // distance estimation calc

		//  minimum rr color function (can be placed elsewhere)
		if (i < ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(p, rr)));

		// scaling 
		p = p * scale;
		Dd = Dd * abs(scale) + DEtweak; // distance estimation calc

		// adding constants(can be placed elsewhere )
		if(pSign)p += sign(p) * p0abs;
		else p += p0;

		if(JCSignP)p += sign(p) * JuliaC;
		else if(JCSignP0) p += signP0 * JuliaC;
		else p += JuliaC;

		// rotation about vector (can be placed elsewhere)
		p *= rot;

	}
	return length(p) / Dd;
}




#preset base_noAdd_noRot
FOV = 0.4
Eye = 0,0,-12.9
Target = 0,0,-2.90000004
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
Y = 1,0.6,0,-0.24324324
Z = 0.8,0.78,1,0.02702704
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iters = 10
ColorIterations = 9
Bailout = 100
Asurf = false
Limit = 1,1,1
scale = 6
scaleP0 = 0,0,0
pSign = false
JuliaC = 0,0,0
JCSignP = false
JCSignP0 = false
RotVector = 1,1,1
RotAngle = 0
invMin = 0
invMax = 2
DEtweak = 0
#endpreset
