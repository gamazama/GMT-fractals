#define noDE
#define volumetric
#include "Background-VDB.frag"
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

#preset Default
Bounces = 8
VolumeMaxDensity = 30.0
VolumeDensityMultiplier = 30.0
VolumeColor = 1,0.866666667,0.901960784
LightDirection = -0.74489796,0.344519215,0.571343627
SceneRadius = 2
FOV = 0.10110584
Eye = -5.81014334,-0.869031485,-4.51676214
Target = -4.80359966,-0.697543397,-3.6313298
Up = -0.120669407,0.990500457,-0.054662562
FocalPlane = 6.3122924
Aperture = 0.06393443
#endpreset
