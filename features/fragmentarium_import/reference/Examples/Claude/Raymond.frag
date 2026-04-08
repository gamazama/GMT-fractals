#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Raymond: a physics-inspired ray tracer

#include "Common.frag"

const float pi = 3.141592653589793;
const vec3 X = vec3(1.0, 0.0, 0.0);
const vec3 Y = vec3(0.0, 1.0, 0.0);
const vec3 Z = vec3(0.0, 0.0, 1.0);

#include "Raymond-Defs.frag"
#include "Raymond-Camera3D.frag"
#include "sRGB.frag"
#include "Raymond-Random.frag"
#include "Raymond-Halton.frag"
#include "Raymond-Transform.frag"
#include "Raymond-Surface.frag"
#include "Raymond-Fractal.frag"
#include "Raymond-Lettuce.frag"
#include "Raymond-Material.frag"
#include "Raymond-SkyBox.frag"
#include "Raymond-Trace.frag"
#include "Raymond-Pinhole.frag"

uint hash(uint a)
{
  return hash_burtle_9(a);
}

Ray camera(Random PRNG, Camera C, vec2 coord, out float intensity)
{
  return pinhole(PRNG, C, -coord, pinhole_uniforms(), intensity);
}

float raytrace(Random PRNG, Ray V, out Hit h)
{
  return raytrace_de(PRNG, V, raytrace_de_uniforms(), h);
}
