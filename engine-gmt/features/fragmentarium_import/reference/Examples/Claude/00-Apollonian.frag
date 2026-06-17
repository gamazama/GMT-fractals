#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D escape time Apollonian gasket

#include "TwoD.frag"

#group Apollonian
// Iteration count
uniform int Iterations; slider[1,100,10000]

vec2 w[3] = vec2[3](vec2( 1.0, 0.0), vec2(-0.5,  sqrt(3.0) / 2.0), vec2(-0.5, -sqrt(3.0) / 2.0));
float R0 = 2.0 / sqrt(3.0);//sqrt(3.0) / 2.0 / (1.0 + sqrt(3.0) / 2.0);
vec2 A = R0 * w[0];
vec2 B = R0 * w[1];
vec2 C = R0 * w[2];
vec2 D = vec2(0.0);

vec3 H[4] = vec3[4](vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), vec3(0.0, 0.0, 0.0));

float R[4] = float[4](1.0, 1.0, 1.0, 0.1547);
vec2 P[4] = vec2[4](A, B, C, D);

Dual1cf invert(vec2 center, float radius, Dual1cf z)
{
  z = sub(z, dual1cf(complexf(center)));
  z = mul(z, complexf(radius * radius / norm(z.x)));
  z = add(z, dual1cf(complexf(center)));
  return z;
}

vec3 color(vec2 p0, vec2 dx, vec2 dy)
{
  Dual1cf z = dual1cf(complexf(p0));
  z.d[0] = complexf(1.0);
  vec4 c = vec4(1.0);
  for (int i = 0; i < Iterations; ++i)
  {
    float d0 = norm(z.d[0]);
    Dual1cf z1 = dual1cf(complexf(0.0));
    vec4 c1 = c;
    bool ok = false;
    for (int q = 0; q < 4; ++q)
    {
      Dual1cf w = invert(P[q], R[q], z);
      float dw = norm(w.d[0]);
      if (dw > d0)
      {
        z1 = w;
        d0 = dw;
        c1 = vec4(1.0);
        c1[q] = 0.0;
        ok = true;
      }
    }
    if (! ok) break;
    z = z1;
    c = mix(c, c1, 0.5);
    if (norm(z.x) >= 1.0 / 0.0) break;
  }
  return vec3(0.5) - (c.rgb - vec3(c.a));
}
