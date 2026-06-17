#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Complex number template implementation file.
*/

struct COMPLEX
{
  REAL x, y;
};

COMPLEX complex(int x)
{
  return COMPLEX(real(x), real(0));
}

COMPLEX complex(REAL x)
{
  return COMPLEX(x, real(0));
}

COMPLEX complex(COMPLEX x)
{
  return x;
}

COMPLEX complex(REAL x, REAL y)
{
  return COMPLEX(x, y);
}

// Based on the file distributed with FragM 2.5.3

// this file is intended to be included by Complex.frag

/*----------------------------------------------------------------

REAL functions not present in early GLSL versions:
  cosh, sinh, tanh

complex number functions:
  add, sub, conj, norm, abs, arg, sqr, mul, inverse, div, sqrt, exp, log, pow,
  sin, cos, tan, sinh, cosh, tanh, asin, acos, atan, asinh, acosh, atanh

dual complex number functions for automatic differentiation:
  const, var, deriv,
  add, sub, norm, abs, arg, sqr, mul, inverse, div, sqrt, exp, log, pow,
  sin, cos, tan, sinh, cosh, tanh, asin, acos, atan, asinh, acosh, atanh

some implementations taken from release 4.10 of the Linux man-pages project.

NOTE:
  some implementations have changed since previous versions, you can...
  #define USE_COMPLEX_1_0_31
  ...before...
  #include "Complex.frag"
  ...to use the earlier version's code (but try to fix the frags that
  depend on the older behaviour before resorting to this).

TODO:
  check extensions as well as version for double support
  test suite
  examples
  optimisations

  add proper credits ;)

  The new functions have been added by Claude @ FF

----------------------------------------------------------------*/

//----------------------------------------------------------------
// complex number functions

COMPLEX add(COMPLEX a, REAL s)
{
  return complex(add(a.x, s), a.y);
}

COMPLEX add(REAL s, COMPLEX a)
{
  return complex(add(s, a.x), a.y);
}

COMPLEX add(COMPLEX a, COMPLEX s)
{
  return complex(add(a.x, s.x), add(a.y, s.y));
}

COMPLEX sub(COMPLEX a, REAL s)
{
  return complex(sub(a.x, s), a.y);
}

COMPLEX sub(REAL s, COMPLEX a)
{
  return complex(sub(s, a.x), neg(a.y));
}

COMPLEX sub(COMPLEX a, COMPLEX s)
{
  return complex(sub(a.x, s.x), sub(a.y, s.y));
}

COMPLEX mul(COMPLEX a, REAL s)
{
  return complex(mul(a.x, s), mul(a.y, s));
}

COMPLEX mul(REAL s, COMPLEX a)
{
  return complex(mul(s, a.x), mul(s, a.y));
}

COMPLEX conj(COMPLEX z)
{
  return complex(z.x, neg(z.y));
}

COMPLEX neg(COMPLEX z)
{
  return complex(neg(z.x), neg(z.y));
}

REAL norm(COMPLEX z)
{
  return add(sqr(z.x), sqr(z.y));
}

REAL length(COMPLEX z)
{
  return sqrt(norm(z));
}

REAL arg(COMPLEX a)
{
  return atan(a.y, a.x);
}

COMPLEX sqr(COMPLEX z)
{
  return complex(sub(sqr(z.x), sqr(z.y)), mul(real(2), mul(z.x, z.y)));
}

COMPLEX mul(COMPLEX a, COMPLEX b)
{
  return complex(sub(mul(a.x, b.x), mul(a.y, b.y)), add(mul(a.x, b.y), mul(a.y, b.x)));
}

COMPLEX div(COMPLEX a, REAL b)
{
  return complex(div(a.x, b), div(a.y, b));
}

COMPLEX inv(COMPLEX a) {
  return div(conj(a), norm(a));
}

COMPLEX div(COMPLEX a, COMPLEX b)
{
  return mul(a, inv(b));
}

COMPLEX div(REAL a, COMPLEX b)
{
  return mul(a, inv(b));
}

COMPLEX sqrt(COMPLEX z)
{
  REAL m = length(z);
  REAL x = sqrt(max(real(0), mul(real(0.5), add(m, z.x))));
  REAL y = sqrt(max(real(0), mul(real(0.5), sub(m, z.x))));
  return complex(x, mul(sign(z.y), y));
}

COMPLEX exp(COMPLEX z)
{
  return mul(exp(z.x), complex(cos(z.y), sin(z.y)));
}

COMPLEX log(COMPLEX a)
{
  return complex(log(length(a)), arg(a));
}

COMPLEX pow(COMPLEX z, COMPLEX a)
{
  return exp(mul(log(z), a));
}

COMPLEX pow(COMPLEX z, REAL a)
{
  return exp(mul(log(z), a));
}

COMPLEX pow(COMPLEX a, int n)
{
  if (n == 0)
  {
    return complex(real(1), real(0));
  }
  COMPLEX p = a;
  for (int m = 2; m <= abs(n); ++m)
  {
    p = mul(p, a);
  }
  if (n < 0)
  {
    p = inv(p);
  }
  return p;
}

COMPLEX sin(COMPLEX z)
{
  return complex(mul(sin(z.x), cosh(z.y)), mul(cos(z.x), sinh(z.y)));
}

COMPLEX cos(COMPLEX z)
{
  return complex(mul(cos(z.x), cosh(z.y)), neg(mul(sin(z.x), sinh(z.y))));
}

COMPLEX tan(COMPLEX z)
{
  return div(sin(z), cos(z));
}

COMPLEX sinh(COMPLEX z)
{
  return mul(real(0.5), sub(exp(z), exp(neg(z)))); // FIXME expm1 would improve accuracy near 0
}

COMPLEX cosh(COMPLEX z)
{
  return mul(real(0.5), add(exp(z), exp(neg(z))));
}

COMPLEX tanh(COMPLEX z)
{
  return div(sinh(z), cosh(z));
}

COMPLEX asin(COMPLEX z)
{
  COMPLEX I = complex(real(0), real(1));
  return mul(neg(I), log(add(mul(I, z), sqrt(sub(real(1), sqr(z))))));
}

COMPLEX acos(COMPLEX z)
{
  COMPLEX I = complex(real(0), real(1));
  return mul(neg(I), log(add(z, mul(I, sqrt(sub(real(1), sqr(z)))))));
}

COMPLEX atan(COMPLEX z)
{
  COMPLEX I = complex(real(0), real(1));
  return div
    ( sub(log(add(real(1), mul(I, z))), log(sub(real(1), mul(I, z))))
    , mul(real(2), I)
    );
}

COMPLEX asinh(COMPLEX z)
{
  return log(add(z, sqrt(add(sqr(z), real(1)))));
}

COMPLEX acosh(COMPLEX z)
{
  return mul(real(2), log(sqrt(add
    ( mul(real(0.5), add(z, real(1)))
    , sqrt(mul(real(0.5), sub(z, real(1)))))
    )));
}

COMPLEX atanh(COMPLEX z)
{
  return mul(real(0.5), sub(log(add(real(1), z)), log(sub(real(1), z))));
}


COMPLEX atan(COMPLEX a, COMPLEX b)
{
  return atan(div(a, b)); // FIXME correct?
}

bool eq(COMPLEX a, COMPLEX b)
{
  return eq(a.x, b.x) && eq(a.y, b.y);
}

bool lt(COMPLEX a, COMPLEX b)
{
  return lt(a.x, b.x); // FIXME incorrect, but need a definition...
}

REAL distance(COMPLEX a, COMPLEX b)
{
  return length(sub(a, b));
}

COMPLEX normalize(COMPLEX a)
{
  return div(a, length(a));
}

COMPLEX proj(COMPLEX z)
{
  if (isnan(z.x) || isinf(z.x) || isnan(z.y) || isinf(z.y))
    return complex(real(1.0 / 0.0), real(0.0));
  return z;
}
