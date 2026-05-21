#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Display numbers in scientific notation

#include "TwoD.frag"
#include "ScientificNotation.frag"

#group Scientific

uniform vec3 BackgroundColour; color[0,0,0]
uniform vec3 TextColour; color[1,1,1]
uniform int Decimals; slider[0,3,10]
uniform float HorizontalAlign; slider[0,1,1]
uniform float GlyphScale; slider[0,1.5,2]
uniform float StrokeLength; slider[0,0.7,1]
uniform float StrokeWidth; slider[0,0.1,1]

vec3 color(vec2 p, vec2 dx, vec2 dy)
{
  // zoom out a bit
  p *= 10.0;
  dx *= 10.0;
  dy *= 10.0;

  // accelerating zoom
  float value = pow(2.0, 0.11 * Time) - 10.0;

  // draw radiating circles
  float dist = 1.0 / 0.0;
  for (int k = 1; k < 10; ++k)
  {
    float r = float(k) * length(p);
    float dr = float(k);
    dr /= log(2.0) * r;
    r = log2(r);
    r -= value;
    dr *= log(2.0) / log(10.0);
    r *= log(2.0) / log(10.0);
    r -= floor(r);
    r -= 0.5;
    float circ = abs(r) / dr + 0.02;
    dist = min(dist, circ);
  }

  // draw number
  dist = min(dist, sdDigits(p - vec2(0.0, 1.0), formatScientificLog2(1, value, Decimals), HorizontalAlign, StrokeLength, StrokeWidth, GlyphScale));

  float aaWidth = length(vec4(dx, dy));
  float alpha = smoothstep(0.0 - aaWidth, 0.0 + aaWidth, -dist);
  return mix(BackgroundColour, TextColour, alpha);
}
