#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
// <https://en.wikipedia.org/wiki/Halton_sequence>

float halton(uint b, uint i)
{
  float f = 1.0;
  float r = 0.0;
  if (b > 1u)
    while (i > 0u)
    {
      f /= float(b);
      r += f * float(i % b);
      i /= b;
    }
  return r;
}

vec2 halton(uvec2 b, uint i)
{
  return vec2(halton(b.x, i), halton(b.y, i));
}

vec3 halton(uvec3 b, uint i)
{
  return vec3(halton(b.x, i), halton(b.y, i), halton(b.z, i));
}

vec4 halton(uvec4 b, uint i)
{
  return vec4(halton(b.x, i), halton(b.y, i), halton(b.z, i), halton(b.w, i));
}

float halton(Random PRNG, int b1)
{
  float h = halton(uint(b1), PRNG.index) + uniform1(PRNG);
  return h - floor(h);
}

vec2 halton(Random PRNG, int b1, int b2)
{
  float theta = 2.0 * pi * uniform1(srand(PRNG, 1));
  float c = cos(theta);
  float s = sin(theta);
  float r = 1.0 / (abs(c) + abs(s));
  mat2 m = mat2(c, s, -s, c) / r;
  vec2 h = m * halton(uvec2(b1, b2), PRNG.index) + uniform2(srand(PRNG, 2));
  return h - floor(h);
}

vec3 halton(Random PRNG, int b1, int b2, int b3)
{
  vec3 h = halton(uvec3(b1, b2, b3), PRNG.index) + uniform3(PRNG);
  return h - floor(h);
}

vec4 halton(Random PRNG, int b1, int b2, int b3, int b4)
{
  vec4 h = halton(uvec4(b1, b2, b3, b4), PRNG.index) + uniform4(PRNG);
  return h - floor(h);
}

float halton1(Random PRNG) { return halton(PRNG, 2); }
vec2 halton2(Random PRNG) { return halton(PRNG, 2, 3); }
vec3 halton3(Random PRNG) { return halton(PRNG, 2, 3, 5); }
vec4 halton4(Random PRNG) { return halton(PRNG, 2, 3, 5, 7); }

vec2 haltonDisc(Random PRNG)
{
  return uniformDisc(halton2(PRNG));
}
