#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D Burning Ship coloured by angle of directional distance estimate

#include "TwoD.frag"

// http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

#group BurningShip

uniform int Iterations; slider[0,100,10000]
uniform float EscapeRadius; slider[2,16,1024] Logarithmic

float EscapeRadius2 = EscapeRadius * EscapeRadius;

vec2 cMul(vec2 a, vec2 b)
{
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 cConj(vec2 a)
{
  return vec2(a.x, -a.y);
}

vec2 cDiv(vec2 a, vec2 b)
{
  return cMul(a, cConj(b)) / dot(b, b);
}

float sgn(float a) { return float(a >= 0) - float(0 > a); }

vec2 cPow(vec2 a, int n)
{
  // assert(n >= 2);
  vec2 p = a;
  for (int m = 2; m <= n; ++m)
  {
    p = cMul(p, a);
  }
  return p;
}

vec2 de(vec2 c)
{
  int i = 0;
  float Cr = c.x;
  float Ci = c.y;
  float Xr = 0.0;
  float Xi = 0.0;
  float daa = 1.0;
  float dab = 0.0;
  float dba = 0.0;
  float dbb = 1.0;
  float dxa = 0.0;
  float dxb = 0.0;
  float dya = 0.0;
  float dyb = 0.0;
  for (; i < Iterations; ++i)
  {
    float Xr2 = Xr * Xr;
    float Xi2 = Xi * Xi;
    if (! (Xr2 + Xi2 < EscapeRadius2)) break;
    float Xrn = Xr2 - Xi2 + Cr;
    float Xin = abs(2.0 * Xr * Xi) + Ci;
    float Xxr = Xr;
    float Xxi = Xi;
    float dxan = ((2.0*(Xxr*dxa))+((-2.0*(Xxi*dya))+daa));
    float dxbn = ((2.0*(Xxr*dxb))+((-2.0*(Xxi*dyb))+dab));
    float dyan = ((2.0*(sgn(Xxi)*(Xxi*(dxa*sgn(Xxr)))))
                +((2.0*(sgn(Xxi)*(Xxr*(dya*sgn(Xxr)))))+dba));
    float dybn = ((2.0*(sgn(Xxi)*(Xxi*(dxb*sgn(Xxr)))))
                +((2.0*(sgn(Xxi)*(Xxr*(dyb*sgn(Xxr)))))+dbb));
    Xr = Xrn;
    Xi = Xin;
    dxa = dxan;
    dxb = dxbn;
    dya = dyan;
    dyb = dybn;
  }
  if (Xr * Xr + Xi * Xi < EscapeRadius2) return vec2(0.0);
  float xJr = Xr * dxa + Xi * dya;
  float xJi = Xr * dxb + Xi * dyb;
  vec2 z = vec2(Xr, Xi);
  vec2 d = vec2(xJr, xJi);
  return cDiv(vec2(dot(z, z), 0.0), d) * log(length(z));
}

vec3 shade(vec2 e)
{
  float de = length(e);
  vec3 h = hsv2rgb(vec3(degrees(atan(e.y, e.x)) / 360.0, 1.0 / (1.0 + 0.01 * length(e)), 1.0));
  return h * tanh(clamp(4.0 * de, 0.0, 4.0));
}

vec3 color(vec2 p, vec2 dx, vec2 dy)
{
  return shade(de(cConj(p)) / length(10.0 * vec4(dx, dy)));
}

