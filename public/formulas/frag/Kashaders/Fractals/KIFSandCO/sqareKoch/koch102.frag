#info Menger Distance Estimator.
#define providesInit
#include "fast-Raytracer.frag"
#include "MathUtils.frag"
#group SquareKoch

// Number of iterations.
uniform int Iterations;  slider[0,5,100]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[0.00,3,4.00]

uniform vec3 RotVector; slider[(0,0,0),(1,0,0),(1,1,1)]

// Scale parameter. A perfect Menger is 3.0
uniform float RotAngle; slider[0.00,00,360]

// Scaling center
uniform vec3 Offset; slider[(-2,-2,-2),(1,0,0),(2,2,2)]

mat3 rot;

void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}
float baseshape(vec3 z)
{
	float d0=dot(z,vec3(sqrt(0.5),0.,sqrt(0.5)))-sqrt(0.5);
	float d1=dot(z,vec3(sqrt(0.5),sqrt(0.5),0.))-sqrt(2./9.);
	float d2=dot(z,vec3(0.,sqrt(0.5),sqrt(0.5)))-sqrt(1./18.);
	float d3=dot(z,vec3(0.,-sqrt(0.5),sqrt(0.5)))+sqrt(1./18.);
	return max(d0,min(d1,min(d2,d3)));
}
float DE(vec3 z)
{
	float z0=z.z;
	float r,dmin=0.,dd=1.;
	
	int n = 0;
	while (n < Iterations) {
		// Fold
		z.xy = abs(z.xy);
		if(z.y>z.x) z.xy=z.yx;
		dmin=max(dmin,baseshape(z)*dd);
		if (dmin>dd) break;

		z.y=1./3.-abs(z.y-1./3.);
		z.x+=1./3.;if(z.z>z.x) z.xz=z.zx; z.x-=1./3.;
		z.x-=1./3.;if(z.z>z.x) z.xz=z.zx; z.x+=1./3.;
		
		z = rot *z;
		z=Scale* (z-Offset)+Offset;dd*=1./Scale;
		z = rot *z;
		
		r = dot(z, z);
		orbitTrap = min(orbitTrap, abs(vec4(z,r)));
		
		n++;
	}
	z.xy = abs(z.xy);
	if(z.y>z.x) z.xy=z.yx;
	dmin=max(dmin,baseshape(z)*dd);
	return max(-z0,dmin);
}

#preset default
FOV = 0.4
Eye = -0.775498488,-2.30134785,2.65751758
Target = 1.37866412,4.09128518,-4.72447581
Up = 0.115798756,0.733891021,0.669323999
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
AntiAlias = 1
Detail = -3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 128
BoundingSphere = 12
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.87288136
Specular = 0.8088235
SpecularExp = 50.000001
SpotLight = 1,1,1,1
SpotLightDir = 0.74117648,0.3019608
CamLight = 1,1,1,0.19323672
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
BaseColor = 1,1,1
OrbitStrength = 0
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,0.400000006
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 5
Scale = 3
RotVector = 1,0,0
RotAngle = 0
Offset = 1,0,0
#endpreset
