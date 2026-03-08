#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

vec2 Water_nk(float wavelength)
{
  const float water_min   = 375;
  const float water_step  =  25;
#define water_count 20
  const vec2  water_nk[water_count] = vec2[water_count]
    ( vec2(1.341, 3.50E-9)
    , vec2(1.339, 1.86E-9)
    , vec2(1.338, 1.30E-9)
    , vec2(1.337, 1.02E-9)
    , vec2(1.336, 9.35E-10)
    , vec2(1.335, 1.00E-9)
    , vec2(1.334, 1.32E-9)
    , vec2(1.333, 1.96E-9)
    , vec2(1.333, 3.60E-9)
    , vec2(1.332, 1.09E-8)
    , vec2(1.332, 1.39E-8)
    , vec2(1.331, 1.64E-8)
    , vec2(1.331, 2.23E-8)
    , vec2(1.331, 3.35E-8)
    , vec2(1.330, 9.15E-8)
    , vec2(1.330, 1.56E-7)
    , vec2(1.330, 1.48E-7)
    , vec2(1.329, 1.25E-7)
    , vec2(1.329, 1.82E-7)
    , vec2(1.329, 2.93E-7)
    );
  float x  = (wavelength - water_min) / water_step;
  int   i0 = int(floor(x));
  int   i1 = i0 + 1;
  float f1 = x - float(i0);
  if (i0 < 0) return water_nk[0];
  if (i1 > water_count - 1) return water_nk[water_count - 1];
  vec2 y0 = water_nk[i0];
  vec2 y1 = water_nk[i1];
  return mix(y0, y1, f1);
#undef water_count
}
