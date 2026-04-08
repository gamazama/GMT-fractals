#version 460 compatibility
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D hybrid escape time fractals with deep zoom support

#define providesDouble
#define providesCompensated2
#include "TwoD.frag"

#group mET

uniform int Iterations; slider[0,100,100000]
uniform float EscapeRadius; slider[0.0,16,100.0]
#if __VERSION__ >= 400
uniform dvec2 Seed; slider[(-10,-10),(0,0),(10,10)]
#else
uniform vec2 Seed; slider[(-10,-10),(0,0),(10,10)]
#endif
uniform bool DebugNumberType; checkbox[false]

#group Formula1

uniform bool Active1; checkbox[true]
uniform int Power1; slider[1,2,10]
uniform bool AbsX1; checkbox[false]
uniform bool AbsY1; checkbox[false]
uniform bool NegX1; checkbox[false]
uniform bool NegY1; checkbox[false]
uniform vec2 Mul1; slider[(-10,-10),(1,0),(10,10)]
uniform bool AddC1; checkbox[true]

#group Formula2

uniform bool Active2; checkbox[true]
uniform int Power2; slider[1,2,10]
uniform bool AbsX2; checkbox[false]
uniform bool AbsY2; checkbox[false]
uniform bool NegX2; checkbox[false]
uniform bool NegY2; checkbox[false]
uniform vec2 Mul2; slider[(-10,-10),(1,0),(10,10)]
uniform bool AddC2; checkbox[true]

#group Formula3

uniform bool Active3; checkbox[true]
uniform int Power3; slider[1,2,10]
uniform bool AbsX3; checkbox[false]
uniform bool AbsY3; checkbox[false]
uniform bool NegX3; checkbox[false]
uniform bool NegY3; checkbox[false]
uniform vec2 Mul3; slider[(-10,-10),(1,0),(10,10)]
uniform bool AddC3; checkbox[true]

#group Formula4

uniform bool Active4; checkbox[true]
uniform int Power4; slider[1,2,10]
uniform bool AbsX4; checkbox[false]
uniform bool AbsY4; checkbox[false]
uniform bool NegX4; checkbox[false]
uniform bool NegY4; checkbox[false]
uniform vec2 Mul4; slider[(-10,-10),(1,0),(10,10)]
uniform bool AddC4; checkbox[true]


float length_approx(Complexf a) { return length(a); }
#if __VERSION__ >= 400
double length_approx(Complexd a) { return length(a); }
double length_approx(ComplexCompensated2 a) { return sqrt(norm(a).x[0]); }
#endif

float absif(bool b, float x) { return b ? abs(x) : x; }
#if __VERSION__ >= 400
double absif(bool b, double x) { return b ? abs(x) : x; }
Compensated2 absif(bool b, Compensated2 x) { return b ? abs(x) : x; }
#endif

float negif(bool b, float x) { return b ? neg(x) : x; }
#if __VERSION__ >= 400
double negif(bool b, double x) { return b ? neg(x) : x; }
Compensated2 negif(bool b, Compensated2 x) { return b ? neg(x) : x; }
#endif

Complexf addif(bool b, Complexf x, Complexf y) { return b ? add(x, y) : x; }
#if __VERSION__ >= 400
Complexd addif(bool b, Complexd x, Complexd y) { return b ? add(x, y) : x; }
ComplexCompensated2 addif(bool b, ComplexCompensated2 x, ComplexCompensated2 y) { return b ? add(x, y) : x; }
#endif

float EscapeRadius2 = pow(2.0, float(EscapeRadius));
int NActive = int(Active1) + int(Active2) + int(Active3) + int(Active4);
int IterationsN = NActive == 0 ? 0 : Iterations / NActive;
int IterationsM = NActive * IterationsN;
float LogPower = log(float((Active1 ? Power1 : 0) + (Active2 ? Power2 : 0) + (Active3 ? Power3 : 0) + (Active4 ? Power4 : 0))) / float(NActive);

vec3 shade(float d00, float d01, float d10, float d11)
{
  vec2 e = vec2(d00 - d11, d01 - d10);
  float de = 1.0 / (log(2.0) * length(e));
  if (0.0 == d00 * d01 * d10 * d11 || isinf(de) || isnan(de)) return vec3(0.0);
  return vec3(tanh(clamp(2.0 * de, 0.0, 4.0)));
}

#define DWELL(REAL,real,VEC,vec,COMPLEX,complex) \
float dwell(VEC c0) \
{ \
  COMPLEX c = complex(c0); \
  REAL mz2 = real(1.0 / 0.0); \
  COMPLEX minz = complex(real(1.0/0.0), real(0.0)); \
  int i = 0; \
  COMPLEX z = complex(vec(Seed)); \
  int p = 0; \
  for (; i < IterationsM;) \
  { \
    if (Active1) \
    { \
      z = addif(AddC1, mul \
        ( complex(vec(Mul1)) \
        , pow(complex \
          ( negif(NegX1, absif(AbsX1, z.x)) \
          , negif(NegY1, absif(AbsY1, z.y)) \
          ), Power1) \
        ) \
        , c); \
      ++i; \
      REAL z2 = norm(z); \
      if (! (lt(z2, EscapeRadius2))) break; \
    } \
    if (Active2) \
    { \
      z = addif(AddC2, mul \
        ( complex(vec(Mul2)) \
        , pow(complex \
          ( negif(NegX2, absif(AbsX2, z.x)) \
          , negif(NegY2, absif(AbsY2, z.y)) \
          ), Power2) \
        ) \
        , c); \
      ++i; \
      REAL z2 = norm(z); \
      if (! (lt(z2, EscapeRadius2))) break; \
    } \
    if (Active3) \
    { \
      z = addif(AddC3, mul \
        ( complex(vec(Mul3)) \
        , pow(complex \
          ( negif(NegX3, absif(AbsX3, z.x)) \
          , negif(NegY3, absif(AbsY3, z.y)) \
          ), Power3) \
        ) \
        , c); \
      ++i; \
      REAL z2 = norm(z); \
      if (! (lt(z2, EscapeRadius2))) break; \
    } \
    if (Active4) \
    { \
      z = addif(AddC4, mul \
        ( complex(vec(Mul4)) \
        , pow(complex \
          ( negif(NegX4, absif(AbsX4, z.x)) \
          , negif(NegY4, absif(AbsY4, z.y)) \
          ), Power4) \
        ) \
        , c); \
      ++i; \
      REAL z2 = norm(z); \
      if (! (lt(z2, EscapeRadius2))) break; \
    } \
  } \
  if (! (lt(norm(z), EscapeRadius2))) \
  { \
    return float(i) + 1.0 - log(log(float(length_approx(z)))) / LogPower; \
  } \
  else \
  { \
    return -1000.0; \
  } \
}

DWELL(float,float,vec2,vec2,Complexf,complexf)
#if __VERSION__ >= 400
DWELL(double,double,dvec2,dvec2,Complexd,complexd)
DWELL(Compensated2,compensated2,Vec2Compensated2,vec2compensated2,ComplexCompensated2,complexcompensated2)
#endif

#define COLOR(P,D,C) \
vec3 color(P p, D dx, D dy) \
{ \
  dx *= 0.25; \
  dy *= 0.25; \
  float d00 = dwell(add(add(p, - dx), - dy)); \
  float d01 = dwell(add(add(p, - dx),   dy)); \
  float d10 = dwell(add(add(p,   dx), - dy)); \
  float d11 = dwell(add(add(p,   dx),   dy)); \
  return (DebugNumberType ? C : vec3(1.0)) * shade(d00, d01, d10, d11); \
}

COLOR(vec2,vec2,vec3(0.0,1.0,0.0))
#if __VERSION__ >= 400
COLOR(dvec2,vec2,vec3(0.0,0.0,1.0))
COLOR(Vec2Compensated2,vec2,vec3(1.0,0.0,0.0))
#endif

#preset Default
Zoom = 1 Logarithmic
#endpreset

#preset DeepQuadraticEJS
Zoom = 5.33087028341637775e+19 Logarithmic
Iterations = 15000
CenterX = -1.76026293064459782,-0.173436114003554936,0.076190948486328125,0
CenterY = 0.0204934349543184798,-0.0119529057604270909,-0.001834869384765625,0
Active1 = true
Power1 = 2
AbsX1 = false
AbsY1 = false
NegX1 = false
NegY1 = false
Mul1 = 1,0
Active2 = false
Active3 = false
Active4 = false
#endpreset

#preset DeepCubicMini
Zoom = 646060287421561.75 Logarithmic
CenterX = -0.456748997747991214,0.0762479077067027694,0.00390625,0
CenterY = 0.0264549852072304831,0.0121110991053856414,0.00729560852050781337,0
Iterations = 3000
Active1 = true
Power1 = 3
AbsX1 = false
AbsY1 = false
NegX1 = false
NegY1 = false
Mul1 = 1,0
Active2 = false
Active3 = false
Active4 = false
#endpreset
