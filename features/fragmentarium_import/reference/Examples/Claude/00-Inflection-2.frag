#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2017,2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
// <http://www.fractalforums.com/index.php?topic=25237.msg99697#msg99697>
#info 2D quadratic Mandelbrot set inflection mapping example 2

#include "TwoD.frag"

#define N 6
const vec2 cs[N] = vec2[N]
  ( vec2(-0.75, 0.1)
  , vec2(-0.7780062, 0.9591821)
  , vec2(-0.7186571, 1.0251421)
  , vec2(-0.5475953, 0.6401844)
  , vec2(-0.5129835, 0.6237739)
  , vec2(-0.4531227, 0.8943247)
  );

vec3 color(vec2 c0, vec2 dx, vec2 dy)
{
  float px = length(vec4(dx, dy));
  Dual1cf c = dual1cf(complexf(c0));
  c.d[0] = complexf(px);
  for (int i = N-1; i >= 0; --i)
  {
    Dual1cf f = dual1cf(complexf(cs[i]));
    Dual1cf d = sub(c, f);
    c = add(f, sqr(d));
  }
  int n = 0;
  Dual1cf z = dual1cf(complexf(0.0));
  for (n = 0; n < 1000; ++n)
  {
    if (! lt(norm(z.x), 65536.0))
      break;
    z = add(sqr(z), c);
  }
  if (lt(norm(z.x), 65536.0))
    return vec3(1.0, 0.0, 0.0);
  float r = length(z.x);
  float dr = length(z.d[0]);
  float de = 2.0 * r * log(r) / dr;
  float g = tanh(clamp(de, 0.0, 4.0));
  if (isnan(de) || isinf(de) || isnan(g) || isinf(g))
    g = 1.0;
  return vec3(g);
}

#preset Default
Center = -0.368737489,0.856368542
Zoom = 1
#endpreset
