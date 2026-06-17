#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// mandelbrot-numerics -- numerical algorithms related to the Mandelbrot set
// Copyright (C) 2015-2020 Claude Heiland-Allen
// License GPL3+ http://www.gnu.org/licenses/gpl.html

#define M_NUCLEUS_FULL

int m_nucleus_simple_step(out Complexf c_out, Complexf c_guess, int period)
{
  Dual1cf z = dual1cf(complexf(0.0));
  Dual1cf c = dual1cf(c_guess, 0);
  for (int i = 0; i < period; ++i)
  {
    z = add(sqr(z), c);
  }
  Complexf c_new = sub(c_guess, div(z.x, z.d[0]));
  Complexf d = sub(c_new, c_guess);
  if (norm(d) <= 1.0e-10)
  {
    c_out = c_new;
    return 1;
  }
  if (norm(d) < 1.0 / 0.0)
  {
    c_out = c_new;
    return 0;
  }
  else
  {
    c_out = c_guess;
    return -1;
  }
}

int m_nucleus_simple(out Complexf c_out, Complexf c_guess, int period, int maxsteps)
{
  int result = -1;
  Complexf c = c_guess;
  for (int i = 0; i < maxsteps; ++i)
  {
    if (0 != (result = m_nucleus_simple_step(c, c, period)))
    {
      break;
    }
  }
  c_out = c;
  return result;
}

int m_nucleus_full_step(out Complexf c_out, Complexf c_guess, int period)
{
  Dual1cf z = dual1cf(complexf(0.0));
  Complexf h = complexf(1.0, 0.0);
  Complexf dh = complexf(0.0);
  Dual1cf c = dual1cf(c_guess, 0);
  for (int i = 1; i <= period; ++i)
  {
    z = add(sqr(z), c);
    // reject lower periods
    if (i < period && period % i == 0)
    {
      h = mul(h, z.x);
      dh = add(dh, div(z.d[0], z.x));
    }
  }
  // build function
  dh = mul(dh, h);
  Dual1cf hdh = dual1cf(h);
  hdh.d[0] = dh;
  Dual1cf f = div(z, hdh);
  // newton step
  Complexf c_new = sub(c_guess, div(f.x, f.d[0]));
  // check convergence
  Complexf d = sub(c_new, c_guess);
  if (norm(d) <= 1.0e-10)
  {
    c_out = c_new;
    return 1;
  }
  if (norm(d) < 1.0 / 0.0)
  {
    c_out = c_new;
    return 0;
  }
  else
  {
    c_out = c_guess;
    return -1;
  }
}

int m_nucleus_full(out Complexf c_out, Complexf c_guess, int period, int maxsteps)
{
  int result = -1;
  Complexf c = c_guess;
  for (int i = 0; i < maxsteps; ++i)
  {
    if (0 != (result = m_nucleus_full_step(c, c, period)))
    {
      break;
    }
  }
  c_out = c;
  return result;
}

#if __VERSION__ >= 400

int m_nucleus_simple_step(out Complexd c_out, Complexd c_guess, int period)
{
  Dual1cd z = dual1cd(complexd(0.0));
  Dual1cd c = dual1cd(c_guess, 0);
  for (int i = 0; i < period; ++i)
  {
    z = add(sqr(z), c);
  }
  Complexd c_new = sub(c_guess, div(z.x, z.d[0]));
  Complexd d = sub(c_new, c_guess);
  if (norm(d) <= 1.0e-24)
  {
    c_out = c_new;
    return 1;
  }
  if (norm(d) < 1.0 / 0.0)
  {
    c_out = c_new;
    return 0;
  }
  else
  {
    c_out = c_guess;
    return -1;
  }
}

int m_nucleus_simple(out Complexd c_out, Complexd c_guess, int period, int maxsteps)
{
  int result = -1;
  Complexd c = c_guess;
  for (int i = 0; i < maxsteps; ++i)
  {
    if (0 != (result = m_nucleus_simple_step(c, c, period)))
    {
      break;
    }
  }
  c_out = c;
  return result;
}

int m_nucleus_full_step(out Complexd c_out, Complexd c_guess, int period)
{
  Dual1cd z = dual1cd(complexd(0.0));
  Complexd h = complexd(1.0, 0.0);
  Complexd dh = complexd(0.0);
  Dual1cd c = dual1cd(c_guess, 0);
  for (int i = 1; i <= period; ++i)
  {
    z = add(sqr(z), c);
    // reject lower periods
    if (i < period && period % i == 0)
    {
      h = mul(h, z.x);
      dh = add(dh, div(z.d[0], z.x));
    }
  }
  // build function
  dh = mul(dh, h);
  Dual1cd hdh = dual1cd(h);
  hdh.d[0] = dh;
  Dual1cd f = div(z, hdh);
  // newton step
  Complexd c_new = sub(c_guess, div(f.x, f.d[0]));
  // check convergence
  Complexd d = sub(c_new, c_guess);
  if (norm(d) <= 1.0e-24)
  {
    c_out = c_new;
    return 1;
  }
  if (norm(d) < 1.0 / 0.0)
  {
    c_out = c_new;
    return 0;
  }
  else
  {
    c_out = c_guess;
    return -1;
  }
}

int m_nucleus_full(out Complexd c_out, Complexd c_guess, int period, int maxsteps)
{
  int result = -1;
  Complexd c = c_guess;
  for (int i = 0; i < maxsteps; ++i)
  {
    if (0 != (result = m_nucleus_full_step(c, c, period)))
    {
      break;
    }
  }
  c_out = c;
  return result;
}

#endif

#ifdef M_NUCLEUS_FULL
#define m_nucleus m_nucleus_full
#define m_nucleus_step m_nucleus_full_step
#else
#define m_nucleus m_nucleus_simple
#define m_nucleus_step m_nucleus_simple_step
#endif
