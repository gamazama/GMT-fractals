#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

#vertex

varying vec2 coord;

void main(void)
{
  gl_Position =  gl_Vertex;
  coord = ((gl_ProjectionMatrix * gl_Vertex).xy + vec2(1.0)) * 0.5;
}

#endvertex

varying vec2 coord;

uniform sampler2D frontbuffer;

#group Post

// Exposure control (logarithmic)
uniform float Exposure; slider[-10.0,0.0,10.0]
// Check for out of gamut pixels
uniform bool ShowHotPixels; checkbox[false]

float sRGB(float c)
{
  c = clamp(c, 0.0, 1.0);
  const float a = 0.055;
  if (c <= 0.0031308)
    return 12.92 * c;
  else
    return (1.0 + a) * pow(c, 1.0 / 2.4) - a;
}

vec3 sRGB(vec3 c)
{
  if ((!ShowHotPixels) ||
      ( 0.0 <= c.x && c.x <= 1.0 &&
        0.0 <= c.y && c.y <= 1.0 &&
        0.0 <= c.z && c.z <= 1.0 ) )
  {
    return vec3(sRGB(c.x), sRGB(c.y), sRGB(c.z));
  }
  return vec3(1.0, 0.0, 0.0);
}

void main(void)
{
  vec4 tex = texture2D(frontbuffer, coord);
  vec3 c = sRGB(pow(2.0, Exposure) * tex.xyz / tex.a);
  gl_FragColor = vec4(c, 1.0);
}
