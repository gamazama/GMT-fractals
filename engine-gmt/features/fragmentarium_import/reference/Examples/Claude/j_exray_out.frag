#donotrun
// (c) 2021 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// mandelbrot-numerics -- numerical algorithms related to the Mandelbrot set
// Copyright (C) 2015-2021 Claude Heiland-Allen
// License GPL3+ http://www.gnu.org/licenses/gpl.html

float j_exray_out(Complexf z, Complexf c, int newtonsteps, int sharpness, int maxsteps)
{
  float R = 256.0;
  int dwell = -1;
  float t;
  float r;
  Complexf w = z, w1 = z;
  for (int s = 0; s <= maxsteps; ++s)
  {
    if (length(w) > R)
    {
      dwell = s;
      r = length(w);
      t = arg(w) / (2.0 * M_PI);
      t -= floor(t);
      break;
    }
    w = add(sqr(w), c);
  }
  if (dwell < 0)
  {
    return -1.0;
  }
  int n = dwell;
  for (int s = 0; s <= dwell * sharpness; ++s)
  {
    if (r > R * R)
    {
      float t0 = (t + 0.0) / 2.0;
      float t1 = (t + 1.0) / 2.0;
      if (length(sub(w1, complexf(r * cos(2.0 * M_PI * t0), r * sin(2.0 * M_PI * t0)))) <
          length(sub(w1, complexf(r * cos(2.0 * M_PI * t1), r * sin(2.0 * M_PI * t1)))))
      {
        t = t0;
      }
      else
      {
        t = t1;
      }
      r = sqrt(r);
      n -= 1;
      if (n == 0) break;
    }
    r *= pow(R, 1.0 / sharpness);
    Dual1cf target = dual1cf(complexf(r * cos(2.0 * M_PI * t), r * sin(2.0 * M_PI* t)));
    for (int j = 0; j < newtonsteps; ++j)
    {
      Dual1cf u = dual1cf(z, 0);
      for (int i = 0; i < n; ++i)
      {
        w1 = w;
        u = add(sqr(u), c);
        w = u.x;
      }
      u = sub(u, target);
      z = sub(z, div(u.x, u.d[0]));
    }
  }
  t = arg(z) / (2.0 * M_PI);
  t -= floor(t);
  return t;
}
