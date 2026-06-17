#version 460 compatibility
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D Mandelbrot set numerical colouring algorithms (including exterior DE texture)

#define providesDouble
#include "TwoD.frag"
#include "MandelbrotNumerics.frag"

// http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

#group Mandelbrot

uniform int Iterations; slider[0,100,100000]
uniform int NewtonIterations; slider[1,10,100]
uniform int MisiurewiczPrePeriod; slider[0,1,100]
uniform int MisiurewiczPeriod; slider[1,1,100]
uniform float EscapeRadius; slider[0.0,16,100.0]
uniform int Power; slider[2,2,16]

uniform sampler2D TextureDE; file[...]
#TexParameter Strip GL_TEXTURE_MAX_LEVEL 1000
#TexParameter Strip GL_TEXTURE_MIN_FILTER GL_LINEAR_MIPMAP_LINEAR
#TexParameter Strip GL_TEXTURE_WRAP_S GL_CLAMP_TO_EDGE
#TexParameter Strip GL_TEXTURE_WRAP_T GL_CLAMP_TO_EDGE

float EscapeRadius2 = pow(2.0, float(EscapeRadius));

vec2 vec(Complexf z)
{
  return vec2(z.x, z.y);
}

vec3 shade(m_mandelbrot r, m_newton s00, m_newton s01, m_newton s10, m_newton s11, float pixel_spacing)
{
  m_newton s = s00;
  float nde = float(distance(s00.droot, s11.droot) + distance(s01.droot, s10.droot)) / pixel_spacing;
  int ad = r.atom_domain;
  Complexf adc = r.atom_domain_coordinate;
  int md = r.misiurewicz_domain;
  Complexf mdc = r.misiurewicz_domain_coordinate;
  float as = ad > 0 ? 1.0 - norm(adc) : 0.0;
  float ms = md > MisiurewiczPrePeriod ? 1.0 - norm(mdc) : 0.0;
  if (isnan(ms) || isinf(ms)) ms = 0.0;
  vec3 ah = hsv2rgb(vec3(fract(degrees(atan(adc.y, adc.x)) / 360.0), clamp(as, 0.0, 1.0), 1.0));
  vec3 mh = hsv2rgb(vec3(fract(degrees(atan(mdc.y, mdc.x)) / 360.0), clamp(ms, 0.0, 1.0), 1.0));
  if (! (mh == mh)) mh = vec3(1.0); // NaN check
  Complexf ede = r.exterior_distance_estimate;
  vec3 ede_h = texture(TextureDE, vec(add(div(ede, complexf(textureSize(TextureDE, 0))), complexf(vec2(0.5))))).rgb;
  float ide = r.interior_distance_estimate;
  vec3 ide_h = texture(TextureDE, vec2(ide) / textureSize(TextureDE, 0) + vec2(0.5)).rgb;
  bool grid = max(abs(r.smooth_dwell - 0.5), abs(r.final_angle - 0.5)) > 0.5 - 0.1 * pow(0.5, r.smooth_dwell);
  float ns = 1.0 / (1.0 + float(s.dwell) + s.smooth_dwell);
  if (isnan(ns) || isinf(ns)) ns = 0.0;
  float nv = 1.0 - 1.0 / nde;
  vec3 nh = hsv2rgb(vec3(fract(degrees(atan(s.droot.y, s.droot.x)) / 360.0), clamp(ns, 0.0, 1.0), clamp(nv, 0.0, 1.0)));
  if (! (nh == nh)) nh = vec3(1.0);
  return length(ede) > 0.0 ? ede_h : ide_h;//mh * tanh(clamp(4.0 * length(de), 0.0, 4.0)) * (grid ? 0.75 : 1.0);
}

#define mandelbrot(p,px) m_render(p,px,Iterations,EscapeRadius2,MisiurewiczPeriod)
#define newton(p,px) m_newton_misiurewicz(p,px,MisiurewiczPrePeriod,MisiurewiczPeriod,16)

vec3 color(dvec2 p, vec2 dx, vec2 dy)
{
  float px = length(vec4(dx, dy));  return shade(mandelbrot(complexd(p), px), newton(complexd(p), px), newton(complexd(p + dx), px), newton(complexd(p + dy), px), newton(complexd(p + dx + dy), px), px);
}

vec3 color(vec2 q, vec2 dx, vec2 dy)
{
  return color(dvec2(q), dx, dy);
}


#preset MisiurewizcDomains
Center = -1.7690802112116075,4.72813591022982e-03
Zoom = 2.0e5
#endpreset


#preset Inky
Zoom = 7.32678459e+10
ZoomFactor = 0
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Center = -1.76884617946146183,0.00349391939054990996
Jitter = 1
Samples = 1
Shutter = 0.01
TrigIter = 5
TrigLimit = 1.10000000000000009
Iterations = 669
MisiurewiczPrePeriod = 1
MisiurewiczPeriod = 1
EscapeRadius = 16
Power = 2
TextureDE = dot.png
NewtonIterations = 10
Exposure = 0
ShowHotPixels = false
#endpreset
