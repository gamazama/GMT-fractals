#define volumetric
#include "DE-Raytracer-VDB.frag"

float density(vec3 p) {
	vec2 z = vec2(p.z, p.z);
	vec2 c = vec2(p.x, p.y);
	for(int i = 0; i < 16; i++) {
		z = vec2(z.x*z.x-z.y*z.y, 2.*z.x*z.y) + c;
		if(dot(z, z) >= 4.) break;
	}
	return dot(z, z) >= 4. ? 0. : 1.;
}


float boxDE(vec3 p, vec3 s) {
	vec3 a = abs(p.xyz) - s;
	return (min(max(max(a.x, a.y), a.z), 0.) + length(max(a, 0.0)));
}

float DE(vec3 pos) {
	pos *= 2.;
	vec3 cPos = floor(clamp(pos+.5, vec3(-2, 0, -1), vec3(2, 0, 1)));
	return boxDE(pos-cPos, vec3(.1, 2., .1)) * .5;
}

#preset Default
FOV = 0.24328594
Eye = -3.01495774,2.08904206,-4.58523791
Target = 1.90950617,-1.59685841,3.29916398
Up = 0.03446139,0.913443386,0.405504131
FocalPlane = 5.2491694
Aperture = 0.08196721
LightDirection = 0.17006804,0.338532877,0.925457915
LightColor = 1,1,1,15
SceneRadius = 2
BackgroundColor = 0,0,0,0
SamplesPerFrame = 2
Bounces = 8
VolumeDensityMultiplier = 10
VolumeMaxDensity = 10
VolumeColor = 0.596078431,0.91372549,1
#endpreset
