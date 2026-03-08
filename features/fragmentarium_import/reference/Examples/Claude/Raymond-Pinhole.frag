#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

#group Pinhole

// Pinhole aperture radius and depth (mm)
uniform vec2 Aperture; slider[(0,0),(0.1,0.01),(10.0,10.0)]

// Size of film plane of camera (mm)
uniform float Size; slider[0.0,35.0,1000.0]

// Range of light wavelengths to trace (nm)
uniform vec2 Wavelengths; slider[(0.0,0.0),(300.0,780.0),(1000.0,1000.0)]

struct Pinhole
{
  vec2 aperture; // m
  float size; // m
  vec2 wavelengths; // nm
};

Pinhole pinhole_uniforms()
{
  Pinhole P;
  P.aperture = Aperture / 1000.0;
  P.size = Size / 1000.0;
  P.wavelengths = Wavelengths;
  return P;
}

Ray pinhole(Random PRNG, Camera C, vec2 pixel, Pinhole P, out float intensity)
{
  vec2 rect = halton2(srand(PRNG, 1));
  vec2 disc = haltonDisc(srand(PRNG, 2));
  float wave = halton1(srand(PRNG, 3));
  float dist = P.size / 2.0 / tan(C.fieldOfView / 2.0);
  vec2 p = pixel + dFdx(pixel) * rect.x + dFdy(pixel) * rect.y;
  vec3 from = C.origin - dist * C.Z + P.size / 2.0 * (p.x * C.X + p.y * C.Y);
  vec3 to = C.origin + P.aperture.x * (disc.x * C.X + disc.y * C.Y);
  Ray V;
  V.origin = to;
  V.direction = normalize(to - from);
  V.wavelength = mix(P.wavelengths.x, P.wavelengths.y, wave);
  V.index = vec2(1.0, 0.0); // vacuum
  // vignette
  // <http://www.galerie-photo.com/stenope-cercle-image-theorie.html>
  float a = acos(clamp(dot(C.Z, V.direction), 0.0, 1.0));
  float t = tan(a);
  float d = P.aperture.x * 2.0;
  float e = P.aperture.y;
  float ted = clamp(t * e / d, 0.0, 1.0);
  intensity = acos(ted) - t * e * d * sqrt(1.0 - ted * ted);
  return V;
}
