#version 460 compatibility
//#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 3D Hybrid Escape Time Fractals

//#define providesColor
//#define providesNormal
#include "ThreeD.frag"
#include "DistanceEstimate.frag"

#group Fractal
// Menger sponge scale factor
uniform float SpongeScale; slider[0,3,10]

// animation
uniform float time;
float co = cos(float(M_2PI) * time / 4);
float si = sin(float(M_2PI) * time / 4);
mat3 Rot = mat3(co, 0.0, si, 0.0,1.0,0.0,-si, 0.0,co);

// formula definition

void deFormula(inout Vec3Dual3f z, in Vec3Dual3f c)
{
  MandelbulbTriplex(z, c);
  MengerSponge(z, float(SpongeScale));
}

void deFormula(inout Vec3fx z, in Vec3fx c)
{
  MandelbulbTriplex(z, c);
  MengerSponge(z, floatx(SpongeScale));
}

// interface to `DE-Raytracer.frag`

float DE(vec3 pos) {
  vec3 normalV;
  return DistanceEstimate(Rot * pos, normalV);
}

#ifdef providesNormal
vec3 normal(vec3 pos, float d)
{
  vec3 normalV;
  float de = DistanceEstimate(Rot * pos, normalV);
  if (1.0 / 0.0 > length(normalV) && length(normalV) > 0.0)
  {
    return normalize(transpose(Rot) * normalV);
  }
  else
  {
    return normalize(Dir);
  }
}
#endif

#ifdef providesColor
vec3 baseColor(vec3 point, vec3 normal)
{
  return max(vec3(0.5) + 0.5 * normalize(Rot * point + transpose(Rot) * normal), vec3(0.0));
}
#endif

// presets

#preset Default
DEAValue = 3
DEPValue = 8
FOV = 0.3
Eye = 1,3,2
Target = 0,0,0
Up = 0,0,1
MaxRaySteps = 1000
Detail = -4
OrbitStrength = 1
BackgroundColor = 0.2,0.2,0.2
CamLight = 1,1,1,0
SpotLightDir = 0.3,0.2
HardShadow = 1
#endpreset
