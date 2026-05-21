#include "Background-VDB.frag"
#include "DE-Raytracer-VDB.frag"

#group Mandelbulb
uniform int Iterations; slider[4,8,32]
uniform float Power; slider[2,8,16]
uniform float ThetaShift; slider[0,0,2]
uniform float Bailout; slider[1,2,16]

float DE(vec3 c) {
	vec3 z = c;
	float dr = 1.;
	float r = length(z);
	for (int i = 0; i < Iterations; i++) {
		if (r > Bailout) break;
		dr = dr * pow(r, Power-1.) * Power + 1.;
		float theta = acos(z.z/r) * Power + ThetaShift * PI;
		float phi = atan(z.y, z.x) * Power;
		z = pow(r, Power) * vec3(sin(theta) * vec2(cos(phi), sin(phi)), cos(theta)) + c;
		r = length(z);
		orbitTrap = min(orbitTrap, vec4(abs(z), r*r));
	}
	return min(0.5*log(r)*r/dr, 1.);
}

#preset Default
FOV = 0.11690364
Eye = 3.04968048,-0.28716759,4.00430511
Target = -2.39107947,1.09443564,-4.27152135
Up = 0.358257777,0.930168005,-0.080242311
FocalPlane = 4.2524918
Aperture = 0.08196721
Precision = 0.5
LightDirection = 0.436002713,0.892918093,-0.11224488
#endpreset
