#version 330
#include "TwoD.frag"

#group HubbardTree
uniform int RayDigits; slider[0,3,4096]
uniform int RayPreperiod; slider[1,4,12]
uniform int RayLoNum; slider[0,39,4096]
uniform int RayLoDen; slider[0,224,4096]
uniform int RayHiNum; slider[0,43,4096]
uniform int RayHiDen; slider[0,224,4096]

// Newton's method to refine a root
Complexf m_newton_pp(Complexf c0, int preperiod, int period, int newtonsteps)
{
  if (preperiod == 0)
  {
    m_nucleus(c0, c0, period, newtonsteps);
  }
  else
  {
    m_misiurewicz(c0, c0, preperiod, period, newtonsteps);
  }
  return c0;
}

bool ray(vec2 z0, vec2 dx, vec2 dy, float angle)
{
  float lo = 0.0;
  int n = 20; // FIXME needs to be increased for crinkly Julia sets
  float t00 = m_exray_out(complexf(z0.x, z0.y), 4, 4, n);
  float t01 = m_exray_out(complexf(z0.x + dy.x, z0.y + dy.y), 4, 4, n);
  float t10 = m_exray_out(complexf(z0.x + dx.x, z0.y + dx.y), 4, 4, n);
  float t11 = m_exray_out(complexf(z0.x + dx.x + dy.x, z0.y + dx.y + dy.y), 4, 4, n);
  return
    t00 >= lo && t01 >= lo && t10 >= lo && t11 >= lo &&
    !((t00 >= angle) == (t11 >= angle) && (t00 >= angle) == (t10 >= angle) && (t00 >= angle) == (t01 >= angle));
}

bool ray(vec2 z0, vec2 dx, vec2 dy, float angle, float lo, float hi)
{
  float t = 0.8; // FIXME hack to prevent spurious ray and tree component at angle 0
  int n = 70; // FIXME needs to be increased for crinkly veins
  float t00 = m_exray_out(complexf(z0.x, z0.y), 4, 4, n);
  float t01 = m_exray_out(complexf(z0.x + dy.x, z0.y + dy.y), 4, 4, n);
  float t10 = m_exray_out(complexf(z0.x + dx.x, z0.y + dx.y), 4, 4, n);
  float t11 = m_exray_out(complexf(z0.x + dx.x + dy.x, z0.y + dx.y + dy.y), 4, 4, n);
  return
    t00 >= lo && t01 >= lo && t10 >= lo && t11 >= lo &&
    t00 <= hi && t01 <= hi && t10 <= hi && t11 <= hi &&
    abs(t00 - t11) < t && abs(t00 - t10) < t && abs(t00 - t01) < t &&
    !((t00 >= angle) == (t11 >= angle) && (t00 >= angle) == (t10 >= angle) && (t00 >= angle) == (t01 >= angle));
}

vec3 color(vec2 c0, vec2 dx, vec2 dy)
{
  float epsilon = length(vec4(dx, dy));
  Dual1cf c1 = dual1cf(complexf(c0.x, c0.y), 0);
  Dual1cf z = dual1cf(complexf(0.0, 0.0));
  float de = 0.0;
  for (int n = 0; n < 100; ++n)
  {
    z = add(sqr(z), c1);
    if (length(z.x) > 10000.0)
    {
      de = length(z.x) * log(length(z.x)) / length(z.d[0]);
      break;
    }
  }
  float angle = float(RayDigits) / float(1 << RayPreperiod);
  float lo = float(RayLoNum) / float(RayLoDen);
  float hi = float(RayHiNum) / float(RayHiDen);
  bool rays =
   ray(c0, dx, dy, angle, lo, hi) ||
   ray(c0, dx, dy, lo) ||
   ray(c0, dx, dy, hi);
  vec3 bg = vec3(tanh(clamp(de / epsilon, 0.0, 4.0)));
  vec3 fg = vec3(1.0, 0.0, 0.0);
  if (rays)
  {
    bg = fg;
  }
  return bg;
}

#preset Default
Center = -0.75,0
Zoom = 0.5
#endpreset

#preset ThreeSixteenths
Zoom = 6.66
Center = -0.096641976,1.01635408
RayDigits = 3
RayPreperiod = 4
RayLoNum = 39
RayLoDen = 224
RayHiNum = 43
RayHiDen = 224
#endpreset
