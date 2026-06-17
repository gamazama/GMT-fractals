#version 130
#define WANG_HASH
#define providesColor
#define providesBackground
#define KN_VOLUMETRIC
#define USE_IQ_CLOUDS
uniform float time;
#include "MathUtils.frag"
#include "DE-Kn2cr11.frag"
#include "object_and_background_gradient.frag"

#group Landscape
// author : @AndyPolygon
// modified for Fragmentarium by 3DickUlus
// arg : { var = 'hscale' name = 'height' value = '.4' range = '.1 1' step = '.05' precision = '2' }
uniform float hscale; slider[0.1,0.4,1]
// arg : { var = 'scale' name = 'scale' value = '1' range = '.1 2' step = '.1' precision = '1' }
uniform float scale; slider[0.001,1,2]
// arg : { var = 'type' name = 'type' value = '0' range = '0 3 ' step = '1' precision = '0' }
uniform int type; menu[0,less sharp;sharp valleys;sharp ridges;very sharp ridges exponential height]
// arg : { var = 'octaves' name = 'octaves' value = '5' range = '1 5' step = '1' precision = '0' }
uniform float octaves; slider[1,5,32]
// arg : { var = 'roughness' name = 'roughness' value = '.5' range = '.1 .9' step = '.1' precision = '2' }
uniform float roughness; slider[0.1,0.5,0.9]
// arg : { var = 'distort' name = 'distort' value = '0' range = '0 1' step = '1' precision = '0' }
uniform float distort; slider[-1,0,1]
// arg : { var = 'steps' name = 'steps' value = '0' range = '0 10' step = '1' precision = '0' }
uniform float steps; slider[0,0,10]
// arg : { var = 'xOffset' name = 'xOffset' value = '0' range = '-1024 1024' step = '1' precision = '0' }
uniform float xOffset; slider[-1024,0,1024]
// arg : { var = 'yOffset' name = 'yOffset' value = '0' range = '-1024 1024' step = '1' precision = '0' }
uniform float yOffset; slider[-1024,0,1024]
// uniform vec3		i_volume_size;		// volume size [1-256]
uniform vec3 volume_size; slider[(1,1,1),(128,128,128),(256,256,256)]

//landscape using simplex noise and fbm

// noise2d code from https://github.com/ashima/webgl-noise/blob/master/src/noise2D.glsl
//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
{
	const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
	// First corner
	vec2 i  = floor(v + dot(v, C.yy) );
	vec2 x0 = v -   i + dot(i, C.xx);

	// Other corners
	vec2 i1;
	//i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
	//i1.y = 1.0 - i1.x;
	i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
	// x0 = x0 - 0.0 + 0.0 * C.xx ;
	// x1 = x0 - i1 + 1.0 * C.xx ;
	// x2 = x0 - 1.0 + 2.0 * C.xx ;
	vec4 x12 = x0.xyxy + C.xxzz;
	x12.xy -= i1;

	// Permutations
	i = mod289(i); // Avoid truncation effects in permutation
	vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

	vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
	m = m*m;
	m = m*m;

	// Gradients: 41 points uniformly over a line, mapped onto a diamond.
	// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

	vec3 x = 2.0 * fract(p * C.www) - 1.0;
	vec3 h = abs(x) - 0.5;
	vec3 ox = floor(x + 0.5);
	vec3 a0 = x - ox;

	// Normalise gradients implicitly by scaling m
	// Approximation of: m *= inversesqrt( a0*a0 + h*h );
	m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

	// Compute final noise value at P
	vec3 g;
	g.x  = a0.x  * x0.x  + h.x  * x0.y;
	g.yz = a0.yz * x12.xz + h.yz * x12.yw;
	return 130.0 * dot(m, g);
}

//end noise (c) code



//combine octaves of noise

float fbm(vec2 x) 
{
	float v = 0.0;
	float a = 0.5;
	float total = 0.0;
	vec2 shift = vec2(100.0);
	
	if (type > 0) x /= 2.0;
	
	for (int i = 0; i < int(octaves); ++i) 
	{
		float n = snoise(x);//simplex
		switch (type) {
			case 1:		//sharp valleys
			n = abs(n);
			break;
		case 2: //sharp ridges
			n = 1.0 - abs(n);
			break;
		case 3: //very sharp ridges - exponential height
			n = 1.0 - abs(n); 
			n = n*n;
			break;
		}

		v += a * n;

		x = x * 2.0 + shift;
		total += a;
		a *= roughness;
	}
	
	v /= total;
	if (type == 0) v = (v+1.0)*.5;
	return v;
}

float InOut(float t)
{
    if(t <= 0.5)
        return (t + t) * t;
    t -= 0.5;
    return (t + t) * (1.0 - t) + 0.5;
}

//main color set

float map( vec3 v ) 
{
	float height = volume_size.z*hscale;

	float xyScale = max(volume_size.x,volume_size.y)/scale;
	vec2 pos = (vec2(v.x+xOffset,v.y+yOffset)/xyScale);
	
	if (distort != 0.0)
		pos += fbm(pos)*distort;

	float h = fbm(pos);
	h *= height;

	if (steps > 0.0)//slightly stepped terrain
	{
		float s = height/(steps+1.0);
		float s2 = floor(h/s);
		float f = (h-(s*s2))/s;
		h = (s*s2)+(InOut(f)*s);
	}

	float cz = v.z/height;
	float d = (cz/h);
	d = (d*d)-d;
	return d;
}

// http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
// Box - exact
float sdBox( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return length(max(d,0.0))
         + min(max(d.x,max(d.y,d.z)),0.0); // remove this line for an only partially signed sdf 
}

float DE(vec3 pos) {
	// use this to setup the background and obj gradients ;)
//	return sdBox( pos, vec3(.5) );

	float d = map( pos );
	// terrain clipped to volume
	//return max(d,sdBox( pos, volume_size ));
	return d;
}

#preset Default
FOV = 0.6
Eye = -40.4134205,40.2405721,1.53139363
Target = 48.8161839,-48.9890323,-21.6795449
Up = 0.124839686,-0.124839686,0.95984019
EquiRectangular = false
FocalPlane = 1
Aperture = 0
InFocusAWidth = 1
DofCorrect = true
ApertureNbrSides = 7
ApertureRot = 0
ApStarShaped = true
Gamma = 1.2
ToneMapping = 5
Exposure = 1
Brightness = 1.0123119
Contrast = 1.1760753
Saturation = 1
GaussianWeight = 2.7704486
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0
BloomPow = 2
BloomTaps = 4
BloomStrong = 1
LensFlare = false
FlareIntensity = 0.25
FlareSamples = 8
FlareDispersal = 0.25
FlareHaloWidth = 0.5
FlareDistortion = 1
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 4.3351064
Detail = -3.5
RefineSteps = 4
FudgeFactor = 0.25
MaxRaySteps = 10000
MaxDistance = 75
Dither = 1
NormalBackStep = 1
DetailAO = -5.90945404
coneApertureAO = 0.5
maxIterAO = 20
FudgeAO = 1
AO_ambient = 1
AO_camlight = 1
AO_pointlight = 1
AoCorrect = 0.41453567
Specular = 1.5
SpecularExp = 100
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,0.15
Reflection = 0.388235294,0.388235294,0.388235294
ReflectionsNumber = 1
ReflectOnFloorOnly = true
SpotGlow = true
SpotLight = 1,0.752941176,0.00392156863,10
LightPos = 50,-50,3.5
LightSize = 1
LightFallOff = 0
LightGlowRad = 1
LightGlowExp = 0.29
HardShadow = 1
ShadowSoft = 0.114
ShadowBlur = 1
perf = false
SSS = false
sss1 = 0.1
sss2 = 0.5
BaseColor = 0.737254902,0.68627451,0.584313725
OrbitStrength = 0.5
X = 0.5,0.6,0.6,0.63
Y = 1,0.6,0,0.63
Z = 0.8,0.78,1,0.63
R = 0.4,0.70000763,1,0.4207921
BackgroundColor = 0.4,0.701960784,1
GradientBackground = 0.5
CycleColors = false
Cycles = 0.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = 0.2
FloorColor = 0,0.0509803922,0.145098039
HF_Fallof = 5
HF_Const = 0.006
HF_Intensity = 0.012
HF_Dir = 0,0,1
HF_Offset = 1.03079
HF_Color = 0.996078431,0.996078431,0.996078431,0.5
HF_Scatter = 5.141319
HF_Anisotropy = 0.952941176,0.921568627,0
HF_FogIter = 4
HF_CastShadow = true
EnCloudsDir = true
CloudDir = 0,0,1
CloudScale = 3
CloudOffset = 50,2.459018,-0.819672
CloudFlatness = 0.84166668
CloudTops = 3
CloudBase = -0.5
CloudDensity = 1.80386742
CloudRoughness = 3
CloudContrast = 10
CloudBrightness = 1.5
CloudColor = 0.270588235,0.149019608,0.0588235294
CloudColor2 = 1,0.709803922,0.203921569
SunLightColor = 1,1,0.62745098
Cloudvar1 = 2
Cloudvar2 = 4
CloudIter = 8
CloudBgMix = 0.7
WindDir = 0,0,1
WindSpeed = 1
objColorOff = 0.5
objColorRotVector = 1,1,1
objColorRotAngle = 0
objColorScale = 2
backColorMix = 0.2
backColorOff = 0.8363536
backColorRotVector = 1,0,0
backColorRotAngle = 90
backColorScale = 0.75
hscale = 0.137647062
scale = 0.127879528
type = 1
octaves = 9
roughness = 0.5
distort = -1
steps = 3
xOffset = -2
yOffset = 2
volume_size = 1,1,6
#endpreset


#preset OldWest
FOV = 0.4
Eye = 15.4042109,5.00871467,3.04743074
Target = 14.3330318,4.83412982,2.89193226
Up = -0.138865969,-0.022353723,0.981700519
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 2.7704486
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 4.3351064
Detail = -3
DetailAO = -1.0947867
FudgeFactor = 0.025
MaxDistance = 35
MaxRaySteps = 2000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.96946566
Specular = 1
SpecularExp = 16
SpecularMax = 100
SpotLight = 1,1,1,4
SpotLightDir = -0.10224438,0.25685786
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 18
Fog = 0.172949
HardShadow = 0.20854272
ShadowSoft = 0.1
QualityShadows = true
ReflectOnFloorOnly = true
Reflection = 0.5
DebugSun = false
BaseColor = 0.337254902,0.31372549,0.266666667
OrbitStrength = 0.15
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,0.400000006
Z = 0.8,0.78,1,0.5
R = 0.4,0.70000763,1,0.119999997
BackgroundColor = 0.4,0.701960784,1
GradientBackground = 0
CycleColors = false
Cycles = 1.1
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = 1.724138
FloorColor = 0,0.00392156863,0.0156862745
hscale = 0.287844039
scale = 1.4295711
type = 2
octaves = 9
roughness = 0.45
distort = 0
steps = 2
random = 0
waterz = 3.5
waterCol = 156
colBlend = 0.125
xOffset = 0
yOffset = 0
volume_size = 10,10,25
num_color_sels = 1
#endpreset

#preset nice
FOV = 0.4
Eye = 10.3822918,2.90646199,1.29850708
Target = 9.51694355,3.42627701,1.24315407
Up = -0.044764828,0.026890248,0.952344375
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 2.7704486
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 4.3351064
Detail = -2.5
DetailAO = -1.0947867
FudgeFactor = 0.5
MaxDistance = 32
MaxRaySteps = 2500
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.96946566
Specular = 0.48463357
SpecularExp = 16
SpecularMax = 100
SpotLight = 1,1,1,4
SpotLightDir = 0.31670824,0.58603492
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 18
Fog = 0.16
HardShadow = 0.20854272
ShadowSoft = 0.1
QualityShadows = true
ReflectOnFloorOnly = true
Reflection = 0.5
DebugSun = true
BaseColor = 0.737254902,0.68627451,0.584313725
OrbitStrength = 0.5
X = 0.5,0.6,0.6,0.63
Y = 1,0.6,0,0.63
Z = 0.8,0.78,1,0.63
R = 0.4,0.70000763,1,0.4207921
BackgroundColor = 0.4,0.701960784,1
GradientBackground = 0
CycleColors = false
Cycles = 0.1
EnableFloor = true NotLocked
FloorNormal = 0,0,1
FloorHeight = 0.3333333
FloorColor = 0,0.00392156863,0.0156862745
Gradient = 10
ColorRotation = 0,0,0
GradientIter = 1
objColorOff = 1.4
objColorRotVector = 1,0,0
objColorRotAngle = 90
objColorScale = 1
hscale = 0.287844039
scale = 1.4295711
type = 2
octaves = 5
roughness = 0.45
distort = 0
steps = 2
random = 0.01
colBlend = 0.125
xOffset = 0
yOffset = 0
volume_size = 10,10,25
num_color_sels = 1
ColorIterations = 9
#endpreset

#preset test5
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.6
Eye = 3.43880228,3.61632899,1.44237206
Target = 4.44927,3.73419,1.42007
Up = 0.089375769,0.007592749,0.950451918
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 2.7704486
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 4.3351064
Detail = -3.5
DetailAO = -0.8
FudgeFactor = 0.05
MaxDistance = 32
MaxRaySteps = 5500
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.86946566
Specular = 0.5
SpecularExp = 16
SpecularMax = 100
SpotLight = 1,1,1,10
SpotLightDir = 0.125,0
CamLight = 1,1,1,0
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 18
Fog = 0.175
HardShadow = 1 NotLocked
ShadowSoft = 0.5
QualityShadows = true
ReflectOnFloorOnly = true
Reflection = 0 NotLocked
DebugSun = true
BaseColor = 0.501960784,0.482352941,0.431372549
OrbitStrength = 0.3
X = 0.5,0.6,0.6,0.63
Y = 1,0.6,0,0.63
Z = 0.8,0.78,1,0.63
R = 0.4,0.70000763,1,0.4207921
BackgroundColor = 0.4,0.701960784,1
GradientBackground = 0
CycleColors = false
Cycles = 0.1
EnableFloor = true NotLocked
FloorNormal = -0.07,0.01,1
FloorHeight = 0
FloorColor = 0.0431372549,0.0666666667,0.145098039
ObjGradient = 18
BackgroundGradient = 15
objColorOff = 1.75
objColorRotVector = 1,0,0
objColorRotAngle = 90
backMix = 0
backRotVector = 1,0,0
backRotAngle = 90
hscale = 1
scale = 1
type = 2
octaves = 13
roughness = 0.45
distort = 0.45
steps = 2
random = 0.01
colBlend = 0.125
xOffset = 0
yOffset = 0
volume_size = 4,4,6.25
num_color_sels = 1
ColorIterations = 9
backOff = 1
objColorScale = 4
backColorScale = 1
#endpreset

#preset Trees
FOV = 0.4
Eye = 0.434105103,-3.07095742,-0.799592102
Target = -0.462360348,-3.47738458,-0.61966114
Up = -0.167470476,-0.063338681,-0.977452986
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 2.7704486
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 4.3351064
Detail = -3.5
DetailAO = -1.0947867
FudgeFactor = 0.01
MaxDistance = 32
MaxRaySteps = 3000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.96946566
Specular = 0.48463357
SpecularExp = 16
SpecularMax = 100
SpotLight = 1,1,1,1
SpotLightDir = -0.81862744,-0.4754902
CamLight = 1,1,1,0
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 18
Fog = 0.16
HardShadow = 0.6 NotLocked
ShadowSoft = 0.114
QualityShadows = true
ReflectOnFloorOnly = true
Reflection = 0.5
DebugSun = true
BaseColor = 0.737254902,0.68627451,0.584313725
OrbitStrength = 0.26876514
X = 0.5,0.6,0.6,0.63
Y = 1,0.6,0,0.63
Z = 0.8,0.78,1,0.63
R = 0.4,0.70000763,1,0.4207921
BackgroundColor = 0.4,0.701960784,1
GradientBackground = 0
CycleColors = false
Cycles = 0.1
EnableFloor = true NotLocked
FloorNormal = 0,0,1
FloorHeight = 0.067648
FloorColor = 0,0.00392156863,0.0156862745
objColorOff = 0.4390244
objColorRotVector = 1,0,0
objColorRotAngle = 90
objColorScale = 0.4
backColorMix = 0.5
backColorOff = 0.5
backColorRotVector = 1,0,0
backColorRotAngle = -90
backColorScale = 1
hscale = 0.22799097
scale = 2
type = 3
octaves = 13
roughness = 0.555
distort = 1
steps = 1
random = 0.01
xOffset = 0
yOffset = 0
volume_size = 3,3,3
#endpreset

#preset Lagoon
FOV = 0.4
Eye = 2.59448211,-3.32891397,-0.506669336
Target = 2.12424039,-2.49909365,-0.051208516
Up = -0.170755963,0.326244369,-0.770693699
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 2.7704486
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 4.3351064
Detail = -3
DetailAO = -1.0947867
FudgeFactor = 0.02142857
MaxDistance = 32
MaxRaySteps = 750
Dither = 1
NormalBackStep = 1
AO = 0,0,0,0.86750001
Specular = 0.48463357
SpecularExp = 16
SpecularMax = 100
SpotLight = 1,1,1,2
SpotLightDir = -0.89705882,-0.31372548
CamLight = 1,1,1,0.14835164
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 100
Fog = 0.16
HardShadow = 0.6 NotLocked
ShadowSoft = 0.114
QualityShadows = true
ReflectOnFloorOnly = true
Reflection = 0.5 NotLocked
DebugSun = true
BaseColor = 0.737254902,0.68627451,0.584313725
OrbitStrength = 0.26876514
X = 0.5,0.6,0.6,0.63
Y = 1,0.6,0,0.63
Z = 0.8,0.78,1,0.63
R = 0.4,0.70000763,1,0.4207921
BackgroundColor = 0.4,0.701960784,1
GradientBackground = 0
CycleColors = false
Cycles = 0.1
EnableFloor = true NotLocked
FloorNormal = 0.016,-0.024,1
FloorHeight = -0.188941
FloorColor = 0,0.00392156863,0.0156862745
objColorOff = 0.4390244
objColorRotVector = 1,0,0
objColorRotAngle = 90
objColorScale = 0.4
backColorMix = 0.5
backColorOff = 0.9557712
backColorRotVector = 1,0,0
backColorRotAngle = -90
backColorScale = 1
hscale = 0.22799097
scale = 2
type = 3
octaves = 13
roughness = 0.58345324
distort = 1
steps = 0.95
random = 0.01
xOffset = 0
yOffset = 0
volume_size = 3,3,3.14
#endpreset
