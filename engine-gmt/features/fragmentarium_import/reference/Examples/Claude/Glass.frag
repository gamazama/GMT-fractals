#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
// database/glass/schott/F2.yml

float Glass_n(float wavelength) {
  float l2 = 1.0e-6 * wavelength * wavelength;
  return sqrt(1.0 + l2 *
    ( 1.34533359 / (l2 - 0.00997743871)
    + 0.209073176 / (l2 - 0.0470450767)
    + 0.937357162 / (l2 - 111.886764)
    ));
}

float Glass_k(float wavelength) {
  const vec2 glass_lk[13] = vec2[13]
    ( vec2(1000.0 * 0.390, 2.8886e-8)
    , vec2(1000.0 * 0.400, 1.9243e-8)
    , vec2(1000.0 * 0.405, 1.6869e-8)
    , vec2(1000.0 * 0.420, 1.2087e-8)
    , vec2(1000.0 * 0.436, 9.7490e-9)
    , vec2(1000.0 * 0.460, 8.8118e-9)
    , vec2(1000.0 * 0.500, 4.7818e-9)
    , vec2(1000.0 * 0.546, 3.4794e-9)
    , vec2(1000.0 * 0.580, 3.6961e-9)
    , vec2(1000.0 * 0.620, 3.9510e-9)
    , vec2(1000.0 * 0.660, 6.3120e-9)
    , vec2(1000.0 * 0.700, 4.4608e-9)
    , vec2(1000.0 * 1.060, 6.7549e-9)
    );
  if (wavelength < glass_lk[0][0]) return glass_lk[0][1];
  for (int i0 = 0; i0 < 12; ++i0) {
    int i1 = i0 + 1;
    float l0 = glass_lk[i0][0];
    float l1 = glass_lk[i1][0];
    if (l0 <= wavelength && wavelength <= l1) {
      float f1 = (wavelength - l0) / (l1 - l0);
      float k0 = glass_lk[i0][1];
      float k1 = glass_lk[i1][1];
      return mix(k0, k1, f1);
    }
  }
  return glass_lk[12][1];
}

vec2 Glass_nk(float wavelength)
{
  return vec2(Glass_n(wavelength), Glass_k(wavelength));
}
