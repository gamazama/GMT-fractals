#info Kleinian groups
#info Original idea and code by Jos Leys (Dec 2016)
#info Some cosmetic modifications by Naït Merzouk Abdelaziz (A.k.a. Knighty) and ...
#info Trying other tilings than default square one. Unfortunately there are discontinuities.
#info I wonder if those discontinuities are "real" or just artifacts from the rendering method.
#info lisence:  Ask Jos Leys ;-)

//#include "IBL-Raytracer.frag"
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#define providesInit
#include "renderer\DE-Kn2.frag"
//#include "MathUtils.frag"

#group Kleinian_test
uniform int Box_Iterations;  slider[1,50,100]
//Trace of the transformation a
uniform float KleinR;  slider[1.8,2.0,2.0]
uniform float KleinI;  slider[-0.2,0.0,0.2]
//angles cosines. if <1 it will be rounded to the nearest cos(PI/n). If >=1 it is free
uniform float AlphaX; slider[0.,0.,3.]
uniform float AlphaZ; slider[0.,0.,3.]
uniform float AlphaXZ; slider[0.,1.,5.]
//To really give a kleinian group they must be of the form cos(PI/n) if <1 and any value if >=1
//uniform float box_size_z;  slider[0.0,0.5,1.0]
//uniform float box_size_x;  slider[0.0,0.5,1.0]
//WIP: Help get better DE?
uniform int Final_Iterations;  slider[0,5,20]
//Want do show the balls
uniform bool ShowBalls; checkbox[true]
//4 generators or 3? apply y translation
uniform bool FourGen; checkbox[false]
//The DE is wilde. It needs some clamping
uniform float Clamp_y;  slider[0.01,1.0,10.0]
uniform float Clamp_DF;    slider[0.0,1.0,10.0]

#group SphInv

//Want do do an inversion
uniform bool DoInversion; checkbox[false]
//Inversion center
uniform vec3 InvCenter; slider[(-1,-1,-1),(0,0,0),(1,1,1)]
//Inversion radius squared
uniform float InvRadius;  slider[0.01,1,2]
//Recenter
uniform vec3 ReCenter; slider[(-5,-5,-5),(0,0,0),(5,5,5)]

//initialization
float Tx=1., Tzz=1., Tzx=0.;

void init(){
	float ax=AlphaX, az=AlphaZ, axz=AlphaXZ;
	//Round angles to one of the form PI/n
#if 1
	if(ax<1.) ax = cos(PI/floor(PI/acos(ax)));
	if(az<1.) az = cos(PI/floor(PI/acos(az)));
	//if(axz<1.) axz = cos(PI/floor(PI/acos(axz)));
#endif
	//compute translations
	float lx = sqrt(2.*(1.+ ax)), lz = sqrt(2.*(1. + az));
	float ct = (lx*lx + lz*lz - 2.*(1.+ axz))/(2.*lx*lz);
	if(abs(ct)<1.) 
	{
		Tx = 0.5 * lx;
		Tzx = 0.5 * lz * ct;
		Tzz = 0.5 * lz * sqrt(1.-ct*ct);
	}
}
//---------------------
float dot2(vec3 z){ return dot(z,z);}

vec3 wrap(vec3 x, vec3 a){
	vec3 s = -0.5*a;
	x -= s; 
	return (x-a*floor(x/a)) + s;
}

vec2 wrap(vec2 x, vec2 a){
	vec2 s = -0.5*a;
	x -= s; 
	return (x-a*floor(x/a)) + s;
}

float wrap(float x, float a){
	float s = -0.5*a;
	x -= s; 
	return (x-a*floor(x/a)) + s;
}
float wrap2(float x, float a){
	return (x-a*floor(x/a));
}

vec3 correctz(vec3 z){
	float d2 = 1e30;
	float Tx2=2.*Tx, Tzx2=2.*Tzx, Tzz2=2.*Tzz;
	vec3 nn = vec3(0.);
	for(float nx=-1.; nx<=1.; nx+=1.)
		for(float ny=0.; ny<=0.; ny+=1.)
			for(float nz=-1.; nz<=1.; nz+=1.){
				float dd2=dot2(z-vec3(nx*Tx2+nz*Tzx2-ny*KleinI, ny*KleinR, nz*Tzz2));
				if(dd2<d2){
					d2=dd2;
					nn=vec3(nx,ny,nz);
				}
			}
	return z-vec3(nn.x*Tx2+nn.z*Tzx2-nn.y*KleinI, nn.y*KleinR, nn.z*Tzz2);
}
vec3 wrapit(vec3 z){
	
	z.x=z.x-Tzx/Tzz*z.z;
	if (FourGen){
		z.x=z.x+KleinI/KleinR*z.y;
		z.y = wrap2(z.y,  KleinR);
		z.xz = wrap(z.xz, 2. * vec2( Tx,  Tzz));
		z.x=z.x-KleinI/KleinR*z.y;
	} else
		z.xz = wrap(z.xz, 2. * vec2( Tx,  Tzz));
	z.x=z.x+Tzx/Tzz*z.z;
	
	return correctz(z);
}

void TransA(inout vec3 z, inout float DF, float a, float b){
	float iR = 1. / dot2(z);
	z *= iR;
	z.x = b + z.x; z.y = a - z.y; 
	DF *= iR;//max(1.,iR);
}

void TransAInv(inout vec3 z, inout float DF, float a, float b){
	//float iR = 1. / dot2(z + vec3(b,-a,0.));
	z.x -= b; z.y = a - z.y;
	float iR = 1. / dot2(z); 
	z *= iR;
	DF *= iR;//max(1.,iR);
}

float  JosKleinian(vec3 z)
{
	vec3 lz=z+vec3(1.), llz=z+vec3(-1.);
	float DE=1e10;
	float DF = 1.0;
	float a = KleinR, b = KleinI;
	float f = sign(b) ;     
	int i=0;
	for (; i < Box_Iterations ; i++) 
	{
		//if(z.y<0. || z.y>a) break;
		z = wrapit(z);
		//orbitTrap = min(orbitTrap, abs(vec4(z,dot(z,z))));//For colouring
#if 1
		//Use transformation a or its inverse by checking the position of z wrt the "separation line"
		if  (z.y >= a * (0.5 -  f * 0.25 * sign(z.x + b * 0.5)* (1. - exp( - 3. * abs(z.x + b * 0.5))))) //(z.y>0.5*a) //	
			TransAInv(z, DF, a, b);//Apply transformation a
		else
			TransA(z, DF, a, b);
#else
		//If above the separation line, rotate by 180° about (-b/2, a/2)
		if  (z.y >= a * (0.5 -  f * 0.15 * sign(z.x - b * 0.5)* (1. - exp( - 5.2 * abs(z.x - b * 0.5)))))
			z = vec3(b, a, 0.) - z;//
			//z.xy = vec2(-b, a) - z.xy;//
		TransA(z, DF, a, b);	
#endif
		//orbitTrap = min(orbitTrap, abs(vec4(z,dot(z,z))));//For colouring
#if 1		
		//If the iterated points enters a 2-cycle , bail out.
		if(dot2(z-llz) < 1e-10 ) {
#if 0
			orbitTrap =vec4(1./float(i),0.,0.,0.);
#endif
			break;
		}
		//Store prévious iterates
		llz=lz; lz=z;
#endif
		orbitTrap = min(orbitTrap, abs(vec4(z,dot(z,z))));//For colouring
	}
	orbitTrap.w=float(i)/float(Box_Iterations);
	//WIP: Push the iterated point left or right depending on the sign of KleinI
	for (int i=0;i<Final_Iterations;i++){
		float y = ShowBalls ? min(z.y, a-z.y) : z.y;
		DE=min(DE,min(y,Clamp_y)/max(DF,Clamp_DF));
		TransA(z, DF, a, b);
	}
	float y = ShowBalls ? min(z.y, a-z.y) : z.y;
	DE=min(DE,min(y,Clamp_y)/max(DF,Clamp_DF));

	return DE;
}

float DE(vec3 p) {
	if(DoInversion){
		p=p-InvCenter-ReCenter;
		float r=length(p);
		float r2=r*r;
		p=(InvRadius * InvRadius/r2)*p+InvCenter;
		float de=JosKleinian(p);
		de=r2*de/(InvRadius * InvRadius+r*de);
		return de;
	}
	else return JosKleinian(p);
}

#preset Default
FOV = 0.71698
Eye = 0.360226,0.662375,-1.64298
Target = 0.395454,-0.416241,-0.064174
Up = -0.0778679,0.444487,0.892395
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 4
FudgeFactor = 0.26
MaxRaySteps = 500
MaxDistance = 3
Dither = 1
NormalBackStep = 0
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.28236
SpecularExp = 245.455
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,3
LightPos = 1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 10
BaseColor = 0.384314,0.384314,0.384314
OrbitStrength = 0.23333
X = 0,1,0.164706,0
Y = 1,0.533333,0,1
Z = 0.603922,0.164706,0.776471,0.25582
R = 0.137255,0.258824,0.529412,0.52942
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 2.63253
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0.05063
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
Box_Iterations = 27
KleinR = 1.91959
KleinI = 0.05417
AlphaX = 0
AlphaZ = 1
AlphaXZ = 3
box_size_z = 1
box_size_x = 0.7071
Final_Iterations = 0
ShowBalls = true
FourGen = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = false
InvCenter = 0,1,0
InvRadius = 0.26514
ReCenter = 0,0,0
#endpreset

#preset QF
FOV = 0.4
Eye = -0.659128,-0.210696,-2.46667
Target = -0.1646,0.552551,-0.685457
Up = 0.0613182,0.914818,-0.399184
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 5
FudgeFactor = 0.25
MaxRaySteps = 297
MaxDistance = 120
Dither = 0.5
NormalBackStep = 1
DetailAO = -2.51849
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0.1923
AmbiantLight = 1,1,1,0.47058
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 5,8,-10
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 2
BaseColor = 0.576471,0.576471,0.576471
OrbitStrength = 0.73333
X = 0,1,0.164706,0.44186
Y = 1,0.533333,0,0.7907
Z = 0.603922,0.164706,0.776471,0.4186
R = 0.262745,0.482353,1,0.6
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 4.44153
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
Box_Iterations = 40
KleinR = 1.9
KleinI = 0.1
box_size_z = 0.7071
box_size_x = 0.7071
ShowBalls = true
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.30327
ReCenter = 0,0,0
#endpreset


#preset QF2
FOV = 0.71698
Eye = -0.906954,0.667628,0.47372
Target = 0.0324118,0.542785,0.0115637
Up = 0,1,0
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -3.5
FudgeFactor = 0.21212
MaxRaySteps = 541
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0.03846
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.776471,0.776471,0.776471
OrbitStrength = 0.5
X = 0,1,0.164706,1
Y = 1,0.533333,0,-1
Z = 0.603922,0.164706,0.776471,1
R = 0.262745,0.482353,1,0.29412
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = true
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Box_Iterations = 20
KleinR = 1.91134
KleinI = 0.06126
box_size_z = 0.7071
box_size_x = 0.7071
Clamp_y = 0.4
Clamp_DF = 3
DoInversion = false
InvCenter = 0,-1,0
InvRadius = 0.30327
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
RefineSteps = 4
MaxDistance = 20
DetailAO = -2.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
AmbiantLight = 1,1,1,2
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,7
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 10
HF_Fallof = 0.1
HF_Const = 0.08861
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
ShowBalls = true
ReCenter = 0,0,0
#endpreset



#preset QF3
FOV = 0.4
Eye = -0.156312,0.467472,-1.17529
Target = 0.129376,1.09716,0.701319
Up = 0.0578722,0.0252976,-0.998003
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -4
RefineSteps = 5
FudgeFactor = 0.25
MaxRaySteps = 297
MaxDistance = 120
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.5
coneApertureAO = 0.9999
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 10,10,-8.1578
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 2
BaseColor = 0.678431,0.678431,0.678431
OrbitStrength = 0.75
X = 0,1,0.164706,1
Y = 1,0.215686,0.752941,0.95348
Z = 0.415686,0.776471,0.137255,1
R = 0.262745,0.482353,1,1
BackgroundColor = 0.180392,0.223529,0.266667
GradientBackground = 0.34485
CycleColors = true
Cycles = 5.16506
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.741176,0.87451,1,1
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
Box_Iterations = 40
KleinR = 1.91134
KleinI = 0.125
box_size_z = 0.7071
box_size_x = 0.7071
Final_Iterations = 10
ShowBalls = true
FourGen = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.3242
ReCenter = 0,0,0
#endpreset


#preset QF4
FOV = 0.4
Eye = -0.657958,-0.589646,-3.7183
Target = -0.286782,0.0337675,-1.8546
Up = 0.0451903,0.028017,-0.998585
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3
RefineSteps = 5
FudgeFactor = 0.25
MaxRaySteps = 297
MaxDistance = 120
Dither = 0.5
NormalBackStep = 1
DetailAO = -2.51849
coneApertureAO = 0.95556
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.6
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 10,10,-8.1578
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 2
BaseColor = 0.576471,0.576471,0.576471
OrbitStrength = 0.65
X = 0,1,0.164706,1
Y = 1,0.215686,0.752941,0.95348
Z = 0.415686,0.776471,0.137255,1
R = 0.262745,0.482353,1,1
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 5.16506
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.741176,0.87451,1,1
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
Box_Iterations = 40
KleinR = 1.90309
KleinI = 0.1125
box_size_z = 0.80902
box_size_x = 0.80902
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.3242
ShowBalls = true
ReCenter = 0,0,0
#endpreset


#preset Balls
FOV = 0.71698
Eye = 0.514148,0.626541,-1.14617
Target = 0.178895,0.554774,-0.149159
Up = 0.0849694,0.996071,-0.0249459
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 3
FudgeFactor = 0.25
MaxRaySteps = 500
MaxDistance = 3
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,3
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 10
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.33333
X = 0,1,0.164706,1
Y = 1,0.533333,0,0.27906
Z = 0.603922,0.164706,0.776471,0.4186
R = 0.262745,0.482353,1,0.12942
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0.05063
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
Box_Iterations = 20
KleinR = 1.91134
KleinI = 0.06126
box_size_z = 1
box_size_x = 0.7071
Clamp_y = 0.5
Clamp_DF = 4
DoInversion = false
InvCenter = 0,-1,0
InvRadius = 0.30327
ShowBalls = true
ReCenter = 0,0,0
#endpreset


#preset Lace
FOV = 0.4
Eye = 0.20506,-0.0280273,-3.24676
Target = 0.23463,0.236689,-1.26458
Up = -0.51366,0.812086,-0.276893
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 3
Exposure = 1.5
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 5
FudgeFactor = 0.2
MaxRaySteps = 297
MaxDistance = 20
Dither = 1
NormalBackStep = 1
DetailAO = -1.7143
coneApertureAO = 0.5
maxIterAO = 10
AO_ambient = 0.83334
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 2.3684,5,-1.8422
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 2
BaseColor = 0.776471,0.776471,0.776471
OrbitStrength = 0.51667
X = 0,1,0.164706,0.8372
Y = 1,0.533333,0,0.7907
Z = 0.603922,0.164706,0.776471,1
R = 0.262745,0.482353,1,0.01176
BackgroundColor = 0.0627451,0.0745098,0.0862745
GradientBackground = 1.0345
CycleColors = false
Cycles = 3.35606
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
Box_Iterations = 30
KleinR = 1.9
KleinI = 0.06549
box_size_z = 0.7071
box_size_x = 1
ShowBalls = false
Clamp_y = 1.5
Clamp_DF = 1
DoInversion = true
InvCenter = -0.21862,0.6592,0
InvRadius = 0.38705
ReCenter = 0,0,0
#endpreset

#preset Dragon
FOV = 0.4
Eye = -0.164924,0.437747,-1.16082
Target = 0.137985,1.09731,0.702785
Up = 0.052929,0.00684249,-0.998575
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.6
Detail = -4
FudgeFactor = 0.25
MaxRaySteps = 297
Dither = 0.5
NormalBackStep = 2
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.658824,0.658824,0.658824
OrbitStrength = 0.5
X = 0,1,0.164706,1
Y = 1,0.215686,0.752941,0.95348
Z = 0.415686,0.776471,0.137255,1
R = 0.262745,0.482353,1,1
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = true
Cycles = 5.16506
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Box_Iterations = 100
KleinR = 1.91134
KleinI = 0.125
box_size_z = 1
box_size_x = 0.7071
ShowBalls = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.3242
FocalPlane = 1.2
Aperture = 0.0241
InFocusAWidth = 0.2
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
RefineSteps = 5
MaxDistance = 120
DetailAO = -1.50003
coneApertureAO = 0.95556
maxIterAO = 10
AO_ambient = 0.9
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.00529
SpecularExp = 100
AmbiantLight = 1,1,1,1
Reflection = 0,0,0
ReflectionsNumber = 0
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = 10,10,-8.1578
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 2
HF_Fallof = 0.1
HF_Const = 0.00109
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.741176,0.87451,1,1
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
ReCenter = 0,0,0
#endpreset

#preset Hydra
FOV = 0.71698
Eye = 0.337759,0.101177,-1.82455
Target = 0.14406,0.281813,-0.804051
Up = -0.421694,0.845619,-0.327265
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -3.5
FudgeFactor = 0.25
MaxRaySteps = 500
Dither = 0.5
NormalBackStep = 1
CamLight = 1,1,1,0
Glow = 1,1,1,0
GlowMax = 0
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.35
X = 0,1,0.164706,0
Y = 1,0.533333,0,1
Z = 0.603922,0.164706,0.776471,1
R = 0.262745,0.482353,1,0.01176
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 6.61245
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Box_Iterations = 37
KleinR = 1.91778
KleinI = 0.06126
box_size_z = 1
box_size_x = 0.7071
Clamp_y = 0.5
Clamp_DF = 4
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
RefineSteps = 3
MaxDistance = 3
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
AmbiantLight = 1,1,1,1
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,3
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 10
HF_Fallof = 0.1
HF_Const = 0.05063
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
ShowBalls = true
FourGen = false
DoInversion = true
InvCenter = 0.27576,0.52804,0
InvRadius = 0.19853
Final_Iterations = 1
ReCenter = 0,0,0
#endpreset

#preset Necklace
FOV = 0.71698
Eye = 0.468872,1.2014,-1.10174
Target = -0.0588969,1.06425,0.731274
Up = -0.174296,0.974689,0.140011
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -4
RefineSteps = 4
FudgeFactor = 0.25
MaxRaySteps = 500
MaxDistance = 3
Dither = 1
NormalBackStep = 0
DetailAO = -2
coneApertureAO = 0.91111
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.28236
SpecularExp = 245.455
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,5
LightPos = 4,-4,-3
LightSize = 0.01
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1
ShadowSoft = 0
BaseColor = 0.533333,0.533333,0.533333
OrbitStrength = 0.36667
X = 0,1,0.164706,0
Y = 1,0.533333,0,1
Z = 0.603922,0.164706,0.776471,1
R = 0.137255,0.258824,0.529412,0
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = false
Cycles = 7.69791
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 3.90256
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,1,0
HF_Offset = 0.303
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 0
HF_Anisotropy = 0.847059,0.847059,0.847059
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
Box_Iterations = 25
KleinR = 1.91959
KleinI = 0.05417
AlphaX = 0.5
AlphaZ = 1
AlphaXZ = 0
Final_Iterations = 0
ShowBalls = true
FourGen = false
Clamp_y = 5.5
Clamp_DF = 1
DoInversion = true
InvCenter = 0,1,0
InvRadius = 0.26514
ReCenter = 0,0,0
#endpreset

#preset INF2-3-6
FOV = 0.71698
Eye = 0.491971,0.740757,-1.33404
Target = 1.02773,0.00675536,-0.799458
Up = 0.250762,0.767749,0.589643
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 3
FudgeFactor = 0.25
MaxRaySteps = 500
MaxDistance = 3
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,4
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 10
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.33333
X = 0,1,0.164706,1
Y = 1,0.533333,0,0.27906
Z = 0.603922,0.164706,0.776471,0.4186
R = 0.262745,0.482353,1,0.12942
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
Box_Iterations = 20
KleinR = 1.9299
KleinI = 0.06126
AlphaX = 0
AlphaZ = 0.867
AlphaXZ = 0.5
Final_Iterations = 0
ShowBalls = true
FourGen = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = false
InvCenter = 0,-1,0
InvRadius = 0.30327
ReCenter = 0,0,0
#endpreset

#preset INF2-4-4
FOV = 0.71698
Eye = 1.1384,0.441902,-1.38446
Target = 1.45768,0.17404,-0.416019
Up = -0.0188896,0.986699,0.161458
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 3
FudgeFactor = 0.25
MaxRaySteps = 500
MaxDistance = 3
Dither = 0.5
NormalBackStep = 1
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,4
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 10
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.33333
X = 0,1,0.164706,1
Y = 1,0.533333,0,0.27906
Z = 0.603922,0.164706,0.776471,0.4186
R = 0.262745,0.482353,1,0.12942
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
Box_Iterations = 16
KleinR = 1.9299
KleinI = 0.06126
AlphaX = 0.7072
AlphaZ = 0.7072
AlphaXZ = 0
Final_Iterations = 0
ShowBalls = true
FourGen = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = false
InvCenter = 0,-1,0
InvRadius = 0.30327
ReCenter = 0,0,0
#endpreset

#preset INF-2-2-inf
FOV = 0.71698
Eye = 1.1384,0.441902,-1.38446
Target = 1.0754,0.267251,-0.346626
Up = -0.013038,0.998267,0.057388
FocalPlane = 1
Aperture = 0
InFocusAWidth = 0
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 3
FudgeFactor = 0.25
MaxRaySteps = 500
MaxDistance = 4
Dither = 0.98969
NormalBackStep = 1
DetailAO = -1.5
coneApertureAO = 0.5
maxIterAO = 20
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1
Glow = 1,1,1,0
GlowMax = 0
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,4
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 10
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.33333
X = 0,1,0.164706,1
Y = 1,0.533333,0,0.27906
Z = 0.603922,0.164706,0.776471,0.4186
R = 0.262745,0.482353,1,0.12942
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
Box_Iterations = 100
KleinR = 1.9299
KleinI = 0.06126
AlphaX = 0
AlphaZ = 0
AlphaXZ = 1
Final_Iterations = 0
ShowBalls = true
FourGen = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = false
InvCenter = 0,-1,0
InvRadius = 0.30327
ReCenter = 0,0,0
#endpreset

#preset INF-3-3-3
FOV = 0.90566
Eye = 1.12606,0.462723,-1.48149
Target = 1.49037,0.244987,-0.516375
Up = -0.0149497,0.993627,0.111725
FocalPlane = 1
Aperture = 0.002
InFocusAWidth = 0.2
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Gamma = 2
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.25
BloomPow = 2
BloomTaps = 4
Detail = -3.5
RefineSteps = 3
FudgeFactor = 0.25
MaxRaySteps = 500
MaxDistance = 4
Dither = 0.98969
NormalBackStep = 1
DetailAO = -1.5
coneApertureAO = 0.8
maxIterAO = 20
AO_ambient = 1.2
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.4
SpecularExp = 16
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,1.2353
Glow = 1,1,1,0
GlowMax = 0
Reflection = 1,1,1
ReflectionsNumber = 0
SpotGlow = true
SpotLight = 1,1,1,4
LightPos = -1,1,-1
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0
LightGlowExp = 1
HardShadow = 1 Locked
ShadowSoft = 10
BaseColor = 0.552941,0.552941,0.552941
OrbitStrength = 0.3
X = 0,1,0.164706,0
Y = 0.945098,0.188235,0.105882,1
Z = 0.603922,0.164706,0.776471,1
R = 0.380392,0.745098,0.533333,0.1
BackgroundColor = 0.270588,0.403922,0.6
GradientBackground = 0
CycleColors = false
Cycles = 4.44153
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
HF_Fallof = 0.1
HF_Const = 0
HF_Intensity = 0
HF_Dir = 0,0,1
HF_Offset = 0
HF_Color = 0.670588,0.807843,0.890196,1
HF_Scatter = 10
HF_Anisotropy = 0.847059,0.847059,0.847059
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
Box_Iterations = 20
KleinR = 1.9299
KleinI = 0.06126
AlphaX = 0.5
AlphaZ = 0.5
AlphaXZ = 0.5
Final_Iterations = 0
ShowBalls = true
FourGen = false
Clamp_y = 0.5
Clamp_DF = 1
DoInversion = false
InvCenter = 0,-1,0
InvRadius = 0.30327
ReCenter = 0,0,0
#endpreset
