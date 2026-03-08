#donotrun
// (c) 2021 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// mandelbrot-numerics -- numerical algorithms related to the Mandelbrot set
// Copyright (C) 2015-2021 Claude Heiland-Allen
// License GPL3+ http://www.gnu.org/licenses/gpl.html

int rotate(int x, int bits)
{
  x <<= 1;
  x |= int(!!bool(x & (1 << bits)));
  x &= (1 << bits) - 1;
  return x;
}

float turns(int x, int preperiod, int period)
{
  return
    float(x >> period) / float((1 << preperiod)) +
    float(x & ((1 << period) - 1)) / float(((1 << period) - 1) << preperiod);
}
