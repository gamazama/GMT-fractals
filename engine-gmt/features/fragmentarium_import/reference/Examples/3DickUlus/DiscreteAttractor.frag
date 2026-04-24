// New 2D fragment...
#include "MathUtils.frag"
#include "Progressive2D.frag"

// the tab for our set of control sliders
#group Attractor
// Number of iterations
uniform int   Formula; menu[0,Clifford;PeterdeJong]
uniform int   Iterations; slider[10,200,100000] 
uniform float a; slider[-20,1.7,20]
uniform float b; slider[-20,1.7,20]
uniform float c; slider[-20,0.6,20]
uniform float d; slider[-20,1.2,20]
uniform float density; slider[0.0001,0.01,0.1]

// the tab for palette controls
#group Color
uniform vec3 Primary; color[1.00, 0.35, 0.00]
uniform vec3 Secondary; color[0.50, 0.00, 0.50]
uniform vec3 Background; color[0.0,0.0,0.0]

//http://paulbourke.net/fractals/clifford/
vec2 Clifford(vec2 last)
{
	vec2 next = vec2(0);
	next.x = sin(a * last.y) + c * cos(a * last.x);
	next.y = sin(b * last.x) + d * cos(b * last.y);
	return next;
}
//http://paulbourke.net/fractals/peterdejong/
vec2 PeterdeJong(vec2 last)
{
	vec2 next = vec2(0);
	next.x = sin(a * last.y) - cos(b * last.x);
	next.y = sin(c * last.x) - cos(d * last.y); 
	return next;
}

vec3 color(vec2 c) { 
	
	// beginning with c seems to plot a few points that dont belong
	// randomizing the starting point makes a cleaner plot
   vec2 last = rand2(c); // begin with this point

   vec2 next = vec2(0);
	float psum = 0.0;
	int i; 

 	for (i = 0; i < Iterations; i++) {
		if(Formula==0) next = Clifford(last);
		else
		if(Formula==1) next = PeterdeJong(last);
      psum += smoothstep(density, 0.0, distance(c, next));
      last = next;
	} 

    float x = clamp(psum, 0.0, 1.0);
    
    vec3 col = Background;
    col = mix(col, Primary, pow(x, 0.35));
    col = mix(col, Secondary, smoothstep(0.05,0.8,x));
    
    return col;
} 
 
#preset Default
Center = 0,0
Zoom = 0.333333333
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
Iterations = 1000
a = 1.7
b = 1.7
c = 0.6
d = 1.2
density = 0.03
Primary = 1,0.35,0
Secondary = 0.5,0,0.5
Background = 1,1,1
Formula = 0
#endpreset


#preset Clifford
Center = 0.01568661,-0.005117285
Zoom = 0.434782609
EnableTransform = false
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 2
GaussianAA = false
Iterations = 10000
a = 1.7
b = 1.7
c = 0.6
d = 1.2
density = 0.01
Primary = 1,0.35,0
Secondary = 0.5,0,0.5
Background = 0,0,0
Formula = 0
#endpreset

#preset PeterdeJong
Center = -0.021666667,0.023333333
Zoom = 0.434782609
EnableTransform = false
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 2
GaussianAA = false
Iterations = 10000
a = -2
b = -2
c = -1.2
d = 2
density = 0.01
Primary = 1,0.35,0
Secondary = 0.5,0,0.5
Background = 0,0,0
Formula = 1
#endpreset

#preset PaulBourke
Center = 0.177777778,0
Zoom = 0.5
EnableTransform = false
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 2
GaussianAA = false
Iterations = 10000
a = -1.4
b = 1.6
c = 1
d = 0.7
density = 0.01
Primary = 1,0.35,0
Secondary = 0.5,0,0.5
Background = 0,0,0
Formula = 0
#endpreset
