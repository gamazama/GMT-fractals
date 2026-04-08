#info fold and cut uniform polyhedra Distance Estimator (knighty 2012)
#info Snub variants are more involved

#include "MathUtils.frag"
#define providesInit
#define providesColor
#include "DE-Raytracer.frag"


#group polyhedra

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
vec3 nc,p,pab,pbc,pca;
void init() {
	float cospin=cos(PI/float(Type)), scospin=sqrt(0.75-cospin*cospin);
	nc=vec3(-0.5,-cospin,scospin);
	pab=vec3(0.,0.,1.);
	pbc=vec3(scospin,0.,0.5);//No normalization in order to have 'barycentric' coordinates work evenly
	pca=vec3(0.,scospin,cospin);
	p=normalize((U*pab+V*pbc+W*pca));//U,V and W are the 'barycentric' coordinates (coted barycentric word because I'm not sure if they are really barycentric... have to check)
	pbc=normalize(pbc);	pca=normalize(pca);//for slightly better DE. In reality it's not necesary to apply normalization :) 
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
	float d0=dot(pos,pab)-dot(pab,p);
	float d1=dot(pos,pbc)-dot(pbc,p);
	float d2=dot(pos,pca)-dot(pca,p);
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
	pos=fold(pos);
	float d=10000.;
	if(displayFaces) d=min(d,D2Planes(pos));
	if(displaySegments) d=min(d,D2Segments(pos));
	if(displayVertices) d=min(d,D2Vertices(pos));
	return d;
}

vec3 baseColor(vec3 pos, vec3 normal){//corrected. Not optimized.
	pos=fold(pos);
	float d0=1000.0,d1=1000.0,d2=1000.,df=1000.,dv=1000.,ds=1000.;
	if(displayFaces){
		d0=dot(pos,pab)-dot(pab,p);
		d1=dot(pos,pbc)-dot(pbc,p);
		d2=dot(pos,pca)-dot(pca,p);
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
FOV = 0.62536
Eye = -3.93125,-0.6209,-1.09577
Target = 4.50466,0.697037,1.2763
Up = 0.244725,-0.81477,-0.525603
AntiAlias = 1
Detail = -3
DetailAO = -1.57143
FudgeFactor = 1
MaxRaySteps = 88
BoundingSphere = 2
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
Type = 5
U = 1
V = 1
W = 0
VRadius = 0.08427
SRadius = 0.02921
displayFaces = true
displaySegments = true
displayVertices = true
face0Color = 0.796078,0.611765,0.172549
face1Color = 0.164706,0.74902,0.12549
face2Color = 0.164706,0.305882,0.764706
verticesColor = 1,0,0
segmentsColor = 0.25098,0.760784,0.490196
#endpreset

#preset Fullerene
FOV = 0.62536
Eye = -0.344315,3.62372,1.72496
Target = 0.438701,-4.34644,-2.0687
Up = 0.0401814,-0.331712,0.942525
Detail = -3
DetailAO = -1.57143
FudgeFactor = 1
MaxRaySteps = 200
Dither = 0.4386
NormalBackStep = 1
AO = 0,0,0,0.90123
SpecularExp = 100
SpotLight = 1,1,1,0.32692
SpotLightDir = 0.2923,0.44616
CamLight = 1,0.827451,0.768627,0.6415
CamLightMin = 0
Glow = 1,1,1,0 Locked
GlowMax = 20 Locked
Fog = 0
HardShadow = 0.59091
ShadowSoft = 3.8096
Reflection = 0.12658
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
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = -1.0714
FloorColor = 0.741176,0.741176,0.741176
Type = 5
U = 1
V = 1
W = 0
VRadius = 0.08427
SRadius = 0.02921
displayFaces = false
displaySegments = true
displayVertices = true
face0Color = 0.796078,0.611765,0.172549
face1Color = 0.164706,0.74902,0.12549
face2Color = 0.164706,0.305882,0.764706
verticesColor = 1,0,0
segmentsColor = 0.25098,0.760784,0.490196
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Specular = 0.4
SpecularMax = 2
DebugSun = false
#endpreset
