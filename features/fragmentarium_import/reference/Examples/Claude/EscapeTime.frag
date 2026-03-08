#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// define these

vec3 palette(float n);
vec3 palette(vec2 nde);

Complexf formula(Complexf z, Complexf c);
Dual1cf formula(Dual1cf z, Dual1cf c);
#if __VERSION__ >= 400
Complexd formula(Complexd z, Complexd c);
Dual1cd formula(Dual1cd z, Dual1cd c);
#endif

float trap(Complexf z);

#group EscapeTime

uniform int Iterations; slider[1,100,10000]
uniform float EscapeRadius; slider[1.0e-3,2.0,1.0e+3]
uniform bool Julia; checkbox[false]
uniform vec2 JuliaC; slider[(-4,-4),(0,0),(4,4)]
uniform vec2 Seed; slider[(-4,-4),(0,0),(4,4)]
uniform bool DistanceEstimate; checkbox[false]

bool escaped(Complexf z)
{
  return ! (norm(z) < EscapeRadius * EscapeRadius);
}

bool escaped(Dual1cf z)
{
  return ! (norm(z.x) < EscapeRadius * EscapeRadius);
}

float smoothing(Complexf z1, Complexf z)
{
  float r = length(z);
  float r1 = length(z1);
  return log(log(r)) / log(log(r) / log(r1));
}

vec2 escape(Complexf z, Complexf c)
{
  int tIter = 0;
  float tCoord = 0.0;
  float tTrap = 1.0/0.0;
  int n = 0;
  for (; n < Iterations; ++n)
  {
    Complexf z1 = z;
    z = formula(z, c);
    float t = trap(z);
    if (t < tTrap)
    {
      tIter = n;
      tCoord = t / tTrap;
      tTrap = t;
    }
    if (escaped(z))
    {
      return vec2(tIter, tCoord);
    }
  }
  return vec2(tIter, tCoord);
}

vec2 escape(Dual1cf z, Dual1cf c)
{
  int n = 0;
  for (; n < Iterations; ++n)
  {
    Dual1cf z1 = z;
    z = formula(z, c);
    if (escaped(z))
    {
      return vec2
        ( float(n) + 1.0 - smoothing(z1.x, z.x)
        , length(z.x) * log(length(z.x)) / (length(z.d[0]))
        );
    }
  }
  return vec2(n, 0.0);
}

vec3 color(vec2 p, vec2 dx, vec2 dy)
{
  if (DistanceEstimate)
  {
    float px = length(vec4(dx, dy));
    Dual1cf pv = dual1cf(complexf(p)); pv.d[0] = complexf(px);
    if (Julia)
    {
      return palette(escape(pv, dual1cf(complexf(JuliaC))));
    }
    else
    {
      return palette(escape(dual1cf(complexf(Seed)), pv));
    }
  }
  else
  {
    Complexf pc = complexf(p);
    if (Julia)
    {
      return palette(escape(pc, complexf(JuliaC)));
    }
    else
    {
      return palette(escape(complexf(Seed), pc));
    }
  }
}
