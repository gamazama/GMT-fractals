#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
/*
Dual number template instantiation file.
*/

#define MONO float
#define mono float
#define DDIM 1
#define DUAL Dual1f
#define dual dual1f
#include "DualBase.frag"
float derivative(Dual1f x) { return x.d[0]; }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO float
#define mono float
#define DDIM 2
#define DUAL Dual2f
#define dual dual2f
#include "DualBase.frag"
vec2 derivative(Dual2f x) { return vec2(x.d[0], x.d[1]); }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO float
#define mono float
#define DDIM 3
#define DUAL Dual3f
#define dual dual3f
#include "DualBase.frag"
vec3 derivative(Dual3f x) { return vec3(x.d[0], x.d[1], x.d[2]); }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO float
#define mono float
#define DDIM 4
#define DUAL Dual4f
#define dual dual4f
#include "DualBase.frag"
vec4 derivative(Dual4f x) { return vec4(x.d[0], x.d[1], x.d[2], x.d[3]); }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO Complexf
#define mono complexf
#define DDIM 1
#define DUAL Dual1cf
#define dual dual1cf
#include "DualBase.frag"
Complexf derivative(Dual1cf x) { return x.d[0]; }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#if __VERSION__ >= 400

#define MONO double
#define mono double
#define DDIM 1
#define DUAL Dual1d
#define dual dual1d
#include "DualBase.frag"
double derivative(Dual1d x) { return x.d[0]; }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO double
#define mono double
#define DDIM 2
#define DUAL Dual2d
#define dual dual2d
#include "DualBase.frag"
dvec2 derivative(Dual2d x) { return dvec2(x.d[0], x.d[1]); }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO double
#define mono double
#define DDIM 3
#define DUAL Dual3d
#define dual dual3d
#include "DualBase.frag"
dvec3 derivative(Dual3d x) { return dvec3(x.d[0], x.d[1], x.d[2]); }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO double
#define mono double
#define DDIM 4
#define DUAL Dual4d
#define dual dual4d
#include "DualBase.frag"
dvec4 derivative(Dual4d x) { return dvec4(x.d[0], x.d[1], x.d[2], x.d[3]); }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO FloatX
#define mono floatx
#define DDIM 1
#define DUAL Dual1fx
#define dual dual1fx
#include "DualBase.frag"
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO FloatX
#define mono floatx
#define DDIM 2
#define DUAL Dual2fx
#define dual dual2fx
#include "DualBase.frag"
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO FloatX
#define mono floatx
#define DDIM 3
#define DUAL Dual3fx
#define dual dual3fx
#include "DualBase.frag"
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO FloatX
#define mono floatx
#define DDIM 4
#define DUAL Dual4fx
#define dual dual4fx
#include "DualBase.frag"
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO DoubleX
#define mono doublex
#define DDIM 1
#define DUAL Dual1dx
#define dual dual1dx
#include "DualBase.frag"
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO DoubleX
#define mono doublex
#define DDIM 2
#define DUAL Dual2dx
#define dual dual2dx
#include "DualBase.frag"
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO DoubleX
#define mono doublex
#define DDIM 3
#define DUAL Dual3dx
#define dual dual3dx
#include "DualBase.frag"
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO DoubleX
#define mono doublex
#define DDIM 4
#define DUAL Dual4dx
#define dual dual4dx
#include "DualBase.frag"
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO Complexd
#define mono complexd
#define DDIM 1
#define DUAL Dual1cd
#define dual dual1cd
#include "DualBase.frag"
Complexd derivative(Dual1cd x) { return x.d[0]; }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO

#define MONO Complexdx
#define mono complexdx
#define DDIM 1
#define DUAL Dual1cdx
#define dual dual1cdx
#include "DualBase.frag"
Complexdx derivative(Dual1cdx x) { return x.d[0]; }
#undef dual
#undef DUAL
#undef DDIM
#undef mono
#undef MONO


#endif
