#donotrun
// (c) 2018-2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// simple 3D camera, API defined by FragM
#camera 3D
#vertex

#group Camera
uniform float FOV; slider[0.0,0.4,2.0] NotLockable
uniform vec3 Eye; slider[(-50,-50,-50),(0,0,-10),(50,50,50)] NotLockable
uniform vec3 Target; slider[(-50,-50,-50),(0,0,0),(50,50,50)] NotLockable
uniform vec3 Up; slider[(0,0,0),(0,1,0),(0,0,0)] NotLockable

uniform vec2 pixelSize;

varying vec3 Forward;
varying vec3 UpOrtho;
varying vec3 Right;
varying vec2 coord;
varying vec2 texCoord;

void main(void)
{
  Forward = normalize(Target - Eye);
  UpOrtho = normalize(Up - dot(Forward, Up) * Forward);
  Right = normalize(cross(Forward, UpOrtho));
  coord = (gl_ProjectionMatrix * gl_Vertex).xy;
  coord.x *= pixelSize.y / pixelSize.x;
  texCoord = (gl_Vertex.xy + vec2(1.0)) * 0.5;
  gl_Position =  gl_Vertex;
}

#endvertex

varying vec3 Forward;
varying vec3 UpOrtho;
varying vec3 Right;
varying vec2 coord;
varying vec2 texCoord;

uniform float FOV;
uniform vec3 Eye;
uniform vec2 pixelSize;

uniform sampler2D backbuffer;
uniform int subframe;
uniform float time;

#group Debug
uniform bool DebugDepth; checkbox[false]
uniform bool DebugNormal; checkbox[false]
uniform bool DebugBounce; checkbox[false]

void main(void)
{
  // seed pseudo-random number generator based on coordinates
  Random PRNG;
  PRNG.seed = hash(vec4(coord, time, subframe));
  PRNG.index = uint(subframe);
  // encapsulate camera parameters from uniform variables
  Camera C;
  C.origin = Eye;
  C.X = Right;
  C.Y = UpOrtho;
  C.Z = Forward;
  C.fieldOfView = FOV;
  // render image
  float factor = 1.0;
  Ray V = camera(srand(PRNG, 1), C, coord, factor);
  Hit H;
  float I = raytrace(srand(PRNG, 2), V, H);
  vec3 rgb = film(srand(PRNG, 3), V.wavelength, I * factor);
  // accumulate linear RGB values
  vec4 next = vec4(rgb, 1.0);
  if (DebugDepth)  next.xyz = vec3(distance(V.origin, H.surface.position));
  if (DebugNormal) next.xyz = vec3(0.5 + 0.5 * H.surface.normal);
  if (DebugBounce) next.xyz = vec3(0.5 + 0.5 * H.ray.direction);
  if (! (next == next)) next = vec4(0.0); // NaN check
  if (! (dot(next, next) < 1.0/0.0)) next = vec4(0.0); // Infinity check
  vec4 prev = texture(backbuffer, texCoord);
  gl_FragColor = prev + next;
}
