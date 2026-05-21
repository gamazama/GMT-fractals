#info CrossMenger
#include "MathUtils.frag"
#include "DE-Raytracer.frag"

#group CrossMenger
// Number of fractal iterations.
uniform int Iterations;  slider[0,3,100]
uniform float Gap; slider[0.,1.,1.]
uniform bool KIFS; checkbox[false]

float baseshape(vec3 p, float s){
	p.yz=abs(p.yz);   
	float t = 2. * max(0., dot(p.xy, vec2(-sqrt(3.) * 0.5, 0.5)) );
      p.xy -= t*vec2(-sqrt(3.),1.)*0.5;
	p.y=abs(p.y);
	if(p.y>p.z) p.yz=p.zy;
	p-=s*vec3(0.5*sqrt(3.),1.5,1.5);
	if(p.z>p.x){p.xz=p.zx;}
	if(p.x<0.) return p.x;
	p.yz=max(vec2(0.),p.yz);
	return length(p);
}

float CrossMengerTrick(vec3 p){//use Msltoe's method. Gives correct result but the DE is discontinuous
	float dd=1.;
	for(int i=0; i<Iterations;i++){
		p.yz=abs(p.yz); 
		float t = 2. * max(0., dot(p.xy, vec2(-sqrt(3.) * 0.5, 0.5)) );
		p.xy -= t*vec2(-sqrt(3.),1.)*0.5;
		p.y=abs(p.y);

		p.x-=sqrt(3.)*0.5;
      
		//Choose nearest corner/edge --> to get translation symmetry
		float dy=0., dz=0.;
		if(p.y>0.5 && p.z>0.5){dy=1.5; dz=1.5;}
		else if((p.y-1.5)*(p.y-1.5)+p.z*p.z<p.y*p.y+(p.z-1.5)*(p.z-1.5)) dy=1.5;
		else dz=1.5;
      
		p.y-=dy; p.z-=dz;
		p*=3.;
		dd*=1./3.;
		p.y+=dy; p.z+=dz;
      
		p.x+=sqrt(3.)*0.5;
	}
	return dd*baseshape(p,Gap);
}

float CrossMengerKIFS(vec3 p){//Pure KIFS... almost correct
	float dd=1.;
	for(int i=0; i<Iterations;i++){
		p.yz=abs(p.yz); 
		float t = 2. * max(0., dot(p.xy, vec2(-sqrt(3.) * 0.5, 0.5)) );
		p.xy -= t*vec2(-sqrt(3.),1.)*0.5;
		p.y=abs(p.y);
		if(p.y>p.z) p.yz=p.zy;
		p.y=abs(p.y-0.5)+0.5;
		p-=vec3(0.5*sqrt(3.),1.5,1.5);
		
		p*=3.;
		dd*=1./3.;
		p+=vec3(0.5*sqrt(3.),1.5,1.5);
	}
	return dd*baseshape(p,Gap);
}

float DE(vec3 pos) {
	if(KIFS) 	return CrossMengerKIFS(pos);
	return CrossMengerTrick(pos);
}
#preset default
FOV = 0.4
Eye = -4.93555818,5.61821679,6.63896871
Target = 0,0,0
Up = -0.84975832,-0.474098445,-0.230524324
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
AO = 0,0,0,0.699999988
Specular = 0.01730104
SpecularExp = 100
SpecularMax = 1.486989
SpotLight = 1,1,1,1
SpotLightDir = 0.25735296,0.61029414
CamLight = 1,1,1,0.24107144
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 0.77254902,0.77254902,0.77254902
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
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 3
Gap = 1
KIFS = false
#endpreset
