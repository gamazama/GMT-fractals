#donotrun

#ifndef COMMON_FOLDS_IMPORTED
#define COMMON_FOLDS_IMPORTED

void boxFold(inout vec4 p, vec3 s) {
	p.xyz = clamp(p.xyz, -s, s) * 2. - p.xyz;
}

void sphereFold(inout vec4 p, float mr, float fr) {
	p *= fr / clamp(dot(p.xyz, p.xyz), mr, fr);
}

void absFold(inout vec4 p, vec3 f) {
	p.xyz = abs(p.xyz - f) + f;
}

void planeFold(inout vec4 p, vec3 n) {
	p.xyz = p.xyz - 2.*n*min(dot(p.xyz, n), 0.);
}

float cylinderDE(vec4 p, vec3 axis, float r, float h) {
	float hm = abs(dot(p.xyz, normalize(axis)));
	float rm = sqrt(dot(p.xyz, p.xyz) - hm*hm);
	vec2 s = vec2(rm, hm) - vec2(r, h);
	return (length(max(s, vec2(0))) + min(max(s.x, s.y), 0.)) / p.w;
}

float boxDE(vec4 p, vec3 s) {
	vec3 a = abs(p.xyz) - s;
	return (min(max(max(a.x, a.y), a.z), 0.) + length(max(a, 0.))) / p.w;
}

float sphereDE(vec4 p, float r) {
	return (length(p.xyz) - r) / p.w;
}

#endif
