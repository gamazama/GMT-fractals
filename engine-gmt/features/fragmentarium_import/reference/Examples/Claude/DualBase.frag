#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Dual number template implementation file.
*/

struct DUAL
{
	MONO x;
	MONO d[DDIM];
};

DUAL dual(MONO x)
{
  DUAL d;
	d.x = x;
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mono(0);
	}
	return d;
}

DUAL dual(MONO x, int dim)
{
	DUAL d = dual(x);
	d.d[dim] = mono(1);
	return d;
}

DUAL dual(int x)
{
  DUAL d;
	d.x = mono(x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mono(0);
	}
	return d;
}

DUAL add(MONO x, DUAL y)
{
	DUAL d;
	d.x = add(x, y.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = y.d[i];
	}
	return d;
}

DUAL add(DUAL x, MONO y)
{
	DUAL d;
	d.x = add(x.x, y);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = x.d[i];
	}
	return d;
}

DUAL add(DUAL x, DUAL y)
{
	DUAL d;
	d.x = add(x.x, y.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = add(x.d[i], y.d[i]);
	}
	return d;
}

DUAL sub(MONO x, DUAL y)
{
	DUAL d;
	d.x = sub(x, y.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = neg(y.d[i]);
	}
	return d;
}

DUAL sub(DUAL x, MONO y)
{
	DUAL d;
	d.x = sub(x.x, y);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = x.d[i];
	}
	return d;
}

DUAL sub(DUAL x, DUAL y)
{
	DUAL d;
	d.x = sub(x.x, y.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = sub(x.d[i], y.d[i]);
	}
	return d;
}

DUAL neg(DUAL x)
{
	DUAL d;
	d.x = neg(x.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = neg(x.d[i]);
	}
	return d;
}

DUAL mul(MONO x, DUAL y)
{
	DUAL d;
	d.x = mul(x, y.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(x, y.d[i]);
	}
	return d;
}

DUAL mul(DUAL x, MONO y)
{
	DUAL d;
	d.x = mul(x.x, y);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(x.d[i], y);
	}
	return d;
}

DUAL mul(DUAL x, DUAL y)
{
	DUAL d;
	d.x = mul(x.x, y.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = add(mul(x.x, y.d[i]), mul(x.d[i], y.x));
	}
	return d;
}

DUAL sqr(DUAL x)
{
	DUAL d;
	d.x = sqr(x.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(mono(2), mul(x.x, x.d[i]));
	}
	return d;
}

DUAL div(MONO x, DUAL y)
{
	DUAL d;
	MONO s = inv(y.x);
	MONO ns2 = neg(sqr(s));
	d.x = mul(x, s);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(mul(x, y.d[i]), ns2);
	}
	return d;
}

DUAL div(DUAL x, MONO y)
{
	DUAL d;
	MONO s = inv(y);
	d.x = mul(x.x, s);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(x.d[i], s);
	}
	return d;
}

DUAL div(DUAL x, DUAL y)
{
	DUAL d;
	MONO s = inv(y.x);
	MONO s2 = sqr(s);
	d.x = mul(x.x, s);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(sub(mul(x.d[i], y.x), mul(x.x, y.d[i])), s2);
	}
	return d;
}

DUAL pow(DUAL x, MONO y)
{
	DUAL d;
	MONO s = mul(pow(x.x, sub(y, mono(1))), y);
	d.x = pow(x.x, y);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(x.d[i], s);
	}
	return d;
}

DUAL sqrt(DUAL x)
{
	DUAL d;
	d.x = sqrt(x.x);
	MONO s = inv(mul(mono(2), d.x));
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(x.d[i], s);
	}
	return d;
}

DUAL sin(DUAL x)
{
	DUAL d;
	d.x = sin(x.x);
	MONO s = cos(d.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(x.d[i], s);
	}
	return d;
}

DUAL cos(DUAL x)
{
	DUAL d;
	d.x = cos(x.x);
	MONO s = neg(sin(d.x));
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(x.d[i], s);
	}
	return d;
}

DUAL tan(DUAL x)
{
	DUAL d;
	d.x = tan(x.x);
	MONO s = inv(sqr(cos(x.x)));
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(x.d[i], s);
	}
	return d;
}

DUAL atan(DUAL y, DUAL x)
{
	DUAL d;
	if (eq(x.x, mono(0)) && eq(y.x, mono(0)))
	{
		return dual(mono(0));
	}
	d.x = atan(y.x, x.x);
	MONO s = inv(add(sqr(x.x), sqr(y.x)));
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(sub(mul(x.x, y.d[i]), mul(y.x, x.d[i])), s);
	}
	return d;
}

DUAL exp(DUAL x)
{
	DUAL d;
	d.x = exp(x.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = mul(d.x, x.d[i]);
	}
	return d;
}

DUAL log(DUAL x)
{
	DUAL d;
	d.x = log(x.x);
	for (int i = 0; i < DDIM; ++i)
	{
		d.d[i] = div(x.d[i], x.x);
	}
	return d;
}

DUAL sinh(DUAL z)
{
	return div(sub(exp(z), exp(neg(z))), mono(2));
}

DUAL cosh(DUAL z)
{
	return div(add(exp(z), exp(neg(z))), mono(2));
}

DUAL tanh(DUAL z) {
  return div(sinh(z), cosh(z));
}


#if 0 // TODO inverse trig for dual

VEC4 cAsin(VEC4 z) {
  const COMPLEX I = complex(0.0, 1.0);
  return cMul(-I, cLog(cMul(I, z) + cSqrt(cSub(1.0, cSqr(z)))));
}

VEC4 cAcos(VEC4 z) {
  const COMPLEX I = complex(0.0, 1.0);
  return cMul(-I, cLog(z + cMul(I, cSqrt(cSub(1.0, cSqr(z))))));
}

VEC4 cAtan(VEC4 z) {
  const COMPLEX I = complex(0.0, 1.0);
  return cDiv
    ( cLog(add(1.0, cMul(I, z))) - cLog(cSub(1.0, cMul(I, z)))
    , 2.0 * I
    );
}

VEC4 cAsinh(VEC4 z) {
  return cLog(z + cSqrt(add(cSqr(z), 1.0)));
}

VEC4 cAcosh(VEC4 z) {
  return 2.0 *
    cLog(cSqrt(0.5 * add(z, 1.0)) + cSqrt(0.5 * cSub(z, 1.0)));
}

VEC4 cAtanh(VEC4 z) {
  return 0.5 * (cLog(add(1.0, z)) - cLog(cSub(1.0, z)));
}

#endif

DUAL abs(DUAL x)
{
	if (lt(x.x, mono(0)))
	{
		return neg(x);
	}
	else
	{
		return x;
	}
}

bool lt(DUAL x, DUAL y)
{
	return lt(x.x, y.x);
}

bool lt(DUAL x, MONO y)
{
	return lt(x.x, y);
}

bool lt(MONO x, DUAL y)
{
	return lt(x, y.x);
}

MONO value(DUAL x)
{
	return x.x;
}
