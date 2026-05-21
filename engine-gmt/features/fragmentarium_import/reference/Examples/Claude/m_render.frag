#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// mandelbrot-numerics -- numerical algorithms related to the Mandelbrot set
// Copyright (C) 2015-2020 Claude Heiland-Allen
// License GPL3+ http://www.gnu.org/licenses/gpl.html

struct m_mandelbrot
{
  int dwell;
  int atom_domain;
  int misiurewicz_domain;
  float smooth_dwell;
  float final_angle;
  float interior_distance_estimate;
  Complexf exterior_distance_estimate;
  Complexf atom_domain_coordinate;
  Complexf misiurewicz_domain_coordinate;
};

#define MANDELBROT(var) \
  for (; i < Iterations;) \
  { \
    if (i >= MisiurewiczPeriod) \
    { \
      w = add(sqr(w), c); \
    } \
    z = add(sqr(z), var(c)); \
    ++i; \
    if (norm(z.x) < norm(a)) \
    { \
      r.atom_domain = i; \
      r.atom_domain_coordinate = complexf(div(z.x, a)); \
      a = z.x; \
      if (! (length(r.interior_distance_estimate) > 0.0)) \
      { \
        w0 = z.x; \
        m_attractor(w0, w0, c, i, 16); \
        w1 = var(w0); \
        for (int j = 0; j < i; ++j) \
          w1 = add(sqr(w1), c); \
        if (norm(w1.d[0]) <= 1.0) \
          r.interior_distance_estimate = float(m_interior_de(w0, c, i) / pixel_spacing); \
      } \
    } \
    if (i > MisiurewiczPeriod && norm(sub(z.x, w)) < norm(m)) \
    { \
      r.misiurewicz_domain = i; \
      r.misiurewicz_domain_coordinate = complexf(div(sub(z.x, w), length(m))); \
      m = sub(z.x, w); \
    } \
    if (! (norm(z.x) < EscapeRadius2)) break; \
  } \
  if (! (norm(z.x) < EscapeRadius2)) \
  { \
    r.dwell = i; \
    r.smooth_dwell = 1.0 - log2(log(length(complexf(z.x))) / log(sqrt(EscapeRadius2))); \
    r.final_angle = fract(degrees(arg(complexf(z.x))) / 360.0); \
    r.exterior_distance_estimate = div(mul(complexf(z.x), log(length(complexf(z.x)))), complexf(mul(z.d[0], pixel_spacing))); \
  } \
  return r;

Dual1cf var1cf(Complexf x)
{
  return dual1cf(x, 0);
}

m_mandelbrot m_render(Complexf c, float pixel_spacing, int Iterations, float EscapeRadius2, int MisiurewiczPeriod)
{
  m_mandelbrot r = m_mandelbrot(0, 0, 0, 1.0 / 0.0, 0.0, 0.0, complexf(vec2(0.0 / 0.0)), complexf(vec2(0.0 / 0.0)), complexf(vec2(0.0 / 0.0)));
  int i = 0;
  Dual1cf z = dual1cf(complexf(0.0));
  Complexf w = complexf(0.0);
  Complexf a = complexf(4.0, 0.0);
  Complexf m = complexf(4.0, 0.0);
  Complexf w0 = complexf(0.0);
  Dual1cf w1 = dual1cf(complexf(0.0));
  MANDELBROT(var1cf)
}

#if __VERSION__ >= 400

Dual1cd var1cd(Complexd x)
{
  return dual1cd(x, 0);
}

m_mandelbrot m_render(Complexd c, float pixel_spacing, int Iterations, float EscapeRadius2, int MisiurewiczPeriod)
{
  m_mandelbrot r = m_mandelbrot(0, 0, 0, 1.0 / 0.0, 0.0, 0.0, complexf(vec2(0.0 / 0.0)), complexf(vec2(0.0 / 0.0)), complexf(vec2(0.0 / 0.0)));
  int i = 0;
  Dual1cd z = dual1cd(complexd(0.0));
  Complexd w = complexd(0.0);
  Complexd a = complexd(4.0, 0.0);
  Complexd m = complexd(4.0, 0.0);
  Complexd w0 = complexd(0.0);
  Dual1cd w1 = dual1cd(complexd(0.0));
  MANDELBROT(var1cd)
}

#endif

#undef MANDELBROT

