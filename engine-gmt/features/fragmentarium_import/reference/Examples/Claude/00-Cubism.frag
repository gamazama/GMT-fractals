#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Glitched raytracer animation

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#include "Raymond.frag"

// animation parameters
const float bpm = 130.0;
const float beats = 512.0;
const float seconds = beats / bpm * 60.0;
const float fps = 25.0;
const float shutter = 0.5;

struct Animation
{
  Transform A, B, C, D;
  float t1, t2;
};

Animation animation(Random PRNG)
{
  float t = (time + shutter / fps * uniform1(PRNG)) / seconds;
  t -= floor(t);
  t *= 2.0;
  // generate quantized noise
  Random r1, r2, r3, r4;
  r1.seed = hash(vec2(mod(floor(t + 0.0), 2.0), 1.0)); r1.index = 0u;
  r2.seed = hash(vec2(mod(floor(t + 1.0), 2.0), 1.0)); r2.index = 0u;
  r3.seed = hash(vec2(mod(floor(t + 0.5), 2.0), 2.0)); r3.index = 0u;
  r4.seed = hash(vec2(mod(floor(t + 1.5), 2.0), 2.0)); r4.index = 0u;
  // random unit quaternions (orientations)
  vec4 q1, q2, q3, q4;
  q1 = normalize(gaussian4(r1));
  q2 = normalize(gaussian4(r2));
  q3 = normalize(gaussian4(r3));
  q4 = normalize(gaussian4(r4));
  // interpolate
  vec4 p1 = slerp(q1, q2, t - floor(t));
  vec4 p2 = slerp(q3, q4, t + 0.5 - floor(t + 0.5));
  // faster layer on top
  t *= 4.0;
  // generate quantized noise
  r1.seed = hash(vec2(mod(floor(t + 0.0), 8.0), 3.0)); r1.index = 0u;
  r2.seed = hash(vec2(mod(floor(t + 1.0), 8.0), 3.0)); r2.index = 0u;
  r3.seed = hash(vec2(mod(floor(t + 0.5), 8.0), 4.0)); r3.index = 0u;
  r4.seed = hash(vec2(mod(floor(t + 1.5), 8.0), 4.0)); r4.index = 0u;
  // random film thicknesses
  float t1 = mix(100.0, 1000.0, uniform1(r1));
  float t2 = mix(100.0, 1000.0, uniform1(r2));
  float t3 = mix(100.0, 1000.0, uniform1(r3));
  float t4 = mix(100.0, 1000.0, uniform1(r4));
  float a1 = mix(t1, t2, t - floor(t));
  float a2 = mix(t3, t4, t + 0.5 - floor(t + 0.5));
  // return
  Animation a;
  a.A = Rotate(p1);
  a.B = Rotate(p2);
  a.C = Rotate(-p1);
  a.D = Rotate(-p2);
  a.t1 = a1;
  a.t2 = a2;
  return a;
}

Random PRNG;

Animation Anim = animation(srand(PRNG, subframe));

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


Hit scene(Scene_HIT tag, Random PRNG, Ray V)
{
  // glitch the ray tracing
  Ray U;
  U = V;
  U.origin    = forwardP(Anim.D, U.origin);
  U.direction = forwardN(Anim.D, U.direction);
  Hit h1 = ThinFilm(MengerSponge(tag, Anim.A, U, 3), V, Anim.t1, 1.0);
  U = V;
  U.origin    = forwardP(Anim.C, U.origin);
  U.direction = forwardN(Anim.C, U.direction);
  Hit h2 = ThinFilm(MengerSponge(tag, Anim.B, U, 3), V, Anim.t2, 1.0);
  return Union3
    ( Light(Invert(Sphere(tag, Scale(100.0), V)), V, D65(V.wavelength))
    , h1
    , h2
    );
}

float scene(Scene_DE tag, Random PRNG, Ray V)
{
  Scene_HIT HIT;
  return scene(HIT, PRNG, V).surface.de;
}

#preset Default
FOV = 0.4
Eye = 0,0,0
Target = 1,0,0
Up = 0,0,1
Exposure = 2
Steps = 3
Depth = 15
Acne = 0
Aperture = 0.1,0.1
Size = 35
Wavelengths = 300,780
#endpreset
