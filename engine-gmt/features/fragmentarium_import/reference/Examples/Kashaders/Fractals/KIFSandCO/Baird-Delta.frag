#info Baird Delta

#include "MathUtils.frag"
#define providesInit
#include "DE-Raytracer.frag"

#group Baird_Delta
// Number of fractal iterations.
uniform int Iterations;  slider[0,9,100]

uniform float angle; slider[60.0001,72,90]

//Rotation
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]

uniform float RotAngle; slider[0.00,0,360]

//#define PI 3.14159
#define ACONV PI/360.

mat3 rot;

const vec3 fl0=vec3(cos(PI/6.),-sin(PI/6.),0.);
vec3 fl1=vec3(0.);
vec3 fp1=vec3(0.);
float scl=1.;
void init() {
	float beta=ACONV*angle;
	float t=tan(beta);
	fp1=vec3(0.5,0.,sqrt(3.*t*t-1.)*0.25);
	fl1=normalize(vec3(1.,0.,-0.5*sqrt(3.*t*t-1.)));
	t=cos(beta);
	scl=4.*t*t;

	rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

float DE(vec3 p) {
	float r2=dot(p,p), dd=1.; 
	for(int i=0; i<Iterations && r2<100.; i++){
		//Sierpinski triangle symmetry + fold about xy plane
		p.yz=abs(p.yz);
		float t=2.*min(0.,dot(p,fl0)); p-=t*fl0;
		p.y=abs(p.y);
		
		//Koch curve fold
		p-=fp1;
		t=2.*min(0.,dot(p,fl1)); p-=t*fl1;
		p+=fp1;

		//p*=rot;
		//scale
		p.x-=1.;p*=rot; p*=scl; p.x+=1.;dd*=scl;
		r2=dot(p,p);
		orbitTrap = min(orbitTrap, abs(vec4(p.x,p.y,p.z,r2)));
	}
	return (sqrt(r2)-3.)/dd;
}
#preset Default
FOV = 0.4
Eye = -0.243229,2.7392,1.63584
Target = 0.810443,-5.81592,-3.43366
Up = 0.0635763,-0.50295,0.861974
Detail = -3
DetailAO = -1.35716
FudgeFactor = 1
MaxRaySteps = 64
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,1
SpecularExp = 8.929
SpotLight = 1,1,1,1
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1.5849
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 20
Reflection = 0
BaseColor = 0.807843,0.807843,0.807843
OrbitStrength = 0.64935
X = 0.105882,0.423529,0.835294,0.5534
Y = 1,0.752941,0.00784314,1
Z = 0.329412,0.831373,0.215686,-1
R = 0.945098,0.545098,0.494118,0.09804
BackgroundColor = 0,0,0
GradientBackground = 0.3
CycleColors = true
Cycles = 4.04901
EnableFloor = true
FloorNormal = 0,0,0.90244
FloorHeight = -0.6
FloorColor = 1,1,1
Iterations = 12
angle = 80
RotVector = 0,0,1
RotAngle = 0
EquiRectangular = false
FocalPlane = 1
Aperture = 0
Gamma = 1
ToneMapping = 4
Exposure = 1.34694
Brightness = 1
Contrast = 1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1
Specular = 0.4
SpecularMax = 10
DebugSun = false
#endpreset