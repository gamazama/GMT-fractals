#donotrun
#include "Utils-VDB.frag"


// surface ===========================================
 
struct surf {
	vec3 albedo;
	vec3 emission;
	bool metallic;
	float ior;
	float roughness;
} surface = surf(vec3(1.0, 0.0, 1.0), vec3(0), false, 1.0, 0.1);


float GGXG1(float NoV, float a2) {
	return 2. * NoV / (NoV + sqrt(a2 + (1.0 - a2) * NoV*NoV));
}

float GGXNDF(float NoM, float a2) {
	float d = NoM * NoM * (a2 - 1.0) + 1.0;
	return INV_PI * a2 / (d*d);
}

float GGXVNDF(vec3 wo, vec3 h, float a2) {
	return GGXG1(wo.z, a2) * GGXNDF(h.z, a2) / (2.0 * wo.z);
}

vec3 sampleGGXVNDF(vec3 wo, float alpha, vec2 prng) {
	
	// stretch view
	wo = normalize(vec3(alpha * wo.xy, wo.z));
	
	// orthonormal basis
	vec3 T1 = (wo.z < 0.9999) ? normalize(cross(wo, vec3(0,0,1))) : vec3(1,0,0);
	vec3 T2 = cross(T1, wo);
	
	// sample point with polar coordinates (r, phi)
	float U1 = prng.x;
	float U2 = prng.y;
	float a = 1.0 / (1.0 + wo.z);
	float r = sqrt(U1);
	float phi = (U2<a) ? U2/a * PI : PI + (U2-a)/(1.0-a) * PI;
	float P1 = r*cos(phi);
	float P2 = r*sin(phi)*((U2<a) ? 1.0 : wo.z);
	
	// compute normal
	vec3 N = P1*T1 + P2*T2 + sqrt(max(0.0, 1.0 - P1*P1 - P2*P2))*wo;
	
	// unstretch
	N = normalize(vec3(alpha*N.xy, max(0.0, N.z)));
	
	return N;
}

float fresnel(vec3 wo, vec3 h, float ior) {
  float cosi = dot(wo, h);
  float etai = 1.0, etat = ior;
  if (cosi < 0.0) {
    float tmp = etai;
    etai = etat;
    etat = tmp;
	cosi = -cosi;
  }
  float sint = etai / etat * sqrt(max(0.0, 1.0 - cosi * cosi));
  if (sint >= 1.0) return 1.0;
  float cost = sqrt(max(0.0, 1.0 - sint * sint));
  float sqrtRs = ((etat * cosi) - (etai * cost)) / ((etat * cosi) + (etai * cost));
  float sqrtRp = ((etai * cosi) - (etat * cost)) / ((etai * cosi) + (etat * cost));
  return (sqrtRs * sqrtRs + sqrtRp * sqrtRp) * 0.5;
}

vec3 surfaceBRDFSample(vec3 wo, vec3 prng) {
	float s = sign(wo.z);
	wo.z *= s;
	vec3 h = sampleGGXVNDF(wo, surface.roughness, prng.xy);
	float f = surface.metallic ? 1.0 : fresnel(wo, h, surface.ior);
	float a = prng.x * TWO_PI;
	float r = sqrt(prng.y);
	vec3 R = (prng.z < f) ? reflect(-wo, h) : vec3(sqrt(1. - r * r) * vec2(cos(a), sin(a)), r);
	R.z *= s;
	return R;
}

float surfaceBRDFPDF(vec3 wo, vec3 wi) {
	float s = sign(wo.z);
	wi.z *= s;
	wo.z *= s;
	if (wi.z < 0.0) return 0.0;
	float g = GGXVNDF(wo, normalize(wo+wi), surface.roughness*surface.roughness) * 0.5;
	float l = max(sign(wo.z) * wi.z, 0.) * INV_PI;
	float f = surface.metallic ? 1.0 : fresnel(wo, normalize(wo+wi), surface.ior);
	return mix(l, g, f);
}

vec3 surfaceBRDF(vec3 wo, vec3 wi) {
	if(wo.z <= 0. || wi.z <= 0.) return vec3(0.);
	float a2 = surface.roughness * surface.roughness;
	vec3 h = normalize(wo+wi);
	float G = GGXG1(wo.z, a2) * GGXG1(wi.z, a2);
	float D = GGXNDF(h.z, a2);
	// fake multiscattering correction from https://c0de517e.blogspot.com/2019/08/misunderstanding-multiscattering.html
	float correction = 1. + 2. * a2 * wo.z;
	vec3 g = (surface.metallic ? surface.albedo : vec3(1.0)) * (G * D / (4. * wo.z * wi.z) * correction);
	vec3 l = surface.albedo * INV_PI;
	float f = surface.metallic ? 1.0 : fresnel(wo, h, surface.ior);
	return mix(l, g, f);
}


vec3 surfaceEmission(vec3 wi) {
	return surface.emission;
}


// volume ===========================================


struct vol {
	vec3 albedo;
	vec3 emission;
	bool mie;
	float anisotropy;
} volume = vol(vec3(1.0, 0.0, 1.0), vec3(0), true, 0.0);

float henyeyGreensteinIntegral(float cosTheta, float a) {
	if(a == 0.0) return cosTheta;
 	return (1.0 - a * a) / (a * sqrt(1.0 + a * (a - 2.0 * cosTheta)));
}

vec3 volumeBRDFSample(vec3 prng) {
	float cosTheta = 1.0 + henyeyGreensteinIntegral(-1.0, volume.anisotropy) - henyeyGreensteinIntegral(prng.x * 2.0 - 1.0, volume.anisotropy);
	float r = sqrt(max(1.0 - cosTheta * cosTheta, 0.0));
	float a = prng.y * TWO_PI;
	return vec3(r * cos(a), r * sin(a), cosTheta);
}

float volumeBRDFPDF(vec3 wi){
	return 0.25 * INV_PI * (1.0 - volume.anisotropy * volume.anisotropy) / pow(1.0 + volume.anisotropy * (volume.anisotropy - 2.0 * wi.z), 1.5);
}

vec3 volumeBRDF(vec3 wi) {
 	return volumeBRDFPDF(wi) * volume.albedo;
}

vec3 volumeEmission() {
	return volume.emission;
}
