#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Capture builtin functions before redefinition.
In GLSL, built in functions cannot be overloaded, only redefined.
The redefinitions *can* be overloaded.
This is needed to define double precision versions of missing functions.
*/

#include "BuiltinInt.frag"
#include "BuiltinFloat.frag"
#if __VERSION__ >= 400
#include "BuiltinDouble.frag"
#endif
