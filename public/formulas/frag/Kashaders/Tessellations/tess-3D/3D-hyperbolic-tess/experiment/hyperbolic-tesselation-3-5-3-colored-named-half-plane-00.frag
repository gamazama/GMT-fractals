#version 130
#info 3D hyperbolic tessellation. Coxeter group 3-5-3. Half plane model. Distance Estimator (knighty 2012)
#info Experimental.

#include "MathUtils.frag"
#define providesInit
#define providesColor
#include "DE-Raytracer.frag"

#group Hyperbolic-tesselation
// Iteration number.
uniform int Iterations;  slider[0,10,20]

// U 'barycentric' coordinate for the 'principal' node
uniform float U; slider[0,1,1]

// V
uniform float V; slider[0,0,1]

// W
uniform float W; slider[0,0,1]

// T
uniform float T; slider[0,0,1]

//vertex radius 
uniform float VRadius; slider[0,0.05,0.5]

//segments radius 
uniform float SRadius; slider[0,0.01,0.1]

//If you want to have thickness of vetices and segments not affected by the stereographic projection
uniform bool useUniformRadius; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

uniform float RotAngle; slider[-1,0,1]

//cutting sphere radius
uniform float CSphRad; slider[0,0.75,1]

#group HTess-Color
uniform vec3 segAColor; color[0.0,0.0,0.0]
uniform vec3 segBColor; color[0.0,0.0,0.0]
uniform vec3 segCColor; color[0.0,0.0,0.0]
uniform vec3 segDColor; color[0.0,0.0,0.0]
uniform vec3 verticesColor; color[0.0,0.0,0.0]

//#define PI 3.14159
vec4 nc,nd,p;
float cVR,sVR,tVR,cSR,sSR,tSR,cRA,sRA;
float hdot(vec4 a, vec4 b){//dot product for Minkowski space.
	return dot(a.xyz,b.xyz)-a.w*b.w;
}
vec4 hnormalizew(vec4 v){//normalization of (timelike) vectors in Minkowski space.
	float l=1./sqrt(v.w*v.w-dot(v.xyz,v.xyz));
	return v*l;
}
float hlength(vec4 v){
	return sqrt(abs(hdot(v,v)));
}
void init() {
	float cospin=cos(PI/5.);
	float scospin=sqrt(4./3.*cospin*cospin-3./4.);

	//na and nb are simply vec4(1.,0.,0.,0.) and vec4(0.,1.,0.,0.) respectively
	nc=0.5*vec4(0,-1,sqrt(3.),0.);
	nd=vec4(-0.5,-cospin,-cospin/sqrt(3.),-scospin);

	vec4 pabc,pbdc,pcda,pdba;
	pabc=vec4(0.,0.,0.,0.5*sqrt(3.));
	pbdc=0.5*sqrt(3.)*vec4(scospin,0.,0.,0.5);
	pcda=vec4(0.,0.5*sqrt(3.)*scospin,0.5*scospin,cospin*2./sqrt(3.));
	pdba=vec4(0.,0.,scospin,cospin/sqrt(3.));
	
	p=hnormalizew(U*pabc+V*pbdc+W*pcda+T*pdba);

	cVR=cosh(VRadius);sVR=sinh(VRadius);tVR=sinh(0.5*VRadius)/cosh(0.5*VRadius);
	cSR=cosh(SRadius);sSR=sinh(SRadius);tSR=sinh(0.5*SRadius)/cosh(0.5*SRadius);
	cRA=cosh(RotAngle);sRA=-sinh(RotAngle);
}
uniform vec3 Eye; //slider[(-50,-50,-50),(0,0,-10),(50,50,50)] NotLockable
uniform vec3 Target; //slider[(-50,-50,-50),(0,0,0),(50,50,50)] NotLockable
vec4 Rotate(vec4 p){
	//this is a (hyperbolic) rotation (that is, a boost) on the plane defined by RotVector and w axis
	//We do not need more because the remaining 3 rotation are in our 3D space
	//That would be redundant.
	//This rotation is equivalent to a translation inside the hyperbolic space when the camera is at 0,0,0
	vec4 p1=p;
	vec3 rv;
	rv=normalize(RotVector);
	float vp=dot(rv,p.xyz);
	p1.xyz+=rv*(vp*(cRA-1.)+p.w*sRA);
	p1.w+=vp*sRA+p.w*(cRA-1.);
	return p1;
}

vec4 fold(vec4 pos) {//beside using minkowski dot product, its exactly the same as for euclidean space
	vec4 ap=pos+1.;
	for(int i=0;i<Iterations && any(notEqual(pos,ap));i++){
		ap=pos;
		pos.xy=abs(pos.xy);
		float t=-2.*min(0.,hdot(pos,nc)); pos+=t*nc;
		t=-2.*min(0.,hdot(pos,nd)); pos+=t*nd;
	}
	return pos;
}

float DD(float tha, float r){//converts hyperbolic distance to distance in projection flat space. tha is the hyperbolic tangent of half  the hyperbolic distance which is an "angle".
	return 2.*tha*r/(1+tha);
}

float dist2Vertex(vec4 z, float r){
	float tha=hlength(p-z)/hlength(p+z);
	if(useUniformRadius) return DD(tha,r)-VRadius;
	else return DD((tha-tVR)/(1-tha*tVR),r);
}

float dist2Segment(vec4 z, vec4 n, float r){
	//pmin is the orthogonal projection of z onto the plane defined by p and n
	//then pmin is projected onto the unit sphere
	float zn=hdot(z,n),zp=hdot(z,p),np=hdot(n,p);
	float det=-1./(1.+np*np);
	float alpha=det*(zp-zn*np), beta=det*(-np*zp-zn);
	vec4 pmin=hnormalizew(alpha*p+min(0.,beta)*n);
	float tha=hlength(pmin-z)/hlength(pmin+z);
	if(useUniformRadius) return DD(tha,r)-SRadius;
	else return DD((tha-tSR)/(1-tha*tSR),r);
}
//it is possible to compute the distance to a face just as for segments: pmin will be the orthogonal projection
// of z onto the 3-plane defined by p and two n's (na and nb, na and nc, na and and, nb and nd... and so on).
//that involves solving a system of 3 linear equations.
//it's not implemented here because it is better with transparency

float dist2Segments(vec4 z, float r){
	float da=dist2Segment(z, vec4(1.,0.,0.,0.), r);
	float db=dist2Segment(z, vec4(0.,1.,0.,0.), r);
	float dc=dist2Segment(z, nc, r);
	float dd=dist2Segment(z, nd, r);
	
	return min(min(da,db),min(dc,dd));
}

float DE(vec3 pos) {
	pos.z=abs(pos.z);
	float w=pos.z, r2=dot(pos,pos);
	vec4 z4=vec4(1.-r2,2.*pos.x,2.*pos.y,1+r2)*0.5/w;//Inverse stereographic projection of pos: z4 lies onto the unit 3-parabolid of revolution around w axis centered at 0.
	z4=Rotate(z4);
	z4=fold(z4);
	orbitTrap=z4;
	return min(dist2Vertex(z4,w),dist2Segments(z4,w));
}

vec3 baseColor(vec3 pos, vec3 normal){
	pos.z=abs(pos.z);
	float w=pos.z, r2=dot(pos,pos);
	vec4 z4=vec4(1.-r2,2.*pos.x,2.*pos.y,1+r2)*0.5/w;
	z4=Rotate(z4);
	z4=fold(z4);
	float da=dist2Segment(z4, vec4(1.,0.,0.,0.), w);
	float db=dist2Segment(z4, vec4(0.,1.,0.,0.), w);
	float dc=dist2Segment(z4, nc, w);
	float dd=dist2Segment(z4, nd, w);
	float dv=dist2Vertex(z4,w);
	float d=min(min(min(da,db),min(dc,dd)),dv);
	vec3 color=segAColor;
	if(d==db) color=segBColor;
	if(d==dc) color=segCColor;
	if(d==dd) color=segDColor;
	if(d==dv) color=verticesColor;
	return color;
}

#preset default
FOV = 0.55284
Eye = -4.65274267,-10.4944208,-47.9074118
Target = 1.58883256,8.7797818,-37.7358515
Up = 0.025665038,0.05326914,-0.116689124
EquiRectangular = false
AutoFocus = false
FocalPlane = 1.2544805
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
Detail = -3.53094
DetailAO = -1.57143
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 100
Dither = 0.50877
NormalBackStep = 1
AO = 0,0,0,0.8
Specular = 1
SpecularExp = 44.643
SpecularMax = 10
SpotLight = 1,1,1,0.42308
SpotLightDir = 0.1,-0.9077
CamLight = 1,1,1,2
CamLightMin = 0
Glow = 0,0,0,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 0.694118,0.694118,0.694118
OrbitStrength = 0.31169
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 20
U = 1
V = 0
W = 0
T = 0
VRadius = 0.10113
SRadius = 0.03708
useUniformRadius = false
RotVector = 0,0,1
RotAngle = -0.74684
CSphRad = 0.999
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.847059,0.109804,0.74902
verticesColor = 0.792157,0.607843,0.145098
#endpreset
