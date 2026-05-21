#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

struct Random  { uint seed, index; };
struct Camera  { vec3 origin, X, Y, Z; float fieldOfView; };
struct Ray     { vec3 origin, direction; float wavelength; vec2 index; };
struct Surface { vec3 position; vec3 normal; float de; };
struct Hit     { Surface surface; Ray ray; float factor; float emit; };

// implement these
uint hash(uint n);
Ray camera(Random PRNG, Camera C, vec2 coord, out float intensity);
float /* intensity */ raytrace(Random PRNG, Ray V, out Hit h);
vec3 /* linear RGB */ film(Random PRNG, float wavelength, float intensity);
vec4 /* direction, weight */ light(Random PRNG, vec3 from, vec3 dir);

// perturb a random number generator
Random srand(Random PRNG, int seed)
{
  PRNG.seed = hash(vec2(hash(PRNG.seed), hash(uint(seed))));
  return PRNG;
}

// scene definition

struct Scene_DE  { int dummy; };
struct Scene_HIT { int dummy; };

float scene(Scene_DE  tag, Random PRNG, Ray V);
Hit   scene(Scene_HIT tag, Random PRNG, Ray V);
