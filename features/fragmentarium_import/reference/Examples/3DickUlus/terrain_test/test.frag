// Output generated from file: /Fragmentarium/Mixpinski/MixPin_Condos_Files/testterrain-10.frag
// Created: Sun Oct 21 21:23:21 2018
// Output generated from file: D:/fractal/Fragmentarium/Output/tests/dickterrain-3_Files/dickterrain-3.frag
// Created: Wed Oct 17 16:07:02 2018
// Output generated from file: D:/fractal/Fragmentarium/Output/Dick/Terrain_Example_Files/Terrain_Example.frag
// Created: Wed Oct 17 15:05:29 2018
// Output generated from file: ./Fragmentarium/Mixpinski/MixPin_Condos_Files/MixPin_Condos.frag
// Created: Tue Oct 16 21:01:18 2018
// Output generated from file: ./Downloads/mixpinski_log/1-40.frag
// Created: Fri Sep 14 03:12:54 2018
// Output generated from file: D:/fractal/Fragmentarium123/Output/mclarekin/mixpinski/logXYZ/1-36_Files/1-36.frag
// Created: Wed Sep 12 18:28:52 2018
// Output generated from file: D:/fractal/Fragmentarium123/Output/mclarekin/mixpinski/logZ/1-30_Files/1-30.frag
// Created: Wed Sep 12 17:37:59 2018
// Output generated from file: D:/fractal/Fragmentarium123/Output/mclarekin/mixpinski/logZ/1-23_Files/1-23.frag
// Created: Wed Sep 12 16:14:49 2018
// Output generated from file: D:/fractal/Fragmentarium/Output/mclarekin/mixpinski/logZ/1-2_Files/1-2.frag
// Created: Wed Sep 12 12:19:16 2018
// Output generated from file: D:/fractal/Fragmentarium/Output/tmp/1-17_Files/1-17.frag
// Created: Mon Sep 10 09:40:07 2018
// Output generated from file: D:/fractal/Fragmentarium/Output/tmp/1-8_Files/1-8.frag
// Created: Wed Sep 5 17:04:33 2018
// Output generated from file: D:/fractal/Fragmentarium/Examples/mclarekin/mixpinski.frag
// Created: Wed Sep 5 15:03:53 2018
// Created: Wed Nov 16 20:45:18 2016

#define USE_IQ_CLOUDS
#define WANG_HASH
#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#define USE_TERRAIN
uniform float time;
#include "DE-Kn2cr11.frag"
#group MixPinski
//MAIN
uniform float scaleM; slider[0,2,4]
uniform vec4 scaleC; slider[(-5,-5,-5,-5),(1.,1.,.5,.5),(5,5,5,5)]
uniform bool PreOffset; checkbox[false]
uniform vec4 offsetM; slider[(-5,-5,-5,-5),(0,0,0,0),(5,5,5,5)]
uniform float w; slider[-5,0,5]
uniform int MI; slider[0,10,250]
uniform int ColorIterations; slider[0,10,250]

//z.w additional transforms ^_^


uniform int ZwMode; slider[0,03,3]
uniform bool LogX; checkbox[false]
uniform float scalelogx; slider[-5,1,5]
uniform bool LogY; checkbox[false]
uniform float scalelogy; slider[-5,1,5]
uniform bool LogZ; checkbox[false]
uniform float scalelogz; slider[-5,1,5]
//sphere cut, even works 0_o

uniform float SpRad; slider[0,.3,2]

//uniform vec2 Cut; slider[(-10,-10),(0,0),(10,10)]

// allows varying DE calculation, can remove later

float DE(vec3 p) {

	float Dd = 1.0;
	vec4 z=vec4(p,w);
	float r2=0.;  //  r2 is a better term as we are using radius squared for bailout (dot(z,z) )

	int i=0;
	for(; i<MI; i++) {
		if(PreOffset) z-=offsetM;

		if(z.x+z.y<0.0) z.xy = -z.yx;
    		if(z.x+z.z<0.0) z.xz = -z.zx;
    		if(z.y+z.z<0.0) z.zy = -z.yz;
   		if(z.x+z.w<0.0) z.xw = -z.wx;
    		if(z.y+z.w<0.0) z.yw = -z.wy;
    		if(z.z+z.w<0.0) z.zw = -z.wz;

		z+=offsetM;

		float sp = length(z.xyz)-SpRad;

		z.x= scaleM *z.x-scaleC.x*( scaleM -1.);
    		z.y= scaleM *z.y-scaleC.y*( scaleM -1.);
   		z.w= scaleM *z.w-scaleC.w*( scaleM -1.);
    		z.z-=0.5*scaleC.z*( scaleM -1.)/ scaleM ;
    		z.z=-abs(-z.z);

			z.z=min(z.z,sp);


		z.z+=0.5*scaleC.z*( scaleM -1.)/ scaleM ;
		//if(i>SpStart) z.z=min(z.z,sp);
		z.z= scaleM *z.z;
		//if(i>SpStart) z.z=min(z.z,sp);


		if(ZwMode==1) z.w=cos(z.w);
		if(ZwMode==2) z.w-=sin(z.w);
		if(ZwMode==3) z.w-=sin(z.w)+cos(z.w);
		//if(i>dot(sin(z.x),sin(z.y)))  z.w=length(z.w);

		Dd *= scaleM; // for DE calc
	//z.x = log(z.x + sqrt(z.x*z.x + 1));

		if (LogX)(z.x = scalelogx*log(z.x + sqrt(z.x*z.x + 1)));
		if (LogY)(z.y = scalelogy*log(z.y + sqrt(z.y*z.y + 1)));
		if (LogZ)(z.z = scalelogz*log(z.z + sqrt(z.z*z.z + 1)));
		r2=z.x*z.x+z.y*z.y+z.z*z.z;


		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,z.w)));
}

float r = sqrt(r2);

//return (r - offsetD) / abs(Dd); // offsetD has a default of 0.0 which is the std case. The offsetD results are similar or maybe the same as adjusting Detail Level( Quality)
//float Iter = i; // this DE works also in openCL so it might be something to with "i" in Fragmentarium
return r*pow(scaleM,-i);
//return r/abs(Dd);
}



#preset Default
FOV = 0.4359268
Eye = 6.728744,-3.699541,-2.065404
Target = -49.53883,49.56346,1.046102
Up = -0.0291313,0.0275757,-0.9988437
EquiRectangular = false
Gamma = 1
ToneMapping = 5
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -3.5
FudgeFactor = 1
NormalBackStep = 1
CamLight = 1,0.9137255,0.8235294,0.9632266
BaseColor = 1,1,1
OrbitStrength = 0.4852594
X = 1,0.9372549,0.8313725,1
Y = 1,0.6,0,1
Z = 0,0.5960784,0,1
R = 1,0.07058824,0.003921569,1
BackgroundColor = 0.2509804,0.2941177,0.3176471
GradientBackground = 0.1
CycleColors = false
Cycles = 2.1
EnableFloor = true NotLocked
FloorNormal = 0,0,1
FloorHeight = 0.06
FloorColor = 0.2509804,0.2509804,0.2509804
FocalPlane = 9.174341
Aperture = 0.0225806
InFocusAWidth = 1
DofCorrect = true
ApertureNbrSides = 5
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.6102117
BloomPow = 2
BloomTaps = 52
BloomStrong = 1
RotXYZ = -90,0,-16.45714
Rotamp = 92.00001,87.00001,96.00398
MovXYZ = -2.205882,-0.7411765,-0.1704546
FineMove = -0.006,0,0
TerrIter = 8
TerrSlope = 1
TerrFreq = 4.086471
TerrOffset = 0
TerrAmp = 0.8242531
WaveDir = 0,0,1
WaveSpeed = 0
RefineSteps = 4
MaxRaySteps = 273
MaxDistance = 135.5422
Dither = 0.5
DetailAO = -0.2899998
coneApertureAO = 1
maxIterAO = 18
FudgeAO = 1
AO_ambient = 1.997651
AO_camlight = 1.494712
AO_pointlight = 1.375368
AoCorrect = 0.2
Specular = 0.3274725
SpecularExp = 16
AmbiantLight = 0.8470588,0.9764706,1,0.8968825
Reflection = 0.454902,0.454902,0.454902
ReflectionsNumber = 2
SpotGlow = true
SpotLight = 1,0.8470588,0.6666667,10
LightPos = -5.323911,1.88457,-7.420495
LightSize = 0
LightFallOff = 0.3603071
LightGlowRad = 0
LightGlowExp = 0.2048694
HardShadow = 1
ShadowSoft = 2.061856
ShadowBlur = 0
perf = false
SSS = false
sss1 = 0.1
sss2 = 0.4585153
HF_Fallof = 1
HF_Const = 0.0133333
HF_Intensity = 0.0122616
HF_Dir = 0,0,-1
HF_Offset = 2
HF_Color = 0.5686275,0.6431373,0.6156863,0.75
HF_Scatter = 6
HF_Anisotropy = 0.5176471,0.2745098,0.0627451
HF_FogIter = 8
HF_CastShadow = true
EnCloudsDir = true
CloudDir = 0,0,-1
CloudScale = 6
CloudFlatness = -0.25
CloudTops = 10
CloudBase = 6
CloudDensity = 0.75
CloudRoughness = 1
CloudContrast = 5
CloudColor = 0.65,0.68,0.7
CloudColor2 = 0.07,0.17,0.24
SunLightColor = 0.7,0.5,0.3
Cloudvar1 = 0.1397849
Cloudvar2 = 4.257143
CloudIter = 6
CloudBgMix = 0.5
WindDir = 1,1,0
WindSpeed = 1
scaleM = 2.866434
scaleC = 1.674613,1.910506,2.649583,0.3926702
PreOffset = true
offsetM = 3.232819,-2.291302,0.2090536,-0.0805604
w = -1.172973
MI = 8
ColorIterations = 4
ZwMode = 1
LogX = false
scalelogx = 1
LogY = true
scalelogy = -1.19578
LogZ = true
scalelogz = 2.211482
SpRad = 0
#endpreset


#preset Range-0-250
Rotamp1:SineCurve:43:92:96:1:50:0.3:1:1.7:5:1
Rotamp2:SineCurve:43:87:91:1:60:0.3:1:1.7:4:1
Rotamp3:CosineCurve:44:94:98:1:80:0.3:1:1.7:3:1
#endpreset
