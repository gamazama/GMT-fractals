#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Complex number template instantiation file.
*/

#define REAL float
#define real float
#define COMPLEX Complexf
#define complex complexf
#include "ComplexBase.frag"
#undef complex
#undef COMPLEX
#undef real
#undef REAL

vec2 vec(Complexf z)
{
  return vec2(z.x, z.y);
}

#if __VERSION__ >= 400

#define REAL FloatX
#define real floatx
#define COMPLEX Complexfx
#define complex complexfx
#include "ComplexBase.frag"
#undef complex
#undef COMPLEX
#undef DDIM
#undef real
#undef REAL

#define REAL double
#define real double
#define COMPLEX Complexd
#define complex complexd
#include "ComplexBase.frag"
#undef complex
#undef COMPLEX
#undef real
#undef REAL

#define REAL DoubleX
#define real doublex
#define COMPLEX Complexdx
#define complex complexdx
#include "ComplexBase.frag"
#undef complex
#undef COMPLEX
#undef real
#undef REAL

#define REAL Compensated2
#define real compensated2
#define COMPLEX ComplexCompensated2
#define complex complexcompensated2
#include "ComplexBase.frag"
#undef complex
#undef COMPLEX
#undef real
#undef REAL

Complexf complexf(Complexd z)
{
  return complexf(float(z.x), float(z.y));
}

Complexd add(Complexd a, Complexf b)
{
  return complexd(add(a.x, b.x), add(a.y, b.y));
}

dvec2 vec(Complexd z)
{
  return dvec2(z.x, z.y);
}

#if 0 // TODO

#define REAL Compensated3
#define real compensated3
#define COMPLEX ComplexCompensated3
#define complex complexcompensated3
#include "ComplexBase.frag"
#undef complex
#undef COMPLEX
#undef real
#undef REAL

#define REAL Compensated4
#define real compensated4
#define COMPLEX ComplexCompensated4
#define complex complexcompensated4
#include "ComplexBase.frag"
#undef complex
#undef COMPLEX
#undef real
#undef REAL

#endif

#endif
