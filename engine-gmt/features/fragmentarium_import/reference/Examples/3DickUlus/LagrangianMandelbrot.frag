#include "Complex.frag"
#include "MathUtils.frag"
#include "Progressive2D.frag"
#info Unveiling Fractal Structure with Lagrangian Descriptors
#info https://fractalforums.org/fractal-mathematics-and-new-theories/28/unveiling-the-fractal-structure-of-julia-sets-with-lagrangian-descriptors/3376/msg20446#msg20446

#group Lagrangian

// Number of iterations
uniform int  Iterations; slider[1,200,1000]
uniform vec3 RGB; slider[(0,0,0),(0.0,0.4,0.7),(1,1,1)]
uniform bool Julia; checkbox[false]
uniform vec2 JuliaXY; slider[(-2,-2),(-0.6,1.3),(2,2)]
uniform float p; slider[0,.6,1]

/* partial pnorm
   input: z, c, p
   output ppn
*/

float ppnorm( vec2 z, vec2 c, float p){

	vec3 s0,s1; // for 2 points on the Riemann sphere
	float d; // denominator
	float ds;

	// map from complex plane to riemann sphere
	// z
	d = z.x*z.x + z.y*z.y + 1.0;
	s0 = vec3(2.0*z,(d-2.0))/d;
	// zn
	d = c.x*c.x + c.y*c.y + 1.0;
	s1 = vec3(2.0*c,(d-2.0))/d;
	// sum
	vec3 ss = pow(abs(s1 - s0),vec3(p));
   ds = ss.x+ss.y+ss.z;

	return ds;
}

// DLD = Discret Lagrangian Descriptior
float lagrangian( vec2 z, vec2 c, float p ){

	int i; // number of iteration
	float d = 0.0; // DLD = sum

	for (i=0; i<Iterations; ++i){
		d += ppnorm(z, c, p); // sum z
		z = cMul(z,z) +c; // complex iteration
		if (cAbs(z) > 1e19 ) break; // exterior : upper limit of float type
	}

	d /= float(i); // averaging not summation

	return d;
}

vec3 color(vec2 c) {
	vec2 z = Julia ? c : vec2(0.,0.);
	if(Julia) c = JuliaXY;
	float co = lagrangian( z, c, p );
	return .5+.5*cos(6.2831*co+RGB);
}

#preset Default
Center = -0.724636541,0.025224931
Zoom = 0.64613535
EnableTransform = false
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
Iterations = 20
RGB = 0,0.4,0.7
p = 0.1444322
Julia = false
JuliaXY = -1.05204872,0
Bailout = 1000
#endpreset

#preset Basilica
Center = -0.025346913,-0.013859176
Zoom = 0.561856826
EnableTransform = false
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
Iterations = 20
RGB = 0,0.4,0.7
p = 0.1444322
Julia = true
JuliaXY = -1.05204872,0
Bailout = 1000
#endpreset
