#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2019,2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
// Created: Tue May 21 17:19:29 2019
#info 2D quadratic rational Julia/Mandelbrot with edge detection

#include "TwoD.frag"

#group Variations

void formula(Complexf c, inout Complexf z)
{
  Complexf a = complexf(3.0, 3.0);
  z = add(div(add(sqr(z), a), add(sqr(z), complexf(1.0, 0.0))), c);
}

// Number of iterations
uniform int  Iterations; slider[1,200,10000]
uniform bool Julia; checkbox[false]
uniform vec2 C; slider[(-4,-4),(0,0),(4,4)]

// http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

ivec3 color1(vec2 c0, vec2 c1) {
  Complexf c = complexf(Julia ? c1 : c0);
  Complexf z = complexf(Julia ? c0 : vec2(0.0, 0.0));
  float m = 1.0 / 0.0;
  int n = 0;
  for (int i = 1; i <= Iterations; ++i) {
    formula(c, z);
    float z2 = norm(z);
    if (isnan(z2)) break;
    if (isinf(z2)) break;
    if (z2 < m) { m = z2; n = i; }
  }
  return ivec3(n);
}

vec3 color(vec2 c0, vec2 x, vec2 y)
{
  x *= 0.25;
  y *= 0.25;
  vec2 c1 = C;
  vec2 c[4] = vec2[4](c0 - x - y, c0 - x + y, c0 + x - y, c0 + x + y);
  ivec3 e[4] = ivec3[4](color1(c[0], c1), color1(c[1], c1), color1(c[2], c1), color1(c[3], c1));
  bool edge = ! (e[0] == e[1] && e[0] == e[2] && e[0] == e[3]);
  float hue = float(e[0].x) / float(5.6789);
  hue -= floor(hue);
  return edge ? vec3(0.0) : hsv2rgb(vec3(hue, 0.3, 1.0));
}


#preset Default
Center = -1.7,-1.5
Zoom = 0.2
Iterations = 200
Julia = false
C = 0,0
#endpreset
