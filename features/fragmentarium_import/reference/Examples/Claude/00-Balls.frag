#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Spheres of different materials

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#include "Raymond.frag"

vec3 film(Random PRNG, float wavelength, float intensity)
{
  return xyz2rgb(observer(wavelength) * intensity);
}

float screen(vec4 tex, float wavelength)
{
  return 0.0;
}

vec4 light(Random PRNG, vec3 from, vec3 dir)
{
  return vec4(0.0);
}


#define SCENE(hit,surface,scene_tag) \
hit scene(scene_tag tag, Random PRNG, Ray V) \
{ \
  surface G = Plane(tag, Identity(), V, Z, 0.0); \
  return Union6 \
    ( Light(Invert(Sphere(tag, Scale(50.0), V)), V, \
        D65(V.wavelength) * 5.0 * pow(V.origin.z / 50.0, 8.0)) \
    , Glass  (srand(PRNG, 1), Sphere(tag, Translate(vec3(0.0,-4.5,1.0)), V), V) \
    , Quartz (srand(PRNG, 2), Sphere(tag, Translate(vec3(0.0,-1.5,1.0)), V), V) \
    , Water  (srand(PRNG, 3), Sphere(tag, Translate(vec3(0.0, 1.5,1.0)), V), V) \
    , Diffuse(srand(PRNG, 4), Sphere(tag, Translate(vec3(0.0, 4.5,1.0)), V), V, 0.5) \
    , Checkerboard \
      ( V.origin \
      , Diffuse(srand(PRNG, 5), G, V, 0.3) \
      , Diffuse(srand(PRNG, 6), G, V, 0.7) \
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
FOV = 0.575
Eye = 8.703398,3.894242,3.333333
Target = 1.140564,0.6462541,0.3816794
Up = -0.3986355,-0.3137904,0.7589191
Steps = 100
Depth = 25
Acne = -16.51064
Aperture = 0.0299999,0.1
Size = 35
Wavelengths = 300,780
Exposure = 2
SampleLights = false
#endpreset
