#version 110
#info squary 3D Koch  Distance Estimator.
#define providesInit
#include "fast-Raytracer.frag"
#include "MathUtils.frag"
#group sqKoch 
// Based on Knighty's Kaleidoscopic IFS 3D Fractals, described here:
// http://www.fractalforums.com/3d-fractal-generation/kaleidoscopic-%28escape-time-ifs%29/

// Number of iterations.
uniform int Iterations;  slider[0,6,100]

// Scale parameter. A perfect Menger is 3.0
uniform float Scale; slider[0.00,3,4.00]

uniform vec3 RotVector; slider[(0,0,0),(1,0,0),(1,1,1)]

// Scale parameter. A perfect Menger is 3.0
uniform float RotAngle; slider[0,0,360]

// Scale parameter. A perfect Menger is 3.0
uniform float hpln; slider[-2.00,0,2.00]

mat3 rot;

void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

float DE1(vec3 z)
{
	float r;
	int n = 0;
	vec3 c=vec3(0.);
while (n < Iterations && dot(z,z)<10.0) {
		// Fold
		z = abs(z)*Scale;
		if(z.y>z.x) z.xy=z.yx;
		if(z.y>z.x) z.xy=z.yx;
		if(z.z>z.y) z.yz=z.zy;
		

		float a=Scale-1., b=Scale+1., c=z.x-a, d=z.x-b;
		float zfix=1.;
		z.z=zfix-abs(zfix-z.z);
		if(c<z.y){z.x=c; z.y=a-z.y;}
		else if(d>z.y) z.x=d;
		else{z.x=z.y; z.y=d;}
		//z = rot *z;
		//z=Scale* (z-c)+c;
		z = rot *z;
		
		r = dot(z, z);
		orbitTrap = min(orbitTrap, abs(vec4(z,r)));
		
		n++;
	}
	return (length(z)-2.) * pow(Scale, float(-n));
	//z=abs(z)-vec3(1.); return max(z.x,max(z.y,z.z)) * pow(Scale, float(-n));
}
float DE(vec3 z)
{
	return max(DE1(z),z.z-hpln);
}
