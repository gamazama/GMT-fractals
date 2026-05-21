#info Spherifying Menger Distance Estimator.

#include "MathUtils.frag"
#define providesInit
#include "fast-Raytracer.frag"

#group Menger

// Number of iterations.
uniform int Iterations;  slider[0,10,20]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[0.00,3,4.00]

uniform vec3 RotVector; slider[(0,0,0),(1,0,0),(1,1,1)]

// Scale parameter. A perfect Menger is 3.0
uniform float RotAngle; slider[0.00,00,360]

// Scaling center
uniform vec3 Offset; slider[(-2,-2,-2),(1,1,1),(2,2,2)]

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
#if 1
	vec3 ap=abs(p);
	float Linf=max(max(ap.x,ap.y),ap.z);//infinity norm
	float L2=length(p);//euclidean norm
	float multiplier=L2/Linf;
	p*=multiplier;//Spherify transform.
	float dd=multiplier*1.6;//to correct the DE. Found by try and error. there should be better formula.
#else
	float dd=1.;
#endif
	float r2=dot(p,p);
	for(int i = 0; i<Iterations && r2<100.; i++){
		p=abs(p);
		if(p.y>p.x) p.xy=p.yx;
      		if(p.z>p.y) p.yz=p.zy;
      		if(p.y>p.x) p.xy=p.yx;
		p.z=abs(p.z-1./3.*Offset.z)+1./3.*Offset.z;
		p=p*Scale-Offset*(Scale-1.); dd*=Scale;
		p=rot*p;
		r2=dot(p,p);	
	}
#if 1
	return (sqrt(r2)-sr)/dd;//bounding volume is a sphere
#else
	p=abs(p); return (max(p.x,max(p.y,p.z))-sc)/dd;//bounding volume is a cube
#endif
}



#preset default
FOV = 0.4
Eye = 2.07396923,0.979751259,-2.50972875
Target = -4.02594045,-1.90187018,4.87182662
Up = -0.132433867,0.955505673,0.263571959
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
AntiAlias = 1
Detail = -3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 56
BoundingSphere = 12
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.81779662
Specular = 0.625
SpecularExp = 57.874016
SpotLight = 1,1,1,1
SpotLightDir = -0.46666666,0.34117648
CamLight = 1,1,1,0.1642512
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 140
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
BaseColor = 0.725490196,0.725490196,0.725490196
OrbitStrength = 0
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,0.400000006
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 10
Scale = 3
RotVector = 1,0,0
RotAngle = 0
Offset = 1,1,1
#endpreset
