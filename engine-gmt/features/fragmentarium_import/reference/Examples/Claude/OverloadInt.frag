#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Overload builtins.  See `Builtin.frag` for details.
*/

int abs(int x) { return _builtin_abs(x); }
ivec2 abs(ivec2 x) { return _builtin_abs(x); }
ivec3 abs(ivec3 x) { return _builtin_abs(x); }
ivec4 abs(ivec4 x) { return _builtin_abs(x); }

int max(int y, int x) { return _builtin_max(y, x); }
ivec2 max(ivec2 y, ivec2 x) { return _builtin_max(y, x); }
ivec3 max(ivec3 y, ivec3 x) { return _builtin_max(y, x); }
ivec4 max(ivec4 y, ivec4 x) { return _builtin_max(y, x); }
