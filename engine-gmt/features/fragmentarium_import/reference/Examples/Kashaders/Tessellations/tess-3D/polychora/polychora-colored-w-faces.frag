#version 110
#info fold and cut regular polychora (stereographic projection) Distance Estimator (knighty 2012)
#info update (april 2018): added faces. Still some work to do for coloring, optimization and transparency 

#include "MathUtils.frag"
#define providesInit
#define providesColor
#include "DE-Raytracer.frag"

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

#group polychoraColor
uniform vec3 segAColor; color[0.0,0.0,0.0]
uniform vec3 segBColor; color[0.0,0.0,0.0]
uniform vec3 segCColor; color[0.0,0.0,0.0]
uniform vec3 segDColor; color[0.0,0.0,0.0]
uniform vec3 verticesColor; color[0.0,0.0,0.0]
uniform vec3 facesColor; color[0.3,0.3,0.3]

#group faceSet 
uniform bool showFace1; checkbox[false]
uniform bool showFace2; checkbox[false]
uniform bool showFace3; checkbox[false]
uniform bool showFace4; checkbox[false]
uniform bool showFace5; checkbox[false]
uniform bool showFace6; checkbox[false]


//#define PI 3.14159
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

//Apply folds to transport pos to the fundamental domain
vec4 fold(vec4 pos) {
	for(int i=0;i<Type*(Type-2);i++){
		pos.xy=abs(pos.xy);
		float t=-2.*min(0.,dot(pos,nc)); pos+=t*nc;
		t=-2.*min(0.,dot(pos,nd)); pos+=t*nd;
	}
	return pos;
}

//converts spherical distance to distance in projection flat space. ta the tangent of half the spherical distance which is an angle.
float DD(float ta, float r){
	return (r*r+1.)*ta/(1.+r*ta);
}

//Given the tangent of the spherical distance, apply thickness and convert to DE
float getFinalDE(float ta, float Radius, float tR2, float r){
	if(useUniformRadius) return DD(ta,r)-Radius;
	else return DD((ta-tR2)/(1.+ta*tR2),r);
}

//Returns the tangent of the spherical distance to the vertex
float dist2Vertex(vec4 z){
	float ca=dot(z,p), sa=0.5*length(p-z)*length(p+z);
	float ta=sa/(1.+ca);
	return ta;
}

float dist2Vertices(vec4 z, float r){
	//float ca=dot(z,p), sa=0.5*length(p-z)*length(p+z);
	//float ta=sa/(1.+ca);
	float ta = dist2Vertex(z);
	
	//if(useUniformRadius) return DD(ta,r)-VRadius;
	//else return DD((ta-tVR2)/(1.+ta*tVR2),r);
	return getFinalDE(ta, VRadius, tVR2, r);
}

//Returns the tangent of the spherical distance to the segment defined by p and n
float dist2Segment(vec4 z, vec4 n){
	//pmin is the orthogonal projection of z onto the plane defined by p and n
	//then pmin is projected onto the unit sphere
	float zn=dot(z,n),zp=dot(z,p),np=dot(n,p);
	float alpha=zp-zn*np, beta=zn-zp*np;
	vec4 pmin=normalize(alpha*p+min(0.,beta)*n);
	//ta is the tangent of half the angle between z and pmin. This angle is the spherical distance.
	float ca=dot(z,pmin), sa=0.5*length(pmin-z)*length(pmin+z);
	float ta=sa/(1.+ca);
	return ta;
}

float dist2Segments(vec4 z, float r){
	float da=dist2Segment(z, vec4(1.,0.,0.,0.));
	float db=dist2Segment(z, vec4(0.,1.,0.,0.));
	float dc=dist2Segment(z, nc);
	float dd=dist2Segment(z, nd);
	
	float ta = min(min(da,db),min(dc,dd));
	//if(useUniformRadius) return DD(ta,r)-SRadius;
	//else return DD((ta-tSR2)/(1.+ta*tSR2),r);//we subtract the width of the sgment before conversion
	return getFinalDE(ta, SRadius, tSR2, r);
}

#define BIGDE 1e30 
//Returns the tangent of the spherical distance to the face defined by p, n0 and n1
float dist2Face(vec4 z, vec4 n0, vec4 n1){
	// compute the components of the orthogonal projection (pmin) of z on the 3-hyperplane (p, n0, n1) in the basis (p, n0, n1)
	// pmin = t*p + u*n0 + v*n1
	// say pper=z-pmin. pper must be orthogonal to pmin. Its magnitude must be the smallest possible...
	// It follows that we have to solve for a linear equation system:
	// (we have p,n0 and n1 normalised --> simplify the computations a little)
	//The linear equations system to solve is:
	// [ 1 a b ] [ t ]     [dot(z, p)  ]
	// [ a 1 c ] [ u ] = [dot(z, n0)]
	// [ b c 1 ] [ v ]     [dot(z, n1)]
	// a,b and c are as follow
	float a=dot(p,n0), b=dot(p,n1), c=dot(n0,n1);//Should be precomputed

	float det = 1. + 2. * a*b*c - (a*a+b*b+c*c);//Determinant: to precompute also
	//the entries of the inverse matrix : to precompute
	float m00=1.-c*c, m01=b*c-a, m02=a*c-b; 
	float                      m11=1.-b*b, m12=a*b-c;
	float                                            m22=1.-a*a;
	det =1./det;

	//Right hand side
	float zp=dot(z,p), zn0=dot(z,n0), zn1=dot(z,n1);
	//Now solving for (t, u, v)	
	float t = det * (m00*zp + m01*zn0 + m02*zn1);
	float u = det * (m01*zp + m11*zn0 + m12*zn1);
	float v = det * (m02*zp + m12*zn0 + m22*zn1);

	//Very simple solution for cutting the faces. We suppose we always draw the 
	//segments so if the projected z is outside the face we return BIGDE
	if(u>0.0 || v>0.0)
		return BIGDE;
	vec4 pmin=normalize(t*p + u*n0 +v*n1);//pmin is the orthogonal projection of z on the 3-hyperplane (p, n0, n1)
	
	float ca=dot(z,pmin), sa=0.5*length(pmin-z)*length(pmin+z);
	float ta=sa/(1.+ca); //ta is the tangent of half the angle between z and pmin. This angle is the spherical distance. ca and sa are the cosinus and sinus of that angle. 
	return ta;
}

float dist2Faces(vec4 z, float r){// there are 6 faces. We are only rendering 3 of them.
	float ta = BIGDE;
	vec4 na =  vec4(1.,0.,0.,0.), nb = vec4(0.,1.,0.,0.);
	if(showFace1) ta = min(ta, dist2Face(z, na, nb));
	if(showFace2) ta = min(ta, dist2Face(z, na, nc));
	if(showFace3) ta = min(ta, dist2Face(z, na, nd));
	if(showFace4) ta = min(ta, dist2Face(z, nb, nc));
	if(showFace5) ta = min(ta, dist2Face(z, nb, nd));
	if(showFace6) ta = min(ta, dist2Face(z, nc, nd));

	return DD(ta,r);// 0 thickness for the faces

	//The following commented lines: if you want the give thickness to the faces. FRadius have to be defined and tFR2 computed just like SRadius and tSR2
	//if(useUniformRadius) return DD(ta,r)-FRadius;
	//else return DD((ta-tFR2)/(1.+ta*tFR2),r);//we subtract the width of the sgment before conversion
}

float DE(vec3 pos) {
	float r=length(pos);
	vec4 z4=vec4(2.*pos,1.-r*r)*1./(1.+r*r);//Inverse stereographic projection of pos: z4 lies onto the unit 3-sphere centered at 0.
	z4=Rotate(z4);
	z4=fold(z4);
	orbitTrap=z4;
	float d2f = dist2Faces(z4,r);// * (.5*rand(pos.xy) + 1.);
	float d2sv = min(dist2Vertices(z4,r),dist2Segments(z4, r));
	if(rand(pos.xy)<0.2) return d2sv;
	return min(d2f, d2sv);
}

vec3 baseColor(vec3 pos, vec3 normal){
	float r=length(pos);
	vec4 z4=vec4(2.*pos,1.-r*r)*1./(1.+r*r);//Inverse stereographic projection of pos: z4 lies onto the unit 3-sphere centered at 0.
	z4=Rotate(z4);
	z4=fold(z4);
	float da=dist2Segment(z4, vec4(1.,0.,0.,0.));
	float db=dist2Segment(z4, vec4(0.,1.,0.,0.));
	float dc=dist2Segment(z4, nc);
	float dd=dist2Segment(z4, nd);

	float d=min(min(da,db),min(dc,dd));

	vec3 color=segAColor;
	if(d==db) color=segBColor;
	if(d==dc) color=segCColor;
	if(d==dd) color=segDColor;

	d = getFinalDE(d, SRadius, tSR2, r);

	float dv=dist2Vertices(z4,r);
	d=min(d,dv);
	
	if(d==dv) color=verticesColor;

	float df=dist2Faces(z4,r);
	d=min(d,df);

	if(d==df) color=facesColor;

	return color;
}
//To show the faces
#preset Default 
FOV = 0.62536
Eye = 23.929,1.17292,-13.1594
Target = 16.1964,0.861791,-8.84237
Up = -0.490968,0.0841706,-0.867102
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 2
Exposure = 2
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -0.21427
FudgeFactor = 1 Locked
MaxRaySteps = 100 Locked
Dither = 0.5 Locked
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.00368
SpecularExp = 100
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.6923,0.78462
CamLight = 1,0.827451,0.768627,0.6415
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 8.254
Reflection = 0
DebugSun = false
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.35
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
U = 0
V = 1
W = 1
T = 1
VRadius = 0
SRadius = 0.00286
useUniformRadius = false
useCameraAsRotVector = false
RotVector = 0,0,1
RotAngle = 138.62
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.847059,0.109804,0.74902
verticesColor = 0.792157,0.607843,0.145098
facesColor = 0.137255,0.282353,0.298039
showFace1 = false Locked
showFace2 = false Locked
showFace3 = false Locked
showFace4 = false Locked
showFace5 = true Locked
showFace6 = false Locked
#endpreset

#preset Bof 
FOV = 0.62536
Eye = 10.5247,-3.67128,-5.9506
Target = 3.23857,-0.942955,-1.70838
Up = -0.472229,0.0642987,-0.879128
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 2
Exposure = 2
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -0.21427
FudgeFactor = 1 Locked
MaxRaySteps = 100 Locked
Dither = 0.5 Locked
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.00368
SpecularExp = 100
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.6923,0.78462
CamLight = 1,0.827451,0.768627,0.6415
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 8.254
Reflection = 0
DebugSun = false
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.35
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
V = 0
W = 0
T = 0
VRadius = 0.0381
SRadius = 0.00857
useUniformRadius = false
useCameraAsRotVector = false
RotVector = 0,0,1
RotAngle = 160
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.847059,0.109804,0.74902
verticesColor = 0.792157,0.607843,0.145098
showFace1 = false Locked
showFace2 = false Locked
showFace3 = false Locked
showFace4 = false Locked
showFace5 = true Locked
showFace6 = false Locked
#endpreset

#preset hypercube
FOV = 0.62536
Eye = -1.94429,-5.32676,3.63991
Target = 0.919801,1.68862,-0.954614
Up = -0.0412693,-0.548673,-0.835018
AntiAlias = 1
Detail = -3
DetailAO = -1.57143
FudgeFactor = 1 Locked
MaxRaySteps = 100 Locked
BoundingSphere = 4
Dither = 0.5 Locked
NormalBackStep = 1
AO = 0,0,0,0.90123
Specular = 4.4304
SpecularExp = 16
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
OrbitStrength = 0.35
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
Type = 4
U = 0
V = 1
W = 0
T = 0
VRadius = 0.07143
SRadius = 0.0181
useUniformRadius = false
useCameraAsRotVector = false
RotVector = 0,0,1
RotAngle = 120
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.847059,0.109804,0.74902
verticesColor = 0.792157,0.607843,0.145098
showFace1 = false Locked
showFace2 = false Locked
showFace3 = false Locked
showFace4 = false Locked
showFace5 = true Locked
showFace6 = false Locked
#endpreset

#preset 4-simplex
FOV = 0.4
Eye = -1.2439,-4.8479,8.6574
Target = 0,0,0
Up = -0.508615,-0.726986,-0.461305
AntiAlias = 1
Detail = -3
DetailAO = -1.57143
FudgeFactor = 1 Locked
MaxRaySteps = 100 Locked
BoundingSphere = 7
Dither = 0.5 Locked
NormalBackStep = 1
AO = 0,0,0,0.90123
Specular = 1
SpecularExp = 50
SpotLight = 1,1,1,0.34615
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
OrbitStrength = 0.35
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
Type = 3
U = 0
V = 1
W = 0
T = 0
VRadius = 0.06667
SRadius = 0.0181
useUniformRadius = false
useCameraAsRotVector = false
RotVector = 0,0,1
RotAngle = 120
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.847059,0.109804,0.74902
verticesColor = 0.792157,0.607843,0.145098
showFace1 = false Locked
showFace2 = false Locked
showFace3 = false Locked
showFace4 = false Locked
showFace5 = true Locked
showFace6 = false Locked
#endpreset

#preset 120-cell
FOV = 0.62536
Eye = 12.1322,-0.909558,-4.68043
Target = 3.90146,-0.104606,-1.49682
Up = -0.347987,-0.462084,-0.81571
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 2
Exposure = 2
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -0.1
FudgeFactor = 1 Locked
MaxRaySteps = 100 Locked
Dither = 0.5 Locked
NormalBackStep = 1
AO = 0,0,0,0.90123
Specular = 0.00338
SpecularExp = 100
SpecularMax = 30.189
SpotLight = 1,1,1,1
SpotLightDir = 0.6923,0.78462
CamLight = 1,0.827451,0.768627,0.23076
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 8.254
Reflection = 0
DebugSun = false
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.35
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
U = 0
V = 1
W = 0
T = 0
VRadius = 0.03334
SRadius = 0.01238
useUniformRadius = false
useCameraAsRotVector = false
RotVector = 0,0,1
RotAngle = 160
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.847059,0.109804,0.74902
verticesColor = 0.792157,0.607843,0.145098
facesColor = 0.137255,0.282353,0.298039
showFace1 = false Locked
showFace2 = false Locked
showFace3 = false Locked
showFace4 = false Locked
showFace5 = false Locked
showFace6 = false Locked
#endpreset

//the edges appear straight. This is as if we were inside the 3-sphere.
//Please change RotAngle parameter to move forward/backward.
//In reality we should see more (things that are behind past the antipode) because the hypersphere is closed
//the method used doesn't allow it :-/
//note how far away objects are magnified ;-). I've added some fog to give some depth cue.
#preset travel
FOV = 1.2683
Eye = 0,0,0
Target = -0.909696,1.24126,-0.257029
Up = 0.625363,0.412586,-0.66234
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 2
Exposure = 2
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -1.57143
FudgeFactor = 1 Locked
MaxRaySteps = 100 Locked
Dither = 0.5 Locked
NormalBackStep = 1
AO = 0,0,0,0.96296
Specular = 0.03529
SpecularExp = 76.364
SpecularMax = 30.189
SpotLight = 1,1,1,1
SpotLightDir = 0.6923,0.78462
CamLight = 1,0.827451,0.768627,0.34616
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0.45872
HardShadow = 0
ShadowSoft = 8.254
Reflection = 0
DebugSun = false
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.35
X = 0.411765,0.6,0.560784,0.41748
Y = 0.666667,0.666667,0.498039,-0.16504
Z = 1,0.258824,0.207843,1
R = 0.0823529,0.278431,1,0.15686
BackgroundColor = 0.501961,0.737255,0.956863
GradientBackground = 0
CycleColors = true
Cycles = 14.3775
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Type = 5
U = 1
V = 0
W = 0
T = 0
VRadius = 0.01905
SRadius = 0.00571
useUniformRadius = false
useCameraAsRotVector = true
RotVector = 0,0,1
RotAngle = 70.344
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.847059,0.109804,0.74902
verticesColor = 0.792157,0.607843,0.145098
facesColor = 0.137255,0.282353,0.298039
showFace1 = false Locked
showFace2 = false Locked
showFace3 = false Locked
showFace4 = false Locked
showFace5 = false Locked
showFace6 = false Locked
#endpreset


#preset coolOne 
FOV = 0.62536
Eye = 4.34667,2.54651,-17.3098
Target = 2.10579,1.30375,-8.82679
Up = -0.106016,-0.969159,-0.222466
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 2
Exposure = 2
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3
DetailAO = -0.21427
FudgeFactor = 1 Locked
MaxRaySteps = 100 Locked
Dither = 0.5 Locked
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.00368
SpecularExp = 100
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.71876,0.78462
CamLight = 1,0.827451,0.768627,0.6415
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0.64615
ShadowSoft = 8.254
Reflection = 0
DebugSun = false
BaseColor = 0.721569,0.721569,0.721569
OrbitStrength = 0.35
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
U = 0
V = 0
W = 0.62406
T = 1
VRadius = 0
SRadius = 0.00286
useUniformRadius = false
useCameraAsRotVector = false
RotVector = 1,0,0
RotAngle = 66.2076
segAColor = 0.815686,0.129412,0.129412
segBColor = 0.152941,0.741176,0.0862745
segCColor = 0.145098,0.372549,0.866667
segDColor = 0.847059,0.109804,0.74902
verticesColor = 0.792157,0.607843,0.145098
facesColor = 0.137255,0.282353,0.298039
showFace1 = false Locked
showFace2 = false Locked
showFace3 = false Locked
showFace4 = false Locked
showFace5 = true Locked
showFace6 = false Locked
#endpreset
