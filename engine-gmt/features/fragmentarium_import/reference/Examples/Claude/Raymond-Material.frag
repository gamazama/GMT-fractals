#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

// CSG union: minimum by de

Hit Union(in Hit a)
{
  return a;
}

Hit Union(in Hit a, in Hit b)
{
  if (a.surface.de < b.surface.de) return a; else return b;
}

Hit Union(in Hit a, in Hit b, in Hit c)
{
  return Union(Union(a, b), c);
}

Hit Union(in Hit a, in Hit b, in Hit c, in Hit d)
{
  return Union(Union(Union(a, b), c), d);
}

Hit Union(in Hit a, in Hit b, in Hit c, in Hit d, in Hit e)
{
  return Union(Union(Union(Union(a, b), c), d), e);
}

Hit Union(in Hit a, in Hit b, in Hit c, in Hit d, in Hit e, in Hit f)
{
  return Union(Union(Union(Union(Union(a, b), c), d), e), f);
}

Hit Union(in Hit a, in Hit b, in Hit c, in Hit d, in Hit e, in Hit f, in Hit g)
{
  return Union(Union(Union(Union(Union(Union(a, b), c), d), e), f), g);
}

// CSG intersection: maximum by de

Hit Intersection(in Hit a, in Hit b)
{
  if (a.surface.de > b.surface.de) return a; else return b;
}

Hit Intersection(in Hit a, in Hit b, in Hit c)
{
  return Intersection(Intersection(a, b), c);
}

Hit Intersection(in Hit a, in Hit b, in Hit c, in Hit d)
{
  return Intersection(Intersection(Intersection(a, b), c), d);
}

Hit Intersection(in Hit a, in Hit b, in Hit c, in Hit d, in Hit e)
{
  return Intersection(Intersection(Intersection(Intersection(a, b), c), d), e);
}

Hit Intersection(in Hit a, in Hit b, in Hit c, in Hit d, in Hit e, in Hit f)
{
  return Intersection(Intersection(Intersection(Intersection(Intersection(a, b), c), d), e), f);
}

// virtual surface (transmits everything)

float Transmit(float S, Ray V)
{
  return S;
}

Hit Transmit(Surface S, Ray V)
{
  V.origin = S.position;
  Hit h;
  h.surface = S;
  h.ray = V;
  h.factor = 1.0;
  h.emit = 0.0;
  return h;
}

// opaque emissive material

float Light(float S, Ray V, float brightness)
{
  return S;
}

Hit Light(Surface S, Ray V, float brightness)
{
  V.origin = S.position;
  V.direction = vec3(0.0);
  Hit h;
  h.surface = S;
  h.ray = V;
  h.factor = 0.0;
  h.emit = brightness;//S.de < 1.0e-4 ? brightness : 0.0;
  return h;
}

// perfectly reflective material

float Mirror(float S, Ray V, float albedo)
{
  return S;
}

Hit Mirror(Surface S, Ray V, float albedo)
{
  V.origin = S.position;
  V.direction = reflect(V.direction, S.normal);
  return Hit(S, V, albedo, 0.0);
}

// opaque diffuse material

float Diffuse(Random PRNG, float S, Ray V, float albedo)
{
  return S;
}

Hit Diffuse(Random PRNG, Surface S, Ray V, float albedo)
{
  V.origin = S.position;
  V.direction = cosHemisphere(haltonDisc(PRNG), S.normal);
  Hit h;
  h.surface = S;
  h.ray = V;
  h.emit = 0.0;
  h.factor = albedo / pi;
  return h;
}

// opaque glossy material

float CookTorrance(vec3 I, vec3 O, vec3 N, float albedo, float shine, float roughness, float eta)
{
  float diffuse = albedo / pi;
  vec3 H = normalize(O + I); // half vector
  float a2 = roughness * roughness;
  // distribution term (microfacets)
  float D = 0.0;
  float HN = dot(H, N);
  if (HN > 0.0)
  {
    float HN2 = HN * HN;
    float den = HN2 * a2 + (1.0 - HN2);
    D = a2 / (pi * den * den);
  }
  // fresnel term (approximation)
  float e = (eta - 1.0) / (eta + 1.0);
  float F = mix(pow(1.0 - dot(H, O), 5.0), 1.0, e * e);
  // geometry term (self-occulusion)
  float G = 1.0;
  float IH = dot(I, H);
  float OH = dot(O, H);
  if ((dot(I, N) > 0.0) == (IH > 0.0)) G *= 2.0 / (1.0 + sqrt(1.0 + a2 * (1.0 - IH * IH) / (IH * IH)));
  if ((dot(O, N) > 0.0) == (OH > 0.0)) G *= 2.0 / (1.0 + sqrt(1.0 + a2 * (1.0 - OH * OH) / (OH * OH)));
  // combined
  float specular = D * F * G / (4.0 * dot(I, N) * dot(O, N));
  // surface
  return mix(diffuse, specular, shine);
}

float CookTorrance(Random PRNG, float S, Ray V, float albedo, float shine, float roughness, vec2 index)
{
  return S;
}

Hit CookTorrance(Random PRNG, Surface S, Ray I, float albedo, float shine, float roughness, vec2 index)
{
  Ray O = I;
  O.origin = S.position;
  O.direction = cosHemisphere(haltonDisc(PRNG), S.normal);
  float eta = I.index.x / index.x;
  Hit h;
  h.surface = S;
  h.ray = O;
  h.emit = 0.0;
  h.factor = CookTorrance(I.direction, O.direction, S.normal, albedo, shine, roughness, eta);
  return h;
}

// Fresnel equations

struct Fresnel { float Rs, Rp, Ts, Tp; };

Fresnel fresnel(vec3 incident, vec3 normal, float n1, float n2)
{
  float dotNI = dot(incident, normal);
  float eta = n1 / n2;
  float c1 = -dotNI;
  float c2 = 1.0 - (1.0 - c1 * c1) * (eta * eta);
  Fresnel f;
  if (c2 < 0.0)
  {
    // total internal reflection
    f.Rs = 1.0;
    f.Rp = 1.0;
    f.Ts = 0.0;
    f.Tp = 0.0;
  }
  else
  {
    c2 = sqrt(c2);
    float rs = (eta * c1 - c2) / (eta * c1 + c2);
    float rp = (eta * c2 - c1) / (eta * c2 + c1);
    float ts = 2.0 * eta * c1 / (eta * c1 + c2);
    float tp = 2.0 * eta * c1 / (eta * c2 + c1);
    f.Rs = rs * rs;
    f.Rp = rp * rp;
    f.Ts = ts * ts;
    f.Tp = tp * tp;
  }
  return f;
}

// refractive materials

float Transparent(Random PRNG, float S, Ray V, vec2 index)
{
  return S;
}

Hit Transparent(Random PRNG, Surface S, Ray V, vec2 index)
{
  V.origin = S.position;
  vec2 nk1 = V.index;
  vec2 nk2 = index;
  bool inside = false;
  if (dot(-V.direction, S.normal) < 0.0)
  {
    nk1 = nk2;
    nk2 = vec2(1.0, 0.0); // vacuum
    S = Invert(S);
    inside = true;
  }
  Fresnel F = fresnel(V.direction, S.normal, nk1.x, nk2.x);
  // FIXME polarization
  float R = 0.5 * (F.Rs + F.Rp);
  float T = 0.5 * (F.Ts + F.Tp);
  float RT = R + T;
  float hRT = halton1(PRNG);
  if (mix(0.0, RT, hRT) <= R)
  {
    V.direction = normalize(reflect(V.direction, S.normal));
    V.index = nk1;
  }
  else
  {
    V.direction = normalize(refract(V.direction, S.normal, nk1.x / nk2.x));
    V.index = nk2;
  }
  if (inside)
  {
    S = Invert(S);
  }
  Hit h;
  h.surface = S;
  h.ray = V;
  h.factor = 1.0;
  h.emit = 0.0;
  return h;
}

// thin film soap bubble

float SoapBubble(Random PRNG, float S, Ray V, float thickness, vec2 index)
{
  return S;
}

Hit SoapBubble(Random PRNG, Surface S, Ray V, float thickness, vec2 index)
{
  V.origin = S.position;
  vec2 nk_air = V.index;
  vec2 nk_film = index;
  bool inside = false;
  if (dot(-V.direction, S.normal) < 0.0)
  {
    S = Invert(S);
    inside = true;
  }
  vec3 refracted = normalize(refract(V.direction, S.normal, nk_air.x / nk_film.x));
  Fresnel F_in  = fresnel(V.direction, S.normal, nk_air.x, nk_film.x);
  Fresnel F_out = fresnel(refracted, S.normal, nk_film.x, nk_air.x);
  // FIXME polarization, absorption
  float T_in   = 0.5 * (F_in .Ts + F_in .Tp);
  float T_out  = 0.5 * (F_out.Ts + F_out.Tp);
  float R_in   = 0.5 * (F_in .Rs + F_in .Rp);
  float R_film = 0.5 * (F_out.Rs + F_out.Rp);
  float d = 2.0 * pi * thickness / V.wavelength / abs(dot(refracted, S.normal));
  vec2 D = vec2(cos(d), sin(d));
  vec2 D2 = vec(sqr(complexf(D)));
  vec2 one = vec2(1.0, 0.0);
  float T = length(div(complexf(T_in * T_out * D), complexf(one - R_film * R_film * D2)));
  float R = length(vec(div(complexf(T_in * T_out * R_film * D2), complexf(one - R_film * R_film * D2))) - vec2(R_in, 0.0));
  float hRT = halton1(PRNG) * (R + T);
  if (hRT < R)
  {
    V.direction = normalize(reflect(V.direction, S.normal));
  }
  // otherwise ray continues in same direction
  if (inside)
  {
    S = Invert(S);
  }
  Hit h;
  h.surface = S;
  h.ray = V;
  h.factor = 1.0;
  h.emit = 0.0;
  return h;
}

// reflective thin film

float ThinFilm(float S, Ray V, float thickness, float factor)
{
  return S;
}

Hit ThinFilm(Surface S, Ray V, float thickness, float factor)
{
  float t = 4.0 * pi * (-dot(V.direction, S.normal)) * thickness / V.wavelength;
  float f = 0.5 * length(vec2(cos(t) + 1.0, sin(t)));
  V.direction = reflect(V.direction, S.normal);
  Hit h;
  h.surface = S;
  h.ray = V;
  h.factor = factor * f;
  h.emit = 0.0;
  return h;
}

float Checkerboard(vec3 x, float a, float b)
{
  x -= floor(x);
  bool c = (x.x > 0.5) != (x.y > 0.5) != (x.z > 0.5);
  return c ? a : b;
}

Hit Checkerboard(vec3 x, Hit a, Hit b)
{
  x -= floor(x);
  bool c = (x.x > 0.5) != (x.y > 0.5) != (x.z > 0.5);
  return c ? a : b;
}

float absorption(float k, float nm, float dist)
{
  return exp(-4.0 * pi * k * dist / (1.0e-9 * nm));
}

float Glass(Random PRNG, float S, Ray V)
{
  return S;
}

Hit Glass(Random PRNG, Surface S, Ray V)
{
  return Transparent(PRNG, S, V, Glass_nk(V.wavelength));
}

float Quartz(Random PRNG, float S, Ray V)
{
  return S;
}

Hit Quartz(Random PRNG, Surface S, Ray V)
{
  return Transparent(PRNG, S, V, Quartz_nk(V.wavelength));
}

float Water(Random PRNG, float S, Ray V)
{
  return S;
}

Hit Water(Random PRNG, Surface S, Ray V)
{
  return Transparent(PRNG, S, V, Water_nk(V.wavelength));
}
