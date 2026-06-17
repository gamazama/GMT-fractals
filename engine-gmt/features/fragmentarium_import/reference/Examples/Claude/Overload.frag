#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Overload builtins.  See `Builtin.frag` for details.
*/

#include "OverloadInt.frag"
#include "OverloadFloat.frag"
#if __VERSION__ >= 400
#include "OverloadDouble.frag"
#endif
