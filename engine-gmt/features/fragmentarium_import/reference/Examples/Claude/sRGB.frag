#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// accumulate linear RGBW and output as sRGB with exposure control
#buffer RGBA32F
#buffershader "Buffer-sRGB.frag"

// https://en.wikipedia.org/wiki/SRGB#The_forward_transformation_(CIE_XYZ_to_sRGB)
float linear2sRGB(float c)
{
  c = clamp(c, 0.0, 1.0);
  const float a = 0.055;
  if (c <= 0.0031308)
    return 12.92 * c;
  else
    return (1.0 + a) * float(pow(c, 1.0 / 2.4)) - a;
}

vec3 linear2sRGB(vec3 c)
{
  return vec3(linear2sRGB(c.x), linear2sRGB(c.y), linear2sRGB(c.z));
}

// https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation
float sRGB2linear(float c)
{
  c = clamp(c, 0.0, 1.0);
  const float a = 0.055;
  if (c <= 0.04045)
    return c / 12.92;
  else
    return float(pow((c + a) / (1.0 + a), 2.4));
}

vec3 sRGB2linear(vec3 c)
{
  return vec3(sRGB2linear(c.x), sRGB2linear(c.y), sRGB2linear(c.z));
}
