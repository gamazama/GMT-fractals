#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

// implement this
float screen(vec4 tex, float wavelength);

#group SkyBox

// equirectangular (360x180 degrees) texture for background
uniform sampler2D Background; file[...]

// distance from origin at which the cube map is drawn
uniform float Distance; slider[0,100,1000]

// no struct SkyBox as samplers can only be uniforms or function arguments

vec4 textureEqui(sampler2D sampler, vec3 dir)
{
  dir = normalize(dir);
  vec2 coord = vec2(atan(dir.y, -dir.x) / (2.0 * pi), acos(-dir.z) / pi);
  return texture(sampler, coord);
}

vec4 SkyBox_texture(Transform T, Ray V)
{
  return textureEqui(Background, backwardN(T, V.direction));
}

float SkyBox_intensity(Transform T, Ray V)
{
  return screen(SkyBox_texture(T, V), V.wavelength);
}

float SkyBox(Scene_DE tag, Transform T, Ray V)
{
  return Distance - length(backwardP(T, V.origin));
}

Hit SkyBox(Scene_HIT tag, Transform T, Ray V)
{
  Scene_DE DE = Scene_DE(0);
  Surface S;
  S.position = V.origin;
  S.normal = -normalize(V.origin);
  S.de = SkyBox(DE, T, V);
  Hit h;
  h.surface = S;
  h.ray = V;
  h.factor = 0.0;
  h.emit = SkyBox_intensity(T, V);
  return h;
}
