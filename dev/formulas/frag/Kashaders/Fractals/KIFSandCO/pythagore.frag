#info pythagore tree 3D

#include "MathUtils.frag"

#define providesInit
#include "DE-Raytracer.frag"

#group pythagore
// Number of fractal iterations.
uniform int Iterations;  slider[0,5,20]
// Mandelbulb exponent (8 is standard)
uniform float Size; slider[0,1,5]
//
uniform float RotAngle; slider[0.00,0,180]

mat2 rot;
uniform float time;
void init() {
	float r=(RotAngle+10.*time)*PI/180.;
	float c=cos(r), s=sin(r);
	 rot = mat2(c,s,-s,c);
}

float DEbox(vec3 p, float a){
	p=abs(p);
	p=p-vec3(a);
	return max(p.x,max(p.y,p.z));
}
float DEpythagore(vec3 p){
	float is=1.;
	float d=DEbox(p,Size);
	vec3 tr=Size*vec3(3.,0.,1.);
	float BVR=8.*Size;
	for (int i=0; i<Iterations; i++){
#if 1
		float rh=dot(p,p)*is*is;
		float lh=d+BVR*is;
		if(rh>lh*lh) break;
#endif
#if 0
		if(dot(p,p)>BVR*BVR*4.){
			float d1=(length(p)-BVR)*is;
			//float t=clamp(d1/(BVR*(sqrt(2.)-1.)), 0.,1.);
			d=min(d,d1);//
			//d=smoothstep(d,d1,t);//
			break;
		}
#endif
		//if(dot(p,p)>100.) break;
		//rotate
		p.xy=rot*p.xy;//vec2(-1.,1.)*p.yx;
		//fold
		p.x=abs(p.x);
		//translate
		p-=tr;
		//rotate
		p.xz=sqrt(.5)*mat2(1.,1.,-1.,1.)*p.xz;
		//scale
		p*=sqrt(2.); is*=sqrt(.5);
		//translate back
		p+=tr;
		//trap
		d=min(d,DEbox(p,Size)*is);
	}
	return d;// min(d,(length(p)-8.*Size)*is);
}
float DE(vec3 p) {
	//return DEbox(p,1.);
	return DEpythagore(p);
}

#preset Default
FOV = 0.4
Eye = -13.85,-7.30586,2.04708
Target = -5.08367,-2.49435,2.04666
Up = -0.00643864,0.0118176,0.999909
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 256
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.97531
Specular = 0.28235
SpecularExp = 9.091
SpecularMax = 7.547
SpotLight = 1,1,1,1
SpotLightDir = -0.375,0.84376
CamLight = 1,1,1,0.84616
CamLightMin = 0.5303
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0.84615
ShadowSoft = 12.5806
Reflection = 0
DebugSun = false
BaseColor = 1,0.647059,0.411765
OrbitStrength = 0
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -1
FloorColor = 0.231373,0.4,0.258824
Iterations = 8
Size = 1
RotAngle = 90
#endpreset
