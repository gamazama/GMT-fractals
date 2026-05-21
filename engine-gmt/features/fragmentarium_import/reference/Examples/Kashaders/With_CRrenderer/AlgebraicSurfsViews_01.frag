#version 460 //to make sure it will work on glsl 1.10 compliant drivers

#info A little shader that renders Barth's sextic, Barth's decic and Sarti's dodecic algebraic surfaces (knighty 2016).
#info It uses transformation in order to visualise what happens on the plane at infinity.
#info in "DE parameters" tab use RotVector and RotAngle sliders to rotate the implicit surface in xyz space.
#info  Use WAngle to perform a rotation in zw plane.
#info and Use GFactor for other fancy effects.
#info Based on: algebraic surfaces (and others) Distance Estimator (knighty 2011). See: algebraic07.frag in menu examples->Knighty collection

//#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#define providesInit
#define providesColor
//#define COMP09
#include "renderer\DE-kn2.frag"
//#include "MathUtils.frag"

#group Implicit surface parametres
//DE correction param: Lipschitzator (lol) factor
uniform float param2; slider[0,4,500]
//Level set
uniform float LevelSet; slider[-1,0,1]
//Level set
uniform float IntThick; slider[0,0.01,0.1]
//Implicit type: 0: Barth sextic; 1:Labs septic; 2:Barth decic; 3:Sarti dodecic;
uniform int ImpType; slider[0,1,6]
//Rotation in xyz space
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
uniform float RotAngle; slider[-180,0,180]
//Rotation involving w
uniform float WAngle; slider[-180,0,180]
//Cut by plane at infinity?
uniform bool CutByPlane; checkbox[false]
//Cut by sphere. For convenience
uniform bool CutBySphere; checkbox[false]
//Cutting sphere radius
uniform float SphereCutRad; slider[0.1,1,10]
//Geometry factor: -1: hyperbolic; 0:euclidean; 1:spherical;
uniform float GFactor; slider[-1,0,1]

uniform float time;

#define Phi (.5*(1.+sqrt(5.)))

#define PHI  1.618034
#define PHI2 2.618034
#define PHI4 6.854102

#define Tau (1.+2.*Phi)

#define Eps 0.00048828125               //epsilon
#define IEps 2048.0                     //Inverse of epsilon



mat3 rot;
mat2 wrot;

//problems with mathutils.frag !!!
#if 1
// Return rotation matrix for rotating around vector v by angle
mat3  rotationMatrix3(vec3 v, float angle)
{
	float c = cos(radians(angle));
	float s = sin(radians(angle));

	return mat3(c + (1.0 - c) * v.x * v.x, (1.0 - c) * v.x * v.y - s * v.z, (1.0 - c) * v.x * v.z + s * v.y,
		(1.0 - c) * v.x * v.y + s * v.z, c + (1.0 - c) * v.y * v.y, (1.0 - c) * v.y * v.z - s * v.x,
		(1.0 - c) * v.x * v.z - s * v.y, (1.0 - c) * v.y * v.z + s * v.x, c + (1.0 - c) * v.z * v.z
		);
}
#endif

void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
	float c = cos(radians(WAngle));
	float s = sin(radians(WAngle));
	wrot=mat2(vec2(c,s),vec2(-s,c));
}

//Implicits ---------------------------------------

float Togliatti_5(vec4 z) //See http://www2.mathematik.uni-mainz.de/alggeom/docs/Etogliatti.shtml http://mathworld.wolfram.com/TogliattiSurface.html
{
	vec4 z2 = z*z;
	float P = z2.x*(z2.x-4.*z.x*z.w-10.*z2.y-4.*z2.w)+z.x*z.w*(16.*z2.w-20.*z2.y)+5.*z2.y*z2.y+z2.w*(16.*z2.w-20.*z2.y);
	float Q = 4.*(z2.x+z2.y-z2.z)+(1.+3.*sqrt(5.))*z2.w;
	Q = (2.*z.z - z.w*sqrt(5.-sqrt(5.))) * Q*Q;
	return  64.*(z.x-z.w)*P - 5.*sqrt(5.-sqrt(5.))*Q;
}

float Barth6(vec4 z)//sextic
{
	vec4 z2=z*z;
	vec3 z3=PHI2*z2.xyz-z2.yzx;
	float p1=4.*z3.x*z3.y*z3.z;
	float r2=dot(z.xyz,z.xyz)-z2.w;
	float p2=Tau*(r2*r2)*z2.w;
	return p2-p1;
}

float Labs7(vec4 p){
   float a = -0.14010685;//the real root of 7*a^3+7*a+1=0
   float a1= (-12./7.*a-384./49.)*a-8./7., a2= (-32./7.*a+24./49.)*a-4.; 
   float a3= (-4.*a+24./49.)*a-4., a4= (-8./7.*a+8./49.)*a-8./7.; 
   float a5= (49.*a-7.)*a+50.;
   float	r2= dot(p.xy,p.xy);
   vec4 p2=p*p;
   float U = (p.z+p.w)*r2+(a1*p.z+a2*p.w)*p2.z+(a3*p.z+a4*p.w)*p2.w;
   U = (p.z+a5*p.w)*U*U;
   float P = p.x*((p2.x-3.*7.*p2.y)*p2.x*p2.x+(5.*7.*p2.x-7.*p2.y)*p2.y*p2.y);
   P+= p.z*(7.*(((r2-8.*p2.z)*r2+16.*p2.z*p2.z)*r2)-64.*p2.z*p2.z*p2.z);
   return U-P;
}

float Sarti8(vec4 p){
	vec4 p2 = p*p;
	vec4 p4 = p2*p2;
	vec4 p8 = p4*p4;
	float r2  = dot(p,p);
	return dot(p4,p4) + 14.*(p4.x*dot(p2.yzw,p2.yzw) + p4.y*dot(p2.zw,p2.zw)+p4.z*p4.w) + 168. * (p2.x*p2.y*p2.z*p2.w) - 9.0/16. * r2*r2*r2*r2; 
	//x^8+y^8+z^8+w^8+14*(x^4*(y^4+z^4+w^4)+y^4*(z^4+w^4)+(z*w)^4)+   168*(x*y*z*w)^2-9/16*(x^2+y^2+z^2+w^2)^4
}

float Chmutov8(vec4 P){//octic
   vec4 P2=P*P;
   //vec3 R = 1.*P2.w*P2.w*P2.w*P2.w+P2.xyz*32.*(-1.*P2.w*P2.w*P2.w+P2.xyz*(5.*P2.w*P2.w+P2.xyz*(-8.*P2.w+P2.xyz*4.)));
   vec3 R=P2.w*P2.w*P2.w*P2.w+P2.xyz*32.0*(-1.0*P2.w*P2.w*P2.w+P2.xyz*(5.0*P2.w*P2.w+P2.xyz*(-8.0*P2.w+P2.xyz*4.0)));
	float Mu = 1.;
	return R.x+R.y+R.z+Mu*P2.w*P2.w*P2.w*P2.w;
}

float Barth10(in vec4 P){//decic
   float r2=dot(P.xyz,P.xyz);
   vec4 P2=P*P;
   float r4=dot(P2.xyz,P2.xyz);
   vec4 P4=P2*P2;
   return (8.0*(P2.x-PHI4*P2.y)*(P2.y-PHI4*P2.z)*(P2.z-PHI4*P2.x)*(r4-2.0*((P.x*P.y)*(P.x*P.y)+(P.x*P.z)*(P.x*P.z)+(P.y*P.z)*(P.y*P.z)))+(3.0+5.0*PHI)*(r2-P2.w)*(r2-P2.w)*(r2-(2.0-PHI)*P2.w)*(r2-(2.0-PHI)*P2.w)*P2.w);
}

//   Dodecics
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

//---------------------------------------
float fff=0.;
vec4 Trans(vec3 z){//A (inverse) stereographic transformation. Depending on GFactor we will get:  -1: hyperbolic; 0:euclidean; 1:spherical;
	//Hyperbolic means we choose the homogeneous 4-coordinates to lie on the 3-hyperboloid: x²+y²+z²-w²+1=0
	//Euclidean means we choose the homogeneous 4-coordinates to lie on the 3-plane: w=1
	//Spherical means we choose the homogeneous 4-coordinates to lie on the 3-sphere: x²+y²+z²+w²-1=0
	vec4 p = vec4(z,0.);
	float r2 = dot(p.xyz,p.xyz);
	r2 *= GFactor;
	p.xyz *= 2./(r2+1.);
	p.w = (1.-r2)/(1.+r2);
	fff=1./(1.+p.w);
	//rotate in wz plane
	p.zw = wrot *p.zw;
	//rotate in xyz space
	p.xyz = rot * p.xyz;
	return p;
}

float Fn1(vec4 p)
{
	if(ImpType == 0) return Barth6(p);
	if(ImpType == 1) return Labs7(p);
	if(ImpType == 2) return Barth10(p);
	if(ImpType == 3) return Sarti12(p);
	if(ImpType == 4) return Sarti8(p);
	if(ImpType == 5) return Togliatti_5(p);
	if(ImpType == 6) return Chmutov8(p);
}

float Fn(vec3 p)
{
	vec4 p4 = Trans(p);
	float v =Fn1(p4); float ff=fff; v-=LevelSet;
	float dv=length(IEps*(vec4(Fn1(p4+vec4(Eps,0.,0.,0.)),Fn1(p4+vec4(0.,Eps,0.,0.)),Fn1(p4+vec4(0.,0.,Eps,0.)),Fn1(p4+vec4(0.,0.,0.,Eps)))-vec4(v)));
	float k = abs(v)/(abs(v)+1.);
	v=v/(dv+param2*k+.001);
	return v*abs(ff);
}

float InfPlnImg(vec3 p){//Image of the plane at infinity
	vec4 p4 = Trans(p);
	return -p4.w*min(1.,fff);
}

float DE(vec3 z)
{
	float v =Fn(z); v=abs(v+IntThick)-IntThick;

	float pinf = InfPlnImg(z);

	if (CutByPlane) v = max(v,pinf);
	if (CutBySphere) v = max(v,length(z)-SphereCutRad);
	return v;
}

vec3 baseColor(vec3 z, vec3 n){
	float v =Fn(z);
#if 0
	if(dot(z,z)>1. && v>0.) return vec3(.5, 0., 0.5);
#endif
	if(v>-2.*IntThick) return mix(n,vec3(0.75,0.75,0.75),0.8);
	return vec3(1.,0.,0.);
}



#preset default
FOV = 0.42276
Eye = 0.240308,-2.07349,1.72573
Target = -0.153429,0.715249,-0.984112
Up = -0.00961932,-0.0100582,0.999903
FocalPlane = 3.37083
Aperture = 0.04217
InFocusAWidth = 0.16981
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
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.9
MaxRaySteps = 1027
MaxDistance = 276.6
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -3.5484,-7.6344,10
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667
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
param1 = 1
param2 = 0
LevelSet = 0
IntThick = 0.00191
ImpType = 0 Locked
RotVector = 0.52083,0.13542,0.20833
RotAngle = 62.892
WAngle = -90
CutByPlane = true Locked
CutBySphere = false Locked
SphereCutRad = 1.4
GFactor = 0
#endpreset

#preset Derwich
FOV = 0.42276
Eye = 1.45385756,-4.43106412,1.15680293
Target = 0.212275761,-0.888663123,0.068130567
Up = 0.06751364,0.230515602,0.673072099
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
Detail = -5
FudgeFactor = 0.9 Locked
Dither = 0.86598 Locked
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
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
FocalPlane = 3.42108215
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxRaySteps = 1027 Locked
MaxDistance = 276.6
SpotLight = 1,1,1,5
LightPos = -3.5484,-7.6344,10
FloorHeight = 0
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667,0
HF_FogIter = 8
IntThick = 0.00191
RotVector = 0.52083,0.13542,0.20833
RotAngle = 0
WAngle = 90
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 2
GFactor = 0
param2 = 0
LevelSet = 0
ImpType = 5 Locked
#endpreset

#preset Chmutov
FOV = 0.42276
Eye = 1.02089192,-1.8430098,1.36244445
Target = -0.562408284,0.992738011,-0.811729539
Up = -0.003496216,0.433591376,0.568073834
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
Detail = -5
FudgeFactor = 0.9 Locked
Dither = 0.86598 Locked
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
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
FocalPlane = 3.42108215
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxRaySteps = 1027 Locked
MaxDistance = 276.6
SpotLight = 1,1,1,5
LightPos = -3.5484,-7.6344,10
FloorHeight = 0
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667,0
HF_FogIter = 8
IntThick = 0.00191
RotVector = 0.52083,0.13542,0.20833
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 2
GFactor = 0
param2 = 0
LevelSet = 0
ImpType = 6 Locked
#endpreset

#preset Sarti-8
FOV = 0.42276
Eye = 2.05404216,-4.33328858,3.45221234
Target = 0.698815848,-1.48266863,1.14729038
Up = -0.012069784,0.445791886,0.558431285
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
Detail = -5
FudgeFactor = 0.9 Locked
Dither = 0.86598 Locked
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
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
FocalPlane = 3.42108215
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxRaySteps = 1027 Locked
MaxDistance = 276.6
SpotLight = 1,1,1,5
LightPos = -3.5484,-7.6344,10
FloorHeight = 0
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667,0
HF_FogIter = 8
IntThick = 0.00191
RotVector = 0.52083,0.13542,0.20833
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 2
GFactor = 0
param2 = 0
LevelSet = 0
ImpType = 4 Locked
#endpreset

#preset Sarti-12
FOV = 0.42276
Eye = 2.05404216,-4.33328858,3.45221234
Target = 0.698815848,-1.48266863,1.14729038
Up = -0.012069784,0.445791886,0.558431285
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
Detail = -5
FudgeFactor = 0.9 Locked
Dither = 0.86598 Locked
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
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
FocalPlane = 3.42108215
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxRaySteps = 1027 Locked
MaxDistance = 276.6
SpotLight = 1,1,1,5
LightPos = -3.5484,-7.6344,10
FloorHeight = 0
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667,0
HF_FogIter = 8
IntThick = 0.00191
RotVector = 0.52083,0.13542,0.20833
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 2.05073896
GFactor = 0
param2 = 0
LevelSet = 0
ImpType = 3 Locked
#endpreset

#preset Barth-10
FOV = 0.42276
Eye = 1.33092081,-2.80339336,2.03116976
Target = -0.066851583,0.127179693,-0.144447771
Up = -0.000956466,0.425693049,0.574026217
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
Detail = -5
FudgeFactor = 0.9 Locked
Dither = 0.86598 Locked
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
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
FocalPlane = 3.42108215
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxRaySteps = 1027 Locked
MaxDistance = 276.6
SpotLight = 1,1,1,5
LightPos = -3.5484,-7.6344,10
FloorHeight = 0
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667,0
HF_FogIter = 8
IntThick = 0.00191
RotVector = 0.52083,0.13542,0.20833
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 1.29482763
GFactor = 0
param2 = 0
LevelSet = 0
ImpType = 2 Locked
#endpreset

#preset Barth-6
FOV = 0.42276
Eye = 1.33092081,-2.80339336,2.03116976
Target = -0.066851583,0.127179693,-0.144447771
Up = -0.000956466,0.425693049,0.574026217
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
Detail = -5
FudgeFactor = 0.9 Locked
Dither = 0.86598 Locked
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
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
FocalPlane = 3.42108215
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxRaySteps = 1027 Locked
MaxDistance = 276.6
SpotLight = 1,1,1,5
LightPos = -3.5484,-7.6344,10
FloorHeight = 0
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667,0
HF_FogIter = 8
IntThick = 0.00191
RotVector = 0.52083,0.13542,0.20833
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 1.29482763
GFactor = 0
param2 = 0
LevelSet = 0
ImpType = 0 Locked
#endpreset

#preset Labs-7
FOV = 0.42276
Eye = 0.777649275,-2.1281299,2.9363821
Target = -0.03293226,0.081681354,-0.18371878
Up = -0.067255902,0.57224703,0.422766561
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
Detail = -5
FudgeFactor = 0.9 Locked
Dither = 0.86598 Locked
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.34902,0.34902,0.286275
ReflectionsNumber = 0 Locked
SpotGlow = false
LightSize = 0.0198
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.08695
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 0.42731
HF_Const = 0
HF_Intensity = 0.04938
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.737255,0.639216,0.596078,0.00117
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
FocalPlane = 3.42108215
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2 NotLocked
ApertureRot = 0
ApStarShaped = false NotLocked
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxRaySteps = 1027 Locked
MaxDistance = 276.6
SpotLight = 1,1,1,5
LightPos = -3.5484,-7.6344,10
FloorHeight = 0
HF_Scatter = 41.667
HF_Anisotropy = 0.403922,0.317647,0.266667,0
HF_FogIter = 8
IntThick = 0.00191
RotVector = 0.52083,0.13542,0.20833
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 1.83128081
GFactor = 0
param2 = 0
LevelSet = 0
ImpType = 1 Locked
#endpreset
