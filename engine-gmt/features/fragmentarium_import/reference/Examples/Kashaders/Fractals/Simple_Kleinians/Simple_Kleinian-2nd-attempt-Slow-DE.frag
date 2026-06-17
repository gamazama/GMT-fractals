#info Simple 3D three generators Kleinian groups limit sets. Second DE attempt. Knighty, december 2012.
#info These are 3D equivalents to 2D two generators Kleinians with real traces.
#info Hopefully when traces are real, the limit set can be obtained using inversions. (some kind of square root of the QF -and kleinian in general- group)
#info I used the spheirahedron approache (http://fractal3d.com/lim.html). Here  the spheirahedron is defined by xy,yz and zx planes in one hand and spheres which centers are on the x,y and z axis
#info Of course those are not the only possible. I just did the simplest I could think about because I'm too lazy.
#info This is the second attempt at making a DE version. Potentialy slower than the first one (because we evaluate distance to BV at each iteration which involves square roots) but doesn't show artifacts.
#info BTW! The DE obtained is quite good but not perfect: there may be overestimations sometimes. If you get a dust effect just reduce "fudgeFactor" (0.5 to 1 are good choice).

#vertex
#define providesInit
#endvertex

#include "MathUtils.frag"
#include "DE-Raytracer.frag"



#group QF
//#define IterationsBetweenRedraws 2

// Number of fractal iterations.
uniform int Iterations;  slider[0,5,20]

// Distances between the ideal vertex and centers of inversion spheres... Maybe not the best parametrisation :-/
uniform vec3 SR; slider[(0,0,0),(1,1,1),(10,10,10)]

// Type of planar tiling at the ideal vertex: Angles between each pair of inversion sphers are PI divided by these numbers... (p,q,r) triple.
uniform int TP; slider[2,3,10]
uniform int TQ; slider[2,3,10]
uniform int TR; slider[2,3,10]

//Want do do an inversion
uniform bool DoInversion; checkbox[false]
//Inversion center
uniform vec3 InvCenter; slider[(-1,-1,-1),(0,0,0),(1,1,1)]
//Inversion radius squared
uniform float InvRadius;  slider[0.01,1,2]

#vertex
uniform vec3 SR;
uniform int TP,TQ,TR;

varying vec3 C,R2,P;//centers of inversions spheres (each center is on x,y or z axis)
varying float BR0,BR1,BR2,BR3;//Bounding spheres radius squared
varying float BRsq0,BRsq1,BRsq2,BRsq3;//Bounding spheres radius 
varying vec3 Cs0,Cs2;//center of Bounding sphere 0

#define PI 3.14159

float maxcomp(vec3 v){return max(v.x,max(v.y,v.z));}
float mincomp(vec3 v){return min(v.x,min(v.y,v.z));}

//Keep in mind that the approache used here is not complete: only the angles between the inversion circles are constrained. Therefore the result is a kleinian only when Sr.x<=C.x, Sr.y<=C.y and Sr.z<=C.z.
//To be exhaustive we should allow for constraining each pair of inversions and reflexions (about xy, yz and zx planes) which gives six conditions.
//Each combination of those conditions corresponds to a system of equations to solve. if that system of equation have n equations (n<6) we will have 6-n degrees of freedom.
//That to say that here we are solving only one case of 6! (factorial) others. (if we factor symmetries there are much less cases).
//If one doen't want to apply cnstraints to obtain a kleinian limit set just define C.x, C.y and C.z as uniforms then continue the computations from "float ID=0.5/dot(C2.xyz,C2.yzx);"
void init(void){// given (p,q,r) triple and inversion spheres radius solve for inversion spheres centers and bounding volumes
	vec3 cosa=cos(vec3(PI)/vec3(float(TP),float(TQ),float(TR)));
	R2=SR*SR;
	vec3 B2=R2.yzx+R2.zxy+2.*SR.yzx*SR.zxy*cosa.xyz;//distance squared between each couple of inversions centers
	vec3 C2=0.5*(B2.zxy-B2.xyz+B2.yzx);//distance squared between origin and inversions centers
	C=sqrt(C2);

	//schmuckcenter
	float ID=0.5/dot(C2.xyz,C2.yzx);
	vec3 B=((R2.zxy-R2.xyz)*C2.yzx-(R2.xyz-R2.yzx)*C2.zxy+C2.xyz*B2.xyz)*ID;//homogeneous coordinates of schmuckcenter (lol! Actually it's the intersection of the line of spheres perpendicular to inversion spheres ans the plane defined by their centers. It's the ideal vertex when (p,q,r) triple is euclidean) w.r.t. inversion centers
	P=C*B;//schmuckcenter

	//bounding volume (spheres of course)
	vec3 vn=normalize(C.yzx*C.zxy);//Normal vector to the plane defined by the centers of inversion spheres.
	float t=maxcomp(P/vn);
	Cs0=-t*vn+P;
	BR0=dot(Cs0-vec3(C.x,0.,0.),Cs0-vec3(C.x,0.,0.))-R2.x;//t*t;//if quasi fuchsian it is equal to t*t

	t=mincomp(P/vn);
	Cs2=-t*vn+P;
	BR2=dot(Cs2-vec3(C.x,0.,0.),Cs2-vec3(C.x,0.,0.))-R2.x;

	BR1=maxcomp(C2-R2);//another outer bounding sphere (its center is at the origin): the biggest orthogonal to each inversion sphere
	BR3=mincomp(C2-R2);//another inner bounding sphere (its center is at the origin)

	BRsq0=sqrt(BR0); BRsq1=sqrt(BR1); BRsq2=sqrt(BR2); BRsq3=sqrt(BR3);
}
#endvertex

varying vec3 C,R2,P;
varying float BR0,BR1,BR2;
varying float BRsq0,BRsq1,BRsq2,BRsq3;
varying vec3 Cs0,Cs2;

float SphereInvert(inout vec3 p, vec3 c, float r2){//invert p about sphere of center c and radius squared r2
	vec3 p1=p-c;
	float k=max(1.,r2/dot(p1,p1));
	p=p1*k+c;
	return k;
}

float dist2BV(vec3 p) {//distance to bounding volume
	float d=length(p-Cs0)-BRsq0;
	//d=max(d,length(p)-BRsq1);//not really necessary but may improve quality in some cases
	d=max(d,BRsq2-length(p-Cs2));//with this you can take a look inside (well... when the limit set has a volume). useful also when enabling inversion pre-transform.
	//d=max(d,BRsq3-length(p));
	return d;

	/*you can also try instead (and reduce iterations number):
		float d=length(p-Cs2)-BRsq2;
		return d;
	*/
}

float Kleinian(vec3 p) {
	orbitTrap=abs(vec4(p.x,p.y,p.z,dot(p,p)));
	int i=0;
	float k=1.;
	p=abs(p);
	float d0=dist2BV(p);
	float d=d0/k;
	do{
		k*=SphereInvert(p, vec3(C.x,0.,0.), R2.x);
		k*=SphereInvert(p, vec3(0.,C.y,0.), R2.y);
		k*=SphereInvert(p, vec3(0.,0.,C.z), R2.z);
		orbitTrap = min(orbitTrap, abs(vec4(p.x,p.y,p.z,dot(p,p))));
		p=abs(p);
		d0=dist2BV(p);
		d=max(d,d0/k);//not efficient because we estimate the distance which involes square roots at each iteration
		i++;
	}while(i<Iterations && d0<0.1);//the key to reduce computations is to test if d0>some value 
	return d;
}

float DE(vec3 p) {
	if(DoInversion){
		p=p-InvCenter;
		float r=length(p);
		float r2=r*r;
		p=(InvRadius/r2)*p+InvCenter;
		float de=Kleinian(p);
		de=r2*de/(InvRadius+r*de);
		return de;
	}
	else return Kleinian(p);
}

#preset Default
FOV = 0.62536
Eye = -3.3363,0.00873799,-2.92385
Target = 2.33583,0.00928121,3.88465
Up = 0.434804,-0.72944,-0.528075
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1.2903
Contrast = 0.9901
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Detail = -3.5
DetailAO = -1.45124
FudgeFactor = 0.5
MaxRaySteps = 128
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.01
SpecularExp = 44.643
SpecularMax = 10
SpotLight = 1,0.678431,0.494118,0.32692
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Glow = 0.952941,0.952941,0.952941,1
GlowMax = 102
Fog = 0
HardShadow = 0
ShadowSoft = 20
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.44156
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.61166
Z = 1,0.372549,0.0117647,0.92234
R = 0.0901961,0.65098,1,-0.56862
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 9
SR = 9.4355,1,1
TP = 3
TQ = 3
TR = 3
DoInversion = false
InvCenter = 0.06666,0.11112,0
InvRadius = 0.05189
#endpreset

#preset Pearles
FOV = 0.62536
Eye = 3.65341,1.59421,-2.13597
Target = -2.72568,-2.28789,2.63531
Up = -0.463785,-0.281406,-0.840068
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
Detail = -3.5
DetailAO = -0.5
FudgeFactor = 0.5
MaxRaySteps = 128
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.02
SpecularExp = 16.071
SpecularMax = 10
SpotLight = 1,0.678431,0.494118,0.40385
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.90566
CamLightMin = 0
Glow = 0.34167,0,0,0
GlowMax = 194
Fog = 0
HardShadow = 0
ShadowSoft = 20
Reflection = 0
DebugSun = false
BaseColor = 0.780392,0.780392,0.780392
OrbitStrength = 0.35065
X = 1,0.0431373,0.0431373,0.37864
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,1
R = 0.0823529,0.372549,1,0.09804
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = false
Cycles = 0.70761
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 10
SR = 4.5968,1.2903,1.7742
TP = 2
TQ = 3
TR = 6
DoInversion = false
InvCenter = 0.06666,0.11112,0
InvRadius = 0.05189
#endpreset

#preset Example
FOV = 0.62536
Eye = 0.682079,0.780906,-0.497979
Target = -4.79077,-4.50472,4.04499
Up = -0.159371,-0.466206,-0.870203
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1.2903
Contrast = 0.9901
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Detail = -3.5
DetailAO = -1.45124
FudgeFactor = 1
MaxRaySteps = 256
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.01
SpecularExp = 44.643
SpecularMax = 10
SpotLight = 1,0.678431,0.494118,0.32692
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Glow = 1,1,1,0.97297
GlowMax = 153
Fog = 0
HardShadow = 0
ShadowSoft = 20
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.44156
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.61166
Z = 1,0.372549,0.0117647,0.92234
R = 0.0901961,0.65098,1,-0.56862
BackgroundColor = 0.176471,0.239216,0.258824
GradientBackground = 0
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 14
SR = 1.129,1,1
TP = 3
TQ = 2
TR = 4
DoInversion = false
InvCenter = 0.06666,0.11112,0
InvRadius = 0.05189
#endpreset

#preset Ahara
FOV = 0.62536
Eye = 0.339212,0.464594,-0.528947
Target = -1.44293,-5.24604,6.00873
Up = -0.683186,-0.405674,-0.607194
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 0.9901
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Detail = -3.3
DetailAO = -0.5
FudgeFactor = 0.83133
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 0.01163
SpecularExp = 40.278
SpecularMax = 10
SpotLight = 1,0.92549,0.643137,0.78431
SpotLightDir = 0.6923,1
CamLight = 1,1,1,0.38462
CamLightMin = 0
Glow = 1,1,1,1
GlowMax = 71
Fog = 0
HardShadow = 0.60606
ShadowSoft = 17.4604
Reflection = 0
DebugSun = false
BaseColor = 0.756863,0.756863,0.756863
OrbitStrength = 0.79221
X = 1,1,1,1
Y = 0.345098,0.666667,0,-0.72816
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.027451,0.0431373,0.027451
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 15
SR = 0.5,1,1
TP = 3
TQ = 3
TR = 3
DoInversion = true
InvCenter = 0.06666,0.11112,0
InvRadius = 0.05189
#endpreset

#preset planet
FOV = 0.62536
Eye = -0.882989,0.458736,-0.340572
Target = 6.92466,-2.4695,2.65856
Up = 0.151565,-0.331009,-0.931376
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 1
ToneMapping = 2
Exposure = 2.5
Brightness = 1.23655
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -3.5
DetailAO = -2.5
FudgeFactor = 1
MaxRaySteps = 120
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.92683
Specular = 0.01
SpecularExp = 76.786
SpecularMax = 10
SpotLight = 1,0.964706,0.901961,0.96154
SpotLightDir = 1,-0.06172
CamLight = 1,1,1,2
CamLightMin = 0
Glow = 1,1,1,1
GlowMax = 316
Fog = 0.93578
HardShadow = 0.75758
ShadowSoft = 20
Reflection = 0
DebugSun = false
BaseColor = 0.831373,0.831373,0.831373
OrbitStrength = 0.72727
X = 1,1,1,-0.14564
Y = 0.345098,0.666667,0,0.57282
Z = 1,0.301961,0.027451,1
R = 0.0784314,1,0.941176,0.0196
BackgroundColor = 0.129412,0.227451,0.356863
GradientBackground = 0.76085
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 14
SR = 1,1,1
TP = 2
TQ = 3
TR = 5
DoInversion = false
InvCenter = 0,0,0
InvRadius = 1.69848
#endpreset

#preset planet2
FOV = 0.62536
Eye = -0.56211,0.367955,-0.235711
Target = 7.50545,-2.60413,1.91136
Up = 0.0637854,-0.29938,-0.951999
EquiRectangular = false
Gamma = 1
Exposure = 2.5
Brightness = 1.5
Contrast = 1.1
Saturation = 1
SpecularExp = 76.786
SpotLight = 1,0.964706,0.901961,0.96154
SpotLightDir = 1,-0.06172
CamLight = 1,1,1,2
CamLightMin = 0
Fog = 1.15596
BaseColor = 0.831373,0.831373,0.831373
OrbitStrength = 0.68
X = 1,1,1,-0.17242
Y = 0.345098,0.666667,0,0.42528
Z = 1,0.301961,0.027451,1
R = 0.0784314,1,0.941176,0
BackgroundColor = 0.160784,0.294118,0.470588
GradientBackground = 0.76085
CycleColors = false
Cycles = 1.1
Iterations = 14
TP = 2
TQ = 3
TR = 5
DoInversion = false
InvRadius = 1.69848
FocalPlane = 1
Aperture = 0
ToneMapping = 2
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -3.5
DetailAO = -2.56095
FudgeFactor = 1
MaxRaySteps = 120
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.01
SpecularMax = 10
Glow = 1,1,1,1
GlowMax = 316
HardShadow = 0.63636
ShadowSoft = 9.2064
Reflection = 0
DebugSun = false
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
SR = 1,1,1
InvCenter = 0,0,0
#endpreset