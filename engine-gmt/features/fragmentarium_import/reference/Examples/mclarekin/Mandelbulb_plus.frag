// this is based on EXAMPLES /historical 3D fractals/mandelbulb.frag

// have also added some other options used in MandelbulberV2
// mclarekin 6-10-18

#info Mandelbulb Distance Estimator
#define providesInit

#include "MathUtils.frag"
#include "DE-Raytracer.frag"
#group MandelbulbSinAtan2

// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]

// Number of color iterations.
uniform int ColorIterations;  slider[0,9,100]

// Mandelbulb exponent Power0 = initial power at i = 0, 
uniform float Power0; slider[0,9,30]
uniform float PowerScale; slider[-4,0,30]
uniform float alphaAngleOffset; slider[-180.00,0,180]
uniform float betaAngleOffset; slider[-180.00,0,180]
uniform float thetaScale; slider[0,1,3]
// Bailout radius
uniform float Bailout; slider[0,5,30]

// Alternate is slightly different, but looks more like a Mandelbrot for Power=2
uniform bool AlternateVersion; checkbox[false]

uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

uniform float RotAngle; slider[0,0,180]


uniform vec3 JuliaC; slider[(-2,-2,-2),(0,0,0),(2,2,2)]
uniform bool SignOrigPt; checkbox[false]
uniform vec3 OrigPtScale; slider[(-5,-5,-5),(1,1,1),(5,5,5)]
uniform float time;

float Power = 0.0;
mat3 rot;
void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

// This is my power function, based on the standard spherical coordinates as defined here:
// http://en.wikipedia.org/wiki/Spherical_coordinate_system
//
// It seems to be similar to the one Quilez uses:
// http://www.iquilezles.org/www/articles/mandelbulb/mandelbulb.htm
//
// Notice the north and south poles are different here.
void powN1(inout vec3 z, float r, inout float dr) {
	// extract polar coordinates
	float theta = asin(z.z/r) + betaAngleOffset;
	float phi = atan(z.y,z.x) + alphaAngleOffset;
	dr =  pow( r, Power-1.0)*Power*dr + 1.0;

	// scale and rotate the point
	float zr = pow( r,Power);
	theta = theta*Power * thetaScale;
	phi = phi*Power;

	// convert back to cartesian coordinates
	float cth = cos(theta);
	z = zr*vec3(cth*cos(phi), cth*sin(phi), sin(theta));
}

// This is a power function taken from the implementation by Enforcer:
// http://www.fractalforums.com/mandelbulb-implementation/realtime-renderingoptimisations/
//
// I cannot follow its derivation from spherical coordinates,
// but it does give a nice mandelbrot like object for Power=2
void powN2(inout vec3 z, float zr0, inout float dr) {
	float zo0 = acos( z.z/zr0 ) + betaAngleOffset;
	float zi0 = atan( z.y,z.x ) + alphaAngleOffset;
	float zr = pow( zr0, Power-1.0 );
	float zo = zo0 * Power * thetaScale;
	float zi = zi0 * Power;
	dr = zr*dr*Power + 1.0;
	zr *= zr0;
	z  = zr*vec3( cos(zo)*cos(zi), cos(zo)*sin(zi), sin(zo) );
}

// Compute the distance from `pos` to the Mandelbulb.
float DE(vec3 pos) {
	vec3 z=pos;
	float r;
	vec3 OrigPt = pos * OrigPtScale;
	if (SignOrigPt) OrigPt *= vec3(sign(z.x), sign(z.y), sign(z.z));

	float dr=1.0;
	int i=0;
	r=length(z);
	while(r<Bailout && (i<Iterations)) {
		Power = Power0 + i * PowerScale;
		if (AlternateVersion) {
			powN2(z,r,dr);
		} else {
			powN1(z,r,dr);
		}
		z+=JuliaC + OrigPt;
		r=length(z);
		z*=rot;
		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*r)));
		i++;
	}

	return 0.5*log(r)*r/dr;
}

#preset mb4p3
FOV = 0.62536
Eye = 2.332783,-1.661532,0.3815111
Target = -4.479737,3.675344,-1.525306
Up = 0.4867714,0.3336966,-0.8051333
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -2.84956
DetailAO = -1.35716
FudgeFactor = 1
MaxRaySteps = 164
Dither = 0.51754
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.63626,0.5
CamLight = 1,1,1,1.53846
CamLightMin = 0.12121
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 0.35385
ShadowSoft = 12.5806
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 1
X = 1,1,1,0.1803279
Y = 0.345098,0.666667,0,0.620915
Z = 1,0.666667,0,0.3529412
R = 0.0784314,1,0.941176,-0.1409836
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.3261
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 10
ColorIterations = 9
Bailout = 5
AlternateVersion = true
RotVector = 1,1,1
RotAngle = 0
JuliaC = 0,0,0
OrigPtScale = 1,1,1
SignOrigPt = false
PowerScale = 3.76087
Power0 = 4.3
#endpreset

#preset mb_addJuliaAndOrigPt
FOV = 0.62536
Eye = -1.955814,-2.088258,-0.1075611
Target = -0.0569475,-0.0589259,-0.0738217
Up = 0.0005416,-0.0171302,0.9998532
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -2.996805
DetailAO = -1.35716
FudgeFactor = 1
MaxRaySteps = 164
Dither = 0.51754
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.63626,0.5
CamLight = 1,1,1,1.53846
CamLightMin = 0.12121
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 0.35385
ShadowSoft = 12.5806
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 1
X = 1,1,1,0.1803279
Y = 0.345098,0.666667,0,0.620915
Z = 1,0.666667,0,0.3529412
R = 0.0784314,1,0.941176,-0.1409836
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.3261
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 10
ColorIterations = 9
Bailout = 5
AlternateVersion = true
RotVector = 1,1,1
RotAngle = 0
JuliaC = 0,-0.9871795,-0.0897436
OrigPtScale = 1,2.240143,0.2688172
SignOrigPt = true
PowerScale = 4.376812
Power0 = 6
#endpreset




#preset juliaC1
FOV = 0.62536
Eye = 1.057742,-0.6540872,-0.204579
Target = -4.436366,5.969211,-2.320064
Up = 0.5727329,0.2239225,-0.7863683
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -2.84956
DetailAO = -1.35716
FudgeFactor = 0.7311828
MaxRaySteps = 164
Dither = 0.51754
NormalBackStep = 1
AO = 0,0,0,0.85185
Specular = 1
SpecularExp = 16.364
SpecularMax = 10
SpotLight = 1,1,1,1
SpotLightDir = 0.63626,0.5
CamLight = 1,1,1,1.53846
CamLightMin = 0.12121
Glow = 1,1,1,0.43836
GlowMax = 52
Fog = 0
HardShadow = 0.35385
ShadowSoft = 12.5806
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.967033
X = 1,1,1,0.2655738
Y = 0.345098,0.666667,0,0.02912
Z = 1,0.666667,0,0.0261438
R = 0.0784314,1,0.941176,0.0491803
BackgroundColor = 0.607843,0.866667,0.560784
GradientBackground = 0.3261
CycleColors = false
Cycles = 4.04901
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 12
ColorIterations = 8
Power0 = 2
PowerScale = 6
Bailout = 6.279
AlternateVersion = false
RotVector = 1,1,1
RotAngle = 0
JuliaC = 0,0.6923077,0
SignOrigPt = false
OrigPtScale = 0,0,0
#endpreset

#preset DefaultA
FOV = 0.4
Eye = 0,0,-3.199998
Target = 0,0,6.799998
Up = 0,1,0
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -2.3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.4
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.7099237
X = 0.5,0.6,0.6,-0.3401361
Y = 1,0.6,0,0.3762712
Z = 0.8,0.78,1,0.0711864
R = 0.4,0.7,1,-0.0068027
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 9
ColorIterations = 9
Power0 = 9
PowerScale = 0
alphaAngleOffset = 0
betaAngleOffset = 0
thetaScale = 1
Bailout = 5
AlternateVersion = false
RotVector = 1,1,1
RotAngle = 0
JuliaC = 0,0,0
SignOrigPt = false
OrigPtScale = 1,1,1
#endpreset

#preset juliaD
FOV = 0.4
Eye = 0,0,-3.599997
Target = 0,0,6.399998
Up = 0,1,0
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -2.3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.4
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.7099237
X = 0.5,0.6,0.6,-0.3401361
Y = 1,0.6,0,0.3762712
Z = 0.8,0.78,1,0.0711864
R = 0.4,0.7,1,-0.0068027
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 9
ColorIterations = 9
Power0 = 9
PowerScale = 0
alphaAngleOffset = -180
betaAngleOffset = -180
thetaScale = 0.480916
Bailout = 5
AlternateVersion = true
RotVector = 1,1,1
RotAngle = 0
JuliaC = 0,0,-1.225352
SignOrigPt = true
OrigPtScale = 1,1,1
#endpreset

#preset DefaultB
FOV = 0.4
Eye = -1.822866,-0.196843,-3.270865
Target = 2.885123,0.4902466,5.524741
Up = 0.026512,0.9954106,-0.0919498
EquiRectangular = false
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -2.596026
DetailAO = -2.480702
FudgeFactor = 1
Dither = 0.4360656
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.4
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.7099237
X = 0.5,0.6,0.6,-0.3401361
Y = 1,0.6,0,0.3762712
Z = 0.8,0.78,1,0.0711864
R = 0.4,0.7,1,-0.0068027
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
AutoFocus = false
FocalPlane = 1
Aperture = 0
MaxRaySteps = 244
Iterations = 9
ColorIterations = 9
Power0 = 9
PowerScale = 0
alphaAngleOffset = 0
betaAngleOffset = 0
thetaScale = 1
Bailout = 5
AlternateVersion = false
RotVector = 1,1,1
RotAngle = 0
JuliaC = 0,0,0
SignOrigPt = true
OrigPtScale = 1,1,1
#endpreset

#preset Default std
FOV = 0.4
Eye = 0,-3.000002,0
Target = -0.0103152,1.999975,0.0122222
Up = 0,-0.0024444,0.999997
EquiRectangular = false
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Detail = -3.059603
DetailAO = -0.5
FudgeFactor = 0.9664179
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.4
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.7099237
X = 0.5,0.6,0.6,-0.3401361
Y = 1,0.6,0,0.3762712
Z = 0.8,0.78,1,0.0711864
R = 0.4,0.7,1,-0.0068027
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
AutoFocus = false
FocalPlane = 1
Aperture = 0
MaxRaySteps = 766
Iterations = 9
ColorIterations = 9
Power0 = 9
PowerScale = 0
alphaAngleOffset = 0
betaAngleOffset = 0
thetaScale = 1
Bailout = 5
AlternateVersion = false
RotVector = 1,1,1
RotAngle = 0
JuliaC = 0,0,0
SignOrigPt = false
OrigPtScale = 1,1,1
#endpreset

