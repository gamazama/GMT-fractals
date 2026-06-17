
// added new color option mclarekin 16/04/20

#info Aexion's TetraBox2.http://www.fractalforums.com/mandelbulb-3d/how-to-make-a-sphere/msg90387/#msg90387
#define providesInit
#include "MathUtils.frag"
#include "DE-Raytracer.frag"

#group TetraBox2

// Number of fractal iterations.
uniform int Iterations;  slider[0,17,300]

uniform int ColorIterations;  slider[0,8,60]
uniform float CToffset;  slider[-3.0,3.0,5.0]
// box
uniform vec4 Offset; slider[(0.0,0.0,0.0,0.0),(1.0,1.0,1.0,1.0),(5.0,5.0,5.0,5.0)]

// sphere fold
uniform float minRR;  slider[0.0,0.25,5.0]
uniform float maxRR;  slider[0.0,1.0,5.0]
float maxDivMin = maxRR / minRR;
uniform vec4 offsetSph; slider[(-5.0,-5.0,-5.0,-5.0),(0.0,0.0,0.0,0.0),(5.0,5.0,5.0,5.0)]

// scale
uniform float Scale;  slider[0.0,2.0,5.0]

// precomputed constants
uniform vec3 Rotation; slider[(-180,-180,-180),(0,0,0),(180,180,180)]
mat3 rot;

void init() {
 rot = rotationMatrixXYZ(Rotation);
}

float DE(vec3 pos)
{
	vec4 CT =abs( vec4(pos.x+pos.y+pos.z,-pos.x-pos.y+pos.z,-pos.x+pos.y-pos.z,pos.x-pos.y-pos.z));
	CT = abs(CT - CToffset);
	float r=0.0;
	float rr=0.0;
	vec4 z = CT;

	int i = 0;
	float dd = 1.0;

	for (int i=0; i<Iterations; i++)
	{
		z = abs(z + Offset) - abs(z - Offset) - z;

		float rr = dot(z,z);

		z += offsetSph; // test
		if(rr < minRR)
		{
			z *= maxDivMin;
			dd *= maxDivMin;
		}
		else if(rr < maxRR)
		{
			float maxDivRR = maxRR / rr;
			z *= maxDivRR;
			dd *= maxDivRR;
		}
		z -= offsetSph; // test

		z = z * Scale;
		dd = dd * Scale + 1.0;

		//rotation  // test
		vec3 zr = vec3(z.x, z.y, z.z);
		zr *= rot;
		z = vec4(zr.x, zr.y, zr.z, z.w);

		z = z + CT;

		rr=dot(z,z);

		if (i<ColorIterations)
		{
			vec4 p = abs(z);
			orbitTrap.x = min(orbitTrap.x, abs(p.x-p.y-p.z+p.w));
			orbitTrap.y = min(orbitTrap.y, abs(p.x-p.y+p.z-p.w));
			orbitTrap.z = min(orbitTrap.z, abs(p.x+p.y-p.z+p.w));
			orbitTrap.w = min(orbitTrap.w, abs(p.x+p.y+p.z-p.w));
		}

		/*if (i<ColorIterations)
		{
			orbitTrap.x = abs(z.x-z.y-z.z+z.w);
			orbitTrap.y = abs(z.x-z.y+z.z-z.w);
			orbitTrap.z = abs(z.x+z.y-z.z-z.w);
			orbitTrap.w = length(orbitTrap.xyz);
		}*/

		//if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.xyz,rr)));
    if ( rr>10000.0) break;
	}
//float r = sqrt(rr);
//	r = length(z);
	return  length(z) / dd;
}