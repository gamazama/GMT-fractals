#donotrun
#include "Utils-VDB.frag"
#include "Color-Management.frag"

#define providesBackground
#define providesLight

// exp(x) is infinity for numbers bigger than this
#define EXP_UPPER 88.722

// independant from the settings, tends to artifact when higher than this
#define SKY_STEP_EXPONENT .6


#group Scene
uniform vec3 LightDirection; slider[(0,0,0),(0,1,0),(0,0,0)]
uniform vec4 LightColor; color[0,7,100,1.0,1.0,1.0]
uniform float LightRadius; slider[0.002,.01,.75]
uniform int SkySamples; slider[0,16,32]
uniform vec3 SkyUp; slider[(0,0,0),(0,1,0),(0,0,0)]
uniform vec4 RayleighColor; color[0,.3,1,.5,.75,.95]
uniform vec4 MieColor; color[0,.05,.2,1.,1.,1.]
uniform float MieAnisotropy; slider[-1.,.6,1.];


vec4 LinearLightColor = vec4(srgb2linear(LightColor.rgb), LightColor.w);
vec4 LinearRayleighColor = vec4(srgb2linear(RayleighColor.rgb), RayleighColor.w);
vec4 LinearMieColor = vec4(srgb2linear(MieColor.rgb), MieColor.w);

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

vec3 integrateAbs(float densiy, float up, vec3 volumeDensities) {
    return (up < 0.) ? 1.-sign(volumeDensities) : exp(-volumeDensities/up * densiy);
}

vec3 skyScatter(vec3 dir, vec3 backColor) {
	
	float tmp;
	vec3 lDir = lightSample(vec3(0), tmp);
	vec3 lCol = LinearLightColor.rgb*LinearLightColor.w;
	
	float dUp = dot(dir, SkyUp);
	float lUp = dot(lDir, SkyUp);
	
	float a = MieAnisotropy;
	vec3  mWeight = .25 * LinearMieColor.rgb*(1.-a*a) / pow(1.+a*(a-2.*dot(dir, lDir)), 1.5);
	float rWeight = .25;
	float mDensity = LinearMieColor.w;
	vec3  rDensity = LinearRayleighColor.rgb*LinearRayleighColor.w;
	
	vec3 att = vec3(1);
	vec3 contrib = vec3(0);
	
	float height = 0.;
	for(int i = 0; i < SkySamples; i++) {
		if(max(height*SKY_STEP_EXPONENT, -height) > EXP_UPPER) break;
		float localDensity = exp(-height);
		float step = exp(height*SKY_STEP_EXPONENT);
		height += dUp*step;
		float mAbs = exp(-step*localDensity*mDensity);
		vec3  rAbs = exp(-step*localDensity*rDensity);
		contrib += att * (rWeight*(1.-rAbs) + mWeight*(1.-mAbs)) * integrateAbs(localDensity, lUp, rDensity+mDensity);
		att *= mAbs*rAbs;
    }
	
	return contrib*lCol + backColor*integrateAbs(1., dUp, rDensity+mDensity);;
}

vec3 background(vec3 dir) {
	return skyScatter(dir, vec3(0.));
}

bool hitLight(vec3 pos, vec3 dir, float t, out vec3 color) {
	if(dot(dir, LightDirection) < cos(LightRadius) || t >= 0.) return false;
	float sphericalCapArea = TWO_PI * (1.-cos(LightRadius));
	color = skyScatter(dir, LinearLightColor.rgb*LinearLightColor.w/sphericalCapArea);
	return true;
}