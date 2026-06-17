#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Distance estimates for z -> a*z, z -> z^p, z -> a*z^p.
Client should implement `deFormula()` which does one iteration step.
At the first iteration `z = c`.
*/

void deFormula(inout Vec3Dual3f z, in Vec3Dual3f c);
void deFormula(inout Vec3fx z, in Vec3fx c);

#group DistanceEstimate
// Maximum number of times to iterate the formula
uniform int DEIterations; slider[0,100,10000]
// Stop iterating when bigger than this
uniform float DELog2EscapeRadius; slider[0,10,10000]
// Force using AValue for the `a` scaling, instead of autodetect
uniform bool DEOverrideA; checkbox[false]
// The `a` value in `z -> a z^p`
uniform float DEAValue; slider[0.001,1,1000]
// Force using PValue for the `p` scaling, instead of autodetect
uniform bool DEOverrideP; checkbox[false]
// The `p` value in `z -> a z^p`
uniform float DEPValue; slider[0.001,1,1000]
// Force rounding the `p` scaling to an integer
uniform bool DERoundPToInteger; checkbox[false]
// Scale calculated DE (may reduce overstepping)
uniform float DEScale; slider[0.0001,0.25,10]

FloatX DEEscapeRadius = exp2(floatx(DELog2EscapeRadius));
FloatX DEEscapeRadius2 = sqr(DEEscapeRadius);

float DistanceEstimate(vec3 pos, out vec3 normal)
{
  // iterate
  int n;
  Vec3Dual3f c;
  c.v[0] = dual3f(pos.x, 0);
  c.v[1] = dual3f(pos.y, 1);
  c.v[2] = dual3f(pos.z, 2);
  Vec3Dual3f z = c;
  for (n = 0; n < DEIterations; ++n)
  {
    if (! lt(dot(z, z).x, float(4)))
    {
      break;
    }
    deFormula(z, c);
  }
  // promote to FloatX
  // because after initial escape, values explode quickly
  Vec3fx cc;
  for (int i = 0; i < 3; ++i)
  {
    cc.v[i] = floatx(c.v[i].x);
  }
  Vec3fx zz;
  for (int i = 0; i < 3; ++i)
  {
    zz.v[i] = floatx(z.v[i].x);
  }
  // iterate some more
  for (; n < DEIterations; ++n)
  {
    if (! lt(dot(zz, zz), DEEscapeRadius2))
    {
      break;
    }
    deFormula(zz, cc);
  }
  // get last 3 iterates
  FloatX z0 = length(zz);
  // iterate 2 more times for estimates of scaling
  deFormula(zz, cc);
  FloatX z1 = length(zz);
  deFormula(zz, cc);
  FloatX z2 = length(zz);
  // compute derivative and normal
  FloatX Z = floatx(sqrt(dot(z, z).x));
  FloatX u[3];
  u[0] = floatx(z.v[0].x);
  u[1] = floatx(z.v[1].x);
  u[2] = floatx(z.v[2].x);
  {
    // normalize u
    FloatX s = floatx(0);
    for (int i = 0; i < 3; ++i)
    {
      s = add(s, sqr(u[i]));
    }
    s = inv(sqrt(s));
    for (int i = 0; i < 3; ++i)
    {
      u[i] = mul(s, u[i]);
    }
  }
  FloatX J[3][3];
  for (int i = 0; i < 3; ++i)
  {
    for (int j = 0; j < 3; ++j)
    {
      J[i][j] = floatx(z.v[j].d[i]);
    }
  }
  FloatX v[3];
  FloatX dZ;
  {
    FloatX s = floatx(0);
    for (int i = 0; i < 3; ++i)
    {
      v[i] = floatx(0);
      for (int j = 0; j < 3; ++j)
      {
        v[i] = add(v[i], mul(J[i][j], u[j]));
      }
      s = add(s, sqr(v[i]));
    }
    s = sqrt(s);
    dZ = s;
    s = inv(s);
    for (int i = 0; i < 3; ++i)
    {
      normal[i] = convert_float(mul(s, v[i]));
    }
  }
  // logs
  float log_z0 = convert_float(log(z0));
  float log_z1 = convert_float(log(z1));
  float log_z2 = convert_float(log(z2));
  float log_Z = log_z0;
  float log_R = convert_float(log(DEEscapeRadius));
  // estimate power
  float p = (log_z2 - log_z1) / (log_z1 - log_z0);
  if (DEOverrideP)
  {
    p = DEPValue;
  }
  if (DERoundPToInteger)
  {
    p = round(p);
  }
  float log_p = log(p);
  // estimate scaling
  float log_a = ((log_z2 - p * log_z1) + (log_z1 - p * log_z0)) * 0.5;
  if (DEOverrideA)
  {
    log_a = log(DEAValue);
  }
  // compute final results
  float /*f, */df;
  if (eq(p, 1))
  {
    // f = div(log_Z, log_a);
    df = div(convert_float(div(dZ, Z)), log_a);
  }
  else
  {
    // f = div(log(add(log_a, mul(sub(p, 1), log_Z))), log_p);
    df = mul(convert_float(div(dZ, Z)), div(sub(p, 1),
      mul(log_p, log(add(log_a, mul(sub(p, 1), log_Z))))));
  }
  float de = float(1) / df;
  if (isnan(de) || isinf(de))
  {
    return 0.0;
  }
  return DEScale * de;
}
