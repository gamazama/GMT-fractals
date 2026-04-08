#info CubeKoch Distance Estimator.

#include "MathUtils.frag"
#define providesInit
#include "DE-Raytracer.frag"

#group CubeKoch
// Based on Knighty's Kaleidoscopic IFS 3D Fractals, described here:
// http://www.fractalforums.com/3d-fractal-generation/kaleidoscopic-%28escape-time-ifs%29/

// Number of iterations.
uniform int Iterations;  slider[0,10,40]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[0.00,3,4.00]

uniform vec3 RotVector; slider[(0,0,0),(1,0,0),(1,1,1)]

// Scale parameter. A perfect Menger is 3.0
uniform float RotAngle; slider[0.00,00,360]

// Scaling center
uniform vec3 Offset; slider[(-2,-2,-2),(1,1,0),(2,2,2)]

mat3 rot;
float sc,sr;
void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
	vec3 o=abs(Offset);
	sc = max(o.x,max(o.y,o.z));
	sr=sqrt(dot(o,o)+1.);
}

float DE(vec3 p)
{
	float r2=dot(p,p);
	float dd=1.;	
	for(int i = 0; i<Iterations && r2<100.; i++){
		p=abs(p);
		if(p.y>p.x) p.xy=p.yx;
      		if(p.z>p.y) p.yz=p.zy;
      		if(p.y>p.x) p.xy=p.yx;
		p.x=abs(p.x-1./3.*Offset.x)+1./3.*Offset.x;//if commented the core will be hollow
		p.y=abs(p.y-1./3.*Offset.y)+1./3.*Offset.y;
		//p.z=abs(p.z-1./3.*Offset.z)+1./3.*Offset.z;
		p=p*Scale-Offset*(Scale-1.); dd*=Scale;
		p=rot*p;
		r2=dot(p,p);	
	}
	
	return (sqrt(r2)-sr)/dd;
	//p=abs(p); return (max(p.x,max(p.y,p.z))-sc)/dd;
}



#preset default
FOV = 0.4
Eye = 1.8699489,2.10304045,-2.5535292
Target = -3.05096937,-3.43127666,4.16628461
Up = -0.30778399,0.83266104,0.460374419
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
Detail = -3
DetailAO = -0.5
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.91101696
Specular = 0.0625
SpecularExp = 15.354331
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.5529412,0.13725492
CamLight = 1,1,1,0.17391304
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 1
ShadowSoft = 5.5686276
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 0.725490196,0.725490196,0.725490196
OrbitStrength = 0.50378788
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,0.400000006
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = true
Cycles = 4.0846154
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 10
Scale = 3
RotVector = 1,0,0
RotAngle = 0
Offset = 1,1,0
#endpreset
