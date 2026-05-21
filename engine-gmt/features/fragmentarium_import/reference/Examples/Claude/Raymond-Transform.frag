#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

// transformations

struct Transform
{
  mat4 forward; // object to world
  mat4 backward; // world to object
  float scale; // forward
};

// composition of transformations

Transform compose(Transform S, Transform T)
{
  Transform R;
  R.forward = S.forward * T.forward;
  R.backward = T.backward * S.backward;
  R.scale = S.scale * T.scale;
  return R;
}

Transform compose(Transform A, Transform B, Transform C)
{
  return compose(compose(A, B), C);
}

Transform compose(Transform A, Transform B, Transform C, Transform D)
{
  return compose(compose(compose(A, B), C), D);
}

// transformation of distances

float forwardD(Transform T, float d)
{
  return d * T.scale;
}

float backwardD(Transform T, float d)
{
  return d / T.scale;
}


// transformation of points

vec3 forwardP(Transform T, vec3 p)
{
  vec4 q = vec4(p, 1.0) * T.forward;
  return q.xyz / q.w;
}

vec3 backwardP(Transform T, vec3 p)
{
  vec4 q = vec4(p, 1.0) * T.backward;
  return q.xyz / q.w;
}

// transformation of normals

vec3 forwardN(Transform T, vec3 n)
{
  return normalize(n * inverse(transpose(mat3(T.forward))));
}

vec3 backwardN(Transform T, vec3 n)
{
  return normalize(n * inverse(transpose(mat3(T.backward))));
}

// uniform scaling

Transform Scale(float s)
{
  Transform T;
  T.scale = s;
  T.forward = mat4
    ( s, 0.0, 0.0, 0.0
    , 0.0, s, 0.0, 0.0
    , 0.0, 0.0, s, 0.0
    , 0.0, 0.0, 0.0, 1.0
    );
  s = 1.0 / s;
  T.backward = mat4
    ( s, 0.0, 0.0, 0.0
    , 0.0, s, 0.0, 0.0
    , 0.0, 0.0, s, 0.0
    , 0.0, 0.0, 0.0, 1.0
    );
  return T;
}

// identity transformation

Transform Identity()
{
  return Scale(1.0);
}

// non-uniform scaling

Transform Scale(vec3 s)
{
  Transform T;
  T.forward = mat4
    ( s.x, 0.0, 0.0, 0.0
    , 0.0, s.y, 0.0, 0.0
    , 0.0, 0.0, s.z, 0.0
    , 0.0, 0.0, 0.0, 1.0
    );
  s = 1.0 / s;
  T.backward = mat4
    ( s.x, 0.0, 0.0, 0.0
    , 0.0, s.y, 0.0, 0.0
    , 0.0, 0.0, s.z, 0.0
    , 0.0, 0.0, 0.0, 1.0
    );
  T.scale = determinant(mat3(T.forward)); // FIXME
  return T;
}

// translation

Transform Translate(vec3 v)
{
  Transform T;
  T.scale = 1.0;
  T.forward = (mat4
    ( 1.0, 0.0, 0.0, v.x
    , 0.0, 1.0, 0.0, v.y
    , 0.0, 0.0, 1.0, v.z
    , 0.0, 0.0, 0.0, 1.0
    ));
  v = -v;
  T.backward = (mat4
    ( 1.0, 0.0, 0.0, v.x
    , 0.0, 1.0, 0.0, v.y
    , 0.0, 0.0, 1.0, v.z
    , 0.0, 0.0, 0.0, 1.0
    ));
  return T;
}

// rotation from quaternion

Transform Rotate(vec4 q)
{
  q = normalize(q);
  float i = q.x;
  float j = q.y;
  float k = q.z;
  float r = q.w;
  Transform T;
  T.scale = 1.0;
  T.forward = mat4
    ( 1.0 - 2.0 * (j * j + k * k), 2.0 * (i * j - k * r), 2.0 * (i * k + j * r), 0.0
    , 2.0 * (i * j + k * r), 1.0 - 2.0 * (i * i + k * k), 2.0 * (j * k - i * r), 0.0
    , 2.0 * (i * k - j * r), 2.0 * (j * k + i * r), 1.0 - 2.0 * (i * i + j * j), 0.0
    , 0.0, 0.0, 0.0, 1.0
    );
  T.backward = transpose(T.forward);
  return T;
}
