#version 430 core

// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Fractal helices

#include "Raymond.frag"

#group Helix

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

uniform float HelixD; slider[0.0,2.0,10.0]
uniform float HelixR; slider[0.0,1.0,10.0]
uniform float Helixr; slider[0.0,0.5,10.0]
uniform float HelixScale; slider[0.0,2.618,10.0]

void Torus(inout vec3 q)
{
  q = vec3(log(length(q.xy)), atan(q.y, q.x), q.z);
}

void Helix(inout vec3 q)
{
  q.z += HelixD * atan(q.y, q.x);
  q.z = mod(q.z + pi * HelixD, 2.0 * pi * HelixD) - pi * HelixD;
  Torus(q);
}

float HelicesDE(vec3 q, int depth)
{
  q /= length(vec2(HelixD, HelixR));
  mat3 dq = mat3(1, 0, 0, 0, 1, 0, 0, 0, 1);
  mat3 m = mat3(0,1,0, 0,0,1, 1,0,0);
  float d = length(q.xy) - Helixr * HelixScale;
  for (int i = 0; i < depth; ++i)
  {
    q.z -= pow(-2.0, i) * 2.0 * pi * HelixD * time / 10.0;
    Helix(q);
    d = min(d, (length(q.xz) - Helixr) / pow(HelixScale, i));
    if (d < 0.0) break;
    q *= HelixScale * transpose(m);
  }
  return d * 0.25;
}

// delta normal calculation
#define DELTANORMAL(DE,E,p) normalize(vec3 \
  ( DE(p + vec3(E,0.0,0.0)) - DE(p - vec3(E,0.0,0.0)) \
  , DE(p + vec3(0.0,E,0.0)) - DE(p - vec3(0.0,E,0.0)) \
  , DE(p + vec3(0.0,0.0,E)) - DE(p - vec3(0.0,0.0,E)) \
  ))

float Helices(Scene_DE tag, Transform T, Ray V, int depth)
{
  vec3 z = backwardP(T, V.origin);
  float de = HelicesDE(z, depth);
  return forwardD(T, de);
}

Surface Helices(Scene_HIT tag, Transform T, Ray V, int depth)
{
  Scene_DE DE = Scene_DE(0);
  float de = Helices(DE, T, V, depth);
  const float epsilon = 1.0e-3; // FIXME
#define M(p) Helices(DE, T, Ray((p), V.direction, V.wavelength, V.index), depth)
  vec3 normal = DELTANORMAL(M, epsilon, V.origin);
#undef M
  // surface
  return Surface(V.origin, normal, de);
}

// scene definition
#define SCENE(hit,surface,scene_tag) \
hit scene(scene_tag tag, Random PRNG, Ray V) \
{ \
  return Union3 \
    ( Mirror(Invert(Sphere(tag, Scale(8.0), V)), V, 1.0) \
    , Light(Plane(tag, Identity(), V, Z, 0.0), V, 1.0) \
    , Transparent(srand(PRNG, 1), Helices(tag, compose(Scale(10.0), Translate(vec3(0.5,0.0,2.0))), V, 6), V, vec2(mix(1.6, 1.2, (V.wavelength - 300) / (800 - 300)), pow(0.1, mix(8, 5, (V.wavelength - 300) / (800 - 300))))) \
    ); \
}
//    , Diffuse(srand(PRNG, 1), Helices(tag, compose(Scale(10.0), Translate(vec3(0.5,0.0,2.0))), V, 5), V, Screen_hump(vec3(550.0,150.0,1.0), V.wavelength)) \

vec4 light(Random PRNG, vec3 from, vec3 dir)
{
  if (from.z <= 0.001)
  {
    return vec4(0.0, 0.0, 1.0, 1.0);
  }
  return vec4(-from, 1.0);
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
Eye = 4,2,2
Target = 0.5,0,3
Up = 0,0,1
CompensatedHack = 1
Compensated2IEEEAdd = true
Wave1Period = 1
Wave1Colour1 = 1,0,0
Wave1Colour2 = 1,1,0
Wave1Colour3 = 0,0.5,0
Wave1Colour4 = 0,0,1
Wave2Period = 10
Wave2Colour1 = 1,0,0
Wave2Colour2 = 1,1,0
Wave2Colour3 = 0,0.5,0
Wave2Colour4 = 0,0,1
Wave3Period = 100
Wave3Colour1 = 1,0,0
Wave3Colour2 = 1,1,0
Wave3Colour3 = 0,0.5,0
Wave3Colour4 = 0,0,1
Wave4Period = 1000
Wave4Colour1 = 1,0,0
Wave4Colour2 = 1,1,0
Wave4Colour3 = 0,0.5,0
Wave4Colour4 = 0,0,1
InteriorColour = 0,0,0
DebugDepth = false
DebugNormal = false
DebugBounce = false
Background = 
Distance = 100
Steps = 1000
Depth = 24
MinDist = -16
Acne = -12
SampleLights = false
Aperture = 0.1,0.1
Size = 35
Wavelengths = 300,780
Exposure = 0
ShowHotPixels = false
Colour = true
HelixD = 0.25
HelixR = 0
Helixr = 0.1
HelixScale = 3
#endpreset
