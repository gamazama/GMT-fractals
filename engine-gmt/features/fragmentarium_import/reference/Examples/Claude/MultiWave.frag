#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// based on Pauldelbrot's multiwave colouring code

float mw_huefrac(float a, float b)
{
  if (b == 0.0) return 0.0;
  if (b < a) return b / a;
  if (a == 0.0) return 2.0;
  if (a < b) return 2 - a / b;
  /*if (a == b)*/ return 1.0;
}

float mw_fast_rem(float d, float denom)
{
  return d - denom * floor(d / denom);
}

vec3 mw_rgb_to_hsl(vec3 rgb)
{
  float small = min(min(rgb.r, rgb.g), rgb.b);
  float large = max(max(rgb.r, rgb.g), rgb.b);
  if (large == 0.0) return vec3(0.0, 0.0, -1.0 / 0.0);
  if (small == 1.0) return vec3(0.0, 0.0,  1.0 / 0.0);
  float l = (small + large) / 2.0;
  float ll = 1.0 - 2.0 * abs(l - 0.5);
  float s = clamp((large - small) / ll, 0.0, 1.0);
  vec3 rgbs = rgb - vec3(small);
  float sat = tan(float(M_PI) * (s - 0.5));
  float lum = tan(float(M_PI) * (l - 0.5));
  float h;
  if (small == rgb.r) h = 4.0 + mw_huefrac(rgbs.g, rgbs.b);
  else
  if (small == rgb.g) h = 6.0 + mw_huefrac(rgbs.b, rgbs.r);
  else
  /*if (small == rgb.b)*/ h = 2.0 * mw_huefrac(rgbs.r, rgbs.g);
  float hue = mw_fast_rem(h, 8.0);
  return vec3(hue, sat, lum);
}

vec3 mw_hsl_to_rgb(vec3 hsl)
{
  float h = hsl.x >= 4.0 ? hsl.x - 2.0 : hsl.x / 2.0;
  float s_color = atan(hsl.y) / float(M_PI) + 0.5;
  float s_grey = 0.5 * (1.0 - s_color);
  float l_color0 = atan(hsl.z) / float(M_PI);
  float lca = abs(l_color0);
  float l_white = l_color0 + lca;
  float l_color = 1.0 - 2.0 * lca;
  vec3 rgb;
  if (h < 1.0) rgb = vec3(1.0, h, 0.0);
  else
  if (h < 2.0) rgb = vec3(2.0 - h, 1.0, 0.0);
  else
  if (h < 3.0) rgb = vec3(0.0, 1.0, h - 2.0);
  else
  if (h < 4.0) rgb = vec3(0.0, 4.0 - h, 1.0);
  else
  if (h < 5.0) rgb = vec3(h - 4.0, 0.0, 1.0);
  else
               rgb = vec3(1.0, 0.0, 6.0 - h);
  return (rgb * s_color + vec3(s_grey)) * l_color + vec3(l_white);
}

vec3 mw_hsl_bias(vec3 a, vec3 b)
{
  return vec3(mw_fast_rem(a.x + b.x, 8.0), a.y + b.y, a.z + b.z);
}

float mw_slx(float x0, float y0)
{
  float x = atan(x0) / float(M_PI) + 0.5;
  float y = atan(y0) / float(M_PI) + 0.5;
  if (x == 0.0) return 0.0;
  if (y == 0.0) return 0.0;
  if (x == 1.0) return 1.0;
  if (y == 1.0) return 1.0;
  float z = 1.0 - 1.0 / (1.0 + (1.0 / (1.0 - x) - 1.0) * (1.0 / (1.0 - y) - 1.0));
  return tan(float(M_PI) * (clamp(z, 0.0, 1.0) - 0.5));
}

vec3 mw_hsl_bias_ufcompat(vec3 a, vec3 b)
{
  return vec3(mw_fast_rem(a.x + b.x, 8.0), mw_slx(a.y, b.y), mw_slx(a.z, b.z));
}

vec3 mw_rgb_to_hsl2(vec3 rgb)
{
  float small = min(min(rgb.r, rgb.g), rgb.b);
  float large = max(max(rgb.r, rgb.g), rgb.b);
  if (large == 0.0) return vec3(0.0, 0.0, -1.0 / 0.0);
  if (small == 1.0) return vec3(0.0, 0.0,  1.0 / 0.0);
  float l = (small + large) / 2.0;
  float ll = 1.0 - 2.0 * abs(l - 0.5);
  float s = clamp((large - small) / ll, 0.0, 1.0);
  vec3 rgbs = rgb - vec3(small);
  float sat = tan(float(M_PI) * (s - 0.5));
  float lum = tan(float(M_PI) * (l - 0.5));
  float h;
  if (small == rgb.r) h = 2.0 + mw_huefrac(rgbs.g, rgbs.b);
  else
  if (small == rgb.g) h = 3.0 + mw_huefrac(rgbs.b, rgbs.r);
  else
  /*if (small == rgb.b)*/ h = 0.0 + mw_huefrac(rgbs.r, rgbs.g);
  float hue = 4.0 / 3.0 * mw_fast_rem(h, 6.0);
  return vec3(hue, sat, lum);
}

vec3 mw_hsl_to_rgb2(vec3 hsl)
{
  float h = hsl.x / (4.0 / 3.0);
  float s_color = atan(hsl.y) / float(M_PI) + 0.5;
  float s_grey = 0.5 * (1.0 - s_color);
  float l_color0 = atan(hsl.z) / float(M_PI);
  float lca = abs(l_color0);
  float l_white = l_color0 + lca;
  float l_color = 1.0 - 2.0 * lca;
  vec3 rgb;
  if (h < 1.0) rgb = vec3(1.0, h, 0.0);
  else
  if (h < 2.0) rgb = vec3(2.0 - h, 1.0, 0.0);
  else
  if (h < 3.0) rgb = vec3(0.0, 1.0, h - 2.0);
  else
  if (h < 4.0) rgb = vec3(0.0, 4.0 - h, 1.0);
  else
  if (h < 5.0) rgb = vec3(h - 4.0, 0.0, 1.0);
  else
               rgb = vec3(1.0, 0.0, 6.0 - h);
  return (rgb * s_color + vec3(s_grey)) * l_color + vec3(l_white);
}

vec3 mw_tricubic_gradient_rgb_np(vec3[4] rgb, float fval0)
{
  float numc = 4.0;
  int bi = int(floor(mw_fast_rem(fval0 * numc, numc)));
  int ai = int(floor(mw_fast_rem(float(bi - 1), numc)));
  int ci = int(floor(mw_fast_rem(float(bi + 1), numc)));
  int di = int(floor(mw_fast_rem(float(ci + 1), numc)));
  float fval = mw_fast_rem(fval0, 1.0 / numc) * numc;
  vec3 a  = rgb[ai];
  vec3 p0 = rgb[bi];
  vec3 p1 = rgb[ci];
  vec3 d  = rgb[di];
  vec3 m0 = (p1 - a) / 2.0;
  vec3 m1 = (d - p0) / 2.0;
  float ffval = fval * fval;
  float ffval3 = 3.0 * ffval;
  float fffval = fval * ffval;
  float fffval2 = 2.0 * fffval;
  float fa = 1.0 + fffval2 - ffval3;
  float fb = fffval - 2.0 * ffval + fval;
  float fc = ffval3 - fffval2;
  float fd = fffval - ffval;
  return fa * p0 + fb * m0 + fc * p1 + fd * m1;
}

vec3 mw_meta_tricubic_gradient_rgb(vec3[4][4] rgb, float period1, float period2, float fval)
{
  float fval1 = mw_fast_rem(fval, period1) / period1;
  float fval2 = mw_fast_rem(fval, period2) / period2;
  vec3[4] rgb1 = vec3[4]
    ( mw_tricubic_gradient_rgb_np(rgb[0], fval1)
    , mw_tricubic_gradient_rgb_np(rgb[1], fval1)
    , mw_tricubic_gradient_rgb_np(rgb[2], fval1)
    , mw_tricubic_gradient_rgb_np(rgb[3], fval1)
    );
  return mw_tricubic_gradient_rgb_np(rgb1, fval2);
}

#group MultiWave

uniform float Wave1Period; slider[1.0e-3,1.0,1.0e+10] Logarithmic
uniform vec3 Wave1Colour1; color[1.0,0.0,0.0]
uniform vec3 Wave1Colour2; color[1.0,1.0,0.0]
uniform vec3 Wave1Colour3; color[0.0,0.5,0.0]
uniform vec3 Wave1Colour4; color[0.0,0.0,1.0]

uniform float Wave2Period; slider[1.0e-3,10.0,1.0e+10] Logarithmic
uniform vec3 Wave2Colour1; color[1.0,0.0,0.0]
uniform vec3 Wave2Colour2; color[1.0,1.0,0.0]
uniform vec3 Wave2Colour3; color[0.0,0.5,0.0]
uniform vec3 Wave2Colour4; color[0.0,0.0,1.0]

uniform float Wave3Period; slider[1.0e-3,100.0,1.0e+10] Logarithmic
uniform vec3 Wave3Colour1; color[1.0,0.0,0.0]
uniform vec3 Wave3Colour2; color[1.0,1.0,0.0]
uniform vec3 Wave3Colour3; color[0.0,0.5,0.0]
uniform vec3 Wave3Colour4; color[0.0,0.0,1.0]

uniform float Wave4Period; slider[1.0e-3,1000.0,1.0e+10] Logarithmic
uniform vec3 Wave4Colour1; color[1.0,0.0,0.0]
uniform vec3 Wave4Colour2; color[1.0,1.0,0.0]
uniform vec3 Wave4Colour3; color[0.0,0.5,0.0]
uniform vec3 Wave4Colour4; color[0.0,0.0,1.0]

uniform vec3 InteriorColour; color[0.0,0.0,0.0]

vec3 multiwave(float n)
{
  if (n == 1.0 / 0.0) return InteriorColour;
  vec3 hsl1 = mw_rgb_to_hsl(mw_tricubic_gradient_rgb_np(vec3[4](Wave1Colour1, Wave1Colour2, Wave1Colour3, Wave1Colour4),  mw_fast_rem(n, Wave1Period) / Wave1Period));
  vec3 hsl2 = mw_rgb_to_hsl(mw_tricubic_gradient_rgb_np(vec3[4](Wave2Colour1, Wave2Colour2, Wave2Colour3, Wave2Colour4),  mw_fast_rem(n, Wave2Period) / Wave2Period));
  vec3 hsl3 = mw_rgb_to_hsl(mw_tricubic_gradient_rgb_np(vec3[4](Wave3Colour1, Wave3Colour2, Wave3Colour3, Wave3Colour4),  mw_fast_rem(n, Wave3Period) / Wave3Period));
  vec3 hsl4 = mw_rgb_to_hsl(mw_tricubic_gradient_rgb_np(vec3[4](Wave4Colour1, Wave4Colour2, Wave4Colour3, Wave4Colour4),  mw_fast_rem(n, Wave4Period) / Wave4Period));
  return mw_hsl_to_rgb(mw_hsl_bias(hsl1, mw_hsl_bias(hsl2, mw_hsl_bias(hsl3, hsl4))));
}
