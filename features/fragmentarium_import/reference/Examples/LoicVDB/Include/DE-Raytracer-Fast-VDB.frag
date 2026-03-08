#donotrun
#include "3D-VDB.frag"
#include "Standard-BRDFs.frag"
#include "Color-Management.frag"


float fovPixelFactor;
vec4 orbitTrap = vec4(10000.0);
vec3 nTrace = vec3(0, 1, 0);

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
uniform float StepFactor; slider[.1,1.,2.]
uniform bool PreviewPrecision; checkbox[false]
uniform int PreviewPrecisionHeight; slider[540,1080,4320]
uniform float AOStrength; slider[0.001,.25,1.]
uniform int AOSteps; slider[1,4,16]
uniform int AOStepsMultiplier; slider[1,4,16]

#ifdef volumetric
uniform bool EnableVolumetrics; checkbox[true]
uniform int VolumeSteps; slider[8,64,512]
uniform int VolumeShadowSteps; slider[2,16,128]
uniform float VolumeStepFactor; slider[0.01,1.0,5.0]
uniform float VolumeMaxDensity; slider[0,10.,100.]
uniform float VolumeAmbientLighting; slider[0.0,0.2,1.0]
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
uniform float IoR; slider[1,1.5,2.5]
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

#ifdef noDE
float DE(vec3 pos) {
	return pos.y + SceneRadius * 2.;
}
#else
float DE(vec3 pos);
#endif

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

float combine(float t1, float t2) {
	return t2 >= 0. && (t1 < 0. || t2 < t1) ? t2 : t1;
}

float trace(vec3 pos, vec3 dir, float maxT) {
	vec2 sT = sphereIntersect(pos, dir, vec3(0.), SceneRadius);
	float t0 = max(0., sT.x);
	maxT = combine(maxT, sT.y - t0);
	pos += t0 * dir;
	
	float t = -1.;
	t = combine(sdfTrace(pos, dir, maxT), t);
	maxT = combine(maxT, t);
	
	return maxT == t ? t + sign(t) * t0 : -1.;
}




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
	pos -= n*DE(pos);
	orbitTrap = vec4(1000.);
	DE(pos);
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
 * Shading functions.
 ****************************************************************/


vec3 directLight(vec3 pos, vec3 lightDir, float lightDist) {
	float lt = trace(pos, lightDir, lightDist);
	vec3 directLight;
	if(!hitLight(pos, lightDir, lt, directLight)) {
		return vec3(0);
	}
	vec3 att = vec3(1);
	#ifdef volumetric
	vec2 sT = sphereIntersect(pos, lightDir, vec3(0.), SceneRadius);
	float end = sT.y;
	float stepSize = VolumeStepFactor / VolumeMaxDensity;
	float t = random() * stepSize;
	for(int i = 0; i < VolumeShadowSteps && t < end; i++) {
		volume = vol(VolumeColor, vec3(0), true, VolumeAnisotropy);
		att *= exp(-stepSize * VolumeDensityMultiplier * density(pos + t*lightDir) * (1.0 + (linear2acescg * LinearVolumeExtinction.rgb) * LinearVolumeExtinction.w));
		t += stepSize;
	}
	#endif
	return att * (linear2acescg * directLight) / lightPDF(lightDir);
}

#ifdef volumetric
vec3 integrateVolume(vec3 pos, vec3 dir, float t, out vec3 att) {
	
	vec2 sT = sphereIntersect(pos, dir, vec3(0.), SceneRadius);
	float start = max(0., sT.x);
	float end = combine(t, sT.y);
	
	float stepSize = VolumeStepFactor / VolumeMaxDensity;
	
	int vseed = (subframe * SamplesPerFrame + cameraSample) * 0x782b6123;
	
	t = start + random() * stepSize;
	
	vec3 b = ortho(dir);
	mat3 brdf2World = mat3(cross(b, dir), b, dir);
	mat3 world2Brdf = mat3(brdf2World[0].x, brdf2World[1].x, brdf2World[2].x,
						   brdf2World[0].y, brdf2World[1].y, brdf2World[2].y,
						   brdf2World[0].z, brdf2World[1].z, brdf2World[2].z);
	
	vec3 color = linear2acescg * LinearVolumeColor;
	
	att = vec3(1.0);
	vec3 outCol = vec3(0);
	for(int i = 0; i < VolumeSteps && t < end; i++) {
		volume = vol(LinearVolumeColor, LinearVolumeEmission.rgb * LinearVolumeEmission.a, true, VolumeAnisotropy);
		float d = density(pos + t*dir) * VolumeDensityMultiplier;
		float a = exp(-stepSize * d);
		
		att *= exp(-stepSize * d * (linear2acescg * LinearVolumeExtinction.rgb) * LinearVolumeExtinction.w);
		
		vec3 emission = linear2acescg * volumeEmission();
		outCol += (1. - a) * att * emission;
		
		float attLuminance = dot(att, vec3(0.272228716, 0.6740817658, 0.0536895174));
		
		// hardcoded for now
		float samplingRate = 50.0;
		float samplingProb = min(attLuminance * (1. - a) * samplingRate, 1.0);
		
		if (intRangeToFloat(bitfieldReverse(vseed++)) < samplingProb) {
			float lightDist;
			vec3 lightDir = lightSample(pos, lightDist);
			vec3 prng = vec3(random(), random(), random());
			vec3 R = volumeBRDFSample(prng);
			vec3 lBrdf = linear2acescg * volumeBRDF(world2Brdf * lightDir);
			vec3 aBrdf = linear2acescg * volumeBRDF(R) / volumeBRDFPDF(R);
			vec3 dl = directLight(pos + t*dir, lightDir, lightDist);
			vec3 al = linear2acescg * VolumeAmbientLighting * background(brdf2World * R);
			outCol += (1. - a) * att / samplingProb * (dl * lBrdf + al * aBrdf);
		}
		
		att *= a;
		t += stepSize;
	}
	
	return outCol;
}
#endif




/****************************************************************
 * Function called by "3D-VDB.frag".
 ****************************************************************/

vec3 color(vec3 pos, vec3 dir) {
	
	if(PreviewPrecision) fovPixelFactor = FOV/Precision/float(PreviewPrecisionHeight);
	else fovPixelFactor = pixelScale.y*FOV/Precision;
	
	vec3 outCol = vec3(0);
	
	float t = trace(pos, dir, -1.);
	vec3 z = nTrace;
	
	vec3 att = vec3(1);
	
	#ifdef volumetric
	outCol += integrateVolume(pos, dir, t, att);
	#endif
	
	vec3 lightColor;
	if(hitLight(pos, dir, t, lightColor)) {
		outCol += att * (linear2acescg * lightColor);
	} else if(t < 0.) {
		outCol += att * (linear2acescg * background(dir));
	} else {
		
		pos += t*dir;
		
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
		
		outCol += linear2acescg * surfaceEmission(V);
		
		vec3 prng = vec3(prng(PRNG_BASE + PRNG_BRDF_U),
						 prng(PRNG_BASE + PRNG_BRDF_V),
						 prng(PRNG_BASE + PRNG_BRDF));
		vec3 R = surfaceBRDFSample(V, prng);
		float pdf = surfaceBRDFPDF(V, R);
		vec3 aoR = pdf > 0.0 ? linear2acescg * surfaceBRDF(V, R) / pdf * abs(R.z) : vec3(0.0);
		
		vec3 oPos = pos + z*(2.*HITDIST(pos)-DE(pos));
		
		float lightDist;
		vec3 lightDir = lightSample(pos, lightDist);
		vec3 L = world2Brdf * lightDir;
		vec3 brdf = linear2acescg * surfaceBRDF(V, L);
		outCol += att * abs(L.z) * brdf * directLight(oPos, lightDir, lightDist);
		
		float ao = 1.;
		float dist = DE(oPos);
		for(int i = 0; i < AOSteps && dot(oPos, oPos) < SceneRadius*SceneRadius; i++) {
			for(int j = 0; j < AOStepsMultiplier && dist > 0.0; j++) {
				float stepSize = random();
				oPos += z * dist * stepSize;
				float expected = dist * (1. + stepSize);
				dist = max(DE(oPos), 0.0);
				ao *= dist / expected;
			}
			vec2 k = vec2(max(dist, 1e-6), 0);
			z = normalize(vec3(DE(oPos+k.xyy)-dist, DE(oPos+k.yxy)-dist, DE(oPos+k.yyx)-dist));
		}
		outCol += att * (linear2acescg * background(brdf2World * R)) * aoR * pow(ao, AOStrength);
	}
	
	return acescg2linear * outCol;  // we return sRGB for compatility with other buffer shaders / 3D cameras*/
}
