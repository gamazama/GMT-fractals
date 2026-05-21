#info Menger Distance Estimator with spherify transformation. 
#info The spherify transformation is actually a super-ellipsoid transformation. 
#info Knighty (2013 - 2019) 
#info Public domain. 

#include "MathUtils.frag"
#define providesInit
#include "fast-Raytracer.frag"

#group Menger

// Number of iterations.
uniform int Iterations;  slider[0,10,20]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[0.00,3,4.00]

uniform vec3 RotVector; slider[(0,0,0),(1,0,0),(1,1,1)]

// Scale parameter. A perfect Menger is 3.0
uniform float RotAngle; slider[0.00,00,360]

// Scaling center
uniform vec3 Offset; slider[(-2,-2,-2),(1,1,1),(2,2,2)]

//Spherify?
uniform bool doSph; checkbox[false]

//Spherify expo on xy plane
uniform float SphExpoXY; slider[0,1.5,20]

//Spherify expo off xy plane
uniform float SphExpoZ; slider[0,1.5,20]

//Spherify amount 
uniform float SphFactor; slider[0,1,1]


mat3 rot;
float sc,sr;
void init() {
	rot = rotationMatrix3(normalize(RotVector), RotAngle);
	vec3 o=abs(Offset);
	sc = max(o.x,max(o.y,o.z));
	sr=sqrt(dot(o,o)+1.);
}

float N_norm(vec3 p, float e){
	vec3 ap = abs(p);
	ap = pow(ap,vec3(e));
	return pow(ap.x+ap.y+ap.z, 1./e);
}

float SPE_norm(vec3 p, float r, float t){
	vec3 ap = abs(p);
	vec2 ap1 = pow(ap.xy,vec2(r));
	float px = pow(ap1.x+ap1.y, t/r);
	return pow(px + pow(ap.z, t), 1./t);
}

float DE(vec3 p)
{
	float dd=1.;

	if(doSph) {
		vec3 ap=abs(p);
		//float L1=ap.x+ap.y+ap.z;//L1-norm
		float Linf=max(max(ap.x,ap.y),ap.z);//infinity norm
		//float L2=length(p);//euclidean norm
		float multiplier = SPE_norm(p, SphExpoXY, SphExpoZ) / Linf; //float multiplier = N_norm(p, SphExpoXY) / Linf;
		p = p * mix(1., multiplier, SphFactor);//Spherify transform.
		dd = mix(1., multiplier * 1.6, SphFactor);//to correct the DE. Found by try and error. there should be better formula. A better approache would be to evaluate the norm of the jacobian of the tranform.
	}

	float r2=dot(p,p);
	for(int i = 0; i<Iterations && r2<100.; i++){
		p=abs(p);
		if(p.y>p.x) p.xy=p.yx;
      		if(p.z>p.y) p.yz=p.zy;
      		if(p.y>p.x) p.xy=p.yx;
		p.z=abs(p.z-1./3.*Offset.z)+1./3.*Offset.z;
		p=p*Scale-Offset*(Scale-1.); dd*=Scale;
		p=rot*p;
		r2=dot(p,p);	
	}
#if 0
	return (sqrt(r2)-sr)/dd;//bounding volume is a sphere
#else
	p=abs(p); return (max(p.x,max(p.y,p.z))-sc)/dd;//bounding volume is a cube
#endif
}



#preset Default
FOV = 0.4
Eye = 1.15052,-1.71398,-2.3127
Target = -2.56083,3.81498,5.14763
Up = -0.096396,0.776133,-0.623158
AntiAlias = 1
Detail = -3.3
DetailAO = -0.5
FudgeFactor = 1
MaxRaySteps = 132
BoundingSphere = 12
Dither = 0.5
NormalBackStep = 1
AO = 0,0,0,0.7
Specular = 1.3542
SpecularExp = 100
SpotLight = 1,1,1,1
SpotLightDir = -0.1358,-0.53086
CamLight = 1,1,1,0.57972
CamLightMin = 1
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 0
Reflection = 0
BaseColor = 0.733333,0.745098,0.592157
OrbitStrength = 0
X = 0.5,0.6,0.6,0.70874
Y = 1,0.6,0,0.28156
Z = 0.8,0.78,1,0.06796
R = 0.4,0.7,1,0.31372
BackgroundColor = 0.454902,0.509804,0.6
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 5
Scale = 3
RotVector = 0,0,1
RotAngle = 0
Offset = 1,1,1
doSph = true
SphFactor = 1
SphExpoXY = 2
SphExpoZ = 1.0506
#endpreset
