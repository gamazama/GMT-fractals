#info Stfrac
#info a failed attempt
//#define providesInit
#include "MathUtils.frag"
#include "DE-Raytracer.frag"

#group STfrac

// Number of fractal iterations.
uniform int Iterations;  slider[0,3,100]
uniform float Gap; slider[0.5,1.,2.]

float baseshape(vec3 p, float s){
	p.yz=abs(p.yz);   
	float t = 2. * max(0., dot(p.xy, vec2(-sqrt(3.) * 0.5, 0.5)) );
      p.xy -= t*vec2(-sqrt(3.),1.)*0.5;
	p.y=abs(p.y);
	if(p.y>p.z) p.yz=p.zy;
	p-=s*vec3(0.5*sqrt(3.),1.5,1.5);
	if(p.z>p.x){p.xz=p.zx;}
	if(p.x<0.) return p.x;
	p.yz=max(vec2(0),p.yz);
	return length(p);
}

float STF1(vec3 p){
	float dd=1.;
	for(int i=0; i<Iterations;i++){
		p.yz=abs(p.yz); 
		float t = 2. * max(0., dot(p.xy, vec2(-sqrt(3.) * 0.5, 0.5)) );
		p.xy -= t*vec2(-sqrt(3.),1.)*0.5;
		p.y=abs(p.y);

		p.x-=sqrt(3.)*0.5;
      
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

float STF2(vec3 p){
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
	return STF2(pos);
}

#preset default
FOV = 0.4
Eye = 9.02069345,2.00666871,-3.82104309
Target = 0,0,0
Up = -0.112241259,0.963949893,0.241251953
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
MaxRaySteps = 128
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.74703558
Specular = 0.0899654
SpecularExp = 61.992621
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.55882354,0.16176472
CamLight = 1,1,1,0.22321428
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 1
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
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
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 3
Gap = 1
#endpreset
