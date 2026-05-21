#version 330 compatibility
#extension GL_ARB_arrays_of_arrays : require
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info 2D Mandelbrot example of Pauldelbrot's multiwave colouring

#include "TwoD.frag"
#include "EscapeTime.frag"

vec3 palette(float n)
{
  return multiwave(n);
}

vec3 palette(vec2 nde)
{
  return multiwave(nde.x) * tanh(clamp(nde.y, 0.0, 4.0));
}

Complexf formula(Complexf z, Complexf c)
{
  return add(sqr(z), c);
}

Dual1cf formula(Dual1cf z, Dual1cf c)
{
  return add(sqr(z), c);
}

float trap(Complexf z)
{
  return norm(z);
}


#preset Default
CompensatedHack = 1
Compensated2IEEEAdd = true
EnableTransform = true
RotateAngle = 37.4231376
StretchAngle = 0
StretchAmount = 0
Zoom = 43.5353958
ZoomFactor = 0
CenterX = -0.545612860138656064,-0.280383110046386719,0.00900719925474099264,0.00390625
CenterY = 0.552601717545087356,-0.359978675842285156,0.011260986328125,0
Center = -0.54561286,0.552601718
Jitter = 1
Samples = 1
Shutter = 0.01
Iterations = 1483
EscapeRadius = 112.108508
Julia = false
JuliaC = 0,0
Seed = 0,0
DistanceEstimate = true
Exposure = 0.5174826
ShowHotPixels = false
Wave1Period = 1
Wave1Colour1 = 0.933333333,0.933333333,0.925490196
Wave1Colour2 = 0,0.00784313725,0.156862745
Wave1Colour3 = 0.8,0,0
Wave1Colour4 = 0.458823529,0.31372549,0.482352941
Wave2Period = 67
Wave2Colour1 = 0.643137255,0,0
Wave2Colour2 = 0.988235294,0.68627451,0.243137255
Wave2Colour3 = 0.807843137,0.360784314,0
Wave2Colour4 = 0.960784314,0.474509804,0
Wave3Period = 24
Wave3Colour1 = 0.333333333,0.341176471,0.325490196
Wave3Colour2 = 0.305882353,0.603921569,0.0235294118
Wave3Colour3 = 0,0.5,0
Wave3Colour4 = 0.541176471,0.88627451,0.203921569
Wave4Period = 144
Wave4Colour1 = 0.533333333,0.541176471,0.521568627
Wave4Colour2 = 0.203921569,0.396078431,0.643137255
Wave4Colour3 = 0.125490196,0.290196078,0.529411765
Wave4Colour4 = 0,0,1
InteriorColour = 0,0,0
#endpreset
