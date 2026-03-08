#version 420
#info 
//#define providesInit
#include "fast-Raytracer.frag"
#include "MathUtils.frag"
#group Koch
// Number of fractal iterations.
uniform int Iterations;  slider[0,9,20]

//uniform float SHF; slider[-1,0.1,1]

uniform float ang; slider[0,60,90]

const vec3 c=vec3(sqrt(3.)*0.5,-0.5,0.);//man! this IS a constant expression. Requires #version 420 ???

float sierpinski(vec3 p){
#define SCL 2.
	float d=1.;
	for(int i=0;i<Iterations;i++){
		p.y=abs(p.y);
		float t=2.*min(0.,dot(p,c));
		p-=t*c;
		p.x-=1.; p*=SCL; p.x+=1.;
		d*=SCL;
	}
	return (length(p)-1.)/d;
#undef SCL
}

float sierpinski3(vec3 p){
#define SCL 3.
#define SHF 1./3.
	float d=1.;
	for(int i=0;i<Iterations;i++){
		p.y=abs(p.y);
		float t=2.*min(0.,dot(p,c)); p-=t*c;
		p.y=abs(p.y);
		p.x-=SHF;t=2.*min(0.,dot(p,c)); p-=t*c;p.x+=SHF;
		p.x-=1.; p*=SCL; p.x+=1.;
		d*=SCL;
	}
	return (length(p)-1.)/d;
#undef SCL
#undef SHF
}

float Koch3D(vec3 p){
#define SCL 3.
#define SHF 1./3.
#define PI 3.14159
	const vec3 c1=vec3(sin(ang*PI/180.),0.,-cos(ang*PI/180.));
	float d=1.;
	for(int i=0;i<Iterations;i++){
		p.y=abs(p.y);
		float t=2.*min(0.,dot(p,c)); p-=t*c;
		p.y=abs(p.y);
		p.x-=SHF;t=2.*min(0.,dot(p,c)); p-=t*c;p.x+=SHF;
		p.x-=0.5;t=2.*min(0.,dot(p,c1)); p-=t*c1;p.x+=0.5;
		p.x-=1.; p*=SCL; p.x+=1.;
		d*=SCL;
	}
	return (length(p)-1.)/d;
#undef SCL
#undef SHF
#undef PI
}

float DE(vec3 p){
	return Koch3D(p);
}

#preset default
FOV = 0.4
Eye = 0.024177571,-1.83113734,1.22948882
Target = -0.024047956,12.9055506,-8.94121688
Up = -0.004777501,0.396512019,0.574542658
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
AntiAlias = 1
Detail = -3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 127
BoundingSphere = 12
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.699999988
Specular = 0.2768166
SpecularExp = 79.704798
SpotLight = 1,1,1,0.60986548
SpotLightDir = -0.69117646,0.18382354
CamLight = 1,1,1,0.41071428
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
Iterations = 9
ang = 64.326924
#endpreset
