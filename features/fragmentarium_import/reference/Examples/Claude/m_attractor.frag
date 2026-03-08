#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// mandelbrot-numerics -- numerical algorithms related to the Mandelbrot set
// Copyright (C) 2015-2020 Claude Heiland-Allen
// License GPL3+ http://www.gnu.org/licenses/gpl.html

int m_attractor_step(out Complexf z_out, Complexf z_guess, Complexf c, int period)
{
  Dual1cf w0 = dual1cf(z_guess, 0);
  Dual1cf w = w0;
  for (int i = 0; i < period; ++i)
  {
    w = add(sqr(w), c);
  }
  w = sub(w, w0);
  Complexf z_new = sub(z_guess, div(w.x, w.d[0]));
  Complexf d = sub(z_new, z_guess);
  if (norm(d) <= 1.0e-10)
  {
    z_out = z_new;
    return 1;
  }
  if (norm(d) < 1.0 / 0.0)
  {
    z_out = z_new;
    return 0;
  }
  else
  {
    z_out = z_guess;
    return -1;
  }
}

int m_attractor(out Complexf z_out, Complexf z_guess, Complexf c, int period, int maxsteps)
{
  int result = -1;
  Complexf z = z_guess;
  for (int i = 0; i < maxsteps; ++i)
  {
    if (0 != (result = m_attractor_step(z, z, c, period)))
    {
      break;
    }
  }
  z_out = z;
  return result;
}

#if __VERSION__ >= 400

int m_attractor_step(out Complexd z_out, Complexd z_guess, Complexd c, int period)
{
  Dual1cd w0 = dual1cd(z_guess, 0);
  Dual1cd w = w0;
  for (int i = 0; i < period; ++i)
  {
    w = add(sqr(w), c);
  }
  w = sub(w, w0);
  Complexd z_new = sub(z_guess, div(w.x, w.d[0]));
  Complexd d = sub(z_new, z_guess);
  if (norm(d) <= 1.0e-24)
  {
    z_out = z_new;
    return 1;
  }
  if (norm(d) < 1.0 / 0.0)
  {
    z_out = z_new;
    return 0;
  }
  else
  {
    z_out = z_guess;
    return -1;
  }
}

int m_attractor(out Complexd z_out, Complexd z_guess, Complexd c, int period, int maxsteps)
{
  int result = -1;
  Complexd z = z_guess;
  for (int i = 0; i < maxsteps; ++i)
  {
    if (0 != (result = m_attractor_step(z, z, c, period)))
    {
      break;
    }
  }
  z_out = z;
  return result;
}

#endif
