#version 330 core
// (c) 2021 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Mandelbox via dual numbers

#define providesColor
#define providesNormal
#include "ThreeD.frag"

#group Mandelbox
uniform int Iterations; slider[1,10,100]
uniform float RadiusMin; slider[0,0.5,10]
uniform float RadiusFixed; slider[0,1,10]
uniform float Scale; slider[-4,2,4]
uniform float EscapeRadius; slider[1,100,10000]

uniform vec4 BoxFoldXColour;     color[0.0,1.0,10.0,1.0,1.0,0.4]
uniform vec4 BoxFoldYColour;     color[0.0,1.0,10.0,1.0,1.0,0.4]
uniform vec4 BoxFoldZColour;     color[0.0,1.0,10.0,1.0,1.0,0.4]
uniform vec4 SphereScaleColour;  color[0.0,10.0,10.0,0.2,0.5,1.0]
uniform vec4 SphereInvertColour; color[0.0,10.0,10.0,1.0,0.5,0.2]

uniform bool DebugNormals; checkbox[false]

// premultiplied alpha
vec4 pma(vec4 c)
{
  return vec4(c.rgb * c.a, c.a);
}

// structural colouring
vec4 orbit_colour = vec4(0.0);

Dual3f BoxFold(Dual3f x, vec4 c)
{
  if (x.x > 1.0)
  {
    orbit_colour += pma(c);
    return sub(2.0, x);
  }
  else if (x.x < -1.0)
  {
    orbit_colour += pma(c);
    return sub(-2.0, x);
  }
  return x;
}

Vec3Dual3f BoxFold(Vec3Dual3f z)
{
  Vec3Dual3f w;
  w.v[0] = BoxFold(z.v[0], BoxFoldXColour);
  w.v[1] = BoxFold(z.v[1], BoxFoldYColour);
  w.v[2] = BoxFold(z.v[2], BoxFoldZColour);
  return w;
}

Vec3Dual3f SphereFold(Vec3Dual3f z)
{
  Dual3f r2 = add(add(sqr(z.v[0]), sqr(z.v[1])), sqr(z.v[2]));
  if (r2.x < RadiusMin * RadiusMin)
  {
    orbit_colour += pma(SphereScaleColour);
    return div(z, div(RadiusMin * RadiusMin, RadiusFixed * RadiusFixed));
  }
  else if (r2.x < RadiusFixed * RadiusFixed)
  {
    orbit_colour += pma(SphereInvertColour);
    return div(z, div(r2, RadiusFixed * RadiusFixed));
  }
  return z;
}

Vec3Dual3f Mandelbox(Vec3Dual3f z, Vec3Dual3f c)
{
  z = BoxFold(z);
  z = SphereFold(z);
  z = mul(Scale, z);
  z = add(z, c);
  return z;
}

#ifdef providesNormal
vec3 saved_normal = vec3(0.0);
vec3 normal(vec3 p, float de)
{
  return saved_normal;
}
#endif

// box size
float Side
  = Scale < -1.0 ?
    4.0
  : 1.0 < Scale && Scale <= 4.0 * sqrt(3.0) + 1.0 ?
    4.0 * (Scale + 1.0) / (Scale - 1.0)
  : 4.0/*FIXME*/;
float Corner = sqrt(3.0) * Side / 2.0;

float DE(vec3 p)
{
  orbit_colour = vec4(0.0);
  if (length(p) > Corner)
  {
    // DE is inaccurate far from the fractal
    // approximate with a box in that case
    return length(max(abs(p) - vec3(Side / 2.0), 0.0));
  }
  Vec3Dual3f c = variable(p);
  Vec3Dual3f z = c;
  for (int i = 0; i < Iterations; ++i)
  {
    if (length(value(z)) > EscapeRadius)
    {
      break;
    }
    z = Mandelbox(z, c);
  }
  // extract final value f and Jacobian J
  vec3 f = value(z);
  mat3 J = derivative(z);
#ifdef providesNormal
  saved_normal = normalize(f * inverse(transpose(J)));
#endif
  // DE for linear escape (z->Scale*z for large z)
  return log(abs(Scale)) * length(f) / length(normalize(f) * J);
}

#ifdef providesColor
vec3 baseColor(vec3 z, vec3 n){
  if (DebugNormals)
  {
    return mix(n, vec3(1.0), 0.5);
  }
  else
  {
    vec3 c = orbit_colour.rgb / orbit_colour.a;
    if (c == c) // NaN check
    {
      return c;
    }
    else
    {
      return BaseColor;
    }
  }
}
#endif 


#preset Default
FOV = 0.4
Eye = 0,0,-8
Target = 0,0,0
Up = 0,1,0
Detail = -3
MaxRaySteps = 100
Specular = 0.87850468
SpecularExp = 46.59864
SpecularMax = 1
SpotLight = 1,1,1,0.85039371
SpotLightDir = 0.60409558,0.2354949
CamLight = 1,1,1,0
HardShadow = 0.55136987 NotLocked
BaseColor = 1,1,1
OrbitStrength = 1
Iterations = 20
RadiusMin = 0.5
RadiusFixed = 1
Scale = -1.5
EscapeRadius = 100
SphereInvertColour = 0.447058824,0.623529412,0.811764706,10
SphereScaleColour = 0.937254902,0.160784314,0.160784314,10
BoxFoldXColour = 0.988235294,0.91372549,0.309803922,1
BoxFoldYColour = 0.988235294,0.91372549,0.309803922,1
BoxFoldZColour = 0.988235294,0.91372549,0.309803922,1
DebugNormals = false
#endpreset
