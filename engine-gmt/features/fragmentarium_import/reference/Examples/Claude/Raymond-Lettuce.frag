#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018,2019  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>

Lettuce: <https://fractalforums.org/f/28/t/2996/msg16077#msg16077>
*/

#define DELTA(N,E,p) vec3 \
  ( N(p + vec3(E,0.0,0.0)) - N(p - vec3(E,0.0,0.0)) \
  , N(p + vec3(0.0,E,0.0)) - N(p - vec3(0.0,E,0.0)) \
  , N(p + vec3(0.0,0.0,E)) - N(p - vec3(0.0,0.0,E)) \
  )

float Lettuce(vec3 p, int maxiter)
{
  float a = p.x;
  float b = p.y;
  float c = p.z;
  float len2 = dot(p, p);
  float rlen;
  int i = 0;
  while ((len2 < 16.0) && (i < maxiter)) {
    i++;
    rlen = 1.0/sqrt(len2);   
    p *= rlen;  // normalize vector to unit length => project onto sphere
    // find X-related iso-plane: polar projection onto unit circle
    float Kx = 2.0*p.x*(1.0 - p.y)/((p.y - 2.0)*p.y + p.x*p.x + 1.0);
    float Ky = 1.0 - 2.0*((p.y - 2.0)*p.y + 1.0) /
      ((p.y - 2.0)*p.y + p.x*p.x + 1.0);
    // doubled point
    float K2x = -2.0*Kx*Ky;
    float K2y = -(Ky*Ky - Kx*Kx);
    // two more doublings (for total power eight)
    Kx = -2.0*K2x*K2y;
    Ky = -(K2y*K2y - K2x*K2x);
    K2x = -2.0*Kx*Ky;
    K2y = -(Ky*Ky - Kx*Kx);
    // (relevant) normal vector coordinates of doubled point plane
    float n1x = K2y - 1.0;
    float n1y = -K2x;
    // find Z-related iso-plane: polar projection onto unit circle
    float Kz = 2.0*p.z*(1.0 - p.y)/((p.y - 2.0)*p.y + p.z*p.z + 1.0);
    Ky = 1.0 - 2.0*((p.y - 2.0)*p.y + 1.0)/((p.y - 2.0)*p.y + p.z*p.z + 1.0);
    // doubled point
    float K2z = -2.0*Kz*Ky;
    K2y = -(Ky*Ky - Kz*Kz);
    // two more doublings (for total power eight)
    Kz = -2.0*K2z*K2y;
    Ky = -(K2y*K2y - K2z*K2z);
    K2z = -2.0*Kz*Ky;
    K2y = -(Ky*Ky - Kz*Kz);
    // (relevant) normal vector coordinates of doubled point plane
    float n2y = -K2z;
    float n2z = K2y - 1.0;
    // compute position of doubled point as intersection of planes and sphere
    // solved ray parameter
    float nt = 2.0*(n1x*n1x*n2z*n2z)/((n1x*n1x + n1y*n1y)*n2z*n2z
                   + n1x*n1x*n2y*n2y);
    // doubled point position
    p.y = 1.0 - nt;
    p.x = n1y*(1.0 - p.y)/n1x;
    p.z = n2y*(1.0 - p.y)/n2z;
    // raise original length to the power, then add constant
    // p *= len2;
    p *= len2*len2*len2*len2;  // for 8th power
    p += vec3(a,b,c);
    len2 = dot(p, p);
  }
  if (len2 < 16.0) {
    return float(maxiter);
  }
  return float(i) + 1.0 - log(sqrt(len2)) / log(8.0);
}

float Lettuce(Scene_DE tag, Transform T, Ray V, int maxiter)
{
  vec3 origin = backwardP(T, V.origin);
  const float epsilon = 1.0e-4; // FIXME
#define M(p) Lettuce(p, maxiter)
  vec3 gradient = DELTA(M, epsilon, origin) / (2.0 * epsilon);
#undef M
  float de = 0.25 * 1.0 / (log(8.0) * length(gradient));
  return forwardD(T, de);
}

Surface Lettuce(Scene_HIT tag, Transform T, Ray V, int maxiter)
{
  vec3 origin = backwardP(T, V.origin);
  const float epsilon = 1.0e-4; // FIXME
#define M(p) Lettuce(p, maxiter)
  vec3 gradient = DELTA(M, epsilon, origin) / (2.0 * epsilon);
#undef M
  float de = 0.25 * 1.0 / (log(8.0) * length(gradient));
  vec3 normal = normalize(-gradient); // FIXME normal of escape field, not of distance?
  // surface
  return Surface(forwardP(T, origin), forwardN(T, normal), forwardD(T, de));
}

#undef DELTA
