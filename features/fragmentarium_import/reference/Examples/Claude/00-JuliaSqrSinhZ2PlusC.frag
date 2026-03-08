#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Reconstruction/reverse engineering of the formula for an image on the forums

#include "TwoD.frag"

vec3 shade(int n)
{
   int r = 32*(n % 8);
   int g = 16*(n % 16);
   int b = 8*(n % 32);
   return sRGB2linear(vec3(r, g, b) / 255.0);
}

Complexf SQR(Complexf z)
{
  Complexf I = complexf(0.0, 1.0);
  if (abs(z.y) < z.x) return z;
  z = mul(I, z);
  if (abs(z.y) < z.x) return z;
  z = mul(I, z);
  if (abs(z.y) < z.x) return z;
  z = mul(I, z);
  if (abs(z.y) < z.x) return z;
  z = mul(I, z);
  return z;
}

Complexf formula(Complexf z, Complexf c)
{
  return add(SQR(sqrt(sinh(sqr(z)))), c);
}

int julia(vec2 p)
{
  Complexf c = complexf(0.065, 0.122);
  Complexf z = complexf(p);
  int n = 0;
  for (; n < 256; ++n)
  {
    z = formula(z, c);
    if (norm(z) > 36.0)
    {
      return n;
    }
  }
  return n;
}

vec3 color(vec2 q, vec2 dx, vec2 dy)
{
  return shade(julia(q));
}
