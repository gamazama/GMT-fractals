#info 4D Quaternion Julia Distance Estimator
#define providesInit
#include "MathUtils.frag"
#include "DE-Raytracer.frag"

#group Msltoe IFS
// Number of fractal iterations.
uniform int Iterations;  slider[0,10,25]
// Scale
uniform float Scale; slider[1.2,2,5]
// Bounding Sphere Radius
uniform float BSR; slider[0,2,5]

uniform float Angle; slider[-180,0,180]
uniform vec3 Rot; slider[(-1,-1,-1),(1,1,1),(1,1,1)]

mat3 fracRotation;

void init() {
	fracRotation = rotationMatrix3(normalize(Rot), Angle);
}


float DE(vec3 z) {
        vec3 a1 = vec3(1.,1.,1.);
	vec3 a2 = vec3(-1.,-1.,1.);
	vec3 a3 = vec3(1.,-1.,-1.);
	vec3 a4 = vec3(-1.,1.,-1.);
	vec3 c;
	int n = 0;
	float dist, d;
	while (n < Iterations) {
		//z *= fracRotation;
		 c = a1; dist = dot(z-a1,z-a1);
	        d = dot(z-a2,z-a2); if (d < dist) { c = a2; dist=d; }
		 d = dot(z-a3,z-a3); if (d < dist) { c = a3; dist=d; }
		 d = dot(z-a4,z-a4); if (d < dist) { c = a4; dist=d; }
		z = Scale*z-c*(Scale-1.0);
		z *= fracRotation;
		n++;
		if (dot(z,z)>1000.) break;
	}

  return  (length(z)-BSR ) * pow(Scale, -float(n));
}