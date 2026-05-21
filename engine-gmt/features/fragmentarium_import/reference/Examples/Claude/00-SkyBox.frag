#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Soap bubble in front of a panorama

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#include "Raymond-sRGB.frag"
#include "Raymond.frag"

#group Bubble

// average thickness of bubble's soap film in nm
uniform float Thickness; slider[0.0,1000.0,10000.0]

float t = pi - 2.0 * pi * time / 15.0;
Transform Spin = Rotate(vec4(Z * sin(t/2.0), cos(t/2.0)));

// CIE observer
vec3 film(Random PRNG, float wavelength, float intensity)
{
  return xyz2rgb(observer(wavelength) * intensity);
}

// skybox sRGB texture using CRT model
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
  return Union \
    ( SkyBox(tag, Spin, V) \
    , SoapBubble \
      ( PRNG \
      , Sphere(tag, Identity(), V) \
      , V \
      , Thickness * (1.0 - V.origin.z) \
      , Water_nk(V.wavelength) \
      ) \
    ); \
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
FOV = 1
Eye = 0,2.5,0
Target = 0,0,0
Up = 0,0,1
Exposure = 3
Distance = 100
Steps = 100
Depth = 10
MinDist = -16
Acne = -16
Size = 120
Aperture = 0.25,1
Wavelengths = 300,780
Thickness = 1000
SampleLights = false
#endpreset

#preset Berlin
Exposure = 1
Background = Berlin.equi.jpg
#endpreset

#preset Paris
Exposure = 2
Background = Paris.equi.jpg
#endpreset

#preset Grid
Exposure = 2
Background = Grid.equi.png
#endpreset
