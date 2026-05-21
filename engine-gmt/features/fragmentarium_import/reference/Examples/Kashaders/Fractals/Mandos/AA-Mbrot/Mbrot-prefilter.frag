#info Doesn't work correctly any more. Troubles with textures. If you can fix it please let me know! :)
#info it should work on fragmentarium 0.9.12

#info Anti aliasing experimental script for mandelbrot and julia sets.
#info should also work for other escape time 2D fractals
#info by knighty (2013). based on mandelbrot.frag by syntopia
#info uses mip mapping to prefilter the palette used for coloring. Also uses DE to help AA the border.

#include "MathUtils.frag"
#include "Progressive2D.frag"
#info Mandelbrot
#group Mandelbrot

// Number of iterations
uniform int  Iterations; slider[10,200,1000]

uniform bool Julia; checkbox[false]
uniform float JuliaX; slider[-2,-0.6,2]
uniform float JuliaY; slider[-2,1.3,2]

uniform bool ShowMap; checkbox[true]
uniform float MapZoom; slider[0.01,2.1,6]

#group Coloring
//Palette texture. use a painting programm (for example) to generate one. size should be 1x512.
uniform sampler2D img; file[nenu.png]
uniform bool Prefilter; checkbox[true]
//inside color
uniform vec3 insideColor; color[0.0,0.0,0.0]
//border color. Tray giving the same color as interior
uniform vec3 borderColor; color[0.0,0.0,0.0]
//well... try and see
uniform float rampSpeed; slider[0,1,2]
//well... try and see
uniform float rampPower; slider[0,1,2]
//a shift on the palette
uniform float rampShift; slider[0,1,2]
//blurring effect on the palette. also use it to make filtering better. The filtering used in this script is a (not too) bad approximative.
uniform float rampBlur; slider[0,0,8]
//"width" of border. small values will require more samples to anti-aliase
uniform float distWidth; slider[0,1,2]
//"softness?" of border. small values will require more samples to anti-aliase
uniform float distPower; slider[0,0.5,2]

// You can set texture parameters directly:
#TexParameter img GL_TEXTURE_MAG_FILTER GL_LINEAR
#TexParameter img GL_TEXTURE_WRAP_S GL_REPEAT
#TexParameter img GL_TEXTURE_WRAP_T GL_REPEAT

vec2 c2 = vec2(JuliaX,JuliaY);

vec2 complexMul(vec2 a, vec2 b) {
	return vec2( a.x*b.x -  a.y*b.y,a.x*b.y + a.y * b.x);
}

vec2 mapCenter = vec2(0.5,0.5);
float mapRadius =0.4;

vec3 getMapColor2D(vec2 c) {	
	vec2 p =  (aaCoord-mapCenter)/(mapRadius);
	p*=MapZoom; p.x/=pixelSize.x/pixelSize.y;
	if (abs(p.x)<2.0*pixelSize.y*MapZoom) return vec3(0.0,0.0,0.0);
	if (abs(p.y)<2.0*pixelSize.x*MapZoom) return vec3(0.0,0.0,0.0);
	p +=vec2(JuliaX, JuliaY) ;

	
	vec2 z =  vec2(0.0,0.0);
	
	int i = 0;
	for (i = 0; i < Iterations; i++) {
		z = complexMul(z,z) +p;
		if (dot(z,z)> 200.0) break;
	}
	if (i < Iterations) {
		float co =  float( i) + 1.0 - log2(.5*log2(dot(z,z)));
		co = sqrt(co/256.0);
		return vec3( .5+.5*cos(6.2831*co),.5+.5*cos(6.2831*co),.5+.5*cos(6.2831*co) );
	}  else {
		return vec3(0.0);
	}
	
}

vec3 color(vec2 c) {
	float pixsize=dFdx(c.x);
	if (ShowMap && Julia) {
		vec2 w = (aaCoord-mapCenter);
		w.y/=(pixelSize.y/pixelSize.x);
		if (length(w)<mapRadius) return getMapColor2D(c);
		if (length(w)<mapRadius+0.01) return vec3(0.0,0.0,0.0);
	}
	
	vec2 z = Julia ?  c : vec2(0.0,0.0);
	vec2 dz = vec2(1,0);
	int i = 0;
	for (i = 0; i < Iterations; i++) {
		dz = complexMul(z,dz)*2.0 + (Julia ? vec2(0.0) : vec2(1.0,0.0));
		z = complexMul(z,z) + (Julia ? c2 : c);
		
		if (dot(z,z)> 10000.0) break;
	}
	if (i < Iterations) {
		float r = length(z), dr = length(dz);
		float dist=r*log(r)/dr;//distance to M/J/set
		float dd=1./dist/log(2.)*pixsize*512.;//derivative of coloring smooth iteration val. 512. is the size of the texture. Is it possible to get it automatically?
		float co =  float( i) + 1.0 - log2(.5*log2(dot(z,z)));//smooth iteration val
		co = co*rampSpeed; dd = dd*rampSpeed;//"speed" of coloring
		dd=rampPower*dd*pow(co,rampPower-1.); co = pow(co,rampPower)+rampShift;//
		vec3 col;
		if (Prefilter){
			float l2dd=log2(dd)+rampBlur;//log of derivative
			float il2dd=floor(l2dd);//base level of detail
			float fl2dd=l2dd-il2dd;//in between levels of detail
			col=mix(
						texture2DLod(img,vec2(co,0.),il2dd).xyz,
						texture2DLod(img,vec2(co,0.),il2dd+1.).xyz,
						fl2dd);//manual mip map because mipmap uses implictly derivatives which doesn't work properly when there are conditionnals and loops in the shader.
		} else col=texture2DLod(img,vec2(co,0.),0.).xyz;
		return mix(borderColor,col,smoothstep(0.,distWidth,pow(dist/pixsize,distPower)));
		
	}  else {
		return insideColor;
	}
}

#preset Default
Center = -0.285288,-0.0120426
Zoom = 0.854514
Iterations = 328
Julia = false
JuliaX = -0.6
JuliaY = 1.3
#endpreset

#preset Julia1
Center = -0.00708568,0.185066
Zoom = 2.01136
Julia = true
JuliaX = -0.77896
JuliaY = 0.12536
ShowMap = false
MapZoom = 0.45925
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 1
GaussianAA = true
Iterations = 336
#endpreset

#preset nice Julia
Center = 0.16416,0.0265285
Zoom = 0.854514
Iterations = 328
Julia = true
JuliaX = -0.20588
JuliaY = 0.79412
ShowMap = true
MapZoom = 1.74267
#endpreset

#preset MB_exp_00
Center = -0.746813,0.108854
Zoom = 199.037
Gamma = 2.2
ToneMapping = 3
Exposure = 1.6305
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 1
GaussianAA = true
Iterations = 748
Julia = false
JuliaX = -0.6
JuliaY = 1.3
ShowMap = false
MapZoom = 0.45925
insideColor = 0,0,0
borderColor = 0.192157,0.109804,0.0823529
rampSpeed = 0.13484
rampPower = 0.11236
rampShift = 1.17526
rampBlur = 0
distWidth = 0.7551
distPower = 0.27084
Prefilter = true
#endpreset

#preset MB_exp_01
Center = -0.746813,0.108854
Zoom = 199.037
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 1
GaussianAA = true
Iterations = 748
Julia = false
JuliaX = -0.6
JuliaY = 1.3
insideColor = 0,0,0
borderColor = 0.192157,0.109804,0.0823529
rampSpeed = 2
rampPower = 1
distWidth = 0.7551
distPower = 0.27084
rampBlur = 0.3168
ShowMap = false
MapZoom = 0.45925
rampShift = 0.41238
#endpreset

#preset julia_01
Gamma = 2.2
Brightness = 1
Contrast = 1.0396
Saturation = 1
Center = -0.0230885,-0.147006
Zoom = 24.8915
ToneMapping = 2
Exposure = 5.2173
AARange = 1
AAExp = 1
GaussianAA = true
Iterations = 336
Julia = true
JuliaX = -0.77896
JuliaY = 0.12536
ShowMap = false
MapZoom = 0.45925
insideColor = 0.0509804,0.14902,0.0941176
borderColor = 0.0705882,0.203922,0.0784314
rampSpeed = 0.2472
rampPower = 0.11236
rampShift = 0.51546
rampBlur = 4.43568
distWidth = 1.87756
distPower = 0.25
#endpreset

#preset MB_exp_02
Center = -1.25488,0.0277988
Zoom = 679.212
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 2
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 1
GaussianAA = true
Iterations = 500
Julia = false
JuliaX = -0.6
JuliaY = 1.3
ShowMap = true
MapZoom = 2.1
Prefilter = true
insideColor = 0.184314,0.258824,0.380392
borderColor = 0,0,0
rampSpeed = 0.00258
rampPower = 0.53932
rampShift = 1
rampBlur = 0
distWidth = 0.5
distPower = 0.5
#endpreset

#preset julia_example2
Center = 0.0184743,0.0306954
Zoom = 0.982691
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 1
GaussianAA = true
Iterations = 500
Julia = true
JuliaX = -0.07144
JuliaY = 0.66336
ShowMap = false
MapZoom = 0.01
Prefilter = true
insideColor = 0.184314,0.258824,0.380392
borderColor = 0.239216,0.207843,0.113725
rampSpeed = 1
rampPower = 0.01472
rampShift = 1.48454
rampBlur = 0
distWidth = 0.5
distPower = 0.5
#endpreset

#preset julia_example3
Center = -0.360109,0.461704
Zoom = 1.08825
Gamma = 2.2
ToneMapping = 1
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1
AAExp = 1
GaussianAA = true
Iterations = 500
Julia = true
JuliaX = -0.07144
JuliaY = 0.66336
ShowMap = false
MapZoom = 0.01
Prefilter = true
insideColor = 0.184314,0.258824,0.380392
borderColor = 0.239216,0.207843,0.113725
rampSpeed = 0.0002
rampPower = 0.92134
rampShift = 1.48454
rampBlur = 0
distWidth = 0.29268
distPower = 0.5
#endpreset