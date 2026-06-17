#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Looping animation of soap bubbles

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#include "Raymond.frag"

#group Bubble
uniform float Thickness; slider[100.0,1000.0,10000.0]

// render as lights instead of bubbles
const bool DEBUG = false;

vec3 film(Random PRNG, float wavelength, float intensity)
{
  return xyz2rgb(observer(wavelength) * intensity);
}

float screen(vec4 tex, float wavelength)
{
  return CRT(sRGB2linear(tex.rgb), wavelength);
}

vec4 light(Random PRNG, vec3 from, vec3 dir)
{
  return vec4(0.0);
}


vec4 bubble(vec3 origin, int n)
{
  vec3 lo = floor(origin);
  vec3 md = vec3(lo) + vec3((ivec3(n) & ivec3(1, 2, 4)) >> ivec3(0, 1, 2));
  // pseudo-random hash of integer grid coordinates
  Random PRNG2;
  PRNG2.seed = hash(md);
  PRNG2.index = 0u;
  Random PRNG3;
  PRNG3.seed = hash(md.xy);
  PRNG3.index = 0u;
  vec4 posr;
  posr.xyz = uniform3(PRNG2) - vec3(0.5) + md;
  posr.w = uniform1(PRNG3) * 0.125 * (0.9 - smoothstep(4.0, 6.0, length(posr.xyz)));
  return posr;
}

// https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Interpolation_on_the_unit_interval_with_matched_derivatives_at_endpoints
vec4 bubble4(vec3 origin, int n, float t)
{
  const mat4 M = mat4
    (  0.0,  2.0, 0.0,  0.0
    , -1.0,  0.0, 1.0,  0.0
    ,  2.0, -5.0, 4.0, -1.0
    , -1.0, 3.0, -3.0,  1.0
    ) / 2.0;
  vec4 u = vec4(1.0, t, t * t, t * t * t);
  mat4 p = mat4
    ( bubble(origin - Z      , n)
    , bubble(origin          , n)
    , bubble(origin + Z      , n)
    , bubble(origin + Z * 2.0, n)
    );
  return u * transpose(M) * transpose(p);
}

#define SCENE(hit,surface,scene_tag) \
hit scene(scene_tag tag, Random PRNG, Ray V) \
{ \
  float t = time / 5.0; \
  float FPS = 25.0; \
  float shutter = 0.25 / FPS; \
  t += shutter * halton1(srand(PRNG, 5)); \
  t -= floor(t); \
  hit h = SkyBox(tag, Identity(), V); \
  for (int n = 0; n < 8; ++n) \
  { \
    for (int m = -1; m < 2; ++m) \
    { \
      vec4 posr = bubble4(V.origin - float(m) * Z, n, t); \
      if (posr.w > 0.0) \
      { \
        float thick = Thickness * clamp(1.0 - (V.origin.z - posr.z) / posr.w, 0.01, 1.99); \
        vec2 nk = Water_nk(V.wavelength); \
        surface ball = Sphere(tag, compose(Scale(posr.w), Translate(posr.xyz)), V); \
        h = Union(h, DEBUG ? Light(ball, V, D65(V.wavelength)) : SoapBubble \
          ( srand(PRNG, 4 + n * 3 + m + 1) \
          , ball \
          , V \
          , thick \
          , nk \
          )); \
      } \
    } \
  } \
  return h; \
}

SCENE(Hit,Surface,Scene_HIT)
#if 1
// 16fps / 3.8fps / 1.9fps
// fast
SCENE(float,float,Scene_DE)
#else
// 15fps / 3.8fps / 1.9fps
// slow
float scene(Scene_DE tag, Random PRNG, Ray V)
{
  Scene_HIT HIT;
  return scene(HIT, PRNG, V).surface.de;
}
#endif

#preset Default
Exposure = 0
Steps = 100
FOV = 1
Eye = 0,0,0
Target = 0,1,1
Up = 0,0,1
Background = Berlin.equi.jpg
Distance = 100
Depth = 10
Acne = -16
Aperture = 0.035,0.02
Size = 35
Wavelengths = 300,780
Thickness = 1000
SampleLights = false
DebugNormal = true
#endpreset
