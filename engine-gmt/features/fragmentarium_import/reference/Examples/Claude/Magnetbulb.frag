#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Experimental Magnet-Mandelbrot bulb triplex fractal.
Type 1: z_{n+1} = [(z_n^2 + c-1) / (2z_n + c-2)]^2
*/

#define MAGNETBULB(TRIPLEX, VEC, real) \
void Magnetbulb1Triplex(inout VEC w, in VEC c) \
{ \
  TRIPLEX one = TRIPLEX(real(1), real(0), real(0)); \
  TRIPLEX two = TRIPLEX(real(2), real(0), real(0)); \
  TRIPLEX d = TRIPLEX(c.v[0], c.v[1], c.v[2]); \
  TRIPLEX z = TRIPLEX(w.v[0], w.v[1], w.v[2]); \
  z = sqr(div(add(sqr(z), sub(d, one)), add(add(z, z), sub(d, two)))); \
  w.v[0] = z.x; \
  w.v[1] = z.y; \
  w.v[2] = z.z; \
  w = add(w, c); \
}
#if __VERSION__ >= 400
MAGNETBULB(Triplexfx, Vec3fx, floatx)
#endif
MAGNETBULB(TriplexDual3f, Vec3Dual3f, dual3f)
#undef MAGNETBULB
