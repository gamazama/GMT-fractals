#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

#vertex

out vec2 coord;
out vec2 viewCoord;

#group Camera

uniform vec2 pixelSize;

// Enabel rotation and stretch
uniform bool EnableTransform; checkbox[true]
// Rotation angle in degrees
uniform float RotateAngle; slider[-360,0,360]
// Stretch angle in degrees
uniform float StretchAngle; slider[-360,0,360]
// Stretch amount
uniform float StretchAmount; slider[-100,0,100]

void main(void)
{
  mat2 transform = mat2(1.0, 0.0, 0.0, 1.0);
  if (EnableTransform)
  {
    float b = radians(RotateAngle);
    float bc = cos(b);
    float bs = sin(b);
    float a = radians(StretchAngle);
    float ac = cos(a);
    float as = sin(a);
    float s = sqrt(pow(2.0, StretchAmount));
    mat2 m1 = mat2(ac, as, -as, ac);
    mat2 m2 = mat2(s, 0.0, 0.0, 1.0 / s);
    mat2 m3 = mat2(ac, -as, as, ac);
    mat2 m4 = mat2(bc, bs, -bs, bc);
    transform = m1 * m2 * m3 * m4;
  }
  float ar = float(pixelSize.y / pixelSize.x);
  coord = transform * ((gl_ProjectionMatrix * gl_Vertex).xy * vec2(ar, 1.0));
  viewCoord = gl_Vertex.xy;
  gl_Position =  gl_Vertex;
}

#endvertex

in vec2 coord;
in vec2 viewCoord;

#if __VERSION__ >= 400
// Camera zoom
uniform double Zoom; slider[1e-4,1,1e64] Logarithmic NotLockable
#else
// Camera zoom
uniform float Zoom; slider[1e-4,1,1e7] Logarithmic NotLockable
#endif

// Camera zoom factor adjustment (logarithmic, for animation)
uniform float ZoomFactor; slider[-1024,0,1024]
#if __VERSION__ >= 400
// Camera center X in high precision (quad-double)
uniform dvec4 CenterX; slider[(-100,-100,-100,-100),(0,0,0,0),(100,100,100,100)] NotLockable
// Camera center Y in high precision (quad-double)
uniform dvec4 CenterY; slider[(-100,-100,-100,-100),(0,0,0,0),(100,100,100,100)] NotLockable
const dvec4 CenterShift = dvec4(1.0, 1.1102230246251565e-16LF, 1.232595164407831e-32LF, 1.3684555315672042e-48LF);
#else
// Camera center in single precision
uniform vec2 Center; slider[(-100,-100),(0,0),(100,100)] NotLockable
vec4 CenterX = vec4(Center.x, 0.0, 0.0, 0.0);
vec4 CenterY = vec4(Center.y, 0.0, 0.0, 0.0);
#endif
// Jitter range in pixels
uniform float Jitter; slider[0,1,10]
// Number of samples per subframe
uniform int Samples; slider[1,1,256]
uniform vec2 pixelSize;
uniform int subframe;
uniform sampler2D backbuffer;
uniform float time;

// Camera shutter speed (use "Time" instead of "time")
uniform float Shutter; slider[1.0e-6,1.0e-2,1.0e+2] Logarithmic
float Time;

int Sample = 0;

// implement these
vec3 color(vec2 p, vec2 dx, vec2 dy);
#if __VERSION__ >= 400
#ifdef providesDouble
vec3 color(dvec2 p, vec2 dx, vec2 dy);
#endif
#ifdef providesCompensated2
vec3 color(Vec2Compensated2 p, vec2 dx, vec2 dy);
#endif
#ifdef providesCompensated3
vec3 color(Vec2Compensated3 p, dvec2 dx, dvec2 dy);
#endif
#ifdef providesCompensated4
vec3 color(Vec2Compensated4 p, dvec2 dx, dvec2 dy);
#endif

#endif

void main()
{
  vec4 next = vec4(0.0);
  vec4 prev = texture(backbuffer, vec2(viewCoord + vec2(1.0)) * 0.5);
#if __VERSION__ >= 400
  double Z = 1.0 / (Zoom * pow(2.0LF, double(ZoomFactor)));
  dvec2 dx = dFdx(coord) * Z;
  dvec2 dy = dFdy(coord) * Z;
  double d = min(length(dx), length(dy));
  bool double1_precision = d < 1.1920928955078125e-07LF * 4.0 && __VERSION__ >= 400;
  bool double2_precision = d < 2.220446049250313e-16LF  * 4.0 && __VERSION__ >= 400;
  bool double3_precision = d < 2.465190328815662e-32LF  * 4.0 && __VERSION__ >= 400;
  bool double4_precision = d < 2.7369110631344083e-48LF * 4.0 && __VERSION__ >= 400;
#else
  float Z = 1.0 / (Zoom * pow(2.0, ZoomFactor));
  vec2 dx = dFdx(coord) * Z;
  vec2 dy = dFdy(coord) * Z;
  float d = min(length(dx), length(dy));
  bool double1_precision = false;
  bool double2_precision = false;
  bool double3_precision = false;
  bool double4_precision = false;
#endif
  for (int s = 0; s < Samples; ++s)
  {
    Sample = s;
    int SubFrame = s + subframe * Samples;
    vec3 j = Jitter * vec3
      ( uniform01(hash(vec4(coord, time, float(3 * SubFrame + 0))))
      , uniform01(hash(vec4(coord, time, float(3 * SubFrame + 1))))
      , uniform01(hash(vec4(coord, time, float(3 * SubFrame + 2))))
      );
#if __VERSION__ >= 400
    dvec2 p = dvec2(coord) * Z + j.x * dx + j.y * dy;
#else
    vec2 p = coord * Z + j.x * dx + j.y * dy;
#endif
    Time = time + Shutter * j.z;
    vec4 one;
    if (false) ;
#if __VERSION__ >= 400
#ifdef providesCompensated4
    else if (double4_precision) one = vec4(color(add(p, vec2compensated4(compensated4(CenterX.xyzw * CenterShift.xyzw), compensated4(CenterY.xyzw * CenterShift.xyzw)), dx, dy), 1.0);
#endif
#ifdef providesCompensated3
    else if (double3_precision) one = vec4(color(add(p, vec2compensated3(compensated3(CenterX.xyz * CenterShift.xyz), compensated3(CenterY.xyz * CenterShift.xyz)), dx, dy), 1.0);
#endif
#ifdef providesCompensated2
    else if (double2_precision) one = vec4(color(add(p, vec2compensated2(Compensated2[2](compensated2(CenterX.xy * CenterShift.xy), compensated2(CenterY.xy * CenterShift.xy)))), vec2(dx), vec2(dy)), 1.0);
#endif
#ifdef providesDouble
    else if (double1_precision)  one = vec4(color(p + dvec2(CenterX.x, CenterY.x), vec2(dx), vec2(dy)), 1.0);
#endif
#endif
    else /* float precision */  one = vec4(color(vec2(p + vec2(CenterX.x, CenterY.x)), vec2(dx), vec2(dy)), 1.0);
    if (! (one == one)) // NaN check
    {
      one = vec4(0.0);
    }
    next += one;
  }
  gl_FragColor = prev + next;
}
