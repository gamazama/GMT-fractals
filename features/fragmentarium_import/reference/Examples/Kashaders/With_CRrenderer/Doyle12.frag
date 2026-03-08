//#version 120
#info Doyle Spirals

#vertex
#define providesInit
#endvertex

#define providesColor
//#define KN_VOLUMETRIC
#define MULTI_SAMPLE_AO
#define USE_EIFFIE_SHADOW
#include "renderer\DE-kn2.frag"

#vertex
//all the calculations done here could be (and should be) done in the host program
#group SDoyle
uniform int P; slider[0,5,50]
uniform int Q; slider[3,5,50]
//scale the radius of the spheres
uniform float SRadScl; slider[0,1,2]

varying mat2 Mat,iMat;
varying vec4 rads, xps, yps;
varying vec2 ns;

#define PI  3.14159265358979323846264
//given an etimated z find the solution to Doyle spiral equations using Newton-Raphson method
//The equations are:
//r=(exp(2*z.x)-2*exp(z.x)*cos(z.y)+1)/(exp(z.x)+1)
//r=(exp(2*zt.x)-2*exp(zt.x)*cos(zt.y)+1)/(exp(zt.x)+1)
//r=(exp(2*z.x)-2*exp(z.x)*exp(zt.x)*cos(z.y-zt.y)+exp(2*zt.x))/(exp(z.x)+exp(zt.x))
//z.x*p=zt.x*q
//z.y*p+2*PI=zt.y*q; In reality it should be:z.y*p+2*k*PI=zt.y*q; k is in Z set; I haven't esplored other values of k than 1
//z corresponds to similarity 'a' and zt to similarity 'b'
//a=exp(z); and b=exp(zt); because these are complex numbers :)
vec2 solve(vec2 z){
	//Newton-Raphson method
	float k=float(P)/float(Q);
	for(int i=0; i<2;i++){//2 iterations are usually sufficient: the convergence is very fast. especially when P o=and/or Q are relatively big
		float lb=z.x*k, tb=z.y*k+2.*PI/float(Q);
		float ra=exp(z.x),rb=exp(lb),ca=cos(z.y),cb=cos(tb),cab=cos(z.y-tb);
		//compute function values
		vec3 v=vec3((ra*ra-2.*ra*ca+1.)/((ra+1.)*(ra+1.)),
					     (rb*rb-2.*rb*cb+1.)/((rb+1.)*(rb+1.)),
					     (ra*ra-2.*ra*rb*cab+rb*rb)/((ra+rb)*(ra+rb)));
		vec2 f=v.xy-v.yz;
		//compute jacobian
		vec3 c=2.*vec3( ra/((ra+1.)*(ra+1.)), k*rb/((rb+1.)*(rb+1.)), (1.-k)*ra*rb/((ra+rb)*(ra+rb)) );
		vec3 v0= c*vec3( (1.+ca)*(ra-1.)/(ra+1.), (1.+cb)*(rb-1.)/(rb+1.), (1.+cab)*(ra-rb)/(ra+rb) );
		vec3 v1= c*sin(vec3(z.y,tb,z.y-tb));
		mat2 J = mat2(0.);
		J[0]=v0.xy-v0.yz; J[1]=v1.xy-v1.yz;
		//compute inverse of J
		float idet=1./(J[0][0]*J[1][1]-J[0][1]*J[1][0]);
		mat2 iJ=-J;
		iJ[0][0]=J[1][1];
		iJ[1][1]=J[0][0];
		//next value
		z-=idet*( iJ*f);
	}
	return z;
}
void init() {
	//find estimate
	//notice that for big P and/or Q the packing will look just like hexagonal one
	//if we take the centers of all packed circles in log-polar plane we will get almost a triangular array
	//That's why I'm using log-polar plane
	//notice also the link to drost effect ;)
	//Someone already noticed that before: http://gimpchat.com/viewtopic.php?f=10&t=3941
	vec2 v=vec2(-float(P)+float(Q)*0.5,float(Q)*sqrt(3.)*0.5);
	float vd=1./length(v);
	float scl=2.*PI*vd;
	vec2 z=scl*vd*v.yx;
	z=solve(z);
	float k=float(P)/float(Q);
	vec2 zt=vec2(z.x*k,z.y*k+2.*PI/float(Q));
	Mat[0]=z;Mat[1]=zt;
	iMat=-Mat;
	iMat[0][0]=Mat[1][1]; iMat[1][1]=Mat[0][0];
	iMat*=1./(Mat[0][0]*Mat[1][1]-Mat[0][1]*Mat[1][0]);
	float ra=exp(z.x),rb=exp(zt.x),ca=cos(z.y);
	float rs=sqrt((ra*ra-2.*ra*ca+1.)/((ra+1.)*(ra+1.)));//radius of the circle centered at (1,0)
	rs*=SRadScl;//for some variations
	rads=rs*vec4(1., ra, rb, ra*rb);//radius for the 4 circles in the fundamental domain
	xps=vec4(1.,ra*ca,rb*cos(zt.y),ra*rb*cos(z.y+zt.y));//Their x coordinates
	yps=vec4(0.,ra*sin(z.y),rb*sin(zt.y),ra*rb*sin(z.y+zt.y));//y
	ns=vec2(-rs,sqrt(1.-rs*rs));//defines bounding cone
}
#endvertex

uniform int P,Q;
//Want do do an inversion
uniform bool DoInversion; checkbox[false]
//Inversion center
uniform vec3 InvCenter; slider[(-1,-1,-1),(0,0,0),(1,1,1)]
//Inversion radius squared
uniform float InvRadius;  slider[0.01,1,2]

#group SDCol
uniform int CP; slider[0,5,50]
uniform int CQ; slider[0,5,50]
uniform int CR; slider[0,5,50]


varying mat2 Mat,iMat;
varying vec4 rads, xps, yps;
varying vec2 ns;

vec3 CDoyle(vec3 z){
	vec2 p=z.xy;
	//transform to the plane log-polar
	p=vec2(log(length(p)), atan(p.y,p.x));
	//transform into the "oblique" base (defined by z and zt in vinit() function above)
	vec2 pl=iMat*p;
	//go to the losange defined by z and zt (as defined in vinit())
	vec2 ip=floor(pl);
	pl=pl-ip;
	//back to log-polar plane
	pl=Mat*pl;
	//scale and delta-angle
	float scl=exp(pl.x-p.x),angle=pl.y-p.y;
	//the original z is scaled and rotated using scl and angle
	z*=scl;
	float c=cos(angle),s=sin(angle);
	z.xy=z.xy*mat2(vec2(c,-s),vec2(s,c));//tourner z
	//distances to the spheres that are inside the fundamental fundamental domain
	vec4 vx=vec4(z.x)-xps;
	vec4 vy=vec4(z.y)-yps;
	vec4 vz=vec4(z.z);
	vec4 dists=sqrt(vx*vx+vy*vy+vz*vz)-rads;
	//take the minimal distance
	float mindist=min(min(dists.x,dists.y),min(dists.z,dists.w));
	//which is the nearest sphere
	bvec4 bvhit=equal(dists,vec4(mindist));
	int mindex=int(dot(vec4(bvhit),vec4(0.,1.,2.,3.)));
	const mat4 set=mat4(vec4(0.,0.,0.,0.),vec4(1.,0.,1.,0.),vec4(0.,1.,1.,0.),vec4(1.,1.,2.,0.));
	vec3 minprop=set[mindex].xyz;
	vec3 bc=vec3(ip,ip.x+ip.y)+minprop;
	bc=bc*vec3(ivec3(CP,CQ,CR))/vec3(ivec3(P,Q,Q-P));
	bc-=floor(bc);
	return bc;//serves for the coloring
}

vec3 baseColor(vec3 p, vec3 n) {
	if(DoInversion){
		p=p-InvCenter;
		float r2=dot(p,p);
		p=(InvRadius/r2)*p+InvCenter;
	}
	return CDoyle(p).rgb*4.;//sin(10.*PI*CDoyle(p)+2.)*0.5+0.5;//
}

float Doyle(vec3 z){
	//find the nearest point on the bounding cone to z
	//if z is inside the cone we don't change anything
	//normal to the line defining the (upper) cone in (r,z) plane is given by ns
	z.z=abs(z.z);
	vec2 p=vec2(length(z.xy),abs(z.z));
	float r=p.x;
	p-=ns*max(0.,dot(ns,p));
	p=z.xy*p.x/r;
	//transformer vers le plan log-polaire
	p=vec2(log(length(p)), atan(p.y,p.x));
	//transformer dans la base 'presque' triangulaire
	vec2 pl=iMat*p;
	//ramener vers le losange de base
	pl=pl-floor(pl);
	//transformation inverse
	pl=Mat*pl;
	float scl=exp(pl.x-p.x),angle=pl.y-p.y;
	z*=scl;//mettre z a l'echelle
	float c=cos(angle),s=sin(angle);
	z.xy=z.xy*mat2(vec2(c,-s),vec2(s,c));//tourner z
	//calculer les distances vers les spheres qui sont dans le domaine fondamental
	vec4 vx=vec4(z.x)-xps;
	vec4 vy=vec4(z.y)-yps;
	vec4 vz=vec4(z.z);
	vec4 dists=sqrt(vx*vx+vy*vy+vz*vz)-rads;
	//prendre la distance minimale
	return min(min(dists.x,dists.y),min(dists.z,dists.w))/scl;
}

float DE(vec3 p) {
	if(DoInversion){
		p=p-InvCenter;
		float r=length(p);
		float r2=r*r;
		p=(InvRadius/r2)*p+InvCenter;
		float de=Doyle(p);
		de=r2*de/(InvRadius+r*de);
		return de;
	}
	else return Doyle(p);
}
#preset Default
FOV = 0.45528
Eye = -0.267908,-2.0316,1.59561
Target = 1.13147,5.20425,-3.32504
Up = 0.27302,0.448943,0.850829
FocalPlane = 1.8604
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 3
Exposure = 0.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.41
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.03541
RefineSteps = 3
FudgeFactor = 1
MaxRaySteps = 330
MaxDistance = 20
Dither = 0.51754
NormalBackStep = 1
DetailAO = -1.14289
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 0.7
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.39216
SpecularExp = 500
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1.13726
Glow = 1,1,1,0
GlowMax = 122
Reflection = 0.207843,0.207843,0.207843
ReflectionsNumber = 2
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = 0.9678,-0.7526,1.613
LightSize = 0.19802
LightFallOff = 1.05618
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0.79268
ShadowSoft = 0
BaseColor = 0.227451,0.227451,0.227451
OrbitStrength = 0.44156
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.466667,0.658824,0.105882
GradientBackground = 0
CycleColors = false
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
P = 19
Q = 3
SRadScl = 1
DoInversion = true
InvCenter = 0.77778,0,0
InvRadius = 0.99453
CP = 5
CQ = 5
CR = 5
#endpreset

#preset Balls
FOV = 0.45528
Eye = -1.92908,-2.35857,2.58242
Target = 2.64862,2.34135,-3.37442
Up = 0.343447,0.529921,0.775389
FocalPlane = 1.8604
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 3
Exposure = 0.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.41
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.96459
RefineSteps = 3
FudgeFactor = 1
MaxRaySteps = 330
MaxDistance = 20
Dither = 0.51754
NormalBackStep = 1
DetailAO = -1.7143
coneApertureAO = 0.74194
maxIterAO = 23
AO_ambient = 0.88096
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.39216
SpecularExp = 500
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1.13726
Glow = 1,1,1,0
GlowMax = 122
Reflection = 0.298039,0.298039,0.298039
ReflectionsNumber = 3
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = 0.9678,-0.7526,1.613
LightSize = 0.0297
LightFallOff = 1.05618
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0.79268
ShadowSoft = 0
BaseColor = 0.227451,0.227451,0.227451
OrbitStrength = 0.44156
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.34902,0.4,0.470588
GradientBackground = 0
CycleColors = false
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
P = 19
Q = 3
SRadScl = 0.99
DoInversion = true
InvCenter = 0.77778,0,0.26666
InvRadius = 0.99453
CP = 5
CQ = 5
CR = 5
#endpreset

#preset Balls2
FOV = 0.45528
Eye = -1.92908,-2.35857,2.58242
Target = 2.64862,2.34135,-3.37442
Up = 0.396131,0.491784,0.775389
FocalPlane = 4.07919
Aperture = 0.185
InFocusAWidth = 0.05714
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = true
Gamma = 1
ToneMapping = 3
Exposure = 0.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.41
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.96459
RefineSteps = 3
FudgeFactor = 1
MaxRaySteps = 330
MaxDistance = 20
Dither = 0.51754
NormalBackStep = 1
DetailAO = -1.7143
coneApertureAO = 0.74194
maxIterAO = 23
AO_ambient = 0.88096
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.88236
SpecularExp = 500
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1.13726
Glow = 1,1,1,0
GlowMax = 122
Reflection = 0.298039,0.298039,0.298039
ReflectionsNumber = 3
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = 0.9678,-0.7526,1.613
LightSize = 0.0297
LightFallOff = 1.05618
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0.79268
ShadowSoft = 0
BaseColor = 0.227451,0.227451,0.227451
OrbitStrength = 0.44156
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.34902,0.4,0.470588
GradientBackground = 0
CycleColors = false
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
P = 19
Q = 3
SRadScl = 0.99
DoInversion = true
InvCenter = 0.77778,0,0.26666
InvRadius = 0.99453
CP = 5
CQ = 5
CR = 5
#endpreset

#preset Noname
FOV = 0.45528
Eye = -0.0621443,-2.22608,1.6525
Target = 0.165824,4.81523,-3.72305
Up = -0.0107595,-0.0262306,0.999598
FocalPlane = 1.8604
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.41
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.03541
RefineSteps = 3
FudgeFactor = 1
MaxRaySteps = 330
MaxDistance = 20
Dither = 0.51754
NormalBackStep = 1
DetailAO = -0.35714
coneApertureAO = 0.72581
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.17648
SpecularExp = 500
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 122
Reflection = 0.207843,0.207843,0.207843
ReflectionsNumber = 2 Locked
SpotGlow = true
SpotLight = 1,1,1,10
LightPos = 2.258,-0.7526,1.613
LightSize = 0.19802
LightFallOff = 1.05618
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0.79268
ShadowSoft = 0
BaseColor = 0.231373,0.231373,0.231373
OrbitStrength = 0.23377
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0.466667,0.658824,0.105882
GradientBackground = 0
CycleColors = false
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
P = 19
Q = 3
SRadScl = 1
DoInversion = true
InvCenter = 0.77778,0,0
InvRadius = 0.99453
CP = 5
CQ = 5
CR = 5
#endpreset

#preset Non_
FOV = 0.3537
Eye = -0.267908,-2.0316,1.59561
Target = 0.956603,4.95138,-3.72107
Up = 0.483332,0.284564,0.827897
FocalPlane = 1.8604
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 1
ToneMapping = 3
Exposure = 0.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.41
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -4
RefineSteps = 4
FudgeFactor = 1
MaxRaySteps = 330
MaxDistance = 20
Dither = 0.51754
NormalBackStep = 1
DetailAO = -1.20134
coneApertureAO = 0.99625
maxIterAO = 16
AO_ambient = 0.782
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.26058
SpecularExp = 500
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 122
Reflection = 0.239216,0.372549,0.223529
ReflectionsNumber = 3
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 0.9678,-0.7526,1.613
LightSize = 0.09343
LightFallOff = 0.99638
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 0.79268
ShadowSoft = 0
BaseColor = 0.32549,0.32549,0.32549
OrbitStrength = 0.48679
X = 1,1,1,1
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,1
R = 0.0784314,1,0.941176,-0.0194
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.20953
HF_Const = 0
HF_Intensity = 0.02974
HF_Dir = 0,0,1
HF_Offset = -0.775
HF_Color = 1,1,1,1
HF_Scatter = 9.811
HF_Anisotropy = 0,0,0,0
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
P = 19
Q = 3
SRadScl = 1
DoInversion = true
InvCenter = 0.77778,0,0
InvRadius = 0.99453
CP = 3
CQ = 5
CR = 8
#endpreset

