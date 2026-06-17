#info Shows how (doubled) Sarti dodecic' singular points line up onto the XXX (nameit pls) polychoron (Which vertices are in the middle of the 120-cell segments)
#info Based on fold and cut regular polychora (stereographic projection) Distance Estimator (knighty 2012)
#define providesInit
#define KN_VOLUMETRIC
//#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#define providesColor

#include "renderer\DE-kn2.frag"


#group polychora

// Symmetry group type.
uniform int Type;  slider[2,5,5]

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

//If you want to dive inside the hypersphere. You will need to set the position of the camera at 0,0,0
uniform bool useCameraAsRotVector; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

uniform float RotAngle; slider[0.00,0,180]

#group Implicit surface parametres
//DE correction param: scaling factor. Better use "FudgeFactor" in "Raytracer" tab
uniform float param1; slider[0,1,1]
//DE correction param: Lipschitzator (lol) factor
uniform float param2; slider[0,4,50]
//Level set
uniform float LevelSet; slider[-1,0,1]

#group polychoraColor
uniform vec3 segAColor; color[0.0,0.0,0.0]
uniform vec3 segBColor; color[0.0,0.0,0.0]
uniform vec3 segCColor; color[0.0,0.0,0.0]
uniform vec3 segDColor; color[0.0,0.0,0.0]
uniform vec3 verticesColor; color[0.0,0.0,0.0]
uniform vec3 SartiColor; color[0.0,0.0,0.0]

vec4 nc,nd,p;
float tVR2,tSR2,cRA,sRA;

void init() {
	float cospin=cos(PI/float(Type));
	float scospin=sqrt(2./3.-cospin*cospin);

	nc=0.5*vec4(0,-1,sqrt(3.),0.);
	nd=vec4(-cospin,-0.5,-0.5/sqrt(3.),scospin);

	vec4 pabc,pbdc,pcda,pdba;
	pabc=vec4(0.,0.,0.,0.5*sqrt(3.));
	pbdc=0.5*sqrt(3.)*vec4(scospin,0.,0.,cospin);
	pcda=vec4(0.,0.5*sqrt(3.)*scospin,0.5*scospin,1./sqrt(3.));
	pdba=vec4(0.,0.,scospin,0.5/sqrt(3.));
	
	p=normalize(V*pabc+U*pbdc+W*pcda+T*pdba);

	tVR2=tan(0.5*VRadius);
	tSR2=tan(0.5*SRadius);
	cRA=cos(RotAngle*PI/180.);sRA=sin(RotAngle*PI/180.);
}
uniform vec3 Eye; //slider[(-50,-50,-50),(0,0,-10),(50,50,50)] NotLockable
uniform vec3 Target; //slider[(-50,-50,-50),(0,0,0),(50,50,50)] NotLockable
vec4 Rotate(vec4 p){
	//this is a rotation on the plane defined by RotVector and w axis
	//We do not need more because the remaining 3 rotation are in our 3D space
	//That would be redundant.
	//This rotation is equivalent to translation inside the hypersphere when the camera is at 0,0,0
	vec4 p1=p;
	vec3 rv;
	if (useCameraAsRotVector) rv=normalize(Eye-Target); else rv=normalize(RotVector);
	float vp=dot(rv,p.xyz);
	p1.xyz+=rv*(vp*(cRA-1.)-p.w*sRA);
	p1.w+=vp*sRA+p.w*(cRA-1.);
	return p1;
}

vec4 fold(vec4 pos) {
	for(int i=0;i<Type*(Type-2);i++){
		pos.xy=abs(pos.xy);
		float t=-2.*min(0.,dot(pos,nc)); pos+=t*nc;
		t=-2.*min(0.,dot(pos,nd)); pos+=t*nd;
	}
	return pos;
}

float DD(float ta, float r){//converts spherical distance to distance in projection flat space. ta the tangent of half the spherical distance which is an angle.
	return (r*r+1.)*ta/(1.+r*ta);
}

float dist2Vertex(vec4 z, float r){
	float ca=dot(z,p), sa=0.5*length(p-z)*length(p+z);
	float ta=sa/(1.+ca);
	
	if(useUniformRadius) return DD(ta,r)-VRadius;
	else return DD((ta-tVR2)/(1.+ta*tVR2),r);
}

float dist2Segment(vec4 z, vec4 n, float r){
	//pmin is the orthogonal projection of z onto the plane defined by p and n
	//then pmin is projected onto the unit sphere
	float zn=dot(z,n),zp=dot(z,p),np=dot(n,p);
	float alpha=zp-zn*np, beta=zn-zp*np;
	vec4 pmin=normalize(alpha*p+min(0.,beta)*n);
	//ta is the tangent of half the angle between z and pmin. This is the spherical distance.
	float ca=dot(z,pmin), sa=0.5*length(pmin-z)*length(pmin+z);
	float ta=sa/(1.+ca);
	if(useUniformRadius) return DD(ta,r)-SRadius;
	else return DD((ta-tSR2)/(1.+ta*tSR2),r);//we subtract the width of the sgment before conversion
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

//------------------------------------------------------------------------
#define Phi (.5*(1.+sqrt(5.)))

#define PHI  1.618034
#define PHI2 2.618034
#define PHI4 6.854102

#define Tau (1.+2.*Phi)

#define Eps 0.00048828125               //epsilon
#define IEps 2048.0                     //Inverse of epsilon

float Sarti12(vec4 p){
	vec4 p2 = p*p;
	vec4 p4 = p2*p2;
	float l1 = dot(p2,p2);
	float l2 = p2.x*p2.y+p2.z*p2.w;
	float l3 = p2.x*p2.z+p2.y*p2.w;
	float l4 = p2.y*p2.z+p2.x*p2.w;
	float l5 = p.x*p.y*p.z*p.w;
	float s10 = l1*(l2*l3+l2*l4+l3*l4), s11 = l1*l1*(l2+l3+l4);
	float s12=l1*(l2*l2+l3*l3+l4*l4),    s51=l5*l5*(l2+l3+l4),  s234=l2*l2*l2+l3*l3*l3+l4*l4*l4;
	float s23p=l2*(l2+l3)*l3,   s23m=l2*(l2-l3)*l3; 
	float s34p=l3*(l3+l4)*l4,       s34m=l3*(l3-l4)*l4; 
	float s42p=l4*(l4+l2)*l2,       s42m=l4*(l4-l2)*l2;
	float Q12=dot(p,p); Q12=Q12*Q12*Q12; Q12=Q12*Q12; 
	float S12=33.*sqrt(5.)*(s23m+s34m+s42m)+19.*(s23p+s34p+s42p)+10.*s234-14.*s10+2.*s11-6.*s12-352.*s51+336.*l5*l5*l1+48.*l2*l3*l4;
	return 22.*Q12-243.*S12;
}

vec4 Trans(vec3 z){
	vec4 p = vec4(z,0.);
	float r2 = dot(p.xyz,p.xyz);
	p.xyz *= 2./(r2+1.);
	p.w = (1.-r2)/(1.+r2);
	return p;
}
float Fn(vec3 p)
{
	return Sarti12(Trans(p));
}

float DESarti(vec3 z)
{
	float v =Fn(z);
	float dv=length(IEps*(vec3(Fn(z+vec3(Eps,0.,0.)),Fn(z+vec3(0.,Eps,0.)),Fn(z+vec3(0.,0.,Eps)))-vec3(v)));
	v-= LevelSet;
	float k = 1.-1./(abs(v)+1.);
	v=param1*abs(v)/(dv+1.*param2*k+.001);//adding 0.01 in case the gradient is zero on the isosurface
	return v;
}
//------------------------------------------------------------------------

float DE(vec3 pos) {
	float r=length(pos);
	vec4 z4=vec4(2.*pos,1.-r*r)*1./(1.+r*r);//Inverse stereographic projection of pos: z4 lies onto the unit 3-sphere centered at 0.
	z4=Rotate(z4);
	z4=fold(z4);
	orbitTrap=z4;
	float depolyc = min(dist2Vertex(z4,r),dist2Segments(z4, r));
	float deSarti = DESarti(pos);
	return min(deSarti,depolyc);
}

vec3 baseColor(vec3 pos, vec3 normal){
	float deSarti = DESarti(pos);

	float r=length(pos);
	vec4 z4=vec4(2.*pos,1.-r*r)*1./(1.+r*r);//Inverse stereographic projection of pos: z4 lies onto the unit 3-sphere centered at 0.
	z4=Rotate(z4);
	z4=fold(z4);
	float da=dist2Segment(z4, vec4(1.,0.,0.,0.), r);
	float db=dist2Segment(z4, vec4(0.,1.,0.,0.), r);
	float dc=dist2Segment(z4, nc, r);
	float dd=dist2Segment(z4, nd, r);
	float dv=dist2Vertex(z4,r);
	float d=min(min(min(da,db),min(dc,dd)),dv);
	d=min(d,deSarti);
	vec3 color=segAColor;
	if(d==db) color=segBColor;
	if(d==dc) color=segCColor;
	if(d==dd) color=segDColor;
	if(d==dv) color=verticesColor;
	if(d==deSarti) color=SartiColor;
	return color;
}

#preset Default
FOV = 0.4
Eye = -5.44352,-14.3471,-7.95642
Target = -0.606664,-0.4978,0.00885423
Up = -0.289125,0.940662,-0.177658
FocalPlane = 15.7044
Aperture = 0.145
InFocusAWidth = 0.14286
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 0.64287
Brightness = 1
Contrast = 1.0891
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 4
FudgeFactor = 1 Locked
MaxRaySteps = 300 Locked
MaxDistance = 109.38
Dither = 0.5 Locked
NormalBackStep = 1
DetailAO = -0.92855
coneApertureAO = 0.80645
maxIterAO = 30
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.05882
SpecularExp = 145.835
CamLight = 1,0.827451,0.768627,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,4.3548
LightPos = -10,-7.6344,0
LightSize = 0.08911
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 1,1,1
OrbitStrength = 0.41558
X = 0.411765,0.6,0.560784,0.41748
Y = 0.666667,0.666667,0.498039,-0.16504
Z = 1,0.258824,0.207843,1
R = 0.0823529,0.278431,1,0.82352
BackgroundColor = 0.298039,0.337255,0.4
GradientBackground = 1.41305
CycleColors = true
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
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
U = 0
V = 1
W = 0
T = 0
VRadius = 0.01905
SRadius = 0.00476
useUniformRadius = false
useCameraAsRotVector = false
RotVector = 0,0,1
RotAngle = 69.0876
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.254902,0.211765,0.847059
verticesColor = 0.792157,0.607843,0.145098
param1 = 1
param2 = 4
LevelSet = 0
SartiColor = 0.27451,0.576471,0.372549
#endpreset

#preset PerfectMatch
FOV = 0.4
Eye = -5.25457,-13.8491,-7.68024
Target = 0.188955,0.498015,0.276183
Up = -0.277722,0.944091,-0.177658
FocalPlane = 15.7044
Aperture = 0.46988
InFocusAWidth = 0.28302
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 0.70371
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -4
RefineSteps = 4
FudgeFactor = 1 Locked
MaxRaySteps = 300 Locked
MaxDistance = 109.38
Dither = 0.5 Locked
NormalBackStep = 1
DetailAO = -2.5
coneApertureAO = 0.87097
maxIterAO = 30
AO_ambient = 1
AO_camlight = 0.21686
AO_pointlight = 0
AoCorrect = 0
Specular = 0.05882
SpecularExp = 444.445
CamLight = 1,0.827451,0.768627,0.11594
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.101961,0.101961,0.101961
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,1,1,4
LightPos = -2.9032,-7.4194,-9.1398
LightSize = 0.08911
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.807843,0.807843,0.807843
OrbitStrength = 0.50649
X = 0.411765,0.6,0.560784,0.41748
Y = 0.666667,0.666667,0.498039,-0.16504
Z = 1,0.258824,0.207843,1
R = 0.0823529,0.278431,1,0.82352
BackgroundColor = 0.239216,0.301961,0.4
GradientBackground = 1
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.30537
HF_Const = 0
HF_Intensity = 0.07813
HF_Dir = -1,1,-0.97778
HF_Offset = -6.3636
HF_Color = 0.380392,0.521569,0.705882,0.51924
HF_Scatter = 1.3636
HF_Anisotropy = 0.211765,0.188235,0.14902
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
U = 0
V = 1
W = 0
T = 0
VRadius = 0.01905
SRadius = 0.00476
useUniformRadius = false
useCameraAsRotVector = false
RotVector = 0,0,1
RotAngle = 69.0876
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.254902,0.211765,0.847059
verticesColor = 0.792157,0.607843,0.145098
param1 = 1
param2 = 4
LevelSet = 0
SartiColor = 0.27451,0.576471,0.372549
#endpreset
