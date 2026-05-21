#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Triplex template implementation.
Ref: <http://www.bugman123.com/Hypercomplex/index.html#MandelbulbZ>
*/

struct TRIPLEX
{
  REAL x, y, z;
};

REAL dot(TRIPLEX a, TRIPLEX b)
{
  return add(add(mul(a.x, b.x), mul(a.y, b.y)), mul(a.z, b.z));
}

REAL norm(TRIPLEX a)
{
  return add(add(sqr(a.x), sqr(a.y)), sqr(a.z));
}

TRIPLEX add(TRIPLEX a, TRIPLEX b)
{
  TRIPLEX r;
  r.x = add(a.x, b.x);
  r.y = add(a.y, b.y);
  r.z = add(a.z, b.z);
  return r;
}

TRIPLEX sub(TRIPLEX a, TRIPLEX b)
{
  TRIPLEX r;
  r.x = sub(a.x, b.x);
  r.y = sub(a.y, b.y);
  r.z = sub(a.z, b.z);
  return r;
}

TRIPLEX mul(TRIPLEX a, TRIPLEX b)
{
  REAL arho = sqrt(add(sqr(a.x), sqr(a.y)));
  REAL brho = sqrt(add(sqr(b.x), sqr(b.y)));
  REAL A = sub(real(1), div(mul(a.z, b.z), mul(arho, brho)));
  TRIPLEX r;
  r.x = mul(A, sub(mul(a.x, b.x), mul(a.y, b.y)));
  r.y = mul(A, add(mul(b.x, a.y), mul(a.x, b.y)));
  r.z = add(mul(arho, b.z), mul(brho, a.z));
  return r;
}

TRIPLEX div(TRIPLEX a, REAL b)
{
  TRIPLEX r;
  r.x = div(a.x, b);
  r.y = div(a.y, b);
  r.z = div(a.z, b);
  return r;
}

TRIPLEX div(TRIPLEX a, TRIPLEX b)
{
  REAL arho = sqrt(add(sqr(a.x), sqr(a.y)));
  REAL brho = sqrt(add(sqr(b.x), sqr(b.y)));
  REAL A = add(real(1), div(mul(a.z, b.z), mul(arho, brho)));
  TRIPLEX r;
  r.x = mul(A, add(mul(a.x, b.x), mul(a.y, b.y)));
  r.y = mul(A, sub(mul(b.x, a.y), mul(a.x, b.y)));
  r.z = sub(mul(brho, a.z), mul(arho, b.z));
  return div(r, norm(b));
}

TRIPLEX sqr(TRIPLEX a)
{
  REAL x2 = sqr(a.x), y2 = sqr(a.y);
  REAL arho2 = add(x2, y2);
  REAL A = sub(real(1), div(sqr(a.z), arho2));
  TRIPLEX r;
  r.x = mul(A, sub(x2, y2));
  r.y = mul(A, mul(real(2), mul(a.x, a.y)));
  r.z = mul(mul(real(2), sqrt(arho2)), a.z);
  return r;
}
