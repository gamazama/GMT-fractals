#info Simple 3D three generators Kleinian groups limit sets. Knighty, december 2012.
#info These are 3D equivalents to 2D two generators Kleinians with real traces.
#info Hopefully when traces are real, the limit set can be obtained using inversions. (some kind of square root of the QF -and kleinian in general- group)
#info I used the spheirahedron approache (http://fractal3d.com/lim.html). Here  the spheirahedron is defined by xy,yz and zx planes in one hand and spheres which centers are on the x,y and z axis
#info Of course those are not the only possible. I just did the simplest I could think about because I'm too lazy.

#define providesInside

#vertex
#define providesInit
#endvertex

#include "MathUtils.frag"
#include "Brute-Raytracer.frag"

#group QF
//#define IterationsBetweenRedraws 2

// Number of fractal iterations.
uniform int Iterations;  slider[0,5,20]

// Distances between the ideal vertex and centers of inversion spheres... Maybe not the best parametrisation :-/
uniform vec3 SR; slider[(0,0,0),(1,1,1),(1000,10,10)]

// Type of planar tiling at the ideal vertex: Angles between each pair of inversion sphers are PI divided by these numbers... (p,q,r) triple.
uniform int TP; slider[2,3,10]
uniform int TQ; slider[2,3,10]
uniform int TR; slider[2,3,10]

// If checked it shows the duplication process of the (inner) fundamental domain, Else it uses the bounding volume instead. Notice the hyperbolic tessellations that appear when (p,q,r) triple is hyperbolic
uniform bool AlternateVer; checkbox[false]

// If checked it uses the inner bounding sphere
uniform bool UseInnerBV; checkbox[false]

//Do first inversion?
uniform bool DoInversion; checkbox[false]

//first inversion center
uniform vec3 InvCenter; slider[(-2,-2,-2),(0,0,0),(2,2,2)]

//first inversion radius
uniform float InvRadius; slider[0.01,1,2]

vec3 SphereInvert(vec3 p, vec3 c, float r2){//invert p about sphere of center c and radius squared r2
	vec3 p1=p-c;
	return p1*max(1.,r2/dot(p1,p1))+c;
}

vec3 SphereInvertNF(vec3 p, vec3 c, float r2){//invert p about sphere of center c and radius squared r2
	vec3 p1=p-c;
	return p1*r2/dot(p1,p1)+c;
}

vec3 preTransform(vec3 p){
	if(DoInversion) return SphereInvertNF(p,InvCenter,InvRadius*InvRadius);
	return p;
}

#vertex
uniform vec3 SR;
uniform int TP,TQ,TR;

varying vec3 C,R2,P;//centers of inversions spheres (each center is on x,y or z axis)
varying float BR0,BR1,BR2,BR3;//Bounding spheres radius squared
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
	vec3 B2=R2.yzx+R2.zxy+2.*SR.yzx*SR.zxy*cosa.xyz;//distance squared between each pair of inversions centers
	vec3 C2=0.5*(B2.zxy-B2.xyz+B2.yzx);//distance squared between origin and inversions centers
	C=sqrt(C2);//distance from origin to inversions centers
	
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
}
#endvertex

varying vec3 C,R2,P;
varying float BR0,BR1,BR2;
varying vec3 Cs0,Cs2;

bool insideFunc0(vec3 p) {//is p inside the bounding volume of the limit set ?
	p=abs(p);
	//we are using only the outer OR the inner bounding sphere (Cs0, BR0) because using both outer and inner bounding spheres results in very thin object wihich is difficult to render with nonDErenderer.
	//Because of this it only gives the correct result when (p,q,r) triple corresponds to spherical and planar triangle groups
	//you can also try inner volume alone :)
	if (UseInnerBV) return (dot(p-Cs2,p-Cs2)-BR2>0.);// &&(dot(p,p)-BR1<0.);// &&
	else return (dot(p-Cs0,p-Cs0)-BR0<0.); // &&(dot(p,p)-BR3>0.);// &&
}

bool insideFunc1(vec3 p) {//is p inside the (inner) fundamental domain ?
	p=abs(p);//Ok! this makes if 8 times the actual fundamental domain but it gives the fundamental domain of the corresponding kleinian
	return (dot(p-vec3(C.x,0.,0.),p-vec3(C.x,0.,0.))-R2.x>0.) && 
			(dot(p-vec3(0.,C.y,0.),p-vec3(0.,C.y,0.))-R2.y>0.) &&
			(dot(p-vec3(0.,0.,C.z),p-vec3(0.,0.,C.z))-R2.z>0.) &&
			(dot(p,p)-dot(P,P)<0.);
}

bool inside(vec3 p) {
	p=preTransform(p);
	orbitTrap=abs(vec4(p.x,p.y,p.z,dot(p,p)));
	int i=0;
	for(i=0;i<Iterations && (dot(p-Cs0,p-Cs0)-BR0<0.);i++){
		p=abs(p);
		p=SphereInvert(p, vec3(C.x,0.,0.), R2.x);
		p=SphereInvert(p, vec3(0.,C.y,0.), R2.y);
		p=SphereInvert(p, vec3(0.,0.,C.z), R2.z);
		orbitTrap = min(orbitTrap, abs(vec4(p.x,p.y,p.z,dot(p,p))));
	}
	
	if (AlternateVer) return insideFunc1(p); else return insideFunc0(p);
}

#preset Default
FOV = 0.62536
Eye = -3.06216,1.1915,-1.99625
Target = 4.01125,-1.16886,2.79166
Up = 0.415475,-0.425583,-0.803903
EquiRectangular = false
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.1
AOScale = 2.18445
Glow = 0
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 2.1875
SpecularExp = 40.278
SpotLight = 1,0.678431,0.494118,0.78431
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Fog = 0
BaseColor = 0.866667,0.866667,0.866667
OrbitStrength = 0.38961
X = 1,1,1,0.24272
Y = 0.14902,0.666667,0.00784314,0.68932
Z = 1,0.529412,0.054902,0.80582
R = 0.321569,0.117647,1,0.2353
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
Iterations = 12
SR = 9.4355,1,1
TP = 3
TQ = 3
TR = 3
AlternateVer = false
UseInnerBV = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = false
#endpreset

#preset Double_cusp?(2,4,4)
FOV = 0.62536
Eye = -2.20635,0.71414,-3.06652
Target = 2.9161,-0.508546,4.06048
Up = 0.33142,-0.805763,-0.490823
EquiRectangular = false
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.58825
AOScale = 2.6699
Glow = 0.34167
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 2.1875
SpecularExp = 40.278
SpotLight = 1,0.678431,0.494118,0.78431
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Fog = 0
BaseColor = 0.780392,0.780392,0.780392
OrbitStrength = 0.37662
X = 1,1,1,0.37864
Y = 0.101961,0.866667,0.0196078,0.59224
Z = 1,0.337255,0.0313725,0.86408
R = 0.0980392,0.384314,1,0.2549
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.86955
CycleColors = false
Cycles = 11.947
Iterations = 20
SR = 10,1,1
TP = 2
TQ = 4
TR = 4
AlternateVer = false
UseInnerBV = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = false
#endpreset

#preset closeup
FOV = 0.62536
Eye = -1.83412,0.925084,-1.14716
Target = 4.54562,-2.9233,3.65048
Up = 0.397165,-0.353717,-0.846844
EquiRectangular = false
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.1
AOScale = 2.6699
Glow = 0
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 3.0208
SpecularExp = 8.929
SpotLight = 1,0.678431,0.494118,0.70588
SpotLightDir = 0.93846,-1
CamLight = 1,1,1,0.28986
CamLightMin = 0
Fog = 0
BaseColor = 0.780392,0.780392,0.780392
OrbitStrength = 0.55844
X = 1,0.709804,0.611765,0.24272
Y = 0.345098,0.666667,0,0.8835
Z = 1,0.419608,0.0313725,0.94174
R = 0.129412,0.388235,1,0.31372
BackgroundColor = 0.133333,0.192157,0.121569
GradientBackground = 0.86955
CycleColors = false
Cycles = 7.39072
Iterations = 20
SR = 10,1,1
TP = 2
TQ = 4
TR = 4
AlternateVer = false
UseInnerBV = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = false
#endpreset

#preset Dentelle
FOV = 0.62536
Eye = -0.774949,0.960948,-1.6334
Target = 2.03428,-3.22709,5.65339
Up = 0.236387,-0.762504,-0.602253
EquiRectangular = false
Gamma = 1
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.58825
AOScale = 2.6437
Glow = 0
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 2.8125
SpecularExp = 19.444
SpotLight = 1,0.678431,0.494118,0.60294
SpotLightDir = 1,-0.06172
CamLight = 1,1,1,0.46376
CamLightMin = 0
Fog = 0
BaseColor = 0.831373,0.831373,0.831373
OrbitStrength = 0.57377
X = 1,1,1,-0.05748
Y = 0.345098,0.666667,0,0.44828
Z = 1,0.301961,0.027451,1
R = 0.0784314,1,0.941176,0.09302
BackgroundColor = 0.0196078,0.0313725,0.0431373
GradientBackground = 0.76085
CycleColors = true
Cycles = 1.1
Iterations = 12
SR = 1,1,1.2097
AlternateVer = false
TP = 2
TQ = 3
TR = 6
UseInnerBV = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = false
#endpreset

//Check AternateVer and set iterations to 1 to see what is special about it
#preset QF_244_change_first_SR_value
FOV = 0.62536
Eye = 0.160829,-3.22174,-0.359888
Target = -0.0403509,5.54683,0.905144
Up = 0.379449,0.105186,-0.919214
EquiRectangular = false
Gamma = 2.5
ToneMapping = 1
Exposure = 1.34694
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.58825
AOScale = 2.6699
Glow = 0
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 4.5833
SpecularExp = 19.444
SpotLight = 1,0.678431,0.494118,0.79412
SpotLightDir = 1,-0.06172
CamLight = 1,1,1,0.46376
CamLightMin = 0
Fog = 0
BaseColor = 0.92549,0.760784,0.333333
OrbitStrength = 0
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.403922,0.6,0.745098
GradientBackground = 0.76085
CycleColors = false
Cycles = 1.1
Iterations = 11
SR = 3.871,1,1
TP = 2
TQ = 4
TR = 4
AlternateVer = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = false
#endpreset

//Check AternateVer and set iterations to 1 to see what is special about it
#preset QF_236_change_first_SR_value
FOV = 0.62536
Eye = -1.5556,-2.74842,-0.749187
Target = 2.8913,4.56569,1.54375
Up = 0.341792,0.0431786,-0.938783
EquiRectangular = false
Gamma = 2.5
ToneMapping = 1
Exposure = 1.34694
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.58825
AOScale = 2.6699
Glow = 0
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 4.5833
SpecularExp = 19.444
SpotLight = 1,0.678431,0.494118,0.79412
SpotLightDir = 1,-0.06172
CamLight = 1,1,1,0.46376
CamLightMin = 0
Fog = 0
BaseColor = 0.92549,0.760784,0.333333
OrbitStrength = 0
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.403922,0.6,0.745098
GradientBackground = 0.76085
CycleColors = false
Cycles = 1.1
Iterations = 11
SR = 4.7581,1,1.73205
TP = 2
TQ = 3
TR = 6
AlternateVer = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = false
#endpreset

//Check AternateVer and set iterations to 1 to see what is special about it
#preset Triple_Cusp_333
FOV = 0.62536
Eye = -1.97877,1.80707,-2.75691
Target = 2.29033,-2.1847,3.90411
Up = 0.400413,-0.587501,-0.703215
EquiRectangular = false
Gamma = 2.5
ToneMapping = 1
Exposure = 1.34694
Brightness = 1
Contrast = 0.9901
Saturation = 1
NormalScale = 0.58825
AOScale = 2.6699
Glow = 0.34167
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 2.1875
SpecularExp = 40.278
SpotLight = 1,0.678431,0.494118,0.78431
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Fog = 0
BaseColor = 1,1,1
OrbitStrength = 0
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
Iterations = 10
SR = 3,1.73205,1
TP = 3
TQ = 3
TR = 3
AlternateVer = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = false
#endpreset

#preset The spaceship
FOV = 0.62536
Eye = -2.88124,1.34273,-2.16267
Target = 3.76864,-1.6141,2.89351
Up = 0.464985,-0.344009,-0.812723
EquiRectangular = false
Gamma = 2.5
ToneMapping = 1
Exposure = 1.04082
Brightness = 1.6129
Contrast = 1
Saturation = 1
NormalScale = 0.58825
AOScale = 2.0874
Glow = 0.10833
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Specular = 7.5
SpecularExp = 6.944
SpotLight = 0.27451,0.898039,0.101961,1
SpotLightDir = -0.4568,-0.03704
CamLight = 1,1,1,0.14492
CamLightMin = 0
Fog = 0
BaseColor = 1,0.168627,0.639216
OrbitStrength = 0
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0,0,0
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
Iterations = 6
SR = 9.0323,1.0408,0.9677
TP = 2
TQ = 4
TR = 4
AlternateVer = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = false
#endpreset

#preset Ahara
FOV = 0.62536
Eye = 1.53436,3.52425,-0.0830548
Target = -1.64549,-4.74114,0.233754
Up = -0.0960674,-0.00164091,-0.995373
EquiRectangular = false
Gamma = 1
ToneMapping = 1
Brightness = 1
Contrast = 0.9901
Saturation = 1
Specular = 2.1875
SpecularExp = 40.278
SpotLight = 1,0.678431,0.494118,0.78431
SpotLightDir = 1,0.78126
CamLight = 1,1,1,0.38462
CamLightMin = 0
Fog = 0
BaseColor = 0.866667,0.866667,0.866667
OrbitStrength = 0.38961
X = 1,1,1,0.24272
Y = 0.14902,0.666667,0.00784314,0.68932
Z = 1,0.529412,0.054902,0.80582
R = 0.321569,0.117647,1,0.2353
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.86955
CycleColors = false
Cycles = 1.1
Exposure = 1
NormalScale = 0.1
AOScale = 2.18445
Glow = 0
AOStrength = 1
Samples = 100
Stratify = true
DebugInside = false
CentralDifferences = true
SampleNeighbors = true
Near = 0.7368
Far = 6.19668
ShowDepth = false
DebugNormals = false
Iterations = 15
TP = 3
TQ = 3
TR = 3
AlternateVer = false
UseInnerBV = false
InvCenter = 0,0,2
InvRadius = 1.69848
DoInversion = true
SR = 1000,1,1
#endpreset