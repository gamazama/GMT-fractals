#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Overload builtins.  See `Builtin.frag` for details.
*/

double abs(double x) { return _builtin_abs(x); }
dvec2 abs(dvec2 x) { return _builtin_abs(x); }
dvec3 abs(dvec3 x) { return _builtin_abs(x); }
dvec4 abs(dvec4 x) { return _builtin_abs(x); }

double dot(double y, double x) { return _builtin_dot(y, x); }
double dot(dvec2 y, dvec2 x) { return _builtin_dot(y, x); }
double dot(dvec3 y, dvec3 x) { return _builtin_dot(y, x); }
double dot(dvec4 y, dvec4 x) { return _builtin_dot(y, x); }

dvec3 cross(dvec3 x, dvec3 y) { return _builtin_cross(x, y); }

bool isnan(double x) { return _builtin_isnan(x); }
bvec2 isnan(dvec2 x) { return _builtin_isnan(x); }
bvec3 isnan(dvec3 x) { return _builtin_isnan(x); }
bvec4 isnan(dvec4 x) { return _builtin_isnan(x); }

bool isinf(double x) { return _builtin_isinf(x); }
bvec2 isinf(dvec2 x) { return _builtin_isinf(x); }
bvec3 isinf(dvec3 x) { return _builtin_isinf(x); }
bvec4 isinf(dvec4 x) { return _builtin_isinf(x); }

double sign(double x) { return _builtin_sign(x); }
dvec2 sign(dvec2 x) { return _builtin_sign(x); }
dvec3 sign(dvec3 x) { return _builtin_sign(x); }
dvec4 sign(dvec4 x) { return _builtin_sign(x); }

double modf(double x, out double i) { return _builtin_modf(x, i); }
dvec2 modf(dvec2 x, out dvec2 i) { return _builtin_modf(x, i); }
dvec3 modf(dvec3 x, out dvec3 i) { return _builtin_modf(x, i); }
dvec4 modf(dvec4 x, out dvec4 i) { return _builtin_modf(x, i); }

double max(double y, double x) { return _builtin_max(y, x); }
dvec2 max(dvec2 y, dvec2 x) { return _builtin_max(y, x); }
dvec3 max(dvec3 y, dvec3 x) { return _builtin_max(y, x); }
dvec4 max(dvec4 y, dvec4 x) { return _builtin_max(y, x); }

double min(double y, double x) { return _builtin_min(y, x); }
dvec2 min(dvec2 y, dvec2 x) { return _builtin_min(y, x); }
dvec3 min(dvec3 y, dvec3 x) { return _builtin_min(y, x); }
dvec4 min(dvec4 y, dvec4 x) { return _builtin_min(y, x); }
