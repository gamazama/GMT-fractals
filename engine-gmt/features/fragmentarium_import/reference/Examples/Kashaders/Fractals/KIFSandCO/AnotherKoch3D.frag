#info 
//#define providesInit
#include "fast-Raytracer.frag"
#include "MathUtils.frag"
#group Koch
// Number of fractal iterations.
uniform int Iterations;  slider[0,9,20]

//uniform float SHF; slider[-1,0.1,1]

const vec3 c=vec3(sqrt(3.)*0.5,-0.5,0.);
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
	float d=1.;
	for(int i=0;i<Iterations;i++){
		p.y=abs(p.y);
		float t=2.*min(0.,dot(p,c)); p-=t*c;
		p.y=abs(p.y);
		p.x-=SHF;t=2.*min(0.,dot(p,c)); p-=t*c;p.x+=SHF;
		p.x-=0.5;t=2.*min(0.,dot(p,c.xzy)); p-=t*c.xzy;p.x+=0.5;
		p.x-=1.; p*=SCL; p.x+=1.;
		d*=SCL;
	}
	return (length(p)-1.)/d;
#undef SCL
#undef SHF
}

float Koch3D4(vec3 p){
#define SCL 4.
#define SHF 1./3.
	float d=1.;
	for(int i=0;i<Iterations;i++){
		p.y=abs(p.y);
		float t=2.*min(0.,dot(p,c)); p-=t*c;
		p.y=abs(p.y);
		p.x-=0.5;t=2.*min(0.,dot(p,c)); p-=t*c;p.x+=0.5;
		p.x-=5./8.;t=2.*min(0.,dot(p,c.xzy)); p-=t*c.xzy;p.x+=5./8.;
		p.x-=1.; p*=SCL; p.x+=1.;
		d*=SCL;
	}
	return (length(p)-1.)/d;
#undef SCL
#undef SHF
}

float DE(vec3 p){
	return Koch3D(p);
}

#preset default
FOV = 0.4
Eye = 2.17954234,0.01615376,1.75765003
Target = -5.60453776,-0.041538237,-4.51967174
Up = -0.523383198,-0.546180062,0.654031624
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
AntiAlias = 1
Detail = -3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 137
BoundingSphere = 12
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.88142293
Specular = 0.3114187
SpecularExp = 56.457565
SpotLight = 1,1,1,1
SpotLightDir = -0.65441176,-0.0367647
CamLight = 1,1,1,0.5
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
BaseColor = 0.690196078,0.690196078,0.690196078
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
Iterations = 10
#endpreset
