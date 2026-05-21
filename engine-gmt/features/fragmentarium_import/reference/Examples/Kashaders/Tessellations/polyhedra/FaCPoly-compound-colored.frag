#info fold and cut compound polyhedra Distance Estimator (knighty 2012)
#info only those with full mirror symmetry
#info Game: find the right parameters for them

#include "MathUtils.frag"
#define providesInit
#define providesColor
#include "DE-Raytracer.frag"

#group polyhedra

// First fold Symmetry group type.
uniform int FType;  slider[3,5,5]

//Rotation axis
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

//Rotation angle
uniform float RotAngle; slider[0.00,0,180]


// Symmetry group type.
uniform int Type;  slider[3,5,5]

// U 'barycentric' coordinate for the vertex
//use combinations of 0's and 1's for uniform polyhedra
uniform float U; slider[0,1,1]

// V
uniform float V; slider[0,0,1]

// W
uniform float W; slider[0,0,1]

//vertex radius 
uniform float VRadius; slider[0,0.05,0.5]

//segments radius 
uniform float SRadius; slider[0,0.01,0.1]

uniform bool displayFaces; checkbox[true]
uniform bool displaySegments; checkbox[true]
uniform bool displayVertices; checkbox[true]

#group polyhedraColor
uniform vec3 face0Color; color[0.0,0.0,0.0]
uniform vec3 face1Color; color[0.0,0.0,0.0]
uniform vec3 face2Color; color[0.0,0.0,0.0]
uniform vec3 verticesColor; color[0.0,0.0,0.0]
uniform vec3 segmentsColor; color[0.0,0.0,0.0]

//#define PI 3.14159
vec3 fnc,nc,p;
vec4 pab,pbc,pca;
mat3 rot;
void init() {
	rot = rotationMatrix3(normalize(RotVector), RotAngle);
	float cospin=cos(PI/float(Type)), scospin=sqrt(0.75-cospin*cospin);
	nc=vec3(-0.5,-cospin,scospin);
	pab=vec4(0.,0.,1.,0.);
	pbc=vec4(scospin,0.,0.5,0.);//No normalization in order to have 'barycentric' coordinates work evenly
	pca=vec4(0.,scospin,cospin,0.);
	p=normalize((U*pab+V*pbc+W*pca).xyz);//U,V and W are the 'barycentric' coordinates (coted barycentric word because I'm not sure if they are really barycentric... have to check)
	pbc.xyz=normalize(pbc.xyz);	pca.xyz=normalize(pca.xyz);//for slightly better DE. In reality it's not necesary to apply normalization :) 
	pab.w=-dot(pab.xyz,p);pbc.w=-dot(pbc.xyz,p);pca.w=-dot(pca.xyz,p);
	
	//first fold
	cospin=cos(PI/float(FType)), scospin=sqrt(0.75-cospin*cospin);
	fnc=vec3(-0.5,-cospin,scospin);
}

vec3 fFold(vec3 pos) {
	for(int i=0;i<FType;i++){
		pos.xy=abs(pos.xy);
		float t=-2.*min(0.,dot(pos,fnc));
		pos+=t*fnc;
	}
	return pos;
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
	return max(max(d0,d1),d2);
}

float D2Segments(vec3 pos) {
	pos-=p;
	float dla=length(pos-min(0.,pos.x)*vec3(1.,0.,0.));
	float dlb=length(pos-min(0.,pos.y)*vec3(0.,1.,0.));
	float dlc=length(pos-min(0.,dot(pos,nc))*nc);
	return min(min(dla,dlb),dlc)-SRadius;
}

float D2Vertices(vec3 pos) {
	return length(pos-p)-VRadius;
}

float DE(vec3 pos) {
	pos=fFold(pos);
	pos=rot*pos;
	pos=fold(pos);
	float d=10000.;
	if(displayFaces) d=min(d,D2Planes(pos));
	if(displaySegments) d=min(d,D2Segments(pos));
	if(displayVertices) d=min(d,D2Vertices(pos));
	return d;
}

vec3 baseColor(vec3 pos, vec3 normal){//corrected. Not optimized.
	pos=fFold(pos);
	pos=rot*pos;
	pos=fold(pos);
	float d0=1000.0,d1=1000.0,d2=1000.,df=1000.,dv=1000.,ds=1000.;
	if(displayFaces){
		vec4 z=vec4(pos,1.);
		d0=dot(z,pab);
		d1=dot(z,pbc);
		d2=dot(z,pca);
		df=max(max(d0,d1),d2);
	}
	if(displaySegments) ds=D2Segments(pos);
	if(displayVertices) dv=D2Vertices(pos);
	float d=min(df,min(ds,dv));
	vec3 col=face0Color;
	if(d==df){
		if(d==d1) col=face1Color;
		if(d==d2) col=face2Color;
	}else{
		if(d==ds) col=segmentsColor;
		if(d==dv) col=verticesColor;
	}
	return col;
}

#preset default
FOV = 0.1626
Eye = 4.94165,2.01024,6.51372
Target = -0.259407,-0.408874,-0.309992
Up = -0.050955,0.998299,-0.0283285
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -4
DetailAO = -0.85715
FudgeFactor = 1
MaxRaySteps = 128
Dither = 0.4386
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.03488
SpecularMax = 22.222
SpotLight = 1,1,1,1
SpotLightDir = 0.63076,0.41538
CamLight = 1,0.827451,0.768627,0.56604
CamLightMin = 0.13433
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 1
ShadowSoft = 20
Reflection = 0.16456 NotLocked
DebugSun = false
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.49351
X = 0.411765,0.6,0.560784,0.41748
Y = 0.666667,0.666667,0.498039,-0.16504
Z = 1,0.258824,0.207843,1
R = 0.0823529,0.278431,1,0.82352
BackgroundColor = 0.501961,0.737255,0.956863
GradientBackground = 0.86955
CycleColors = true
Cycles = 4.04901
EnableFloor = true
FloorNormal = 0,1,0
FloorHeight = -1.0714
FloorColor = 0.54902,0.509804,0.415686
FType = 5
RotVector = 1,0,0
RotAngle = 55.0062
Type = 4
U = 0
V = 1
W = 0.28205
VRadius = 0.08989
SRadius = 0.02584
displayFaces = true
displaySegments = true
displayVertices = true
face0Color = 0.796078,0.611765,0.172549
face1Color = 0.164706,0.74902,0.12549
face2Color = 0.164706,0.305882,0.764706
verticesColor = 1,0,0
segmentsColor = 0.113725,0.392157,0.109804
FocalPlane = 7.8
Aperture = 0.14881
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = true
SpecularExp = 125
ReflectionsNumber = 2
#endpreset