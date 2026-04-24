#donotrun
// (c) 2021 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// mandelbrot-numerics -- numerical algorithms related to the Mandelbrot set
// Copyright (C) 2015-2021 Claude Heiland-Allen
// License GPL3+ http://www.gnu.org/licenses/gpl.html

Complexf m_exray_in(int angle, int preperiod, int period, int newtonsteps, int sharpness, int steps)
{
  const float R = 16.0;
  float t = 2.0 * M_PI * turns(angle, preperiod, period);
  Complexf c = complexf(R * cos(t), R * sin(t));
  for (int s = 1; s <= steps; ++s)
  {
    // angle doubling
    if (preperiod > 0)
    {
      preperiod -= 1;
      angle &= (1 << (preperiod + period)) - 1;
    }
    else
    {
      angle = rotate(angle, period);
    }
    // sharpness steps per dwell band
    for (int r = 0; r < sharpness; ++r)
    {
      // Newton's method to find w s.t. f_c^p(w) = target
      float t = 2.0 * M_PI * turns(angle, preperiod, period);
      float RR = pow(R, pow(0.5, (float(r) + 0.5) / float(sharpness)));
      Dual1cf target = dual1cf(complexf(RR * cos(t), RR * sin(t)));
      for (int k = 0; k < newtonsteps; ++k)
      {
        Dual1cf e = dual1cf(c, 0);
        Dual1cf z = dual1cf(complexf(0.0, 0.0));
        for (int p = 0; p < s; ++p)
        {
          z = add(sqr(z), e);
        }
        z = sub(z, target);
        Complexf d = div(z.x, z.d[0]);
        float l = length(d);
        if (isnan(l) || isinf(l))
        {
          return c;
        }
        c = sub(c, d);
      }
    }
  }
  return c;
}
