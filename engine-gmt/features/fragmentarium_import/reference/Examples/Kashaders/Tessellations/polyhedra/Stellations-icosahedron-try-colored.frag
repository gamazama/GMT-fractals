#info fold and cut stellations of the icosahedron Distance Estimator (knighty 2012)
#info Snub variants are more involved
#info The principle is simple: mirror the faces about the fundamental domain planes but there are many many possible combinations (some of them give the same result)

#include "MathUtils.frag"
#define providesInit
#define providesColor
#include "DE-Raytracer.frag"

#group polyhedra

// Symmetry group type.
uniform int Type;  slider[3,5,5]


//#define PI 3.14159
vec3 nc,p;
vec4 pab,pbc,pca;
void init() {
	float cospin=cos(PI/float(Type)), scospin=sqrt(0.75-cospin*cospin);
	nc=vec3(-0.5,-cospin,scospin);
	pab=vec4(0.,0.,1.,0.);
	pbc=vec4(scospin,0.,0.5,0.);//No normalization in order to have 'barycentric' coordinates work evenly
	pca=vec4(0.,scospin,cospin,0.);
	p=normalize(pbc.xyz);
	pca.xyz=normalize(pca.xyz);
	pca.w=-dot(pca.xyz,p);
	
	//fold the faces planes
	//just add or remove some folds
	float t;
	pab=pca;
	pbc=pca;
	pab.y=-pab.y;//1st
	t=-2.*dot(pab.xyz,nc); pab.xyz+=t*nc;//2nd
	pbc=pab; pbc.x=-pbc.x; pab.y=-pab.y;//3rd
	t=-2.*dot(pab.xyz,nc); pab.xyz+=t*nc;//4th
	//pbc.y=-pbc.y;
}

vec3 fold(vec3 pos) {
	for(int i=0;i<Type;i++){
		pos.xy=abs(pos.xy);
		float t=-2.*min(0.,dot(pos,nc));
		pos+=t*nc;
	}
	return pos;
}

float D2Planes(vec3 pos) {
	vec4 z=vec4(pos,1.);
	float d0=dot(z,pab);
	float d1=dot(z,pbc);
	float d2=dot(z,pca);
	//return d1;
	//return max(d0,d1);
	return min(d0,d1);
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
Eye = 5.0924,9.63335,2.25824
Target = 1.11264,2.24678,-0.592791
Up = -0.161543,-0.28039,0.946195
AntiAlias = 1
Detail = -3
DetailAO = -0.92855
FudgeFactor = 1
MaxRaySteps = 88
BoundingSphere = 7.547
Dither = 0.4386
NormalBackStep = 1
AO = 0,0,0,0.7561
Specular = 4.875
SpecularExp = 40
SpotLight = 1,1,1,0.32692
SpotLightDir = -0.6923,-0.26154
CamLight = 1,0.827451,0.768627,0.60378
CamLightMin = 0.22388
Glow = 1,1,1,0 Locked
GlowMax = 20 Locked
Fog = 0.23854
HardShadow = 0
ShadowSoft = 8.254
Reflection = 0.36709
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.79221
X = 0.411765,0.6,0.560784,0.41748
Y = 0.666667,0.666667,0.498039,-0.16504
Z = 1,0.258824,0.207843,1
R = 0.0823529,0.278431,1,0.82352
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = true
Cycles = 4.04901
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -3.7287
FloorColor = 1,1,1
Type = 5
#endpreset