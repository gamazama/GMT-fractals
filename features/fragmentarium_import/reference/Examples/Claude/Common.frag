#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Library definition.
*/

#include "Builtin.frag"
#include "Overload.frag"
#include "Const.frag"
#include "Int.frag"
#if __VERSION__ >= 400
#include "Double.frag"
#endif
#include "Real.frag"
#if __VERSION__ >= 400
#include "FloatX.frag"
#endif
#if __VERSION__ >= 400
#include "Compensated.frag"
#endif
#include "Complex.frag"
#include "Dual.frag"
#include "Vec.frag"
#include "Triplex.frag"
#include "Mandelbulb.frag"
#include "MengerSponge.frag"
#include "Magnetbulb.frag"
#include "Hash.frag"
#include "MandelbrotNumerics.frag"
#include "Quaternion.frag"
#include "D65.frag"
#include "Glass.frag"
#include "Quartz.frag"
#include "Water.frag"
#include "Observer.frag"
#include "FP4Plus.frag"
#include "Screen.frag"
