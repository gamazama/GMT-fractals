#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

#buffer RGBA32F
#buffershader "Raymond-StdDev-Buffer.frag"

vec3 film_stddev(Random PRNG, float wavelength, float intensity)
{
  return vec3(1.0, intensity, intensity * intensity);
}
