// Output generated from file: /home/toonfish/Fragmentarium/My3.frag
// Created: Sun Apr 24 00:53:20 2022
#define providesInit
uniform float time;
#include "MathUtils.frag"
#include "DE-Raytracer.frag"

#info pow3() and mul3() Based on cbuchner1 https://www.fractalforums.com/index.php?topic=742.msg8763
#info Formula Lambda based on https://fractalforums.org/index.php?topic=4675

#group Bulb

uniform int Formula; menu[0,Mandelbrot;Lambda;Meta;Ikenaga;kingdomddf]
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

float PI2 = 1.57079632679489662;

vec3 pow3(vec3 pos, float p) {

	float r = length(pos);
	float theta = atan(pos.y,pos.x)*p;
	float phi = asin(pos.z/r)*p;

	return pow(r,p) * vec3(cos(theta)*cos(phi),
									sin(theta)*cos(phi),
									sin(phi));
}

vec3 Mul3(vec3 a, vec3 b) {

	float ra = length(a);
	float thetaa = atan(a.y,a.x);
	float phia = asin(a.z/ra);

	float rb = length(b);
	float thetab = atan(b.y,b.x);
	float phib = asin(b.z/rb);

   float r = ra*rb;
   float phi = phia+phib;
   float theta = thetaa+thetab;

	return r * vec3(cos(theta)*cos(phi),
                   sin(theta)*cos(phi),
                   sin(phi));
}


vec3 mul3(vec3 a, vec3 b) {

	// Conversion of Cartesian form into abdf form

	float x=a.x, y=a.y, z=a.z;
	//=================================================
	float xy1 = x*x+y*y;
	float rxy1 = sqrt(xy1);
	float r1 = sqrt(xy1 + z*z);
	
	float a1 = x/rxy1;
	float b1 = y/rxy1;
	float d1 = rxy1/r1;
	float f1 = z/r1;

	x=b.x, y=b.y, z=b.z;
	//=================================================
	float xy2 = x*x+y*y;
	float rxy2 = sqrt(xy2);
	float r2 = sqrt(xy2 + z*z);
	
	float a2 = x/rxy2;
	float b2 = y/rxy2;
	float d2 = rxy2/r2;
	float f2 = z/r2;

	float r = sqrt(r1*r2);

	return vec3( r*(a1*d1)+(a2*d2),
				 r*(b1*d1)+(b2*d2),
				 r*(f1*f2));

	float theta = (a1*a2-b1*b2)+(b1*a2+a1*b2);
	float phi   = (d1*d2-f1*f2)+(f1*d2+d1*f2);

// Conversion of abdf form to Cartesian form
	return r1*r2 * vec3(cos(theta)*cos(phi),
				sin(theta)*cos(phi),
				sin(phi));
}

vec3 div3(vec3 a, vec3 b) {
	return mul3(a, pow3(b,-1.0));
}

// Compute the distance from `pos` to the Bulb.
float DE(vec3 pos) {
	// rotate the object in world
	pos *= prerot;
	// if not julia then set the initial value of z == m1 sliders
	vec3 z = (Julia ? pos : m1);
	vec3 c = (Julia ? JuliaC : pos);

	int i=0;
	float r=length(z);
	float dr=max(DerivativeBias,pow( r, P-1.0 )*P + 1.0);

	while(r<Bailout && (i<Iterations)) {

		if(AbsX) z.x=abs(z.x);
		if(AbsY) z.y=abs(z.y);
		if(AbsZ) z.z=abs(z.z);

	// Mandelbrot;PengLambda;Meta;Ikenaga;kingdomddf
	switch(Formula) {
		case 0: { // Mandelbrot
			z = pow3(z,P)+c;
		} break;

		case 1: { // Peng Lambda
			// c z (1-z)
			//	z = mul3(mul3(c,z),vec3(1,0,0)-z);
			// c z^p (1-z^q)
			//	z = mul3(mul3(c,pow3(z,P)),vec3(1,0,0)-pow3(z,Q)); 
			// c z^p - c z^p z^q
			//	z = mul3(c,pow3(z,P)) - mul3(c,mul3(pow3(z,P),pow3(z,Q))); 
			// calculate 'Lambda' formula Z=(C*Z^p - C*Z^(p+q) )
			z = mul3(c,pow3(z,P)) - mul3(c,pow3(z,P+Q));
			r=length(z); // needs this r not last r

		} break;
		// http://www.fractalforums.com/images-showcase-(rate-my-fractal)/meta-mandelbrot-(mandeljulia)/
			case 2: z = pow3( pow3(z,P)+c, P ) + pow3(c, P)+z; break;
		//	IKENAGA - Formula originally discovered by Bruce Ikenaga, at Western Reserve
		// University, Indiana.  Documented in Dewdney's `Armchair Universe".
		// The Ikenaga set is:    Z(n+1) =Z(n)^3 + (C-1) * Z(n) - C
			case 3: z = mul3( pow3(z,P) + (c-vec3(1.,0.,0.)), z - c); break;
		// kingdomddf https://fractalforums.org/share-a-fractal/22/modified-mandelbrot/3909/msg25526
			case 4: z = pow3(z,P) + c - z; break;
	}
		z *= Scale;

		// mermelada's tweak
		// http://www.fractalforums.com/new-theories-and-research/error-estimation-of-distance-estimators/msg102670/?topicseen#msg102670
		dr = max(dr*DerivativeBias,pow( r, P-1.0 )*dr*P + 1.0); // requires current r
		r=length(z);

		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*dr)));

		z*=rot;
		i++;
	}

	return 0.5*log(r)*r/dr;

}











#preset Default
// Generated by: My3.frag
// Created on: Sun Apr 24 00:53:20 2022
FOV = 0.60691422
Eye = -1.95034176,-1.93103025,0.277004375
Target = -1.21722022,-1.25434245,0.200284871
Up = 0.062947085,0.037814933,0.935052546
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4
DetailAO = -4.33554373
FudgeFactor = 0.17598909
MaxDistance = 30
MaxRaySteps = 2000
Dither = 1
NormalBackStep = 1
AO = 0,0,0,1
Specular = 1
SpecularExp = 16.364
SpecularMax = 24.246576
SpotLight = 1,1,1,1
SpotLightDir = -0.21691678,0.67530698
CamLight = 1,1,1,0.5
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 433
Fog = 0.30664858
HardShadow = 1 NotLocked
ShadowSoft = 6.4945652
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
FloorNormal = 0,0,-1
FloorHeight = 1
FloorColor = 0.164705882,0.164705882,0.164705882
Formula = 1
Iterations = 8
ColorIterations = 4
P = 2
Q = 8
Scale = 1
Bailout = 4
DerivativeBias = 0
PreRotVector = 0,0,1
PreRotAngle = -43.4606897
RotVector = 1,0,0
RotAngle = 43.4606897
Julia = true
JuliaC = -1.50904384,0,0
AbsX = false
AbsY = false
AbsZ = false
m1 = 0.74205856,0,0
RotAngle1:Linear:0:180:-180:1:30:0.3:1:1.7:1:0
PreRotAngle1:Linear:0:-180:180:1:30:0.3:1:1.7:1:0
#endpreset

