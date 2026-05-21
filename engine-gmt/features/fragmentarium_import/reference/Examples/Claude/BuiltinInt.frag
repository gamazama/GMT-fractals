#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Capture builtin functions before redefinition.
In GLSL, built in functions cannot be overloaded, only redefined.
The redefinitions *can* be overloaded.
This is needed to define double precision versions of missing functions.
*/

int _builtin_abs(int x) { return abs(x); }
ivec2 _builtin_abs(ivec2 x) { return abs(x); }
ivec3 _builtin_abs(ivec3 x) { return abs(x); }
ivec4 _builtin_abs(ivec4 x) { return abs(x); }

int _builtin_max(int y, int x) { return max(y, x); }
ivec2 _builtin_max(ivec2 y, ivec2 x) { return max(y, x); }
ivec3 _builtin_max(ivec3 y, ivec3 x) { return max(y, x); }
ivec4 _builtin_max(ivec4 y, ivec4 x) { return max(y, x); }
