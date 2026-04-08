#version 460 compatibility
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D hybrid escape time fractals, incorrectly using Lambert W

#define providesDouble
#include "TwoD.frag"
#include "LambertW.frag"

#group Mandelbrot

uniform bool Mandelbrot; checkbox[true]
uniform bool AbsMenger; checkbox[true]
uniform bool Menger; checkbox[true]
uniform int Iterations; slider[0,100,100000]
uniform float EscapeRadius; slider[1,16,1024]
uniform float Scale; slider[1,3,16]
uniform int Power; slider[1,2,16]

double EscapeRadius2 = pow(double(2.0), double(EscapeRadius));

void mandelbrot(inout Complexd z, inout dmat2 J, Complexd c)
{
  Complexd dz = pow(z, Power - 1);
  z = add(mul(dz, z), c);
  dz = mul(dz, Power);
  dmat2 dJ = dmat2(dz.x, dz.y, -dz.y, dz.x);
  dmat2 I = dmat2(1.0, 0.0, 0.0, 1.0);
  J = dJ * J + I;
}

void absmenger(inout Complexd z, inout dmat2 J)
{
  Complexd dz = complexd(sign(z.x), sign(z.y));
  dmat2 dJ = dmat2(dz.x, 0.0, 0.0, dz.y);
  z = complexd(abs(z.x), abs(z.y));
  if (z.x - z.y < 0.0)
  {
    double t = z.x; z.x = z.y; z.y = t;
    dvec2 dt = dJ[0]; dJ[0] = dJ[1]; dJ[1] = dt;
  }
  z = mul(z, Scale);
  dJ *= Scale;
  z.x -= Scale - 1.0;
  if (z.y > 1.0) z.y -= Scale - 1.0;
  J = dJ * J;
}

void menger(inout Complexd z, inout dmat2 J)
{
  z = mul(z, Scale);
  J *= Scale;
  if (-1.0 < z.x && z.x < 1.0 && -1.0 < z.y && z.y < 1.0)
  {
    if (z.x < 0.0) z.x -= Scale - 1.0;
    else
    if (0.0 < z.x) z.x += Scale - 1.0;
    if (z.y < 0.0) z.y -= Scale - 1.0;
    else
    if (0.0 < z.y) z.y += Scale - 1.0;
  }
  else
  {
    if (z.x < -1.0) z.x += Scale - 1.0;
    else
    if (1.0 < z.x) z.x -= Scale - 1.0;
    if (z.y < -1.0) z.y += Scale - 1.0;
    else
    if (1.0 < z.y) z.y -= Scale - 1.0;
  }
}

void formula(inout Complexd z, inout dmat2 J, Complexd c)
{
  if (Mandelbrot)
  {
    mandelbrot(z, J, c);
  }
  if (Menger)
  {
    if (AbsMenger)
    {
      absmenger(z, J);
    }
    else
    {
      menger(z, J);
    }
  }
}

dvec3 iterate(dvec2 q)
{
  Complexd c = complexd(q);
  Complexd z = Mandelbrot ? complexd(0.0) : c;
  dmat2 J = dmat2(1.0, 0.0, 0.0, 1.0);
  int i;
  for (i = 0; i < Iterations; ++i)
  {
    if (norm(z) > EscapeRadius2) break;
    formula(z, J, c);
  }
  if (! (norm(z) > EscapeRadius2))
  {
    return dvec3(1.0LF / 0.0LF, 0.0LF, 1.0LF / 0.0LF);
  }
  double z0 = length(z);
  dvec2 dz0 = vec(normalize(z)) * J;
#if 0
  formula(z, J, c);
  double z1 = length(z);
  formula(z, J, c);
  double z2 = length(z);
  double p = (log(z2) - log(z1)) / (log(z1) - log(z0));
  double a = log(z1) - p * log(z0);
#else
  double p = Power;
  double a = Scale;
#endif
  double R = sqrt(EscapeRadius2);
  double f;
  dvec2 df;
  if (a == 1)
  {
    f = log(log(z0) / log(R)) / log(p);
    df = dz0 / (z0 * log(z0) * log(p));
  }
  else if (p == 0)
  {
    f = log(z0) / log(a);
    df = dz0 / (z0 * log(a));
  }
  else if (p == 1)
  {
    f = (log(z0) - log(R)) / log(a);
    df = dz0 / (z0 * log(a));
  }
  else
  {
    double w = gsl_sf_lambert_W0(pow(p, log(z0) / log(a)) * (log(p) * log(R) / log(a)));
    f = log(z0) / log(a) - w / log(p);
    df = dz0 / (z0 * (w + 1) * log(a));
  }
  return dvec3(df, double(i) - f);
}

vec3 color(dvec2 q, vec2 dx, vec2 dy)
{
  double de;
  vec3 tint = vec3(1.0);
  if (true)//(mod(gl_FragCoord.x, 120.0) < 60.0) != (mod(gl_FragCoord.y, 120.0) < 60.0))
  {
    double pixel_spacing = length(vec4(dx, dy));
    de = 1.0 / (length(iterate(q).xy) * pixel_spacing);
    //tint = vec3(1.0, 0.9, 0.8);
  }
  else
  {
    float factor = 1.0 / 256.0;
    dx *= factor;
    dy *= factor;
    double n00 = iterate(q - dx - dy).z;
    double n01 = iterate(q - dx + dy).z;
    double n10 = iterate(q + dx - dy).z;
    double n11 = iterate(q + dx + dy).z;
    de = factor / (length(dvec2(n01 - n10, n00 - n11)) / sqrt(2.0));
    tint = vec3(0.8, 0.9, 1.0);
  }
  if (isnan(de) || isinf(de))
  {
    return vec3(0.0);
  }
  return float(tanh(clamp(de, 0.0, 4.0))) * tint;
}

vec3 color(vec2 q, vec2 dx, vec2 dy)
{
  return color(dvec2(q), dx, dy);
}

#preset Default
Zoom = 0.5 Logarithmic
ZoomFactor = 0
EnableTransform = false
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Center = 0,0
Jitter = 1
Samples = 1
Shutter = 0.01
TrigIter = 5
TrigLimit = 1.10000000000000009
Iterations = 100
EscapeRadius = 32
Power = 3
Scale = 3
Exposure = 0
ShowHotPixels = false
#endpreset
