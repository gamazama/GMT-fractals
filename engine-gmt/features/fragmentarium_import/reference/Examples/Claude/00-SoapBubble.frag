#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Soap bubble on a checkerboard in the dark

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#include "Raymond.frag"

#group Soap
uniform float Thickness; slider[100.0,1000.0,10000.0]

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


#define SCENE(hit,surface,scene_tag) \
hit scene(scene_tag tag, Random PRNG, Ray V) \
{ \
  surface Ground = Plane(tag, Identity(), V, Z, 0.0); \
  return Union3 \
    ( Light(Invert(Sphere(tag, Scale(8.0), V)), V, D65(V.wavelength) * pow(V.origin.z / 8.0, 16.0) * 32.0) \
    , SoapBubble(srand(PRNG, 1), Sphere(tag, Translate(vec3(0.0, 0.0, 1.0)), V), V, Thickness * (2.0 - V.origin.z), Water_nk(V.wavelength)) \
    , Checkerboard \
      ( V.origin \
      , Diffuse(srand(PRNG, 2), Ground, V, 0.5) \
      , Diffuse(srand(PRNG, 2), Ground, V, 0.2) \
      ) \
    ); \
}

SCENE(Hit,Surface,Scene_HIT)
#if 1
// fast
SCENE(float,float,Scene_DE)
#else
// slow
float scene(Scene_DE tag, Random PRNG, Ray V)
{
  Scene_HIT HIT;
  return scene(HIT, PRNG, V).surface.de;
}
#endif


#preset Default
Exposure = 0
FOV = 0.4
Eye = 0,6,0.25
Target = 0,0,1
Up = 0,0,1
Steps = 300
Depth = 10
Acne = -16
Aperture = 0.035
Size = 35
Wavelengths = 300,780
SampleLights = false
#endpreset
