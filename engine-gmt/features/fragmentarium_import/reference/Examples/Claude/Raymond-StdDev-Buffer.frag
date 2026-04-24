#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Raymond - a physics-inspired ray tracer for Fragmentarium
Copyright (C) 2018  Claude Heiland-Allen
License GPL3+ <http://www.gnu.org/licenses/>
*/

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

vec3 stddev(vec3 v)
{
  float m = v[1] / v[0];
  float s = sqrt(v[0] * v[2] - v[1] * v[1]) / v[0];
  return vec3(s);
}

void main(void)
{
  vec4 tex = texture2D(frontbuffer, coord);
  vec3 c = stddev(tex.xyz / tex.a);
  gl_FragColor = vec4(c, 1.0);
}
