#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2017,2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
// Created: Thu Feb 2 00:26:31 2017
// <http://www.fractalforums.com/images-showcase-(rate-my-fractal)/fruity-(inflection-mapping)/>
#info 2D quadratic Mandelbrot set inflection mapping example 1

#include "TwoD.frag"

const vec2 cs[8] = vec2[8]
  ( vec2(-1.5, 0.0)
  , vec2(-2.0, 0.0)
  , vec2(-1.5, 0.0)
  , vec2(-2.0, 0.0)
  , vec2(-1.5, 0.0)
  , vec2(-2.0, 0.0)
  , vec2(-1.5, 0.0)
  , vec2(-2.0, 0.0)
  );

vec3 color(vec2 c0, vec2 dx, vec2 dy)
{
  float px = length(vec4(dx, dy));
  Dual1cf c = dual1cf(complexf(c0));
  c.d[0] = complexf(px);
  for (int i = 8-1; i >= 0; --i)
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
CompensatedHack = 1
Compensated2IEEEAdd = true
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Zoom = 1
ZoomFactor = 0
CenterX = -2,0,0,0
CenterY = 0,0,0,0
Center = -2,0
Jitter = 1
Samples = 1
Shutter = 0.01
Exposure = 0
ShowHotPixels = false
#endpreset
