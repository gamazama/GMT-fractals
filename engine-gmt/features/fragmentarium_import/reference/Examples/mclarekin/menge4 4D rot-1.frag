
#info Menger Sponge Distance Estimator.

#include "MathUtils.frag"
#include "DE-Raytracer.frag"

#group Menger4
//Menger4, code from M3D, Darkbeam
//rewrote 4D rotation and added different color calc 16/04/20
 
/*
The distance estimator below was originally devised by Buddhi.
See this thread for more info: http://www.fractalforums.com/3d-fractal-generation/a-mandelbox-distance-estimate-formula/15/
*/
uniform int maxiter;  slider[0,10,50]
uniform int ColorIterations;  slider[0,3,300]
uniform float bailout; slider[0,16,100]
uniform float w; slider[-1.5,0,1.5]

// Menger Sponge
uniform int StartPreAdd;  slider[0,0,60]
uniform int StopPreAdd;  slider[0,0,60]
uniform vec4 PreAddM; slider[(-5.0,-5.0,-5.0,-5.0),(0.0,0.0,0.0,0.0),(5.0,5.0,5.0,5.0)]
uniform vec4 offsetM; slider[(-1.0,-1.0,-1.0,-1.0),(1.0,1.0,1.0,0.5),(5.0,5.0,5.0,5.0)]
uniform float scaleM;  slider[-5.0,3.0,5.0]
//vec4 offsetM = offsetT *(scaleM - 1.0);
float opt2 = 0.5 * offsetM.z  / scaleM;

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

int i = 0;	

float DE(vec3 pos)
{
	vec4 z = vec4(pos,w);
	float r2= 0.0;
	float Dd = 1.0;	

	for( i=0; i<maxiter ; i++)		
  {
		if (i >= StartPreAdd && i < StopPreAdd)
		{
			z += PreAddM; // offset
		}

		z = abs(z); // abs()
		vec4 temp4;

		//Conditional swizzle
		if ( z.y > z.x ) { temp4.x = z.y; z.y = z.x; z.x = temp4.x;}
		if ( z.z > z.x ) { temp4.x = z.z; z.z = z.x; z.x = temp4.x;}
		if ( z.z > z.y ) { temp4.y = z.z; z.z = z.y; z.y = temp4.y;}
		if ( z.w > z.x ) { temp4.x = z.w; z.w = z.x; z.x = temp4.x;}
		if ( z.w > z.y ) { temp4.x = z.w; z.w = z.y; z.y = temp4.x;}
		if ( z.w > z.z ) { temp4.y = z.w; z.w = z.z; z.z = temp4.y;}

	// temp 4D rotation
		if(rotate) z = Rotate(z);

	// scale  and offset
		z.x = scaleM * z.x - offsetM.x;
		z.y = scaleM * z.y - offsetM.y;
		z.w = scaleM * z.w - offsetM.w;
		z.z -= opt2;
		z.z = -abs(-z.z);
		z.z += opt2;
		z.z *= scaleM;
		Dd *= scaleM;

		r2 = dot(z.xyz,z.xyz);// or //float r2=(z.x*z.x+z.y*z.y+z.z*z.z);
	//float r2=z.x*z.x+z.y*z.y+z.z*z.z+z.w*z.w;
		//r2 = length(z.xyz);
	
		//if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.xyz,r2)));	
		if (i<ColorIterations)
		{
			vec4 p = abs(z);
			orbitTrap.x = min(orbitTrap.x, abs(p.x-p.y-p.z+p.w));
			orbitTrap.y = min(orbitTrap.y, abs(p.x-p.y+p.z-p.w));
			orbitTrap.z = min(orbitTrap.z, abs(p.x+p.y-p.z+p.w));
			orbitTrap.w = min(orbitTrap.w, abs(p.x+p.y+p.z-p.w));
		}
		if ( r2 > bailout)	
		{
			r2 = sqrt(r2);
			return r2 / Dd;
		}
	}
}


#preset vvv
FOV = 0.4
Eye = 0,0,-2.5
Target = 0,0,3.5
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
FudgeFactor = 0.6979167
MaxDistance = 1000
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.4
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1.59854
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,0.7411765,0.6078431
OrbitStrength = 0.6175115
X = 0.5,0.6,0.6,1
Y = 1,0.6,0,0.82312926
Z = 0.8,0.78,1,-0.352381
R = 0.4,0.7,1,0.39249148
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
maxiter = 10
ColorIterations = 3
bailout = 16
w = 0
StartPreAdd = 0
StopPreAdd = 0
PreAddM = 0,0,0,0
offsetM = 1,1,1,0.5
scaleM = 3
rotate = false
anglXY = 0
anglYZ = 0
anglXZ = 0
anglXW = 0
anglYW = 0
anglZW = 0
#endpreset

#preset bbb
FOV = 0.4
Eye = 0,0,-2.5
Target = 0,0,3.5
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
FudgeFactor = 0.6979167
MaxDistance = 1000
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.4
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1.59854
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,0.7411765,0.6078431
OrbitStrength = 0.6175115
X = 0.5,0.6,0.6,0.84300344
Y = 1,0.6,0,0.72789118
Z = 0.8,0.78,1,-0.19047618
R = 0.4,0.7,1,0.05802048
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
maxiter = 10
ColorIterations = 3
bailout = 16
w = 0
StartPreAdd = 0
StopPreAdd = 2
PreAddM = 0,0,0,0
offsetM = 1,1,1,0.5
scaleM = 3
rotate = true
anglXY = -5.753425
anglYZ = 32.72727
anglXZ = -23.83562
anglXW = 1.682243
anglYW = -2.511628
anglZW = -10.88372
#endpreset
