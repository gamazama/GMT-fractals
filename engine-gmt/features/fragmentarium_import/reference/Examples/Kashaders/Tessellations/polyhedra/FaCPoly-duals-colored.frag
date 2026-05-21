#info duals of uniform (regular and quasi-regular -and inbetween-) polyhedra
#info also called catalan solids
#info Distance Estimator using fold and cut technique (knighty 2012)

#include "MathUtils.frag"
#define providesInit
#define providesColor
#include "DE-Raytracer.frag"

#group polyhedra

// Symmetry group type.
uniform int Type;  slider[3,5,5]

// U "barycentric" coordinate for the normal of the face plane
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
uniform vec3 facesColor; color[0.0,0.0,0.0]
uniform vec3 verticesColor; color[0.0,0.0,0.0]
uniform vec3 segmentsColor; color[0.0,0.0,0.0]

//#define PI 3.14159
float dissolveFn(float dott, float mu, float su){
	//return 0.9-pow(1.-abs(dott),20.);
	return clamp(abs(dott)*mu-su,0.,1.);
}
vec3 nc,pab,pbc,pca,nor;
float sva,svb,svc;
void init() {
	float cospin=cos(PI/float(Type)), scospin=sqrt(0.75-cospin*cospin);
	nc=vec3(-0.5,-cospin,scospin);
	pab=vec3(0.,0.,1.);
	pbc=vec3(scospin,0.,0.5);
	pca=vec3(0.,scospin,cospin);
	nor=normalize(U*pab+V*pbc+W*pca);
	pab=pab/dot(nor,pab);
	pbc=pbc/dot(nor,pbc);
	pca=pca/dot(nor,pca);

	//segment visibility: if facet plane is perpendicular to folding plane corresponding to our segment it should not be displayed
#define MU 10.
#define SU 0.01
	sva=dissolveFn(nor.x,MU,SU);
	svb=dissolveFn(nor.y,MU,SU);
	svc=dissolveFn(dot(nor,nc),MU,SU);
	// For vertices, a vertex is visible if one of the corresponding segments is visible with one exception: 
	// Folding planes at PAB (na and nb which are implicit here because their componenets are 
	//respectively (1,0,0) and (0,1,0)) are perpendicular to each other. This imply that the vertex PAB is visible when both
	//corresponding segments are. 
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
	return dot(pos,nor)-1.;
}

float D2Segment(vec3 pos, vec3 pa, vec3 pb) {//gives distance from pos to the sgment (pa,pb).
	return length((pos-pa)-(pb-pa)*clamp(dot(pos-pa,pb-pa)/dot(pb-pa,pb-pa),0.,1.));
}

float D2Segments(vec3 pos) {
	float d=10000.;
	if(sva>0.) d=min(d,D2Segment(pos, pab, pca)-SRadius*sva);
	if(svb>0.) d=min(d,D2Segment(pos, pbc, pab)-SRadius*svb);
	if(svc>0.) d=min(d,D2Segment(pos, pca, pbc)-SRadius*svc);
	return d;
}

float D2Vertices(vec3 pos) {
	float d=10000.;
	if(min(sva,svb)>0.) d=min(d,length(pos-pab)-VRadius*min(sva,svb));
	if(max(svb,svc)>0.) d=min(d,length(pos-pbc)-VRadius*max(svb,svc));
	if(max(svc,sva)>0.) d=min(d,length(pos-pca)-VRadius*max(svc,sva));
	return d;
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
	float df=1000.,dv=1000.,ds=1000.;
	if(displayFaces)	df=D2Planes(pos);
	if(displaySegments) ds=D2Segments(pos);
	if(displayVertices) dv=D2Vertices(pos);
	float d=min(df,min(ds,dv));
	vec3 col=facesColor;
	if(d==ds) col=segmentsColor;
	if(d==dv) col=verticesColor;
	return col;
}

#preset default
FOV = 0.62536
Eye = -3.20087,-2.1931,1.08181
Target = 3.70097,2.60688,-1.72051
Up = 0.253289,0.177444,0.927765
AntiAlias = 1
Detail = -3
DetailAO = -1.57143
FudgeFactor = 1
MaxRaySteps = 100
BoundingSphere = 3
Dither = 0.4386
NormalBackStep = 1
AO = 0,0,0,0.90123
Specular = 4
SpecularExp = 40
SpotLight = 1,1,1,0.51923
SpotLightDir = 0.6923,0.78462
CamLight = 1,0.827451,0.768627,0.49056
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 8.254
Reflection = 0.
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.42857
X = 0.411765,0.6,0.560784,0.41748
Y = 0.666667,0.666667,0.498039,-0.16504
Z = 1,0.258824,0.207843,1
R = 0.0823529,0.278431,1,0.82352
BackgroundColor = 0.501961,0.737255,0.956863
GradientBackground = 0.86955
CycleColors = true
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = -0.9335
FloorColor = 1,1,1
Type = 5
U = 1
V = 0
W = 0
VRadius = 0.05
SRadius = 0.025
displayFaces = true
displaySegments = true
displayVertices = true
facesColor = 0.243137,0.211765,0.694118
verticesColor = 1,0,0
segmentsColor = 0.74902,0.756863,0.172549
#endpreset