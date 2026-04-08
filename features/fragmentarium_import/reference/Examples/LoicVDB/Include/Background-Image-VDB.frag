#donotrun
#include "Utils-VDB.frag"
#include "Color-Management.frag"

#define providesBackground

#group Background
uniform samplerCube cubemap; file[cubemap.png]
uniform float BackgroundLuminosity; slider[0,3,100]
uniform float BackgroundGamma; slider[.3,1,3]
uniform bool BackgroundLinearize; checkbox[true]

vec3 background(vec3 dir) {
	vec3 c = textureCube(cubemap, dir).rgb;
	if(BackgroundLinearize) c = srgb2linear(c);
	return pow(c, vec3(1./BackgroundGamma)) * BackgroundLuminosity;
}
