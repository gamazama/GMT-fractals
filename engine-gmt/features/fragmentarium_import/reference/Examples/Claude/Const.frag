#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Constants.
*/

#if __VERSION__ >= 400

const double M_PI = 3.14159265358979323846LF;
const double M_2PI = M_PI*2.0LF;
const double M_PI2 = M_PI/2.0LF;
const double M_E = 2.71828182845904523536LF;
const double M_EHALF = 1.6487212707001281469LF;

#else

const float M_PI = 3.14159265358979323846;
const float M_2PI = M_PI*2.0;
const float M_PI2 = M_PI/2.0;
const float M_E = 2.71828182845904523536;
const float M_EHALF = 1.6487212707001281469;

#endif
