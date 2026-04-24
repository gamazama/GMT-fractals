#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D cubic rational Julia/Mandelbrot with 4 parameters on Riemann sphere

#include "TwoD.frag"

#group Cubic

uniform vec2 C1; slider[(-4,-4),(-1.754,0),(4,4)]
uniform vec2 C2; slider[(-4,-4),(-0.122,0.75),(4,4)]
uniform vec2 C3; slider[(-4,-4),(-1,0),(4,4)]
uniform vec2 C4; slider[(-4,-4),(-0.50434017544624399,0.56276576145298196),(4,4)]

uniform int P1; slider[1,3,100]
uniform int P2; slider[1,3,100]
uniform int P3; slider[1,2,100]
uniform int P4; slider[1,3,100]
int Period[4] = int[4](P1, P2, P3, P4);

uniform vec4 HueCenter; slider[(0,0,0,0),(0.00,0.25,0.50,0.75),(1,1,1,1)]
uniform vec4 HueSpread; slider[(0,0,0,0),(0.01,0.01,0.01,0.01),(1,1,1,1)]

uniform vec4 ValCenter; slider[(0,0,0,0),(1.00,1.00,1.00,1.00),(1,1,1,1)]
uniform vec4 ValSpread; slider[(0,0,0,0),(0.10,0.10,0.10,0.10),(1,1,1,1)]

// http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

#group Julia

uniform int Iterations; slider[1,100,10000]

// 0: Julia, 1-4: C-planes
uniform int Mode; slider[0,0,4]

uniform int APeriod; slider[1,10,100]
uniform int BPeriod; slider[1,10,100]

#group Colour

uniform float AHueCenter; slider[0,0.00,1]
uniform float AHueSpread; slider[0,0.25,1]
uniform float AValCenter; slider[0,1.00,1]
uniform float AValSpread; slider[0,1.00,1]

uniform float BHueCenter; slider[0,0.50,1]
uniform float BHueSpread; slider[0,0.25,1]
uniform float BValCenter; slider[0,1.00,1]
uniform float BValSpread; slider[0,1.00,1]

Complexf F(Complexf z, Complexf a, Complexf b, Complexf c, Complexf d)
{
  return proj(div(add(sub(mul(sqr(z), z), mul(3.0, mul(a, z))), b),
   add(sub(mul(d, mul(sqr(z), z)), mul(3.0, mul(c, sqr(z)))), complexf(1.0))));
}

float D(Complexf a, Complexf b)
{
  Complexf x1 = sub(a, b);
  Complexf x2 = sub(inv(a), inv(b));
  float d1 = norm(x1);
  float d2 = norm(x2);
  if (isnan(d1)) d1 = 1.0 / 0.0;
  if (isnan(d2)) d2 = 1.0 / 0.0;
  return min(d1, d2);
}

vec3 color(vec2 q, vec2 dx, vec2 dy)
{
  Complexf p = complexf(q);
  if (false)
  {
    Complexf zero = complexf(-1.0, 0.0);
    Complexf one = complexf(0.0, 0.0);
    Complexf infinity = complexf(1.0, 0.0);
    Complexf ma = mul(infinity, sub(zero, one));
    Complexf mb = mul(zero, sub(one, infinity));
    Complexf mc = sub(zero, one);
    Complexf md = sub(one, infinity);
    float t = 2.0 * float(M_PI) * Time / 4.0;
    float c = cos(t);
    float s = sin(t);
    p = mul(complexf(0.0, 1.0), p);
    p = div(add(mul(ma, p), mb), add(mul(mc, p), md));
    p = mul(complexf(c, s), p);
    p = div(add(mul(md, p), neg(mc)), add(mul(neg(mb), p), ma));
  }
  else
  {
    p = mul(p, float(M_PI) / 2.0);
    vec3 r = vec3(cos(p.x) * cos(p.y), sin(p.x) * cos(p.y), sin(p.y));
    float t = 2.0 * float(M_PI) * Time / 4.0;
    float c = cos(t);
    float s = sin(t);
    Complexf w = complexf(r.xz);
    w = mul(complexf(c, s), w);
    r.x = w.x;
    r.z = w.y;
    p = div(complexf(r.xy), (1.0 - r.z));
  }

  Complexf z = Mode == 0 ? p : complexf(0.0);
  Complexf C1p = Mode == 1 ? p : complexf(C1);
  Complexf C2p = Mode == 2 ? p : complexf(C2);
  Complexf C3p = Mode == 3 ? p : complexf(C3);
  Complexf C4p = Mode == 4 ? p : complexf(C4);

Complexf A4 = div(add(C1p, C2p), -18.0);
Complexf A2 = sqrt(A4);
Complexf A = sqrt(A2);
Complexf B = div(add(add(mul(9.0, A4), C2p), mul(3.0, A2)), mul(-3.0, A));

Complexf A4a = div(add(C3p, C4p), -18.0);
Complexf A2a = sqrt(A4a);
Complexf Aa = sqrt(A2a);
Complexf Ba = div(add(add(mul(9.0, A4a), C3p), mul(3.0, A2a)), mul(-3.0, Aa));

  Complexf a0[4] = Complexf[4](A, neg(A), Aa, neg(Aa));
  Complexf a[4] = a0;
  int ai[4] = int[4](-1, -1, -1, -1);
  float af[4] = float[4](0.0, 0.0, 0.0, 0.0);
  float amin[4] = float[4](1.0 / 0.0, 1.0 / 0.0, 1.0 / 0.0, 1.0 / 0.0);
  vec4 c = vec4(0.0);
  for (int i = 0; i < Iterations; ++i)
  {
    if (Mode == 0) z = F(z, A2, B, A2a, Ba);
    for (int q = 0; q < 4; ++q)
    {
      a[q] = F(a[q], A2, B, A2a, Ba);
      if (Mode != 0)
      {
        float d = D(a[q], a0[q]);
        if (d < amin[q])
        {
          ai[q] = i;
          af[q] = amin[q] < 1.0 / 0.0 ? d / amin[q] : 1.0;
          amin[q] = d;
          float h = mix(HueCenter[q], (float(ai[q] % Period[q]) + 0.5) / float(Period[q]) - 0.5, HueSpread[q]);
          float s = af[q];
          float v = 1.0 - af[q] * af[q];
          c += vec4(hsv2rgb(vec3(h, s, v)), 1.0);
        }
      }
    }
  }
  if (Mode == 0)
  {
    for (int q = 0; q < 4; ++q)
    {
      Complexf w = z;
      for (int i = 0; i < Period[q]; ++i)
      {
        w = F(w, A2, B, A2a, Ba);
        float d = D(w, a[q]);
        if (d < amin[q])
        {
          ai[q] = i;
          amin[q] = d;
        }
      }
    }
  }
  if (Mode == 0)
  {
    vec3 c0 = vec3(0.0);
    float cmin = 1.0 / 0.0;
    for (int q = 0; q < 4; ++q)
    {
      float h = mix(HueCenter[q], (float(ai[q] % Period[q]) + 0.5) / float(Period[q]) - 0.5, HueSpread[q]);
      float v = mix(ValCenter[q], (float(ai[q] % Period[q]) + 0.5) / float(Period[q]), ValSpread[q]);
      h -= floor(h);
      vec3 c1 = hsv2rgb(vec3(h, 1.0, 1.0));
      c1 = v * c1 / dot(c1, vec3(0.2126, 0.7152, 0.0722));
      if (amin[q] < cmin)
      {
        c0 = c1;
        cmin = amin[q];
      }
    }
    return c0;
  }
  else
  {
    return c.rgb / 16.0;
  }
}
