#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// mandelbrot-numerics -- numerical algorithms related to the Mandelbrot set
// Copyright (C) 2015-2020 Claude Heiland-Allen
// License GPL3+ http://www.gnu.org/licenses/gpl.html

struct m_newton
{
  Complexf droot;
  int dwell;
  float smooth_dwell;
};

m_newton m_newton_nucleus(Complexf c0, float pixel_spacing, int period, int steps)
{
  Complexf c = c0;
  Complexf root = c;
  m_nucleus(root, root, period, steps);
  float Threshold = pixel_spacing;
  m_newton s = m_newton(complexf(vec2(0.0 / 0.0)), 0, 0.0);
  for (int i = 0; i < steps; ++i)
  {
    Complexf r0 = c;
    Complexf r1;
    int ok = m_nucleus_step(r1, r0, period);
    if (ok == -1)
    {
      break;
    }
    if (distance(r0, r1) < Threshold)
    {
      s.droot = complexf(sub(root, c0));
      s.dwell = i;
      s.smooth_dwell = (log(Threshold)          - log(distance(r0, root)))
                     / (log(distance(r1, root)) - log(distance(r0, root)));
      break;
    }
    c = r1;
  }
  return s;
}

m_newton m_newton_misiurewicz(Complexf c0, float pixel_spacing, int preperiod, int period, int steps)
{
  Complexf c = c0;
  Complexf root = c;
  m_misiurewicz(root, root, preperiod, period, steps);
  float Threshold = pixel_spacing;
  m_newton s = m_newton(complexf(vec2(0.0 / 0.0)), 0, 0.0);
  for (int i = 0; i < steps; ++i)
  {
    Complexf r0 = c;
    Complexf r1;
    int ok = m_misiurewicz_step(r1, r0, preperiod, period);
    if (ok == -1)
    {
      break;
    }
    if (distance(r0, r1) < Threshold)
    {
      s.droot = complexf(sub(root, c0));
      s.dwell = i;
      s.smooth_dwell = (log(Threshold)          - log(distance(r0, root)))
                     / (log(distance(r1, root)) - log(distance(r0, root)));
      break;
    }
    c = r1;
  }
  return s;
}

#if __VERSION__ >= 400

m_newton m_newton_nucleus(Complexd c0, double pixel_spacing, int period, int steps)
{
  Complexd c = c0;
  Complexd root = c;
  m_nucleus(root, root, period, steps);
  double Threshold = pixel_spacing;
  m_newton s = m_newton(complexf(vec2(0.0 / 0.0)), 0, 0.0);
  for (int i = 0; i < steps; ++i)
  {
    Complexd r0 = c;
    Complexd r1;
    int ok = m_nucleus_step(r1, r0, period);
    if (ok == -1)
    {
      break;
    }
    if (distance(r1, root) < Threshold)
    {
      s.droot = complexf(sub(root, c0));
      s.dwell = i;
      s.smooth_dwell = float((log(Threshold) -    log(distance(r0, root)))
                     / (log(distance(r1, root)) - log(distance(r0, root))));
      break;
    }
    c = r1;
  }
  return s;
}

m_newton m_newton_misiurewicz(Complexd c0, double pixel_spacing, int preperiod, int period, int steps)
{
  Complexd c = c0;
  Complexd root = c;
  m_misiurewicz(root, root, preperiod, period, steps);
  double Threshold = pixel_spacing;
  m_newton s = m_newton(complexf(vec2(0.0 / 0.0)), 0, 0.0);
  for (int i = 0; i < steps; ++i)
  {
    Complexd r0 = c;
    Complexd r1;
    int ok = m_misiurewicz_step(r1, r0, preperiod, period);
    if (ok == -1)
    {
      break;
    }
    if (distance(r1, root) < Threshold)
    {
      s.droot = complexf(sub(root, c0));
      s.dwell = i;
      s.smooth_dwell = float((log(Threshold) -    log(distance(r0, root)))
                     / (log(distance(r1, root)) - log(distance(r0, root))));
      break;
    }
    c = r1;
  }
  return s;
}

#endif
