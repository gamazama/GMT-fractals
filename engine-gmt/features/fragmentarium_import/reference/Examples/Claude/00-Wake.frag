#version 330
#include "TwoD.frag"

#group Wake
uniform int RayLower; slider[1,1,4095]
uniform int RayUpper; slider[1,2,4095]
uniform int RayPreperiod; slider[0,0,12]
uniform int RayPeriod; slider[1,3,12]

bool wake(Complexf c, float epsilon, int lower, int upper, int preperiod, int period, int newtonsteps, int sharpness, int steps)
{
  return ! lt(epsilon, length(sub
   ( j_exray_in(c, epsilon, lower, preperiod, period, newtonsteps, sharpness, steps)
   , j_exray_in(c, epsilon, upper, preperiod, period, newtonsteps, sharpness, steps)
   )));
}

vec3 color(vec2 c, vec2 dx, vec2 dy)
{
  float epsilon = length(vec4(dx, dy));
  Dual1cf c1 = dual1cf(complexf(c.x, c.y), 0);
  Dual1cf z = dual1cf(complexf(0.0, 0.0));
  float de = 0.0;
  for (int n = 0; n < 500; ++n)
  {
    z = add(sqr(z), c1);
    if (length(z.x) > 10000.0)
    {
      de = 4.0 * length(z.x) * log(length(z.x)) / length(z.d[0]);
      break;
    }
  }
  vec3 bg = vec3(tanh(clamp(de / epsilon, 0.0, 4.0)));
  vec3 fg = vec3(1.0, 0.5, 0.5);
  if (wake(complexf(c.x, c.y), epsilon, RayLower, RayUpper, RayPreperiod, RayPeriod, 4, 4, 100))
  {
    bg *= fg;
  }
  return bg;
}


#preset Default
Center = -0.75,0
Zoom = 0.75
#endpreset

#preset Bulb
Center = -0.138087782,0.894785122
Zoom = 4.0
#endpreset

#preset Island
Center = -1.76,0
Zoom = 15
#endpreset
