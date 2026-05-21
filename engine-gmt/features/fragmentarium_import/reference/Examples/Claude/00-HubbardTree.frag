#version 330
#include "TwoD.frag"

#group HubbardTree
uniform int RayDigits; slider[1,1,4095]
uniform int RayPreperiod; slider[0,0,12]
uniform int RayPeriod; slider[1,3,12]

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

Complexf C = m_newton_pp(m_exray_in(RayDigits, RayPreperiod, RayPeriod, 4, 4, 2 * (RayPreperiod + RayPeriod)), RayPreperiod, RayPeriod, 16);

bool ray(vec2 z0, vec2 dx, vec2 dy, float angle)
{
  float t = 0.8; // FIXME hack to prevent spurious ray and tree component at angle 0
  int n = 50; // FIXME needs to be increased for crinkly Julia sets
  float t00 = j_exray_out(complexf(z0.x, z0.y), C, 4, 4, n);
  float t01 = j_exray_out(complexf(z0.x + dy.x, z0.y + dy.y), C, 4, 4, n);
  float t10 = j_exray_out(complexf(z0.x + dx.x, z0.y + dx.y), C, 4, 4, n);
  float t11 = j_exray_out(complexf(z0.x + dx.x + dy.x, z0.y + dx.y + dy.y), C, 4, 4, n);
  return
    t00 >= 0.0 && t01 >= 0.0 && t10 >= 0.0 && t11 >= 0.0 &&
    abs(t00 - t11) < t && abs(t00 - t10) < t && abs(t00 - t01) < t &&
    !((t00 >= angle) == (t11 >= angle) && (t00 >= angle) == (t10 >= angle) && (t00 >= angle) == (t01 >= angle));
}

vec3 color(vec2 z0, vec2 dx, vec2 dy)
{
  Complexf z0c = complexf(z0.x, z0.y);
  float epsilon = length(vec4(dx, dy));
  float d0 = 1.0 / 0.0;
  {
    Complexf z = complexf(0.0, 0.0);
    for (int i = 0; i < RayPreperiod + RayPeriod; ++i)
    {
      d0 = min(d0, abs(length(sub(z0c, z)) - 2.0 * epsilon));
      z = add(sqr(z), C);
    }
  }
  Dual1cf c1 = dual1cf(C);
  Dual1cf z = dual1cf(complexf(z0.x, z0.y), 0);
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
  bool rays = false;
  float angle = turns(RayDigits, RayPreperiod, RayPeriod);
  for (int i = 0; i < RayPreperiod + RayPeriod; ++i)
  {
    rays = rays || ray(z0, dx, dy, angle);
    angle *= 2.0;
    angle -= floor(angle);
  }
  vec3 bg = vec3(tanh(clamp(de / epsilon, 0.0, 4.0)));
  vec3 fg = vec3(1.0, 0.0, 0.0);
  if (d0 < epsilon || rays)
  {
    bg = fg;
  }
  return bg;
}

#preset Default
Center = 0,0
Zoom = 0.5
#endpreset
