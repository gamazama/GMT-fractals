#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2019,2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Menger sponge with a shiny sphere on top

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

vec4 light(Random PRNG, vec3 from, vec3 dir)
{
  return vec4(0.0);
}

// scene definition
#define SCENE(hit,surface,scene_tag) \
hit scene(scene_tag tag, Random PRNG, Ray V) \
{ \
  return Union5 \
    ( Mirror(Invert(Sphere(tag, Scale(8.0), V)), V, Screen_hump(vec3(400.0, 300.0, 1.0), V.wavelength)) \
    , Light(Sphere(tag, Translate(vec3(2.0, 5.5, 5.0)), V), V, 100.0 * D65(V.wavelength)) \
    , Diffuse(srand(PRNG, 2), Plane(tag, Identity(), V, Z, 0.0), V, Screen_hump(vec3(700.0, 100.0, 1.0), V.wavelength)) \
    , Diffuse(srand(PRNG, 3), MengerSponge(tag, Translate(vec3(0.0, 0.0, 1.0)), V, 6), V, Screen_hump(vec3(580.0, 200.0, 1.0), V.wavelength)) \
    , Mirror(Sphere(tag, Translate(vec3(0.0, 0.0, 2.0 + sqrt(8.0)/3.0)), V), V, Screen_hump(vec3(530.0, 200.0, 0.5), V.wavelength)) \
    ); \
}
//    , Light(Plane(tag, Identity(), V, -Z, -6.0), V, 1.0 * D65(V.wavelength)) \

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
Aperture = 0.33,1
Size = 1000
Wavelengths = 300,780
Colour = false
SampleLights = false
#endpreset
