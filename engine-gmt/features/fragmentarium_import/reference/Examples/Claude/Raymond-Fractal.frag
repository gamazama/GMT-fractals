#donotrun

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#if 0

#define MengerSponge_(type) \
MengerSponge(type tag, Transform T, Ray V, int depth) \
{ \
  vec3 p = backwardP(T, V.origin); \
  vec3 q0 = vec3(0.0); \
  float r = 1.5; \
  for (int i = 0; i < depth; ++i) \
  { \
    vec3 q1 = vec3(0.0); \
    float d = 1.0 / 0.0; \
    for (int x = -1; x <= 1; ++x) \
    for (int y = -1; y <= 1; ++y) \
    for (int z = -1; z <= 1; ++z) \
    { \
      if (int(x == 0) + int(y == 0) + int(z == 0) > 1) continue; \
      vec3 q = q0 + vec3(x, y, z) / r; \
      float de = length(p - q); \
      if (de < d) { d = de; q1 = q; } \
    } \
    q0 = q1; \
    r *= 3.0; \
  } \
  return Cube(tag, compose(Translate(q0), T), V, 1.5 / r); \
}
float MengerSponge_(Scene_DE)


Surface MengerSponge_(Scene_HIT)
#undef MengerSponge_

#endif

// delta normal calculation
#define DELTANORMAL(DE,E,p) normalize(vec3 \
  ( DE(p + vec3(E,0.0,0.0)) - DE(p - vec3(E,0.0,0.0)) \
  , DE(p + vec3(0.0,E,0.0)) - DE(p - vec3(0.0,E,0.0)) \
  , DE(p + vec3(0.0,0.0,E)) - DE(p - vec3(0.0,0.0,E)) \
  ))

float MengerSponge(Scene_DE tag, Transform T, Ray V, int depth)
{
  const float Scale = 3.0;
  const vec3 Offset = vec3(1.0);
  vec3 z = backwardP(T, V.origin);
	int n = 0;
	while (n < depth) {
		z = abs(z);
		if (z.x<z.y){ z.xy = z.yx;}
		if (z.x< z.z){ z.xz = z.zx;}
		if (z.y<z.z){ z.yz = z.zy;}
		z = Scale*z-Offset*(Scale-1.0);
		if( z.z<-0.5*Offset.z*(Scale-1.0))  z.z+=Offset.z*(Scale-1.0);
		n++;
	}
  vec3 d = abs(z) - vec3(1.0);
  float de = length(max(d,0.0)) + min(max(d.x,max(d.y,d.z)),0.0);
  return forwardD(T, de * pow(Scale, float(-n)));
}

Surface MengerSponge(Scene_HIT tag, Transform T, Ray V, int depth)
{
  Scene_DE DE = Scene_DE(0);
  float de = MengerSponge(DE, T, V, depth);
  const float epsilon = 1.0e-3; // FIXME
#define M(p) MengerSponge(DE, T, Ray((p), V.direction, V.wavelength, V.index), depth)
  vec3 normal = DELTANORMAL(M, epsilon, V.origin);
#undef M
  // surface
  return Surface(V.origin, normal, de);
}

float Mandelbulb(Scene_DE tag, Transform T, Ray V, int Power, int depth)
{
  vec3 pos = backwardP(T, V.origin);
	vec3 z = pos;
	const float Bailout = 25.0;
	float dr=1.0;
	float r=length(z);
  int n = 0;
  while (n < depth && r < Bailout) {
// This is a power function taken from the implementation by Enforcer:
// http://www.fractalforums.com/mandelbulb-implementation/realtime-renderingoptimisations/
//
// I cannot follow its derivation from spherical coordinates,
// but it does give a nice mandelbrot like object for Power=2
//	z=abs(z);
//void powN2(inout vec3 z, float zr0, inout float dr, float Power) {
	float zr0 = r;
	float zo0 = asin( z.z/zr0 );
	float zi0 = atan( z.y,z.x );
	float zr = pow( zr0, Power-1.0 );
	float zo = zo0 * Power;
	float zi = zi0 * Power;
	// mermelada's tweak
	// http://www.fractalforums.com/new-theories-and-research/error-estimation-of-distance-estimators/msg102670/?topicseen#msg102670
	const float DerivativeBias = 1.0;
	dr = max(dr*DerivativeBias,zr*dr*Power + 1.0);
	zr *= zr0;
	z  = zr*vec3( cos(zo)*cos(zi), cos(zo)*sin(zi), sin(zo) );
//}
	z += pos;
	r = length(z);
		n++;
	}
	float de = 0.5*log(r)*r/dr;
  return forwardD(T, de);
}

Surface Mandelbulb(Scene_HIT tag, Transform T, Ray V, int power, int depth)
{
  Scene_DE DE = Scene_DE(0);
  float de = Mandelbulb(DE, T, V, power, depth);
  const float epsilon = 1.0e-5; // FIXME
#define M(p) Mandelbulb(DE, T, Ray((p), V.direction, V.wavelength, V.index), power, depth)
  vec3 normal = DELTANORMAL(M, epsilon, V.origin);
#undef M
  // surface
  return Surface(V.origin, normal, de);
}

#undef DELTANORMAL
