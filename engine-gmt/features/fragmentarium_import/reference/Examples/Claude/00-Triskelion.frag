#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2019,2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Pauldelbrot's Triskelion extended to "dial-a-Julia" (failed attempt)

#include "TwoD.frag"

#group Triskelion

// Iteration count
uniform int Iterations; slider[1,100,10000]

// Points in quadratic Mandelbrot set frame of reference
uniform vec2 A; slider[(-2,-2),(0,0),(2,2)]
uniform vec2 B; slider[(-2,-2),(0,0),(2,2)]
uniform vec2 C; slider[(-2,-2),(0,0),(2,2)]

Complexf W0 = complexf( 1.0,  0.0);
Complexf W1 = complexf(-0.5,  0.5 * sqrt(3.0));
Complexf W2 = complexf(-0.5, -0.5 * sqrt(3.0));

Complexf S = complexf(1.0, 0.0);

Complexf a = add(mul(2.0, S), sub(complexf(1.0, 0.0), sqrt(sub(complexf(1.0, 0.0), complexf(4.0 * A)))));
Complexf b = add(mul(2.0, S), sub(complexf(1.0, 0.0), sqrt(sub(complexf(1.0, 0.0), complexf(4.0 * B)))));
Complexf c = add(mul(2.0, S), sub(complexf(1.0, 0.0), sqrt(sub(complexf(1.0, 0.0), complexf(4.0 * C)))));

Dual1cf h(Dual1cf z) { return add(add(sqr(z), z), dual1cf(complexf(1.0, 0.0))); }
Dual1cf g(Dual1cf z) { return mul(z, add(add(div(h(z), a), mul(W1, div(h(mul(W2, z)), b))), mul(W2, div(h(mul(W1, z)), c)))); }
Dual1cf f(Dual1cf z) { return add(div(S, sqr(z)), div(sub(mul(z, sqr(z)), dual1cf(complexf(1.0, 0.0))), g(z))); }

vec3 color(vec2 p, vec2 dx, vec2 dy)
{
  Dual1cf z = dual1cf(complexf(p)); z.d[0] = complexf(length(vec4(dx, dy)));
  vec3 t = vec3(10000.0);
  for (int i = 0; i < Iterations; ++i)
  {
    z = f(z);
    t = min(t, vec3
      ( length(sub(z.x, W0)) / length(z.d[0])
      , length(sub(z.x, W1)) / length(z.d[0])
      , length(sub(z.x, W2)) / length(z.d[0])
      ));
  }
  return vec3(max(max(t.x, t.y), t.z));
}

#preset Default
Center = 0,0
Zoom = 1
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Iterations = 4000
A = 0,0.6494346
B = 0.30048468,-0.01615508
C = -0.77022652,0.09061492
#endpreset
