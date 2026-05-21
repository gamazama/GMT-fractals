#info Simple 3D three generators Kleinian groups limit sets. First DE attempt. Knighty, december 2012.
#info These are 3D equivalents to 2D two generators Kleinians with real traces.
#info Hopefully when traces are real, the limit set can be obtained using inversions. (some kind of square root of the QF -and kleinian in general- group)
#info I used the spheirahedron approache (http://fractal3d.com/lim.html). Here  the spheirahedron is defined by xy,yz and zx planes in one hand and spheres which centers are on the x,y and z axis
#info Of course those are not the only possible. I just did the simplest I could think about because I'm too lazy.
#info This first attempt at making a DE version is "flawed". It shows the images upon the successive transformations of the centers of inversion
#info "Flawed"! yes! but with using an inversion as pretransform allows us to put the artifacts inside--> It's possible to have a DE without artifacts with this simple method after all! 
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

	BR1=maxcomp(C2-R2);//another outer bounding sphere (its center is at the origin)
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
	p=abs(p);
	float d=length(p-Cs0)-BRsq0;
	//d=max(d,length(p)-BRsq1);//not really necessary but may improve quality in some cases
	d=max(d,BRsq2-length(p-Cs2));//with this you can take a look inside (well... when the limit set has a volume). useful also when enabling inversion pre-transform.
	//d=max(d,BRsq3-length(p));
	return d;

	/*you can also try instead (and reduce iterations number then see what happens :) ):
		float d=length(p-Cs2)-BRsq2;
		return 0.74*d;
	*/
}

float Kleinian(vec3 p) {
	orbitTrap=abs(vec4(p.x,p.y,p.z,dot(p,p)));
	int i=0;
	float k=1.;
	vec3 ap=p+vec3(1.);
	for(i=0;i<Iterations && any(not(equal(p,ap)));i++){
		ap=p;
		p=abs(p);
		k*=SphereInvert(p, vec3(C.x,0.,0.), R2.x);
		k*=SphereInvert(p, vec3(0.,C.y,0.), R2.y);
		k*=SphereInvert(p, vec3(0.,0.,C.z), R2.z);
		orbitTrap = min(orbitTrap, abs(vec4(p.x,p.y,p.z,dot(p,p))));
	}
	return dist2BV(p)/k;
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
Eye = -2.97874,2.0051,-1.37413
Target = 3.60995,-3.0984,1.63786
Up = 0.233675,-0.216943,-0.947804
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
FudgeFactor = 1
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 0.01163
SpecularExp = 40.278
SpecularMax = 10
SpotLight = 1,0.678431,0.494118,0.78431
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Glow = 1,1,1,1
GlowMax = 71
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
DebugSun = false
BaseColor = 0.756863,0.756863,0.756863
OrbitStrength = 0.67213
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
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
Iterations = 10
SR = 9.4355,1,1
TP = 3
TQ = 3
TR = 3
DoInversion = false
InvCenter = 0.06666,0.11112,0
InvRadius = 0.05189
#endpreset

#preset Example
FOV = 0.62536
Eye = 0.531713,-0.461277,1.52717
Target = 0.383934,2.149,-6.94002
Up = -0.758395,0.624117,0.187921
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
DetailAO = -1.00002
FudgeFactor = 0.75
MaxRaySteps = 128
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
Specular = 0.0814
SpecularExp = 17.857
SpecularMax = 10
SpotLight = 1,0.847059,0.6,0.46154
SpotLightDir = -0.6,0.2923
CamLight = 1,1,1,1.84906
CamLightMin = 0
Glow = 0.403922,0.952941,0.239216,1
GlowMax = 61
Fog = 0
HardShadow = 0
ShadowSoft = 20
Reflection = 0
DebugSun = false
BaseColor = 0.780392,0.780392,0.780392
OrbitStrength = 0.81818
X = 1,0.0431373,0.0431373,0.24138
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,0.2233
R = 0.0784314,1,0.941176,0.21568
BackgroundColor = 0.0470588,0.101961,0.156863
GradientBackground = 0.86955
CycleColors = true
Cycles = 6.78311
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 20
SR = 1.0465,2.8226,1.662
TP = 3
TQ = 3
TR = 3
DoInversion = true
InvCenter = 0.22222,0.24444,0.17778
InvRadius = 0.26138
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