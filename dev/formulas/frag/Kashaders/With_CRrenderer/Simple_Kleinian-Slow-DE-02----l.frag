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

#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#define KN_VOLUMETRIC
#include "renderer\DE-kn2.frag"

#group QF
//#define IterationsBetweenRedraws 2

// Number of fractal iterations.
uniform int Iterations;  slider[0,5,50]

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
	float k=max(1.,r2/(dot(p1,p1)-0.01));
	p=p1*k+c;
	return k;
}

float dist2BV(vec3 p) {//distance to bounding volume
#if 0	
	float d=-100000.0;
	d=max(d, length(p-Cs0)-BRsq0);
	//d=max(d,length(p)-BRsq1);//not really necessary but may improve quality in some cases
	d=max(d,BRsq2-length(p-Cs2));//with this you can take a look inside (well... when the limit set has a volume). useful also when enabling inversion pre-transform.
	//d=max(d,BRsq3-length(p));
	return d;
#else 
	float d=-1.;//length(p-Cs2)-BRsq2;
	d=max(d,length(p-Cs2)-BRsq2);
	return d;
#endif 
}

float Kleinian(vec3 p) {
	orbitTrap=abs(vec4(p.x,p.y,p.z,dot(p,p)));
	int i=0;
	float k=1.;
	p=abs(p);
	//float d0=dist2BV(p);
	//float d=d0/k;
	do{
		k*=SphereInvert(p, vec3(C.x,0.,0.), R2.x);
		k*=SphereInvert(p, vec3(0.,C.y,0.), R2.y);
		k*=SphereInvert(p, vec3(0.,0.,C.z), R2.z);
		orbitTrap = min(orbitTrap, abs(vec4(p.x,p.y,p.z,dot(p,p))));
		p=abs(p);
		//d0=dist2BV(p);
		//d=min(d,d0/k);//not efficient because we estimate the distance which involes square roots at each iteration
		i++;
	}while(i<Iterations /*&& d0<1.4*/);//the key to reduce computations is to test if d0>some value 
	return dist2BV(p)/k;//d;
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
Eye = 1.21006,-0.97611,1.39756
Target = -0.772187,5.84053,-3.90648
Up = 0.964063,0.0308899,-0.263872
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 1
Exposure = 0.576
Brightness = 1
Contrast = 0.9901
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 4
FudgeFactor = 0.5
MaxRaySteps = 128
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.77331
coneApertureAO = 0.5
maxIterAO = 3
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.01
SpecularExp = 44.643
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.95732
Glow = 0.952941,0.952941,0.952941,0
GlowMax = 102
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,0.964706,0.905882,4
LightPos = 1.027,-1.5676,0.3244
LightSize = 0.02381
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.490196,0.490196,0.490196
OrbitStrength = 0.42938
X = 1,0.101961,0.0392157,1
Y = 0.345098,0.666667,0,-0.63684
Z = 0,0.298039,1,0.72632
R = 1,1,1,-0.07652
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = true
Cycles = 4.72392
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,1
HF_Scatter = 0
HF_Anisotropy = 0,0,0,1
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
Iterations = 25
SR = 1.7374,1,10
TP = 6
TQ = 3
TR = 2
DoInversion = false
InvCenter = 0.23706,-0.3515,0.80926
InvRadius = 1
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
Target = 6.67441,-2.74171,3.00181
Up = 0.34005,-0.0251386,-0.940071
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 5
Exposure = 1.4634
Brightness = 1.23655
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
DetailAO = -1.87803
FudgeFactor = 1
MaxRaySteps = 120
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
AoCorrect = 0
Specular = 0.01
SpecularExp = 76.786
CamLight = 1,1,1,0.45284
CamLightMin = 1
Glow = 1,1,1,1
GlowMax = 245
Reflection = 0
ReflectionsNumber = 0
SpotLight = 1,0.964706,0.901961,1.96154
LightPos = 1.1688,0.1298,-7.1428
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0.5645
LightGlowExp = 1
HardShadow = 0.75758
ShadowSoft = 20
BaseColor = 0.831373,0.831373,0.831373
OrbitStrength = 0.72131
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
HF_Fallof = 0.01
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,1
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
Up = 0.0609997,-0.299962,-0.951999
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 2
Exposure = 2.5
Brightness = 1.5
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
DetailAO = -1.7927
FudgeFactor = 1
MaxRaySteps = 120
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
AoCorrect = 0
Specular = 0.01
SpecularExp = 76.786
CamLight = 1,1,1,2
CamLightMin = 0
Glow = 1,1,1,1
GlowMax = 316
Reflection = 0
ReflectionsNumber = 0
SpotLight = 1,0.964706,0.901961,0.96154
LightPos = 1.1688,0.1298,-7.1428
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0.5645
LightGlowExp = 1
HardShadow = 0.63636
ShadowSoft = 0
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
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.01
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,1
Iterations = 14
SR = 1,1,1
TP = 2
TQ = 3
TR = 5
DoInversion = false
InvCenter = 0,0,0
InvRadius = 1.69848
#endpreset


#preset Neptune
FOV = 0.62536
Eye = -0.868367,-0.787955,1.81959
Target = 0.385013,0.319286,0.28439
Up = 0.368859,-0.892082,-0.261023
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 0.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -3.5
RefineSteps = 2
FudgeFactor = 0.5
MaxRaySteps = 128
MaxDistance = 100
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.00002
coneApertureAO = 0.79032
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.01
SpecularExp = 44.643
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,2
Glow = 0.952941,0.952941,0.952941,1
GlowMax = 102
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,0.843137,0.682353,8
LightPos = -1.579,-6.3158,-4.7368
LightSize = 0.04762
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.623529,0.623529,0.623529
OrbitStrength = 0.63333
X = 1,0.364706,0.207843,0.44186
Y = 0.345098,0.666667,0,0.97674
Z = 0.529412,0.309804,1,0.27906
R = 0.0901961,0.65098,1,0.2
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = true
Cycles = 18.5516
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 3.35381
HF_Const = 0
HF_Intensity = 0.0625
HF_Dir = 0,-1,0
HF_Offset = 0.303
HF_Color = 0.215686,0.4,0.737255,0.11538
HF_Scatter = 4
HF_Anisotropy = 0.403922,0.235294,0.203922
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Iterations = 11
SR = 0.7982,1.1215,2.3364
TP = 3
TQ = 5
TR = 2
DoInversion = false
InvCenter = 0.06666,0.0685,0.80822
InvRadius = 0.57128
#endpreset

#preset Neptune2
Eye = -0.890745,-0.344229,1.83359
Target = 0.521397,0.132836,0.121264
Up = 0.00348287,-0.999486,-0.0318768
FocalPlane = 1.29874
Aperture = 0.01205
InFocusAWidth = 0.02
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 0.67347
Brightness = 1
Contrast = 1.02
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Bloom = true
BloomIntensity = 0.1
BloomPow = 1.3483
BloomTaps = 6
Detail = -3.5
RefineSteps = 2
FudgeFactor = 0.5
MaxRaySteps = 128
MaxDistance = 100
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.00002
coneApertureAO = 0.79032
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.78432
SpecularExp = 104.165
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,2
Glow = 0.952941,0.952941,0.952941,1
GlowMax = 102
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,0.843137,0.682353,10
LightPos = -1.579,-6.3158,-4.7368
LightSize = 0.04762
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.623529,0.623529,0.623529
OrbitStrength = 0.63333
X = 1,0.364706,0.207843,0.44186
Y = 0.345098,0.666667,0,0.97674
Z = 0.529412,0.309804,1,0.27906
R = 0.0901961,0.65098,1,0.2
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = true
Cycles = 18.5516
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 3.35381
HF_Const = 0
HF_Intensity = 0.0625
HF_Dir = 0,-1,0
HF_Offset = 0.303
HF_Color = 0.215686,0.4,0.737255,0.11538
HF_Scatter = 4
HF_Anisotropy = 0.403922,0.235294,0.203922
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
SR = 0.7982,1.1215,2.3364
TP = 3
TQ = 5
TR = 2
DoInversion = false
InvCenter = 0.06666,0.0685,0.80822
InvRadius = 0.57128
Iterations = 11
#endpreset

#preset Nepyune03
FOV = 0.62536
Eye = -1.06885,-0.607,1.84139
Target = 0.501738,-0.0317997,0.212795
Up = -0.101254,-0.989037,0.107489
FocalPlane = 1.25725
Aperture = 0.015
InFocusAWidth = 0.22857
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.2
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Bloom = false
BloomIntensity = 0.05556
BloomPow = 1.236
BloomTaps = 5
Detail = -3.5
RefineSteps = 2
FudgeFactor = 0.5
MaxRaySteps = 128
MaxDistance = 100
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.14289
coneApertureAO = 0.79032
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.01
SpecularExp = 44.643
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 0.952941,0.952941,0.952941,1
GlowMax = 102
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,0.843137,0.682353,10
LightPos = -1.579,-6.3158,-4.7368
LightSize = 0.04762
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.509804,0.509804,0.509804
OrbitStrength = 0.71429
X = 1,0.364706,0.207843,0.44186
Y = 0.345098,0.666667,0,0.97674
Z = 0.529412,0.309804,1,0.27906
R = 0.0901961,0.65098,1,0.2745
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = true
Cycles = 9.82086
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 2.42451
HF_Const = 0
HF_Intensity = 0.0625
HF_Dir = 0,-1,0
HF_Offset = -0.1204
HF_Color = 0.215686,0.4,0.737255,0.11538
HF_Scatter = 4
HF_Anisotropy = 0.403922,0.235294,0.203922
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Iterations = 11
SR = 0.7982,1.1215,2.3364
TP = 3
TQ = 5
TR = 2
DoInversion = false
InvCenter = 0.06666,0.0685,0.80822
InvRadius = 0.57128
#endpreset

#preset Colorful
FOV = 0.62536
Eye = 0.727131,0.914532,-0.445484
Target = -4.95344,-4.3594,3.84931
Up = -0.158961,-0.454714,-0.876337
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 4
Exposure = 1
Brightness = 1.2903
Contrast = 0.9901
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 4
FudgeFactor = 1
MaxRaySteps = 256
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.45124
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0.20213
Specular = 0.01
SpecularExp = 44.643
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 153
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,0.678431,0.494118,8.32692
LightPos = 0,0,-1
LightSize = 0.0396
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 1,1,1
OrbitStrength = 0.44156
X = 0.890196,0,0,1
Y = 0.0117647,0.807843,0,0.61166
Z = 0,0.0117647,0.901961,0.92234
R = 0.0901961,0.65098,1,-0.80392
BackgroundColor = 0.176471,0.239216,0.258824
GradientBackground = 0
CycleColors = true
Cycles = 21.3642
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,1
HF_Scatter = 0
HF_Anisotropy = 0,0,0
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
Iterations = 14
SR = 1.129,1,1
TP = 3
TQ = 2
TR = 4
DoInversion = false
InvCenter = 0.06666,0.11112,0
InvRadius = 0.05189
#endpreset


#preset Noname
FOV = 0.62536
Eye = 0.036697,0.196207,0.438092
Target = 4.42794,-2.2787,-6.85027
Up = -0.442588,0.767466,-0.463801
FocalPlane = 0.5
Aperture = 0.001
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 4
Exposure = 1
Brightness = 1.57895
Contrast = 0.9901
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Bloom = true
BloomIntensity = 0.36364
BloomPow = 2
BloomTaps = 5
Detail = -3.5
RefineSteps = 4
FudgeFactor = 0.6506
MaxRaySteps = 256
MaxDistance = 20
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.45124
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0.26596
Specular = 0.01
SpecularExp = 44.643
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 153
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,0.678431,0.494118,10
LightPos = 0,0,-1
LightSize = 0.0396
LightFallOff = 2
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 1,1,1
OrbitStrength = 0.36667
X = 0.890196,0,0,0.7907
Y = 0.0117647,0.807843,0,0.69768
Z = 0,0.0117647,0.901961,0.55814
R = 0.0901961,0.65098,1,-0.34118
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 17.4664
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0.5443
HF_Intensity = 0.01235
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 1,1,1,0
HF_Scatter = 0.2
HF_Anisotropy = 0.176471,0.372549,0.686275
HF_FogIter = 16
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Iterations = 20
SR = 0.3226,0.5645,1.0484
TP = 2
TQ = 3
TR = 3
DoInversion = true
InvCenter = 0.11112,0.04444,0.02222
InvRadius = 0.05189
#endpreset

#preset Noname
FOV = 0.62536
Eye = 0.190572,0.192539,-0.146095
Target = -1.8487,-7.50122,3.74956
Up = -0.520832,-0.227523,-0.82278
FocalPlane = 0.15697
Aperture = 0.001
InFocusAWidth = 0.50943
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.7
Bloom = false
BloomIntensity = 0.25454
BloomPow = 2
BloomTaps = 4
Detail = -4
RefineSteps = 1
FudgeFactor = 0.7
MaxRaySteps = 400
MaxDistance = 1
Dither = 0.5
NormalBackStep = 1
DetailAO = -2.21431
coneApertureAO = 0.72581
maxIterAO = 5
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4902
SpecularExp = 500
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.6
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0.0862745,0.0862745,0.0862745
ReflectionsNumber = 0 Locked
SpotGlow = true
SpotLight = 1,0.92549,0.643137,10
LightPos = -0.5264,0,-0.5264
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.756863,0.756863,0.756863
OrbitStrength = 1
X = 0.12549,0.207843,0.933333,1
Y = 0.266667,0.854902,0.0862745,0.69768
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,0.24706
BackgroundColor = 0.0901961,0.14902,0.262745
GradientBackground = 0.1724
CycleColors = true
Cycles = 8.78305
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 1.21988
HF_Const = 0
HF_Intensity = 0.00209
HF_Dir = 0,0,1
HF_Offset = 3.6364
HF_Color = 0.509804,0.658824,1,2.01921
HF_Scatter = 0.5
HF_Anisotropy = 0.576471,0.262745,0.137255
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Iterations = 50
SR = 0.5,1,1
TP = 3
TQ = 3
TR = 3
DoInversion = true
InvCenter = 0.06666,0.11112,0
InvRadius = 0.05189
#endpreset


#preset Neptune3
FOV = 0.62536
Eye = -0.739398,-0.228773,1.8031
Target = 0.703405,-0.0370116,0.0608765
Up = 0.447,-0.740118,-0.502411
FocalPlane = 1.29874
Aperture = 0.00295
InFocusAWidth = 0.33962
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Bloom = true
BloomIntensity = 0.14546
BloomPow = 2.0833
BloomTaps = 15
Detail = -3.5
RefineSteps = 2
FudgeFactor = 0.5
MaxRaySteps = 128
MaxDistance = 100
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.57143
coneApertureAO = 1
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.78432
SpecularExp = 104.165
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 0.952941,0.952941,0.952941,1
GlowMax = 102
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,0.843137,0.682353,10
LightPos = -1.579,-6.3158,-4.7368
LightSize = 0.04762
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.623529,0.623529,0.623529
OrbitStrength = 0.63333
X = 1,0.364706,0.207843,0.44186
Y = 0.345098,0.666667,0,0.97674
Z = 0.529412,0.309804,1,0.27906
R = 0.0901961,0.65098,1,0.2
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = true
Cycles = 18.5516
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 1.91951
HF_Const = 0
HF_Intensity = 0.0625
HF_Dir = 0,-1,0
HF_Offset = 0.8434
HF_Color = 0.215686,0.4,0.737255,0.11538
HF_Scatter = 4
HF_FogIter = 16
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Iterations = 11
SR = 0.7982,1.1215,2.3364
TP = 3
TQ = 5
TR = 2
DoInversion = false
InvCenter = 0.06666,0.0685,0.80822
InvRadius = 0.57128
HF_Anisotropy = 0.541176,0.454902,0.407843,-1
#endpreset


#preset Noname
FOV = 0.62536
Eye = -0.070996,-0.375887,-0.851309
Target = 0.220783,-0.752599,1.36832
Up = 0.533018,-0.800775,-0.273222
FocalPlane = 0.22346
Aperture = 0.0008
InFocusAWidth = 0.33962
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = true
BloomIntensity = 0.05556
BloomPow = 1.236
BloomTaps = 7
Detail = -4
RefineSteps = 2
FudgeFactor = 0.5
MaxRaySteps = 300
MaxDistance = 100
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.21429
coneApertureAO = 1
maxIterAO = 16
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 118.055
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 0.952941,0.952941,0.952941,1
GlowMax = 102
Reflection = 0,0,0
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,0.843137,0.682353,10
LightPos = -1.579,-6.3158,-4.7368
LightSize = 0.04762
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.435294,0.435294,0.435294
OrbitStrength = 0.7013
X = 1,0.364706,0.207843,0.47572
Y = 0.345098,0.666667,0,0.97674
Z = 0.529412,0.309804,1,-0.59224
R = 0.0901961,0.65098,1,0.15686
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = true
Cycles = 14.6811
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 1.91951
HF_Const = 0
HF_Intensity = 0.0625
HF_Dir = 0,-1,0
HF_Offset = 0.8434
HF_Color = 0.215686,0.4,0.737255,0.11538
HF_Scatter = 4
HF_FogIter = 16
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
Iterations = 21
SR = 0.7982,1.1215,2.3364
TP = 3
TQ = 5
TR = 2
DoInversion = false
InvCenter = 0.06666,0.0685,0.80822
InvRadius = 0.57128
HF_Anisotropy = 0.541176,0.454902,0.407843,-1
#endpreset
