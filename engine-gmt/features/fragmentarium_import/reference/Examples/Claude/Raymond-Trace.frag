#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#group Raytrace

// Number of steps to march along each ray.
uniform int Steps; slider[0,100,1000]

// Maximum number of surface intersections per pixel.
uniform int Depth; slider[0,10,100]

// Stop tracing rays at this epsilon (in bits) to stop early.
uniform float MinDist; slider[-24.0,-16.0,8.0]

// Advance rays by this epsilon (in bits) to avoid repeated surface intersections.
uniform float Acne; slider[-24.0,-12.0,8.0]

// Trace towards lights from each surface.
uniform bool SampleLights; checkbox[true]

struct Raytrace
{
  int steps;
  int depth;
  float mindist;
  float acne;
  bool samplelights;
};

Raytrace raytrace_de_uniforms()
{
  Raytrace R;
  R.steps = Steps;
  R.depth = Depth;
  R.mindist = pow(2.0, MinDist);
  R.acne = pow(2.0, Acne);
  R.samplelights = SampleLights;
  return R;
}

Hit raytrace_de_1(Random PRNG, Ray V, Raytrace R, float s)
{
  Scene_DE DE = Scene_DE(0);
  int i = 0;
  float d = scene(DE, srand(PRNG, i), V);
  for (; i < R.steps; ++i)
  {
    d = scene(DE, srand(PRNG, i), V);
    V.origin += s * d * V.direction;
    //if (s * d < R.mindist) break;
  }
  Scene_HIT HIT = Scene_HIT(0);
  return scene(HIT, srand(PRNG, i), V);
}

float raytrace_de(Random PRNG, Ray V, Raytrace R, out Hit D)
{
  float I = 0.0;
  float f = 1.0;
  float s = 1.0;
  for (int i = 0; i < R.depth; ++i)
  {
    // trace to surface
    Hit h = raytrace_de_1(srand(PRNG, i), V, R, s);
    if (i == 0) D = h;
    f *= absorption(V.index.y, V.wavelength, distance(V.origin, h.ray.origin));
    if (R.samplelights)
    {
      // ignore lights from organic rays
      if (h.emit > 0.0)
      {
        if (i == 0)
        {
          I += f * h.emit;
          f *= h.factor;
        }
        break;
      }
      f *= h.factor;
      // trace from surface to lights
      Ray U = h.ray;
      vec4 L = light(srand(PRNG, i), U.origin, U.direction);
      if (L.w > 0.0)
      {
        U.direction = normalize(L.xyz);
        U.origin += R.acne * U.direction;
        Hit l = raytrace_de_1(srand(PRNG, i), U, R, s);
        if (l.emit > 0.0)
        {
          I += L.w * f * absorption(U.index.y, U.wavelength, distance(U.origin, l.ray.origin)) * l.emit;
        }
      }
      f *= (1.0 - L.w);
    }
    else
    {
      I += f * h.emit;
      f *= h.factor;
    }
    // bounce
    V = h.ray;
    V.origin += R.acne * V.direction;
    Scene_HIT HIT = Scene_HIT(0);
    Surface S = scene(HIT, srand(PRNG, i + 1), V).surface;
    float s2 = sign(S.de);
    float s3 = sign(dot(V.direction, S.normal));
    s = s2;
    if (! (f > 0)) break;
  }
  return I;
}
