#donotrun
#include "3D-VDB.frag"
#include "Standard-BRDFs.frag"
#include "Color-Management.frag"


float fovPixelFactor;
vec4 orbitTrap = vec4(10000.0);
vec3 nTrace = vec3(0, 1, 0);
#ifdef volumetric
bool hitVolume;
#endif

#define HITDIST( p ) length(p-Eye)*fovPixelFactor



/****************************************************************
 * Uniforms
 ****************************************************************/

#group Scene
uniform float SceneRadius; slider[0,20.,100]
#ifndef providesLight
uniform vec3 LightDirection; slider[(0,0,0),(0,1,0),(0,0,0)]
uniform vec4 LightColor; color[0,7,100,1.0,1.0,1.0]
uniform float LightRadius; slider[0.002,.01,.75]
#endif
#ifndef providesBackground
uniform vec4 BackgroundColor; color[0,1,3,.5,.75,1.]
#endif

#group Rendering
uniform float Precision; slider[.1,2,16]
uniform int Steps; slider[32,512,1024]
uniform int BackSteps; slider[0,2,16]
uniform int Bounces; slider[1,2,32]
uniform float StepFactor; slider[.1,1.,2.]
uniform float NormalStepFactor; slider[0.,1.,4.]
uniform bool PreviewPrecision; checkbox[false]
uniform int PreviewPrecisionHeight; slider[540,1080,4320]
uniform float IndirectLightClamping; slider[0.1,10.,50.]
#ifdef volumetric
uniform bool EnableVolumetrics; checkbox[true]
uniform int VolumeSteps; slider[8,128,512]
uniform float VolumeMaxDensity; slider[0,10.,100.]
#endif

#group Coloring
#ifndef providesColor
uniform vec3 BaseColor; color[1.0,1.0,1.0]
uniform float OrbitStrength; slider[0,0,1]
uniform vec4 X; color[-1,0.7,1,0.5,0.6,0.6]
uniform vec4 Y; color[-1,0.4,1,1.0,0.6,0.0]
uniform vec4 Z; color[-1,0.5,1,0.8,0.78,1.0]
uniform vec4 R; color[-1,0.12,1,0.4,0.7,1.0]
uniform bool CycleColors; checkbox[false]
uniform float Cycles; slider[0.1,1.1,32.3]
#endif

#group Material
uniform float Roughness; slider[0.001,.1,1.]
uniform bool Metallic; checkbox[false]
uniform float IoR; slider[1,1,2.5]
#ifdef volumetric
uniform float VolumeDensityMultiplier; slider[0,1.,100.]
uniform vec3 VolumeColor; color[1,1,1]
uniform vec4 VolumeEmission; color[0.,0.,10.,1,1,1]
uniform vec4 VolumeExtinction; color[0.,0.,100.,1,1,1]
uniform float VolumeAnisotropy; slider[-.99,0,.99]
#endif




/****************************************************************
 * Linearized colors
 ****************************************************************/

#ifndef providesLight
vec4 LinearLightColor = vec4(srgb2linear(LightColor.rgb), LightColor.w);
#endif
#ifndef providesBackground
vec4 LinearBackgroundColor = vec4(srgb2linear(BackgroundColor.rgb), BackgroundColor.w);
#endif
#ifndef providesColor
vec3 LinearBaseColor = srgb2linear(BaseColor);
vec4 LinearX = vec4(srgb2linear(X.rgb), X.w);
vec4 LinearY = vec4(srgb2linear(Y.rgb), Y.w);
vec4 LinearZ = vec4(srgb2linear(Z.rgb), Z.w);
vec4 LinearR = vec4(srgb2linear(R.rgb), R.w);
#endif
#ifdef volumetric
vec3 LinearVolumeColor = srgb2linear(VolumeColor);
vec4 LinearVolumeEmission = vec4(srgb2linear(VolumeEmission.rgb), VolumeEmission.w);
vec4 LinearVolumeExtinction = vec4(srgb2linear(VolumeExtinction.rgb), VolumeExtinction.w);
#endif




/****************************************************************
 * Lights & background
 ****************************************************************/

#ifdef providesLight
vec3 lightSample(vec3 pos, out float dist);
bool hitLight(vec3 pos, vec3 dir, float t, out vec3 color);
float lightPDF(vec3 V);
#else
vec3 lightSample(vec3 pos, out float dist) {
	dist = -1.;
	vec3 t = ortho(LightDirection);
	vec3 b = cross(t, LightDirection);
	mat3 light2Word = mat3(t, b, LightDirection);
	float a = random() * TWO_PI;
	float r =  1. - (1.-cos(LightRadius)) * random();
	return light2Word * vec3(sqrt(1. - r*r) * vec2(cos(a), sin(a)), r);
}

float lightPDF(vec3 V) {
	float sphericalCapArea = TWO_PI * (1.-cos(LightRadius));
	float isInCone = step(cos(LightRadius), dot(V, LightDirection));
	return isInCone / sphericalCapArea;
}

bool hitLight(vec3 pos, vec3 dir, float t, out vec3 color) {
	if(dot(dir, LightDirection) < cos(LightRadius) || t >= 0.) return false;
	float sphericalCapArea = TWO_PI * (1.-cos(LightRadius));
	color = LinearLightColor.rgb * LinearLightColor.w / sphericalCapArea;
	return true;
}
#endif

#ifdef providesBackground
vec3 background(vec3 dir);
#else
vec3 background(vec3 dir)  {
	return LinearBackgroundColor.rgb*LinearBackgroundColor.w;
}
#endif




/****************************************************************
 * Ray tracing.
 ****************************************************************/

vec2 sphereIntersect(vec3 pos, vec3 dir, vec3 spherePos, float sphereRadius) {
	pos -= spherePos;
	float b = -dot(pos, dir);
	float c2 = dot(pos, pos) - sphereRadius * sphereRadius;
	float d = b * b - c2;
	if (d < 0.0) return vec2(-1.);
	float s = sqrt(d);
	return vec2(b - s, b + s);
}

#ifdef volumetric
float density(vec3 pos);
#endif

#ifndef noDE
float DE(vec3 pos);

bool invertDE;

float CDE(vec3 pos, float hd) {
	float inv = float(invertDE);
	float s = 1. - 2. * inv;
	float d = 2. * inv * hd;
	return s*DE(pos) + d;
}

float sdfTrace(vec3 pos, vec3 dir, float maxT) {
	float dist, hd;
	float t = 0.;
	invertDE = sign(DE(pos) - HITDIST(pos)) < 0.;
	vec3 p = pos;
	for(int i = 0; i < Steps; i++) {
		p = pos + dir*t;
		hd = HITDIST(p);
		dist = CDE(p, hd);
		if(dist < hd || t >= maxT) break;
		t += StepFactor * dist * .9999;
	}
	if(dist < hd) {
		for(int i = 0; i < BackSteps; i++) {
			t += max(dist, 0.)-hd;
			p = pos + dir*t;
			dist = CDE(p, hd);
		}
		vec2 k = vec2(max(dist, 1e-6), 0);
		nTrace = vec3(DE(p+k.xyy)-DE(p-k.xyy), DE(p+k.yxy)-DE(p-k.yxy), DE(p+k.yyx)-DE(p-k.yyx));
		nTrace = dot(nTrace, nTrace) > 0.0 ? normalize(nTrace) : -dir;
		return t;
	} 
	return -1.;
}
#endif

#ifdef volumetric
float traceVolume(vec3 pos, vec3 dir, float maxT, inout vec3 att) {
	
	if(!EnableVolumetrics) return -1.;
	
	bool hit = false;
	float t = 0.0;
	vec3 extinction = vec3(0);
	for (int i = 0; i < VolumeSteps && !hit && t < maxT; i++) {
		t -= log(1.0 - random()) / VolumeMaxDensity;
		float d = density(pos + dir * t) * VolumeDensityMultiplier;
		hit = random() * VolumeMaxDensity < d;
		extinction += min(d / VolumeMaxDensity, 1.0) * LinearVolumeExtinction.rgb * LinearVolumeExtinction.w;
	}
	att *= exp(linear2acescg * -extinction);
	return hit && t < maxT ? t : -1.0;
}
#endif

float combine(float t1, float t2) {
	return t2 >= 0. && (t1 < 0. || t2 < t1) ? t2 : t1;
}

#ifdef providesTrace
float trace(vec3 pos, vec3 dir, float maxT, inout vec3 att);
#else
float trace(vec3 pos, vec3 dir, float maxT, inout vec3 att) {
	vec2 sT = sphereIntersect(pos, dir, vec3(0.), SceneRadius);
	float t0 = max(0., sT.x);
	maxT = combine(maxT, sT.y - t0);
	pos += t0 * dir;
	
	float t = -1.;
	
	#ifndef noDE
	t = combine(sdfTrace(pos, dir, maxT), t);
	maxT = combine(maxT, t);
	#endif
	
	#ifdef volumetric
	// using the attenuation like that is fine because we do the volume last, if we had
	// multiple transparent material we'd have to find the closest intersection first
	float tVol = traceVolume(pos, dir, maxT, att);
	t = combine(tVol, t);
	maxT = combine(maxT, t);
	hitVolume = tVol >= 0. && t == tVol;
	#endif
	
	return maxT == t ? t + sign(t) * t0 : -1.;
}
#endif




/****************************************************************
 * Procedural colors.
 ****************************************************************/

#ifdef providesColor
vec3 baseColor(vec3 pos, vec3 n);
#else
vec3 cycle(vec3 c, float s) {
	return cos(c+s*Cycles)*.5+.5;
}

vec3 baseColor(vec3 pos, vec3 n) {
	#ifndef noDE
	pos -= n*DE(pos);
	orbitTrap = vec4(1000.);
	DE(pos);
	#endif
	
	orbitTrap.w = sqrt(orbitTrap.w);
	vec3 orbitColor;
	if (CycleColors) {
		orbitColor = cycle(LinearX.rgb,orbitTrap.x)*LinearX.w*orbitTrap.x +
		cycle(LinearY.rgb,orbitTrap.y)*LinearY.w*orbitTrap.y +
		cycle(LinearZ.rgb,orbitTrap.z)*LinearZ.w*orbitTrap.z +
		cycle(LinearR.rgb,orbitTrap.w)*LinearR.w*orbitTrap.w;
	} else {
		orbitColor = LinearX.rgb*LinearX.w*orbitTrap.x +
		LinearY.rgb*LinearY.w*orbitTrap.y +
		LinearZ.rgb*LinearZ.w*orbitTrap.z +
		LinearR.rgb*LinearR.w*orbitTrap.w;
	}
	return clamp(mix(LinearBaseColor, 3.0*orbitColor,  OrbitStrength), vec3(0.), vec3(1.));
}
#endif




/****************************************************************
 * BRDFs n stuff.
 ****************************************************************/

vec3 BRDFSample(vec3 wo, vec3 prng) {
	#ifdef volumetric
	if(hitVolume) {
		return volumeBRDFSample(prng);
	} else
	#endif
	{
		return surfaceBRDFSample(wo, prng);
	}
}

float BRDFPDF(vec3 wo, vec3 wi) {
	#ifdef volumetric
	if(hitVolume) {
		return volumeBRDFPDF(wi);
	} else
	#endif
	{
		return surfaceBRDFPDF(wo, wi);
	}
}

vec3 BRDF(vec3 wo, vec3 wi) {
	#ifdef volumetric
	if(hitVolume) {
		return volumeBRDF(wi);
	} else
	#endif
	{
		return surfaceBRDF(wo, wi);
	}
}

vec3 emission(vec3 wo) {
	#ifdef volumetric
	if(hitVolume) {
		return volumeEmission();
	} else
	#endif
	{
		return surfaceEmission(wo);
	}
}



/****************************************************************
 * Utils.
 ****************************************************************/
 
 float luminance(vec3 c) {
	// ACEScg luminance
	return dot(c, vec3(0.2722287168, 0.6740817658, 0.0536895174));
 }

vec3 clampedIllumination(vec3 li) {
	float l = luminance(li); 
	return l < IndirectLightClamping ? li : li * IndirectLightClamping / l;
}




/****************************************************************
 * Function called by "3D-VDB.frag".
 ****************************************************************/

vec3 color(vec3 pos, vec3 dir) {
	
	if(PreviewPrecision) fovPixelFactor = FOV/Precision/float(PreviewPrecisionHeight);
	else fovPixelFactor = pixelScale.y*FOV/Precision;
	
	vec3 att = vec3(1.), outCol = vec3(0.0);
	
	#ifndef MIS
	bool computedShadows = false;
	#endif
	
	for(int i = 0; i <= Bounces; i++) {
		float t = trace(pos, dir, -1., att);
		vec3 lightColor;
		if(hitLight(pos, dir, t, lightColor)) {
			#ifndef MIS
			if (computedShadows) {
				break;
			}
			#endif
			vec3 li = linear2acescg * lightColor;
			if (i == 0) {
				outCol += att * li;
			} else {
				outCol += att * clampedIllumination(li);
			}
			break;
		}
		if(t < 0.) {
			vec3 li = linear2acescg * background(dir);
			if (i <= 1) {
				outCol += att * li;
			} else {
				outCol += att * clampedIllumination(li);
			}
			break;
		}
		
		pos += t*dir;
		
		float hd = HITDIST(pos);
		float dz = 0.;
		#ifndef noDE
		dz = DE(pos) - hd;
		#endif
		#ifdef volumetric
		dz = hitVolume ? 0. : dz;
		vec3 z = hitVolume ? dir : nTrace;
		#else
		vec3 z = nTrace;
		#endif
		vec3 b = ortho(z);
		mat3 brdf2World = mat3(cross(b, z), b, z);
		mat3 world2Brdf = mat3(brdf2World[0].x, brdf2World[1].x, brdf2World[2].x,
							   brdf2World[0].y, brdf2World[1].y, brdf2World[2].y,
							   brdf2World[0].z, brdf2World[1].z, brdf2World[2].z);
		
		vec3 V = world2Brdf * -dir;
		
		// making sure we set the materials
		#ifndef noDE
		surface = surf(baseColor(pos, nTrace), vec3(0), Metallic, IoR, Roughness);
		DE(pos);
		#endif
		#ifdef volumetric
		volume = vol(LinearVolumeColor, LinearVolumeEmission.rgb * LinearVolumeEmission.a, true, VolumeAnisotropy);
		density(pos);
		#endif
		
		{
			vec3 li = linear2acescg * emission(V);
			if (i == 0) {
				outCol += att * li;
			} else {
				outCol += att * clampedIllumination(li);
			}
		}
		
		vec3 rgn = vec3(prng(PRNG_BASE + i * PRNG_BOUNCE + PRNG_BRDF_U),
						 prng(PRNG_BASE + i * PRNG_BOUNCE + PRNG_BRDF_V),
						 prng(PRNG_BASE + i * PRNG_BOUNCE + PRNG_BRDF));
		
		vec3 rX = BRDFSample(V, rgn);
		float pdf11 = BRDFPDF(V, rX);
		float pdf12 = lightPDF(brdf2World * rX);
		
		float lightDist;
		vec3 lX = world2Brdf * lightSample(pos, lightDist);
		float pdf21 = BRDFPDF(V, lX);
		float pdf22 = lightPDF(brdf2World * lX);
		
		vec3 lPos = pos;
		vec3 rBrdf = linear2acescg * BRDF(V, rX);
		vec3 lBrdf = linear2acescg * BRDF(V, lX);
		
		#ifdef MIS
		float pdf1 = pdf11 + pdf12;
		float pdf2 = pdf21 + pdf22;
		#else
		float pdf1 = pdf11;
		float pdf2 = pdf22;
		#endif
		
		
		vec3 rReflectance = pdf1 > 0.0 ? rBrdf / pdf1 : vec3(0.0);
		vec3 lReflectance = pdf2 > 0.0 ? lBrdf / pdf2 : vec3(0.0);
		#ifdef volumetric
		if(!hitVolume)
		#endif
		{
			pos  += z*(hd*sign(rX.z)-dz)*NormalStepFactor;
			lPos += z*(hd*sign(lX.z)-dz)*NormalStepFactor;
			rReflectance *= abs(rX.z);
			lReflectance *= abs(lX.z);
		}
		if(i != Bounces) {
			#ifndef MIS
			computedShadows = true;
			#endif
			
			vec3 lAtt = vec3(1.0);
			float lt = trace(lPos, brdf2World * lX, lightDist, lAtt);
			
			vec3 directLight;
			bool hit = hitLight(lPos, brdf2World * lX, lt, directLight);
			directLight = float(hit) * (linear2acescg * directLight);
			
			vec3 li = lAtt * directLight * lReflectance;
			if (i == 0) {
				outCol += att * li;
			} else {
				outCol += att * clampedIllumination(li);
			}
		}
		
		att *= rReflectance;
		
		float lum = min(luminance(att), 1.0);
		if (prng(PRNG_BASE + i * PRNG_BOUNCE + PRNG_RR) < 1.0 - lum) break;
		att /= lum;
			
		dir = brdf2World * rX;
	}
	
	return acescg2linear * outCol;		// we return sRGB for compatility with other buffer shaders / 3D cameras
}
