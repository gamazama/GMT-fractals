
#include "MathUtils.frag"
#include "Progressive2D.frag"
#info Derived from...
#info https://fractalforums.org/share-a-fractal/22/has-anyone-seen-this-fractal-before-and-what-is-the-formula/3576/msg22122
#info Thanks for sharing to user brucedawson (Fractal eXtreme author) at FractalForums.org
#info This variant uses cos() instead of sin() and has some options like abs(), Julia etc...
#group HiddenM

// Number of iterations
uniform int  Iterations; slider[10,200,10000]

uniform vec3 RGB; color[0.7,0.4,0.0]

uniform float ColorDiv; slider[0.00001,256,512]
uniform float Bailout; slider[0.00001,16,512]
uniform bool Julia; checkbox[false]
uniform float JuliaX; slider[-2,-0.6,2]
uniform float JuliaY; slider[-2,1.3,2]
uniform float One; slider[-4,1,4]
uniform float Two; slider[-4,2,4]
uniform bool AbsX; checkbox[false]
uniform bool AbsY; checkbox[false]
uniform bool ReflX; checkbox[false]
uniform bool ReflY; checkbox[false]
uniform float RX; slider[-4,0,4]
uniform float RY; slider[-4,1,4]

vec2 c2 = vec2(JuliaX,JuliaY);

float refl(float val, float axis, bool dir) {
	if ((dir && val > axis) || (!dir && val < axis)) {
		return (val-axis)*-1. + axis;
	}
	return val;
}

vec3 color(vec2 c) {
	c *= vec2(1.,-1.);
	vec2 z = c;
	float len = 0.0;
	int  i = 0;
   float twoxy;
   float newzi;

	for (i = 0; i < Iterations; i++) {
		if(AbsX) z.x=abs(z.x);
		if(AbsY) z.y=abs(z.y);

      twoxy = Two * z.x * z.y;
      newzi = twoxy * (One + cos(twoxy)) + (Julia ? c2.y : c.y);
      z.x = z.x * z.x - z.y * z.y + (Julia ? c2.x : c.x);
      z.y = newzi;

		if(ReflX)
			z.x = refl(z.x, RX, ReflX);
		if(ReflY)
			z.y = refl(z.y, RY, ReflY);

		len = max(len,dot(z,z));
		if ( (len > Bailout)) break;
	}

	if ( len > Bailout ) {
		// The color scheme here is based on one from Inigo Quilez's Shader Toy:
		float co = float(i) + 6.18 - log2(.5*log2(length(z)));
		co = sqrt(co/ColorDiv);
		return .5+.5*cos(6.18*co+RGB);
	}

return vec3(0.0);

}

#preset Default
Center = -0.657702967,0.072553426
Zoom = 0.45560664 Logarithmic
EnableTransform = false
RotateAngle = 0
StretchAngle = -53.0483688
StretchAmount = -1.237344
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1.5
AAExp = 1
GaussianAA = true
Iterations = 200
RGB = 1,0.568627451,0
ColorDiv = 1
Julia = false
JuliaX = -0.6
JuliaY = 1.07419716
Two = 1
One = 1
AbsX = false
AbsY = false
Bailout = 512
#endpreset

#preset Mandel2
Center = -0.511230564,0.015016967
Zoom = 0.756143667 Logarithmic
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 200
RGB = 0.701960784,0.407843137,0
ColorDiv = 4 Logarithmic
Bailout = 512
Julia = false
JuliaX = 0
JuliaY = 0
One = 3.141592
Two = 0.5
AbsX = false
AbsY = false
#endpreset

#preset Julia1
Center = -0.005344907,0.001936093
Zoom = 0.956536862 Logarithmic
EnableTransform = true
RotateAngle = 90
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 1400
RGB = 0.701960784,0.407843137,0
ColorDiv = 4 Logarithmic
Bailout = 32
Julia = true
JuliaX = 0.307828
JuliaY = -0.03225804
Two = -1.27131784
One = 1.05869328
AbsX = false
AbsY = false
#endpreset

#preset nice
Center = 0.04124063,0.025388696
Zoom = 1.97654281 Logarithmic
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 328
RGB = 0.701960784,0.407843137,0
ColorDiv = 64 Logarithmic
Bailout = 16
Julia = true
JuliaX = -0.30786268
JuliaY = -0.81284604
Two = -1
One = -2
A = 0,0
AbsX = false
AbsY = false
#endpreset

#preset ThreeThirteen0A
Center = -0.458149116,0.020827426
Zoom = 0.796858869 Logarithmic
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 2000
RGB = 0.701960784,0.407843137,0
ColorDiv = 4 Logarithmic
Bailout = 32
Julia = false
JuliaX = -0.46982408
JuliaY = -0.159524345
Two = 3
One = 0.13
A = -1,0
AbsX = false
AbsY = false
#endpreset

#preset ThreeThirteenJ1
Center = -0.02570281,-0.013158448
Zoom = 0.523947642 Logarithmic
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 2000
RGB = 0.701960784,0.407843137,0
ColorDiv = 4 Logarithmic
Bailout = 16
Julia = true
JuliaX = -0.475824118
JuliaY = 0.159524345
Two = 1
One = 1
A = -1,0
AbsX = false
AbsY = false
#endpreset

#preset ThreeThirteenCJ
Center = -0.146179857,0.023275535
Zoom = 0.692920756 Logarithmic
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 2000
RGB = 0.701960784,0.407843137,0
ColorDiv = 4 Logarithmic
Bailout = 32
Julia = true
JuliaX = -1
JuliaY = 0
Two = 3
One = 0.13
A = -1,0
AbsX = false
AbsY = false
#endpreset

#preset Tricorn
Center = -0.37464766,0.077785907
Zoom = 0.602539781 Logarithmic
EnableTransform = false
RotateAngle = 0
StretchAngle = -53.0483688
StretchAmount = -1.237344
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1.5
AAExp = 1
GaussianAA = true
Iterations = 200
RGB = 1,0.568627451,0
ColorDiv = 1
Bailout = 512
Julia = false
JuliaX = -0.6
JuliaY = 1.07419716
One = 3
Two = -0.5
AbsX = false
AbsY = false
#endpreset

#preset Mandelbot
Center = -0.37464766,0.077785907
Zoom = 0.602539781 Logarithmic
EnableTransform = false
RotateAngle = 0
StretchAngle = -53.0483688
StretchAmount = -1.237344
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1.5
AAExp = 1
GaussianAA = true
Iterations = 200
RGB = 1,0.568627451,0
ColorDiv = 1
Bailout = 512
Julia = false
JuliaX = -0.6
JuliaY = 1.07419716
One = 2
Two = 0.666666666
AbsX = false
AbsY = false
#endpreset

#preset Titanic
Center = -0.371050696,0.729307988
Zoom = 0.432327596 Logarithmic
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 2
AAExp = 1
GaussianAA = true
Iterations = 200
RGB = 0.701960784,0.407843137,0
ColorDiv = 4 Logarithmic
Julia = false
JuliaX = 0
JuliaY = 0
Two = 1
One = 2
AbsX = true
AbsY = true
Bailout = 512
#endpreset
