#info Based on algebra by Peng Kuan
#info Extending complex number to spaces with high dimensions
#info https://drive.google.com/file/d/15ATCrPo8c9PCXVbWZDOCDcdPCITByhuq/view
#info ...and on code by  Edgars Malinovskis
#info https://fractalforums.org/index.php?topic=4675
#info modified and converted to GLSL for FragM by 3Dickulus

#define providesInit
uniform float time;
#include "MathUtils.frag"
#include "DE-Raytracer.frag"

#group PengBulb
// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]
// Number of color iterations.
uniform int ColorIterations;  slider[0,9,100]
// bulb exponent (2 is standard)
uniform float P; slider[-16,2,16]
uniform float Q; slider[-16,3,16]
uniform float Scale; slider[-5,1,5]
// Bailout radius
uniform float Bailout; slider[0,5,30]
// mermelada's tweak Derivative bias
uniform float DerivativeBias; slider[0,1,2]
// ON = lambda OFF = mandel
uniform bool Lambda; checkbox[false]
uniform vec3 PreRotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
uniform float PreRotAngle; slider[-180,0,180]
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
uniform float RotAngle; slider[-180,0,180]
uniform bool Julia; checkbox[false]
uniform vec3 JuliaC; slider[(-8,-8,-8),(0,0,0),(8,8,8)]
uniform bool AbsX; checkbox[false]
uniform bool AbsY; checkbox[false]
uniform bool AbsZ; checkbox[false]
uniform vec3 m1; slider[(-8,-8,-8),(-1,0,0),(8,8,8)]

mat3 prerot;
mat3 rot;

void init() {
	 prerot = rotationMatrix3(normalize(PreRotVector), PreRotAngle);
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}


vec3 pengPow(vec3 pos, float p) {

	float x=pos.x, y=pos.y, z=pos.z;

	//=================================================
	float hyp_xy_sq = x*x+y*y;
	float hyp_xy = sqrt(hyp_xy_sq);
	float r = sqrt(hyp_xy_sq + z*z);

	float theta = acos(x/hyp_xy)*sign(y);
	float phi = asin(z/r);

	r = pow(r,p);
	theta = theta*p;
	phi = phi*p;

	///========================================
	return r * vec3(cos(theta)*cos(phi),
                   sin(theta)*cos(phi),
                   sin(phi));

}

vec3 pengMul(vec3 a, vec3 b) {

	float xa=a.x, ya=a.y, za=a.z;
	float xb=b.x, yb=b.y, zb=b.z;

	//=================================================
	float hyp_xy_sqa = xa*xa+ya*ya;
	float hyp_xya = sqrt(hyp_xy_sqa);
	float ra = sqrt(hyp_xy_sqa + za*za);
	float thetaa = acos(xa/hyp_xya)*sign(ya);
	float phia = asin(za/ra);

	float hyp_xy_sqb = xb*xb+yb*yb;
	float hyp_xyb = sqrt(hyp_xy_sqb);
	float rb = sqrt(hyp_xy_sqb + zb*zb);
	float thetab = acos(xb/hyp_xyb)*sign(yb);
	float phib = asin(zb/rb);

   float r = ra*rb;
   float phi = phia+phib;
   float theta = thetaa+thetab;

	///========================================
	return r * vec3(cos(theta)*cos(phi),
                   sin(theta)*cos(phi),
                   sin(phi));

}

vec3 pengDiv(vec3 a, vec3 b) {
	return pengMul(a, pengPow(b,-1.0));
}

// Compute the distance from `pos` to the Peng Bulb.
float DE(vec3 pos) {
	// rotate the object in world
	pos *= prerot;
	// if not julia then set the initial value of z == m1 sliders
	vec3 z = (Julia ? pos : m1);
	vec3 c = (Julia ? JuliaC : pos);

	int i=0;
	float r=length(z);
	float dr=r*P+1.0;

	while(r<Bailout && (i<Iterations)) {

		if(AbsX) z.x=abs(z.x);
		if(AbsY) z.y=abs(z.y);
		if(AbsZ) z.z=abs(z.z);

		if(Lambda) {
			// c z (1-z)
			//	z = pengMul(pengMul(c,z),vec3(1,0,0)-z);
			// c z^p (1-z^q)
			//	z = pengMul(pengMul(c,pengPow(z,P)),vec3(1,0,0)-pengPow(z,Q)); 
			// c z^p - c z^p z^q
			//	z = pengMul(c,pengPow(z,P)) - pengMul(c,pengMul(pengPow(z,P),pengPow(z,Q))); 
			// calculate alef's 'Lambda' formula Z=(C*Z^p - C*Z^(p+q) )
			z = pengMul(c,pengPow(z,P)) - pengMul(c,pengPow(z,P+Q))*Scale;

			r=length(z); // requires current r
			// mermelada's tweak
			// http://www.fractalforums.com/new-theories-and-research/error-estimation-of-distance-estimators/msg102670/?topicseen#msg102670
			dr = max(dr*DerivativeBias,pow( r, P-1.0 )*dr*P + 1.0);

		} else {
			z = pengPow(z,P)+c*Scale;

			// mermelada's tweak
			// http://www.fractalforums.com/new-theories-and-research/error-estimation-of-distance-estimators/msg102670/?topicseen#msg102670
			dr = max(dr*DerivativeBias,pow( r, P-1.0 )*dr*P + 1.0);
			r=length(z); // requires last r

		}

		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*dr)));

		z*=rot;
		i++;
	}

	return (0.5*log(r)*(r/dr));

}

#preset Default
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.59411012
Eye = -0.92380892,-0.050127196,-2.84408473
Target = -0.789054762,-0.033825958,-1.73689749
Up = 0.003517333,-0.887685635,0.012641402
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -5
DetailAO = -4.61405833
FudgeFactor = 0.90586631
MaxDistance = 100
MaxRaySteps = 6000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,1
Specular = 1
SpecularExp = 16.364
SpecularMax = 4.678363
SpotLight = 1,1,1,3
SpotLightDir = -0.82810368,1
CamLight = 1,1,1,0.5
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 1 NotLocked
ShadowSoft = 10
QualityShadows = true
ReflectOnFloorOnly = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.38292011
X = 1,1,1,-0.25
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,-0.46394558
R = 0.0784314,1,0.941176,-0.16576086
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = false
Cycles = 12.1
EnableFloor = true
FloorNormal = 0,1,0
FloorHeight = 1.897019
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 20
ColorIterations = 8
P = 2
Q = 2
Scale = 1
Bailout = 4
DerivativeBias = 1
Lambda = false
PreRotVector = 1,0,0
PreRotAngle = 0
RotVector = 0,0,1
RotAngle = 0
Julia = false
JuliaC = 1e-09,1e-09,1e-09
AbsX = false
AbsY = false
AbsZ = false
m1 = 1e-09,0,0
#endpreset

#preset P1Q4lambdajulia
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.59411012
Eye = 1.04302032,-1.67304505,-1.26453581
Target = 0.600985568,-0.953728652,-0.726859699
Up = -0.288250011,0.381332598,-0.74713253
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4
DetailAO = -1.46684342
FudgeFactor = 0.001
MaxDistance = 100
MaxRaySteps = 10000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,1
Specular = 1
SpecularExp = 16.364
SpecularMax = 4.678363
SpotLight = 1,1,1,3
SpotLightDir = -0.7680764,1
CamLight = 1,1,1,0.33671988
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.36738186
HardShadow = 1 NotLocked
ShadowSoft = 10
QualityShadows = true
ReflectOnFloorOnly = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.5
X = 1,1,1,0.03804348
Y = 0.345098,0.666667,0,0.86141306
Z = 1,0.666667,0,-0.54013604
R = 0.0784314,1,0.941176,-0.09782608
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = false
Cycles = 5
EnableFloor = true
FloorNormal = 0,0,1
FloorHeight = 2.710028
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 6
ColorIterations = 6
P = 1
Q = 4
Scale = 1
Bailout = 30
DerivativeBias = 2
Lambda = true
PreRotVector = 0,0,1
PreRotAngle = 0
RotVector = 0,0,1
RotAngle = 0
Julia = true
JuliaC = 1.24031024,0,0
AbsX = false
AbsY = false
AbsZ = false
m1 = 0.8437104,0.006,0.006
#endpreset

#preset BuringShip
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.59411012
Eye = -0.779355841,-0.491757504,-2.95948841
Target = -0.681850972,-0.44612846,-1.91758695
Up = -0.033337423,-0.885808091,0.041912924
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -5
DetailAO = -3.51977395
FudgeFactor = 0.5
MaxDistance = 1000
MaxRaySteps = 6000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,1
Specular = 1
SpecularExp = 16.364
SpecularMax = 4.678363
SpotLight = 1,1,1,3
SpotLightDir = -0.7680764,1
CamLight = 1,1,1,0.5
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 1 NotLocked
ShadowSoft = 10
QualityShadows = true
ReflectOnFloorOnly = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.5
X = 1,1,1,0.5
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,-0.46394558
R = 0.0784314,1,0.941176,-0.16576086
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = false
Cycles = 12.1
EnableFloor = true
FloorNormal = 0,1,0
FloorHeight = 1.897019
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 20
ColorIterations = 8
P = 2
Q = 4
Scale = 1
Bailout = 4
DerivativeBias = 0
Lambda = false
PreRotVector = 1,0,0
PreRotAngle = 0
RotVector = 0,0,1
RotAngle = 0
Julia = false
JuliaC = -1,0,0
AbsX = true
AbsY = true
AbsZ = false
m1 = 0.001,0,0
#endpreset

#preset P2Q4lambda
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.6
Eye = -4.06498797,-2.37251329,-3.29876801
Target = -3.33861,-1.95657,-2.74506
Up = 0.234311326,-0.748293366,0.254735377
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4
DetailAO = -2.8501326
FudgeFactor = 0.25
MaxDistance = 100
MaxRaySteps = 3000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,1
Specular = 1
SpecularExp = 16.364
SpecularMax = 4.678363
SpotLight = 1,1,1,3
SpotLightDir = -0.7680764,1
CamLight = 1,1,1,0.51669086
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 1 NotLocked
ShadowSoft = 20
QualityShadows = true
ReflectOnFloorOnly = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.57713499
X = 1,1,1,0.5679348
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,-0.47755102
R = 0.0784314,1,0.941176,-0.08423912
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = false
Cycles = 5.1
EnableFloor = true
FloorNormal = 0,1,0
FloorHeight = 2
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 8
ColorIterations = 6
P = 2
Q = 4
Scale = 1
Bailout = 1.5
DerivativeBias = 1
Lambda = true
PreRotVector = 1,1,1
PreRotAngle = 0
RotVector = 0,0,1
RotAngle = 0
Julia = false
JuliaC = -1,0,0
AbsX = false
AbsY = false
AbsZ = false
m1 = -0.8,0,0
#endpreset

#preset P2Q8lambdajulia
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.59411012
Eye = -1.35671347,-1.11698184,-1.14223173
Target = -0.702995294,-0.585739812,-0.594191172
Up = 0.360316526,-0.749232146,0.296471021
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4
DetailAO = -1.76392566
FudgeFactor = 0.01500682
MaxDistance = 30
MaxRaySteps = 6000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,1
Specular = 1
SpecularExp = 16.364
SpecularMax = 4.678363
SpotLight = 1,1,1,3
SpotLightDir = -0.7680764,1
CamLight = 1,1,1,0.33671988
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 1 NotLocked
ShadowSoft = 10
QualityShadows = true
ReflectOnFloorOnly = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.49862259
X = 1,1,1,0.5679348
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,-0.50748298
R = 0.0784314,1,0.941176,-0.08695652
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = false
Cycles = 5.1
EnableFloor = true
FloorNormal = 0,1,0
FloorHeight = 0.813009
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 8
ColorIterations = 4
P = 2
Q = 8
Scale = 1.0000001
Bailout = 8
DerivativeBias = 1
Lambda = true
PreRotVector = 1,0,0
PreRotAngle = 90
RotVector = 0,0,1
RotAngle = 0
Julia = true
JuliaC = 1,1,0
AbsX = false
AbsY = false
AbsZ = false
m1 = 0.8,0,0
#endpreset


#preset Teddy
Brightness = 1
Contrast = 1
Saturation = 1
FOV = 0.58642766
Eye = -1.68525121,-0.686289764,-1.40970143
Target = -0.949100226,-0.399607596,-0.796336652
Up = 0.18506519,-0.792589344,0.148338007
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
AvgLumin = 0.5,0.5,0.5
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -5
DetailAO = -1.76392566
FudgeFactor = 0.01909959
MaxDistance = 30
MaxRaySteps = 6000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,1
Specular = 1
SpecularExp = 16.364
SpecularMax = 4.678363
SpotLight = 1,1,1,3
SpotLightDir = -0.21691678,0.67530698
CamLight = 1,1,1,0.33671988
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 1 NotLocked
ShadowSoft = 10
QualityShadows = true
ReflectOnFloorOnly = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0.49862259
X = 1,1,1,0.5679348
Y = 0.345098,0.666667,0,1
Z = 1,0.666667,0,-0.50748298
R = 0.0784314,1,0.941176,-0.08695652
BackgroundColor = 0.129411765,0.152941176,0.164705882
GradientBackground = 0.67292645
CycleColors = false
Cycles = 5.1
EnableFloor = true
FloorNormal = 0,1,0
FloorHeight = 0.91651
FloorColor = 0.164705882,0.164705882,0.164705882
Iterations = 8
ColorIterations = 4
P = 2
Q = 8
Scale = 1.0000001
Bailout = 8
DerivativeBias = 1
Lambda = true
PreRotVector = 1,0,0
PreRotAngle = 90
RotVector = 0,0,1
RotAngle = 0
Julia = true
JuliaC = 1,1,1
AbsX = false
AbsY = false
AbsZ = false
m1 = 0.8,0,0
#endpreset
