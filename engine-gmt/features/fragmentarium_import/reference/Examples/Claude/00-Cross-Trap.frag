#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D escape time Mandelbrot set with cross-shaped orbit trap

#include "TwoD.frag"
#include "EscapeTime.frag"

float sdRoundedX( in vec2 p, in float w, in float r )
{
    p = abs(p);
    return length(p-min(p.x+p.y,w)*0.5) - r;
}

float trap(Complexf z)
{
  float t = 2.0 * float(M_PI) * Time / 60.0;
  z = sub(z, complexf(0.75, 0.75));
  z = mul(z, complexf(cos(t), sin(t)));
  return 0.1 + sdRoundedX(vec2(z.x, z.y), 6.0, 0.1);
}

vec3 palette(float n)
{
  n /= 4.0;
  float r = cos(n);
  float g = cos(n + 2.0);
  float b = cos(n + 4.0);
  return sRGB2linear(vec3(r, g, b) * 0.5 + vec3(0.5));
}

vec3 palette(vec2 nde)
{
  return palette(nde.x) * pow(1.0 - nde.y, 4.0);//(1.0 - smoothstep(0.0, 0.1, clamp(abs(nde.y - 0.9), 0.0, 1.0)));
}

Complexf formula(Complexf z, Complexf c)
{
  return add(sqr(z), c);
}

Dual1cf formula(Dual1cf z, Dual1cf c)
{
  return add(sqr(z), c);
}
