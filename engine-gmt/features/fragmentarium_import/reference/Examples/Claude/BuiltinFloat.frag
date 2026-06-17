#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Capture builtin functions before redefinition.
In GLSL, built in functions cannot be overloaded, only redefined.
The redefinitions *can* be overloaded.
This is needed to define double precision versions of missing functions.
*/

float _builtin_abs(float x) { return abs(x); }
vec2 _builtin_abs(vec2 x) { return abs(x); }
vec3 _builtin_abs(vec3 x) { return abs(x); }
vec4 _builtin_abs(vec4 x) { return abs(x); }

float _builtin_sqrt(float x) { return sqrt(x); }
vec2 _builtin_sqrt(vec2 x) { return sqrt(x); }
vec3 _builtin_sqrt(vec3 x) { return sqrt(x); }
vec4 _builtin_sqrt(vec4 x) { return sqrt(x); }

float _builtin_inversesqrt(float x) { return inversesqrt(x); }
vec2 _builtin_inversesqrt(vec2 x) { return inversesqrt(x); }
vec3 _builtin_inversesqrt(vec3 x) { return inversesqrt(x); }
vec4 _builtin_inversesqrt(vec4 x) { return inversesqrt(x); }

float _builtin_length(float x) { return length(x); }
float _builtin_length(vec2 x) { return length(x); }
float _builtin_length(vec3 x) { return length(x); }
float _builtin_length(vec4 x) { return length(x); }

float _builtin_distance(float x, float y) { return distance(x, y); }
float _builtin_distance(vec2 x, vec2 y) { return distance(x, y); }
float _builtin_distance(vec3 x, vec3 y) { return distance(x, y); }
float _builtin_distance(vec4 x, vec4 y) { return distance(x, y); }

float _builtin_normalize(float x) { return normalize(x); }
vec2 _builtin_normalize(vec2 x) { return normalize(x); }
vec3 _builtin_normalize(vec3 x) { return normalize(x); }
vec4 _builtin_normalize(vec4 x) { return normalize(x); }

float _builtin_dot(float y, float x) { return dot(y, x); }
float _builtin_dot(vec2 y, vec2 x) { return dot(y, x); }
float _builtin_dot(vec3 y, vec3 x) { return dot(y, x); }
float _builtin_dot(vec4 y, vec4 x) { return dot(y, x); }

vec3 _builtin_cross(vec3 x, vec3 y) { return cross(x, y); }

bool _builtin_isnan(float x) { return isnan(x); }
bvec2 _builtin_isnan(vec2 x) { return isnan(x); }
bvec3 _builtin_isnan(vec3 x) { return isnan(x); }
bvec4 _builtin_isnan(vec4 x) { return isnan(x); }

bool _builtin_isinf(float x) { return isinf(x); }
bvec2 _builtin_isinf(vec2 x) { return isinf(x); }
bvec3 _builtin_isinf(vec3 x) { return isinf(x); }
bvec4 _builtin_isinf(vec4 x) { return isinf(x); }

float _builtin_sign(float x) { return sign(x); }
vec2 _builtin_sign(vec2 x) { return sign(x); }
vec3 _builtin_sign(vec3 x) { return sign(x); }
vec4 _builtin_sign(vec4 x) { return sign(x); }

float _builtin_modf(float x, out float i) { return modf(x, i); }
vec2 _builtin_modf(vec2 x, out vec2 i) { return modf(x, i); }
vec3 _builtin_modf(vec3 x, out vec3 i) { return modf(x, i); }
vec4 _builtin_modf(vec4 x, out vec4 i) { return modf(x, i); }

float _builtin_exp(float x) { return exp(x); }
vec2 _builtin_exp(vec2 x) { return exp(x); }
vec3 _builtin_exp(vec3 x) { return exp(x); }
vec4 _builtin_exp(vec4 x) { return exp(x); }

float _builtin_exp2(float x) { return exp2(x); }
vec2 _builtin_exp2(vec2 x) { return exp2(x); }
vec3 _builtin_exp2(vec3 x) { return exp2(x); }
vec4 _builtin_exp2(vec4 x) { return exp2(x); }

float _builtin_log(float x) { return log(x); }
vec2 _builtin_log(vec2 x) { return log(x); }
vec3 _builtin_log(vec3 x) { return log(x); }
vec4 _builtin_log(vec4 x) { return log(x); }

float _builtin_log2(float x) { return log2(x); }
vec2 _builtin_log2(vec2 x) { return log2(x); }
vec3 _builtin_log2(vec3 x) { return log2(x); }
vec4 _builtin_log2(vec4 x) { return log2(x); }

float _builtin_pow(float x, float y) { return pow(x, y); }
vec2 _builtin_pow(vec2 x, vec2 y) { return pow(x, y); }
vec3 _builtin_pow(vec3 x, vec3 y) { return pow(x, y); }
vec4 _builtin_pow(vec4 x, vec4 y) { return pow(x, y); }

float _builtin_sin(float x) { return sin(x); }
vec2 _builtin_sin(vec2 x) { return sin(x); }
vec3 _builtin_sin(vec3 x) { return sin(x); }
vec4 _builtin_sin(vec4 x) { return sin(x); }

float _builtin_cos(float x) { return cos(x); }
vec2 _builtin_cos(vec2 x) { return cos(x); }
vec3 _builtin_cos(vec3 x) { return cos(x); }
vec4 _builtin_cos(vec4 x) { return cos(x); }

float _builtin_tan(float x) { return tan(x); }
vec2 _builtin_tan(vec2 x) { return tan(x); }
vec3 _builtin_tan(vec3 x) { return tan(x); }
vec4 _builtin_tan(vec4 x) { return tan(x); }

float _builtin_asin(float x) { return asin(x); }
vec2 _builtin_asin(vec2 x) { return asin(x); }
vec3 _builtin_asin(vec3 x) { return asin(x); }
vec4 _builtin_asin(vec4 x) { return asin(x); }

float _builtin_acos(float x) { return acos(x); }
vec2 _builtin_acos(vec2 x) { return acos(x); }
vec3 _builtin_acos(vec3 x) { return acos(x); }
vec4 _builtin_acos(vec4 x) { return acos(x); }

float _builtin_atan(float x) { return atan(x); }
vec2 _builtin_atan(vec2 x) { return atan(x); }
vec3 _builtin_atan(vec3 x) { return atan(x); }
vec4 _builtin_atan(vec4 x) { return atan(x); }

float _builtin_sinh(float x) { return sinh(x); }
vec2 _builtin_sinh(vec2 x) { return sinh(x); }
vec3 _builtin_sinh(vec3 x) { return sinh(x); }
vec4 _builtin_sinh(vec4 x) { return sinh(x); }

float _builtin_cosh(float x) { return cosh(x); }
vec2 _builtin_cosh(vec2 x) { return cosh(x); }
vec3 _builtin_cosh(vec3 x) { return cosh(x); }
vec4 _builtin_cosh(vec4 x) { return cosh(x); }

float _builtin_tanh(float x) { return tanh(x); }
vec2 _builtin_tanh(vec2 x) { return tanh(x); }
vec3 _builtin_tanh(vec3 x) { return tanh(x); }
vec4 _builtin_tanh(vec4 x) { return tanh(x); }

float _builtin_asinh(float x) { return asinh(x); }
vec2 _builtin_asinh(vec2 x) { return asinh(x); }
vec3 _builtin_asinh(vec3 x) { return asinh(x); }
vec4 _builtin_asinh(vec4 x) { return asinh(x); }

float _builtin_acosh(float x) { return acosh(x); }
vec2 _builtin_acosh(vec2 x) { return acosh(x); }
vec3 _builtin_acosh(vec3 x) { return acosh(x); }
vec4 _builtin_acosh(vec4 x) { return acosh(x); }

float _builtin_atanh(float x) { return atanh(x); }
vec2 _builtin_atanh(vec2 x) { return atanh(x); }
vec3 _builtin_atanh(vec3 x) { return atanh(x); }
vec4 _builtin_atanh(vec4 x) { return atanh(x); }

float _builtin_atan(float y, float x) { return atan(y, x); }
vec2 _builtin_atan(vec2 y, vec2 x) { return atan(y, x); }
vec3 _builtin_atan(vec3 y, vec3 x) { return atan(y, x); }
vec4 _builtin_atan(vec4 y, vec4 x) { return atan(y, x); }

float _builtin_max(float y, float x) { return max(y, x); }
vec2 _builtin_max(vec2 y, vec2 x) { return max(y, x); }
vec3 _builtin_max(vec3 y, vec3 x) { return max(y, x); }
vec4 _builtin_max(vec4 y, vec4 x) { return max(y, x); }
vec2 _builtin_max(vec2 y, float x) { return max(y, x); }
vec3 _builtin_max(vec3 y, float x) { return max(y, x); }
vec4 _builtin_max(vec4 y, float x) { return max(y, x); }

float _builtin_min(float y, float x) { return min(y, x); }
vec2 _builtin_min(vec2 y, vec2 x) { return min(y, x); }
vec3 _builtin_min(vec3 y, vec3 x) { return min(y, x); }
vec4 _builtin_min(vec4 y, vec4 x) { return min(y, x); }
