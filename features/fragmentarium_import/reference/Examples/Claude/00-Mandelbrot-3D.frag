#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Inflated Mandelbrot set with atom domain bubbles


/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#include "Raymond.frag"

#group Mandelbrot
// maximum period for atoms and domains
uniform int Period; slider[1,1,128]
// minimum size of atoms and domains
uniform float MinSize; slider[-24,-10,1];
// maximum iteration count for exterior
uniform int Iterations; slider[1,1,1000];
// thickness of exterior fringe
uniform float Thickness; slider[-24,-10,1];

vec3 film(Random PRNG, float wavelength, float intensity) {
  return xyz2rgb(observer(wavelength) * intensity);
}

float screen(vec4 tex, float wavelength)
{
  return CRT(sRGB2linear(tex.rgb), wavelength);
}

vec4 light(Random PRNG, vec3 from, vec3 dir)
{
  return vec4(0.0);
}

// Mandelbrot numerics

// https://mathr.co.uk/blog/2018-11-17_newtons_method_for_periodic_points.html
Complexf Mandelbrot_nucleus(Complexf c0, int period)
{
  Complexf c = c0;
  Dual1cf cv = dual1cf(c, 0);
  for (int j = 0; j < 16; ++j)
  {
    Dual1cf G = dual1cf(complexf(1.0));
    Dual1cf z = dual1cf(complexf(0.0));
    c0 = c;
    for (int l = 1; l <= period; ++l)
    {
      z = add(sqr(z), cv);
      if (l < period && period % l == 0)
        G = mul(z, G);
    }
    G = div(z, G);
    c = sub(c0, div(G.x, G.d[0]));
    if (! (c != c0)) break;
  }
  return c;
}

// https://mathr.co.uk/blog/2016-12-24_deriving_the_size_estimate.html
Complexf Mandelbrot_size(Complexf c, int period)
{
  Complexf l = complexf(1.0, 0.0);
  Complexf b = complexf(1.0, 0.0);
  Complexf z = complexf(0.0, 0.0);
  for (int i = 1; i < period; ++i)
  {
    z = add(sqr(z), c);
    l = mul(2.0, mul(z, l));
    b = add(b, inv(l));
  }
  return inv(mul(b, sqr(l)));
}

// https://mathr.co.uk/blog/2013-04-01_interior_coordinates_in_the_mandelbrot_set.html
// https://mathr.co.uk/blog/2015-01-26_newtons_method_for_misiurewicz_points.html
Dual1cf Mandelbrot_attractor(Complexf c, Complexf z_initial, int period)
{
  Dual1cf z = dual1cf(z_initial, 0);
  Complexf dz = complexf(0.0);
  for (int j = 0; j < 16; ++j)
  {
    Dual1cf z0 = z;
    Dual1cf G = dual1cf(complexf(1.0));
    for (int l = 1; l <= period; ++l)
    {
      z = add(sqr(z), dual1cf(c));
      if (l < period && period % l == 0)
        G = mul(sub(z, z0), G);
    }
    dz = z.d[0];
    G = div(sub(z, z0), G);
    z = dual1cf(sub(z0.x, div(G.x, G.d[0])));
  }
  z.d[0] = dz;
  return z;
}

// trace ray from a nucleus, more stable than trying to do it one jump
Dual1cf Mandelbrot_attractor_ray(Complexf nucleus, Complexf target, int period)
{
  const int steps = 16;
  Dual1cf P = dual1cf(complexf(0.0));
  for (int ray = 1; ray <= steps; ++ray)
  {
    float t = float(ray) / float(steps);
    P = Mandelbrot_attractor(complexf(mix(vec(nucleus), vec(target), t)), P.x, period);
  }
  return P;
}

// https://mathr.co.uk/blog/2013-12-10_atom_domain_size_estimation.html
float Mandelbrot_domain_size(Complexf c, int p)
{
  Dual1cf z = dual1cf(c, 0);
  float abszq = length(z.x);
  for (int q = 2; q <= p; ++q) {
    z = add(sqr(z), dual1cf(c, 0));
    float abszp = length(z.x);
    if (abszp < abszq && q < p) {
      abszq = abszp;
    }
  }
  return abszq / length(z.d[0]);
}

// main DE function

vec3 Mandelbrot(vec3 object, float bg)
{
  // FIXME should be able to take uniforms as arguments
  int maxPeriod = Period;
  float minSize = pow(2.0, MinSize);
  int maxIters = Iterations;
  float thickness = pow(2.0, Thickness);
  // no transformations supported
  Complexf c = complexf(object.xy);
  Complexf z = complexf(0.0, 0.0);
  // derivative for exterior distance
  Complexf dc = complexf(0.0, 0.0);
  // minimums for atom domains
  Complexf mz = complexf(0.0, 0.0);
  float mr2 = 1.0 / 0.0;
  // calculate 3x (DE,material,bubblethicknessfactor) for CSG operations
  vec3 back = vec3(bg, 0.0, 0.0);
  if (bg < 0.0)
    return back;
  vec3 far = vec3(1.0/0.0, 1.0, 0.0);
  vec3 de_nucleus  = far;
  vec3 de_domain   = far;
  vec3 de_exterior = far;
  int escaped = 0;
  int period = 1;
  for (; period <= maxPeriod; ++period)
  {
    dc = add(mul(2.0, mul(z, dc)), complexf(1.0, 0.0));
    z = add(sqr(z), c);
    float r2 = norm(z);
    if (r2 < 1.5 * mr2)
    {
      Complexf nucleus = Mandelbrot_nucleus(c, period);
      if (period > 1)
      {
        Complexf atom = div(z, mz);
        float S = Mandelbrot_domain_size(nucleus, period);
        if (S > minSize)
        {
          // make a DE-traceable shell out of two surfaces inside each other
          float a = length(vec3(vec(atom), object.z / S));
          vec3 d1 = vec3( (a - 1.01) * S, 3.0, clamp(object.z / S + 1.0, 0.01, 1.99));
          vec3 d2 = vec3(-(a - 0.99) * S, 4.0, 0.0);
          float d = max(d1.x, d2.x);
          if (d < de_domain.x) de_domain = d1.x > d2.x ? d1 : d2;
        }
      }
      if (true)
      {
        Complexf atom = Mandelbrot_attractor_ray(nucleus, c, period).d[0];
        float S = 0.5 * length(Mandelbrot_size(nucleus, period));
        if (S > minSize)
        {
          float d = (length(vec3(vec(atom), object.z / S)) - 1.0) * S;
          if (d < de_nucleus.x) de_nucleus = vec3(d, 2.0, 0.0);
        }
      }
      if (r2 < mr2)
      {
        mz = z;
        mr2 = r2;
      }
      if (de_nucleus.x < 0.0)
      {
        escaped = -1;
        break;
      }
    }
    if (r2 > 65536.0)
    {
      escaped = 1;
      break;
    }
  }
  if (escaped == 0)
  {
    for (; period <= maxIters; ++period)
    {
      dc = add(mul(2.0, mul(z, dc)), complexf(1.0, 0.0));
      z = add(sqr(z), c);
      float r2 = norm(z);
      if (r2 > 65536.0)
      {
        escaped = 1;
        break;
      }
    }
  }
  if (escaped == 1)
  {
    float d = length(z) * log(length(z)) / length(dc);
    d = length(vec2(d, object.z)) - thickness;
    if (d < de_exterior.x) de_exterior = vec3(d, 1.0, 0.0);
  }
  // disjoint union(b, a - b) = union(b, intersection(a, invert(b)))
  // this hopefully fixes unsightly issues at atom/domain intersections
  if (isnan(de_exterior.x)) de_exterior = back;
  if (isnan(de_nucleus.x)) de_nucleus = back;
  if (isnan(de_domain.x)) de_domain = back;
  vec3 solid  = de_exterior.x < de_nucleus.x ? de_exterior : de_nucleus;
  vec3 bubble = -solid.x > de_domain.x ? vec3(-solid.x, solid.y, solid.z) : de_domain;
  vec3 mandel = solid.x < bubble.x ? solid : bubble;
  vec3 result = mandel.x < back.x ? mandel : back;
  return result;
}

// delta normal calculation

#define DELTANORMAL(DE,E,p) normalize(vec3 \
  ( DE(p + vec3(E,0.0,0.0)) - DE(p - vec3(E,0.0,0.0)) \
  , DE(p + vec3(0.0,E,0.0)) - DE(p - vec3(0.0,E,0.0)) \
  , DE(p + vec3(0.0,0.0,E)) - DE(p - vec3(0.0,0.0,E)) \
  ))

// main entry points

Hit scene(Scene_HIT tag, Random PRNG, Ray V)
{
//  return Union(Light(Sphere(tag, Identity(), V), V, 1.0), SkyBox(tag, Identity(), V));
  Scene_DE DE;
  vec3 object = V.origin;
  Transform T = Identity();
  float bg = SkyBox(DE, T, V);
  vec3 de = Mandelbrot(object, bg);
  if (! (de.y > 0.0)) return SkyBox(tag, T, V);
  const float epsilon = 1.0e-3; // FIXME
#define M(p) Mandelbrot(p, SkyBox(DE, T, Ray((p), V.direction, V.wavelength, V.index))).x
  vec3 normal = DELTANORMAL(M, epsilon, object);
  // surface
  Surface S;
  S.position = object;
  S.normal = normal;
  S.de = de.x;
  vec2 water = Water_nk(V.wavelength);
  // FIXME the magic numbers to chose materials from DE are annoyment
  if (de.y == 1.0) return Light(S, V, 10.0);
  if (de.y == 2.0) return Glass(PRNG, S, V);
  if (de.y == 3.0) return SoapBubble(PRNG, S, V, 1000.0 * de.z, water);
  if (de.y == 4.0) return Transmit(S, V);
  return SkyBox(tag, T, V);
}

#if 1

// fast
float scene(Scene_DE tag, Random PRNG, Ray V)
{
  return Mandelbrot(V.origin, SkyBox(tag, Identity(), V)).x;
}

#else

// slow
float scene(Scene_DE tag, Random PRNG, Ray V)
{
  Scene_HIT HIT;
  return scene(HIT, PRNG, V).surface.de;
}

#endif

#preset Default
Exposure = 1
TrigIter = 5
TrigLimit = 1.1
FOV = 0.8
Eye = -1.5,-2,-1
Target = -0.75,0,0
Up = 0,0,1
Steps = 100
Depth = 3
MinDist = -16
Acne = -12
Aperture = 0.01,0.01
Size = 35
Wavelengths = 300,780
Background = Berlin.equi.jpg
Distance = 100
Period = 2
MinSize = -10
Iterations = 100
Thickness = -10
SampleLights = false
#endpreset

#preset Hifi
FOV = 1
Eye = -1.5,-2,-1
Target = -0.75,0,0
Up = 0,0,1
Exposure = 1
TrigIter = 5
TrigLimit = 1.1
DebugDepth = false
DebugNormal = true
DebugBounce = false
Background = Berlin.equi.jpg
Distance = 100
Steps = 100
Depth = 10
MinDist = -16
Acne = -12
Aperture = 0.01,0.01
Size = 35
Wavelengths = 300,780
Period = 12
MinSize = -10
Iterations = 100
Thickness = -10
SampleLights = false
#endpreset

#preset Card
TrigIter = 5
TrigLimit = 1.10000000000000009
Exposure = 1
FOV = 1
Eye = -1.5,-2,-1
Target = -0.75,0,0
Up = 0,0,1
DebugDepth = false
DebugNormal = false
DebugBounce = false
Background = Grid.equi.png Locked
Distance = 100
Steps = 100
Depth = 3
MinDist = -16
Acne = -12
Aperture = 0.01,0.021
Size = 35
Wavelengths = 300,780
Period = 2
MinSize = -10
Iterations = 100
Thickness = -10
SampleLights = false
#endpreset
