#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

// uniforms in [0,1)^n

float uniform01(Random PRNG)
{
  return uniform01(PRNG.seed);
}

float uniform01(Random PRNG, int i)
{
  return uniform01(srand(PRNG, i));
}

float uniform1(Random PRNG)
{
  return uniform01(PRNG, 1);
}

vec2 uniform2(Random PRNG)
{
  return vec2(uniform01(PRNG, 1), uniform01(PRNG, 2));
}

vec3 uniform3(Random PRNG)
{
  return vec3(uniform01(PRNG, 1), uniform01(PRNG, 2), uniform01(PRNG, 3));
}

vec4 uniform4(Random PRNG)
{
  return vec4(uniform01(PRNG, 1), uniform01(PRNG, 2), uniform01(PRNG, 3), uniform01(PRNG, 4));
}

// uniform disc

vec2 uniformDiscNaive(vec2 u01)
{
  float r = sqrt(u01.x);
  float t = 2.0 * pi * u01.y;
  return r * vec2(cos(t), sin(t));
}

// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#SamplingaUnitDisk
vec2 uniformDisc(vec2 u01)
{
  vec2 u11 = 2.0 * u01 - vec2(1.0);
  if (u11 == vec2(0.0)) return u11;
  float r, t;
  if (abs(u11.x) > abs(u11.y))
  {
    r = u11.x;
    t = pi / 4.0 * (u11.y / u11.x);
  }
  else
  {
    r = u11.y;
    t = pi / 2.0 - pi / 4.0 * (u11.x / u11.y);
  }
  return r * vec2(cos(t), sin(t));
}

vec2 uniformDisc(Random PRNG)
{
  return uniformDisc(uniform2(PRNG));
}

// Box-Muller transform

vec2 gaussian(vec2 u01)
{
  float s = u01.x;
  float t = 2.0 * pi * u01.y;
  if (s > 0.0)
    return vec2(cos(t), sin(t)) * sqrt(-2.0 * log(s) / s);
  else
    return vec2(0.0);
}

vec2 gaussian2(Random PRNG)
{
  return gaussian(uniform2(PRNG));
}

float gaussian1(Random PRNG)
{
  return gaussian2(PRNG).x;
}

vec4 gaussian4(Random PRNG)
{
  vec4 u = uniform4(PRNG);
  return vec4(gaussian(u.xy), gaussian(u.zw));
}

vec3 gaussian3(Random PRNG)
{
  return gaussian4(PRNG).xyz;
}

// a rotation matrix that makes Z point along the normal

mat3 localCoordinates(vec3 normal)
{
  vec3 w = X;
  if (abs(dot(Y, normal)) < abs(dot(w, normal))) w = Y;
  if (abs(dot(Z, normal)) < abs(dot(w, normal))) w = Z;
  vec3 a = normalize(cross(w, normal));
  vec3 b = normalize(cross(a, normal));
  if (dot(normal, cross(a, b)) < 0.0) { vec3 t = a; a = b; b = t; }
  return mat3(a, b, normal);
}

// cosine weighted hemisphere from uniform disc and normal

vec3 cosHemisphere(vec2 uDisc, vec3 normal)
{
  mat3 m = localCoordinates(normal);
  vec3 w = vec3(uDisc, sqrt(max(0.0, 1.0 - dot(uDisc, uDisc))));
  return m * w;
}
