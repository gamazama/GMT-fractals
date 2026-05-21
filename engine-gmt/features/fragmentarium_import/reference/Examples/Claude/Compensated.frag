#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// based on Debian's libqd-dev 2.3.22+dfsg.1-3

#group Compensated

// Hack to prevent unsafe maths optimizations in the GLSL compiler; must be 1
uniform int CompensatedHack; slider[1,1,1]
// Use IEEE vs Cray error bounds in Compensated2 addition
uniform bool Compensated2IEEEAdd; checkbox[true]

double EXACT(double x)
{
  return double(CompensatedHack) * x;
}

struct Compensated2
{
  double x[2];
};

Compensated2 compensated2(double x, double e)
{
  return Compensated2(double[2](x, e));
}

Compensated2 compensated2(double x)
{
  return compensated2(x, 0.0);
}

Compensated2 compensated2(dvec2 xe)
{
  return compensated2(xe.x, xe.y);
}

Compensated2 neg(Compensated2 v)
{
  return compensated2(-v.x[0], -v.x[1]);
}

bool lt(Compensated2 a, double b)
{
  return a.x[0] < b;
}

Compensated2 abs(Compensated2 v)
{
  return lt(v, 0.0) ? neg(v) : v;
}

/* Computes fl(a+b) and err(a+b).  Assumes |a| >= |b|. */
double quick_two_sum(double a, double b, out double err)
{
  double s = EXACT(a + b);
  err = EXACT(b - EXACT(s - a));
  return s;
}

/* Computes fl(a+b) and err(a+b).  */
double two_sum(double a, double b, out double err)
{
  double s = EXACT(a + b);
  double bb = EXACT(s - a);
  err = EXACT(EXACT(a - EXACT(s - bb)) + EXACT(b - bb));
  return s;
}

/* Computes fl(a*b) and err(a*b). */
double two_prod(double a, double b, out double err)
{
  double p = EXACT(a * b);
  err = EXACT(fma(a, b, -p));
  return p;
}
/* Computes fl(a*a) and err(a*a).  Faster than the above method. */
double two_sqr(double a, out double err)
{
  double p = EXACT(a * a);
  err = EXACT(fma(a, a, -p));
  return p;
}

Compensated2 add(Compensated2 a, double b)
{
  double s1, s2;
  s1 = two_sum(a.x[0], b, s2);
  s2 += a.x[1];
  s1 = quick_two_sum(s1, s2, s2);
  return compensated2(s1, s2);
}

Compensated2 add(double a, Compensated2 b)
{
  return add(b, a);
}

/* double-double += double-double */
Compensated2 add(Compensated2 me, Compensated2 a) {
  if (! Compensated2IEEEAdd)
  {
    double s, e;
    s = two_sum(me.x[0], a.x[0], e);
    e = EXACT(e + me.x[1]);
    e = EXACT(e + a.x[1]);
    me.x[0] = quick_two_sum(s, e, me.x[1]);
    return me;
  }
  else
  {
    double s1, s2, t1, t2;
    s1 = two_sum(me.x[0], a.x[0], s2);
    t1 = two_sum(me.x[1], a.x[1], t2);
    s2 = EXACT(s2 + t1);
    s1 = quick_two_sum(s1, s2, s2);
    s2 = EXACT(s2 + t2);
    me.x[0] = quick_two_sum(s1, s2, me.x[1]);
    return me;
  }
}

Compensated2 sub(Compensated2 a, Compensated2 b)
{
  return add(a, neg(b));
}

Compensated2 mul(Compensated2 a, double b)
{
  double p1, p2;
  p1 = two_prod(a.x[0], b, p2);
  p2 += EXACT(a.x[1] * b);
  p1 = quick_two_sum(p1, p2, p2);
  return compensated2(p1, p2);
}

Compensated2 mul(double a, Compensated2 b)
{
  return mul(b, a);
}

/* double-double * double-double */
Compensated2 mul(Compensated2 a, Compensated2 b)
{
  double p1, p2;
  p1 = two_prod(a.x[0], b.x[0], p2);
  p2 = EXACT(p2 + EXACT(EXACT(a.x[0] * b.x[1]) + EXACT(a.x[1] * b.x[0])));
  p1 = quick_two_sum(p1, p2, p2);
  return compensated2(p1, p2);
}

Compensated2 sqr(Compensated2 a)
{
  double p1, p2;
  double s1, s2;
  p1 = two_sqr(a.x[0], p2);
  p2 = EXACT(p2 + EXACT(2.0 * a.x[0] * a.x[1]));
  p2 = EXACT(p2 + EXACT(a.x[1] * a.x[1]));
  s1 = quick_two_sum(p1, p2, s2);
  return compensated2(s1, s2);
}

Compensated2 div(Compensated2 a, Compensated2 b) // FIXME inaccurate
{
  return compensated2(div(a.x[0], b.x[0]));
}

Compensated2 sqrt(Compensated2 a) // FIXME inaccurate
{
  return compensated2(sqrt(a.x[0]));
}

Compensated2 exp(Compensated2 a) // FIXME inaccurate
{
  return compensated2(exp(a.x[0]));
}

Compensated2 log(Compensated2 a) // FIXME inaccurate
{
  return compensated2(log(a.x[0]));
}

Compensated2 sin(Compensated2 a) // FIXME inaccurate
{
  return compensated2(sin(a.x[0]));
}

Compensated2 cos(Compensated2 a) // FIXME inaccurate
{
  return compensated2(cos(a.x[0]));
}

Compensated2 sinh(Compensated2 a) // FIXME inaccurate
{
  return compensated2(sinh(a.x[0]));
}

Compensated2 cosh(Compensated2 a) // FIXME inaccurate
{
  return compensated2(cosh(a.x[0]));
}

Compensated2 atan(Compensated2 a, Compensated2 b) // FIXME inaccurate
{
  return compensated2(atan(a.x[0], b.x[0]));
}

bool lt(Compensated2 a, Compensated2 b)
{
  if (lt(a.x[0], b.x[0])) return true;
  if (lt(b.x[0], a.x[0])) return false;
  return lt(a.x[1], b.x[1]);
}

Compensated2 min(Compensated2 a, Compensated2 b)
{
  return lt(a, b) ? a : b;
}

Compensated2 max(Compensated2 a, Compensated2 b)
{
  return lt(a, b) ? b : a;
}

Compensated2 sign(Compensated2 a)
{
  return compensated2(sign(a.x[0]));
}

bool eq(Compensated2 a, Compensated2 b)
{
  return a.x[0] == b.x[0] && a.x[1] == b.x[1];
}

bool isnan(Compensated2 a)
{
  return isnan(a.x[0]) || isnan(a.x[1]);
}

bool isinf(Compensated2 a)
{
  return isinf(a.x[0]) || isinf(a.x[1]);
}

#if 0

struct Vec2Compensated2
{
  Compensated2 x, y;
};

Vec2Compensated2 vec2compensated2(Compensated2 x, Compensated2 y)
{
  return Vec2Compensated2(x, y);
}

Vec2Compensated2 vec2compensated2(dvec2 x)
{
  return vec2compensated2(compensated2(x.x), compensated2(x.y));
}

Vec2Compensated2 add(dvec2 a, Vec2Compensated2 b)
{
  return vec2compensated2(add(a.x, b.x), add(a.y, b.y));
}

Vec2Compensated2 add(Vec2Compensated2 b, dvec2 a)
{
  return vec2compensated2(add(a.x, b.x), add(a.y, b.y));
}

Vec2Compensated2 add(Vec2Compensated2 a, Vec2Compensated2 b)
{
  return vec2compensated2(add(a.x, b.x), add(a.y, b.y));
}

Compensated2 dot(Vec2Compensated2 a, Vec2Compensated2 b)
{
  return add(mul(a.x, b.x), mul(a.y, b.y));
}

Compensated2 norm(Vec2Compensated2 a)
{
  return dot(a, a);
}

// Compensated2 length(Vec2Compensated2 a) { return sqrt(norm(a)); }

vec2 cMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
#if __VERSION__ >= 400
dvec2 cMul(dvec2 a, dvec2 b) { return dvec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
Vec2Compensated2 cMul(Vec2Compensated2 a, Vec2Compensated2 b) { return vec2compensated2(sub(mul(a.x, b.x), mul(a.y, b.y)), add(mul(a.x, b.y), mul(a.y, b.x))); }
#endif

vec2 cPow(vec2 a, int n)
{
  // assert(n >= 1);
  vec2 p = a;
  for (int m = 2; m <= n; ++m)
  {
    p = cMul(p, a);
  }
  return p;
}
#if __VERSION__ >= 400
dvec2 cPow(dvec2 a, int n)
{
  // assert(n >= 1);
  dvec2 p = a;
  for (int m = 2; m <= n; ++m)
  {
    p = cMul(p, a);
  }
  return p;
}
Vec2Compensated2 cPow(Vec2Compensated2 a, int n)
{
  // assert(n >= 1);
  Vec2Compensated2 p = a;
  for (int m = 2; m <= n; ++m)
  {
    p = cMul(p, a);
  }
  return p;
}
#endif

#endif
