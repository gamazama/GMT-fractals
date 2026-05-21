#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Classic Menger sponge fractal.
Folding implementation from Mandelbulber2, credited to knighty.
*/

#define swap(T,a,b) do{ T t = a; a = b; b = t; }while(false)

#define MENGERSPONGE(VEC, REAL, real, SCALAR, scalar) \
void MengerSponge(inout VEC z, SCALAR scale) \
{ \
  /* z = abs(z); // hangs GPU, don't know why */ \
  z.v[0] = lt(z.v[0], scalar(0)) ? neg(z.v[0]) : z.v[0]; \
  z.v[1] = lt(z.v[1], scalar(0)) ? neg(z.v[1]) : z.v[1]; \
  z.v[2] = lt(z.v[2], scalar(0)) ? neg(z.v[2]) : z.v[2]; \
  if (lt(z.v[0], z.v[1])) swap(REAL, z.v[0], z.v[1]); \
  if (lt(z.v[0], z.v[2])) swap(REAL, z.v[0], z.v[2]); \
  if (lt(z.v[1], z.v[2])) swap(REAL, z.v[1], z.v[2]); \
  z = mul(z, real(scale)); \
  z.v[0] = sub(z.v[0], sub(scale, scalar(1))); \
  z.v[1] = sub(z.v[1], sub(scale, scalar(1))); \
  if (lt(scalar(1), z.v[2])) \
    z.v[2] = sub(z.v[2], sub(scale, scalar(1))); \
}
#if __VERSION__ >= 400
MENGERSPONGE(Vec3fx, FloatX, floatx, FloatX, floatx)
#endif
MENGERSPONGE(Vec3Dual3f, Dual3f, dual3f, float, float)
#undef MENGERSPONGE

#undef swap
