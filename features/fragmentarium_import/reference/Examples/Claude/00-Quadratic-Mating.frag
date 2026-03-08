#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D mating of quadratic Julia sets

#include "TwoD.frag"

// http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

#group Julia

uniform int Iterations; slider[1,100,10000]

// 0: Julia, 1: A-plane, 2: B-plane
uniform int Mode; slider[0,0,2]

uniform int APeriod; slider[1,10,100]
uniform int BPeriod; slider[1,10,100]

// function: z to (z^2 + a) / (z^2 + b)
uniform vec2 A; slider[(-50,-50),(0,0),(50,50)]
uniform vec2 B; slider[(-50,-50),(0,0),(50,50)]

#group Colour

uniform float AHueCenter; slider[0,0.00,1]
uniform float AHueSpread; slider[0,0.25,1]
uniform float AValCenter; slider[0,1.00,1]
uniform float AValSpread; slider[0,1.00,1]

uniform float BHueCenter; slider[0,0.50,1]
uniform float BHueSpread; slider[0,0.25,1]
uniform float BValCenter; slider[0,1.00,1]
uniform float BValSpread; slider[0,1.00,1]

Complexf F(Complexf z, Complexf a, Complexf b)
{
  Complexf one = complexf(1.0, 0.0);
  Complexf z2 = proj(sqr(z));
  Complexf w1 = div(add(z2, a), add(z2, b));
  Complexf w2 = div(add(one, div(a, z2)), add(one, div(b, z2)));
  if (norm(z2) <= 1.0)
    return proj(w1);
  if (norm(z2) >= 1.0)
    return proj(w2);
  return complexf(0.0, 0.0);
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
    r.xz = mat2(c, s, -s, c) * r.xz;
    p = complexf(r.xy / (1.0 - r.z));
  }
  Complexf one  = complexf(1.0, 0.0);
  Complexf zero = complexf(0.0, 0.0);
  Complexf inf  = complexf(1.0 / 0.0, 0.0);
  Complexf z = Mode == 0 ? p : zero;
  Complexf a = Mode == 1 ? p : complexf(A);
  Complexf b = Mode == 2 ? p : complexf(B);
  int ai = -1;
  int bi = -1;
  float af = 0.0;
  float bf = 0.0;
  float amin = 1.0 / 0.0;
  float bmin = 1.0 / 0.0;
  vec4 c = vec4(0.0);
  for (int i = 0; i < Iterations; ++i)
  {
    if (Mode == 0) z = F(z, a, b);
    zero = F(zero, a, b);
    inf = F(inf, a, b);
    if (Mode != 0)
    {
      float d = D(zero, complexf(0.0, 0.0));
      if (d < amin)
      {
        ai = i;
        af = amin < 1.0 / 0.0 ? d / amin : 1.0;
        amin = d;
        float h = mix(AHueCenter, (float(ai % APeriod) + 0.5) / float(APeriod) - 0.5, AHueSpread);
        float s = af;
        float v = 1.0 - af * af;
        c += vec4(hsv2rgb(vec3(h, s, v)), 1.0);
      }
    }
    if (Mode != 0)
    {
      float d = D(inf, complexf(1.0 / 0.0, 0.0));
      if (d < bmin)
      {
        bi = i;
        bf = bmin < 1.0 / 0.0 ? d / bmin : 1.0;
        bmin = d;
        float h = mix(BHueCenter, (float(bi % BPeriod) + 0.5) / float(BPeriod) - 0.5, BHueSpread);
        float s = bf;
        float v = 1.0 - bf * bf;
        c += vec4(hsv2rgb(vec3(h, s, v)), 1.0);
      }
    }
  }
  if (Mode == 0)
  {
    Complexf w = z;
    for (int i = 0; i < APeriod; ++i)
    {
      w = F(w, a, b);
      float d = D(w, zero);
      if (d < amin)
      {
        ai = i;
        amin = d;
      }
    }
  }
  if (Mode == 0)
  {
    Complexf w = z;
    for (int i = 0; i < BPeriod; ++i)
    {
      w = F(w, a, b);
      float d = D(w, inf);
      if (d < bmin)
      {
        bi = i;
        bmin = d;
      }
    }
  }
  if (Mode == 0)
  {
    float h0 = mix(AHueCenter, (float(ai % APeriod) + 0.5) / float(APeriod) - 0.5, AHueSpread);
    float h1 = mix(BHueCenter, (float(bi % BPeriod) + 0.5) / float(BPeriod) - 0.5, BHueSpread);
    float v0 = mix(AValCenter, (float(ai % APeriod) + 0.5) / float(APeriod), AValSpread);
    float v1 = mix(BValCenter, (float(bi % BPeriod) + 0.5) / float(BPeriod), BValSpread);
    h0 -= floor(h0);
    h1 -= floor(h1);
    vec3 c0 = hsv2rgb(vec3(h0, 1.0, 1.0));
    c0 = v0 * c0 / dot(c0, vec3(0.2126, 0.7152, 0.0722));
    vec3 c1 = hsv2rgb(vec3(h1, 1.0, 1.0));
    c1 = v1 * c1 / dot(c1, vec3(0.2126, 0.7152, 0.0722));
    return mix(c0, c1, amin < bmin ? amin / bmin * 0.5 : bmin > amin ? 1.0 - bmin / amin * 0.5 : 0.5);
  }
  else
  {
    return c.rgb / 16.0;
  }
}

#preset Default
Zoom = 1
Center = 0,0
Iterations = 100
A = 0.060466479382643608,-0.351665081411541403
B = 0.126851826507568627,0.698655823902703865
APeriod = 5
BPeriod = 3
Exposure = -0.3227904
AHueCenter = 0.86206897
AHueSpread = 0.05
AValCenter = 0
AValSpread = 0.12
BHueCenter = 0.10727969
BHueSpread = 0.05
BValCenter = 1
BValSpread = 0.60800001
#endpreset
