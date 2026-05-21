#donotrun

#ifndef UTILS_IMPORTED
#define UTILS_IMPORTED

#extension GL_EXT_gpu_shader4 : enable
#extension GL_ARB_gpu_shader5 : enable
#extension GL_ARB_shader_bit_encoding : enable

const float PI = 3.14159265358979323846264;
const float TWO_PI = 2. * PI;
const float INV_PI = 1. / PI;

#ifndef noUniformImport
uniform int subframe;
uniform float time;
uniform vec2 pixelSize;
uniform sampler2D backbuffer;
#endif

vec3 ortho(vec3 v) {
	return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y,v.x,0.) : vec3(0.,-v.z,v.y));
}

int hash(int i) {
	i *= 0xB5297A4D;
	i ^= i >> 10;
	i += 0x68E31DA4;
	i ^= i >> 10;
	i *= bitfieldReverse(i);
	i ^= i >> 10;
	i *= 0x1B56C4E9;
	return i;
}

float intRangeToFloat(int i) {
	const float invMaxInt = intBitsToFloat(0x2F7FFFFF);
	const float half = intBitsToFloat(0x3EFFFFFF);
	return float(i) * invMaxInt + half;
}

int pixelHash = hash(int(gl_FragCoord.x) + int(gl_FragCoord.y) * 0x259e8118);
int seedSquirrel3 = pixelHash ^ hash(int(subframe));

float random() {
	return intRangeToFloat(hash(seedSquirrel3++));
}

const int PRNG_AA_U = 0;
const int PRNG_AA_V = 1;
const int PRNG_DOF_U = 2;
const int PRNG_DOF_V = 3;
const int PRNG_BASE = 4;

const int PRNG_BRDF_U = 0;
const int PRNG_BRDF_V = 1;
const int PRNG_BRDF = 2;
const int PRNG_RR = 3;
const int PRNG_BOUNCE = 4;

int prngSample;

float prng(int dimension) {
	// just noise for now
	return intRangeToFloat(hash(prngSample * 0x7b860223 + dimension));
}

#endif
