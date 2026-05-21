#info fold and cut catalan, some stellations and relatives polyhedra Distance Estimator (knighty 2012)
#define providesInit
#define providesColor
#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO

#include "renderer\DE-kn2.frag"


//To do: add truncation/filling planes at each vertex
//well... in that case I will not display vertices and segments because there will be too many :-/

//To do 2: when the angle between two faces is small we get a quite bad DE. fix it by discarding the obtained DE when the projection of pos onto the face is outside. 

#group polyhedra

// Symmetry group type.
uniform int Type;  slider[3,5,5]

// U scales vertex pab
uniform float U; slider[0,1,1]

// V scales vertex pbc
uniform float V; slider[0,0,1]

// W scales vertex pca
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
	pab=U*pab;
	pbc=V*normalize(pbc);
	pca=W*normalize(pca);
	nor=normalize(cross(pbc-pab,pca-pab));//Our facet is the triangle (pab,pbc,pca) 

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
	return dot(pos,nor)-dot(pab,nor);
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
Eye = -2.17602,-1.16657,0.913272
Target = 5.09762,2.70095,-2.35241
Up = 0.25049,0.133474,0.958874
FocalPlane = 1.75365
Aperture = 0.14
InFocusAWidth = 0.62857
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1.2
Brightness = 1
Contrast = 1.2376
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.69444
BloomPow = 2.4719
BloomTaps = 7
Detail = -3
RefineSteps = 4
FudgeFactor = 1 Locked
MaxRaySteps = 400 Locked
MaxDistance = 109.38
Dither = 0.4386 Locked
NormalBackStep = 1
DetailAO = -1.07142
coneApertureAO = 0.51613
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.88236
SpecularExp = 500
CamLight = 0.741176,0.843137,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.207843,0.298039,0.247059
ReflectionsNumber = 2 Locked
SpotGlow = true
SpotLight = 1,0.976471,0.858824,2
LightPos = -6.129,2.4732,2.6882
LightSize = 0.08911
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 20
BaseColor = 0.776471,0.776471,0.776471
OrbitStrength = 0.80519
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
FloorHeight = -1.0294
FloorColor = 0.0666667,0.0862745,0.101961
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,0
HF_Scatter = 0
HF_Anisotropy = 0.882353,0.784314,0.623529
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Type = 5
U = 0.51471
V = 0.605
W = 1
VRadius = 0.06667
SRadius = 0.02571
displayFaces = true Locked
displaySegments = true Locked
displayVertices = true Locked
facesColor = 0.243137,0.243137,0.454902
verticesColor = 1,0.447059,0.447059
segmentsColor = 0.752941,0.756863,0.411765
#endpreset