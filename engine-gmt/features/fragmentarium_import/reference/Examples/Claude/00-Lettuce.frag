#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Attempt at lettuce fractal

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#include "Raymond.frag"

uniform bool Colour; checkbox[true]

// CIE observer
vec3 film(Random PRNG, float wavelength, float intensity)
{
  if (Colour)
    return xyz2rgb(observer(wavelength) * intensity);
  else
    return xyz2rgb(vec3(fp4plus(wavelength) * intensity));
}

// sRGB texture using CRT model
float screen(vec4 tex, float wavelength)
{
  return CRT(sRGB2linear(tex.rgb), wavelength);
}

// scene definition
#define SCENE(hit,surface,scene_tag) \
hit scene(scene_tag tag, Random PRNG, Ray V) \
{ \
  return Union4 \
    ( Mirror(Invert(Sphere(tag, Scale(8.0), V)), V, Screen_hump(vec3(400.0, 300.0, 1.0), V.wavelength)) \
    , Light(Sphere(tag, Translate(vec3(2.0, 5.5, 5.0)), V), V, 500.0 * D65(V.wavelength)) \
    , Diffuse(srand(PRNG, 2), Plane(tag, Identity(), V, Z, 0.0), V, Screen_hump(vec3(700.0, 100.0, 1.0), V.wavelength)) \
    , Diffuse(srand(PRNG, 3), Lettuce(tag, Translate(vec3(0.0, 0.0, 2.0)), V, 16), V, Screen_hump(vec3(580.0, 200.0, 1.0), V.wavelength)) \
    ); \
}
//    , Light(Plane(tag, Identity(), V, -Z, -6.0), V, 1.0 * D65(V.wavelength)) \

vec4 light(Random PRNG, vec3 from, vec3 dir)
{
  vec3 lpos = vec3(2.0, 5.5, 5.0);
  vec3 ldir = lpos - from;
  float t = cos(asin(1.0 / length(ldir)));
  float s = dot(normalize(ldir), normalize(dir));
  if (length(from) >= 7.999)
  {
   if (s > t) return vec4(normalize(dir), 1.0); else return vec4(0.0);
  }
  vec3 to = normalize(gaussian3(srand(PRNG, 5))) + lpos;
  return vec4(normalize(to - from), (1.0 - t) / 2.0);
}

// scene for DE with lighting
SCENE(Hit,Surface,Scene_HIT)

#ifndef DEBUG

// scene for DE only (fast)
SCENE(float,float,Scene_DE)

#else

// reuse DE with lighting (slow)
float scene(Scene_DE tag, Random PRNG, Ray V)
{
  Scene_HIT HIT;
  return scene(HIT, PRNG, V).surface.de;
}

#endif


#preset Default
Exposure = 1
FOV = 1
Eye = 4,2,4
Target = 0.5,0,2
Up = 0,0,1
Background = 
Distance = 100
Steps = 100
Depth = 10
MinDist = -16
Acne = -12
Aperture = 0.0,0.0
Size = 1000
Wavelengths = 300,780
Colour = true
SampleLights = false
#endpreset
