#info fold and cut stellations of the dodecahedron. Distance Estimator (knighty 2012)
#info Snub variants are more involved

#include "MathUtils.frag"
#define providesInit
#define providesColor
#include "DE-Raytracer.frag"

#group polyhedra

// Stellation iterations.
uniform int Iter;  slider[0,1,4]


//#define PI 3.14159
vec3 nc,p;
vec4 pab,pbc,pca;
void init() {
	float cospin=cos(PI/5.), scospin=sqrt(0.75-cospin*cospin);
	nc=vec3(-0.5,-cospin,scospin);
	pab=vec4(0.,0.,1.,0.);
	pbc=vec4(scospin,0.,0.5,0.);
	pca=vec4(0.,scospin,cospin,0.);
	p=normalize(pca.xyz);
	pbc.xyz=normalize(pbc.xyz);	
	pbc.w=-dot(pbc.xyz,p);
	
	//fold the faces planes
	float t;
	if(Iter<1) return;
	pbc.x=-pbc.x;//1st
	if(Iter<2) return;
	t=-2.*dot(pbc.xyz,nc); pbc.xyz+=t*nc;//2nd
	if(Iter<3) return;
	pbc.y=-pbc.y;//3rd
	if(Iter<4) return;
	t=-2.*dot(pbc.xyz,nc); pbc.xyz+=t*nc;//infinite
}

vec3 fold(vec3 pos) {
	for(int i=0;i<3;i++){
		pos=abs(pos);
		float t=-2.*min(0.,dot(pos,nc));
		pos+=t*nc;
	}
	return pos;
}

float D2Planes(vec3 pos) {
	vec4 z=vec4(pos,1.);
	return dot(z,pbc);
}

float DE(vec3 pos) {
	pos=fold(pos);
	return D2Planes(pos);
}

vec3 baseColor(vec3 pos, vec3 normal){
	return  (normal+1.5)*0.5;//face0Color;
}

#preset default
FOV = 0.62536
Eye = -9.87855,-2.41697,-3.99936
Target = -1.86956,-0.462774,-0.748919
Up = 0.358736,-0.793231,-0.49203
AntiAlias = 1
Detail = -3
DetailAO = -1.57143
FudgeFactor = 1
MaxRaySteps = 88
BoundingSphere = 5
Dither = 0.4386
NormalBackStep = 1
AO = 0,0,0,0.90123
Specular = 4
SpecularExp = 40
SpotLight = 1,1,1,0.75
SpotLightDir = 0.6923,0.78462
CamLight = 1,0.827451,0.768627,0.6415
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 8.254
Reflection = 0
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.37662
X = 0.411765,0.6,0.560784,0.41748
Y = 0.666667,0.666667,0.498039,-0.16504
Z = 1,0.258824,0.207843,1
R = 0.0823529,0.278431,1,0.82352
BackgroundColor = 0.501961,0.737255,0.956863
GradientBackground = 0.86955
CycleColors = true
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iter = 1
#endpreset