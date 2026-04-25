#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

vec4 slerp(vec4 v0, vec4 v1, float t)
{
  float d = dot(v0, v1);
  if (d < 0.0)
  {
    v1 = -v1;
    d = -d;
  }
  if (d > 0.9995)
  {
    return normalize(mix(v0, v1, t));
  }
  float theta_0 = acos(d);
  float theta = theta_0 * t;
  float sin_theta = sin(theta);
  float sin_theta_0 = sin(theta_0);
  float s0 = cos(theta) - d * sin_theta / sin_theta_0;
  float s1 = sin_theta / sin_theta_0;
  return s0 * v0 + s1 * v1;
}

vec3 qMul(vec4 q, vec3 v)
{
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}

vec4 qInv(vec4 q)
{
  return vec4(-q.xyz, q.w) / dot(q, q);
}
