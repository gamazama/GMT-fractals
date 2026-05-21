#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Capture builtin functions before redefinition.
In GLSL, built in functions cannot be overloaded, only redefined.
The redefinitions *can* be overloaded.
This is needed to define double precision versions of missing functions.
*/

double _builtin_abs(double x) { return abs(x); }
dvec2 _builtin_abs(dvec2 x) { return abs(x); }
dvec3 _builtin_abs(dvec3 x) { return abs(x); }
dvec4 _builtin_abs(dvec4 x) { return abs(x); }

double _builtin_sqrt(double x) { return sqrt(x); }
dvec2 _builtin_sqrt(dvec2 x) { return sqrt(x); }
dvec3 _builtin_sqrt(dvec3 x) { return sqrt(x); }
dvec4 _builtin_sqrt(dvec4 x) { return sqrt(x); }

double _builtin_inversesqrt(double x) { return inversesqrt(x); }
dvec2 _builtin_inversesqrt(dvec2 x) { return inversesqrt(x); }
dvec3 _builtin_inversesqrt(dvec3 x) { return inversesqrt(x); }
dvec4 _builtin_inversesqrt(dvec4 x) { return inversesqrt(x); }

double _builtin_length(double x) { return length(x); }
double _builtin_length(dvec2 x) { return length(x); }
double _builtin_length(dvec3 x) { return length(x); }
double _builtin_length(dvec4 x) { return length(x); }

double _builtin_distance(double x, double y) { return distance(x, y); }
double _builtin_distance(dvec2 x, dvec2 y) { return distance(x, y); }
double _builtin_distance(dvec3 x, dvec3 y) { return distance(x, y); }
double _builtin_distance(dvec4 x, dvec4 y) { return distance(x, y); }

double _builtin_normalize(double x) { return normalize(x); }
dvec2 _builtin_normalize(dvec2 x) { return normalize(x); }
dvec3 _builtin_normalize(dvec3 x) { return normalize(x); }
dvec4 _builtin_normalize(dvec4 x) { return normalize(x); }

double _builtin_dot(double y, double x) { return dot(y, x); }
double _builtin_dot(dvec2 y, dvec2 x) { return dot(y, x); }
double _builtin_dot(dvec3 y, dvec3 x) { return dot(y, x); }
double _builtin_dot(dvec4 y, dvec4 x) { return dot(y, x); }

dvec3 _builtin_cross(dvec3 x, dvec3 y) { return cross(x, y); }

bool _builtin_isnan(double x) { return isnan(x); }
bvec2 _builtin_isnan(dvec2 x) { return isnan(x); }
bvec3 _builtin_isnan(dvec3 x) { return isnan(x); }
bvec4 _builtin_isnan(dvec4 x) { return isnan(x); }

bool _builtin_isinf(double x) { return isinf(x); }
bvec2 _builtin_isinf(dvec2 x) { return isinf(x); }
bvec3 _builtin_isinf(dvec3 x) { return isinf(x); }
bvec4 _builtin_isinf(dvec4 x) { return isinf(x); }

double _builtin_sign(double x) { return sign(x); }
dvec2 _builtin_sign(dvec2 x) { return sign(x); }
dvec3 _builtin_sign(dvec3 x) { return sign(x); }
dvec4 _builtin_sign(dvec4 x) { return sign(x); }

double _builtin_modf(double x, out double i) { return modf(x, i); }
dvec2 _builtin_modf(dvec2 x, out dvec2 i) { return modf(x, i); }
dvec3 _builtin_modf(dvec3 x, out dvec3 i) { return modf(x, i); }
dvec4 _builtin_modf(dvec4 x, out dvec4 i) { return modf(x, i); }

double _builtin_max(double y, double x) { return max(y, x); }
dvec2 _builtin_max(dvec2 y, dvec2 x) { return max(y, x); }
dvec3 _builtin_max(dvec3 y, dvec3 x) { return max(y, x); }
dvec4 _builtin_max(dvec4 y, dvec4 x) { return max(y, x); }

double _builtin_min(double y, double x) { return min(y, x); }
dvec2 _builtin_min(dvec2 y, dvec2 x) { return min(y, x); }
dvec3 _builtin_min(dvec3 y, dvec3 x) { return min(y, x); }
dvec4 _builtin_min(dvec4 y, dvec4 x) { return min(y, x); }
