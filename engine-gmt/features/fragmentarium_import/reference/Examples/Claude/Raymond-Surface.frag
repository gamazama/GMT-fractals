#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

// CSG invert

float Invert(float de)
{
  return -de;
}

Surface Invert(Surface s)
{
  s.normal = - s.normal;
  s.de = - s.de;
  return s;
}

// CSG union: minimum by de

float Union(float a, float b)
{
  if (a < b) return a; else return b;
}

Surface Union(Surface a, Surface b)
{
  if (a.de < b.de) return a; else return b;
}

#define Union3(a,b,c) Union(Union(a, b), c)
#define Union4(a,b,c,d) Union(Union(Union(a, b), c), d)
#define Union5(a,b,c,d,e) Union(Union(Union(Union(a, b), c), d), e)
#define Union6(a,b,c,d,e,f) Union(Union(Union(Union(Union(a, b), c), d), e), f)

// CSG intersection: maximum by de

float Intersection(float a, float b)
{
  if (a > b) return a; else return b;
}

Surface Intersection(Surface a, Surface b)
{
  if (a.de > b.de) return a; else return b;
}

#define Intersection3(a,b,c) Intersection(Intersection(a, b), c)
#define Intersection4(a,b,c,d) Intersection(Intersection(Intersection(a, b), c), d)
#define Intersection5(a,b,c,d,e) Intersection(Intersection(Intersection(Intersection(a, b), c), d), e)
#define Intersection6(a,b,c,d,e,f) Intersection(Intersection(Intersection(Intersection(Intersection(a, b), c), d), e), f)

// primitives

float Sphere(Scene_DE tag, Transform T, Ray V)
{
  return forwardD(T, length(backwardP(T, V.origin)) - 1.0);
}

Surface Sphere(Scene_HIT tag, Transform T, Ray V)
{
  vec3 world = V.origin;
  vec3 object = backwardP(T, world);
  vec3 normal = normalize(object);
  float de = length(object) - 1.0;
  Surface s;
  s.position = forwardP(T, object);
  s.normal = forwardN(T, normal);
  s.de = forwardD(T, de);
  return s;
}

float Plane(Scene_DE tag, Transform T, Ray V, vec3 normal, float dist)
{
  return forwardD(T, dot(backwardP(T, V.origin), normalize(normal)) - dist);
}

Surface Plane(Scene_HIT tag, Transform T, Ray V, vec3 normal, float dist)
{
  normal = normalize(normal);
  vec3 world = V.origin;
  vec3 object = backwardP(T, world);
  float d = dot(object, normal) - dist;
  vec3 nearest = object - d * normal;
  Surface s;
  s.position = forwardP(T, object);
  s.normal = forwardN(T, normal);
  nearest = forwardP(T, nearest);
  s.de = distance(s.position, nearest);
  if (d < 0.0)
    s.de = - s.de;
  return s;
}

// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdBox( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return length(max(d,0.0))
         + min(max(d.x,max(d.y,d.z)),0.0); // remove this line for an only partially signed sdf
}

float Cuboid(Scene_DE tag, Transform T, Ray V, vec3 size)
{
  return forwardD(T, sdBox(backwardP(T, V.origin), size));
}

Surface Cuboid(Scene_HIT tag, Transform T, Ray V, vec3 size)
{
  vec3 p = backwardP(T, V.origin);
  float d = sdBox(p, size);
  float e = max(d, 1.0e-5 * length(size));
  vec3 n = vec3
    ( sdBox(p + e * X, size) - sdBox(p - e * X, size)
    , sdBox(p + e * Y, size) - sdBox(p - e * Y, size)
    , sdBox(p + e * Z, size) - sdBox(p - e * Z, size)
    );
  Surface s;
  s.position = forwardP(T, p);
  s.normal = forwardN(T, normalize(n));
  s.de = forwardD(T, d);
  return s;
}

float Cube(Scene_DE tag, Transform T, Ray V, float size)
{
  return Cuboid(tag, T, V, vec3(size));
}

Surface Cube(Scene_HIT tag, Transform T, Ray V, float size)
{
  return Cuboid(tag, T, V, vec3(size));
}

float Cube(Scene_DE tag, Transform T, Ray V)
{
  return Cube(tag, T, V, 1.0);
}

Surface Cube(Scene_HIT tag, Transform T, Ray V)
{
  return Cube(tag, T, V, 1.0);
}
