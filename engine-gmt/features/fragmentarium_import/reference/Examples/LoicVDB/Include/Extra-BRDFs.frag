#donotrun
#include "Utils-VDB.frag"




/****************************************************************
 * Surface BRDFs : work in surface space (z is normal).
 * Normalized to 2, 1 when cosine weighted.
 ****************************************************************/

vec3 lambertImportanceSampling(vec3 V) {
	float a = random() * TWO_PI;
	float r = sqrt(random()) * sign(V.z);
	return vec3(sqrt(1. - r * r) * vec2(cos(a), sin(a)), r);
}

float lambertPDF(vec3 V, vec3 R) {
	return max(sign(V.z) * R.z, 0.) * INV_PI;
}

vec3 lambertBRDF(vec3 V, vec3 L, vec3 color) {
	return max(sign(V.z*L.z) * color, vec3(0.)) * INV_PI;
}

vec3 translucentImportanceSampling(vec3 V) {
	return lambertImportanceSampling(V) * (random() < .5 ? -1. : 1.);
}

float translucentPDF(vec3 V, vec3 R) {
	return abs(R.z) * .5 * INV_PI;
}

vec3 translucentBRDF(vec3 V, vec3 L, vec3 color) {
	return color * .5 * INV_PI;
}

float GGXG1(float NoV, float a2) {
	return 2. * NoV / (NoV + sqrt(a2 + (1. - a2) * NoV*NoV));
}

float GGXNDF(float NoM, float a2) {
	float d = NoM * NoM * (a2 - 1.) + 1.;
	return INV_PI * a2 / (d*d);
}

float GGXVNDF(vec3 V, vec3 H, float a2) {
	return GGXG1(V.z, a2) * GGXNDF(H.z, a2) / (2. * V.z);
}

vec3 sampleGGXVNDF(vec3 V_, float alpha) {
	
	// stretch view
	vec3 V = normalize(vec3(alpha * V_.xy, V_.z));
	
	// orthonormal basis
	vec3 T1 = (V.z < 0.9999) ? normalize(cross(V, vec3(0,0,1))) : vec3(1,0,0);
	vec3 T2 = cross(T1, V);
	
	// sample point with polar coordinates (r, phi)
	float U1 = random();
	float U2 = random();
	float a = 1.0 / (1.0 + V.z);
	float r = sqrt(U1);
	float phi = (U2<a) ? U2/a * PI : PI + (U2-a)/(1.0-a) * PI;
	float P1 = r*cos(phi);
	float P2 = r*sin(phi)*((U2<a) ? 1.0 : V.z);
	
	// compute normal
	vec3 N = P1*T1 + P2*T2 + sqrt(max(0.0, 1.0 - P1*P1 - P2*P2))*V;
	
	// unstretch
	N = normalize(vec3(alpha*N.xy, max(0.0, N.z)));
	
	return N;
}

vec3 glossyGGXImportanceSampling(vec3 V, float alpha) {
	return reflect(-V, sampleGGXVNDF(V, alpha));
}

float glossyGGXPDF(vec3 V, vec3 R, float alpha) {
	if(V.z <= 0. || R.z <= 0.) return 0.;
	return GGXVNDF(V, normalize(V+R), alpha*alpha) * .5;	// DON'T ASK ME WHERE THAT .5 COMES FROM IT FIXES EVERYTHING AND I DON'T KNOW WHY
}

vec3 glossyGGXBRDF(vec3 V, vec3 L, float alpha, vec3 color) {
	if(V.z <= 0. || L.z <= 0.) return vec3(0.);
	float a2 = alpha * alpha;
	float G = GGXG1(V.z, a2) * GGXG1(L.z, a2);
	float D = GGXNDF(normalize(V+L).z, a2);
	// fake multiscattering correction from https://c0de517e.blogspot.com/2019/08/misunderstanding-multiscattering.html
	float correction = 1. + 2.*alpha*alpha * V.z;
	return color * G * D / (4. * V.z * L.z) * correction;
}

float schlickFresnel(float cosTheta, float r0) {
	float c = 1. - cosTheta;
	return r0 + (1. - r0) * (c*c*c*c*c);
}

// could be useful for metals
vec3 schlickFresnel(float cosTheta, vec3 r0) {
	float c = 1. - cosTheta;
	return r0 + (1. - r0) * (c*c*c*c*c);
}

float schlickFresnel(vec3 V, vec3 N, float eta) {
	float cosTheta = dot(V, N);
	float sqrtR0 = (1. - eta) / (1. + eta);
	return schlickFresnel(cosTheta, sqrtR0*sqrtR0);
}

vec3 clearcoatGGXImportanceSampling(vec3 V, float alpha, float ior) {
	vec3 h = sampleGGXVNDF(V, alpha);
	float F = schlickFresnel(V, h, ior);
	vec3 R = (random() < F) ? reflect(-V, h) : lambertImportanceSampling(V);
	return R;
}

float clearcoatGGXPDF(vec3 V, vec3 R, float alpha, float ior) {
	if(V.z <= 0. || R.z <= 0.) return 0.;
	float g = glossyGGXPDF(V, R, alpha);
	float l = lambertPDF(V, R);
	return mix(l, g, schlickFresnel(V, normalize(V+R), ior));
}

vec3 clearcoatGGXBRDF(vec3 V, vec3 L, float alpha, float ior, vec3 color) {
	if(V.z <= 0. || L.z <= 0.) return vec3(0.);
	float a2 = alpha * alpha;
	vec3 h = normalize(V+L);
	float G = GGXG1(V.z, a2) * GGXG1(L.z, a2);
	float D = GGXNDF(h.z, a2);
	// fake multiscattering correction from https://c0de517e.blogspot.com/2019/08/misunderstanding-multiscattering.html
	float correction = 1. + 2.*alpha*alpha * V.z;
	vec3 g = vec3(G * D / (4. * V.z * L.z) * correction);
	vec3 l = color * INV_PI;
	return mix(l, g, schlickFresnel(V, h, ior));
}



/****************************************************************
 * Volume BRDFs : work in "scattering space" (z is intersection
 * direction). Normalized to 1.
 ****************************************************************/

float henyeyGreensteinIntegral(float cosTheta, float anisotropy){
	if(anisotropy == 0.) return cosTheta;
 	return (1.-anisotropy*anisotropy)/(anisotropy*sqrt(1.+anisotropy*(anisotropy-2.*cosTheta)));
}

vec3 henyeyGreensteinImportanceSampling(float anisotropy) {
	float cosTheta = 1. + henyeyGreensteinIntegral(-1., anisotropy) - henyeyGreensteinIntegral(random()*2.-1., anisotropy);
	float r = sqrt(max(1.-cosTheta*cosTheta, 0.));
	float a = random() * TWO_PI;
	return vec3(r*cos(a), r*sin(a), cosTheta);
}

float henyeyGreensteinPDF(vec3 V, float anisotropy){
	return .25 * INV_PI * (1.-anisotropy*anisotropy) / pow(1.+anisotropy*(anisotropy-2.*V.z), 1.5);
}

vec3 henyeyGreensteinBRDF(vec3 L, vec3 color, float anisotropy) {
 	return henyeyGreensteinPDF(L, anisotropy) * color;
}

vec3 isotropicImportanceSampling() {
	float cosTheta = random() * 2. - 1.;
	float r = sqrt(max(1.-cosTheta*cosTheta, 0.));
	float a = random() * TWO_PI;
	return vec3(r*cos(a), r*sin(a), cosTheta);
}

float isotropicPDF(vec3 V) {
 	return .25 * INV_PI;
}

vec3 isotropicBrdf(vec3 L, vec3 color) {
 	return isotropicPDF(L) * color;
}