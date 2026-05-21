#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// mandelbrot-numerics -- numerical algorithms related to the Mandelbrot set
// Copyright (C) 2015-2020 Claude Heiland-Allen
// License GPL3+ http://www.gnu.org/licenses/gpl.html

float m_interior_de(Complexf w0, Complexf c, int period)
{
  Complexf z = w0;
  Complexf dz = complexf(1.0, 0.0);
  Complexf dc = complexf(0.0, 0.0);
  Complexf dzdz = complexf(0.0, 0.0);
  Complexf dcdz = complexf(0.0, 0.0);
  for (int i = 0; i < period; ++i)
  {
    dcdz = mul(2.0, add(mul(z, dcdz), mul(dz, dc)));
    dc = add(mul(2.0, mul(z, dc)), complexf(1.0, 0.0));
    dzdz = mul(2.0, add(mul(z, dzdz), sqr(dz)));
    dz = mul(2.0, mul(z, dz));
    z = add(sqr(z), c);
  }
  float d = (1.0 - norm(dz)) / length(add(dcdz, div(mul(dzdz, dc), sub(complexf(1.0, 0.0), dz))));
  return d;
}

#if __VERSION__ >= 400

double m_interior_de(Complexd w0, Complexd c, int period)
{
  Complexd z = w0;
  Complexd dz = complexd(1.0, 0.0);
  Complexd dc = complexd(0.0, 0.0);
  Complexd dzdz = complexd(0.0, 0.0);
  Complexd dcdz = complexd(0.0, 0.0);
  for (int i = 0; i < period; ++i)
  {
    dcdz = mul(2.0, add(mul(z, dcdz), mul(dz, dc)));
    dc = add(mul(2.0, mul(z, dc)), complexf(1.0, 0.0));
    dzdz = mul(2.0, add(mul(z, dzdz), sqr(dz)));
    dz = mul(2.0, mul(z, dz));
    z = add(sqr(z), c);
  }
  double d = (1.0 - norm(dz)) / length(add(dcdz, div(mul(dzdz, dc), sub(complexd(1.0, 0.0), dz))));
  return d;
}

#endif
