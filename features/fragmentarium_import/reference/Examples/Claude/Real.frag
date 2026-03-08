#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Real number primitive template instantiation.
*/

#define REAL float
#define real float
#include "RealBase.frag"
#undef real
#undef REAL

#if __VERSION__ >= 400

#define REAL double
#define real double
#include "RealBase.frag"
#undef real
#undef REAL

#endif
