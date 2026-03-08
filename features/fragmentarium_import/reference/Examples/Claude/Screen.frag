#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

float Screen_hump(vec3 spec, float wavelength)
{
  float delta = (wavelength - spec[0]) / spec[1];
  return spec[2] / (1.0 + 4.0 * delta * delta);
}

// <http://www.marcelpatek.com/LCD.html> (Figure 2)
float CRT(vec3 linearRGB, float wavelength)
{
  const vec3 r[2] = vec3[2]
    ( vec3(710.0,  25.0, 0.5)
    , vec3(625.0,  25.0, 1.0)
    );
  const vec3 g =
      vec3(540.0, 100.0, 0.5);
  const vec3 b =
      vec3(450.0, 100.0, 0.5);
  float v = 0.0;
  v += linearRGB.r * Screen_hump(r[0], wavelength);
  v += linearRGB.r * Screen_hump(r[1], wavelength);
  v += linearRGB.g * Screen_hump(g   , wavelength);
  v += linearRGB.b * Screen_hump(b   , wavelength);
  return v;
}

// <http://www.marcelpatek.com/LCD.html> (Figure 3)
float LCD(vec3 linearRGB, float wavelength)
{
  const vec3 r[2] = vec3[2]
    ( vec3(710.0, 25.0, 0.1 * 0.8)
    , vec3(610.0, 15.0, 1.0 * 0.8)
    );
  const vec3 g[3] = vec3[3]
    ( vec3(585.0, 25.0, 0.2)
    , vec3(545.0, 15.0, 1.0)
    , vec3(490.0, 20.0, 0.3)
    );
  const vec3 b[3] = vec3[3]
    ( vec3(550.0, 25.0, 0.1 * 0.5)
    , vec3(590.0, 40.0, 0.9 * 0.5)
    , vec3(450.0, 50.0, 1.0 * 0.5)
    );
  float v = 0.0;
  v += linearRGB.r * Screen_hump(r[0], wavelength);
  v += linearRGB.r * Screen_hump(r[1], wavelength);
  v += linearRGB.g * Screen_hump(g[0], wavelength);
  v += linearRGB.g * Screen_hump(g[1], wavelength);
  v += linearRGB.g * Screen_hump(g[2], wavelength);
  v += linearRGB.b * Screen_hump(b[0], wavelength);
  v += linearRGB.b * Screen_hump(b[1], wavelength);
  v += linearRGB.b * Screen_hump(b[2], wavelength);
  return v;
}
